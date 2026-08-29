"""Finding R2-754: Holiday Calendar feeds into payroll working days.

Clauses:
1. _working_days_in_month excludes declared company holidays falling on working days.
2. Holidays falling on existing weekly offs are not double-subtracted.
3. run_payroll queries company holidays and reduces effective_days_in_month accordingly.
4. An employee present on all working days in a month with holidays receives 100% pay (ratio = 1.0).
"""
import uuid
import datetime
import pytest

from app import models
from app.routers.hr import _working_days_in_month


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"PayHoli-{sfx}", user_name=f"UHoli-{sfx}",
        mobile=f"+9197{sfx}", email=f"payholi-{sfx}@test.com",
    )
    comp.weekly_off_days = ["Sunday"]
    return comp, user, team, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="PayHoli-Proj",
        code=f"PRJ-PH-{uuid.uuid4().hex[:6]}", status="Ongoing", state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


def test_r2_754_working_days_in_month_excludes_holidays():
    # August 2026 has 31 days, 5 Sundays (Aug 2, 9, 16, 23, 30) -> 26 working days with Sunday off.
    # Add Independence Day: Aug 15, 2026 (Saturday - a working day).
    h1 = datetime.datetime(2026, 8, 15, 0, 0, tzinfo=datetime.timezone.utc)
    days = _working_days_in_month("2026-08", ["Sunday"], holidays=[h1])
    assert days == 25, f"Expected 25 working days (26 minus 1 holiday on Saturday), got {days}"

    # Add another holiday that falls on Sunday (Aug 16, 2026) -> should not double-subtract
    h2 = datetime.datetime(2026, 8, 16, 0, 0, tzinfo=datetime.timezone.utc)
    days_with_sunday_holiday = _working_days_in_month("2026-08", ["Sunday"], holidays=[h1, h2])
    assert days_with_sunday_holiday == 25, f"Sunday holiday must not double-subtract: got {days_with_sunday_holiday}"


def test_r2_754_run_payroll_integrates_holiday_calendar(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    # 1. Create a declared holiday for 2026-08-15
    h_res = client.post(
        f"/apis/v3/hr/holidays/{comp.id}",
        headers=hdr,
        json={"name": "Independence Day", "date": "2026-08-15"},
    )
    assert h_res.status_code == 201, h_res.text

    # 2. Create an active employee
    emp = models.StaffEmployee(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        name="Ramesh Kumar",
        employee_code=f"EMP-{uuid.uuid4().hex[:6]}",
        designation="Engineer",
        basic_salary=50000.0,
        hra=20000.0,
        other_allowances=10000.0,
        status="active",
    )
    db.add(emp)
    db.commit()

    # 3. Seed attendance for all 25 working days in August 2026 (excluding 5 Sundays and Aug 15 holiday)
    # Aug 2026: 31 days. Sundays: 2, 9, 16, 23, 30. Holiday: 15.
    working_days = [
        d for d in range(1, 32)
        if datetime.date(2026, 8, d).weekday() != 6 and d != 15
    ]
    assert len(working_days) == 25

    for d in working_days:
        att = models.AttendanceLog(
            id=uuid.uuid4(),
            project_id=project.id,
            employee_id=emp.id,
            attendance_date=datetime.datetime(2026, 8, d, 9, 0, tzinfo=datetime.timezone.utc),
            status="Present",
        )
        db.add(att)
    db.commit()

    # 4. Run payroll for 2026-08
    res = client.post(
        "/apis/v3/hr/payroll/run",
        headers=hdr,
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "payroll_month": "2026-08",
        },
    )
    assert res.status_code == 201, res.text
    run_id = res.json()["id"]

    # 5. Check payslip
    sl_res = client.get(f"/apis/v3/hr/payroll/{run_id}/payslips", headers=hdr)
    assert sl_res.status_code == 200, sl_res.text
    slips = sl_res.json()
    assert len(slips) == 1
    slip = slips[0]

    # Effective days in month must be 25 (not 26)
    assert slip["days_in_month"] == 25, f"Expected 25 days_in_month but got {slip['days_in_month']}"
    assert slip["days_present"] == 25
    # Full gross salary 80,000 paid at 100% (not 25/26 * 80000 = 76923)
    assert slip["gross_salary"] == pytest.approx(80000.0), f"Expected 80000.0 but got {slip['gross_salary']}"
