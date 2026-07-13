from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_company_access, verify_project_access, get_company_membership
from app.models import Task, TaskPredecessor, Project, TaskTodo, TaskComment, CompanyTeam, User
from app.workflow_controls import (
    enforce_entry_creation_window,
    enforce_entry_editing_window,
    enforce_progress_over_estimate,
)
from pydantic import BaseModel

router = APIRouter(
    prefix="/planning",
    tags=["Planning & Scheduler"],
    dependencies=[Depends(get_current_user)]
)

# Pydantic Schemas
class TaskResponse(BaseModel):
    id: UUID
    project_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    duration_days: int
    start_date: datetime
    end_date: datetime
    status: str
    priority: str
    assigned_to: Optional[UUID] = None
    boq_item_id: Optional[UUID] = None
    progress: float = 0.0  # actual physical progress %, 0-100

    class Config:
        from_attributes = True


class CompanyTaskResponse(TaskResponse):
    project_name: Optional[str] = None
    assigned_to_name: Optional[str] = None

class TaskCreateRequest(BaseModel):
    project_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    duration_days: int
    start_date: datetime
    priority: str = "medium"
    assigned_to: Optional[UUID] = None
    boq_item_id: Optional[UUID] = None
    progress: float = 0.0

class TaskUpdateRequest(BaseModel):
    name: Optional[str] = None
    duration_days: Optional[int] = None
    start_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[UUID] = None
    progress: Optional[float] = None

class PredecessorCreateRequest(BaseModel):
    predecessor_id: UUID
    type: str = "finish_to_start"

# Helper function to check circular dependency
def check_circular_dependency(task_id: UUID, predecessor_id: UUID, db: Session) -> bool:
    # DFS search to see if predecessor_id transitively depends on task_id
    visited = set()
    to_visit = [predecessor_id]
    
    while to_visit:
        curr = to_visit.pop()
        if curr == task_id:
            return True
        if curr in visited:
            continue
        visited.add(curr)
        
        # Fetch all predecessors of curr (things curr depends on)
        links = db.query(TaskPredecessor).filter(TaskPredecessor.task_id == curr).all()
        for link in links:
            to_visit.append(link.predecessor_id)
            
    return False

# Recursive schedule propagation
def propagate_schedule(task_id: UUID, db: Session):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return

    # Find tasks depending on this task (successors)
    links = db.query(TaskPredecessor).filter(TaskPredecessor.predecessor_id == task_id).all()
    for link in links:
        successor = db.query(Task).filter(Task.id == link.task_id).first()
        if not successor:
            continue

        # In finish-to-start, successor must start at or after the latest predecessor end_date
        pred_links = db.query(TaskPredecessor).filter(TaskPredecessor.task_id == successor.id).all()
        max_end_date = None
        for pl in pred_links:
            pred_task = db.query(Task).filter(Task.id == pl.predecessor_id).first()
            if pred_task:
                if max_end_date is None or pred_task.end_date > max_end_date:
                    max_end_date = pred_task.end_date

        if max_end_date and successor.start_date < max_end_date:
            duration = successor.duration_days
            successor.start_date = max_end_date
            successor.end_date = successor.start_date + timedelta(days=duration)
            db.add(successor)
            # Recurse
            propagate_schedule(successor.id, db)

@router.get("/tasks", response_model=List[TaskResponse])
def get_tasks(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks

@router.get("/tasks/company/{company_id}", response_model=List[CompanyTaskResponse])
def get_company_tasks(company_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    """Cross-project rollup of every task in the company (Team Schedule Gantt)."""
    company = db.query(Project).filter(Project.company_id == company_id).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company has no projects")

    tasks = (
        db.query(Task)
        .join(Project, Task.project_id == Project.id)
        .filter(Project.company_id == company_id)
        .all()
    )

    projects = db.query(Project).filter(Project.company_id == company_id).all()
    proj_by_id = {p.id: p for p in projects}

    team_ids = [t.assigned_to for t in tasks if t.assigned_to]
    teams = db.query(CompanyTeam).filter(CompanyTeam.id.in_(team_ids)).all() if team_ids else []
    users = (
        db.query(User).filter(User.id.in_([t.user_id for t in teams if t.user_id])).all()
        if teams else []
    )
    users_by_id = {u.id: u for u in users}
    team_by_id = {t.id: t for t in teams}

    def resolve_name(tid: UUID) -> Optional[str]:
        team = team_by_id.get(tid)
        if not team:
            return None
        if team.user_id and team.user_id in users_by_id and users_by_id[team.user_id].name:
            return users_by_id[team.user_id].name
        return None

    out = []
    for t in tasks:
        d = TaskResponse.from_orm(t).dict()
        d["project_name"] = proj_by_id[t.project_id].name if t.project_id in proj_by_id else None
        d["assigned_to_name"] = resolve_name(t.assigned_to) if t.assigned_to else None
        out.append(CompanyTaskResponse(**d))
    return out


@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(request: TaskCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)

    # Workflow Controls: Entry Controls (creation date window) & Progress Controls
    enforce_entry_creation_window(db, project.company_id, request.start_date)
    enforce_progress_over_estimate(db, project.company_id, request.progress)

    # Auto-calculate end_date based on start_date and duration_days
    end_date = request.start_date + timedelta(days=request.duration_days)

    task = Task(
        project_id=request.project_id,
        parent_id=request.parent_id,
        name=request.name,
        duration_days=request.duration_days,
        start_date=request.start_date,
        end_date=end_date,
        priority=request.priority,
        assigned_to=request.assigned_to,
        boq_item_id=request.boq_item_id,
        progress=request.progress
    )

    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: UUID, request: TaskUpdateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Workflow Controls: Entry Controls (editing date window) & Progress Controls
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if project:
        get_company_membership(db, current_user, project.company_id)
        enforce_entry_editing_window(db, project.company_id, task.start_date)
        enforce_progress_over_estimate(db, project.company_id, request.progress)

    dates_changed = False

    if request.name is not None:
        task.name = request.name
    if request.status is not None:
        task.status = request.status
    if request.priority is not None:
        task.priority = request.priority
    if request.assigned_to is not None:
        task.assigned_to = request.assigned_to
    if request.progress is not None:
        task.progress = request.progress

    # Handle duration or start date changes
    if request.start_date is not None or request.duration_days is not None:
        start_date = request.start_date if request.start_date is not None else task.start_date
        duration_days = request.duration_days if request.duration_days is not None else task.duration_days

        task.start_date = start_date
        task.duration_days = duration_days
        task.end_date = start_date + timedelta(days=duration_days)
        dates_changed = True

    db.add(task)
    db.commit()

    if dates_changed:
        # Propagate changes downstream to successors
        propagate_schedule(task_id, db)
        db.commit()

    db.refresh(task)
    return task

@router.post("/tasks/{task_id}/predecessors", status_code=status.HTTP_201_CREATED)
def add_predecessor(task_id: UUID, request: PredecessorCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    predecessor = db.query(Task).filter(Task.id == request.predecessor_id).first()

    if not task or not predecessor:
        raise HTTPException(status_code=404, detail="Task or Predecessor not found")

    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)

    if task_id == request.predecessor_id:
        raise HTTPException(status_code=400, detail="A task cannot be its own predecessor")

    # Check for circular dependency
    if check_circular_dependency(task_id, request.predecessor_id, db):
        raise HTTPException(
            status_code=400,
            detail="Circular dependency detected! This link would cause an infinite scheduling loop."
        )

    # Check if dependency already exists
    existing = db.query(TaskPredecessor).filter(
        TaskPredecessor.task_id == task_id,
        TaskPredecessor.predecessor_id == request.predecessor_id
    ).first()

    if not existing:
        link = TaskPredecessor(
            task_id=task_id,
            predecessor_id=request.predecessor_id,
            type=request.type
        )
        db.add(link)
        db.commit()

        # Propagate schedule change immediately to align the task sequence
        propagate_schedule(request.predecessor_id, db)
        db.commit()

    return {"success": True, "message": "Predecessor dependency added successfully"}


# ─────────────────────────────────────────────────────────────────────────────
# Competitor Parity Endpoints: Checklists & Activity Feed Comments
# ─────────────────────────────────────────────────────────────────────────────

class TodoCreate(BaseModel):
    title: str

class TodoResponse(BaseModel):
    id: UUID
    task_id: UUID
    title: str
    is_completed: bool
    created_at: datetime

    class Config:
        from_attributes = True

class CommentCreate(BaseModel):
    user_id: UUID
    user_name: str
    message_text: Optional[str] = None
    media_url: Optional[str] = None
    voice_note_url: Optional[str] = None
    progress_qty_added: Optional[float] = None

class CommentResponse(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    user_name: str
    message_text: Optional[str]
    media_url: Optional[str]
    voice_note_url: Optional[str]
    progress_qty_added: Optional[float]
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/tasks/{task_id}/todos", response_model=List[TodoResponse])
def get_task_todos(task_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    return db.query(TaskTodo).filter(TaskTodo.task_id == task_id).order_by(TaskTodo.created_at.asc()).all()


@router.post("/tasks/{task_id}/todos", response_model=TodoResponse, status_code=status.HTTP_201_CREATED)
def create_task_todo(task_id: UUID, payload: TodoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    todo = TaskTodo(task_id=task_id, title=payload.title, is_completed=False)
    db.add(todo)
    db.commit()
    db.refresh(todo)
    return todo


@router.patch("/tasks/todos/{todo_id}/toggle", response_model=TodoResponse)
def toggle_task_todo(todo_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    todo = db.query(TaskTodo).filter(TaskTodo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    task = db.query(Task).filter(Task.id == todo.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    todo.is_completed = not todo.is_completed
    db.commit()
    db.refresh(todo)
    return todo


@router.delete("/tasks/todos/{todo_id}")
def delete_task_todo(todo_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    todo = db.query(TaskTodo).filter(TaskTodo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    task = db.query(Task).filter(Task.id == todo.task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    proj = db.query(Project).filter(Project.id == task.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, proj.company_id)
    try:
        from app.routers.delete_logs import log_deletion
        company_id = str(proj.company_id) if proj else None
        log_deletion(db, company_id, "task", todo.id, f"Task Todo: {todo.title}")
    except Exception:
        pass
    db.delete(todo)
    db.commit()
    return {"success": True, "message": "Todo deleted successfully"}


@router.get("/tasks/{task_id}/comments", response_model=List[CommentResponse])
def get_task_comments(task_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    return db.query(TaskComment).filter(TaskComment.task_id == task_id).order_by(TaskComment.created_at.asc()).all()


@router.post("/tasks/{task_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_task_comment(task_id: UUID, payload: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    project = db.query(Project).filter(Project.id == task.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)

    comment = TaskComment(
        task_id=task_id,
        user_id=payload.user_id,
        user_name=payload.user_name,
        message_text=payload.message_text,
        media_url=payload.media_url,
        voice_note_url=payload.voice_note_url,
        progress_qty_added=payload.progress_qty_added
    )
    db.add(comment)
    
    # Optional WBS physical progress status updates if quantity is logged in comment
    if payload.progress_qty_added is not None and payload.progress_qty_added > 0:
        # Check if the task has status not_started, set to in_progress
        if task.status == "not_started":
            task.status = "in_progress"
            db.add(task)
            
    db.commit()
    db.refresh(comment)
    return comment


# ─── Project Settings CRUD Endpoints ──────────────────────────────────────────

class ProjectCreateSchema(BaseModel):
    company_id: UUID
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    attendance_radius_meters: Optional[int] = 500
    health: Optional[str] = "Good"
    category: Optional[str] = None
    stage: Optional[str] = None
    key_personnel_id: Optional[UUID] = None

class ProjectUpdateSchema(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    attendance_radius_meters: Optional[int] = None
    status: Optional[str] = None
    health: Optional[str] = None
    category: Optional[str] = None
    stage: Optional[str] = None
    key_personnel_id: Optional[UUID] = None

class ProjectResponseSchema(BaseModel):
    id: UUID
    company_id: UUID
    name: str
    code: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    location: Optional[str] = None
    attendance_radius_meters: int
    status: str
    health: str
    category: Optional[str] = None
    stage: Optional[str] = None
    key_personnel_id: Optional[UUID] = None

    class Config:
        from_attributes = True

@router.get("/projects", response_model=List[ProjectResponseSchema])
def list_projects_v3(company_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_company_access)):
    return db.query(Project).filter(Project.company_id == company_id).all()

@router.get("/projects/{project_id}", response_model=ProjectResponseSchema)
def get_project_v3(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj

@router.post("/projects", response_model=ProjectResponseSchema, status_code=status.HTTP_201_CREATED)
def create_project_v3(payload: ProjectCreateSchema, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    import uuid
    get_company_membership(db, current_user, payload.company_id)
    proj = Project(
        id=uuid.uuid4(),
        company_id=payload.company_id,
        name=payload.name,
        code=payload.code,
        address=payload.address,
        city=payload.city,
        location=payload.location or "19.0760,72.8777", # Default location
        attendance_radius_meters=payload.attendance_radius_meters or 500,
        status="Ongoing",
        health=payload.health or "Good",
        category=payload.category,
        stage=payload.stage,
        key_personnel_id=payload.key_personnel_id
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)
    return proj

@router.patch("/projects/{project_id}", response_model=ProjectResponseSchema)
def update_project_v3(project_id: UUID, payload: ProjectUpdateSchema, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    
    if payload.name is not None:
        proj.name = payload.name
    if payload.code is not None:
        proj.code = payload.code
    if payload.address is not None:
        proj.address = payload.address
    if payload.city is not None:
        proj.city = payload.city
    if payload.location is not None:
        proj.location = payload.location
    if payload.attendance_radius_meters is not None:
        proj.attendance_radius_meters = payload.attendance_radius_meters
    if payload.status is not None:
        proj.status = payload.status
    if payload.health is not None:
        proj.health = payload.health
    if payload.category is not None:
        proj.category = payload.category
    if payload.stage is not None:
        proj.stage = payload.stage
    if payload.key_personnel_id is not None:
        proj.key_personnel_id = payload.key_personnel_id
        
    db.commit()
    db.refresh(proj)
    return proj

