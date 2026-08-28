"""D7 (R2-073 / R2-113 / R2-169): permissions backfill then fail closed.

Covers the founder decision exactly:
  1. Backfill endpoint fills empty role permission dicts from
     DEFAULT_ROLE_PRESETS (all seeded role names), dry_run=true writes nothing
     and returns the per-tenant matrix for eyeball review.
  2. Role names matching no preset fall back to Viewer; the tenant owner gets
     an in-app notice (todo assigned to the partner team row).
  3. Enforcement stays fail-open by default; RBAC_EMPTY_PERMS_POLICY="closed"
     makes an empty configured dict deny everything, and a NULL/dangling
     role_id on a non-partner resolve to Viewer grants. Partners always pass.
  4. per_company mode flips individual tenants via companies
     .permissions_fail_closed, and the global "open" mode overrides any tenant
     override so rollback is a config change, not a deploy.
"""
import uuid

import pytest
from fastapi import HTTPException

from app import models
from app.auth import require_permission, require_module_view
from app.config import settings
from app.permissions import DEFAULT_ROLE_PRESETS, VIEWER_GRANTS

ADMIN_SECRET = "d7-test-secret"
MIGRATION_URL = "/apis/v3/admin/migrations/backfill-role-permissions"


@pytest.fixture()
def admin_secret(monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_MIGRATION_SECRET", ADMIN_SECRET)
    return {"X-Admin-Secret": ADMIN_SECRET}


def _role(db, company, name, perms):
    role = models.CompanyRole(company_id=company.id, role_name=name, permissions=perms)
    db.add(role)
    db.flush()
    return role


def _member(db, company, priority_type="employee", role_id=None):
    user = models.User(
        id=uuid.uuid4(), name=f"emp-{uuid.uuid4().hex[:6]}",
        mobile=f"+919{uuid.uuid4().hex[:9]}",
    )
    db.add(user)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=company.id, user_id=user.id,
        priority_type=priority_type, role_id=role_id,
    )
    db.add(team)
    db.commit()
    return user, team


def _standard_tenant(db, make_tenant):
    """Company with: empty preset-named role, empty custom role, configured
    custom role, one NULL-role employee. Returns (company, roles dict)."""
    comp, owner, _team = make_tenant(company_name="D7Co", user_name="D7Owner")
    manager = _role(db, comp, "Manager", {})
    custom = _role(db, comp, "Night Watch", {})
    accountant = _role(db, comp, "Cost Clerk", {"finance:view": True})
    emp_user, emp_team = _member(db, comp, "employee", None)
    return comp, {
        "owner_team": _team,
        "manager": manager,
        "custom": custom,
        "accountant": accountant,
        "emp_user": emp_user,
        "emp_team": emp_team,
    }


def _matrix_for(payload, company):
    for entry in payload["matrix"]:
        if entry["plan"]["company_id"] == str(company.id):
            return entry
    return None


# ── Backfill: dry run ─────────────────────────────────────────────────────────

def test_backfill_dry_run_writes_nothing_and_matrix_correct(
    client, db, make_tenant, admin_secret
):
    comp, fx = _standard_tenant(db, make_tenant)

    resp = client.post(f"{MIGRATION_URL}?dry_run=true", headers=admin_secret)
    assert resp.status_code == 200
    body = resp.json()
    assert body["dry_run"] is True

    entry = _matrix_for(body, comp)
    assert entry is not None
    plan = entry["plan"]

    # Matrix content: preset match, viewer fallback, untouched configured role.
    by_name = {r["role_name"]: r for r in plan["roles"]}
    assert by_name["Manager"]["matched_preset"] is True
    assert by_name["Manager"]["action"] == "fill_preset"
    assert by_name["Manager"]["resulting_permission_count"] == len(DEFAULT_ROLE_PRESETS["Manager"])
    assert by_name["Night Watch"]["matched_preset"] is False
    assert by_name["Night Watch"]["fallback_viewer"] is True
    assert by_name["Night Watch"]["action"] == "fill_viewer_fallback"
    assert by_name["Night Watch"]["resulting_permission_count"] == len(VIEWER_GRANTS)
    assert by_name["Cost Clerk"]["action"] == "none"
    assert by_name["Cost Clerk"]["currently_configured"] is True
    assert plan["members_to_viewer"]  # employee listed for eyeball review

    # Nothing written: perms stay empty, members keep NULL role, no todos.
    db.expire_all()
    assert db.query(models.CompanyRole).filter(
        models.CompanyRole.id == fx["manager"].id).first().permissions in ({}, None)
    assert db.query(models.CompanyRole).filter(
        models.CompanyRole.id == fx["custom"].id).first().permissions in ({}, None)
    assert db.query(models.CompanyRole).filter(
        models.CompanyRole.id == fx["accountant"].id).first().permissions == {"finance:view": True}
    assert db.query(models.CompanyTeam).filter(
        models.CompanyTeam.id == fx["emp_team"].id).first().role_id is None
    assert db.query(models.Todo).filter(models.Todo.company_id == comp.id).count() == 0


# ── Backfill: apply ───────────────────────────────────────────────────────────

def test_backfill_apply_assigns_presets_viewer_fallback_and_roles(
    client, db, make_tenant, admin_secret
):
    comp, fx = _standard_tenant(db, make_tenant)

    resp = client.post(MIGRATION_URL, headers=admin_secret)  # dry_run defaults false
    assert resp.status_code == 200
    body = resp.json()
    entry = _matrix_for(body, comp)
    assert body["roles_filled"] >= 2
    assert entry["applied"]["members_assigned_viewer"] == 1
    assert entry["applied"]["members_assigned_admin"] == 1
    assert entry["owner_notified"] is True

    db.expire_all()
    manager = db.query(models.CompanyRole).filter(models.CompanyRole.id == fx["manager"].id).first()
    custom = db.query(models.CompanyRole).filter(models.CompanyRole.id == fx["custom"].id).first()
    accountant = db.query(models.CompanyRole).filter(models.CompanyRole.id == fx["accountant"].id).first()

    # Decision 1: preset names get their exact preset set back.
    assert manager.permissions == DEFAULT_ROLE_PRESETS["Manager"]
    # Decision 2: unmatched role names default to Viewer.
    assert custom.permissions == DEFAULT_ROLE_PRESETS["Viewer"]
    # Admin-configured roles are never clobbered.
    assert accountant.permissions == {"finance:view": True}

    # NULL-role members: non-partner -> the Viewer role, partner -> Admin.
    viewer_role = db.query(models.CompanyRole).filter(
        models.CompanyRole.company_id == comp.id,
        models.CompanyRole.role_name == "Viewer",
    ).first()
    assert viewer_role is not None
    assert viewer_role.permissions == DEFAULT_ROLE_PRESETS["Viewer"]
    emp = db.query(models.CompanyTeam).filter(models.CompanyTeam.id == fx["emp_team"].id).first()
    assert emp.role_id == viewer_role.id
    owner = db.query(models.CompanyTeam).filter(models.CompanyTeam.id == fx["owner_team"].id).first()
    assert owner.role_id is not None
    owner_role = db.query(models.CompanyRole).filter(models.CompanyRole.id == owner.role_id).first()
    assert owner_role.role_name in ("Admin", "Owner")

    # In-app owner notification exists and is assigned to the partner team.
    todo = db.query(models.Todo).filter(models.Todo.company_id == comp.id).first()
    assert todo is not None
    assert todo.title.startswith("[SiteFlow] Role permissions backfilled")


def test_backfill_apply_is_idempotent_and_does_not_duplicate_owner_notice(
    client, db, make_tenant, admin_secret
):
    comp, fx = _standard_tenant(db, make_tenant)
    first = client.post(MIGRATION_URL, headers=admin_secret).json()
    second = client.post(MIGRATION_URL, headers=admin_secret).json()

    first_entry = _matrix_for(first, comp)
    second_entry = _matrix_for(second, comp)
    assert first["owners_notified"] == 1
    assert second["owners_notified"] == 0
    assert first_entry["applied"]["roles_filled"] >= 2
    assert second_entry["applied"]["roles_filled"] == 0
    assert second_entry["applied"]["members_assigned_viewer"] == 0
    assert db.query(models.Todo).filter(models.Todo.company_id == comp.id).count() == 1


# ── Enforcement: legacy default (fail-open) ───────────────────────────────────

def test_default_policy_stays_fail_open(db, make_tenant, monkeypatch):
    monkeypatch.setattr(settings, "RBAC_EMPTY_PERMS_POLICY", "open")
    comp, _, _ = make_tenant(company_name="LegacyCo", user_name="Owner1")

    user_role_empty, _ = _member(db, comp, "employee", _role(db, comp, "Empty", {}).id)
    user_no_role, _ = _member(db, comp, "employee", None)

    # Empty configured dict allows (legacy), including sensitive reads.
    require_permission(db, user_role_empty, comp.id, "finance:approve")
    require_module_view(db, user_role_empty, comp.id, "finance")
    # NULL role also allows (legacy).
    require_permission(db, user_no_role, comp.id, "data:delete")
    require_module_view(db, user_no_role, comp.id, "payroll")


# ── Enforcement: fail-closed ──────────────────────────────────────────────────

def test_fail_closed_makes_empty_dict_deny_everything(db, make_tenant, monkeypatch):
    monkeypatch.setattr(settings, "RBAC_EMPTY_PERMS_POLICY", "closed")
    comp, _, _ = make_tenant(company_name="ClosedCo", user_name="Owner2")
    user, _ = _member(db, comp, "employee", _role(db, comp, "Unset", {}).id)

    for key in ("finance:edit", "finance:view", "projects:view"):
        with pytest.raises(HTTPException) as e:
            require_permission(db, user, comp.id, key)
        assert e.value.status_code == 403
    with pytest.raises(HTTPException) as e:
        require_module_view(db, user, comp.id, "finance")
    assert e.value.status_code == 403


def test_fail_closed_configured_role_still_enforces_its_grants(db, make_tenant, monkeypatch):
    monkeypatch.setattr(settings, "RBAC_EMPTY_PERMS_POLICY", "closed")
    comp, _, _ = make_tenant(company_name="ClosedCo2", user_name="Owner3")
    role = _role(db, comp, "Reader", {"finance:view": True})
    user, _ = _member(db, comp, "employee", role.id)

    require_module_view(db, user, comp.id, "finance")  # granted
    with pytest.raises(HTTPException):
        require_permission(db, user, comp.id, "finance:edit")  # not granted


def test_fail_closed_null_role_nonpartner_gets_viewer_partner_passes(
    db, make_tenant, monkeypatch
):
    monkeypatch.setattr(settings, "RBAC_EMPTY_PERMS_POLICY", "closed")
    comp, owner, _ = make_tenant(company_name="ClosedCo3", user_name="Owner4")
    user, _ = _member(db, comp, "employee", None)

    # Non-partner with no resolvable role: read-only floor (D7 decision 4).
    require_permission(db, user, comp.id, "projects:view")  # Viewer grants allow
    with pytest.raises(HTTPException):
        require_permission(db, user, comp.id, "projects:edit")
    with pytest.raises(HTTPException):
        require_permission(db, user, comp.id, "settings:manage")
    require_module_view(db, user, comp.id, "reports")      # view-only access ok

    # Partner with NULL role still passes everything (failsafe 1).
    require_permission(db, owner, comp.id, "anything:super")
    require_module_view(db, owner, comp.id, "payroll")


# ── Flag semantics: per-company flip + global rollback ────────────────────────

def test_per_company_flip_and_global_open_rollback(
    client, db, make_tenant, admin_secret, monkeypatch
):
    monkeypatch.setattr(settings, "RBAC_EMPTY_PERMS_POLICY", "per_company")
    comp, _, _ = make_tenant(company_name="FlipCo", user_name="Owner5")
    user, _ = _member(db, comp, "employee", _role(db, comp, "Blank", {}).id)
    url = f"/apis/v3/admin/migrations/rbac-fail-closed/{comp.id}"

    # Default override (None): inherits safe open behaviour.
    got = client.get(url, headers=admin_secret)
    assert got.status_code == 200
    assert got.json()["effective_fail_closed"] is False
    require_permission(db, user, comp.id, "finance:approve")  # legacy open

    flipped = client.put(url, headers=admin_secret, json={"fail_closed": True})
    assert flipped.status_code == 200
    assert flipped.json()["effective_fail_closed"] is True
    db.expire_all()  # the PUT committed in its own session; refresh this one
    with pytest.raises(HTTPException):
        require_permission(db, user, comp.id, "finance:approve")  # now denied

    # Global rollback to "open" wins over any tenant flag: a setting, not a deploy.
    monkeypatch.setattr(settings, "RBAC_EMPTY_PERMS_POLICY", "open")
    require_permission(db, user, comp.id, "finance:approve")  # legacy again
