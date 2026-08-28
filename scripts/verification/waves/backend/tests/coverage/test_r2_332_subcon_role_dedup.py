"""R2-332 - subcontractor attendance de-dup must not split crews on role casing.

create_subcon_attendance upserts on (project, subcontractor, labor_role, day),
but labor_role is free text and was compared exactly, so "Mason", "mason" and
"Mason " booked the same crew twice on one day and inflated labour totals.

Gate: re-posting the same day's headcount with a differently-cased / padded
role updates the existing row in place (one row, latest counts), while a
genuinely distinct role still gets its own row.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]

_DAY = "2026-08-10T09:00:00Z"


def _post(client, hdr, project_id, subcon_id, role, workers):
    return client.post(
        "/apis/v3/subcon/attendance",
        headers=hdr,
        json={
            "project_id": str(project_id),
            "subcontractor_id": str(subcon_id),
            "attendance_date": _DAY,
            "labor_role": role,
            "worker_count": workers,
        },
    )


def test_r2_332_role_casing_collapses_to_one_row(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2332-{_SUFFIX}", user_name="U2332",
        mobile=f"+9193{_SUFFIX}", email=f"r2332-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2332",
        code=f"PRJ-2332-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    subcon = models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id)
    db.add(subcon)
    db.commit()

    r1 = _post(client, hdr, project.id, subcon.id, "Mason ", 40)
    assert r1.status_code == 201, r1.text
    first_id = r1.json()["id"]

    # Same crew, phone autocapitalise: must update, not insert a second row.
    r2 = _post(client, hdr, project.id, subcon.id, "mason", 12)
    assert r2.status_code == 201, r2.text
    assert r2.json()["id"] == first_id, r2.text

    rows = (
        db.query(models.SubcontractorAttendance)
        .filter(
            models.SubcontractorAttendance.project_id == project.id,
            models.SubcontractorAttendance.subcontractor_id == subcon.id,
        )
        .all()
    )
    assert len(rows) == 1, [(r.labor_role, r.worker_count) for r in rows]
    assert rows[0].labor_role == "Mason"
    assert int(rows[0].worker_count) == 12

    # A genuinely different role is still a separate crew.
    r3 = _post(client, hdr, project.id, subcon.id, "Helper", 8)
    assert r3.status_code == 201, r3.text
    assert r3.json()["id"] != first_id
    rows = (
        db.query(models.SubcontractorAttendance)
        .filter(models.SubcontractorAttendance.project_id == project.id)
        .all()
    )
    assert len(rows) == 2, [(r.labor_role, r.worker_count) for r in rows]
