"""R2-469 - the chat-group create probe can no longer fail on creator identity.

The auditor's differential probe drove POST /chat/groups twice: once carrying
the value the console used to read out of localStorage (a users.id) as
created_by, once with the field omitted. On the audited lineage the first call
500ed against the company_team.id foreign key and the second created a group
with no members at all, so the Create Group button could never succeed and the
membership table stayed permanently empty.

Both halves are dead on this lineage: the server ignores whatever created_by
the client sends, stamps its own company_team resolution, and enrols the
creator as the group's admin member. These pins replay the exact differential
at API level so the probe cannot rot.
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


def _assert_creator_resolved(db, comp, gid):
    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == gid).one()
    assert group.created_by is not None
    db.query(models.CompanyTeam).filter(
        models.CompanyTeam.company_id == comp.id,
        models.CompanyTeam.id == group.created_by,
    ).one()  # stored created_by must resolve inside company_team.id
    member = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == gid
    ).one()
    assert member.user_id == group.created_by, "creator must be enrolled under the same identity"
    assert member.role == "admin"
    return group


def test_probe_with_created_by_users_id_answers_201(client, db, make_tenant, auth_headers):
    """The exact request the console used to send: created_by carries a users.id."""
    comp, user_a, team_a = make_tenant(company_name=f"R469-{_SUFFIX}", user_name="UR469A")
    hdr = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P469")

    r = client.post(
        "/apis/v3/chat/groups",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "name": "probe-with-field", "group_type": "general",
            "created_by": str(user_a.id),
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    gid = uuid.UUID(r.json()["id"])

    group = _assert_creator_resolved(db, comp, gid)
    assert group.created_by == team_a.id, "client-supplied users.id must be replaced by the server-resolved company_team.id"


def test_probe_without_created_by_answers_201(client, db, make_tenant, auth_headers):
    """Differential twin: the field omitted (what the fixed console now sends)."""
    comp, user_a, team_a = make_tenant(company_name=f"R469B-{_SUFFIX}", user_name="UR469B")
    hdr = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P469B")

    r = client.post(
        "/apis/v3/chat/groups",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "name": "probe-without-field", "group_type": "general",
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    gid = uuid.UUID(r.json()["id"])

    group = _assert_creator_resolved(db, comp, gid)
    assert group.created_by == team_a.id


def test_membership_table_no_longer_permanently_empty(client, db, make_tenant, auth_headers):
    """Second-order effect: every group used to display 0 Members forever."""
    comp, user_a, _ = make_tenant(company_name=f"R469C-{_SUFFIX}", user_name="UR469C")
    hdr = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P469C")

    r = client.post(
        "/apis/v3/chat/groups",
        json={"company_id": str(comp.id), "project_id": str(project.id), "name": "counted"},
        headers=hdr,
    )
    assert r.status_code == 201, r.text

    listed = client.get(f"/apis/v3/chat/groups/{project.id}", headers=hdr).json()
    assert listed[0]["member_count"] == 1, "the seeded creator must be visible in the member count"
