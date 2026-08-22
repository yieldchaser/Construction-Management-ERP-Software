"""OTP core tests: the 5-attempt cap and the constant-time compare path.

The existing test_auth_security.py covers single-use, hashed-at-rest, and TTL.
This file covers the remaining documented OTP guarantees:
  - wrong code fails (constant-time compare mismatch),
  - repeated wrong attempts increment a counter,
  - hitting OTP_MAX_ATTEMPTS burns the code (replay / correct-code also fails),
  - a correct code verifies (constant-time compare match).

All paths go through the identical production verify logic (hmac.compare_digest)."""
import pytest

from app import models
from app.config import settings

DEMO_MOBILE = "+919876543210"
DEMO_CODE = "123456"


@pytest.fixture
def demo_otp_settings(monkeypatch):
    monkeypatch.setattr(settings, "OTP_DEMO_ALLOWLIST", "9876543210,+919876543210")
    monkeypatch.setattr(settings, "OTP_DEMO_CODE", DEMO_CODE)


def test_otp_wrong_code_fails_constant_time_compare(client, db, demo_otp_settings):
    # Wrong code must never yield a token (exercises hmac.compare_digest mismatch).
    r = client.post("/apis/v3/auth/otp/send", json={"mobile": DEMO_MOBILE})
    assert r.status_code == 200
    bad = client.post("/apis/v3/auth/otp/verify", json={"mobile": DEMO_MOBILE, "code": "000000"})
    assert bad.status_code == 400
    assert "access_token" not in bad.json()


def test_otp_wrong_code_increments_attempt_counter(client, db, demo_otp_settings):
    r = client.post("/apis/v3/auth/otp/send", json={"mobile": DEMO_MOBILE})
    assert r.status_code == 200
    for _ in range(3):
        bad = client.post("/apis/v3/auth/otp/verify", json={"mobile": DEMO_MOBILE, "code": "000000"})
        assert bad.status_code == 400
    otp = (
        db.query(models.OTPCode)
        .filter(models.OTPCode.identifier == DEMO_MOBILE, models.OTPCode.consumed.is_(False))
        .first()
    )
    assert otp is not None
    assert otp.attempts == 3


def test_otp_attempt_cap_burns_code(db, monkeypatch):
    # Drive exactly OTP_MAX_ATTEMPTS wrong submissions through the real verify
    # logic; the cap must burn the code so even the *correct* code then fails.
    # We unit-test the function directly (with a small, deterministic cap) to
    # avoid the per-endpoint rate limiter and demo-number side effects.
    from app.routers.auth import _issue_otp, _verify_otp_code

    monkeypatch.setattr(settings, "OTP_MAX_ATTEMPTS", 3)
    ident = "+919888777666"
    code = "222333"
    _issue_otp(db, ident, channel="sms", code=code, purpose="login")

    for _ in range(3):
        with pytest.raises(Exception):
            _verify_otp_code(db, ident, "999111", purpose="login")

    # Correct code must now fail: the code was consumed at the attempt cap.
    with pytest.raises(Exception):
        _verify_otp_code(db, ident, code, purpose="login")

    otp = (
        db.query(models.OTPCode)
        .filter(models.OTPCode.identifier == ident)
        .order_by(models.OTPCode.created_at.desc())
        .first()
    )
    assert otp.consumed is True


def test_otp_correct_code_verifies_constant_time_compare(db):
    # Directly exercise the constant-time compare match path (no network).
    from app.routers.auth import _issue_otp, _verify_otp_code

    ident = "+919999888777"
    code = "654321"
    _issue_otp(db, ident, channel="sms", code=code, purpose="login")
    # Correct code -> no exception (compare_digest match).
    _verify_otp_code(db, ident, code, purpose="login")

    # Re-issue and confirm a wrong code raises (compare_digest mismatch).
    _issue_otp(db, ident, channel="sms", code=code, purpose="login")
    with pytest.raises(Exception):
        _verify_otp_code(db, ident, "111111", purpose="login")
