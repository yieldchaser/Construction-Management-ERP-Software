import json
from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_in_company, verify_project_access, verify_company_access, get_company_membership, require_permission, require_module_view
from app.models import (
    WorkOrder, WorkOrderItem, Bill, TransactionDeduction,
    DebitNote, CreditNote, CompanyTeam, User, Company, LibraryParty, Project, ThreeWayMatch
)
from app.routers.custom_fields import CustomFieldValueInput, upsert_values_for_entity
from app.zatca import build_zatca_payload
from app.workflow_controls import enforce_entry_creation_window, get_company, get_default_terms
from app.utils.pdf_generator import generate_document_pdf
from pydantic import BaseModel, Field
from app.constants import INVOICE_TYPE_PATTERN, CANONICAL_INVOICE_TYPES

router = APIRouter(
    prefix="/billing",
    tags=["Subcontractor Work Orders & Billing"],
    dependencies=[Depends(get_current_user)]
)

# Pydantic Schemas
class WOItemSchema(BaseModel):
    boq_item_id: Optional[UUID] = None
    task_id: Optional[UUID] = None
    quantity: float = Field(..., ge=0)
    rate: float = Field(..., ge=0)

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
    subcontractor_name: str = "Unknown"
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
    deduction_type: str = Field(..., pattern="^(TDS|Retention|Security Deposit|Advance Recovery|Material Recovery)$", example="TDS") # TDS, Retention, Security Deposit, Advance Recovery, Material Recovery
    amount: float = Field(..., ge=0)
    percentage: Optional[float] = Field(None, ge=0, le=100)
    notes: Optional[str] = None

class BillCreateRequest(BaseModel):
    company_id: UUID
    project_id: UUID
    party_company_user_id: UUID
    invoice_number: str
    invoice_date: datetime
    due_date: Optional[datetime] = None
    invoice_type: str = Field(..., pattern=INVOICE_TYPE_PATTERN, example="subcon") # sale, purchase, subcon, material_sale, material_return, material_transfer, expense, equipment
    subtotal: float = Field(..., ge=0)
    gst_pct: float = Field(18.00, ge=0, le=100)
    deductions: List[DeductionItemSchema] = []
    pre_tax_deductions: bool = False
    # Transaction sub-entity persistence (Project Tab Transaction build)
    items_json: Optional[str] = None  # JSON string of line items
    payment_mode: Optional[str] = None  # Cash / Bank / Cheque
    payment_bank_name: Optional[str] = None
    payment_ref: Optional[str] = None  # cheque no / bank txn ref
    ship_to: Optional[str] = None
    boq_document_id: Optional[UUID] = None  # link this bill to a BOQ document (for Billed Value)
    terms: Optional[str] = None  # Terms & Conditions; defaults to company Invoice Terms on create
    # Theme B (soft flag): optional link to an APPROVED ThreeWayMatch. Ignored for
    # sale invoices; required to be approved + same company/project when supplied on
    # purchase/subcon bills (validated in create_bill / PATCH .../match).
    match_id: Optional[UUID] = None
    # Custom Fields (Settings → Custom Fields, entity_type="invoice"). Populated by the
    # Sales Invoice transaction type on the project Transaction tab; harmless no-op for
    # other invoice_type values that don't render a Custom Fields section.
    custom_fields: List[CustomFieldValueInput] = []

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
    items_json: Optional[str] = None
    payment_mode: Optional[str] = None
    payment_bank_name: Optional[str] = None
    payment_ref: Optional[str] = None
    ship_to: Optional[str] = None
    terms: Optional[str] = None
    # Theme B (soft flag): the linked ThreeWayMatch id, and its status.
    # match_status is "unmatched" when no approved match is linked, else the
    # linked match's match_status (e.g. "approved").
    match_id: Optional[UUID] = None
    match_status: Optional[str] = None

    class Config:
        from_attributes = True

class DebitNoteCreateRequest(BaseModel):
    project_id: UUID
    company_id: UUID
    party_company_user_id: UUID
    notes: Optional[str] = None
    total_amount: float = Field(..., ge=0)
    work_amount: float = Field(0.0, ge=0)
    gst_amount: float = Field(0.0, ge=0)
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
    total_amount: float = Field(..., ge=0)
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

def _sequential_deduction_calc(deductions: List[DeductionItemSchema], base: float, pretax_order: bool):
    """Settings -> Workflow Controls -> Finance Controls -> 'Pre-Tax Deduction/Retention'
    (Company.pretax_deduction_retention).

    Splits the requested deductions into Retention vs everything else (TDS,
    Security Deposit, Advance Recovery, Material Recovery, ...) and applies
    them sequentially against `base` so the order actually changes the
    result:
      - pretax_order=True  -> TDS/other deductions computed first, Retention
        is then computed on the post-deduction amount.
      - pretax_order=False (default) -> Retention computed first, TDS/other
        deductions are then computed on the post-retention amount.

    Returns (deduction_details, total_deducted) where deduction_details is a
    list of (DeductionItemSchema, calculated_amount) tuples in the same
    shape the caller previously built manually."""
    retention_list = [d for d in deductions if d.deduction_type == "Retention"]
    other_list = [d for d in deductions if d.deduction_type != "Retention"]

    def _calc(d: DeductionItemSchema, on_amount: float) -> float:
        if d.percentage:
            return on_amount * (d.percentage / 100.0)
        return d.amount

    first_list, second_list = (other_list, retention_list) if pretax_order else (retention_list, other_list)

    details = []
    first_total = 0.0
    for d in first_list:
        amt = _calc(d, base)
        first_total += amt
        details.append((d, amt))

    # Clamp `remaining` so over-aggressive fixed-amount deductions in the first
    # group can never push the second group's base negative (which would produce
    # a nonsensical negative payable).
    remaining = max(0.0, base - first_total)
    second_total = 0.0
    for d in second_list:
        amt = _calc(d, remaining)
        second_total += amt
        details.append((d, amt))

    total_deducted = first_total + second_total
    # Deductions must never exceed `base`, otherwise a bill's payable amount
    # could go negative due to overlapping fixed-amount deductions.
    total_deducted = min(total_deducted, base)
    return details, total_deducted


# 1. Work Orders
@router.get("/work-orders", response_model=List[WOResponse])
def get_work_orders(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    require_module_view(db, current_user, project.company_id, "billing")
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
        team = db.query(CompanyTeam).filter(CompanyTeam.id == wo.subcontractor_id).first()
        user = db.query(User).filter(User.id == team.user_id).first() if team and team.user_id else None
        subcontractor_name = user.name if user and user.name else "Unknown"
        if subcontractor_name == "Unknown" and team and team.library_party_id:
            party = db.query(models.LibraryParty).filter(models.LibraryParty.id == team.library_party_id).first()
            if party and party.name:
                subcontractor_name = party.name
        res.append(
            WOResponse(
                id=wo.id,
                company_id=wo.company_id,
                project_id=wo.project_id,
                subcontractor_id=wo.subcontractor_id,
                subcontractor_name=subcontractor_name,
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
def create_work_order(req: WOCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tenant check: the caller must be a member of the company this work order belongs to.
    get_company_membership(db, current_user, req.company_id)
    verify_project_in_company(db, req.project_id, req.company_id)
    require_permission(db, current_user, req.company_id, "billing:edit")
    if req.subcontractor_id:
        sub = db.query(models.CompanyTeam).filter(models.CompanyTeam.id == req.subcontractor_id).first()
        if not sub or sub.company_id != req.company_id:
            raise HTTPException(status_code=403, detail="Subcontractor does not belong to this company")

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
        # Settings -> Terms & Conditions -> Subcon Work Order: pre-fill the
        # company default when the caller doesn't supply their own terms.
        terms=req.terms if req.terms else get_default_terms(db, req.company_id, "subcon")
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
def get_bills(project_id: UUID, invoice_type: Optional[str] = None, db: Session = Depends(get_db), _: None = Depends(verify_project_access), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    require_module_view(db, current_user, project.company_id, "billing")
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
                deductions=ded_schemas,
                items_json=b.items_json,
                payment_mode=b.payment_mode,
                payment_bank_name=b.payment_bank_name,
                payment_ref=b.payment_ref,
                ship_to=b.ship_to,
                terms=b.terms,
                match_id=b.match_id,
                match_status=_derive_bill_match_status(db, b),
            )
        )
    return res

@router.get("/bills/{bill_id}/zatca")
def get_bill_zatca(bill_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    # Tenant check: the bill belongs to a company the caller is a member of.
    get_company_membership(db, current_user, bill.company_id)
    require_module_view(db, current_user, bill.company_id, "billing")
    if bill.invoice_type != "sale":
        raise HTTPException(status_code=400, detail="ZATCA e-invoicing applies to sale (simplified tax) invoices")
    company = db.query(Company).filter(Company.id == bill.company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    enabled = bool(getattr(company, "is_zatca_enable", False))
    payload = build_zatca_payload(company, bill)
    return {
        "is_zatca_enabled": enabled,
        "qr_tlv_base64": payload["qr_tlv_base64"],
        "ubl_xml": payload["ubl_xml"],
        "invoice_number": payload["invoice_number"],
        "issue_date": payload["issue_date"],
        "total_excl_vat": payload["total_excl_vat"],
        "vat_total": payload["vat_total"],
        "total_incl_vat": payload["total_incl_vat"],
    }

@router.get("/bills/{bill_id}/pdf")
def get_bill_pdf(bill_id: UUID, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    # Tenant check: the bill belongs to a company the caller is a member of.
    get_company_membership(db, current_user, bill.company_id)
    require_module_view(db, current_user, bill.company_id, "billing")

    project = db.query(Project).filter(Project.id == bill.project_id).first() if bill.project_id else None
    company_name, custom_banner = resolve_pdf_branding(db, bill.company_id, project)

    party = db.query(CompanyTeam).filter(CompanyTeam.id == bill.party_company_user_id).first()
    party_user = db.query(User).filter(User.id == party.user_id).first() if party else None
    party_name = party_user.name if party_user and party_user.name else "N/A"

    type_label_map = {
        "sale": "Sales Invoice",
        "material_sale": "Material Sales Invoice",
        "purchase": "Purchase Invoice",
        "subcon": "Subcontractor Invoice",
        "material_return": "Material Return",
        "material_transfer": "Material Transfer Voucher",
        "expense": "Other Expense Voucher",
        "equipment": "Equipment Expense Voucher",
    }
    if bill.invoice_type not in type_label_map:
        raise HTTPException(status_code=400, detail=f"Invalid or unhandled invoice_type '{bill.invoice_type}'")
    type_label = type_label_map[bill.invoice_type]

    party_lines = [
        f"Party: {party_name}",
        f"Invoice No: {bill.invoice_number}",
        f"Invoice Date: {bill.invoice_date.strftime('%Y-%m-%d') if bill.invoice_date else ''}",
        f"Type: {type_label}",
        f"Status: {bill.status}",
    ]
    if bill.due_date:
        party_lines.append(f"Due Date: {bill.due_date.strftime('%Y-%m-%d')}")

    table_headers = ["Description", "Qty", "Rate", "Amount"]
    col_widths = [54, 10, 16, 16]
    table_rows = []
    if bill.items_json:
        try:
            for it in json.loads(bill.items_json):
                table_rows.append([
                    it.get("desc") or it.get("description") or "",
                    str(it.get("qty", "")),
                    str(it.get("rate", "")),
                    str(it.get("amount", "")),
                ])
        except Exception:
            pass
    if not table_rows:
        table_rows.append(["(No line items)", "", "", ""])

    totals_lines = [
        f"Subtotal: {bill.subtotal}",
        f"GST Amount: {bill.gst_amount}",
        f"Total Payable: {bill.total_payable}",
        f"Paid Amount: {bill.paid_amount}",
    ]

    pdf_bytes = generate_document_pdf(
        title=type_label,
        party_lines=party_lines,
        table_headers=table_headers,
        table_rows=table_rows,
        col_widths=col_widths,
        totals_lines=totals_lines,
        terms=bill.terms,
        company_name=company_name,
        custom_banner=custom_banner,
    )
    filename = f"{bill.invoice_number or 'bill'}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# --- Theme B (soft flag) helpers: link a Bill to an approved ThreeWayMatch ---
def _resolve_bill_match_id(db: Session, invoice_type: str, match_id, company_id: UUID, project_id: UUID):
    """Validate an optional ThreeWayMatch link for a bill.

    - Sale bills are exempt: a supplied match_id is ignored (returns None).
    - purchase/subcon bills are NOT required to have a match (soft flag).
    - When match_id IS supplied on purchase/subcon, it must point to an
      approved match in the same company/project, else 400.
    Returns the match_id to attach (or None).
    """
    if not match_id:
        return None
    if invoice_type == "sale":
        # 3-way matching is a purchase-side control; ignore for sale invoices.
        return None
    match = db.query(ThreeWayMatch).filter(ThreeWayMatch.id == match_id).first()
    if not match:
        raise HTTPException(status_code=400, detail="Three-way match not found")
    if match.company_id != company_id or match.project_id != project_id:
        raise HTTPException(status_code=400, detail="Three-way match does not belong to this company/project")
    if match.match_status != "approved":
        raise HTTPException(status_code=400, detail=f"Three-way match is not approved (status: {match.match_status})")
    return match.id


def _derive_bill_match_status(db: Session, bill: Bill) -> Optional[str]:
    """Return the linked match's match_status, or 'unmatched' when none linked."""
    if bill.match_id is None:
        return "unmatched"
    match = db.query(ThreeWayMatch).filter(ThreeWayMatch.id == bill.match_id).first()
    return match.match_status if match else "unmatched"


@router.post("/bills", response_model=BillResponse, status_code=201)
def create_bill(req: BillCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tenant check: the caller must be a member of the company this bill belongs to.
    get_company_membership(db, current_user, req.company_id)
    verify_project_in_company(db, req.project_id, req.company_id)
    require_permission(db, current_user, req.company_id, "billing:edit")

    # Check if invoice number already exists for company
    existing = db.query(Bill).filter(
        Bill.company_id == req.company_id,
        Bill.invoice_number == req.invoice_number
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Invoice number already exists for this company")

    # Theme B (soft flag): resolve and validate the optional ThreeWayMatch link.
    # Returns the (possibly None) match_id to attach, or raises 400. Sale bills are
    # exempt: a supplied match_id is silently ignored for them. purchase/subcon bills
    # are NOT blocked when no match is supplied; only an invalid/non-approved/wrong-scope
    # match_id is rejected.
    match_id = _resolve_bill_match_id(db, req.invoice_type, req.match_id, req.company_id, req.project_id)

    # Workflow Controls: Entry Controls (creation date window)
    enforce_entry_creation_window(db, req.company_id, req.invoice_date)

    # Workflow Controls: Finance Controls (Pre-Tax Deduction/Retention order)
    company = get_company(db, req.company_id)
    pretax_order = bool(company.pretax_deduction_retention) if company else False

    # Mathematical Core Billing Engine
    # Calculate pre-determined deduction amounts
    if req.pre_tax_deductions:
        # Pre-Tax Calculations (Deductions subtract from taxable subtotal first, GST is computed on the post-deduction amount)
        deduction_details, ded_amt = _sequential_deduction_calc(req.deductions, req.subtotal, pretax_order)

        gst_amount = (req.subtotal - ded_amt) * (req.gst_pct / 100.0)
        total_payable = req.subtotal - ded_amt + gst_amount
    else:
        # Post-Tax presentation (GST shown on the GST-exclusive subtotal), but
        # TDS/Retention are now computed against the GST-EXCLUSIVE work value
        # (Indian TDS under the Income Tax Act is on the value of work/services,
        # not on the GST component). The `pre_tax_deductions` flag only controls
        # invoice presentation/order from here on, not whether GST is included in
        # the deduction base.
        deduction_details, ded_amt = _sequential_deduction_calc(req.deductions, req.subtotal, pretax_order)

        gst_amount = req.subtotal * (req.gst_pct / 100.0)
        total_payable = req.subtotal - ded_amt + gst_amount

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
        is_milestone_fixed_amount=False,
        items_json=req.items_json,
        payment_mode=req.payment_mode,
        payment_bank_name=req.payment_bank_name,
        payment_ref=req.payment_ref,
        ship_to=req.ship_to,
        boq_document_id=req.boq_document_id,
        match_id=match_id,
        # Settings -> Terms & Conditions -> Invoice Terms (or Subcon Terms for
        # subcon invoices): pre-fill the company default when the caller doesn't
        # supply their own terms. Mirrors the subcon Work Order wiring.
        terms=req.terms
        if req.terms
        else get_default_terms(
            db,
            req.company_id,
            "subcon" if req.invoice_type == "subcon" else "invoice",
        ),
    )
    db.add(bill)
    db.flush()

    # Theme B (soft flag): reverse-link the match to this bill (uses the existing
    # ThreeWayMatch.invoice_id column). Only when a match was actually linked.
    if match_id is not None:
        linked_match = db.query(ThreeWayMatch).filter(ThreeWayMatch.id == match_id).first()
        if linked_match:
            linked_match.invoice_id = bill.id
            db.add(linked_match)

    upsert_values_for_entity(
        db, req.company_id, "invoice", bill.id,
        [cf.model_dump() for cf in req.custom_fields],
    )

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
        deductions=ded_responses,
        items_json=bill.items_json,
        payment_mode=bill.payment_mode,
        payment_bank_name=bill.payment_bank_name,
        payment_ref=bill.payment_ref,
        ship_to=bill.ship_to,
        terms=bill.terms,
        match_id=bill.match_id,
        match_status=_derive_bill_match_status(db, bill),
    )


# Theme B (soft flag): link an existing purchase/subcon bill to an approved ThreeWayMatch.
class BillMatchLinkRequest(BaseModel):
    match_id: Optional[UUID] = None


@router.patch("/bills/{bill_id}/match", response_model=BillResponse)
def link_bill_match(bill_id: UUID, req: BillMatchLinkRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    get_company_membership(db, current_user, bill.company_id)
    verify_project_in_company(db, bill.project_id, bill.company_id)
    require_permission(db, current_user, bill.company_id, "billing:edit")

    if bill.invoice_type == "sale":
        # Sale invoices are exempt from 3-way matching; ignore any supplied match.
        bill.match_id = None
    else:
        match_id = _resolve_bill_match_id(db, bill.invoice_type, req.match_id, bill.company_id, bill.project_id)
        bill.match_id = match_id
        if match_id is not None:
            linked_match = db.query(ThreeWayMatch).filter(ThreeWayMatch.id == match_id).first()
            if linked_match:
                linked_match.invoice_id = bill.id
                db.add(linked_match)

    db.commit()
    db.refresh(bill)

    deductions = db.query(TransactionDeduction).filter(TransactionDeduction.bill_id == bill.id).all()
    ded_schemas = [
        DeductionResponseSchema(
            id=d.id,
            deduction_type=d.deduction_type,
            amount=float(d.amount),
            percentage=float(d.percentage) if d.percentage else None,
            notes=d.notes,
        ) for d in deductions
    ]
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
        deductions=ded_schemas,
        items_json=bill.items_json,
        payment_mode=bill.payment_mode,
        payment_bank_name=bill.payment_bank_name,
        payment_ref=bill.payment_ref,
        ship_to=bill.ship_to,
        terms=bill.terms,
        match_id=bill.match_id,
        match_status=_derive_bill_match_status(db, bill),
    )


# 3. Debit Notes
@router.get("/debit-notes", response_model=List[DebitNoteResponse])
def get_debit_notes(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    require_module_view(db, current_user, project.company_id, "billing")
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
def create_debit_note(req: DebitNoteCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tenant check: the caller must be a member of the company this debit note belongs to.
    get_company_membership(db, current_user, req.company_id)
    verify_project_in_company(db, req.project_id, req.company_id)
    require_permission(db, current_user, req.company_id, "billing:edit")

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
        approval_flag="pending"
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
def get_credit_notes(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == project_id).first()
    require_module_view(db, current_user, project.company_id, "billing")
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
def create_credit_note(req: CreditNoteCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tenant check: the caller must be a member of the company this credit note belongs to.
    get_company_membership(db, current_user, req.company_id)
    verify_project_in_company(db, req.project_id, req.company_id)
    require_permission(db, current_user, req.company_id, "billing:edit")

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


# 6. Subcontractors (userless CompanyTeam + linked LibraryParty, no login)
class SubcontractorCreateRequest(BaseModel):
    company_id: UUID
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    tax_no: Optional[str] = None  # also accepts "gstin"
    gstin: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    address: Optional[str] = None


class SubcontractorResponse(BaseModel):
    company_team_id: UUID
    library_party_id: UUID
    name: str


class SubcontractorListResponse(BaseModel):
    company_team_id: UUID
    name: str
    gstin: Optional[str] = None
    phone: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/subcontractors", response_model=SubcontractorResponse, status_code=201)
def create_subcontractor(req: SubcontractorCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Tenant + RBAC: only team managers may register an external subcontractor.
    get_company_membership(db, current_user, req.company_id)
    require_permission(db, current_user, req.company_id, "team:manage")

    if not req.name or not req.name.strip():
        raise HTTPException(status_code=400, detail="Subcontractor name is required")

    tax_no = req.tax_no or req.gstin
    party = models.LibraryParty(
        company_id=req.company_id,
        name=req.name.strip(),
        phone=req.phone,
        email=req.email,
        party_type="Subcontractor",
        address=req.address,
        bank_name=req.bank_name,
        account_number=req.account_number,
        ifsc_code=req.ifsc_code,
        tax_no=tax_no,
    )
    db.add(party)
    db.flush()

    # External subcontractor = a CompanyTeam row with no login (user_id NULL),
    # priority_type "subcontractor", linked to the vendor master via library_party_id.
    team = models.CompanyTeam(
        company_id=req.company_id,
        user_id=None,
        role_id=None,
        priority_type="subcontractor",
        library_party_id=party.id,
    )
    db.add(team)
    db.commit()
    db.refresh(team)

    return SubcontractorResponse(
        company_team_id=team.id,
        library_party_id=party.id,
        name=party.name,
    )


@router.get("/subcontractors", response_model=List[SubcontractorListResponse])
def list_subcontractors(company_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    rows = (
        db.query(
            CompanyTeam.id,
            CompanyTeam.user_id,
            CompanyTeam.library_party_id,
            User.name.label("user_name"),
            LibraryParty.name.label("party_name"),
            LibraryParty.tax_no,
            LibraryParty.phone,
        )
        .outerjoin(User, User.id == CompanyTeam.user_id)
        .outerjoin(LibraryParty, LibraryParty.id == CompanyTeam.library_party_id)
        .filter(
            CompanyTeam.company_id == company_id,
            CompanyTeam.priority_type == "subcontractor",
        )
        .all()
    )
    res = []
    for r in rows:
        display_name = r.user_name or r.party_name or "Unknown"
        res.append(
            SubcontractorListResponse(
                company_team_id=r.id,
                name=display_name,
                gstin=r.tax_no,
                phone=r.phone,
            )
        )
    return res
