"""Auth-surface tests: the historically-bug-prone OTP machinery (HMAC hashing,
TTL, single-use) and password hashing. These exercise the REAL endpoints/helpers
used in production, not mocks."""
import hashlib
import hmac

import pytest

from app.config import settings
from app import models
from app.security import hash_password, verify_password, validate_password_strength

DEMO_MOBILE = "+919876543210"
DEMO_CODE = "123456"


@pytest.fixture
def demo_otp_settings(monkeypatch):
    monkeypatch.setattr(settings, "OTP_DEMO_ALLOWLIST", "9876543210,+919876543210")
    monkeypatch.setattr(settings, "OTP_DEMO_CODE", DEMO_CODE)


def test_otp_single_use(client, demo_otp_settings):
    r = client.post("/apis/v3/auth/otp/send", json={"mobile": DEMO_MOBILE})
    assert r.status_code == 200
    code = r.json()["mock_code"]
    # First verify succeeds and returns a session.
    r1 = client.post("/apis/v3/auth/otp/verify", json={"mobile": DEMO_MOBILE, "code": code})
    assert r1.status_code == 200
    assert "access_token" in r1.json()
    # Replaying the same code must fail: the code is burned on first use.
    r2 = client.post("/apis/v3/auth/otp/verify", json={"mobile": DEMO_MOBILE, "code": code})
    assert r2.status_code == 400


def test_otp_stored_hashed_not_plaintext(client, db, demo_otp_settings):
    r = client.post("/apis/v3/auth/otp/send", json={"mobile": DEMO_MOBILE})
    assert r.status_code == 200
    code = r.json()["mock_code"]
    otp = (
        db.query(models.OTPCode)
        .filter(models.OTPCode.identifier == DEMO_MOBILE, models.OTPCode.consumed.is_(False))
        .first()
    )
    assert otp is not None
    expected = hmac.new(
        settings.SECRET_KEY.encode(), f"{DEMO_MOBILE}:{code}".encode(), hashlib.sha256
    ).hexdigest()
    assert otp.code_hash == expected
    # A leaked DB must not expose the live code: there is no plaintext `code`
    # column populated.
    assert not getattr(otp, "code", None)


def test_otp_ttl_expired(client, monkeypatch, demo_otp_settings):
    monkeypatch.setattr(settings, "OTP_TTL_SECONDS", -1)
    r = client.post("/apis/v3/auth/otp/send", json={"mobile": DEMO_MOBILE})
    assert r.status_code == 200
    code = r.json()["mock_code"]
    r2 = client.post("/apis/v3/auth/otp/verify", json={"mobile": DEMO_MOBILE, "code": code})
    assert r2.status_code == 400


def test_password_hashing_roundtrip():
    h = hash_password("Sup3rSecret!")
    assert h.startswith("$2b$")
    assert verify_password("Sup3rSecret!", h) is True
    # Wrong and empty passwords must not verify, and must not raise.
    assert verify_password("wrong", h) is False
    assert verify_password("", h) is False


def test_password_strength_policy():
    assert validate_password_strength("short") is not None  # too short
    assert validate_password_strength("12345678") is not None  # all numeric
    assert validate_password_strength("Password1!x") is None  # acceptable
