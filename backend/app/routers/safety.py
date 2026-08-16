"""
Phase 13 — Safety & Incident Management (HSE)
Router for OSHA-aligned incident logging, toolbox talks, PPE compliance audits,
and LTI/LTIF statistics computation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from app.database import get_db
from app.auth import get_current_user, get_company_membership, require_permission
from app.models import SafetyIncident, ToolboxTalk, PPECheck, Project, AttendanceLog, User
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime, timezone
import uuid

router = APIRouter(prefix="/safety", tags=["Safety & HSE"], dependencies=[Depends(get_current_user)])


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    project_id: uuid.UUID
    incident_type: str          # Near Miss, First Aid, LTI, Fatal
    severity: str               # Low, Medium, High, Critical
    description: str
    location: Optional[str] = None
    injured_person: Optional[str] = None
    lost_time_days: int = Field(0, ge=0)
    reported_by: str
    reported_at: datetime       # ISO datetime string

    @field_validator("reported_at")
    @classmethod
    def reported_at_not_future(cls, v: datetime) -> datetime:
        if v.tzinfo is None:
            v = v.astimezone()
        if v.astimezone(timezone.utc) > datetime.now(timezone.utc):
            raise ValueError("reported_at cannot be in the future")
        return v


class IncidentClose(BaseModel):
    root_cause: str
    corrective_action: str


class ToolboxTalkCreate(BaseModel):
    project_id: uuid.UUID
    topic: str
    conducted_by: str
    conducted_at: datetime       # ISO datetime string
    attendee_count: int = Field(0, ge=0)
    notes: Optional[str] = None


class PPECheckCreate(BaseModel):
    project_id: uuid.UUID
    checked_by: str
    check_date: datetime         # ISO datetime string
    total_workers: int
    compliant_workers: int
    non_compliant_items: List[str] = []


# ─── Incidents ───────────────────────────────────────────────────────────────

@router.post("/incidents")
def log_incident(payload: IncidentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Log a new safety incident on site."""
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "safety:edit")
    incident = SafetyIncident(
        project_id=payload.project_id,
        incident_type=payload.incident_type,
        severity=payload.severity,
        description=payload.description,
        location=payload.location,
        injured_person=payload.injured_person,
        lost_time_days=payload.lost_time_days,
        reported_by=payload.reported_by,
        reported_at=payload.reported_at,
        status="open",
    )
    db.add(incident)
    db.commit()
    db.refresh(incident)
    return {
        "id": str(incident.id),
        "status": incident.status,
        "incident_type": incident.incident_type,
        "severity": incident.severity,
        "message": "Incident logged successfully."
    }


@router.get("/incidents/{project_id}")
def list_incidents(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all incidents for a project, ordered newest first."""
    project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    incidents = (
        db.query(SafetyIncident)
        .filter(SafetyIncident.project_id == uuid.UUID(project_id))
        .order_by(SafetyIncident.reported_at.desc())
        .all()
    )
    return [
        {
            "id": str(i.id),
            "incident_type": i.incident_type,
            "severity": i.severity,
            "description": i.description,
            "location": i.location,
            "injured_person": i.injured_person,
            "lost_time_days": i.lost_time_days,
            "status": i.status,
            "root_cause": i.root_cause,
            "corrective_action": i.corrective_action,
            "reported_by": i.reported_by,
            "reported_at": i.reported_at.isoformat() if i.reported_at else None,
            "closed_at": i.closed_at.isoformat() if i.closed_at else None,
            "closed_by": str(i.closed_by) if i.closed_by else None,
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in incidents
    ]


@router.patch("/incidents/{incident_id}/close")
def close_incident(incident_id: str, payload: IncidentClose, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Close an incident with a root cause and corrective action."""
    incident = db.query(SafetyIncident).filter(SafetyIncident.id == uuid.UUID(incident_id)).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    project = db.query(Project).filter(Project.id == incident.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "safety:edit")
    if incident.status == "closed":
        raise HTTPException(status_code=400, detail="Incident is already closed.")

    incident.status = "closed"
    incident.root_cause = payload.root_cause
    incident.corrective_action = payload.corrective_action
    incident.closed_at = datetime.utcnow()
    incident.closed_by = current_user.id
    db.commit()
    db.refresh(incident)
    return {
        "id": str(incident.id),
        "status": incident.status,
        "root_cause": incident.root_cause,
        "corrective_action": incident.corrective_action,
        "closed_at": incident.closed_at.isoformat(),
        "closed_by": str(incident.closed_by) if incident.closed_by else None,
        "message": "Incident closed successfully."
    }


@router.get("/stats/{project_id}")
def get_safety_stats(
    project_id: str,
    total_manhours: float = 10000.0,
    ltif_basis: int = 200000,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compute HSE statistics for a project.
    LTIF = (Number of LTIs × ltif_basis) / Total Manhours worked
    total_manhours defaults to 10,000 for demo; pass as query param in production.
    ltif_basis defaults to 200,000 (US OSHA convention); pass 1,000,000 for the
    ILO / IS 3786 convention used in Indian construction reporting.
    """
    proj_uuid = uuid.UUID(project_id)
    project = db.query(Project).filter(Project.id == proj_uuid).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    incidents = db.query(SafetyIncident).filter(SafetyIncident.project_id == proj_uuid).all()

    # Calculate actual manhours from AttendanceLog
    actual_hours = db.query(sqlfunc.sum(AttendanceLog.hours_worked)).filter(
        AttendanceLog.project_id == proj_uuid
    ).scalar()
    
    # Honest manhours source: flag whether the LTIF denominator came from real
    # AttendanceLog data or the caller-supplied fallback (so the UI can show
    # "(estimated)" instead of presenting a fallback number as precise).
    manhours_from_attendance = bool(actual_hours and float(actual_hours) > 0)
    manhours = float(actual_hours) if manhours_from_attendance else total_manhours

    total_incidents = len(incidents)
    lti_incidents = [i for i in incidents if i.incident_type in ("LTI", "Fatal")]
    lti_count = len(lti_incidents)
    total_lost_days = sum(i.lost_time_days for i in lti_incidents)
    ltif = round((lti_count * ltif_basis) / manhours, 2) if manhours > 0 else 0.0

    # Breakdown by type
    type_breakdown: dict = {}
    severity_breakdown: dict = {}
    for i in incidents:
        type_breakdown[i.incident_type] = type_breakdown.get(i.incident_type, 0) + 1
        severity_breakdown[i.severity] = severity_breakdown.get(i.severity, 0) + 1

    open_count = sum(1 for i in incidents if i.status == "open")
    closed_count = sum(1 for i in incidents if i.status == "closed")

    return {
        "project_id": project_id,
        "total_incidents": total_incidents,
        "open_incidents": open_count,
        "closed_incidents": closed_count,
        "lti_count": lti_count,
        "total_lost_days": total_lost_days,
        "ltif": ltif,
        "ltif_basis": ltif_basis,
        "type_breakdown": type_breakdown,
        "severity_breakdown": severity_breakdown,
        "total_manhours_used": manhours,
        "manhours_source": "attendance" if manhours_from_attendance else "fallback",
    }


# ─── Toolbox Talks ───────────────────────────────────────────────────────────

@router.post("/toolbox-talks")
def log_toolbox_talk(payload: ToolboxTalkCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Record a toolbox talk session conducted on site."""
    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "safety:edit")
    talk = ToolboxTalk(
        project_id=payload.project_id,
        topic=payload.topic,
        conducted_by=payload.conducted_by,
        conducted_at=payload.conducted_at,
        attendee_count=payload.attendee_count,
        notes=payload.notes,
    )
    db.add(talk)
    db.commit()
    db.refresh(talk)
    return {
        "id": str(talk.id),
        "topic": talk.topic,
        "conducted_by": talk.conducted_by,
        "attendee_count": talk.attendee_count,
        "message": "Toolbox talk logged successfully."
    }


@router.get("/toolbox-talks/{project_id}")
def list_toolbox_talks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all toolbox talks for a project, ordered newest first."""
    project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    talks = (
        db.query(ToolboxTalk)
        .filter(ToolboxTalk.project_id == uuid.UUID(project_id))
        .order_by(ToolboxTalk.conducted_at.desc())
        .all()
    )
    return [
        {
            "id": str(t.id),
            "topic": t.topic,
            "conducted_by": t.conducted_by,
            "conducted_at": t.conducted_at.isoformat() if t.conducted_at else None,
            "attendee_count": t.attendee_count,
            "notes": t.notes,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        }
        for t in talks
    ]


# ─── PPE Checks ──────────────────────────────────────────────────────────────

@router.post("/ppe-checks")
def log_ppe_check(payload: PPECheckCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Record a PPE compliance audit for site workers."""
    if payload.compliant_workers > payload.total_workers:
        raise HTTPException(status_code=400, detail="Compliant workers cannot exceed total workers.")

    project = db.query(Project).filter(Project.id == payload.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "safety:edit")

    check = PPECheck(
        project_id=payload.project_id,
        checked_by=payload.checked_by,
        check_date=payload.check_date,
        total_workers=payload.total_workers,
        compliant_workers=payload.compliant_workers,
        non_compliant_items=payload.non_compliant_items,
    )
    db.add(check)
    db.commit()
    db.refresh(check)

    compliance_pct = round((payload.compliant_workers / payload.total_workers) * 100, 1) if payload.total_workers > 0 else 0.0
    return {
        "id": str(check.id),
        "total_workers": check.total_workers,
        "compliant_workers": check.compliant_workers,
        "compliance_pct": compliance_pct,
        "non_compliant_items": check.non_compliant_items,
        "message": "PPE check recorded successfully."
    }


@router.get("/ppe-checks/{project_id}")
def list_ppe_checks(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all PPE compliance checks for a project with computed compliance %."""
    project = db.query(Project).filter(Project.id == uuid.UUID(project_id)).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    checks = (
        db.query(PPECheck)
        .filter(PPECheck.project_id == uuid.UUID(project_id))
        .order_by(PPECheck.check_date.desc())
        .all()
    )
    result = []
    for c in checks:
        pct = round((c.compliant_workers / c.total_workers) * 100, 1) if c.total_workers > 0 else 0.0
        result.append({
            "id": str(c.id),
            "checked_by": c.checked_by,
            "check_date": c.check_date.isoformat() if c.check_date else None,
            "total_workers": c.total_workers,
            "compliant_workers": c.compliant_workers,
            "compliance_pct": pct,
            "non_compliant_items": c.non_compliant_items,
            "created_at": c.created_at.isoformat() if c.created_at else None,
        })
    return result
