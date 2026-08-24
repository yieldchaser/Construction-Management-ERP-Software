from uuid import UUID
from datetime import date, datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.auth import get_current_user, verify_project_access
from app.models import (
    PurchaseOrder, Bill, WorkOrder, WorkOrderItem,
    ProjectTower, ProjectBudget, PayrollRun, PayrollLineItem,
    Equipment, EquipmentDeployment, FuelLog, MaterialWastage
)
from pydantic import BaseModel
from app.bill_scope import _active_bills
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
    other_actual: float = 0.0
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
    # A missing budget row is reported as zeros in memory; a read must never
    # persist anything (R2-152).
    budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == project_id).first()
    if not budget:
        budget = ProjectBudget(
            project_id=project_id,
            material_budget=0.0,
            labour_budget=0.0,
            subcon_budget=0.0,
            equipment_budget=0.0,
        )

    pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.project_id == project_id,
        PurchaseOrder.status.in_(("sent", "partial", "received")),
    ).all()
    material_committed = sum(float(p.total_amount) for p in pos)

    # Only approved, non-cancelled bills are actual spend (R2-233): an
    # unapproved bill must not book cost the moment it is typed.
    bills_expense = _active_bills(db, project_id, EXPENSE_INVOICE_TYPES).filter(
        Bill.approval_flag == "approved",
    ).all()
    material_actual = 0.0
    subcon_actual = 0.0
    equipment_bill_total = 0.0
    other_actual = 0.0
    for b in bills_expense:
        amount = float(b.total_payable or 0.0)
        if b.invoice_type == "purchase":
            material_actual += amount
        elif b.invoice_type == "subcon":
            subcon_actual += amount
        elif b.invoice_type == "equipment":
            equipment_bill_total += amount
        else:
            other_actual += amount

    wastage_actual = float(
        db.query(func.sum(MaterialWastage.estimated_value)).filter(
            MaterialWastage.project_id == project_id
        ).scalar() or 0.0
    )
    material_actual += wastage_actual

    wos = db.query(WorkOrder).filter(
        WorkOrder.project_id == project_id,
        WorkOrder.status != "cancelled",
    ).all()
    subcon_committed = sum(float(w.estimated_work_amount) for w in wos)

    labour_committed = 0.0
    labour_actual = float(db.query(func.sum(PayrollLineItem.net_payable)).join(PayrollRun).filter(PayrollRun.project_id == project_id).scalar() or 0.0)

    equipment_committed = 0.0
    deployments = db.query(EquipmentDeployment).filter(EquipmentDeployment.project_id == project_id).all()
    dep_cost = 0.0
    for dep in deployments:
        eq = db.query(Equipment).filter(Equipment.id == dep.equipment_id).first()
        if eq and eq.hourly_rate:
            rate = float(eq.hourly_rate)
            # R2-727: same aware/naive normalization as finance.py (Postgres
            # returns aware datetimes, SQLite naive); never mix them.
            start = dep.start_date
            if start.tzinfo is None:
                start = start.replace(tzinfo=timezone.utc)
            end = dep.end_date if dep.end_date else datetime.now(timezone.utc)
            if end.tzinfo is None:
                end = end.replace(tzinfo=timezone.utc)
            hours = (end - start).total_seconds() / 3600.0
            dep_cost += max(0.0, hours * rate)
    fuel_cost = float(db.query(func.sum(FuelLog.total_cost)).filter(FuelLog.project_id == project_id).scalar() or 0.0)
    equipment_actual = equipment_bill_total + dep_cost + fuel_cost

    total_budget = (
        float(budget.material_budget) +
        float(budget.labour_budget) +
        float(budget.subcon_budget) +
        float(budget.equipment_budget)
    )
    total_committed = material_committed + labour_committed + subcon_committed + equipment_committed
    total_actual = material_actual + labour_actual + subcon_actual + equipment_actual + other_actual

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
        other_actual=other_actual,
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
        # Active bills only: a cancelled bill must not book cost (R2-723).
        bills = _active_bills(db, project_id, EXPENSE_INVOICE_TYPES).all()
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
    # Active bills only: a cancelled bill must not book cost (R2-723).
    bills = _active_bills(db, project_id, EXPENSE_INVOICE_TYPES).all()
    actual = sum(float(b.total_payable) for b in bills)
    pos = db.query(PurchaseOrder).filter(
        PurchaseOrder.project_id == project_id,
        PurchaseOrder.status.in_(("sent", "partial", "received")),
    ).all()
    po_committed = sum(float(p.total_amount) for p in pos)
    for t in towers:
        result.append(TowerBudgetBreakdown(
            tower_id=t.id,
            tower_name=f"{t.tower_name} ({t.tower_code})",
            budget=float(t.budget),
            committed=po_committed,
            actual=actual,
            variance=float(t.budget) - actual,
        ))
    return result
