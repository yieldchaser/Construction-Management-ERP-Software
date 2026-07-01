# -*- coding: utf-8 -*-
"""
Phase 11 — Client Portal & PDF Progress Reports Router
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import (
    ClientReport, Project, Task, Bill, WorkOrder,
    MaterialIndent, PurchaseOrder, SiteInspection, NCR, MaterialTestResult
)
from app.utils.pdf_generator import generate_client_report_pdf

router = APIRouter(prefix="/reports", tags=["Client Reports Portal"])


# ─── Schemas ─────────────────────────────────────────────────────────────────

class ReportCreate(BaseModel):
    report_name: str
    summary_markdown: Optional[str] = None


class ReportResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    report_name: str
    report_date: datetime
    summary_markdown: Optional[str]
    pdf_url: Optional[str]
    is_approved: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/generate/{project_id}", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def generate_report(
    project_id: uuid.UUID,
    payload: ReportCreate,
    db: Session = Depends(get_db)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    report_id = uuid.uuid4()

    # 1. Query Timeline Progress
    tasks_total = db.query(Task).filter(Task.project_id == project_id).count()
    tasks_completed = db.query(Task).filter(Task.project_id == project_id, Task.status == "completed").count()
    tasks_active = db.query(Task).filter(Task.project_id == project_id, Task.status == "in_progress").count()
    tasks_completion_pct = int((tasks_completed / tasks_total) * 100) if tasks_total > 0 else 0

    # 2. Query Billing & Financials
    billing_wo_count = db.query(WorkOrder).filter(WorkOrder.project_id == project_id).count()
    subcon_bills = db.query(Bill).filter(Bill.project_id == project_id, Bill.invoice_type == "subcon").all()
    approved_subcon_bills = [b for b in subcon_bills if b.approval_flag and b.approval_flag.lower() in ("approved", "auto_approved")]
    billing_ra_count = len(approved_subcon_bills)
    total_certified = sum(b.total_payable for b in approved_subcon_bills)
    billing_certified_net = f"{total_certified:.2f}"

    # 3. Query Procurement
    procurement_indents = db.query(MaterialIndent).filter(MaterialIndent.project_id == project_id).count()
    procurement_pos = db.query(PurchaseOrder).filter(PurchaseOrder.project_id == project_id).count()

    # 4. Query Quality Control
    quality_inspections = db.query(SiteInspection).filter(SiteInspection.project_id == project_id).count()
    quality_ncr_open = db.query(NCR).filter(NCR.project_id == project_id, NCR.status == "open").count()
    quality_ncr_closed = db.query(NCR).filter(NCR.project_id == project_id, NCR.status == "closed").count()
    quality_tests = db.query(MaterialTestResult).filter(MaterialTestResult.project_id == project_id).all()
    quality_tests_total = len(quality_tests)
    quality_tests_pass_count = sum(1 for t in quality_tests if t.is_pass)
    quality_tests_pass_rate = int((quality_tests_pass_count / quality_tests_total) * 100) if quality_tests_total > 0 else 0

    metrics = {
        "tasks_total": tasks_total,
        "tasks_completed": tasks_completed,
        "tasks_active": tasks_active,
        "tasks_completion_pct": tasks_completion_pct,
        "billing_wo_count": billing_wo_count,
        "billing_ra_count": billing_ra_count,
        "billing_certified_net": billing_certified_net,
        "procurement_indents": procurement_indents,
        "procurement_pos": procurement_pos,
        "quality_inspections": quality_inspections,
        "quality_ncr_open": quality_ncr_open,
        "quality_ncr_closed": quality_ncr_closed,
        "quality_tests_total": quality_tests_total,
        "quality_tests_pass_count": quality_tests_pass_count,
        "quality_tests_pass_rate": quality_tests_pass_rate,
    }

    # 5. Generate PDF stream
    pdf_bytes = generate_client_report_pdf(payload.report_name, payload.summary_markdown or "", metrics)

    # 6. Save PDF to static files directory
    reports_dir = os.path.join("static", "reports")
    os.makedirs(reports_dir, exist_ok=True)
    pdf_filename = f"{report_id}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)
    
    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    # 7. Create report record in database
    db_report = ClientReport(
        id=report_id,
        project_id=project_id,
        report_name=payload.report_name,
        report_date=datetime.utcnow(),
        summary_markdown=payload.summary_markdown,
        pdf_url=f"/static/reports/{pdf_filename}",
        is_approved=False
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)

    return db_report


@router.get("/{project_id}", response_model=List[ReportResponse])
def list_reports(project_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(ClientReport).filter(
        ClientReport.project_id == project_id
    ).order_by(ClientReport.report_date.desc()).all()


@router.patch("/{report_id}/approve", response_model=ReportResponse)
def approve_report(report_id: uuid.UUID, db: Session = Depends(get_db)):
    report = db.query(ClientReport).filter(ClientReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    report.is_approved = True
    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}/download")
def download_report(report_id: uuid.UUID, db: Session = Depends(get_db)):
    report = db.query(ClientReport).filter(ClientReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_filename = f"{report.id}.pdf"
    pdf_path = os.path.join("static", "reports", pdf_filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server disk")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"{report.report_name.replace(' ', '_')}.pdf"
    )
