"""Firebase phone-auth coverage (cheap, no network).

Tests the server half of Firebase Phone Auth:
  * /apis/v3/auth/firebase/verify -> 503 when unconfigured
  * 401 on invalid token, 400 on missing phone, 200 verifies + mints session
  * find-or-create by verified phone (no duplicate)
  * firebase_auth.verify_id_token unit behaviour (empty -> error, exceptions -> normalised error)

firebase_admin is NOT a runtime dependency of this test: verify_id_token only
imports it inside the function, and we monkeypatch it so nothing network/init
related ever runs.
"""
import sys
import types
import uuid

import pytest
import requests

from app import firebase_auth
from app import models
from app.routers.auth import _hash_handoff  # noqa: F401 (parity import)


URL = "/apis/v3/auth/firebase/verify"


@pytest.fixture()
def _configured(monkeypatch):
    """Make firebase_auth.is_configured() True without a real SA credential."""
    monkeypatch.setattr(firebase_auth, "is_configured", lambda: True)


@pytest.fixture()
def _unconfigured(monkeypatch):
    monkeypatch.setattr(firebase_auth, "is_configured", lambda: False)


def test_firebase_unconfigured_returns_503(client, _unconfigured):
    r = client.post(URL, json={"id_token": "anything"})
    assert r.status_code == 503
    assert "not configured" in r.json()["detail"]


def test_firebase_invalid_token_returns_401(client, _configured, monkeypatch):
    monkeypatch.setattr(firebase_auth, "verify_id_token", lambda token: (_ for _ in ()).throw(
        ValueError("Invalid or expired Firebase ID token")
    ))
    r = client.post(URL, json={"id_token": "bad"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid or expired verification. Please try again."


def test_firebase_no_phone_returns_400(client, _configured, monkeypatch):
    monkeypatch.setattr(firebase_auth, "verify_id_token", lambda token: {"sub": "x"})
    r = client.post(URL, json={"id_token": "tok"})
    assert r.status_code == 400
    assert r.json()["detail"] == "This Firebase account has no verified phone number."


def test_firebase_valid_token_creates_user_and_mints_session(client, db, _configured, monkeypatch):
    mobile = "+919888790301"
    monkeypatch.setattr(
        firebase_auth, "verify_id_token",
        lambda token: {"phone_number": mobile, "sub": "abc"},
    )
    r = client.post(URL, json={"id_token": "tok"})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    user = db.query(models.User).filter(models.User.mobile == mobile).one()
    assert "firebase_phone" in (user.auth_providers or "")


def test_firebase_valid_token_links_existing_user(client, db, _configured, monkeypatch):
    mobile = "+919888790302"
    user = models.User(id=uuid.uuid4(), name="Pre", mobile=mobile, auth_providers="password")
    db.add(user)
    db.commit()

    monkeypatch.setattr(
        firebase_auth, "verify_id_token",
        lambda token: {"phone_number": mobile, "sub": "abc"},
    )
    r = client.post(URL, json={"id_token": "tok"})
    assert r.status_code == 200
    # The same user is returned, not a duplicate.
    count = db.query(models.User).filter(models.User.mobile == mobile).count()
    assert count == 1
    refreshed = db.query(models.User).filter(models.User.mobile == mobile).one()
    assert "firebase_phone" in (refreshed.auth_providers or "")
    assert "password" in (refreshed.auth_providers or "")


def test_verify_id_token_unit_empty_raises():
    with pytest.raises(ValueError) as e:
        firebase_auth.verify_id_token("")
    assert "Missing Firebase ID token" in str(e.value)


def test_verify_id_token_unit_normalises_exception(monkeypatch):
    """verify_id_token must never leak the underlying error; it normalises any
    exception from the Admin SDK to a single token-free ValueError."""

    # firebase_admin is not installed in the test env. Inject a minimal fake
    # module into sys.modules so verify_id_token's local `from firebase_admin
    # import auth as fb_auth` resolves and the call can raise.
    fake_auth = types.ModuleType("firebase_admin.auth")

    def _boom(token, app=None):
        raise RuntimeError("network/crypto failure")

    fake_auth.verify_id_token = _boom
    fake_fb = types.ModuleType("firebase_admin")

    class _Cert:
        def __init__(self, *a, **k):
            pass

    fake_fb.auth = fake_auth
    fake_fb.credentials = types.SimpleNamespace(Certificate=_Cert)
    fake_fb.initialize_app = lambda *a, **k: None
    fake_fb.get_app = lambda *a, **k: (_ for _ in ()).throw(ValueError("no default app"))
    monkeypatch.setitem(sys.modules, "firebase_admin", fake_fb)
    monkeypatch.setitem(sys.modules, "firebase_admin.auth", fake_auth)
    # Skip real Admin SDK init (_ensure_app -> _load_credentials, which needs a
    # credential file); our fake fb_auth.verify_id_token is what raises.
    monkeypatch.setattr(firebase_auth, "_ensure_app", lambda: None)

    with pytest.raises(ValueError) as e:
        firebase_auth.verify_id_token("sometoken")
    assert "Invalid or expired Firebase ID token" in str(e.value)
    # A real network/crypto error message must NOT leak out.
    assert "network/crypto failure" not in str(e.value)
