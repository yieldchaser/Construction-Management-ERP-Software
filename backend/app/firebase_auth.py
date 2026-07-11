"""Firebase Phone Authentication (server-side token verification).

Firebase Phone Auth is a CLIENT-side flow, unlike MSG91 (app/sms.py) which is a
server-to-server SMS call. The browser (Firebase JS SDK) runs the reCAPTCHA
challenge, sends the SMS and collects the code, producing a signed Firebase ID
token. This module owns only the server half: verify that ID token with the
Firebase Admin SDK, which cryptographically proves the token was issued by
Firebase for THIS project, and read the verified ``phone_number`` claim. Only a
token that passes verification proves phone ownership; a client-supplied phone
number is never trusted on its own.

Mirrors app/sms.py / app/email_otp.py: ``is_configured()`` gates the endpoint in
app/routers/auth.py, and this module never logs token values.

Provisioning: the Admin SDK needs a service-account credential. Provide it as
``FIREBASE_SERVICE_ACCOUNT_JSON`` (the entire service-account JSON as a single
env var string; the standard way to inject it on hosts like Render without a
mounted file), or ``FIREBASE_SERVICE_ACCOUNT_PATH`` (path to a JSON file) as a
fallback. When neither is set, ``is_configured()`` is False and the endpoint
returns 503, leaving the MSG91 OTP path untouched.

Billing note: on the Firebase Spark (free) plan, real SMS is only delivered to
pre-registered test phone numbers; arbitrary real numbers require the Blaze plan.
This module is billing-plan-agnostic: ID-token verification is identical either
way, so the feature starts working for real users the moment Blaze is enabled,
with no code change here.
"""
import json
import threading

from app.config import settings

_lock = threading.Lock()
_app = None


def is_configured() -> bool:
    """True when an Admin SDK service-account credential is wired up."""
    return bool(
        (settings.FIREBASE_SERVICE_ACCOUNT_JSON or "").strip()
        or (settings.FIREBASE_SERVICE_ACCOUNT_PATH or "").strip()
    )


def _load_credentials():
    """Build an Admin SDK credential from the JSON env var (preferred) or a file
    path (fallback). Raises RuntimeError with a clean message when unconfigured
    or malformed; never echoes the credential contents."""
    from firebase_admin import credentials

    raw = (settings.FIREBASE_SERVICE_ACCOUNT_JSON or "").strip()
    if raw:
        try:
            info = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise RuntimeError("FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON") from exc
        return credentials.Certificate(info)

    path = (settings.FIREBASE_SERVICE_ACCOUNT_PATH or "").strip()
    if path:
        return credentials.Certificate(path)

    raise RuntimeError("Firebase service account is not configured")


def _ensure_app():
    """Initialise the Firebase Admin app once, lazily and thread-safely."""
    global _app
    if _app is not None:
        return _app
    with _lock:
        if _app is not None:
            return _app
        import firebase_admin

        cred = _load_credentials()
        try:
            # Reuse an already-initialised default app (e.g. across dev reloads).
            _app = firebase_admin.get_app()
        except ValueError:
            _app = firebase_admin.initialize_app(cred)
        return _app


def verify_id_token(token: str) -> dict:
    """Verify a Firebase ID token and return its decoded claims.

    Raises ValueError on any missing/invalid/expired/malformed token. Never logs
    or includes the token value in the raised message.
    """
    if not (token or "").strip():
        raise ValueError("Missing Firebase ID token")

    _ensure_app()
    from firebase_admin import auth as fb_auth

    try:
        return fb_auth.verify_id_token(token, app=_app)
    except Exception as exc:  # noqa: BLE001 - normalise to a token-free error
        raise ValueError("Invalid or expired Firebase ID token") from exc
