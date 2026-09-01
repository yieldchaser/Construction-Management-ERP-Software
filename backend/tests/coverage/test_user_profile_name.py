"""Tests for Part A6: User can update their own display name."""
import uuid
import pytest
from app import models
from app.auth import create_access_token


def _hdr(user, comp):
    return {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}


def _mk_tenant(db, tag):
    comp = models.Company(id=uuid.uuid4(), name=f"R-Prof-{tag}", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    user = models.User(
        id=uuid.uuid4(), name=f"upadhyayprateek{tag}",
        mobile=f"+9198{uuid.uuid4().hex[:9]}", email=f"prof-{tag}@test.com",
    )
    db.add(user)
    db.flush()
    team = models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=user.id, priority_type="partner")
    db.add(team)
    db.commit()
    return comp, user


def test_get_and_update_my_profile_name(client, db):
    comp, user = _mk_tenant(db, "updname")
    hdr = _hdr(user, comp)

    # 1. Fetch profile
    r = client.get("/apis/v3/profile/me", headers=hdr)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["name"] == user.name
    assert data["email"] == user.email

    # 2. Update name
    r2 = client.patch("/apis/v3/profile/me", json={"name": "Prateek Upadhyay"}, headers=hdr)
    assert r2.status_code == 200, r2.text
    data2 = r2.json()
    assert data2["success"] is True
    assert data2["user"]["name"] == "Prateek Upadhyay"

    # 3. Verify in DB
    db.refresh(user)
    assert user.name == "Prateek Upadhyay"

    # 4. Empty name rejected
    r3 = client.patch("/apis/v3/profile/me", json={"name": "   "}, headers=hdr)
    assert r3.status_code == 400
