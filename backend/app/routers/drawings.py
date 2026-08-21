from uuid import UUID
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import get_current_user, verify_project_access, get_company_membership, require_permission
from app.models import Drawing, DrawingRevision, DrawingPin, Project, User
from pydantic import BaseModel, Field, field_validator

router = APIRouter(
    prefix="/drawings",
    tags=["Drawings & Design Management"],
    dependencies=[Depends(get_current_user)]
)

# Pydantic Schemas
class DrawingPinResponse(BaseModel):
    id: UUID
    revision_id: UUID
    x_coordinate: float
    y_coordinate: float
    comment: str
    tagged_user_id: Optional[UUID] = None
    created_by: Optional[UUID] = None
    resolved: Optional[bool] = None
    created_at: datetime

    class Config:
        from_attributes = True

class DrawingRevisionResponse(BaseModel):
    id: UUID
    drawing_id: UUID
    version_code: str
    file_url: str
    approval_status: str
    approved_by: Optional[UUID] = None
    comments: Optional[str] = None
    created_at: datetime
    pins: List[DrawingPinResponse] = []

    class Config:
        from_attributes = True

class DrawingResponse(BaseModel):
    id: UUID
    project_id: UUID
    name: str
    category: str
    created_by: Optional[UUID] = None
    created_at: datetime
    revisions: List[DrawingRevisionResponse] = []

    class Config:
        from_attributes = True

class DrawingCreateRequest(BaseModel):
    project_id: UUID
    name: str = Field(..., example="Architectural Ground Floor Plan")
    category: str = Field(..., pattern="^(2D Layout|3D Layout|Production File)$", example="2D Layout") # e.g. "2D Layout", "3D Layout", "Production File"
    created_by: Optional[UUID] = None
    file_url: str = Field(..., min_length=1, example="/images/drawings/ground_floor.pdf")

    @field_validator("file_url")
    @classmethod
    def file_url_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("file_url cannot be blank; a drawing revision must reference a real file")
        return v

class RevisionCreateRequest(BaseModel):
    version_code: str = Field(..., example="V2")
    file_url: str = Field(..., min_length=1, example="/images/drawings/ground_floor_v2.pdf")
    comments: Optional[str] = Field(None, example="Fixed staircase dimensions")

    @field_validator("file_url")
    @classmethod
    def revision_file_url_not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("file_url cannot be blank; a revision must point at its own drawing file, not inherit the previous revision's")
        return v

class RevisionApproveRequest(BaseModel):
    approval_status: str = Field(..., pattern="^(approved|rejected|pending)$", example="approved") # "approved", "rejected", "pending"
    comments: Optional[str] = None

class PinCreateRequest(BaseModel):
    x_coordinate: float = Field(..., ge=0, le=9999.99, example=45.5)
    y_coordinate: float = Field(..., ge=0, le=9999.99, example=60.2)
    comment: str = Field(..., example="Check structural column thickness here")
    tagged_user_id: Optional[UUID] = None

class PinResolveRequest(BaseModel):
    resolved: bool

# Endpoints

@router.get("", response_model=List[DrawingResponse])
def get_drawings(project_id: UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    drawings = db.query(Drawing).filter(Drawing.project_id == project_id).all()
    res = []
    for d in drawings:
        revisions = db.query(DrawingRevision).filter(DrawingRevision.drawing_id == d.id).all()
        rev_responses = []
        for r in revisions:
            pins = db.query(DrawingPin).filter(DrawingPin.revision_id == r.id).all()
            pin_responses = [
                DrawingPinResponse(
                    id=p.id,
                    revision_id=p.revision_id,
                    x_coordinate=float(p.x_coordinate),
                    y_coordinate=float(p.y_coordinate),
                    comment=p.comment,
                    tagged_user_id=p.tagged_user_id,
                    created_by=p.created_by,
                    resolved=p.resolved,
                    created_at=p.created_at
                )
                for p in pins
            ]
            rev_responses.append(
                DrawingRevisionResponse(
                    id=r.id,
                    drawing_id=r.drawing_id,
                    version_code=r.version_code,
                    file_url=r.file_url,
                    approval_status=r.approval_status,
                    approved_by=r.approved_by,
                    comments=r.comments,
                    created_at=r.created_at,
                    pins=pin_responses
                )
            )
        res.append(
            DrawingResponse(
                id=d.id,
                project_id=d.project_id,
                name=d.name,
                category=d.category,
                created_by=d.created_by,
                created_at=d.created_at,
                revisions=rev_responses
            )
        )
    return res

@router.post("", response_model=DrawingResponse)
def create_drawing(req: DrawingCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    project = db.query(Project).filter(Project.id == req.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "drawings:edit")

    # 1. Create drawing row
    drawing = Drawing(
        project_id=req.project_id,
        name=req.name,
        category=req.category,
        created_by=req.created_by
    )
    db.add(drawing)
    db.flush() # get drawing.id

    # 2. Create starting V1 revision
    revision = DrawingRevision(
        drawing_id=drawing.id,
        version_code="V1",
        file_url=req.file_url,
        approval_status="pending"
    )
    db.add(revision)
    db.commit()
    db.refresh(drawing)

    # Convert to response
    return DrawingResponse(
        id=drawing.id,
        project_id=drawing.project_id,
        name=drawing.name,
        category=drawing.category,
        created_by=drawing.created_by,
        created_at=drawing.created_at,
        revisions=[
            DrawingRevisionResponse(
                id=revision.id,
                drawing_id=revision.drawing_id,
                version_code=revision.version_code,
                file_url=revision.file_url,
                approval_status=revision.approval_status,
                approved_by=revision.approved_by,
                comments=revision.comments,
                created_at=revision.created_at,
                pins=[]
            )
        ]
    )

@router.post("/{drawing_id}/revisions", response_model=DrawingRevisionResponse)
def add_drawing_revision(drawing_id: UUID, req: RevisionCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    drawing = db.query(Drawing).filter(Drawing.id == drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    project = db.query(Project).filter(Project.id == drawing.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "drawings:edit")

    # Check for duplicate version code
    existing_rev = db.query(DrawingRevision).filter(
        DrawingRevision.drawing_id == drawing_id,
        DrawingRevision.version_code == req.version_code
    ).first()
    if existing_rev:
        raise HTTPException(status_code=400, detail=f"Revision version code '{req.version_code}' already exists for this drawing.")

    revision = DrawingRevision(
        drawing_id=drawing_id,
        version_code=req.version_code,
        file_url=req.file_url,
        comments=req.comments,
        approval_status="pending"
    )
    db.add(revision)
    db.commit()
    db.refresh(revision)
    
    return DrawingRevisionResponse(
        id=revision.id,
        drawing_id=revision.drawing_id,
        version_code=revision.version_code,
        file_url=revision.file_url,
        approval_status=revision.approval_status,
        approved_by=revision.approved_by,
        comments=revision.comments,
        created_at=revision.created_at,
        pins=[]
    )

@router.post("/revisions/{revision_id}/approve", response_model=DrawingRevisionResponse)
def approve_drawing_revision(revision_id: UUID, req: RevisionApproveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    revision = db.query(DrawingRevision).filter(DrawingRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    drawing = db.query(Drawing).filter(Drawing.id == revision.drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    project = db.query(Project).filter(Project.id == drawing.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    membership = get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "drawings:approve")

    revision.approval_status = req.approval_status
    revision.approved_by = None if req.approval_status == "pending" else membership.id
    if req.comments:
        revision.comments = req.comments
        
    db.commit()
    db.refresh(revision)
    
    pins = db.query(DrawingPin).filter(DrawingPin.revision_id == revision.id).all()
    pin_responses = [
        DrawingPinResponse(
            id=p.id,
            revision_id=p.revision_id,
            x_coordinate=float(p.x_coordinate),
            y_coordinate=float(p.y_coordinate),
            comment=p.comment,
            tagged_user_id=p.tagged_user_id,
            created_by=p.created_by,
            resolved=p.resolved,
            created_at=p.created_at
        )
        for p in pins
    ]
    
    return DrawingRevisionResponse(
        id=revision.id,
        drawing_id=revision.drawing_id,
        version_code=revision.version_code,
        file_url=revision.file_url,
        approval_status=revision.approval_status,
        approved_by=revision.approved_by,
        comments=revision.comments,
        created_at=revision.created_at,
        pins=pin_responses
    )

@router.post("/revisions/{revision_id}/pins", response_model=DrawingPinResponse)
def add_pin_to_revision(revision_id: UUID, req: PinCreateRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    revision = db.query(DrawingRevision).filter(DrawingRevision.id == revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    drawing = db.query(Drawing).filter(Drawing.id == revision.drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    project = db.query(Project).filter(Project.id == drawing.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    membership = get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "drawings:edit")

    pin = DrawingPin(
        revision_id=revision_id,
        x_coordinate=req.x_coordinate,
        y_coordinate=req.y_coordinate,
        comment=req.comment,
        tagged_user_id=req.tagged_user_id,
        created_by=membership.id
    )
    db.add(pin)
    db.commit()
    db.refresh(pin)
    
    return DrawingPinResponse(
        id=pin.id,
        revision_id=pin.revision_id,
        x_coordinate=float(pin.x_coordinate),
        y_coordinate=float(pin.y_coordinate),
        comment=pin.comment,
        tagged_user_id=pin.tagged_user_id,
        created_by=pin.created_by,
        resolved=pin.resolved,
        created_at=pin.created_at
    )

@router.patch("/pins/{pin_id}")
def set_pin_resolved(pin_id: UUID, req: PinResolveRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pin = db.query(DrawingPin).filter(DrawingPin.id == pin_id).first()
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")

    revision = db.query(DrawingRevision).filter(DrawingRevision.id == pin.revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    drawing = db.query(Drawing).filter(Drawing.id == revision.drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    proj = db.query(Project).filter(Project.id == drawing.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, proj.company_id)
    require_permission(db, current_user, proj.company_id, "drawings:edit")

    pin.resolved = req.resolved
    db.commit()
    return {"success": True}

@router.delete("/pins/{pin_id}")
def delete_pin(pin_id: UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    pin = db.query(DrawingPin).filter(DrawingPin.id == pin_id).first()
    if not pin:
        raise HTTPException(status_code=404, detail="Pin not found")

    revision = db.query(DrawingRevision).filter(DrawingRevision.id == pin.revision_id).first()
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    drawing = db.query(Drawing).filter(Drawing.id == revision.drawing_id).first()
    if not drawing:
        raise HTTPException(status_code=404, detail="Drawing not found")
    proj = db.query(Project).filter(Project.id == drawing.project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, proj.company_id)
    require_permission(db, current_user, proj.company_id, "data:delete")

    from app.routers.delete_logs import log_deletion
    log_deletion(db, proj.company_id, "drawing_pin", pin.id, f"Drawing Pin: {pin.comment[:100]}")
    db.delete(pin)
    db.commit()
    return {"status": "success", "message": "Pin deleted successfully"}
