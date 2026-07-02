import os
import sys
import subprocess
import time
import requests
import uuid
from datetime import datetime

def test_phase8():
    print("Setting up local SQLite database for Phase 8 test...")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_phase8.db")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass

    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    from app import models

    # Create all tables (including billing)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    company = models.Company(
        id=uuid.uuid4(),
        name="Apex Infra Ventures"
    )
    db.add(company)
    db.commit()
    
    project = models.Project(
        id=uuid.uuid4(),
        company_id=company.id,
        name="Terminal Hub Ph3",
        code="TERM-03"
    )
    db.add(project)
    db.commit()

    subcontractor = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=company.id,
        user_id=uuid.uuid4(),
        priority_type="subcontractor"
    )
    db.add(subcontractor)
    db.commit()

    project_id = str(project.id)
    company_id = str(company.id)
    subcon_id = str(subcontractor.id)
    print(f"[x] Created Company ({company_id}), Project ({project_id}), Subcontractor ({subcon_id})")
    
    # Start FastAPI server
    print("Starting FastAPI backend server on port 8006...")
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8006"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    # Wait for the server to spin up
    time.sleep(5)
    
    try:
        base_url = "http://127.0.0.1:8006"
        
        # 1. Create a Work Order
        print("\nTesting Create Work Order...")
        res = requests.post(
            f"{base_url}/apis/v3/billing/work-orders",
            json={
                "company_id": company_id,
                "project_id": project_id,
                "subcontractor_id": subcon_id,
                "wo_number": "WO-2026-001",
                "wo_date": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "items": [
                    {"quantity": 120.0, "rate": 350.0}, # Excavation labor
                    {"quantity": 5.0, "rate": 12000.0}   # Rebar labor
                ],
                "terms": "Retention at 5%, TDS at 2%, billing cycle monthly"
            }
        )
        assert res.status_code == 201
        wo = res.json()
        assert wo["wo_number"] == "WO-2026-001"
        assert wo["status"] == "active"
        # Estimated amount = 120 * 350 (42,000) + 5 * 12,000 (60,000) = 102,000
        assert wo["estimated_work_amount"] == 102000.0
        assert len(wo["items"]) == 2
        print("[x] Work Order created successfully with items!")

        # 2. List Work Orders
        res = requests.get(f"{base_url}/apis/v3/billing/work-orders?project_id={project_id}")
        assert res.status_code == 200
        assert len(res.json()) == 1
        print("[x] Listed Work Orders successfully!")

        # 3. Create Subcontractor Bill (Post-tax deductions: Pre-tax = False)
        # Formula Case: Post-tax order
        # Subtotal = 100,000, 18% GST.
        # Deductions: TDS 2% on subtotal = 2,000, advance recovery 10,000 lumpsum.
        # Retention: 5% on total (118,000) = 5,900.
        # Net Payable = 118,000 - 2,000 - 10,000 - 5,900 = 100,100
        print("\nTesting Subcontractor Bill (Post-tax Deductions)...")
        res = requests.post(
            f"{base_url}/apis/v3/billing/bills",
            json={
                "company_id": company_id,
                "project_id": project_id,
                "party_company_user_id": subcon_id,
                "invoice_number": "SUB-BILL-001",
                "invoice_date": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "invoice_type": "subcon",
                "subtotal": 100000.0,
                "gst_pct": 18.0,
                "pre_tax_deductions": False,
                "deductions": [
                    {"deduction_type": "TDS", "amount": 0.0, "percentage": 2.0, "notes": "Section 194C"},
                    {"deduction_type": "Advance Recovery", "amount": 10000.0, "notes": "Mobilization advance return"},
                    {"deduction_type": "Retention", "amount": 0.0, "percentage": 5.0, "notes": "Contract retention"}
                ]
            }
        )
        assert res.status_code == 201
        bill = res.json()
        assert bill["invoice_number"] == "SUB-BILL-001"
        assert bill["gst_amount"] == 18000.0
        # Check deductions calculated correctly
        assert len(bill["deductions"]) == 3
        
        tds_ded = next(d for d in bill["deductions"] if d["deduction_type"] == "TDS")
        adv_ded = next(d for d in bill["deductions"] if d["deduction_type"] == "Advance Recovery")
        ret_ded = next(d for d in bill["deductions"] if d["deduction_type"] == "Retention")
        
        assert tds_ded["amount"] == 2000.0
        assert adv_ded["amount"] == 10000.0
        assert ret_ded["amount"] == 5900.0 # 5% of 118,000
        assert bill["total_payable"] == 100100.0
        print("[x] Post-tax bill deductions and totals match verification engine!")

        # 4. Create Subcontractor Bill (Pre-tax deductions: Pre-tax = True)
        # Formula Case: Pre-tax order
        # Subtotal = 100,000, 18% GST.
        # Deductions: TDS 2% on subtotal = 2,000, advance recovery 10,000 lumpsum.
        # Retention: 5% on subtotal = 5,000.
        # Taxable amount = 100,000 - 2,000 - 10,000 - 5,000 = 83,000
        # GST = 83,000 * 18% = 14,940
        # Net Payable = 83,000 + 14,940 = 97,940
        print("\nTesting Subcontractor Bill (Pre-tax Deductions)...")
        res = requests.post(
            f"{base_url}/apis/v3/billing/bills",
            json={
                "company_id": company_id,
                "project_id": project_id,
                "party_company_user_id": subcon_id,
                "invoice_number": "SUB-BILL-002",
                "invoice_date": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "invoice_type": "subcon",
                "subtotal": 100000.0,
                "gst_pct": 18.0,
                "pre_tax_deductions": True,
                "deductions": [
                    {"deduction_type": "TDS", "amount": 0.0, "percentage": 2.0, "notes": "Section 194C"},
                    {"deduction_type": "Advance Recovery", "amount": 10000.0, "notes": "Mobilization advance return"},
                    {"deduction_type": "Retention", "amount": 0.0, "percentage": 5.0, "notes": "Contract retention"}
                ]
            }
        )
        assert res.status_code == 201
        bill_pre = res.json()
        assert bill_pre["gst_amount"] == 14940.0
        
        tds_pre = next(d for d in bill_pre["deductions"] if d["deduction_type"] == "TDS")
        ret_pre = next(d for d in bill_pre["deductions"] if d["deduction_type"] == "Retention")
        
        assert tds_pre["amount"] == 2000.0
        assert ret_pre["amount"] == 5000.0 # 5% of 100,000
        assert bill_pre["total_payable"] == 97940.0
        print("[x] Pre-tax bill deductions and totals match verification engine!")

        # 5. Create Debit Note
        print("\nTesting Create Debit Note...")
        res = requests.post(
            f"{base_url}/apis/v3/billing/debit-notes",
            json={
                "project_id": project_id,
                "company_id": company_id,
                "party_company_user_id": subcon_id,
                "notes": "Quality defect rectification cost backcharge",
                "total_amount": 15000.0,
                "work_amount": 12711.86,
                "gst_amount": 2288.14
            }
        )
        assert res.status_code == 201
        dn = res.json()
        assert dn["total_amount"] == 15000.0
        assert dn["approval_flag"] == "auto_approved"
        print("[x] Debit Note logged successfully!")

        print("\nALL PHASE 8 BILLING BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")

    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        proc.terminate()
        out, err = proc.communicate()
        print("stdout:", out)
        print("stderr:", err)
        sys.exit(1)
        
    finally:
        print("Stopping backend server...")
        proc.terminate()
        proc.wait()
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

if __name__ == "__main__":
    test_phase8()
