"""R2-742 HIGH: /tally/pending UnboundLocalError when no TallyConnection.

Every tenant that has not set up Tally has no tally_connections row.
pending_vouchers initialised bill_ids, payment_ids and vouchers at 653-655
but excluded_bills (669) and excluded_payments (675) only inside `if conn:`,
and the return at 690 referenced all five -> UnboundLocalError.

Fix: initialise excluded_bills = 0 and excluded_payments = 0 alongside the
other three before the if conn check. Both branches then return correctly.

Gate: GET /tally/pending for a company with no TallyConnection returns 200
and excluded_before_window == {"bills": 0, "payments": 0}.
"""
import uuid
from datetime import datetime, timezone

from app import models


def test_r2_742_pending_no_connection_returns_zero_excluded(client, db, make_tenant, auth_headers):
    """Company with no tally_connections row must not 500; excluded counts are 0."""
    comp, user, team = make_tenant(
        company_name=f"R2742-NC-{uuid.uuid4().hex[:6]}",
        user_name=f"U742A-{uuid.uuid4().hex[:4]}",
        mobile=f"+91974200{uuid.uuid4().int % 9000:04d}",
        email=f"r742a-{uuid.uuid4().hex[:6]}@test.com",
    )
    hdr = auth_headers(user, comp)

    # Ensure no TallyConnection exists for this company (make_tenant does not create one;
    # defensively delete if a prior test leaked).
    db.query(models.TallyConnection).filter(models.TallyConnection.company_id == comp.id).delete()
    db.commit()

    # Also create some unsynced bills/payments that would be excluded if a conn existed,
    # to prove the no-conn branch ignores them and still returns zeros.
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P742-NC-{uuid.uuid4().hex[:4]}",
        code=f"PRJ-742-NC-{uuid.uuid4().hex[:6]}", status="Ongoing",
    )
    db.add(project)
    db.commit()

    # These bills/payments exist but without a conn the pending queue is empty
    # and excluded counts must be 0 (no window to be before).
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-742-NC-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime(2026, 3, 1, tzinfo=timezone.utc),
        invoice_type="sale", status="Unpaid",
        subtotal=1000.0, gst_amount=180.0, total_payable=1180.0,
        paid_amount=0.0, tally_synced=False,
    )
    pay = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, payment_type="in",
        amount=500.0, unsettled_amount=500.0, payment_method="Cash",
        reference_number=None,
        payment_date=datetime(2026, 3, 2, tzinfo=timezone.utc),
        tally_synced=False,
    )
    db.add_all([bill, pay])
    db.commit()

    r = client.get(f"/apis/v3/tally/pending?company_id={comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    # Shape from tally.py:690
    assert body["count"] == 0, body
    assert body["bill_ids"] == [], body
    assert body["payment_ids"] == [], body
    assert body["vouchers"] == [], body
    assert body["excluded_before_window"] == {"bills": 0, "payments": 0}, body


def test_r2_742_pending_with_connection_still_counts_correctly(client, db, make_tenant, auth_headers):
    """With a conn, excluded_before_window counts pre-window unsynced docs."""
    comp, user, team = make_tenant(
        company_name=f"R2742-C-{uuid.uuid4().hex[:6]}",
        user_name=f"U742B-{uuid.uuid4().hex[:4]}",
        mobile=f"+91974201{uuid.uuid4().int % 9000:04d}",
        email=f"r742b-{uuid.uuid4().hex[:6]}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P742-C-{uuid.uuid4().hex[:4]}",
        code=f"PRJ-742-C-{uuid.uuid4().hex[:6]}", status="Ongoing",
    )
    db.add(project)
    db.flush()

    conn = models.TallyConnection(
        id=uuid.uuid4(), company_id=comp.id,
        tally_company_name="Tally 742", registered_mobile="+919742000742",
        sync_window_start_date=datetime(2026, 6, 1, tzinfo=timezone.utc),
        last_voucher_seq=0,
    )
    db.add(conn)
    db.commit()

    # One bill/payment before window (excluded), one in window (pending), one cancelled (ignored)
    bill_before = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-742-EXC-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime(2026, 5, 15, tzinfo=timezone.utc),
        invoice_type="sale", status="Unpaid",
        subtotal=1000.0, gst_amount=180.0, total_payable=1180.0,
        paid_amount=0.0, tally_synced=False,
    )
    bill_in = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-742-IN-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime(2026, 6, 15, tzinfo=timezone.utc),
        invoice_type="sale", status="Unpaid",
        subtotal=2000.0, gst_amount=360.0, total_payable=2360.0,
        paid_amount=0.0, tally_synced=False,
    )
    bill_cancelled_before = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-742-CAN-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime(2026, 5, 10, tzinfo=timezone.utc),
        invoice_type="sale", status="Cancelled",
        subtotal=500.0, gst_amount=90.0, total_payable=590.0,
        paid_amount=0.0, tally_synced=False,
    )
    pay_before = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, payment_type="in",
        amount=300.0, unsettled_amount=300.0, payment_method="Cash",
        reference_number=None,
        payment_date=datetime(2026, 5, 20, tzinfo=timezone.utc),
        tally_synced=False,
    )
    pay_in = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, payment_type="in",
        amount=400.0, unsettled_amount=400.0, payment_method="Cash",
        reference_number=None,
        payment_date=datetime(2026, 6, 20, tzinfo=timezone.utc),
        tally_synced=False,
    )
    # Synced docs are never counted
    bill_synced_before = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-742-SYNC-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime(2026, 5, 12, tzinfo=timezone.utc),
        invoice_type="sale", status="Unpaid",
        subtotal=700.0, gst_amount=126.0, total_payable=826.0,
        paid_amount=0.0, tally_synced=True,
    )
    db.add_all([bill_before, bill_in, bill_cancelled_before, pay_before, pay_in, bill_synced_before])
    db.commit()

    r = client.get(f"/apis/v3/tally/pending?company_id={comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["excluded_before_window"] == {"bills": 1, "payments": 1}, body
    # In-window docs are returned
    assert str(bill_in.id) in body["bill_ids"], body
    assert str(pay_in.id) in body["payment_ids"], body
    assert str(bill_before.id) not in body["bill_ids"], body
    assert str(pay_before.id) not in body["payment_ids"], body
    # Cancelled and synced are never in any bucket
    assert str(bill_cancelled_before.id) not in body["bill_ids"], body
    assert str(bill_synced_before.id) not in body["bill_ids"], body
    assert body["count"] == len(body["vouchers"]) == 2, body
