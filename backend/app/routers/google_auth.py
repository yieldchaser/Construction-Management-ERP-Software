"""Google login (identity).

Separate from the Google Sheets integration (app/routers/google_sheets.py): this
consent uses the identity scopes (openid email profile), NOT the spreadsheets
scope, and its own redirect URI. It reuses the same signed-state OAuth pattern
(a short-lived signed JWT as `state`, code exchanged server-side, no token in a
URL).

Token safety: the real SiteFlow session JWT is NEVER placed in the redirect URL.
The callback authenticates the user, creates a single-use handoff code, and
redirects the browser with only that short-lived code. The frontend then POSTs
the code to /auth/oauth/exchange to receive the real JWT.

Founder note: in Google Cloud Console you must (1) add the redirect URI
{BACKEND_PUBLIC_URL}/apis/v3/auth/google/callback and (2) ensure the OAuth
consent screen lists the openid/email/profile scopes. Set GOOGLE_LOGIN_CLIENT_ID
/ GOOGLE_LOGIN_CLIENT_SECRET (or reuse the Sheets client by leaving them empty).
"""
import uuid
from datetime import timedelta
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user  # noqa: F401 (get_current_user kept for parity)
from app.config import settings
from app.database import get_db
from app import models
from app.routers.auth import (
    _add_provider,
    _create_handoff,
    _has_password,
    _resolve_company_context,
)

router = APIRouter(prefix="/auth/google", tags=["Authentication - Google"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
LOGIN_SCOPE = "openid email profile"
STATE_PURPOSE = "google_login"


def _require_oauth_config() -> None:
    if not settings.google_login_client_id or not settings.google_login_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured on the server",
        )


def _redirect_uri() -> str:
    base = (settings.BACKEND_PUBLIC_URL or "http://localhost:8000").rstrip("/")
    return f"{base}/apis/v3/auth/google/callback"


def _frontend_base() -> str:
    return (settings.FRONTEND_PUBLIC_URL or "http://localhost:3000").rstrip("/")


def _sign_state() -> str:
    # A nonce ties this consent to a short-lived signed token; company_id is not
    # relevant for login (the user is not yet authenticated).
    return create_access_token(
        {"nonce": uuid.uuid4().hex, "purpose": STATE_PURPOSE},
        expires_delta=timedelta(minutes=15),
    )


def _verify_state(state: str) -> None:
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    if payload.get("purpose") != STATE_PURPOSE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")


@router.get("/authorize")
def authorize():
    """Begin Google login: 307-redirect the browser to Google's consent screen."""
    _require_oauth_config()
    state = _sign_state()
    consent = requests.models.PreparedRequest()
    consent.prepare_url(
        GOOGLE_AUTH_URL,
        {
            "client_id": settings.google_login_client_id,
            "redirect_uri": _redirect_uri(),
            "response_type": "code",
            "scope": LOGIN_SCOPE,
            "access_type": "online",
            "include_granted_scopes": "true",
            "prompt": "select_account",
            "state": state,
        },
    )
    return RedirectResponse(url=consent.url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)


@router.get("/callback")
def callback(
    db: Session = Depends(get_db),
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
):
    """Handle Google's redirect: verify state, exchange code, fetch the userinfo,
    require a verified email, find-or-create our user, then redirect the browser
    with a single-use handoff code (never the session JWT)."""
    _require_oauth_config()
    fe = _frontend_base()
    if not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth state")
    _verify_state(state)

    if error or not code:
        return RedirectResponse(
            url=f"{fe}/auth/callback?error=google_denied",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    token_resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.google_login_client_id,
            "client_secret": settings.google_login_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _redirect_uri(),
        },
        timeout=30,
    )
    if token_resp.status_code != 200:
        return RedirectResponse(
            url=f"{fe}/auth/callback?error=google_token",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
    access_token = token_resp.json().get("access_token")
    if not access_token:
        return RedirectResponse(
            url=f"{fe}/auth/callback?error=google_token",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    userinfo_resp = requests.get(
        GOOGLE_USERINFO_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=30,
    )
    if userinfo_resp.status_code != 200:
        return RedirectResponse(
            url=f"{fe}/auth/callback?error=google_userinfo",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
    info = userinfo_resp.json()
    email = (info.get("email") or "").strip().lower()
    email_verified = bool(info.get("email_verified"))
    name = (info.get("name") or "").strip() or (email.split("@")[0] if email else "User")

    # Never trust an unverified Google email as proof of identity.
    if not email or not email_verified:
        return RedirectResponse(
            url=f"{fe}/auth/callback?error=google_unverified",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
    if user and _has_password(user):
        # Linking policy: do not silently attach Google onto an existing password
        # account. Require that account's own password login instead.
        return RedirectResponse(
            url=f"{fe}/auth/callback?error=use_password_login",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    if not user:
        user = models.User(
            id=uuid.uuid4(),
            name=name,
            email=email,
            email_verified=True,
            auth_providers="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        user.email_verified = True
        _add_provider(user, "google")
        db.commit()

    company_id, _companies, onboarding = _resolve_company_context(db, user)
    handoff_code = _create_handoff(db, user, company_id, onboarding, provider="google")

    return RedirectResponse(
        url=f"{fe}/auth/callback?code={handoff_code}",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )
