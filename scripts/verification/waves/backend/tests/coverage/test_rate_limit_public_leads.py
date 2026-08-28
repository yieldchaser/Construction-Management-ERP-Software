"""R2-299: the public lead endpoint's "5/hour" limit must actually enforce.

The audit measured 13 of 20 requests accepted against a 5/hour policy on
POST /apis/v3/public/leads. These tests pin the two halves of the fix:

  - the limiter wiring on the public endpoint enforces the declared policy:
    with limits enabled, requests 6+ from one client get 429 and never touch
    the database;
  - the bucket key is proxy-aware only when explicitly configured: by
    default it stays slowapi's socket peer (spoofing-proof), and only after
    RATE_LIMIT_TRUST_PROXY_HEADERS=true does it prefer CF-Connecting-IP,
    then the X-Forwarded-For first hop, so a reverse proxy does not collapse
    every visitor into one shared bucket.
"""
from starlette.requests import Request as StarletteRequest

from app import mailer, models
from app.config import settings
from app.rate_limit import _rate_limit_key, limiter


def _fake_request(headers=None, client=("10.0.0.1", 55555)):
    return StarletteRequest(
        {
            "type": "http",
            "method": "POST",
            "path": "/apis/v3/public/leads",
            "query_string": b"",
            "headers": [
                (k.lower().encode("latin-1"), v.encode("latin-1"))
                for k, v in (headers or {}).items()
            ],
            "client": client,
        }
    )


def test_rate_limit_key_defaults_to_socket_peer_ignoring_forward_headers(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_PROXY_HEADERS", False)
    req = _fake_request(
        {"CF-Connecting-IP": "203.0.113.7", "X-Forwarded-For": "198.51.100.9"}
    )
    # Untrusted by default: client-supplied forwarding headers are spoofable
    # and must never become the bucket key.
    assert _rate_limit_key(req) == "10.0.0.1"


def test_rate_limit_key_prefers_cf_connecting_ip_then_xff_first_hop_when_trusted(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_TRUST_PROXY_HEADERS", True)
    cf = _fake_request({"CF-Connecting-IP": "203.0.113.7", "X-Forwarded-For": "198.51.100.9"})
    assert _rate_limit_key(cf) == "203.0.113.7"

    xff = _fake_request({"X-Forwarded-For": "198.51.100.9, 10.0.0.2"})
    assert _rate_limit_key(xff) == "198.51.100.9"

    bare = _fake_request({})
    assert _rate_limit_key(bare) == "10.0.0.1"


def test_public_lead_endpoint_enforces_five_per_hour(client, db, monkeypatch):
    monkeypatch.setattr(mailer, "is_configured", lambda: False)
    monkeypatch.setattr(limiter, "enabled", True)

    statuses = []
    for i in range(7):
        r = client.post(
            "/apis/v3/public/leads",
            json={"name": f"R2-299 Flood {i}", "email": f"flood{i}@example.com"},
        )
        statuses.append(r.status_code)

    assert statuses == [200, 200, 200, 200, 200, 429, 429]

    # Blocked submissions are rejected before the handler runs: exactly five
    # rows may exist for this flood.
    stored = (
        db.query(models.MarketingLead)
        .filter(models.MarketingLead.email.like("flood%@example.com"))
        .count()
    )
    assert stored == 5
