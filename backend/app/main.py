from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import DateTime, String
from app.routers import (
    auth, calculators, budgeting, planning, drawings, procurement,
    billing, hr, quality, reports, equipment, safety, analytics,
    production, dpr, crm, finance, tally, subcon_attendance, settings,
    assets, three_way, wastage, chat, custom_fields, statutory, face_recognition,
    subcon_performance, vendor_performance, rfq, labour, towers, budget,
    library, profile, mom, delete_logs
)
from app.database import engine, Base
from app import models

# Initialize SQLAlchemy tables if they do not exist
# Note: In production this is handled via Supabase SQL migrations, but for local/SQLite dev it serves as an auto-fallback
Base.metadata.create_all(bind=engine)

def ensure_sqlite_library_party_columns():
    if not engine.url.drivername.startswith("sqlite"):
        return

    required_columns = {
        "bank_name": String(255),
        "account_name": String(255),
        "account_number": String(100),
        "ifsc_code": String(20),
        "tax_no": String(100),
        "esi_number": String(100),
        "pf_number": String(100),
        "father_name": String(255),
        "passport_no": String(100),
        "passport_expiry_date": DateTime(timezone=True),
        "creator_name": String(255),
    }

    with engine.begin() as conn:
        existing_columns = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(library_parties)").fetchall()
        }
        for column_name, column_type in required_columns.items():
            if column_name in existing_columns:
                continue
            conn.exec_driver_sql(
                f'ALTER TABLE library_parties ADD COLUMN "{column_name}" {column_type.compile(dialect=engine.dialect)}'
            )

ensure_sqlite_library_party_columns()

def ensure_sqlite_library_cost_code_columns():
    if not engine.url.drivername.startswith("sqlite"):
        return

    required_columns = {
        "sub_cost_code": String(100),
    }

    with engine.begin() as conn:
        existing_columns = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(library_cost_codes)").fetchall()
        }
        for column_name, column_type in required_columns.items():
            if column_name in existing_columns:
                continue
            conn.exec_driver_sql(
                f'ALTER TABLE library_cost_codes ADD COLUMN "{column_name}" {column_type.compile(dialect=engine.dialect)}'
            )

ensure_sqlite_library_cost_code_columns()

import uuid
from app.database import SessionLocal

def auto_seed_database():
    db = SessionLocal()
    try:
        # Check if company exists
        company_exists = db.query(models.Company).filter(models.Company.id == uuid.UUID("e0000000-0000-0000-0000-000000000000")).first()
        if company_exists:
            print("Database already seeded.")
            return
            
        print("Database is empty. Seeding mock data...")
        
        # 1. Company
        company = models.Company(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000000"),
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
        
        # 2. User & Team
        user = models.User(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000100"),
            name="Demo Engineer",
            mobile="+919876543210",
            email="demo@siteflow.co"
        )
        db.add(user)
        db.commit()
        
        team = models.CompanyTeam(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000200"),
            company_id=company.id,
            user_id=user.id,
            priority_type="partner"
        )
        db.add(team)
        db.commit()
        
        # 3. Projects
        PROJ_1 = uuid.UUID("d0000000-0000-0000-0000-000000000001")
        PROJ_2 = uuid.UUID("d0000000-0000-0000-0000-000000000002")
        PROJ_3 = uuid.UUID("d0000000-0000-0000-0000-000000000003")
        
        project_data = [
            (PROJ_1, "Metro Terminal (Phase 2)", "MET-02", "Mumbai", "Maharashtra"),
            (PROJ_2, "Bypass Highway Flyover", "HWY-FLY", "Pune", "Maharashtra"),
            (PROJ_3, "Alpha Premium Residences", "ALF-RES", "Delhi", "Delhi"),
        ]
        for pid, name, code, city, state in project_data:
            proj = models.Project(
                id=pid,
                company_id=company.id,
                name=name,
                code=code,
                city=city,
                state=state,
                status="Ongoing"
            )
            db.add(proj)
        db.commit()
        
        # 4. Cost Codes
        codes = [
            ("CC-01", "Excavation Work"),
            ("CC-02", "RCC Foundations"),
            ("CC-03", "Masonry & Plaster"),
            ("CC-04", "Electrical Cabling")
        ]
        for code, name in codes:
            db.add(models.LibraryCostCode(company_id=company.id, code=code, name=name))
            
        # 5. Deductions
        deductions = ["Retention Money 5%", "TDS Section 194C", "Labor Cess 1%"]
        for name in deductions:
            db.add(models.LibraryDeduction(company_id=company.id, name=name))
            
        # 6. Materials
        materials = [
            ("Cement M25", "bags", 18.0, "Cement", 420.0),
            ("TMT Steel 12mm", "MT", 18.0, "Steel", 65000.0),
            ("River Sand", "m3", 5.0, "Aggregates", 2500.0)
        ]
        for name, unit, gst, category, cost in materials:
            db.add(models.LibraryMaterial(
                company_id=company.id,
                name=name,
                unit=unit,
                gst_rate=gst,
                category=category,
                unit_cost=cost
            ))
        db.commit()
        print("Database auto-seeded successfully on boot!")
    except Exception as e:
        print(f"Error seeding database: {e}")
    finally:
        db.close()

auto_seed_database()

# Ensure static reports directory exists
os.makedirs("static/reports", exist_ok=True)

app = FastAPI(
    title="SiteFlow - Construction Management API",
    description="Backend microservice handling operational logic, calculators, and integrations.",
    version="3.0.0"
)

# Configure CORS for Next.js frontend communication.
# Origins are restricted to an explicit allowlist. The production frontend origin is
# supplied via FRONTEND_URL (comma-separated list permitted), falling back to the local
# dev origins. A wildcard origin is intentionally NOT used because it is incompatible with
# allow_credentials=True and is rejected by browsers.
def get_allowed_origins() -> list[str]:
    env_origins = os.getenv("FRONTEND_URL", "")
    origins = [o.strip() for o in env_origins.split(",") if o.strip()]
    
    default_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://construction-management-erp-softwar-ten.vercel.app",
        "https://construction-management-erp-software.vercel.app"
    ]
    
    if origins:
        return origins + default_origins
    return default_origins

ALLOWED_ORIGINS = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory="static"), name="static")

# Register routers
app.include_router(auth.router, prefix="/apis/v3")
app.include_router(calculators.router, prefix="/apis/v3")
app.include_router(budgeting.router, prefix="/apis/v3")
app.include_router(planning.router, prefix="/apis/v3")
app.include_router(drawings.router, prefix="/apis/v3")
app.include_router(procurement.router, prefix="/apis/v3")
app.include_router(billing.router, prefix="/apis/v3")
app.include_router(hr.router, prefix="/apis/v3")
app.include_router(quality.router, prefix="/apis/v3")
app.include_router(reports.router, prefix="/apis/v3")
app.include_router(equipment.router, prefix="/apis/v3")
app.include_router(safety.router, prefix="/apis/v3")
app.include_router(analytics.router, prefix="/apis/v3")
app.include_router(production.router, prefix="/apis/v3")
app.include_router(dpr.router, prefix="/apis/v3")
app.include_router(crm.router, prefix="/apis/v3")
app.include_router(finance.router, prefix="/apis/v3")
app.include_router(finance.cashbook_router, prefix="/apis/v3")
app.include_router(tally.router, prefix="/apis/v3")
app.include_router(subcon_attendance.router, prefix="/apis/v3")
app.include_router(settings.router, prefix="/apis/v3")
app.include_router(assets.router, prefix="/apis/v3")
app.include_router(three_way.router, prefix="/apis/v3")
app.include_router(wastage.router, prefix="/apis/v3")
app.include_router(chat.router, prefix="/apis/v3")
app.include_router(custom_fields.router, prefix="/apis/v3")
app.include_router(statutory.router, prefix="/apis/v3")
app.include_router(face_recognition.router, prefix="/apis/v3")
app.include_router(subcon_performance.router, prefix="/apis/v3")
app.include_router(vendor_performance.router, prefix="/apis/v3")
app.include_router(rfq.router, prefix="/apis/v3")
app.include_router(labour.router, prefix="/apis/v3")
app.include_router(towers.router, prefix="/apis/v3")
app.include_router(budget.router, prefix="/apis/v3")
app.include_router(library.router, prefix="/apis/v3")
app.include_router(profile.router, prefix="/apis/v3")
app.include_router(mom.router, prefix="/apis/v3")
app.include_router(delete_logs.router, prefix="/apis/v3")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "SiteFlow Core API Engine",
        "version": "3.0.0"
    }
