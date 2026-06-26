"""
Phase 13 — Safety & Incident Management (HSE)
Router for OSHA-aligned incident logging, toolbox talks, PPE compliance audits,
and LTI/LTIF statistics computation.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from app.database import get_db
from app.models import SafetyIncident, ToolboxTalk, PPECheck, Project
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

router = APIRouter(prefix="/safety", tags=["Safety & HSE"])


# ─── Pydantic Schemas ────────────────────────────────────────────────────────

class IncidentCreate(BaseModel):
    project_id: str
    incident_type: str          # Near Miss, First Aid, LTI, Fatal
    severity: str               # Low, Medium, High, Critical
    description: str
    location: Optional[str] = None
    injured_person: Optional[str] = None
    lost_time_days: int = 0
    reported_by: str
    reported_at: str            # ISO datetime string


class IncidentClose(BaseModel):
    root_cause: str
    corrective_action: str


class ToolboxTalkCreate(BaseModel):
    project_id: str
    topic: str
    conducted_by: str
    conducted_at: str           # ISO datetime string
    attendee_count: int = 0
    notes: Optional[str] = None


class PPECheckCreate(BaseModel):
    project_id: str
    checked_by: str
    check_date: str             # ISO datetime string
    total_workers: int
    compliant_workers: int
    non_compliant_items: List[str] = []


# ─── Incidents ───────────────────────────────────────────────────────────────

@router.post("/incidents")
def log_incident(payload: IncidentCreate, db: Session = Depends(get_db)):
    """Log a new safety incident on site."""
    incident = SafetyIncident(
        project_id=uuid.UUID(payload.project_id),
        incident_type=payload.incident_type,
        severity=payload.severity,
        description=payload.description,
        location=payload.location,
        injured_person=payload.injured_person,
        lost_time_days=payload.lost_time_days,
        reported_by=payload.reported_by,
        reported_at=datetime.fromisoformat(payload.reported_at),
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
def list_incidents(project_id: str, db: Session = Depends(get_db)):
    """List all incidents for a project, ordered newest first."""
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
            "created_at": i.created_at.isoformat() if i.created_at else None,
        }
        for i in incidents
    ]


@router.patch("/incidents/{incident_id}/close")
def close_incident(incident_id: str, payload: IncidentClose, db: Session = Depends(get_db)):
    """Close an incident with a root cause and corrective action."""
    incident = db.query(SafetyIncident).filter(SafetyIncident.id == uuid.UUID(incident_id)).first()
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found.")
    if incident.status == "closed":
        raise HTTPException(status_code=400, detail="Incident is already closed.")

    incident.status = "closed"
    incident.root_cause = payload.root_cause
    incident.corrective_action = payload.corrective_action
    incident.closed_at = datetime.utcnow()
    db.commit()
    db.refresh(incident)
    return {
        "id": str(incident.id),
        "status": incident.status,
        "root_cause": incident.root_cause,
        "corrective_action": incident.corrective_action,
        "closed_at": incident.closed_at.isoformat(),
        "message": "Incident closed successfully."
    }


@router.get("/stats/{project_id}")
def get_safety_stats(project_id: str, total_manhours: float = 10000.0, db: Session = Depends(get_db)):
    """
    Compute HSE statistics for a project.
    LTIF = (Number of LTIs × 200,000) / Total Manhours worked
    total_manhours defaults to 10,000 for demo; pass as query param in production.
    """
    incidents = db.query(SafetyIncident).filter(SafetyIncident.project_id == uuid.UUID(project_id)).all()

    total_incidents = len(incidents)
    lti_incidents = [i for i in incidents if i.incident_type in ("LTI", "Fatal")]
    lti_count = len(lti_incidents)
    total_lost_days = sum(i.lost_time_days for i in lti_incidents)
    ltif = round((lti_count * 200000) / total_manhours, 2) if total_manhours > 0 else 0.0

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
        "type_breakdown": type_breakdown,
        "severity_breakdown": severity_breakdown,
        "total_manhours_used": total_manhours,
    }


# ─── Toolbox Talks ───────────────────────────────────────────────────────────

@router.post("/toolbox-talks")
def log_toolbox_talk(payload: ToolboxTalkCreate, db: Session = Depends(get_db)):
    """Record a toolbox talk session conducted on site."""
    talk = ToolboxTalk(
        project_id=uuid.UUID(payload.project_id),
        topic=payload.topic,
        conducted_by=payload.conducted_by,
        conducted_at=datetime.fromisoformat(payload.conducted_at),
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
def list_toolbox_talks(project_id: str, db: Session = Depends(get_db)):
    """List all toolbox talks for a project, ordered newest first."""
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
def log_ppe_check(payload: PPECheckCreate, db: Session = Depends(get_db)):
    """Record a PPE compliance audit for site workers."""
    if payload.compliant_workers > payload.total_workers:
        raise HTTPException(status_code=400, detail="Compliant workers cannot exceed total workers.")

    check = PPECheck(
        project_id=uuid.UUID(payload.project_id),
        checked_by=payload.checked_by,
        check_date=datetime.fromisoformat(payload.check_date),
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
def list_ppe_checks(project_id: str, db: Session = Depends(get_db)):
    """List all PPE compliance checks for a project with computed compliance %."""
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
