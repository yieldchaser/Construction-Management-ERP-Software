import json
import uuid
from datetime import datetime
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_in_company, verify_company_access, get_company_membership, require_permission
from app.models import (
    TallyConnection, TallyAgent, TallyLedgerMapping, TallyPartyMapping,
    TallyCostCentreMapping, TallyBankMapping, TallySyncLog,
    Company, Bill, Payment, CompanyTeam, User, LibraryParty,
)
from app.tally_xml import build_tally_envelope
from pydantic import BaseModel
from app.constants import REVENUE_INVOICE_TYPES, EXPENSE_INVOICE_TYPES, SETTLEMENT_INVOICE_TYPES

router = APIRouter(
    prefix="/tally",
    tags=["Tally ERP Integration"],
    dependencies=[Depends(get_current_user)]
)

# Schemas
class ConnectionCreateRequest(BaseModel):
    company_id: uuid.UUID
    tally_company_name: str
    registered_mobile: str
    sync_window_start_date: datetime
    voucher_number_template: str = "SF-{year}-{number}"
    auto_create_missing_ledgers: bool = False
    round_off_ledger: Optional[str] = None
    default_cash_ledger: Optional[str] = None

class ConnectionResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    tally_company_name: str
    registered_mobile: str
    sync_window_start_date: datetime
    voucher_number_template: str
    auto_create_missing_ledgers: bool
    round_off_ledger: Optional[str]
    default_cash_ledger: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

class AgentCreateRequest(BaseModel):
    company_id: uuid.UUID
    machine_label: str
    auth_key: str

class AgentResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    machine_label: str
    auth_key: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class LedgerMappingCreateRequest(BaseModel):
    company_id: uuid.UUID
    onsite_transaction_type: Literal["Material Purchase", "Subcon Expense", "Sales Invoice"]
    posting_mode: str = "lumpsum"
    tally_voucher_type: Literal["Sales", "Purchase", "Receipt", "Payment", "Journal"]
    tally_ledger_name: str
    freight_ledger: Optional[str] = None
    surcharge_ledger: Optional[str] = None

class LedgerMappingResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    onsite_transaction_type: str
    posting_mode: str
    tally_voucher_type: str
    tally_ledger_name: str
    freight_ledger: Optional[str]
    surcharge_ledger: Optional[str]

    class Config:
        from_attributes = True

class PartyMappingCreateRequest(BaseModel):
    company_id: uuid.UUID
    onsite_party_id: uuid.UUID
    tally_ledger_name: str

class PartyMappingResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    onsite_party_id: uuid.UUID
    tally_ledger_name: str

    class Config:
        from_attributes = True

class CostCentreMappingCreateRequest(BaseModel):
    company_id: uuid.UUID
    project_id: uuid.UUID
    tally_cost_centre_name: str

class CostCentreMappingResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    tally_cost_centre_name: str

    class Config:
        from_attributes = True

class BankMappingCreateRequest(BaseModel):
    company_id: uuid.UUID
    onsite_bank_account_details: str
    tally_ledger_name: str

class BankMappingResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    onsite_bank_account_details: str
    tally_ledger_name: str

    class Config:
        from_attributes = True

class MarkSyncedRequest(BaseModel):
    bill_ids: List[uuid.UUID] = []
    payment_ids: List[uuid.UUID] = []

class SyncLogResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    exported_at: Optional[datetime]
    marked_synced_at: Optional[datetime]
    voucher_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# --- Helpers ---

def _resolve_party_ledger(db: Session, company_id: uuid.UUID, party_company_user_id, default: str) -> str:
    if party_company_user_id:
        pm = db.query(TallyPartyMapping).filter(
            TallyPartyMapping.company_id == company_id,
            TallyPartyMapping.onsite_party_id == party_company_user_id,
        ).first()
        if pm:
            return pm.tally_ledger_name
        member = db.query(CompanyTeam).filter(CompanyTeam.id == party_company_user_id).first()
        if member:
            # User-backed rows resolve to the member's display name.
            if member.user_id:
                user = db.query(User).filter(User.id == member.user_id).first()
                if user and user.name:
                    return user.name
            # Userless subcontractors (no login) fall back to the linked
            # LibraryParty name so the ledger shows the real vendor, not "Vendor".
            if member.library_party_id:
                party = db.query(LibraryParty).filter(LibraryParty.id == member.library_party_id).first()
                if party and party.name:
                    return party.name
    return default


def _render_number(template: str, source, year: int, seq: int) -> str:
    if source:
        return str(source)
    try:
        return template.format(year=year, number=seq)
    except Exception:
        return f"{year}-{seq}"


def _cash_bank_type(name: str, default_cash: Optional[str]) -> str:
    if name == default_cash:
        return "cash"
    return "cash" if "cash" in (name or "").lower() else "bank"


def _build_vouchers(db: Session, conn: TallyConnection, bills, payments, advance_sequence: bool = False):
    """Resolve Bill + Payment rows into Tally voucher dicts (double entry).

    Voucher numbers use a durable, per-company monotonic counter
    (`conn.last_voucher_seq`) so numbers never repeat across confirmed syncs.
    This helper NEVER consumes the counter: both `/pending` and `/export`
    render the same preview numbers on every call until the import is
    confirmed via `/mark-synced`, which is what advances it (R2-369). A
    re-downloaded file therefore carries identical voucher numbers instead of
    re-numbering the same economic events past Tally's duplicate detection.
    The `advance_sequence` flag is kept for backwards compatibility and no
    longer has any effect.
    """
    vouchers = []
    pending = []

    ledger_map = {
        m.onsite_transaction_type: m
        for m in db.query(TallyLedgerMapping).filter(TallyLedgerMapping.company_id == conn.company_id).all()
    }
    cc_map = {
        str(m.project_id): m.tally_cost_centre_name
        for m in db.query(TallyCostCentreMapping).filter(TallyCostCentreMapping.company_id == conn.company_id).all()
    }
    bank_maps = {
        m.onsite_bank_account_details: m.tally_ledger_name
        for m in db.query(TallyBankMapping).filter(TallyBankMapping.company_id == conn.company_id).all()
    }

    seq = (conn.last_voucher_seq or 0) + 1

    for b in bills:
        total = float(b.total_payable or 0)
        cost_centre = cc_map.get(str(b.project_id)) if b.project_id else None
        year = b.invoice_date.year if b.invoice_date else datetime.utcnow().year
        date_str = b.invoice_date.strftime("%Y%m%d") if b.invoice_date else ""
        vnumber = _render_number(conn.voucher_number_template, b.invoice_number, year, seq)

        if b.invoice_type in SETTLEMENT_INVOICE_TYPES:
            # Settlement rows move money, not goods: money-in bills are Receipt
            # vouchers (debit bank/cash, credit the party) and money-out bills
            # are Payment vouchers, never Purchase/Sales.
            money_in = b.invoice_type in ("payment_in", "i_received")
            vchtype = "Receipt" if money_in else "Payment"
            cash_ledger = (
                bank_maps.get(b.payment_bank_name)
                if b.payment_bank_name
                else None
            ) or conn.default_cash_ledger or "Bank/Cash"
            party_ledger = _resolve_party_ledger(
                db, conn.company_id, b.party_company_user_id,
                "Client Ledger" if money_in else "Vendor Ledger",
            )
            narration = f"SiteFlow {b.invoice_type} settlement {b.invoice_number}."
            if money_in:
                entries = [
                    {"ledger": cash_ledger, "amount": total, "debit": True, "ledger_type": _cash_bank_type(cash_ledger, conn.default_cash_ledger)},
                    {"ledger": party_ledger, "amount": total, "debit": False, "ledger_type": "party_debtor"},
                ]
            else:
                entries = [
                    {"ledger": party_ledger, "amount": total, "debit": True, "ledger_type": "party_creditor"},
                    {"ledger": cash_ledger, "amount": total, "debit": False, "ledger_type": _cash_bank_type(cash_ledger, conn.default_cash_ledger)},
                ]
        elif b.invoice_type in REVENUE_INVOICE_TYPES:
            vchtype = "Sales"
            ledger_key = "Sales Invoice"
            fallback_ledger = "Sales A/c"
            party_default = "Client Ledger"
            mapped = ledger_map.get(ledger_key)
            expense_ledger = mapped.tally_ledger_name if mapped else fallback_ledger
            party_ledger = _resolve_party_ledger(db, conn.company_id, b.party_company_user_id, party_default)
            narration = f"SiteFlow {b.invoice_type} invoice {b.invoice_number}."
        else:
            vchtype = "Purchase"
            ledger_key = "Subcon Expense" if b.invoice_type == "subcon" else "Material Purchase"
            fallback_ledger = "Purchase A/c"
            party_default = "Vendor Ledger"
            mapped = ledger_map.get(ledger_key)
            expense_ledger = mapped.tally_ledger_name if mapped else fallback_ledger
            party_ledger = _resolve_party_ledger(db, conn.company_id, b.party_company_user_id, party_default)
            narration = f"SiteFlow {b.invoice_type} invoice {b.invoice_number}."

        if vchtype == "Sales":
            # Sale: the customer now owes us, so DEBIT the party (Sundry
            # Debtor, receivable up) and CREDIT the sales ledger (revenue up).
            # The mirror image (Dr Sales / Cr Debtor) would understate both
            # revenue and receivables, so the debit/credit flags are inverted
            # relative to the purchase branch below.
            entries = [
                {"ledger": expense_ledger, "amount": total, "debit": False, "cost_centre": cost_centre,
                 "ledger_type": "sales"},
                {"ledger": party_ledger, "amount": total, "debit": True,
                 "ledger_type": "party_debtor"},
            ]
        else:
            # Purchase / subcon: debit the expense ledger, credit the party.
            entries = [
                {"ledger": expense_ledger, "amount": total, "debit": True, "cost_centre": cost_centre,
                 "ledger_type": "purchase"},
                {"ledger": party_ledger, "amount": total, "debit": False,
                 "ledger_type": "party_creditor"},
            ]
        vouchers.append({
            "vchtype": vchtype,
            "voucher_type_name": vchtype,
            "voucher_number": vnumber,
            "reference": b.invoice_number,
            "date": date_str,
            "party_ledger_name": party_ledger,
            "narration": narration,
            "entries": entries,
        })
        pending.append({
            "type": vchtype,
            "number": vnumber,
            "party": party_ledger,
            "amount": total,
            "date": date_str,
        })
        seq += 1

    for p in payments:
        total = float(p.amount or 0)
        if p.payment_type == "in":
            vchtype = "Receipt"
            # Money comes IN: debit bank/cash, credit party. The bank/cash
            # ledger follows the payment's own account when a bank mapping
            # exists for it, so payments from different accounts post to
            # different ledgers instead of one shared CASH ledger.
            cash_ledger = (
                bank_maps.get(p.account_name)
                if p.account_name
                else None
            ) or conn.default_cash_ledger or "Bank/Cash"
            party_ledger = _resolve_party_ledger(db, conn.company_id, p.party_company_user_id, cash_ledger)
            entries = [
                {"ledger": cash_ledger, "amount": total, "debit": True, "ledger_type": _cash_bank_type(cash_ledger, conn.default_cash_ledger)},
                {"ledger": party_ledger, "amount": total, "debit": False, "ledger_type": "party_debtor"},
            ]
        else:
            vchtype = "Payment"
            # Money goes OUT: debit party, credit bank/cash.
            cash_ledger = (
                bank_maps.get(p.account_name)
                if p.account_name
                else None
            ) or conn.default_cash_ledger or "Bank/Cash"
            party_ledger = _resolve_party_ledger(db, conn.company_id, p.party_company_user_id, cash_ledger)
            entries = [
                {"ledger": party_ledger, "amount": total, "debit": True, "ledger_type": "party_creditor"},
                {"ledger": cash_ledger, "amount": total, "debit": False, "ledger_type": _cash_bank_type(cash_ledger, conn.default_cash_ledger)},
            ]

        year = p.payment_date.year if p.payment_date else datetime.utcnow().year
        date_str = p.payment_date.strftime("%Y%m%d") if p.payment_date else ""
        vnumber = _render_number(conn.voucher_number_template, p.reference_number, year, seq)
        narration = p.description or f"SiteFlow {p.payment_type} payment."

        vouchers.append({
            "vchtype": vchtype,
            "voucher_type_name": vchtype,
            "voucher_number": vnumber,
            "reference": p.reference_number,
            "date": date_str,
            "party_ledger_name": party_ledger,
            "narration": narration,
            "entries": entries,
        })
        pending.append({
            "type": vchtype,
            "number": vnumber,
            "party": party_ledger,
            "amount": total,
            "date": date_str,
        })
        seq += 1

    if advance_sequence and (bills or payments):
        conn.last_voucher_seq = seq - 1
        db.add(conn)
        db.commit()

    return vouchers, pending


# --- Connection ---

@router.post("/connections", response_model=ConnectionResponse, status_code=status.HTTP_201_CREATED)
def create_connection(req: ConnectionCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_uuid = uuid.UUID(str(req.company_id))
    get_company_membership(db, current_user, comp_uuid)
    require_permission(db, current_user, comp_uuid, "settings:manage")
    company = db.query(Company).filter(Company.id == comp_uuid).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    conn = db.query(TallyConnection).filter(TallyConnection.company_id == comp_uuid).first()
    if conn:
        conn.tally_company_name = req.tally_company_name
        conn.registered_mobile = req.registered_mobile
        conn.sync_window_start_date = req.sync_window_start_date
        conn.voucher_number_template = req.voucher_number_template
        conn.auto_create_missing_ledgers = req.auto_create_missing_ledgers
        conn.round_off_ledger = req.round_off_ledger
        conn.default_cash_ledger = req.default_cash_ledger
    else:
        conn = TallyConnection(
            id=uuid.uuid4(),
            company_id=comp_uuid,
            tally_company_name=req.tally_company_name,
            registered_mobile=req.registered_mobile,
            sync_window_start_date=req.sync_window_start_date,
            voucher_number_template=req.voucher_number_template,
            auto_create_missing_ledgers=req.auto_create_missing_ledgers,
            round_off_ledger=req.round_off_ledger,
            default_cash_ledger=req.default_cash_ledger,
        )
        db.add(conn)

    db.commit()
    db.refresh(conn)
    return conn


@router.get("/connections")
def get_connection(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    conn = db.query(TallyConnection).filter(TallyConnection.company_id == comp_uuid).first()
    if not conn:
        return {"connected": False}
    return conn


# --- Agents ---

@router.post("/agents", response_model=AgentResponse, status_code=status.HTTP_201_CREATED)
def register_agent(req: AgentCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_uuid = uuid.UUID(str(req.company_id))
    get_company_membership(db, current_user, comp_uuid)
    require_permission(db, current_user, comp_uuid, "settings:manage")
    agent = TallyAgent(
        id=uuid.uuid4(),
        company_id=comp_uuid,
        machine_label=req.machine_label,
        auth_key=req.auth_key,
        status="active",
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return agent


@router.get("/agents", response_model=List[AgentResponse])
def get_agents(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(TallyAgent).filter(TallyAgent.company_id == comp_uuid).all()


# --- Ledger mappings ---

@router.post("/mappings/ledger", response_model=LedgerMappingResponse, status_code=status.HTTP_201_CREATED)
def create_ledger_mapping(req: LedgerMappingCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_uuid = uuid.UUID(str(req.company_id))
    get_company_membership(db, current_user, comp_uuid)
    require_permission(db, current_user, comp_uuid, "settings:manage")

    mapping = db.query(TallyLedgerMapping).filter(
        TallyLedgerMapping.company_id == comp_uuid,
        TallyLedgerMapping.onsite_transaction_type == req.onsite_transaction_type,
    ).first()

    if mapping:
        mapping.posting_mode = req.posting_mode
        mapping.tally_voucher_type = req.tally_voucher_type
        mapping.tally_ledger_name = req.tally_ledger_name
        mapping.freight_ledger = req.freight_ledger
        mapping.surcharge_ledger = req.surcharge_ledger
    else:
        mapping = TallyLedgerMapping(
            id=uuid.uuid4(),
            company_id=comp_uuid,
            onsite_transaction_type=req.onsite_transaction_type,
            posting_mode=req.posting_mode,
            tally_voucher_type=req.tally_voucher_type,
            tally_ledger_name=req.tally_ledger_name,
            freight_ledger=req.freight_ledger,
            surcharge_ledger=req.surcharge_ledger,
        )
        db.add(mapping)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.get("/mappings/ledger", response_model=List[LedgerMappingResponse])
def get_ledger_mappings(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(TallyLedgerMapping).filter(TallyLedgerMapping.company_id == comp_uuid).all()


# --- Party mappings ---

@router.post("/mappings/party", response_model=PartyMappingResponse, status_code=status.HTTP_201_CREATED)
def create_party_mapping(req: PartyMappingCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_uuid = uuid.UUID(str(req.company_id))
    get_company_membership(db, current_user, comp_uuid)
    require_permission(db, current_user, comp_uuid, "settings:manage")

    mapping = db.query(TallyPartyMapping).filter(
        TallyPartyMapping.company_id == comp_uuid,
        TallyPartyMapping.onsite_party_id == req.onsite_party_id,
    ).first()

    if mapping:
        mapping.tally_ledger_name = req.tally_ledger_name
    else:
        mapping = TallyPartyMapping(
            id=uuid.uuid4(),
            company_id=comp_uuid,
            onsite_party_id=req.onsite_party_id,
            tally_ledger_name=req.tally_ledger_name,
        )
        db.add(mapping)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.get("/mappings/party", response_model=List[PartyMappingResponse])
def get_party_mappings(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(TallyPartyMapping).filter(TallyPartyMapping.company_id == comp_uuid).all()


# --- Cost centre mappings ---

@router.post("/mappings/cost-centre", response_model=CostCentreMappingResponse, status_code=status.HTTP_201_CREATED)
def create_cost_centre_mapping(req: CostCentreMappingCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_uuid = uuid.UUID(str(req.company_id))
    get_company_membership(db, current_user, comp_uuid)
    verify_project_in_company(db, req.project_id, comp_uuid)
    require_permission(db, current_user, comp_uuid, "settings:manage")

    mapping = db.query(TallyCostCentreMapping).filter(
        TallyCostCentreMapping.company_id == comp_uuid,
        TallyCostCentreMapping.project_id == req.project_id,
    ).first()

    if mapping:
        mapping.tally_cost_centre_name = req.tally_cost_centre_name
    else:
        mapping = TallyCostCentreMapping(
            id=uuid.uuid4(),
            company_id=comp_uuid,
            project_id=req.project_id,
            tally_cost_centre_name=req.tally_cost_centre_name,
        )
        db.add(mapping)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.get("/mappings/cost-centre", response_model=List[CostCentreMappingResponse])
def get_cost_centre_mappings(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(TallyCostCentreMapping).filter(TallyCostCentreMapping.company_id == comp_uuid).all()


# --- Bank mappings ---

@router.post("/mappings/bank", response_model=BankMappingResponse, status_code=status.HTTP_201_CREATED)
def create_bank_mapping(req: BankMappingCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    comp_uuid = uuid.UUID(str(req.company_id))
    get_company_membership(db, current_user, comp_uuid)
    require_permission(db, current_user, comp_uuid, "settings:manage")

    mapping = db.query(TallyBankMapping).filter(
        TallyBankMapping.company_id == comp_uuid,
        TallyBankMapping.onsite_bank_account_details == req.onsite_bank_account_details,
    ).first()

    if mapping:
        mapping.tally_ledger_name = req.tally_ledger_name
    else:
        mapping = TallyBankMapping(
            id=uuid.uuid4(),
            company_id=comp_uuid,
            onsite_bank_account_details=req.onsite_bank_account_details,
            tally_ledger_name=req.tally_ledger_name,
        )
        db.add(mapping)

    db.commit()
    db.refresh(mapping)
    return mapping


@router.get("/mappings/bank", response_model=List[BankMappingResponse])
def get_bank_mappings(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(TallyBankMapping).filter(TallyBankMapping.company_id == comp_uuid).all()


# --- Real export flow ---

@router.get("/pending")
def pending_vouchers(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    conn = db.query(TallyConnection).filter(TallyConnection.company_id == comp_uuid).first()

    bill_ids: List[str] = []
    payment_ids: List[str] = []
    vouchers = []

    if conn:
        bills = db.query(Bill).filter(
            Bill.company_id == comp_uuid,
            Bill.status != "Cancelled",
            Bill.tally_synced == False,
            Bill.invoice_date >= conn.sync_window_start_date,
        ).all()
        payments = db.query(Payment).filter(
            Payment.company_id == comp_uuid,
            Payment.tally_synced == False,
            Payment.payment_date >= conn.sync_window_start_date,
        ).all()
        excluded_bills = db.query(func.count(Bill.id)).filter(
            Bill.company_id == comp_uuid,
            Bill.status != "Cancelled",
            Bill.tally_synced == False,
            Bill.invoice_date < conn.sync_window_start_date,
        ).scalar() or 0
        excluded_payments = db.query(func.count(Payment.id)).filter(
            Payment.company_id == comp_uuid,
            Payment.tally_synced == False,
            Payment.payment_date < conn.sync_window_start_date,
        ).scalar() or 0
        if bills or payments:
            _, vouchers = _build_vouchers(db, conn, bills, payments, advance_sequence=False)
            bill_ids = [str(b.id) for b in bills]
            payment_ids = [str(p.id) for p in payments]

    return {
        "count": len(vouchers),
        "bill_ids": bill_ids,
        "payment_ids": payment_ids,
        "vouchers": vouchers,
        "excluded_before_window": {"bills": excluded_bills, "payments": excluded_payments},
    }


@router.get("/export")
def export_tally_xml(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    """Return a Tally-importable XML for all unsynced, in-window vouchers.

    READ-ONLY and idempotent: this never marks anything as synced and never
    consumes the voucher sequence, so it can be re-downloaded safely until the
    user confirms the import in Tally Prime. Every download of the same queue
    renders identical voucher numbers (R2-369): the sequence is only advanced
    by POST /tally/mark-synced, i.e. when the import is actually confirmed.
    """
    comp_uuid = uuid.UUID(str(company_id))
    conn = db.query(TallyConnection).filter(TallyConnection.company_id == comp_uuid).first()
    if not conn:
        raise HTTPException(status_code=400, detail="Tally connection must be configured before exporting vouchers.")

    bills = db.query(Bill).filter(
        Bill.company_id == comp_uuid,
        Bill.status != "Cancelled",
        Bill.tally_synced == False,
        Bill.invoice_date >= conn.sync_window_start_date,
    ).all()
    payments = db.query(Payment).filter(
        Payment.company_id == comp_uuid,
        Payment.tally_synced == False,
        Payment.payment_date >= conn.sync_window_start_date,
    ).all()

    vouchers, _ = _build_vouchers(db, conn, bills, payments, advance_sequence=False)
    xml = build_tally_envelope(conn.tally_company_name, vouchers, auto_create=conn.auto_create_missing_ledgers)
    filename = f"siteflow-tally-{datetime.utcnow().strftime('%Y%m%d')}.xml"
    return Response(
        content=xml,
        media_type="application/xml",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/mark-synced")
def mark_synced(req: MarkSyncedRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Mark the given bills/payments as synced AFTER the user imports into Tally."""
    bill_ids = [uuid.UUID(str(x)) for x in req.bill_ids]
    payment_ids = [uuid.UUID(str(x)) for x in req.payment_ids]

    updated_bills = 0
    updated_payments = 0
    company_id = None
    authorized_companies = set()
    # R2-369: newly confirmed vouchers per company; each one consumes its
    # voucher number only here, at confirmation time.
    seq_consumption = {}

    if bill_ids:
        for b in db.query(Bill).filter(Bill.id.in_(bill_ids)).all():
            if b.company_id not in authorized_companies:
                get_company_membership(db, current_user, b.company_id)
                require_permission(db, current_user, b.company_id, "settings:manage")
                authorized_companies.add(b.company_id)
            if not b.tally_synced:
                b.tally_synced = True
                updated_bills += 1
                seq_consumption[b.company_id] = seq_consumption.get(b.company_id, 0) + 1
            company_id = b.company_id

    if payment_ids:
        for p in db.query(Payment).filter(Payment.id.in_(payment_ids)).all():
            if p.company_id not in authorized_companies:
                get_company_membership(db, current_user, p.company_id)
                require_permission(db, current_user, p.company_id, "settings:manage")
                authorized_companies.add(p.company_id)
            if not p.tally_synced:
                p.tally_synced = True
                updated_payments += 1
                seq_consumption[p.company_id] = seq_consumption.get(p.company_id, 0) + 1
            company_id = p.company_id

    db.commit()

    # R2-369: the export renders preview numbers from conn.last_voucher_seq
    # without consuming it, so a re-download is byte-identical and Tally's own
    # duplicate detection keeps working. Confirmation (this call) is what
    # advances the counter past the numbers the imported file carried.
    for marked_company_id, consumed in seq_consumption.items():
        marked_conn = db.query(TallyConnection).filter(
            TallyConnection.company_id == marked_company_id
        ).first()
        if marked_conn:
            marked_conn.last_voucher_seq = (marked_conn.last_voucher_seq or 0) + consumed
            db.add(marked_conn)
    if seq_consumption:
        db.commit()

    log = None
    if company_id and (updated_bills or updated_payments):
        log = TallySyncLog(
            id=uuid.uuid4(),
            company_id=company_id,
            voucher_count=updated_bills + updated_payments,
            marked_synced_at=datetime.utcnow(),
            bill_ids=json.dumps([str(x) for x in bill_ids]),
            payment_ids=json.dumps([str(x) for x in payment_ids]),
        )
        db.add(log)
        db.commit()

    return {
        "marked_bills": updated_bills,
        "marked_payments": updated_payments,
        "marked_synced_at": (log.marked_synced_at.isoformat() if log else None),
    }


@router.post("/unmark-synced")
def unmark_synced(req: MarkSyncedRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Undo a mark-synced so vouchers re-enter the export queue (e.g. a mark before the Tally import actually succeeded)."""
    bill_ids = [uuid.UUID(str(x)) for x in req.bill_ids]
    payment_ids = [uuid.UUID(str(x)) for x in req.payment_ids]

    unmarked_bills = 0
    unmarked_payments = 0
    authorized_companies = set()

    if bill_ids:
        for b in db.query(Bill).filter(Bill.id.in_(bill_ids)).all():
            if b.company_id not in authorized_companies:
                get_company_membership(db, current_user, b.company_id)
                require_permission(db, current_user, b.company_id, "settings:manage")
                authorized_companies.add(b.company_id)
            if b.tally_synced:
                b.tally_synced = False
                unmarked_bills += 1

    if payment_ids:
        for p in db.query(Payment).filter(Payment.id.in_(payment_ids)).all():
            if p.company_id not in authorized_companies:
                get_company_membership(db, current_user, p.company_id)
                require_permission(db, current_user, p.company_id, "settings:manage")
                authorized_companies.add(p.company_id)
            if p.tally_synced:
                p.tally_synced = False
                unmarked_payments += 1

    db.commit()

    return {
        "unmarked_bills": unmarked_bills,
        "unmarked_payments": unmarked_payments,
    }


@router.get("/sync-logs", response_model=List[SyncLogResponse])
def get_sync_logs(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    comp_uuid = uuid.UUID(str(company_id))
    return db.query(TallySyncLog).filter(TallySyncLog.company_id == comp_uuid).order_by(TallySyncLog.created_at.desc()).all()


@router.delete("/sync")
def sync_gone():
    raise HTTPException(
        status_code=status.HTTP_410_GONE,
        detail="The automatic Tally sync endpoint has been removed. Use GET /tally/export to download a real Tally-importable XML, then POST /tally/mark-synced after importing it in Tally Prime.",
    )
