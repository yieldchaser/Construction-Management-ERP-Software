# -*- coding: utf-8 -*-
"""
Competitor Parity Integration Tests
Tests:
  1. P2P wallet transfers
  2. Payroll CSV uploads
  3. Dry volume concrete batch deductions
"""

import os
import sys
import time
import uuid
import subprocess
import requests
import io
from datetime import datetime

BASE = "http://127.0.0.1:8018/apis/v3"
DB_FILE = "test_competitor_parity.db"


def start_server():
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8018", "--log-level", "error"],
        env=env,
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    for _ in range(30):
        time.sleep(1)
        try:
            if requests.get("http://127.0.0.1:8018/").status_code == 200:
                return proc
        except Exception:
            pass
    proc.terminate()
    raise RuntimeError("Server failed to start within 30s")


def seed_db(company_obj, project_obj, sender_team_obj, receiver_team_obj, sender_user_obj, receiver_user_obj):
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    os.environ["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(f"sqlite:///./{DB_FILE}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    from app import models

    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    company = models.Company(id=company_obj, name="Competitor Parity Ltd")
    project = models.Project(id=project_obj, company_id=company.id, name="Main Project", code="PROJ-01")
    
    sender_user = models.User(id=sender_user_obj, name="Sender User", mobile="+919999999991")
    receiver_user = models.User(id=receiver_user_obj, name="Receiver User", mobile="+919999999992")
    
    sender_team = models.CompanyTeam(id=sender_team_obj, company_id=company.id, user_id=sender_user.id, priority_type="partner")
    receiver_team = models.CompanyTeam(id=receiver_team_obj, company_id=company.id, user_id=receiver_user.id, priority_type="partner")

    db.add_all([company, project, sender_user, receiver_user, sender_team, receiver_team])
    db.commit()

    db.add_all([
        models.WarehouseInventory(
            project_id=project.id,
            material_name="Cement",
            on_hand_qty=200,
            reserved_qty=0,
            unit="bags",
        ),
        models.WarehouseInventory(
            project_id=project.id,
            material_name="Sand",
            on_hand_qty=50,
            reserved_qty=0,
            unit="m3",
        ),
    ])
    db.commit()
    db.close()


def test_competitor_parity():
    if os.path.exists(DB_FILE):
        try:
            os.remove(DB_FILE)
        except Exception:
            pass

    company_id = uuid.uuid4()
    project_id = uuid.uuid4()
    sender_team_id = uuid.uuid4()
    receiver_team_id = uuid.uuid4()
    sender_user_id = uuid.uuid4()
    receiver_user_id = uuid.uuid4()

    seed_db(company_id, project_id, sender_team_id, receiver_team_id, sender_user_id, receiver_user_id)

    proc = start_server()
    try:
        # Test 1: P2P Wallet Transfer
        p2p_payload = {
            "company_id": str(company_id),
            "sender_company_user_id": str(sender_team_id),
            "receiver_company_user_id": str(receiver_team_id),
            "amount": 2500.0,
            "payment_date": "2026-07-06T12:00:00",
            "description": "Wallet to Wallet transfer"
        }
        res = requests.post(f"{BASE}/cashbook/p2p", json=p2p_payload)
        assert res.status_code == 201, res.text
        data = res.json()
        assert data["status"] == "Success"
        assert "sender_payment_id" in data
        assert "receiver_payment_id" in data

        # Test 2: Payroll CSV Upload
        csv_data = (
            "Name,Staff Type,Shift Hours,Day Off,Overtime Rate (Per Hour),Designation,Cost Code,Salary Basis,Salary Type,CTC,Basic,Allowance Name (A1),A1 Relation Type,% of A1 Relation,A1 Amount,Allowance Name (A2),A2 Relation Type,% of A2 Relation,A2 Amount,Allowance Name (A3),A3 Relation Type,% of A3 Relation,A3 Amount,Fixed Allowance,Gross Salary,Deduction Name (D1),D1 Relation Type,% of D1 Relation,D1 Amount,Deduction Name (D2),D2 Relation Type,% of D2 Relation,D2 Amount,Net Amount,Projects\n"
            "Arun Sharma,Staff,8,Sunday,150,Site Supervisor,CC-03,Monthly,Fixed,35000,20000,HRA,Basic,25,5000,Medical,Fixed,,1500,Travel,Fixed,,1000,1000,28500,TDS,Gross,10,2850,ESI,Fixed,,500,25150,Main Project\n"
        )
        
        files = {
            "file": ("Payroll-Upload-Template.csv", io.StringIO(csv_data), "text/csv")
        }
        form_data = {
            "company_id": str(company_id),
            "project_id": str(project_id)
        }
        
        res = requests.post(f"{BASE}/hr/payroll/upload", data=form_data, files=files)
        assert res.status_code == 200, res.text
        payroll_res = res.json()
        assert payroll_res["status"] == "success"
        assert payroll_res["created"] == 1

        # Verify database update for employee
        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        os.environ["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
        from app.database import SessionLocal
        from app import models
        db = SessionLocal()
        emp = db.query(models.StaffEmployee).filter(models.StaffEmployee.name == "Arun Sharma").first()
        assert emp is not None
        assert float(emp.basic_salary) == 20000.0
        assert float(emp.hra) == 5000.0
        assert float(emp.other_allowances) == 3500.0 # Medical (1500) + Travel (1000) + Fixed (1000) = 3500
        assert float(emp.tds_monthly) == 2850.0

        # Test 3: Production batch completion with 1.54 factor and conditional deduction
        recipe_payload = {
            "company_id": str(company_id),
            "project_id": str(project_id),
            "recipe_code": "REC-M20",
            "product_name": "Concrete mix",
            "mix_type": "Concrete Batch",
            "unit": "m3",
            "target_output_qty": 10.0,
            "wastage_pct": 0,
            "materials": [
                {"material_name": "Cement", "planned_qty": 50, "unit": "bags", "is_optional": False},
                {"material_name": "Sand", "planned_qty": 3.0, "unit": "m3", "is_optional": False},
            ]
        }
        res = requests.post(f"{BASE}/production/recipes", json=recipe_payload)
        assert res.status_code == 201, res.text
        recipe = res.json()

        # Create batch with status "running" -> should NOT deduct inventory
        batch_payload = {
            "company_id": str(company_id),
            "project_id": str(project_id),
            "recipe_id": recipe["id"],
            "batch_number": "B-001",
            "planned_output_qty": 10.0,
            "actual_output_qty": 10.0,
            "status": "running",
        }
        res = requests.post(f"{BASE}/production/batches", json=batch_payload)
        assert res.status_code == 201, res.text
        batch = res.json()

        # Check inventory is untouched
        cement_inv = db.query(models.WarehouseInventory).filter(
            models.WarehouseInventory.project_id == project_id,
            models.WarehouseInventory.material_name == "Cement"
        ).first()
        assert float(cement_inv.on_hand_qty) == 200.0

        # Complete the batch
        res = requests.patch(f"{BASE}/production/batches/{batch['id']}/complete")
        assert res.status_code == 200, res.text
        
        # Verify 1.54 multiplier applied:
        # Cement planned: 50 bags for 10 m3.
        # Scale to 10 m3 actual: 50 bags.
        # Multiply by 1.54: 50 * 1.54 = 77 bags.
        # New inventory Cement: 200 - 77 = 123.
        db.refresh(cement_inv)
        assert float(cement_inv.on_hand_qty) == 123.0

        sand_inv = db.query(models.WarehouseInventory).filter(
            models.WarehouseInventory.project_id == project_id,
            models.WarehouseInventory.material_name == "Sand"
        ).first()
        # Sand planned: 3.0. Scale and multiply by 1.54: 3.0 * 1.54 = 4.62.
        # New inventory Sand: 50 - 4.62 = 45.38.
        db.refresh(sand_inv)
        assert abs(float(sand_inv.on_hand_qty) - 45.38) <= 1e-4

        db.close()
        print("Competitor Parity Integration Tests Passed Successfully!")
    finally:
        proc.terminate()
        proc.wait(timeout=10)


if __name__ == "__main__":
    test_competitor_parity()
