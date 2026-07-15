import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.auth import get_current_user, verify_project_access, get_company_membership, require_permission
from app.models import MaterialWastage, User
from decimal import Decimal

router = APIRouter(prefix="/wastage", tags=["Material Wastage & Scrap"], dependencies=[Depends(get_current_user)])


class MaterialWastageCreate(BaseModel):
    company_id: uuid.UUID
    project_id: uuid.UUID
    material_name: str
    wastage_type: str
    quantity: float = Field(..., ge=0)
    unit: str
    estimated_value: float = Field(0.0, ge=0)
    reason: Optional[str] = None
    reported_by: Optional[str] = None
    photo_urls: List[str] = []
    task_id: Optional[uuid.UUID] = None


class MaterialWastageResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    material_name: str
    wastage_type: str
    quantity: float
    unit: str
    estimated_value: float
    reason: Optional[str]
    reported_by: Optional[str]
    photo_urls: List[str]
    task_id: Optional[uuid.UUID]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=MaterialWastageResponse, status_code=status.HTTP_201_CREATED)
def create_wastage(payload: MaterialWastageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    require_permission(db, current_user, payload.company_id, "procurement:edit")
    data = payload.model_dump()
    data["estimated_value"] = Decimal(str(data["estimated_value"]))
    wastage = MaterialWastage(**data)
    db.add(wastage)
    db.commit()
    db.refresh(wastage)
    return wastage


@router.get("/{project_id}", response_model=List[MaterialWastageResponse])
def list_wastage(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    return db.query(MaterialWastage).filter(
        MaterialWastage.project_id == project_id
    ).order_by(MaterialWastage.created_at.desc()).all()


@router.patch("/{wastage_id}/status", response_model=MaterialWastageResponse)
def update_wastage_status(wastage_id: uuid.UUID, status: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wastage = db.query(MaterialWastage).filter(MaterialWastage.id == wastage_id).first()
    if not wastage:
        raise HTTPException(status_code=404, detail="Wastage record not found")
    get_company_membership(db, current_user, wastage.company_id)
    require_permission(db, current_user, wastage.company_id, "procurement:edit")
    wastage.status = status
    db.commit()
    db.refresh(wastage)
    return wastage
