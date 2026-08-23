from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timezone
from typing import List, Optional
from app.database import get_db
from app import models
from app.auth import get_current_user, verify_project_in_company, verify_company_access, get_company_membership, require_permission
import uuid

router = APIRouter(prefix="/todos", tags=["Todos"], dependencies=[Depends(get_current_user)])


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


def _serialize(db: Session, t: models.Todo):
    assignees = db.query(models.TodoAssignee).filter(models.TodoAssignee.todo_id == t.id).all()
    task_name = None
    if t.linked_task_id:
        task = db.query(models.Task).filter(models.Task.id == t.linked_task_id).first()
        task_name = task.name if task else None
    is_overdue = False
    if t.due_date is not None and t.status != "done":
        now = datetime.utcnow()
        if t.due_date.tzinfo is not None:
            now = now.replace(tzinfo=timezone.utc)
        is_overdue = t.due_date < now
    return {
        "id": str(t.id),
        "company_id": str(t.company_id),
        "project_id": str(t.project_id) if t.project_id else None,
        "created_by": str(t.created_by) if t.created_by else None,
        "title": t.title,
        "due_date": t.due_date.isoformat() if t.due_date else None,
        "is_overdue": is_overdue,
        "repeat_type": t.repeat_type,
        "type": t.type,
        "linked_task_id": str(t.linked_task_id) if t.linked_task_id else None,
        "task_name": task_name,
        "url": t.url,
        "status": t.status,
        "assignee_ids": [str(a.assignee_id) for a in assignees],
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


class TodoCreate(BaseModel):
    company_id: uuid.UUID
    project_id: Optional[uuid.UUID] = None
    title: str = Field(..., max_length=500)
    due_date: Optional[str] = None
    repeat_type: str = "none"
    type: Optional[str] = None
    linked_task_id: Optional[uuid.UUID] = None
    url: Optional[str] = None
    assignee_ids: List[uuid.UUID] = []

    @field_validator("url")
    @classmethod
    def url_http_only(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("url must start with http:// or https://")
        return v

    @field_validator("due_date")
    @classmethod
    def due_date_not_past(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        parsed = _parse_dt(v)
        if parsed is not None and parsed.date() < datetime.now(timezone.utc).date():
            raise ValueError("due_date cannot be in the past")
        return v


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=500)
    due_date: Optional[str] = None
    repeat_type: Optional[str] = None
    type: Optional[str] = None
    linked_task_id: Optional[uuid.UUID] = None
    url: Optional[str] = None
    status: Optional[str] = None
    assignee_ids: Optional[List[uuid.UUID]] = None

    @field_validator("url")
    @classmethod
    def url_http_only(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not (v.startswith("http://") or v.startswith("https://")):
            raise ValueError("url must start with http:// or https://")
        return v

    @field_validator("due_date")
    @classmethod
    def due_date_not_past(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        parsed = _parse_dt(v)
        if parsed is not None and parsed.date() < datetime.now(timezone.utc).date():
            raise ValueError("due_date cannot be in the past")
        return v


@router.get("/company/{company_id}")
def list_todos(
    company_id: uuid.UUID,
    project_id: Optional[uuid.UUID] = None,
    status: Optional[str] = None,
    assignee_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db),
    _: None = Depends(verify_company_access),
):
    q = db.query(models.Todo).filter(models.Todo.company_id == company_id)
    if project_id:
        q = q.filter(models.Todo.project_id == project_id)
    if status:
        q = q.filter(models.Todo.status == status)
    if assignee_id:
        q = q.join(models.TodoAssignee, models.TodoAssignee.todo_id == models.Todo.id).filter(
            models.TodoAssignee.assignee_id == assignee_id
        )
    todos = q.all()
    return [_serialize(db, t) for t in todos]


@router.post("/")
def create_todo(payload: TodoCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    membership = get_company_membership(db, current_user, payload.company_id)
    if payload.project_id:
        verify_project_in_company(db, payload.project_id, payload.company_id)
    require_permission(db, current_user, payload.company_id, "planning:edit")
    t = models.Todo(
        company_id=payload.company_id,
        project_id=payload.project_id,
        created_by=membership.id,
        title=payload.title,
        due_date=_parse_dt(payload.due_date),
        repeat_type=payload.repeat_type,
        type=payload.type,
        linked_task_id=payload.linked_task_id,
        url=payload.url,
        status="pending",
    )
    db.add(t)
    db.flush()
    for aid in payload.assignee_ids:
        db.add(models.TodoAssignee(todo_id=t.id, assignee_id=aid))
    db.commit()
    db.refresh(t)
    return _serialize(db, t)


@router.put("/{todo_id}")
def update_todo(todo_id: uuid.UUID, payload: TodoUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Todo not found")
    get_company_membership(db, current_user, t.company_id)
    require_permission(db, current_user, t.company_id, "planning:edit")
    if payload.title is not None:
        t.title = payload.title
    if payload.due_date is not None:
        t.due_date = _parse_dt(payload.due_date)
    if payload.repeat_type is not None:
        t.repeat_type = payload.repeat_type
    if payload.type is not None:
        t.type = payload.type
    if payload.linked_task_id is not None:
        t.linked_task_id = payload.linked_task_id
    if payload.url is not None:
        t.url = payload.url
    if payload.status is not None:
        t.status = payload.status
    if payload.assignee_ids is not None:
        db.query(models.TodoAssignee).filter(models.TodoAssignee.todo_id == t.id).delete()
        for aid in payload.assignee_ids:
            db.add(models.TodoAssignee(todo_id=t.id, assignee_id=aid))
    db.commit()
    db.refresh(t)
    return _serialize(db, t)


@router.delete("/{todo_id}")
def delete_todo(todo_id: uuid.UUID, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    t = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Todo not found")
    get_company_membership(db, current_user, t.company_id)
    require_permission(db, current_user, t.company_id, "data:delete")
    from app.routers.delete_logs import log_deletion
    log_deletion(db, t.company_id, "todo", t.id, f"Todo: {t.title}", deleted_by=current_user.name)
    db.delete(t)
    db.commit()
    return {"success": True}
