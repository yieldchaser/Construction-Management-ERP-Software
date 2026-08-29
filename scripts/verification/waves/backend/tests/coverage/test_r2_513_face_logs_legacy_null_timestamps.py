"""R2-513 - the face recognition audit trail must survive its own legacy rows.

R2-027 added FaceRecognitionLog.created_at with an additive migration that
deliberately leaves legacy rows NULL ("no false time stamped"). But
FacePunchResponse declared created_at as a required datetime, so the first
legacy row in GET /face/logs/{company_id} failed response validation and 500d
the entire trail - the screen kept reporting "No face recognition logs found".

Gate: a company with one legacy NULL-timestamp row and one fresh punch gets a
200 listing both, with created_at honestly null on the legacy record.
"""
import uuid

import sqlalchemy

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def test_face_logs_return_legacy_null_created_at_rows(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R513-{_SUFFIX}", user_name="UR513")
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P513",
        code=f"PRJ-P513-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.flush()
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name="Emp R513",
        status="active", basic_salary=1000.0, hra=0.0, other_allowances=0.0,
        pf_employee_pct=0.0, pf_employer_pct=0.0, esi_employee_pct=0.0,
        esi_employer_pct=0.0, tds_monthly=0.0, is_esi_applicable=False,
    )
    db.add(emp)
    db.flush()
    legacy = models.FaceRecognitionLog(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        employee_id=emp.id, punch_type="in", face_verified=True,
        confidence_score=None, created_at=None,
    )
    db.add(legacy)
    db.commit()
    # The migration ALTERs the column onto rows that predate it - their NULL
    # comes from the table state, not the ORM (whose default only fires on
    # inserts made after the column exists). Null it at the SQL level.
    db.execute(
        sqlalchemy.text("UPDATE face_recognition_logs SET created_at = NULL WHERE id = :id"),
        {"id": str(legacy.id)},
    )
    db.commit()

    r = client.post(
        "/apis/v3/face/punch",
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "employee_id": str(emp.id),
            "punch_type": "out",
            "face_verified": True,
            "confidence_score": 0.9,
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text

    logs = client.get(f"/apis/v3/face/logs/{comp.id}", headers=hdr)
    assert logs.status_code == 200, logs.text
    by_type = {l["punch_type"]: l for l in logs.json()}
    assert set(by_type) == {"in", "out"}, "legacy and fresh rows must both surface"
    assert by_type["in"]["created_at"] is None, "legacy timestamp stays honestly null"
    assert by_type["out"]["created_at"] is not None

    scoped = client.get(f"/apis/v3/face/logs/{comp.id}?project_id={project.id}", headers=hdr)
    assert scoped.status_code == 200, scoped.text
    assert len(scoped.json()) == 2
