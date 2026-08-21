import csv
import io
import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_access, get_company_membership, require_permission, require_module_view
from app.models import DailyProgressReport, Task, WarehouseInventory, MaterialTransaction, Project, User
from app.workflow_controls import enforce_entry_creation_window
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/dpr",
    tags=["Daily Progress Reports (DPR)"],
    dependencies=[Depends(get_current_user)]
)

class MaterialConsumptionSchema(BaseModel):
    material_name: str
    quantity: float = Field(..., gt=0)
    unit: str

class DPRCreateRequest(BaseModel):
    project_id: uuid.UUID
    task_id: Optional[uuid.UUID] = None
    reported_by: str
    dpr_date: datetime
    weather: str = "Clear"
    executed_qty: float = Field(..., ge=0)
    workers_deployed: int = Field(0, ge=0)
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
def create_dpr(req: DPRCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project_uuid = uuid.UUID(str(req.project_id))
    project = db.query(Project).filter(Project.id == project_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "projects:edit")

    # Workflow Controls: Entry Controls (creation date window)
    enforce_entry_creation_window(db, project.company_id, req.dpr_date)

    existing = db.query(DailyProgressReport).filter(
        DailyProgressReport.project_id == project_uuid,
        func.date(DailyProgressReport.dpr_date) == req.dpr_date.date(),
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A Daily Progress Report already exists for this project on this date",
        )

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
def get_dprs(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    project_uuid = uuid.UUID(str(project_id))
    return db.query(DailyProgressReport).filter(
        DailyProgressReport.project_id == project_uuid
    ).order_by(DailyProgressReport.dpr_date.desc()).all()

@router.get("/summary")
def get_dpr_summary(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    project_uuid = uuid.UUID(str(project_id))
    dprs = db.query(DailyProgressReport).filter(DailyProgressReport.project_id == project_uuid).all()
    
    total_workers = sum(d.workers_deployed for d in dprs)
    activities_count = len(dprs)
    flagged_issues = [
        {"date": d.dpr_date.isoformat() if hasattr(d.dpr_date, 'isoformat') else str(d.dpr_date), "reporter": d.reported_by, "issue": d.issues}
        for d in dprs if d.issues and d.issues.strip()
    ]
    
    # Average completion from the maintained per-task progress field
    tasks = db.query(Task).filter(Task.project_id == project_uuid).all()
    avg_completion = (sum(float(t.progress or 0) for t in tasks) / len(tasks)) if tasks else 0
    
    return {
        "activities_tracked": activities_count,
        "total_workers_deployed": total_workers,
        "avg_completion": round(avg_completion, 1),
        "issues_flagged": len(flagged_issues),
        "flagged_issues_list": flagged_issues
    }

@router.get("/export")
def export_dpr_csv(
    project_id: Optional[uuid.UUID] = None,
    company_id: Optional[uuid.UUID] = None,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export DPR entries as a CSV attachment (company-wide or per-project, optional date range).

    Tenant-guarded: resolves the owning company from project_id or company_id, then enforces
    membership + the projects module view permission. Read-only.
    """
    if project_id:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        cid = project.company_id
    elif company_id:
        cid = company_id
    else:
        raise HTTPException(status_code=400, detail="Provide project_id or company_id")

    get_company_membership(db, current_user, cid)
    require_module_view(db, current_user, cid, "projects")

    query = db.query(DailyProgressReport)
    if project_id:
        query = query.filter(DailyProgressReport.project_id == project_id)
    else:
        proj_ids = db.query(Project.id).filter(Project.company_id == cid).subquery()
        query = query.filter(DailyProgressReport.project_id.in_(proj_ids))

    if from_date:
        try:
            fd = datetime.strptime(from_date, "%Y-%m-%d")
            query = query.filter(DailyProgressReport.dpr_date >= fd)
        except ValueError:
            raise HTTPException(status_code=400, detail="from_date must be YYYY-MM-DD")
    if to_date:
        try:
            td = datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(DailyProgressReport.dpr_date < td)
        except ValueError:
            raise HTTPException(status_code=400, detail="to_date must be YYYY-MM-DD")

    reports = query.order_by(DailyProgressReport.dpr_date.desc()).all()

    columns = [
        "Date", "Project", "Author", "Executed Qty", "Work Done",
        "Labour Count", "Materials", "Remarks", "Status",
    ]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(columns)
    for d in reports:
        project = db.query(Project).filter(Project.id == d.project_id).first()
        mats = d.materials_consumed or []
        mat_str = "; ".join(
            f"{m.get('material_name')} {m.get('quantity')} {m.get('unit') or ''}".strip()
            for m in mats
        )
        author = d.reported_by or ""
        if author:
            try:
                author_uuid = uuid.UUID(author)
            except ValueError:
                pass
            else:
                user = db.query(User).filter(User.id == author_uuid).first()
                author = user.name if user else "Unknown"
        else:
            author = "Unknown"
        writer.writerow([
            d.dpr_date.strftime("%Y-%m-%d") if d.dpr_date else "",
            project.name if project else "",
            author,
            float(d.executed_qty or 0),
            d.notes or "",
            d.workers_deployed or 0,
            mat_str,
            d.issues or "",
            d.status or "",
        ])
    csv_text = buf.getvalue()
    scope = str(project_id) if project_id else f"company-{cid}"
    filename = f"dpr-{scope}-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )
