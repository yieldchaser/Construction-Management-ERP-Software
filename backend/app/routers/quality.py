"""
Phase 10 — Quality Control, Site Inspections & Snag Lists
Endpoints:
  POST   /quality/checklists                         — Create IS-code checklist template
  GET    /quality/checklists/{company_id}            — List checklists
  POST   /quality/checklists/{cl_id}/items           — Add item to checklist
  GET    /quality/checklists/{cl_id}/items           — Get checklist items
  POST   /quality/inspections                        — Start a site inspection
  GET    /quality/inspections/{project_id}           — List inspections for project
  PATCH  /quality/inspections/{insp_id}/respond      — Submit pass/fail responses
  POST   /quality/ncr                                — Raise NCR
  GET    /quality/ncr/{project_id}                   — List NCRs for project
  PATCH  /quality/ncr/{ncr_id}/review               — Move NCR to under_review
  PATCH  /quality/ncr/{ncr_id}/close                — Close NCR with resolution
  POST   /quality/material-tests                     — Log material test result
  GET    /quality/material-tests/{project_id}        — List material tests
"""

import uuid
from datetime import datetime
from typing import List, Optional
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models import (
    QualityChecklist, ChecklistItem, SiteInspection,
    InspectionResponse, NCR, MaterialTestResult
)

router = APIRouter(prefix="/quality", tags=["Quality Control & Inspections"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ChecklistCreate(BaseModel):
    company_id: uuid.UUID
    title: str
    category: Optional[str] = None
    is_code_reference: Optional[str] = None
    description: Optional[str] = None


class ChecklistResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    title: str
    category: Optional[str]
    is_code_reference: Optional[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChecklistItemCreate(BaseModel):
    sequence: int = 1
    description: str
    acceptable_criteria: Optional[str] = None
    is_mandatory: bool = True


class ChecklistItemResponse(BaseModel):
    id: uuid.UUID
    checklist_id: uuid.UUID
    sequence: int
    description: str
    acceptable_criteria: Optional[str]
    is_mandatory: bool

    class Config:
        from_attributes = True


class InspectionCreate(BaseModel):
    project_id: uuid.UUID
    checklist_id: uuid.UUID
    task_id: Optional[uuid.UUID] = None
    inspected_by: Optional[uuid.UUID] = None
    zone: Optional[str] = None
    inspection_date: datetime
    overall_remarks: Optional[str] = None


class InspectionResponse_(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    checklist_id: uuid.UUID
    zone: Optional[str]
    inspection_date: datetime
    status: str
    pass_count: int
    fail_count: int
    na_count: int
    overall_remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ItemResponseCreate(BaseModel):
    checklist_item_id: uuid.UUID
    result: str = Field(..., pattern="^(Pass|Fail|NA)$")
    remarks: Optional[str] = None
    photo_url: Optional[str] = None


class BulkRespondRequest(BaseModel):
    responses: List[ItemResponseCreate]


class NCRCreate(BaseModel):
    project_id: uuid.UUID
    inspection_id: Optional[uuid.UUID] = None
    ncr_number: str
    title: str
    description: Optional[str] = None
    severity: str = Field("Major", pattern="^(Minor|Major|Critical)$")
    raised_by: Optional[uuid.UUID] = None
    assigned_to: Optional[uuid.UUID] = None
    due_date: Optional[datetime] = None


class NCRResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    ncr_number: str
    title: str
    severity: str
    status: str
    due_date: Optional[datetime]
    resolution_notes: Optional[str]
    closed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class MaterialTestCreate(BaseModel):
    project_id: uuid.UUID
    test_type: str
    material: Optional[str] = None
    sample_ref: Optional[str] = None
    test_date: datetime
    result_value: float
    unit: Optional[str] = None
    min_acceptable: Optional[float] = None
    max_acceptable: Optional[float] = None
    zone: Optional[str] = None
    remarks: Optional[str] = None


class MaterialTestResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    test_type: str
    material: Optional[str]
    sample_ref: Optional[str]
    test_date: datetime
    result_value: float
    unit: Optional[str]
    min_acceptable: Optional[float]
    max_acceptable: Optional[float]
    is_pass: Optional[bool]
    zone: Optional[str]
    remarks: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Checklists ───────────────────────────────────────────────────────────────

@router.post("/checklists", response_model=ChecklistResponse, status_code=status.HTTP_201_CREATED)
def create_checklist(payload: ChecklistCreate, db: Session = Depends(get_db)):
    cl = QualityChecklist(**payload.model_dump())
    db.add(cl)
    db.commit()
    db.refresh(cl)
    return cl


@router.get("/checklists/{company_id}", response_model=List[ChecklistResponse])
def list_checklists(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(QualityChecklist).filter(
        QualityChecklist.company_id == company_id,
        QualityChecklist.is_active == True
    ).all()


@router.post("/checklists/{cl_id}/items", response_model=ChecklistItemResponse, status_code=status.HTTP_201_CREATED)
def add_checklist_item(cl_id: uuid.UUID, payload: ChecklistItemCreate, db: Session = Depends(get_db)):
    cl = db.query(QualityChecklist).filter(QualityChecklist.id == cl_id).first()
    if not cl:
        raise HTTPException(status_code=404, detail="Checklist not found")
    item = ChecklistItem(checklist_id=cl_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/checklists/{cl_id}/items", response_model=List[ChecklistItemResponse])
def get_checklist_items(cl_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(ChecklistItem).filter(
        ChecklistItem.checklist_id == cl_id
    ).order_by(ChecklistItem.sequence).all()


# ─── Inspections ──────────────────────────────────────────────────────────────

@router.post("/inspections", response_model=InspectionResponse_, status_code=status.HTTP_201_CREATED)
def create_inspection(payload: InspectionCreate, db: Session = Depends(get_db)):
    insp = SiteInspection(**payload.model_dump())
    db.add(insp)
    db.commit()
    db.refresh(insp)
    return insp


@router.get("/inspections/{project_id}", response_model=List[InspectionResponse_])
def list_inspections(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(SiteInspection).filter(
        SiteInspection.project_id == project_id
    ).order_by(SiteInspection.inspection_date.desc()).all()


@router.patch("/inspections/{insp_id}/respond", response_model=InspectionResponse_)
def submit_inspection_responses(
    insp_id: uuid.UUID,
    payload: BulkRespondRequest,
    db: Session = Depends(get_db)
):
    insp = db.query(SiteInspection).filter(SiteInspection.id == insp_id).first()
    if not insp:
        raise HTTPException(status_code=404, detail="Inspection not found")

    pass_count = fail_count = na_count = 0

    for resp_data in payload.responses:
        # Upsert: check if response for this item already exists
        existing = db.query(InspectionResponse).filter(
            InspectionResponse.inspection_id == insp_id,
            InspectionResponse.checklist_item_id == resp_data.checklist_item_id
        ).first()

        if existing:
            existing.result = resp_data.result
            existing.remarks = resp_data.remarks
            existing.photo_url = resp_data.photo_url
        else:
            resp = InspectionResponse(
                inspection_id=insp_id,
                **resp_data.model_dump()
            )
            db.add(resp)

        if resp_data.result == "Pass":
            pass_count += 1
        elif resp_data.result == "Fail":
            fail_count += 1
        else:
            na_count += 1

    # Update inspection summary counts
    insp.pass_count = pass_count
    insp.fail_count = fail_count
    insp.na_count = na_count

    total = pass_count + fail_count
    if total == 0:
        insp.status = "pending"
    elif fail_count == 0:
        insp.status = "pass"
    elif pass_count == 0:
        insp.status = "fail"
    else:
        insp.status = "partial"

    db.commit()
    db.refresh(insp)
    return insp


# ─── NCR ──────────────────────────────────────────────────────────────────────

@router.post("/ncr", response_model=NCRResponse, status_code=status.HTTP_201_CREATED)
def raise_ncr(payload: NCRCreate, db: Session = Depends(get_db)):
    ncr = NCR(**payload.model_dump())
    db.add(ncr)
    db.commit()
    db.refresh(ncr)
    return ncr


@router.get("/ncr/{project_id}", response_model=List[NCRResponse])
def list_ncrs(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(NCR).filter(
        NCR.project_id == project_id
    ).order_by(NCR.created_at.desc()).all()


@router.patch("/ncr/{ncr_id}/review", response_model=NCRResponse)
def ncr_under_review(ncr_id: uuid.UUID, db: Session = Depends(get_db)):
    ncr = db.query(NCR).filter(NCR.id == ncr_id).first()
    if not ncr:
        raise HTTPException(status_code=404, detail="NCR not found")
    if ncr.status != "open":
        raise HTTPException(status_code=400, detail="Only open NCRs can move to under_review")
    ncr.status = "under_review"
    db.commit()
    db.refresh(ncr)
    return ncr


class NCRCloseRequest(BaseModel):
    resolution_notes: str


@router.patch("/ncr/{ncr_id}/close", response_model=NCRResponse)
def close_ncr(ncr_id: uuid.UUID, payload: NCRCloseRequest, db: Session = Depends(get_db)):
    ncr = db.query(NCR).filter(NCR.id == ncr_id).first()
    if not ncr:
        raise HTTPException(status_code=404, detail="NCR not found")
    if ncr.status == "closed":
        raise HTTPException(status_code=400, detail="NCR is already closed")
    ncr.status = "closed"
    ncr.resolution_notes = payload.resolution_notes
    ncr.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(ncr)
    return ncr


# ─── Material Tests ───────────────────────────────────────────────────────────

@router.post("/material-tests", response_model=MaterialTestResponse, status_code=status.HTTP_201_CREATED)
def log_material_test(payload: MaterialTestCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()

    # Auto-compute pass/fail from min/max bounds if provided
    is_pass = None
    val = data["result_value"]
    mn = data.get("min_acceptable")
    mx = data.get("max_acceptable")
    if mn is not None and mx is not None:
        is_pass = bool(mn <= val <= mx)
    elif mn is not None:
        is_pass = bool(val >= mn)
    elif mx is not None:
        is_pass = bool(val <= mx)

    # Convert floats to Decimal for Numeric columns
    for field in ("result_value", "min_acceptable", "max_acceptable"):
        if data.get(field) is not None:
            data[field] = Decimal(str(data[field]))

    test = MaterialTestResult(**data, is_pass=is_pass)
    db.add(test)
    db.commit()
    db.refresh(test)
    return test


@router.get("/material-tests/{project_id}", response_model=List[MaterialTestResponse])
def list_material_tests(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(MaterialTestResult).filter(
        MaterialTestResult.project_id == project_id
    ).order_by(MaterialTestResult.test_date.desc()).all()
