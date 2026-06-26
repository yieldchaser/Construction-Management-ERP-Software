from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from app.routers import auth, calculators, budgeting, planning, drawings, procurement, billing, hr, quality, reports, equipment, safety, analytics
from app.database import engine, Base

# Initialize SQLAlchemy tables if they do not exist
# Note: In production this is handled via Supabase SQL migrations, but for local/SQLite dev it serves as an auto-fallback
Base.metadata.create_all(bind=engine)

# Ensure static reports directory exists
os.makedirs("static/reports", exist_ok=True)

app = FastAPI(
    title="SiteFlow - Construction Management API",
    description="Backend microservice handling operational logic, calculators, and integrations.",
    version="3.0.0"
)

# Configure CORS for Next.js frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to the frontend domain
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

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "SiteFlow Core API Engine",
        "version": "3.0.0"
    }
