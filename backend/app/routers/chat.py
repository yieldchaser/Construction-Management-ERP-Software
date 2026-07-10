import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.auth import get_current_user, verify_project_access
from app.models import ChatGroup, ChatMessage, ChatGroupMember

router = APIRouter(prefix="/chat", tags=["Chat & MOM"], dependencies=[Depends(get_current_user)])


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
    member_count: int = 0

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    group_id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    user_name: Optional[str] = None
    message_text: Optional[str] = None
    media_url: Optional[str] = None
    voice_note_url: Optional[str] = None
    image_urls: List[str] = []
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
    image_urls: List[str]
    is_mom: bool
    mom_date: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_attributes(cls, obj):
        data = {
            "id": obj.id,
            "group_id": obj.group_id,
            "user_id": obj.user_id,
            "user_name": obj.user_name,
            "message_text": obj.message_text,
            "media_url": obj.media_url,
            "voice_note_url": obj.voice_note_url,
            "image_urls": obj.image_urls or [],
            "is_mom": obj.is_mom,
            "mom_date": obj.mom_date,
            "created_at": obj.created_at,
        }
        return cls(**data)


class ChatGroupMemberCreate(BaseModel):
    group_id: uuid.UUID
    user_id: uuid.UUID
    role: str = "member"  # admin, member, viewer


class ChatGroupMemberResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime

    class Config:
        from_attributes = True


@router.post("/groups", response_model=ChatGroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(payload: ChatGroupCreate, db: Session = Depends(get_db)):
    group = ChatGroup(**payload.model_dump())
    db.add(group)
    db.commit()
    db.refresh(group)
    if payload.created_by:
        member = ChatGroupMember(group_id=group.id, user_id=payload.created_by, role="admin")
        db.add(member)
        db.commit()
    return group


@router.get("/groups/{project_id}", response_model=List[ChatGroupResponse])
def list_groups(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    groups = db.query(ChatGroup).filter(
        ChatGroup.project_id == project_id,
        ChatGroup.is_archived == False
    ).all()
    result = []
    for g in groups:
        count = db.query(ChatGroupMember).filter(ChatGroupMember.group_id == g.id).count()
        result.append(ChatGroupResponse(**{**g.__dict__, "member_count": count}))
    return result


@router.post("/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(payload: ChatMessageCreate, db: Session = Depends(get_db)):
    msg = ChatMessage(**payload.model_dump())
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return ChatMessageResponse.from_attributes(msg)


@router.get("/messages/{group_id}", response_model=List[ChatMessageResponse])
def list_messages(group_id: uuid.UUID, db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).filter(
        ChatMessage.group_id == group_id
    ).order_by(ChatMessage.created_at.asc()).all()
    return [ChatMessageResponse.from_attributes(m) for m in messages]


@router.get("/groups/{group_id}/members", response_model=List[ChatGroupMemberResponse])
def list_members(group_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(ChatGroupMember).filter(ChatGroupMember.group_id == group_id).all()


@router.post("/groups/{group_id}/members", response_model=ChatGroupMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(group_id: uuid.UUID, payload: ChatGroupMemberCreate, db: Session = Depends(get_db)):
    if payload.group_id != group_id:
        raise HTTPException(status_code=400, detail="Group ID mismatch")
    member = ChatGroupMember(**payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(group_id: uuid.UUID, user_id: uuid.UUID, db: Session = Depends(get_db)):
    member = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return None


@router.patch("/groups/{group_id}/members/{user_id}/role", response_model=ChatGroupMemberResponse)
def update_member_role(group_id: uuid.UUID, user_id: uuid.UUID, role: str = Query(...), db: Session = Depends(get_db)):
    member = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = role
    db.commit()
    db.refresh(member)
    return member
