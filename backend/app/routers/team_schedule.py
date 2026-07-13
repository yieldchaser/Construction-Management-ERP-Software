from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.auth import get_current_user, verify_company_access, get_company_membership
from app import models
from app.models import User


router = APIRouter(
    prefix="/team-schedule",
    tags=["Team Schedule"],
    dependencies=[Depends(get_current_user)],
)


# ─── Schemas ───────────────────────────────────────────────────────────────────
class TimesheetCreate(BaseModel):
    company_id: UUID
    party_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    entry_date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    remarks: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None


class TimesheetResponse(BaseModel):
    id: UUID
    company_id: UUID
    party_id: Optional[UUID] = None
    party_name: Optional[str] = None
    project_id: Optional[UUID] = None
    project_name: Optional[str] = None
    entry_date: datetime
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    remarks: Optional[str] = None
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Helpers ───────────────────────────────────────────────────────────────────
def _serialize(row: models.TeamScheduleTimesheet, db: Session) -> TimesheetResponse:
    party = db.query(models.LibraryParty).filter(models.LibraryParty.id == row.party_id).first() if row.party_id else None
    project = db.query(models.Project).filter(models.Project.id == row.project_id).first() if row.project_id else None
    return TimesheetResponse(
        id=row.id,
        company_id=row.company_id,
        party_id=row.party_id,
        party_name=row.party_name or (party.name if party else None),
        project_id=row.project_id,
        project_name=project.name if project else None,
        entry_date=row.entry_date,
        start_time=row.start_time,
        end_time=row.end_time,
        duration_minutes=row.duration_minutes,
        remarks=row.remarks,
        file_url=row.file_url,
        file_name=row.file_name,
        created_at=row.created_at,
    )


def _compute_duration(start: Optional[datetime], end: Optional[datetime]) -> Optional[int]:
    if not start or not end:
        return None
    seconds = (end - start).total_seconds()
    if seconds < 0:
        seconds += 24 * 3600  # wrap-around past midnight
    return int(round(seconds / 60))


# ─── Endpoints ─────────────────────────────────────────────────────────────────
@router.get("/timesheets", response_model=List[TimesheetResponse])
def list_timesheets(
    company_id: UUID,
    party_id: Optional[UUID] = None,
    project_id: Optional[UUID] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    _: None = Depends(verify_company_access),
):
    q = db.query(models.TeamScheduleTimesheet).filter(
        models.TeamScheduleTimesheet.company_id == company_id
    )
    if party_id:
        q = q.filter(models.TeamScheduleTimesheet.party_id == party_id)
    if project_id:
        q = q.filter(models.TeamScheduleTimesheet.project_id == project_id)
    if date_from:
        q = q.filter(models.TeamScheduleTimesheet.entry_date >= date_from)
    if date_to:
        q = q.filter(models.TeamScheduleTimesheet.entry_date <= date_to)
    if search:
        like = f"%{search}%"
        q = q.filter(
            (models.TeamScheduleTimesheet.remarks.ilike(like))
            | (models.TeamScheduleTimesheet.party_name.ilike(like))
        )
    rows = q.order_by(models.TeamScheduleTimesheet.entry_date.desc()).all()
    return [_serialize(r, db) for r in rows]


@router.post("/timesheets", response_model=TimesheetResponse, status_code=status.HTTP_201_CREATED)
def create_timesheet(payload: TimesheetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    party_name = None
    if payload.party_id:
        party = db.query(models.LibraryParty).filter(models.LibraryParty.id == payload.party_id).first()
        party_name = party.name if party else None

    row = models.TeamScheduleTimesheet(
        company_id=payload.company_id,
        party_id=payload.party_id,
        party_name=party_name,
        project_id=payload.project_id,
        entry_date=payload.entry_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        duration_minutes=_compute_duration(payload.start_time, payload.end_time),
        remarks=payload.remarks,
        file_url=payload.file_url,
        file_name=payload.file_name,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _serialize(row, db)


@router.get("/timesheets/{timesheet_id}", response_model=TimesheetResponse)
def get_timesheet(timesheet_id: UUID, db: Session = Depends(get_db)):
    row = db.query(models.TeamScheduleTimesheet).filter(
        models.TeamScheduleTimesheet.id == timesheet_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    return _serialize(row, db)


@router.delete("/timesheets/{timesheet_id}", status_code=status.HTTP_200_OK)
def delete_timesheet(timesheet_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    row = db.query(models.TeamScheduleTimesheet).filter(
        models.TeamScheduleTimesheet.id == timesheet_id
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    get_company_membership(db, current_user, row.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, row.company_id, "timesheet", row.id, f"Timesheet: {row.party_name or row.id}", party_name=row.party_name)
    except Exception:
        pass
    db.delete(row)
    db.commit()
    return {"success": True, "message": "Timesheet deleted successfully"}
