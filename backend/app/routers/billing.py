from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import (
    WorkOrder, WorkOrderItem, Bill, TransactionDeduction, 
    DebitNote, CreditNote
)
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/billing",
    tags=["Subcontractor Work Orders & Billing"]
)

# Pydantic Schemas
class WOItemSchema(BaseModel):
    boq_item_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    quantity: float
    rate: float

class WOCreateRequest(BaseModel):
    company_id: UUID
    project_id: UUID
    subcontractor_id: UUID
    wo_number: str
    wo_date: datetime
    items: List[WOItemSchema]
    terms: Optional[str] = None

class WOResponseItem(BaseModel):
    id: UUID
    boq_item_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    quantity: float
    rate: float
    amount: float

class WOResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    subcontractor_id: UUID
    wo_number: str
    wo_date: datetime
    status: str
    estimated_work_amount: float
    terms: Optional[str] = None
    created_at: datetime
    items: List[WOResponseItem] = []

    class Config:
        from_attributes = True

class DeductionItemSchema(BaseModel):
    deduction_type: str = Field(..., example="TDS") # TDS, Retention, Security Deposit, Advance Recovery, Material Recovery
    amount: float
    percentage: Optional[float] = None
    notes: Optional[str] = None

class BillCreateRequest(BaseModel):
    company_id: UUID
    project_id: UUID
    party_company_user_id: UUID
    invoice_number: str
    invoice_date: datetime
    due_date: Optional[datetime] = None
    invoice_type: str = Field(..., example="subcon") # sale, purchase, subcon
    subtotal: float
    gst_pct: float = 18.00
    deductions: List[DeductionItemSchema] = []
    pre_tax_deductions: bool = False

class DeductionResponseSchema(BaseModel):
    id: UUID
    deduction_type: str
    amount: float
    percentage: Optional[float] = None
    notes: Optional[str] = None

class BillResponse(BaseModel):
    id: UUID
    company_id: UUID
    project_id: UUID
    party_company_user_id: UUID
    invoice_number: str
    invoice_date: datetime
    due_date: Optional[datetime] = None
    invoice_type: str
    status: str
    subtotal: float
    gst_amount: float
    total_payable: float
    paid_amount: float
    approval_flag: str
    is_milestone_fixed_amount: bool
    created_at: datetime
    deductions: List[DeductionResponseSchema] = []

    class Config:
        from_attributes = True

class DebitNoteCreateRequest(BaseModel):
    project_id: UUID
    company_id: UUID
    party_company_user_id: UUID
    notes: Optional[str] = None
    total_amount: float
    work_amount: float = 0.0
    gst_amount: float = 0.0
    bill_id: Optional[UUID] = None
    reference_number: Optional[str] = None

class DebitNoteResponse(BaseModel):
    id: UUID
    project_id: UUID
    company_id: UUID
    party_company_user_id: UUID
    notes: Optional[str] = None
    total_amount: float
    work_amount: float
    gst_amount: float
    bill_id: Optional[UUID] = None
    reference_number: Optional[str] = None
    approval_flag: str
    created_at: datetime

    class Config:
        from_attributes = True

class CreditNoteCreateRequest(BaseModel):
    project_id: UUID
    company_id: UUID
    party_company_user_id: UUID
    notes: Optional[str] = None
    total_amount: float
    bill_id: Optional[UUID] = None
    reference_number: Optional[str] = None

class CreditNoteResponse(BaseModel):
    id: UUID
    project_id: UUID
    company_id: UUID
    party_company_user_id: UUID
    notes: Optional[str] = None
    total_amount: float
    bill_id: Optional[UUID] = None
    reference_number: Optional[str] = None
    approval_flag: str
    created_at: datetime

    class Config:
        from_attributes = True

# --- Endpoints ---

# 1. Work Orders
@router.get("/work-orders", response_model=List[WOResponse])
def get_work_orders(project_id: UUID, db: Session = Depends(get_db)):
    orders = db.query(WorkOrder).filter(WorkOrder.project_id == project_id).all()
    res = []
    for wo in orders:
        items = db.query(WorkOrderItem).filter(WorkOrderItem.wo_id == wo.id).all()
        item_schemas = [
            WOResponseItem(
                id=i.id,
                boq_item_id=i.boq_item_id,
                task_id=i.task_id,
                quantity=float(i.quantity),
                rate=float(i.rate),
                amount=float(i.amount) if i.amount else float(i.quantity * i.rate)
            ) for i in items
        ]
        res.append(
            WOResponse(
                id=wo.id,
                company_id=wo.company_id,
                project_id=wo.project_id,
                subcontractor_id=wo.subcontractor_id,
                wo_number=wo.wo_number,
                wo_date=wo.wo_date,
                status=wo.status,
                estimated_work_amount=float(wo.estimated_work_amount),
                terms=wo.terms,
                created_at=wo.created_at,
                items=item_schemas
            )
        )
    return res

@router.post("/work-orders", response_model=WOResponse, status_code=201)
def create_work_order(req: WOCreateRequest, db: Session = Depends(get_db)):
    # Check if WO number already exists for company
    existing = db.query(WorkOrder).filter(
        WorkOrder.company_id == req.company_id,
        WorkOrder.wo_number == req.wo_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Work Order number already exists for this company")

    estimated_amount = sum(item.quantity * item.rate for item in req.items)

    wo = WorkOrder(
        company_id=req.company_id,
        project_id=req.project_id,
        subcontractor_id=req.subcontractor_id,
        wo_number=req.wo_number,
        wo_date=req.wo_date,
        status="active",
        estimated_work_amount=estimated_amount,
        terms=req.terms
    )
    db.add(wo)
    db.flush()

    item_schemas = []
    for item in req.items:
        db_item = WorkOrderItem(
            wo_id=wo.id,
            boq_item_id=item.boq_item_id,
            task_id=item.task_id,
            quantity=item.quantity,
            rate=item.rate,
            amount=item.quantity * item.rate
        )
        db.add(db_item)
        db.flush()
        
        item_schemas.append(
            WOResponseItem(
                id=db_item.id,
                boq_item_id=db_item.boq_item_id,
                task_id=db_item.task_id,
                quantity=float(db_item.quantity),
                rate=float(db_item.rate),
                amount=float(db_item.amount)
            )
        )

    db.commit()
    db.refresh(wo)

    return WOResponse(
        id=wo.id,
        company_id=wo.company_id,
        project_id=wo.project_id,
        subcontractor_id=wo.subcontractor_id,
        wo_number=wo.wo_number,
        wo_date=wo.wo_date,
        status=wo.status,
        estimated_work_amount=float(wo.estimated_work_amount),
        terms=wo.terms,
        created_at=wo.created_at,
        items=item_schemas
    )

# 2. Bills
@router.get("/bills", response_model=List[BillResponse])
def get_bills(project_id: UUID, invoice_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Bill).filter(Bill.project_id == project_id)
    if invoice_type:
        query = query.filter(Bill.invoice_type == invoice_type)
    bills = query.all()
    
    res = []
    for b in bills:
        deductions = db.query(TransactionDeduction).filter(TransactionDeduction.bill_id == b.id).all()
        ded_schemas = [
            DeductionResponseSchema(
                id=d.id,
                deduction_type=d.deduction_type,
                amount=float(d.amount),
                percentage=float(d.percentage) if d.percentage else None,
                notes=d.notes
            ) for d in deductions
        ]
        res.append(
            BillResponse(
                id=b.id,
                company_id=b.company_id,
                project_id=b.project_id,
                party_company_user_id=b.party_company_user_id,
                invoice_number=b.invoice_number,
                invoice_date=b.invoice_date,
                due_date=b.due_date,
                invoice_type=b.invoice_type,
                status=b.status,
                subtotal=float(b.subtotal),
                gst_amount=float(b.gst_amount),
                total_payable=float(b.total_payable),
                paid_amount=float(b.paid_amount),
                approval_flag=b.approval_flag,
                is_milestone_fixed_amount=b.is_milestone_fixed_amount,
                created_at=b.created_at,
                deductions=ded_schemas
            )
        )
    return res

@router.post("/bills", response_model=BillResponse, status_code=201)
def create_bill(req: BillCreateRequest, db: Session = Depends(get_db)):
    # Mathematical Core Billing Engine
    ded_amt = 0.0
    deduction_details = []

    # Calculate pre-determined deduction amounts
    if req.pre_tax_deductions:
        # Pre-Tax Calculations (Deductions subtract from taxable subtotal first, but GST is on gross)
        for d in req.deductions:
            item_amt = 0.0
            if d.percentage:
                item_amt = req.subtotal * (d.percentage / 100.0)
            else:
                item_amt = d.amount
            ded_amt += item_amt
            deduction_details.append((d, item_amt))

        gst_amount = (req.subtotal - ded_amt) * (req.gst_pct / 100.0)
        total_payable = req.subtotal - ded_amt + gst_amount
    else:
        # Post-Tax Calculations (GST calculated on subtotal first, deductions subtracted from gross total)
        gst_amount = req.subtotal * (req.gst_pct / 100.0)
        gross_total = req.subtotal + gst_amount

        for d in req.deductions:
            item_amt = 0.0
            if d.deduction_type == "Retention" and d.percentage:
                # Retention calculated on gross total post-tax
                item_amt = gross_total * (d.percentage / 100.0)
            elif d.percentage:
                item_amt = req.subtotal * (d.percentage / 100.0)
            else:
                item_amt = d.amount
            ded_amt += item_amt
            deduction_details.append((d, item_amt))

        total_payable = gross_total - ded_amt

    bill = Bill(
        company_id=req.company_id,
        project_id=req.project_id,
        party_company_user_id=req.party_company_user_id,
        invoice_number=req.invoice_number,
        invoice_date=req.invoice_date,
        due_date=req.due_date,
        invoice_type=req.invoice_type,
        status="Unpaid",
        subtotal=req.subtotal,
        gst_amount=gst_amount,
        total_payable=total_payable,
        paid_amount=0.0,
        approval_flag="pending",
        is_milestone_fixed_amount=False
    )
    db.add(bill)
    db.flush()

    ded_responses = []
    for d, calculated_amt in deduction_details:
        db_ded = TransactionDeduction(
            bill_id=bill.id,
            deduction_type=d.deduction_type,
            amount=calculated_amt,
            percentage=d.percentage,
            notes=d.notes
        )
        db.add(db_ded)
        db.flush()
        
        ded_responses.append(
            DeductionResponseSchema(
                id=db_ded.id,
                deduction_type=db_ded.deduction_type,
                amount=float(db_ded.amount),
                percentage=float(db_ded.percentage) if db_ded.percentage else None,
                notes=db_ded.notes
            )
        )

    db.commit()
    db.refresh(bill)

    return BillResponse(
        id=bill.id,
        company_id=bill.company_id,
        project_id=bill.project_id,
        party_company_user_id=bill.party_company_user_id,
        invoice_number=bill.invoice_number,
        invoice_date=bill.invoice_date,
        due_date=bill.due_date,
        invoice_type=bill.invoice_type,
        status=bill.status,
        subtotal=float(bill.subtotal),
        gst_amount=float(bill.gst_amount),
        total_payable=float(bill.total_payable),
        paid_amount=float(bill.paid_amount),
        approval_flag=bill.approval_flag,
        is_milestone_fixed_amount=bill.is_milestone_fixed_amount,
        created_at=bill.created_at,
        deductions=ded_responses
    )

# 3. Debit Notes
@router.get("/debit-notes", response_model=List[DebitNoteResponse])
def get_debit_notes(project_id: UUID, db: Session = Depends(get_db)):
    notes = db.query(DebitNote).filter(DebitNote.project_id == project_id).all()
    return [
        DebitNoteResponse(
            id=n.id,
            project_id=n.project_id,
            company_id=n.company_id,
            party_company_user_id=n.party_company_user_id,
            notes=n.notes,
            total_amount=float(n.total_amount),
            work_amount=float(n.work_amount),
            gst_amount=float(n.gst_amount),
            bill_id=n.bill_id,
            reference_number=n.reference_number,
            approval_flag=n.approval_flag,
            created_at=n.created_at
        ) for n in notes
    ]

@router.post("/debit-notes", response_model=DebitNoteResponse, status_code=201)
def create_debit_note(req: DebitNoteCreateRequest, db: Session = Depends(get_db)):
    note = DebitNote(
        project_id=req.project_id,
        company_id=req.company_id,
        party_company_user_id=req.party_company_user_id,
        notes=req.notes,
        total_amount=req.total_amount,
        work_amount=req.work_amount,
        gst_amount=req.gst_amount,
        bill_id=req.bill_id,
        reference_number=req.reference_number,
        approval_flag="auto_approved"
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return DebitNoteResponse(
        id=note.id,
        project_id=note.project_id,
        company_id=note.company_id,
        party_company_user_id=note.party_company_user_id,
        notes=note.notes,
        total_amount=float(note.total_amount),
        work_amount=float(note.work_amount),
        gst_amount=float(note.gst_amount),
        bill_id=note.bill_id,
        reference_number=note.reference_number,
        approval_flag=note.approval_flag,
        created_at=note.created_at
    )

# 4. Credit Notes
@router.get("/credit-notes", response_model=List[CreditNoteResponse])
def get_credit_notes(project_id: UUID, db: Session = Depends(get_db)):
    notes = db.query(CreditNote).filter(CreditNote.project_id == project_id).all()
    return [
        CreditNoteResponse(
            id=n.id,
            project_id=n.project_id,
            company_id=n.company_id,
            party_company_user_id=n.party_company_user_id,
            notes=n.notes,
            total_amount=float(n.total_amount),
            bill_id=n.bill_id,
            reference_number=n.reference_number,
            approval_flag=n.approval_flag,
            created_at=n.created_at
        ) for n in notes
    ]

@router.post("/credit-notes", response_model=CreditNoteResponse, status_code=201)
def create_credit_note(req: CreditNoteCreateRequest, db: Session = Depends(get_db)):
    note = CreditNote(
        project_id=req.project_id,
        company_id=req.company_id,
        party_company_user_id=req.party_company_user_id,
        notes=req.notes,
        total_amount=req.total_amount,
        bill_id=req.bill_id,
        reference_number=req.reference_number,
        approval_flag="pending"
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    
    return CreditNoteResponse(
        id=note.id,
        project_id=note.project_id,
        company_id=note.company_id,
        party_company_user_id=note.party_company_user_id,
        notes=note.notes,
        total_amount=float(note.total_amount),
        bill_id=note.bill_id,
        reference_number=note.reference_number,
        approval_flag=note.approval_flag,
        created_at=note.created_at
    )
