"""Supabase Storage helper for file blobs.

Replaces the LargeBinary (bytea) columns in the DB with objects stored in
Supabase Storage. Uses the service-role key via raw REST calls (the `requests`
package is already a dependency; `supabase-py` is intentionally NOT added to
keep the dependency surface small). Two private buckets are used:
`company-files` and `project-files`.

Auth model: every upload/download path is gated by the caller's existing
multi-tenant checks (verify_company_access / verify_project_access /
get_company_membership) before this module is ever invoked, so the storage
layer itself does not re-check tenancy.
"""

from typing import Optional

import requests

from app.config import settings

BUCKET_COMPANY_FILES = "company-files"
BUCKET_PROJECT_FILES = "project-files"
BUCKET_KYC_DOCUMENTS = "kyc-documents"

SUPABASE_URL = (getattr(settings, "SUPABASE_URL", "") or "").strip()
SUPABASE_KEY = (getattr(settings, "SUPABASE_SERVICE_ROLE_KEY", "") or "").strip()

_storage_ready = None  # cache whether buckets were ensured


def is_storage_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_KEY)


def _base() -> str:
    return f"{SUPABASE_URL.rstrip('/')}/storage/v1"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "apikey": SUPABASE_KEY,
    }


def ensure_bucket(bucket: str, public: bool = False) -> None:
    """Create the bucket if it does not already exist (idempotent)."""
    if not is_storage_configured():
        return
    headers = _headers()
    # Check existence first.
    head = requests.get(f"{_base()}/bucket/{bucket}", headers=headers, timeout=10)
    if head.status_code == 200:
        return
    resp = requests.post(
        f"{_base()}/bucket",
        headers={**headers, "Content-Type": "application/json"},
        json={"id": bucket, "name": bucket, "public": public},
        timeout=10,
    )
    if resp.status_code in (200, 201, 409):
        return
    raise RuntimeError(
        f"Failed to create bucket {bucket}: {resp.status_code} {resp.text}"
    )


def ensure_buckets() -> None:
    global _storage_ready
    if _storage_ready is True:
        return
    ensure_bucket(BUCKET_COMPANY_FILES, public=False)
    ensure_bucket(BUCKET_PROJECT_FILES, public=False)
    ensure_bucket(BUCKET_KYC_DOCUMENTS, public=False)
    _storage_ready = True


def upload_bytes(bucket: str, path: str, data: bytes, content_type: Optional[str] = None) -> str:
    """Upload bytes and return the stored object path (same as ``path``)."""
    ensure_buckets()
    headers = _headers()
    if content_type:
        headers["Content-Type"] = content_type
    headers["x-upsert"] = "true"
    resp = requests.post(
        f"{_base()}/object/{bucket}/{path}",
        headers=headers,
        data=data,
        timeout=30,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Storage upload failed ({bucket}/{path}): {resp.status_code} {resp.text}"
        )
    return path


def delete_object(bucket: str, path: str) -> None:
    """Best-effort delete; never raises so callers don't break on failures."""
    if not path or not is_storage_configured():
        return
    try:
        resp = requests.delete(
            f"{_base()}/object/{bucket}/{path}",
            headers=_headers(),
            timeout=10,
        )
        if resp.status_code not in (200, 204, 400, 404):
            print(f"WARN storage delete failed ({bucket}/{path}): {resp.status_code} {resp.text}")
    except Exception as exc:  # noqa: BLE001 - best effort only
        print(f"WARN storage delete error ({bucket}/{path}): {exc}")


def create_signed_url(bucket: str, path: str, expires_in: int = 3600) -> str:
    """Return a short-lived signed URL for a private object."""
    resp = requests.post(
        f"{_base()}/object/sign/{bucket}/{path}",
        headers={**_headers(), "Content-Type": "application/json"},
        json={"expiresIn": expires_in},
        timeout=10,
    )
    if resp.status_code not in (200, 201):
        raise RuntimeError(
            f"Signed URL failed ({bucket}/{path}): {resp.status_code} {resp.text}"
        )
    data = resp.json()
    signed = data.get("signedURL")
    if not signed:
        raise RuntimeError(f"Signed URL missing in response ({bucket}/{path}): {data}")
    if signed.startswith("http"):
        return signed
    return f"{_base()}/{signed.lstrip('/')}"


def download_bytes(bucket: str, path: str) -> bytes:
    resp = requests.get(
        f"{_base()}/object/{bucket}/{path}",
        headers=_headers(),
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(
            f"Storage download failed ({bucket}/{path}): {resp.status_code} {resp.text}"
        )
    return resp.content
