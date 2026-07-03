import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import ThreeWayMatch, PurchaseOrder, GoodsReceiptNote, GRNItem
from decimal import Decimal

router = APIRouter(prefix="/three-way", tags=["3-Way Matching"])


class ThreeWayMatchCreate(BaseModel):
    company_id: uuid.UUID
    project_id: uuid.UUID
    po_id: uuid.UUID
    grn_id: uuid.UUID
    invoice_id: Optional[uuid.UUID] = None
    invoiced_amount: float
    variance_reason: Optional[str] = None
    matched_by: Optional[uuid.UUID] = None


class ThreeWayMatchResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    po_id: uuid.UUID
    grn_id: uuid.UUID
    invoice_id: Optional[uuid.UUID]
    match_status: str
    po_amount: float
    grn_qty: float
    invoiced_amount: float
    variance_amount: float
    variance_reason: Optional[str]
    matched_by: Optional[uuid.UUID]
    matched_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=ThreeWayMatchResponse, status_code=status.HTTP_201_CREATED)
def create_match(payload: ThreeWayMatchCreate, db: Session = Depends(get_db)):
    po_id = str(payload.po_id)
    grn_id = str(payload.grn_id)

    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    grn = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.id == grn_id).first()
    if not po or not grn:
        raise HTTPException(status_code=404, detail="PO or GRN not found")

    po_amount = float(po.total_amount)
    grn_items = db.query(GRNItem).filter(GRNItem.grn_id == grn_id).all()
    total_received_qty = sum(float(item.received_qty) for item in grn_items)

    invoiced_amount = float(payload.invoiced_amount)
    variance = round(invoiced_amount - po_amount, 2)
    match_status = "matched" if abs(variance) < 0.01 else "mismatch"

    match = ThreeWayMatch(
        company_id=payload.company_id,
        project_id=payload.project_id,
        po_id=po_id,
        grn_id=grn_id,
        invoice_id=payload.invoice_id,
        match_status=match_status,
        po_amount=Decimal(str(po_amount)),
        grn_qty=Decimal(str(total_received_qty)),
        invoiced_amount=Decimal(str(invoiced_amount)),
        variance_amount=Decimal(str(variance)),
        variance_reason=payload.variance_reason,
        matched_by=payload.matched_by,
        matched_at=datetime.utcnow() if match_status == "matched" else None,
    )
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.get("/{company_id}", response_model=List[ThreeWayMatchResponse])
def list_matches(company_id: uuid.UUID, project_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db)):
    query = db.query(ThreeWayMatch).filter(ThreeWayMatch.company_id == company_id)
    if project_id:
        query = query.filter(ThreeWayMatch.project_id == project_id)
    return query.order_by(ThreeWayMatch.created_at.desc()).all()
