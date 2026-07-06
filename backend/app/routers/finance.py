import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Payment, PaymentSettlement, Bill, PayrollRun, PayrollLineItem, StaffEmployee, ProjectBudget, Project, CompanyTeam, User, Equipment, EquipmentDeployment, FuelLog, BankAccount, PaymentRequest
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


@router.get("/ledger", response_model=List[LedgerTransactionResponse])
def get_ledger(project_id: uuid.UUID, db: Session = Depends(get_db)):
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
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/accounts/{company_id}", response_model=List[BankAccountResponse])
def get_bank_accounts(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(BankAccount).filter(BankAccount.company_id == company_id).all()


@router.post("/accounts/{company_id}", response_model=BankAccountResponse)
def create_bank_account(company_id: uuid.UUID, data: BankAccountCreate, db: Session = Depends(get_db)):
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


@router.get("/payment-requests/{company_id}", response_model=List[PaymentRequestResponse])
def get_payment_requests(company_id: uuid.UUID, db: Session = Depends(get_db)):
    requests = db.query(PaymentRequest).filter(PaymentRequest.company_id == company_id).all()
    # Populate party_name if possible
    res = []
    for r in requests:
        user = db.query(User).filter(User.id == r.party_company_user_id).first()
        party_name = user.name if user else "Unknown Party"
        res.append(PaymentRequestResponse(
            id=r.id,
            company_id=r.company_id,
            project_id=r.project_id,
            party_company_user_id=r.party_company_user_id,
            party_name=party_name,
            amount=r.amount,
            details=r.details,
            status=r.status,
            due_date=r.due_date,
            created_at=r.created_at
        ))
    return res


@router.post("/payment-requests/{company_id}", response_model=PaymentRequestResponse)
def create_payment_request(company_id: uuid.UUID, data: PaymentRequestCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == data.party_company_user_id).first()
    party_name = user.name if user else "Unknown Party"
    new_req = PaymentRequest(
        company_id=company_id,
        project_id=data.project_id,
        party_company_user_id=data.party_company_user_id,
        party_name=party_name,
        amount=data.amount,
        details=data.details,
        due_date=data.due_date
    )
    db.add(new_req)
    db.commit()
    db.refresh(new_req)
    return PaymentRequestResponse(
        id=new_req.id,
        company_id=new_req.company_id,
        project_id=new_req.project_id,
        party_company_user_id=new_req.party_company_user_id,
        party_name=party_name,
        amount=new_req.amount,
        details=new_req.details,
        status=new_req.status,
        due_date=new_req.due_date,
        created_at=new_req.created_at
    )


class PaymentRequestStatusUpdate(BaseModel):
    status: str

@router.put("/payment-requests/approve/{request_id}", response_model=PaymentRequestResponse)
def update_payment_request_status(request_id: uuid.UUID, payload: PaymentRequestStatusUpdate, db: Session = Depends(get_db)):
    req = db.query(PaymentRequest).filter(PaymentRequest.id == request_id).first()
    if not req:
        raise HTTPException(status_code=404, detail="Payment request not found")
    req.status = payload.status
    db.commit()
    db.refresh(req)
    
    user = db.query(User).filter(User.id == req.party_company_user_id).first()
    party_name = user.name if user else "Unknown Party"
    
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
        created_at=req.created_at
    )


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
    tags=["Cashbook & P2P"]
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
    db: Session = Depends(get_db)
):
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


