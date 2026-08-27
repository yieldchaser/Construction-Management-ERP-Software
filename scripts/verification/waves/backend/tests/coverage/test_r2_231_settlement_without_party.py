"""R2-231 — FIFO settlement must be reachable without a party id.

Gate: the settlement engine inside POST /finance/payments used to run only
when the body carried party_company_user_id. The product's sole payment
caller never sends that field, so the loop was unreachable and every bill
stayed permanently Unpaid with paid_amount 0. Without a party the payment
must settle FIFO over its natural scope (company always, project when given,
revenue invoices for "in"), and delete_payment must reverse what was settled.
Supplying a party keeps the exact prior party-scoped behavior, and the
R2-346 approval gate still holds on both paths.
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


def _mk_bill(db, comp, project, team, number, inv_type="sale", amount=100.0, date=datetime.datetime(2026, 1, 1)):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=number,
        invoice_date=date, invoice_type=inv_type,
        subtotal=amount, total_payable=amount,
    )
    db.add(bill)
    db.commit()
    return bill


def _approve(client, hdr, bill_id):
    ap = client.patch(f"/apis/v3/finance/approve/{bill_id}", headers=hdr)
    assert ap.status_code == 200


def _post_no_party(client, comp, project, hdr, amount):
    return client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "payment_type": "in",
            "amount": amount,
            "payment_method": "Cash",
            "payment_date": "2026-01-05T00:00:00",
        },
        headers=hdr,
    )


def test_no_party_settles_approved_sale_bills_fifo(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R231A", user_name="U231A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)
    old_bill = _mk_bill(db, comp, project, team, f"INV-R231-old-{uuid.uuid4().hex[:6]}",
                        date=datetime.datetime(2026, 1, 1), amount=100.0)
    new_bill = _mk_bill(db, comp, project, team, f"INV-R231-new-{uuid.uuid4().hex[:6]}",
                        date=datetime.datetime(2026, 2, 1), amount=50.0)
    pending_bill = _mk_bill(db, comp, project, team, f"INV-R231-pend-{uuid.uuid4().hex[:6]}",
                            date=datetime.datetime(2025, 12, 1))
    assert pending_bill.approval_flag == "pending"

    _approve(client, hdr, old_bill.id)
    _approve(client, hdr, new_bill.id)

    r = _post_no_party(client, comp, project, hdr, 120.0)
    assert r.status_code == 201

    db.expire_all()
    oldest = db.query(models.Bill).filter_by(id=old_bill.id).first()
    newest = db.query(models.Bill).filter_by(id=new_bill.id).first()
    unreviewed = db.query(models.Bill).filter_by(id=pending_bill.id).first()

    # Oldest approved bill fills first (FIFO), then spills into the next one.
    assert float(oldest.paid_amount) == 100.0
    assert oldest.status == "Paid"
    assert float(newest.paid_amount) == 20.0
    assert newest.status == "Partially Paid"
    # The review gate survives on the no-party path: a pending bill is skipped.
    assert float(unreviewed.paid_amount) == 0.0
    assert unreviewed.status == "Unpaid"

    payment_id = r.json()["id"]
    p = db.query(models.Payment).filter_by(id=payment_id).first()
    assert float(p.unsettled_amount) == 0.0
    settled_ids = {s.bill_id for s in db.query(models.PaymentSettlement).filter_by(payment_id=payment_id)}
    assert settled_ids == {old_bill.id, new_bill.id}


def test_delete_payment_reverses_no_party_settlements(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R231B", user_name="U231B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 2)
    bill = _mk_bill(db, comp, project, team, f"INV-R231B-{uuid.uuid4().hex[:6]}")
    _approve(client, hdr, bill.id)

    r = _post_no_party(client, comp, project, hdr, 60.0)
    assert r.status_code == 201
    payment_id = r.json()["id"]

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert b.status == "Partially Paid"
    assert float(b.paid_amount) == 60.0

    d = client.delete(f"/apis/v3/finance/payments/{payment_id}", headers=hdr)
    assert d.status_code == 204

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert float(b.paid_amount) == 0.0
    assert b.status == "Unpaid"
    # The payment itself is gone; settlement-row removal is the DB-level
    # ON DELETE CASCADE, which SQLite does not enforce, so it is not
    # asserted here.
    assert db.query(models.Payment).filter_by(id=payment_id).count() == 0


def test_company_scope_keeps_other_tenants_unpaid(client, db, make_tenant, auth_headers):
    comp_a, user_a, team_a = make_tenant(company_name="R231C", user_name="U231C")
    comp_b, user_b, team_b = make_tenant(company_name="R231D", user_name="U231D")
    hdr_a = auth_headers(user_a, comp_a)
    project_a = _mk_project(db, comp_a, 3)
    foreign_project = _mk_project(db, comp_b, 4)
    own_bill = _mk_bill(db, comp_a, project_a, team_a, f"INV-R231C-{uuid.uuid4().hex[:6]}")
    foreign_bill = _mk_bill(db, comp_b, foreign_project, team_b, f"INV-R231D-{uuid.uuid4().hex[:6]}")
    _approve(client, hdr_a, own_bill.id)
    _approve(client, auth_headers(user_b, comp_b), foreign_bill.id)

    r = _post_no_party(client, comp_a, project_a, hdr_a, 100.0)
    assert r.status_code == 201

    db.expire_all()
    mine = db.query(models.Bill).filter_by(id=own_bill.id).first()
    theirs = db.query(models.Bill).filter_by(id=foreign_bill.id).first()
    assert mine.status == "Paid"
    assert float(theirs.paid_amount) == 0.0
    assert theirs.status == "Unpaid"


def test_party_supplied_path_unchanged(client, db, make_tenant, auth_headers):
    comp, user, team_a = make_tenant(company_name="R231E", user_name="U231E")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 5)
    # A second party needs its own user: (company_id, user_id) is unique on
    # company_team, so one member cannot hold two team rows.
    user_b = models.User(id=uuid.uuid4(), name="U231E-B")
    db.add(user_b)
    db.flush()
    team_b = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=user_b.id, priority_type="partner"
    )
    db.add(team_b)
    db.commit()

    bill_a = _mk_bill(db, comp, project, team_a, f"INV-R231E-a-{uuid.uuid4().hex[:6]}",
                      date=datetime.datetime(2026, 1, 1))
    bill_b = _mk_bill(db, comp, project, team_b, f"INV-R231E-b-{uuid.uuid4().hex[:6]}",
                      date=datetime.datetime(2026, 1, 2))
    _approve(client, hdr, bill_a.id)
    _approve(client, hdr, bill_b.id)

    r = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "party_company_user_id": str(team_a.id),
            "payment_type": "in",
            "amount": 100.0,
            "payment_method": "Cash",
            "payment_date": "2026-01-05T00:00:00",
        },
        headers=hdr,
    )
    assert r.status_code == 201

    db.expire_all()
    paid_a = db.query(models.Bill).filter_by(id=bill_a.id).first()
    other = db.query(models.Bill).filter_by(id=bill_b.id).first()
    assert paid_a.status == "Paid"
    assert float(paid_a.paid_amount) == 100.0
    # The other party's older-in-FIFO-order bill is untouched: settlement is
    # still party-scoped when a party is supplied.
    assert float(other.paid_amount) == 0.0
    assert other.status == "Unpaid"
