from uuid import UUID
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_in_company, verify_project_access, get_company_membership, require_permission
from app.models import (
    WorkOrder, CompanyTeam, SubcontractorPerformance,
    BOCWRecord, MusterRoll, Bill, User,
    AttendanceLog, SubcontractorAttendance
)
from pydantic import BaseModel, Field
import csv
import io

router = APIRouter(
    prefix="/labour",
    tags=["Labour Management"],
    dependencies=[Depends(get_current_user)]
)


def _resolve_contractor_name(db: Session, contractor_id: Optional[UUID]) -> str:
    if not contractor_id:
        return "Unknown"
    team = db.query(CompanyTeam).filter(CompanyTeam.id == contractor_id).first()
    if not team:
        return "Unknown"
    user = db.query(User).filter(User.id == team.user_id).first()
    return user.name if user and user.name else "Unknown"


_CSV_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def _csv_safe_cell(value):
    # R2-185: a cell whose text begins with = + - @ TAB or CR is executed as a
    # formula when the statutory CSV is opened in Excel/LibreOffice/Sheets.
    # Prefix a single quote so the value is treated as text; everything else
    # passes through untouched.
    if isinstance(value, str) and value.startswith(_CSV_FORMULA_PREFIXES):
        return "'" + value
    return value


# --- Schemas ---
class ReliabilityResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    contractor_id: UUID
    contractor_name: str = "Unknown"
    period_start: datetime
    period_end: datetime
    on_time_pct: float
    billing_accuracy_pct: float
    quality_score: float
    tasks_completed: int
    tasks_delayed: int
    total_billed: float
    disputes_count: int

    class Config:
        from_attributes = True


class BOCWResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    contractor_id: Optional[UUID] = None
    contractor_name: str
    month_year: str
    workers_count: int
    wages_paid: float
    contribution_amount: float
    acknowledgement_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BOCWCreate(BaseModel):
    company_id: UUID
    project_id: UUID
    contractor_id: Optional[UUID] = None
    contractor_name: str
    month_year: str  # YYYY-MM
    workers_count: int = Field(0, ge=0)
    wages_paid: float = Field(0.0, ge=0)
    contribution_amount: float = Field(0.0, ge=0)
    acknowledgement_number: Optional[str] = None


class MusterRollResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    contractor_id: Optional[UUID] = None
    date: str
    labor_role: str
    workers_present: int
    workers_absent: int
    hours_worked: float
    overtime_hours: float
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class MusterRollCreate(BaseModel):
    company_id: UUID
    project_id: UUID
    contractor_id: Optional[UUID] = None
    date: datetime
    labor_role: str
    # R2-507: every figure is optional; anything left None is derived for the
    # site-day from the punch screen (AttendanceLog) and the crew drawer
    # (SubcontractorAttendance) so a diligent site never re-keys the register.
    workers_present: Optional[int] = Field(None, ge=0)
    workers_absent: Optional[int] = Field(None, ge=0)
    hours_worked: Optional[float] = Field(None, ge=0)
    overtime_hours: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None


# --- Contractor Reliability ---

@router.get("/reliability/{project_id}", response_model=List[ReliabilityResponse])
def get_reliability(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    scorecards = db.query(SubcontractorPerformance).filter(
        SubcontractorPerformance.project_id == project_id
    ).all()

    result = []
    for sc in scorecards:
        result.append(ReliabilityResponse(
            id=sc.id,
            company_id=sc.company_id,
            project_id=sc.project_id,
            contractor_id=sc.subcontractor_id,
            contractor_name=_resolve_contractor_name(db, sc.subcontractor_id),
            period_start=sc.period_start,
            period_end=sc.period_end,
            on_time_pct=float(sc.on_time_pct),
            billing_accuracy_pct=float(sc.billing_accuracy_pct),
            quality_score=float(sc.quality_score),
            tasks_completed=sc.tasks_completed,
            tasks_delayed=sc.tasks_delayed,
            total_billed=float(sc.total_billed),
            disputes_count=sc.disputes_count,
        ))
    return result


# --- BOCW Records ---

@router.get("/bocw/{project_id}", response_model=List[BOCWResponse])
def get_bocw(project_id: UUID, month_year: Optional[str] = None, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    query = db.query(BOCWRecord).filter(BOCWRecord.project_id == project_id)
    if month_year:
        query = query.filter(BOCWRecord.month_year == month_year)
    records = query.all()
    return [
        BOCWResponse(
            id=r.id,
            company_id=r.company_id,
            project_id=r.project_id,
            contractor_id=r.contractor_id,
            contractor_name=r.contractor_name,
            month_year=r.month_year,
            workers_count=r.workers_count,
            wages_paid=float(r.wages_paid),
            contribution_amount=float(r.contribution_amount),
            acknowledgement_number=r.acknowledgement_number,
            created_at=r.created_at,
        ) for r in records
    ]


@router.get("/bocw/{project_id}/export")
def export_bocw(project_id: UUID, month_year: Optional[str] = None, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    query = db.query(BOCWRecord).filter(BOCWRecord.project_id == project_id)
    if month_year:
        query = query.filter(BOCWRecord.month_year == month_year)
    records = query.all()

    if not records:
        raise HTTPException(status_code=404, detail="No BOCW records found")

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Contractor Name", "Month-Year", "Workers Count", "Wages Paid",
        "Contribution Amount", "Acknowledgement Number", "Created At"
    ])
    for r in records:
        writer.writerow([
            _csv_safe_cell(r.contractor_name),
            _csv_safe_cell(r.month_year),
            r.workers_count,
            float(r.wages_paid),
            float(r.contribution_amount),
            _csv_safe_cell(r.acknowledgement_number or ""),
            r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bocw_export_{project_id}.csv"}
    )


@router.post("/bocw", response_model=BOCWResponse, status_code=201)
def create_bocw(req: BOCWCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, req.company_id)
    verify_project_in_company(db, req.project_id, req.company_id)
    require_permission(db, current_user, req.company_id, "attendance:edit")
    if req.wages_paid > 0 and req.workers_count <= 0:
        raise HTTPException(status_code=422, detail="workers_count must be greater than zero when wages are recorded")
    record = BOCWRecord(
        company_id=req.company_id,
        project_id=req.project_id,
        contractor_id=req.contractor_id,
        contractor_name=req.contractor_name,
        month_year=req.month_year,
        workers_count=req.workers_count,
        wages_paid=req.wages_paid,
        contribution_amount=req.contribution_amount,
        acknowledgement_number=req.acknowledgement_number,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return BOCWResponse(
        id=record.id,
        company_id=record.company_id,
        project_id=record.project_id,
        contractor_id=record.contractor_id,
        contractor_name=record.contractor_name,
        month_year=record.month_year,
        workers_count=record.workers_count,
        wages_paid=float(record.wages_paid),
        contribution_amount=float(record.contribution_amount),
        acknowledgement_number=record.acknowledgement_number,
        created_at=record.created_at,
    )


# --- Muster Roll ---

def _derive_day_figures(db: Session, project_id: UUID, day):
    """R2-507: compute (present, absent, hours, overtime) for one project-day
    from the sources the product already holds - employee punches
    (AttendanceLog) and subcontractor crew counts (SubcontractorAttendance).
    Returns None when the day has no source rows at all."""
    logs = [
        a for a in db.query(AttendanceLog).filter(AttendanceLog.project_id == project_id).all()
        if a.attendance_date.date() == day
    ]
    crews = [
        s for s in db.query(SubcontractorAttendance).filter(SubcontractorAttendance.project_id == project_id).all()
        if s.attendance_date.date() == day
    ]
    if not logs and not crews:
        return None
    present = sum(1 for a in logs if (a.status or "") != "Absent")
    absent = sum(1 for a in logs if (a.status or "") == "Absent")
    hours = round(float(sum(float(a.hours_worked or 0) for a in logs)), 2)
    overtime = round(
        float(sum(float(a.overtime_hours or 0) for a in logs))
        + float(sum(float(s.overtime_hours or 0) for s in crews)),
        2,
    )
    # A crew row is that many workers on site, not one person.
    present += int(sum(int(s.worker_count or 0) for s in crews))
    return present, absent, hours, overtime


@router.get("/muster-roll/{project_id}", response_model=List[MusterRollResponse])
def get_muster_roll(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    records = db.query(MusterRoll).filter(MusterRoll.project_id == project_id).all()
    return [
        MusterRollResponse(
            id=r.id,
            company_id=r.company_id,
            project_id=r.project_id,
            contractor_id=r.contractor_id,
            date=r.date.strftime("%Y-%m-%d") if r.date else "",
            labor_role=r.labor_role,
            workers_present=r.workers_present,
            workers_absent=r.workers_absent,
            hours_worked=float(r.hours_worked),
            overtime_hours=float(r.overtime_hours),
            notes=r.notes,
        ) for r in records
    ]


@router.post("/muster-roll", response_model=MusterRollResponse, status_code=201)
def create_muster_roll(req: MusterRollCreate, response: Response, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, req.company_id)
    verify_project_in_company(db, req.project_id, req.company_id)
    require_permission(db, current_user, req.company_id, "attendance:edit")
    date_only = req.date.date()
    # R2-507: omitted figures are derived from attendance data instead of
    # forcing a hand-typed statutory register.
    workers_present = req.workers_present
    workers_absent = req.workers_absent
    hours_worked = req.hours_worked
    overtime_hours = req.overtime_hours
    if any(v is None for v in (workers_present, workers_absent, hours_worked, overtime_hours)):
        derived = _derive_day_figures(db, req.project_id, date_only)
        if derived is None:
            raise HTTPException(
                status_code=422,
                detail="no attendance data for this day to derive the muster roll from; supply the figures explicitly",
            )
        d_present, d_absent, d_hours, d_overtime = derived
        if workers_present is None:
            workers_present = d_present
        if workers_absent is None:
            workers_absent = d_absent
        if hours_worked is None:
            hours_worked = d_hours
        if overtime_hours is None:
            overtime_hours = d_overtime
    if hours_worked > workers_present * 24:
        raise HTTPException(status_code=422, detail="hours_worked cannot exceed workers_present × 24")
    if overtime_hours > hours_worked:
        raise HTTPException(status_code=422, detail="overtime_hours cannot exceed hours_worked")
    # R2-333: the muster roll is a statutory register; re-posting the same
    # gang for the same day (double-tap, retry after timeout, two supervisors)
    # must update one row in place instead of recording the workers twice.
    # Idempotency key follows the subcon precedent (R2-332): project +
    # contractor + calendar day + role compared trimmed and case-insensitively.
    role_key = req.labor_role.strip().lower()
    existing = db.query(MusterRoll).filter(MusterRoll.project_id == req.project_id).all()
    record = None
    for item in existing:
        if (
            item.date.date() == date_only
            and item.contractor_id == req.contractor_id
            and (item.labor_role or "").strip().lower() == role_key
        ):
            record = item
            break
    is_update = record is not None
    if not is_update:
        record = MusterRoll(
            company_id=req.company_id,
            project_id=req.project_id,
            contractor_id=req.contractor_id,
            date=req.date,
            labor_role=req.labor_role.strip(),
        )
        db.add(record)
    record.workers_present = workers_present
    record.workers_absent = workers_absent
    record.hours_worked = hours_worked
    record.overtime_hours = overtime_hours
    record.notes = req.notes
    db.commit()
    db.refresh(record)
    if is_update:
        # An idempotent replay returns 200; only a fresh insert is 201.
        response.status_code = status.HTTP_200_OK
    return MusterRollResponse(
        id=record.id,
        company_id=record.company_id,
        project_id=record.project_id,
        contractor_id=record.contractor_id,
        date=record.date.strftime("%Y-%m-%d") if record.date else "",
        labor_role=record.labor_role,
        workers_present=record.workers_present,
        workers_absent=record.workers_absent,
        hours_worked=float(record.hours_worked),
        overtime_hours=float(record.overtime_hours),
        notes=record.notes,
    )
