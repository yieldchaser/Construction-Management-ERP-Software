# -*- coding: utf-8 -*-
"""
Shared helpers for document-style PDF endpoints (Invoice / PO / BOQ).

Centralises the "Document Company Name Display" + custom PDF template banner
resolution that `routers/reports.py` already does for client progress reports,
so the three new line-item PDF endpoints render with the same branding.
"""
from app.models import Company, CompanyBranch, PdfTemplate


def resolve_pdf_branding(db, company_id, project=None):
    """Return (company_name, custom_banner) for a document PDF.

    company_name: the masthead name, honouring Company.document_company_name_display
        ("branch" prints the issuing branch's name when the project has one).
    custom_banner: the company's configured PdfTemplate content when
        custom_pdf_template_enabled is on, else None (default layout).
    """
    company_name = ""
    custom_banner = None
    company = db.query(Company).filter(Company.id == company_id).first() if company_id else None
    if company:
        if company.document_company_name_display == "branch" and project and project.branch_id:
            branch = db.query(CompanyBranch).filter(CompanyBranch.id == project.branch_id).first()
            company_name = branch.branch_name if branch else company.name
        else:
            company_name = company.name

        if company.custom_pdf_template_enabled:
            template = (
                db.query(PdfTemplate)
                .filter(PdfTemplate.company_id == company.id, PdfTemplate.is_default == True)  # noqa: E712
                .first()
            )
            if template is None:
                template = (
                    db.query(PdfTemplate)
                    .filter(PdfTemplate.company_id == company.id)
                    .order_by(PdfTemplate.created_at.desc())
                    .first()
                )
            if template and template.content:
                custom_banner = template.content
    return company_name, custom_banner
