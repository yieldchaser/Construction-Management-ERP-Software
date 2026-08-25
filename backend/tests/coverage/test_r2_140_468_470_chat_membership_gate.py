"""R2-140 / R2-468 / R2-470 - chat membership gate runs in the company_team ID space.

chat_group_members.user_id and chat_messages.user_id are foreign keys to
company_team.id (models.py), while the gate historically compared them to a
users.id - an unsatisfiable predicate that 403'd every guarded chat route for
every user, permanently. These tests pin the repaired contract:

- a caller whose member row is keyed by their company_team.id passes the gate;
- a caller whose member row is keyed by their users.id still passes (both ID
  spaces are resolved through one shared helper);
- the sender stamp on messages uses the caller's company_team.id;
- everyone else in the same company still gets 403, and unknown groups 404.
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


def _mk_group(db, comp, project, name, created_by=None):
    group = models.ChatGroup(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=name, group_type="general", created_by=created_by,
    )
    db.add(group)
    db.commit()
    return group


def _create_group(client, hdr, comp, project, name):
    r = client.post(
        "/apis/v3/chat/groups",
        json={"company_id": str(comp.id), "project_id": str(project.id), "name": name},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_member_row_keyed_by_company_team_id_passes_gate(client, db, make_tenant, auth_headers):
    """The normal write path stores member rows under company_team.id; the gate must accept it."""
    comp, user_a, team_a = make_tenant(company_name=f"R140-{_SUFFIX}", user_name="UR140A")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P140")
    gid = _create_group(client, hdr_a, comp, project, "team-id-keyed")

    stored = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == uuid.UUID(gid)
    ).one()
    assert stored.user_id == team_a.id, "member row must be keyed by company_team.id"

    r = client.post(
        "/apis/v3/chat/messages",
        json={"group_id": gid, "message_text": "hello"}, headers=hdr_a,
    )
    assert r.status_code == 201, r.text
    assert client.get(f"/apis/v3/chat/messages/{gid}", headers=hdr_a).status_code == 200


def test_member_row_keyed_by_users_id_still_passes_gate(client, db, make_tenant, auth_headers):
    """Legacy/alternate-space member rows keep working: both IDs resolve via one helper."""
    comp, user_a, team_a = make_tenant(company_name=f"R140B-{_SUFFIX}", user_name="UR140B")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P140B")
    gid = _mk_group(db, comp, project, "users-id-keyed", created_by=team_a.id).id
    db.add(models.ChatGroupMember(group_id=gid, user_id=user_a.id, role="admin"))
    db.commit()

    r = client.post(
        "/apis/v3/chat/messages",
        json={"group_id": str(gid), "message_text": "legacy row"}, headers=hdr_a,
    )
    assert r.status_code == 201, r.text


def test_same_company_non_member_gets_403(client, db, make_tenant, auth_headers):
    comp, user_a, _ = make_tenant(company_name=f"R140C-{_SUFFIX}", user_name="UR140C")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P140C")
    gid = _create_group(client, hdr_a, comp, project, "a-only")

    user_b = _mk_colleague(db, comp, "UR140CB")
    hdr_b = auth_headers(user_b, comp)

    r = client.get(f"/apis/v3/chat/messages/{gid}", headers=hdr_b)
    assert r.status_code == 403, r.text
    assert r.json()["detail"] == "Not a member of this chat group"

    r = client.post(
        "/apis/v3/chat/messages",
        json={"group_id": gid, "message_text": "intruder"}, headers=hdr_b,
    )
    assert r.status_code == 403, r.text


def test_unknown_group_answers_404_not_403(client, db, make_tenant, auth_headers):
    comp, user_a, _ = make_tenant(company_name=f"R140D-{_SUFFIX}", user_name="UR140D")
    hdr_a = auth_headers(user_a, comp)
    missing = str(uuid.uuid4())
    r = client.get(f"/apis/v3/chat/messages/{missing}", headers=hdr_a)
    assert r.status_code == 404, r.text


def test_sender_stamped_with_company_team_id(client, db, make_tenant, auth_headers):
    """The message's user_id column holds the caller's company_team.id, and the read path resolves the real name."""
    comp, user_a, team_a = make_tenant(company_name=f"R140E-{_SUFFIX}", user_name="UR140E")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P140E")
    gid = _create_group(client, hdr_a, comp, project, "sender-stamp")

    r = client.post(
        "/apis/v3/chat/messages",
        json={"group_id": gid, "message_text": "who am i"}, headers=hdr_a,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["user_id"] == str(team_a.id)
    assert body["user_name"] == user_a.name

    listed = client.get(f"/apis/v3/chat/messages/{gid}", headers=hdr_a).json()
    assert listed[-1]["user_name"] == user_a.name


# --- R2-468: every site that writes or compares a company_team foreign key ---
# --- resolves the caller through the one shared helper                    ---


def test_create_group_stamps_creator_team_id_and_enrols_admin(client, db, make_tenant, auth_headers):
    """created_by and the enrolled member row must hold company_team.id, never the client's users.id."""
    comp, user_a, team_a = make_tenant(company_name=f"R468-{_SUFFIX}", user_name="UR468A")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P468")

    r = client.post(
        "/apis/v3/chat/groups",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "name": "canonical", "created_by": str(user_a.id),  # hostile users.id is ignored
        },
        headers=hdr_a,
    )
    assert r.status_code == 201, r.text
    gid = uuid.UUID(r.json()["id"])

    group = db.query(models.ChatGroup).filter(models.ChatGroup.id == gid).one()
    assert group.created_by == team_a.id, "created_by must be the creator's company_team.id"
    member = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == gid
    ).one()
    assert member.user_id == team_a.id and member.role == "admin"


def test_list_groups_comparison_matches_subroute_gate(client, db, make_tenant, auth_headers):
    """The list route filters membership with the same caller keys as verify_group_membership."""
    comp, user_a, _ = make_tenant(company_name=f"R468B-{_SUFFIX}", user_name="UR468B")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P468B")
    gid = _create_group(client, hdr_a, comp, project, "mine")

    user_b = _mk_colleague(db, comp, "UR468BB")
    hdr_b = auth_headers(user_b, comp)
    other = client.post(
        "/apis/v3/chat/groups",
        json={"company_id": str(comp.id), "project_id": str(project.id), "name": "b-only"},
        headers=hdr_b,
    )
    assert other.status_code == 201, other.text

    mine = client.get(f"/apis/v3/chat/groups/{project.id}", headers=hdr_a).json()
    assert [g["id"] for g in mine] == [gid]
    theirs = client.get(f"/apis/v3/chat/groups/{project.id}", headers=hdr_b).json()
    assert gid not in [g["id"] for g in theirs]


# --- R2-470: an empty group can acquire its first member via its creator ---


def _empty_group(db, comp, project, name, created_by):
    group = models.ChatGroup(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=name, group_type="general", created_by=created_by,
    )
    db.add(group)
    db.commit()
    return group


def test_creator_bootstraps_first_member_into_empty_group(client, db, make_tenant, auth_headers):
    comp, user_a, team_a = make_tenant(company_name=f"R470-{_SUFFIX}", user_name="UR470A")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P470")
    group = _empty_group(db, comp, project, "orphan", team_a.id)

    user_b = _mk_colleague(db, comp, "UR470B")
    hdr_b = auth_headers(user_b, comp)

    r = client.post(
        f"/apis/v3/chat/groups/{group.id}/members",
        json={"group_id": str(group.id), "user_id": str(user_b.id), "role": "admin"},
        headers=hdr_b,
    )
    assert r.status_code == 403, "before bootstrap the empty group must still refuse outsiders"

    r = client.post(
        f"/apis/v3/chat/groups/{group.id}/members",
        json={"group_id": str(group.id), "user_id": str(team_a.id), "role": "admin"},
        headers=hdr_a,
    )
    assert r.status_code == 201, r.text
    member = db.query(models.ChatGroupMember).filter(
        models.ChatGroupMember.group_id == group.id,
        models.ChatGroupMember.user_id == team_a.id,
    ).one()
    assert member.role == "admin"

    r = client.get(f"/apis/v3/chat/messages/{group.id}", headers=hdr_a)
    assert r.status_code == 200, "bootstrapped creator is now a full member"


def test_empty_group_refuses_non_creator(client, db, make_tenant, auth_headers):
    comp, user_a, team_a = make_tenant(company_name=f"R470B-{_SUFFIX}", user_name="UR470BA")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P470B")
    group = _empty_group(db, comp, project, "orphan-b", team_a.id)

    user_c = _mk_colleague(db, comp, "UR470C")
    hdr_c = auth_headers(user_c, comp)
    r = client.post(
        f"/apis/v3/chat/groups/{group.id}/members",
        json={"group_id": str(group.id), "user_id": str(user_c.id), "role": "admin"},
        headers=hdr_c,
    )
    assert r.status_code == 403, r.text
    assert r.json()["detail"] == "Only the group creator can add the first member to an empty group"


def test_non_empty_group_still_requires_group_admin(client, db, make_tenant, auth_headers):
    comp, user_a, team_a = make_tenant(company_name=f"R470C-{_SUFFIX}", user_name="UR470CA")
    hdr_a = auth_headers(user_a, comp)
    project = _mk_project(db, comp, "P470C")
    gid = _create_group(client, hdr_a, comp, project, "normal")

    user_d = _mk_colleague(db, comp, "UR470D")
    hdr_d = auth_headers(user_d, comp)
    db.add(models.ChatGroupMember(group_id=uuid.UUID(gid), user_id=user_d.id, role="member"))
    db.commit()

    r = client.post(
        f"/apis/v3/chat/groups/{gid}/members",
        json={
            "group_id": gid,
            "user_id": str(uuid.uuid4()), "role": "member",
        },
        headers=hdr_d,
    )
    assert r.status_code == 403, r.text
    assert r.json()["detail"] == "Group admin role required"
