"""Email OTP delivery via Brevo's HTTPS API, or raw SMTP as a fallback.

Mirrors app/sms.py for the email channel. The OTP code itself is generated,
hashed, TTL-capped and single-use in app/routers/auth.py (the SAME machinery as
SMS); this module only DELIVERS a code that was produced there. It never logs
the code value.

Two delivery transports:
- BREVO_API_KEY set -> Brevo's transactional email HTTPS API (port 443).
  Preferred: many hosts (including Render's free/starter tiers) block or
  silently drop outbound SMTP ports (25/465/587), which raw SMTP hits as an
  opaque connection timeout. The HTTPS API has no such port-blocking exposure.
- Otherwise, SMTP_HOST configured -> raw SMTP (e.g. Supabase's relay, or any
  other provider's SMTP endpoint) for founders who prefer that route.

When neither is configured, is_configured() returns False and the auth router
restricts email OTP to the demo allowlist (returning 503 for everyone else)
instead of a silent bypass.

Founder note: set BREVO_API_KEY + SMTP_FROM (Brevo API path, recommended), or
SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASSWORD/SMTP_FROM (SMTP path) as env vars.
"""
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import parseaddr

import requests

from app.config import settings

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def _brevo_api_ready() -> bool:
    return bool((settings.BREVO_API_KEY or "").strip() and (settings.SMTP_FROM or "").strip())


def _smtp_ready() -> bool:
    return bool((settings.SMTP_HOST or "").strip() and (settings.SMTP_FROM or "").strip())


def is_configured() -> bool:
    """True when a delivery transport (Brevo API or SMTP) is wired up."""
    return _brevo_api_ready() or _smtp_ready()


def _subject_and_body(code: str) -> tuple[str, str]:
    ttl_min = max(1, settings.OTP_TTL_SECONDS // 60)
    body = (
        f"Your SiteFlow verification code is {code}.\n\n"
        f"It expires in {ttl_min} minute(s). If you did not request this, ignore this email."
    )
    return "Your SiteFlow login code", body


def _send_via_brevo_api(to_addr: str, code: str) -> None:
    subject, body = _subject_and_body(code)
    sender_name, sender_email = parseaddr(settings.SMTP_FROM)
    resp = requests.post(
        BREVO_API_URL,
        headers={
            "api-key": settings.BREVO_API_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        json={
            "sender": {"name": sender_name or "SiteFlow", "email": sender_email or settings.SMTP_FROM},
            "to": [{"email": to_addr}],
            "subject": subject,
            "textContent": body,
        },
        timeout=20,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(f"Brevo API returned {resp.status_code}: {resp.text[:300]}")


def _send_via_smtp(to_addr: str, code: str) -> None:
    subject, body = _subject_and_body(code)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_addr
    msg.set_content(body)

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


def send_otp_email(email: str, code: str) -> None:
    """Deliver the given code to the email address.

    Prefers the Brevo HTTPS API when configured (avoids SMTP port-blocking on
    hosts like Render); falls back to raw SMTP otherwise. Raises RuntimeError
    on any delivery failure so the caller can surface a clean error without
    leaking transport internals or the code.
    """
    to_addr = (email or "").strip()
    if not to_addr:
        raise RuntimeError("Missing email address")

    try:
        if _brevo_api_ready():
            _send_via_brevo_api(to_addr, code)
        else:
            _send_via_smtp(to_addr, code)
    except Exception as exc:  # noqa: BLE001 - do not leak transport detail to caller
        # Server-side only: the caller never sees this, but without it a
        # delivery failure is completely invisible, even in prod logs.
        transport = "brevo_api" if _brevo_api_ready() else "smtp"
        print(f"[email_otp] send failed via {transport}: {exc!r}")
        raise RuntimeError("Email provider request failed") from exc
