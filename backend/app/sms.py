"""SMS delivery for OTP login.

A thin provider interface with a single concrete implementation, MSG91, which is
one of the common transactional SMS providers in India. The provider is chosen
by SMS_PROVIDER and gated on SMS_PROVIDER_API_KEY. When no API key is set,
is_configured() returns False and the auth router restricts OTP login to the
demo allowlist instead of sending real messages.

This module never logs OTP code values.

Founder note: MSG91 (or the chosen provider) requires an account and a
registered OTP template. Set SMS_PROVIDER_API_KEY and MSG91_OTP_TEMPLATE_ID (and
optionally MSG91_SENDER_ID) as env vars on Render before real OTP works.
"""
import requests

from app.config import settings

MSG91_OTP_URL = "https://control.msg91.com/api/v5/otp"


def is_configured() -> bool:
    """True when a real SMS provider is wired up (an API key is present)."""
    return bool((settings.SMS_PROVIDER_API_KEY or "").strip())


def send_otp_sms(mobile: str, code: str) -> None:
    """Deliver the given code to the mobile number via the configured provider.

    Raises RuntimeError on any delivery failure so the caller can surface a
    clean error without leaking provider internals.
    """
    provider = (settings.SMS_PROVIDER or "").strip().lower()
    if provider == "msg91":
        _send_via_msg91(mobile, code)
        return
    raise RuntimeError(f"Unsupported SMS_PROVIDER: {settings.SMS_PROVIDER!r}")


def _send_via_msg91(mobile: str, code: str) -> None:
    # MSG91 v5 expects the number in international format without a leading '+'.
    number = mobile.strip().lstrip("+")
    payload = {
        "template_id": (settings.MSG91_OTP_TEMPLATE_ID or "").strip(),
        "mobile": number,
        "otp": code,
    }
    sender = (settings.MSG91_SENDER_ID or "").strip()
    if sender:
        payload["sender"] = sender

    try:
        resp = requests.post(
            MSG91_OTP_URL,
            headers={
                "authkey": settings.SMS_PROVIDER_API_KEY.strip(),
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=15,
        )
    except requests.RequestException as exc:
        raise RuntimeError("SMS provider request failed") from exc

    if resp.status_code != 200:
        # Do not echo the provider body to callers; it can contain the number.
        raise RuntimeError(f"SMS provider returned status {resp.status_code}")
