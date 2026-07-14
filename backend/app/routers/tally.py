import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_company_access, get_company_membership, require_permission
from app.models import (
    TallyConnection, TallyAgent, TallyLedgerMapping, TallyPartyMapping,
    TallyCostCentreMapping, TallyBankMapping, TallySyncLog,
    Company, Bill, Payment, CompanyTeam, User, LibraryParty,
)
from app.tally_xml import build_tally_envelope
from pydantic import BaseModel

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
    voucher_number_template: str = "ONS-{year}-{number}"
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
    onsite_transaction_type: str
    posting_mode: str = "lumpsum"
    tally_voucher_type: str
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


def _build_vouchers(db: Session, conn: TallyConnection, bills, payments):
    """Resolve Bill + Payment rows into Tally voucher dicts (double entry)."""
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
    bank_ledger = None
    bank = db.query(TallyBankMapping).filter(TallyBankMapping.company_id == conn.company_id).first()
    if bank:
        bank_ledger = bank.tally_ledger_name

    seq = 1

    for b in bills:
        total = float(b.total_payable or 0)
        if b.invoice_type == "sale":
            vchtype = "Sales"
            ledger_key = "Sales Invoice"
            fallback_ledger = "Sales A/c"
            party_default = "Client Ledger"
        else:
            vchtype = "Purchase"
            ledger_key = "Subcon Expense" if b.invoice_type == "subcon" else "Material Purchase"
            fallback_ledger = "Purchase A/c"
            party_default = "Vendor Ledger"

        mapped = ledger_map.get(ledger_key)
        expense_ledger = mapped.tally_ledger_name if mapped else fallback_ledger
        party_ledger = _resolve_party_ledger(db, conn.company_id, b.party_company_user_id, party_default)
        cost_centre = cc_map.get(str(b.project_id)) if b.project_id else None
        year = b.invoice_date.year if b.invoice_date else datetime.utcnow().year
        date_str = b.invoice_date.strftime("%Y%m%d") if b.invoice_date else ""
        vnumber = _render_number(conn.voucher_number_template, b.invoice_number, year, seq)
        narration = f"SiteFlow {b.invoice_type} invoice {b.invoice_number}."

        # Expense/sales leg is a DEBIT; party leg is a CREDIT.
        entries = [
            {"ledger": expense_ledger, "amount": total, "debit": True, "cost_centre": cost_centre,
             "ledger_type": "purchase" if vchtype == "Purchase" else "sales"},
            {"ledger": party_ledger, "amount": total, "debit": False,
             "ledger_type": "party_creditor" if vchtype == "Purchase" else "party_debtor"},
        ]
        vouchers.append({
            "vchtype": vchtype,
            "voucher_type_name": vchtype,
            "voucher_number": vnumber,
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
            # Money comes IN: debit bank/cash, credit party.
            cash_ledger = bank_ledger or conn.default_cash_ledger or "Bank/Cash"
            party_ledger = _resolve_party_ledger(db, conn.company_id, p.party_company_user_id, cash_ledger)
            entries = [
                {"ledger": cash_ledger, "amount": total, "debit": True, "ledger_type": _cash_bank_type(cash_ledger, conn.default_cash_ledger)},
                {"ledger": party_ledger, "amount": total, "debit": False, "ledger_type": "party_debtor"},
            ]
        else:
            vchtype = "Payment"
            # Money goes OUT: debit party, credit bank/cash.
            cash_ledger = bank_ledger or conn.default_cash_ledger or "Bank/Cash"
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
        if bills or payments:
            _, vouchers = _build_vouchers(db, conn, bills, payments)
            bill_ids = [str(b.id) for b in bills]
            payment_ids = [str(p.id) for p in payments]

    return {
        "count": len(vouchers),
        "bill_ids": bill_ids,
        "payment_ids": payment_ids,
        "vouchers": vouchers,
    }


@router.get("/export")
def export_tally_xml(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    """Return a Tally-importable XML for all unsynced, in-window vouchers.

    READ-ONLY and idempotent: this never marks anything as synced, so it can be
    re-downloaded safely until the user confirms the import in Tally Prime.
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

    vouchers, _ = _build_vouchers(db, conn, bills, payments)
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

    if bill_ids:
        for b in db.query(Bill).filter(Bill.id.in_(bill_ids)).all():
            get_company_membership(db, current_user, b.company_id)
            if not b.tally_synced:
                b.tally_synced = True
                updated_bills += 1
            company_id = b.company_id

    if payment_ids:
        for p in db.query(Payment).filter(Payment.id.in_(payment_ids)).all():
            get_company_membership(db, current_user, p.company_id)
            if not p.tally_synced:
                p.tally_synced = True
                updated_payments += 1
            company_id = p.company_id

    db.commit()

    log = None
    if company_id and (updated_bills or updated_payments):
        log = TallySyncLog(
            id=uuid.uuid4(),
            company_id=company_id,
            voucher_count=updated_bills + updated_payments,
            marked_synced_at=datetime.utcnow(),
            bill_ids=str(bill_ids),
            payment_ids=str(payment_ids),
        )
        db.add(log)
        db.commit()

    return {
        "marked_bills": updated_bills,
        "marked_payments": updated_payments,
        "marked_synced_at": (log.marked_synced_at.isoformat() if log else None),
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
