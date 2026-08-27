"""R2-383: recurring to-dos must actually recur.

repeat_type was stored and echoed but nothing ever evaluated it (no scheduler
exists in the codebase). Completing a daily/weekly/monthly to-do now spawns the
next pending occurrence with the due date advanced one interval; completing a
non-recurring to-do spawns nothing.
"""
import uuid

from app import models


def _project(db, company):
    p = models.Project(
        id=uuid.uuid4(), company_id=company.id, name="RecProj",
        code=uuid.uuid4().hex[:6], status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _create_todo(client, hdr, company_id, project_id, title, repeat_type):
    return client.post(
        "/apis/v3/todos/",
        json={
            "company_id": str(company_id),
            "project_id": str(project_id),
            "title": title,
            "due_date": "2099-01-15",
            "repeat_type": repeat_type,
        },
        headers=hdr,
    )


def test_completing_recurring_todo_spawns_next_occurrence(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888750011")
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)

    r = _create_todo(client, hdr, comp.id, proj.id, "Daily site check", "daily")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["due_date"] == "2099-01-15T00:00:00"

    done = client.put(f"/apis/v3/todos/{body['id']}", json={"status": "done"}, headers=hdr)
    assert done.status_code == 200, done.text
    assert done.json()["status"] == "done"

    listing = client.get(
        f"/apis/v3/todos/company/{comp.id}?project_id={proj.id}", headers=hdr
    )
    assert listing.status_code == 200

    # The completed row stays done and carries its repeat_type.
    daily_rows = [t for t in listing.json() if t["title"] == "Daily site check"]
    assert len(daily_rows) == 2
    done_row = [t for t in daily_rows if t["id"] == body["id"]][0]
    assert done_row["status"] == "done" and done_row["repeat_type"] == "daily"
    # The next occurrence exists: pending, one day later.
    nxt = [t for t in daily_rows if t["status"] == "pending"][0]
    assert nxt["due_date"] == "2099-01-16T00:00:00"

    weekly = _create_todo(client, hdr, comp.id, proj.id, "Weekly report", "weekly")
    assert weekly.status_code == 200, weekly.text
    monthly = _create_todo(client, hdr, comp.id, proj.id, "Monthly audit", "monthly")
    assert monthly.status_code == 200, monthly.text
    none_t = _create_todo(client, hdr, comp.id, proj.id, "One-off chore", "none")
    assert none_t.status_code == 200, none_t.text

    for tid in (weekly.json()["id"], monthly.json()["id"], none_t.json()["id"]):
        rd = client.put(f"/apis/v3/todos/{tid}", json={"status": "done"}, headers=hdr)
        assert rd.status_code == 200, rd.text

    listing2 = client.get(
        f"/apis/v3/todos/company/{comp.id}?project_id={proj.id}", headers=hdr
    )
    rows2 = [t for t in listing2.json()]
    titles = {}
    for t in rows2:
        titles.setdefault(t["title"], []).append(t)

    # Weekly and monthly each spawned exactly one future occurrence.
    assert len(titles["Weekly report"]) == 2
    wr = [t for t in titles["Weekly report"] if t["status"] == "pending"]
    assert len(wr) == 1 and wr[0]["due_date"] == "2099-01-22T00:00:00"
    assert len(titles["Monthly audit"]) == 2
    mr = [t for t in titles["Monthly audit"] if t["status"] == "pending"]
    assert len(mr) == 1 and mr[0]["due_date"] == "2099-02-15T00:00:00"
    # Non-recurring completion spawns nothing.
    assert len(titles["One-off chore"]) == 1
    assert titles["One-off chore"][0]["status"] == "done"


def test_completing_twice_does_not_stack_duplicates(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UB", mobile="+919888750012")
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)

    r = _create_todo(client, hdr, comp.id, proj.id, "Daily patrol", "daily")
    assert r.status_code == 200, r.text
    tid = r.json()["id"]

    first = client.put(f"/apis/v3/todos/{tid}", json={"status": "done"}, headers=hdr)
    assert first.status_code == 200, first.text
    # Re-sending status=done on the already-done original must not spawn again.
    again = client.put(f"/apis/v3/todos/{tid}", json={"status": "done"}, headers=hdr)
    assert again.status_code == 200, again.text

    listing = client.get(
        f"/apis/v3/todos/company/{comp.id}?project_id={proj.id}", headers=hdr
    )
    matches = [t for t in listing.json() if t["title"] == "Daily patrol"]
    assert len(matches) == 2  # the done original + exactly one pending occurrence
