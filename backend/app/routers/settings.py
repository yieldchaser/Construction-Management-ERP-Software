import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.auth import get_current_user, verify_company_access, get_company_membership, require_permission
from app.models import (
    Company, CompanyBranch, ApprovalRule, CompanyFile, CompanyRole, CompanyTeam,
    CompanyPayrollSettings, SalaryTemplate, PdfTemplate, CompanyTerms, User,
)
from app import supabase_storage
from app.permissions import (
    DEFAULT_ROLE_PRESETS,
    validate_permissions,
    default_view_permissions,
)

router = APIRouter(prefix="/settings", tags=["Settings & Configurations"], dependencies=[Depends(get_current_user)])


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
    min_amount: float = Field(..., ge=0)
    max_amount: Optional[float] = Field(None, ge=0)
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
    # Optional initial permission dict (validated against the taxonomy). When
    # omitted a new custom role defaults to read-only across every module.
    permissions: Optional[dict] = None


class RolePermissionsUpdate(BaseModel):
    permissions: dict


class RoleResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    role_name: str
    permissions: Optional[dict] = None
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
def get_company_settings(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
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
def update_company_settings(company_id: uuid.UUID, settings_data: CompanySettingsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: None = Depends(verify_company_access)):
    require_permission(db, current_user, company_id, "settings:manage")
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
def list_branches(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(CompanyBranch).filter(CompanyBranch.company_id == company_id).all()


@router.post("/branches/{company_id}", response_model=BranchResponse)
def create_branch(company_id: uuid.UUID, branch_data: BranchCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: None = Depends(verify_company_access)):
    require_permission(db, current_user, company_id, "settings:manage")
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
def set_primary_branch(branch_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    branch = db.query(CompanyBranch).filter(CompanyBranch.id == branch_id).first()
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    get_company_membership(db, current_user, branch.company_id)
    require_permission(db, current_user, branch.company_id, "settings:manage")
    db.query(CompanyBranch).filter(CompanyBranch.company_id == branch.company_id).update({"is_primary": False})
    branch.is_primary = True
    db.commit()
    db.refresh(branch)
    return branch


@router.get("/approval-rules/{company_id}", response_model=List[ApprovalRuleResponse])
def list_approval_rules(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(ApprovalRule).filter(ApprovalRule.company_id == company_id).all()


@router.post("/approval-rules/{company_id}", response_model=ApprovalRuleResponse)
def create_approval_rule(company_id: uuid.UUID, rule_data: ApprovalRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: None = Depends(verify_company_access)):
    require_permission(db, current_user, company_id, "settings:manage")
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
def update_approval_rule(rule_id: uuid.UUID, rule_data: ApprovalRuleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rule = db.query(ApprovalRule).filter(ApprovalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    get_company_membership(db, current_user, rule.company_id)
    require_permission(db, current_user, rule.company_id, "settings:manage")
    for field, val in rule_data.model_dump(exclude_unset=True).items():
        setattr(rule, field, val)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/approval-rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_approval_rule(rule_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rule = db.query(ApprovalRule).filter(ApprovalRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Approval rule not found")
    get_company_membership(db, current_user, rule.company_id)
    require_permission(db, current_user, rule.company_id, "settings:manage")
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, rule.company_id, "approval_rule", rule.id, f"Approval Rule: {rule.feature_type}")
    except Exception:
        pass
    db.delete(rule)
    db.commit()

@router.get("/roles/{company_id}", response_model=List[RoleResponse])
def list_roles(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(CompanyRole).filter(CompanyRole.company_id == company_id).order_by(CompanyRole.created_at).all()


@router.post("/roles/{company_id}", response_model=RoleResponse)
def create_role(company_id: uuid.UUID, role_data: RoleCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: None = Depends(verify_company_access)):
    require_permission(db, current_user, company_id, "settings:manage")
    name = role_data.role_name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Role name is required")
    existing = db.query(CompanyRole).filter(
        CompanyRole.company_id == company_id, CompanyRole.role_name.ilike(name)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Role already exists")
    if role_data.permissions is not None:
        try:
            perms = validate_permissions(role_data.permissions)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    else:
        perms = default_view_permissions()
    role = CompanyRole(company_id=company_id, role_name=name, permissions=perms)
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router.post("/roles/seed/{company_id}", response_model=List[RoleResponse])
def seed_default_roles(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    if db.query(CompanyRole).filter(CompanyRole.company_id == company_id).count() > 0:
        raise HTTPException(status_code=409, detail="Roles already exist for this company")
    created = []
    for name in DEFAULT_ROLES:
        # Seed with the real preset (not {}); fall back to read-only for any
        # role name without a preset.
        preset = DEFAULT_ROLE_PRESETS.get(name, default_view_permissions())
        role = CompanyRole(company_id=company_id, role_name=name, permissions=preset)
        db.add(role)
        created.append(role)
    db.commit()
    for role in created:
        db.refresh(role)
    return created


def _load_role_and_verify_access(
    role_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> CompanyRole:
    """Resolve a role by id and verify the caller belongs to its company.

    Mirrors the `verify_company_access` dependency but resolves the company via
    the role's own `company_id` (the path carries `role_id`, not `company_id`).
    """
    role = db.query(CompanyRole).filter(CompanyRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found")
    get_company_membership(db, current_user, role.company_id)
    return role


# Locked roles must keep full access; never allow them to be restricted.
_LOCKED_ROLES = {"Owner", "Admin"}


@router.put("/roles/{role_id}/permissions", response_model=RoleResponse)
def update_role_permissions(
    role: CompanyRole = Depends(_load_role_and_verify_access),
    payload: RolePermissionsUpdate = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Replace a role's permission set.

    - Keys are validated against the canonical taxonomy; unknown keys are 400'd.
    - Owner / Admin are locked to full access (`all=true`) so they can never be
      locked out (failsafe).
    """
    require_permission(db, current_user, role.company_id, "settings:manage")
    if payload is None:
        raise HTTPException(status_code=400, detail="permissions body is required")
    if role.role_name in _LOCKED_ROLES and not payload.permissions.get("all"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The {role.role_name} role must retain full access (all=true) and cannot be restricted.",
        )
    try:
        normalized = validate_permissions(payload.permissions)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    role.permissions = normalized
    db.commit()
    db.refresh(role)
    return role


@router.delete("/roles/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(
    role: CompanyRole = Depends(_load_role_and_verify_access),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a custom (non-default) role that is not assigned to any member."""
    require_permission(db, current_user, role.company_id, "settings:manage")
    if role.role_name in DEFAULT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Default roles cannot be deleted",
        )
    assigned = (
        db.query(CompanyTeam).filter(CompanyTeam.role_id == role.id).first()
    )
    if assigned:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Role is assigned to members and cannot be deleted",
        )
    db.delete(role)
    db.commit()


# ─── Company team members (RBAC role assignment) ────────────────────────────
# Phase 3 frontend surface: list members with their current role and (re)assign
# a role. Both endpoints require `team:manage`; partners / superusers always pass
# via the failsafe in `require_permission`.

class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role_id: Optional[uuid.UUID] = None
    role_name: Optional[str] = None
    priority_type: str

    class Config:
        from_attributes = True


class TeamMemberRoleUpdate(BaseModel):
    role_id: Optional[uuid.UUID] = None


@router.get("/team/{company_id}", response_model=List[TeamMemberResponse])
def list_team_members(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_company_access),
):
    """List every CompanyTeam member of `company_id` with their assigned role."""
    require_permission(db, current_user, company_id, "team:manage")
    rows = (
        db.query(CompanyTeam, User, CompanyRole)
        .join(User, User.id == CompanyTeam.user_id)
        .outerjoin(CompanyRole, CompanyRole.id == CompanyTeam.role_id)
        .filter(CompanyTeam.company_id == company_id)
        .order_by(User.name)
        .all()
    )
    return [
        TeamMemberResponse(
            id=t.id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            role_id=t.role_id,
            role_name=r.role_name if r else None,
            priority_type=t.priority_type,
        )
        for t, u, r in rows
    ]


@router.put("/team/{member_id}/role", response_model=TeamMemberResponse)
def assign_member_role(
    member_id: uuid.UUID,
    payload: TeamMemberRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Assign (or clear) a CompanyRole on a team member.

    The target role must belong to the same company as the member (cross-company
    role assignment is rejected). Partners keep their `priority_type` regardless of
    the chosen role, so this can never lock an owner out.
    """
    member = db.query(CompanyTeam).filter(CompanyTeam.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team member not found")
    get_company_membership(db, current_user, member.company_id)
    require_permission(db, current_user, member.company_id, "team:manage")

    if payload.role_id is not None:
        role = db.query(CompanyRole).filter(CompanyRole.id == payload.role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Role not found")
        if role.company_id != member.company_id:
            raise HTTPException(
                status_code=400,
                detail="Role does not belong to this company",
            )
        member.role_id = role.id
    else:
        member.role_id = None

    db.commit()
    role = (
        db.query(CompanyRole).filter(CompanyRole.id == member.role_id).first()
        if member.role_id else None
    )
    return TeamMemberResponse(
        id=member.id,
        name=db.query(User).filter(User.id == member.user_id).first().name,
        email=db.query(User).filter(User.id == member.user_id).first().email,
        phone=db.query(User).filter(User.id == member.user_id).first().phone,
        role_id=member.role_id,
        role_name=role.role_name if role else None,
        priority_type=member.priority_type,
    )


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
def get_payroll_settings(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return _get_or_create_payroll_settings(company_id, db)


@router.put("/payroll/{company_id}", response_model=PayrollSettingsResponse)
def update_payroll_settings(company_id: uuid.UUID, payload: PayrollSettingsUpdate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
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
def list_salary_templates(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(SalaryTemplate).filter(SalaryTemplate.company_id == company_id).order_by(SalaryTemplate.name).all()


@router.post("/salary-templates/{company_id}", response_model=SalaryTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_salary_template(company_id: uuid.UUID, payload: SalaryTemplateCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    data = payload.model_dump()
    data["breakup"] = payload.breakup
    obj = SalaryTemplate(company_id=company_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/salary-templates/{template_id}", response_model=SalaryTemplateResponse)
def update_salary_template(template_id: uuid.UUID, payload: SalaryTemplateUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(SalaryTemplate).filter(SalaryTemplate.id == template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Salary template not found")
    get_company_membership(db, current_user, obj.company_id)
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/salary-templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_salary_template(template_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(SalaryTemplate).filter(SalaryTemplate.id == template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Salary template not found")
    get_company_membership(db, current_user, obj.company_id)
    require_permission(db, current_user, obj.company_id, "data:delete")
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, obj.company_id, "salary_template", obj.id, f"Salary Template: {obj.name}")
    except Exception:
        pass
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
    _: None = Depends(verify_company_access),
):
    if asset_type not in ALLOWED_ASSET_TYPES:
        raise HTTPException(status_code=400, detail="Invalid asset type")
    company = db.query(Company).filter(Company.id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    filename = file.filename or asset_type
    content_type = file.content_type or "application/octet-stream"
    storage_path = None
    data = None

    if supabase_storage.is_storage_configured():
        storage_path = f"{company_id}/{asset_type}"
        supabase_storage.upload_bytes(
            supabase_storage.BUCKET_COMPANY_FILES, storage_path, contents, content_type
        )
    else:
        # Local-dev fallback: keep the bytes in the DB column.
        data = contents

    db.query(CompanyFile).filter(
        CompanyFile.company_id == company_id, CompanyFile.asset_type == asset_type
    ).delete()

    cf = CompanyFile(
        company_id=company_id,
        asset_type=asset_type,
        filename=filename,
        content_type=content_type,
        storage_path=storage_path,
        data=data,
    )
    db.add(cf)
    db.commit()
    db.refresh(cf)
    return {"id": str(cf.id), "asset_type": asset_type}


@router.get("/company-file/{company_id}/{asset_type}")
def get_company_file(company_id: uuid.UUID, asset_type: str, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
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

    # Prefer object storage; fall back to the DB BLOB for legacy rows.
    if cf.storage_path and supabase_storage.is_storage_configured():
        try:
            signed_url = supabase_storage.create_signed_url(
                supabase_storage.BUCKET_COMPANY_FILES, cf.storage_path
            )
            from fastapi.responses import RedirectResponse

            return RedirectResponse(url=signed_url, status_code=307)
        except Exception:
            # Storage unavailable or signed-URL failed: fall through to BLOB.
            pass

    if cf.data:
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

    raise HTTPException(status_code=404, detail="Not found")


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
def get_company_terms(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    row = _get_or_create_company_terms(company_id, db)
    return row


@router.put("/company-terms/{company_id}", response_model=CompanyTermsResponse)
def update_company_terms(company_id: uuid.UUID, payload: CompanyTermsUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: None = Depends(verify_company_access)):
    require_permission(db, current_user, company_id, "settings:manage")
    row = _get_or_create_company_terms(company_id, db)
    for field, val in payload.model_dump(exclude_unset=True).items():
        setattr(row, field, val)
    db.commit()
    db.refresh(row)
    return row
