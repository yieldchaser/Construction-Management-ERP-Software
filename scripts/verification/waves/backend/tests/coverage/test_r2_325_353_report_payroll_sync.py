"""R2-325 / R2-353 - attendance-salary report agrees with payroll, and payroll months are idempotent.

R2-325: payroll counts both punch-in statuses ("Present" and "Present
(Off-Site)", hr.py run_payroll) but _rep_attendance_salary exact-matched
"Present", so an employee paid for 20 days was reported present for 14 and
every reconciliation looked like fraud.

Gate: an employee with one on-site and one off-site punch shows
Total Present Days = 2 on /reports/data/attendance-salary.

R2-353: run_payroll always created a NEW PayrollRun with no lookup on
(company_id, project_id, payroll_month), set finalized in the same request,
had no unique constraint and no void path - a double-click doubled the
salary liability permanently.

Gate: running the same month twice 409s naming the existing run id and no
second run is minted; a different month still runs cleanly.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app import models


def _tenant(make_tenant, auth_headers, tag):
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R{tag}{sfx}", user_name=f"U{sfx}",
        mobile=f"+919{sfx}", email=f"r{tag}-{sfx}@test.com",
    )
    return comp, auth_headers(user, comp)


def _project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-{tag}-{uuid.uuid4().hex[:6]}", code=f"PRJ-{tag}-{uuid.uuid4().hex[:8]}",
        status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _employee(db, comp, project, tag):
    e = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"Worker {tag} {uuid.uuid4().hex[:6]}", status="active",
        basic_salary=Decimal("18000"),
    )
    db.add(e)
    db.commit()
    return e


def _punch(db, emp, project, day, status):
    dt = datetime(2026, 5, day, 9, 0, tzinfo=timezone.utc)
    db.add(models.AttendanceLog(
        id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
        attendance_date=dt, punch_in=dt, status=status,
        is_within_geofence=(status == "Present"), shift_multiplier=Decimal("1"),
        hours_worked=Decimal("8"), overtime_hours=Decimal("0"),
    ))


def test_attendance_salary_report_counts_offsite_days_like_payroll(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers, "325")
    project = _project(db, comp, "325")
    emp = _employee(db, comp, project, "OffSite")

    # One geofenced punch and one off-site punch: payroll pays for both.
    _punch(db, emp, project, 4, "Present")
    _punch(db, emp, project, 5, "Present (Off-Site)")
    db.commit()

    r = client.get(f"/apis/v3/reports/data/attendance-salary?company_id={comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    row = next(x for x in r.json()["rows"] if x["Party Name"] == emp.name)
    assert row["Total Present Days"] == 2, r.text


def test_same_payroll_month_twice_conflicts_naming_existing_run(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers, "353a")
    project = _project(db, comp, "353a")
    _employee(db, comp, project, "A")

    payload = {"company_id": str(comp.id), "project_id": str(project.id), "payroll_month": "2026-05"}
    r1 = client.post("/apis/v3/hr/payroll/run", headers=hdr, json=payload)
    assert r1.status_code == 201, r1.text
    first_run_id = r1.json()["id"]

    r2 = client.post("/apis/v3/hr/payroll/run", headers=hdr, json=payload)
    assert r2.status_code == 409, r2.text
    assert first_run_id in r2.json()["detail"], r2.text

    runs = db.query(models.PayrollRun).filter(
        models.PayrollRun.company_id == comp.id,
        models.PayrollRun.project_id == project.id,
        models.PayrollRun.payroll_month == "2026-05",
    ).all()
    assert len(runs) == 1, [str(x.id) for x in runs]


def test_different_payroll_months_still_run_independently(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers, "353b")
    project = _project(db, comp, "353b")
    _employee(db, comp, project, "B")

    base = {"company_id": str(comp.id), "project_id": str(project.id)}
    r1 = client.post("/apis/v3/hr/payroll/run", headers=hdr,
                     json={**base, "payroll_month": "2026-06"})
    assert r1.status_code == 201, r1.text

    r2 = client.post("/apis/v3/hr/payroll/run", headers=hdr,
                     json={**base, "payroll_month": "2026-07"})
    assert r2.status_code == 201, r2.text
