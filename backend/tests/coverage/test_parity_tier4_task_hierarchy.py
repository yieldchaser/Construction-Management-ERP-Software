"""Tier 4 Parity Item 16: Full task hierarchy WBS tree endpoint.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P16-{_SUFFIX}",
        user_name="U-P16",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p16-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier4_task_hierarchy_tree(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Metro Tower 3",
        state="Maharashtra",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.flush()

    now = datetime.now(timezone.utc)

    # 1. Create root tasks
    phase1 = models.Task(
        id=uuid.uuid4(),
        project_id=proj.id,
        parent_id=None,
        name="Phase 1 - Substructure",
        duration_days=30,
        start_date=now,
        end_date=now,
        status="in_progress",
    )
    phase2 = models.Task(
        id=uuid.uuid4(),
        project_id=proj.id,
        parent_id=None,
        name="Phase 2 - Superstructure",
        duration_days=60,
        start_date=now,
        end_date=now,
        status="not_started",
    )
    db.add_all([phase1, phase2])
    db.flush()

    # 2. Create subtasks
    sub1_1 = models.Task(
        id=uuid.uuid4(),
        project_id=proj.id,
        parent_id=phase1.id,
        name="Excavation & Piling",
        duration_days=10,
        start_date=now,
        end_date=now,
        status="completed",
    )
    sub1_2 = models.Task(
        id=uuid.uuid4(),
        project_id=proj.id,
        parent_id=phase1.id,
        name="Foundation Raft Pouring",
        duration_days=20,
        start_date=now,
        end_date=now,
        status="in_progress",
    )
    db.add_all([sub1_1, sub1_2])
    db.flush()

    # 3. Create sub-subtask
    sub1_1_1 = models.Task(
        id=uuid.uuid4(),
        project_id=proj.id,
        parent_id=sub1_1.id,
        name="Soil Boring Rig Setup",
        duration_days=2,
        start_date=now,
        end_date=now,
        status="completed",
    )
    db.add(sub1_1_1)
    db.commit()

    # 4. Fetch full hierarchy
    res = client.get(f"/apis/v3/planning/tasks/hierarchy/{proj.id}", headers=hdr)
    assert res.status_code == 200, res.text
    tree = res.json()

    # Should have exactly 2 root tasks (phase1 and phase2)
    assert len(tree) == 2
    root_map = {node["id"]: node for node in tree}
    assert str(phase1.id) in root_map
    assert str(phase2.id) in root_map

    # phase 2 has no children
    assert len(root_map[str(phase2.id)]["children"]) == 0

    # phase 1 has 2 children
    p1_node = root_map[str(phase1.id)]
    assert len(p1_node["children"]) == 2
    p1_children = {c["id"]: c for c in p1_node["children"]}
    assert str(sub1_1.id) in p1_children
    assert str(sub1_2.id) in p1_children

    # sub1_1 has 1 child (sub1_1_1)
    sub1_1_node = p1_children[str(sub1_1.id)]
    assert len(sub1_1_node["children"]) == 1
    assert sub1_1_node["children"][0]["id"] == str(sub1_1_1.id)
