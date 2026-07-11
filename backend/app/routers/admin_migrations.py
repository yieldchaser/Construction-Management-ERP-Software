"""One-off admin migration endpoints.

These are whole-database operations (they touch every company's data) and are
NOT tenant-scoped, so they are gated by a dedicated admin secret passed in the
`X-Admin-Secret` header rather than by normal user auth. The secret must be set
via the `ADMIN_MIGRATION_SECRET` env var; when it is empty the routes always
return 403, so an unset secret never means "open".
"""
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
import hmac

from app.config import settings
from app.database import get_db
from app import supabase_storage
from scripts.backfill_files_to_storage import backfill_company_files, backfill_project_files

router = APIRouter(prefix="/admin/migrations", tags=["Admin - Migrations"])


def _require_admin_secret(x_admin_secret: str | None = Header(default=None)) -> None:
    if not settings.ADMIN_MIGRATION_SECRET:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin migrations are not enabled",
        )
    if not hmac.compare_digest(x_admin_secret or "", settings.ADMIN_MIGRATION_SECRET):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid admin secret",
        )


@router.post("/backfill-files-to-storage")
def backfill_files_to_storage(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin_secret),
):
    """Push existing DB file BLOBs to Supabase Storage.

    Idempotent: only CompanyFile / ProjectFile rows that still hold bytes in the
    `data` column but have no `storage_path` are uploaded. Storage must be
    configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) or this returns 409.
    """
    if not supabase_storage.is_storage_configured():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Supabase Storage is not configured",
        )
    supabase_storage.ensure_buckets()

    company_n = backfill_company_files(db)
    project_n = backfill_project_files(db)
    return {"company_files_migrated": company_n, "project_files_migrated": project_n}
