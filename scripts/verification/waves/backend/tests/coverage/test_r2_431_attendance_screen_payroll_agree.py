"""R2-431 - one absence must mean the same thing to every surface.

The finding: a worker with a punch-in showed as "Absent" on the Payroll ->
Attendance tab (the rollup fetch was swallowed into [] and every unlogged
employee defaulted to Absent), while POST /hr/payroll/run paid that same
absence as a FULL MONTH - the zero-attendance fallback handed out
days_in_month unconditionally, so recording nothing was the best-paid state
on site.

Fix: the fallback now pays only when assume_full_month is explicitly opted
into (salaried staff who do not punch); no recorded days otherwise pay zero,
and recorded Present days count as themselves - so the screen and the payslip
finally answer the same question from the same rows.

Gate: an employee with no attendance and no leave earns 0 by default and a
full month only under assume_full_month=true; an employee with a punch-in is
paid for the punched day, never the fallback.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R2431{sfx}", user_name=f"U{sfx}",
        mobile=f"+9197{sfx}", email=f"r2431-{sfx}@test.com",
    )
    return comp, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-{uuid.uuid4().hex[:8]}", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _employee(db, comp, project):
    e = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"W-{uuid.uuid4().hex[:6]}", basic_salary=Decimal("18000"),
    )
    db.add(e)
    db.commit()
    return e


def _punch_in(db, emp, project, day="2026-04-14"):
    dt = datetime.fromisoformat(day).replace(tzinfo=timezone.utc)
    db.add(models.AttendanceLog(
        id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
        attendance_date=dt, punch_in=dt, status="Present",
        is_within_geofence=True, shift_multiplier=Decimal("1"),
        hours_worked=Decimal("8"), overtime_hours=Decimal("0"),
    ))
    db.commit()


def test_zero_attendance_pays_zero_by_default(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    emp = _employee(db, comp, project)

    r = client.post("/apis/v3/hr/payroll/run", headers=hdr, json={
        "company_id": str(comp.id), "payroll_month": "2026-04", "days_in_month": 26,
    })
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    # The old fallback paid 26/26 = a full Rs 18,000 for doing nothing recorded.
    assert slip["days_present"] == pytest.approx(0.0), r.text
    assert slip["gross_salary"] == pytest.approx(0.0), r.text
    assert slip["net_payable"] == pytest.approx(0.0), r.text


def test_assume_full_month_opt_in_restores_full_month_default(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    emp = _employee(db, comp, project)

    r = client.post("/apis/v3/hr/payroll/run", headers=hdr, json={
        "company_id": str(comp.id), "payroll_month": "2026-04",
        "days_in_month": 26, "assume_full_month": True,
    })
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["days_present"] == pytest.approx(26.0), r.text
    assert slip["gross_salary"] == pytest.approx(18000.0), r.text


def test_recorded_punch_counts_as_itself_never_the_fallback(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    emp = _employee(db, comp, project)
    _punch_in(db, emp, project)

    r = client.post("/apis/v3/hr/payroll/run", headers=hdr, json={
        "company_id": str(comp.id), "payroll_month": "2026-04", "days_in_month": 26,
    })
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["days_present"] == pytest.approx(1.0), r.text
    assert slip["gross_salary"] == pytest.approx(round(18000.0 / 26, 2)), r.text
