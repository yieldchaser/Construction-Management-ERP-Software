"""R2-606 — the payroll run obeys the Entry Controls back-dating window.

Gate: with restrict_entry_creation_enabled on, a payroll_month whose pay
period closed deeper into the past than restrict_entry_creation_days must be
rejected with 400, exactly as POST /finance/payments already rejects an old
payment_date (R2-381). The period's closing boundary is what ages, so running
last month's payroll on a normal window still passes. The window stays a
no-op while the flag is off.
"""
import datetime
import uuid

from app import models


def _enable_window(db, comp, days):
    comp.restrict_entry_creation_enabled = True
    comp.restrict_entry_creation_days = days
    db.commit()


def _months_ago(n):
    today = datetime.datetime.utcnow()
    month = today.month - n
    year = today.year
    while month <= 0:
        month += 12
        year -= 1
    return f"{year}-{month:02d}"


def _mk_employee(db, comp):
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, name="R606 Emp", status="active",
    )
    db.add(emp)
    db.commit()
    return emp


def test_backdated_payroll_period_is_rejected(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R606A", user_name="U606A")
    hdr = auth_headers(user, comp)
    _enable_window(db, comp, 40)
    _mk_employee(db, comp)

    r = client.post(
        "/apis/v3/hr/payroll/run",
        json={"company_id": str(comp.id), "payroll_month": _months_ago(3)},
        headers=hdr,
    )
    assert r.status_code == 400
    assert "Entry Controls" in r.json()["detail"]
    assert db.query(models.PayrollRun).filter_by(company_id=comp.id).count() == 0


def test_recent_period_still_runs(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R606B", user_name="U606B")
    hdr = auth_headers(user, comp)
    _enable_window(db, comp, 40)
    _mk_employee(db, comp)

    r = client.post(
        "/apis/v3/hr/payroll/run",
        json={"company_id": str(comp.id), "payroll_month": _months_ago(1), "days_in_month": 26},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    runs = db.query(models.PayrollRun).filter_by(company_id=comp.id).all()
    assert len(runs) == 1
    assert runs[0].status == "finalized"


def test_window_off_leaves_payroll_untouched(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R606C", user_name="U606C")
    hdr = auth_headers(user, comp)
    _mk_employee(db, comp)

    r = client.post(
        "/apis/v3/hr/payroll/run",
        json={"company_id": str(comp.id), "payroll_month": _months_ago(4)},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
