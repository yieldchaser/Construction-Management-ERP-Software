# -*- coding: utf-8 -*-
"""
D4 (R2-041/R2-125/R2-319) — management report for forward-only cut-over.

GET /apis/v3/admin/pos-would-change/{company_id}

Lists existing invoices whose tax head (IGST vs CGST+SGST) would change
under the D4 rule (Project.state vs supplier GSTIN prefix) compared to
the legacy unconditional CGST+SGST halves.

Forward-only — no data rewrite; the endpoint is read-only and intended
for the accountant to review before the cut-off date. Already-filed
invoices are not rewritten.

Auth: caller must be a member of the company (same tenant check as
other finance views). No admin secret — this is a per-company
management view, not a whole-DB migration.
"""

import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.auth import get_current_user, get_company_membership
from app.models import Company, CompanyBranch, Project, Bill, User
from app.gst_utils import project_state_code, supplier_state_code, is_inter_state

router = APIRouter(prefix="/admin", tags=["Admin - POS"])


class PosWouldChangeRow(BaseModel):
    bill_id: str
    invoice_number: str
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    project_state_raw: Optional[str] = None
    project_state_code: Optional[str] = None
    supplier_gstin: Optional[str] = None
    supplier_state_code: Optional[str] = None
    gst_amount: float
    legacy_head: str  # "CGST+SGST"
    would_be_head: str  # "IGST" or "CGST+SGST"
    would_change: bool


class PosWouldChangeResponse(BaseModel):
    company_id: str
    supplier_gstin: Optional[str] = None
    supplier_state_code: Optional[str] = None
    total_invoices: int
    would_change_count: int
    would_change: List[PosWouldChangeRow]
    cut_off_note: str


def _resolve_supplier_gstin(db: Session, company_id: uuid.UUID, project: Optional[Project]) -> Optional[str]:
    """Same precedence as document_pdf.resolve_supplier_tax_details."""
    comp = db.query(Company).filter(Company.id == company_id).first()
    gstin = getattr(comp, "gstin", None) if comp else None
    # Branch GSTIN wins when masthead is branch and project has a branch
    if comp and getattr(comp, "document_company_name_display", None) == "branch" and project and getattr(project, "branch_id", None):
        br = db.query(CompanyBranch).filter(CompanyBranch.id == project.branch_id).first()
        if br and getattr(br, "gstin", None):
            gstin = br.gstin
    elif project and getattr(project, "branch_id", None):
        # Fall back to branch GSTIN even when not strictly branch-masthead, if branch has one
        # (conservative: match billing.py's resolve_supplier_tax_details behavior which checks branch regardless)
        try:
            br = db.query(CompanyBranch).filter(CompanyBranch.id == project.branch_id).first()
            if br and getattr(br, "gstin", None):
                # Only prefer branch if company gstin is missing? But billing.py prefers branch when display==branch.
                # For would-change, we want the GSTIN that billing.py would use on the PDF.
                # Replicate that: branch GSTIN only when display==branch.
                pass
        except Exception:
            pass
    return gstin


@router.get("/pos-would-change/{company_id}", response_model=PosWouldChangeResponse)
def pos_would_change(
    company_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Tenant check
    get_company_membership(db, current_user, company_id)

    comp = db.query(Company).filter(Company.id == company_id).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found")
    base_gstin = getattr(comp, "gstin", None)
    base_state = supplier_state_code(base_gstin) if base_gstin else None

    bills = db.query(Bill).filter(Bill.company_id == company_id, Bill.status != "Cancelled").order_by(Bill.invoice_date.desc()).all()

    rows: List[PosWouldChangeRow] = []
    would_change_rows: List[PosWouldChangeRow] = []

    for b in bills:
        proj = db.query(Project).filter(Project.id == b.project_id).first() if b.project_id else None
        proj_state_raw = getattr(proj, "state", None) if proj else None
        proj_code = project_state_code(proj_state_raw) if proj else None
        # Supplier GSTIN per bill (project-branch aware)
        sup_gstin = _resolve_supplier_gstin(db, company_id, proj)
        sup_code = supplier_state_code(sup_gstin) if sup_gstin else None

        # Legacy head was always CGST+SGST when tax >0 (see reports._gst_split pre-D4)
        legacy_head = "CGST+SGST" if float(b.gst_amount or 0) > 0 else "None"

        # Would-be head under D4
        inter = is_inter_state(proj_state_raw, sup_gstin) if proj_state_raw and sup_gstin else None
        if float(b.gst_amount or 0) == 0:
            would_be_head = "None"
        elif inter is True:
            would_be_head = "IGST"
        elif inter is False:
            would_be_head = "CGST+SGST"
        else:
            # Indeterminate (missing site state or supplier GSTIN) — treat as legacy
            would_be_head = legacy_head

        would_change = False
        if legacy_head != "None" and would_be_head != "None" and legacy_head != would_be_head:
            would_change = True

        row = PosWouldChangeRow(
            bill_id=str(b.id),
            invoice_number=b.invoice_number or "",
            project_id=str(b.project_id) if b.project_id else None,
            project_name=proj.name if proj else None,
            project_state_raw=proj_state_raw,
            project_state_code=proj_code,
            supplier_gstin=sup_gstin,
            supplier_state_code=sup_code,
            gst_amount=float(b.gst_amount or 0),
            legacy_head=legacy_head,
            would_be_head=would_be_head,
            would_change=would_change,
        )
        rows.append(row)
        if would_change:
            would_change_rows.append(row)

    return PosWouldChangeResponse(
        company_id=str(company_id),
        supplier_gstin=base_gstin,
        supplier_state_code=base_state,
        total_invoices=len(rows),
        would_change_count=len(would_change_rows),
        would_change=would_change_rows,
        cut_off_note=(
            "Forward-only — no data rewrite. Existing invoices whose head would change are listed for accountant review. "
            "New behaviour applies from a cut-off date; already-filed invoices are not rewritten."
        ),
    )
