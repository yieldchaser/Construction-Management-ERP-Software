from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth import create_access_token
from app import models
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
            email=f"demo_{str(uuid.uuid4())[:8]}@siteflow.co"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 2. Check if user has active company membership, else create a demo tenant
    team_member = db.query(models.CompanyTeam).filter(models.CompanyTeam.user_id == user.id).first()
    
    if not team_member:
        # Check if any company exists in the database
        company = db.query(models.Company).first()
        if not company:
            company = models.Company(
                id=uuid.uuid4(),
                name="Demo Construction Ltd",
                legal_business_name="Demo Construction India Private Limited",
                gstin="27AADCD2424B1ZP",
                billing_address="101, Skyline Tower, Andheri East, Mumbai, MH - 400069",
                currency_decimal_places=2,
                quantity_decimal_places=3,
                back_dated_limit_days=7
            )
            db.add(company)
            db.commit()
            db.refresh(company)

        # Map user as a partner (admin) of the company
        team_member = models.CompanyTeam(
            id=uuid.uuid4(),
            company_id=company.id,
            user_id=user.id,
            priority_type="partner"
        )
        db.add(team_member)
        db.commit()
        db.refresh(team_member)
    else:
        company = db.query(models.Company).filter(models.Company.id == team_member.company_id).first()

    # 3. Create access token
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "company_id": str(company.id),
            "user_name": user.name,
            "mobile": user.mobile
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "name": user.name,
            "mobile": user.mobile,
            "email": user.email
        },
        "company": {
            "id": str(company.id),
            "name": company.name,
            "priority_type": team_member.priority_type
        }
    }
