import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import StatutoryReport, StaffEmployee, PayrollRun, PayrollLineItem
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
    due_date: Optional[datetime] = None


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
    due_date: Optional[datetime] = None
    days_overdue: int = 0
    penalty_estimate: float = 0.0
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


def calculate_due_date(report_type: str, return_period: str) -> Optional[datetime]:
    try:
        year, month = map(int, return_period.split("-"))
        if report_type == "pf":
            return datetime(year, month, 15)
        elif report_type == "esi":
            return datetime(year, month, 15)
        elif report_type == "tds":
            next_month = month + 1 if month < 12 else 1
            next_year = year if month < 12 else year + 1
            day = 31 if month == 12 else 30
            if next_month == 2:
                day = 28
            return datetime(next_year, next_month, day)
        elif report_type == "bocw":
            return datetime(year, month, 15)
        return None
    except Exception:
        return None


def calculate_penalty(report_type: str, total_wages: float, return_period: str, filed_at: Optional[datetime]) -> float:
    if not filed_at:
        due = calculate_due_date(report_type, return_period)
        if due:
            days = (datetime.utcnow() - due).days
            if days > 0:
                late_fee_pct = 0.10 if report_type in ("pf", "esi") else 0.05
                return round(float(total_wages) * late_fee_pct * min(days / 30, 1), 2)
    return 0.0


@router.post("", response_model=StatutoryReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: StatutoryReportCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    for k in ("total_wages", "pf_employee_contribution", "pf_employer_contribution",
              "esi_employee_contribution", "esi_employer_contribution", "bocw_cess", "tds_deducted"):
        data[k] = Decimal(str(data[k]))
    if not data.get("due_date"):
        data["due_date"] = calculate_due_date(data["report_type"], data["return_period"])
    report = StatutoryReport(**data)
    db.add(report)
    db.commit()
    db.refresh(report)
    return _enrich(report, db)


@router.get("/{company_id}", response_model=List[StatutoryReportResponse])
def list_reports(company_id: uuid.UUID, report_type: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(StatutoryReport).filter(StatutoryReport.company_id == company_id)
    if report_type:
        query = query.filter(StatutoryReport.report_type == report_type)
    reports = query.order_by(StatutoryReport.return_period.desc()).all()
    return [_enrich(r, db) for r in reports]


@router.get("/{company_id}/auto-populate", response_model=StatutoryReportResponse)
def auto_populate(company_id: uuid.UUID, report_type: str = Query(...), return_period: str = Query(...), project_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db)):
    year, month = map(int, return_period.split("-"))
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)

    employees = db.query(StaffEmployee).filter(
        StaffEmployee.company_id == company_id,
        StaffEmployee.status == "active"
    )
    if project_id:
        employees = employees.filter(StaffEmployee.project_id == project_id)
    active_employees = employees.all()

    payroll_runs = db.query(PayrollRun).filter(
        PayrollRun.company_id == company_id,
        PayrollRun.payroll_month == return_period
    ).all()
    payroll_run = payroll_runs[0] if payroll_runs else None

    total_wages = sum(float(e.basic_salary or 0) + float(e.hra or 0) + float(e.other_allowances or 0) for e in active_employees)
    pf_employee = sum(float(e.basic_salary or 0) * float(e.pf_employee_pct or 0) / 100 for e in active_employees)
    pf_employer = sum(float(e.basic_salary or 0) * float(e.pf_employer_pct or 0) / 100 for e in active_employees)
    esi_employee = sum((float(e.basic_salary or 0) + float(e.hra or 0) + float(e.other_allowances or 0)) * float(e.esi_employee_pct or 0) / 100 for e in active_employees) if any(e.is_esi_applicable for e in active_employees) else 0
    esi_employer = sum((float(e.basic_salary or 0) + float(e.hra or 0) + float(e.other_allowances or 0)) * float(e.esi_employer_pct or 0) / 100 for e in active_employees) if any(e.is_esi_applicable for e in active_employees) else 0
    tds = sum(float(e.tds_monthly or 0) for e in active_employees)

    data = {
        "company_id": company_id,
        "project_id": project_id,
        "report_type": report_type,
        "return_period": return_period,
        "total_employees": len(active_employees),
        "total_wages": Decimal(str(round(total_wages, 2))),
        "pf_employee_contribution": Decimal(str(round(pf_employee, 2))),
        "pf_employer_contribution": Decimal(str(round(pf_employer, 2))),
        "esi_employee_contribution": Decimal(str(round(esi_employee, 2))),
        "esi_employer_contribution": Decimal(str(round(esi_employer, 2))),
        "bocw_cess": Decimal("0"),
        "tds_deducted": Decimal(str(round(tds, 2))),
        "status": "draft",
    }
    return StatutoryReportResponse(**data)


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
    return _enrich(report, db)


@router.get("/{company_id}/penalty", response_model=dict)
def estimate_penalty(company_id: uuid.UUID, report_type: str = Query(...), return_period: str = Query(...), total_wages: float = Query(...), db: Session = Depends(get_db)):
    penalty = calculate_penalty(report_type, total_wages, return_period, None)
    return {
        "report_type": report_type,
        "return_period": return_period,
        "total_wages": total_wages,
        "estimated_penalty": penalty,
        "due_date": calculate_due_date(report_type, return_period),
    }


def _enrich(report: StatutoryReport, db: Session) -> StatutoryReportResponse:
    days_overdue = 0
    penalty = 0.0
    if report.due_date:
        if report.status != "filed":
            days_overdue = max(0, (datetime.utcnow() - report.due_date).days)
            penalty = calculate_penalty(report.report_type, float(report.total_wages), report.return_period, report.filed_at)
    data = {**report.__dict__}
    data["days_overdue"] = days_overdue
    data["penalty_estimate"] = penalty
    return StatutoryReportResponse(**data)
