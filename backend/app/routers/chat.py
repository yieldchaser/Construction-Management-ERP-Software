import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.database import get_db
from app.auth import get_current_user, verify_project_access, get_company_membership
from app.models import ChatGroup, ChatMessage, ChatGroupMember, User, CompanyTeam

router = APIRouter(prefix="/chat", tags=["Chat & MOM"], dependencies=[Depends(get_current_user)])

CHAT_GROUP_ROLE_PATTERN = "^(admin|member|viewer)$"


def company_team_for(db: Session, company_id: uuid.UUID, current_user: User) -> Optional[CompanyTeam]:
    # Every chat identity check must run in the company_team ID space: the
    # member/message user_id columns are foreign keys to company_team.id, not
    # users.id. This lookup is the single resolver for the caller's team row.
    return db.query(CompanyTeam).filter(
        CompanyTeam.company_id == company_id,
        CompanyTeam.user_id == current_user.id
    ).first()


def verify_group_membership(db: Session, current_user: User, group_id: uuid.UUID):
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    team = company_team_for(db, group.company_id, current_user)
    caller_ids = [current_user.id]
    if team:
        caller_ids.append(team.id)
    membership = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id.in_(caller_ids)
    ).first()
    if not membership:
        raise HTTPException(status_code=403, detail="Not a member of this chat group")
    return membership


def require_group_admin(db: Session, current_user: User, group_id: uuid.UUID):
    membership = verify_group_membership(db, current_user, group_id)
    if membership.role != "admin":
        raise HTTPException(status_code=403, detail="Group admin role required")
    return membership


def ensure_not_last_admin(db: Session, group_id: uuid.UUID, member: ChatGroupMember, new_role: Optional[str] = None):
    if member.role != "admin" or new_role == "admin":
        return
    admin_count = db.query(func.count(ChatGroupMember.id)).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.role == "admin"
    ).scalar()
    if (admin_count or 0) <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove or demote the last admin of the group")


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
    message_text: Optional[str] = None
    image_urls: List[str] = []
    is_mom: bool = False
    mom_date: Optional[datetime] = None


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    user_id: Optional[uuid.UUID]
    user_name: Optional[str]
    message_text: Optional[str]
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
            "image_urls": obj.image_urls or [],
            "is_mom": obj.is_mom,
            "mom_date": obj.mom_date,
            "created_at": obj.created_at,
        }
        return cls(**data)


class ChatGroupMemberCreate(BaseModel):
    group_id: uuid.UUID
    user_id: uuid.UUID
    role: str = Field("member", pattern=CHAT_GROUP_ROLE_PATTERN)  # admin, member, viewer


class ChatGroupMemberResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    user_id: uuid.UUID
    role: str
    joined_at: datetime
    name: Optional[str] = None

    class Config:
        from_attributes = True


@router.post("/groups", response_model=ChatGroupResponse, status_code=status.HTTP_201_CREATED)
def create_group(payload: ChatGroupCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    get_company_membership(db, current_user, payload.company_id)
    creator = company_team_for(db, payload.company_id, current_user)
    if creator is None:
        raise HTTPException(status_code=403, detail="Not a member of this company team")
    data = payload.model_dump()
    data.pop("created_by", None)
    group = ChatGroup(**data)
    group.created_by = creator.id
    db.add(group)
    db.flush()
    db.add(ChatGroupMember(group_id=group.id, user_id=creator.id, role="admin"))
    db.commit()
    db.refresh(group)
    return group


@router.get("/groups/{project_id}", response_model=List[ChatGroupResponse])
def list_groups(project_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user), _: None = Depends(verify_project_access)):
    groups = db.query(ChatGroup).filter(
        ChatGroup.project_id == project_id,
        ChatGroup.is_archived == False
    ).all()
    team_ids = [
        t.id for t in db.query(CompanyTeam.id).filter(
            CompanyTeam.user_id == current_user.id,
            CompanyTeam.company_id.in_([g.company_id for g in groups])
        ).all()
    ]
    caller_ids = [current_user.id] + team_ids
    member_group_ids = {
        m.group_id for m in db.query(ChatGroupMember.group_id).filter(
            ChatGroupMember.group_id.in_([g.id for g in groups]),
            ChatGroupMember.user_id.in_(caller_ids)
        ).all()
    }
    groups = [g for g in groups if g.id in member_group_ids]
    counts = dict(
        db.query(ChatGroupMember.group_id, func.count(ChatGroupMember.id))
        .filter(ChatGroupMember.group_id.in_([g.id for g in groups]))
        .group_by(ChatGroupMember.group_id)
        .all()
    )
    result = [
        ChatGroupResponse(**{**g.__dict__, "member_count": counts.get(g.id, 0)})
        for g in groups
    ]
    return result


@router.post("/messages", response_model=ChatMessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(payload: ChatMessageCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.query(ChatGroup).filter(ChatGroup.id == payload.group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    get_company_membership(db, current_user, group.company_id)
    verify_group_membership(db, current_user, group.id)
    msg = ChatMessage(**payload.model_dump())
    # Stamp the real sender so names resolve on read. The server owns the
    # sender identity, not the client payload. user_id links to company_team.id.
    ct = company_team_for(db, group.company_id, current_user)
    if ct is None:
        raise HTTPException(status_code=403, detail="Not a member of this company team")
    msg.user_id = ct.id
    msg.user_name = current_user.name
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return ChatMessageResponse.from_attributes(msg)


@router.get("/messages/{group_id}", response_model=List[ChatMessageResponse])
def list_messages(
    group_id: uuid.UUID,
    since_id: Optional[uuid.UUID] = None,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    get_company_membership(db, current_user, group.company_id)
    verify_group_membership(db, current_user, group.id)
    q = (
        db.query(ChatMessage, User.name)
        .join(CompanyTeam, CompanyTeam.id == ChatMessage.user_id, isouter=True)
        .join(User, User.id == CompanyTeam.user_id, isouter=True)
        .filter(ChatMessage.group_id == group_id)
    )
    rows = q.order_by(ChatMessage.created_at.desc()).limit(limit).all()
    if since_id is not None:
        anchor = db.query(ChatMessage.created_at).filter(ChatMessage.id == since_id).scalar()
        if anchor is not None:
            rows = [
                r for r in rows
                if r[0].created_at >= anchor and r[0].id != since_id
            ]
    rows = rows[::-1]
    result = []
    for msg, resolved_name in rows:
        data = {
            "id": msg.id,
            "group_id": msg.group_id,
            "user_id": msg.user_id,
            "user_name": resolved_name or msg.user_name or "—",
            "message_text": msg.message_text,
            "image_urls": msg.image_urls or [],
            "is_mom": msg.is_mom,
            "mom_date": msg.mom_date,
            "created_at": msg.created_at,
        }
        result.append(ChatMessageResponse(**data))
    return result


@router.get("/groups/{group_id}/members", response_model=List[ChatGroupMemberResponse])
def list_members(group_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    get_company_membership(db, current_user, group.company_id)
    verify_group_membership(db, current_user, group.id)
    rows = (
        db.query(ChatGroupMember, User.name)
        .join(CompanyTeam, CompanyTeam.id == ChatGroupMember.user_id, isouter=True)
        .join(User, User.id == CompanyTeam.user_id, isouter=True)
        .filter(ChatGroupMember.group_id == group_id)
        .all()
    )
    result = []
    for member, name in rows:
        result.append(ChatGroupMemberResponse(
            id=member.id,
            group_id=member.group_id,
            user_id=member.user_id,
            role=member.role,
            joined_at=member.joined_at,
            name=name,
        ))
    return result


@router.post("/groups/{group_id}/members", response_model=ChatGroupMemberResponse, status_code=status.HTTP_201_CREATED)
def add_member(group_id: uuid.UUID, payload: ChatGroupMemberCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if payload.group_id != group_id:
        raise HTTPException(status_code=400, detail="Group ID mismatch")
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    get_company_membership(db, current_user, group.company_id)
    member_count = db.query(func.count(ChatGroupMember.id)).filter(
        ChatGroupMember.group_id == group.id
    ).scalar() or 0
    if member_count == 0:
        # Bootstrap: a group with no members has nobody who could grant access,
        # so its recorded creator - resolved in both ID spaces, because rows
        # created before the created_by stamp was fixed may hold either -
        # may seed the first member. Once one exists the normal admin gate applies.
        team = company_team_for(db, group.company_id, current_user)
        caller_ids = [current_user.id] + ([team.id] if team else [])
        if group.created_by is None or group.created_by not in caller_ids:
            raise HTTPException(
                status_code=403,
                detail="Only the group creator can add the first member to an empty group",
            )
    else:
        require_group_admin(db, current_user, group.id)
    member = ChatGroupMember(**payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/groups/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    get_company_membership(db, current_user, group.company_id)
    require_group_admin(db, current_user, group.id)
    group.is_archived = True
    db.commit()
    return None


@router.delete("/groups/{group_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(group_id: uuid.UUID, user_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    member = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    get_company_membership(db, current_user, group.company_id)
    require_group_admin(db, current_user, group.id)
    ensure_not_last_admin(db, group_id, member)
    from app.routers.delete_logs import log_deletion
    company_id = group.company_id if group else None
    log_deletion(db, company_id, "chat_group_member", member.id, f"Chat Group Member removed from: {group.name if group else group_id}", deleted_by=current_user.name)
    db.delete(member)
    db.commit()
    return None


@router.patch("/groups/{group_id}/members/{user_id}/role", response_model=ChatGroupMemberResponse)
def update_member_role(group_id: uuid.UUID, user_id: uuid.UUID, role: str = Query(..., pattern=CHAT_GROUP_ROLE_PATTERN), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    member = db.query(ChatGroupMember).filter(
        ChatGroupMember.group_id == group_id,
        ChatGroupMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    group = db.query(ChatGroup).filter(ChatGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Chat group not found")
    get_company_membership(db, current_user, group.company_id)
    require_group_admin(db, current_user, group.id)
    ensure_not_last_admin(db, group_id, member, new_role=role)
    member.role = role
    db.commit()
    db.refresh(member)
    return member
