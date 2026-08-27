"""R2-346 — FIFO settlement is gated on bill approval.

Gate: POST /finance/payments must never settle a bill whose approval_flag has
not passed review. Every bill created through the product starts "pending";
before the fix the engine flipped such bills to Paid and wrote
PaymentSettlement rows with nobody having approved anything. The payment must
stay unsettled until PATCH /finance/approve/{id} approves the bill.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{uuid.uuid4().hex[:8]}-{tag}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, team, number):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=number,
        invoice_date=datetime.datetime(2026, 1, 1), invoice_type="sale",
        subtotal=100.0, total_payable=100.0,
    )
    db.add(bill)
    db.commit()
    return bill


def _post_payment(client, comp, project, team, hdr):
    return client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "party_company_user_id": str(team.id), "payment_type": "in",
            "amount": 100.0, "payment_method": "Cash",
            "payment_date": "2026-01-02T00:00:00",
        },
        headers=hdr,
    )


def test_pending_bill_is_never_settled_by_fifo(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R346A", user_name="U346A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)
    bill = _mk_bill(db, comp, project, team, f"INV-R346A-{uuid.uuid4().hex[:6]}")
    assert bill.approval_flag == "pending"

    r = _post_payment(client, comp, project, team, hdr)
    assert r.status_code == 201
    payment_id = r.json()["id"]

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    # The unapproved bill is untouched: no money applied, still Unpaid.
    assert float(b.paid_amount) == 0.0
    assert b.status == "Unpaid"
    # The money is not lost; it sits unsettled on the payment.
    p = db.query(models.Payment).filter_by(id=payment_id).first()
    assert float(p.unsettled_amount) == 100.0
    # And no settlement row proves a phantom payment.
    assert db.query(models.PaymentSettlement).filter_by(payment_id=payment_id).count() == 0


def test_approval_lets_the_next_payment_settle(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R346B", user_name="U346B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 2)
    bill = _mk_bill(db, comp, project, team, f"INV-R346B-{uuid.uuid4().hex[:6]}")

    r0 = _post_payment(client, comp, project, team, hdr)
    assert r0.status_code == 201

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert b.status == "Unpaid"  # gated while pending

    # Approve the bill through the real endpoint, then pay again.
    ap = client.patch(f"/apis/v3/finance/approve/{bill.id}", headers=hdr)
    assert ap.status_code == 200
    r1 = _post_payment(client, comp, project, team, hdr)
    assert r1.status_code == 201

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert b.approval_flag == "approved"
    assert b.status == "Paid"
    assert float(b.paid_amount) == 100.0
