import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import Company, CompanyBranch, ApprovalRule, CompanyFile, CompanyRole, CompanyPayrollSettings, SalaryTemplate, PdfTemplate, CompanyTerms

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
    document_company_name_display: str = "company"
    google_sheets_auth_phone: Optional[str]
    google_sheets_enabled: bool = False
    google_sheets_authorized_phones: Optional[List[str]] = None
    subscription_plan: Optional[str] = None
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    subscription_renewal: Optional[datetime] = None
    phone: Optional[str] = None
    business_segment: Optional[str] = None
    company_size: Optional[str] = None
    construction_types: Optional[List[str]] = None
    weekly_off: Optional[str] = None
    weekly_off_days: Optional[List[str]] = None
    restrict_entry_creation_enabled: Optional[bool] = None
    restrict_entry_creation_days: Optional[int] = None
    restrict_entry_editing_enabled: Optional[bool] = None
    restrict_entry_editing_days: Optional[int] = None
    restrict_progress_over_estimate: Optional[bool] = None
    pretax_deduction_retention: Optional[bool] = None
    restrict_subcon_material_issue: Optional[bool] = None
    restrict_material_transfer: Optional[bool] = None
    restrict_production_material: Optional[bool] = None
    grn_numbering: Optional[str] = None
    logo_url: Optional[str] = None
    signature_url: Optional[str] = None
    stamp_url: Optional[str] = None
    watermark_url: Optional[str] = None
    onboarding_segment: Optional[str] = None
    onboarding_categories: Optional[str] = None
    onboarding_city: Optional[str] = None
    onboarding_completed: bool = False
    is_zatca_enable: bool = False
    vat_number: Optional[str] = None

    class Config:
        from_attributes = True


class CompanySettingsUpdate(BaseModel):
    name: Optional[str] = None
    legal_business_name: Optional[str] = None
    gstin: Optional[str] = None
    vat_number: Optional[str] = None
    is_zatca_enable: Optional[bool] = None
    phone: Optional[str] = None
    billing_address: Optional[str] = None
    business_segment: Optional[str] = None
    company_size: Optional[str] = None
    construction_types: Optional[List[str]] = None
    weekly_off: Optional[str] = None
    weekly_off_days: Optional[List[str]] = None
    restrict_entry_creation_enabled: Optional[bool] = None
    restrict_entry_creation_days: Optional[int] = None
    restrict_entry_editing_enabled: Optional[bool] = None
    restrict_entry_editing_days: Optional[int] = None
    restrict_progress_over_estimate: Optional[bool] = None
    pretax_deduction_retention: Optional[bool] = None
    restrict_subcon_material_issue: Optional[bool] = None
    restrict_material_transfer: Optional[bool] = None
    restrict_production_material: Optional[bool] = None
    grn_numbering: Optional[str] = None
    currency_decimal_places: Optional[int] = None
    quantity_decimal_places: Optional[int] = None
    back_dated_limit_days: Optional[int] = None
    negative_stock_lock: Optional[bool] = None
    bom_restriction: Optional[bool] = None
    po_restriction: Optional[bool] = None
    material_request_restriction: Optional[bool] = None
    negative_balance_warning: Optional[bool] = None
    custom_pdf_template_enabled: Optional[bool] = None
    document_company_name_display: Optional[str] = None
    google_sheets_auth_phone: Optional[str] = None
    google_sheets_enabled: Optional[bool] = None
    google_sheets_authorized_phones: Optional[List[str]] = None
    subscription_plan: Optional[str] = None
    subscription_start: Optional[datetime] = None
    subscription_end: Optional[datetime] = None
    subscription_renewal: Optional[datetime] = None


class BranchCreate(BaseModel):
    branch_name: str
    gstin: str
    billing_address: str
    geo_location: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: str = "India"


class BranchResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    branch_name: str
    gstin: str
    billing_address: str
    is_primary: bool = False
    geo_location: Optional[str] = None
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip: Optional[str] = None
    country: Optional[str] = None
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


class RoleCreate(BaseModel):
    role_name: str


class RoleResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    role_name: str
    created_at: datetime

    class Config:
        from_attributes = True


# Default flat roles seeded on demand (no permission matrix in this build).
# Verbatim from the Setting-tab reconciliation — do not reword.
DEFAULT_ROLES = [
    "Admin",
    "Client",
    "Accountant",
    "Sub Contractor",
    "Associate HR",
    "Project partner",
    "Site Engineer",
    "Manager",
    "Supervisor",
    "Viewer",
]


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.get("/company/{company_id}", response_model=CompanySettingsResponse)
def get_company_settings(company_id: uuid.UUID, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        if str(company_id) == "e0000000-0000-0000-0000-000000000000":
            company = Company(
                id=company_id,
                name="Demo Construction Ltd",
                legal_business_name="Demo Construction India Private Limited",
                gstin="27AADCD2424B1ZP",
                billing_address="101, Skyline Tower, Andheri East, Mumbai, MH - 400069",
                currency_decimal_places=2,
                quantity_decimal_places=3,
                back_dated_limit_days=7,
            )
            db.add(company)
            db.commit()
            db.refresh(company)
        else:
            raise HTTPException(status_code=404, detail="Company not found")

    base = f"/settings/company-file/{company_id}"
    existing = {f.asset_type: True for f in db.query(CompanyFile).filter(CompanyFile.company_id == company_id).all()}
    data = CompanySettingsResponse.model_validate(company)
    data.logo_url = f"{base}/logo" if existing.get("logo") else None
    data.signature_url = f"{base}/signature" if existing.get("signature") else None
    data.stamp_url = f"{base}/stamp" if existing.get("stamp") else None
    data.watermark_url = f"{base}/watermark" if existing.get("watermark") else None
    return data


@router.put("/company/{company_id}", response_model=CompanySettingsResponse)
def update_company_settings(company_id: uuid.UUID, settings_data: CompanySettingsUpdate, db: Session = Depends(get_db)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    for field, val in settings_data.model_dump(exclude_unset=True).items():
        setattr(company, field, val)

    db.commit()
    db.refresh(company)

    base = f"/settings/company-file/{company_id}"
    existing = {f.asset_type: True for f in db.query(CompanyFile).filter(CompanyFile.company_id == company_id).all()}
    data = CompanySettingsResponse.model_validate(company)
    data.logo_url = f"{base}/logo" if existing.get("logo") else None
    data.signature_url = f"{base}/signature" if existing.get("signature") else None
    data.stamp_url = f"{base}/stamp" if existing.get("stamp") else None
    data.watermark_url = f"{base}/watermark" if existing.get("watermark") else None
    return data


@router.get("/branches/{company_id}", response_model=List[BranchResponse])
def list_branches(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(CompanyBranch).filter(CompanyBranch.company_id == company_id).all()


@router.post("/branches/{company_id}", response_model=BranchResponse)
def create_branch(company_id: uuid.UUID, branch_data: BranchCreate, db: Session = Depends(get_db)):
    existing_count = db.query(CompanyBranch).filter(CompanyBranch.company_id == company_id).count()
    new_branch = CompanyBranch(
        company_id=company_id,
        branch_name=branch_data.branch_name,
        gstin=branch_data.gstin,
        billing_address=branch_data.billing_address,
        is_primary=(existing_count == 0),
        geo_location=branch_data.geo_location,
        address_line1=branch_data.address_line1,
        city=branch_data.city,
        state=branch_data.state,
        zip=branch_data.zip,
        country=branch_data.country,
    )
    db.add(new_branch)
    db.commit()
    db.refresh(new_branch)
    return new_branch


@router.patch("/branches/{branch_id}/primary", response_model=BranchResponse)
def set_primary_branch(branch_id: uuid.UUID, db: Session = Depends(get_db)):
    branch = db.query(CompanyBranch).filter(CompanyBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    db.query(CompanyBranch).filter(CompanyBranch.company_id == branch.company_id).update({"is_primary": False})
    branch.is_primary = True
    db.commit()
    db.refresh(branch)
    return branch


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


@router.put("/approval-rules/{rule_id}", response_model=ApprovalRuleResponse)
def update_approval_rule(rule_id: uuid.UUID, rule_data: ApprovalRuleCreate, db: Session = Depends(get_db)):
    rule = db.query(ApprovalRule).filter(ApprovalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    for field, val in rule_data.model_dump(exclude_unset=True).items():
        setattr(rule, field, val)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/approval-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_approval_rule(rule_id: uuid.UUID, db: Session = Depends(get_db)):
    rule = db.query(ApprovalRule).filter(ApprovalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    db.delete(rule)
    db.commit()

@router.get("/roles/{company_id}", response_model=List[RoleResponse])
def list_roles(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(CompanyRole).filter(CompanyRole.company_id == company_id).order_by(CompanyRole.created_at).all()


@router.post("/roles/{company_id}", response_model=RoleResponse)
def create_role(company_id: uuid.UUID, role_data: RoleCreate, db: Session = Depends(get_db)):
    name = role_data.role_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    existing = db.query(CompanyRole).filter(
        CompanyRole.company_id == company_id, CompanyRole.role_name.ilike(name)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Role already exists")
    role = CompanyRole(company_id=company_id, role_name=name, permissions={})
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.post("/roles/seed/{company_id}", response_model=List[RoleResponse])
def seed_default_roles(company_id: uuid.UUID, db: Session = Depends(get_db)):
    if db.query(CompanyRole).filter(CompanyRole.company_id == company_id).count() > 0:
        raise HTTPException(status_code=409, detail="Roles already exist for this company")
    created = []
    for name in DEFAULT_ROLES:
        role = CompanyRole(company_id=company_id, role_name=name, permissions={})
        db.add(role)
        created.append(role)
    db.commit()
    for role in created:
        db.refresh(role)
    return created


# ─── Payroll Settings (company-level default statutory rates) ───────────────

class PayrollSettingsResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    pf_employee_pct: float
    pf_employer_pct: float
    esi_employee_pct: float
    esi_employer_pct: float
    tds_monthly: float
    is_esi_applicable: bool

    class Config:
        from_attributes = True


class PayrollSettingsUpdate(BaseModel):
    pf_employee_pct: Optional[float] = None
    pf_employer_pct: Optional[float] = None
    esi_employee_pct: Optional[float] = None
    esi_employer_pct: Optional[float] = None
    tds_monthly: Optional[float] = None
    is_esi_applicable: Optional[bool] = None


def _get_or_create_payroll_settings(company_id: uuid.UUID, db: Session):
    row = db.query(CompanyPayrollSettings).filter(CompanyPayrollSettings.company_id == company_id).first()
    if not row:
        row = CompanyPayrollSettings(company_id=company_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/payroll/{company_id}", response_model=PayrollSettingsResponse)
def get_payroll_settings(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return _get_or_create_payroll_settings(company_id, db)


@router.put("/payroll/{company_id}", response_model=PayrollSettingsResponse)
def update_payroll_settings(company_id: uuid.UUID, payload: PayrollSettingsUpdate, db: Session = Depends(get_db)):
    row = _get_or_create_payroll_settings(company_id, db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, val)
    db.commit()
    db.refresh(row)
    return row


# ─── Salary Templates (reusable named salary breakup cascade) ────────────────

class SalaryTemplateResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    description: Optional[str] = None
    status: str
    breakup: dict
    created_at: datetime

    class Config:
        from_attributes = True


class SalaryTemplateCreate(BaseModel):
    name: str
    description: Optional[str] = None
    status: Optional[str] = "Active"
    breakup: dict


class SalaryTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    breakup: Optional[dict] = None


@router.get("/salary-templates/{company_id}", response_model=List[SalaryTemplateResponse])
def list_salary_templates(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(SalaryTemplate).filter(SalaryTemplate.company_id == company_id).order_by(SalaryTemplate.name).all()


@router.post("/salary-templates/{company_id}", response_model=SalaryTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_salary_template(company_id: uuid.UUID, payload: SalaryTemplateCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    data["breakup"] = payload.breakup
    obj = SalaryTemplate(company_id=company_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/salary-templates/{template_id}", response_model=SalaryTemplateResponse)
def update_salary_template(template_id: uuid.UUID, payload: SalaryTemplateUpdate, db: Session = Depends(get_db)):
    obj = db.query(SalaryTemplate).filter(SalaryTemplate.id == template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Salary template not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/salary-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_template(template_id: uuid.UUID, db: Session = Depends(get_db)):
    obj = db.query(SalaryTemplate).filter(SalaryTemplate.id == template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Salary template not found")
    db.delete(obj)
    db.commit()


# ─── Company Branding Files (Logo / Signature / Stamp / Watermark) ────────────

ALLOWED_ASSET_TYPES = {"logo", "signature", "stamp", "watermark"}


@router.post("/company-file/{company_id}")
async def upload_company_file(
    company_id: uuid.UUID,
    asset_type: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if asset_type not in ALLOWED_ASSET_TYPES:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    db.query(CompanyFile).filter(
        CompanyFile.company_id == company_id, CompanyFile.asset_type == asset_type
    ).delete()

    cf = CompanyFile(
        company_id=company_id,
        asset_type=asset_type,
        filename=file.filename or asset_type,
        content_type=file.content_type or "application/octet-stream",
        data=contents,
    )
    db.add(cf)
    db.commit()
    db.refresh(cf)
    return {"id": str(cf.id), "asset_type": asset_type}


@router.get("/company-file/{company_id}/{asset_type}")
def get_company_file(company_id: uuid.UUID, asset_type: str, db: Session = Depends(get_db)):
    if asset_type not in ALLOWED_ASSET_TYPES:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    cf = (
        db.query(CompanyFile)
        .filter(CompanyFile.company_id == company_id, CompanyFile.asset_type == asset_type)
        .order_by(CompanyFile.created_at.desc())
        .first()
    )
    if not cf:
        raise HTTPException(status_code=404, detail="Not found")
    media_type = cf.content_type or "application/octet-stream"
    return Response(
        content=cf.data,
        media_type=media_type,
        headers={
            "Content-Disposition": f'inline; filename="{cf.filename}"',
            "Content-Type": media_type,
            "Content-Length": str(len(cf.data)),
            "Cache-Control": "no-store",
        },
    )


# ─── Company Terms & Conditions (5 documents; central source of default T&C) ───

class CompanyTermsResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    invoice_terms: Optional[str] = None
    quotation_terms: Optional[str] = None
    subcon_terms: Optional[str] = None
    boq_terms: Optional[str] = None
    purchase_order_terms: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanyTermsUpdate(BaseModel):
    invoice_terms: Optional[str] = None
    quotation_terms: Optional[str] = None
    subcon_terms: Optional[str] = None
    boq_terms: Optional[str] = None
    purchase_order_terms: Optional[str] = None


def _get_or_create_company_terms(company_id: uuid.UUID, db: Session) -> CompanyTerms:
    row = db.query(CompanyTerms).filter(CompanyTerms.company_id == company_id).first()
    if not row:
        row = CompanyTerms(company_id=company_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/company-terms/{company_id}", response_model=CompanyTermsResponse)
def get_company_terms(company_id: uuid.UUID, db: Session = Depends(get_db)):
    row = _get_or_create_company_terms(company_id, db)
    return row


@router.put("/company-terms/{company_id}", response_model=CompanyTermsResponse)
def update_company_terms(company_id: uuid.UUID, payload: CompanyTermsUpdate, db: Session = Depends(get_db)):
    row = _get_or_create_company_terms(company_id, db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, val)
    db.commit()
    db.refresh(row)
    return row
