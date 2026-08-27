"""R2-561 / R2-564 - entry duration derived server-side; ghost employee 4xx not 500.

R2-561: TimesheetEntryCreate carried three representations of one span of work
(hours, start_time/end_time, duration) and cross-checked none of them: only
hours was validated and a client-supplied duration was stored verbatim, so one
row could claim 09:00-10:00 while also claiming 99,999 minutes. duration is now
derived by the server (start/end delta when both are present, else hours*60)
and any client value is discarded; end <= start is rejected instead of being
persisted as a negative duration.

R2-564 (backend half): POST /hr/timesheets enforced the staff_employees FK only
in the database, so posting a header with a stale/unresolvable employee_id
crashed with a raw 500.

Gate: creating a timesheet for a nonexistent employee returns 404 (not 500),
and an entry's stored/returned duration is derived regardless of the duration
the client sends - both when start/end are given and when they are not.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

_WEEK_START = "2026-08-17T00:00:00Z"
_WEEK_END = "2026-08-23T23:59:59Z"
_ENTRY_DATE = "2026-08-19T12:00:00Z"


def _tenant(make_tenant):
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R2561-{sfx}", user_name=f"U{sfx}",
        mobile=f"+9194{sfx}", email=f"r2561-{sfx}@test.com",
    )
    return comp, user


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-2561-{_SUFFIX}", code=f"PRJ-2561-{uuid.uuid4().hex[:6]}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def test_timesheet_for_nonexistent_employee_is_404_not_500(client, db, make_tenant, auth_headers):
    comp, user = _tenant(make_tenant)
    project = _project(db, comp)

    r = client.post("/apis/v3/hr/timesheets", headers=auth_headers(user, comp), json={
        "employee_id": str(uuid.uuid4()),  # no such staff_employees row anywhere
        "project_id": str(project.id),
        "week_start": _WEEK_START,
        "week_end": _WEEK_END,
    })
    assert r.status_code == 404, r.text
    assert "employee" in r.json()["detail"].lower(), r.text

    # Nothing was written behind the failure.
    assert db.query(models.Timesheet).filter(
        models.Timesheet.project_id == project.id
    ).count() == 0


def test_entry_duration_derived_server_side_regardless_of_client_value(client, db, make_tenant, auth_headers):
    comp, user = _tenant(make_tenant)
    project = _project(db, comp)
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"E-2561-{_SUFFIX}", basic_salary=18000,
    )
    db.add(emp)
    db.commit()

    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/hr/timesheets", headers=hdr, json={
        "employee_id": str(emp.id),
        "project_id": str(project.id),
        "week_start": _WEEK_START,
        "week_end": _WEEK_END,
    })
    assert r.status_code == 201, r.text
    ts_id = r.json()["id"]

    base = {"task_id": None, "entry_date": _ENTRY_DATE}

    # Client lies about duration alongside a real start/end window.
    r1 = client.post(f"/apis/v3/hr/timesheets/{ts_id}/entries", headers=hdr, json={
        **base,
        "hours": 1,
        "start_time": "2026-08-19T09:00:00Z",
        "end_time": "2026-08-19T10:00:00Z",
        "duration": 99999,
    })
    assert r1.status_code == 201, r1.text
    assert r1.json()["duration"] == 60, r1.text

    # No start/end -> derived from hours; client value still discarded.
    r2 = client.post(f"/apis/v3/hr/timesheets/{ts_id}/entries", headers=hdr, json={
        **base, "hours": 2.5, "duration": 99999,
    })
    assert r2.status_code == 201, r2.text
    assert r2.json()["duration"] == 150, r2.text

    # The persisted rows agree with the derivation, not the client.
    rows = db.query(models.TimesheetEntry).filter(
        models.TimesheetEntry.timesheet_id == uuid.UUID(ts_id)
    ).all()
    by_hours = {float(row.hours): row.duration for row in rows}
    assert by_hours[1.0] == 60, by_hours
    assert by_hours[2.5] == 150, by_hours

    # end <= start can never persist a negative duration again.
    r3 = client.post(f"/apis/v3/hr/timesheets/{ts_id}/entries", headers=hdr, json={
        **base,
        "hours": 8,
        "start_time": "2026-08-19T17:00:00Z",
        "end_time": "2026-08-19T09:00:00Z",
    })
    assert r3.status_code == 422, r3.text
