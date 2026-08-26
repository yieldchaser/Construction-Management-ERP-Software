"""R2-722 / D-V1 - the OTP demo path must be off by default and must create nothing.

Gate: OTP_DEMO_ALLOWLIST/OTP_DEMO_CODE shipped with live defaults
("9876543210,+919876543210" / "123456"), so an unset environment still had the
demo login path armed in production. Additionally _ensure_demo_company recreated
the shared demo tenant (and its showcase projects) on any allowlisted login.
After D-V1 + D-V5 the defaults are empty (unset env = demo disabled) and every
demo-tenant creation path is deleted: an allowlisted login gets exactly what an
unknown login gets - an onboarding session and zero company rows.
"""
import uuid

from app.config import Settings, settings
from app.routers import auth as auth_router
from app import models

DEMO_COMPANY_ID = uuid.UUID("e0000000-0000-0000-0000-000000000000")
DEMO_MOBILE = "+919876543210"
SEND_URL = "/apis/v3/auth/otp/send"
VERIFY_URL = "/apis/v3/auth/otp/verify"


def test_defaults_are_inert():
    # The class-level defaults (independent of this process's env) are empty.
    assert Settings.model_fields["OTP_DEMO_ALLOWLIST"].default == ""
    assert Settings.model_fields["OTP_DEMO_CODE"].default == ""
    assert Settings.model_fields["EMAIL_OTP_DEMO_ALLOWLIST"].default == ""


def test_demo_tenant_creation_path_is_removed():
    # Import-level pin for D-V1: no module-level demo machinery may come back.
    assert not hasattr(auth_router, "_ensure_demo_company")
    assert not hasattr(auth_router, "_seed_demo_projects")
    assert not hasattr(auth_router, "_demo_projects_seeded")


def test_empty_allowlist_disables_demo_login(client, db, monkeypatch):
    monkeypatch.setattr(settings, "OTP_DEMO_ALLOWLIST", "")
    monkeypatch.setattr(settings, "OTP_DEMO_CODE", "")

    assert settings.demo_allowlist == set()
    assert auth_router._is_demo_mobile(DEMO_MOBILE) is False

    before = db.query(models.Project).filter(models.Project.company_id == DEMO_COMPANY_ID).count()

    # No SMS provider is configured in tests, so a non-allowlisted number gets
    # the explicit 503 instead of a demo code.
    r = client.post(SEND_URL, json={"mobile": DEMO_MOBILE})
    assert r.status_code == 503, r.text
    assert "mock_code" not in r.json()
    assert "demo_mode" not in r.json()

    after = db.query(models.Project).filter(models.Project.company_id == DEMO_COMPANY_ID).count()
    assert after == before


def test_allowlisted_login_creates_no_tenant(client, db, monkeypatch):
    # Even WITH the allowlist armed (dev convenience for receiving a fixed code),
    # a successful login must never create or attach the shared demo tenant.
    monkeypatch.setattr(settings, "OTP_DEMO_ALLOWLIST", "+919876500111")
    monkeypatch.setattr(settings, "OTP_DEMO_CODE", "654321")

    r = client.post(SEND_URL, json={"mobile": "+919876500111"})
    assert r.status_code == 200, r.text
    v = client.post(VERIFY_URL, json={"mobile": "+919876500111", "code": "654321"})
    assert v.status_code == 200, v.text

    body = v.json()
    assert body["onboarding"] is True, body
    assert body["company"] is None, body

    company = db.query(models.Company).filter(models.Company.id == DEMO_COMPANY_ID).first()
    assert company is None
    memberships = (
        db.query(models.CompanyTeam)
        .filter(models.CompanyTeam.user_id == body["user"]["id"])
        .count()
    )
    assert memberships == 0
