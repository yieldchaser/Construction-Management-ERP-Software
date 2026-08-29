"""R2-342 + R2-343 - the money approval path.

R2-342: PATCH /finance/approve/{id} used to flip any bill or payment to
approved unconditionally. It now conflicts (409) on an already-approved or
cancelled document, honours a configured "Payment Entries" ApprovalRule
(designated approvers only, multi-level), and records every decision in
ApprovalAction with the session user as approver and a server timestamp.

R2-343: GET /finance/transactions/{company_id} hardcoded status="Approved" on
every payment row; it now reports the payment's real approval_flag.
"""
import datetime
import uuid

from app import models


def _mk_member(db, comp, auth_headers, name="Member", email=None, partner=False):
    """A company member holding finance:approve (employee role or partner)."""
    user = models.User(id=uuid.uuid4(), name=name, email=email)
    db.add(user)
    db.flush()
    if partner:
        team = models.CompanyTeam(
            id=uuid.uuid4(), company_id=comp.id, user_id=user.id, priority_type="partner"
        )
        db.add(team)
    else:
        role = models.CompanyRole(
            company_id=comp.id,
            role_name=f"Approver-{uuid.uuid4().hex[:6]}",
            permissions={"finance:approve": True},
        )
        db.add(role)
        db.flush()
        team = models.CompanyTeam(
            id=uuid.uuid4(), company_id=comp.id, user_id=user.id,
            priority_type="employee", role_id=role.id,
        )
        db.add(team)
    db.commit()
    return user, auth_headers(user, comp)


def _mk_payment(db, comp, project=None, amount=50.0):
    p = models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id if project else None,
        payment_type="out", amount=amount, unsettled_amount=amount,
        payment_method="Cash", payment_date=datetime.datetime(2026, 1, 2),
    )
    db.add(p)
    db.commit()
    return p


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}",
        code=f"PRJ-{uuid.uuid4().hex[:8]}-{tag}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, party_team_id, number, cancelled=False):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=party_team_id, invoice_number=number,
        invoice_date=datetime.datetime(2026, 1, 1), invoice_type="sale",
        subtotal=100.0, total_payable=100.0,
        status="Cancelled" if cancelled else "Unpaid",
    )
    db.add(b)
    db.commit()
    return b


def _approve(client, hdr, txn_id):
    return client.patch(f"/apis/v3/finance/approve/{txn_id}", headers=hdr)


# ── R2-342: state checks ──────────────────────────────────────────────────────

def test_double_approve_payment_conflicts_409(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R342A", user_name="U342A")
    hdr = auth_headers(user, comp)
    pay = _mk_payment(db, comp)

    r1 = _approve(client, hdr, pay.id)
    assert r1.status_code == 200

    r2 = _approve(client, hdr, pay.id)
    assert r2.status_code == 409
    assert "already been approved" in r2.json()["detail"]

    db.expire_all()
    p = db.query(models.Payment).filter_by(id=pay.id).first()
    assert p.approval_flag == "approved"
    # Exactly one decision row: the retry recorded nothing.
    assert db.query(models.ApprovalAction).filter_by(entity_type="payment", entity_id=pay.id).count() == 1


def test_double_approve_bill_conflicts_409(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R342B", user_name="U342B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)
    bill = _mk_bill(db, comp, project, team.id, f"INV-R342B-{uuid.uuid4().hex[:6]}")

    r1 = _approve(client, hdr, bill.id)
    assert r1.status_code == 200

    r2 = _approve(client, hdr, bill.id)
    assert r2.status_code == 409


def test_cancelled_bill_cannot_be_approved(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R342C", user_name="U342C")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 2)
    bill = _mk_bill(db, comp, project, team.id, f"INV-R342C-{uuid.uuid4().hex[:6]}", cancelled=True)

    r = _approve(client, hdr, bill.id)
    assert r.status_code == 409

    db.expire_all()
    b = db.query(models.Bill).filter_by(id=bill.id).first()
    assert b.approval_flag == "pending"


# ── R2-342: approver identity + timestamp recorded ───────────────────────────

def test_approval_records_actor_and_timestamp(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R342D", user_name="U342D")
    hdr = auth_headers(user, comp)

    pay = _mk_payment(db, comp)
    assert _approve(client, hdr, pay.id).status_code == 200

    project = _mk_project(db, comp, 3)
    bill = _mk_bill(db, comp, project, team.id, f"INV-R342D-{uuid.uuid4().hex[:6]}")
    assert _approve(client, hdr, bill.id).status_code == 200

    db.expire_all()
    pay_action = (
        db.query(models.ApprovalAction)
        .filter_by(entity_type="payment", entity_id=pay.id, action="approved")
        .first()
    )
    assert pay_action is not None
    assert pay_action.approver_user_id == user.id
    assert pay_action.created_at is not None

    bill_action = (
        db.query(models.ApprovalAction)
        .filter_by(entity_type="bill", entity_id=bill.id, action="approved")
        .first()
    )
    assert bill_action is not None
    assert bill_action.approver_user_id == user.id
    assert bill_action.created_at is not None


# ── R2-342: Payment Entries rule consultation ────────────────────────────────

def test_configured_rule_gates_payment_approval(client, db, make_tenant, auth_headers):
    comp, owner, _ = make_tenant(company_name="R342E", user_name="OwnerE")
    owner_hdr = auth_headers(owner, comp)
    designated, designated_hdr = _mk_member(
        db, comp, auth_headers, name="Fin", email="fin-r342e@test.com"
    )

    pay = _mk_payment(db, comp, amount=5000.0)
    db.add(models.ApprovalRule(
        id=uuid.uuid4(), company_id=comp.id, feature_type="Payment Entries",
        min_amount=0.0, max_amount=None, levels=1,
        approvers="fin-r342e@test.com",
    ))
    db.commit()

    # A member who is not a configured approver is refused and nothing changes.
    r = _approve(client, owner_hdr, pay.id)
    assert r.status_code == 403
    db.expire_all()
    p = db.query(models.Payment).filter_by(id=pay.id).first()
    assert p.approval_flag == "pending"

    # The designated approver completes the single-level chain.
    r2 = _approve(client, designated_hdr, pay.id)
    assert r2.status_code == 200
    db.expire_all()
    p = db.query(models.Payment).filter_by(id=pay.id).first()
    assert p.approval_flag == "approved"
    action = db.query(models.ApprovalAction).filter_by(entity_type="payment", entity_id=pay.id).first()
    assert action.rule_id is not None
    assert action.approver_user_id == designated.id


def test_two_level_chain_needs_distinct_approvers(client, db, make_tenant, auth_headers):
    comp, _, _ = make_tenant(company_name="R342F", user_name="OwnerF")
    approver_a, hdr_a = _mk_member(db, comp, auth_headers, name="A", email="a-r342f@test.com")
    approver_b, hdr_b = _mk_member(db, comp, auth_headers, name="B", email="b-r342f@test.com")

    pay = _mk_payment(db, comp, amount=90000.0)
    db.add(models.ApprovalRule(
        id=uuid.uuid4(), company_id=comp.id, feature_type="Payment Entries",
        min_amount=0.0, max_amount=None, levels=2,
        approvers="a-r342f@test.com, b-r342f@test.com",
    ))
    db.commit()

    r1 = _approve(client, hdr_a, pay.id)
    assert r1.status_code == 200
    db.expire_all()
    p = db.query(models.Payment).filter_by(id=pay.id).first()
    # Level 1 of 2 recorded; the payment is not approved yet.
    assert p.approval_flag == "pending"
    assert levels_count(db, "payment", pay.id) == 1

    # One person cannot satisfy both levels.
    again = _approve(client, hdr_a, pay.id)
    assert again.status_code == 409

    # The second distinct approver completes the chain.
    r2 = _approve(client, hdr_b, pay.id)
    assert r2.status_code == 200
    db.expire_all()
    p = db.query(models.Payment).filter_by(id=pay.id).first()
    assert p.approval_flag == "approved"


def levels_count(db, entity_type, entity_id):
    return (
        db.query(models.ApprovalAction)
        .filter_by(entity_type=entity_type, entity_id=entity_id, action="approved")
        .count()
    )


# ── R2-343: the transactions list reports the real flag ──────────────────────

def _txn_row(client, hdr, comp, txn_id):
    r = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert r.status_code == 200
    for row in r.json()["transactions"]:
        if row["id"] == str(txn_id):
            return row
    return None


def test_transaction_list_shows_real_payment_status(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R343A", user_name="U343A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 9)
    pay = _mk_payment(db, comp, project=project)

    row = _txn_row(client, hdr, comp, pay.id)
    assert row is not None
    # Before the fix this read "Approved" for every payment, even a fresh one.
    assert row["status"] == "pending"

    assert _approve(client, hdr, pay.id).status_code == 200

    row_after = _txn_row(client, hdr, comp, pay.id)
    assert row_after is not None
    assert row_after["status"] == "approved"
