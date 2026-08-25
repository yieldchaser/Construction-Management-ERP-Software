import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.auth import get_current_user, verify_project_access, get_company_membership, require_permission
from app.models import SubcontractorAttendance, Project, User, CompanyTeam
from app.workflow_controls import enforce_entry_creation_window, enforce_entry_editing_window

router = APIRouter(prefix="/subcon", tags=["Subcontractor Attendance"], dependencies=[Depends(get_current_user)])

class SubconAttendanceCreate(BaseModel):
    project_id: uuid.UUID
    subcontractor_id: uuid.UUID
    attendance_date: datetime
    labor_role: str
    worker_count: int = Field(..., ge=0)
    shift_multiplier: float = Field(1.0, ge=0.5, le=3.0)
    overtime_hours: float = Field(0.0, ge=0)
    allowance: float = Field(0.0, ge=0)
    deduction: float = Field(0.0, ge=0)
    notes: Optional[str] = None
    photo_url: Optional[str] = None

class SubconAttendanceResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    subcontractor_id: uuid.UUID
    attendance_date: datetime
    labor_role: str
    worker_count: int
    shift_multiplier: float
    overtime_hours: float
    allowance: float
    deduction: float
    notes: Optional[str]
    photo_url: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("/attendance", response_model=SubconAttendanceResponse, status_code=status.HTTP_201_CREATED)
def create_subcon_attendance(payload: SubconAttendanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "attendance:edit")
    # Workflow Controls: Entry Controls — this endpoint is the primary input to a
    # subcontractor's RA bill, so a back-dated attendance must obey the company's
    # creation window (R2-477) exactly like DPR/billing/planning entries.
    enforce_entry_creation_window(db, project.company_id, payload.attendance_date)
    subcontractor = db.query(CompanyTeam).filter(CompanyTeam.id == payload.subcontractor_id).first()
    if not subcontractor or subcontractor.company_id != project.company_id:
        raise HTTPException(status_code=403, detail="Subcontractor does not belong to this company")
    if payload.worker_count <= 0 and (payload.overtime_hours > 0 or payload.allowance > 0):
        raise HTTPException(status_code=422, detail="worker_count must be greater than zero when overtime or allowance is recorded")
    if payload.overtime_hours > payload.worker_count * 12:
        raise HTTPException(status_code=422, detail="overtime_hours cannot exceed 12 per worker per day")
    # Check if entry already exists for subcontractor, date, and role
    # R2-332: labor_role is free text; the idempotency key must be trimmed and
    # case-insensitive so "Mason", "mason" and "Mason " resolve to one crew.
    date_only = payload.attendance_date.date()
    role_key = payload.labor_role.strip().lower()
    existing = db.query(SubcontractorAttendance).filter(
        SubcontractorAttendance.project_id == payload.project_id,
        SubcontractorAttendance.subcontractor_id == payload.subcontractor_id,
    ).all()

    # Filter by date and normalized role
    for item in existing:
        if item.attendance_date.date() == date_only and (item.labor_role or "").strip().lower() == role_key:
            # Upsert onto an already-old row is an edit of a dated record and
            # must obey the editing window too (R2-477).
            enforce_entry_editing_window(db, project.company_id, item.attendance_date)
            item.worker_count = payload.worker_count
            item.shift_multiplier = payload.shift_multiplier
            item.overtime_hours = payload.overtime_hours
            item.allowance = payload.allowance
            item.deduction = payload.deduction
            item.notes = payload.notes
            if payload.photo_url:
                item.photo_url = payload.photo_url
            db.commit()
            db.refresh(item)
            return item
            
    data = payload.model_dump()
    data["labor_role"] = data["labor_role"].strip()
    log = SubcontractorAttendance(**data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("/attendance/{project_id}/{date_str}", response_model=List[SubconAttendanceResponse])
def get_subcon_attendance(project_id: uuid.UUID, date_str: str, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="date_str must be YYYY-MM-DD")
        
    logs = db.query(SubcontractorAttendance).filter(
        SubcontractorAttendance.project_id == project_id
    ).all()
    
    # Filter in python to make it SQLite and Postgres date-agnostic
    return [log for log in logs if log.attendance_date.date() == target]
