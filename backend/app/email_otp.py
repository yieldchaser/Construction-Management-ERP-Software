"""Email OTP delivery via SMTP.

Mirrors app/sms.py for the email channel. The OTP code itself is generated,
hashed, TTL-capped and single-use in app/routers/auth.py (the SAME machinery as
SMS); this module only DELIVERS a code that was produced there. It never logs
the code value.

Delivery is by SMTP so the founder can point it at Supabase's SMTP relay
(Project Settings -> Auth -> SMTP) or any transactional provider. When SMTP is
not configured, is_configured() returns False and the auth router restricts
email OTP to the demo allowlist (returning 503 for everyone else) instead of a
silent bypass.

Founder note: set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM
as env vars (e.g. on Render) before real email OTP works.
"""
import smtplib
import ssl
from email.message import EmailMessage

from app.config import settings


def is_configured() -> bool:
    """True when an SMTP transport is wired up (host + from address present)."""
    return bool((settings.SMTP_HOST or "").strip() and (settings.SMTP_FROM or "").strip())


def send_otp_email(email: str, code: str) -> None:
    """Deliver the given code to the email address via SMTP.

    Raises RuntimeError on any delivery failure so the caller can surface a
    clean error without leaking transport internals or the code.
    """
    to_addr = (email or "").strip()
    if not to_addr:
        raise RuntimeError("Missing email address")

    msg = EmailMessage()
    msg["Subject"] = "Your SiteFlow login code"
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_addr
    ttl_min = max(1, settings.OTP_TTL_SECONDS // 60)
    msg.set_content(
        f"Your SiteFlow verification code is {code}.\n\n"
        f"It expires in {ttl_min} minute(s). If you did not request this, ignore this email."
    )

    host = settings.SMTP_HOST.strip()
    port = int(settings.SMTP_PORT or 587)
    user = (settings.SMTP_USER or "").strip()
    password = settings.SMTP_PASSWORD or ""

    try:
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
    except Exception as exc:  # noqa: BLE001 - do not leak transport detail to caller
        raise RuntimeError("Email provider request failed") from exc
