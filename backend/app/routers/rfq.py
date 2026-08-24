from uuid import UUID
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_in_company, verify_project_access, get_company_membership, require_permission
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
    quantity: float = Field(..., ge=0)
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
    quoted_rate: float = Field(..., ge=0)
    delivery_days: Optional[int] = Field(None, ge=0)
    terms: Optional[str] = None
    validity_days: int = Field(30, ge=0)


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
    extended_total: Optional[float] = None
    is_lowest: bool = False

    class Config:
        from_attributes = True


class ComparisonRow(BaseModel):
    item_id: UUID
    material_name: str
    quantity: float
    unit: str
    vendors: List[RFQQuoteResponse]
    lowest_rate: Optional[float] = None
    highest_rate: Optional[float] = None
    price_spread: Optional[float] = None
    recommended_vendor_name: Optional[str] = None


# --- Endpoints ---

@router.post("/rfq", response_model=RFQResponse, status_code=201)
def create_rfq(req: RFQCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, req.company_id)
    verify_project_in_company(db, req.project_id, req.company_id)
    require_permission(db, current_user, req.company_id, "procurement:edit")
    existing = db.query(RFQ).filter(
        RFQ.company_id == req.company_id,
        RFQ.rfq_number == req.rfq_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="RFQ number already exists for this company")

    if req.valid_until:
        valid_until = req.valid_until
        if valid_until.tzinfo is None:
            valid_until = valid_until.replace(tzinfo=timezone.utc)
        if valid_until < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="valid_until must be in the future")

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
    require_permission(db, current_user, rfq.company_id, "procurement:edit")

    if rfq.valid_until:
        valid_until = rfq.valid_until
        if valid_until.tzinfo is None:
            valid_until = valid_until.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > valid_until:
            raise HTTPException(status_code=400, detail="RFQ validity has expired; quotes cannot be submitted")

    if rfq.status == "closed":
        raise HTTPException(status_code=409, detail="RFQ is closed; quotes cannot be submitted")

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


def _build_rfq_response(db: Session, rfq: RFQ) -> RFQResponse:
    items = db.query(RFQItem).filter(RFQItem.rfq_id == rfq.id).all()
    return RFQResponse(
        id=rfq.id,
        company_id=rfq.company_id,
        project_id=rfq.project_id,
        rfq_number=rfq.rfq_number,
        status=rfq.status,
        valid_until=rfq.valid_until,
        notes=rfq.notes,
        items=[
            RFQItemResponse(
                id=i.id,
                rfq_id=i.rfq_id,
                material_name=i.material_name,
                quantity=float(i.quantity),
                unit=i.unit,
                specifications=i.specifications,
            ) for i in items
        ],
        created_at=rfq.created_at,
    )


@router.post("/rfq/{rfq_id}/send", response_model=RFQResponse)
def send_rfq(rfq_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    get_company_membership(db, current_user, rfq.company_id)
    require_permission(db, current_user, rfq.company_id, "procurement:edit")
    if rfq.status != "draft":
        raise HTTPException(status_code=409, detail=f"Only draft RFQs can be sent (current status: {rfq.status})")
    rfq.status = "sent"
    db.commit()
    db.refresh(rfq)
    return _build_rfq_response(db, rfq)


@router.post("/rfq/{rfq_id}/close", response_model=RFQResponse)
def close_rfq(rfq_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    get_company_membership(db, current_user, rfq.company_id)
    require_permission(db, current_user, rfq.company_id, "procurement:edit")
    if rfq.status != "sent":
        raise HTTPException(status_code=409, detail=f"Only sent RFQs can be closed (current status: {rfq.status})")
    rfq.status = "closed"
    db.commit()
    db.refresh(rfq)
    return _build_rfq_response(db, rfq)


@router.get("/rfq/{rfq_id}/comparison", response_model=List[ComparisonRow])
def get_comparison(rfq_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    get_company_membership(db, current_user, rfq.company_id)

    items = db.query(RFQItem).filter(RFQItem.rfq_id == rfq_id).all()
    result = []
    for item in items:
        quotes = db.query(RFQQuote).filter(RFQQuote.item_id == item.id).all()
        rates = [float(q.quoted_rate) for q in quotes]
        lowest_rate = min(rates) if rates else None
        highest_rate = max(rates) if rates else None
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
                extended_total=round(float(q.quoted_rate) * float(item.quantity), 2),
                is_lowest=(lowest_rate is not None and float(q.quoted_rate) == lowest_rate),
            ) for q in quotes
        ]
        recommended = next((r for r in quote_responses if r.is_lowest), None)
        result.append(ComparisonRow(
            item_id=item.id,
            material_name=item.material_name,
            quantity=float(item.quantity),
            unit=item.unit,
            vendors=quote_responses,
            lowest_rate=lowest_rate,
            highest_rate=highest_rate,
            price_spread=round(highest_rate - lowest_rate, 2) if lowest_rate is not None and highest_rate is not None else None,
            recommended_vendor_name=recommended.vendor_name if recommended else None,
        ))
    return result
