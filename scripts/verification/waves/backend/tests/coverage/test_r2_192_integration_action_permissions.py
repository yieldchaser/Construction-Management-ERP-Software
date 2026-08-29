"""R2-192: integration actions require the permission of the data they move.

google_sheets.py had zero require_permission calls: any member could start the
OAuth grant and any member could export a whole payroll run to an external
Google account, while Drive/Zoho authorize already demand settings:manage and
the in-app payroll views gate behind require_module_view. authorize now agrees
on settings:manage, the payroll export demands payroll access, and the Zoho
bill push demands billing:edit.
"""
import uuid

from app import models
from app.config import settings
from app.auth import create_access_token


def _hdr(user, comp):
    return {"Authorization": "Bearer " + create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name})}


def _partner_tenant(db, tag):
    comp = models.Company(id=uuid.uuid4(), name=f"R192-{tag}", currency_decimal_places=2)
    db.add(comp)
    db.flush()
    user = models.User(
        id=uuid.uuid4(), name=f"U-R192-{tag}",
        mobile=f"+9195{uuid.uuid4().hex[:9]}", email=f"r192-{tag}@test.com",
    )
    db.add(user)
    db.flush()
    db.add(models.CompanyTeam(id=uuid.uuid4(), company_id=comp.id, user_id=user.id, priority_type="partner"))
    db.commit()
    return comp, user


def _restricted_member(db, comp, tag):
    """Employee whose role grants only projects:view - no settings, payroll or billing."""
    user = models.User(
        id=uuid.uuid4(), name=f"E-R192-{tag}",
        mobile=f"+9196{uuid.uuid4().hex[:9]}", email=f"r192-emp-{tag}@test.com",
    )
    db.add(user)
    db.flush()
    role = models.CompanyRole(company_id=comp.id, role_name="Viewer+", permissions={"projects:view": True})
    db.add(role)
    db.flush()
    db.add(models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=user.id,
        priority_type="employee", role_id=role.id,
    ))
    db.commit()
    return user


def test_sheets_authorize_requires_settings_manage(client, db, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_SHEETS_CLIENT_ID", "r192-client-id")
    monkeypatch.setattr(settings, "GOOGLE_SHEETS_CLIENT_SECRET", "r192-secret")
    comp, partner = _partner_tenant(db, "auth")
    employee = _restricted_member(db, comp, "auth")
    comp.google_sheets_authorized_phones = [partner.mobile, employee.mobile]
    db.commit()

    r = client.get(f"/apis/v3/integrations/google-sheets/authorize", params={"company_id": str(comp.id)}, headers=_hdr(employee, comp))
    assert r.status_code == 403, r.text
    assert "settings:manage" in r.json()["detail"]

    r = client.get(f"/apis/v3/integrations/google-sheets/authorize", params={"company_id": str(comp.id)}, headers=_hdr(partner, comp))
    assert r.status_code == 200, r.text
    assert "consent_url" in r.json()


def test_payroll_export_requires_payroll_access(client, db, monkeypatch):
    monkeypatch.setattr(settings, "GOOGLE_SHEETS_CLIENT_ID", "r192-client-id")
    monkeypatch.setattr(settings, "GOOGLE_SHEETS_CLIENT_SECRET", "r192-secret")
    comp, partner = _partner_tenant(db, "pay")
    employee = _restricted_member(db, comp, "pay")
    run = models.PayrollRun(company_id=comp.id, payroll_month="2026-07")
    db.add(run)
    db.commit()

    r = client.post(f"/apis/v3/integrations/google-sheets/payroll-runs/{run.id}/export", headers=_hdr(employee, comp))
    assert r.status_code == 403, r.text
    assert "payroll" in r.json()["detail"]

    r = client.post(f"/apis/v3/integrations/google-sheets/payroll-runs/{run.id}/export", headers=_hdr(partner, comp))
    assert r.status_code == 409, r.text
    assert "not connected" in r.json()["detail"]


def test_zoho_push_bill_requires_billing_edit(client, db, monkeypatch):
    monkeypatch.setattr(settings, "ZOHO_CLIENT_ID", "r192-zoho-id")
    monkeypatch.setattr(settings, "ZOHO_CLIENT_SECRET", "r192-zoho-secret")
    comp, partner = _partner_tenant(db, "zoho")
    employee = _restricted_member(db, comp, "zoho")

    r = client.post(f"/apis/v3/integrations/zoho-books/companies/{comp.id}/push-bill/{uuid.uuid4()}", headers=_hdr(employee, comp))
    assert r.status_code == 403, r.text
    assert "billing:edit" in r.json()["detail"]
