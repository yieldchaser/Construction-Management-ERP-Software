"""R2-354 / R2-355 - payroll pro-rata cap and real-month validation.

R2-354: _compute_payslip divided days_present by a caller-supplied
days_in_month (default 26) with no cap, so 30 calendar attendance days paid
115% of gross (30/26 = 1.153), with PF/HRA/ESI prorated up to match. The
ratio is now clamped to 1.0: attendance above the divisor never pays more
than one full month.

R2-355: PayrollRunCreate.payroll_month's ^\\d{4}-\\d{2}$ pattern accepted
"2026-13", which run_payroll fed straight into datetime(year, month, 1) and
crashed with an unhandled ValueError (500). The month is now validated at
the schema so impossible months return a 422 naming the valid format.

Gate: "2026-13" and "2026-00" are rejected with 422 (not 500), and a run
where days_present exceeds days_in_month pays exactly one full gross.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R354{sfx}", user_name=f"U{sfx}",
        mobile=f"+9198{sfx}", email=f"r354-{sfx}@test.com",
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


def _attendance(db, emp, project, year, month, days):
    for d in range(1, days + 1):
        dt = datetime(year, month, d, tzinfo=timezone.utc)
        db.add(models.AttendanceLog(
            id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
            attendance_date=dt, punch_in=dt, status="Present",
            is_within_geofence=True, shift_multiplier=Decimal("1"),
            hours_worked=Decimal("8"), overtime_hours=Decimal("0"),
        ))
    db.commit()


def test_payroll_month_2026_13_is_422_not_500(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)

    r = client.post("/apis/v3/hr/payroll/run", headers=hdr, json={
        "company_id": str(comp.id), "payroll_month": "2026-13",
    })
    assert r.status_code == 422, r.text
    assert "YYYY-MM" in r.text, r.text

    # "2026-00" crashed datetime() the same way before the fix.
    r2 = client.post("/apis/v3/hr/payroll/run", headers=hdr, json={
        "company_id": str(comp.id), "payroll_month": "2026-00",
    })
    assert r2.status_code == 422, r2.text


def test_days_present_above_days_in_month_caps_gross_at_full_month(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    emp = _employee(db, comp, project)
    _attendance(db, emp, project, 2026, 4, 30)

    r = client.post("/apis/v3/hr/payroll/run", headers=hdr, json={
        "company_id": str(comp.id), "payroll_month": "2026-04", "days_in_month": 26,
    })
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["days_present"] == pytest.approx(30.0), r.text

    # Uncapped math would pay round(18000 * 30 / 26, 2) = 20769.23 (115%).
    uncapped = round(18000.0 * 30 / 26, 2)
    assert slip["gross_salary"] == pytest.approx(18000.0), r.text
    assert slip["gross_salary"] < uncapped, r.text
    # Prorated components follow the same clamp instead of scaling past 100%.
    assert slip["basic"] == pytest.approx(18000.0), r.text
