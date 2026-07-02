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

import math
import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.models import (
    StaffEmployee, AttendanceLog, Timesheet,
    TimesheetEntry, PayrollRun, PayrollLineItem, Project, LeaveRequest
)

router = APIRouter(prefix="/hr", tags=["HR, Attendance & Payroll"])


# ─── Helpers ─────────────────────────────────────────────────────────────────

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
    basic_salary: float = 0.0
    hra: float = 0.0
    other_allowances: float = 0.0
    pf_employee_pct: float = 12.0
    pf_employer_pct: float = 12.0
    esi_employee_pct: float = 0.75
    esi_employer_pct: float = 3.25
    tds_monthly: float = 0.0
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
def create_employee(payload: EmployeeCreate, db: Session = Depends(get_db)):
    emp = StaffEmployee(**payload.model_dump())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.get("/employees/{project_id}", response_model=List[EmployeeResponse])
def list_employees(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(StaffEmployee).filter(
        StaffEmployee.project_id == project_id,
        StaffEmployee.status == "active"
    ).all()


# ─── Attendance / Geofence ───────────────────────────────────────────────────

@router.post("/attendance/punch", response_model=AttendanceResponse, status_code=status.HTTP_201_CREATED)
def punch(payload: PunchRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    site_lat, site_lng = _parse_site_coords(project.location)
    radius = project.attendance_radius_meters or 500

    distance_m: Optional[float] = None
    within_geofence = False
    if site_lat is not None:
        distance_m = round(haversine_distance_m(payload.lat, payload.lng, site_lat, site_lng), 2)
        within_geofence = distance_m <= radius
    else:
        # No site coords configured → allow punch without GPS enforcement
        within_geofence = True

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

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
            attendance_date=datetime.utcnow(),
            punch_in=datetime.utcnow(),
            lat_in=Decimal(str(payload.lat)),
            lng_in=Decimal(str(payload.lng)),
            distance_from_site_m=Decimal(str(distance_m)) if distance_m is not None else None,
            is_within_geofence=within_geofence,
            status="Present" if within_geofence else "Present (Off-Site)",
            shift_multiplier=Decimal(str(payload.shift_multiplier or 1.0)),
            location_verified=payload.location_verified if payload.location_verified is not None else True,
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

        now = datetime.utcnow()
        log.punch_out = now
        log.lat_out = Decimal(str(payload.lat))
        log.lng_out = Decimal(str(payload.lng))

        if payload.shift_multiplier is not None:
            log.shift_multiplier = Decimal(str(payload.shift_multiplier))
        if payload.location_verified is not None:
            log.location_verified = payload.location_verified

        # Compute hours worked
        if log.punch_in:
            delta = (now - log.punch_in).total_seconds() / 3600
            log.hours_worked = Decimal(str(round(delta, 2)))
            # Overtime = hours beyond 8
            ot = max(0.0, delta - 8.0)
            log.overtime_hours = Decimal(str(round(ot, 2)))

        db.commit()
        db.refresh(log)
        return log


@router.get("/attendance/{project_id}/{date_str}", response_model=List[AttendanceResponse])
def daily_attendance(project_id: uuid.UUID, date_str: str, db: Session = Depends(get_db)):
    try:
        target = datetime.strptime(date_str, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="date_str must be YYYY-MM-DD")
    next_day = datetime(target.year, target.month, target.day + 1) if target.day < 28 else datetime(target.year, target.month + 1 if target.month < 12 else 1, 1)
    return db.query(AttendanceLog).filter(
        AttendanceLog.project_id == project_id,
        AttendanceLog.attendance_date >= target,
        AttendanceLog.attendance_date < next_day
    ).all()


# ─── Timesheets ──────────────────────────────────────────────────────────────

@router.post("/timesheets", response_model=TimesheetResponse, status_code=status.HTTP_201_CREATED)
def create_timesheet(payload: TimesheetCreate, db: Session = Depends(get_db)):
    ts = Timesheet(**payload.model_dump())
    db.add(ts)
    db.commit()
    db.refresh(ts)
    return ts


@router.post("/timesheets/{ts_id}/entries", status_code=status.HTTP_201_CREATED)
def add_timesheet_entry(ts_id: uuid.UUID, payload: TimesheetEntryCreate, db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if ts.status not in ("draft", "rejected"):
        raise HTTPException(status_code=400, detail=f"Cannot add entries to timesheet in status '{ts.status}'")

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
def list_project_timesheet_entries(project_id: uuid.UUID, db: Session = Depends(get_db)):
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


@router.patch("/timesheets/{ts_id}/submit", response_model=TimesheetResponse)
def submit_timesheet(ts_id: uuid.UUID, db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if ts.status != "draft":
        raise HTTPException(status_code=400, detail="Only draft timesheets can be submitted")
    ts.status = "submitted"
    db.commit()
    db.refresh(ts)
    return ts


@router.patch("/timesheets/{ts_id}/approve", response_model=TimesheetResponse)
def approve_timesheet(ts_id: uuid.UUID, db: Session = Depends(get_db)):
    ts = db.query(Timesheet).filter(Timesheet.id == ts_id).first()
    if not ts:
        raise HTTPException(status_code=404, detail="Timesheet not found")
    if ts.status != "submitted":
        raise HTTPException(status_code=400, detail="Only submitted timesheets can be approved")
    ts.status = "approved"
    db.commit()
    db.refresh(ts)
    return ts


# ─── Payroll Engine ──────────────────────────────────────────────────────────

def _compute_payslip(emp: StaffEmployee, days_present: float, days_in_month: int, overtime_hours: float = 0.0) -> dict:
    """
    Compute one employee's payslip.

    Gross = (Basic + HRA + OtherAllowances) * (days_present / days_in_month) + OvertimePay
    PF employee  = Basic * pf_employee_pct%   (on prorated basic)
    PF employer  = Basic * pf_employer_pct%
    ESI employee = Gross * esi_employee_pct%  (only if is_esi_applicable)
    ESI employer = Gross * esi_employer_pct%
    TDS          = tds_monthly (fixed, not prorated)
    Net          = Gross - PF_emp - ESI_emp - TDS
    """
    ratio = days_present / days_in_month if days_in_month > 0 else 0
    full_gross = float(emp.basic_salary) + float(emp.hra) + float(emp.other_allowances)
    
    # Overtime Calculation
    ot_rate = (float(emp.basic_salary) / days_in_month / 8.0) * 1.5 if days_in_month > 0 else 0.0
    ot_amount = round(float(overtime_hours) * ot_rate, 2)

    gross = round(full_gross * ratio, 2) + ot_amount
    basic_pro = round(float(emp.basic_salary) * ratio, 2)

    pf_emp = round(basic_pro * float(emp.pf_employee_pct) / 100, 2)
    pf_er  = round(basic_pro * float(emp.pf_employer_pct) / 100, 2)

    if emp.is_esi_applicable and (full_gross + ot_amount) <= 21000:
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
def run_payroll(payload: PayrollRunCreate, db: Session = Depends(get_db)):
    """
    Triggers a monthly payroll run for all active employees in the project.
    Days present is determined by counting AttendanceLog records for that month with status 'Present' or 'Present (Off-Site)'.
    """
    # Parse month boundaries
    year, month = map(int, payload.payroll_month.split("-"))
    month_start = datetime(year, month, 1)
    month_end = datetime(year, month + 1, 1) if month < 12 else datetime(year + 1, 1, 1)

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
            joining_date = emp.date_of_joining.replace(tzinfo=None)
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

        days_present = float(att_count) if att_count > 0 else default_days

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
def get_payslips(run_id: uuid.UUID, db: Session = Depends(get_db)):
    lines = db.query(PayrollLineItem).filter(PayrollLineItem.payroll_run_id == run_id).all()
    result = []
    for line in lines:
        emp = db.query(StaffEmployee).filter(StaffEmployee.id == line.employee_id).first()
        result.append({
            "id": str(line.id),
            "employee_id": str(line.employee_id),
            "employee_name": emp.name if emp else "Unknown",
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


from pydantic import BaseModel

class LeaveRequestCreate(BaseModel):
    project_id: Optional[uuid.UUID] = None
    employee_name: str
    leave_type: str
    start_date: datetime
    end_date: datetime
    days_count: float

class LeaveRequestResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID]
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
def list_leaves(company_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(LeaveRequest).filter(LeaveRequest.company_id == company_id).all()


@router.post("/leaves/{company_id}", response_model=LeaveRequestResponse)
def create_leave_request(company_id: uuid.UUID, data: LeaveRequestCreate, db: Session = Depends(get_db)):
    new_leave = LeaveRequest(
        company_id=company_id,
        project_id=data.project_id,
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
def update_leave_status(leave_id: uuid.UUID, data: LeaveStatusUpdate, db: Session = Depends(get_db)):
    leave = db.query(LeaveRequest).filter(LeaveRequest.id == leave_id).first()
    if not leave:
        raise HTTPException(status_code=404, detail="Leave request not found")
    
    leave.status = data.status
    db.commit()
    db.refresh(leave)
    return leave
