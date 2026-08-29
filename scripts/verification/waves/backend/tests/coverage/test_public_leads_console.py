"""R2-545: a captured lead must be reachable through the product.

The audit found MarketingLead had no read path at all: if the one best-effort
notification email failed, the lead sat in Postgres invisible to everyone.
These tests pin the operator-only console read:

  - GET /apis/v3/public/leads with the admin secret returns the captured
    lead including email_sent and created_at;
  - without a secret, with a wrong secret, and while the feature is unset,
    it fails closed with 403 (the rows are prospects; no ordinary caller,
    authenticated or not, may ever list them).
"""
from app import mailer, models
from app.config import settings


def _capture_a_lead(client):
    r = client.post(
        "/apis/v3/public/leads",
        json={"name": "Console Probe", "email": "console-probe@example.com"},
        headers={},  # public capture: explicitly no auth headers
    )
    assert r.status_code == 200
    return r


def test_lead_console_returns_captured_lead_with_delivery_status(client, db, monkeypatch):
    monkeypatch.setattr(mailer, "is_configured", lambda: False)
    monkeypatch.setattr(settings, "ADMIN_MIGRATION_SECRET", "console-test-secret")
    _capture_a_lead(client)

    r = client.get(
        "/apis/v3/public/leads",
        headers={"X-Admin-Secret": "console-test-secret"},
    )
    assert r.status_code == 200
    rows = [row for row in r.json() if row["email"] == "console-probe@example.com"]
    assert len(rows) == 1
    row = rows[0]
    assert row["name"] == "Console Probe"
    assert row["source"] == "contact_form"
    assert row["email_sent"] is False  # mail transport stubbed off above
    assert row["created_at"]
    assert "ip_hash" not in row and "user_agent" not in row


def test_lead_console_fails_closed_without_or_with_wrong_secret(client, db, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_MIGRATION_SECRET", "console-test-secret")
    db.add(
        models.MarketingLead(
            name="Secret Probe", email="secret-probe@example.com", source="contact_form"
        )
    )
    db.commit()

    missing = client.get("/apis/v3/public/leads")
    assert missing.status_code == 403

    wrong = client.get(
        "/apis/v3/public/leads",
        headers={"X-Admin-Secret": "not-the-secret"},
    )
    assert wrong.status_code == 403


def test_lead_console_disabled_when_no_secret_configured(client, db, monkeypatch):
    monkeypatch.setattr(settings, "ADMIN_MIGRATION_SECRET", "")
    disabled = client.get(
        "/apis/v3/public/leads",
        headers={"X-Admin-Secret": "anything"},
    )
    assert disabled.status_code == 403
