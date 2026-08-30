"""Tier 4 Parity Item 14: Inspections assigned directly to tasks.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P14-{_SUFFIX}",
        user_name="U-P14",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p14-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier4_inspections_assigned_to_tasks(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj1 = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Project North",
        state="Maharashtra",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    proj2 = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Project South",
        state="Maharashtra",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add_all([proj1, proj2])
    db.flush()

    task1 = models.Task(
        id=uuid.uuid4(),
        project_id=proj1.id,
        name="Foundation Pouring",
        duration_days=5,
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc),
        status="in_progress",
    )
    task2 = models.Task(
        id=uuid.uuid4(),
        project_id=proj2.id,
        name="Roof Framing",
        duration_days=4,
        start_date=datetime.now(timezone.utc),
        end_date=datetime.now(timezone.utc),
        status="not_started",
    )
    db.add_all([task1, task2])

    cl = models.QualityChecklist(
        id=uuid.uuid4(),
        company_id=comp.id,
        title="Concrete Pre-Pour Checklist",
    )
    db.add(cl)
    db.commit()

    now = datetime.now(timezone.utc)

    # 1. Reject cross-project task assignment
    res_cross = client.post(
        "/apis/v3/quality/inspections",
        json={
            "project_id": str(proj1.id),
            "checklist_id": str(cl.id),
            "task_id": str(task2.id),  # Belongs to proj2!
            "inspection_date": now.isoformat(),
        },
        headers=hdr,
    )
    assert res_cross.status_code == 400
    assert "Task does not belong to this project" in res_cross.text

    # 2. Accept valid task assignment and expose task_id in response
    res_valid = client.post(
        "/apis/v3/quality/inspections",
        json={
            "project_id": str(proj1.id),
            "checklist_id": str(cl.id),
            "task_id": str(task1.id),
            "inspection_date": now.isoformat(),
        },
        headers=hdr,
    )
    assert res_valid.status_code == 201, res_valid.text
    data = res_valid.json()
    assert "task_id" in data
    assert data["task_id"] == str(task1.id)

    # Create unassigned inspection
    res_unassigned = client.post(
        "/apis/v3/quality/inspections",
        json={
            "project_id": str(proj1.id),
            "checklist_id": str(cl.id),
            "inspection_date": now.isoformat(),
        },
        headers=hdr,
    )
    assert res_unassigned.status_code == 201

    # 3. Filter inspections by task_id
    res_filtered = client.get(f"/apis/v3/quality/inspections/{proj1.id}?task_id={task1.id}", headers=hdr)
    assert res_filtered.status_code == 200, res_filtered.text
    items = res_filtered.json()
    assert len(items) == 1
    assert items[0]["task_id"] == str(task1.id)
