from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import Numeric
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app import models
from app.models import User
from app.auth import get_current_user, verify_company_access, verify_project_access, get_company_membership
import uuid

router = APIRouter(prefix="/library", tags=["Company Libraries"], dependencies=[Depends(get_current_user)])

# ─── schemas ───

class PartyCreate(BaseModel):
    company_id: uuid.UUID
    party_id_custom: Optional[str] = None
    name: str
    project_id: Optional[uuid.UUID] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    party_type: Optional[str] = None
    address: Optional[str] = None
    bank_name: Optional[str] = None
    account_name: Optional[str] = None
    account_number: Optional[str] = None
    ifsc_code: Optional[str] = None
    tax_no: Optional[str] = None
    date_of_joining: Optional[str] = None # ISO format or custom date string
    aadhaar_number: Optional[str] = None
    pan_number: Optional[str] = None
    esi_number: Optional[str] = None
    pf_number: Optional[str] = None
    father_name: Optional[str] = None
    passport_no: Optional[str] = None
    passport_expiry_date: Optional[str] = None
    creator_name: Optional[str] = None
    aadhaar_file: Optional[str] = None
    pan_file: Optional[str] = None
    opening_balance_direction: Optional[str] = None  # will_pay / will_receive
    opening_balance_amount: Optional[float] = Field(0.0, ge=0)
    # Finance tab company-level extensions
    contractor_role: Optional[str] = None
    service_rate_categories: Optional[str] = None  # JSON list of tag strings
    bank_account_id: Optional[uuid.UUID] = None
    opening_balance: Optional[float] = Field(0.0, ge=0)
    opening_balance_type: Optional[str] = None  # "pay" / "receive"

class AssetTypeCreate(BaseModel):
    company_id: uuid.UUID
    name: str

class CostCodeCreate(BaseModel):
    company_id: uuid.UUID
    code: str
    sub_cost_code: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    name: str
    budget_amount: float = Field(0.0, ge=0)

class DeductionCreate(BaseModel):
    company_id: uuid.UUID
    name: str

class ProgressCreate(BaseModel):
    company_id: uuid.UUID
    name: str

class WorkforceCreate(BaseModel):
    company_id: uuid.UUID
    name: str

class MaterialCreate(BaseModel):
    company_id: uuid.UUID
    name: str
    unit: str
    alternate_unit: Optional[str] = None
    gst_rate: float = Field(0.0, ge=0, le=100)
    category: Optional[str] = None
    unit_cost: float = Field(0.0, ge=0)
    lead_time_days: int = Field(0, ge=0)
    hsn_sac: Optional[str] = None
    item_code: Optional[str] = None
    specifications: Optional[str] = None

class RateCreate(BaseModel):
    company_id: uuid.UUID
    name: str
    item_code: Optional[str] = None
    unit: str
    gst_rate: float = Field(0.0, ge=0, le=100)
    category: Optional[str] = None
    unit_cost: float = Field(0.0, ge=0)
    markup_value: float = 0.0
    markup_type: str = "percent"
    unit_sale_price: float = Field(0.0, ge=0)
    note: Optional[str] = None
    cost_code: Optional[str] = None
    hsn_sac: Optional[str] = None


def _parse_optional_datetime(value: Optional[str]) -> Optional[datetime]:
    if value is None:
        return None

    if isinstance(value, datetime):
        return value

    candidate = value.strip()
    if not candidate:
        return None

    normalized = candidate.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass

    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%d-%b-%Y", "%d-%B-%Y"):
        try:
            return datetime.strptime(candidate, fmt)
        except ValueError:
            continue

    return None


# ─── PARTIES ───
@router.get("/parties/{company_id}")
def get_library_parties(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryParty).filter(models.LibraryParty.company_id == company_id).all()

@router.post("/parties")
def create_library_party(payload: PartyCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    # Automatically generate custom PID if not supplied
    if not payload.party_id_custom:
        count = db.query(models.LibraryParty).filter(models.LibraryParty.company_id == payload.company_id).count()
        payload.party_id_custom = f"PID-{count + 1}"
    
    party = models.LibraryParty(
        company_id=payload.company_id,
        party_id_custom=payload.party_id_custom,
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        party_type=payload.party_type,
        address=payload.address,
        bank_name=payload.bank_name,
        account_name=payload.account_name,
        account_number=payload.account_number,
        ifsc_code=payload.ifsc_code,
        tax_no=payload.tax_no,
        date_of_joining=_parse_optional_datetime(payload.date_of_joining),
        aadhaar_number=payload.aadhaar_number,
        pan_number=payload.pan_number,
        esi_number=payload.esi_number,
        pf_number=payload.pf_number,
        father_name=payload.father_name,
        passport_no=payload.passport_no,
        passport_expiry_date=_parse_optional_datetime(payload.passport_expiry_date),
        creator_name=payload.creator_name,
        aadhaar_file=payload.aadhaar_file,
        pan_file=payload.pan_file,
        contractor_role=payload.contractor_role,
        service_rate_categories=payload.service_rate_categories,
        bank_account_id=payload.bank_account_id,
        opening_balance=payload.opening_balance or 0.0,
        opening_balance_type=payload.opening_balance_type,
    )
    db.add(party)
    db.flush()
    # Opening balance is project-scoped: persist it on the project_parties junction
    # when a project context is supplied, otherwise keep a global opening record.
    if payload.opening_balance_direction in ("will_pay", "will_receive") and (payload.opening_balance_amount or 0) > 0:
        amount = float(payload.opening_balance_amount)
        adv = amount if payload.opening_balance_direction == "will_receive" else 0.0
        pay = amount if payload.opening_balance_direction == "will_pay" else 0.0
        if payload.project_id:
            db.add(models.ProjectParty(
                project_id=payload.project_id,
                party_id=party.id,
                balance=round(adv - pay, 2),
                advance_paid=adv,
                to_pay=pay,
            ))
    db.commit()
    db.refresh(party)
    return party


@router.get("/parties/{company_id}/balances")
def get_party_balances(
    company_id: uuid.UUID,
    project_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(verify_company_access),
    _project: None = Depends(verify_project_access),
):
    q = db.query(models.ProjectParty).filter(models.ProjectParty.project_id == project_id)
    balances = q.all()
    advance_paid = sum(float(b.advance_paid) for b in balances)
    to_pay = sum(float(b.to_pay) for b in balances)
    return {"advance_paid": round(advance_paid, 2), "to_pay": round(to_pay, 2)}

@router.delete("/parties/{party_id}")
def delete_library_party(party_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    party = db.query(models.LibraryParty).filter(models.LibraryParty.id == party_id).first()
    if not party:
        raise HTTPException(status_code=404, detail="Party not found")
    get_company_membership(db, current_user, party.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, party.company_id, "party", party.id, f"Party: {party.name}", party_name=party.name)
    except Exception:
        pass
    db.delete(party)
    db.commit()
    return {"success": True}


# ─── ASSET TYPES ───
@router.get("/asset-types/{company_id}")
def get_library_asset_types(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryAssetType).filter(models.LibraryAssetType.company_id == company_id).all()

@router.post("/asset-types")
def create_library_asset_type(payload: AssetTypeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryAssetType(company_id=payload.company_id, name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/asset-types/{item_id}")
def delete_library_asset_type(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryAssetType).filter(models.LibraryAssetType.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Asset type not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "asset_type", item.id, f"Asset Type: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── COST CODES ───
@router.get("/cost-codes/{company_id}")
def get_library_cost_codes(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryCostCode).filter(models.LibraryCostCode.company_id == company_id).all()

@router.post("/cost-codes")
def create_library_cost_code(payload: CostCodeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryCostCode(
        company_id=payload.company_id,
        code=payload.code,
        sub_cost_code=payload.sub_cost_code,
        parent_id=payload.parent_id,
        name=payload.name,
        budget_amount=payload.budget_amount,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/cost-codes/{item_id}")
def delete_library_cost_code(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryCostCode).filter(models.LibraryCostCode.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Cost code not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "cost_code", item.id, f"Cost Code: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── DEDUCTIONS ───
@router.get("/deductions/{company_id}")
def get_library_deductions(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryDeduction).filter(models.LibraryDeduction.company_id == company_id).all()

@router.post("/deductions")
def create_library_deduction(payload: DeductionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryDeduction(company_id=payload.company_id, name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/deductions/{item_id}")
def delete_library_deduction(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryDeduction).filter(models.LibraryDeduction.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Deduction not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "deduction", item.id, f"Deduction: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── PROGRESSES ───
@router.get("/progresses/{company_id}")
def get_library_progresses(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryProgress).filter(models.LibraryProgress.company_id == company_id).all()

@router.post("/progresses")
def create_library_progress(payload: ProgressCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryProgress(company_id=payload.company_id, name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/progresses/{item_id}")
def delete_library_progress(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryProgress).filter(models.LibraryProgress.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Progress not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "progress", item.id, f"Progress: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── WORKFORCES ───
@router.get("/workforces/{company_id}")
def get_library_workforces(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryWorkforce).filter(models.LibraryWorkforce.company_id == company_id).all()

@router.post("/workforces")
def create_library_workforce(payload: WorkforceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryWorkforce(company_id=payload.company_id, name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/workforces/{item_id}")
def delete_library_workforce(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryWorkforce).filter(models.LibraryWorkforce.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Workforce not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "workforce", item.id, f"Workforce: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── MATERIALS ───
@router.get("/materials/{company_id}")
def get_library_materials(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryMaterial).filter(models.LibraryMaterial.company_id == company_id).all()

@router.post("/materials")
def create_library_material(payload: MaterialCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryMaterial(
        company_id=payload.company_id,
        name=payload.name,
        unit=payload.unit,
        alternate_unit=payload.alternate_unit,
        gst_rate=payload.gst_rate,
        category=payload.category,
        unit_cost=payload.unit_cost,
        lead_time_days=payload.lead_time_days,
        hsn_sac=payload.hsn_sac,
        item_code=payload.item_code,
        specifications=payload.specifications
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/materials/{item_id}")
def delete_library_material(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryMaterial).filter(models.LibraryMaterial.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "material", item.id, f"Material: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── RATES ───
@router.get("/rates/{company_id}")
def get_library_rates(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryRate).filter(models.LibraryRate.company_id == company_id).all()

@router.post("/rates")
def create_library_rate(payload: RateCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryRate(
        company_id=payload.company_id,
        name=payload.name,
        item_code=payload.item_code,
        unit=payload.unit,
        gst_rate=payload.gst_rate,
        category=payload.category,
        unit_cost=payload.unit_cost,
        markup_value=payload.markup_value,
        markup_type=payload.markup_type,
        unit_sale_price=payload.unit_sale_price,
        note=payload.note,
        cost_code=payload.cost_code,
        hsn_sac=payload.hsn_sac
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.delete("/rates/{item_id}")
def delete_library_rate(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryRate).filter(models.LibraryRate.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Rate item not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "rate", item.id, f"Rate: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── RETENTIONS ───

class RetentionCreate(BaseModel):
    company_id: uuid.UUID
    name: str


@router.get("/retentions/{company_id}")
def get_library_retentions(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryRetention).filter(models.LibraryRetention.company_id == company_id).all()


@router.post("/retentions")
def create_library_retention(payload: RetentionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryRetention(company_id=payload.company_id, name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/retentions/{item_id}")
def delete_library_retention(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryRetention).filter(models.LibraryRetention.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Retention not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "retention", item.id, f"Retention: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── MATERIAL CATEGORIES ───

class MaterialCategoryCreate(BaseModel):
    company_id: uuid.UUID
    name: str
    parent_id: Optional[uuid.UUID] = None


@router.get("/material-categories/{company_id}")
def get_material_categories(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.MaterialCategory).filter(models.MaterialCategory.company_id == company_id).all()


@router.post("/material-categories")
def create_material_category(payload: MaterialCategoryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.MaterialCategory(
        company_id=payload.company_id,
        name=payload.name,
        parent_id=payload.parent_id,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/material-categories/{item_id}")
def delete_material_category(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.MaterialCategory).filter(models.MaterialCategory.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Material category not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "material_category", item.id, f"Material Category: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}


# ─── TODOS (Library preset labels) ───

class TodoCreate(BaseModel):
    company_id: uuid.UUID
    name: str


@router.get("/todos/{company_id}")
def get_library_todos(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(models.LibraryTodo).filter(models.LibraryTodo.company_id == company_id).all()


@router.post("/todos")
def create_library_todo(payload: TodoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    item = models.LibraryTodo(company_id=payload.company_id, name=payload.name)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/todos/{item_id}")
def delete_library_todo(item_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = db.query(models.LibraryTodo).filter(models.LibraryTodo.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="To Do not found")
    get_company_membership(db, current_user, item.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, item.company_id, "library_todo", item.id, f"Library Todo: {item.name}")
    except Exception:
        pass
    db.delete(item)
    db.commit()
    return {"success": True}

