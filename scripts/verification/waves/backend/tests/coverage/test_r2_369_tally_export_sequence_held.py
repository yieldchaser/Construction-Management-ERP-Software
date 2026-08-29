"""R2-369 - the Tally export advanced the voucher sequence while marking stayed a separate call, so a second download re-sent every unsynced voucher under brand-new numbers.

GET /tally/export rendered numbers from conn.last_voucher_seq and then bumped
it, while tally_synced was only written by POST /tally/mark-synced. Two
downloads of the same queue therefore produced two XMLs describing the same
economic events under different voucher numbers, and importing both
double-posted the period straight past Tally's duplicate detection.

Gate: /export is now fully idempotent (identical bytes on re-download,
counter untouched, nothing marked); POST /tally/mark-synced is what consumes
the held sequence, so confirmed vouchers retire their numbers and the next
export starts past them.
"""
import re
import uuid
from datetime import datetime, timezone

from app import models

VOUCHER_NUM_RE = re.compile(r"SF-\d{4}-\d+")


def _mk_conn(db, comp):
    conn = models.TallyConnection(
        id=uuid.uuid4(), company_id=comp.id,
        tally_company_name="Tally 369", registered_mobile="+919236900369",
        sync_window_start_date=datetime(2026, 1, 1, tzinfo=timezone.utc),
        last_voucher_seq=0,
    )
    db.add(conn)
    return conn


def _mk_bill(db, comp, project, team, invoice_number):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=invoice_number,
        invoice_date=datetime(2026, 7, 10, tzinfo=timezone.utc),
        invoice_type="sale", status="Unpaid",
        subtotal=10000.0, gst_amount=1800.0, total_payable=11800.0,
        paid_amount=0.0, tally_synced=False,
    )
    db.add(bill)
    return bill


def _mk_payment(db, comp, project, team, amount):
    pmt = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, payment_type="in",
        amount=amount, unsettled_amount=amount, payment_method="Cash",
        reference_number=None,
        payment_date=datetime(2026, 7, 11, tzinfo=timezone.utc),
        tally_synced=False,
    )
    db.add(pmt)
    return pmt


def test_r2_369_sequence_held_until_mark_synced_confirms(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R2369", user_name="U369",
        mobile="+9192369001", email="r369@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P369",
        code="PRJ-369", status="Ongoing",
    )
    db.add(project)
    _mk_conn(db, comp)
    bill = _mk_bill(db, comp, project, team, "INV-369-A")
    pay1 = _mk_payment(db, comp, project, team, 500.0)
    pay2 = _mk_payment(db, comp, project, team, 700.0)
    db.commit()

    url = f"/apis/v3/tally/export?company_id={comp.id}"

    # First download: one invoice-numbered voucher + two template-numbered ones.
    r1 = client.get(url, headers=hdr)
    assert r1.status_code == 200, r1.text
    assert "INV-369-A" in r1.text, r1.text[:500]
    nums1 = sorted(set(VOUCHER_NUM_RE.findall(r1.text)))
    assert len(nums1) == 2, nums1

    # The export stays read-only: nothing marked, sequence not consumed.
    db.expire_all()
    conn = db.query(models.TallyConnection).filter(
        models.TallyConnection.company_id == comp.id
    ).first()
    assert conn.last_voucher_seq == 0, conn.last_voucher_seq
    assert db.query(models.Bill).filter(models.Bill.id == bill.id).first().tally_synced is False

    # Second download of the same queue: byte-identical file with identical
    # numbers (pre-fix this re-numbered everything to SF-...-4/5).
    r2 = client.get(url, headers=hdr)
    assert r2.status_code == 200, r2.text
    assert r2.content == r1.content
    nums2 = sorted(set(VOUCHER_NUM_RE.findall(r2.text)))
    assert nums2 == nums1, (nums1, nums2)

    # Confirming the import in Tally is what marks AND consumes the sequence.
    r3 = client.post(
        "/apis/v3/tally/mark-synced", headers=hdr,
        json={"bill_ids": [str(bill.id)], "payment_ids": [str(pay1.id), str(pay2.id)]},
    )
    assert r3.status_code == 200, r3.text
    body = r3.json()
    assert body["marked_bills"] == 1 and body["marked_payments"] == 2, body

    db.expire_all()
    conn = db.query(models.TallyConnection).filter(
        models.TallyConnection.company_id == comp.id
    ).first()
    assert conn.last_voucher_seq == 3, conn.last_voucher_seq
    log = db.query(models.TallySyncLog).filter(
        models.TallySyncLog.company_id == comp.id
    ).all()
    assert len(log) == 1 and log[0].voucher_count == 3

    # The next export numbers fresh vouchers after the confirmed batch.
    pay3 = _mk_payment(db, comp, project, team, 900.0)
    db.commit()
    r4 = client.get(url, headers=hdr)
    assert r4.status_code == 200, r4.text
    nums4 = set(VOUCHER_NUM_RE.findall(r4.text))
    assert nums4 == {"SF-2026-4"}, nums4
