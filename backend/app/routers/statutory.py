import uuid
from datetime import datetime, timezone
from typing import List, Literal, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from app.database import get_db
from app.auth import get_current_user, verify_project_in_company, verify_company_access, require_permission, require_module_view
from app.models import StatutoryReport, StaffEmployee, PayrollRun, PayrollLineItem, User
from decimal import Decimal

router = APIRouter(prefix="/statutory", tags=["Statutory Reports"], dependencies=[Depends(get_current_user)])

# Types with a derived due-date rule in calculate_due_date. R2-721: these were
# previously matched case-sensitively, so "PF" silently saved without a due date.
DUE_DATE_RULE_TYPES = ("tds", "pf", "esi", "bocw")
# Full set of report types the product supports (superset used by the statutory
# page dropdown; pt/it have no encoded due-date rule by design).
VALID_REPORT_TYPES = DUE_DATE_RULE_TYPES + ("pt", "it")


def _normalize_report_type(value: str) -> str:
    return (value or "").strip().lower()


class StatutoryReportCreate(BaseModel):
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    report_type: Literal["pf", "esi", "bocw", "tds", "pt", "it"]
    return_period: str
    total_employees: int = Field(0, ge=0)
    total_wages: float = Field(0.0, ge=0)
    pf_employee_contribution: float = Field(0.0, ge=0)
    pf_employer_contribution: float = Field(0.0, ge=0)
    esi_employee_contribution: float = Field(0.0, ge=0)
    esi_employer_contribution: float = Field(0.0, ge=0)
    bocw_cess: float = Field(0.0, ge=0)
    tds_deducted: float = Field(0.0, ge=0)
    filed_by: Optional[str] = None
    acknowledgment_number: Optional[str] = None
    status: str = "draft"
    due_date: Optional[datetime] = None

    @field_validator("report_type", mode="before")
    @classmethod
    def _lowercase_report_type(cls, v):
        return _normalize_report_type(v) if isinstance(v, str) else v


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
    # R2-283: Optional[X] without a default is REQUIRED in Pydantic v2, so any
    # response built from a dict that omits these keys (auto-populate) died in
    # flight with "3 validation errors" before the caller saw anything.
    filed_at: Optional[datetime] = None
    filed_by: Optional[str] = None
    acknowledgment_number: Optional[str] = None
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
        next_year, next_month = (year + 1, 1) if month == 12 else (year, month + 1)
        rt = _normalize_report_type(report_type)
        if rt == "tds":
            return datetime(next_year, next_month, 7)
        elif rt in DUE_DATE_RULE_TYPES:
            return datetime(next_year, next_month, 15)
        return None
    except Exception:
        return None


@router.post("", response_model=StatutoryReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(payload: StatutoryReportCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    require_permission(db, current_user, payload.company_id, "payroll:edit")
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
def list_reports(company_id: uuid.UUID, report_type: Optional[str] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    require_module_view(db, current_user, company_id, "payroll")
    query = db.query(StatutoryReport).filter(StatutoryReport.company_id == company_id)
    if report_type:
        query = query.filter(StatutoryReport.report_type == _normalize_report_type(report_type))
    reports = query.order_by(StatutoryReport.return_period.desc()).all()
    return [_enrich(r, db) for r in reports]


@router.get("/{company_id}/auto-populate", response_model=StatutoryReportResponse)
def auto_populate(company_id: uuid.UUID, report_type: str = Query(...), return_period: str = Query(...), project_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    require_module_view(db, current_user, company_id, "payroll")
    if project_id:
        verify_project_in_company(db, project_id, company_id)
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
        "bocw_cess": Decimal(str(round(total_wages * 0.01, 2))) if _normalize_report_type(report_type) == "bocw" else Decimal("0"),
        "tds_deducted": Decimal(str(round(tds, 2))),
        "status": "draft",
    }
    data["id"] = uuid.uuid4()
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = datetime.utcnow()
    return StatutoryReportResponse(**data)


@router.patch("/{report_id}/file", response_model=StatutoryReportResponse)
def file_report(report_id: uuid.UUID, acknowledgment_number: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(StatutoryReport).filter(StatutoryReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    require_permission(db, current_user, report.company_id, "payroll:edit")
    ack = acknowledgment_number.strip()
    if not ack:
        raise HTTPException(status_code=422, detail="acknowledgment_number must not be blank")
    if not report.total_wages and not report.total_employees:
        raise HTTPException(status_code=400, detail="Cannot file an empty return: the report has no employees and no wages")
    report.status = "filed"
    report.filed_at = datetime.utcnow()
    report.filed_by = current_user.name
    report.acknowledgment_number = ack
    db.commit()
    db.refresh(report)
    return _enrich(report, db)


@router.get("/{company_id}/penalty", response_model=dict)
def estimate_penalty(company_id: uuid.UUID, report_type: str = Query(...), return_period: str = Query(...), db: Session = Depends(get_db), _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    require_module_view(db, current_user, company_id, "payroll")
    report = db.query(StatutoryReport).filter(
        StatutoryReport.company_id == company_id,
        StatutoryReport.report_type == _normalize_report_type(report_type),
        StatutoryReport.return_period == return_period,
    ).order_by(StatutoryReport.created_at.desc()).first()
    if not report:
        raise HTTPException(status_code=404, detail="No statutory report found for this report type and period")
    return {
        "report_type": report.report_type,
        "return_period": report.return_period,
        "total_wages": float(report.total_wages or 0),
        "estimated_penalty": 0.0,
        "due_date": calculate_due_date(report.report_type, report.return_period),
    }


# DEFECT-08 fix: Dedicated statutory export endpoints referenced in API spec
# These were missing — the spec says /gstr1, /pf-ecr, /tds-26q but only /{company_id} existed.

@router.get("/{company_id}/gstr1")
def export_gstr1(
    company_id: uuid.UUID,
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2020, description="Financial year (e.g. 2026)"),
    db: Session = Depends(get_db),
    _: None = Depends(verify_company_access),
    current_user: User = Depends(get_current_user),
):
    """GSTR-1 outward supply summary report for the given month/year."""
    require_module_view(db, current_user, company_id, "payroll")
    return_period = f"{year}-{month:02d}"
    # Query filed reports of type gst for this period
    reports = db.query(StatutoryReport).filter(
        StatutoryReport.company_id == company_id,
        StatutoryReport.report_type == "gst",
        StatutoryReport.return_period == return_period,
    ).all()
    return {
        "report": "GSTR-1",
        "company_id": str(company_id),
        "return_period": return_period,
        "due_date": f"{year}-{month:02d}-11",
        "status": reports[0].status if reports else "not_generated",
        "records": [
            {
                "id": str(r.id),
                "return_period": r.return_period,
                "total_wages": float(r.total_wages),
                "tds_deducted": float(r.tds_deducted),
                "status": r.status,
                "filed_at": r.filed_at.isoformat() if r.filed_at else None,
                "acknowledgment_number": r.acknowledgment_number,
            }
            for r in reports
        ],
    }


@router.get("/{company_id}/pf-ecr")
def export_pf_ecr(
    company_id: uuid.UUID,
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    year: int = Query(..., ge=2020, description="Financial year"),
    db: Session = Depends(get_db),
    _: None = Depends(verify_company_access),
    current_user: User = Depends(get_current_user),
):
    """PF Electronic Challan cum Return (ECR) data for the given month."""
    require_module_view(db, current_user, company_id, "payroll")
    return_period = f"{year}-{month:02d}"
    employees = db.query(StaffEmployee).filter(
        StaffEmployee.company_id == company_id,
        StaffEmployee.status == "active",
    ).all()

    ecr_lines = []
    for emp in employees:
        basic = float(emp.basic_salary or 0)
        pf_wages = min(basic, 15000.0)  # PF capped at ₹15,000 wage ceiling
        ee_pf = round(pf_wages * float(emp.pf_employee_pct or 12) / 100, 2)
        er_pf = round(pf_wages * float(emp.pf_employer_pct or 12) / 100, 2)
        ecr_lines.append({
            "uan": "NOT_LINKED",  # UAN not stored on model; placeholder
            "employee_code": emp.employee_code or str(emp.id)[:8].upper(),
            "name": emp.name,
            "pf_wages": pf_wages,
            "ee_pf_contribution": ee_pf,
            "er_pf_contribution": er_pf,
            "total_pf": round(ee_pf + er_pf, 2),
        })

    total_ee = round(sum(r["ee_pf_contribution"] for r in ecr_lines), 2)
    total_er = round(sum(r["er_pf_contribution"] for r in ecr_lines), 2)
    return {
        "report": "PF-ECR",
        "company_id": str(company_id),
        "return_period": return_period,
        "due_date": f"{year}-{month:02d}-15",
        "total_employees": len(ecr_lines),
        "total_ee_pf": total_ee,
        "total_er_pf": total_er,
        "total_pf_liability": round(total_ee + total_er, 2),
        "ecr_lines": ecr_lines,
    }


@router.get("/{company_id}/tds-26q")
def export_tds_26q(
    company_id: uuid.UUID,
    quarter: str = Query(..., description="Quarter: Q1, Q2, Q3, Q4"),
    year: int = Query(..., ge=2020, description="Financial year (e.g. 2026)"),
    db: Session = Depends(get_db),
    _: None = Depends(verify_company_access),
    current_user: User = Depends(get_current_user),
):
    """TDS Form 26Q — quarterly TDS return for non-salary deductions (subcon payments etc.)."""
    require_module_view(db, current_user, company_id, "payroll")
    quarter_map = {"Q1": ("04", "06"), "Q2": ("07", "09"), "Q3": ("10", "12"), "Q4": ("01", "03")}
    if quarter not in quarter_map:
        raise HTTPException(status_code=422, detail=f"Invalid quarter '{quarter}'. Use Q1, Q2, Q3, or Q4.")
    start_month, end_month = quarter_map[quarter]
    due_map = {"Q1": f"{year}-07-31", "Q2": f"{year}-10-31", "Q3": f"{year+1}-01-31", "Q4": f"{year+1}-05-31"}

    employees = db.query(StaffEmployee).filter(
        StaffEmployee.company_id == company_id,
        StaffEmployee.status == "active",
    ).all()

    deductee_rows = []
    total_tds = 0.0
    for emp in employees:
        monthly_tds = float(emp.tds_monthly or 0)
        quarterly_tds = round(monthly_tds * 3, 2)
        if quarterly_tds > 0:
            total_tds += quarterly_tds
            deductee_rows.append({
                "pan": "NOPANAVAIL",  # PAN not stored on model; placeholder
                "name": emp.name,
                "employee_code": emp.employee_code or str(emp.id)[:8].upper(),
                "tds_section": "194C",
                "gross_payment": round(float(emp.basic_salary or 0) * 3, 2),
                "tds_deducted": quarterly_tds,
            })

    return {
        "report": "TDS-26Q",
        "company_id": str(company_id),
        "quarter": quarter,
        "year": year,
        "due_date": due_map[quarter],
        "total_deductees": len(deductee_rows),
        "total_tds_liability": round(total_tds, 2),
        "deductee_rows": deductee_rows,
    }


def _enrich(report: StatutoryReport, db: Session) -> StatutoryReportResponse:
    days_overdue = 0
    if report.due_date:
        if report.status != "filed":
            # R2-222: due_date round-trips aware on Postgres (naive on
            # SQLite); normalize both operands to aware UTC so the overdue
            # delta can't raise TypeError.
            due = report.due_date
            if due.tzinfo is None:
                due = due.replace(tzinfo=timezone.utc)
            days_overdue = max(0, (datetime.now(timezone.utc) - due).days)
    data = {**report.__dict__}
    data["days_overdue"] = days_overdue
    data["penalty_estimate"] = 0.0
    return StatutoryReportResponse(**data)

