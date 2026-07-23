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
from app import models
from app.routers.settings import DEFAULT_ROLES
from app.permissions import DEFAULT_ROLE_PRESETS, default_view_permissions

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


def _backfill_company_files(db: Session) -> int:
    """Upload CompanyFile BLOBs that have no storage_path yet to Supabase."""
    try:
        rows = (
            db.query(models.CompanyFile)
            .filter(models.CompanyFile.data.isnot(None), models.CompanyFile.storage_path.is_(None))
            .all()
        )
    except Exception as exc:
        # storage_path column may not exist yet in an unmitigated DB — skip gracefully.
        return -1
    count = 0
    for cf in rows:
        path = f"{cf.company_id}/{cf.asset_type}"
        supabase_storage.upload_bytes(
            supabase_storage.BUCKET_COMPANY_FILES,
            path,
            bytes(cf.data),
            cf.content_type,
        )
        cf.storage_path = path
        cf.data = None
        count += 1
    db.commit()
    return count


def _backfill_project_files(db: Session) -> int:
    """Upload ProjectFile BLOBs that have no storage_path yet to Supabase."""
    try:
        rows = (
            db.query(models.ProjectFile)
            .filter(models.ProjectFile.data.isnot(None), models.ProjectFile.storage_path.is_(None))
            .all()
        )
    except Exception:
        return -1
    count = 0
    for pf in rows:
        path = f"{pf.project_id}/{pf.id}"
        supabase_storage.upload_bytes(
            supabase_storage.BUCKET_PROJECT_FILES,
            path,
            bytes(pf.data),
            pf.content_type,
        )
        pf.storage_path = path
        pf.data = None
        count += 1
    db.commit()
    return count


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

    company_n = _backfill_company_files(db)
    project_n = _backfill_project_files(db)
    return {"company_files_migrated": company_n, "project_files_migrated": project_n}




@router.post("/backfill-rbac")
def backfill_rbac_roles(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin_secret),
):
    """One-off, idempotent RBAC bootstrap (PHASE 1).

    For every existing company:
      (a) ensure each default role exists and set its permissions to the preset.
          Only roles whose permissions are empty (`{}` / None) are filled — any
          role an admin has already customized is left untouched.
      (b) assign a role to every `CompanyTeam` whose `role_id` is NULL:
          `partner` -> Admin (all access); everyone else -> Manager (broad ops).

    Re-running is a no-op (counts go to zero) once roles are seeded and members
    are assigned, which is what makes it safe to call repeatedly.
    """
    companies = db.query(models.Company).all()
    roles_created = 0
    roles_filled = 0
    members_assigned = 0
    members_skipped = 0

    for company in companies:
        # (a) default roles — create missing, fill only empty ones.
        existing = {
            r.role_name: r
            for r in db.query(models.CompanyRole).filter(
                models.CompanyRole.company_id == company.id
            ).all()
        }
        for name in DEFAULT_ROLES:
            preset = DEFAULT_ROLE_PRESETS.get(name, default_view_permissions())
            role = existing.get(name)
            if role is None:
                role = models.CompanyRole(
                    company_id=company.id, role_name=name, permissions=preset
                )
                db.add(role)
                db.flush()
                existing[name] = role
                roles_created += 1
            elif not role.permissions:
                role.permissions = preset
                db.add(role)
                roles_filled += 1
        db.flush()

        admin_role = existing.get("Admin") or existing.get("Owner")
        manager_role = existing.get("Manager")

        # (b) members without a role.
        members = db.query(models.CompanyTeam).filter(
            models.CompanyTeam.company_id == company.id,
            models.CompanyTeam.role_id.is_(None),
        ).all()
        for m in members:
            if m.priority_type == "partner" and admin_role is not None:
                m.role_id = admin_role.id
            elif manager_role is not None:
                m.role_id = manager_role.id
            else:
                members_skipped += 1
                continue
            members_assigned += 1
        db.flush()

    db.commit()
    return {
        "companies_processed": len(companies),
        "roles_created": roles_created,
        "roles_filled": roles_filled,
        "members_assigned": members_assigned,
        "members_skipped": members_skipped,
    }


@router.post("/backfill-rbac")
def backfill_rbac(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin_secret),
):
    """Idempotently backfill RBAC presets + assign roles to existing members.

    For every company:
      (a) Ensure the default roles exist and SET their permissions to the presets
          — but ONLY for roles whose permissions are empty `{}` (never clobber an
          admin's real customizations).
      (b) For every CompanyTeam with `role_id IS NULL`: assign a role by
          priority_type — `partner` → Admin (all), else → Manager (broad, so
          existing employees keep working).

    Re-running is a no-op: only empty perms get filled and only null roles get
    assigned, so counts go to zero on the second pass.

    Gated by `X-Admin-Secret` (see _require_admin_secret) — not normal auth.
    """
    companies = db.query(models.Company).all()
    stats = {
        "companies_processed": 0,
        "roles_created": 0,
        "roles_filled": 0,
        "members_assigned": 0,
        "members_already_assigned": 0,
    }

    for company in companies:
        stats["companies_processed"] += 1

        existing = {
            r.role_name: r
            for r in db.query(models.CompanyRole)
            .filter(models.CompanyRole.company_id == company.id)
            .all()
        }
        admin_role = None
        manager_role = None

        for name in DEFAULT_ROLES:
            role = existing.get(name)
            preset = DEFAULT_ROLE_PRESETS.get(name, default_view_permissions())
            if role is None:
                role = models.CompanyRole(
                    company_id=company.id, role_name=name, permissions=preset
                )
                db.add(role)
                db.flush()
                existing[name] = role
                stats["roles_created"] += 1
            elif not role.permissions:
                # Only fill roles that were never migrated (empty perms).
                role.permissions = preset
                stats["roles_filled"] += 1
            if name == "Admin":
                admin_role = role
            if name == "Manager":
                manager_role = role

        members = (
            db.query(models.CompanyTeam)
            .filter(models.CompanyTeam.company_id == company.id)
            .all()
        )
        for m in members:
            if m.role_id is not None:
                stats["members_already_assigned"] += 1
                continue
            # Partner → Admin (all access); everyone else → Manager (broad ops).
            target = admin_role if m.priority_type == "partner" else manager_role
            if target is None:
                continue
            m.role_id = target.id
            stats["members_assigned"] += 1

        db.commit()

    return stats


@router.post("/backfill-company-team-party-links")
def backfill_company_team_party_links_endpoint(
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin_secret),
):
    """Link company_team rows to their LibraryParty by matching name within the
    same company (mirrors the boot-time backfill in main.py). Idempotent: only
    company_team rows whose library_party_id is NULL are touched. Exposed so the
    link (which carries a vendor's tax_no/GSTIN into bill pushes) can be refreshed
    without a backend restart.
    """
    from sqlalchemy import func

    linked = 0
    for lp in db.query(models.LibraryParty).all():
        if not lp.name:
            continue
        target = (
            db.query(models.CompanyTeam)
            .join(models.User, models.User.id == models.CompanyTeam.user_id)
            .filter(
                models.CompanyTeam.company_id == lp.company_id,
                models.CompanyTeam.library_party_id.is_(None),
                func.lower(func.trim(models.User.name)) == lp.name.strip().lower(),
            )
            .first()
        )
        if target:
            target.library_party_id = lp.id
            linked += 1
    db.commit()
    return {"company_team_party_links_created": linked}
