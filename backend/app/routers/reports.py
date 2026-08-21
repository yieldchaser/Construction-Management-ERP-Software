# -*- coding: utf-8 -*-
"""
Phase 11 — Client Portal & PDF Progress Reports Router
"""

import os
import uuid
from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import func
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db

# Anchor the PDF store to the repo's backend/static/reports directory so writes
# and reads stay consistent regardless of the process's current working dir.
REPORTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "reports")
from app.auth import get_current_user, verify_project_access, get_company_membership, require_permission
from app.constants import REVENUE_INVOICE_TYPES, EXPENSE_INVOICE_TYPES
from app.models import (
    ClientReport, Project, Task, Bill, WorkOrder,
    MaterialIndent, PurchaseOrder, SiteInspection, NCR, MaterialTestResult,
    DailyProgressReport, PurchaseOrderItem, WarehouseInventory,
    StaffEmployee, AttendanceLog, PayrollRun, PayrollLineItem,
    PaymentRequest, Payment, ProductionBatch, ProductionBatchMaterial,
    ProductionRecipeMaterial,
    CRMQuotation, CRMQuotationItem, CRMLead, CompanyTeam, User,
    BOQItem, MaterialTransaction, GRNItem, GoodsReceiptNote,
    DebitNote, CreditNote, BankAccount, TransactionDeduction,
    Company, CompanyBranch, PdfTemplate
)
from app.utils.pdf_generator import generate_client_report_pdf

router = APIRouter(prefix="/reports", tags=["Client Reports Portal"], dependencies=[Depends(get_current_user)])


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
    db: Session = Depends(get_db),
    _: None = Depends(verify_project_access)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    report_id = uuid.uuid4()

    # 1. Query Timeline Progress
    project_tasks = db.query(Task).filter(Task.project_id == project_id).all()
    tasks_total = len(project_tasks)
    tasks_completed = sum(1 for t in project_tasks if t.status == "completed")
    tasks_active = sum(1 for t in project_tasks if t.status == "in_progress")
    avg_task_progress = (sum(float(t.progress or 0) for t in project_tasks) / tasks_total) if tasks_total > 0 else 0.0
    tasks_completion_pct = int(avg_task_progress)

    # 2. Query Billing & Financials
    billing_wo_count = db.query(WorkOrder).filter(WorkOrder.project_id == project_id).count()
    subcon_bills = db.query(Bill).filter(Bill.project_id == project_id, Bill.invoice_type == "subcon", Bill.status != "Cancelled").all()
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
    quality_tests_assessed = [t for t in quality_tests if t.is_pass is not None]
    quality_tests_unassessed = quality_tests_total - len(quality_tests_assessed)
    quality_tests_pass_count = sum(1 for t in quality_tests_assessed if t.is_pass)
    quality_tests_pass_rate = int((quality_tests_pass_count / len(quality_tests_assessed)) * 100) if quality_tests_assessed else 0

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
        "quality_tests_unassessed": quality_tests_unassessed,
        "quality_tests_pass_rate": quality_tests_pass_rate,
    }

    # 5. Resolve PDF Template settings (Settings -> Document & Fields -> PDF Template)
    company_name = ""
    custom_banner = None
    company = db.query(Company).filter(Company.id == project.company_id).first()
    if company:
        # document_company_name_display: "branch" prints the issuing branch's
        # name instead of the parent company's name (falls back to company
        # name when the project has no branch or the branch can't be found).
        if company.document_company_name_display == "branch" and project.branch_id:
            branch = db.query(CompanyBranch).filter(CompanyBranch.id == project.branch_id).first()
            company_name = branch.branch_name if branch else company.name
        else:
            company_name = company.name

        # custom_pdf_template_enabled: switch from the default hardcoded
        # layout to the company's configured PdfTemplate (falls back to the
        # default layout when no template has been configured yet).
        if company.custom_pdf_template_enabled:
            template = (
                db.query(PdfTemplate)
                .filter(PdfTemplate.company_id == company.id, PdfTemplate.is_default == True)  # noqa: E712
                .first()
                or db.query(PdfTemplate)
                .filter(PdfTemplate.company_id == company.id)
                .order_by(PdfTemplate.created_at.desc())
                .first()
            )
            if template and template.content:
                custom_banner = template.content

    # 6. Generate PDF stream
    from app.utils.document_pdf import load_branding_assets
    pdf_bytes = generate_client_report_pdf(
        payload.report_name,
        payload.summary_markdown or "",
        metrics,
        company_name=company_name,
        custom_banner=custom_banner,
        branding=load_branding_assets(db, project.company_id),
    )

    # 7. Save PDF to static files directory (absolute, CWD-independent)
    reports_dir = REPORTS_DIR
    os.makedirs(reports_dir, exist_ok=True)
    pdf_filename = f"{report_id}.pdf"
    pdf_path = os.path.join(reports_dir, pdf_filename)

    with open(pdf_path, "wb") as f:
        f.write(pdf_bytes)

    # 8. Create report record in database
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
def list_reports(project_id: uuid.UUID, db: Session = Depends(get_db), _: None = Depends(verify_project_access)):
    return db.query(ClientReport).filter(
        ClientReport.project_id == project_id
    ).order_by(ClientReport.report_date.desc()).all()


@router.patch("/{report_id}/approve", response_model=ReportResponse)
def approve_report(report_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(ClientReport).filter(ClientReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    project = db.query(Project).filter(Project.id == report.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    get_company_membership(db, current_user, project.company_id)
    require_permission(db, current_user, project.company_id, "reports:approve")

    report.is_approved = True
    db.commit()
    db.refresh(report)
    return report


@router.get("/{report_id}/download")
def download_report(report_id: uuid.UUID, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    report = db.query(ClientReport).filter(ClientReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    project = db.query(Project).filter(Project.id == report.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    # Tenant check: the report's project belongs to a company the caller is a member of.
    get_company_membership(db, current_user, project.company_id)

    pdf_filename = f"{report.id}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server disk")

    return FileResponse(pdf_path, media_type="application/pdf", filename=pdf_filename)

# Read-only, defensive endpoint that returns real aggregated rows keyed by the
# EXACT column-header strings defined in the frontend report definitions:
#   frontend/src/app/c/[company_id]/reports/[slug]/page.tsx  (REPORT_METADATA)
#   frontend/src/app/c/[company_id]/reports/page.tsx        (exportSchemas)
#
# Any slug not handled here, or any unexpected exception, returns rows: [].
#
# Registered on the existing `router` (prefix "/reports") which main.py mounts
# under "/apis/v3", yielding the full path "/apis/v3/reports/data/{slug}".

class ReportDataResponse(BaseModel):
    slug: str
    rows: List[dict]
    generated_at: str


def _clean(v):
    if v is None:
        return ""
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, uuid.UUID):
        return str(v)
    if isinstance(v, datetime):
        return v.isoformat()
    return v


def _project_ids_for_company(db: Session, cid: uuid.UUID):
    try:
        return [p.id for p in db.query(Project.id).filter(Project.company_id == cid).all()]
    except Exception:
        return []


def _rep_dpr(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    proj_ids = _project_ids_for_company(db, cid)
    if not proj_ids:
        return []
    q = db.query(DailyProgressReport).filter(DailyProgressReport.project_id.in_(proj_ids))
    if pid:
        q = q.filter(DailyProgressReport.project_id == pid)
    rows = []
    for d in q.order_by(DailyProgressReport.dpr_date.desc()).all():
        proj = db.query(Project).filter(Project.id == d.project_id).first()
        task_name = ""
        if d.task_id:
            t = db.query(Task).filter(Task.id == d.task_id).first()
            if t:
                task_name = t.name
        mats = d.materials_consumed or []
        mat_str = "; ".join(
            f"{m.get('material_name', '')}: {m.get('quantity', '')} {m.get('unit', '')}"
            for m in mats if isinstance(m, dict)
        )
        rows.append({
            "Project Name": proj.name if proj else "",
            "DPR Date": _clean(d.dpr_date),
            "Main Task Name": "",
            "Group Task Name": "",
            "Task Name": task_name,
            "Unit": "",
            "Progress Qty": _clean(d.executed_qty),
            "Estimated Qty": "",
            "Workers Count": _clean(d.workers_deployed),
            "Material Used": mat_str,
            "Equipment Used": "",
        })
    return rows


def _rep_task_report(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    proj_ids = _project_ids_for_company(db, cid)
    if not proj_ids:
        return []
    q = db.query(Task).filter(Task.project_id.in_(proj_ids))
    if pid:
        q = q.filter(Task.project_id == pid)
    rows = []
    for t in q.all():
        proj = db.query(Project).filter(Project.id == t.project_id).first()
        rows.append({
            "Project Name": proj.name if proj else "",
            "Main Task Name": "",
            "Group Task Name": "",
            "Task Name": t.name,
            "Assigned To": "",
            "Start Date": _clean(t.start_date),
            "End Date": _clean(t.end_date),
            "Progress % (additional columns likely exist beyond captured scroll range)": "",
        })
    return rows


def _rep_po_item(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    q = db.query(PurchaseOrderItem).join(PurchaseOrder, PurchaseOrderItem.po_id == PurchaseOrder.id)
    q = q.filter(PurchaseOrder.company_id == cid)
    if pid:
        q = q.filter(PurchaseOrder.project_id == pid)
    rows = []
    for it in q.all():
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == it.po_id).first()
        proj = db.query(Project).filter(Project.id == po.project_id).first() if po and po.project_id else None
        received_qty = 0.0
        for gi in db.query(GRNItem).join(GoodsReceiptNote).filter(
            GoodsReceiptNote.po_id == it.po_id,
            GRNItem.po_item_id == it.id,
        ).all():
            received_qty += float(gi.received_qty)
        ordered_qty = float(it.quantity)
        if received_qty >= ordered_qty:
            item_status = "received"
        elif received_qty > 0.0:
            item_status = "partial"
        else:
            item_status = "pending"
        rows.append({
            "PO Date": _clean(po.po_date) if po else "",
            "PO Number": po.po_number if po else "",
            "Project Name": proj.name if proj else "",
            "Vendor Name": "",
            "Material Category": "",
            "Material Name": it.material_name,
            "Unit": it.unit,
            "Unit Price": _clean(it.rate),
            "PO Qty": _clean(it.quantity),
            "PO Received Qty": _clean(received_qty),
            "PO Pending Qty": _clean(max(0.0, ordered_qty - received_qty)),
            "Item Status": item_status,
            "Approval Status": po.approval_flag if po else "",
            "MR No.": "",
            "Challan Number": "",
            "GRN No.": "",
        })
    return rows


def _rep_po_summary(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    q = db.query(PurchaseOrder).filter(PurchaseOrder.company_id == cid)
    if pid:
        q = q.filter(PurchaseOrder.project_id == pid)
    rows = []
    for po in q.order_by(PurchaseOrder.po_date.desc()).all():
        items = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.po_id == po.id).all()
        material = ", ".join(i.material_name for i in items)
        proj = db.query(Project).filter(Project.id == po.project_id).first()
        rows.append({
            "Project Name": proj.name if proj else "",
            "Creator Name": "",
            "PO Creation Date": _clean(po.created_at),
            "PO Date": _clean(po.po_date),
            "Vendor Name": "",
            "PO Number": po.po_number,
            "Material": material,
            "Amount": _clean(po.gross_amount),
            "Discount": "",
            "Other Charges": "",
            "Tax Amount": _clean(po.tax_amount),
            "Total Amount": _clean(po.total_amount),
            "Approval Status": po.approval_flag,
            "Approved or Rejected By": "",
        })
    return rows


def _rep_material_stock(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    proj_ids = _project_ids_for_company(db, cid)
    if not proj_ids:
        return []
    q = db.query(WarehouseInventory).filter(WarehouseInventory.project_id.in_(proj_ids))
    if pid:
        q = q.filter(WarehouseInventory.project_id == pid)
    rows = []
    for w in q.all():
        proj = db.query(Project).filter(Project.id == w.project_id).first()
        rows.append({
            "Project Name": proj.name if proj else "",
            "Material Category": "",
            "Material Name": w.material_name,
            "Unit": w.unit,
            "Opening Stock": "",
            "Received Stock": "",
            "Used Stock": "",
            "Available Stock": _clean(w.on_hand_qty),
        })
    return rows


def _rep_production_material(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    q = db.query(ProductionBatchMaterial).join(ProductionBatch, ProductionBatchMaterial.batch_id == ProductionBatch.id)
    q = q.filter(ProductionBatch.company_id == cid)
    if pid:
        q = q.filter(ProductionBatch.project_id == pid)
    rows = []
    for bm in q.all():
        batch = db.query(ProductionBatch).filter(ProductionBatch.id == bm.batch_id).first()
        proj = db.query(Project).filter(Project.id == batch.project_id).first() if batch and batch.project_id else None
        raw_str = ""
        if batch and batch.recipe_id:
            raw = db.query(ProductionRecipeMaterial).filter(
                ProductionRecipeMaterial.recipe_id == batch.recipe_id
            ).all()
            raw_str = ", ".join(r.material_name for r in raw)
        rows.append({
            "Project Name": proj.name if proj else "",
            "Production Material": bm.material_name,
            "Unit": bm.unit,
            "Quantity": _clean(bm.actual_qty),
            "Production Date": _clean(batch.started_at) if batch else "",
            "Raw Material Consumed": raw_str,
            "Notes": batch.notes if batch and batch.notes else "",
        })
    return rows


def _rep_attendance_salary(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    q = db.query(StaffEmployee).filter(StaffEmployee.company_id == cid)
    if pid:
        q = q.filter(StaffEmployee.project_id == pid)
    rows = []
    for emp in q.all():
        proj = db.query(Project).filter(Project.id == emp.project_id).first() if emp.project_id else None
        present = db.query(AttendanceLog).filter(
            AttendanceLog.employee_id == emp.id, AttendanceLog.status == "Present"
        ).count()
        net = ""
        pl = db.query(PayrollLineItem).join(PayrollRun, PayrollLineItem.payroll_run_id == PayrollRun.id).filter(
            PayrollLineItem.employee_id == emp.id
        )
        if pid:
            pl = pl.filter(PayrollRun.project_id == pid)
        pli = pl.order_by(PayrollRun.run_date.desc()).first()
        if pli:
            net = _clean(pli.net_payable)
        rows.append({
            "Party Name": emp.name,
            "Project Name": proj.name if proj else "",
            "Designation": emp.designation or "",
            "Total Present Days": present,
            "Daily Wage (INR)": "",
            "Net Payable (INR)": net,
        })
    return rows


def _rep_company_payments(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    q = db.query(Payment).filter(Payment.company_id == cid)
    if pid:
        q = q.filter(Payment.project_id == pid)
    rows = []
    for p in q.order_by(Payment.payment_date.desc()).all():
        proj = db.query(Project).filter(Project.id == p.project_id).first() if p.project_id else None
        net = ""
        try:
            if p.amount is not None and p.unsettled_amount is not None:
                net = float(p.amount) - float(p.unsettled_amount)
        except Exception:
            net = ""
        rows.append({
            "Project Name": proj.name if proj else "",
            "Creator Name": "",
            "Party Name": "",
            "Amount": _clean(p.amount),
            "Unsettled Amount": _clean(p.unsettled_amount),
            "Net Amount": net,
            "Settlement Type": "",
            "Remark": p.description or "",
            "Payment Type": p.payment_type,
            "Payment Mode": p.payment_method,
            "Account Name": p.account_name or "",
            "Cost Code": p.cost_code or "",
            "Sub Cost Code": p.sub_cost_code or "",
            "Category": p.category or "",
            "Created Date": _clean(p.created_at),
            "Reference No.": p.reference_number or "",
        })
    return rows


def _rep_payment_request(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(PaymentRequest).filter(PaymentRequest.company_id == cid)
        if pid:
            q = q.filter(PaymentRequest.project_id == pid)
        rows = []
        for pr in q.all():
            proj = db.query(Project).filter(Project.id == pr.project_id).first() if pr.project_id else None
            creator = ""
            if pr.party_company_user_id:
                u = db.query(User).filter(User.id == pr.party_company_user_id).first()
                if u:
                    creator = u.name
            rows.append({
                "Payment Request ID": str(pr.id),
                "Payment Request No.": str(pr.id),
                "Project Name": proj.name if proj else "",
                "Party Name": pr.party_name,
                "Amount": _clean(pr.amount),
                "Payment Date": _clean(pr.created_at),
                "Due Date": _clean(pr.due_date),
                "Creator Name": creator,
                "Request Type": pr.request_type or "",
                "Order/Bill No.": "",
                "Approval Status": pr.approval_status or "Pending",
                "Payment Status": pr.status,
                "Remark": pr.details or "",
                "Account Name": "",
            })
        return rows
    except Exception:
        return []


# ─── Shared helpers for new report handlers ──────────────────────────────────

def _team_user_name(db: Session, company_user_id):
    if not company_user_id:
        return ""
    try:
        tm = db.query(CompanyTeam).filter(CompanyTeam.id == company_user_id).first()
        if tm and tm.user_id:
            u = db.query(User).filter(User.id == tm.user_id).first()
            if u:
                return u.name
    except Exception:
        return ""
    return ""


def _user_name(db: Session, user_id):
    if not user_id:
        return ""
    try:
        u = db.query(User).filter(User.id == user_id).first()
        if u:
            return u.name
    except Exception:
        return ""
    return ""


def _build_party_ledger(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    """Core ledger aggregation across the company's projects.

    Returns (rows, party_final_balance) where rows is the chronological list of
    party-ledger dicts and party_final_balance maps a party name to the last
    running balance recorded for that party.
    """
    proj_ids = _project_ids_for_company(db, cid)

    payments_q = db.query(Payment).filter(Payment.company_id == cid)
    bills_q = db.query(Bill).filter(Bill.company_id == cid)
    debit_q = db.query(DebitNote).filter(DebitNote.company_id == cid)
    credit_q = db.query(CreditNote).filter(CreditNote.company_id == cid)
    salaries_q = db.query(PayrollLineItem).join(PayrollRun)
    if proj_ids:
        salaries_q = salaries_q.filter(PayrollRun.project_id.in_(proj_ids))
    else:
        salaries_q = salaries_q.filter(PayrollRun.project_id.is_(None))

    if pid:
        payments_q = payments_q.filter(Payment.project_id == pid)
        bills_q = bills_q.filter(Bill.project_id == pid)
        debit_q = debit_q.filter(DebitNote.project_id == pid)
        credit_q = credit_q.filter(CreditNote.project_id == pid)
        salaries_q = salaries_q.filter(PayrollRun.project_id == pid)

    raw = []
    for p in payments_q.all():
        raw.append((p.payment_date, "payment", p))
    for b in bills_q.all():
        raw.append((b.invoice_date, "bill", b))
    for s in salaries_q.all():
        raw.append((s.created_at, "salary", s))
    for d in debit_q.all():
        raw.append((d.created_at, "debit", d))
    for c in credit_q.all():
        raw.append((c.created_at, "credit", c))

    raw.sort(key=lambda x: x[0] if x[0] else datetime.min)

    rows = []
    running = 0.0
    party_final = {}
    for dt, et, obj in raw:
        party_name = ""
        party_type = "Party"
        txn_type = ""
        debit = 0.0
        credit = 0.0
        cost_code = ""
        description = ""
        proj = None

        if et == "payment":
            is_in = obj.payment_type == "in"
            amount = float(obj.amount) if obj.amount is not None else 0.0
            party_name = _team_user_name(db, obj.party_company_user_id) or "Walk-in Party"
            if is_in:
                txn_type = "Receipt"
                party_type = "Client"
                debit = amount
                running += amount
            else:
                txn_type = "Expense"
                party_type = "Vendor"
                credit = amount
                running -= amount
            description = obj.description or ("Receipt Payment" if is_in else "Expense Payment")
            cost_code = obj.cost_code or ""
            if obj.project_id:
                proj = db.query(Project).filter(Project.id == obj.project_id).first()
        elif et == "bill":
            is_receipt = obj.invoice_type in REVENUE_INVOICE_TYPES
            amount = float(obj.total_payable) if obj.total_payable is not None else 0.0
            party_name = _team_user_name(db, obj.party_company_user_id) or "Vendor/Client"
            if is_receipt:
                txn_type = "Sale Invoice"
                party_type = "Client"
                debit = amount
                running += amount
            else:
                txn_type = "Purchase Bill"
                party_type = "Vendor"
                credit = amount
                running -= amount
            description = f"Invoice {obj.invoice_number}"
            if obj.project_id:
                proj = db.query(Project).filter(Project.id == obj.project_id).first()
        elif et == "salary":
            amount = float(obj.net_payable) if obj.net_payable is not None else 0.0
            party_name = "Staff Member"
            if obj.employee_id:
                emp = db.query(StaffEmployee).filter(StaffEmployee.id == obj.employee_id).first()
                if emp and emp.company_user_id:
                    party_name = _team_user_name(db, emp.company_user_id) or "Staff Member"
            txn_type = "Salary"
            party_type = "Staff"
            credit = amount
            running -= amount
        elif et == "debit":
            amount = float(obj.total_amount) if obj.total_amount is not None else 0.0
            party_name = _team_user_name(db, obj.party_company_user_id) or "Party"
            txn_type = "Debit Note"
            credit = amount
            running -= amount
            description = obj.notes or "Debit Note"
        elif et == "credit":
            amount = float(obj.total_amount) if obj.total_amount is not None else 0.0
            party_name = _team_user_name(db, obj.party_company_user_id) or "Party"
            txn_type = "Credit Note"
            debit = amount
            running += amount
            description = obj.notes or "Credit Note"

        rows.append({
            "Party Name": party_name,
            "Party Type": party_type,
            "Project Name": proj.name if proj else "",
            "Creator Name": party_name,
            "Description": description,
            "Cost Code": cost_code,
            "Transaction Type": txn_type,
            "Transaction Date": _clean(dt),
            "Party Debit": debit,
            "Party Credit": credit,
            "Balance": running,
        })
        party_final[party_name] = running

    return rows, party_final


def _rep_party_ledger(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        rows, _ = _build_party_ledger(db, cid, pid)
        return rows
    except Exception:
        return []


def _rep_all_party_balances(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        _, party_final = _build_party_ledger(db, cid, pid)
        rows = []
        for name, bal in party_final.items():
            rows.append({
                "Party Name": name,
                "Party Type": "",
                "Balance Amount": bal,
                "Balance Type": "Receivable" if bal >= 0 else "Payable",
                "Petty Cash Balance": "",
                "Salary Balance": "",
            })
        return rows
    except Exception:
        return []


def _rep_item_wise_sales(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        items = db.query(CRMQuotationItem).join(
            CRMQuotation, CRMQuotationItem.quotation_id == CRMQuotation.id
        ).join(
            CRMLead, CRMQuotation.lead_id == CRMLead.id
        ).filter(CRMLead.company_id == cid).all()
        rows = []
        for it in items:
            q = db.query(CRMQuotation).filter(CRMQuotation.id == it.quotation_id).first()
            lead = db.query(CRMLead).filter(CRMLead.id == q.lead_id).first() if q else None
            rows.append({
                "Sale Type": "",
                "Project Name": "",
                "Client Name": lead.client_company_name if lead else "",
                "Invoice Number": "",
                "Invoice Date": _clean(q.created_at) if q else "",
                "Item Name": it.item_name,
                "Unit": it.unit,
                "Quantity": _clean(it.qty),
                "Item Rate": _clean(it.selling_price),
                "Tax %": _clean(it.supply_tax_pct),
                "Tax Amount": "",
                "Gross Amount": "",
                "Total Amount": _clean(it.total_amount),
                "Invoice Created": _clean(q.created_at) if q else "",
            })
        return rows
    except Exception:
        return []


def _rep_company_sales(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(Bill).filter(Bill.company_id == cid, Bill.invoice_type.in_(REVENUE_INVOICE_TYPES), Bill.status != "Cancelled")
        if pid:
            q = q.filter(Bill.project_id == pid)
        # R2-377: report the retention actually withheld per bill instead of a
        # hardcoded empty column, so held retention is enumerable.
        ret_q = (
            db.query(TransactionDeduction.bill_id, func.coalesce(func.sum(TransactionDeduction.amount), 0))
            .join(Bill, TransactionDeduction.bill_id == Bill.id)
            .filter(
                Bill.company_id == cid,
                Bill.status != "Cancelled",
                TransactionDeduction.deduction_type == "Retention",
            )
        )
        if pid:
            ret_q = ret_q.filter(Bill.project_id == pid)
        retention_by_bill = dict(ret_q.group_by(TransactionDeduction.bill_id).all())
        rows = []
        for b in q.order_by(Bill.invoice_date.desc()).all():
            proj = db.query(Project).filter(Project.id == b.project_id).first() if b.project_id else None
            party = _team_user_name(db, b.party_company_user_id)
            rows.append({
                "Invoice Date": _clean(b.invoice_date),
                "Sale Type": b.invoice_type,
                "Client Name": party,
                "Project Name": proj.name if proj else "",
                "Invoice Number": b.invoice_number,
                "Total Amount": _clean(b.total_payable),
                "Retention Amount": _clean(retention_by_bill.get(b.id, 0)),
                "Post Tax Deduction": "",
                "Net Amount": "",
                "Due Date": _clean(b.due_date),
                "Payment Received": "",
                "Balance Due": "",
                "Payment Status": b.status,
                "Notes": "",
                "Creator Name": "",
                "Settlement Amounts": "",
                "Payment Dates": "",
                "Reference Numbers": "",
                "Payment Total Amounts": "",
            })
        return rows
    except Exception:
        return []


def _rep_crm_lead_detail(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(CRMLead).filter(CRMLead.company_id == cid)
        rows = []
        for lead in q.order_by(CRMLead.lead_date.desc()).all():
            assignees = ""
            if lead.assignee_id:
                assignees = _team_user_name(db, lead.assignee_id)
            rows.append({
                "Lead Date": _clean(lead.lead_date),
                "Lead Name": lead.lead_type or "",
                "Contact Name": lead.contact_name,
                "Contact No.": lead.phone_no,
                "Lead Status": lead.status,
                "Lead Priority": lead.priority,
                "Lead Source": lead.source or "",
                "Lead Category": lead.category or "",
                "Lead Company": lead.client_company_name or "",
                "Email": lead.email or "",
                "Budget": _clean(lead.budget),
                "Last Contacted Date": "",
                "Followup Date": _clean(lead.next_follow_up),
                "Expected Closure Date": _clean(lead.expected_closure),
                "Remark": lead.description or "",
                "Assignees": assignees,
            })
        return rows
    except Exception:
        return []


def _task_ancestor_names(db: Session, task):
    main = ""
    group = ""
    try:
        chain = []
        cur = task
        while cur is not None:
            chain.append(cur)
            if cur.parent_id:
                cur = db.query(Task).filter(Task.id == cur.parent_id).first()
            else:
                cur = None
        chain.reverse()
        if chain:
            main = chain[0].name
            if len(chain) > 1:
                group = chain[-2].name
    except Exception:
        pass
    return main, group


def _rep_task_measurement_book(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        proj_ids = _project_ids_for_company(db, cid)
        if not proj_ids:
            return []
        q = db.query(Task).filter(Task.project_id.in_(proj_ids))
        if pid:
            q = q.filter(Task.project_id == pid)
        rows = []
        for t in q.all():
            proj = db.query(Project).filter(Project.id == t.project_id).first()
            main, group = _task_ancestor_names(db, t)
            boq = db.query(BOQItem).filter(BOQItem.id == t.boq_item_id).first() if t.boq_item_id else None
            dpr = db.query(DailyProgressReport).filter(
                DailyProgressReport.task_id == t.id
            ).order_by(DailyProgressReport.dpr_date.desc()).first()
            rows.append({
                "Project Name": proj.name if proj else "",
                "Main Task Name": main,
                "Group Task Name": group,
                "Task Name": t.name,
                "Progress Date": _clean(dpr.dpr_date) if dpr else "",
                "Unit": boq.unit if boq else "",
                "Estimated Quantity": _clean(boq.quantity) if boq else "",
                "Opening Quantity": "",
                "Number": "",
                "Length": "",
                "Width": "",
                "Height": "",
                "Progress Quantity": _clean(dpr.executed_qty) if dpr else "",
                "Closing Quantity": "",
                "Progress Notes": dpr.notes if dpr else "",
            })
        return rows
    except Exception:
        return []


def _rep_material_stock_movement(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        proj_ids = _project_ids_for_company(db, cid)
        if not proj_ids:
            return []
        q = db.query(MaterialTransaction).filter(MaterialTransaction.project_id.in_(proj_ids))
        if pid:
            q = q.filter(MaterialTransaction.project_id == pid)
        txns = q.order_by(MaterialTransaction.created_at.asc()).all()
        # Compute running per-material open/close
        running = {}
        rows = []
        for m in txns:
            proj = db.query(Project).filter(Project.id == m.project_id).first()
            bal = running.get(m.material_name, 0.0)
            qty = float(m.qty) if m.qty is not None else 0.0
            stock_in = 0.0
            stock_out = 0.0
            opening = bal
            if m.type == "received":
                bal += qty
                stock_in = qty
            elif m.type == "used":
                bal -= qty
                stock_out = qty
            elif m.type == "returned":
                bal += qty
                stock_in = qty
            else:
                bal -= qty
                stock_out = qty
            running[m.material_name] = bal
            rows.append({
                "Project Name": proj.name if proj else "",
                "Material Name": m.material_name,
                "UOM": "",
                "Date": _clean(m.created_at),
                "Opening Qty": opening,
                "Stock In": stock_in,
                "Stock Out": stock_out,
                "Closing Qty": bal,
            })
        return rows
    except Exception:
        return []


def _rep_material_received_used(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(GRNItem).join(
            GoodsReceiptNote, GRNItem.grn_id == GoodsReceiptNote.id
        ).filter(GoodsReceiptNote.company_id == cid)
        if pid:
            q = q.filter(GoodsReceiptNote.project_id == pid)
        rows = []
        for gi in q.all():
            grn = db.query(GoodsReceiptNote).filter(GoodsReceiptNote.id == gi.grn_id).first()
            po_item = db.query(PurchaseOrderItem).filter(PurchaseOrderItem.id == gi.po_item_id).first() if gi.po_item_id else None
            po = None
            if grn and grn.po_id:
                po = db.query(PurchaseOrder).filter(PurchaseOrder.id == grn.po_id).first()
            proj = db.query(Project).filter(Project.id == grn.project_id).first() if grn and grn.project_id else None
            party = ""
            if po and po.vendor_id:
                party = _team_user_name(db, po.vendor_id)
            created_by = _team_user_name(db, grn.received_by) if grn and grn.received_by else ""
            rows.append({
                "Material": po_item.material_name if po_item else "",
                "Project Name": proj.name if proj else "",
                "Party Name": party,
                "Created By": created_by,
                "GRN No.": grn.grn_number if grn else "",
                "Challan Number": "",
                "Entry Type": "",
                "Transfer Project": "",
                "Purchase Done": "",
                "Receiving Date": _clean(grn.received_date) if grn else "",
                "Unit": po_item.unit if po_item else "",
                "Quantity": _clean(gi.received_qty),
                "Unit Price with Tax": _clean(po_item.rate) if po_item else "",
                "Total Amount": _clean(po_item.total_amount) if po_item else "",
                "Remark": "",
                "Vehicle Number": "",
                "PO Number": po.po_number if po else "",
                "PO Quantity": _clean(po_item.quantity) if po_item else "",
                "PO Date": _clean(po.po_date) if po else "",
                "Main Task Name": "",
                "Group Task Name": "",
                "Task Name": "",
                "Equipment Name": "",
                "Equipment No.": "",
            })
        return rows
    except Exception:
        return []


def _rep_task_attendance(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(AttendanceLog).join(Project, AttendanceLog.project_id == Project.id).filter(
            Project.company_id == cid
        )
        if pid:
            q = q.filter(AttendanceLog.project_id == pid)
        rows = []
        for a in q.order_by(AttendanceLog.attendance_date.desc()).all():
            proj = db.query(Project).filter(Project.id == a.project_id).first()
            emp = db.query(StaffEmployee).filter(StaffEmployee.id == a.employee_id).first() if a.employee_id else None
            workforce = emp.name if emp else ""
            rows.append({
                "Party Name": "",
                "Workforce Name": workforce,
                "Project Name": proj.name if proj else "",
                "Attendance Date": _clean(a.attendance_date),
                "Attendance Status": a.status,
                "Main Task Name": "",
                "Group Task Name": "",
                "Task Name": "",
                "Workers on Task": "",
                "Work Hours": _clean(a.hours_worked),
                "Total Hours": "",
                "Task Labour Cost": "",
            })
        return rows
    except Exception:
        return []


def _gst_split(tax_amount):
    """Clearly-labeled standard assumption: no place-of-supply data available,
    so split the tax equally into CGST and SGST, IGST/UTGST = 0."""
    try:
        tax = float(tax_amount) if tax_amount is not None else 0.0
    except Exception:
        tax = 0.0
    half = tax / 2.0
    return half, half, 0.0, 0.0


def _rep_gstr1_sales(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(Bill).filter(Bill.company_id == cid, Bill.invoice_type.in_(REVENUE_INVOICE_TYPES), Bill.status != "Cancelled")
        if pid:
            q = q.filter(Bill.project_id == pid)
        rows = []
        for b in q.order_by(Bill.invoice_date.desc()).all():
            proj = db.query(Project).filter(Project.id == b.project_id).first() if b.project_id else None
            party = _team_user_name(db, b.party_company_user_id)
            cgst, sgst, igst, utgst = _gst_split(b.gst_amount)
            rows.append({
                "Party Name": party,
                "Party GST": "",
                "Project Name": proj.name if proj else "",
                "Invoice Type": b.invoice_type,
                "Invoice Date": _clean(b.invoice_date),
                "Invoice Number": b.invoice_number,
                "Invoice Amount": _clean(b.total_payable),
                "Tax Amount": _clean(b.gst_amount),
                "CGST": cgst,
                "SGST": sgst,
                "IGST": igst,
                "UTGST": utgst,
                "Company GST": "",
            })
        return rows
    except Exception:
        return []


def _rep_gstr2_purchase(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        rows = []
        bills_q = db.query(Bill).filter(Bill.company_id == cid, Bill.invoice_type.in_(EXPENSE_INVOICE_TYPES), Bill.status != "Cancelled")
        if pid:
            bills_q = bills_q.filter(Bill.project_id == pid)
        for b in bills_q.order_by(Bill.invoice_date.desc()).all():
            proj = db.query(Project).filter(Project.id == b.project_id).first() if b.project_id else None
            party = _team_user_name(db, b.party_company_user_id)
            cgst, sgst, igst, utgst = _gst_split(b.gst_amount)
            rows.append({
                "Party Name": party,
                "Party Tax No.": "",
                "Project Name": proj.name if proj else "",
                "Bill Number": b.invoice_number,
                "Expense Type": b.invoice_type,
                "Expense Date": _clean(b.invoice_date),
                "Expense Amount": _clean(b.total_payable),
                "Tax Amount": _clean(b.gst_amount),
                "CGST": cgst,
                "SGST": sgst,
                "IGST": igst,
                "UTGST": utgst,
                "Company Tax No.": "",
            })
        pay_q = db.query(Payment).filter(Payment.company_id == cid, Payment.payment_type == "out")
        if pid:
            pay_q = pay_q.filter(Payment.project_id == pid)
        for p in pay_q.order_by(Payment.payment_date.desc()).all():
            proj = db.query(Project).filter(Project.id == p.project_id).first() if p.project_id else None
            party = _team_user_name(db, p.party_company_user_id)
            rows.append({
                "Party Name": party,
                "Party Tax No.": "",
                "Project Name": proj.name if proj else "",
                "Bill Number": "",
                "Expense Type": "Payment Out",
                "Expense Date": _clean(p.payment_date),
                "Expense Amount": _clean(p.amount),
                "Tax Amount": "",
                "CGST": 0.0,
                "SGST": 0.0,
                "IGST": 0.0,
                "UTGST": 0.0,
                "Company Tax No.": "",
            })
        return rows
    except Exception:
        return []


def _rep_sales_deduction_retention(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(TransactionDeduction).join(Bill, TransactionDeduction.bill_id == Bill.id).filter(
            Bill.company_id == cid
        )
        if pid:
            q = q.filter(Bill.project_id == pid)
        rows = []
        for d in q.all():
            b = db.query(Bill).filter(Bill.id == d.bill_id).first()
            proj = db.query(Project).filter(Project.id == b.project_id).first() if b and b.project_id else None
            party = _team_user_name(db, b.party_company_user_id) if b else ""
            rows.append({
                "Item Name": "",
                "Amount": _clean(d.amount),
                "Project Name": proj.name if proj else "",
                "Party Name": party,
                "Invoice Number": b.invoice_number if b else "",
                "Creator Name": "",
                "Type": d.deduction_type,
                "Entry Creation Date": _clean(d.created_at),
                "Due Date": _clean(d.release_due_date),
            })
        return rows
    except Exception:
        return []


def _rep_bank_statement(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(Payment).filter(Payment.company_id == cid, Payment.account_name.isnot(None))
        if pid:
            q = q.filter(Payment.project_id == pid)
        payments = q.order_by(Payment.payment_date.asc()).all()
        by_account = {}
        for p in payments:
            by_account.setdefault(p.account_name, []).append(p)
        rows = []
        for account, ps in by_account.items():
            proj_cache = {}
            party_cache = {}
            running = 0.0
            for p in ps:
                proj = proj_cache.get(p.project_id)
                if proj is None and p.project_id:
                    proj = db.query(Project).filter(Project.id == p.project_id).first()
                    proj_cache[p.project_id] = proj
                party = party_cache.get(p.party_company_user_id)
                if party is None:
                    party = _team_user_name(db, p.party_company_user_id)
                    party_cache[p.party_company_user_id] = party
                credit = 0.0
                debit = 0.0
                amt = float(p.amount) if p.amount is not None else 0.0
                if p.payment_type == "in":
                    credit = amt
                    running += amt
                else:
                    debit = amt
                    running -= amt
                rows.append({
                    "Account Name": p.account_name,
                    "Account Number": "",
                    "Bank Name": "",
                    "Project Name": proj.name if proj else "",
                    "Party Name": party,
                    "Payment Date": _clean(p.payment_date),
                    "Credit": credit,
                    "Debit": debit,
                    "Balance": running,
                    "Remarks": p.description or "",
                })
        return rows
    except Exception:
        return []


def _rep_project_wise_payment_summary(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(Payment).filter(Payment.company_id == cid)
        if pid:
            q = q.filter(Payment.project_id == pid)
        payments = q.all()
        by_proj = {}
        for p in payments:
            by_proj.setdefault(p.project_id, []).append(p)
        proj_cache = {}
        rows = []
        for proj_id, ps in by_proj.items():
            proj = proj_cache.get(proj_id)
            if proj is None and proj_id:
                proj = db.query(Project).filter(Project.id == proj_id).first()
                proj_cache[proj_id] = proj
            count = len(ps)
            paid = sum(float(p.amount) for p in ps if p.payment_type == "in" and p.amount is not None)
            remaining = sum(float(p.unsettled_amount) for p in ps if p.unsettled_amount is not None)
            last_dt = max((p.payment_date for p in ps if p.payment_date), default=None)
            rows.append({
                "Project Name": proj.name if proj else (str(proj_id) if proj_id else "Unspecified"),
                "Payment Count": count,
                "Amount Paid (INR)": paid,
                "Remaining Balance (INR)": remaining,
                "Last Transaction Date": _clean(last_dt),
            })
        return rows
    except Exception:
        return []


def _rep_project_payment(db: Session, cid: uuid.UUID, pid: Optional[uuid.UUID]):
    try:
        q = db.query(Payment).filter(Payment.company_id == cid)
        if pid:
            q = q.filter(Payment.project_id == pid)
        rows = []
        for p in q.order_by(Payment.payment_date.desc()).all():
            proj = db.query(Project).filter(Project.id == p.project_id).first() if p.project_id else None
            party = _team_user_name(db, p.party_company_user_id)
            rows.append({
                "Payment Date": _clean(p.payment_date),
                "Project Name": proj.name if proj else "",
                "Creator Name": "",
                "Party Name": party,
                "Amount": _clean(p.amount),
                "Remark": p.description or "",
                "Reference No.": p.reference_number or "",
                "Payment Type": p.payment_type,
                "Payment Mode": p.payment_method,
                "Account Name": p.account_name or "",
                "Category": p.category or "",
                "Cost Code": p.cost_code or "",
                "Sub Cost Code": p.sub_cost_code or "",
                "Created Date": _clean(p.created_at),
            })
        return rows
    except Exception:
        return []


_REPORT_HANDLERS = {
    "dpr": _rep_dpr,
    "task-report": _rep_task_report,
    "purchase-order-item": _rep_po_item,
    "po-summary": _rep_po_summary,
    "material-stock": _rep_material_stock,
    "production-material": _rep_production_material,
    "attendance-salary": _rep_attendance_salary,
    "company-payments": _rep_company_payments,
    "payment-request": _rep_payment_request,
    "party-ledger": _rep_party_ledger,
    "all-party-balances": _rep_all_party_balances,
    "item-wise-sales": _rep_item_wise_sales,
    "company-sales": _rep_company_sales,
    "crm-lead-detail": _rep_crm_lead_detail,
    "task-measurement-book": _rep_task_measurement_book,
    "material-stock-movement": _rep_material_stock_movement,
    "material-received-used": _rep_material_received_used,
    "task-attendance": _rep_task_attendance,
    "gstr1-sales": _rep_gstr1_sales,
    "gstr2-purchase": _rep_gstr2_purchase,
    "sales-deduction-retention": _rep_sales_deduction_retention,
    "bank-statement": _rep_bank_statement,
    "project-wise-payment-summary": _rep_project_wise_payment_summary,
    "project-payment": _rep_project_payment,
}


@router.get("/data/{slug}", response_model=ReportDataResponse)
def get_report_data(
    slug: str,
    company_id: str,
    project_id: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    generated_at = datetime.utcnow().isoformat()
    try:
        cid = uuid.UUID(company_id)
        pid = uuid.UUID(project_id) if project_id else None
    except Exception:
        return {"slug": slug, "rows": [], "generated_at": generated_at}

    get_company_membership(db, current_user, cid)
    if pid is not None:
        project = db.query(Project).filter(Project.id == pid).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        get_company_membership(db, current_user, project.company_id)

    rows: List[dict] = []
    handler = _REPORT_HANDLERS.get(slug)
    if handler is not None:
        try:
            rows = handler(db, cid, pid) or []
        except Exception:
            rows = []
    return {"slug": slug, "rows": rows, "generated_at": generated_at}
