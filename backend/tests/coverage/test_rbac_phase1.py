"""Phase 1 RBAC backend foundation tests (no endpoint enforcement yet).

Covers: taxonomy/preset helpers, role seeding with presets, get_me exposing
effective permissions, validated PUT /roles/{role_id}/permissions (incl. the
Owner/Admin lock), and the idempotent secret-gated backfill.
"""
from app.config import settings
from app import models
from app.permissions import (
    DEFAULT_ROLE_PRESETS,
    ALL_PERMISSION_KEYS,
    has_permission,
    validate_permissions,
    effective_permissions,
    default_view_permissions,
)


# ── Pure helpers ──────────────────────────────────────────────────────────────

def test_taxonomy_is_well_formed():
    assert "all" in ALL_PERMISSION_KEYS
    assert "finance:approve" in ALL_PERMISSION_KEYS
    assert "settings:manage" in ALL_PERMISSION_KEYS
    # Unknown combos must NOT be valid keys.
    assert "finance:bogus" not in ALL_PERMISSION_KEYS


def test_has_permission_superuser_and_explicit():
    assert has_permission({"all": True}, "finance:delete") is True
    assert has_permission({"finance:view": True}, "finance:view") is True
    assert has_permission({"finance:view": True}, "finance:edit") is False
    assert has_permission({}, "finance:view") is False
    assert has_permission(None, "finance:view") is False


def test_validate_permissions_rejects_unknown_key():
    ok = validate_permissions({"finance:view": True, "all": True})
    assert ok == {"finance:view": True, "all": True}
    try:
        validate_permissions({"finance:bogus": True})
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_effective_permissions_partner_failsafe():
    # A partner is always full-access regardless of (or absence of) a role.
    assert effective_permissions(None, "partner") == {"all": True}
    assert effective_permissions({"finance:view": True}, "partner") == {"all": True}
    # Non-partner with no role -> empty (fail-open in enforcement).
    assert effective_permissions(None, "employee") == {}
    assert effective_permissions({"crm:view": True}, "employee") == {"crm:view": True}


def test_presets_cover_every_default_role():
    from app.routers.settings import DEFAULT_ROLES

    for name in DEFAULT_ROLES:
        assert name in DEFAULT_ROLE_PRESETS, f"missing preset for {name!r}"
    # Owner is created at onboarding, not seeded.
    assert "Owner" in DEFAULT_ROLE_PRESETS
    # Manager has broad approve but NOT settings:manage / payroll:run / data:delete.
    mgr = DEFAULT_ROLE_PRESETS["Manager"]
    assert mgr.get("projects:approve") is True
    assert "settings:manage" not in mgr
    assert "payroll:run" not in mgr
    assert "data:delete" not in mgr
    # Client is view-only on a narrow set.
    client = DEFAULT_ROLE_PRESETS["Client"]
    assert client == {"projects:view": True, "reports:view": True, "billing:view": True}


# ── Endpoint behaviour ──────────────────────────────────────────────────────────

def test_seed_creates_roles_with_presets(client, make_tenant, auth_headers):
    company, user, _ = make_tenant(
        company_name="SeedCo", user_name="SeedUsr", mobile="9000000001"
    )
    headers = auth_headers(user, company)
    r = client.post(f"/apis/v3/settings/roles/seed/{company.id}", headers=headers)
    assert r.status_code == 200
    roles = {x["role_name"]: x for x in r.json()}
    assert "Manager" in roles and "Client" in roles
    # Preset is actually stored (not {}).
    assert roles["Manager"]["permissions"].get("projects:approve") is True
    # Re-seeding is rejected (idempotency guard).
    r2 = client.post(f"/apis/v3/settings/roles/seed/{company.id}", headers=headers)
    assert r2.status_code == 409


def test_get_me_returns_permissions_for_partner(client, make_tenant, auth_headers):
    company, user, _ = make_tenant(
        company_name="MeCo", user_name="MeUsr", mobile="9000000002"
    )
    headers = auth_headers(user, company)
    r = client.get("/apis/v3/auth/me", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["priority_type"] == "partner"
    assert body["permissions"] == {"all": True}


def test_me_permissions_endpoint(client, make_tenant, auth_headers):
    company, user, _ = make_tenant(
        company_name="MePCo", user_name="MePUsr", mobile="9000000003"
    )
    headers = auth_headers(user, company)
    r = client.get("/apis/v3/auth/me/permissions", headers=headers)
    assert r.status_code == 200
    assert r.json()["permissions"] == {"all": True}


def test_put_role_permissions_validated_and_locked(client, make_tenant, auth_headers):
    company, user, _ = make_tenant(
        company_name="PutCo", user_name="PutUsr", mobile="9000000004"
    )
    headers = auth_headers(user, company)
    # Seed so Admin (a locked role) exists.
    seed = client.post(f"/apis/v3/settings/roles/seed/{company.id}", headers=headers).json()
    owner = next(r for r in seed if r["role_name"] == "Admin")

    # Create a custom role (defaults to all-view).
    cr = client.post(
        f"/apis/v3/settings/roles/{company.id}",
        headers=headers,
        json={"role_name": "Foreman"},
    )
    assert cr.status_code == 200
    role_id = cr.json()["id"]

    # Valid update.
    r = client.put(
        f"/apis/v3/settings/roles/{role_id}/permissions",
        headers=headers,
        json={"permissions": {"finance:approve": True, "crm:view": True}},
    )
    assert r.status_code == 200
    assert r.json()["permissions"] == {"finance:approve": True, "crm:view": True}

    # Unknown key rejected.
    bad = client.put(
        f"/apis/v3/settings/roles/{role_id}/permissions",
        headers=headers,
        json={"permissions": {"finance:bogus": True}},
    )
    assert bad.status_code == 400

    # Admin (locked role) cannot be lowered below all=true.
    lower_owner = client.put(
        f"/apis/v3/settings/roles/{owner['id']}/permissions",
        headers=headers,
        json={"permissions": {"finance:view": True}},
    )
    assert lower_owner.status_code == 400


def test_backfill_rbac_idempotent(client, make_tenant, auth_headers, monkeypatch, db):
    monkeypatch.setattr(settings, "ADMIN_MIGRATION_SECRET", "test-secret")

    # A tenant with a partner member but NO roles and NO role assignment.
    company, user, team = make_tenant(
        company_name="BfCo", user_name="BfUsr", mobile="9000000005"
    )

    # First pass.
    r1 = client.post(
        "/apis/v3/admin/migrations/backfill-rbac",
        headers={"X-Admin-Secret": "test-secret"},
    )
    assert r1.status_code == 200
    s1 = r1.json()
    assert s1["members_assigned"] >= 1
    assert s1["roles_created"] >= 1

    # The partner member now has a role (Admin).
    db.refresh(team)
    assert team.role_id is not None
    assigned_role = db.query(models.CompanyRole).filter(models.CompanyRole.id == team.role_id).first()
    assert assigned_role.role_name == "Admin"

    # Second pass must be a no-op (idempotent).
    r2 = client.post(
        "/apis/v3/admin/migrations/backfill-rbac",
        headers={"X-Admin-Secret": "test-secret"},
    )
    assert r2.status_code == 200
    s2 = r2.json()
    assert s2["members_assigned"] == 0
    assert s2["roles_created"] == 0
    assert s2["roles_filled"] == 0


def test_backfill_requires_secret(client):
    r = client.post("/apis/v3/admin/migrations/backfill-rbac")
    assert r.status_code == 403
