from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import (
    WorkOrder, WorkOrderAmendment, SubcontractorPerformance,
    WorkOrderItem, Bill, TransactionDeduction, CompanyTeam, User
)
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/subcon",
    tags=["Subcontractor Performance & Amendments"]
)


# --- Schemas ---
class AmendmentCreateRequest(BaseModel):
    amended_by: Optional[str] = None
    amended_fields: dict = Field(..., example={"rate": 1200.0, "quantity": 500.0})
    reason: Optional[str] = None


class AmendmentResponse(BaseModel):
    id: UUID
    wo_id: UUID
    amendment_number: int
    amended_fields: dict
    amended_by: Optional[str] = None
    amended_at: datetime
    reason: Optional[str] = None

    class Config:
        from_attributes = True


class ScorecardResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    subcontractor_id: UUID
    period_start: datetime
    period_end: datetime
    on_time_pct: float
    billing_accuracy_pct: float
    quality_score: float
    tasks_completed: int
    tasks_delayed: int
    total_billed: float
    disputes_count: int
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class ComparativeItem(BaseModel):
    subcontractor_id: UUID
    subcontractor_name: str = "Unknown"
    scorecard_count: int
    avg_on_time_pct: float
    avg_billing_accuracy_pct: float
    avg_quality_score: float
    total_tasks_completed: int
    total_tasks_delayed: int
    total_billed: float
    total_disputes: int


# --- Work Order Amendments ---

@router.get("/work-orders/{wo_id}/amendments", response_model=List[AmendmentResponse])
def get_amendments(wo_id: UUID, db: Session = Depends(get_db)):
    amendments = db.query(WorkOrderAmendment).filter(
        WorkOrderAmendment.wo_id == wo_id
    ).order_by(WorkOrderAmendment.amendment_number.desc()).all()
    return amendments


@router.post("/work-orders/{wo_id}/amendments", response_model=AmendmentResponse, status_code=201)
def create_amendment(wo_id: UUID, req: AmendmentCreateRequest, db: Session = Depends(get_db)):
    wo = db.query(WorkOrder).filter(WorkOrder.id == wo_id).first()
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")

    last = db.query(WorkOrderAmendment).filter(
        WorkOrderAmendment.wo_id == wo_id
    ).order_by(WorkOrderAmendment.amendment_number.desc()).first()

    next_number = (last.amendment_number + 1) if last else 1

    amendment = WorkOrderAmendment(
        wo_id=wo_id,
        amendment_number=next_number,
        amended_fields=req.amended_fields,
        amended_by=req.amended_by,
        reason=req.reason
    )
    db.add(amendment)
    db.commit()
    db.refresh(amendment)
    return amendment


# --- Performance Scorecards ---


def _resolve_subcontractor_name(db: Session, subcontractor_id: UUID) -> str:
    team = db.query(CompanyTeam).filter(CompanyTeam.id == subcontractor_id).first()
    if not team:
        return "Unknown"
    user = db.query(User).filter(User.id == team.user_id).first()
    return user.name if user and user.name else "Unknown"


@router.get("/scorecards/{project_id}", response_model=List[ScorecardResponse])
def get_scorecards(project_id: UUID, db: Session = Depends(get_db)):
    scorecards = db.query(SubcontractorPerformance).filter(
        SubcontractorPerformance.project_id == project_id
    ).all()
    return scorecards


@router.get("/scorecards/{project_id}/comparative", response_model=List[ComparativeItem])
def get_comparative(project_id: UUID, db: Session = Depends(get_db)):
    scorecards = db.query(SubcontractorPerformance).filter(
        SubcontractorPerformance.project_id == project_id
    ).all()

    grouped = {}
    for sc in scorecards:
        sub_id = str(sc.subcontractor_id)
        if sub_id not in grouped:
            grouped[sub_id] = {
                "subcontractor_id": sc.subcontractor_id,
                "subcontractor_name": _resolve_subcontractor_name(db, sc.subcontractor_id),
                "scorecard_count": 0,
                "sum_on_time": 0.0,
                "sum_billing_accuracy": 0.0,
                "sum_quality": 0.0,
                "total_tasks_completed": 0,
                "total_tasks_delayed": 0,
                "total_billed": 0.0,
                "total_disputes": 0,
            }
        g = grouped[sub_id]
        g["scorecard_count"] += 1
        g["sum_on_time"] += float(sc.on_time_pct)
        g["sum_billing_accuracy"] += float(sc.billing_accuracy_pct)
        g["sum_quality"] += float(sc.quality_score)
        g["total_tasks_completed"] += sc.tasks_completed
        g["total_tasks_delayed"] += sc.tasks_delayed
        g["total_billed"] += float(sc.total_billed)
        g["total_disputes"] += sc.disputes_count

    result = []
    for g in grouped.values():
        count = g["scorecard_count"]
        result.append(ComparativeItem(
            subcontractor_id=g["subcontractor_id"],
            subcontractor_name=g["subcontractor_name"],
            scorecard_count=count,
            avg_on_time_pct=round(g["sum_on_time"] / count, 2) if count else 0.0,
            avg_billing_accuracy_pct=round(g["sum_billing_accuracy"] / count, 2) if count else 0.0,
            avg_quality_score=round(g["sum_quality"] / count, 2) if count else 0.0,
            total_tasks_completed=g["total_tasks_completed"],
            total_tasks_delayed=g["total_tasks_delayed"],
            total_billed=round(g["total_billed"], 2),
            total_disputes=g["total_disputes"],
        ))
    return result
