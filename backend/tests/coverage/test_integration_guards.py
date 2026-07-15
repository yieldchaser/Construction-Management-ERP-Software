"""Integration guard tests (cheap, no network).

1. Each third-party integration's _require_oauth_config() returns 503 when the
   OAuth creds are unset, so the app boots and serves the rest of the API even
   when an integration is not configured. (Zoho Books is representative; Google
   Sheets/Drive/Auth use the identical shape.)
2. The BI feed only authenticates with a valid, non-revoked API key for its OWN
   company, and only ever returns that company's rows. Missing / invalid /
   revoked / cross-company keys are all rejected with 401.

External HTTP (Zoho/Google/Firebase/MSG91) is never hit in these tests."""
import uuid

import pytest
from fastapi import HTTPException

from app import models
from app.config import settings
from app.routers import bi_export
from app.routers import zoho_books


# ── _require_oauth_config 503 when unconfigured ───────────────────────────────

def test_zoho_requires_oauth_config_503_when_unset(monkeypatch):
    # zoho_client_id/secret are read-only computed settings; replace the
    # property descriptor to simulate an unconfigured server.
    monkeypatch.setattr(type(settings), "zoho_client_id", property(lambda self: ""))
    monkeypatch.setattr(type(settings), "zoho_client_secret", property(lambda self: ""))
    with pytest.raises(HTTPException) as e:
        zoho_books._require_oauth_config()
    assert e.value.status_code == 503


def test_zoho_requires_oauth_config_ok_when_set(monkeypatch):
    monkeypatch.setattr(type(settings), "zoho_client_id", property(lambda self: "cid"))
    monkeypatch.setattr(type(settings), "zoho_client_secret", property(lambda self: "csecret"))
    zoho_books._require_oauth_config()  # no raise when configured when configured


# ── BI feed API-key gating ────────────────────────────────────────────────────

def _make_bi_key(db, company, raw):
    key = models.BiApiKey(company_id=company.id, label="test", key_hash=bi_export._hash_key(raw))
    db.add(key)
    db.commit()
    return key


def test_bi_feed_rejects_missing_key(client, db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888730001")
    r = client.get(f"/apis/v3/integrations/bi/feed/{comp.id}/projects")
    assert r.status_code == 401


def test_bi_feed_rejects_invalid_key(client, db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888730002")
    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp.id}/projects",
        headers={"X-API-Key": "siteflow_bi_definitely-not-a-real-key"},
    )
    assert r.status_code == 401


def test_bi_feed_rejects_revoked_key(client, db, make_tenant):
    comp, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888730003")
    raw = "siteflow_bi_" + "revokedkey1234567890abcd"
    key = _make_bi_key(db, comp, raw)
    key.revoked = True
    db.commit()
    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp.id}/projects",
        headers={"X-API-Key": raw},
    )
    assert r.status_code == 401


def test_bi_feed_rejects_cross_company_key(client, db, make_tenant):
    comp_a, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888730006")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888730007")
    raw = "siteflow_bi_" + "crosskey1234567890abcd"
    # Key is issued to company B but used against company A's feed.
    _make_bi_key(db, comp_b, raw)
    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp_a.id}/projects",
        headers={"X-API-Key": raw},
    )
    assert r.status_code == 401  # key is not found under company A


def test_bi_feed_valid_key_returns_only_own_company(client, db, make_tenant):
    comp_a, _, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888730004")
    comp_b, _, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888730005")
    proj_a = models.Project(id=uuid.uuid4(), company_id=comp_a.id, name="ProjA", code="PA", status="Ongoing")
    proj_b = models.Project(id=uuid.uuid4(), company_id=comp_b.id, name="ProjB", code="PB", status="Ongoing")
    db.add_all([proj_a, proj_b])
    db.commit()

    raw = "siteflow_bi_" + "owncompanykey1234"
    _make_bi_key(db, comp_a, raw)

    # CSV (default) - only company A's project visible.
    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp_a.id}/projects",
        headers={"X-API-Key": raw},
    )
    assert r.status_code == 200
    assert "ProjA" in r.text
    assert "ProjB" not in r.text

    # JSON variant also scoped to company A.
    rj = client.get(
        f"/apis/v3/integrations/bi/feed/{comp_a.id}/projects?fmt=json",
        headers={"X-API-Key": raw},
    )
    assert rj.status_code == 200
    rows = rj.json()
    assert len(rows) == 1
    assert rows[0]["name"] == "ProjA"
