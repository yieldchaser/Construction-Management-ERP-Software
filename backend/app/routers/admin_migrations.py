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
import uuid
from typing import Optional

from pydantic import BaseModel

from app.config import settings
from app.database import get_db
from app import supabase_storage
from app import models
from app.routers.settings import DEFAULT_ROLES
from app.auth import empty_permissions_fail_closed
from app.permissions import DEFAULT_ROLE_PRESETS, default_view_permissions, VIEWER_GRANTS

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


# ── D7 (R2-073 / R2-113 / R2-169): permissions backfill + fail-closed flag ────

# Marker prefix for the in-app owner notification todo. The prefix check makes
# re-running the backfill idempotent (no duplicate notifications).
_OWNER_NOTICE_TITLE_PREFIX = "[SiteFlow] Role permissions backfilled"


def _plan_role_backfill(db: Session, company) -> dict:
    """Compute (without mutating) the D7 backfill plan for one company.

    Every existing role whose permission dict is empty/unset gets filled:
      - from DEFAULT_ROLE_PRESETS when its name matches a preset (all seeded
        role names are covered), otherwise
      - from the Viewer preset (decision: unmatched roles default to Viewer).

    Roles an admin already configured are never clobbered. Members with a NULL
    role_id get Admin (partners) or Viewer (everyone else); missing carrier
    roles are created from their presets so assignments always resolve.
    """
    roles = (
        db.query(models.CompanyRole)
        .filter(models.CompanyRole.company_id == company.id)
        .all()
    )
    by_name = {}
    for role in roles:
        by_name.setdefault(role.role_name, role)

    planned_fills = []
    matrix_roles = []
    for role in roles:
        preset = DEFAULT_ROLE_PRESETS.get(role.role_name)
        configured = bool(role.permissions)
        if configured:
            action = "none"
            resulting_count = len(role.permissions)
        else:
            target = dict(preset) if preset is not None else dict(VIEWER_GRANTS)
            planned_fills.append((role, target))
            action = "fill_preset" if preset is not None else "fill_viewer_fallback"
            resulting_count = len(target)
        matrix_roles.append({
            "role_name": role.role_name,
            "matched_preset": preset is not None,
            "fallback_viewer": action == "fill_viewer_fallback",
            "currently_configured": configured,
            "action": action,
            "resulting_permission_count": resulting_count,
        })

    # Carrier roles needed so NULL-role member assignment always resolves.
    carrier_roles_to_create = sorted(
        name for name in ("Admin", "Owner", "Viewer") if name not in by_name
    )

    members_null_role = (
        db.query(models.CompanyTeam)
        .filter(
            models.CompanyTeam.company_id == company.id,
            models.CompanyTeam.role_id.is_(None),
        )
        .all()
    )
    members_to_viewer = []
    members_partner_to_admin = 0
    for m in members_null_role:
        if m.priority_type == "partner":
            members_partner_to_admin += 1
        else:
            user = db.query(models.User).filter(models.User.id == m.user_id).first()
            members_to_viewer.append(getattr(user, "name", None) or str(m.user_id))

    return {
        "company_id": str(company.id),
        "company_name": company.name,
        "roles": matrix_roles,
        "roles_to_fill": len(planned_fills),
        "viewer_fallback_roles": [
            r["role_name"] for r in matrix_roles if r["action"] == "fill_viewer_fallback"
        ],
        "carrier_roles_to_create": carrier_roles_to_create,
        "members_without_role": len(members_null_role),
        "members_to_viewer": members_to_viewer,
        "members_partner_to_admin": members_partner_to_admin,
    }


def _apply_role_backfill(db: Session, company, plan: dict) -> dict:
    """Mutate the database according to a computed plan. Returns applied counts."""
    roles_filled = 0
    roles_created = 0
    members_viewer = 0
    members_admin = 0

    roles = (
        db.query(models.CompanyRole)
        .filter(models.CompanyRole.company_id == company.id)
        .all()
    )
    by_name = {}
    for role in roles:
        by_name.setdefault(role.role_name, role)

    # (a) Fill empty permission dicts from presets / Viewer fallback.
    for role in roles:
        if role.permissions:
            continue
        preset = DEFAULT_ROLE_PRESETS.get(role.role_name)
        role.permissions = dict(preset) if preset is not None else dict(VIEWER_GRANTS)
        db.add(role)
        roles_filled += 1

    # (b) Carrier roles for member assignment.
    for name in ("Admin", "Owner", "Viewer"):
        if name not in by_name:
            created = models.CompanyRole(
                company_id=company.id,
                role_name=name,
                permissions=dict(DEFAULT_ROLE_PRESETS[name]),
            )
            db.add(created)
            db.flush()
            by_name[name] = created
            roles_created += 1

    admin_role = by_name.get("Admin") or by_name.get("Owner")
    viewer_role = by_name.get("Viewer")

    # (c) NULL-role members: partner -> Admin, everyone else -> Viewer (D7.4).
    members = (
        db.query(models.CompanyTeam)
        .filter(
            models.CompanyTeam.company_id == company.id,
            models.CompanyTeam.role_id.is_(None),
        )
        .all()
    )
    for m in members:
        if m.priority_type == "partner":
            if admin_role is None:
                continue
            m.role_id = admin_role.id
            members_admin += 1
        else:
            if viewer_role is None:
                continue
            m.role_id = viewer_role.id
            members_viewer += 1
        db.add(m)

    return {
        "roles_filled": roles_filled,
        "roles_created": roles_created,
        "members_assigned_viewer": members_viewer,
        "members_assigned_admin": members_admin,
    }


def _notify_owner_in_app(db: Session, company, plan: dict, applied: dict) -> bool:
    """Create the tenant-owner in-app notice todo. Idempotent via title prefix.

    Only called when something was actually defaulted to read-only, per D7
    decision 2 ("the tenant owner is notified in-app").
    """
    affected = (
        len(plan["viewer_fallback_roles"])
        + len(plan["members_to_viewer"])
    )
    if affected <= 0:
        return False
    owner_team = (
        db.query(models.CompanyTeam)
        .filter(
            models.CompanyTeam.company_id == company.id,
            models.CompanyTeam.priority_type == "partner",
        )
        .first()
    )
    if owner_team is None:
        return False
    already = (
        db.query(models.Todo)
        .filter(
            models.Todo.company_id == company.id,
            models.Todo.title.like(_OWNER_NOTICE_TITLE_PREFIX + "%"),
        )
        .first()
    )
    if already is not None:
        return False
    fallback_roles = ", ".join(plan["viewer_fallback_roles"]) or "none"
    todo = models.Todo(
        company_id=company.id,
        title=(
            f"{_OWNER_NOTICE_TITLE_PREFIX}: {affected} item(s) set to read-only "
            f"(Viewer). Roles defaulted: {fallback_roles}. "
            f"Members without a role now on Viewer: {len(plan['members_to_viewer'])}. "
            "Review Settings > Roles to grant more access."
        ),
        type="system",
    )
    db.add(todo)
    db.flush()
    db.add(models.TodoAssignee(todo_id=todo.id, assignee_id=owner_team.id))
    return True


@router.post("/backfill-role-permissions")
def backfill_role_permissions_d7(
    dry_run: bool = False,
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin_secret),
):
    """D7 (R2-073/R2-113/R2-169): backfill role permissions from the presets.

    For every company, roles whose permission dict is empty/unset are filled
    from DEFAULT_ROLE_PRESETS; names matching no preset fall back to Viewer.
    CompanyTeam rows with a NULL role_id are assigned Admin (partners) or
    Viewer (non-partners). Configured roles are never touched.

    Pass dry_run=true to print the resulting per-tenant matrix and write
    NOTHING (the session is rolled back). Run the dry run first and eyeball
    the matrix before applying; re-running the apply is a no-op.

    Enforcement itself does NOT flip here: it stays fail-open until
    RBAC_EMPTY_PERMS_POLICY is changed (globally or per company), so this
    migration can land safely ahead of the behaviour change.
    """
    companies = db.query(models.Company).all()
    totals = {
        "companies_processed": 0,
        "roles_created": 0,
        "roles_filled": 0,
        "members_assigned_viewer": 0,
        "members_assigned_admin": 0,
        "owners_notified": 0,
    }
    matrix = []
    for company in companies:
        plan = _plan_role_backfill(db, company)
        plan_copy = {
            k: (list(v) if isinstance(v, list) else v) for k, v in plan.items()
        }
        applied_counts = {"roles_filled": 0, "roles_created": 0,
                          "members_assigned_viewer": 0, "members_assigned_admin": 0}
        owners_notified = False
        if not dry_run:
            applied_counts = _apply_role_backfill(db, company, plan)
            owners_notified = _notify_owner_in_app(db, company, plan, applied_counts)
        totals["roles_filled"] += applied_counts["roles_filled"]
        totals["roles_created"] += applied_counts["roles_created"]
        totals["members_assigned_viewer"] += applied_counts["members_assigned_viewer"]
        totals["members_assigned_admin"] += applied_counts["members_assigned_admin"]
        totals["owners_notified"] += 1 if owners_notified else 0
        totals["companies_processed"] += 1
        matrix.append({"plan": plan_copy, "applied": applied_counts,
                       "owner_notified": owners_notified})

    if dry_run:
        # Defensive: make sure a dry run can never persist anything.
        db.rollback()
    else:
        db.commit()

    print("[backfill-role-permissions] dry_run=%s companies=%d" % (dry_run, len(companies)))
    for entry in matrix:
        print("[backfill-role-permissions] %s (%s): %s"
              % (entry["plan"]["company_name"], entry["plan"]["company_id"],
                 entry["plan"]))
    return {"dry_run": dry_run, **totals, "matrix": matrix}


class RbacFailClosedUpdate(BaseModel):
    # True closes this tenant, False pins legacy fail-open for it, None clears
    # the override (inherit again). Meaningful while RBAC_EMPTY_PERMS_POLICY is
    # "per_company"; the global modes override all tenant values.
    fail_closed: Optional[bool] = None


@router.get("/rbac-fail-closed/{company_id}")
def get_rbac_fail_closed(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin_secret),
):
    """Inspect the D7 fail-closed switch for one tenant."""
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    return {
        "company_id": str(company.id),
        "global_policy": settings.RBAC_EMPTY_PERMS_POLICY,
        "company_override": company.permissions_fail_closed,
        "effective_fail_closed": empty_permissions_fail_closed(db, company.id),
    }


@router.put("/rbac-fail-closed/{company_id}")
def set_rbac_fail_closed(
    company_id: uuid.UUID,
    payload: RbacFailClosedUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(_require_admin_secret),
):
    """Flip the D7 fail-closed switch per tenant without a deploy."""
    company = db.query(models.Company).filter(models.Company.id == company_id).first()
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    company.permissions_fail_closed = payload.fail_closed
    db.commit()
    db.refresh(company)
    return {
        "company_id": str(company.id),
        "global_policy": settings.RBAC_EMPTY_PERMS_POLICY,
        "company_override": company.permissions_fail_closed,
        "effective_fail_closed": empty_permissions_fail_closed(db, company.id),
    }
