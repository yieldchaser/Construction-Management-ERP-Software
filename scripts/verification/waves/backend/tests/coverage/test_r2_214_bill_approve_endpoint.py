"""R2-214: "Auditor Approve" on a bill was a local React state flip - no
endpoint existed to record an approval at all, so the audit-approval gate on
subcontractor payments never reached the database while finance settlement
and retention release both key off bills.approval_flag. Pins the new
POST /billing/bills/{id}/approve: flips approval_flag (not payment status),
requires billing:approve, refuses cancelled bills."""
import uuid

from app import models
from app.auth import create_access_token


def _hdr(user, comp):
    return {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}


def _tenant(db, tag):
    comp = models.Company(id=uuid.uuid4(), name=f"R214-{tag}", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    owner = models.User(
        id=uuid.uuid4(), name=f"O-R214-{tag}",
        mobile=f"+9195{uuid.uuid4().hex[:9]}", email=f"r214-owner-{tag}@test.com",
    )
    subcon = models.User(
        id=uuid.uuid4(), name="R214 Subcon",
        mobile=f"+9196{uuid.uuid4().hex[:9]}", email=f"r214-subcon-{tag}@test.com",
    )
    db.add_all([owner, subcon])
    db.flush()
    db.add(models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=owner.id, priority_type="partner"))
    party_team = models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=subcon.id, priority_type="subcontractor")
    db.add(party_team)
    db.flush()
    project = models.Project(company_id=comp.id, name=f"R214 Site {tag}")
    db.add(project)
    db.flush()
    bill = models.Bill(
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=party_team.id,
        invoice_number=f"R214-{tag}-001",
        invoice_date=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        invoice_type="subcon",
        subtotal=1000,
        gst_amount=180,
        total_payable=1180,
    )
    db.add(bill)
    db.commit()
    return comp, owner, project, bill


def _restricted_member(db, comp, tag):
    user = models.User(
        id=uuid.uuid4(), name=f"E-R214-{tag}",
        mobile=f"+9197{uuid.uuid4().hex[:9]}", email=f"r214-emp-{tag}@test.com",
    )
    db.add(user)
    db.flush()
    role = models.CompanyRole(company_id=comp.id, role_name="Viewer+", permissions={"projects:view": True})
    db.add(role)
    db.flush()
    db.add(models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=user.id,
        priority_type="employee", role_id=role.id,
    ))
    db.commit()
    return user


def test_approve_flips_approval_flag_and_persists(client, db):
    comp, owner, project, bill = _tenant(db, "ok")
    assert bill.approval_flag == "pending"

    r = client.post(f"/apis/v3/billing/bills/{bill.id}/approve", headers=_hdr(owner, comp))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["approval_flag"] == "approved"
    # Payment lifecycle untouched by an audit approval.
    assert body["status"] == "Unpaid"

    db.expire_all()
    assert db.query(models.Bill).filter(models.Bill.id == bill.id).first().approval_flag == "approved"

    # Idempotent re-approve stays 200.
    r = client.post(f"/apis/v3/billing/bills/{bill.id}/approve", headers=_hdr(owner, comp))
    assert r.status_code == 200, r.text


def test_approve_requires_billing_approve_permission(client, db):
    comp, owner, project, bill = _tenant(db, "perm")
    employee = _restricted_member(db, comp, "perm")

    r = client.post(f"/apis/v3/billing/bills/{bill.id}/approve", headers=_hdr(employee, comp))
    assert r.status_code == 403, r.text
    assert "billing:approve" in r.json()["detail"]

    db.expire_all()
    assert db.query(models.Bill).filter(models.Bill.id == bill.id).first().approval_flag == "pending"


def test_approve_refuses_cancelled_bill(client, db):
    import datetime as dt
    comp, owner, project, bill = _tenant(db, "cancelled")
    b = db.query(models.Bill).filter(models.Bill.id == bill.id).first()
    b.status = "Cancelled"
    db.commit()

    r = client.post(f"/apis/v3/billing/bills/{bill.id}/approve", headers=_hdr(owner, comp))
    assert r.status_code == 409, r.text
    assert "cancelled" in r.json()["detail"].lower()
