"""Regression tests for PROMPT_8 (Theme C) finance/ledger integrity fixes:
C1 delete_payment reverses settlements, C2 get_ledger no double-count,
C3 record_payment_request cumulative balance + conditional status,
C4 FIFO float-epsilon "fully paid", C5 approve_transaction persists a real
payment approval flag.

NOTE: the coverage suite shares one session-scoped SQLite DB, and users.email /
users.mobile are UNIQUE. Every tenant identity here is therefore suffixed with a
per-module random tag so it can never collide with another test module.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9199{_SUFFIX}{tag:02d}"


def _mail(tag: int) -> str:
    return f"fin-{tag}-{_SUFFIX}@test.com"


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="Proj", code="PRJ-1", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


# ── C1: delete_payment must reverse bill settlements ────────────────────────
def test_delete_payment_reverses_bill_settlement(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="C1", user_name="U1", mobile=_mob(1), email=_mail(1))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number="INV-C1",
        invoice_date=datetime.datetime(2026, 1, 1), invoice_type="sale",
        subtotal=100.0, total_payable=100.0,
    )
    db.add(bill)
    db.commit()

    r = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "party_company_user_id": str(team.id), "payment_type": "in",
            "amount": 100.0, "payment_method": "Cash",
            "payment_date": "2026-01-02T00:00:00",
        },
        headers=hdr,
    )
    assert r.status_code == 201
    payment_id = r.json()["id"]

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert b.status == "Paid"
    assert float(b.paid_amount) == 100.0

    d = client.delete(f"/apis/v3/finance/payments/{payment_id}", headers=hdr)
    assert d.status_code == 204

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert float(b.paid_amount) == 0.0
    assert b.status == "Unpaid"


# ── C1b: deleting a partial payment reverts to "Partially Paid" ─────────────
def test_delete_payment_partial_reverts_to_partially_paid(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="C1b", user_name="U1b", mobile=_mob(2), email=_mail(2))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number="INV-C1B",
        invoice_date=datetime.datetime(2026, 1, 1), invoice_type="sale",
        subtotal=200.0, total_payable=200.0,
    )
    db.add(bill)
    db.commit()

    r = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "party_company_user_id": str(team.id), "payment_type": "in",
            "amount": 50.0, "payment_method": "Cash",
            "payment_date": "2026-01-02T00:00:00",
        },
        headers=hdr,
    )
    assert r.status_code == 201
    payment_id = r.json()["id"]

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert b.status == "Partially Paid"
    assert float(b.paid_amount) == 50.0

    client.delete(f"/apis/v3/finance/payments/{payment_id}", headers=hdr)

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert float(b.paid_amount) == 0.0
    assert b.status == "Unpaid"


# ── C2: get_ledger must not double-count a bill + the payment that settled it
def test_ledger_does_not_double_count_settled_payment(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="C2", user_name="U2", mobile=_mob(3), email=_mail(3))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number="INV-C2",
        invoice_date=datetime.datetime(2026, 1, 1), invoice_type="sale",
        subtotal=100.0, total_payable=100.0,
    )
    db.add(bill)
    db.commit()

    r = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "party_company_user_id": str(team.id), "payment_type": "in",
            "amount": 100.0, "payment_method": "Cash",
            "payment_date": "2026-01-02T00:00:00",
        },
        headers=hdr,
    )
    assert r.status_code == 201
    payment_id = r.json()["id"]

    # GET the project ledger
    gl = client.get(f"/apis/v3/finance/ledger?project_id={project.id}", headers=hdr)
    assert gl.status_code == 200
    entries = gl.json()

    # The invoice (revenue recognition) appears once; the settling payment is
    # omitted because its economic effect is already in the bill's line.
    assert len(entries) == 1, entries
    assert entries[0]["type"] == "Receipt"
    assert entries[0]["balance"] == 100.0
    assert all(e["id"] != payment_id for e in entries)


# ── C2b: standalone (unsettled) payments still appear in the ledger ─────────
def test_ledger_keeps_unsettled_payment(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="C2b", user_name="U2b", mobile=_mob(4), email=_mail(4))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    # Payment with no linked party -> cannot settle any bill -> standalone cash movement.
    r = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "payment_type": "out", "amount": 40.0,
            "payment_method": "Cash", "payment_date": "2026-01-02T00:00:00",
        },
        headers=hdr,
    )
    assert r.status_code == 201
    payment_id = r.json()["id"]

    gl = client.get(f"/apis/v3/finance/ledger?project_id={project.id}", headers=hdr)
    assert gl.status_code == 200
    entries = gl.json()
    assert any(e["id"] == payment_id for e in entries)


# ── C3: cumulative balance + conditional status ─────────────────────────────
def test_record_payment_request_cumulative_balance(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="C3", user_name="U3", mobile=_mob(5), email=_mail(5))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    req = models.PaymentRequest(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=user.id, party_name=user.name, amount=500.0,
        details="Advance for foundation work",
    )
    db.add(req)
    db.commit()
    req_id = req.id

    def pay(paid, deduction=0.0):
        return client.post(
            f"/apis/v3/finance/payment-requests/pay/{req_id}",
            json={
                "payment_date": "2026-01-02T00:00:00", "payment_mode": "Cash",
                "paid_amount": paid, "deduction": deduction, "tds": 0.0,
            },
            headers=hdr,
        )

    r1 = pay(200.0)
    assert r1.status_code == 200
    assert r1.json()["status"] == "Partially Paid"
    assert r1.json()["payment"]["balance_due"] == 300.0

    r2 = pay(200.0)
    assert r2.status_code == 200
    assert r2.json()["status"] == "Partially Paid"
    assert r2.json()["payment"]["balance_due"] == 100.0

    # Third payment: 80 paid + 20 deduction => 500 - 480 - 20 = 0 => fully paid.
    r3 = pay(80.0, deduction=20.0)
    assert r3.status_code == 200
    assert r3.json()["status"] == "Paid"
    assert r3.json()["payment"]["balance_due"] == 0.0

    db.expire_all()
    r = db.query(models.PaymentRequest).filter_by(id=req_id).first()
    assert r.status == "Paid"
    # Approval is a separate workflow and must NOT be forced by recording a payment.
    assert r.approval_status == "Pending"


# ── C4: FIFO float-epsilon lets a bill reach "Paid" despite float remainder ─
def test_fifo_settlement_reaches_paid_with_float_drift(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="C4", user_name="U4", mobile=_mob(6), email=_mail(6))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number="INV-C4",
        invoice_date=datetime.datetime(2026, 1, 1), invoice_type="sale",
        subtotal=100.0, total_payable=100.0,
    )
    db.add(bill)
    db.commit()
    bill_id = bill.id

    for amt in (33.33, 33.33, 33.34):
        r = client.post(
            "/apis/v3/finance/payments",
            json={
                "company_id": str(comp.id), "project_id": str(project.id),
                "party_company_user_id": str(team.id), "payment_type": "in",
                "amount": amt, "payment_method": "Cash",
                "payment_date": "2026-01-02T00:00:00",
            },
            headers=hdr,
        )
        assert r.status_code == 201

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill_id).first()
    # Without the epsilon tolerance float drift could leave this stuck "Partially Paid".
    assert b.status == "Paid"


# ── C5: approve_transaction payment branch persists a real approval flag ────
def test_approve_transaction_persists_payment_approval_flag(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="C5", user_name="U5", mobile=_mob(7), email=_mail(7))
    hdr = auth_headers(user, comp)

    payment = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, payment_type="in",
        amount=50.0, unsettled_amount=50.0, payment_method="Cash",
        payment_date=datetime.datetime(2026, 1, 2),
    )
    db.add(payment)
    db.commit()
    pid = payment.id

    r = client.patch(f"/apis/v3/finance/approve/{pid}", headers=hdr)
    assert r.status_code == 200
    assert r.json()["type"] == "payment"

    db.expire_all()
    p = db.query(models.Payment).filter_by(id=pid).first()
    assert p.approval_flag == "approved"
