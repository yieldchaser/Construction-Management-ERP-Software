import uuid
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_current_user, verify_company_access, get_company_membership
from app.models import CustomField, CustomFieldValue, User

router = APIRouter(prefix="/custom-fields", tags=["Custom Fields"], dependencies=[Depends(get_current_user)])


class CustomFieldCreate(BaseModel):
    company_id: uuid.UUID
    entity_type: str
    field_name: str
    field_label: str
    field_type: str
    is_required: bool = False
    options: List[str] = []
    display_order: int = 0
    default_value: Optional[str] = None
    set_default: bool = False


class CustomFieldResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    entity_type: str
    field_name: str
    field_label: str
    field_type: str
    is_required: bool
    options: List[str]
    display_order: int
    is_active: bool
    default_value: Optional[str] = None
    set_default: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class CustomFieldValueCreate(BaseModel):
    company_id: uuid.UUID
    field_id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    value_date: Optional[datetime] = None
    value_json: Optional[dict] = None


class CustomFieldValueResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    field_id: uuid.UUID
    entity_type: str
    entity_id: uuid.UUID
    value_text: Optional[str]
    value_number: Optional[float]
    value_date: Optional[datetime]
    value_json: Optional[Any]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomFieldValueInput(BaseModel):
    """Generic {field_id, value} pair submitted alongside an entity create/update
    payload (e.g. from a Project or Sales Invoice form). `value` is intentionally
    untyped — its shape depends on the target CustomField.field_type and is
    normalized into value_text/value_number/value_date/value_json by
    `upsert_values_for_entity` below."""
    field_id: uuid.UUID
    value: Optional[Any] = None


def _parse_field_date(value: Any) -> Optional[datetime]:
    if value is None or value == "":
        return None
    if isinstance(value, datetime):
        return value
    candidate = str(value).strip()
    if not candidate:
        return None
    normalized = candidate.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.strptime(candidate, fmt)
        except ValueError:
            continue
    return None


def upsert_values_for_entity(
    db: Session,
    company_id: uuid.UUID,
    entity_type: str,
    entity_id: uuid.UUID,
    values: Optional[List[dict]],
) -> None:
    """Persist a batch of custom field values for a single entity record.

    `values` is a list of dict-like {"field_id": ..., "value": ...} pairs (the
    result of calling `.model_dump()` on a list of CustomFieldValueInput). Each
    field's `field_type` (looked up from CustomField) decides which physical
    column the value lands in:
      - text / select      -> value_text
      - number             -> value_number
      - date                -> value_date
      - multiselect         -> value_json (list)
      - checkbox            -> value_json (bool) — there is no dedicated
        boolean column on CustomFieldValue, so booleans are stored in the
        JSONB column rather than stringified into value_text.
    Rows are upserted (matched on field_id + entity_type + entity_id) so
    calling this again on an update simply overwrites the previous value.
    Does not commit — caller is expected to commit as part of its own
    create/update transaction.
    """
    if not values:
        return
    for item in values:
        field_id = item.get("field_id") if isinstance(item, dict) else getattr(item, "field_id", None)
        if not field_id:
            continue
        raw_value = item.get("value") if isinstance(item, dict) else getattr(item, "value", None)

        field = db.query(CustomField).filter(CustomField.id == field_id).first()
        if not field:
            continue

        value_text = value_number = value_date = value_json = None
        if field.field_type == "number":
            if raw_value not in (None, ""):
                try:
                    value_number = Decimal(str(raw_value))
                except (InvalidOperation, ValueError, TypeError):
                    value_number = None
        elif field.field_type == "date":
            value_date = _parse_field_date(raw_value)
        elif field.field_type == "multiselect":
            if isinstance(raw_value, list):
                value_json = raw_value
            elif raw_value not in (None, ""):
                value_json = [raw_value]
            else:
                value_json = []
        elif field.field_type == "checkbox":
            value_json = bool(raw_value)
        else:  # text, select, and any unrecognized type default to text storage
            value_text = None if raw_value in (None, "") else str(raw_value)

        existing = db.query(CustomFieldValue).filter(
            CustomFieldValue.field_id == field_id,
            CustomFieldValue.entity_type == entity_type,
            CustomFieldValue.entity_id == entity_id,
        ).first()

        if existing:
            existing.value_text = value_text
            existing.value_number = value_number
            existing.value_date = value_date
            existing.value_json = value_json
        else:
            db.add(CustomFieldValue(
                company_id=company_id,
                field_id=field_id,
                entity_type=entity_type,
                entity_id=entity_id,
                value_text=value_text,
                value_number=value_number,
                value_date=value_date,
                value_json=value_json,
            ))


@router.post("/fields", response_model=CustomFieldResponse, status_code=status.HTTP_201_CREATED)
def create_field(payload: CustomFieldCreate, db: Session = Depends(get_db)):
    field = CustomField(**payload.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.get("/fields/{company_id}", response_model=List[CustomFieldResponse])
def list_fields(company_id: uuid.UUID, entity_type: Optional[str] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    query = db.query(CustomField).filter(
        CustomField.company_id == company_id,
        CustomField.is_active == True
    )
    if entity_type:
        query = query.filter(CustomField.entity_type == entity_type)
    return query.order_by(CustomField.display_order).all()


@router.post("/values", response_model=CustomFieldValueResponse, status_code=status.HTTP_201_CREATED)
def set_value(payload: CustomFieldValueCreate, db: Session = Depends(get_db)):
    existing = db.query(CustomFieldValue).filter(
        CustomFieldValue.field_id == payload.field_id,
        CustomFieldValue.entity_type == payload.entity_type,
        CustomFieldValue.entity_id == payload.entity_id
    ).first()

    data = payload.model_dump()
    if data.get("value_number") is not None:
        data["value_number"] = Decimal(str(data["value_number"]))

    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        db.commit()
        db.refresh(existing)
        return existing

    value = CustomFieldValue(**data)
    db.add(value)
    db.commit()
    db.refresh(value)
    return value


@router.get("/values/{entity_type}/{entity_id}", response_model=List[CustomFieldValueResponse])
def get_values(entity_type: str, entity_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    values = db.query(CustomFieldValue).filter(
        CustomFieldValue.entity_type == entity_type,
        CustomFieldValue.entity_id == entity_id
    ).all()
    if values:
        get_company_membership(db, current_user, values[0].company_id)
    return values
