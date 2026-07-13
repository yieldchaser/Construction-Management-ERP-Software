from uuid import UUID
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_access, get_company_membership
from app.models import (
    WorkOrder, CompanyTeam, SubcontractorPerformance,
    BOCWRecord, MusterRoll, Bill, User
)
from pydantic import BaseModel
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
    workers_present: int
    workers_absent: int
    hours_worked: float
    overtime_hours: float = 0.0
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
            r.contractor_name,
            r.month_year,
            r.workers_count,
            float(r.wages_paid),
            float(r.contribution_amount),
            r.acknowledgement_number or "",
            r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=bocw_export_{project_id}.csv"}
    )


# --- Muster Roll ---

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
def create_muster_roll(req: MusterRollCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, req.company_id)
    record = MusterRoll(
        company_id=req.company_id,
        project_id=req.project_id,
        contractor_id=req.contractor_id,
        date=req.date,
        labor_role=req.labor_role,
        workers_present=req.workers_present,
        workers_absent=req.workers_absent,
        hours_worked=req.hours_worked,
        overtime_hours=req.overtime_hours,
        notes=req.notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
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
