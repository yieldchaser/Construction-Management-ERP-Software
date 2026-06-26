# -*- coding: utf-8 -*-
"""
Phase 12 — Equipment & Machinery Tracking Router
"""

import uuid
from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models import Equipment, EquipmentDeployment, FuelLog, MaintenanceSchedule, Project

router = APIRouter(prefix="/equipment", tags=["Equipment & Machinery Tracking"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class EquipmentCreate(BaseModel):
    company_id: uuid.UUID
    name: str
    code: str
    category: str
    ownership_type: str = Field(..., pattern="^(Owned|Hired)$")
    hourly_rate: float = 0.0


class EquipmentResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    code: str
    category: str
    ownership_type: str
    status: str
    hourly_rate: float
    created_at: datetime

    class Config:
        from_attributes = True


class DeploymentCreate(BaseModel):
    project_id: uuid.UUID
    start_date: datetime
    remarks: Optional[str] = None


class DeploymentResponse(BaseModel):
    id: uuid.UUID
    equipment_id: uuid.UUID
    project_id: uuid.UUID
    start_date: datetime
    end_date: Optional[datetime]
    remarks: Optional[str]

    class Config:
        from_attributes = True


class FuelLogCreate(BaseModel):
    project_id: uuid.UUID
    logged_date: datetime
    liters: float
    cost_per_liter: float
    odometer_hours: Optional[float] = None
    remarks: Optional[str] = None


class FuelLogResponse(BaseModel):
    id: uuid.UUID
    equipment_id: uuid.UUID
    project_id: uuid.UUID
    logged_date: datetime
    liters: float
    cost_per_liter: float
    total_cost: float
    odometer_hours: Optional[float]
    remarks: Optional[str]

    class Config:
        from_attributes = True


class MaintenanceCreate(BaseModel):
    service_type: str
    scheduled_date: datetime
    cost: Optional[float] = 0.0
    status: str = Field("scheduled", pattern="^(scheduled|completed|overdue)$")
    remarks: Optional[str] = None


class MaintenanceResponse(BaseModel):
    id: uuid.UUID
    equipment_id: uuid.UUID
    service_type: str
    scheduled_date: datetime
    completed_date: Optional[datetime]
    cost: float
    status: str
    remarks: Optional[str]

    class Config:
        from_attributes = True


# ─── Fleet Endpoints ─────────────────────────────────────────────────────────

@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
def add_equipment(payload: EquipmentCreate, db: Session = Depends(get_db)):
    # Check if code already exists
    existing = db.query(Equipment).filter(Equipment.code == payload.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Equipment code already exists")
    
    data = payload.model_dump()
    data["hourly_rate"] = Decimal(str(data["hourly_rate"]))
    eq = Equipment(**data)
    db.add(eq)
    db.commit()
    db.refresh(eq)
    return eq


@router.get("/{company_id}", response_model=List[EquipmentResponse])
def list_fleet(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(Equipment).filter(Equipment.company_id == company_id).order_by(Equipment.created_at.desc()).all()


# ─── Deployment Endpoints ────────────────────────────────────────────────────

@router.post("/{equipment_id}/deploy", response_model=DeploymentResponse, status_code=status.HTTP_201_CREATED)
def deploy_equipment(
    equipment_id: uuid.UUID,
    payload: DeploymentCreate,
    db: Session = Depends(get_db)
):
    eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    proj = db.query(Project).filter(Project.id == payload.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    # Set any current active deployments to finished
    active = db.query(EquipmentDeployment).filter(
        EquipmentDeployment.equipment_id == equipment_id,
        EquipmentDeployment.end_date == None
    ).all()
    for dep in active:
        dep.end_date = payload.start_date

    new_dep = EquipmentDeployment(
        equipment_id=equipment_id,
        project_id=payload.project_id,
        start_date=payload.start_date,
        remarks=payload.remarks
    )
    eq.status = "deployed"
    db.add(new_dep)
    db.commit()
    db.refresh(new_dep)
    return new_dep


@router.get("/deployments/{project_id}", response_model=List[DeploymentResponse])
def list_deployments(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(EquipmentDeployment).filter(
        EquipmentDeployment.project_id == project_id
    ).order_by(EquipmentDeployment.start_date.desc()).all()


# ─── Fuel Logging Endpoints ──────────────────────────────────────────────────

@router.post("/{equipment_id}/fuel", response_model=FuelLogResponse, status_code=status.HTTP_201_CREATED)
def log_fuel(
    equipment_id: uuid.UUID,
    payload: FuelLogCreate,
    db: Session = Depends(get_db)
):
    eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")

    data = payload.model_dump()
    total_cost = data["liters"] * data["cost_per_liter"]
    
    # Convert floats to Decimal for database
    db_data = {
        "equipment_id": equipment_id,
        "project_id": data["project_id"],
        "logged_date": data["logged_date"],
        "liters": Decimal(str(data["liters"])),
        "cost_per_liter": Decimal(str(data["cost_per_liter"])),
        "total_cost": Decimal(str(total_cost)),
        "odometer_hours": Decimal(str(data["odometer_hours"])) if data["odometer_hours"] is not None else None,
        "remarks": data["remarks"]
    }

    log = FuelLog(**db_data)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/fuel-logs/{project_id}", response_model=List[FuelLogResponse])
def list_fuel_logs(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(FuelLog).filter(
        FuelLog.project_id == project_id
    ).order_by(FuelLog.logged_date.desc()).all()


# ─── Maintenance Endpoints ───────────────────────────────────────────────────

@router.post("/{equipment_id}/maintenance", response_model=MaintenanceResponse, status_code=status.HTTP_201_CREATED)
def schedule_maintenance(
    equipment_id: uuid.UUID,
    payload: MaintenanceCreate,
    db: Session = Depends(get_db)
):
    eq = db.query(Equipment).filter(Equipment.id == equipment_id).first()
    if not eq:
        raise HTTPException(status_code=404, detail="Equipment not found")

    data = payload.model_dump()
    db_data = {
        "equipment_id": equipment_id,
        "service_type": data["service_type"],
        "scheduled_date": data["scheduled_date"],
        "cost": Decimal(str(data["cost"] or 0.0)),
        "status": data["status"],
        "remarks": data["remarks"]
    }

    if data["status"] == "completed":
        db_data["completed_date"] = datetime.utcnow()
        eq.status = "available"
    elif data["status"] in ("scheduled", "overdue"):
        eq.status = "maintenance"

    sched = MaintenanceSchedule(**db_data)
    db.add(sched)
    db.commit()
    db.refresh(sched)
    return sched


@router.get("/maintenance-schedules/{equipment_id}", response_model=List[MaintenanceResponse])
def list_maintenance_schedules(equipment_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(MaintenanceSchedule).filter(
        MaintenanceSchedule.equipment_id == equipment_id
    ).order_by(MaintenanceSchedule.scheduled_date.desc()).all()
