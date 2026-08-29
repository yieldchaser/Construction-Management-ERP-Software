"""R2-430 - GET /hr/attendance/company/{cid}/{date} must survive populated days.

CompanyAttendanceResponse requires employee_name, but the rollup validated
each AttendanceLog ORM row directly; the model carries no such column, so any
day with at least one attendance row raised ValidationError (500) while an
empty day returned 200 []. The joined StaffEmployee.name is now carried into
each row explicitly.

Gate: a company whose day has two employees' punches returns 200 with each
row naming its own employee, and a day with no rows still returns 200 [].
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

_DAY = "2026-07-27"


def test_company_attendance_names_rows_and_empty_day_still_200(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name=f"R2430-{_SUFFIX}", user_name="U2430",
        mobile=f"+9194{_SUFFIX}", email=f"r2430-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2430",
        code=f"PRJ-2430-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    names = {"Asha R2430": None, "Bharat R2430": None}
    for name in names:
        emp = models.StaffEmployee(
            id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
            name=name, basic_salary=Decimal("18000"),
        )
        names[name] = emp
        db.add(emp)
    db.commit()

    noon = datetime(2026, 7, 27, 12, 0, tzinfo=timezone.utc)
    for i, emp in enumerate(names.values()):
        db.add(models.AttendanceLog(
            id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
            attendance_date=noon, punch_in=noon, status="Present",
            is_within_geofence=True, shift_multiplier=Decimal("1"),
            hours_worked=Decimal("8.5"), overtime_hours=Decimal("1.5") if i else Decimal("0"),
        ))
    db.commit()

    # Populated day: 200 with every row carrying its own real employee name.
    r = client.get(f"/apis/v3/hr/attendance/company/{comp.id}/{_DAY}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 2, r.text
    by_id = {str(emp.id): name for name, emp in names.items()}
    for row in rows:
        assert row["employee_name"] == by_id[row["employee_id"]], row
        assert row["hours_worked"] == 8.5, row

    # Empty day: still 200 with no rows.
    r2 = client.get(f"/apis/v3/hr/attendance/company/{comp.id}/2026-07-01", headers=hdr)
    assert r2.status_code == 200, r2.text
    assert r2.json() == [], r2.text
