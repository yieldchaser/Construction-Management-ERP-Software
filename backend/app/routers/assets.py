import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.auth import get_current_user, verify_company_access, require_permission
from app.models import AssetDepreciationSchedule, AssetDepreciationEntry, Equipment, User
from decimal import Decimal

router = APIRouter(prefix="/assets", tags=["Asset Depreciation"], dependencies=[Depends(get_current_user)])


def _aware_utc(dt: datetime) -> datetime:
    # R2-503: entry chaining compares the payload date against the stored
    # prior date; on SQLite the stored value comes back naive while payloads
    # carry +00:00, and a mixed-flavor comparison is a TypeError (500).
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


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
    if payload.method == "straight_line":
        max_pct = 100.0 / payload.useful_life_years
        if payload.salvage_value == 0 and round(payload.depreciation_pct, 2) != round(max_pct, 2):
            raise HTTPException(
                status_code=422,
                detail=f"straight_line depreciation_pct must be {max_pct:.2f}% (100 / useful_life_years) when salvage_value is 0",
            )
        if payload.salvage_value > 0 and payload.depreciation_pct >= max_pct:
            raise HTTPException(
                status_code=422,
                detail=f"straight_line depreciation_pct must be below {max_pct:.2f}% (100 / useful_life_years) when salvage_value > 0",
            )
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
    if prior and _aware_utc(payload.entry_date) <= _aware_utc(prior.entry_date):
        raise HTTPException(status_code=400, detail="entry_date must be after the prior entry's date")
    dep = Decimal(str(payload.depreciation_amount))
    acc = Decimal(str(payload.accumulated_depreciation))
    bv = Decimal(str(payload.book_value))
    cents = Decimal("0.01")
    if prior:
        prev_acc = Decimal(str(prior.accumulated_depreciation)).quantize(cents)
        prev_bv = Decimal(str(prior.book_value)).quantize(cents)
        if acc.quantize(cents) != (prev_acc + dep).quantize(cents):
            raise HTTPException(status_code=400, detail="accumulated_depreciation must equal the prior accumulated total plus this period's depreciation_amount")
        if bv.quantize(cents) != (prev_bv - dep).quantize(cents):
            raise HTTPException(status_code=400, detail="book_value must equal the prior book value minus this period's depreciation_amount")
        opening_bv = prev_bv
    else:
        if acc.quantize(cents) != dep.quantize(cents):
            raise HTTPException(status_code=400, detail="the first entry's accumulated_depreciation must equal its own depreciation_amount")
        opening_bv = (bv + acc).quantize(cents)
    if bv < Decimal(str(schedule.salvage_value)):
        raise HTTPException(status_code=400, detail="book_value cannot fall below the schedule's salvage_value")
    # R2-503: the schedule's own method/life/rate now bound what an entry may
    # book. No single dated entry may depreciate more than ONE YEAR's worth
    # under the declared schedule - straight_line allows at most
    # (cost - salvage) / useful_life_years, wdv at most the opening book value
    # x depreciation_pct - while shorter periods stay free to post smaller
    # amounts. Cost is reconstructed as book_value + accumulated_depreciation,
    # which the running identities above guarantee. Without this the three
    # numbers that ARE depreciation accounting were whatever the client sent,
    # and the schedule row constrained nothing.
    if dep > 0:
        implied_cost = (bv + acc).quantize(cents)
        if schedule.method == "wdv":
            period_cap = (
                Decimal(str(opening_bv)) * Decimal(str(schedule.depreciation_pct)) / Decimal("100")
            ).quantize(cents)
            cap_label = f"{schedule.depreciation_pct}% of the opening book value"
        else:
            depreciable = implied_cost - Decimal(str(schedule.salvage_value))
            period_cap = (depreciable / Decimal(schedule.useful_life_years)).quantize(cents)
            cap_label = f"(cost - salvage) / {schedule.useful_life_years} years"
        if dep.quantize(cents) > period_cap:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"depreciation_amount {dep.quantize(cents)} exceeds one year under the declared "
                    f"{schedule.method} schedule ({cap_label} = {period_cap}); split it across periods "
                    f"or correct the schedule"
                ),
            )
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
