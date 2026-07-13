from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_access, get_company_membership
from app.models import RFQ, RFQItem, RFQQuote, User
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/procurement",
    tags=["RFQ Management"],
    dependencies=[Depends(get_current_user)]
)


# --- Schemas ---
class RFQItemCreate(BaseModel):
    material_name: str
    quantity: float
    unit: str
    specifications: Optional[str] = None


class RFQCreateRequest(BaseModel):
    company_id: UUID
    project_id: UUID
    rfq_number: str
    items: List[RFQItemCreate]
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None


class RFQItemResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    material_name: str
    quantity: float
    unit: str
    specifications: Optional[str] = None

    class Config:
        from_attributes = True


class RFQResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    rfq_number: str
    status: str
    valid_until: Optional[datetime] = None
    notes: Optional[str] = None
    items: List[RFQItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True


class RFQQuoteCreate(BaseModel):
    vendor_id: Optional[UUID] = None
    vendor_name: str
    item_id: UUID
    quoted_rate: float
    delivery_days: Optional[int] = None
    terms: Optional[str] = None
    validity_days: int = 30


class RFQQuoteResponse(BaseModel):
    id: UUID
    rfq_id: UUID
    vendor_id: Optional[UUID] = None
    vendor_name: str
    item_id: UUID
    quoted_rate: float
    delivery_days: Optional[int] = None
    terms: Optional[str] = None
    validity_days: int
    submitted_at: datetime

    class Config:
        from_attributes = True


class ComparisonRow(BaseModel):
    item_id: UUID
    material_name: str
    quantity: float
    unit: str
    vendors: List[RFQQuoteResponse]


# --- Endpoints ---

@router.post("/rfq", response_model=RFQResponse, status_code=201)
def create_rfq(req: RFQCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, req.company_id)
    existing = db.query(RFQ).filter(
        RFQ.company_id == req.company_id,
        RFQ.rfq_number == req.rfq_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="RFQ number already exists for this company")

    rfq = RFQ(
        company_id=req.company_id,
        project_id=req.project_id,
        rfq_number=req.rfq_number,
        status="draft",
        valid_until=req.valid_until,
        notes=req.notes,
    )
    db.add(rfq)
    db.flush()

    item_responses = []
    for item in req.items:
        db_item = RFQItem(
            rfq_id=rfq.id,
            material_name=item.material_name,
            quantity=item.quantity,
            unit=item.unit,
            specifications=item.specifications,
        )
        db.add(db_item)
        db.flush()
        item_responses.append(RFQItemResponse(
            id=db_item.id,
            rfq_id=rfq.id,
            material_name=db_item.material_name,
            quantity=float(db_item.quantity),
            unit=db_item.unit,
            specifications=db_item.specifications,
        ))

    db.commit()
    db.refresh(rfq)
    return RFQResponse(
        id=rfq.id,
        company_id=rfq.company_id,
        project_id=rfq.project_id,
        rfq_number=rfq.rfq_number,
        status=rfq.status,
        valid_until=rfq.valid_until,
        notes=rfq.notes,
        items=item_responses,
        created_at=rfq.created_at,
    )


@router.get("/rfq/{project_id}", response_model=List[RFQResponse])
def list_rfq(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    rfqs = db.query(RFQ).filter(RFQ.project_id == project_id).all()
    result = []
    for rfq in rfqs:
        items = db.query(RFQItem).filter(RFQItem.rfq_id == rfq.id).all()
        item_responses = [
            RFQItemResponse(
                id=i.id,
                rfq_id=i.rfq_id,
                material_name=i.material_name,
                quantity=float(i.quantity),
                unit=i.unit,
                specifications=i.specifications,
            ) for i in items
        ]
        result.append(RFQResponse(
            id=rfq.id,
            company_id=rfq.company_id,
            project_id=rfq.project_id,
            rfq_number=rfq.rfq_number,
            status=rfq.status,
            valid_until=rfq.valid_until,
            notes=rfq.notes,
            items=item_responses,
            created_at=rfq.created_at,
        ))
    return result


@router.post("/rfq/{rfq_id}/quotes", response_model=RFQQuoteResponse, status_code=201)
def submit_quote(rfq_id: UUID, req: RFQQuoteCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    get_company_membership(db, current_user, rfq.company_id)

    db_item = db.query(RFQItem).filter(RFQItem.id == req.item_id).first()
    if not db_item or db_item.rfq_id != rfq_id:
        raise HTTPException(status_code=404, detail="RFQ item not found")

    quote = RFQQuote(
        rfq_id=rfq_id,
        vendor_id=req.vendor_id,
        vendor_name=req.vendor_name,
        item_id=req.item_id,
        quoted_rate=req.quoted_rate,
        delivery_days=req.delivery_days,
        terms=req.terms,
        validity_days=req.validity_days,
        submitted_at=datetime.utcnow(),
    )
    db.add(quote)
    db.commit()
    db.refresh(quote)
    return RFQQuoteResponse(
        id=quote.id,
        rfq_id=quote.rfq_id,
        vendor_id=quote.vendor_id,
        vendor_name=quote.vendor_name,
        item_id=quote.item_id,
        quoted_rate=float(quote.quoted_rate),
        delivery_days=quote.delivery_days,
        terms=quote.terms,
        validity_days=quote.validity_days,
        submitted_at=quote.submitted_at,
    )


@router.get("/rfq/{rfq_id}/comparison", response_model=List[ComparisonRow])
def get_comparison(rfq_id: UUID, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")

    items = db.query(RFQItem).filter(RFQItem.rfq_id == rfq_id).all()
    result = []
    for item in items:
        quotes = db.query(RFQQuote).filter(RFQQuote.item_id == item.id).all()
        quote_responses = [
            RFQQuoteResponse(
                id=q.id,
                rfq_id=q.rfq_id,
                vendor_id=q.vendor_id,
                vendor_name=q.vendor_name,
                item_id=q.item_id,
                quoted_rate=float(q.quoted_rate),
                delivery_days=q.delivery_days,
                terms=q.terms,
                validity_days=q.validity_days,
                submitted_at=q.submitted_at,
            ) for q in quotes
        ]
        result.append(ComparisonRow(
            item_id=item.id,
            material_name=item.material_name,
            quantity=float(item.quantity),
            unit=item.unit,
            vendors=quote_responses,
        ))
    return result
