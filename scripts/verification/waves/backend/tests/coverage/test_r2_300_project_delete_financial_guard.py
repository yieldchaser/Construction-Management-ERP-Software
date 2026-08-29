"""R2-300 - deleting a project must not silently destroy its financial records.

DELETE /projects/{id} used to cascade away every bill, payment, purchase order
and payroll run under the project in one unconfirmed call, leaving a
delete_logs row that named only the project.

Gate: a project carrying any financial record refuses deletion with 409 and an
inventory of what is at stake (and nothing is destroyed); a project with no
financial records still deletes cleanly.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P300-{uuid.uuid4().hex[:6]}",
        code=f"PRJ-300-{uuid.uuid4().hex[:8]}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def test_r2_300_delete_refused_while_financial_records_exist(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2300-{_SUFFIX}", user_name="U300",
        mobile=f"+9192{_SUFFIX}", email=f"r2300-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp)

    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=p.id,
        party_company_user_id=team.id, invoice_number=f"ZZ300-{_SUFFIX}-1",
        invoice_date=datetime_utc(), invoice_type="purchase",
        subtotal=11000, gst_amount=0, total_payable=11000,
    ))
    db.commit()

    r = client.delete(f"/apis/v3/projects/{p.id}", headers=hdr)
    assert r.status_code == 409, r.text
    assert "bills: 1" in r.json()["detail"], r.text

    # Nothing was destroyed.
    db.expire_all()
    assert db.query(models.Project).filter(models.Project.id == p.id).first() is not None
    assert db.query(models.Bill).filter(models.Bill.project_id == p.id).count() == 1


def test_r2_300_delete_lists_every_blocked_record_type(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2300B-{_SUFFIX}", user_name="U300B",
        mobile=f"+9193{_SUFFIX}", email=f"r2300b-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp)
    db.add(models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=p.id,
        po_number=f"ZZ300-PO-{_SUFFIX}", po_date=datetime_utc(),
    ))
    db.add(models.PayrollRun(
        id=uuid.uuid4(), company_id=comp.id, project_id=p.id, payroll_month="2026-08",
    ))
    db.commit()

    r = client.delete(f"/apis/v3/projects/{p.id}", headers=hdr)
    assert r.status_code == 409, r.text
    detail = r.json()["detail"]
    assert "purchase_orders: 1" in detail and "payroll_runs: 1" in detail, detail
    assert db.query(models.Project).filter(models.Project.id == p.id).first() is not None


def test_r2_300_clean_project_still_deletes(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2300C-{_SUFFIX}", user_name="U300C",
        mobile=f"+9194{_SUFFIX}", email=f"r2300c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    p = _mk_project(db, comp)

    r = client.delete(f"/apis/v3/projects/{p.id}", headers=hdr)
    assert r.status_code == 200, r.text
    assert db.query(models.Project).filter(models.Project.id == p.id).first() is None


def datetime_utc():
    from datetime import datetime, timezone
    return datetime.now(timezone.utc)
