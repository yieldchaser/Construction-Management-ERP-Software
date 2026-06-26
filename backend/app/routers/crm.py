import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import CRMLead, CRMQuotation, CRMQuotationItem, Company
from pydantic import BaseModel

router = APIRouter(
    prefix="/crm",
    tags=["CRM & Lead Management"]
)

# Lead Schemas
class LeadCreateRequest(BaseModel):
    company_id: uuid.UUID
    assignee_id: Optional[uuid.UUID] = None
    lead_type: str
    contact_name: str
    phone_no: str
    email: Optional[str] = None
    client_company_name: Optional[str] = None
    address: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    status: str = "New Lead"
    priority: str = "medium"
    budget: float = 0.0
    description: Optional[str] = None
    next_follow_up: Optional[datetime] = None
    expected_closure: Optional[datetime] = None

class LeadUpdateRequest(BaseModel):
    assignee_id: Optional[uuid.UUID] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    budget: Optional[float] = None
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
    email: Optional[str] = None
    client_company_name: Optional[str] = None
    address: Optional[str] = None
    source: Optional[str] = None
    category: Optional[str] = None
    status: str
    priority: str
    budget: float
    description: Optional[str] = None
    next_follow_up: Optional[datetime] = None
    expected_closure: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Quotation Schemas
class QuotationItemCreateRequest(BaseModel):
    section_name: Optional[str] = None
    item_name: str
    qty: float
    unit: str
    cost_price: float = 0.0
    selling_price: float = 0.0
    supply_rate: float = 0.0
    installation_rate: float = 0.0
    supply_tax_pct: float = 18.00;
    installation_tax_pct: float = 12.00;

class QuotationCreateRequest(BaseModel):
    subject: str
    tax_type: str = "bill_level"  # item_level, bill_level
    gst_pct: float = 18.00
    discount: float = 0.0
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

    class Config:
        from_attributes = True

class QuotationResponse(BaseModel):
    id: uuid.UUID
    lead_id: uuid.UUID
    subject: str
    tax_type: str
    status: str
    gst_pct: float
    discount: float
    total_amount: float
    terms: Optional[str] = None
    created_at: datetime
    items: List[QuotationItemResponse] = []

    class Config:
        from_attributes = True


# --- Lead Endpoints ---

@router.post("/leads", response_model=LeadResponse, status_code=status.HTTP_201_CREATED)
def create_lead(req: LeadCreateRequest, db: Session = Depends(get_db)):
    comp_uuid = uuid.UUID(str(req.company_id))
    company = db.query(Company).filter(Company.id == comp_uuid).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    lead = CRMLead(
        id=uuid.uuid4(),
        company_id=comp_uuid,
        assignee_id=uuid.UUID(str(req.assignee_id)) if req.assignee_id else None,
        lead_type=req.lead_type,
        contact_name=req.contact_name,
        phone_no=req.phone_no,
        email=req.email,
        client_company_name=req.client_company_name,
        address=req.address,
        source=req.source,
        category=req.category,
        status=req.status,
        priority=req.priority,
        budget=req.budget,
        description=req.description,
        next_follow_up=req.next_follow_up,
        expected_closure=req.expected_closure
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead

@router.get("/leads", response_model=List[LeadResponse])
def get_leads(company_id: uuid.UUID, db: Session = Depends(get_db)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(CRMLead).filter(CRMLead.company_id == comp_uuid).all()

@router.put("/leads/{lead_id}", response_model=LeadResponse)
def update_lead(lead_id: uuid.UUID, req: LeadUpdateRequest, db: Session = Depends(get_db)):
    lead_uuid = uuid.UUID(str(lead_id))
    lead = db.query(CRMLead).filter(CRMLead.id == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

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

    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


# --- Quotation Endpoints ---

@router.post("/leads/{lead_id}/quotations", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
def create_quotation(lead_id: uuid.UUID, req: QuotationCreateRequest, db: Session = Depends(get_db)):
    lead_uuid = uuid.UUID(str(lead_id))
    lead = db.query(CRMLead).filter(CRMLead.id == lead_uuid).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Create quotation record
    quot = CRMQuotation(
        id=uuid.uuid4(),
        lead_id=lead_uuid,
        subject=req.subject,
        tax_type=req.tax_type,
        status="Draft",
        gst_pct=req.gst_pct,
        discount=req.discount,
        total_amount=0.0,
        terms=req.terms
    )
    db.add(quot)
    db.flush()

    total_amount = 0.0
    items_to_add = []

    # Calculate item and quotation pricing
    for item in req.items:
        # Base Combined Amount
        unit_price = item.selling_price + item.supply_rate + item.installation_rate
        item_base = item.qty * unit_price
        
        # Calculate item level tax if applicable
        item_tax = 0.0
        if req.tax_type == "item_level":
            if item.supply_rate > 0 or item.installation_rate > 0:
                supply_tax = (item.qty * item.supply_rate) * (item.supply_tax_pct / 100.0)
                install_tax = (item.qty * item.installation_rate) * (item.installation_tax_pct / 100.0)
                selling_tax = (item.qty * item.selling_price) * (req.gst_pct / 100.0)
                item_tax = supply_tax + install_tax + selling_tax
            else:
                item_tax = item_base * (req.gst_pct / 100.0)
        
        item_total = item_base + item_tax
        total_amount += item_total

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
            total_amount=item_total
        )
        items_to_add.append(q_item)
        db.add(q_item)

    # Calculate bill level taxes
    if req.tax_type == "bill_level":
        subtotal = total_amount
        discounted = subtotal - req.discount
        tax = discounted * (req.gst_pct / 100.0)
        final_total = discounted + tax
    else:
        # Discount is directly subtracted from item_level sum
        final_total = total_amount - req.discount

    quot.total_amount = max(final_total, 0.0)
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
        discount=float(quot.discount),
        total_amount=float(quot.total_amount),
        terms=quot.terms,
        created_at=quot.created_at,
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
                total_amount=float(i.total_amount)
            ) for i in items_to_add
        ]
    )
    return res

@router.get("/leads/{lead_id}/quotations", response_model=List[QuotationResponse])
def get_quotations(lead_id: uuid.UUID, db: Session = Depends(get_db)):
    lead_uuid = uuid.UUID(str(lead_id))
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
                discount=float(q.discount),
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
                        total_amount=float(i.total_amount)
                    ) for i in items
                ]
            )
        )
    return results
