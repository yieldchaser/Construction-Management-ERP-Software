# -*- coding: utf-8 -*-
"""
Phase 11 Integration Test -- Client Portal & PDF Progress Reports
Tests (isolated SQLite DB, port 8008):
  1. Generate report aggregating timeline, billing, procurement, and quality
  2. List reports
  3. Approve report
  4. Download report and verify PDF signature (%PDF-1.4)
"""

import os
import sys
import time
import uuid
import subprocess
import requests
from datetime import datetime

BASE = "http://127.0.0.1:8010/apis/v3"
DB_FILE = "test_phase11.db"


def start_server():
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8010", "--log-level", "error"],
        env=env,
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    for _ in range(30):
        time.sleep(1)
        try:
            if requests.get("http://127.0.0.1:8010/").status_code == 200:
                return proc
        except Exception:
            pass
    proc.terminate()
    raise RuntimeError("Server failed to start within 30s")


def seed_db(company_obj, project_obj):
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    os.environ["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
    
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(f"sqlite:///./{DB_FILE}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    from app import models

    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    company = models.Company(
        id=company_obj,
        name="Reports Test Co"
    )
    db.add(company)
    db.commit()

    project = models.Project(
        id=project_obj,
        company_id=company.id,
        name="Reports Test Project"
    )
    db.add(project)
    db.commit()

    user = models.User(
        id=uuid.uuid4(),
        name="Vikram Joshi",
        mobile=f"9999{uuid.uuid4().hex[:6]}",
        email=f"vikram_{uuid.uuid4().hex[:6]}@test.com"
    )
    db.add(user)
    db.commit()

    team_member = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=company.id,
        user_id=user.id,
        priority_type="employee"
    )
    db.add(team_member)
    db.commit()

    task1 = models.Task(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Excavation",
        duration_days=5,
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow(),
        status="completed",
        priority="high"
    )
    task2 = models.Task(
        id=uuid.uuid4(),
        project_id=project.id,
        name="Foundation Shuttering",
        duration_days=4,
        start_date=datetime.utcnow(),
        end_date=datetime.utcnow(),
        status="in_progress",
        priority="medium"
    )
    db.add_all([task1, task2])
    db.commit()

    indent = models.MaterialIndent(
        id=uuid.uuid4(),
        company_id=company.id,
        project_id=project.id,
        indent_number="IND-001",
        status="Approved"
    )
    db.add(indent)
    db.commit()

    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=company.id,
        project_id=project.id,
        party_company_user_id=team_member.id,
        invoice_number="INV-SUB-01",
        invoice_date=datetime.utcnow(),
        invoice_type="subcon",
        status="Unpaid",
        subtotal=15000.00,
        gst_amount=2700.00,
        total_payable=17700.00,
        paid_amount=0.00,
        approval_flag="approved"
    )
    db.add(bill)
    db.commit()

    checklist = models.QualityChecklist(
        id=uuid.uuid4(),
        company_id=company.id,
        title="Foundation Pre-Pour",
        category="Concrete",
        is_code_reference="IS-456",
        is_active=True
    )
    db.add(checklist)
    db.commit()

    inspection = models.SiteInspection(
        id=uuid.uuid4(),
        project_id=project.id,
        checklist_id=checklist.id,
        zone="Grid A-B",
        inspection_date=datetime.utcnow(),
        status="pass",
        pass_count=5,
        fail_count=0,
        na_count=0
    )
    db.add(inspection)
    db.commit()

    ncr = models.NCR(
        id=uuid.uuid4(),
        project_id=project.id,
        ncr_number="NCR-100",
        title="Rebar Cover Defect",
        severity="Major",
        status="open"
    )
    db.add(ncr)
    db.commit()

    test_res = models.MaterialTestResult(
        id=uuid.uuid4(),
        project_id=project.id,
        test_type="Cube Test",
        material="M30 Concrete",
        test_date=datetime.utcnow(),
        result_value=32.5,
        is_pass=True
    )
    db.add(test_res)
    db.commit()

    db.close()


def test_phase11():
    # Make sure we start with a clean DB file
    if os.path.exists(DB_FILE):
        for _ in range(5):
            try:
                os.remove(DB_FILE)
                break
            except Exception:
                time.sleep(1)

    company_obj = uuid.uuid4()
    project_obj = uuid.uuid4()
    company_id = str(company_obj)
    project_id = str(project_obj)

    # Seed the database first (while server is not holding lock)
    seed_db(company_obj, project_obj)

    proc = start_server()
    try:
        s = requests.Session()

        # ── 1. Generate Report ───────────────────────────────────────────────
        report_payload = {
            "report_name": "Project Progress Report - June 2026",
            "summary_markdown": "Work is progressing at the expected speed. Foundation excavation complete."
        }
        r = s.post(f"{BASE}/reports/generate/{project_id}", json=report_payload)
        assert r.status_code == 201, f"Report generation failed: {r.text}"
        report = r.json()
        report_id = report["id"]
        assert report["report_name"] == "Project Progress Report - June 2026"
        assert report["is_approved"] is False
        print(f"  [OK] Progress report generated: {report['report_name']}")

        # ── 2. List Reports ──────────────────────────────────────────────────
        r = s.get(f"{BASE}/reports/{project_id}")
        assert r.status_code == 200
        reports_list = r.json()
        assert len(reports_list) == 1
        assert reports_list[0]["id"] == report_id
        print(f"  [OK] List reports verified (count=1)")

        # ── 3. Approve Report ────────────────────────────────────────────────
        r = s.patch(f"{BASE}/reports/{report_id}/approve")
        assert r.status_code == 200
        approved = r.json()
        assert approved["is_approved"] is True
        print(f"  [OK] Report approved successfully")

        # ── 4. Download Report & Verify PDF Signature ────────────────────────
        r = s.get(f"{BASE}/reports/{report_id}/download")
        assert r.status_code == 200
        content = r.content
        assert content.startswith(b"%PDF-1.4"), f"Invalid PDF header: {content[:10]}"
        print(f"  [OK] PDF download verified. Size={len(content)} bytes, header checks out.")

        print()
        print("[PASS] All Phase 11 Client Portal & Progress Report tests passed!")

    finally:
        proc.terminate()
        proc.wait()
        if os.path.exists(DB_FILE):
            for _ in range(5):
                try:
                    os.remove(DB_FILE)
                    break
                except Exception:
                    time.sleep(1)
        
        # Cleanup generated PDFs
        reports_dir = os.path.join("static", "reports")
        if os.path.exists(reports_dir):
            for file in os.listdir(reports_dir):
                if file.endswith(".pdf"):
                    try:
                        os.remove(os.path.join(reports_dir, file))
                    except Exception:
                        pass


if __name__ == "__main__":
    test_phase11()
