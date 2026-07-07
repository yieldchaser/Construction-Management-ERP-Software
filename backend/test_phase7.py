import os
import sys
import subprocess
import time
import requests
import uuid
from datetime import datetime

def test_phase7():
    print("Setting up local SQLite database for Phase 7 test...")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_phase7.db")
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

    # Create all tables (including procurement)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    company = models.Company(
        id=uuid.uuid4(),
        name="Supreme Builders Ltd"
    )
    db.add(company)
    db.commit()
    
    project = models.Project(
        id=uuid.uuid4(),
        company_id=company.id,
        name="Residential Villa Complex",
        code="VIL-09"
    )
    db.add(project)
    db.commit()

    project_id = str(project.id)
    company_id = str(company.id)
    print(f"[x] Created Test Company ({company_id}) and Test Project ({project_id})")
    
    # Start FastAPI server
    print("Starting FastAPI backend server...")
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8005"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    try:
        base_url = "http://127.0.0.1:8005"
        # Wait for the server to spin up
        server_ready = False
        for _ in range(30):
            if proc.poll() is not None:
                break
            try:
                res = requests.get(f"{base_url}/openapi.json", timeout=1)
                if res.status_code == 200:
                    server_ready = True
                    break
            except requests.RequestException:
                pass
            time.sleep(1)
        assert server_ready, "FastAPI backend server did not start in time"
        
        # 1. Create a Material Indent
        print("\nTesting Create Material Indent...")
        res = requests.post(
            f"{base_url}/apis/v3/procurement/indents",
            json={
                "company_id": company_id,
                "project_id": project_id,
                "indent_number": "IND-2026-001",
                "items": [
                    {"material_name": "UltraTech Cement", "quantity": 150.0, "unit": "bags"},
                    {"material_name": "TMT Steel 16mm", "quantity": 5.5, "unit": "tons"}
                ]
            }
        )
        assert res.status_code == 201
        indent = res.json()
        indent_id = indent["id"]
        assert indent["indent_number"] == "IND-2026-001"
        assert indent["status"] == "pending"
        assert len(indent["items"]) == 2
        print("[x] Material Indent created successfully!")

        # 1a. List the created indent through the shared listing route
        print("\nTesting List Material Indents by project_id...")
        res = requests.get(f"{base_url}/apis/v3/procurement/indents?project_id={project_id}")
        assert res.status_code == 200
        project_indents = res.json()
        assert any(item["id"] == indent_id for item in project_indents)
        project_indent = next(item for item in project_indents if item["id"] == indent_id)
        assert project_indent["indent_number"] == "IND-2026-001"

        print("\nTesting List Material Indents by company_id...")
        res = requests.get(f"{base_url}/apis/v3/procurement/indents?company_id={company_id}")
        assert res.status_code == 200
        company_indents = res.json()
        assert any(item["id"] == indent_id for item in company_indents)
        company_indent = next(item for item in company_indents if item["id"] == indent_id)
        assert company_indent["indent_number"] == "IND-2026-001"

        print("\nTesting existing company-specific indent listing route...")
        res = requests.get(f"{base_url}/apis/v3/procurement/indents/company/{company_id}")
        assert res.status_code == 200
        company_path_indents = res.json()
        assert any(item["id"] == indent_id for item in company_path_indents)

        print("\nTesting List Material Indents without query params...")
        res = requests.get(f"{base_url}/apis/v3/procurement/indents")
        assert res.status_code == 400
        assert res.json()["detail"] == "Either project_id or company_id must be provided"

        # 2. Approve Material Indent
        print("\nTesting Approve Material Indent...")
        res = requests.post(f"{base_url}/apis/v3/procurement/indents/{indent_id}/approve")
        assert res.status_code == 200
        approved_indent = res.json()
        assert approved_indent["status"] == "approved"
        print("[x] Material Indent approved successfully!")

        # 3. Create a Purchase Order (PO)
        print("\nTesting Create Purchase Order...")
        res = requests.post(
            f"{base_url}/apis/v3/procurement/pos",
            json={
                "company_id": company_id,
                "project_id": project_id,
                "po_number": "PO-2026-041",
                "po_date": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "items": [
                    {"material_name": "UltraTech Cement", "quantity": 100.0, "unit": "bags", "rate": 410.0, "tax_pct": 18.0},
                    {"material_name": "TMT Steel 16mm", "quantity": 4.0, "unit": "tons", "rate": 62000.0, "tax_pct": 18.0}
                ]
            }
        )
        assert res.status_code == 201
        po = res.json()
        po_id = po["id"]
        assert po["po_number"] == "PO-2026-041"
        assert po["status"] == "draft"
        assert po["approval_flag"] == "pending"
        # Gross = 100 * 410 (41,000) + 4.0 * 62,000 (248,000) = 289,000
        # Tax = 289,000 * 18% = 52,020
        # Total = 341,020
        assert po["gross_amount"] == 289000.0
        assert po["total_amount"] == 341020.0
        assert len(po["items"]) == 2
        cement_po_item_id = po["items"][0]["id"]
        steel_po_item_id = po["items"][1]["id"]
        print("[x] Purchase Order created with correct totals!")

        # 4. Approve Purchase Order
        print("\nTesting Approve Purchase Order...")
        res = requests.post(f"{base_url}/apis/v3/procurement/pos/{po_id}/approve")
        assert res.status_code == 200
        approved_po = res.json()
        assert approved_po["approval_flag"] == "approved"
        assert approved_po["status"] == "sent"
        print("[x] Purchase Order approved successfully!")

        # 5. Create Goods Receipt Note (GRN) and assert inventory trigger
        print("\nTesting Create GRN (triggers inventory updates)...")
        res = requests.post(
            f"{base_url}/apis/v3/procurement/grns",
            json={
                "company_id": company_id,
                "project_id": project_id,
                "po_id": po_id,
                "grn_number": "GRN-2026-009",
                "received_date": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
                "items": [
                    {"po_item_id": cement_po_item_id, "received_qty": 60.0},
                    {"po_item_id": steel_po_item_id, "received_qty": 2.5}
                ]
            }
        )
        assert res.status_code == 201
        grn = res.json()
        assert grn["grn_number"] == "GRN-2026-009"
        assert len(grn["items"]) == 2
        print("[x] GRN created successfully!")

        # 6. Verify Warehouse Inventory quantities incremented
        print("\nVerifying stateful Warehouse Inventory updates...")
        res = requests.get(f"{base_url}/apis/v3/procurement/inventory?project_id={project_id}")
        assert res.status_code == 200
        inventory = res.json()
        assert len(inventory) == 2
        
        cement_inv = next(i for i in inventory if i["material_name"] == "UltraTech Cement")
        steel_inv = next(i for i in inventory if i["material_name"] == "TMT Steel 16mm")
        
        assert cement_inv["on_hand_qty"] == 60.0
        assert steel_inv["on_hand_qty"] == 2.5
        print("[x] Warehouse Inventory updated via GRN trigger successfully!")

        # 7. Verify Transaction logs created
        print("\nVerifying Material Transaction ledger logs...")
        res = requests.get(f"{base_url}/apis/v3/procurement/transactions?project_id={project_id}")
        assert res.status_code == 200
        transactions = res.json()
        assert len(transactions) == 2
        
        for txn in transactions:
            assert txn["type"] == "received"
            assert txn["source_ref_id"] == grn["id"]
        print("[x] Material transactions registered clean!")

        print("\nALL PHASE 7 PROCUREMENT BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")

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
    test_phase7()
