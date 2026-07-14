"""Google Drive integration (file backup).

Real OAuth + Drive API proof-of-concept scoped to a single action: uploading
an existing SiteFlow ProjectFile/CompanyFile to the company's connected Drive
(via the Drive `files.create` + simple media upload REST endpoints). Other
sync paths are intentionally out of scope for this pass.

Mirrors the existing Google Sheets integration shape (app/routers/google_sheets.py):
- `/authorize` returns a JSON consent URL (never a redirect carrying a token)
- `/callback` exchanges the code and stores encrypted tokens
- `/status/{company_id}` reports connection state
- `/companies/{company_id}/backup-file/{file_id}` performs the one real action
- `/companies/{company_id}/connection` (DELETE) disconnects

Tokens are encrypted at rest (app/crypto.py, Fernet) before being written and
decrypted right before use. This module never logs token values.
"""
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
from app.supabase_storage import (
    BUCKET_COMPANY_FILES,
    BUCKET_PROJECT_FILES,
    download_bytes,
    is_storage_configured,
)
from app import models

router = APIRouter(prefix="/integrations/google-drive", tags=["Integrations - Google Drive"])

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file"
DRIVE_FILES_URL = "https://www.googleapis.com/drive/v3/files"

STATE_PURPOSE = "google_drive_oauth"


# ── Helpers ──────────────────────────────────────────────────────────────────

def _require_oauth_config() -> None:
    if not settings.google_drive_client_id or not settings.google_drive_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Drive integration is not configured on the server",
        )


def _redirect_uri(request_base: str) -> str:
    base = (settings.BACKEND_PUBLIC_URL or request_base or "http://localhost:8000").rstrip("/")
    return f"{base}/apis/v3/integrations/google-drive/callback"


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


def _valid_access_token(connection: models.GoogleDriveConnection) -> str:
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
            detail="Google Drive access expired; please reconnect",
        )

    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.google_drive_client_id,
            "client_secret": settings.google_drive_client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        },
        timeout=30,
    )
    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to refresh Google Drive access token",
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
            "Google Drive integration is not fully configured on the server "
            "(missing TOKEN_ENCRYPTION_KEY); cannot store the refreshed token"
        ),
        encrypt_fn=lambda: encrypt_token(new_access_token),
    )
    return new_access_token


def _load_file(
    db: Session, file_id: uuid.UUID, file_type: str, company_id: uuid.UUID
) -> tuple[bytes, str, str]:
    """Resolve a SiteFlow file (ProjectFile or CompanyFile), verify it belongs to
    the requested company, and return (content_bytes, filename, content_type)."""
    if file_type == "company":
        f = db.query(models.CompanyFile).filter(models.CompanyFile.id == file_id).first()
        if not f:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company file not found")
        if f.company_id != company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="File does not belong to this company")
        name = f.filename
        content_type = f.content_type or "application/octet-stream"
        storage_path = f.storage_path
        bucket = BUCKET_COMPANY_FILES
        data = f.data
    else:
        f = db.query(models.ProjectFile).filter(models.ProjectFile.id == file_id).first()
        if not f:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project file not found")
        project = db.query(models.Project).filter(models.Project.id == f.project_id).first()
        if not project:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
        if project.company_id != company_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="File does not belong to this company")
        name = f.original_filename or f.name
        content_type = f.content_type or "application/octet-stream"
        storage_path = f.storage_path
        bucket = BUCKET_PROJECT_FILES
        data = f.data

    # Bytes: prefer object storage, else the DB BLOB.
    if storage_path and is_storage_configured():
        try:
            return download_bytes(bucket, storage_path), name, content_type
        except Exception:
            # Fall through to BLOB.
            pass
    if data:
        return data, name, content_type
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File content not available")


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
        GOOGLE_AUTH_URL,
        {
            "client_id": settings.google_drive_client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": DRIVE_SCOPE,
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
            url=f"{_frontend_settings_url(company_id)}?google_drive=error",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )

    resp = requests.post(
        GOOGLE_TOKEN_URL,
        data={
            "client_id": settings.google_drive_client_id,
            "client_secret": settings.google_drive_client_secret,
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": _redirect_uri(""),
        },
        timeout=30,
    )
    if resp.status_code != 200:
        return RedirectResponse(
            url=f"{_frontend_settings_url(company_id)}?google_drive=error",
            status_code=status.HTTP_307_TEMPORARY_REDIRECT,
        )
    tok = resp.json()
    access_token = tok.get("access_token")
    refresh_token = tok.get("refresh_token")
    expires_in = int(tok.get("expires_in", 3600))
    token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)

    connection = (
        db.query(models.GoogleDriveConnection)
        .filter(models.GoogleDriveConnection.company_id == company_id)
        .first()
    )
    if connection is None:
        connection = models.GoogleDriveConnection(company_id=company_id)
        db.add(connection)
    connection.access_token = _store_encrypted(
        missing_key_detail=(
            "Google Drive integration is not fully configured on the server "
            "(missing TOKEN_ENCRYPTION_KEY); cannot store the access token"
        ),
        encrypt_fn=lambda: encrypt_token(access_token),
    )
    if refresh_token:
        connection.refresh_token = _store_encrypted(
            missing_key_detail=(
                "Google Drive integration is not fully configured on the server "
                "(missing TOKEN_ENCRYPTION_KEY); cannot store the refresh token"
            ),
            encrypt_fn=lambda: encrypt_token(refresh_token),
        )
    connection.token_expiry = token_expiry
    if user_id:
        connection.connected_by_user_id = user_id
    db.commit()

    return RedirectResponse(
        url=f"{_frontend_settings_url(company_id)}?google_drive=connected",
        status_code=status.HTTP_307_TEMPORARY_REDIRECT,
    )


@router.get("/status/{company_id}")
def connection_status(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Report whether the company has a live Google Drive connection."""
    get_company_membership(db, current_user, company_id)
    connection = (
        db.query(models.GoogleDriveConnection)
        .filter(models.GoogleDriveConnection.company_id == company_id)
        .first()
    )
    if not connection:
        return {"connected": False, "connected_by_name": None}
    connector = None
    if connection.connected_by_user_id:
        connector = db.query(models.User).filter(models.User.id == connection.connected_by_user_id).first()
    return {
        "connected": True,
        "connected_by_name": connector.name if connector else None,
        "created_at": connection.created_at,
    }


@router.delete("/companies/{company_id}/connection")
def disconnect(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remove the company's Google Drive connection (revokes stored tokens)."""
    get_company_membership(db, current_user, company_id)
    require_permission(db, current_user, company_id, "settings:manage")
    connection = (
        db.query(models.GoogleDriveConnection)
        .filter(models.GoogleDriveConnection.company_id == company_id)
        .first()
    )
    if connection:
        db.delete(connection)
        db.commit()
    return {"ok": True, "connected": False}


@router.post("/companies/{company_id}/backup-file/{file_id}")
def backup_file(
    company_id: uuid.UUID,
    file_id: uuid.UUID,
    file_type: str = Query(default="project", pattern="^(project|company)$"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Upload an existing SiteFlow file (project or company) to the connected Drive."""
    _require_oauth_config()
    get_company_membership(db, current_user, company_id)

    connection = (
        db.query(models.GoogleDriveConnection)
        .filter(models.GoogleDriveConnection.company_id == company_id)
        .first()
    )
    if not connection:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Google Drive is not connected for this company",
        )

    content, filename, content_type = _load_file(db, file_id, file_type, company_id)
    access_token = _valid_access_token(connection)
    db.commit()  # persist any refreshed token

    headers = {"Authorization": f"Bearer {access_token}"}

    # 1) Create the file metadata (no media yet).
    create_resp = requests.post(
        DRIVE_FILES_URL,
        headers=headers,
        json={"name": filename},
        timeout=30,
    )
    if create_resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to create Google Drive file",
        )
    file_id_drive = create_resp.json().get("id")
    if not file_id_drive:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Google Drive did not return a file id",
        )

    # 2) Upload the content via simple media upload.
    upload_url = f"{DRIVE_FILES_URL}/{file_id_drive}?uploadType=media"
    upload_resp = requests.patch(
        upload_url,
        headers={**headers, "Content-Type": content_type},
        data=content,
        timeout=60,
    )
    if upload_resp.status_code not in (200, 201):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to upload file content to Google Drive",
        )

    drive_file = upload_resp.json()
    return {
        "file_id": file_id_drive,
        "name": drive_file.get("name", filename),
        "web_view_link": drive_file.get("webViewLink"),
        "size": len(content),
    }
