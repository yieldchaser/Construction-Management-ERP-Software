from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app import models

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token", auto_error=False)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise credentials_exception
        # SQLAlchemy's UUID type requires a uuid.UUID object on SQLite; coerce safely.
        if isinstance(user_id, str):
            try:
                user_id = uuid.UUID(user_id)
            except ValueError:
                raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None:
        raise credentials_exception
    return user

def get_company_membership(db: Session, user: models.User, company_id: uuid.UUID) -> models.CompanyTeam:
    """Verify the user actually belongs to the given company; raise 403 otherwise."""
    membership = db.query(models.CompanyTeam).filter(
        models.CompanyTeam.user_id == user.id,
        models.CompanyTeam.company_id == company_id,
    ).first()
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not a member of the requested company",
        )
    return membership


def get_current_active_company_user(
    token: str = Depends(oauth2_scheme),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    # Prefer the company context baked into the JWT; verify the user is actually
    # a member of it rather than blindly grabbing an arbitrary membership row.
    company_id = None
    if token:
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            raw_cid = payload.get("company_id")
            if raw_cid:
                try:
                    company_id = uuid.UUID(str(raw_cid))
                except (ValueError, TypeError):
                    company_id = None
        except JWTError:
            company_id = None

    membership = None
    if company_id:
        membership = db.query(models.CompanyTeam).filter(
            models.CompanyTeam.user_id == current_user.id,
            models.CompanyTeam.company_id == company_id,
        ).first()

    if not membership:
        membership = db.query(models.CompanyTeam).filter(
            models.CompanyTeam.user_id == current_user.id
        ).first()

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company team context"
        )

    return {
        "user": current_user,
        "company_id": membership.company_id,
        "role_id": membership.role_id,
        "priority_type": membership.priority_type,
    }


def get_verified_company_user(
    company_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    """Dependency for URL-routed endpoints: verifies the caller is a member of the
    company_id taken from the path before authorizing any work on it."""
    try:
        cid = uuid.UUID(company_id)
    except (ValueError, TypeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid company id")
    membership = get_company_membership(db, current_user, cid)
    return {
        "user": current_user,
        "company_id": cid,
        "role_id": membership.role_id,
        "priority_type": membership.priority_type,
    }
