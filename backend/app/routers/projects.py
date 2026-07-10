from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func, Numeric, Boolean, DateTime, String
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app import models
from app.auth import get_current_user, verify_company_access, verify_project_access
from app.routers.custom_fields import CustomFieldValueInput, upsert_values_for_entity
import uuid

router = APIRouter(prefix="/projects", tags=["Projects"], dependencies=[Depends(get_current_user)])


def _to_float(value):
    try:
        if value is None:
            return 0.0
        return float(value)
    except (ValueError, TypeError):
        return 0.0


def _party_settlement(db, project_id, party_id, opening_adv, opening_pay):
    """Roll a project party's opening balance + live bill activity into Advance Paid / To Pay.

    Bridge: a library party links to its billing-side company_team via CompanyTeam.library_party_id
    (auto-linked by name at startup). Bills reference party_company_user_id = company_team.id.
    Net ledger: opening advance_paid is +, opening to_pay is -; each bill adds (paid - payable).
    """
    team_ids = [
        t.id
        for t in db.query(models.CompanyTeam).filter(
            models.CompanyTeam.library_party_id == party_id
        ).all()
    ]
    if not team_ids:
        lp = db.query(models.LibraryParty).filter(models.LibraryParty.id == party_id).first()
        if lp and lp.name:
            teams = (
                db.query(models.CompanyTeam)
                .join(models.User, models.User.id == models.CompanyTeam.user_id)
                .filter(
                    models.CompanyTeam.company_id == lp.company_id,
                    func.lower(func.trim(models.User.name)) == lp.name.strip().lower(),
                )
                .all()
            )
            team_ids = [t.id for t in teams]

    net = float(opening_adv or 0) - float(opening_pay or 0)
    if team_ids:
        bills = (
            db.query(models.Bill)
            .filter(
                models.Bill.project_id == project_id,
                models.Bill.party_company_user_id.in_(team_ids),
            )
            .all()
        )
        for b in bills:
            net += (_to_float(b.paid_amount) - _to_float(b.total_payable))

    advance_paid = round(max(0.0, net), 2)
    to_pay = round(max(0.0, -net), 2)
    return advance_paid, to_pay

# ─── helpers ───

_TASK_PROGRESS = {
    "not_started": 0.0,
    "start": 0.1,
    "ongoing": 0.5,
    "completed": 1.0,
}


def _parse_dt(value: Optional[str]):
    if value is None:
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


def _project_progress(db: Session, project_id: uuid.UUID) -> float:
    tasks = db.query(models.Task).filter(models.Task.project_id == project_id).all()
    if not tasks:
        return 0.0
    total_dur = sum((t.duration_days or 0) for t in tasks) or 1
    earned = sum((t.duration_days or 0) * _TASK_PROGRESS.get(t.status, 0.0) for t in tasks)
    return round(earned / total_dur * 100, 1)


def _project_cash(db: Session, project_id: uuid.UUID):
    cash_in = db.query(func.coalesce(func.sum(models.Bill.total_payable), 0)).filter(
        models.Bill.project_id == project_id, models.Bill.invoice_type == "sale"
    ).scalar() or 0
    cash_out = db.query(func.coalesce(func.sum(models.Bill.total_payable), 0)).filter(
        models.Bill.project_id == project_id, models.Bill.invoice_type.in_(["purchase", "subcon"])
    ).scalar() or 0
    return float(cash_in), float(cash_out)


def _serialize_project(db: Session, p: models.Project, include_members=False):
    progress = _project_progress(db, p.id)
    cash_in, cash_out = _project_cash(db, p.id)
    todo_pending = db.query(func.count(models.Todo.id)).join(
        models.TodoAssignee, models.TodoAssignee.todo_id == models.Todo.id
    ).filter(
        models.Todo.project_id == p.id,
        models.Todo.status == "pending"
    ).scalar() or 0
    data = {
        "id": str(p.id),
        "company_id": str(p.company_id),
        "name": p.name,
        "code": p.code,
        "status": p.status,
        "address": p.address,
        "city": p.city,
        "state": p.state,
        "stage": p.stage,
        "category": p.category,
        "project_value": float(p.project_value or 0),
        "planned_start_date": p.planned_start_date.isoformat() if p.planned_start_date else None,
        "planned_end_date": p.planned_end_date.isoformat() if p.planned_end_date else None,
        "actual_start_date": p.actual_start_date.isoformat() if p.actual_start_date else None,
        "actual_end_date": p.actual_end_date.isoformat() if p.actual_end_date else None,
        "orientation": p.orientation,
        "dimension": p.dimension,
        "scope_of_work": p.scope_of_work,
        "project_avatar": p.project_avatar,
        "attendance_radius_meters": p.attendance_radius_meters,
        "branch_id": str(p.branch_id) if p.branch_id else None,
        "is_pinned": bool(p.is_pinned),
        "progress": progress,
        "cash_in": cash_in,
        "cash_out": cash_out,
        "todo_pending": todo_pending,
        "created_at": p.created_at.isoformat() if p.created_at else None,
    }
    if include_members:
        members = db.query(models.ProjectMember).filter(
            models.ProjectMember.project_id == p.id
        ).all()
        data["member_ids"] = [str(m.company_team_id) for m in members]
    return data


# ─── schemas ───

class ProjectCreate(BaseModel):
    company_id: uuid.UUID
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    stage: Optional[str] = None
    category: Optional[str] = None
    project_value: float = 0.0
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    attendance_radius_meters: int = 500
    branch_id: Optional[uuid.UUID] = None
    member_ids: List[uuid.UUID] = []
    custom_fields: List[CustomFieldValueInput] = []


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    status: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    stage: Optional[str] = None
    category: Optional[str] = None
    project_value: Optional[float] = None
    planned_start_date: Optional[str] = None
    planned_end_date: Optional[str] = None
    actual_start_date: Optional[str] = None
    actual_end_date: Optional[str] = None
    orientation: Optional[str] = None
    dimension: Optional[str] = None
    scope_of_work: Optional[str] = None
    project_avatar: Optional[str] = None
    attendance_radius_meters: Optional[int] = None
    branch_id: Optional[uuid.UUID] = None
    custom_fields: Optional[List[CustomFieldValueInput]] = None


class LocationCreate(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None


# ─── project CRUD ───

@router.get("/company/{company_id}")
def list_projects(company_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    projects = db.query(models.Project).filter(models.Project.company_id == company_id).all()
    return [_serialize_project(db, p) for p in projects]


@router.get("/company/{company_id}/summary")
def project_summary(company_id: uuid.UUID, user_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    project_ids = [p.id for p in db.query(models.Project.id).filter(models.Project.company_id == company_id).all()]

    # Approval (Pending) — drawing revisions + credit notes + payment requests
    dr_pending = db.query(func.count(models.DrawingRevision.id)).join(
        models.Drawing, models.Drawing.id == models.DrawingRevision.drawing_id
    ).join(
        models.Project, models.Project.id == models.Drawing.project_id
    ).filter(
        models.Project.company_id == company_id,
        models.DrawingRevision.approval_status == "pending"
    ).scalar() or 0
    cn_pending = db.query(func.count(models.CreditNote.id)).filter(
        models.CreditNote.company_id == company_id,
        models.CreditNote.approval_flag == "pending"
    ).scalar() or 0
    pr_pending = db.query(func.count(models.PaymentRequest.id)).filter(
        models.PaymentRequest.company_id == company_id,
        models.PaymentRequest.approval_status == "Pending"
    ).scalar() or 0
    approvals_pending = int(dr_pending) + int(cn_pending) + int(pr_pending)

    # Material (Pending) — pending material indents
    materials_pending = db.query(func.count(models.MaterialIndent.id)).filter(
        models.MaterialIndent.company_id == company_id,
        models.MaterialIndent.status == "pending"
    ).scalar() or 0

    # To Do (Pending) — assigned to user across the company
    todo_q = db.query(func.count(models.Todo.id)).filter(
        models.Todo.company_id == company_id,
        models.Todo.status == "pending"
    )
    if user_id:
        todo_q = todo_q.join(
            models.TodoAssignee, models.TodoAssignee.todo_id == models.Todo.id
        ).filter(models.TodoAssignee.assignee_id == user_id)
    todos_pending = todo_q.scalar() or 0

    return {
        "project_count": len(project_ids),
        "approvals_pending": approvals_pending,
        "materials_pending": int(materials_pending),
        "todos_pending": int(todos_pending),
    }


@router.post("/")
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    proj = models.Project(
        company_id=payload.company_id,
        name=payload.name,
        code=payload.code,
        address=payload.address,
        city=payload.city,
        state=payload.state,
        stage=payload.stage,
        category=payload.category,
        project_value=payload.project_value,
        planned_start_date=_parse_dt(payload.planned_start_date),
        planned_end_date=_parse_dt(payload.planned_end_date),
        attendance_radius_meters=payload.attendance_radius_meters,
        branch_id=payload.branch_id,
        status="Ongoing",
    )
    db.add(proj)
    db.flush()
    for mid in payload.member_ids:
        db.add(models.ProjectMember(project_id=proj.id, company_team_id=mid))
    upsert_values_for_entity(
        db, payload.company_id, "project", proj.id,
        [cf.model_dump() for cf in payload.custom_fields],
    )
    db.commit()
    db.refresh(proj)
    return _serialize_project(db, proj, include_members=True)


@router.get("/{project_id}")
def get_project(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return _serialize_project(db, p, include_members=True)


@router.put("/{project_id}")
def update_project(project_id: uuid.UUID, payload: ProjectUpdate, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    updates = payload.model_dump(exclude_unset=True)
    custom_fields = updates.pop("custom_fields", None)
    for field, value in updates.items():
        if field in ("planned_start_date", "planned_end_date", "actual_start_date", "actual_end_date"):
            value = _parse_dt(value)
        setattr(p, field, value)
    upsert_values_for_entity(db, p.company_id, "project", p.id, custom_fields)
    db.commit()
    db.refresh(p)
    return _serialize_project(db, p, include_members=True)


@router.post("/{project_id}/pin")
def toggle_pin(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    p.is_pinned = not bool(p.is_pinned)
    db.commit()
    db.refresh(p)
    return {"id": str(p.id), "is_pinned": bool(p.is_pinned)}


@router.delete("/{project_id}")
def delete_project(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        from app.routers.delete_logs import log_deletion
        log_deletion(db, p.company_id, "project", str(p.id), f"Project: {p.name}", party_name=p.name)
    except Exception:
        pass
    db.delete(p)
    db.commit()
    return {"success": True}


# ─── Members (Settings → Members) ───

@router.get("/{project_id}/members")
def list_project_members(project_id: uuid.UUID, search: Optional[str] = None, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    q = db.query(models.CompanyTeam).filter(models.CompanyTeam.company_id == p.company_id)
    members = q.all()
    result = []
    for m in members:
        user = db.query(models.User).filter(models.User.id == m.user_id).first() if m.user_id else None
        role_name = None
        if m.role_id:
            role = db.query(models.CompanyRole).filter(models.CompanyRole.id == m.role_id).first()
            role_name = role.role_name if role else None
        name = user.name if user else "Unknown"
        if search and search.lower() not in name.lower() and search.lower() not in (role_name or "").lower():
            continue
        result.append({
            "company_team_id": str(m.id),
            "user_id": str(m.user_id) if m.user_id else None,
            "name": name,
            "mobile": user.mobile if user else None,
            "role": role_name,
            "priority_type": m.priority_type,
        })
    return result


@router.post("/{project_id}/members")
def add_project_member(project_id: uuid.UUID, member_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.company_team_id == member_id
    ).first()
    if not existing:
        db.add(models.ProjectMember(project_id=project_id, company_team_id=member_id))
        db.commit()
    return {"success": True}


@router.delete("/{project_id}/members/{member_id}")
def remove_project_member(project_id: uuid.UUID, member_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    row = db.query(models.ProjectMember).filter(
        models.ProjectMember.project_id == project_id,
        models.ProjectMember.company_team_id == member_id
    ).first()
    if row:
        try:
            from app.routers.delete_logs import log_deletion
            proj = db.query(models.Project).filter(models.Project.id == project_id).first()
            company_id = proj.company_id if proj else None
            log_deletion(db, company_id, "project_member", member_id, f"Project Member removed from: {proj.name if proj else project_id}")
        except Exception:
            pass
        db.delete(row)
        db.commit()
    return {"success": True}


# ─── Parties (project-scoped linkage + balances) ───

class ProjectPartyCreate(BaseModel):
    party_id: uuid.UUID
    opening_balance_direction: Optional[str] = None  # will_pay / will_receive
    opening_balance_amount: Optional[float] = 0.0


@router.get("/{project_id}/parties")
def list_project_parties(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    links = db.query(models.ProjectParty).filter(models.ProjectParty.project_id == project_id).all()
    result = []
    for link in links:
        party = db.query(models.LibraryParty).filter(models.LibraryParty.id == link.party_id).first()
        if not party:
            continue
        adv, pay = _party_settlement(db, project_id, link.party_id, link.advance_paid, link.to_pay)
        result.append({
            "party_id": str(party.id),
            "name": party.name,
            "party_type": party.party_type,
            "balance": round(adv - pay, 2),
            "advance_paid": adv,
            "to_pay": pay,
            "status": link.status or "Active",
        })
    return result


@router.post("/{project_id}/parties")
def add_project_party(project_id: uuid.UUID, payload: ProjectPartyCreate, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    existing = db.query(models.ProjectParty).filter(
        models.ProjectParty.project_id == project_id,
        models.ProjectParty.party_id == payload.party_id
    ).first()
    if not existing:
        adv = pay = 0.0
        if payload.opening_balance_direction in ("will_pay", "will_receive") and (payload.opening_balance_amount or 0) > 0:
            amount = float(payload.opening_balance_amount)
            adv = amount if payload.opening_balance_direction == "will_receive" else 0.0
            pay = amount if payload.opening_balance_direction == "will_pay" else 0.0
        existing = models.ProjectParty(
            project_id=project_id,
            party_id=payload.party_id,
            balance=round(adv - pay, 2),
            advance_paid=adv,
            to_pay=pay,
            status="Active",
        )
        db.add(existing)
        db.commit()
        db.refresh(existing)
    return {
        "party_id": str(existing.party_id),
        "balance": float(existing.balance),
        "advance_paid": float(existing.advance_paid),
        "to_pay": float(existing.to_pay),
        "status": existing.status or "Active",
    }


@router.put("/{project_id}/parties/{party_id}")
def set_project_party_status(
    project_id: uuid.UUID, party_id: uuid.UUID, payload: dict, db: Session = Depends(get_db),
    _: None = Depends(verify_project_access)
):
    link = db.query(models.ProjectParty).filter(
        models.ProjectParty.project_id == project_id,
        models.ProjectParty.party_id == party_id,
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Party link not found")
    status = (payload.get("status") or "Active")
    if status not in ("Active", "Inactive"):
        status = "Active"
    link.status = status
    db.commit()
    return {"party_id": str(party_id), "status": link.status}


@router.get("/{project_id}/parties/balances")
def project_party_balances(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    links = db.query(models.ProjectParty).filter(models.ProjectParty.project_id == project_id).all()
    advance_paid = 0.0
    to_pay = 0.0
    for l in links:
        adv, pay = _party_settlement(db, project_id, l.party_id, l.advance_paid, l.to_pay)
        advance_paid += adv
        to_pay += pay
    return {"advance_paid": round(advance_paid, 2), "to_pay": round(to_pay, 2)}


@router.delete("/{project_id}/parties/{party_id}")
def remove_project_party(project_id: uuid.UUID, party_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    link = db.query(models.ProjectParty).filter(
        models.ProjectParty.project_id == project_id,
        models.ProjectParty.party_id == party_id
    ).first()
    if link:
        try:
            from app.routers.delete_logs import log_deletion
            proj = db.query(models.Project).filter(models.Project.id == project_id).first()
            company_id = proj.company_id if proj else None
            party = db.query(models.LibraryParty).filter(models.LibraryParty.id == party_id).first()
            log_deletion(db, company_id, "project_party", link.id, f"Project Party removed: {party.name if party else party_id}", party_name=party.name if party else None)
        except Exception:
            pass
        db.delete(link)
        db.commit()
    return {"success": True}


# ─── Location Structure (Settings → Location Structure) ───

@router.get("/{project_id}/locations")
def list_locations(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    locs = db.query(models.ProjectLocation).filter(models.ProjectLocation.project_id == project_id).all()
    return [{"id": str(l.id), "name": l.name, "parent_id": str(l.parent_id) if l.parent_id else None} for l in locs]


@router.post("/{project_id}/locations")
def create_location(project_id: uuid.UUID, payload: LocationCreate, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    p = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    loc = models.ProjectLocation(project_id=project_id, name=payload.name, parent_id=payload.parent_id)
    db.add(loc)
    db.commit()
    db.refresh(loc)
    return {"id": str(loc.id), "name": loc.name, "parent_id": str(loc.parent_id) if loc.parent_id else None}


@router.delete("/{project_id}/locations/{location_id}")
def delete_location(project_id: uuid.UUID, location_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    loc = db.query(models.ProjectLocation).filter(
        models.ProjectLocation.id == location_id,
        models.ProjectLocation.project_id == project_id
    ).first()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    try:
        from app.routers.delete_logs import log_deletion
        proj = db.query(models.Project).filter(models.Project.id == project_id).first()
        company_id = proj.company_id if proj else None
        log_deletion(db, company_id, "location", loc.id, f"Location: {loc.name}")
    except Exception:
        pass
    db.delete(loc)
    db.commit()
    return {"success": True}
