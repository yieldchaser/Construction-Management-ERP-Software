import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Company, CompanyBranch, ApprovalRule, Holiday

router = APIRouter(prefix="/settings", tags=["Settings & Configurations"])


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class CompanySettingsResponse(BaseModel):
    id: uuid.UUID
    name: str
    legal_business_name: Optional[str]
    gstin: Optional[str]
    billing_address: Optional[str]
    currency_decimal_places: int
    quantity_decimal_places: int
    back_dated_limit_days: int
    negative_stock_lock: bool
    bom_restriction: bool
    po_restriction: bool
    material_request_restriction: bool
    negative_balance_warning: bool
    custom_pdf_template_enabled: bool
    google_sheets_auth_phone: Optional[str]

    class Config:
        from_attributes = True


class CompanySettingsUpdate(BaseModel):
    legal_business_name: Optional[str] = None
    gstin: Optional[str] = None
    billing_address: Optional[str] = None
    currency_decimal_places: Optional[int] = None
    quantity_decimal_places: Optional[int] = None
    back_dated_limit_days: Optional[int] = None
    negative_stock_lock: Optional[bool] = None
    bom_restriction: Optional[bool] = None
    po_restriction: Optional[bool] = None
    material_request_restriction: Optional[bool] = None
    negative_balance_warning: Optional[bool] = None
    custom_pdf_template_enabled: Optional[bool] = None
    google_sheets_auth_phone: Optional[str] = None


class BranchCreate(BaseModel):
    branch_name: str
    gstin: str
    billing_address: str


class BranchResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    branch_name: str
    gstin: str
    billing_address: str
    created_at: datetime

    class Config:
        from_attributes = True


class ApprovalRuleCreate(BaseModel):
    feature_type: str
    min_amount: float
    max_amount: Optional[float] = None
    levels: int
    approvers: str


class ApprovalRuleResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    feature_type: str
    min_amount: float
    max_amount: Optional[float]
    levels: int
    approvers: str
    created_at: datetime

    class Config:
        from_attributes = True


class HolidayCreate(BaseModel):
    name: str
    date: datetime


class HolidayResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/company/{company_id}", response_model=CompanySettingsResponse)
def get_company_settings(company_id: uuid.UUID, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.put("/company/{company_id}", response_model=CompanySettingsResponse)
def update_company_settings(company_id: uuid.UUID, settings_data: CompanySettingsUpdate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    for field, val in settings_data.model_dump(exclude_unset=True).items():
        setattr(company, field, val)

    db.commit()
    db.refresh(company)
    return company


@router.get("/branches/{company_id}", response_model=List[BranchResponse])
def list_branches(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(CompanyBranch).filter(CompanyBranch.company_id == company_id).all()


@router.post("/branches/{company_id}", response_model=BranchResponse)
def create_branch(company_id: uuid.UUID, branch_data: BranchCreate, db: Session = Depends(get_db)):
    new_branch = CompanyBranch(
        company_id=company_id,
        branch_name=branch_data.branch_name,
        gstin=branch_data.gstin,
        billing_address=branch_data.billing_address
    )
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch


@router.get("/approval-rules/{company_id}", response_model=List[ApprovalRuleResponse])
def list_approval_rules(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(ApprovalRule).filter(ApprovalRule.company_id == company_id).all()


@router.post("/approval-rules/{company_id}", response_model=ApprovalRuleResponse)
def create_approval_rule(company_id: uuid.UUID, rule_data: ApprovalRuleCreate, db: Session = Depends(get_db)):
    new_rule = ApprovalRule(
        company_id=company_id,
        feature_type=rule_data.feature_type,
        min_amount=rule_data.min_amount,
        max_amount=rule_data.max_amount,
        levels=rule_data.levels,
        approvers=rule_data.approvers
    )
    db.add(new_rule)
    db.commit()
    db.refresh(new_rule)
    return new_rule


@router.get("/holidays/{company_id}", response_model=List[HolidayResponse])
def list_holidays(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(Holiday).filter(Holiday.company_id == company_id).all()


@router.post("/holidays/{company_id}", response_model=HolidayResponse)
def create_holiday(company_id: uuid.UUID, holiday_data: HolidayCreate, db: Session = Depends(get_db)):
    new_holiday = Holiday(
        company_id=company_id,
        name=holiday_data.name,
        date=holiday_data.date
    )
    db.add(new_holiday)
    db.commit()
    db.refresh(new_holiday)
    return new_holiday
