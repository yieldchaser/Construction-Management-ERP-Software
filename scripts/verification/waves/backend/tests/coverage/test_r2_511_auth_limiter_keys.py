"""R2-511 - auth rate limits must not collapse every user into proxy buckets.

The limiter's stock key is the socket peer, which behind Render's proxy is the
edge itself and rotates per request: the founder's access log showed one
browser arriving as three internal addresses, meaning all customers shared a
handful of login buckets and any visitor could exhaust them with six requests.
Two halves are pinned here:

  - the container runs uvicorn with --forwarded-allow-ips so the default key
    becomes the real client address behind Render's trusted edge;
  - the auth limiters compose that address with the identifier being
    authenticated (mobile/email), so one address cannot lock out an account
    and one account cannot be brute-forced from many addresses without paying
    the full per-address budget too.
"""
from pathlib import Path

from starlette.requests import Request as StarletteRequest

from app.config import settings
from app.rate_limit import _rate_limit_key, limiter
from app.routers.auth import _auth_limit_key

BACKEND_DIR = Path(__file__).resolve().parents[2]
SEND_URL = "/apis/v3/auth/otp/send"
MOBILE_A = "+919876501111"
MOBILE_B = "+919876502222"


def _fake_request(headers=None, body=None, client=("10.0.0.9", 55555)):
    req = StarletteRequest(
        {
            "type": "http",
            "method": "POST",
            "path": SEND_URL,
            "query_string": b"",
            "headers": [
                (k.lower().encode("latin-1"), v.encode("latin-1"))
                for k, v in (headers or {}).items()
            ],
            "client": client,
        }
    )
    if body is not None:
        req._body = body  # what FastAPI leaves cached after parsing the JSON body
    return req


def test_dockerfile_trusts_the_render_proxy_for_client_addresses():
    cmd = (BACKEND_DIR / "Dockerfile").read_text(encoding="utf-8")
    assert "--forwarded-allow-ips='*'" in cmd


def test_auth_limit_key_composes_client_address_with_identifier(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_PROXY_HEADERS", False)

    keyed = _auth_limit_key(_fake_request(body=b'{"mobile": "+919876501111"}'))
    other = _auth_limit_key(
        _fake_request(client=("10.0.0.10", 1), body=b'{"mobile": "+919876501111"}')
    )
    # Same identifier from a different address still differs (IP component).
    assert keyed != other
    assert keyed.endswith("+919876501111")

    email = _auth_limit_key(_fake_request(body=b'{"email": "Owner@Example.com "}'))
    assert email.endswith("owner@example.com")

    plain = _auth_limit_key(_fake_request())
    assert plain == _rate_limit_key(_fake_request())

    garbage = _auth_limit_key(_fake_request(body=b"not-json"))
    assert garbage == _rate_limit_key(_fake_request())


def test_otp_send_buckets_are_per_identifier_not_global(client, db, monkeypatch):
    monkeypatch.setattr(settings, "OTP_DEMO_ALLOWLIST", f"{MOBILE_A},{MOBILE_B}")
    monkeypatch.setattr(settings, "OTP_DEMO_CODE", "654321")
    monkeypatch.setattr(limiter, "enabled", True)
    limiter.reset()

    statuses_a = []
    for _ in range(6):
        r = client.post(SEND_URL, json={"mobile": MOBILE_A})
        statuses_a.append(r.status_code)
    assert statuses_a == [200, 200, 200, 200, 200, 429]

    # A different identifier from the same address has its own budget: before
    # this fix the shared proxy bucket made every number lock out together.
    r = client.post(SEND_URL, json={"mobile": MOBILE_B})
    assert r.status_code == 200, r.text
