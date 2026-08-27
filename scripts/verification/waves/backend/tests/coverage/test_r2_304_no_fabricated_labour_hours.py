"""R2-304 - analytics must not invent eight hours of labour.

A log with hours_worked null is an open punch-in (punch-out fails upstream,
R2-262), not a completed working day. The old fallback credited every such log
with a full 8.0-hour day, so on live data - where every record is stranded
open - the entire labour-productivity block was fabricated.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_employee(db, comp, project, tag):
    e = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name=f"Emp {tag}")
    db.add(e)
    db.commit()
    return e


def _mk_log(db, employee, project, hours_worked, status="Present"):
    log = models.AttendanceLog(
        id=uuid.uuid4(),
        employee_id=employee.id,
        project_id=project.id,
        attendance_date=datetime.datetime(2026, 8, 10, 9, 0, 0),
        status=status,
        hours_worked=hours_worked,
    )
    db.add(log)
    db.commit()
    return log


def test_null_hours_never_become_eight_hour_days(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R304A", user_name="U304A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "304")
    employee = _mk_employee(db, comp, project, "304")

    # One genuinely recorded day plus two punch-ins stranded open by the
    # broken punch-out. The old code scored this 8 + 8 + 8 = 24 hours.
    _mk_log(db, employee, project, 8.0)
    _mk_log(db, employee, project, None)
    _mk_log(db, employee, project, None)

    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    labour = r.json()["labour_productivity"]

    # Only recorded hours count: 8.0, never the fabricated 24.0.
    assert labour["total_hours"] == 8.0, labour
    assert labour["labour_days"] == 1.0, labour
    # The data gap is surfaced instead of filled.
    assert labour["logs_without_hours"] == 2, labour
