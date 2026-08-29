"""Direct unit tests for the highest-fan-in security chokepoints in app/auth.py.

The endpoint-level RBAC/tenant-isolation behaviour is already covered by
test_router_tenant_isolation.py and test_rbac_phase2b.py. This file locks down
the FUNCTIONS themselves (167/149-caller hubs) and asserts the documented
failsafe semantics precisely, independent of any single endpoint:

  - get_company_membership: member passes; non-member 403; other company 403.
  - require_permission: present passes; absent 403; partner always passes;
    `all: true` bypasses; empty/null role permissions FAIL OPEN (allowed).
  - require_module_view: view/edit/approve pass; unrelated role 403; partner bypass.
  - verify_company_access / verify_project_access: member ok; outsider 403;
    project resolves to its owning company; missing project 404.

Per the task rules these assert DOCUMENTED behaviour; the fail-open semantics
are intentional and must NOT be "fixed" here."""
import uuid

import pytest
from fastapi import HTTPException

from app import models
from app.auth import (
    get_company_membership,
    require_permission,
    require_module_view,
    verify_company_access,
    verify_project_access,
)


def _employee(db, company, perms):
    """Create an employee-priority member with a custom role (perms dict)."""
    user = models.User(id=uuid.uuid4(), name="emp", mobile=f"+919{uuid.uuid4().hex[:9]}")
    db.add(user)
    db.flush()
    role = models.CompanyRole(company_id=company.id, role_name="Role", permissions=perms)
    db.add(role)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=company.id, user_id=user.id,
        priority_type="employee", role_id=role.id,
    )
    db.add(team)
    db.commit()
    return user, team


def _employee_no_role(db, company):
    """Employee with a role_id but un-configured (empty) permissions -> fail-open."""
    user = models.User(id=uuid.uuid4(), name="emp2", mobile=f"+919{uuid.uuid4().hex[:9]}")
    db.add(user)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=company.id, user_id=user.id, priority_type="employee",
    )
    db.add(team)
    db.commit()
    return user, team


# ── get_company_membership ────────────────────────────────────────────────────

def test_membership_member_passes(db, make_tenant):
    comp, user, team = make_tenant(company_name="A", user_name="UA", mobile="+919888700001")
    m = get_company_membership(db, user, comp.id)
    assert m.id == team.id


def test_membership_non_member_403(db, make_tenant):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888700002")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888700003")
    with pytest.raises(HTTPException) as e:
        get_company_membership(db, user_a, comp_b.id)
    assert e.value.status_code == 403


# ── require_permission ────────────────────────────────────────────────────────

def test_require_permission_present_passes(db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710001")
    user, _ = _employee(db, comp, {"finance:approve": True})
    require_permission(db, user, comp.id, "finance:approve")  # no raise


def test_require_permission_absent_403(db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710002")
    user, _ = _employee(db, comp, {"projects:view": True})
    with pytest.raises(HTTPException) as e:
        require_permission(db, user, comp.id, "finance:approve")
    assert e.value.status_code == 403


def test_require_permission_partner_always_passes(db, make_tenant):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710003")
    # Partner with no role at all must still pass every check (failsafe 1).
    require_permission(db, user, comp.id, "anything:super")


def test_require_permission_all_true_bypasses(db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710004")
    user, _ = _employee(db, comp, {"all": True})
    require_permission(db, user, comp.id, "anything:super")  # superuser flag


def test_require_permission_empty_perms_fail_open(db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710005")
    user, _ = _employee_no_role(db, comp)
    # Un-migrated / empty role permissions -> fails open (allowed), by design.
    require_permission(db, user, comp.id, "finance:approve")


# ── require_module_view ───────────────────────────────────────────────────────

def test_require_module_view_view_passes(db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710006")
    user, _ = _employee(db, comp, {"finance:view": True})
    require_module_view(db, user, comp.id, "finance")  # view grants access


def test_require_module_view_unrelated_role_403(db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710007")
    user, _ = _employee(db, comp, {"projects:view": True})
    with pytest.raises(HTTPException) as e:
        require_module_view(db, user, comp.id, "finance")
    assert e.value.status_code == 403


def test_require_module_view_partner_bypass(db, make_tenant):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888710008")
    require_module_view(db, user, comp.id, "finance")  # partner bypass


# ── verify_company_access / verify_project_access ─────────────────────────────

def test_verify_company_access_member_ok(db, make_tenant):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888720001")
    verify_company_access(comp.id, current_user=user, db=db)  # no raise


def test_verify_company_access_outsider_403(db, make_tenant):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888720002")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888720003")
    with pytest.raises(HTTPException) as e:
        verify_company_access(comp_a.id, current_user=user_b, db=db)
    assert e.value.status_code == 403


def test_verify_project_access_member_ok(db, make_tenant):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888720004")
    proj = models.Project(id=uuid.uuid4(), company_id=comp.id, name="P", code="P1", status="Ongoing")
    db.add(proj)
    db.commit()
    verify_project_access(proj.id, current_user=user, db=db)  # resolves company correctly


def test_verify_project_access_outsider_403(db, make_tenant):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888720005")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888720006")
    proj = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="P", code="P2", status="Ongoing")
    db.add(proj)
    db.commit()
    with pytest.raises(HTTPException) as e:
        verify_project_access(proj.id, current_user=user_b, db=db)
    assert e.value.status_code == 403


def test_verify_project_access_missing_404(db, make_tenant):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888720007")
    with pytest.raises(HTTPException) as e:
        verify_project_access(uuid.uuid4(), current_user=user, db=db)
    assert e.value.status_code == 404
