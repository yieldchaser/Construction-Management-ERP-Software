"""
Competitor Parity — Delete Logs (Audit Trail of Deleted Records)
Company-level, read-only audit view of deletions across the platform.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
import uuid

from app.database import get_db
from app.auth import get_current_user, get_company_membership
from app.models import DeleteLog, User

router = APIRouter(tags=["Delete Logs"], dependencies=[Depends(get_current_user)])


# ─── Helpers ─────────────────────────────────────────────────────────────────

def log_deletion(
    db: Session,
    company_id,
    entity_type: str,
    entity_id,
    summary: str,
    party_name: str = None,
    deleted_by: str = None,
):
    """Queue an audit log row on the caller's session. The caller's commit
    persists it in the same transaction as the deletion, so either both land
    or neither does; a failure here aborts the caller's delete."""
    cid = uuid.UUID(str(company_id)) if company_id else None
    log = DeleteLog(
        company_id=cid,
        entity_type=entity_type,
        entity_id=str(entity_id),
        entity_summary=summary,
        party_name=party_name,
        deleted_by=deleted_by,
    )
    db.add(log)


def _serialize(l: DeleteLog) -> dict:
    return {
        "id": str(l.id),
        "company_id": str(l.company_id) if l.company_id else None,
        "entity_type": l.entity_type,
        "entity_id": l.entity_id,
        "entity_summary": l.entity_summary,
        "party_name": l.party_name,
        "deleted_by": l.deleted_by,
        "deleted_at": l.deleted_at.isoformat() if l.deleted_at else None,
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/{company_id}")
def list_delete_logs(
    company_id: uuid.UUID,
    entity_type: str = None,
    party: str = None,
    from_date: str = None,
    to_date: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List deletion logs for a company, with optional filters."""
    get_company_membership(db, current_user, company_id)
    query = db.query(DeleteLog).filter(DeleteLog.company_id == company_id)
    if entity_type:
        query = query.filter(DeleteLog.entity_type == entity_type)
    if party:
        query = query.filter(DeleteLog.party_name.ilike(f"%{party}%"))
    if from_date:
        try:
            query = query.filter(DeleteLog.deleted_at >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            query = query.filter(DeleteLog.deleted_at <= datetime.fromisoformat(to_date))
        except ValueError:
            pass
    records = query.order_by(DeleteLog.deleted_at.desc()).all()
    return [_serialize(r) for r in records]


@router.delete("/{company_id}/{log_id}")
def purge_delete_log(
    company_id: uuid.UUID,
    log_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Permanently purge a single delete-log entry."""
    get_company_membership(db, current_user, company_id)
    log = (
        db.query(DeleteLog)
        .filter(DeleteLog.id == log_id, DeleteLog.company_id == company_id)
        .first()
    )
    if not log:
        raise HTTPException(status_code=404, detail="Delete log not found.")
    db.delete(log)
    db.commit()
    return {"message": "Delete log purged successfully.", "id": str(log.id)}
