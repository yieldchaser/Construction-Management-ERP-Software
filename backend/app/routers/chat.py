import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import ChatGroup, ChatMessage

router = APIRouter(prefix="/chat", tags=["Chat & MOM"])


class ChatGroupCreate(BaseModel):
    company_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    group_type: str = "general"
    created_by: Optional[uuid.UUID] = None


class ChatGroupResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    project_id: uuid.UUID
    name: str
    group_type: str
    created_by: Optional[uuid.UUID]
    is_archived: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    group_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_name: Optional[str] = None
    message_text: Optional[str] = None
    media_url: Optional[str] = None
    voice_note_url: Optional[str] = None
    is_mom: bool = False
    mom_date: Optional[datetime] = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    user_name: Optional[str]
    message_text: Optional[str]
    media_url: Optional[str]
    voice_note_url: Optional[str]
    is_mom: bool
    mom_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/groups", response_model=ChatGroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(payload: ChatGroupCreate, db: Session = Depends(get_db)):
    group = ChatGroup(**payload.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    return group


@router.get("/groups/{project_id}", response_model=List[ChatGroupResponse])
def list_groups(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(ChatGroup).filter(
        ChatGroup.project_id == project_id,
        ChatGroup.is_archived == False
    ).all()


@router.post("/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(payload: ChatMessageCreate, db: Session = Depends(get_db)):
    msg = ChatMessage(**payload.model_dump())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg


@router.get("/messages/{group_id}", response_model=List[ChatMessageResponse])
def list_messages(group_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(ChatMessage).filter(
        ChatMessage.group_id == group_id
    ).order_by(ChatMessage.created_at.asc()).all()
