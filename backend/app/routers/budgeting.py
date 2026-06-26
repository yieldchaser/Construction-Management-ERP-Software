import io
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from openpyxl import load_workbook
from app.database import get_db
from app.models import BOQItem, ProjectBudget, Project
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/budgeting",
    tags=["Budgeting & BOQ"]
)

class BOQItemResponse(BaseModel):
    id: UUID
    project_id: UUID
    section_name: Optional[str] = None
    item_name: str
    unit: str
    quantity: float
    rate: float
    supply_rate: float
    installation_rate: float
    amount: float
    quantity_float_limit: int

    class Config:
        from_attributes = True

class BudgetAllocationRequest(BaseModel):
    project_id: UUID
    material_budget: float = 0.0
    labour_budget: float = 0.0
    subcon_budget: float = 0.0
    equipment_budget: float = 0.0

class BudgetResponse(BaseModel):
    id: UUID
    project_id: UUID
    material_budget: float
    labour_budget: float
    subcon_budget: float
    equipment_budget: float

    class Config:
        from_attributes = True

@router.get("/boq", response_model=List[BOQItemResponse])
def get_boq_items(project_id: UUID, db: Session = Depends(get_db)):
    # Check if project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    items = db.query(BOQItem).filter(BOQItem.project_id == project_id).all()
    # Cast Numeric types to floats for response model compatibility
    result = []
    for item in items:
        result.append(BOQItemResponse(
            id=item.id,
            project_id=item.project_id,
            section_name=item.section_name,
            item_name=item.item_name,
            unit=item.unit,
            quantity=float(item.quantity),
            rate=float(item.rate),
            supply_rate=float(item.supply_rate),
            installation_rate=float(item.installation_rate),
            amount=float(item.amount or 0.0) if item.amount is not None else float(item.quantity) * (float(item.rate) + float(item.supply_rate) + float(item.installation_rate)),
            quantity_float_limit=item.quantity_float_limit
        ))
    return result

@router.post("/boq/import", status_code=status.HTTP_201_CREATED)
async def import_boq(
    project_id: UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not file.filename.endswith(('.xlsx', '.xlsm')):
        raise HTTPException(status_code=400, detail="Only .xlsx or .xlsm Excel files are supported")

    try:
        contents = await file.read()
        wb = load_workbook(filename=io.BytesIO(contents), read_only=True)
        sheet = wb.active
        if not sheet:
            raise HTTPException(status_code=400, detail="Excel file is empty")

        # Parse header row (assume first row has headers)
        headers = {}
        header_row = next(sheet.iter_rows(values_only=True))
        for idx, val in enumerate(header_row):
            if val:
                headers[str(val).strip().lower()] = idx

        # Required columns check
        name_col = next((headers[k] for k in ["item_name", "item", "description", "name"] if k in headers), None)
        qty_col = next((headers[k] for k in ["qty", "quantity"] if k in headers), None)
        unit_col = headers.get("unit")
        rate_col = next((headers[k] for k in ["rate", "unit_rate"] if k in headers), None)
        
        # Optional split rates
        supply_rate_col = headers.get("supply_rate")
        install_rate_col = next((headers[k] for k in ["installation_rate", "install_rate"] if k in headers), None)
        section_col = next((headers[k] for k in ["section", "section_name"] if k in headers), None)

        if name_col is None or qty_col is None or unit_col is None or (rate_col is None and supply_rate_col is None):
            raise HTTPException(
                status_code=400,
                detail="Invalid headers. Excel must contain: Description/Item Name, Qty, Unit, and Rate (or Supply Rate)."
            )

        imported_count = 0
        total_amount = 0.0

        # Iterate rows
        is_first = True
        for row in sheet.iter_rows(values_only=True):
            if is_first:
                is_first = False
                continue

            item_name = row[name_col]
            if not item_name:
                continue # Skip blank lines

            qty_val = row[qty_col]
            unit_val = row[unit_col]
            rate_val = row[rate_col] if rate_col is not None else 0.0
            supply_val = row[supply_rate_col] if supply_rate_col is not None else 0.0
            install_val = row[install_rate_col] if install_rate_col is not None else 0.0

            try:
                quantity = float(qty_val) if qty_val is not None else 0.0
                rate = float(rate_val) if rate_val is not None else 0.0
                supply_rate = float(supply_val) if supply_val is not None else 0.0
                installation_rate = float(install_val) if install_val is not None else 0.0
            except ValueError:
                continue # Skip rows with non-numeric qty/rates

            section_name = str(row[section_col]).strip() if (section_col is not None and row[section_col]) else None
            unit = str(unit_val).strip() if unit_val else "Nos"

            # Enforce quantity float limit (rounding base)
            float_limit = 2
            if unit.lower() in ("kg", "ton", "t", "steel"):
                float_limit = 3
            elif unit.lower() in ("no", "nos", "brick", "bag", "bags"):
                float_limit = 0

            quantity = round(quantity, float_limit)
            amount = quantity * (rate + supply_rate + installation_rate)
            total_amount += amount

            boq_item = BOQItem(
                project_id=project_id,
                section_name=section_name,
                item_name=str(item_name).strip(),
                unit=unit,
                quantity=quantity,
                rate=rate,
                supply_rate=supply_rate,
                installation_rate=installation_rate,
                quantity_float_limit=float_limit,
                amount=amount
            )
            db.add(boq_item)
            imported_count += 1

        db.commit()
        return {
            "success": True,
            "imported_count": imported_count,
            "total_estimated_cost": total_amount
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Import failed: {str(e)}")

@router.post("/allocation", response_model=BudgetResponse)
def allocate_project_budgets(
    request: BudgetAllocationRequest,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == request.project_id).first()
    if not budget:
        budget = ProjectBudget(project_id=request.project_id)
        db.add(budget)

    budget.material_budget = request.material_budget
    budget.labour_budget = request.labour_budget
    budget.subcon_budget = request.subcon_budget
    budget.equipment_budget = request.equipment_budget

    db.commit()
    db.refresh(budget)
    return budget
