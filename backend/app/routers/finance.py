import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Payment, PaymentSettlement, Bill, PayrollRun, PayrollLineItem, StaffEmployee, ProjectBudget, Project, CompanyTeam, User, Equipment, EquipmentDeployment, FuelLog, BankAccount, PaymentRequest, PaymentRequestPayment, CashAccount, LibraryParty, Company, ApprovalRule
from app.auth import get_current_user, verify_company_access, verify_project_access, get_company_membership
from app.approvals import find_matching_rule, match_approver, levels_approved, user_already_acted, record_action
from pydantic import BaseModel

router = APIRouter(
    prefix="/finance",
    tags=["Finance & P&L"],
    dependencies=[Depends(get_current_user)]
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
    account_name: Optional[str] = None
    cost_code: Optional[str] = None
    sub_cost_code: Optional[str] = None
    category: Optional[str] = None

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
    account_name: Optional[str]
    cost_code: Optional[str]
    sub_cost_code: Optional[str]
    category: Optional[str]

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
    debit: float = 0.0
    credit: float = 0.0
    balance: float = 0.0

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
        payment_date=req.payment_date,
        account_name=req.account_name,
        cost_code=req.cost_code,
        sub_cost_code=req.sub_cost_code,
        category=req.category
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


@router.delete("/payments/{payment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment(payment_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a finance payment. Tenant-scoped: the caller must belong to the
    payment's company, and the deletion is written to the DeleteLog audit trail."""
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    get_company_membership(db, current_user, payment.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, payment.company_id, "payment", payment.id, f"Payment {payment.id}")
    except Exception:
        pass
    db.delete(payment)
    db.commit()


@router.get("/ledger", response_model=List[LedgerTransactionResponse])
def get_ledger(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    proj_uuid = uuid.UUID(str(project_id))
    
    # 1. Fetch payments
    payments = db.query(Payment).filter(Payment.project_id == proj_uuid).all()
    # 2. Fetch bills
    bills = db.query(Bill).filter(Bill.project_id == proj_uuid).all()
    # 3. Fetch salary line items
    salaries = db.query(PayrollLineItem).join(PayrollRun).filter(PayrollRun.project_id == proj_uuid).all()

    raw_entries = []
    for p in payments:
        raw_entries.append((p.payment_date, "payment", p))
    for b in bills:
        raw_entries.append((b.invoice_date, "bill", b))
    for s in salaries:
        raw_entries.append((s.created_at, "salary", s))
        
    # Sort ascending chronologically to compute running balance
    raw_entries.sort(key=lambda x: x[0] if x[0] else datetime.min)

    ledger_entries = []
    running_balance = 0.0

    for dt, entry_type, obj in raw_entries:
        if entry_type == "payment":
            party_name = "Walk-in Party"
            if obj.party_company_user_id:
                team_member = db.query(CompanyTeam).filter(CompanyTeam.id == obj.party_company_user_id).first()
                if team_member:
                    user = db.query(User).filter(User.id == team_member.user_id).first()
                    if user:
                        party_name = user.name
            
            is_in = obj.payment_type == "in"
            amount = float(obj.amount)
            debit = amount if is_in else 0.0
            credit = 0.0 if is_in else amount
            if is_in:
                running_balance += amount
            else:
                running_balance -= amount
                
            ledger_entries.append(
                LedgerTransactionResponse(
                    id=str(obj.id),
                    date=obj.payment_date.strftime("%b %d") if obj.payment_date else "",
                    type="Receipt" if is_in else "Expense",
                    category="Client Payment" if is_in else "Direct Payment",
                    description=obj.description or ("Receipt Payment" if is_in else "Expense Payment"),
                    amount=amount if is_in else -amount,
                    party=party_name,
                    ref=obj.reference_number or "",
                    ledger="Revenue" if is_in else "General Ledger",
                    debit=debit,
                    credit=credit,
                    balance=running_balance
                )
            )
        elif entry_type == "bill":
            party_name = "Vendor/Client"
            if obj.party_company_user_id:
                team_member = db.query(CompanyTeam).filter(CompanyTeam.id == obj.party_company_user_id).first()
                if team_member:
                    user = db.query(User).filter(User.id == team_member.user_id).first()
                    if user:
                        party_name = user.name
            is_receipt = obj.invoice_type == "sale"
            amount = float(obj.total_payable)
            debit = amount if is_receipt else 0.0
            credit = 0.0 if is_receipt else amount
            if is_receipt:
                running_balance += amount
            else:
                running_balance -= amount
                
            category = "Client Invoice" if obj.invoice_type == "sale" else ("Subcon Invoice" if obj.invoice_type == "subcon" else "Material Bill")
            ledger_head = "Revenue" if obj.invoice_type == "sale" else ("Subcon Cost" if obj.invoice_type == "subcon" else "Material Cost")
            
            ledger_entries.append(
                LedgerTransactionResponse(
                    id=str(obj.id),
                    date=obj.invoice_date.strftime("%b %d") if obj.invoice_date else "",
                    type="Receipt" if is_receipt else "Expense",
                    category=category,
                    description=f"Invoice {obj.invoice_number}",
                    amount=amount if is_receipt else -amount,
                    party=party_name,
                    ref=obj.invoice_number,
                    ledger=ledger_head,
                    debit=debit,
                    credit=credit,
                    balance=running_balance
                )
            )
        elif entry_type == "salary":
            party_name = "Staff Member"
            if obj.employee_id:
                emp = db.query(StaffEmployee).filter(StaffEmployee.id == obj.employee_id).first()
                if emp and emp.company_user_id:
                    team_member = db.query(CompanyTeam).filter(CompanyTeam.id == emp.company_user_id).first()
                    if team_member:
                        user = db.query(User).filter(User.id == team_member.user_id).first()
                        if user:
                            party_name = user.name
            amount = float(obj.net_payable)
            debit = 0.0
            credit = amount
            running_balance -= amount
            
            ledger_entries.append(
                LedgerTransactionResponse(
                    id=str(obj.id),
                    date=obj.created_at.strftime("%b %d") if obj.created_at else "",
                    type="Expense",
                    category="Labour Wages",
                    description="Salary Payout",
                    amount=-amount,
                    party=party_name,
                    ref="PAYROLL",
                    ledger="Labour Cost",
                    debit=debit,
                    credit=credit,
                    balance=running_balance
                )
            )

    # Sort descending (most recent first) for response presentation
    ledger_entries.reverse()
    return ledger_entries


@router.get("/pl", response_model=List[PLItemResponse])
def get_project_pl(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
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

    # 5. Plant & Machinery (Equipment deployment cost + fuel costs)
    deployments = db.query(EquipmentDeployment).filter(EquipmentDeployment.project_id == proj_uuid).all()
    dep_cost = 0.0
    for dep in deployments:
        eq = db.query(Equipment).filter(Equipment.id == dep.equipment_id).first()
        if eq and eq.hourly_rate:
            rate = float(eq.hourly_rate)
            end = dep.end_date if dep.end_date else datetime.utcnow()
            hours = (end - dep.start_date).total_seconds() / 3600.0
            dep_cost += max(0.0, hours * rate)

    fuel_logs = db.query(FuelLog).filter(FuelLog.project_id == proj_uuid).all()
    fuel_cost = sum(float(log.total_cost or 0.0) for log in fuel_logs)
    equipment_actual = dep_cost + fuel_cost

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


@router.patch("/approve/{transaction_id}")
def approve_transaction(transaction_id: uuid.UUID, db: Session = Depends(get_db)):
    bill = db.query(Bill).filter(Bill.id == transaction_id).first()
    if bill:
        bill.approval_flag = "approved"
        db.commit()
        return {"status": "success", "message": "Bill approved successfully", "type": "bill"}
    
    payment = db.query(Payment).filter(Payment.id == transaction_id).first()
    if payment:
        return {"status": "success", "message": "Payment confirmed", "type": "payment"}
        
    raise HTTPException(status_code=404, detail="Transaction not found")


class BankAccountCreate(BaseModel):
    account_holder_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    upi_id: Optional[str] = None
    balance: float = 0.0

class BankAccountResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    account_holder_name: str
    bank_name: str
    account_number: str
    ifsc_code: str
    upi_id: Optional[str]
    balance: float
    created_at: datetime

    class Config:
        from_attributes = True

class PaymentRequestCreate(BaseModel):
    party_company_user_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    amount: float
    details: str
    due_date: Optional[datetime] = None
    approval_status: Optional[str] = None
    request_type: Optional[str] = None
    request_no: Optional[str] = None

class PaymentRequestResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    party_company_user_id: uuid.UUID
    party_name: str
    amount: float
    details: str
    status: str
    due_date: Optional[datetime]
    approval_status: str = "Pending"
    approval_rule_id: Optional[uuid.UUID] = None
    approvals_required: int = 0
    approvals_completed: int = 0
    request_type: Optional[str] = None
    request_no: Optional[str] = None
    created_at: datetime
    payment: Optional[dict] = None

    class Config:
        from_attributes = True

class PaymentRequestPaymentCreate(BaseModel):
    payment_date: datetime
    payment_mode: str  # Cash, Bank, UPI, Cheque
    paid_amount: float
    deduction: float = 0.0
    tds: float = 0.0
    remarks: Optional[str] = None
    reference_no: Optional[str] = None
    attachment_name: Optional[str] = None


@router.get("/accounts/{company_id}", response_model=List[BankAccountResponse])
def get_bank_accounts(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(BankAccount).filter(BankAccount.company_id == company_id).all()


@router.post("/accounts/{company_id}", response_model=BankAccountResponse)
def create_bank_account(company_id: uuid.UUID, data: BankAccountCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    new_acc = BankAccount(
        company_id=company_id,
        account_holder_name=data.account_holder_name,
        bank_name=data.bank_name,
        account_number=data.account_number,
        ifsc_code=data.ifsc_code,
        upi_id=data.upi_id,
        balance=data.balance
    )
    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)
    return new_acc


# --- Cash Account (Finance tab: Accounts sub-tab) ---
def _cash_running_balance(db, company_id: uuid.UUID) -> float:
    """Running cash balance = opening balance + (cash-in payments - cash-out payments)."""
    cash_acc = db.query(CashAccount).filter(CashAccount.company_id == company_id).first()
    opening = float(cash_acc.opening_balance) if cash_acc else 0.0
    cash_in = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.company_id == company_id, Payment.payment_type == "in",
        Payment.payment_method.ilike("%cash%"),
    ).scalar() or 0
    cash_out = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
        Payment.company_id == company_id, Payment.payment_type == "out",
        Payment.payment_method.ilike("%cash%"),
    ).scalar() or 0
    return round(opening + float(cash_in) - float(cash_out), 2)


class CashAccountCreate(BaseModel):
    name: Optional[str] = "Cash Account"
    opening_balance: float = 0.0


class CashAccountResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    opening_balance: float
    running_balance: float
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/cash-account/{company_id}", response_model=Optional[CashAccountResponse])
def get_cash_account(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    acc = db.query(CashAccount).filter(CashAccount.company_id == company_id).first()
    if not acc:
        return None
    return CashAccountResponse(
        id=acc.id,
        company_id=acc.company_id,
        name=acc.name,
        opening_balance=acc.opening_balance,
        running_balance=_cash_running_balance(db, company_id),
        created_at=acc.created_at,
    )


@router.post("/cash-account/{company_id}", response_model=CashAccountResponse)
def create_cash_account(company_id: uuid.UUID, data: CashAccountCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    existing = db.query(CashAccount).filter(CashAccount.company_id == company_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cash account already exists for this company")
    new_acc = CashAccount(
        company_id=company_id,
        name=data.name or "Cash Account",
        opening_balance=data.opening_balance,
    )
    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)
    return CashAccountResponse(
        id=new_acc.id,
        company_id=new_acc.company_id,
        name=new_acc.name,
        opening_balance=new_acc.opening_balance,
        running_balance=_cash_running_balance(db, company_id),
        created_at=new_acc.created_at,
    )


# --- Company-level Party aggregation (Finance tab: Party sub-tab) ---
def _company_party_team_ids(db, party_id: uuid.UUID):
    """Resolve the billing-side company_team ids linked to a library party (company-wide)."""
    team_ids = [
        t.id
        for t in db.query(CompanyTeam).filter(CompanyTeam.library_party_id == party_id).all()
    ]
    if not team_ids:
        lp = db.query(LibraryParty).filter(LibraryParty.id == party_id).first()
        if lp and lp.name:
            teams = (
                db.query(CompanyTeam)
                .join(User, User.id == CompanyTeam.user_id)
                .filter(
                    CompanyTeam.company_id == lp.company_id,
                    func.lower(func.trim(User.name)) == lp.name.strip().lower(),
                )
                .all()
            )
            team_ids = [t.id for t in teams]
    return team_ids


class CompanyPartyResponse(BaseModel):
    id: uuid.UUID
    party_id_custom: Optional[str] = None
    name: str
    party_type: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    bank_account_id: Optional[uuid.UUID] = None
    contractor_role: Optional[str] = None
    service_rate_categories: Optional[str] = None
    # Computed company-wide metrics
    advance_paid: float = 0.0       # money advanced/paid to party (vendor/subcon)
    to_pay: float = 0.0             # outstanding payable to party
    to_receive: float = 0.0         # outstanding receivable from party (client)
    advance_received: float = 0.0   # advance taken from party (client)
    balance: float = 0.0            # net balance (positive = party owes us / advance paid)
    status: str = "To Pay"

    class Config:
        from_attributes = True


@router.get("/parties/{company_id}", response_model=List[CompanyPartyResponse])
def get_company_parties(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    parties = db.query(LibraryParty).filter(LibraryParty.company_id == company_id).all()
    result = []
    for lp in parties:
        team_ids = _company_party_team_ids(db, lp.id)
        opening_pay = float(lp.opening_balance or 0.0) if lp.opening_balance_type == "pay" else 0.0
        opening_receive = float(lp.opening_balance or 0.0) if lp.opening_balance_type == "receive" else 0.0

        # Payable side (purchase / subcon bills)
        pay_net = opening_pay
        recv_net = opening_receive
        if team_ids:
            bills = db.query(Bill).filter(Bill.party_company_user_id.in_(team_ids)).all()
            for b in bills:
                delta = float(b.paid_amount or 0.0) - float(b.total_payable or 0.0)
                if b.invoice_type == "sale":
                    recv_net += delta
                else:
                    pay_net += delta

        advance_paid = round(max(0.0, pay_net), 2)
        to_pay = round(max(0.0, -pay_net), 2)
        advance_received = round(max(0.0, recv_net), 2)
        to_receive = round(max(0.0, -recv_net), 2)

        balance = round(advance_paid + advance_received - to_pay - to_receive, 2)

        if to_pay > 0:
            status = "To Pay"
        elif advance_paid > 0:
            status = "Advance Paid"
        elif to_receive > 0:
            status = "To Receive"
        elif advance_received > 0:
            status = "Advance Received"
        else:
            status = "Settled"

        result.append(CompanyPartyResponse(
            id=lp.id,
            party_id_custom=lp.party_id_custom,
            name=lp.name,
            party_type=lp.party_type,
            phone=lp.phone,
            email=lp.email,
            address=lp.address,
            bank_account_id=lp.bank_account_id,
            contractor_role=lp.contractor_role,
            service_rate_categories=lp.service_rate_categories,
            advance_paid=advance_paid,
            to_pay=to_pay,
            to_receive=to_receive,
            advance_received=advance_received,
            balance=balance,
            status=status,
        ))
    return result


# --- Enterprise / multi-company roll-up ---
def _descendant_company_ids(db: Session, root_id: uuid.UUID):
    """Recursively collect all company ids that sit under root_id in the
    parent_company_id grouping tree (breadth-first)."""
    frontier = [root_id]
    seen: set = set()
    descendants: list = []
    while frontier:
        children = db.query(Company).filter(
            Company.parent_company_id.in_(frontier)
        ).all()
        frontier = []
        for c in children:
            if c.id not in seen:
                seen.add(c.id)
                descendants.append(c.id)
                frontier.append(c.id)
    return descendants


def _company_party_totals(db: Session, company_id: uuid.UUID) -> dict:
    """Aggregated party balance totals for a single company (reuses the same
    bill math as get_company_parties but summed, not per-party)."""
    parties = db.query(LibraryParty).filter(
        LibraryParty.company_id == company_id
    ).all()
    to_pay = to_receive = advance_paid = advance_received = 0.0
    for lp in parties:
        team_ids = _company_party_team_ids(db, lp.id)
        opening_pay = float(lp.opening_balance or 0.0) if lp.opening_balance_type == "pay" else 0.0
        opening_receive = float(lp.opening_balance or 0.0) if lp.opening_balance_type == "receive" else 0.0
        pay_net = opening_pay
        recv_net = opening_receive
        if team_ids:
            bills = db.query(Bill).filter(
                Bill.party_company_user_id.in_(team_ids)
            ).all()
            for b in bills:
                delta = float(b.paid_amount or 0.0) - float(b.total_payable or 0.0)
                if b.invoice_type == "sale":
                    recv_net += delta
                else:
                    pay_net += delta
        advance_paid += max(0.0, pay_net)
        to_pay += max(0.0, -pay_net)
        advance_received += max(0.0, recv_net)
        to_receive += max(0.0, -recv_net)
    return {
        "to_pay": round(to_pay, 2),
        "to_receive": round(to_receive, 2),
        "advance_paid": round(advance_paid, 2),
        "advance_received": round(advance_received, 2),
        "party_count": len(parties),
    }


class EnterpriseRollupCompanyOut(BaseModel):
    id: str
    name: str
    project_count: int
    party_count: int
    to_pay: float
    to_receive: float
    advance_paid: float
    advance_received: float
    balance: float


class EnterpriseRollupResponse(BaseModel):
    enterprise_id: str
    enterprise_name: str
    company_count: int
    project_count: int
    party_count: int
    total_to_pay: float
    total_to_receive: float
    total_advance_paid: float
    total_advance_received: float
    total_balance: float
    companies: list[EnterpriseRollupCompanyOut]


@router.get("/enterprise-rollup/{company_id}", response_model=EnterpriseRollupResponse)
def get_enterprise_rollup(
    company_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Roll up financials across an enterprise group (the company identified by
    company_id plus all of its descendants in the parent_company_id tree).

    Authorization: the caller must be a member of the enterprise company or any
    of its child companies."""
    descendants = _descendant_company_ids(db, company_id)
    allowed_ids = [company_id] + descendants
    member = db.query(CompanyTeam).filter(
        CompanyTeam.user_id == current_user.id,
        CompanyTeam.company_id.in_(allowed_ids),
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of this enterprise or its companies",
        )

    enterprise = db.query(Company).filter(Company.id == company_id).first()
    enterprise_name = enterprise.name if enterprise else "Enterprise"

    per_company: list = []
    totals = dict(project_count=0, party_count=0, to_pay=0.0, to_receive=0.0,
                  advance_paid=0.0, advance_received=0.0)
    for cid in allowed_ids:
        comp = db.query(Company).filter(Company.id == cid).first()
        if not comp:
            continue
        proj_count = db.query(Project).filter(Project.company_id == cid).count()
        p = _company_party_totals(db, cid)
        balance = p["advance_paid"] + p["advance_received"] - p["to_pay"] - p["to_receive"]
        per_company.append(EnterpriseRollupCompanyOut(
            id=str(cid),
            name=comp.name,
            project_count=proj_count,
            party_count=p["party_count"],
            to_pay=p["to_pay"],
            to_receive=p["to_receive"],
            advance_paid=p["advance_paid"],
            advance_received=p["advance_received"],
            balance=round(balance, 2),
        ))
        totals["project_count"] += proj_count
        totals["party_count"] += p["party_count"]
        totals["to_pay"] += p["to_pay"]
        totals["to_receive"] += p["to_receive"]
        totals["advance_paid"] += p["advance_paid"]
        totals["advance_received"] += p["advance_received"]

    total_balance = round(
        totals["advance_paid"] + totals["advance_received"] - totals["to_pay"] - totals["to_receive"], 2
    )
    return EnterpriseRollupResponse(
        enterprise_id=str(company_id),
        enterprise_name=enterprise_name,
        company_count=len(per_company),
        project_count=totals["project_count"],
        party_count=totals["party_count"],
        total_to_pay=round(totals["to_pay"], 2),
        total_to_receive=round(totals["to_receive"], 2),
        total_advance_paid=round(totals["advance_paid"], 2),
        total_advance_received=round(totals["advance_received"], 2),
        total_balance=total_balance,
        companies=per_company,
    )


# --- Company-level Transactions & Summary (Finance tab: Transaction sub-tab) ---
def _txn_party_name(db, team_id):
    if not team_id:
        return "Walk-in Party"
    team = db.query(CompanyTeam).filter(CompanyTeam.id == team_id).first()
    if not team:
        return "Unknown Party"
    user = db.query(User).filter(User.id == team.user_id).first()
    return user.name if user else "Unknown Party"


class TransactionRow(BaseModel):
    id: str
    date: str
    type: str
    party: str
    details: str
    status: str
    amount: float
    project_id: Optional[str] = None
    ref: str = ""

    class Config:
        from_attributes = True


class FinanceSummaryResponse(BaseModel):
    total_invoice: float = 0.0
    unpaid_invoice: float = 0.0
    total_expense: float = 0.0
    unpaid_expense: float = 0.0
    company_balance: float = 0.0
    cash_balance: float = 0.0
    in_total: float = 0.0
    out_total: float = 0.0
    transactions: List[TransactionRow] = []

    class Config:
        from_attributes = True


@router.get("/transactions/{company_id}", response_model=FinanceSummaryResponse)
def get_company_transactions(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    project_ids = [p.id for p in db.query(Project).filter(Project.company_id == company_id).all()]

    bills = []
    if project_ids:
        bills = db.query(Bill).filter(Bill.project_id.in_(project_ids)).all()
    payments = []
    if project_ids:
        payments = db.query(Payment).filter(Payment.project_id.in_(project_ids)).all()

    total_invoice = 0.0
    unpaid_invoice = 0.0
    total_expense = 0.0
    unpaid_expense = 0.0
    in_total = 0.0
    out_total = 0.0

    rows: List[TransactionRow] = []

    for b in bills:
        party = _txn_party_name(db, b.party_company_user_id)
        payable = float(b.total_payable or 0.0)
        paid = float(b.paid_amount or 0.0)
        outstanding = round(max(0.0, payable - paid), 2)
        type_label = {
            "sale": "Sales Invoice",
            "purchase": "Material Purchase",
            "subcon": "Subcon Bill",
        }.get(b.invoice_type, b.invoice_type)
        # Invoices are company "expense" when payable out (purchase/subcon) and "invoice" when sale
        if b.invoice_type == "sale":
            total_invoice += payable
            unpaid_invoice += outstanding
        else:
            total_expense += payable
            unpaid_expense += outstanding
        rows.append(TransactionRow(
            id=str(b.id),
            date=(b.invoice_date.strftime("%Y-%m-%d") if b.invoice_date else ""),
            type=type_label,
            party=party,
            details=f"Invoice {b.invoice_number}",
            status=b.status,
            amount=payable,
            project_id=str(b.project_id) if b.project_id else None,
            ref=b.invoice_number or "",
        ))

    for p in payments:
        party = _txn_party_name(db, p.party_company_user_id)
        amt = float(p.amount or 0.0)
        if p.payment_type == "in":
            in_total += amt
        else:
            out_total += amt
        rows.append(TransactionRow(
            id=str(p.id),
            date=(p.payment_date.strftime("%Y-%m-%d") if p.payment_date else ""),
            type="Payment In" if p.payment_type == "in" else "Payment Out",
            party=party,
            details=p.description or "",
            status="Approved",
            amount=amt,
            project_id=str(p.project_id) if p.project_id else None,
            ref=p.reference_number or "",
        ))

    # Company balance = cash wallet + all bank account balances
    cash_balance = _cash_running_balance(db, company_id)
    bank_balance = float(db.query(func.coalesce(func.sum(BankAccount.balance), 0.0)).filter(BankAccount.company_id == company_id).scalar() or 0.0)
    company_balance = round(cash_balance + bank_balance, 2)

    rows.sort(key=lambda r: r.date, reverse=True)

    return FinanceSummaryResponse(
        total_invoice=round(total_invoice, 2),
        unpaid_invoice=round(unpaid_invoice, 2),
        total_expense=round(total_expense, 2),
        unpaid_expense=round(unpaid_expense, 2),
        company_balance=company_balance,
        cash_balance=cash_balance,
        in_total=round(in_total, 2),
        out_total=round(out_total, 2),
        transactions=rows,
    )


PAYMENT_REQUEST_FEATURE_TYPE = "Payment Request"  # must match the Settings > Multi Level Approval category label exactly


def _pr_response(db: Session, req: PaymentRequest, payment_row: Optional[PaymentRequestPayment] = None) -> PaymentRequestResponse:
    user = db.query(User).filter(User.id == req.party_company_user_id).first()
    party_name = user.name if user else "Unknown Party"
    if payment_row is None:
        payment_row = (
            db.query(PaymentRequestPayment)
            .filter(PaymentRequestPayment.payment_request_id == req.id)
            .order_by(PaymentRequestPayment.created_at.desc())
            .first()
        )
    payment_dict = None
    if payment_row:
        payment_dict = {
            "id": str(payment_row.id),
            "payment_date": payment_row.payment_date,
            "payment_mode": payment_row.payment_mode,
            "paid_amount": payment_row.paid_amount,
            "deduction": payment_row.deduction,
            "tds": payment_row.tds,
            "balance_due": payment_row.balance_due,
            "remarks": payment_row.remarks,
            "reference_no": payment_row.reference_no,
            "attachment_name": payment_row.attachment_name,
        }
    levels_required = 0
    if req.approval_rule_id:
        rule = db.query(ApprovalRule).filter(ApprovalRule.id == req.approval_rule_id).first()
        levels_required = rule.levels if rule else 0
    return PaymentRequestResponse(
        id=req.id,
        company_id=req.company_id,
        project_id=req.project_id,
        party_company_user_id=req.party_company_user_id,
        party_name=party_name,
        amount=req.amount,
        details=req.details,
        status=req.status,
        due_date=req.due_date,
        approval_status=req.approval_status,
        approval_rule_id=req.approval_rule_id,
        approvals_required=levels_required,
        approvals_completed=levels_approved(db, "payment_request", req.id) if req.approval_rule_id else 0,
        request_type=req.request_type,
        request_no=req.request_no,
        created_at=req.created_at,
        payment=payment_dict,
    )


@router.get("/payment-requests/{company_id}", response_model=List[PaymentRequestResponse])
def get_payment_requests(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    requests = db.query(PaymentRequest).filter(PaymentRequest.company_id == company_id).all()
    return [_pr_response(db, r) for r in requests]


@router.post("/payment-requests/{company_id}", response_model=PaymentRequestResponse)
def create_payment_request(company_id: uuid.UUID, data: PaymentRequestCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    user = db.query(User).filter(User.id == data.party_company_user_id).first()
    party_name = user.name if user else "Unknown Party"
    # Auto-generate sequential request no (PR-1, PR-2, ...) per company
    if not data.request_no:
        count = db.query(PaymentRequest).filter(PaymentRequest.company_id == company_id).count()
        request_no = f"PR-{count + 1}"
    else:
        request_no = data.request_no

    matched_rule = find_matching_rule(db, company_id, PAYMENT_REQUEST_FEATURE_TYPE, data.amount)
    # A configured ApprovalRule gates this request regardless of what the caller
    # passed in approval_status — it always starts "Pending" and only advances
    # through update_payment_request_status once the required levels sign off.
    approval_status = "Pending" if matched_rule else (data.approval_status or "Pending")

    new_req = PaymentRequest(
        company_id=company_id,
        project_id=data.project_id,
        party_company_user_id=data.party_company_user_id,
        party_name=party_name,
        amount=data.amount,
        details=data.details,
        due_date=data.due_date,
        approval_status=approval_status,
        approval_rule_id=matched_rule.id if matched_rule else None,
        request_type=data.request_type,
        request_no=request_no,
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return _pr_response(db, new_req, payment_row=None)


@router.post("/payment-requests/pay/{request_id}", response_model=PaymentRequestResponse)
def record_payment_request(request_id: uuid.UUID, data: PaymentRequestPaymentCreate, db: Session = Depends(get_db)):
    req = db.query(PaymentRequest).filter(PaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")
    if req.approval_rule_id and req.approval_status != "Approved":
        raise HTTPException(status_code=400, detail="Payment request is pending approval; it cannot be recorded as paid until all required levels have signed off")

    balance_due = max(0.0, req.amount - data.paid_amount - data.deduction - data.tds)
    payment = PaymentRequestPayment(
        payment_request_id=req.id,
        company_id=req.company_id,
        payment_date=data.payment_date,
        payment_mode=data.payment_mode,
        paid_amount=data.paid_amount,
        deduction=data.deduction,
        tds=data.tds,
        balance_due=balance_due,
        remarks=data.remarks,
        reference_no=data.reference_no,
        attachment_name=data.attachment_name,
    )
    db.add(payment)
    req.status = "Paid"
    req.approval_status = "Approved"
    db.commit()
    db.refresh(req)
    return _pr_response(db, req, payment_row=payment)


class PaymentRequestStatusUpdate(BaseModel):
    status: str

@router.put("/payment-requests/approve/{request_id}", response_model=PaymentRequestResponse)
def update_payment_request_status(request_id: uuid.UUID, payload: PaymentRequestStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    req = db.query(PaymentRequest).filter(PaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")

    rule = db.query(ApprovalRule).filter(ApprovalRule.id == req.approval_rule_id).first() if req.approval_rule_id else None
    action_status = payload.status

    if action_status == "Rejected":
        if rule:
            matched = match_approver(rule.approvers, current_user)
            if not matched:
                raise HTTPException(status_code=403, detail="You are not a configured approver for this payment request")
            record_action(
                db, company_id=req.company_id, rule_id=rule.id, entity_type="payment_request", entity_id=req.id,
                level=levels_approved(db, "payment_request", req.id) + 1, action="rejected", user=current_user, matched_label=matched,
            )
        req.status = "Rejected"
        req.approval_status = "Rejected"

    elif action_status in ("Approved", "Paid"):
        if req.approval_status == "Rejected":
            raise HTTPException(status_code=400, detail="Payment request was rejected; cannot approve")
        if req.approval_status == "Approved":
            # Already fully signed off — idempotently move to the requested terminal status.
            req.status = action_status
        elif rule:
            if action_status == "Paid":
                raise HTTPException(status_code=400, detail="Payment request is pending approval; approve all required levels before marking it paid")
            matched = match_approver(rule.approvers, current_user)
            if not matched:
                raise HTTPException(status_code=403, detail="You are not a configured approver for this payment request")
            if user_already_acted(db, "payment_request", req.id, current_user.id):
                raise HTTPException(status_code=400, detail="You have already recorded a decision on this payment request")

            next_level = levels_approved(db, "payment_request", req.id) + 1
            record_action(
                db, company_id=req.company_id, rule_id=rule.id, entity_type="payment_request", entity_id=req.id,
                level=next_level, action="approved", user=current_user, matched_label=matched,
            )
            if next_level >= rule.levels:
                req.approval_status = "Approved"
                req.status = "Approved"
            # else: still pending_approval, awaiting further levels — status/approval_status unchanged
        else:
            req.status = action_status
            req.approval_status = "Approved"
    else:
        req.status = action_status

    db.commit()
    db.refresh(req)
    return _pr_response(db, req)


@router.delete("/payment-requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_payment_request(request_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a payment request. Tenant-scoped: the caller must belong to the
    request's company, and the deletion is written to the DeleteLog audit trail."""
    req = db.query(PaymentRequest).filter(PaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")
    get_company_membership(db, current_user, req.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, req.company_id, "payment_request", req.id, f"Payment Request: {req.request_no or req.id}")
    except Exception:
        pass
    db.delete(req)
    db.commit()


# --- P2P Transfer Endpoints ---
class P2PTransferRequest(BaseModel):
    company_id: uuid.UUID
    sender_company_user_id: uuid.UUID
    receiver_company_user_id: uuid.UUID
    amount: float
    payment_date: datetime
    description: Optional[str] = None

class P2PTransferResponse(BaseModel):
    sender_payment_id: uuid.UUID
    receiver_payment_id: uuid.UUID
    status: str

cashbook_router = APIRouter(
    prefix="/cashbook",
    tags=["Cashbook & P2P"],
    dependencies=[Depends(get_current_user)]
)

def perform_p2p_transfer(req: P2PTransferRequest, db: Session):
    comp_uuid = uuid.UUID(str(req.company_id))
    sender_uuid = uuid.UUID(str(req.sender_company_user_id))
    receiver_uuid = uuid.UUID(str(req.receiver_company_user_id))
    
    sender = db.query(CompanyTeam).filter(CompanyTeam.id == sender_uuid, CompanyTeam.company_id == comp_uuid).first()
    if not sender:
        raise HTTPException(status_code=404, detail="Sender not found in company team")
        
    receiver = db.query(CompanyTeam).filter(CompanyTeam.id == receiver_uuid, CompanyTeam.company_id == comp_uuid).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found in company team")

    if req.amount <= 0:
        raise HTTPException(status_code=400, detail="Transfer amount must be greater than zero")

    sender_payment = Payment(
        id=uuid.uuid4(),
        company_id=comp_uuid,
        project_id=None,
        party_company_user_id=sender_uuid,
        payment_type="out",
        amount=req.amount,
        unsettled_amount=req.amount,
        payment_method="Cash",
        reference_number=f"P2P-OUT-{uuid.uuid4().hex[:6].upper()}",
        description=req.description or f"P2P transfer to team member {receiver_uuid}",
        payment_date=req.payment_date
    )
    db.add(sender_payment)

    receiver_payment = Payment(
        id=uuid.uuid4(),
        company_id=comp_uuid,
        project_id=None,
        party_company_user_id=receiver_uuid,
        payment_type="in",
        amount=req.amount,
        unsettled_amount=req.amount,
        payment_method="Cash",
        reference_number=f"P2P-IN-{uuid.uuid4().hex[:6].upper()}",
        description=req.description or f"P2P transfer from team member {sender_uuid}",
        payment_date=req.payment_date
    )
    db.add(receiver_payment)
    db.commit()

    return P2PTransferResponse(
        sender_payment_id=sender_payment.id,
        receiver_payment_id=receiver_payment.id,
        status="Success"
    )

@cashbook_router.post("/p2p", response_model=P2PTransferResponse, status_code=status.HTTP_201_CREATED)
def p2p_transfer_cashbook(req: P2PTransferRequest, db: Session = Depends(get_db)):
    return perform_p2p_transfer(req, db)

@router.post("/cashbook/p2p", response_model=P2PTransferResponse, status_code=status.HTTP_201_CREATED)
def p2p_transfer_finance(req: P2PTransferRequest, db: Session = Depends(get_db)):
    return perform_p2p_transfer(req, db)


@cashbook_router.post("/upload")
def upload_payments(
    company_id: uuid.UUID = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # company_id here comes from multipart form data (not the URL path/query),
    # so it can't share a value with a plain Depends(verify_company_access)
    # sub-dependency; verify membership inline instead.
    get_company_membership(db, current_user, company_id)
    import csv
    import io

    try:
        content = file.file.read().decode("utf-8")
        csv_reader = csv.reader(io.StringIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read file: {str(e)}")
        
    headers = next(csv_reader, None)
    if not headers:
        raise HTTPException(status_code=400, detail="Empty CSV file")
        
    headers = [h.replace('\ufeff', '').strip() for h in headers]
    
    required = ["Payment Type", "Party Name", "Amount"]
    for col in required:
        if col not in headers:
            raise HTTPException(status_code=400, detail=f"Invalid CSV schema: '{col}' column is required")
            
    created_count = 0
    
    for row_cells in csv_reader:
        if not row_cells or not any(row_cells):
            continue
            
        row = {}
        for idx, header in enumerate(headers):
            if idx < len(row_cells):
                row[header] = row_cells[idx].strip()
                
        party_name = row.get("Party Name")
        amt_str = row.get("Amount")
        pay_type = (row.get("Payment Type") or "out").lower()
        if pay_type in ["receipt", "in"]:
            payment_type = "in"
        else:
            payment_type = "out"
            
        try:
            amount = float(amt_str) if amt_str else 0.0
        except ValueError:
            continue
            
        if amount <= 0:
            continue
            
        party_user = db.query(User).filter(User.name == party_name).first()
        party_team_id = None
        if party_user:
            team_member = db.query(CompanyTeam).filter(
                CompanyTeam.user_id == party_user.id,
                CompanyTeam.company_id == company_id
            ).first()
            if team_member:
                party_team_id = team_member.id
                
        project_name = row.get("Project Name")
        project_id = None
        if project_name:
            proj = db.query(Project).filter(
                Project.name == project_name,
                Project.company_id == company_id
            ).first()
            if proj:
                project_id = proj.id
                
        pay_date_str = row.get("Payment Date")
        payment_date = datetime.utcnow()
        if pay_date_str:
            for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y-%m-%dT%H:%M:%S"):
                try:
                    payment_date = datetime.strptime(pay_date_str, fmt)
                    break
                except ValueError:
                    pass

        payment = Payment(
            id=uuid.uuid4(),
            company_id=company_id,
            project_id=project_id,
            party_company_user_id=party_team_id,
            payment_type=payment_type,
            amount=amount,
            unsettled_amount=amount,
            payment_method=row.get("Mode of Payment") or "Cash",
            reference_number=row.get("Payment Request ID") or f"CSV-V-{uuid.uuid4().hex[:6].upper()}",
            description=row.get("Remark") or f"CSV Uploaded Payment - Category: {row.get('Category')}",
            payment_date=payment_date
        )
        db.add(payment)
        created_count += 1
        
    db.commit()
    return {
        "status": "success",
        "created": created_count
    }


