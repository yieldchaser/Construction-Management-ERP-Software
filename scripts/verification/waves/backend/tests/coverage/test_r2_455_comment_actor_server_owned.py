"""R2-455 — task feed actor fields are server-owned, never client-supplied.

Every task comment was written under whatever user_id/user_name the request
body carried, and the only shipping consumer hardcoded a fictional identity,
"Vikram Joshi (Site Engineer)", so the collaboration feed in every company
was signed by someone who does not exist - and any authenticated member
could post under a real colleague's name with a hand-made request.

Fix: CommentCreate no longer carries identity fields; the comment records
the authenticated caller's company_team row and account name.
"""
import uuid

from app import models
from app.routers.planning import CommentCreate


def test_create_schema_carries_no_actor_field():
    assert "user_id" not in CommentCreate.model_fields
    assert "user_name" not in CommentCreate.model_fields


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def test_comment_records_session_user_even_when_body_smuggles_identity(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R455A", user_name="U455A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    now = uuid.uuid4()
    from datetime import datetime, timezone
    task = models.Task(
        id=now, project_id=project.id, name="T", duration_days=5,
        start_date=datetime.now(timezone.utc), end_date=datetime.now(timezone.utc),
        status="not_started", priority="medium", progress=0.0,
    )
    db.add(task)
    db.commit()

    colleague_id = str(uuid.uuid4())
    r = client.post(f"/apis/v3/planning/tasks/{task.id}/comments", headers=hdr, json={
        "user_id": colleague_id,
        "user_name": "Vikram Joshi (Site Engineer)",
        "message_text": "posted under someone else's name?",
    })
    assert r.status_code == 201, r.text
    body = r.json()

    # The stored author is the session user's team row and account name...
    assert body["user_id"] == str(team.id), body
    assert body["user_name"] == user.name, body
    # ...never the smuggled identity.
    assert body["user_id"] != colleague_id
    assert body["user_name"] != "Vikram Joshi (Site Engineer)"


def test_comment_without_identity_fields_is_accepted(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R455B", user_name="U455B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    from datetime import datetime, timezone
    task = models.Task(
        id=uuid.uuid4(), project_id=project.id, name="T2", duration_days=5,
        start_date=datetime.now(timezone.utc), end_date=datetime.now(timezone.utc),
        status="not_started", priority="medium", progress=0.0,
    )
    db.add(task)
    db.commit()

    r = client.post(f"/apis/v3/planning/tasks/{task.id}/comments", headers=hdr, json={
        "message_text": "plain message",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user_id"] == str(team.id), body
    assert body["user_name"] == user.name, body
