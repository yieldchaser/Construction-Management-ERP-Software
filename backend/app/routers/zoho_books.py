"""Zoho Books integration (accounting sync).

Real OAuth + Zoho Books API proof-of-concept scoped to a single action: pushing
an existing SiteFlow vendor Bill into Zoho Books as a bill (the vendor contact is
created on first push if missing). Other sync paths are intentionally out of
scope for this pass.

Mirrors the existing integration shapes (app/routers/google_drive.py,
app/routers/google_sheets.py):
- `/authorize` returns a JSON consent URL (never a redirect carrying a token)
- `/callback` exchanges the code, fetches + stores the Zoho organization_id,
  and stores encrypted tokens
- `/status/{company_id}` reports connection state
- `/companies/{company_id}/connection` (DELETE) disconnects
- `/companies/{company_id}/push-bill/{bill_id}` performs the one real action

Zoho data centers are region-specific: the accounts server and the API host both
carry the region suffix (e.g. ".in"). The region (default "in") drives both base
URLs so ".com"/".eu" also work. Zoho refresh tokens are long-lived but access
tokens expire hourly, so this module implements the refresh-token grant.

Tokens are encrypted at rest (app/crypto.py, Fernet) before being written and
decrypted right before use. This module never logs token values.
"""
import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.auth import (
    create_access_token,
    get_company_membership,
    get_current_user,
    require_permission,
)
from app.config import settings
from app.crypto import decrypt_token, encrypt_token
from app.database import get_db
from app import models

router = APIRouter(prefix="/integrations/zoho-books", tags=["Integrations - Zoho Books"])

ZOHO_SCOPE = "ZohoBooks.fullaccess.all"

STATE_PURPOSE = "zoho_books_oauth"


def _region() -> str:
    return settings.zoho_region


def _accounts_url() -> str:
    return f"https://accounts.zoho.{_region()}"


def _api_base() -> str:
    # Zoho Books v3 API host, region-specific.
    return f"https://www.zohoapis.{_region()}/books/v3/"


def _auth_url() -> str:
    return f"{_accounts_url()}/oauth/v2/auth"


def _token_url() -> str:
    return f"{_accounts_url()}/oauth/v2/token"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _require_oauth_config() -> None:
    if not settings.zoho_client_id or not settings.zoho_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Zoho Books integration is not configured on the server",
        )


def _redirect_uri(request_base: str) -> str:
    base = (settings.BACKEND_PUBLIC_URL or request_base or "http://localhost:8000").rstrip("/")
    return f"{base}/apis/v3/integrations/zoho-books/callback"


def _frontend_settings_url(company_id: uuid.UUID) -> str:
    base = (settings.FRONTEND_PUBLIC_URL or "http://localhost:3000").rstrip("/")
    return f"{base}/c/{company_id}/settings"


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
    try:
        return encrypt_fn()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=missing_key_detail,
        ) from exc


def _valid_access_token(connection: models.ZohoBooksConnection) -> str:
    """Return a usable access token, refreshing via the refresh_token grant when expired."""
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
            detail="Zoho Books access expired; please reconnect",
        )

    resp = requests.post(
        _token_url(),
        data={
            "client_id": settings.zoho_client_id,
            "client_secret": settings.zoho_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to refresh Zoho Books access token",
        )
    tok = resp.json()
    new_access_token = tok.get("access_token")
    expires_in = int(tok.get("expires_in", 3600))
    connection.token_expiry = now + timedelta(seconds=expires_in)
    if not new_access_token:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoho Books did not return an access token",
        )
    connection.access_token = _store_encrypted(
        missing_key_detail=(
            "Zoho Books integration is not fully configured on the server "
            "(missing TOKEN_ENCRYPTION_KEY); cannot store the refreshed token"
        ),
        encrypt_fn=lambda: encrypt_token(new_access_token),
    )
    return new_access_token


def _api_headers(access_token: str) -> dict:
    return {"Authorization": f"Zoho-oauthtoken {access_token}"}


def _resolve_organization_id(access_token: str) -> Optional[str]:
    """Fetch the company's Zoho Books organization id (first org in the list)."""
    resp = requests.get(
        f"{_api_base()}organizations",
        headers=_api_headers(access_token),
        timeout=30,
    )
    if resp.status_code != 200:
        return None
    data = resp.json()
    orgs = (data or {}).get("organizations") or []
    if not orgs:
        return None
    return str(orgs[0].get("organization_id"))


def _default_expense_account_id(access_token: str, organization_id: str) -> Optional[str]:
    """Return an active expense account_id from the org's chart of accounts.

    Zoho bill line items must book against an account. Prefer purchase/expense
    account types; fall back to anything whose type contains 'expense'.
    """
    resp = requests.get(
        f"{_api_base()}chartofaccounts",
        headers=_api_headers(access_token),
        params={"organization_id": organization_id},
        timeout=30,
    )
    if resp.status_code != 200:
        return None
    accounts = (resp.json() or {}).get("chartofaccounts") or []
    for wanted in ("cost_of_goods_sold", "expense", "other_expense"):
        for a in accounts:
            if a.get("account_type") == wanted and a.get("is_active", True):
                return str(a.get("account_id"))
    for a in accounts:
        if "expense" in str(a.get("account_type", "")) and a.get("is_active", True):
            return str(a.get("account_id"))
    return None


def _search_vendor(access_token: str, organization_id: str, *, email: Optional[str] = None, name: Optional[str] = None) -> Optional[str]:
    """Look up an existing vendor contact_id by email or by exact contact_name."""
    params = {"contact_type": "vendor", "organization_id": organization_id}
    if email:
        params["email"] = email
    elif name:
        params["contact_name"] = name
    else:
        return None
    resp = requests.get(f"{_api_base()}contacts", headers=_api_headers(access_token), params=params, timeout=30)
    if resp.status_code == 200:
        contacts = (resp.json() or {}).get("contacts") or []
        if contacts:
            return str(contacts[0].get("contact_id"))
    return None


def _update_vendor_gst(access_token: str, organization_id: str, contact_id: str, gstin: str) -> None:
    """Patch an existing Zoho vendor's GST fields (keeps it in sync when a GSTIN
    becomes available after the vendor was first created without one)."""
    # Best-effort: if the Zoho org is not GST-registered it rejects the
    # gst_treatment element (code 8). That must not break the bill push, so a
    # failure here is swallowed and the push continues without GST on the vendor.
    requests.put(
        f"{_api_base()}contacts/{contact_id}",
        headers={**_api_headers(access_token), "Content-Type": "application/json"},
        params={"organization_id": organization_id},
        json={"gst_no": gstin, "gst_treatment": "business_gst"},
        timeout=30,
    )


def _find_or_create_vendor(access_token: str, organization_id: str, *, name: str, email: Optional[str], phone: Optional[str], gstin: Optional[str]) -> str:
    """Return the Zoho vendor contact_id, creating the vendor if it is missing."""
    # 1) Try to find an existing vendor by email, then by exact name.
    existing = _search_vendor(access_token, organization_id, email=email) if email else None
    if not existing:
        existing = _search_vendor(access_token, organization_id, name=name)
    if existing:
        # Sync GST info onto the existing vendor when we now have a GSTIN.
        if gstin:
            _update_vendor_gst(access_token, organization_id, existing, gstin)
        return existing

    # 2) Otherwise create the vendor contact.
    contact_payload: dict = {"contact_type": "vendor", "contact_name": name or "Vendor"}
    if email:
        contact_payload["email"] = email
    if phone:
        contact_payload["phone"] = phone
    # Only send GST fields when we actually have a GSTIN. Non-GST Zoho orgs
    # reject the gst_treatment element entirely (code 8), so omit it otherwise
    # and let Zoho apply its own default.
    if gstin:
        contact_payload["gst_no"] = gstin
        contact_payload["gst_treatment"] = "business_gst"
        # Zoho derives place_of_supply from gst_no; sending the numeric GSTIN
        # prefix here is wrong (Zoho wants the alphabetic state code), so omit it.

    resp = requests.post(
        f"{_api_base()}contacts",
        headers={**_api_headers(access_token), "Content-Type": "application/json"},
        params={"organization_id": organization_id},
        json=contact_payload,
        timeout=30,
    )
    # If a non-GST org rejected the gst_treatment element (code 8), retry once
    # without the GST fields so the vendor still gets created.
    if resp.status_code not in (200, 201) and ("gst_no" in contact_payload or "gst_treatment" in contact_payload):
        contact_payload.pop("gst_no", None)
        contact_payload.pop("gst_treatment", None)
        resp = requests.post(
            f"{_api_base()}contacts",
            headers={**_api_headers(access_token), "Content-Type": "application/json"},
            params={"organization_id": organization_id},
            json=contact_payload,
            timeout=30,
        )
    if resp.status_code not in (200, 201):
        # Duplicate-name (code 3062) means it already exists — resolve by name.
        dup = _search_vendor(access_token, organization_id, name=name)
        if dup:
            return dup
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create the Zoho Books vendor contact: {resp.text[:500]}",
        )
    contact = (resp.json() or {}).get("contact") or {}
    contact_id = contact.get("contact_id")
    if not contact_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Zoho Books did not return a vendor contact id",
        )
    return str(contact_id)


# ── OAuth flow ───────────────────────────────────────────────────────────────

@router.get("/authorize")
def authorize(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Begin the OAuth consent flow. Returns a JSON consent URL for the frontend
    to navigate to, so a SiteFlow session credential is never placed in a URL."""
    _require_oauth_config()
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    get_company_membership(db, current_user, company_id)
    require_permission(db, current_user, company_id, "settings:manage")

    state = _sign_state(company_id, current_user.id)
    redirect_uri = _redirect_uri("")
    consent = requests.models.PreparedRequest()
    consent.prepare_url(
        _auth_url(),
        {
            "client_id": settings.zoho_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": ZOHO_SCOPE,
            "access_type": "offline",
            "prompt": "consent",
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
    """Handle Zoho's redirect: verify state, exchange code, fetch organization_id, upsert connection."""
    _require_oauth_config()
    if not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing OAuth state")
    company_id, user_id = _verify_state(state)

    if error or not code:
        return RedirectResponse(
            url=f"{_frontend_settings_url(company_id)}?zoho_books=error",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    resp = requests.post(
        _token_url(),
        data={
            "client_id": settings.zoho_client_id,
            "client_secret": settings.zoho_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _redirect_uri(""),
        },
        timeout=30,
    )
    if resp.status_code != 200:
        return RedirectResponse(
            url=f"{_frontend_settings_url(company_id)}?zoho_books=error",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
    tok = resp.json()
    access_token = tok.get("access_token")
    refresh_token = tok.get("refresh_token")
    expires_in = int(tok.get("expires_in", 3600))
    token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    if not access_token:
        return RedirectResponse(
            url=f"{_frontend_settings_url(company_id)}?zoho_books=error",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    # Resolve the Zoho Books organization id for this connection.
    organization_id = _resolve_organization_id(access_token)

    connection = (
        db.query(models.ZohoBooksConnection)
        .filter(models.ZohoBooksConnection.company_id == company_id)
        .first()
    )
    if connection is None:
        connection = models.ZohoBooksConnection(company_id=company_id)
        db.add(connection)
    connection.access_token = _store_encrypted(
        missing_key_detail=(
            "Zoho Books integration is not fully configured on the server "
            "(missing TOKEN_ENCRYPTION_KEY); cannot store the access token"
        ),
        encrypt_fn=lambda: encrypt_token(access_token),
    )
    if refresh_token:
        connection.refresh_token = _store_encrypted(
            missing_key_detail=(
                "Zoho Books integration is not fully configured on the server "
                "(missing TOKEN_ENCRYPTION_KEY); cannot store the refresh token"
            ),
            encrypt_fn=lambda: encrypt_token(refresh_token),
        )
    connection.token_expiry = token_expiry
    connection.organization_id = organization_id
    if user_id:
        connection.connected_by_user_id = user_id
    db.commit()

    return RedirectResponse(
        url=f"{_frontend_settings_url(company_id)}?zoho_books=connected",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.get("/status/{company_id}")
def connection_status(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Report whether the company has a live Zoho Books connection."""
    get_company_membership(db, current_user, company_id)
    connection = (
        db.query(models.ZohoBooksConnection)
        .filter(models.ZohoBooksConnection.company_id == company_id)
        .first()
    )
    if not connection:
        return {"connected": False, "connected_by_name": None, "organization_id": None}
    connector = None
    if connection.connected_by_user_id:
        connector = db.query(models.User).filter(models.User.id == connection.connected_by_user_id).first()
    return {
        "connected": True,
        "connected_by_name": connector.name if connector else None,
        "organization_id": connection.organization_id,
        "created_at": connection.created_at,
    }


@router.delete("/companies/{company_id}/connection")
def disconnect(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove the company's Zoho Books connection (revokes stored tokens)."""
    get_company_membership(db, current_user, company_id)
    require_permission(db, current_user, company_id, "settings:manage")
    connection = (
        db.query(models.ZohoBooksConnection)
        .filter(models.ZohoBooksConnection.company_id == company_id)
        .first()
    )
    if connection:
        db.delete(connection)
        db.commit()
    return {"ok": True, "connected": False}


@router.post("/companies/{company_id}/push-bill/{bill_id}")
def push_bill(
    company_id: uuid.UUID,
    bill_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Push an existing SiteFlow vendor Bill into Zoho Books as a bill.

    The vendor contact is created on first push if it does not already exist
    (matched by email). Scoped single action, like the Drive/Sheets integrations.
    """
    _require_oauth_config()
    get_company_membership(db, current_user, company_id)

    connection = (
        db.query(models.ZohoBooksConnection)
        .filter(models.ZohoBooksConnection.company_id == company_id)
        .first()
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Zoho Books is not connected for this company",
        )

    bill = db.query(models.Bill).filter(models.Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bill not found")
    if bill.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bill does not belong to this company")
    project = db.query(models.Project).filter(models.Project.id == bill.project_id).first()
    if not project or project.company_id != company_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bill project does not belong to this company")

    organization_id = connection.organization_id
    access_token = _valid_access_token(connection)
    if not organization_id:
        # Fetch orgs directly here (not via the silent helper) so a failure is diagnostic.
        org_resp = requests.get(
            f"{_api_base()}organizations",
            headers=_api_headers(access_token),
            timeout=30,
        )
        if org_resp.status_code == 200:
            orgs = (org_resp.json() or {}).get("organizations") or []
            if orgs:
                organization_id = str(orgs[0].get("organization_id"))
                connection.organization_id = organization_id
        if not organization_id:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=(
                    f"Could not determine the Zoho Books organization id "
                    f"(region={_region()}, api={_api_base()}organizations, "
                    f"status={org_resp.status_code}): {org_resp.text[:400]}"
                ),
            )
    db.commit()  # persist any refreshed token / resolved org id

    # Resolve the vendor from the bill's party (company_team -> user).
    vendor_name = "Vendor"
    vendor_email: Optional[str] = None
    vendor_phone: Optional[str] = None
    gstin: Optional[str] = None
    team = db.query(models.CompanyTeam).filter(models.CompanyTeam.id == bill.party_company_user_id).first()
    if team and team.user_id:
        user = db.query(models.User).filter(models.User.id == team.user_id).first()
        if user:
            vendor_name = user.name or vendor_name
            vendor_email = user.email
            vendor_phone = user.mobile
    if team and team.library_party_id:
        party = db.query(models.LibraryParty).filter(models.LibraryParty.id == team.library_party_id).first()
        if party:
            if getattr(party, "tax_no", None):
                gstin = str(party.tax_no)
            # Userless subcontractor (no login): fall back to the linked party
            # name so the bill pushes with the real vendor, not "Vendor".
            if not team.user_id and party.name:
                vendor_name = party.name
                vendor_email = vendor_email or party.email
                vendor_phone = vendor_phone or party.phone

    vendor_id = _find_or_create_vendor(
        access_token,
        organization_id,
        name=vendor_name,
        email=vendor_email,
        phone=vendor_phone,
        gstin=gstin,
    )

    # Build line items from items_json when present, else a single summary line.
    line_items = []
    try:
        items = json.loads(bill.items_json) if bill.items_json else None
    except (ValueError, TypeError):
        items = None
    if items and isinstance(items, list) and items:
        for it in items:
            amount = float(it.get("amount") or it.get("rate") or 0)
            qty = float(it.get("qty") or it.get("quantity") or 1) or 1
            line_items.append({
                "name": (it.get("cost_code_name") or it.get("desc") or "Item")[:100],
                "description": it.get("desc") or "",
                "rate": round(amount / qty, 2) if qty else round(amount, 2),
                "quantity": qty,
                "amount": round(amount, 2),
            })
    else:
        line_items.append({
            "name": (bill.invoice_number or "Vendor Bill")[:100],
            "description": f"Vendor bill pushed from SiteFlow (bill id {bill.id})",
            "rate": float(bill.subtotal or 0),
            "quantity": 1,
            "amount": float(bill.total_payable or bill.subtotal or 0),
        })

    # Zoho requires every bill line item to book against a chart-of-accounts
    # expense account (else code 13009 "The account field cannot be empty").
    account_id = _default_expense_account_id(access_token, organization_id)
    if not account_id:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No expense account found in Zoho Books to book the bill against",
        )
    for li in line_items:
        li["account_id"] = account_id

    bill_payload: dict = {
        "vendor_id": vendor_id,
        "bill_number": bill.invoice_number,
        "date": bill.invoice_date.date().isoformat() if bill.invoice_date else datetime.now(timezone.utc).date().isoformat(),
        "line_items": line_items,
        "notes": f"Pushed from SiteFlow. SiteFlow bill id: {bill.id}",
    }
    if bill.due_date:
        bill_payload["due_date"] = bill.due_date.date().isoformat()
    # GST fields only when a GSTIN exists; non-GST orgs reject the element.
    # place_of_supply is derived by Zoho from the vendor's gst_no.
    if gstin:
        bill_payload["gst_treatment"] = "business_gst"

    resp = requests.post(
        f"{_api_base()}bills",
        headers={**_api_headers(access_token), "Content-Type": "application/json"},
        params={"organization_id": organization_id},
        json=bill_payload,
        timeout=60,
    )
    if resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to create the Zoho Books bill: {resp.text[:500]}",
        )
    zoho_bill = (resp.json() or {}).get("bill") or {}
    return {
        "zoho_bill_id": zoho_bill.get("bill_id"),
        "vendor_id": vendor_id,
        "bill_number": bill_payload["bill_number"],
        "total": float(bill.total_payable or 0),
    }
