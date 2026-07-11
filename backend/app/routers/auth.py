import hashlib
import hmac
import secrets as pysecrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import create_access_token, get_current_active_company_user, get_current_user
from app.config import settings
from app.rate_limit import limiter
from app import models, sms

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_COMPANY_ID = "e0000000-0000-0000-0000-000000000000"


def _generate_otp_code() -> str:
    """Cryptographically-random 6-digit code."""
    return f"{pysecrets.randbelow(1_000_000):06d}"


def _hash_otp(mobile: str, code: str) -> str:
    """HMAC-SHA256 of the code keyed by SECRET_KEY, bound to the mobile number.

    The plaintext code is never persisted; only this hash is stored, so a DB
    leak does not expose live codes.
    """
    msg = f"{mobile}:{code}".encode("utf-8")
    return hmac.new(settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256).hexdigest()


def _aware(dt: datetime) -> datetime:
    """Treat naive datetimes (SQLite) as UTC for safe comparison."""
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _seed_demo_projects(db: Session, company_id: uuid.UUID):
    PROJ_1 = uuid.UUID("d0000000-0000-0000-0000-000000000001")
    PROJ_2 = uuid.UUID("d0000000-0000-0000-0000-000000000002")
    PROJ_3 = uuid.UUID("d0000000-0000-0000-0000-000000000003")
    
    project_data = [
        (PROJ_1, "Metro Terminal (Phase 2)", "MET-02", "Mumbai", "Maharashtra"),
        (PROJ_2, "Bypass Highway Flyover", "HWY-FLY", "Pune", "Maharashtra"),
        (PROJ_3, "Alpha Premium Residences", "ALF-RES", "Delhi", "Delhi"),
    ]
    
    for pid, name, code, city, state in project_data:
        proj = db.query(models.Project).filter(models.Project.id == pid).first()
        if not proj:
            proj = models.Project(
                id=pid,
                company_id=company_id,
                name=name,
                code=code,
                city=city,
                state=state,
                status="Ongoing"
            )
            db.add(proj)
    db.commit()

def _ensure_demo_company(db: Session) -> models.Company:
    company = db.query(models.Company).filter(models.Company.id == uuid.UUID(DEMO_COMPANY_ID)).first()
    if company:
        return company

    company = models.Company(
        id=uuid.UUID(DEMO_COMPANY_ID),
        name="Demo Construction Ltd",
        legal_business_name="Demo Construction India Private Limited",
        gstin="27AADCD2424B1ZP",
        billing_address="101, Skyline Tower, Andheri East, Mumbai, MH - 400069",
        currency_decimal_places=2,
        quantity_decimal_places=3,
        back_dated_limit_days=7,
    )
    db.add(company)
    db.commit()
    db.refresh(company)
    
    _seed_demo_projects(db, company.id)
    return company

class OTPSendRequest(BaseModel):
    mobile: str = Field(..., example="+919876543210")

class OTPVerifyRequest(BaseModel):
    mobile: str = Field(..., example="+919876543210")
    code: str = Field(..., example="123456")

@router.post("/otp/send")
@limiter.limit("5/minute")
def send_otp(request: Request, payload: OTPSendRequest, db: Session = Depends(get_db)):
    """Generate a one-time code, store it hashed with a short TTL, and deliver it.

    Delivery depends on configuration:
    - When an SMS provider is configured (SMS_PROVIDER_API_KEY set), a random
      6-digit code is sent by SMS and NEVER returned in the response.
    - When no provider is configured, only demo-allowlisted numbers can proceed,
      using the fixed demo code (returned for that number only, for demo use).
      Any other number gets a clear 503 instead of a silent mock login.
    """
    mobile = (payload.mobile or "").strip()
    if not mobile:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Mobile number is required")

    provider_ready = sms.is_configured()
    is_demo = mobile in settings.demo_allowlist

    if not provider_ready and not is_demo:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="OTP delivery is not configured on this server. Please contact support.",
        )

    # Demo numbers use the fixed demo code ONLY while no real provider is wired.
    use_demo_code = is_demo and not provider_ready
    code = settings.OTP_DEMO_CODE if use_demo_code else _generate_otp_code()

    # Invalidate any earlier unconsumed codes for this number, then store the new
    # one hashed with an expiry and a fresh attempt counter.
    db.query(models.OTPCode).filter(
        models.OTPCode.mobile == mobile,
        models.OTPCode.consumed.is_(False),
    ).update({models.OTPCode.consumed: True})
    otp = models.OTPCode(
        id=uuid.uuid4(),
        mobile=mobile,
        code_hash=_hash_otp(mobile, code),
        expires_at=datetime.now(timezone.utc) + timedelta(seconds=settings.OTP_TTL_SECONDS),
        attempts=0,
        consumed=False,
    )
    db.add(otp)
    db.commit()

    response = {"success": True, "message": f"OTP sent successfully to {mobile}"}

    if provider_ready:
        try:
            sms.send_otp_sms(mobile, code)
        except Exception:
            # Roll the code back so a failed send does not leave a live code.
            otp.consumed = True
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to send OTP. Please try again.",
            )
    elif use_demo_code:
        # Demo convenience for the allowlisted number only; never a real user's code.
        response["demo_mode"] = True
        response["mock_code"] = code

    return response


@router.post("/otp/verify")
@limiter.limit("5/minute")
def verify_otp(request: Request, payload: OTPVerifyRequest, db: Session = Depends(get_db)):
    mobile = (payload.mobile or "").strip()
    submitted = (payload.code or "").strip()
    now = datetime.now(timezone.utc)

    otp = (
        db.query(models.OTPCode)
        .filter(models.OTPCode.mobile == mobile, models.OTPCode.consumed.is_(False))
        .order_by(models.OTPCode.created_at.desc())
        .first()
    )
    if not otp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active OTP for this number. Please request a new code.",
        )

    if _aware(otp.expires_at) < now:
        otp.consumed = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="OTP has expired. Please request a new code.",
        )

    if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
        otp.consumed = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new code.",
        )

    # Constant-time comparison against the stored hash.
    if not hmac.compare_digest(_hash_otp(mobile, submitted), otp.code_hash):
        otp.attempts += 1
        if otp.attempts >= settings.OTP_MAX_ATTEMPTS:
            otp.consumed = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code.",
        )

    # Correct code: burn it so it cannot be replayed.
    otp.consumed = True
    db.commit()

    # 1. Check if user exists, else auto-create
    user = db.query(models.User).filter(models.User.mobile == mobile).first()
    if not user:
        user = models.User(
            id=uuid.uuid4(),
            name="Demo Engineer",
            mobile=mobile,
            email=f"demo_{str(uuid.uuid4())[:8]}@siteflow.co",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Ensure demo company with the frontend-expected UUID exists
    company = _ensure_demo_company(db)

    # 3. Ensure user has an active membership for the demo company
    team_member = db.query(models.CompanyTeam).filter(models.CompanyTeam.user_id == user.id).first()
    if not team_member:
        team_member = models.CompanyTeam(
            id=uuid.uuid4(),
            company_id=company.id,
            user_id=user.id,
            priority_type="partner",
        )
        db.add(team_member)
        db.commit()
        db.refresh(team_member)
    else:
        if str(team_member.company_id) != DEMO_COMPANY_ID:
            team_member.company_id = uuid.UUID(DEMO_COMPANY_ID)
            db.commit()
            db.refresh(team_member)

    # 4. Create access token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "company_id": DEMO_COMPANY_ID,
            "user_name": user.name,
            "mobile": user.mobile,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "mobile": user.mobile,
            "email": user.email,
        },
        "company": {
            "id": DEMO_COMPANY_ID,
            "name": company.name,
            "priority_type": team_member.priority_type,
        },
    }

@router.get("/resolve-company/{slug}")
def resolve_company(slug: str, db: Session = Depends(get_db)):
    company = db.query(models.Company).filter(models.Company.slug == slug).first()
    if not company:
        try:
            company_uuid = uuid.UUID(slug)
            company = db.query(models.Company).filter(models.Company.id == company_uuid).first()
        except ValueError:
            pass
            
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
        
    return {
        "id": str(company.id),
        "name": company.name,
        "slug": company.slug
    }


@router.get("/me")
def get_me(ctx: dict = Depends(get_current_active_company_user), db: Session = Depends(get_db)):
    """Return the current authenticated user's company role context."""
    user = ctx["user"]
    company_id = ctx["company_id"]
    role_id = ctx.get("role_id")
    priority_type = ctx.get("priority_type")
    role_name = None
    if role_id:
        role = db.query(models.CompanyRole).filter(models.CompanyRole.id == role_id).first()
        role_name = role.role_name if role else None
    return {
        "user_id": str(user.id),
        "name": user.name,
        "company_id": str(company_id),
        "role_id": str(role_id) if role_id else None,
        "role": role_name,
        "priority_type": priority_type,
    }


@router.get("/my-companies")
def my_companies(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List the companies the authenticated user belongs to, flagging enterprises
    (companies that are a parent of at least one other company)."""
    memberships = db.query(models.CompanyTeam).filter(
        models.CompanyTeam.user_id == current_user.id
    ).all()
    company_ids = [m.company_id for m in memberships]
    if not company_ids:
        return {"companies": []}

    companies = db.query(models.Company).filter(models.Company.id.in_(company_ids)).all()

    parent_ids = {
        c.parent_company_id
        for c in db.query(models.Company).filter(models.Company.parent_company_id.isnot(None)).all()
        if c.parent_company_id
    }

    result = [
        {
            "id": str(c.id),
            "name": c.name,
            "slug": c.slug,
            "parent_company_id": str(c.parent_company_id) if c.parent_company_id else None,
            "is_enterprise": c.id in parent_ids,
        }
        for c in companies
    ]
    return {"companies": result}
