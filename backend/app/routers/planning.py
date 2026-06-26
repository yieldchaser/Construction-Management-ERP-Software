from uuid import UUID
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Task, TaskPredecessor, Project
from pydantic import BaseModel

router = APIRouter(
    prefix="/planning",
    tags=["Planning & Scheduler"]
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

    class Config:
        from_attributes = True

class TaskCreateRequest(BaseModel):
    project_id: UUID
    parent_id: Optional[UUID] = None
    name: str
    duration_days: int
    start_date: datetime
    priority: str = "medium"
    assigned_to: Optional[UUID] = None
    boq_item_id: Optional[UUID] = None

class TaskUpdateRequest(BaseModel):
    name: Optional[str] = None
    duration_days: Optional[int] = None
    start_date: Optional[datetime] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_to: Optional[UUID] = None

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

        # In finish-to-start, successor must start at or after predecessor end_date
        if successor.start_date < task.end_date:
            duration = successor.duration_days
            successor.start_date = task.end_date
            successor.end_date = successor.start_date + timedelta(days=duration)
            db.add(successor)
            # Recurse
            propagate_schedule(successor.id, db)

@router.get("/tasks", response_model=List[TaskResponse])
def get_tasks(project_id: UUID, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    tasks = db.query(Task).filter(Task.project_id == project_id).all()
    return tasks

@router.post("/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
def create_task(request: TaskCreateRequest, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == request.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

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
        boq_item_id=request.boq_item_id
    )

    db.add(task)
    db.commit()
    db.refresh(task)
    return task

@router.put("/tasks/{task_id}", response_model=TaskResponse)
def update_task(task_id: UUID, request: TaskUpdateRequest, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    dates_changed = False

    if request.name is not None:
        task.name = request.name
    if request.status is not None:
        task.status = request.status
    if request.priority is not None:
        task.priority = request.priority
    if request.assigned_to is not None:
        task.assigned_to = request.assigned_to

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
def add_predecessor(task_id: UUID, request: PredecessorCreateRequest, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    predecessor = db.query(Task).filter(Task.id == request.predecessor_id).first()

    if not task or not predecessor:
        raise HTTPException(status_code=404, detail="Task or Predecessor not found")

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
