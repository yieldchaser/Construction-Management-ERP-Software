from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from sqlalchemy import DateTime, String, Numeric, Boolean, Text, func
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.rate_limit import limiter
from app.routers import (
    auth, calculators, budgeting, planning, drawings, procurement,
    billing, hr, quality, reports, equipment, safety, analytics,
    production, dpr, crm, finance, tally, subcon_attendance, settings,
    assets, three_way, wastage, chat, custom_fields, statutory, face_recognition,
    subcon_performance, vendor_performance, rfq, labour, towers, budget,
    library, profile, mom, delete_logs, projects, todos, team_schedule
)
from app.database import engine, Base, SessionLocal
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


def ensure_sqlite_company_team_party_link():
    if not engine.url.drivername.startswith("sqlite"):
        return
    with engine.begin() as conn:
        existing = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(company_team)").fetchall()
        }
        if "library_party_id" not in existing:
            conn.exec_driver_sql('ALTER TABLE company_team ADD COLUMN "library_party_id" VARCHAR(36)')


def backfill_company_team_party_links(db):
    """Associate billing-side company_team rows with their library_party by name within the same company."""
    linked = 0
    for lp in db.query(models.LibraryParty).all():
        if not lp.name:
            continue
        target = (
            db.query(models.CompanyTeam)
            .join(models.User, models.User.id == models.CompanyTeam.user_id)
            .filter(
                models.CompanyTeam.company_id == lp.company_id,
                models.CompanyTeam.library_party_id.is_(None),
                func.lower(func.trim(models.User.name)) == lp.name.strip().lower(),
            )
            .first()
        )
        if target:
            target.library_party_id = lp.id
            linked += 1
    db.commit()
    return linked


ensure_sqlite_company_team_party_link()
_db = SessionLocal()
try:
    backfill_company_team_party_links(_db)
finally:
    _db.close()


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

def ensure_sqlite_company_slug_column():
    if "sqlite" not in str(engine.url):
        return
    with engine.begin() as conn:
        existing_columns = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(companies)").fetchall()
        }
        if "slug" not in existing_columns:
            conn.exec_driver_sql(
                'ALTER TABLE companies ADD COLUMN "slug" VARCHAR(255)'
            )

ensure_sqlite_library_cost_code_columns()
ensure_sqlite_company_slug_column()


def ensure_sqlite_company_parent_column():
    """Add the self-referential parent_company_id grouping column to existing companies tables."""
    if not engine.url.drivername.startswith("sqlite"):
        return
    with engine.begin() as conn:
        existing = {
            row[1]
            for row in conn.exec_driver_sql("PRAGMA table_info(companies)").fetchall()
        }
        if "parent_company_id" not in existing:
            conn.exec_driver_sql(
                'ALTER TABLE companies ADD COLUMN "parent_company_id" VARCHAR(36)'
            )


ensure_sqlite_company_parent_column()

def ensure_sqlite_project_tab_columns():
    """Add columns introduced for the Project Tab parity build to existing tables."""
    if not engine.url.drivername.startswith("sqlite"):
        return

    column_specs = {
        "projects": {
            "project_value": Numeric(18, 2),
            "planned_start_date": DateTime(timezone=True),
            "planned_end_date": DateTime(timezone=True),
            "actual_start_date": DateTime(timezone=True),
            "actual_end_date": DateTime(timezone=True),
            "orientation": String(255),
            "dimension": String(255),
            "scope_of_work": String(),
            "project_avatar": String(),
            "is_pinned": Boolean(),
        },
        "library_cost_codes": {
            "parent_id": String(),
        },
        "library_materials": {
            "alternate_unit": String(50),
        },
        "project_parties": {
            "status": String(50),
        },
    }

    with engine.begin() as conn:
        for table, cols in column_specs.items():
            existing = {row[1] for row in conn.exec_driver_sql(f'PRAGMA table_info("{table}")').fetchall()}
            for col_name, col_type in cols.items():
                if col_name in existing:
                    continue
                conn.exec_driver_sql(
                    f'ALTER TABLE "{table}" ADD COLUMN "{col_name}" {col_type.compile(dialect=engine.dialect)}'
                )

ensure_sqlite_project_tab_columns()


def ensure_sqlite_bill_columns():
    """Add Transaction-tab sub-entity columns to the bills table for SQLite dev."""
    if not engine.url.drivername.startswith("sqlite"):
        return
    required_columns = {
        "items_json": Text(),
        "payment_mode": String(20),
        "payment_bank_name": String(255),
        "payment_ref": String(255),
        "ship_to": Text(),
    }
    with engine.begin() as conn:
        existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(bills)").fetchall()}
        for col, typ in required_columns.items():
            if col in existing:
                continue
            conn.exec_driver_sql(
                f'ALTER TABLE bills ADD COLUMN "{col}" {typ.compile(dialect=engine.dialect)}'
            )


def ensure_sqlite_task_columns():
    """Add the actual-progress column to the tasks table for SQLite dev."""
    if not engine.url.drivername.startswith("sqlite"):
        return
    required_columns = {
        "progress": Numeric(5, 2),
    }
    with engine.begin() as conn:
        existing = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(tasks)").fetchall()}
        for col, typ in required_columns.items():
            if col in existing:
                continue
            conn.exec_driver_sql(
                f'ALTER TABLE tasks ADD COLUMN "{col}" {typ.compile(dialect=engine.dialect)}'
            )


ensure_sqlite_bill_columns()
ensure_sqlite_task_columns()

def ensure_sqlite_schema_sync():
    """Catch-all migration for SQLite dev DBs: add any model column that is
    missing from an existing table. Only nullable columns (or columns with a
    default) are added, so data already present is preserved. This keeps the
    local SQLite schema aligned with models.py without manual per-column ALTERs.
    """
    if not engine.url.drivername.startswith("sqlite"):
        return
    from app import models as _models
    with engine.begin() as conn:
        for tname, tmeta in _models.Base.metadata.tables.items():
            try:
                existing = {row[1] for row in conn.exec_driver_sql(f'PRAGMA table_info("{tname}")').fetchall()}
            except Exception:
                continue
            for col in tmeta.columns:
                if col.name in existing:
                    continue
                if not (col.nullable or col.default is not None or col.server_default is not None):
                    continue
                try:
                    col_type = col.type.compile(dialect=engine.dialect)
                    conn.exec_driver_sql(f'ALTER TABLE "{tname}" ADD COLUMN "{col.name}" {col_type}')
                except Exception as e:
                    print(f"schema_sync skipped {tname}.{col.name}: {e}")

ensure_sqlite_schema_sync()

import uuid
from app.database import SessionLocal

def auto_seed_database():
    db = SessionLocal()
    try:
        # Check if company exists
        company_exists = db.query(models.Company).filter(models.Company.id == uuid.UUID("e0000000-0000-0000-0000-000000000000")).first()
        if company_exists:
            # Update slug if not set for existing seeded db
            if not company_exists.slug:
                company_exists.slug = "demo-construction"
                db.commit()
            print("Database already seeded.")
            return
            
        print("Database is empty. Seeding mock data...")
        
        # 1. Company
        company = models.Company(
            id=uuid.UUID("e0000000-0000-0000-0000-000000000000"),
            name="Demo Construction Ltd",
            slug="demo-construction",
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

# Initialize Sentry error tracking before the FastAPI app is constructed.
# Gated on a non-empty DSN: calling sentry_sdk.init with an empty DSN is a
# silent no-op, but we skip it explicitly so behaviour is obvious in logs and
# we never spend startup cost when Sentry is not configured (e.g. local dev).
from app.config import settings as _app_settings

if _app_settings.SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.starlette import StarletteIntegration

    sentry_sdk.init(
        dsn=_app_settings.SENTRY_DSN,
        integrations=[StarletteIntegration(), FastApiIntegration()],
        # Error tracking, not full APM: sample a small fraction of transactions
        # for performance rather than tracing every request in prod.
        traces_sample_rate=0.1,
    )
    print("Sentry error tracking initialized.")
else:
    print("SENTRY_DSN not set; Sentry error tracking disabled.")

app = FastAPI(
    title="SiteFlow - Construction Management API",
    description="Backend microservice handling operational logic, calculators, and integrations.",
    version="3.0.0"
)

# Rate limiting (slowapi). The limiter instance itself lives in app.rate_limit so
# routers can import it directly and decorate individual endpoints without a
# circular import. Only applied per-route (see e.g. app/routers/auth.py OTP
# endpoints) rather than globally, so no SlowAPIMiddleware is registered here.
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
        "https://construction-management-erp-software.vercel.app",
        "https://siteflow-erp.vercel.app",
        "https://siteflow.vercel.app",
        "https://siteflow.co",
        "https://app.siteflow.co"
    ]
    
    if origins:
        return origins + default_origins
    return default_origins

ALLOWED_ORIGINS = get_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
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
app.include_router(projects.router, prefix="/apis/v3")
app.include_router(todos.router, prefix="/apis/v3")
app.include_router(delete_logs.router, prefix="/apis/v3")
from app.routers import files as files_router
app.include_router(files_router.router, prefix="/apis/v3")
app.include_router(team_schedule.router, prefix="/apis/v3")
from app.routers import google_sheets as google_sheets_router
app.include_router(google_sheets_router.router, prefix="/apis/v3")
from app.routers import admin_migrations as admin_migrations_router
app.include_router(admin_migrations_router.router, prefix="/apis/v3")

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "SiteFlow Core API Engine",
        "version": "3.0.0"
    }
