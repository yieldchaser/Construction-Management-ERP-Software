"""Public marketing lead capture (app/routers/public_leads.py).

Covers the documented guarantees:
  - a real submission persists a row and returns 200
  - the honeypot field silently no-ops (200, nothing persisted)
  - oversized/invalid input is rejected with 422
  - a mail transport failure still returns 200 and leaves email_sent False
  - the endpoint requires NO authentication
  - hostile free text (CRLF injection) never reaches the mailer's subject
    as raw CR/LF, and mailer.send_email itself strips CR/LF from headers
"""
from app import models, mailer
from app.config import settings


def test_lead_submission_persists_and_returns_ok(client, db, monkeypatch):
    monkeypatch.setattr(mailer, "is_configured", lambda: False)
    before = db.query(models.MarketingLead).count()

    r = client.post(
        "/apis/v3/public/leads",
        json={
            "name": "Rajesh Kumar",
            "company": "ABC Contractors",
            "email": "rajesh@example.com",
            "phone": "+919876500000",
            "role": "Owner",
            "sites": "3",
            "message": "Want a demo of BOQ + procurement.",
            "source": "contact_form",
            "page_url": "https://siteflow.co/contact",
        },
        headers={},  # explicitly no Authorization header
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    after = db.query(models.MarketingLead).count()
    assert after == before + 1

    row = (
        db.query(models.MarketingLead)
        .filter(models.MarketingLead.email == "rajesh@example.com")
        .order_by(models.MarketingLead.created_at.desc())
        .first()
    )
    assert row is not None
    assert row.name == "Rajesh Kumar"
    assert row.company == "ABC Contractors"
    assert row.email_sent is False


def test_lead_honeypot_returns_ok_but_persists_nothing(client, db):
    before = db.query(models.MarketingLead).count()

    r = client.post(
        "/apis/v3/public/leads",
        json={
            "name": "Bot",
            "email": "bot@example.com",
            "website": "http://spam.example",
        },
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    after = db.query(models.MarketingLead).count()
    assert after == before


def test_lead_invalid_email_returns_422(client):
    r = client.post(
        "/apis/v3/public/leads",
        json={"name": "Bad Email", "email": "not-an-email"},
    )
    assert r.status_code == 422


def test_lead_oversized_field_returns_422(client):
    r = client.post(
        "/apis/v3/public/leads",
        json={"name": "A" * 500, "email": "ok@example.com"},
    )
    assert r.status_code == 422


def test_lead_mail_failure_still_returns_ok_and_leaves_email_unsent(client, db, monkeypatch):
    monkeypatch.setattr(mailer, "is_configured", lambda: True)

    def _boom(*args, **kwargs):
        raise RuntimeError("provider down")

    monkeypatch.setattr(mailer, "send_email", _boom)

    r = client.post(
        "/apis/v3/public/leads",
        json={"name": "Mail Fail", "email": "mailfail@example.com"},
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    row = (
        db.query(models.MarketingLead)
        .filter(models.MarketingLead.email == "mailfail@example.com")
        .order_by(models.MarketingLead.created_at.desc())
        .first()
    )
    assert row is not None
    assert row.email_sent is False


def test_lead_crlf_injection_in_name_does_not_reach_subject(client, db, monkeypatch):
    monkeypatch.setattr(mailer, "is_configured", lambda: True)
    monkeypatch.setattr(settings, "LEAD_NOTIFY_EMAIL", "founder@example.com")

    captured = {}

    def _capture(to_addr, subject, text_body, reply_to=None):
        captured["to_addr"] = to_addr
        captured["subject"] = subject
        captured["text_body"] = text_body
        captured["reply_to"] = reply_to

    monkeypatch.setattr(mailer, "send_email", _capture)

    r = client.post(
        "/apis/v3/public/leads",
        json={
            "name": "Bob\r\nBcc: attacker@evil.com",
            "company": "Evil Co\r\nX-Injected: yes",
            "email": "crlf@example.com",
        },
    )
    assert r.status_code == 200
    assert r.json() == {"ok": True}

    assert "subject" in captured
    assert "\r" not in captured["subject"]
    assert "\n" not in captured["subject"]
    assert "Bob" in captured["subject"]


def test_mailer_send_email_strips_crlf_from_subject_and_reply_to(monkeypatch):
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    monkeypatch.setattr(settings, "SMTP_FROM", "SiteFlow <no-reply@siteflow.co>")
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")

    captured = {}

    def _fake_send_via_smtp(to_addr, subject, text_body, reply_to):
        captured["to_addr"] = to_addr
        captured["subject"] = subject
        captured["text_body"] = text_body
        captured["reply_to"] = reply_to

    monkeypatch.setattr(mailer, "_send_via_smtp", _fake_send_via_smtp)

    mailer.send_email(
        "someone@example.com",
        "Hello\r\nBcc: attacker@evil.com",
        "line one\nline two",
        reply_to="victim\r\nX-Injected: yes@example.com",
    )

    assert "\r" not in captured["subject"]
    assert "\n" not in captured["subject"]
    assert captured["reply_to"] is not None
    assert "\r" not in captured["reply_to"]
    assert "\n" not in captured["reply_to"]
    # Body newlines are untouched: only headers get sanitized.
    assert captured["text_body"] == "line one\nline two"


def test_lead_endpoint_requires_no_authentication(client):
    # No Authorization header anywhere in this file; this test just makes the
    # guarantee explicit and asserts it is never a 401/403.
    r = client.post(
        "/apis/v3/public/leads",
        json={"name": "No Auth", "email": "noauth@example.com"},
    )
    assert r.status_code not in (401, 403)
    assert r.status_code == 200
