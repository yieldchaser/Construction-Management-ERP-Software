"""R2-541 — settings write routes demand the permission, not just membership.

Gate: every mutating write under /settings that the audit caught accepting any
company member (role seeding, statutory payroll defaults, salary templates,
branding files incl. the invoice signature/stamp slots) must answer 403 to a
member whose role lacks `settings:manage`, while the partner path keeps
working on all of them. Membership alone is not authorization.
"""
import uuid

from app import models

PNG_BYTES = b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


def _make_limited_member(db, company, perms, auth_headers):
    """Create an employee-priority member holding exactly `perms`."""
    user = models.User(id=uuid.uuid4(), name="Limited", mobile=f"+919{uuid.uuid4().hex[:9]}")
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
    return user, auth_headers(user, company)


def test_member_without_permission_is_403_on_every_ungated_write(client, db, make_tenant, auth_headers):
    comp, partner, _team = make_tenant(company_name="R541", user_name="Owner")
    _limited, ro_hdr = _make_limited_member(db, comp, {"projects:view": True}, auth_headers)
    partner_hdr = auth_headers(partner, comp)

    # A salary template must exist (created by the partner) for the PUT probe.
    r = client.post(
        f"/apis/v3/settings/salary-templates/{comp.id}",
        headers=partner_hdr,
        json={"name": "Foreman", "breakup": {"basic_pct": 100}},
    )
    assert r.status_code == 201, r.text
    template_id = r.json()["id"]

    probes = [
        ("roles seed", lambda h: client.post(f"/apis/v3/settings/roles/seed/{comp.id}", headers=h)),
        (
            "payroll defaults",
            lambda h: client.put(
                f"/apis/v3/settings/payroll/{comp.id}",
                headers=h,
                json={"pf_employee_pct": 12, "confirm_changes": True},
            ),
        ),
        (
            "salary template create",
            lambda h: client.post(
                f"/apis/v3/settings/salary-templates/{comp.id}",
                headers=h,
                json={"name": "T", "breakup": {"basic_pct": 100}},
            ),
        ),
        (
            "salary template update",
            lambda h: client.put(
                f"/apis/v3/settings/salary-templates/{template_id}",
                headers=h,
                json={"description": "nope"},
            ),
        ),
        (
            "branding upload",
            lambda h: client.post(
                f"/apis/v3/settings/company-file/{comp.id}?asset_type=signature",
                headers=h,
                files={"file": ("sig.png", PNG_BYTES, "image/png")},
            ),
        ),
    ]
    for label, call in probes:
        r = call(ro_hdr)
        assert r.status_code == 403, f"{label}: expected 403, got {r.status_code}: {r.text}"
        assert "settings:manage" in r.json()["detail"], label


def test_partner_keeps_full_access_on_all_five_writes(client, db, make_tenant, auth_headers):
    comp, partner, _team = make_tenant(company_name="R541b", user_name="Owner")
    hdr = auth_headers(partner, comp)

    r = client.post(f"/apis/v3/settings/roles/seed/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    assert len(r.json()) == 10

    r = client.put(
        f"/apis/v3/settings/payroll/{comp.id}",
        headers=hdr,
        json={"pf_employee_pct": 12, "confirm_changes": True},
    )
    assert r.status_code == 200, r.text
    assert float(r.json()["pf_employee_pct"]) == 12.0

    r = client.post(
        f"/apis/v3/settings/salary-templates/{comp.id}",
        headers=hdr,
        json={"name": "Foreman", "breakup": {"basic_pct": 100}},
    )
    assert r.status_code == 201, r.text
    template_id = r.json()["id"]

    r = client.put(
        f"/apis/v3/settings/salary-templates/{template_id}",
        headers=hdr,
        json={"description": "site foreman band"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["description"] == "site foreman band"

    r = client.post(
        f"/apis/v3/settings/company-file/{comp.id}?asset_type=signature",
        headers=hdr,
        files={"file": ("sig.png", PNG_BYTES, "image/png")},
    )
    assert r.status_code == 200, r.text
    assert r.json()["asset_type"] == "signature"
