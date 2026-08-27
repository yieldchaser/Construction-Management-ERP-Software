"""R2-540 - GET /hr/timesheets/company/{cid} must scope by the project's company.

The rollup filtered on `Timesheet.company_id`, a column that does not exist
(models.Timesheet carries only employee_id + project_id), so every call raised
AttributeError -> 500. Tenancy is resolved via the joined Project
(Timesheet.project_id -> Project.company_id), exactly as delete_timesheet's
docstring already claims this endpoint works.

Gate: two companies each holding timesheets with entries return 200, and the
endpoint hands back only the caller company's entries.
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

_WEEK_START = datetime(2026, 8, 17, 0, 0, tzinfo=timezone.utc)
_WEEK_END = datetime(2026, 8, 23, 23, 59, tzinfo=timezone.utc)
_ENTRY_DATE = datetime(2026, 8, 19, 12, 0, tzinfo=timezone.utc)


def _seed_timesheet_entry(db, comp, project_code):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-{project_code}", code=f"PRJ-{project_code}", status="Ongoing",
    )
    db.add(project)
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"E-{project_code}", basic_salary=Decimal("18000"),
    )
    db.add(emp)
    db.flush()
    ts = models.Timesheet(
        id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
        week_start=_WEEK_START, week_end=_WEEK_END,
        total_hours=Decimal("8"), status="approved",
    )
    db.add(ts)
    db.flush()
    entry = models.TimesheetEntry(
        id=uuid.uuid4(), timesheet_id=ts.id, entry_date=_ENTRY_DATE,
        hours=Decimal("8"), activity_description=f"work-{project_code}",
    )
    db.add(entry)
    return entry


def test_company_timesheets_returns_only_caller_company_rows(client, db, make_tenant, auth_headers):
    comp_a, user_a, _team_a = make_tenant(
        company_name=f"R2540A-{_SUFFIX}", user_name="U2540A",
        mobile=f"+9195{_SUFFIX}", email=f"r2540a-{_SUFFIX}@test.com",
    )
    comp_b, _user_b, _team_b = make_tenant(
        company_name=f"R2540B-{_SUFFIX}", user_name="U2540B",
        mobile=f"+9196{_SUFFIX}", email=f"r2540b-{_SUFFIX}@test.com",
    )

    own_entry = _seed_timesheet_entry(db, comp_a, f"A-{_SUFFIX}")
    foreign_entry = _seed_timesheet_entry(db, comp_b, f"B-{_SUFFIX}")
    db.commit()

    hdr = auth_headers(user_a, comp_a)

    # The exact call that used to 500 on every input.
    r = client.get(f"/apis/v3/hr/timesheets/company/{comp_a.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1, r.text
    row = rows[0]
    assert row["id"] == str(own_entry.id), row
    assert row["timesheet_id"] == str(own_entry.timesheet_id), row
    assert row["employee_name"] == f"E-A-{_SUFFIX}", row
    assert row["project_name"] == f"P-A-{_SUFFIX}", row
    assert row["hours"] == 8.0, row
    assert str(foreign_entry.id) not in {x["id"] for x in rows}, r.text

    # Cross-tenant probe: company B's owner sees B's row, not A's.
    r2 = client.get(f"/apis/v3/hr/timesheets/company/{comp_b.id}",
                    headers=auth_headers(_user_b, comp_b))
    assert r2.status_code == 200, r2.text
    ids2 = {x["id"] for x in r2.json()}
    assert ids2 == {str(foreign_entry.id)}, r2.text

    # Non-member of the company stays locked out (dependency intact).
    r3 = client.get(f"/apis/v3/hr/timesheets/company/{comp_b.id}", headers=hdr)
    assert r3.status_code == 403, r3.text
