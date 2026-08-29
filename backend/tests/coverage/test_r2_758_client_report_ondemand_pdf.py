"""Finding R2-758: Client report PDF downloads render on demand when missing from ephemeral disk.

Clauses:
1. When a ClientReport exists in the database but its cached PDF file is absent from disk,
   GET /reports/{report_id}/download does not 404.
2. The endpoint dynamically generates the PDF on demand and returns status 200 with media_type application/pdf.
3. The returned byte stream is a valid PDF (%PDF-1.4).
"""
import os
import uuid
import datetime
import pytest

from app import models
from app.routers.reports import REPORTS_DIR


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"RepPDF-{sfx}", user_name=f"URepPDF-{sfx}",
        mobile=f"+9195{sfx}", email=f"reppdf-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="RepPDF-Proj",
        code=f"PRJ-RP-{uuid.uuid4().hex[:6]}", status="Ongoing", state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


def test_r2_758_download_renders_on_demand_when_file_missing_on_disk(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    # 1. Create a ClientReport row directly in DB (simulating survived row after deploy wiped disk)
    report_id = uuid.uuid4()
    pdf_filename = f"{report_id}.pdf"
    pdf_path = os.path.join(REPORTS_DIR, pdf_filename)

    # Ensure disk file does not exist
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    report = models.ClientReport(
        id=report_id,
        project_id=project.id,
        report_name="Monthly Progress Report - Aug 2026",
        report_date=datetime.datetime.utcnow(),
        summary_markdown="Everything on track across civil and structural phases.",
        pdf_url=f"/static/reports/{pdf_filename}",
        generated_by=user.id,
        is_approved=False,
    )
    db.add(report)
    db.commit()

    # 2. Call download endpoint
    res = client.get(f"/apis/v3/reports/{report_id}/download", headers=hdr)
    assert res.status_code == 200, f"Expected 200 on demand generation, got {res.status_code}: {res.text}"
    assert res.headers.get("content-type") == "application/pdf"
    assert res.content.startswith(b"%PDF-1.4")
