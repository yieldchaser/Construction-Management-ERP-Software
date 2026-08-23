"""R2-507 - the muster roll must build itself from the attendance data the
product already holds.

Both statutory registers were standalone hand-typed tables: workers_present /
absent / hours / overtime all arrived as caller-supplied free numbers even
though the punch screen (AttendanceLog, hours computed on punch-out) and the
subcontractor crew drawer (SubcontractorAttendance.worker_count) hold every
one of them for the same project and day.

Gate: omitting figures on POST derives them for that site-day from punches and
crews (a crew row contributes its whole headcount), partially omitted fields
mix supplied and derived values, explicit values are still respected verbatim,
and a day with no source data fails loudly (422) instead of writing a silent
zero register.
"""
import uuid
from datetime import datetime

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

_DAY1 = "2026-08-14T09:00:00Z"
_DAY2 = "2026-08-15T09:00:00Z"
_DAY3 = "2026-08-16T09:00:00Z"


def _post(client, hdr, company_id, project_id, role, day, **figures):
    body = {
        "company_id": str(company_id),
        "project_id": str(project_id),
        "date": day,
        "labor_role": role,
    }
    body.update(figures)
    return client.post("/apis/v3/labour/muster-roll", headers=hdr, json=body)


def test_r2_507_muster_roll_derives_day_figures_from_attendance(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2507-{_SUFFIX}", user_name="U2507",
        mobile=f"+9195{_SUFFIX}", email=f"r2507-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2507",
        code=f"PRJ-2507-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.flush()
    e1 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name="Emp One")
    e2 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name="Emp Two")
    db.add_all([e1, e2])
    db.flush()
    # Punch screen: one full 8h shift + 1h overtime, one absent.
    db.add_all([
        models.AttendanceLog(
            id=uuid.uuid4(), employee_id=e1.id, project_id=project.id,
            attendance_date=datetime.fromisoformat(_DAY1.replace("Z", "+00:00")),
            status="Present", hours_worked=8.0, overtime_hours=1.0,
        ),
        models.AttendanceLog(
            id=uuid.uuid4(), employee_id=e2.id, project_id=project.id,
            attendance_date=datetime.fromisoformat(_DAY1.replace("Z", "+00:00")),
            status="Absent", hours_worked=None, overtime_hours=0.0,
        ),
    ])
    # Crew drawer: a 5-worker gang with 2 crew-level overtime hours.
    db.add(models.SubcontractorAttendance(
        id=uuid.uuid4(), project_id=project.id, subcontractor_id=team.id,
        attendance_date=datetime.fromisoformat(_DAY1.replace("Z", "+00:00")),
        labor_role="Mason", worker_count=5, overtime_hours=2.0,
    ))
    db.commit()

    # Fully hand-off: no figures at all.
    r = _post(client, hdr, comp.id, project.id, "Mason", _DAY1)
    assert r.status_code == 201, r.text
    row = r.json()
    assert row["workers_present"] == 6, row      # 1 non-absent punch + 5 crew workers
    assert row["workers_absent"] == 1, row       # the Absent punch
    assert float(row["hours_worked"]) == 8.0, row
    assert float(row["overtime_hours"]) == 3.0, row  # 1 from punches + 2 from the crew

    # Partial omission mixes supplied and derived values.
    e3 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name="Emp Three")
    db.add(e3)
    db.flush()
    db.add(models.AttendanceLog(
        id=uuid.uuid4(), employee_id=e3.id, project_id=project.id,
        attendance_date=datetime.fromisoformat(_DAY2.replace("Z", "+00:00")),
        status="Present", hours_worked=9.0, overtime_hours=2.0,
    ))
    db.commit()
    r2 = _post(client, hdr, comp.id, project.id, "Helper", _DAY2, workers_present=10)
    assert r2.status_code == 201, r2.text
    row2 = r2.json()
    assert row2["workers_present"] == 10, row2   # supplied wins
    assert row2["workers_absent"] == 0, row2     # derived
    assert float(row2["hours_worked"]) == 9.0, row2
    assert float(row2["overtime_hours"]) == 2.0, row2

    # Explicit everything still lands verbatim (pre-R2-507 callers unaffected).
    r3 = _post(
        client, hdr, comp.id, project.id, "Supervisor", _DAY3,
        workers_present=4, workers_absent=1, hours_worked=32.0, overtime_hours=4.0,
    )
    assert r3.status_code == 201, r3.text
    row3 = r3.json()
    assert row3["workers_present"] == 4 and row3["workers_absent"] == 1, row3
    assert float(row3["hours_worked"]) == 32.0, row3

    # A day with no attendance sources refuses to fabricate a zero register.
    r4 = _post(client, hdr, comp.id, project.id, "Mason", "2026-08-17T09:00:00Z")
    assert r4.status_code == 422, r4.text
