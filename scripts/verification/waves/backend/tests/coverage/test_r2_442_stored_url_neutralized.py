"""R2-442: a stored javascript: url is neutralized and clearable in place.

The schema allow-list (R2-278) stops new bad writes, but the payload already
stored in production kept flowing out of every response, and the API offered no
way to clear the field without deleting the whole to-do. Legacy non-http(s)
values must never be served (they read back as null), and an explicit null on
PUT must clear the column.
"""
import uuid

from app import models


def _project(db, company):
    p = models.Project(
        id=uuid.uuid4(), company_id=company.id, name="UrlProj",
        code=uuid.uuid4().hex[:6], status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def test_legacy_stored_url_never_served_and_clearable(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888750021")
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)

    # A row stored before the allow-list existed: insert it the way production
    # has it, bypassing today's schema validators.
    legacy = models.Todo(
        company_id=comp.id,
        project_id=proj.id,
        created_by=None,
        title="Legacy todo",
        repeat_type="none",
        url="javascript:alert(1)",
        status="pending",
    )
    db.add(legacy)
    db.commit()
    db.refresh(legacy)

    listing = client.get(
        f"/apis/v3/todos/company/{comp.id}?project_id={proj.id}", headers=hdr
    )
    assert listing.status_code == 200
    row = [t for t in listing.json() if t["id"] == str(legacy.id)][0]
    assert row["url"] is None

    # Clearing in place works via an explicit null; no delete required.
    cleared = client.put(f"/apis/v3/todos/{legacy.id}", json={"url": None}, headers=hdr)
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["url"] is None
    db.expire_all()
    db.refresh(legacy)
    assert legacy.url is None

    # Valid urls still round-trip untouched.
    ok = client.put(
        f"/apis/v3/todos/{legacy.id}", json={"url": "https://example.com/spec"}, headers=hdr
    )
    assert ok.status_code == 200, ok.text
    assert ok.json()["url"] == "https://example.com/spec"
