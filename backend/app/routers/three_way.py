import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from decimal import Decimal
from app.database import get_db
from app.auth import get_current_user, verify_company_access, get_company_membership
from app.models import ThreeWayMatch, PurchaseOrder, GoodsReceiptNote, GRNItem, User

router = APIRouter(prefix="/three-way", tags=["3-Way Matching"], dependencies=[Depends(get_current_user)])


class ThreeWayMatchCreate(BaseModel):
    company_id: uuid.UUID
    project_id: uuid.UUID
    po_id: uuid.UUID
    grn_id: uuid.UUID
    invoice_id: Optional[uuid.UUID] = None
    invoiced_amount: float = Field(..., ge=0)
    variance_reason: Optional[str] = None
    matched_by: Optional[uuid.UUID] = None
    match_status: str = "pending"


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
    po_number: Optional[str] = None
    grn_number: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PORef(BaseModel):
    id: uuid.UUID
    po_number: str
    total_amount: float
    vendor_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


class GRNRef(BaseModel):
    id: uuid.UUID
    grn_number: str
    po_id: Optional[uuid.UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=ThreeWayMatchResponse, status_code=status.HTTP_201_CREATED)
def create_match(payload: ThreeWayMatchCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
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
    match_status = payload.match_status if payload.match_status else ("matched" if abs(variance) < 0.01 else "mismatch")

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
    return ThreeWayMatchResponse(
        **{**match.__dict__},
        po_number=po.po_number,
        grn_number=grn.grn_number,
    )


@router.get("/{company_id}", response_model=List[ThreeWayMatchResponse])
def list_matches(company_id: uuid.UUID, project_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    query = db.query(ThreeWayMatch).filter(ThreeWayMatch.company_id == company_id)
    if project_id:
        query = query.filter(ThreeWayMatch.project_id == project_id)
    matches = query.order_by(ThreeWayMatch.created_at.desc()).all()
    result = []
    for m in matches:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == m.po_id).first()
        grn = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.id == m.grn_id).first()
        result.append(ThreeWayMatchResponse(
            **{**m.__dict__},
            po_number=po.po_number if po else None,
            grn_number=grn.grn_number if grn else None,
        ))
    return result


@router.get("/pos/{company_id}", response_model=List[PORef])
def list_pos(company_id: uuid.UUID, project_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    query = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == company_id)
    if project_id:
        query = query.filter(PurchaseOrder.project_id == project_id)
    return query.order_by(PurchaseOrder.created_at.desc()).limit(100).all()


@router.get("/grns/{company_id}", response_model=List[GRNRef])
def list_grns(company_id: uuid.UUID, project_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    query = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.company_id == company_id)
    if project_id:
        query = query.filter(GoodsReceiptNote.project_id == project_id)
    return query.order_by(GoodsReceiptNote.created_at.desc()).limit(100).all()


@router.patch("/{match_id}/approve", response_model=ThreeWayMatchResponse)
def approve_match(match_id: uuid.UUID, approved_by: Optional[uuid.UUID] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    match = db.query(ThreeWayMatch).filter(ThreeWayMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    get_company_membership(db, current_user, match.company_id)
    match.match_status = "approved"
    match.matched_by = approved_by
    match.matched_at = datetime.utcnow()
    db.commit()
    db.refresh(match)
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == match.po_id).first()
    grn = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.id == match.grn_id).first()
    return ThreeWayMatchResponse(
        **{**match.__dict__},
        po_number=po.po_number if po else None,
        grn_number=grn.grn_number if grn else None,
    )


@router.patch("/{match_id}/reject", response_model=ThreeWayMatchResponse)
def reject_match(match_id: uuid.UUID, reason: Optional[str] = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    match = db.query(ThreeWayMatch).filter(ThreeWayMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    get_company_membership(db, current_user, match.company_id)
    match.match_status = "rejected"
    match.variance_reason = reason or match.variance_reason
    db.commit()
    db.refresh(match)
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == match.po_id).first()
    grn = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.id == match.grn_id).first()
    return ThreeWayMatchResponse(
        **{**match.__dict__},
        po_number=po.po_number if po else None,
        grn_number=grn.grn_number if grn else None,
    )
