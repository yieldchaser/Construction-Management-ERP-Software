"""RBAC Phase 2b regression tests: <module>:edit on everyday writes + sensitive
financial/payroll :view reads.

Covers the four failsafe permutations on a representative write (create_payment
→ finance:edit) and a sensitive-read (GET /finance/accounts/{company_id}
→ finance :view):
  - view-only role (no finance:edit)               -> 403
  - role WITH finance:edit                          -> allowed
  - partner member                                  -> allowed
  - un-configured empty {} role (fail-open)         -> allowed
  - sensitive read: no finance access               -> 403
  - sensitive read: finance:view                    -> allowed
"""
import uuid

from app import models


def _make_employee(db, company, perms, auth_headers):
    """Create an employee-priority member with a custom role (perms dict)."""
    user = models.User(id=uuid.uuid4(), name="Emp", mobile=f"+919{uuid.uuid4().hex[:9]}")
    db.add(user)
    db.flush()
    role = models.CompanyRole(
        company_id=company.id,
        role_name=f"Role-{uuid.uuid4().hex[:6]}",
        permissions=perms,
    )
    db.add(role)
    db.flush()
    team = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=company.id,
        user_id=user.id,
        priority_type="employee",
        role_id=role.id,
    )
    db.add(team)
    db.commit()
    return user, role, auth_headers(user, company)


def _payment_payload(company_id):
    return {
        "company_id": str(company_id),
        "payment_type": "out",
        "amount": 100.0,
        "payment_method": "Cash",
        "payment_date": "2026-01-01T00:00:00",
    }


# ── write gate: finance:edit on POST /finance/payments ───────────────────────

def test_create_payment_denies_view_only(client, db, make_tenant, auth_headers):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888802001", email="v1@t.com")
    _, _, hdr = _make_employee(db, comp, {"finance:view": True}, auth_headers)
    r = client.post("/apis/v3/finance/payments", json=_payment_payload(comp.id), headers=hdr)
    assert r.status_code == 403


def test_create_payment_allows_with_edit(client, db, make_tenant, auth_headers):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888802002", email="v2@t.com")
    _, _, hdr = _make_employee(db, comp, {"finance:edit": True}, auth_headers)
    r = client.post("/apis/v3/finance/payments", json=_payment_payload(comp.id), headers=hdr)
    assert r.status_code != 403


def test_create_payment_allows_partner(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888802003", email="v3@t.com")
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/finance/payments", json=_payment_payload(comp.id), headers=hdr)
    assert r.status_code != 403


def test_create_payment_fail_open_empty_perms(client, db, make_tenant, auth_headers):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888802004", email="v4@t.com")
    _, _, hdr = _make_employee(db, comp, {}, auth_headers)
    r = client.post("/apis/v3/finance/payments", json=_payment_payload(comp.id), headers=hdr)
    assert r.status_code != 403


# ── sensitive read gate: finance :view on GET /finance/accounts/{company_id} ──

def test_finance_read_denies_without_access(client, db, make_tenant, auth_headers):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888802005", email="r1@t.com")
    _, _, hdr = _make_employee(db, comp, {"projects:view": True}, auth_headers)
    r = client.get(f"/apis/v3/finance/accounts/{comp.id}", headers=hdr)
    assert r.status_code == 403


def test_finance_read_allows_with_view(client, db, make_tenant, auth_headers):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888802006", email="r2@t.com")
    _, _, hdr = _make_employee(db, comp, {"finance:view": True}, auth_headers)
    r = client.get(f"/apis/v3/finance/accounts/{comp.id}", headers=hdr)
    assert r.status_code != 403
