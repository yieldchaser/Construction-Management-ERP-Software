from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import create_access_token, get_current_active_company_user, get_current_user
from app import models
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

DEMO_COMPANY_ID = "e0000000-0000-0000-0000-000000000000"


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
def send_otp(request: OTPSendRequest):
    # Mock OTP always succeeds during development. Mock code is hardcoded to 123456.
    return {
        "success": True,
        "message": f"Mock OTP code sent successfully to {request.mobile}",
        "mock_code": "123456"
    }

@router.post("/otp/verify")
def verify_otp(request: OTPVerifyRequest, db: Session = Depends(get_db)):
    if request.code != "123456":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP code. Use mock code '123456'"
        )

    # 1. Check if user exists, else auto-create
    user = db.query(models.User).filter(models.User.mobile == request.mobile).first()
    if not user:
        user = models.User(
            id=uuid.uuid4(),
            name="Demo Engineer",
            mobile=request.mobile,
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
