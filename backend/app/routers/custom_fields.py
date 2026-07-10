import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_current_user, verify_company_access
from app.models import CustomField, CustomFieldValue

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
    value_json: Optional[dict]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


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
def get_values(entity_type: str, entity_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(CustomFieldValue).filter(
        CustomFieldValue.entity_type == entity_type,
        CustomFieldValue.entity_id == entity_id
    ).all()
