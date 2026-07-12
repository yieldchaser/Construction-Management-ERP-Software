"""Google Sheets integration.

Real OAuth + Sheets API proof-of-concept scoped to a single export path: pushing
a PayrollRun's PayrollLineItem rows into a live Google Sheet. Other report types
are intentionally out of scope for this pass.

Notes / follow-ups:
- access_token / refresh_token are encrypted at rest (app/crypto.py, Fernet)
  before being written to GoogleSheetsConnection, and decrypted here right
  before use. This module never logs token values.
- The OAuth `state` is a short-lived signed JWT (reusing app.auth.create_access_token
  + the same SECRET_KEY/ALGORITHM) so the company_id round-tripped through Google
  cannot be tampered with.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_company_membership, get_current_user
from app.config import settings
from app.crypto import decrypt_token, encrypt_token
from app.database import get_db
from app import models

router = APIRouter(prefix="/integrations/google-sheets", tags=["Integrations - Google Sheets"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets"
SHEETS_CREATE_URL = "https://sheets.googleapis.com/v4/spreadsheets"

STATE_PURPOSE = "google_sheets_oauth"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _require_oauth_config() -> None:
    if not settings.GOOGLE_SHEETS_CLIENT_ID or not settings.GOOGLE_SHEETS_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sheets integration is not configured on the server",
        )


def _redirect_uri(request_base: str) -> str:
    """The OAuth redirect URI. Must match a value registered in Google Cloud."""
    base = (settings.BACKEND_PUBLIC_URL or request_base or "http://localhost:8000").rstrip("/")
    return f"{base}/apis/v3/integrations/google-sheets/callback"


def _frontend_settings_url(company_id: uuid.UUID) -> str:
    base = (settings.FRONTEND_PUBLIC_URL or "http://localhost:3000").rstrip("/")
    return f"{base}/c/{company_id}/settings"


def _phone_authorized(company: models.Company, user: models.User) -> bool:
    """The user's mobile must appear in the company's authorized-phones whitelist.

    There is no dedicated current-user phone helper in the codebase; User.phone
    does not exist, so we use User.mobile (flagged in the report).
    """
    allowed = company.google_sheets_authorized_phones or []
    allowed_norm = {str(p).strip() for p in allowed if str(p).strip()}
    phone = (user.mobile or "").strip()
    return bool(phone) and phone in allowed_norm


def _sign_state(company_id: uuid.UUID, user_id: uuid.UUID) -> str:
    return create_access_token(
        {"cid": str(company_id), "uid": str(user_id), "purpose": STATE_PURPOSE},
        expires_delta=timedelta(minutes=15),
    )


def _verify_state(state: str) -> tuple[uuid.UUID, Optional[uuid.UUID]]:
    try:
        payload = jwt.decode(state, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    if payload.get("purpose") != STATE_PURPOSE:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    try:
        company_id = uuid.UUID(str(payload.get("cid")))
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OAuth state")
    user_id = None
    try:
        if payload.get("uid"):
            user_id = uuid.UUID(str(payload.get("uid")))
    except (ValueError, TypeError):
        user_id = None
    return company_id, user_id


def _store_encrypted(*, missing_key_detail: str, encrypt_fn) -> str:
    """Run an encrypt_token() call, turning a missing/invalid
    TOKEN_ENCRYPTION_KEY into a clear HTTP error instead of a raw 500."""
    try:
        return encrypt_fn()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=missing_key_detail,
        ) from exc


def _valid_access_token(connection: models.GoogleSheetsConnection) -> str:
    """Return a usable access token, refreshing it via the refresh_token grant
    when the stored one is missing or expired."""
    expiry = connection.token_expiry
    now = datetime.now(timezone.utc)
    if expiry is not None and expiry.tzinfo is None:
        expiry = expiry.replace(tzinfo=timezone.utc)
    still_valid = (
        connection.access_token
        and expiry is not None
        and expiry - timedelta(seconds=60) > now
    )
    if still_valid:
        return decrypt_token(connection.access_token)

    refresh_token = decrypt_token(connection.refresh_token) if connection.refresh_token else None
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google Sheets access expired; please reconnect",
        )

    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_SHEETS_CLIENT_ID,
            "client_secret": settings.GOOGLE_SHEETS_CLIENT_SECRET,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to refresh Google access token",
        )
    tok = resp.json()
    new_access_token = tok.get("access_token")
    expires_in = int(tok.get("expires_in", 3600))
    connection.token_expiry = now + timedelta(seconds=expires_in)
    if not new_access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Google did not return an access token",
        )
    connection.access_token = _store_encrypted(
        missing_key_detail=(
            "Google Sheets integration is not fully configured on the server "
            "(missing TOKEN_ENCRYPTION_KEY); cannot store the refreshed token"
        ),
        encrypt_fn=lambda: encrypt_token(new_access_token),
    )
    return new_access_token


# ── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/authorize")
def authorize(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Begin the OAuth consent flow.

    The frontend calls this with the normal Authorization header (no token in
    the URL) and then navigates the browser directly to the returned consent
    URL, so a SiteFlow session credential is never placed in a query string.
    """
    _require_oauth_config()
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    # Multi-tenant: caller must belong to the company.
    get_company_membership(db, current_user, company_id)
    if not _phone_authorized(company, current_user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your phone number is not authorized for Google Sheets on this company",
        )

    state = _sign_state(company_id, current_user.id)
    # Build the redirect URI from the configured backend URL (the request base
    # is not needed since BACKEND_PUBLIC_URL is set in prod).
    redirect_uri = _redirect_uri("")
    consent = requests.models.PreparedRequest()
    consent.prepare_url(
        GOOGLE_AUTH_URL,
        {
            "client_id": settings.GOOGLE_SHEETS_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": SHEETS_SCOPE,
            "access_type": "offline",
            "prompt": "consent",
            "include_granted_scopes": "true",
            "state": state,
        },
    )
    return {"consent_url": consent.url}


@router.get("/callback")
def callback(
    db: Session = Depends(get_db),
    code: Optional[str] = Query(default=None),
    state: Optional[str] = Query(default=None),
    error: Optional[str] = Query(default=None),
):
    """Handle Google's redirect: verify state, exchange code, upsert connection."""
    _require_oauth_config()
    if not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth state")
    company_id, user_id = _verify_state(state)

    if error or not code:
        return RedirectResponse(
            url=f"{_frontend_settings_url(company_id)}?google_sheets=error",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.GOOGLE_SHEETS_CLIENT_ID,
            "client_secret": settings.GOOGLE_SHEETS_CLIENT_SECRET,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _redirect_uri(""),
        },
        timeout=30,
    )
    if resp.status_code != 200:
        return RedirectResponse(
            url=f"{_frontend_settings_url(company_id)}?google_sheets=error",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
    tok = resp.json()
    access_token = tok.get("access_token")
    refresh_token = tok.get("refresh_token")
    expires_in = int(tok.get("expires_in", 3600))
    token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    connection = (
        db.query(models.GoogleSheetsConnection)
        .filter(models.GoogleSheetsConnection.company_id == company_id)
        .first()
    )
    if connection is None:
        connection = models.GoogleSheetsConnection(company_id=company_id)
        db.add(connection)
    connection.access_token = _store_encrypted(
        missing_key_detail=(
            "Google Sheets integration is not fully configured on the server "
            "(missing TOKEN_ENCRYPTION_KEY); cannot store the access token"
        ),
        encrypt_fn=lambda: encrypt_token(access_token),
    )
    # Google only returns a refresh_token on first consent; keep the existing one
    # if this grant did not include a new one.
    if refresh_token:
        connection.refresh_token = _store_encrypted(
            missing_key_detail=(
                "Google Sheets integration is not fully configured on the server "
                "(missing TOKEN_ENCRYPTION_KEY); cannot store the refresh token"
            ),
            encrypt_fn=lambda: encrypt_token(refresh_token),
        )
    connection.token_expiry = token_expiry
    if user_id:
        connection.connected_by_user_id = user_id
    db.commit()

    return RedirectResponse(
        url=f"{_frontend_settings_url(company_id)}?google_sheets=connected",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.get("/status/{company_id}")
def connection_status(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Report whether the company has a live Google Sheets connection."""
    get_company_membership(db, current_user, company_id)
    connection = (
        db.query(models.GoogleSheetsConnection)
        .filter(models.GoogleSheetsConnection.company_id == company_id)
        .first()
    )
    if not connection:
        return {"connected": False, "connected_by_phone": None, "connected_by_name": None}
    connector = None
    if connection.connected_by_user_id:
        connector = db.query(models.User).filter(models.User.id == connection.connected_by_user_id).first()
    return {
        "connected": True,
        "connected_by_phone": connector.mobile if connector else None,
        "connected_by_name": connector.name if connector else None,
        "created_at": connection.created_at,
    }


@router.post("/payroll-runs/{payroll_run_id}/export")
def export_payroll_run(
    payroll_run_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Export one PayrollRun's line items to a new Google Sheet."""
    _require_oauth_config()
    run = db.query(models.PayrollRun).filter(models.PayrollRun.id == payroll_run_id).first()
    if not run:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payroll run not found")
    # Multi-tenant: caller must belong to the payroll run's company.
    get_company_membership(db, current_user, run.company_id)

    connection = (
        db.query(models.GoogleSheetsConnection)
        .filter(models.GoogleSheetsConnection.company_id == run.company_id)
        .first()
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Google Sheets is not connected for this company",
        )

    company = db.query(models.Company).filter(models.Company.id == run.company_id).first()
    line_items = (
        db.query(models.PayrollLineItem)
        .filter(models.PayrollLineItem.payroll_run_id == run.id)
        .all()
    )
    emp_ids = [li.employee_id for li in line_items]
    emp_map = {}
    if emp_ids:
        for emp in db.query(models.StaffEmployee).filter(models.StaffEmployee.id.in_(emp_ids)).all():
            emp_map[emp.id] = emp

    access_token = _valid_access_token(connection)
    db.commit()  # persist any refreshed token

    headers = {"Authorization": f"Bearer {access_token}"}
    title = f"Payroll {run.payroll_month} - {company.name if company else 'Company'}"

    # 1) Create the empty spreadsheet.
    create_resp = requests.post(
        SHEETS_CREATE_URL,
        headers=headers,
        json={"properties": {"title": title}},
        timeout=30,
    )
    if create_resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create Google spreadsheet",
        )
    sheet = create_resp.json()
    spreadsheet_id = sheet.get("spreadsheetId")
    web_view_link = sheet.get("spreadsheetUrl")

    # 2) Build header + rows and write them in a single batch update.
    header_row = [
        "Employee Code", "Employee Name", "Days Present", "Days In Month",
        "Gross Salary", "Basic", "HRA", "Other Allowances", "Overtime",
        "PF Employee", "ESI Employee", "TDS", "Advance Recovery",
        "Other Deductions", "Total Deductions", "Net Payable",
    ]
    values = [header_row]
    for li in line_items:
        emp = emp_map.get(li.employee_id)
        values.append([
            emp.employee_code if emp else "",
            emp.name if emp else str(li.employee_id),
            float(li.days_present or 0),
            int(li.days_in_month or 0),
            float(li.gross_salary or 0),
            float(li.basic or 0),
            float(li.hra or 0),
            float(li.other_allowances or 0),
            float(li.overtime_amount or 0),
            float(li.pf_employee or 0),
            float(li.esi_employee or 0),
            float(li.tds or 0),
            float(li.advance_recovery or 0),
            float(li.other_deductions or 0),
            float(li.total_deductions or 0),
            float(li.net_payable or 0),
        ])

    update_url = (
        f"{SHEETS_CREATE_URL}/{spreadsheet_id}/values/Sheet1!A1"
        f"?valueInputOption=USER_ENTERED"
    )
    update_resp = requests.put(
        update_url,
        headers=headers,
        json={"values": values},
        timeout=30,
    )
    if update_resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Spreadsheet created but writing rows failed",
        )

    return {
        "spreadsheet_id": spreadsheet_id,
        "url": web_view_link,
        "web_view_link": web_view_link,
        "rows_written": len(values),
    }
