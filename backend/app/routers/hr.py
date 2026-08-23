"""
Phase 9 — Staff HR, Geofenced Attendance & Payroll
Endpoints:
  POST   /hr/employees              — Create employee
  GET    /hr/employees/{project_id} — List employees for project
  POST   /hr/attendance/punch       — GPS punch-in or punch-out (geofence validated)
  GET    /hr/attendance/{project_id}/{date} — Daily attendance list
  POST   /hr/timesheets             — Create weekly timesheet
  POST   /hr/timesheets/{ts_id}/entries — Add entry to timesheet
  PATCH  /hr/timesheets/{ts_id}/submit  — Submit timesheet for approval
  PATCH  /hr/timesheets/{ts_id}/approve — Approve timesheet
  POST   /hr/payroll/run            — Execute monthly payroll run
  GET    /hr/payroll/{run_id}/payslips — List payslips for a run
"""

import csv
import io
import math
import uuid
from datetime import datetime, date, timedelta, timezone
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, File, Form, UploadFile, Response
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, field_validator
from app.database import get_db
from app.auth import get_current_user, verify_project_in_company, verify_company_access, verify_project_access, get_company_membership, require_permission, require_module_view
from app.models import (
    StaffEmployee, AttendanceLog, Timesheet,
    TimesheetEntry, PayrollRun, PayrollLineItem, Project, LeaveRequest,
    Holiday, Designation, LeaveTemplate, PayrollProfile, User
)

router = APIRouter(prefix="/hr", tags=["HR, Attendance & Payroll"], dependencies=[Depends(get_current_user)])


# ─── Helpers ─────────────────────────────────────────────────────────────────

# Statutory ESI wage ceiling applies to GROSS wages (basic + HRA + allowances),
# not basic pay alone.
ESI_GROSS_WAGE_CEILING = 21000.0


def _esi_applicable(basic_salary: float, hra: float, other_allowances: float) -> bool:
    """True when full gross wages are within the ESI ceiling."""
    return (float(basic_salary) + float(hra) + float(other_allowances)) <= ESI_GROSS_WAGE_CEILING


# R2-210/R2-262/R2-220: DateTime(timezone=True) columns round-trip aware on
# Postgres but naive on SQLite; normalize every operand to aware UTC before
# arithmetic or comparison so the two flavors never mix.
def _aware_utc(dt: datetime) -> datetime:
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _utc_midnight(dt: datetime) -> datetime:
    return datetime(dt.year, dt.month, dt.day, tzinfo=timezone.utc)


def haversine_distance_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Return distance in metres between two GPS coordinates (Haversine formula)."""
    R = 6_371_000  # Earth radius in metres
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _parse_site_coords(location_str: Optional[str]):
    """Parse 'lat,lng' string stored in Project.location. Returns (lat, lng) or (None, None)."""
    if not location_str:
        return None, None
    try:
        parts = location_str.split(",")
        return float(parts[0].strip()), float(parts[1].strip())
    except Exception:
        return None, None


# ─── Schemas ─────────────────────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    name: str
    employee_code: Optional[str] = None
    designation: Optional[str] = None
    department: Optional[str] = None
    mobile: Optional[str] = None
    basic_salary: float = Field(0.0, ge=0)
    hra: float = Field(0.0, ge=0)
    other_allowances: float = Field(0.0, ge=0)
    pf_employee_pct: float = Field(12.0, ge=0, le=100)
    pf_employer_pct: float = Field(12.0, ge=0, le=100)
    esi_employee_pct: float = Field(0.75, ge=0, le=100)
    esi_employer_pct: float = Field(3.25, ge=0, le=100)
    tds_monthly: float = Field(0.0, ge=0)
    is_esi_applicable: bool = True
    date_of_joining: Optional[datetime] = None


class EmployeeResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    name: str
    employee_code: Optional[str]
    designation: Optional[str]
    department: Optional[str]
    mobile: Optional[str]
    basic_salary: float
    hra: float
    other_allowances: float
    pf_employee_pct: float
    pf_employer_pct: float
    esi_employee_pct: float
    esi_employer_pct: float
    tds_monthly: float
    is_esi_applicable: bool
    status: str
    date_of_joining: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class PunchRequest(BaseModel):
    employee_id: uuid.UUID
    project_id: uuid.UUID
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)
    punch_type: str = Field(..., pattern="^(in|out)$")
    shift_multiplier: Optional[float] = 1.0
    location_verified: Optional[bool] = True
    notes: Optional[str] = None


class AttendanceResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    project_id: uuid.UUID
    attendance_date: datetime
    punch_in: Optional[datetime]
    punch_out: Optional[datetime]
    lat_in: Optional[float]
    lng_in: Optional[float]
    distance_from_site_m: Optional[float]
    is_within_geofence: bool
    status: str
    hours_worked: Optional[float]
    overtime_hours: float
    shift_multiplier: float
    location_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TimesheetCreate(BaseModel):
    employee_id: uuid.UUID
    project_id: uuid.UUID
    week_start: datetime
    week_end: datetime
    notes: Optional[str] = None


class TimesheetEntryCreate(BaseModel):
    task_id: Optional[uuid.UUID] = None
    entry_date: datetime
    hours: float = Field(..., gt=0, le=24)
    activity_description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration: Optional[int] = None # in minutes


class TimesheetResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    project_id: uuid.UUID
    week_start: datetime
    week_end: datetime
    total_hours: float
    status: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class TimesheetEntryResponse(BaseModel):
    id: uuid.UUID
    timesheet_id: uuid.UUID
    task_id: Optional[uuid.UUID]
    entry_date: datetime
    hours: float
    activity_description: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    duration: Optional[int]
    created_at: datetime
    employee_name: Optional[str] = None
    employee_id: Optional[uuid.UUID] = None

    class Config:
        from_attributes = True


class PayrollRunCreate(BaseModel):
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    payroll_month: str = Field(..., pattern=r"^\d{4}-\d{2}$")  # e.g. "2026-06"
    days_in_month: int = Field(26, ge=1, le=31)

    @field_validator("payroll_month")
    @classmethod
    def _payroll_month_is_real_month(cls, v: str) -> str:
        # R2-355: the pattern alone accepts "2026-13", which run_payroll feeds
        # straight into datetime() and crashes with an unhandled ValueError.
        # Reject impossible months here so the client gets a 422 naming the
        # valid format instead of a 500.
        month = int(v.split("-")[1])
        if not 1 <= month <= 12:
            raise ValueError("payroll_month must be a real month in YYYY-MM format, e.g. 2026-06")
        return v


class PayslipResponse(BaseModel):
    id: uuid.UUID
    payroll_run_id: uuid.UUID
    employee_id: uuid.UUID
    employee_name: str
    days_present: float
    days_in_month: int
    gross_salary: float
    basic: float
    hra: float
    other_allowances: float
    overtime_amount: float
    pf_employee: float
    pf_employer: float
    esi_employee: float
    esi_employer: float
    tds: float
    advance_recovery: float
    other_deductions: float
    total_deductions: float
    net_payable: float


class PayrollRunResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    payroll_month: str
    status: str
    total_gross: float
    total_deductions: float
    total_net: float
    created_at: datetime
    payslips: List[PayslipResponse] = []

    class Config:
        from_attributes = True


# ─── Employees ───────────────────────────────────────────────────────────────

@router.post("/employees", response_model=EmployeeResponse, status_code=status.HTTP_201_CREATED)
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    require_permission(db, current_user, payload.company_id, "payroll:edit")
    data = payload.model_dump()
    # ESI eligibility is derived from gross wages server-side; the caller's
    # value is never trusted.
    data["is_esi_applicable"] = _esi_applicable(data["basic_salary"], data["hra"], data["other_allowances"])
    emp = StaffEmployee(**data)
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.get("/employees/{project_id}", response_model=List[EmployeeResponse])
def list_employees(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    return db.query(StaffEmployee).filter(
        StaffEmployee.project_id == project_id,
        StaffEmployee.status == "active"
    ).all()


# ─── Attendance / Geofence ───────────────────────────────────────────────────

@router.post("/attendance/punch", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def punch(payload: PunchRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)

    employee = db.query(StaffEmployee).filter(StaffEmployee.id == payload.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    if employee.company_id != project.company_id:
        # AttendanceLog carries no company_id and run_payroll counts attendance by
        # employee_id alone, so a cross-company punch would inject attendance that
        # later inflates the victim company's payroll days.
        raise HTTPException(status_code=403, detail="Employee does not belong to this project's company")

    site_lat, site_lng = _parse_site_coords(project.location)
    radius = 500 if project.attendance_radius_meters is None else project.attendance_radius_meters

    distance_m: Optional[float] = None
    within_geofence = False
    if site_lat is not None:
        distance_m = round(haversine_distance_m(payload.lat, payload.lng, site_lat, site_lng), 2)
        within_geofence = distance_m <= radius
    else:
        # No site coords configured → allow punch without GPS enforcement
        within_geofence = True

    # R2-210/R2-262: aware UTC clock so stored/loaded punch values (aware on
    # Postgres) are always compared against the same flavor.
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if payload.punch_type == "in":
        # Check if already punched in today
        existing = db.query(AttendanceLog).filter(
            AttendanceLog.employee_id == payload.employee_id,
            AttendanceLog.project_id == payload.project_id,
            AttendanceLog.attendance_date >= today_start,
            AttendanceLog.punch_in.isnot(None)
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Already punched in today. Use punch_type='out'.")

        log = AttendanceLog(
            employee_id=payload.employee_id,
            project_id=payload.project_id,
            attendance_date=now,
            punch_in=now,
            lat_in=Decimal(str(payload.lat)),
            lng_in=Decimal(str(payload.lng)),
            distance_from_site_m=Decimal(str(distance_m)) if distance_m is not None else None,
            is_within_geofence=within_geofence,
            status="Present" if within_geofence else "Present (Off-Site)",
            shift_multiplier=Decimal(str(payload.shift_multiplier or 1.0)),
            location_verified=within_geofence,
            notes=payload.notes
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    else:
        # punch_type == "out"
        log = db.query(AttendanceLog).filter(
            AttendanceLog.employee_id == payload.employee_id,
            AttendanceLog.project_id == payload.project_id,
            AttendanceLog.attendance_date >= today_start,
            AttendanceLog.punch_out.is_(None)
        ).first()
        if not log:
            raise HTTPException(status_code=400, detail="No open punch-in found for today.")

        now = datetime.now(timezone.utc)
        log.punch_out = now
        log.lat_out = Decimal(str(payload.lat))
        log.lng_out = Decimal(str(payload.lng))

        if payload.shift_multiplier is not None:
            log.shift_multiplier = Decimal(str(payload.shift_multiplier))
        log.location_verified = within_geofence

        # Compute hours worked
        # R2-210/R2-262: normalize BOTH operands to aware UTC; punch_in comes
        # back aware from Postgres (naive from SQLite), and mixing flavors
        # raised TypeError, 500ing punch-out and leaving the row open.
        if log.punch_in:
            delta = (now - _aware_utc(log.punch_in)).total_seconds() / 3600
            log.hours_worked = Decimal(str(round(delta, 2)))
            # Overtime = hours beyond 8
            ot = max(0.0, delta - 8.0)
            log.overtime_hours = Decimal(str(round(ot, 2)))

        db.commit()
        db.refresh(log)
        return log


@router.get("/attendance/{project_id}/{date_str}", response_model=List[AttendanceResponse])
def daily_attendance(project_id: uuid.UUID, date_str: str, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="date_str must be YYYY-MM-DD")
    next_day = target + timedelta(days=1)
    return db.query(AttendanceLog).filter(
        AttendanceLog.project_id == project_id,
        AttendanceLog.attendance_date >= target,
        AttendanceLog.attendance_date < next_day
    ).all()


# ─── Timesheets ──────────────────────────────────────────────────────────────

@router.post("/timesheets", response_model=TimesheetResponse, status_code=status.HTTP_201_CREATED)
def create_timesheet(payload: TimesheetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "attendance:edit")
    ts = Timesheet(**payload.model_dump())
    db.add(ts)
    db.commit()
    db.refresh(ts)
    return ts


@router.post("/timesheets/{ts_id}/entries", status_code=status.HTTP_201_CREATED)
def add_timesheet_entry(ts_id: uuid.UUID, payload: TimesheetEntryCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    project = db.query(Project).filter(Project.id == ts.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Timesheet's project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "attendance:edit")
    if ts.status not in ("draft", "rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot add entries to timesheet in status '{ts.status}'")

    entry_date = payload.entry_date
    week_start = ts.week_start
    week_end = ts.week_end
    if entry_date.tzinfo is None:
        entry_date = entry_date.replace(tzinfo=timezone.utc)
    if week_start.tzinfo is None:
        week_start = week_start.replace(tzinfo=timezone.utc)
    if week_end.tzinfo is None:
        week_end = week_end.replace(tzinfo=timezone.utc)
    if not (week_start <= entry_date <= week_end):
        raise HTTPException(
            status_code=422,
            detail=f"entry_date must fall within the timesheet's week ({week_start.date()} to {week_end.date()})",
        )

    entry_data = payload.model_dump()
    if entry_data.get("start_time") and entry_data.get("end_time") and not entry_data.get("duration"):
        delta = entry_data["end_time"] - entry_data["start_time"]
        entry_data["duration"] = int(delta.total_seconds() / 60)

    entry = TimesheetEntry(timesheet_id=ts_id, **entry_data)
    db.add(entry)

    # Recompute total_hours
    existing_hours = sum(
        float(e.hours) for e in db.query(TimesheetEntry).filter(TimesheetEntry.timesheet_id == ts_id).all()
    )
    ts.total_hours = Decimal(str(round(existing_hours + payload.hours, 2)))
    db.commit()
    db.refresh(entry)
    return {
        "id": str(entry.id), 
        "timesheet_total_hours": float(ts.total_hours),
        "start_time": entry.start_time.isoformat() if entry.start_time else None,
        "end_time": entry.end_time.isoformat() if entry.end_time else None,
        "duration": entry.duration
    }


@router.get("/timesheets/project/{project_id}", response_model=List[TimesheetEntryResponse])
def list_project_timesheet_entries(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    results = db.query(
        TimesheetEntry,
        StaffEmployee.name.label("employee_name"),
        Timesheet.employee_id.label("employee_id")
    ).select_from(TimesheetEntry)\
     .join(Timesheet, TimesheetEntry.timesheet_id == Timesheet.id)\
     .join(StaffEmployee, Timesheet.employee_id == StaffEmployee.id)\
     .filter(Timesheet.project_id == project_id)\
     .order_by(TimesheetEntry.entry_date.desc())\
     .all()
    
    response = []
    for entry, emp_name, emp_id in results:
        res = TimesheetEntryResponse.model_validate(entry)
        res.employee_name = emp_name
        res.employee_id = emp_id
        response.append(res)
    return response


@router.get("/timesheets/company/{company_id}")
def list_company_timesheet_entries(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    results = db.query(
        TimesheetEntry,
        StaffEmployee.name.label("employee_name"),
        Timesheet.employee_id.label("employee_id"),
        Project.name.label("project_name")
    ).select_from(TimesheetEntry)\
     .join(Timesheet, TimesheetEntry.timesheet_id == Timesheet.id)\
     .join(StaffEmployee, Timesheet.employee_id == StaffEmployee.id)\
     .join(Project, Timesheet.project_id == Project.id)\
     .filter(Timesheet.company_id == company_id)\
     .order_by(TimesheetEntry.entry_date.desc())\
     .all()
    
    response = []
    for entry, emp_name, emp_id, proj_name in results:
        response.append({
            "id": str(entry.id),
            "timesheet_id": str(entry.timesheet_id),
            "entry_date": entry.entry_date.isoformat(),
            "hours": float(entry.hours),
            "activity_description": entry.activity_description,
            "employee_name": emp_name,
            "employee_id": str(emp_id),
            "project_name": proj_name,
            "start_time": entry.start_time.isoformat() if entry.start_time else None,
            "end_time": entry.end_time.isoformat() if entry.end_time else None,
            "duration": entry.duration
        })
    return response


@router.patch("/timesheets/{ts_id}/submit", response_model=TimesheetResponse)
def submit_timesheet(ts_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    project = db.query(Project).filter(Project.id == ts.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Timesheet's project not found")
    get_company_membership(db, current_user, project.company_id)
    if ts.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft timesheets can be submitted")
    ts.status = "submitted"
    db.commit()
    db.refresh(ts)
    return ts


@router.patch("/timesheets/{ts_id}/approve", response_model=TimesheetResponse)
def approve_timesheet(ts_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    project = db.query(Project).filter(Project.id == ts.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Timesheet's project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "attendance:approve")
    if ts.status != "submitted":
        raise HTTPException(status_code=400, detail="Only submitted timesheets can be approved")
    ts.status = "approved"
    db.commit()
    db.refresh(ts)
    return ts


@router.delete("/timesheets/{ts_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_timesheet(ts_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a weekly timesheet. Tenant-scoped: the caller must belong to the
    timesheet's company, and the deletion is written to the DeleteLog audit trail.

    Timesheet has no company_id column of its own; tenancy is resolved via
    its project (same relationship list_company_timesheet_entries joins
    through)."""
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    project = db.query(Project).filter(Project.id == ts.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Timesheet's project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "data:delete")
    from app.routers.delete_logs import log_deletion
    log_deletion(db, project.company_id, "timesheet", ts.id, f"Timesheet {ts.id}")
    db.delete(ts)
    db.commit()


# ─── Payroll Engine ──────────────────────────────────────────────────────────

def _compute_payslip(emp: StaffEmployee, days_present: float, days_in_month: int, overtime_hours: float = 0.0) -> dict:
    """
    Compute one employee's payslip.

    Gross = (Basic + HRA + OtherAllowances) * ratio + OvertimePay, where the
    pro-rata ratio is capped at 1.0 so attendance above days_in_month never
    pays more than one full month (R2-354).
    PF employee  = Basic * pf_employee_pct%   (on prorated basic)
    PF employer  = Basic * pf_employer_pct%
    ESI employee = Gross * esi_employee_pct%  (only if is_esi_applicable)
    ESI employer = Gross * esi_employer_pct%
    TDS          = tds_monthly (fixed, not prorated)
    Net          = Gross - PF_emp - ESI_emp - TDS
    """
    # R2-354: cap the pro-rata at one full month. days_in_month defaults to 26
    # (the payroll convention) while days_present counts calendar attendance,
    # so an uncapped ratio pays up to ~115% for a fully attended month.
    ratio = min(1.0, days_present / days_in_month) if days_in_month > 0 else 0
    full_gross = float(emp.basic_salary) + float(emp.hra) + float(emp.other_allowances)
    
    # Overtime Calculation
    ot_rate = (float(emp.basic_salary) / days_in_month / 8.0) * 1.5 if days_in_month > 0 else 0.0
    ot_amount = round(float(overtime_hours) * ot_rate, 2)

    gross = round(full_gross * ratio, 2) + ot_amount
    basic_pro = round(float(emp.basic_salary) * ratio, 2)

    pf_emp = round(basic_pro * float(emp.pf_employee_pct) / 100, 2)
    pf_er  = round(basic_pro * float(emp.pf_employer_pct) / 100, 2)

    if emp.is_esi_applicable and (full_gross + ot_amount) <= ESI_GROSS_WAGE_CEILING:
        esi_emp = round(gross * float(emp.esi_employee_pct) / 100, 2)
        esi_er  = round(gross * float(emp.esi_employer_pct) / 100, 2)
    else:
        esi_emp = esi_er = 0.0

    tds = float(emp.tds_monthly)
    total_ded = round(pf_emp + esi_emp + tds, 2)
    net = round(gross - total_ded, 2)

    return {
        "days_present": days_present,
        "days_in_month": days_in_month,
        "gross_salary": gross,
        "basic": basic_pro,
        "hra": round(float(emp.hra) * ratio, 2),
        "other_allowances": round(float(emp.other_allowances) * ratio, 2),
        "overtime_amount": ot_amount,
        "pf_employee": pf_emp,
        "pf_employer": pf_er,
        "esi_employee": esi_emp,
        "esi_employer": esi_er,
        "tds": tds,
        "advance_recovery": 0.0,
        "other_deductions": 0.0,
        "total_deductions": total_ded,
        "net_payable": net,
    }


@router.post("/payroll/run", response_model=PayrollRunResponse, status_code=status.HTTP_201_CREATED)
def run_payroll(payload: PayrollRunCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """
    Triggers a monthly payroll run for all active employees in the project.
    Days present is determined by counting AttendanceLog records for that month with status 'Present' or 'Present (Off-Site)'.
    """
    get_company_membership(db, current_user, payload.company_id)
    require_permission(db, current_user, payload.company_id, "payroll:run")
    # Parse month boundaries
    # R2-220: attendance_date is aware on Postgres, so the month bounds must
    # be aware UTC too or the SQL comparison errors out.
    year, month = map(int, payload.payroll_month.split("-"))
    month_start = datetime(year, month, 1, tzinfo=timezone.utc)
    month_end = datetime(year, month + 1, 1, tzinfo=timezone.utc) if month < 12 else datetime(year + 1, 1, 1, tzinfo=timezone.utc)

    # Fetch active employees
    query = db.query(StaffEmployee).filter(
        StaffEmployee.company_id == payload.company_id,
        StaffEmployee.status == "active"
    )
    if payload.project_id:
        query = query.filter(StaffEmployee.project_id == payload.project_id)
    employees = query.all()

    if not employees:
        raise HTTPException(status_code=400, detail="No active employees found for the given company/project")

    run = PayrollRun(
        company_id=payload.company_id,
        project_id=payload.project_id,
        payroll_month=payload.payroll_month,
        status="draft",
    )
    db.add(run)
    db.flush()

    payslips = []
    for emp in employees:
        # Count attendance days this month
        att_count = db.query(AttendanceLog).filter(
            AttendanceLog.employee_id == emp.id,
            AttendanceLog.attendance_date >= month_start,
            AttendanceLog.attendance_date < month_end,
            AttendanceLog.status.in_(["Present", "Present (Off-Site)"])
        ).count()

        # Sum overtime hours this month
        total_ot = db.query(func.sum(AttendanceLog.overtime_hours)).filter(
            AttendanceLog.employee_id == emp.id,
            AttendanceLog.attendance_date >= month_start,
            AttendanceLog.attendance_date < month_end
        ).scalar() or 0.0

        # Handle joining mid-month
        if emp.date_of_joining:
            # R2-220: keep the same flavor as the now-aware month bounds.
            joining_date = _aware_utc(emp.date_of_joining)
            if joining_date > month_start:
                if joining_date < month_end:
                    days_remaining = (month_end - joining_date).days
                    default_days = min(float(days_remaining), float(payload.days_in_month))
                else:
                    default_days = 0.0
            else:
                default_days = float(payload.days_in_month)
        else:
            default_days = float(payload.days_in_month)

        # Add approved, PAID leave days to attendance so leave isn't under-counted.
        # Mirror the name-matching convention used by get_leave_balances; also
        # match the new employee_id FK when populated. Only templated paid leave
        # types (casual/sick/earned) count — any other leave_type value is left
        # out pending a founder decision on paid-vs-unpaid handling.
        PAID_LEAVE_TYPES = {"casual", "sick", "earned"}
        approved_leaves = db.query(LeaveRequest).filter(
            LeaveRequest.company_id == payload.company_id,
            LeaveRequest.status == "Approved",
            (LeaveRequest.employee_id == emp.id) | (func.lower(LeaveRequest.employee_name) == emp.name.lower()),
            LeaveRequest.start_date < month_end,
            LeaveRequest.end_date >= month_start,
        ).all()
        approved_leave_days = 0.0
        for lr in approved_leaves:
            if (lr.leave_type or "").strip().lower() in PAID_LEAVE_TYPES:
                approved_leave_days += float(lr.days_count or 0.0)

        days_present = float(att_count + approved_leave_days) if (att_count + approved_leave_days) > 0 else default_days

        calc = _compute_payslip(emp, days_present, payload.days_in_month, float(total_ot))
        line = PayrollLineItem(
            payroll_run_id=run.id,
            employee_id=emp.id,
            **{k: (v if isinstance(v, int) else Decimal(str(v))) for k, v in calc.items()}
        )
        db.add(line)
        payslips.append({"employee_id": emp.id, "employee_name": emp.name, **calc})

    # Aggregate totals
    run.total_gross = Decimal(str(round(sum(p["gross_salary"] for p in payslips), 2)))
    run.total_deductions = Decimal(str(round(sum(p["total_deductions"] for p in payslips), 2)))
    run.total_net = Decimal(str(round(sum(p["net_payable"] for p in payslips), 2)))
    run.status = "finalized"

    db.commit()
    db.refresh(run)

    return {
        "id": run.id,
        "company_id": run.company_id,
        "project_id": run.project_id,
        "payroll_month": run.payroll_month,
        "status": run.status,
        "total_gross": float(run.total_gross),
        "total_deductions": float(run.total_deductions),
        "total_net": float(run.total_net),
        "created_at": run.created_at,
        "payslips": [
            {
                "id": str(uuid.uuid4()),
                "payroll_run_id": str(run.id),
                "employee_id": str(p["employee_id"]),
                "employee_name": p["employee_name"],
                **{k: v for k, v in p.items() if k not in ("employee_id", "employee_name")}
            }
            for p in payslips
        ]
    }


@router.get("/payroll/{run_id}/payslips")
def get_payslips(run_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    get_company_membership(db, current_user, run.company_id)
    require_module_view(db, current_user, run.company_id, "payroll")
    lines = db.query(PayrollLineItem).filter(PayrollLineItem.payroll_run_id == run_id).all()
    result = []
    for line in lines:
        emp = db.query(StaffEmployee).filter(StaffEmployee.id == line.employee_id).first()
        result.append({
            "id": str(line.id),
            "employee_id": str(line.employee_id),
            "employee_name": emp.name if emp else "Unknown",
            "employee_designation": emp.designation if emp else "",
            "days_present": float(line.days_present),
            "days_in_month": line.days_in_month,
            "gross_salary": float(line.gross_salary),
            "basic": float(line.basic),
            "hra": float(line.hra),
            "other_allowances": float(line.other_allowances),
            "pf_employee": float(line.pf_employee),
            "pf_employer": float(line.pf_employer),
            "esi_employee": float(line.esi_employee),
            "esi_employer": float(line.esi_employer),
            "tds": float(line.tds),
            "advance_recovery": float(line.advance_recovery),
            "total_deductions": float(line.total_deductions),
            "net_payable": float(line.net_payable),
        })
    return result


@router.get("/payroll/{run_id}/payslips/export")
def export_payslips_csv(run_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Export one row per PayrollLineItem as a CSV attachment.

    Payroll is sensitive finance data, so this is tenant-guarded and gated by the
    payroll module view permission (same as GET /payroll/{run_id}/payslips). Read-only.
    """
    run = db.query(PayrollRun).filter(PayrollRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Payroll run not found")
    get_company_membership(db, current_user, run.company_id)
    require_module_view(db, current_user, run.company_id, "payroll")

    lines = db.query(PayrollLineItem).filter(PayrollLineItem.payroll_run_id == run_id).all()

    columns = [
        "Employee Code", "Employee Name", "Designation", "Days Present", "Days In Month",
        "Gross", "PF Employee", "PF Employer", "ESI Employee", "ESI Employer",
        "TDS", "Advance Recovery", "Other Deductions", "Total Deductions", "Net Pay",
    ]

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(columns)
    for line in lines:
        emp = db.query(StaffEmployee).filter(StaffEmployee.id == line.employee_id).first()
        writer.writerow([
            (emp.employee_code if (emp and emp.employee_code) else (str(line.employee_id)[:8].upper() if emp else "Unknown")),
            emp.name if emp else "Unknown",
            emp.designation if (emp and emp.designation) else "",
            float(line.days_present),
            line.days_in_month,
            float(line.gross_salary),
            float(line.pf_employee),
            float(line.pf_employer),
            float(line.esi_employee),
            float(line.esi_employer),
            float(line.tds),
            float(line.advance_recovery),
            float(line.other_deductions),
            float(line.total_deductions),
            float(line.net_payable),
        ])
    csv_text = buf.getvalue()
    filename = f"payslips-{run.payroll_month}-{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/payroll/latest/{company_id}")
def latest_payroll_run(company_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return the most recent PayrollRun for a company so the frontend can resolve a run to export.

    Returns {run_id, payroll_month} or {run_id: null, payroll_month: null} when no run exists yet.
    Tenant-guarded and gated by the payroll module view permission.
    """
    get_company_membership(db, current_user, company_id)
    require_module_view(db, current_user, company_id, "payroll")
    run = (
        db.query(PayrollRun)
        .filter(PayrollRun.company_id == company_id)
        .order_by(PayrollRun.created_at.desc())
        .first()
    )
    if not run:
        return {"run_id": None, "payroll_month": None}
    return {"run_id": str(run.id), "payroll_month": run.payroll_month}


from pydantic import BaseModel

class LeaveRequestCreate(BaseModel):
    project_id: Optional[uuid.UUID] = None
    employee_id: Optional[uuid.UUID] = None
    employee_name: str
    leave_type: str
    start_date: datetime
    end_date: datetime
    days_count: float = Field(..., ge=0)

class LeaveRequestResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
    employee_id: Optional[uuid.UUID] = None
    employee_name: str
    leave_type: str
    start_date: datetime
    end_date: datetime
    days_count: float
    status: str
    applied_on: datetime

    class Config:
        from_attributes = True

class LeaveStatusUpdate(BaseModel):
    status: str


@router.get("/leaves/{company_id}", response_model=List[LeaveRequestResponse])
def list_leaves(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(LeaveRequest).filter(LeaveRequest.company_id == company_id).all()


@router.post("/leaves/{company_id}", response_model=LeaveRequestResponse)
def create_leave_request(company_id: uuid.UUID, data: LeaveRequestCreate, db: Session = Depends(get_db),     _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    if data.project_id:
        verify_project_in_company(db, data.project_id, company_id)
    new_leave = LeaveRequest(
        company_id=company_id,
        project_id=data.project_id,
        employee_id=data.employee_id,
        employee_name=data.employee_name,
        leave_type=data.leave_type,
        start_date=data.start_date,
        end_date=data.end_date,
        days_count=data.days_count
    )
    db.add(new_leave)
    db.commit()
    db.refresh(new_leave)
    return new_leave


@router.put("/leaves/approve/{leave_id}", response_model=LeaveRequestResponse)
def update_leave_status(leave_id: uuid.UUID, data: LeaveStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    get_company_membership(db, current_user, leave.company_id)
    require_permission(db, current_user, leave.company_id, "payroll:edit")

    leave.status = data.status
    db.commit()
    db.refresh(leave)
    return leave


@router.post("/payroll/upload")
def upload_payroll(
    company_id: uuid.UUID = Form(...),
    project_id: Optional[uuid.UUID] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    # company_id here comes from multipart form data (not the URL path/query),
    # so it can't share a value with a plain Depends(verify_company_access)
    # sub-dependency; verify membership inline instead.
    get_company_membership(db, current_user, company_id)
    require_permission(db, current_user, company_id, "payroll:edit")
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
    
    if 'Name' not in headers:
        raise HTTPException(status_code=400, detail="Invalid CSV schema: 'Name' column is required")
        
    created_count = 0
    updated_count = 0
    
    for row_cells in csv_reader:
        if not row_cells or not any(row_cells):
            continue
            
        row = {}
        for idx, header in enumerate(headers):
            if idx < len(row_cells):
                row[header] = row_cells[idx].strip()
                
        name = row.get("Name")
        if not name:
            continue
            
        def to_float(val, default=0.0):
            try:
                return float(val) if val else default
            except ValueError:
                return default
                
        basic_salary = to_float(row.get("Basic"))
        hra = 0.0
        other_allowances = to_float(row.get("Fixed Allowance"))
        
        for prefix in ["A1", "A2", "A3"]:
            allow_name = row.get(f"Allowance Name ({prefix})", "")
            allow_amt = to_float(row.get(f"{prefix} Amount"))
            if "hra" in allow_name.lower():
                hra += allow_amt
            elif allow_name:
                other_allowances += allow_amt
                
        tds_monthly = 0.0
        for prefix in ["D1", "D2"]:
            ded_name = row.get(f"Deduction Name ({prefix})", "")
            ded_amt = to_float(row.get(f"{prefix} Amount"))
            if "tds" in ded_name.lower() or "tax" in ded_name.lower():
                tds_monthly += ded_amt
                
        designation = row.get("Designation")
        department = row.get("Cost Code")
        mobile = None
        
        emp = db.query(StaffEmployee).filter(
            StaffEmployee.company_id == company_id,
            StaffEmployee.name == name
        ).first()
        
        if emp:
            emp.designation = designation or emp.designation
            emp.department = department or emp.department
            emp.basic_salary = basic_salary
            emp.hra = hra
            emp.other_allowances = other_allowances
            emp.tds_monthly = tds_monthly
            if project_id:
                emp.project_id = project_id
            updated_count += 1
        else:
            emp = StaffEmployee(
                id=uuid.uuid4(),
                company_id=company_id,
                project_id=project_id,
                name=name,
                employee_code=f"EMP-{uuid.uuid4().hex[:6].upper()}",
                designation=designation,
                department=department,
                mobile=mobile,
                basic_salary=basic_salary,
                hra=hra,
                other_allowances=other_allowances,
                tds_monthly=tds_monthly,
                status="active"
            )
            db.add(emp)
            created_count += 1
            
    db.commit()
    
    return {
        "status": "success",
        "created": created_count,
        "updated": updated_count
    }


# ─── Company-scoped HR (Payroll tab) ────────────────────────────────────────

class EmployeeUpdate(BaseModel):
    designation: Optional[str] = None
    department: Optional[str] = None
    mobile: Optional[str] = None
    basic_salary: Optional[float] = Field(None, ge=0)
    hra: Optional[float] = Field(None, ge=0)
    other_allowances: Optional[float] = Field(None, ge=0)
    tds_monthly: Optional[float] = Field(None, ge=0)
    status: Optional[str] = None
    date_of_joining: Optional[datetime] = None


@router.get("/company/employees/{company_id}", response_model=List[EmployeeResponse])
def list_company_employees(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    """Company-wide active employee list (Payroll → People tab)."""
    require_module_view(db, current_user, company_id, "payroll")
    return db.query(StaffEmployee).filter(
        StaffEmployee.company_id == company_id,
        StaffEmployee.status == "active"
    ).all()


@router.put("/employees/{employee_id}", response_model=EmployeeResponse)
def update_employee(employee_id: uuid.UUID, payload: EmployeeUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(StaffEmployee).filter(StaffEmployee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    get_company_membership(db, current_user, emp.company_id)
    require_permission(db, current_user, emp.company_id, "payroll:edit")
    updates = payload.model_dump(exclude_unset=True)
    for k, v in updates.items():
        setattr(emp, k, v)
    if {"basic_salary", "hra", "other_allowances"} & updates.keys():
        # Pay changed: re-derive ESI eligibility from the new gross wages
        # instead of freezing the verdict captured at creation.
        emp.is_esi_applicable = _esi_applicable(float(emp.basic_salary), float(emp.hra), float(emp.other_allowances))
    db.commit()
    db.refresh(emp)
    return emp


# ─── Designations (company-scoped lookup) ───────────────────────────────────

class DesignationResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class DesignationCreate(BaseModel):
    name: str


@router.get("/designations/{company_id}", response_model=List[DesignationResponse])
def list_designations(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(Designation).filter(Designation.company_id == company_id).order_by(Designation.name).all()


@router.post("/designations/{company_id}", response_model=DesignationResponse, status_code=status.HTTP_201_CREATED)
def create_designation(company_id: uuid.UUID, payload: DesignationCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    require_permission(db, current_user, company_id, "payroll:edit")
    obj = Designation(company_id=company_id, name=payload.name)
    db.add(obj)
    db.commit()
    return obj


# ─── Leave Templates (company-scoped policy) ────────────────────────────────

class LeaveTypeQuota(BaseModel):
    type: str
    days: float = Field(..., ge=0)


class LeaveTemplateResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    casual_leave_days: float
    sick_leave_days: float
    earned_leave_days: float
    leave_types: List[LeaveTypeQuota] = []
    created_at: datetime

    class Config:
        from_attributes = True


class LeaveTemplateCreate(BaseModel):
    name: str
    casual_leave_days: float = Field(0.0, ge=0)
    sick_leave_days: float = Field(0.0, ge=0)
    earned_leave_days: float = Field(0.0, ge=0)
    leave_types: List[LeaveTypeQuota] = []


class LeaveTemplateUpdate(BaseModel):
    name: Optional[str] = None
    casual_leave_days: Optional[float] = Field(None, ge=0)
    sick_leave_days: Optional[float] = Field(None, ge=0)
    earned_leave_days: Optional[float] = Field(None, ge=0)
    leave_types: Optional[List[LeaveTypeQuota]] = None


@router.get("/leave-templates/{company_id}", response_model=List[LeaveTemplateResponse])
def list_leave_templates(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(LeaveTemplate).filter(LeaveTemplate.company_id == company_id).order_by(LeaveTemplate.name).all()


@router.post("/leave-templates/{company_id}", response_model=LeaveTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_leave_template(company_id: uuid.UUID, payload: LeaveTemplateCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    require_permission(db, current_user, company_id, "payroll:edit")
    obj = LeaveTemplate(company_id=company_id, **payload.model_dump())
    db.add(obj)
    db.commit()
    return obj


@router.put("/leave-templates/{leave_template_id}", response_model=LeaveTemplateResponse)
def update_leave_template(leave_template_id: uuid.UUID, payload: LeaveTemplateUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(LeaveTemplate).filter(LeaveTemplate.id == leave_template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Leave template not found")
    get_company_membership(db, current_user, obj.company_id)
    require_permission(db, current_user, obj.company_id, "payroll:edit")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/leave-templates/{leave_template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_leave_template(leave_template_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(LeaveTemplate).filter(LeaveTemplate.id == leave_template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Leave template not found")
    get_company_membership(db, current_user, obj.company_id)
    require_permission(db, current_user, obj.company_id, "data:delete")
    from app.routers.delete_logs import log_deletion
    log_deletion(db, obj.company_id, "leave_template", obj.id, f"Leave Template: {obj.name}")
    db.delete(obj)
    db.commit()


# ─── Payroll Profiles (per-employee detail + salary breakup) ────────────────

class PayrollProfileResponse(BaseModel):
    id: uuid.UUID
    employee_id: uuid.UUID
    company_id: uuid.UUID
    salary_amount: float
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    shift_hours: float
    overtime_rate: float
    cost_code: Optional[str] = None
    leave_template_id: Optional[uuid.UUID] = None
    salary_breakup: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True


class PayrollProfileUpdate(BaseModel):
    salary_amount: Optional[float] = Field(None, ge=0)
    shift_start: Optional[str] = None
    shift_end: Optional[str] = None
    shift_hours: Optional[float] = Field(None, ge=0, le=24)
    overtime_rate: Optional[float] = Field(None, ge=0)
    cost_code: Optional[str] = None
    leave_template_id: Optional[uuid.UUID] = None
    salary_breakup: Optional[str] = None


def _to_decimal(val):
    return Decimal(str(val)) if val is not None else None


@router.get("/payroll-profiles/{employee_id}", response_model=PayrollProfileResponse)
def get_payroll_profile(employee_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    prof = db.query(PayrollProfile).filter(PayrollProfile.employee_id == employee_id).first()
    if not prof:
        raise HTTPException(status_code=404, detail="Payroll profile not found")
    get_company_membership(db, current_user, prof.company_id)
    require_module_view(db, current_user, prof.company_id, "payroll")
    return prof


@router.put("/payroll-profiles/{employee_id}", response_model=PayrollProfileResponse)
def upsert_payroll_profile(employee_id: uuid.UUID, payload: PayrollProfileUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emp = db.query(StaffEmployee).filter(StaffEmployee.id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    get_company_membership(db, current_user, emp.company_id)
    require_permission(db, current_user, emp.company_id, "payroll:edit")
    prof = db.query(PayrollProfile).filter(PayrollProfile.employee_id == employee_id).first()
    data = payload.model_dump(exclude_unset=True)
    if not prof:
        prof = PayrollProfile(
            employee_id=employee_id,
            company_id=emp.company_id,
            salary_amount=Decimal("0.0"),
            shift_hours=Decimal("8.0"),
            overtime_rate=Decimal("0.0"),
        )
        db.add(prof)
        db.flush()
    for k, v in data.items():
        if v is None:
            continue
        if k in ("salary_amount", "shift_hours", "overtime_rate"):
            setattr(prof, k, _to_decimal(v))
        else:
            setattr(prof, k, v)
    db.commit()
    return prof


# ─── Leave Balances (per-employee, per-assigned template) ───────────────────

class LeaveTypeBalance(BaseModel):
    entitled: float = 0.0
    used: float = 0.0
    balance: float = 0.0


class EmployeeLeaveBalance(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    designation: Optional[str] = None
    template_source: str  # "assigned" | "company_default" | "none"
    casual: LeaveTypeBalance = LeaveTypeBalance()
    sick: LeaveTypeBalance = LeaveTypeBalance()
    earned: LeaveTypeBalance = LeaveTypeBalance()


class LeaveBalancesResponse(BaseModel):
    company_id: uuid.UUID
    as_of: str
    leave_year: str
    company_has_templates: bool
    employees: List[EmployeeLeaveBalance] = []


@router.get("/leave-balances/{company_id}", response_model=LeaveBalancesResponse)
def get_leave_balances(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: None = Depends(verify_company_access),
    current_user: User = Depends(get_current_user),
):
    """Per-employee leave balances for a company.

    Entitlement comes from the LeaveTemplate assigned to the employee via their
    PayrollProfile.leave_template_id. If the employee has no profile or no
    template assigned, the company's first LeaveTemplate is used as a fallback;
    if the company has no templates at all, entitlement is 0 and the response
    flags company_has_templates=False so the UI can prompt configuration.

    Used days are the SUM of Approved LeaveRequest days matched to the employee
    by name (case-insensitive) for the current leave year (calendar year).
    Balance can go negative when an employee has over-taken their entitlement.
    """
    require_module_view(db, current_user, company_id, "payroll")

    now = datetime.utcnow()
    leave_year = str(now.year)
    year_start = datetime(now.year, 1, 1)

    employees = (
        db.query(StaffEmployee)
        .filter(StaffEmployee.company_id == company_id, StaffEmployee.status == "active")
        .order_by(StaffEmployee.name)
        .all()
    )

    templates = (
        db.query(LeaveTemplate)
        .filter(LeaveTemplate.company_id == company_id)
        .order_by(LeaveTemplate.created_at)
        .all()
    )
    company_default = templates[0] if templates else None
    template_by_id = {t.id: t for t in templates}

    profiles = (
        db.query(PayrollProfile)
        .filter(PayrollProfile.company_id == company_id)
        .all()
    )
    profile_by_emp = {p.employee_id: p for p in profiles}

    approved = (
        db.query(
            LeaveRequest.employee_id,
            func.lower(LeaveRequest.employee_name).label("ename"),
            func.lower(LeaveRequest.leave_type).label("ltype"),
            func.sum(LeaveRequest.days_count),
        )
        .filter(
            LeaveRequest.company_id == company_id,
            LeaveRequest.status == "Approved",
            LeaveRequest.start_date >= year_start,
        )
        .group_by(
            LeaveRequest.employee_id,
            func.lower(LeaveRequest.employee_name),
            func.lower(LeaveRequest.leave_type),
        )
        .all()
    )
    used_by_emp_id: dict = {}
    used_by_name: dict = {}
    for emp_id, ename, ltype, total in approved:
        if emp_id is not None:
            used_by_emp_id.setdefault(emp_id, {})[ltype] = float(total or 0.0)
        else:
            used_by_name.setdefault(ename, {})[ltype] = float(total or 0.0)

    result_employees = []
    for emp in employees:
        prof = profile_by_emp.get(emp.id)
        template = None
        template_source = "none"
        if prof and prof.leave_template_id and prof.leave_template_id in template_by_id:
            template = template_by_id[prof.leave_template_id]
            template_source = "assigned"
        elif company_default is not None:
            template = company_default
            template_source = "company_default"

        entitled = {"casual": 0.0, "sick": 0.0, "earned": 0.0}
        if template is not None:
            entitled["casual"] = float(template.casual_leave_days or 0.0)
            entitled["sick"] = float(template.sick_leave_days or 0.0)
            entitled["earned"] = float(template.earned_leave_days or 0.0)

        used = used_by_emp_id.get(emp.id)
        if used is None:
            used = used_by_name.get(emp.name.lower(), {})

        def balance_for(key: str) -> LeaveTypeBalance:
            ent = entitled[key]
            usd = float(used.get(key, 0.0))
            return LeaveTypeBalance(
                entitled=round(ent, 2),
                used=round(usd, 2),
                balance=round(ent - usd, 2),
            )

        result_employees.append(
            EmployeeLeaveBalance(
                employee_id=emp.id,
                employee_name=emp.name,
                designation=emp.designation,
                template_source=template_source,
                casual=balance_for("casual"),
                sick=balance_for("sick"),
                earned=balance_for("earned"),
            )
        )

    return LeaveBalancesResponse(
        company_id=company_id,
        as_of=now.strftime("%Y-%m-%d"),
        leave_year=leave_year,
        company_has_templates=bool(templates),
        employees=result_employees,
    )


# ─── Holidays (company-scoped calendar) ─────────────────────────────────────

class HolidayResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    name: str
    date: datetime
    created_at: datetime

    class Config:
        from_attributes = True


class HolidayCreate(BaseModel):
    name: str
    date: datetime


class HolidayUpdate(BaseModel):
    name: Optional[str] = None
    date: Optional[datetime] = None


@router.get("/holidays/{company_id}", response_model=List[HolidayResponse])
def list_holidays(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(Holiday).filter(Holiday.company_id == company_id).order_by(Holiday.date).all()


@router.post("/holidays/{company_id}", response_model=HolidayResponse, status_code=status.HTTP_201_CREATED)
def create_holiday(company_id: uuid.UUID, payload: HolidayCreate, db: Session = Depends(get_db), _: None = Depends(verify_company_access), current_user: User = Depends(get_current_user)):
    require_permission(db, current_user, company_id, "payroll:edit")
    # R2-220: pin the calendar date at UTC midnight so a tz-offset input
    # cannot shift the holiday to the previous day on Postgres.
    obj = Holiday(company_id=company_id, name=payload.name, date=_utc_midnight(payload.date))
    db.add(obj)
    db.commit()
    return obj


@router.put("/holidays/{holiday_id}", response_model=HolidayResponse)
def update_holiday(holiday_id: uuid.UUID, payload: HolidayUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Holiday not found")
    get_company_membership(db, current_user, obj.company_id)
    require_permission(db, current_user, obj.company_id, "payroll:edit")
    for k, v in payload.model_dump(exclude_unset=True).items():
        # R2-220: same UTC-midnight pinning on update.
        if k == "date" and v is not None:
            v = _utc_midnight(v)
        setattr(obj, k, v)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/holidays/{holiday_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_holiday(holiday_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    obj = db.query(Holiday).filter(Holiday.id == holiday_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Holiday not found")
    get_company_membership(db, current_user, obj.company_id)
    require_permission(db, current_user, obj.company_id, "data:delete")
    from app.routers.delete_logs import log_deletion
    log_deletion(db, obj.company_id, "holiday", obj.id, f"Holiday: {obj.name}")
    db.delete(obj)
    db.commit()


# ─── Company-wide attendance ─────────────────────────────────────────────────

class CompanyAttendanceResponse(BaseModel):
    employee_id: uuid.UUID
    employee_name: str
    attendance_date: datetime
    punch_in: Optional[datetime]
    punch_out: Optional[datetime]
    status: str
    hours_worked: Optional[float]
    overtime_hours: float
    is_within_geofence: bool

    class Config:
        from_attributes = True


@router.get("/attendance/company/{company_id}/{date_str}", response_model=List[CompanyAttendanceResponse])
def company_attendance(company_id: uuid.UUID, date_str: str, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    """Company-wide attendance rollup for a single day (Payroll → Attendance tab)."""
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="date_str must be YYYY-MM-DD")
    next_day = target + timedelta(days=1)
    results = (
        db.query(AttendanceLog, StaffEmployee.name.label("employee_name"))
        .join(StaffEmployee, AttendanceLog.employee_id == StaffEmployee.id)
        .filter(
            StaffEmployee.company_id == company_id,
            AttendanceLog.attendance_date >= target,
            AttendanceLog.attendance_date < next_day,
        )
        .order_by(StaffEmployee.name)
        .all()
    )
    response = []
    for log, emp_name in results:
        res = CompanyAttendanceResponse.model_validate(log)
        res.employee_name = emp_name
        response.append(res)
    return response

