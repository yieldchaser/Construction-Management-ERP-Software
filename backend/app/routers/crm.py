import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_company_access, get_company_membership, require_permission
from app.models import (
    CRMLead, CRMQuotation, CRMQuotationItem, Company,
    CRMLeadSource, CRMLeadCategory, CRMLeadStatus, CompanyTeam, User,
)
from app.workflow_controls import get_default_terms
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/crm",
    tags=["CRM & Lead Management"],
    dependencies=[Depends(get_current_user)]
)

# Lead Schemas
class LeadCreateRequest(BaseModel):
    company_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    lead_type: str
    contact_name: str
    phone_no: str
    country_code: Optional[str] = None
    email: Optional[str] = None
    client_company_name: Optional[str] = None
    address: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    status: str = "New Lead"
    priority: str = "medium"
    budget: float = Field(0.0, ge=0)
    lead_name: Optional[str] = None
    description: Optional[str] = None
    last_contacted: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    expected_closure: Optional[datetime] = None

class LeadUpdateRequest(BaseModel):
    assignee_id: Optional[uuid.UUID] = None
    lead_type: Optional[str] = None
    contact_name: Optional[str] = None
    phone_no: Optional[str] = None
    country_code: Optional[str] = None
    email: Optional[str] = None
    client_company_name: Optional[str] = None
    address: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    description: Optional[str] = None
    lead_name: Optional[str] = None
    last_contacted: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    expected_closure: Optional[datetime] = None

class LeadResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    lead_date: datetime
    lead_type: str
    contact_name: str
    phone_no: str
    country_code: Optional[str] = None
    email: Optional[str] = None
    client_company_name: Optional[str] = None
    address: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    status: str
    priority: str
    budget: float
    lead_name: Optional[str] = None
    description: Optional[str] = None
    last_contacted: Optional[datetime] = None
    next_follow_up: Optional[datetime] = None
    expected_closure: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Quotation Schemas
class QuotationItemCreateRequest(BaseModel):
    section_name: Optional[str] = None
    item_name: str
    qty: float = Field(..., ge=0)
    unit: str
    cost_price: float = Field(0.0, ge=0)
    selling_price: float = Field(0.0, ge=0)
    supply_rate: float = Field(0.0, ge=0)
    installation_rate: float = Field(0.0, ge=0)
    supply_tax_pct: float = Field(18.00, ge=0, le=100)
    installation_tax_pct: float = Field(12.00, ge=0, le=100)
    markup: float = 0.0
    item_code: Optional[str] = None
    hsn_sac: Optional[str] = None
    cost_code: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    billed_qty: float = Field(0.0, ge=0)
    unbilled_qty: float = Field(0.0, ge=0)

class QuotationCreateRequest(BaseModel):
    subject: str
    tax_type: str = "bill_level"  # item_level, bill_level
    gst_pct: float = Field(18.00, ge=0, le=100)
    cgst_pct: Optional[float] = Field(None, ge=0, le=100)
    sgst_pct: Optional[float] = Field(None, ge=0, le=100)
    discount: float = Field(0.0, ge=0)
    additional_charges: float = Field(0.0, ge=0)
    round_off: float = 0.0
    qt_no: Optional[str] = None
    qt_date: Optional[datetime] = None
    bank_account_id: Optional[uuid.UUID] = None
    terms: Optional[str] = None
    items: List[QuotationItemCreateRequest]

class QuotationItemResponse(BaseModel):
    id: uuid.UUID
    section_name: Optional[str] = None
    item_name: str
    qty: float
    unit: str
    cost_price: float
    selling_price: float
    supply_rate: float
    installation_rate: float
    supply_tax_pct: float
    installation_tax_pct: float
    total_amount: float
    markup: float
    item_code: Optional[str] = None
    hsn_sac: Optional[str] = None
    cost_code: Optional[str] = None
    length: Optional[float] = None
    width: Optional[float] = None
    height: Optional[float] = None
    billed_qty: float
    unbilled_qty: float

    class Config:
        from_attributes = True

class QuotationResponse(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    subject: str
    tax_type: str
    status: str
    gst_pct: float
    cgst_pct: float
    sgst_pct: float
    cgst_amount: float
    sgst_amount: float
    tax_amount: float
    discount: float
    additional_charges: float
    round_off: float
    qt_no: Optional[str] = None
    qt_date: Optional[datetime] = None
    bank_account_id: Optional[uuid.UUID] = None
    total_amount: float
    terms: Optional[str] = None
    created_at: datetime
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True


# --- Lead Endpoints ---

@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(req: LeadCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_uuid = uuid.UUID(str(req.company_id))
    company = db.query(Company).filter(Company.id == comp_uuid).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    get_company_membership(db, current_user, comp_uuid)

    lead = CRMLead(
        id=uuid.uuid4(),
        company_id=comp_uuid,
        assignee_id=uuid.UUID(str(req.assignee_id)) if req.assignee_id else None,
        lead_type=req.lead_type,
        contact_name=req.contact_name,
        phone_no=req.phone_no,
        country_code=req.country_code or "+91",
        email=req.email,
        client_company_name=req.client_company_name,
        address=req.address,
        source=req.source,
        category=req.category,
        status=req.status,
        priority=req.priority,
        budget=req.budget,
        lead_name=req.lead_name,
        description=req.description,
        last_contacted=req.last_contacted,
        next_follow_up=req.next_follow_up,
        expected_closure=req.expected_closure
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@router.get("/leads", response_model=List[LeadResponse])
def get_leads(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(CRMLead).filter(CRMLead.company_id == comp_uuid).all()

@router.put("/leads/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: uuid.UUID, req: LeadUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead_uuid = uuid.UUID(str(lead_id))
    lead = db.query(CRMLead).filter(CRMLead.id == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    get_company_membership(db, current_user, lead.company_id)

    if req.status is not None:
        lead.status = req.status
    if req.priority is not None:
        lead.priority = req.priority
    if req.budget is not None:
        lead.budget = req.budget
    if req.next_follow_up is not None:
        lead.next_follow_up = req.next_follow_up
    if req.expected_closure is not None:
        lead.expected_closure = req.expected_closure
    if req.assignee_id is not None:
        lead.assignee_id = uuid.UUID(str(req.assignee_id)) if req.assignee_id else None
    if req.lead_type is not None:
        lead.lead_type = req.lead_type
    if req.contact_name is not None:
        lead.contact_name = req.contact_name
    if req.phone_no is not None:
        lead.phone_no = req.phone_no
    if req.country_code is not None:
        lead.country_code = req.country_code
    if req.email is not None:
        lead.email = req.email
    if req.client_company_name is not None:
        lead.client_company_name = req.client_company_name
    if req.address is not None:
        lead.address = req.address
    if req.source is not None:
        lead.source = req.source
    if req.category is not None:
        lead.category = req.category
    if req.lead_name is not None:
        lead.lead_name = req.lead_name
    if req.last_contacted is not None:
        lead.last_contacted = req.last_contacted

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/leads/{lead_id}", response_model=LeadResponse)
def get_lead(lead_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead_uuid = uuid.UUID(str(lead_id))
    lead = db.query(CRMLead).filter(CRMLead.id == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    get_company_membership(db, current_user, lead.company_id)
    return lead


@router.delete("/leads/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a CRM lead. Tenant-scoped: the caller must belong to the lead's
    company, and the deletion is written to the DeleteLog audit trail."""
    lead = db.query(CRMLead).filter(CRMLead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    get_company_membership(db, current_user, lead.company_id)
    require_permission(db, current_user, lead.company_id, "data:delete")
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, lead.company_id, "crm_lead", lead.id, f"CRM Lead: {lead.contact_name}")
    except Exception:
        pass
    db.delete(lead)
    db.commit()


# ─── Company team members (Assignee dropdown) ────────────────────────────────

class TeamMemberResponse(BaseModel):
    id: uuid.UUID
    name: str

    class Config:
        from_attributes = True


@router.get("/team-members/{company_id}", response_model=List[TeamMemberResponse])
def list_team_members(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    rows = (
        db.query(CompanyTeam, User)
        .join(User, User.id == CompanyTeam.user_id)
        .filter(CompanyTeam.company_id == comp_uuid)
        .order_by(User.name)
        .all()
    )
    return [TeamMemberResponse(id=t.id, name=u.name) for t, u in rows]


# ─── Creatable company-scoped lookups (Source / Category / Status) ────────────

class LookupResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str

    class Config:
        from_attributes = True


class LookupCreate(BaseModel):
    name: str


DEFAULT_SOURCES = ["Website", "Facebook", "Instagram", "Google", "Whatsapp", "Referral", "Cold Call", "Email Campaign"]
DEFAULT_STATUSES = ["New Lead", "Follow-Up", "Proposal Stage", "Converted", "Lost", "No Response", "Irrelevant Lead"]


def _get_or_seed(db: Session, model, comp_uuid: uuid.UUID, defaults: list[str]):
    items = db.query(model).filter(model.company_id == comp_uuid).order_by(model.name).all()
    if not items and defaults:
        for d in defaults:
            db.add(model(company_id=comp_uuid, name=d))
        db.commit()
        items = db.query(model).filter(model.company_id == comp_uuid).order_by(model.name).all()
    return items


@router.get("/lead-sources/{company_id}", response_model=List[LookupResponse])
def list_lead_sources(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return _get_or_seed(db, CRMLeadSource, comp_uuid, DEFAULT_SOURCES)


@router.post("/lead-sources/{company_id}", response_model=LookupResponse, status_code=status.HTTP_201_CREATED)
def create_lead_source(company_id: uuid.UUID, payload: LookupCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    obj = CRMLeadSource(company_id=comp_uuid, name=payload.name)
    db.add(obj)
    db.commit()
    return obj


@router.get("/lead-categories/{company_id}", response_model=List[LookupResponse])
def list_lead_categories(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return _get_or_seed(db, CRMLeadCategory, comp_uuid, [])


@router.post("/lead-categories/{company_id}", response_model=LookupResponse, status_code=status.HTTP_201_CREATED)
def create_lead_category(company_id: uuid.UUID, payload: LookupCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    obj = CRMLeadCategory(company_id=comp_uuid, name=payload.name)
    db.add(obj)
    db.commit()
    return obj


@router.get("/lead-statuses/{company_id}", response_model=List[LookupResponse])
def list_lead_statuses(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return _get_or_seed(db, CRMLeadStatus, comp_uuid, DEFAULT_STATUSES)


@router.post("/lead-statuses/{company_id}", response_model=LookupResponse, status_code=status.HTTP_201_CREATED)
def create_lead_status(company_id: uuid.UUID, payload: LookupCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    obj = CRMLeadStatus(company_id=comp_uuid, name=payload.name)
    db.add(obj)
    db.commit()
    return obj


# --- Quotation Endpoints ---

@router.post("/leads/{lead_id}/quotations", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(lead_id: uuid.UUID, req: QuotationCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead_uuid = uuid.UUID(str(lead_id))
    lead = db.query(CRMLead).filter(CRMLead.id == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    get_company_membership(db, current_user, lead.company_id)

    gst_pct = req.gst_pct
    cgst_pct = req.cgst_pct if req.cgst_pct is not None else gst_pct / 2.0
    sgst_pct = req.sgst_pct if req.sgst_pct is not None else gst_pct / 2.0

    # Create quotation record
    quot = CRMQuotation(
        id=uuid.uuid4(),
        lead_id=lead_uuid,
        subject=req.subject,
        tax_type=req.tax_type,
        status="Draft",
        gst_pct=gst_pct,
        cgst_pct=cgst_pct,
        sgst_pct=sgst_pct,
        discount=req.discount,
        additional_charges=req.additional_charges,
        round_off=req.round_off,
        qt_no=req.qt_no,
        qt_date=req.qt_date.date() if req.qt_date else None,
        bank_account_id=uuid.UUID(str(req.bank_account_id)) if req.bank_account_id else None,
        total_amount=0.0,
        # Settings -> Terms & Conditions -> CRM Quotation: pre-fill the
        # company default when the caller doesn't supply their own terms.
        terms=req.terms if req.terms else get_default_terms(db, lead.company_id, "quotation")
    )
    db.add(quot)
    db.flush()

    def dim_factor(item: QuotationItemCreateRequest) -> float:
        if item.length and item.width and item.height:
            return float(item.length) * float(item.width) * float(item.height)
        return 1.0

    # First pass: pre-tax base for discount ratio (N x L x W x H aware)
    total_pre_tax_base = 0.0
    for item in req.items:
        unit_price = item.selling_price + item.supply_rate + item.installation_rate
        total_pre_tax_base += float(item.qty) * dim_factor(item) * unit_price

    discount_ratio = 0.0
    if total_pre_tax_base > 0:
        discount_ratio = 1.0 if req.discount >= total_pre_tax_base else (req.discount / total_pre_tax_base)

    subtotal = 0.0
    total_tax = 0.0
    pending = []

    for item in req.items:
        unit_price = item.selling_price + item.supply_rate + item.installation_rate
        df = dim_factor(item)
        eff_qty = float(item.qty) * df
        item_base = eff_qty * unit_price
        item_tax = 0.0

        if req.tax_type == "item_level":
            item_discounted_base = item_base * (1.0 - discount_ratio)
            if item.supply_rate > 0 or item.installation_rate > 0:
                supply_base = (eff_qty * item.supply_rate) * (1.0 - discount_ratio)
                install_base = (eff_qty * item.installation_rate) * (1.0 - discount_ratio)
                selling_base = (eff_qty * item.selling_price) * (1.0 - discount_ratio)
                supply_tax = supply_base * (item.supply_tax_pct / 100.0)
                install_tax = install_base * (item.installation_tax_pct / 100.0)
                selling_tax = selling_base * (gst_pct / 100.0)
                item_tax = supply_tax + install_tax + selling_tax
            else:
                item_tax = item_discounted_base * (gst_pct / 100.0)
            item_total = item_discounted_base + item_tax
        else:
            item_total = item_base  # bill-level tax handled below

        subtotal += item_base
        total_tax += item_tax

        pending.append((item, eff_qty, item_base, item_tax, item_total))

    for item, eff_qty, item_base, item_tax, item_total in pending:
        q_item = CRMQuotationItem(
            id=uuid.uuid4(),
            quotation_id=quot.id,
            section_name=item.section_name,
            item_name=item.item_name,
            qty=item.qty,
            unit=item.unit,
            cost_price=item.cost_price,
            selling_price=item.selling_price,
            supply_rate=item.supply_rate,
            installation_rate=item.installation_rate,
            supply_tax_pct=item.supply_tax_pct,
            installation_tax_pct=item.installation_tax_pct,
            total_amount=item_total,
            markup=item.markup,
            item_code=item.item_code,
            hsn_sac=item.hsn_sac,
            cost_code=item.cost_code,
            length=item.length,
            width=item.width,
            height=item.height,
            billed_qty=item.billed_qty,
            unbilled_qty=item.unbilled_qty
        )
        db.add(q_item)

    # Bill-level tax + totals
    if req.tax_type == "bill_level":
        discounted = subtotal - req.discount
        tax = discounted * (gst_pct / 100.0)
        total_tax = tax
        base_total = discounted + tax
    else:
        base_total = subtotal  # taxes already inside items

    final_total = base_total + (req.additional_charges or 0.0) + (req.round_off or 0.0)

    total_gst = (cgst_pct + sgst_pct) or 1.0
    cgst_amount = total_tax * (cgst_pct / total_gst)
    sgst_amount = total_tax * (sgst_pct / total_gst)

    quot.total_amount = max(final_total, 0.0)
    quot.cgst_amount = cgst_amount
    quot.sgst_amount = sgst_amount
    db.add(quot)
    db.commit()
    db.refresh(quot)

    # Assemble response
    res = QuotationResponse(
        id=quot.id,
        lead_id=quot.lead_id,
        subject=quot.subject,
        tax_type=quot.tax_type,
        status=quot.status,
        gst_pct=float(quot.gst_pct),
        cgst_pct=float(quot.cgst_pct),
        sgst_pct=float(quot.sgst_pct),
        cgst_amount=float(quot.cgst_amount),
        sgst_amount=float(quot.sgst_amount),
        tax_amount=float(quot.cgst_amount + quot.sgst_amount),
        discount=float(quot.discount),
        additional_charges=float(quot.additional_charges),
        round_off=float(quot.round_off),
        qt_no=quot.qt_no,
        qt_date=quot.qt_date,
        bank_account_id=quot.bank_account_id,
        total_amount=float(quot.total_amount),
        terms=quot.terms,
        created_at=quot.created_at,
        items=[]
    )
    # Build item response from persisted rows
    persisted = db.query(CRMQuotationItem).filter(CRMQuotationItem.quotation_id == quot.id).all()
    res.items = [
        QuotationItemResponse(
            id=i.id,
            section_name=i.section_name,
            item_name=i.item_name,
            qty=float(i.qty),
            unit=i.unit,
            cost_price=float(i.cost_price),
            selling_price=float(i.selling_price),
            supply_rate=float(i.supply_rate),
            installation_rate=float(i.installation_rate),
            supply_tax_pct=float(i.supply_tax_pct),
            installation_tax_pct=float(i.installation_tax_pct),
            total_amount=float(i.total_amount),
            markup=float(i.markup),
            item_code=i.item_code,
            hsn_sac=i.hsn_sac,
            cost_code=i.cost_code,
            length=float(i.length) if i.length is not None else None,
            width=float(i.width) if i.width is not None else None,
            height=float(i.height) if i.height is not None else None,
        ) for i in persisted
    ]
    return res

@router.get("/leads/{lead_id}/quotations", response_model=List[QuotationResponse])
def get_quotations(lead_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lead_uuid = uuid.UUID(str(lead_id))
    lead = db.query(CRMLead).filter(CRMLead.id == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    get_company_membership(db, current_user, lead.company_id)
    quots = db.query(CRMQuotation).filter(CRMQuotation.lead_id == lead_uuid).all()
    
    results = []
    for q in quots:
        items = db.query(CRMQuotationItem).filter(CRMQuotationItem.quotation_id == q.id).all()
        results.append(
            QuotationResponse(
                id=q.id,
                lead_id=q.lead_id,
                subject=q.subject,
                tax_type=q.tax_type,
                status=q.status,
                gst_pct=float(q.gst_pct),
                cgst_pct=float(q.cgst_pct),
                sgst_pct=float(q.sgst_pct),
                cgst_amount=float(q.cgst_amount),
                sgst_amount=float(q.sgst_amount),
                tax_amount=float(q.cgst_amount + q.sgst_amount),
                discount=float(q.discount),
                additional_charges=float(q.additional_charges),
                round_off=float(q.round_off),
                qt_no=q.qt_no,
                qt_date=q.qt_date,
                bank_account_id=q.bank_account_id,
                total_amount=float(q.total_amount),
                terms=q.terms,
                created_at=q.created_at,
                items=[
                    QuotationItemResponse(
                        id=i.id,
                        section_name=i.section_name,
                        item_name=i.item_name,
                        qty=float(i.qty),
                        unit=i.unit,
                        cost_price=float(i.cost_price),
                        selling_price=float(i.selling_price),
                        supply_rate=float(i.supply_rate),
                        installation_rate=float(i.installation_rate),
                        supply_tax_pct=float(i.supply_tax_pct),
                        installation_tax_pct=float(i.installation_tax_pct),
                        total_amount=float(i.total_amount),
                        markup=float(i.markup),
                        item_code=i.item_code,
                        hsn_sac=i.hsn_sac,
                        cost_code=i.cost_code,
                        length=float(i.length) if i.length is not None else None,
                        width=float(i.width) if i.width is not None else None,
                        height=float(i.height) if i.height is not None else None,
                    ) for i in items
                ]
            )
        )
    return results
