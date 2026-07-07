"""
Phase 14 — Minutes of Meeting (MOM)
Router for logging and tracking meeting minutes per company/project site.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import cast
from sqlalchemy import Date as SA_Date
from app.database import get_db
from app.models import MoM, Project
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/mom", tags=["Minutes of Meeting"])


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class MoMCreate(BaseModel):
    project_id: Optional[str] = None
    type: str = "Regular"           # Regular, Review, Client Meeting, Internal
    status: str = "Open"            # Open, Closed, Action Pending
    attendees: List[str] = []
    notes: Optional[str] = None
    created_by: Optional[str] = None


class MoMUpdate(BaseModel):
    type: Optional[str] = None
    status: Optional[str] = None
    attendees: Optional[List[str]] = None
    notes: Optional[str] = None
    created_by: Optional[str] = None


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _serialize(m: MoM) -> dict:
    return {
        "id": str(m.id),
        "company_id": str(m.company_id),
        "project_id": str(m.project_id) if m.project_id else None,
        "type": m.type,
        "status": m.status,
        "attendees": m.attendees or [],
        "notes": m.notes,
        "created_by": m.created_by,
        "created_at": m.created_at.isoformat() if m.created_at else None,
    }


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.get("/{company_id}")
def list_mom(
    company_id: str,
    project_id: Optional[str] = None,
    status: Optional[str] = None,
    type: Optional[str] = None,
    attendee: Optional[str] = None,
    date: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """List MOM records for a company, with optional filters."""
    query = db.query(MoM).filter(MoM.company_id == uuid.UUID(company_id))
    if project_id:
        query = query.filter(MoM.project_id == uuid.UUID(project_id))
    if status:
        query = query.filter(MoM.status == status)
    if type:
        query = query.filter(MoM.type == type)
    if date:
        try:
            target = datetime.fromisoformat(date).date()
            query = query.filter(cast(MoM.created_at, SA_Date) == target)
        except ValueError:
            pass
    records = query.order_by(MoM.created_at.desc()).all()
    if attendee:
        records = [m for m in records if attendee in (m.attendees or [])]
    return [_serialize(m) for m in records]


@router.post("/{company_id}")
def create_mom(company_id: str, payload: MoMCreate, db: Session = Depends(get_db)):
    """Create a new MOM record."""
    mom = MoM(
        company_id=uuid.UUID(company_id),
        project_id=uuid.UUID(payload.project_id) if payload.project_id else None,
        type=payload.type,
        status=payload.status,
        attendees=payload.attendees or [],
        notes=payload.notes,
        created_by=payload.created_by,
    )
    db.add(mom)
    db.commit()
    db.refresh(mom)
    return {**_serialize(mom), "message": "MOM created successfully."}


@router.get("/{company_id}/{mom_id}")
def get_mom(company_id: str, mom_id: str, db: Session = Depends(get_db)):
    """Get a single MOM record by id."""
    mom = (
        db.query(MoM)
        .filter(MoM.id == uuid.UUID(mom_id), MoM.company_id == uuid.UUID(company_id))
        .first()
    )
    if not mom:
        raise HTTPException(status_code=404, detail="MOM not found.")
    return _serialize(mom)


@router.put("/{company_id}/{mom_id}")
def update_mom(company_id: str, mom_id: str, payload: MoMUpdate, db: Session = Depends(get_db)):
    """Update an existing MOM record."""
    mom = (
        db.query(MoM)
        .filter(MoM.id == uuid.UUID(mom_id), MoM.company_id == uuid.UUID(company_id))
        .first()
    )
    if not mom:
        raise HTTPException(status_code=404, detail="MOM not found.")
    if payload.type is not None:
        mom.type = payload.type
    if payload.status is not None:
        mom.status = payload.status
    if payload.attendees is not None:
        mom.attendees = payload.attendees
    if payload.notes is not None:
        mom.notes = payload.notes
    if payload.created_by is not None:
        mom.created_by = payload.created_by
    db.commit()
    db.refresh(mom)
    return {**_serialize(mom), "message": "MOM updated successfully."}


@router.delete("/{company_id}/{mom_id}")
def delete_mom(company_id: str, mom_id: str, db: Session = Depends(get_db)):
    """Delete a MOM record."""
    mom = (
        db.query(MoM)
        .filter(MoM.id == uuid.UUID(mom_id), MoM.company_id == uuid.UUID(company_id))
        .first()
    )
    if not mom:
        raise HTTPException(status_code=404, detail="MOM not found.")
    db.delete(mom)
    db.commit()
    return {"message": "MOM deleted successfully.", "id": str(mom.id)}
