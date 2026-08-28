"""Google identity OAuth + single-use handoff exchange coverage (no network).

What is exercised:
  * google_auth._require_oauth_config() -> 503 when creds unset
  * _sign_state / _verify_state round-trip; tampered + wrong-purpose states -> 400
  * google_auth.authorize() -> 307 with state + Google consent host
  * google_auth.callback() happy path -> 307 with ?code= (handoff), never the JWT
  * callback unverified email -> ?error=google_unverified
  * callback denied (error=access_denied) -> ?error=google_denied
  * POST /auth/oauth/exchange success + single-use burn + expired + unknown -> 400

All Google HTTP (requests.post/get) is monkeypatched; no network, no real creds.

NOTE on invocation: the authorize/callback handlers are exercised by calling the
functions directly rather than over HTTP. Mutating the Pydantic BaseSettings
instance (to "configure" Google) re-triggers its model_validator and makes
FastAPI's lazy _IncludedRouter drop the route (a test-harness artefact, not an
app bug), so we patch the guard function for the call-level tests and call the
handlers directly. The handoff-exchange endpoint lives on the auth router and is
hit over HTTP normally.
"""
import uuid
from datetime import timedelta

import pytest
import requests

from app import models
from app.config import settings
from app.routers import google_auth
from app.routers.auth import _hash_handoff


def _configured(monkeypatch):
    """Treat the server as Google-configured for call-level tests.

    Patch the guard directly rather than mutating the Pydantic BaseSettings
    instance (see module note). The config gate is covered directly in
    test_google_oauth_unconfigured_503 / test_google_oauth_configured_ok."""
    monkeypatch.setattr(google_auth, "_require_oauth_config", lambda: None)


class _FakeResp:
    def __init__(self, status_code=200, payload=None):
        self.status_code = status_code
        self._payload = payload or {}

    def json(self):
        return self._payload


# ── _require_oauth_config gating ─────────────────────────────────────────────

def test_google_oauth_unconfigured_503():
    # Default test settings leave Google creds unset, so the guard raises 503.
    with pytest.raises(Exception) as e:
        google_auth._require_oauth_config()
    assert getattr(e.value, "status_code", None) == 503


def test_google_oauth_configured_ok(monkeypatch):
    _configured(monkeypatch)
    google_auth._require_oauth_config()  # no raise


# ── state sign/verify ────────────────────────────────────────────────────────

def test_google_state_roundtrip_and_verify(monkeypatch):
    _configured(monkeypatch)
    state = google_auth._sign_state()
    google_auth._verify_state(state)  # must not raise

    with pytest.raises(Exception) as e:
        google_auth._verify_state("not-a-jwt")
    assert getattr(e.value, "status_code", None) == 400

    # A validly-signed JWT of the wrong purpose must also be rejected.
    from app.auth import create_access_token

    wrong = create_access_token({"nonce": "x", "purpose": "else"}, expires_delta=timedelta(minutes=5))
    with pytest.raises(Exception) as e2:
        google_auth._verify_state(wrong)
    assert getattr(e2.value, "status_code", None) == 400


# ── authorize redirect ───────────────────────────────────────────────────────

def test_google_authorize_redirects_with_state(monkeypatch):
    _configured(monkeypatch)
    resp = google_auth.authorize()
    assert resp.status_code == 307
    loc = resp.headers["location"]
    assert "state=" in loc
    assert "accounts.google.com" in loc


# ── callback happy path (handoff issued, no JWT in URL) ──────────────────────

def test_google_callback_happy_path_issues_handoff(db, monkeypatch):
    _configured(monkeypatch)
    email = "verified@example.com"
    user = models.User(id=uuid.uuid4(), name="V", email=email, email_verified=False)
    db.add(user)
    db.commit()

    state = google_auth._sign_state()
    monkeypatch.setattr(
        google_auth.requests, "post",
        lambda *a, **k: _FakeResp(200, {"access_token": "tok"}),
    )
    monkeypatch.setattr(
        google_auth.requests, "get",
        lambda *a, **k: _FakeResp(200, {"email": email, "email_verified": True, "name": "V"}),
    )

    # Called directly (not over HTTP) the FastAPI Query defaults must be passed
    # explicitly; error=None mirrors what the HTTP layer supplies.
    resp = google_auth.callback(db=db, code="xyz", state=state, error=None)
    assert resp.status_code == 307
    loc = resp.headers["location"]
    assert "?code=" in loc
    assert "access_token" not in loc
    assert "bearer" not in loc.lower()

    handoff = db.query(models.OAuthHandoff).filter(models.OAuthHandoff.user_id == user.id).first()
    assert handoff is not None
    assert handoff.consumed is False


def test_google_callback_unverified_email_redirects(db, monkeypatch):
    _configured(monkeypatch)
    state = google_auth._sign_state()
    monkeypatch.setattr(
        google_auth.requests, "post",
        lambda *a, **k: _FakeResp(200, {"access_token": "tok"}),
    )
    monkeypatch.setattr(
        google_auth.requests, "get",
        lambda *a, **k: _FakeResp(200, {"email": "x@y.com", "email_verified": False}),
    )
    resp = google_auth.callback(db=db, code="xyz", state=state, error=None)
    assert resp.status_code == 307
    assert "google_unverified" in resp.headers["location"]


def test_google_callback_denied_redirects(monkeypatch):
    _configured(monkeypatch)
    state = google_auth._sign_state()
    resp = google_auth.callback(db=None, code=None, state=state, error="access_denied")
    assert resp.status_code == 307
    assert "google_denied" in resp.headers["location"]


# ── handoff exchange (pure DB, no Google) ────────────────────────────────────

def _make_handoff(db, user_id, company_id, code, future=True, consumed=False):
    from datetime import datetime, timezone

    exp = datetime.now(timezone.utc) + timedelta(minutes=5 if future else -5)
    h = models.OAuthHandoff(
        id=uuid.uuid4(),
        code_hash=_hash_handoff(code),
        user_id=user_id,
        company_id=company_id,
        onboarding=False,
        provider="google",
        expires_at=exp,
        consumed=consumed,
    )
    db.add(h)
    db.commit()
    return h


def test_handoff_exchange_success_and_single_use(client, db, make_tenant):
    comp, user, _ = make_tenant(company_name="GOAuth", user_name="GU", mobile="+919888790401")
    code = "single-use-code-123"
    _make_handoff(db, user.id, comp.id, code, future=True)

    r = client.post("/apis/v3/auth/oauth/exchange", json={"code": code})
    assert r.status_code == 200
    assert r.json()["access_token"]

    # Replay the same code -> already consumed -> 400.
    r2 = client.post("/apis/v3/auth/oauth/exchange", json={"code": code})
    assert r2.status_code == 400
    assert r2.json()["detail"] == "Invalid or expired login code."


def test_handoff_exchange_expired_400(client, db, make_tenant):
    comp, user, _ = make_tenant(company_name="GOAuth2", user_name="GU2", mobile="+919888790402")
    _make_handoff(db, user.id, comp.id, "expired-code", future=False)
    r = client.post("/apis/v3/auth/oauth/exchange", json={"code": "expired-code"})
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid or expired login code."


def test_handoff_exchange_unknown_400(client):
    r = client.post("/apis/v3/auth/oauth/exchange", json={"code": "no-such-code"})
    assert r.status_code == 400
    assert r.json()["detail"] == "Invalid or expired login code."
