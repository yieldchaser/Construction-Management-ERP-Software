from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    MaterialIndent, MaterialIndentItem, 
    PurchaseOrder, PurchaseOrderItem, 
    GoodsReceiptNote, GRNItem, 
    WarehouseInventory, MaterialTransaction
)
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/procurement",
    tags=["Procurement & Inventory"]
)

# Pydantic Schemas
class IndentItemSchema(BaseModel):
    material_name: str
    quantity: float
    unit: str

class IndentCreateRequest(BaseModel):
    company_id: UUID
    project_id: UUID
    requested_by: Optional[UUID] = None
    indent_number: str
    items: List[IndentItemSchema]

class IndentResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    requested_by: Optional[UUID] = None
    indent_number: str
    status: str
    created_at: datetime
    items: List[IndentItemSchema] = []

    class Config:
        from_attributes = True

class POCreateItemSchema(BaseModel):
    material_name: str
    quantity: float
    unit: str
    rate: float
    tax_pct: float = 18.00

class POCreateRequest(BaseModel):
    company_id: UUID
    project_id: UUID
    vendor_id: Optional[UUID] = None
    po_number: str
    po_date: datetime
    items: List[POCreateItemSchema]

class POResponseItemSchema(BaseModel):
    id: UUID
    material_name: str
    quantity: float
    unit: str
    rate: float
    tax_pct: float
    total_amount: float

class POResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    vendor_id: Optional[UUID] = None
    po_number: str
    po_date: datetime
    status: str
    gross_amount: float
    tax_amount: float
    total_amount: float
    approval_flag: str
    created_at: datetime
    items: List[POResponseItemSchema] = []

    class Config:
        from_attributes = True

class GRNCreateItemSchema(BaseModel):
    po_item_id: UUID
    received_qty: float

class GRNCreateRequest(BaseModel):
    company_id: UUID
    project_id: UUID
    po_id: UUID
    grn_number: str
    received_date: datetime
    received_by: Optional[UUID] = None
    items: List[GRNCreateItemSchema]

class GRNResponseItemSchema(BaseModel):
    id: UUID
    po_item_id: UUID
    received_qty: float

class GRNResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    po_id: UUID
    grn_number: str
    received_date: datetime
    received_by: Optional[UUID] = None
    created_at: datetime
    items: List[GRNResponseItemSchema] = []

    class Config:
        from_attributes = True

class InventoryResponse(BaseModel):
    id: UUID
    project_id: UUID
    material_name: str
    on_hand_qty: float
    reserved_qty: float
    unit: str
    created_at: datetime

    class Config:
        from_attributes = True

class TransactionResponse(BaseModel):
    id: UUID
    project_id: UUID
    material_name: str
    qty: float
    type: str
    source_ref_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True

# --- Endpoints ---

# 1. Indents
@router.get("/indents", response_model=List[IndentResponse])
def get_indents(project_id: UUID, db: Session = Depends(get_db)):
    indents = db.query(MaterialIndent).filter(MaterialIndent.project_id == project_id).all()
    res = []
    for ind in indents:
        items = db.query(MaterialIndentItem).filter(MaterialIndentItem.indent_id == ind.id).all()
        item_schemas = [
            IndentItemSchema(
                material_name=i.material_name,
                quantity=float(i.quantity),
                unit=i.unit
            ) for i in items
        ]
        res.append(
            IndentResponse(
                id=ind.id,
                company_id=ind.company_id,
                project_id=ind.project_id,
                requested_by=ind.requested_by,
                indent_number=ind.indent_number,
                status=ind.status,
                created_at=ind.created_at,
                items=item_schemas
            )
        )
    return res

@router.post("/indents", response_model=IndentResponse, status_code=201)
def create_indent(req: IndentCreateRequest, db: Session = Depends(get_db)):
    # Check if indent number already exists for the company
    existing = db.query(MaterialIndent).filter(
        MaterialIndent.company_id == req.company_id,
        MaterialIndent.indent_number == req.indent_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Indent number already exists for this company")

    indent = MaterialIndent(
        company_id=req.company_id,
        project_id=req.project_id,
        requested_by=req.requested_by,
        indent_number=req.indent_number,
        status="pending"
    )
    db.add(indent)
    db.flush()

    item_schemas = []
    for item in req.items:
        db_item = MaterialIndentItem(
            indent_id=indent.id,
            material_name=item.material_name,
            quantity=item.quantity,
            unit=item.unit
        )
        db.add(db_item)
        item_schemas.append(item)

    db.commit()
    db.refresh(indent)

    return IndentResponse(
        id=indent.id,
        company_id=indent.company_id,
        project_id=indent.project_id,
        requested_by=indent.requested_by,
        indent_number=indent.indent_number,
        status=indent.status,
        created_at=indent.created_at,
        items=item_schemas
    )

@router.post("/indents/{indent_id}/approve", response_model=IndentResponse)
def approve_indent(indent_id: UUID, db: Session = Depends(get_db)):
    indent = db.query(MaterialIndent).filter(MaterialIndent.id == indent_id).first()
    if not indent:
        raise HTTPException(status_code=404, detail="Indent not found")
    
    indent.status = "approved"
    db.commit()
    db.refresh(indent)

    items = db.query(MaterialIndentItem).filter(MaterialIndentItem.indent_id == indent.id).all()
    item_schemas = [
        IndentItemSchema(
            material_name=i.material_name,
            quantity=float(i.quantity),
            unit=i.unit
        ) for i in items
    ]
    return IndentResponse(
        id=indent.id,
        company_id=indent.company_id,
        project_id=indent.project_id,
        requested_by=indent.requested_by,
        indent_number=indent.indent_number,
        status=indent.status,
        created_at=indent.created_at,
        items=item_schemas
    )

# 2. Purchase Orders
@router.get("/pos", response_model=List[POResponse])
def get_pos(project_id: UUID, db: Session = Depends(get_db)):
    pos = db.query(PurchaseOrder).filter(PurchaseOrder.project_id == project_id).all()
    res = []
    for po in pos:
        items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po.id).all()
        item_schemas = [
            POResponseItemSchema(
                id=i.id,
                material_name=i.material_name,
                quantity=float(i.quantity),
                unit=i.unit,
                rate=float(i.rate),
                tax_pct=float(i.tax_pct),
                total_amount=float(i.total_amount) if i.total_amount else float(i.quantity * i.rate)
            ) for i in items
        ]
        res.append(
            POResponse(
                id=po.id,
                company_id=po.company_id,
                project_id=po.project_id,
                vendor_id=po.vendor_id,
                po_number=po.po_number,
                po_date=po.po_date,
                status=po.status,
                gross_amount=float(po.gross_amount),
                tax_amount=float(po.tax_amount),
                total_amount=float(po.total_amount),
                approval_flag=po.approval_flag,
                created_at=po.created_at,
                items=item_schemas
            )
        )
    return res

@router.post("/pos", response_model=POResponse, status_code=201)
def create_po(req: POCreateRequest, db: Session = Depends(get_db)):
    # Check if PO number already exists
    existing = db.query(PurchaseOrder).filter(
        PurchaseOrder.company_id == req.company_id,
        PurchaseOrder.po_number == req.po_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="PO number already exists for this company")

    gross_amount = 0.0
    tax_amount = 0.0

    po_items = []
    for item in req.items:
        item_gross = item.quantity * item.rate
        item_tax = item_gross * (item.tax_pct / 100.0)
        item_total = item_gross + item_tax

        gross_amount += item_gross
        tax_amount += item_tax

        po_items.append((item, item_total))

    po = PurchaseOrder(
        company_id=req.company_id,
        project_id=req.project_id,
        vendor_id=req.vendor_id,
        po_number=req.po_number,
        po_date=req.po_date,
        status="draft",
        gross_amount=gross_amount,
        tax_amount=tax_amount,
        total_amount=gross_amount + tax_amount,
        approval_flag="pending"
    )
    db.add(po)
    db.flush()

    item_responses = []
    for item, total in po_items:
        db_item = PurchaseOrderItem(
            po_id=po.id,
            material_name=item.material_name,
            quantity=item.quantity,
            unit=item.unit,
            rate=item.rate,
            tax_pct=item.tax_pct,
            total_amount=total
        )
        db.add(db_item)
        db.flush()
        
        item_responses.append(
            POResponseItemSchema(
                id=db_item.id,
                material_name=db_item.material_name,
                quantity=float(db_item.quantity),
                unit=db_item.unit,
                rate=float(db_item.rate),
                tax_pct=float(db_item.tax_pct),
                total_amount=float(db_item.total_amount)
            )
        )

    db.commit()
    db.refresh(po)

    return POResponse(
        id=po.id,
        company_id=po.company_id,
        project_id=po.project_id,
        vendor_id=po.vendor_id,
        po_number=po.po_number,
        po_date=po.po_date,
        status=po.status,
        gross_amount=float(po.gross_amount),
        tax_amount=float(po.tax_amount),
        total_amount=float(po.total_amount),
        approval_flag=po.approval_flag,
        created_at=po.created_at,
        items=item_responses
    )

@router.post("/pos/{po_id}/approve", response_model=POResponse)
def approve_po(po_id: UUID, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    
    po.approval_flag = "approved"
    po.status = "sent"
    db.commit()
    db.refresh(po)

    items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po.id).all()
    item_schemas = [
        POResponseItemSchema(
            id=i.id,
            material_name=i.material_name,
            quantity=float(i.quantity),
            unit=i.unit,
            rate=float(i.rate),
            tax_pct=float(i.tax_pct),
            total_amount=float(i.total_amount) if i.total_amount else float(i.quantity * i.rate)
        ) for i in items
    ]
    return POResponse(
        id=po.id,
        company_id=po.company_id,
        project_id=po.project_id,
        vendor_id=po.vendor_id,
        po_number=po.po_number,
        po_date=po.po_date,
        status=po.status,
        gross_amount=float(po.gross_amount),
        tax_amount=float(po.tax_amount),
        total_amount=float(po.total_amount),
        approval_flag=po.approval_flag,
        created_at=po.created_at,
        items=item_schemas
    )

# 3. Goods Receipt Notes (GRN) & Inventory State Trigger
@router.get("/grns", response_model=List[GRNResponse])
def get_grns(project_id: UUID, db: Session = Depends(get_db)):
    grns = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.project_id == project_id).all()
    res = []
    for g in grns:
        items = db.query(GRNItem).filter(GRNItem.grn_id == g.id).all()
        item_schemas = [
            GRNResponseItemSchema(
                id=i.id,
                po_item_id=i.po_item_id,
                received_qty=float(i.received_qty)
            ) for i in items
        ]
        res.append(
            GRNResponse(
                id=g.id,
                company_id=g.company_id,
                project_id=g.project_id,
                po_id=g.po_id,
                grn_number=g.grn_number,
                received_date=g.received_date,
                received_by=g.received_by,
                created_at=g.created_at,
                items=item_schemas
            )
        )
    return res

@router.post("/grns", response_model=GRNResponse, status_code=201)
def create_grn(req: GRNCreateRequest, db: Session = Depends(get_db)):
    # Check if GRN number already exists
    existing = db.query(GoodsReceiptNote).filter(
        GoodsReceiptNote.company_id == req.company_id,
        GoodsReceiptNote.grn_number == req.grn_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="GRN number already exists for this company")

    # 1. Check PO exists
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == req.po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")

    grn = GoodsReceiptNote(
        company_id=req.company_id,
        project_id=req.project_id,
        po_id=req.po_id,
        grn_number=req.grn_number,
        received_date=req.received_date,
        received_by=req.received_by
    )
    db.add(grn)
    db.flush()

    item_responses = []
    for item in req.items:
        # Check PO item exists
        po_item = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.id == item.po_item_id).first()
        if not po_item:
            raise HTTPException(status_code=400, detail=f"PO Item {item.po_item_id} not found")

        # 2. Create GRN item
        db_item = GRNItem(
            grn_id=grn.id,
            po_item_id=item.po_item_id,
            received_qty=item.received_qty
        )
        db.add(db_item)
        db.flush()

        item_responses.append(
            GRNResponseItemSchema(
                id=db_item.id,
                po_item_id=db_item.po_item_id,
                received_qty=float(db_item.received_qty)
            )
        )

        # 3. STATEFUL INVENTORY TRIGGER: Increment WarehouseInventory levels
        inv = db.query(WarehouseInventory).filter(
            WarehouseInventory.project_id == req.project_id,
            WarehouseInventory.material_name == po_item.material_name
        ).first()

        if inv:
            inv.on_hand_qty = float(inv.on_hand_qty) + item.received_qty
        else:
            inv = WarehouseInventory(
                project_id=req.project_id,
                material_name=po_item.material_name,
                on_hand_qty=item.received_qty,
                reserved_qty=0.0,
                unit=po_item.unit
            )
            db.add(inv)
            db.flush()

        # 4. STATEFUL TRANSACTION LOG: Write to material_transactions
        txn = MaterialTransaction(
            project_id=req.project_id,
            material_name=po_item.material_name,
            qty=item.received_qty,
            type="received",
            source_ref_id=grn.id
        )
        db.add(txn)

    # 5. Transition PO status to partial or closed (simplified to partial or received based on GRN creation)
    po.status = "received"
    
    db.commit()
    db.refresh(grn)

    return GRNResponse(
        id=grn.id,
        company_id=grn.company_id,
        project_id=grn.project_id,
        po_id=grn.po_id,
        grn_number=grn.grn_number,
        received_date=grn.received_date,
        received_by=grn.received_by,
        created_at=grn.created_at,
        items=item_responses
    )

# 4. Warehouse Inventory
@router.get("/inventory", response_model=List[InventoryResponse])
def get_inventory(project_id: UUID, db: Session = Depends(get_db)):
    inv = db.query(WarehouseInventory).filter(WarehouseInventory.project_id == project_id).all()
    return [
        InventoryResponse(
            id=i.id,
            project_id=i.project_id,
            material_name=i.material_name,
            on_hand_qty=float(i.on_hand_qty),
            reserved_qty=float(i.reserved_qty),
            unit=i.unit,
            created_at=i.created_at
        ) for i in inv
    ]

# 5. Material Transactions
@router.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(project_id: UUID, db: Session = Depends(get_db)):
    txns = db.query(MaterialTransaction).filter(MaterialTransaction.project_id == project_id).order_by(MaterialTransaction.created_at.desc()).all()
    return [
        TransactionResponse(
            id=t.id,
            project_id=t.project_id,
            material_name=t.material_name,
            qty=float(t.qty),
            type=t.type,
            source_ref_id=t.source_ref_id,
            created_at=t.created_at
        ) for t in txns
    ]
