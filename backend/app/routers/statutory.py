import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import StatutoryReport
from decimal import Decimal

router = APIRouter(prefix="/statutory", tags=["Statutory Reports"])


class StatutoryReportCreate(BaseModel):
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    report_type: str
    return_period: str
    total_employees: int = 0
    total_wages: float = 0.0
    pf_employee_contribution: float = 0.0
    pf_employer_contribution: float = 0.0
    esi_employee_contribution: float = 0.0
    esi_employer_contribution: float = 0.0
    bocw_cess: float = 0.0
    tds_deducted: float = 0.0
    filed_by: Optional[str] = None
    acknowledgment_number: Optional[str] = None
    status: str = "draft"


class StatutoryReportResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    report_type: str
    return_period: str
    total_employees: int
    total_wages: float
    pf_employee_contribution: float
    pf_employer_contribution: float
    esi_employee_contribution: float
    esi_employer_contribution: float
    bocw_cess: float
    tds_deducted: float
    filed_at: Optional[datetime]
    filed_by: Optional[str]
    acknowledgment_number: Optional[str]
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=StatutoryReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: StatutoryReportCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    for k in ("total_wages", "pf_employee_contribution", "pf_employer_contribution",
              "esi_employee_contribution", "esi_employer_contribution", "bocw_cess", "tds_deducted"):
        data[k] = Decimal(str(data[k]))
    report = StatutoryReport(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("/{company_id}", response_model=List[StatutoryReportResponse])
def list_reports(company_id: uuid.UUID, report_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(StatutoryReport).filter(StatutoryReport.company_id == company_id)
    if report_type:
        query = query.filter(StatutoryReport.report_type == report_type)
    return query.order_by(StatutoryReport.return_period.desc()).all()


@router.patch("/{report_id}/file", response_model=StatutoryReportResponse)
def file_report(report_id: uuid.UUID, acknowledgment_number: str, filed_by: str, db: Session = Depends(get_db)):
    report = db.query(StatutoryReport).filter(StatutoryReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.status = "filed"
    report.filed_at = datetime.utcnow()
    report.filed_by = filed_by
    report.acknowledgment_number = acknowledgment_number
    db.commit()
    db.refresh(report)
    return report
