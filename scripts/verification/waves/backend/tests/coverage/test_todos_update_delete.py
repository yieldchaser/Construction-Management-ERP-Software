"""Prompt 7 / D6: todos PUT must UPDATE (not delete); DELETE must remove + log."""
import uuid

from app import models


def _project(db, company):
    p = models.Project(
        id=uuid.uuid4(), company_id=company.id, name="TodoProj",
        code=uuid.uuid4().hex[:6], status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _create_todo(client, hdr, company_id, project_id, title="Initial"):
    return client.post(
        "/apis/v3/todos/",
        json={
            "company_id": str(company_id),
            "project_id": str(project_id),
            "title": title,
            "repeat_type": "none",
            "type": "task",
        },
        headers=hdr,
    )


def test_update_todo_changes_field_and_keeps_row(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888750001")
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)

    r = _create_todo(client, hdr, comp.id, proj.id, title="Initial Title")
    assert r.status_code == 200, r.text
    todo_id = r.json()["id"]

    # PUT must UPDATE the row, not delete it (the old bug deleted).
    r2 = client.put(
        f"/apis/v3/todos/{todo_id}",
        json={"title": "Updated Title", "status": "done"},
        headers=hdr,
    )
    assert r2.status_code == 200, r2.text
    body = r2.json()
    assert body["id"] == todo_id
    assert body["title"] == "Updated Title"
    assert body["status"] == "done"

    # Row must still exist afterwards.
    r3 = client.get(f"/apis/v3/todos/company/{comp.id}?project_id={proj.id}", headers=hdr)
    assert r3.status_code == 200
    assert todo_id in [t["id"] for t in r3.json()]


def test_delete_todo_removes_row(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UB", mobile="+919888750002")
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)

    r = _create_todo(client, hdr, comp.id, proj.id, title="To Delete")
    assert r.status_code == 200
    todo_id = r.json()["id"]

    rd = client.delete(f"/apis/v3/todos/{todo_id}", headers=hdr)
    assert rd.status_code == 200, rd.text
    assert rd.json().get("success") is True

    r3 = client.get(f"/apis/v3/todos/company/{comp.id}?project_id={proj.id}", headers=hdr)
    assert todo_id not in [t["id"] for t in r3.json()]
