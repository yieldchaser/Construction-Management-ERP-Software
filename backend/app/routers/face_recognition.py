import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import FaceRecognitionLog

router = APIRouter(prefix="/face", tags=["Face Recognition Attendance"])


class FacePunchRequest(BaseModel):
    company_id: uuid.UUID
    project_id: uuid.UUID
    employee_id: uuid.UUID
    punch_type: str
    face_verified: bool
    confidence_score: Optional[float] = None
    image_url: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    is_within_geofence: bool = False


class FacePunchResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    employee_id: uuid.UUID
    punch_type: str
    face_verified: bool
    confidence_score: Optional[float]
    image_url: Optional[str]
    lat: Optional[float]
    lng: Optional[float]
    is_within_geofence: bool
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/punch", response_model=FacePunchResponse, status_code=status.HTTP_201_CREATED)
def face_punch(payload: FacePunchRequest, db: Session = Depends(get_db)):
    log = FaceRecognitionLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/logs/{company_id}", response_model=List[FacePunchResponse])
def list_logs(company_id: uuid.UUID, project_id: Optional[uuid.UUID] = None, db: Session = Depends(get_db)):
    query = db.query(FaceRecognitionLog).filter(FaceRecognitionLog.company_id == company_id)
    if project_id:
        query = query.filter(FaceRecognitionLog.project_id == project_id)
    return query.order_by(FaceRecognitionLog.created_at.desc()).limit(200).all()
