"""R2-389 — GET /settings/team/{company_id} must not 500 on User.phone.

Gate: the team-list endpoint reads phone from User.mobile (the column that
exists after the multi-provider auth rename); before the fix every call raised
AttributeError('User' object has no attribute 'phone') and returned 500, making
team management unreachable and leaving member_id unobtainable for the role
endpoint.
"""
import uuid

from app import models


def test_team_list_returns_200_with_phone_from_mobile_column(client, db, make_tenant, auth_headers):
    comp, owner, _owner_team = make_tenant(
        company_name="R389A", user_name="Owner R389",
        mobile="+919888000389", email="r389a@test.com",
    )
    member = uuid.uuid4()
    db.add_all([
        models.User(id=member, name="Mate R389", mobile="+919888000390", email="r389b@test.com"),
        models.CompanyTeam(
            id=uuid.uuid4(), company_id=comp.id, user_id=member, priority_type="member"),
    ])
    db.commit()

    r = client.get(f"/apis/v3/settings/team/{comp.id}", headers=auth_headers(owner, comp))
    assert r.status_code == 200, r.text
    rows = {m["name"]: m for m in r.json()}
    assert set(rows) == {"Owner R389", "Mate R389"}
    assert rows["Owner R389"]["phone"] == "+919888000389"
    assert rows["Mate R389"]["phone"] == "+919888000390"


def test_user_model_has_no_phone_attribute():
    assert hasattr(models.User, "mobile")
    assert not hasattr(models.User, "phone")
