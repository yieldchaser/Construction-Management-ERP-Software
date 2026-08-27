"""R2-333 - the muster roll (a statutory register) must not record a gang twice.

POST /labour/muster-roll inserted another row for every submission with no
existence check of any kind, so a double-tap, a retry after a timeout or two
supervisors filing the same gang put the workers in the inspection register
twice. The subcon attendance endpoint already upserts on
(project, subcontractor, role, day) - R2-332.

Gate: re-posting the same day's figures for the same contractor + day +
role (any casing/padding) updates the existing row in place and returns 200,
while a different role or a different day still gets its own 201 row.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _post(client, hdr, company_id, project_id, contractor_id, day, role, present):
    return client.post(
        "/apis/v3/labour/muster-roll",
        headers=hdr,
        json={
            "company_id": str(company_id),
            "project_id": str(project_id),
            "contractor_id": str(contractor_id) if contractor_id else None,
            "date": day,
            "labor_role": role,
            "workers_present": present,
            "workers_absent": 2,
            "hours_worked": present * 8.0,
            "overtime_hours": 0.0,
        },
    )


def test_r2_333_muster_roll_repost_updates_in_place(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2333-{_SUFFIX}", user_name="U2333",
        mobile=f"+9193{_SUFFIX}", email=f"r2333-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P2333",
        code=f"PRJ-2333-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()

    day = "2026-08-12T09:00:00Z"
    r1 = _post(client, hdr, comp.id, project.id, team.id, day, "Mason", 40)
    assert r1.status_code == 201, r1.text
    first_id = r1.json()["id"]

    # Double-tap of the same gang: must update the register row, not add one.
    r2 = _post(client, hdr, comp.id, project.id, team.id, day, "Mason", 38)
    assert r2.status_code == 200, r2.text
    assert r2.json()["id"] == first_id, r2.text

    rows = (
        db.query(models.MusterRoll)
        .filter(models.MusterRoll.project_id == project.id)
        .all()
    )
    assert len(rows) == 1, [(r.labor_role, r.workers_present) for r in rows]
    assert int(rows[0].workers_present) == 38
    assert float(rows[0].hours_worked) == 38 * 8.0

    # Casing/padding variants are the same crew, per the R2-332 key shape.
    r3 = _post(client, hdr, comp.id, project.id, team.id, day, " mason ", 12)
    assert r3.status_code == 200, r3.text
    assert r3.json()["id"] == first_id
    db.expire_all()
    rows = db.query(models.MusterRoll).filter(models.MusterRoll.project_id == project.id).all()
    assert len(rows) == 1 and int(rows[0].workers_present) == 12

    # A genuinely distinct role is a separate register line.
    r4 = _post(client, hdr, comp.id, project.id, team.id, day, "Helper", 8)
    assert r4.status_code == 201, r4.text
    # ...and so is the same role on another day.
    r5 = _post(client, hdr, comp.id, project.id, team.id, "2026-08-13T09:00:00Z", "mason", 9)
    assert r5.status_code == 201, r5.text

    db.expire_all()
    rows = db.query(models.MusterRoll).filter(models.MusterRoll.project_id == project.id).all()
    assert len(rows) == 3, [(r.labor_role, r.date) for r in rows]
