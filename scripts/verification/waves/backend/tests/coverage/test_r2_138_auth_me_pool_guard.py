"""R2-138 / R2-308 - a runaway client must not be able to exhaust the pool via /auth/me.

The audit captured QueuePool exhaustion (size 10 + overflow 20) triggered by
GET /apis/v3/auth/me while a buggy page hammered it at ~16 req/s; because every
page calls /auth/me on load, the whole console went down with it. The fix adds
a generous server-side cap (120/minute per client) on the endpoint itself:
normal navigation never sees it, but a request loop gets bounded with 429s
instead of holding pooled connections until login dies.
"""
from app import models
from app.rate_limit import limiter

ME_URL = "/apis/v3/auth/me"


def test_auth_me_caps_runaway_client_at_120_per_minute(
    client, db, make_tenant, auth_headers, monkeypatch
):
    company, user, team = make_tenant(company_name="Pool Guard Co", user_name="Loop Owner")
    headers = auth_headers(user, company)

    monkeypatch.setattr(limiter, "enabled", True)
    limiter.reset()

    statuses = [client.get(ME_URL, headers=headers).status_code for _ in range(123)]

    # The first 120 calls succeed; from 121 on the client is capped.
    assert all(s == 200 for s in statuses[:120]), statuses[:120]
    assert statuses[120] == 429
    assert statuses[121] == 429
    assert statuses[122] == 429


def test_auth_me_unlimited_when_limiter_disabled(client, db, make_tenant, auth_headers):
    """Sanity: with limits off (suite default), the endpoint behaves as before."""
    company, user, team = make_tenant(company_name="Pool Guard Co 2", user_name="Calm Owner")
    headers = auth_headers(user, company)
    assert client.get(ME_URL, headers=headers).status_code == 200
