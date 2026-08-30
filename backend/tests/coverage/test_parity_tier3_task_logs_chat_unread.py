"""Tier 3 Parity Item 13: Task status-change activity logs and chat unread counts.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P13-{_SUFFIX}",
        user_name="U-P13-Admin",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p13-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier3_task_status_log_and_chat_unread(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Skyscraper Tower",
        state="Maharashtra",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.commit()

    # 1. --- TEST: Task Status-Change Activity Log ---
    task_payload = {
        "project_id": str(proj.id),
        "name": "Excavation Work",
        "start_date": "2026-09-01",
        "duration_days": 10,
        "priority": "high",
        "status": "not_started",
        "progress": 0.0,
    }
    res_task = client.post("/apis/v3/planning/tasks", json=task_payload, headers=hdr)
    assert res_task.status_code == 201, res_task.text
    task_id = res_task.json()["id"]

    # Update status to in_progress
    res_update = client.put(
        f"/apis/v3/planning/tasks/{task_id}",
        json={"status": "in_progress", "progress": 25.0},
        headers=hdr,
    )
    assert res_update.status_code == 200, res_update.text
    assert res_update.json()["status"] == "in_progress"

    # Verify status change logged in task comments
    res_comments = client.get(f"/apis/v3/planning/tasks/{task_id}/comments", headers=hdr)
    assert res_comments.status_code == 200, res_comments.text
    comments = res_comments.json()
    assert len(comments) >= 1
    status_logs = [c for c in comments if "Status changed from not_started to in_progress" in (c["message_text"] or "")]
    assert len(status_logs) == 1
    assert status_logs[0]["user_name"] == user.name

    # 2. --- TEST: Chat Unread Counts & Mark as Read ---
    # Create second user in the same company
    user2 = models.User(
        id=uuid.uuid4(),
        name="U-P13-Colleague",
        email=f"colleague-{uuid.uuid4().hex[:8]}@test.com",
        mobile=f"+9192{uuid.uuid4().hex[:8]}",
        password_hash="mock",
    )
    team2 = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=comp.id,
        user_id=user2.id,
        priority_type="employee",
    )
    db.add_all([user2, team2])
    db.commit()
    hdr2 = auth_headers(user2, comp)

    # Admin creates group
    res_grp = client.post(
        "/apis/v3/chat/groups",
        json={"company_id": str(comp.id), "project_id": str(proj.id), "name": "Site Ops Team"},
        headers=hdr,
    )
    assert res_grp.status_code == 201, res_grp.text
    group_id = res_grp.json()["id"]

    # Add Colleague to group
    res_add = client.post(
        f"/apis/v3/chat/groups/{group_id}/members",
        json={"group_id": group_id, "user_id": str(team2.id), "role": "member"},
        headers=hdr,
    )
    assert res_add.status_code == 201, res_add.text

    # Colleague sends 2 messages
    client.post("/apis/v3/chat/messages", json={"group_id": group_id, "message_text": "First update"}, headers=hdr2)
    client.post("/apis/v3/chat/messages", json={"group_id": group_id, "message_text": "Second update"}, headers=hdr2)

    # Admin checks groups list -> unread_count should be 2
    res_list1 = client.get(f"/apis/v3/chat/groups/{proj.id}", headers=hdr)
    assert res_list1.status_code == 200, res_list1.text
    groups1 = res_list1.json()
    target1 = next(g for g in groups1 if g["id"] == group_id)
    assert target1["unread_count"] == 2

    # Admin marks group as read
    res_read = client.post(f"/apis/v3/chat/groups/{group_id}/read", headers=hdr)
    assert res_read.status_code == 200, res_read.text
    assert res_read.json().get("success") is True

    # Admin checks groups list again -> unread_count should be 0
    res_list2 = client.get(f"/apis/v3/chat/groups/{proj.id}", headers=hdr)
    assert res_list2.status_code == 200, res_list2.text
    groups2 = res_list2.json()
    target2 = next(g for g in groups2 if g["id"] == group_id)
    assert target2["unread_count"] == 0
