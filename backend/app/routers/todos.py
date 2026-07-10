from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from typing import List, Optional
from app.database import get_db
from app import models
from app.auth import get_current_user, verify_company_access
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
    return {
        "id": str(t.id),
        "company_id": str(t.company_id),
        "project_id": str(t.project_id) if t.project_id else None,
        "created_by": str(t.created_by) if t.created_by else None,
        "title": t.title,
        "due_date": t.due_date.isoformat() if t.due_date else None,
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
    created_by: Optional[uuid.UUID] = None
    title: str
    due_date: Optional[str] = None
    repeat_type: str = "none"
    type: Optional[str] = None
    linked_task_id: Optional[uuid.UUID] = None
    url: Optional[str] = None
    assignee_ids: List[uuid.UUID] = []


class TodoUpdate(BaseModel):
    title: Optional[str] = None
    due_date: Optional[str] = None
    repeat_type: Optional[str] = None
    type: Optional[str] = None
    linked_task_id: Optional[uuid.UUID] = None
    url: Optional[str] = None
    status: Optional[str] = None
    assignee_ids: Optional[List[uuid.UUID]] = None


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
def create_todo(payload: TodoCreate, db: Session = Depends(get_db)):
    t = models.Todo(
        company_id=payload.company_id,
        project_id=payload.project_id,
        created_by=payload.created_by,
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
def update_todo(todo_id: uuid.UUID, payload: TodoUpdate, db: Session = Depends(get_db)):
    t = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Todo not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "due_date":
            value = _parse_dt(value)
        if field == "assignee_ids":
            db.query(models.TodoAssignee).filter(models.TodoAssignee.todo_id == t.id).delete()
            for aid in value:
                db.add(models.TodoAssignee(todo_id=t.id, assignee_id=aid))
            continue
        setattr(t, field, value)
    db.commit()
    db.refresh(t)
    return _serialize(db, t)


@router.delete("/{todo_id}")
def delete_todo(todo_id: uuid.UUID, db: Session = Depends(get_db)):
    t = db.query(models.Todo).filter(models.Todo.id == todo_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Todo not found")
    db.delete(t)
    db.commit()
    return {"success": True}
