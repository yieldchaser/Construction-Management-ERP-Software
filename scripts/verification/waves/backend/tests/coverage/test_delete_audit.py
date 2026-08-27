"""Item 3 verification: the new DELETE endpoints are tenant-scoped (cross-tenant
deletes are rejected) and actually write to the DeleteLog audit trail.

This is the regression test for the real IDOR class of bugs fixed earlier in
this project's history: a user must never be able to delete another company's
records just by guessing/submitting an id."""
import datetime
import uuid

from app import models


def test_crm_lead_delete_tenant_scoped_and_audited(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919999999991")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919999999992")
    hdr_a = auth_headers(user_a, comp_a)
    hdr_b = auth_headers(user_b, comp_b)

    r = client.post(
        "/apis/v3/crm/leads",
        json={"company_id": str(comp_a.id), "lead_type": "New", "contact_name": "Lead X", "phone_no": "+919999999900"},
        headers=hdr_a,
    )
    assert r.status_code == 201
    lead_id = r.json()["id"]

    # Cross-tenant delete must be rejected and the row left intact.
    r2 = client.delete(f"/apis/v3/crm/leads/{lead_id}", headers=hdr_b)
    assert r2.status_code == 403
    assert db.query(models.CRMLead).filter(models.CRMLead.id == uuid.UUID(lead_id)).first() is not None

    # Same-tenant delete succeeds and writes an audit log.
    r3 = client.delete(f"/apis/v3/crm/leads/{lead_id}", headers=hdr_a)
    assert r3.status_code == 204
    assert db.query(models.CRMLead).filter(models.CRMLead.id == uuid.UUID(lead_id)).first() is None
    log = (
        db.query(models.DeleteLog)
        .filter(models.DeleteLog.entity_type == "crm_lead", models.DeleteLog.entity_id == lead_id)
        .first()
    )
    assert log is not None
    assert str(log.company_id) == str(comp_a.id)


def test_finance_payment_delete_tenant_scoped(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919999999993")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919999999994")
    p = models.Payment(
        id=uuid.uuid4(), company_id=comp_a.id, payment_type="out", amount=100.0, unsettled_amount=100.0,
        payment_method="cash", payment_date=datetime.datetime(2026, 1, 1),
    )
    db.add(p)
    db.commit()

    r = client.delete(f"/apis/v3/finance/payments/{p.id}", headers=auth_headers(user_b, comp_b))
    assert r.status_code == 403
    assert db.query(models.Payment).filter(models.Payment.id == p.id).first() is not None

    r2 = client.delete(f"/apis/v3/finance/payments/{p.id}", headers=auth_headers(user_a, comp_a))
    assert r2.status_code == 204
    assert db.query(models.Payment).filter(models.Payment.id == p.id).first() is None
    log = (
        db.query(models.DeleteLog)
        .filter(models.DeleteLog.entity_type == "payment", models.DeleteLog.entity_id == str(p.id))
        .first()
    )
    assert log is not None


def test_hr_timesheet_delete_tenant_scoped(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919999999995")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919999999996")
    # Timesheet has no company_id column of its own; tenancy is resolved via
    # its project, so the fixture needs a real Project to link through.
    project = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="Test Project", code="TP-1", status="Ongoing")
    db.add(project)
    db.commit()
    ts = models.Timesheet(
        id=uuid.uuid4(), employee_id=uuid.uuid4(), project_id=project.id,
        week_start=datetime.datetime(2026, 1, 1), week_end=datetime.datetime(2026, 1, 7),
        total_hours=0, status="draft",
    )
    db.add(ts)
    db.commit()

    r = client.delete(f"/apis/v3/hr/timesheets/{ts.id}", headers=auth_headers(user_b, comp_b))
    assert r.status_code == 403
    assert db.query(models.Timesheet).filter(models.Timesheet.id == ts.id).first() is not None

    r2 = client.delete(f"/apis/v3/hr/timesheets/{ts.id}", headers=auth_headers(user_a, comp_a))
    assert r2.status_code == 204
    assert db.query(models.Timesheet).filter(models.Timesheet.id == ts.id).first() is None
    log = (
        db.query(models.DeleteLog)
        .filter(models.DeleteLog.entity_type == "timesheet", models.DeleteLog.entity_id == str(ts.id))
        .first()
    )
    assert log is not None
