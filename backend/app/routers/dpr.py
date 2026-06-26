import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DailyProgressReport, Task, WarehouseInventory, MaterialTransaction, Project
from pydantic import BaseModel

router = APIRouter(
    prefix="/dpr",
    tags=["Daily Progress Reports (DPR)"]
)

class MaterialConsumptionSchema(BaseModel):
    material_name: str
    quantity: float
    unit: str

class DPRCreateRequest(BaseModel):
    project_id: uuid.UUID
    task_id: Optional[uuid.UUID] = None
    reported_by: str
    dpr_date: datetime
    weather: str = "Clear"
    executed_qty: float
    workers_deployed: int = 0
    materials_consumed: List[MaterialConsumptionSchema] = []
    photos: List[str] = []
    notes: Optional[str] = None
    issues: Optional[str] = None

class DPRResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    task_id: Optional[uuid.UUID] = None
    reported_by: str
    dpr_date: datetime
    weather: str
    executed_qty: float
    workers_deployed: int
    materials_consumed: List[MaterialConsumptionSchema]
    photos: List[str]
    notes: Optional[str] = None
    issues: Optional[str] = None
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

@router.post("", response_model=DPRResponse, status_code=status.HTTP_201_CREATED)
def create_dpr(req: DPRCreateRequest, db: Session = Depends(get_db)):
    project_uuid = uuid.UUID(str(req.project_id))
    project = db.query(Project).filter(Project.id == project_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    task_uuid = None
    if req.task_id:
        task_uuid = uuid.UUID(str(req.task_id))
        task = db.query(Task).filter(Task.id == task_uuid).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        # Update task status on progress update
        if task.status == "not_started":
            task.status = "in_progress"
            db.add(task)

    # Convert Pydantic schemas to dict list for JSONB column
    materials_list = [mat.dict() for mat in req.materials_consumed]

    dpr = DailyProgressReport(
        id=uuid.uuid4(),
        project_id=project_uuid,
        task_id=task_uuid,
        reported_by=req.reported_by,
        dpr_date=req.dpr_date,
        weather=req.weather,
        executed_qty=req.executed_qty,
        workers_deployed=req.workers_deployed,
        materials_consumed=materials_list,
        photos=req.photos,
        notes=req.notes,
        issues=req.issues,
        status="submitted"
    )
    db.add(dpr)
    db.flush()

    # Process material consumption state updates
    for mat in req.materials_consumed:
        inv = db.query(WarehouseInventory).filter(
            WarehouseInventory.project_id == project_uuid,
            WarehouseInventory.material_name == mat.material_name
        ).first()

        if inv:
            inv.on_hand_qty = float(inv.on_hand_qty) - mat.quantity
            db.add(inv)
        else:
            # Create a warehouse row even if it has negative balance (allow workflow flexibility)
            new_inv = WarehouseInventory(
                id=uuid.uuid4(),
                project_id=project_uuid,
                material_name=mat.material_name,
                on_hand_qty=-mat.quantity,
                reserved_qty=0.0,
                unit=mat.unit
            )
            db.add(new_inv)

        # Log to material transactions ledger
        txn = MaterialTransaction(
            id=uuid.uuid4(),
            project_id=project_uuid,
            material_name=mat.material_name,
            qty=mat.quantity,
            type="used",
            source_ref_id=dpr.id
        )
        db.add(txn)

    db.commit()
    db.refresh(dpr)
    return dpr

@router.get("", response_model=List[DPRResponse])
def get_dprs(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project_uuid = uuid.UUID(str(project_id))
    return db.query(DailyProgressReport).filter(
        DailyProgressReport.project_id == project_uuid
    ).order_by(DailyProgressReport.dpr_date.desc()).all()

@router.get("/summary")
def get_dpr_summary(project_id: uuid.UUID, db: Session = Depends(get_db)):
    project_uuid = uuid.UUID(str(project_id))
    dprs = db.query(DailyProgressReport).filter(DailyProgressReport.project_id == project_uuid).all()
    
    total_workers = sum(d.workers_deployed for d in dprs)
    activities_count = len(dprs)
    flagged_issues = [
        {"date": d.dpr_date.isoformat() if hasattr(d.dpr_date, 'isoformat') else str(d.dpr_date), "reporter": d.reported_by, "issue": d.issues}
        for d in dprs if d.issues and d.issues.strip()
    ]
    
    # Calculate average completion based on tasks completed vs planned in the project
    tasks = db.query(Task).filter(Task.project_id == project_uuid).all()
    completed_tasks = sum(1 for t in tasks if t.status == "completed")
    avg_completion = (completed_tasks / len(tasks) * 100) if tasks else 0
    
    return {
        "activities_tracked": activities_count,
        "total_workers_deployed": total_workers,
        "avg_completion": round(avg_completion, 1),
        "issues_flagged": len(flagged_issues),
        "flagged_issues_list": flagged_issues
    }
