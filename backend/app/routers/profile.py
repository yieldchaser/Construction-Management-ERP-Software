from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.auth import get_current_user, get_company_membership
import uuid

router = APIRouter(prefix="/profile", tags=["Profile & Onboarding"], dependencies=[Depends(get_current_user)])

class OnboardingRequest(BaseModel):
    company_id: str = Field(..., example="e0000000-0000-0000-0000-000000000000")
    company_name: str = Field(..., example="My Construction Co")
    city: str = Field(..., example="Bangalore")
    segment: str = Field(..., example="Developer")
    categories: str = Field("", example="Residential Real Estate")

@router.post("/onboarding")
def update_onboarding(
    request: OnboardingRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        co_uuid = uuid.UUID(request.company_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid company UUID")

    # Multi-tenant: the caller must belong to the company they are updating.
    # Without this any authenticated user could rename an arbitrary company by id.
    get_company_membership(db, current_user, co_uuid)

    company = db.query(models.Company).filter(models.Company.id == co_uuid).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    company.name = request.company_name
    company.onboarding_city = request.city
    company.onboarding_segment = request.segment
    company.onboarding_categories = request.categories
    company.onboarding_completed = True

    db.commit()
    db.refresh(company)

    return {
        "success": True,
        "message": "Onboarding completed successfully",
        "company": {
            "id": str(company.id),
            "name": company.name,
            "city": company.onboarding_city,
            "segment": company.onboarding_segment,
            "categories": company.onboarding_categories,
        }
    }
