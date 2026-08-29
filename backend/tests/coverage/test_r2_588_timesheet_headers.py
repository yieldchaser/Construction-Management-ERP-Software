"""R2-588 - the Weekly Timesheet Approvals table needs timesheet HEADERS.

The console's approvals table renders a `timesheets` state array that nothing
ever populated: setTimesheets appeared twice, as the useState and as an
optimistic `prev.map` over a permanently empty array. The Submit and Approve
buttons only exist inside those rows, so the entire weekly approval workflow was
unreachable and every timesheet stayed draft forever.

The Round 11 correction recorded on the finding matters: wiring alone is not
enough. Both GET /hr/timesheets/project/{id} and GET /hr/timesheets/company/{id}
return List[TimesheetEntryResponse] -- entries, not headers -- so no endpoint in
the API returned headers at all. A new one is required.

Why no API probe could have found this: every request the screen makes returns
200 with correct data. The defect is a state variable that is read and never
written.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app import models


def _project(db, company_id, name):
    p = models.Project(id=uuid.uuid4(), company_id=company_id, name=name, status="Ongoing")
    db.add(p)
    db.commit()
    return p


def _employee(db, company_id, project_id, name):
    e = models.StaffEmployee(
        id=uuid.uuid4(), company_id=company_id, project_id=project_id, name=name
    )
    db.add(e)
    db.commit()
    return e


def _timesheet(db, employee_id, project_id, status="draft", hours=40.0):
    start = datetime(2026, 8, 3, tzinfo=timezone.utc)
    ts = models.Timesheet(
        id=uuid.uuid4(),
        employee_id=employee_id,
        project_id=project_id,
        week_start=start,
        week_end=start + timedelta(days=6),
        total_hours=hours,
        status=status,
    )
    db.add(ts)
    db.commit()
    return ts


def _headers(client, hdr, project_id):
    return client.get(
        f"/apis/v3/hr/timesheets/project/{project_id}/headers", headers=hdr
    )


def test_headers_endpoint_returns_timesheet_headers(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R588A", user_name="U588A")
    hdr = auth_headers(user, comp)
    project = _project(db, comp.id, "R588A Project")
    emp = _employee(db, comp.id, project.id, "Ramesh Kumar")
    ts = _timesheet(db, emp.id, project.id, status="submitted", hours=42.5)

    r = _headers(client, hdr, project.id)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1, "the approvals table has nothing to render"
    row = rows[0]
    assert row["id"] == str(ts.id)
    assert row["employee_name"] == "Ramesh Kumar"
    assert row["status"] == "submitted"
    assert row["total_hours"] == 42.5


def test_headers_are_not_entries(client, db, make_tenant, auth_headers):
    """The distinction the Round 11 correction recorded."""
    comp, user, _ = make_tenant(company_name="R588B", user_name="U588B")
    hdr = auth_headers(user, comp)
    project = _project(db, comp.id, "R588B Project")
    emp = _employee(db, comp.id, project.id, "Suresh")
    ts = _timesheet(db, emp.id, project.id)

    db.add(models.TimesheetEntry(
        id=uuid.uuid4(),
        timesheet_id=ts.id,
        entry_date=datetime(2026, 8, 4, tzinfo=timezone.utc),
        hours=8.0,
        activity_description="Shuttering",
    ))
    db.add(models.TimesheetEntry(
        id=uuid.uuid4(),
        timesheet_id=ts.id,
        entry_date=datetime(2026, 8, 5, tzinfo=timezone.utc),
        hours=8.0,
        activity_description="Rebar",
    ))
    db.commit()

    rows = _headers(client, hdr, project.id).json()
    # Two entries belong to ONE header: the approvals table wants one row per
    # timesheet, not one per entry.
    assert len(rows) == 1, "headers collapsed into per-entry rows"
    assert rows[0]["status"] == "draft"


def test_headers_requires_project_membership(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="R588C", user_name="U588C")
    comp_b, user_b, _ = make_tenant(company_name="R588D", user_name="U588D")
    hdr_b = auth_headers(user_b, comp_b)

    project_a = _project(db, comp_a.id, "R588C Project")
    emp = _employee(db, comp_a.id, project_a.id, "Worker")
    _timesheet(db, emp.id, project_a.id)

    r = _headers(client, hdr_b, project_a.id)
    assert r.status_code in (403, 404), r.text


def test_headers_empty_for_project_with_none(client, db, make_tenant, auth_headers):
    """Honest empty state, not a fabricated row."""
    comp, user, _ = make_tenant(company_name="R588E", user_name="U588E")
    hdr = auth_headers(user, comp)
    project = _project(db, comp.id, "R588E Project")

    r = _headers(client, hdr, project.id)
    assert r.status_code == 200, r.text
    assert r.json() == []
