from uuid import UUID
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth import get_current_user, verify_project_access
from app.models import (
    PurchaseOrder, Bill, WorkOrder, WorkOrderItem,
    ProjectTower, ProjectBudget
)
from pydantic import BaseModel
from app.constants import EXPENSE_INVOICE_TYPES

router = APIRouter(
    prefix="/budget",
    tags=["Budget & Committed Cost Tracking"],
    dependencies=[Depends(get_current_user)]
)


class CommittedCostItem(BaseModel):
    category: str
    committed_amount: float
    billed_amount: float
    actual_invoiced: float
    variance: float

    class Config:
        from_attributes = True


class BudgetWithCommitted(BaseModel):
    project_id: UUID
    material_budget: float
    labour_budget: float
    subcon_budget: float
    equipment_budget: float
    material_committed: float
    material_actual: float
    labour_committed: float
    labour_actual: float
    subcon_committed: float
    subcon_actual: float
    equipment_committed: float
    equipment_actual: float
    total_budget: float
    total_committed: float
    total_actual: float
    total_committed_variance: float
    total_variance: float


class TowerBudgetBreakdown(BaseModel):
    tower_id: Optional[UUID]
    tower_name: str
    budget: float
    committed: float
    actual: float
    variance: float


@router.get("/committed/{project_id}", response_model=BudgetWithCommitted)
def get_committed_costs(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == project_id).first()
    if not budget:
        budget = ProjectBudget(
            project_id=project_id,
            material_budget=0.0,
            labour_budget=0.0,
            subcon_budget=0.0,
            equipment_budget=0.0,
        )
        db.add(budget)
        db.commit()
        db.refresh(budget)

    pos = db.query(PurchaseOrder).filter(PurchaseOrder.project_id == project_id).all()
    material_committed = sum(float(p.total_amount) for p in pos if p.status not in ("closed",))

    bills_material = db.query(Bill).filter(
        Bill.project_id == project_id,
        Bill.invoice_type == "purchase"
    ).all()
    material_actual = sum(float(b.total_payable) for b in bills_material)

    wos = db.query(WorkOrder).filter(WorkOrder.project_id == project_id).all()
    subcon_committed = sum(float(w.estimated_work_amount) for w in wos)

    bills_subcon = db.query(Bill).filter(
        Bill.project_id == project_id,
        Bill.invoice_type == "subcon"
    ).all()
    subcon_actual = sum(float(b.total_payable) for b in bills_subcon)

    labour_committed = 0.0
    labour_actual = 0.0

    equipment_committed = 0.0
    equipment_actual = 0.0

    total_budget = (
        float(budget.material_budget) +
        float(budget.labour_budget) +
        float(budget.subcon_budget) +
        float(budget.equipment_budget)
    )
    total_committed = material_committed + labour_committed + subcon_committed + equipment_committed
    total_actual = material_actual + labour_actual + subcon_actual + equipment_actual

    return BudgetWithCommitted(
        project_id=project_id,
        material_budget=float(budget.material_budget),
        labour_budget=float(budget.labour_budget),
        subcon_budget=float(budget.subcon_budget),
        equipment_budget=float(budget.equipment_budget),
        material_committed=material_committed,
        material_actual=material_actual,
        labour_committed=labour_committed,
        labour_actual=labour_actual,
        subcon_committed=subcon_committed,
        subcon_actual=subcon_actual,
        equipment_committed=equipment_committed,
        equipment_actual=equipment_actual,
        total_budget=total_budget,
        total_committed=total_committed,
        total_actual=total_actual,
        total_committed_variance=total_budget - total_committed,
        total_variance=total_budget - total_actual,
    )


@router.get("/committed/{project_id}/towers", response_model=List[TowerBudgetBreakdown])
def get_tower_budget(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    towers = db.query(ProjectTower).filter(ProjectTower.project_id == project_id).all()
    if not towers:
        budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == project_id).first()
        total_budget = (
            float(budget.material_budget) + float(budget.labour_budget) +
            float(budget.subcon_budget) + float(budget.equipment_budget)
        ) if budget else 0.0
        pos = db.query(PurchaseOrder).filter(PurchaseOrder.project_id == project_id).all()
        committed = sum(float(p.total_amount) for p in pos)
        bills = db.query(Bill).filter(Bill.project_id == project_id).all()
        actual = sum(float(b.total_payable) for b in bills)
        return [TowerBudgetBreakdown(
            tower_id=None,
            tower_name="Overall Project",
            budget=total_budget,
            committed=committed,
            actual=actual,
            variance=total_budget - actual,
        )]

    result = []
    for t in towers:
        committed = float(t.budget)
        bills = db.query(Bill).filter(Bill.project_id == project_id).all()
        actual = sum(float(b.total_payable) for b in bills)
        result.append(TowerBudgetBreakdown(
            tower_id=t.id,
            tower_name=f"{t.tower_name} ({t.tower_code})",
            budget=float(t.budget),
            committed=committed,
            actual=actual,
            variance=float(t.budget) - actual,
        ))
    return result
