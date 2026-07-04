from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ProjectTower, ProjectBudget, PurchaseOrder, Bill, WorkOrder
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/towers",
    tags=["Multi-Tower / Phase Support"]
)


# --- Schemas ---
class ProjectTowerResponse(BaseModel):
    id: UUID
    project_id: UUID
    tower_name: str
    tower_code: str
    status: str
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: float
    created_at: datetime

    class Config:
        from_attributes = True


class TowerCreateRequest(BaseModel):
    project_id: UUID
    tower_name: str = Field(..., example="Tower A")
    tower_code: str = Field(..., example="TA")
    status: str = "Ongoing"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    budget: float = 0.0


class ConsolidatedPNLItem(BaseModel):
    tower_id: UUID
    tower_name: str
    tower_code: str
    total_po_value: float
    total_billed: float
    total_wo_value: float
    budget: float
    variance: float


# --- Endpoints ---

@router.get("/{project_id}", response_model=List[ProjectTowerResponse])
def list_towers(project_id: UUID, db: Session = Depends(get_db)):
    towers = db.query(ProjectTower).filter(ProjectTower.project_id == project_id).all()
    return [
        ProjectTowerResponse(
            id=t.id,
            project_id=t.project_id,
            tower_name=t.tower_name,
            tower_code=t.tower_code,
            status=t.status,
            start_date=t.start_date,
            end_date=t.end_date,
            budget=float(t.budget),
            created_at=t.created_at,
        ) for t in towers
    ]


@router.post("/", response_model=ProjectTowerResponse, status_code=201)
def create_tower(req: TowerCreateRequest, db: Session = Depends(get_db)):
    tower = ProjectTower(
        project_id=req.project_id,
        tower_name=req.tower_name,
        tower_code=req.tower_code,
        status=req.status,
        start_date=req.start_date,
        end_date=req.end_date,
        budget=req.budget,
    )
    db.add(tower)
    db.commit()
    db.refresh(tower)
    return ProjectTowerResponse(
        id=tower.id,
        project_id=tower.project_id,
        tower_name=tower.tower_name,
        tower_code=tower.tower_code,
        status=tower.status,
        start_date=tower.start_date,
        end_date=tower.end_date,
        budget=float(tower.budget),
        created_at=tower.created_at,
    )


@router.get("/{project_id}/consolidated-pnl", response_model=List[ConsolidatedPNLItem])
def consolidated_pnl(project_id: UUID, tower_id: Optional[UUID] = Query(None), db: Session = Depends(get_db)):
    towers = db.query(ProjectTower).filter(ProjectTower.project_id == project_id).all()

    if not towers:
        budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == project_id).first()
        if budget:
            total_pos = db.query(PurchaseOrder).filter(PurchaseOrder.project_id == project_id).count()
            pos_value = db.query(PurchaseOrder).filter(PurchaseOrder.project_id == project_id).all()
            total_po_value = sum(float(p.total_amount) for p in pos_value)
            bills = db.query(Bill).filter(Bill.project_id == project_id).all()
            total_billed = sum(float(b.total_payable) for b in bills)
            wos = db.query(WorkOrder).filter(WorkOrder.project_id == project_id).all()
            total_wo_value = sum(float(w.estimated_work_amount) for w in wos)
            return [ConsolidatedPNLItem(
                tower_id=UUID("00000000-0000-0000-0000-000000000000"),
                tower_name="Overall Project",
                tower_code="ALL",
                total_po_value=total_po_value,
                total_billed=total_billed,
                total_wo_value=total_wo_value,
                budget=float(budget.subcon_budget) + float(budget.material_budget) + float(budget.labour_budget) + float(budget.equipment_budget),
                variance=0.0,
            )]
        return []

    result = []
    for t in towers:
        if tower_id and t.id != tower_id:
            continue
        pos = db.query(PurchaseOrder).filter(PurchaseOrder.project_id == project_id).all()
        total_po_value = sum(float(p.total_amount) for p in pos)
        bills = db.query(Bill).filter(Bill.project_id == project_id).all()
        total_billed = sum(float(b.total_payable) for b in bills)
        wos = db.query(WorkOrder).filter(WorkOrder.project_id == project_id).all()
        total_wo_value = sum(float(w.estimated_work_amount) for w in wos)

        result.append(ConsolidatedPNLItem(
            tower_id=t.id,
            tower_name=t.tower_name,
            tower_code=t.tower_code,
            total_po_value=total_po_value,
            total_billed=total_billed,
            total_wo_value=total_wo_value,
            budget=float(t.budget),
            variance=float(t.budget) - total_billed,
        ))
    return result
