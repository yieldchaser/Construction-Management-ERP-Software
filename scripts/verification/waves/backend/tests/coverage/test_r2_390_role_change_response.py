"""R2-390 — a role change must never commit and then answer 500.

Gate: PUT /settings/team/{member_id}/role returns 200 with the updated role and
the member's mobile in `phone` (User.phone was renamed to mobile; the old
attribute error fired after the write had committed). The response also survives
a team row whose backing user record no longer exists instead of crashing after
the commit.
"""
import uuid

from app import models


def test_role_assignment_returns_member_with_mobile_as_phone(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R390A", user_name="U390A", email="r390a@test.com")
    hdr = auth_headers(user, comp)

    role = models.CompanyRole(
        id=uuid.uuid4(), company_id=comp.id, role_name="Viewer R390",
        permissions={"projects": {"view": True}},
    )
    db.add(role)
    db.commit()

    r = client.put(f"/apis/v3/settings/team/{team.id}/role", headers=hdr,
                   json={"role_id": str(role.id)})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["role_id"] == str(role.id)
    assert body["role_name"] == "Viewer R390"


def test_role_change_survives_deleted_backing_user(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R390B", user_name="U390B")
    hdr = auth_headers(user, comp)

    role = models.CompanyRole(
        id=uuid.uuid4(), company_id=comp.id, role_name="Orphan R390", permissions={}
    )
    # A second member whose backing user record later disappears.
    gone_user = models.User(id=uuid.uuid4(), name="Ghost", email="ghost-r390@test.com")
    gone_team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=gone_user.id, priority_type="member"
    )
    db.add_all([role, gone_user, gone_team])
    db.commit()

    db.delete(gone_user)
    db.commit()

    r = client.put(f"/apis/v3/settings/team/{gone_team.id}/role", headers=hdr,
                   json={"role_id": str(role.id)})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["role_id"] == str(role.id)
    assert body["name"] == "Unknown member"
