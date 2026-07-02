# -*- coding: utf-8 -*-
"""
SiteFlow Integration Test for Gap Modules (Isolated SQLite DB, port 8018)
Tests:
  1. DPR (Daily Progress Reports) with task status updates and inventory consumption.
  2. CRM (Leads & Quotations) with split rate (supply + install) and item vs bill tax math.
  3. Finance (Payments) with FIFO auto-settlement, unified ledger, and Project P&L.
  4. Tally ERP Sync simulating desktop agent sync sequence.
"""

import os
import sys
import time
import uuid
import subprocess
import requests
from datetime import datetime

BASE = "http://127.0.0.1:8018/apis/v3"
DB_FILE = "test_gaps.db"

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

def seed_db(company_id, project_id, task_id, user_id, team_id):
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    os.environ["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"

    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(f"sqlite:///./{DB_FILE}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    from app import models

    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed core models
    company = models.Company(id=company_id, name="Onsite Competitor Corp")
    project = models.Project(id=project_id, company_id=company_id, name="Highrise Towers Ph1", code="HT-01")
    user = models.User(id=user_id, name="Dev Engineer", mobile="9999912345", email="dev@onsite.so")
    team = models.CompanyTeam(id=team_id, company_id=company_id, user_id=user_id, priority_type="employee")
    
    # Task linked to BOQ
    boq = models.BOQItem(
        id=uuid.uuid4(), project_id=project_id, section_name="RCC", 
        item_name="Slab Concrete M20", unit="m3", quantity=500.0, rate=4500.0
    )
    db.add(boq)
    db.flush()

    task = models.Task(
        id=task_id, project_id=project_id, name="Pour floor 1 slab",
        duration_days=5, start_date=datetime.now(), end_date=datetime.now(),
        status="not_started", priority="high", boq_item_id=boq.id
    )

    budget = models.ProjectBudget(
        id=uuid.uuid4(), project_id=project_id, material_budget=150000.0,
        labour_budget=50000.0, subcon_budget=80000.0, equipment_budget=20000.0
    )

    db.add_all([company, project, user, team, task, budget])
    
    # Seed initial inventory
    cement = models.WarehouseInventory(
        id=uuid.uuid4(), project_id=project_id, material_name="Cement",
        on_hand_qty=100.0, reserved_qty=0.0, unit="bags"
    )
    db.add(cement)
    
    db.commit()
    db.close()

def assert_close(label, actual, expected, tol=1e-2):
    assert abs(float(actual) - float(expected)) <= tol, f"{label}: expected {expected}, got {actual}"

def main():
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)

    company_id = uuid.uuid4()
    project_id = uuid.uuid4()
    task_id = uuid.uuid4()
    user_id = uuid.uuid4()
    team_id = uuid.uuid4()

    seed_db(company_id, project_id, task_id, user_id, team_id)
    proc = start_server()

    try:
        # 1. DPR INTEGRATION TEST
        print("[*] Testing DPR router...")
        dpr_payload = {
            "project_id": str(project_id),
            "task_id": str(task_id),
            "reported_by": "Dev Engineer",
            "dpr_date": "2026-06-26T12:00:00",
            "weather": "Sunny",
            "executed_qty": 45.5,
            "workers_deployed": 12,
            "materials_consumed": [
                {"material_name": "Cement", "quantity": 15.0, "unit": "bags"}
            ],
            "photos": ["photo1.jpg"],
            "notes": "Slab pour went smooth.",
            "issues": "None"
        }
        res = requests.post(f"{BASE}/dpr", json=dpr_payload)
        assert res.status_code == 201, res.text
        dpr_data = res.json()
        assert dpr_data["weather"] == "Sunny"
        assert dpr_data["workers_deployed"] == 12

        # Verify task status changed from not_started to in_progress
        # Wait, since the test runs in a separate process, we query the task via API (or direct query inside test if needed)
        # But wait! We can fetch tasks for the project and verify status
        tasks_res = requests.get(f"{BASE}/planning/tasks", params={"project_id": str(project_id)})
        assert tasks_res.status_code == 200, tasks_res.text
        tasks = tasks_res.json()
        t = [task for task in tasks if task["id"] == str(task_id)][0]
        assert t["status"] == "in_progress", f"Expected in_progress status, got {t['status']}"

        # Verify Warehouse inventory was decremented
        inv_res = requests.get(f"{BASE}/procurement/inventory", params={"project_id": str(project_id)})
        assert inv_res.status_code == 200, inv_res.text
        invs = inv_res.json()
        cement_inv = [i for i in invs if i["material_name"] == "Cement"][0]
        assert_close("Inventory deduction", cement_inv["on_hand_qty"], 85.0)

        # Verify Material Transaction of type 'used' was logged
        txn_res = requests.get(f"{BASE}/procurement/transactions", params={"project_id": str(project_id)})
        assert txn_res.status_code == 200, txn_res.text
        txns = txn_res.json()
        used_txns = [tx for tx in txns if tx["type"] == "used"]
        assert len(used_txns) == 1
        assert used_txns[0]["material_name"] == "Cement"
        assert_close("Transaction quantity", used_txns[0]["qty"], 15.0)

        # Verify DPR Summary
        summary_res = requests.get(f"{BASE}/dpr/summary", params={"project_id": str(project_id)})
        assert summary_res.status_code == 200, summary_res.text
        sum_data = summary_res.json()
        assert sum_data["activities_tracked"] == 1
        assert sum_data["total_workers_deployed"] == 12
        print("[x] DPR integration tests passed.")

        # 2. CRM INTEGRATION TEST
        print("[*] Testing CRM router...")
        lead_payload = {
            "company_id": str(company_id),
            "assignee_id": str(team_id),
            "lead_type": "Residential",
            "contact_name": "Rohan Gupta",
            "phone_no": "9876543210",
            "email": "rohan@gmail.com",
            "client_company_name": "Gupta Ventures",
            "address": "MG Road, Bangalore",
            "source": "Google",
            "category": "Civil",
            "budget": 5000000.0,
            "description": "Interested in 3BHK construction estimate."
        }
        lead_res = requests.post(f"{BASE}/crm/leads", json=lead_payload)
        assert lead_res.status_code == 201, lead_res.text
        lead = lead_res.json()
        assert lead["contact_name"] == "Rohan Gupta"

        # Create split rate quotation with item_level tax
        quot_payload = {
            "subject": "Initial RCC Estimate",
            "tax_type": "item_level",
            "gst_pct": 18.00,
            "discount": 5000.0,
            "terms": "Valid for 30 days.",
            "items": [
                {
                    "item_name": "Slab Concrete Supply & Install",
                    "qty": 10.0,
                    "unit": "m3",
                    "cost_price": 3000.0,
                    "selling_price": 1000.0, # base selling price
                    "supply_rate": 2000.0,
                    "installation_rate": 500.0,
                    "supply_tax_pct": 18.00,
                    "installation_tax_pct": 12.00
                }
            ]
        }
        quot_res = requests.post(f"{BASE}/crm/leads/{lead['id']}/quotations", json=quot_payload)
        assert quot_res.status_code == 201, quot_res.text
        quot = quot_res.json()
        
        # Verify quotation item total amount:
        # selling_price = 1000.0, supply_rate = 2000.0, installation_rate = 500.0. Total unit = 3500.0
        # base_amt = 10.0 * 3500.0 = 35000.0
        # supply_tax = 10.0 * 2000.0 * 18% = 3600.0
        # install_tax = 10.0 * 500.0 * 12% = 600.0
        # selling_tax = 10.0 * 1000.0 * 18% = 1800.0
        # total_tax = 3600.0 + 600.0 + 1800.0 = 6000.0
        # item total_amount = 35000.0 + 6000.0 = 41000.0
        assert_close("Item level amount math", quot["items"][0]["total_amount"], 41000.0)
        # quot total_amount = 41000.0 - discount(5000.0) = 36000.0
        assert_close("Quotation total amount math", quot["total_amount"], 36000.0)
        print("[x] CRM integration tests passed.")

        # 3. FINANCE & P&L INTEGRATION TEST
        print("[*] Testing Finance & P&L router...")
        # Create a Client Sale Bill
        sale_bill_payload = {
            "company_id": str(company_id),
            "project_id": str(project_id),
            "party_company_user_id": str(team_id),
            "invoice_number": "INV-2026-001",
            "invoice_date": "2026-06-26",
            "due_date": "2026-07-26",
            "invoice_type": "sale",
            "subtotal": 100000.0,
            "gst_amount": 18000.0,
            "total_payable": 118000.0
        }
        # Wait, the bills table already exists from previous phases, let's post a bill to our billing router!
        bill_res = requests.post(f"{BASE}/billing/bills", json=sale_bill_payload)
        assert bill_res.status_code == 201, bill_res.text
        bill = bill_res.json()
        assert bill["status"] == "Unpaid"

        # Record a payment to settle the bill
        payment_payload = {
            "company_id": str(company_id),
            "project_id": str(project_id),
            "party_company_user_id": str(team_id),
            "payment_type": "in",
            "amount": 118000.0,
            "payment_method": "Bank Transfer",
            "reference_number": "TXN-BANK-8422",
            "description": "Milestone payout",
            "payment_date": "2026-06-26T14:00:00"
        }
        pay_res = requests.post(f"{BASE}/finance/payments", json=payment_payload)
        assert pay_res.status_code == 201, pay_res.text
        pay = pay_res.json()
        assert_close("Payment settled portion", pay["unsettled_amount"], 0.0)

        # Verify bill is paid now
        # Let's get the bill details to check status
        bills_res = requests.get(f"{BASE}/billing/bills", params={"project_id": str(project_id)})
        assert bills_res.status_code == 200, bills_res.text
        bills = bills_res.json()
        b = [bi for bi in bills if bi["id"] == bill["id"]][0]
        assert b["status"] == "Paid"

        # Query Transaction Ledger
        ledger_res = requests.get(f"{BASE}/finance/ledger", params={"project_id": str(project_id)})
        assert ledger_res.status_code == 200, ledger_res.text
        ledger = ledger_res.json()
        assert len(ledger) >= 2 # Invoice and Payment in ledger

        # Query P&L
        pl_res = requests.get(f"{BASE}/finance/pl", params={"project_id": str(project_id)})
        assert pl_res.status_code == 200, pl_res.text
        pl = pl_res.json()
        rev_item = [item for item in pl if item["head"] == "Revenue (Billed)"][0]
        assert_close("P&L Revenue", rev_item["actual"], 118000.0)
        print("[x] Finance & P&L integration tests passed.")

        # 4. TALLY SYNC INTEGRATION TEST
        print("[*] Testing Tally sync router...")
        tally_conn_payload = {
            "company_id": str(company_id),
            "tally_company_name": "Onsite Competitor Tally Group",
            "registered_mobile": "9999912345",
            "sync_window_start_date": "2026-04-01T00:00:00",
            "voucher_number_template": "ONS-{year}-{number}",
            "auto_create_missing_ledgers": True
        }
        conn_res = requests.post(f"{BASE}/tally/connections", json=tally_conn_payload)
        assert conn_res.status_code == 201, conn_res.text
        
        agent_payload = {
            "company_id": str(company_id),
            "machine_label": "Office-Accounts-PC",
            "auth_key": "TALLY-KEY-ABC-123"
        }
        agent_res = requests.post(f"{BASE}/tally/agents", json=agent_payload)
        assert agent_res.status_code == 201, agent_res.text
        
        sync_res = requests.post(f"{BASE}/tally/sync", params={"company_id": str(company_id)})
        assert sync_res.status_code == 200, sync_res.text
        sync = sync_res.json()
        assert sync["success"] is True
        assert sync["tally_company"] == "Onsite Competitor Tally Group"
        assert sync["vouchers_queued"] >= 2
        print("[x] Tally sync integration tests passed.")

    finally:
        print("[*] Terminating server...")
        proc.terminate()
        proc.wait()
        if os.path.exists(DB_FILE):
            try:
                os.remove(DB_FILE)
            except Exception:
                pass
        print("[x] Cleaned up test database.")

if __name__ == "__main__":
    main()
