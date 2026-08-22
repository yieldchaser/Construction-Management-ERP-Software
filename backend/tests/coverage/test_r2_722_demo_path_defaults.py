"""R2-722 - OTP demo path must be off by default and seed exactly once.

Gate: OTP_DEMO_ALLOWLIST/OTP_DEMO_CODE shipped with live defaults
("9876543210,+919876543210" / "123456"), so an unset environment still had the
demo login path armed in production. Additionally _ensure_demo_company seeded
showcase projects on the creation path with no one-time guard, so any flow that
recreates the demo tenant would re-seed projects on later allowlisted logins.
After the fix the defaults are empty (unset env = demo disabled) and seeding is
guarded to run at most once per process.
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


def test_explicit_allowlist_seeds_once_not_twice(client, db, monkeypatch):
    monkeypatch.setattr(settings, "OTP_DEMO_ALLOWLIST", "+919876500111")
    monkeypatch.setattr(settings, "OTP_DEMO_CODE", "654321")

    # Start from a clean demo tenant so the create-and-seed branch runs.
    db.query(models.Project).filter(models.Project.company_id == DEMO_COMPANY_ID).delete(
        synchronize_session=False
    )
    db.query(models.CompanyTeam).filter(models.CompanyTeam.company_id == DEMO_COMPANY_ID).delete(
        synchronize_session=False
    )
    db.query(models.Company).filter(models.Company.id == DEMO_COMPANY_ID).delete(
        synchronize_session=False
    )
    db.commit()
    monkeypatch.setattr(auth_router, "_demo_projects_seeded", False)

    seed_calls = []
    real_seed = auth_router._seed_demo_projects

    def _spy(session, company_id):
        seed_calls.append(str(company_id))
        return real_seed(session, company_id)

    monkeypatch.setattr(auth_router, "_seed_demo_projects", _spy)

    def _login():
        r = client.post(SEND_URL, json={"mobile": "+919876500111"})
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("demo_mode") is True, body
        v = client.post(VERIFY_URL, json={"mobile": "+919876500111", "code": body["mock_code"]})
        assert v.status_code == 200, v.text

    # First allowlisted login creates the demo tenant and seeds its projects.
    _login()
    assert len(seed_calls) == 1, seed_calls
    count = db.query(models.Project).filter(models.Project.company_id == DEMO_COMPANY_ID).count()
    assert count == 3, count

    # Second allowlisted login must not re-seed anything.
    _login()
    assert len(seed_calls) == 1, seed_calls
    count = db.query(models.Project).filter(models.Project.company_id == DEMO_COMPANY_ID).count()
    assert count == 3, count
