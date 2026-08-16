import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.auth import get_current_user, verify_company_access, require_permission
from app.models import AssetDepreciationSchedule, AssetDepreciationEntry, Equipment, User
from decimal import Decimal

router = APIRouter(prefix="/assets", tags=["Asset Depreciation"], dependencies=[Depends(get_current_user)])


class DepreciationScheduleCreate(BaseModel):
    company_id: uuid.UUID
    asset_id: uuid.UUID
    method: str = Field("straight_line", pattern="^(straight_line|wdv)$")
    useful_life_years: int = Field(..., gt=0)
    salvage_value: float = Field(0.0, ge=0)
    depreciation_pct: float = Field(10.0, ge=0, le=100)
    start_date: datetime


class DepreciationScheduleResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    asset_id: uuid.UUID
    method: str
    useful_life_years: int
    salvage_value: float
    depreciation_pct: float
    start_date: datetime
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DepreciationEntryCreate(BaseModel):
    company_id: uuid.UUID
    schedule_id: uuid.UUID
    asset_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    entry_date: datetime
    depreciation_amount: float = Field(..., ge=0)
    accumulated_depreciation: float = Field(..., ge=0)
    book_value: float = Field(..., ge=0)
    notes: Optional[str] = None


class DepreciationEntryResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    schedule_id: uuid.UUID
    asset_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    entry_date: datetime
    depreciation_amount: float
    accumulated_depreciation: float
    book_value: float
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/schedules", response_model=DepreciationScheduleResponse, status_code=status.HTTP_201_CREATED)
def create_schedule(payload: DepreciationScheduleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_permission(db, current_user, payload.company_id, "finance:edit")
    data = payload.model_dump()
    for k in ("salvage_value", "depreciation_pct"):
        data[k] = Decimal(str(data[k]))
    schedule = AssetDepreciationSchedule(**data)
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


@router.get("/schedules/{company_id}", response_model=List[DepreciationScheduleResponse])
def list_schedules(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(AssetDepreciationSchedule).filter(
        AssetDepreciationSchedule.company_id == company_id,
        AssetDepreciationSchedule.is_active == True
    ).all()


@router.post("/entries", response_model=DepreciationEntryResponse, status_code=status.HTTP_201_CREATED)
def create_entry(payload: DepreciationEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_permission(db, current_user, payload.company_id, "finance:edit")
    schedule = db.query(AssetDepreciationSchedule).filter(
        AssetDepreciationSchedule.id == payload.schedule_id,
        AssetDepreciationSchedule.company_id == payload.company_id,
        AssetDepreciationSchedule.asset_id == payload.asset_id,
    ).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    prior = (
        db.query(AssetDepreciationEntry)
        .filter(
            AssetDepreciationEntry.schedule_id == payload.schedule_id,
            AssetDepreciationEntry.asset_id == payload.asset_id,
        )
        .order_by(AssetDepreciationEntry.entry_date.desc())
        .first()
    )
    if prior and payload.entry_date <= prior.entry_date:
        raise HTTPException(status_code=400, detail="entry_date must be after the prior entry's date")
    dep = Decimal(str(payload.depreciation_amount))
    acc = Decimal(str(payload.accumulated_depreciation))
    bv = Decimal(str(payload.book_value))
    if prior:
        cents = Decimal("0.01")
        prev_acc = Decimal(str(prior.accumulated_depreciation)).quantize(cents)
        prev_bv = Decimal(str(prior.book_value)).quantize(cents)
        if acc.quantize(cents) != (prev_acc + dep).quantize(cents):
            raise HTTPException(status_code=400, detail="accumulated_depreciation must equal the prior accumulated total plus this period's depreciation_amount")
        if bv.quantize(cents) != (prev_bv - dep).quantize(cents):
            raise HTTPException(status_code=400, detail="book_value must equal the prior book value minus this period's depreciation_amount")
    if bv < Decimal(str(schedule.salvage_value)):
        raise HTTPException(status_code=400, detail="book_value cannot fall below the schedule's salvage_value")
    data = payload.model_dump()
    for k in ("depreciation_amount", "accumulated_depreciation", "book_value"):
        data[k] = Decimal(str(data[k]))
    entry = AssetDepreciationEntry(**data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.get("/entries/{company_id}", response_model=List[DepreciationEntryResponse])
def list_entries(company_id: uuid.UUID, asset_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    query = db.query(AssetDepreciationEntry).filter(AssetDepreciationEntry.company_id == company_id)
    if asset_id:
        query = query.filter(AssetDepreciationEntry.asset_id == asset_id)
    return query.order_by(AssetDepreciationEntry.entry_date.desc()).all()
