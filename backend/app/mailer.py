"""Generic transactional email transport, shared by every sender in this app.

Two delivery transports:
- BREVO_API_KEY set -> Brevo's transactional email HTTPS API (port 443).
  Preferred: many hosts (including Render's free/starter tiers) block or
  silently drop outbound SMTP ports (25/465/587), which raw SMTP hits as an
  opaque connection timeout. The HTTPS API has no such port-blocking exposure.
- Otherwise, SMTP_HOST configured -> raw SMTP (e.g. Supabase's relay, or any
  other provider's SMTP endpoint) for founders who prefer that route.

When neither is configured, is_configured() returns False and callers decide
how to degrade (e.g. app/email_otp.py restricts OTP delivery to the demo
allowlist; app/routers/public_leads.py just skips the notification email and
still persists the lead).

This module only knows how to deliver an arbitrary subject/body to an
address; callers own their own copy (subject/body) and never need to know
which transport is in use.
"""
import re
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import parseaddr

import requests

from app.config import settings

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"

# Matches CR, LF, and other ASCII control characters that have no business
# appearing in an email header value. Anything caught here could otherwise be
# used to smuggle extra headers (e.g. "Bcc:") into an outgoing message via
# raw SMTP header injection.
_HEADER_CONTROL_CHARS_RE = re.compile(r"[\r\n\x00-\x08\x0b\x0c\x0e-\x1f]")

# Used to scrub email addresses out of exception messages before logging:
# smtplib exceptions (e.g. SMTPRecipientsRefused) typically embed the
# rejected recipient's address in str(exc), which is PII we never want in
# application logs.
_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def _sanitize_header_value(value: str) -> str:
    """Strip CR/LF/control chars from a value bound for an email header.

    Used for every header we set (Subject, Reply-To, ...) on both the SMTP
    and Brevo paths, so a hostile subject or reply-to can never inject extra
    headers into the outgoing message. Collapses the resulting whitespace
    instead of erroring, so a legitimate multi-word subject still reads
    naturally after sanitization.
    """
    cleaned = _HEADER_CONTROL_CHARS_RE.sub(" ", value or "")
    return " ".join(cleaned.split())


def _brevo_api_ready() -> bool:
    return bool((settings.BREVO_API_KEY or "").strip() and (settings.SMTP_FROM or "").strip())


def _smtp_ready() -> bool:
    return bool((settings.SMTP_HOST or "").strip() and (settings.SMTP_FROM or "").strip())


def is_configured() -> bool:
    """True when a delivery transport (Brevo API or SMTP) is wired up."""
    return _brevo_api_ready() or _smtp_ready()


def _send_via_brevo_api(to_addr: str, subject: str, text_body: str, reply_to: str | None) -> None:
    sender_name, sender_email = parseaddr(settings.SMTP_FROM)
    payload = {
        "sender": {"name": sender_name or "SiteFlow", "email": sender_email or settings.SMTP_FROM},
        "to": [{"email": to_addr}],
        "subject": subject,
        "textContent": text_body,
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to}
    resp = requests.post(
        BREVO_API_URL,
        headers={
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json=payload,
        timeout=20,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Brevo API returned {resp.status_code}: {resp.text[:300]}")


def _send_via_smtp(to_addr: str, subject: str, text_body: str, reply_to: str | None) -> None:
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_addr
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(text_body)

    host = settings.SMTP_HOST.strip()
    port = int(settings.SMTP_PORT or 587)
    user = (settings.SMTP_USER or "").strip()
    password = settings.SMTP_PASSWORD or ""

    if port == 465:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL(host, port, timeout=20, context=context) as server:
            if user:
                server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls(context=ssl.create_default_context())
            if user:
                server.login(user, password)
            server.send_message(msg)


def send_email(to_addr: str, subject: str, text_body: str, reply_to: str | None = None) -> None:
    """Deliver a plain-text email to the given address.

    Prefers the Brevo HTTPS API when configured (avoids SMTP port-blocking on
    hosts like Render); falls back to raw SMTP otherwise. Raises RuntimeError
    on any delivery failure so the caller can decide how to degrade without
    leaking transport internals.
    """
    addr = (to_addr or "").strip()
    if not addr:
        raise RuntimeError("Missing recipient email address")

    # Sanitize before assigning to ANY header, on both transports: the
    # subject and reply-to are frequently built from free-text user input
    # upstream (see app/routers/public_leads.py), so this is the single
    # choke point that protects every current and future caller.
    safe_subject = _sanitize_header_value(subject)
    reply_addr = _sanitize_header_value((reply_to or "").strip()) or None

    try:
        if _brevo_api_ready():
            _send_via_brevo_api(addr, safe_subject, text_body, reply_addr)
        else:
            _send_via_smtp(addr, safe_subject, text_body, reply_addr)
    except Exception as exc:  # noqa: BLE001 - do not leak transport detail to caller
        transport = "brevo_api" if _brevo_api_ready() else "smtp"
        # Do not log repr(exc): for SMTP failures (e.g.
        # SMTPRecipientsRefused) it typically embeds the rejected recipient
        # email address, which would leak PII into application logs. Log
        # only the exception type and a short, truncated message instead.
        reason = _EMAIL_RE.sub("[redacted]", str(exc)).replace("\n", " ")[:120]
        print(f"[mailer] send failed via {transport}: {type(exc).__name__}: {reason}")
        raise RuntimeError("Email provider request failed") from exc
