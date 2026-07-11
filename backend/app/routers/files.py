import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import FileFolder, ProjectFile, Project
from app.auth import get_current_user, verify_project_access, get_company_membership
from app import supabase_storage
from pydantic import BaseModel, Field

router = APIRouter(prefix="/files", tags=["Project Files"], dependencies=[Depends(get_current_user)])

# Reject oversized uploads before buffering the whole body in memory.
MAX_UPLOAD_BYTES = 50 * 1024 * 1024  # 50 MB


# ─── Schemas ───────────────────────────────────────────────────────────────────
class FolderCreateRequest(BaseModel):
    project_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    name: str = Field(..., min_length=1, max_length=255)


class FolderResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    parent_id: Optional[uuid.UUID] = None
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


class FileMetaResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    folder_id: Optional[uuid.UUID] = None
    name: str
    original_filename: str
    content_type: Optional[str] = None
    size: int
    uploaded_at: datetime

    class Config:
        from_attributes = True


# ─── Helpers ────────────────────────────────────────────────────────────────────
def _require_project(project_id: uuid.UUID, db: Session) -> Project:
    proj = db.query(Project).filter(Project.id == project_id).first()
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj


def _require_folder_or_root(folder_id: Optional[uuid.UUID], project_id: uuid.UUID, db: Session) -> None:
    if folder_id is None:
        return
    f = db.query(FileFolder).filter(
        FileFolder.id == folder_id, FileFolder.project_id == project_id
    ).first()
    if not f:
        raise HTTPException(status_code=404, detail="Folder not found")


# ─── Endpoints ──────────────────────────────────────────────────────────────────
@router.post("/folders", response_model=FolderResponse, status_code=status.HTTP_201_CREATED)
def create_folder(req: FolderCreateRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # project_id arrives in the request body (not the URL), so the plain
    # verify_project_access dependency cannot bind to it. Load the project and
    # verify company membership inline, otherwise any logged-in user could create
    # folders inside another tenant's project by guessing its id.
    project = _require_project(req.project_id, db)
    get_company_membership(db, current_user, project.company_id)
    _require_folder_or_root(req.parent_id, req.project_id, db)

    existing = db.query(FileFolder).filter(
        FileFolder.project_id == req.project_id,
        FileFolder.parent_id == req.parent_id,
        FileFolder.name == req.name.strip(),
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Folder '{req.name.strip()}' already exists here")

    folder = FileFolder(
        id=uuid.uuid4(),
        project_id=req.project_id,
        parent_id=req.parent_id,
        name=req.name.strip(),
    )
    db.add(folder)
    db.commit()
    db.refresh(folder)
    return FolderResponse(
        id=folder.id,
        project_id=folder.project_id,
        parent_id=folder.parent_id,
        name=folder.name,
        created_at=folder.created_at,
    )


@router.get("/folders", response_model=List[FolderResponse])
def list_folders(project_id: uuid.UUID, parent_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    q = db.query(FileFolder).filter(FileFolder.project_id == project_id)
    if parent_id is None:
        q = q.filter(FileFolder.parent_id.is_(None))
    else:
        q = q.filter(FileFolder.parent_id == parent_id)
    return q.order_by(FileFolder.name).all()


@router.get("/files", response_model=List[FileMetaResponse])
def list_files(project_id: uuid.UUID, folder_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    q = db.query(ProjectFile).filter(ProjectFile.project_id == project_id)
    if folder_id is None:
        q = q.filter(ProjectFile.folder_id.is_(None))
    else:
        q = q.filter(ProjectFile.folder_id == folder_id)
    return q.order_by(ProjectFile.name).all()


@router.post("/upload", response_model=FileMetaResponse, status_code=status.HTTP_201_CREATED)
async def upload_file(
    project_id: uuid.UUID = Form(...),
    folder_id: Optional[uuid.UUID] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # project_id here comes from multipart form data (not the URL path/query),
    # so it can't share a value with a plain Depends(verify_project_access)
    # sub-dependency; verify membership inline once the project is loaded instead.
    project = _require_project(project_id, db)
    get_company_membership(db, current_user, project.company_id)
    _require_folder_or_root(folder_id, project_id, db)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")
    if len(contents) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit",
        )

    name = file.filename or "untitled"
    content_type = file.content_type or "application/octet-stream"
    file_id = uuid.uuid4()

    storage_path = None
    data = None
    if supabase_storage.is_storage_configured():
        storage_path = f"{project_id}/{file_id}"
        supabase_storage.upload_bytes(
            supabase_storage.BUCKET_PROJECT_FILES, storage_path, contents, content_type
        )
    else:
        # Local-dev fallback: keep the bytes in the DB column.
        data = contents

    pf = ProjectFile(
        id=file_id,
        project_id=project_id,
        folder_id=folder_id,
        name=name,
        original_filename=name,
        content_type=content_type,
        size=len(contents),
        storage_path=storage_path,
        data=data,
    )
    db.add(pf)
    db.commit()
    db.refresh(pf)
    return FileMetaResponse(
        id=pf.id,
        project_id=pf.project_id,
        folder_id=pf.folder_id,
        name=pf.name,
        original_filename=pf.original_filename,
        content_type=pf.content_type,
        size=pf.size,
        uploaded_at=pf.uploaded_at,
    )


@router.get("/file/{file_id}")
def get_file(
    file_id: uuid.UUID,
    download: bool = False,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Tenant check: load the file's project and verify company membership.
    # (project_id is not in the URL, so we resolve it from the row.)
    pf = db.query(ProjectFile).filter(ProjectFile.id == file_id).first()
    if not pf:
        raise HTTPException(status_code=404, detail="File not found")
    project = db.query(Project).filter(Project.id == pf.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)

    # Prefer object storage; fall back to the DB BLOB for legacy rows.
    if pf.storage_path and supabase_storage.is_storage_configured():
        try:
            signed_url = supabase_storage.create_signed_url(
                supabase_storage.BUCKET_PROJECT_FILES, pf.storage_path
            )
            return RedirectResponse(url=signed_url, status_code=307)
        except Exception:
            # Storage unavailable or signed-URL failed: fall through to BLOB.
            pass

    if pf.data:
        media_type = pf.content_type or "application/octet-stream"
        disposition = "attachment" if download else "inline"
        # Strip characters that could break out of the header value (CR/LF/quotes)
        # to prevent response-header injection via a crafted filename.
        safe_name = (pf.original_filename or "download").replace("\r", "").replace("\n", "").replace('"', "")
        headers = {
            "Content-Disposition": f'{disposition}; filename="{safe_name}"',
            "Content-Type": media_type,
            "Content-Length": str(pf.size),
            "Cache-Control": "no-store",
        }
        return Response(content=pf.data, media_type=media_type, headers=headers)

    raise HTTPException(status_code=404, detail="File not found")
