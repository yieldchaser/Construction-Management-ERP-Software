import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Payment, PaymentSettlement, Bill, PayrollRun, PayrollLineItem, StaffEmployee, ProjectBudget, Project, CompanyTeam, User
from pydantic import BaseModel

router = APIRouter(
    prefix="/finance",
    tags=["Finance & P&L"]
)

# Pydantic Schemas
class PaymentCreateRequest(BaseModel):
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    party_company_user_id: Optional[uuid.UUID] = None
    payment_type: str  # "in" or "out"
    amount: float
    payment_method: str  # Cash, Bank Transfer, Cheque
    reference_number: Optional[str] = None
    description: Optional[str] = None
    payment_date: datetime

class PaymentResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    party_company_user_id: Optional[uuid.UUID]
    payment_type: str
    amount: float
    unsettled_amount: float
    payment_method: str
    reference_number: Optional[str]
    description: Optional[str]
    payment_date: datetime
    created_at: datetime

    class Config:
        from_attributes = True

class LedgerTransactionResponse(BaseModel):
    id: str
    date: str
    type: str  # "Receipt" or "Expense"
    category: str
    description: str
    amount: float
    party: str
    ref: str
    ledger: str

class PLItemResponse(BaseModel):
    head: str
    budget: float
    actual: float
    variance: float


# --- Endpoints ---

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(req: PaymentCreateRequest, db: Session = Depends(get_db)):
    comp_uuid = uuid.UUID(str(req.company_id))
    proj_uuid = uuid.UUID(str(req.project_id)) if req.project_id else None
    party_uuid = uuid.UUID(str(req.party_company_user_id)) if req.party_company_user_id else None

    # Verify project
    if proj_uuid:
        project = db.query(Project).filter(Project.id == proj_uuid).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

    payment = Payment(
        id=uuid.uuid4(),
        company_id=comp_uuid,
        project_id=proj_uuid,
        party_company_user_id=party_uuid,
        payment_type=req.payment_type,
        amount=req.amount,
        unsettled_amount=req.amount,
        payment_method=req.payment_method,
        reference_number=req.reference_number,
        description=req.description,
        payment_date=req.payment_date
    )
    db.add(payment)
    db.flush()

    # FIFO Auto-Settlement Logic against Outstanding Bills
    if party_uuid:
        # Determine target invoice type based on payment type
        # Payment IN (receipt) settles client sale invoices
        # Payment OUT (expense payment) settles vendor purchase or subcon bills
        target_inv_type = "sale" if req.payment_type == "in" else ["purchase", "subcon"]
        
        query = db.query(Bill).filter(
            Bill.party_company_user_id == party_uuid,
            Bill.status != "Paid"
        )
        if proj_uuid:
            query = query.filter(Bill.project_id == proj_uuid)
            
        if isinstance(target_inv_type, list):
            query = query.filter(Bill.invoice_type.in_(target_inv_type))
        else:
            query = query.filter(Bill.invoice_type == target_inv_type)
            
        open_bills = query.order_by(Bill.invoice_date.asc()).all()

        for bill in open_bills:
            if payment.unsettled_amount <= 0:
                break
            
            remaining = float(bill.total_payable) - float(bill.paid_amount)
            if remaining <= 0:
                continue

            settled = min(float(payment.unsettled_amount), remaining)
            bill.paid_amount = float(bill.paid_amount) + settled
            
            if bill.paid_amount >= bill.total_payable:
                bill.status = "Paid"
            else:
                bill.status = "Partially Paid"
                
            db.add(bill)

            # Record Settlement
            settlement = PaymentSettlement(
                id=uuid.uuid4(),
                payment_id=payment.id,
                bill_id=bill.id,
                settled_amount=settled
            )
            db.add(settlement)
            payment.unsettled_amount = float(payment.unsettled_amount) - settled

    db.commit()
    db.refresh(payment)
    return payment


@router.get("/ledger", response_model=List[LedgerTransactionResponse])
def get_ledger(project_id: uuid.UUID, db: Session = Depends(get_db)):
    proj_uuid = uuid.UUID(str(project_id))
    
    # 1. Fetch payments
    payments = db.query(Payment).filter(Payment.project_id == proj_uuid).all()
    # 2. Fetch bills
    bills = db.query(Bill).filter(Bill.project_id == proj_uuid).all()
    # 3. Fetch salary line items
    salaries = db.query(PayrollLineItem).join(PayrollRun).filter(PayrollRun.project_id == proj_uuid).all()

    ledger_entries = []

    # Map Payments
    for p in payments:
        party_name = "Walk-in Party"
        if p.party_company_user_id:
            team_member = db.query(CompanyTeam).filter(CompanyTeam.id == p.party_company_user_id).first()
            if team_member:
                user = db.query(User).filter(User.id == team_member.user_id).first()
                if user:
                    party_name = user.name

        ledger_entries.append(
            LedgerTransactionResponse(
                id=str(p.id),
                date=p.payment_date.strftime("%b %d") if p.payment_date else "",
                type="Receipt" if p.payment_type == "in" else "Expense",
                category="Client Payment" if p.payment_type == "in" else "Direct Payment",
                description=p.description or ("Receipt Payment" if p.payment_type == "in" else "Expense Payment"),
                amount=float(p.amount) if p.payment_type == "in" else -float(p.amount),
                party=party_name,
                ref=p.reference_number or "",
                ledger="Revenue" if p.payment_type == "in" else "General Ledger"
            )
        )

    # Map Bills
    for b in bills:
        party_name = "Vendor/Client"
        if b.party_company_user_id:
            team_member = db.query(CompanyTeam).filter(CompanyTeam.id == b.party_company_user_id).first()
            if team_member:
                user = db.query(User).filter(User.id == team_member.user_id).first()
                if user:
                    party_name = user.name

        is_receipt = b.invoice_type == "sale"
        category = "Client Invoice" if b.invoice_type == "sale" else ("Subcon Invoice" if b.invoice_type == "subcon" else "Material Bill")
        ledger_head = "Revenue" if b.invoice_type == "sale" else ("Subcon Cost" if b.invoice_type == "subcon" else "Material Cost")

        ledger_entries.append(
            LedgerTransactionResponse(
                id=str(b.id),
                date=b.invoice_date.strftime("%b %d") if b.invoice_date else "",
                type="Receipt" if is_receipt else "Expense",
                category=category,
                description=f"Invoice {b.invoice_number}",
                amount=float(b.total_payable) if is_receipt else -float(b.total_payable),
                party=party_name,
                ref=b.invoice_number,
                ledger=ledger_head
            )
        )

    # Map Salaries
    for s in salaries:
        party_name = "Staff Member"
        if s.employee_id:
            emp = db.query(StaffEmployee).filter(StaffEmployee.id == s.employee_id).first()
            if emp and emp.company_user_id:
                team_member = db.query(CompanyTeam).filter(CompanyTeam.id == emp.company_user_id).first()
                if team_member:
                    user = db.query(User).filter(User.id == team_member.user_id).first()
                    if user:
                        party_name = user.name

        ledger_entries.append(
            LedgerTransactionResponse(
                id=str(s.id),
                date=s.created_at.strftime("%b %d") if s.created_at else "",
                type="Expense",
                category="Labour Wages",
                description="Salary Payout",
                amount=-float(s.net_payable),
                party=party_name,
                ref="PAYROLL",
                ledger="Labour Cost"
            )
        )

    # Sort ledger entries by date descending (mock a simple order)
    return ledger_entries


@router.get("/pl", response_model=List[PLItemResponse])
def get_project_pl(project_id: uuid.UUID, db: Session = Depends(get_db)):
    proj_uuid = uuid.UUID(str(project_id))
    
    # Fetch project budgets
    budget = db.query(ProjectBudget).filter(ProjectBudget.project_id == proj_uuid).first()
    
    # Fallback to zero budgets if not configured
    mat_budget = float(budget.material_budget) if budget else 0.0
    lab_budget = float(budget.labour_budget) if budget else 0.0
    sub_budget = float(budget.subcon_budget) if budget else 0.0
    eq_budget = float(budget.equipment_budget) if budget else 0.0
    
    # Load actual values by summing corresponding entries in bills and salaries
    # 1. Revenue: Client invoices (invoice_type == "sale")
    revenue_actual = db.query(func.sum(Bill.total_payable)).filter(
        Bill.project_id == proj_uuid,
        Bill.invoice_type == "sale"
    ).scalar() or 0.0

    # 2. Material Cost: Vendor bills (invoice_type == "purchase")
    material_actual = db.query(func.sum(Bill.total_payable)).filter(
        Bill.project_id == proj_uuid,
        Bill.invoice_type == "purchase"
    ).scalar() or 0.0

    # 3. Labour Cost: Salary expenses
    labour_actual = db.query(func.sum(PayrollLineItem.net_payable)).join(PayrollRun).filter(
        PayrollRun.project_id == proj_uuid
    ).scalar() or 0.0

    # 4. Subcontractor Cost: Subcon bills (invoice_type == "subcon")
    subcon_actual = db.query(func.sum(Bill.total_payable)).filter(
        Bill.project_id == proj_uuid,
        Bill.invoice_type == "subcon"
    ).scalar() or 0.0

    # 5. Plant & Machinery (Equipment log rates or stubs)
    equipment_actual = 0.0 # Standard machinery cost stub for fallback, or fuel log costs if exists

    # Variance: for Revenue, variance = Actual - Budget. For Cost, variance = Budget - Actual.
    # To keep it standard: return positive variance for positive variance outcomes, negative for cost overruns.
    pl_data = [
        PLItemResponse(
            head="Revenue (Billed)",
            budget=0.0, # Budget for project revenue isn't direct in budgets, but we can set actual
            actual=float(revenue_actual),
            variance=float(revenue_actual)
        ),
        PLItemResponse(
            head="Material Cost",
            budget=mat_budget,
            actual=float(material_actual),
            variance=mat_budget - float(material_actual)
        ),
        PLItemResponse(
            head="Labour Cost",
            budget=lab_budget,
            actual=float(labour_actual),
            variance=lab_budget - float(labour_actual)
        ),
        PLItemResponse(
            head="Subcontractor Cost",
            budget=sub_budget,
            actual=float(subcon_actual),
            variance=sub_budget - float(subcon_actual)
        ),
        PLItemResponse(
            head="Plant & Machinery",
            budget=eq_budget,
            actual=float(equipment_actual),
            variance=eq_budget - float(equipment_actual)
        ),
        PLItemResponse(
            head="Overhead",
            budget=0.0,
            actual=0.0,
            variance=0.0
        )
    ]
    return pl_data
