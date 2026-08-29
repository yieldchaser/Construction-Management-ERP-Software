"""R2-471 - GET /chat/groups/{project_id} must be membership-filtered.

The group list was the one chat route without a membership clause, so the
sidebar advertised conversations whose every sub-route 403s for the caller -
a permission failure rendered as "No messages yet" with a live composer.

Gate: each caller sees only groups where they hold a ChatGroupMember row
(resolved through the same caller keys as verify_group_membership), and a
company colleague's groups in the same project stay invisible.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp, name):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=name,
        code=f"PRJ-{name}-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()
    return project


def _mk_colleague(db, comp, name):
    user = models.User(
        id=uuid.uuid4(), name=name,
        mobile=f"+9198{uuid.uuid4().int % 10**8:08d}",
        email=f"{name}-{_SUFFIX}@example.test",
    )
    db.add(user)
    db.flush()
    db.add(models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=user.id))
    db.commit()
    return user


def _create_group(client, hdr, comp, project, name):
    r = client.post(
        "/apis/v3/chat/groups",
        json={"company_id": str(comp.id), "project_id": str(project.id), "name": name},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_group_list_only_shows_callers_memberships(client, db, make_tenant, auth_headers):
    comp, user_a, _ = make_tenant(company_name=f"R471-{_SUFFIX}", user_name="UR471A")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P471")

    user_b = _mk_colleague(db, comp, "UR471B")
    hdr_b = auth_headers(user_b, comp)

    g_a = _create_group(client, hdr_a, comp, project, "A-owned")
    g_b = _create_group(client, hdr_b, comp, project, "B-owned")

    r = client.get(f"/apis/v3/chat/groups/{project.id}", headers=hdr_a)
    assert r.status_code == 200, r.text
    assert {g["id"] for g in r.json()} == {g_a}, "caller A must not see B-only group"

    r = client.get(f"/apis/v3/chat/groups/{project.id}", headers=hdr_b)
    assert r.status_code == 200, r.text
    assert {g["id"] for g in r.json()} == {g_b}, "caller B must not see A-only group"

    for g in r.json():
        assert g["member_count"] >= 1


def test_listed_group_subroutes_answer_for_the_caller(client, db, make_tenant, auth_headers):
    comp, user_a, _ = make_tenant(company_name=f"R471S-{_SUFFIX}", user_name="UR471SA")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P471S")

    user_b = _mk_colleague(db, comp, "UR471SB")
    hdr_b = auth_headers(user_b, comp)
    g_b = _create_group(client, hdr_b, comp, project, "B-only-subroute")

    listed = client.get(f"/apis/v3/chat/groups/{project.id}", headers=hdr_a).json()
    assert g_b not in [g["id"] for g in listed], "sidebar advertised a group that 403s"

    r = client.get(f"/apis/v3/chat/messages/{g_b}", headers=hdr_a)
    assert r.status_code == 403
