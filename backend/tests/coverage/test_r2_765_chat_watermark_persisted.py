"""R2-765: chat unread read-watermark must survive a process restart.

The defect: _group_user_last_read in chat.py is a module-level dict.
After a Render redeploy (or any process recycle) the dict is empty and
every message appears unread again for every user.

Gate: mark-as-read must be persisted to the DB.  We simulate 'new process'
by directly clearing the module-level dict after calling mark-as-read.
Before the fix this makes unread_count go back to 2 (defect exposed).
After the fix the DB watermark is still there and unread_count stays 0.
"""
import uuid
from datetime import datetime, timezone
from app import models
import app.routers.chat as chat_module  # gives access to the dict for the gate

_SUFFIX = uuid.uuid4().hex[:8]


def test_r2_765_chat_watermark_survives_process_restart(client, db, make_tenant, auth_headers):
    # --- setup ----------------------------------------------------------------
    comp, user, team = make_tenant(
        company_name=f"R765-{_SUFFIX}",
        user_name="R765-Admin",
        mobile=f"+9193{uuid.uuid4().hex[:8]}",
        email=f"r765-{uuid.uuid4().hex[:8]}@test.com",
    )
    hdr = auth_headers(user, comp)

    # second user (sends messages)
    user2 = models.User(
        id=uuid.uuid4(),
        name="R765-Sender",
        email=f"r765s-{uuid.uuid4().hex[:8]}@test.com",
        mobile=f"+9194{uuid.uuid4().hex[:8]}",
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

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="R765-Project",
        state="Maharashtra",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.commit()

    # create group
    res_grp = client.post(
        "/apis/v3/chat/groups",
        json={"company_id": str(comp.id), "project_id": str(proj.id), "name": "R765 Group"},
        headers=hdr,
    )
    assert res_grp.status_code == 201, res_grp.text
    group_id = res_grp.json()["id"]

    # add second user to group
    res_add = client.post(
        f"/apis/v3/chat/groups/{group_id}/members",
        json={"group_id": group_id, "user_id": str(team2.id), "role": "member"},
        headers=hdr,
    )
    assert res_add.status_code == 201, res_add.text

    # sender posts 2 messages
    client.post("/apis/v3/chat/messages", json={"group_id": group_id, "message_text": "Msg A"}, headers=hdr2)
    client.post("/apis/v3/chat/messages", json={"group_id": group_id, "message_text": "Msg B"}, headers=hdr2)

    # admin confirms unread=2 before marking read
    res_before = client.get(f"/apis/v3/chat/groups/{proj.id}", headers=hdr)
    assert res_before.status_code == 200
    grp_before = next(g for g in res_before.json() if g["id"] == group_id)
    assert grp_before["unread_count"] == 2, f"Expected 2 unread, got {grp_before['unread_count']}"

    # admin marks group as read
    res_read = client.post(f"/apis/v3/chat/groups/{group_id}/read", headers=hdr)
    assert res_read.status_code == 200
    assert res_read.json()["success"] is True

    # confirm unread=0 immediately (basic functionality)
    res_after = client.get(f"/apis/v3/chat/groups/{proj.id}", headers=hdr)
    grp_after = next(g for g in res_after.json() if g["id"] == group_id)
    assert grp_after["unread_count"] == 0, f"Expected 0 unread after marking read, got {grp_after['unread_count']}"

    # ---- GATE: simulate process restart by clearing the module-level dict ----
    # Before the fix this is the ONLY store, so clearing it forgets the watermark.
    # After the fix the watermark is persisted in the DB and the dict is gone.
    if hasattr(chat_module, "_group_user_last_read"):
        chat_module._group_user_last_read.clear()

    # After 'restart', unread_count must still be 0 (watermark survived).
    res_restart = client.get(f"/apis/v3/chat/groups/{proj.id}", headers=hdr)
    grp_restart = next(g for g in res_restart.json() if g["id"] == group_id)
    assert grp_restart["unread_count"] == 0, (
        f"R2-765: unread_count reset to {grp_restart['unread_count']} after process restart "
        f"— watermark is NOT persisted to the DB."
    )
