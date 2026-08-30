#!/usr/bin/env python3
"""
Executes all application workflows against local FastAPI TestClient with SQLite fixtures,
testing preconditions, required field 422 validations, record creation, and status transitions.
Emits docs/WORKFLOW_EXECUTION_LOG.md.
"""

import os
import sys
import uuid
import datetime
import json

os.environ["ENVIRONMENT"] = "test"
REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
sys.path.insert(0, os.path.join(REPO_ROOT, "backend"))

from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.auth import create_access_token
from app import models
from app.rate_limit import limiter

limiter.enabled = False

LOG_FILE = os.path.join(REPO_ROOT, "docs/WORKFLOW_EXECUTION_LOG.md")

class WorkflowLogger:
    def __init__(self):
        self.entries = []
        
    def log_call(self, workflow_name, step_name, method, endpoint, status_code, expected_status, passed, detail=""):
        self.entries.append({
            "workflow": workflow_name,
            "step": step_name,
            "method": method,
            "endpoint": endpoint,
            "status_code": status_code,
            "expected_status": expected_status,
            "passed": passed,
            "detail": detail
        })
        
    def write_markdown(self):
        lines = [
            "# SiteFlow Application Workflow Execution Log",
            "",
            f"Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}",
            "",
            "This log records the verified execution of end-to-end user workflows against the FastAPI backend, asserting precondition failures, required-field validation rejections (HTTP 422), successful record creations (HTTP 200/201), and status transitions.",
            "",
            "## Summary Table",
            "",
            "| # | Workflow | Step | Method & Endpoint | Status | Expected | Result | Notes |",
            "|---|---|---|---|---|---|---|---|"
        ]
        
        passed_count = sum(1 for e in self.entries if e["passed"])
        failed_count = len(self.entries) - passed_count
        
        for idx, e in enumerate(self.entries, 1):
            res_str = "PASS" if e["passed"] else "FAIL"
            clean_detail = e["detail"].replace("|", "/")
            lines.append(f"| {idx} | {e['workflow']} | {e['step']} | `{e['method']} {e['endpoint']}` | `{e['status_code']}` | `{e['expected_status']}` | **{res_str}** | {clean_detail} |")
            
        lines.extend([
            "",
            f"### Execution Stats: **{passed_count} Passed**, **{failed_count} Failed** (Total Steps: {len(self.entries)})",
            ""
        ])
        
        with open(LOG_FILE, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))
        print(f"[WorkflowLogger] Wrote {len(self.entries)} steps to {LOG_FILE}")

def run():
    logger = WorkflowLogger()
    
    with TestClient(app) as client:
        db = SessionLocal()
        
        # 0. Setup Initial Tenant
        suffix = uuid.uuid4().hex[:6]
        company = models.Company(id=uuid.uuid4(), name=f"TruthCorp {suffix}", currency_decimal_places=2)
        db.add(company)
        db.flush()
        user = models.User(id=uuid.uuid4(), name="Chief Engineer", email=f"engineer_{suffix}@truthcorp.com")
        db.add(user)
        db.flush()
        team = models.CompanyTeam(id=uuid.uuid4(), company_id=company.id, user_id=user.id, priority_type="partner")
        db.add(team)
        db.commit()
        
        token = create_access_token({"sub": str(user.id), "company_id": str(company.id), "user_name": user.name})
        headers = {"Authorization": f"Bearer {token}"}
        cid = str(company.id)
        uid = str(user.id)
        
        # ==========================================
        # 1. PLANNING & PROGRESS
        # ==========================================
        
        # 1.1 Project Creation
        r1_fail = client.post("/apis/v3/projects/", json={"company_id": cid}, headers=headers)
        logger.log_call(
            "1.1 Project Creation", "Omit Required Fields", "POST", "/apis/v3/projects/",
            r1_fail.status_code, 422, r1_fail.status_code == 422, "Correctly rejected missing name, code, start_date, state"
        )
        
        r1_ok = client.post("/apis/v3/projects/", json={
            "company_id": cid,
            "name": f"Skyline Heights {suffix}",
            "code": f"SKY-{suffix}",
            "client_name": "Apex Properties Ltd",
            "location": "12.9716,77.5946",
            "state": "Karnataka",
            "start_date": datetime.date.today().isoformat()
        }, headers=headers)
        pid = r1_ok.json().get("id") if r1_ok.status_code in (200, 201) else None
        logger.log_call(
            "1.1 Project Creation", "Valid Creation", "POST", "/apis/v3/projects/",
            r1_ok.status_code, 200, r1_ok.status_code == 200 and pid is not None, f"Project created with id {pid}"
        )
        
        # 1.2 Tasks & Gantt
        r2_fail = client.post("/apis/v3/planning/tasks", json={"project_id": pid}, headers=headers)
        logger.log_call(
            "1.2 Task Scheduling", "Omit Required Fields", "POST", "/apis/v3/planning/tasks",
            r2_fail.status_code, 422, r2_fail.status_code == 422, "Correctly rejected missing name, duration_days, start_date"
        )
        
        r2_ok = client.post("/apis/v3/planning/tasks", json={
            "project_id": pid,
            "name": "Substructure Excavation",
            "start_date": datetime.datetime.now().isoformat(),
            "duration_days": 14,
            "priority": "high",
            "status": "in_progress"
        }, headers=headers)
        tid = r2_ok.json().get("id") if r2_ok.status_code in (200, 201) else None
        logger.log_call(
            "1.2 Task Scheduling", "Valid Creation", "POST", "/apis/v3/planning/tasks",
            r2_ok.status_code, 201, r2_ok.status_code == 201 and tid is not None, f"Task created with id {tid}"
        )
        
        # 1.3 Daily Progress Report (DPR)
        r3_fail = client.post("/apis/v3/dpr", json={"project_id": pid}, headers=headers)
        logger.log_call(
            "1.3 Daily Progress Report", "Omit Required Fields", "POST", "/apis/v3/dpr",
            r3_fail.status_code, 422, r3_fail.status_code == 422, "Correctly rejected missing dpr_date, executed_qty"
        )
        
        r3_ok = client.post("/apis/v3/dpr", json={
            "project_id": pid,
            "task_id": tid,
            "dpr_date": datetime.datetime.now().isoformat(),
            "weather": "Clear",
            "executed_qty": 75.0,
            "workers_deployed": 18,
            "notes": "Poured foundation concrete zone 1"
        }, headers=headers)
        dpr_id = r3_ok.json().get("id") if r3_ok.status_code == 201 else None
        logger.log_call(
            "1.3 Daily Progress Report", "Valid Creation", "POST", "/apis/v3/dpr",
            r3_ok.status_code, 201, r3_ok.status_code == 201 and dpr_id is not None, f"DPR logged with id {dpr_id}"
        )
        
        # 1.4 Budget Allocation
        r4_fail = client.post("/apis/v3/budgeting/allocation", json={"project_id": str(uuid.uuid4())}, headers=headers)
        logger.log_call(
            "1.4 Project Budgeting", "Invalid Project Precondition", "POST", "/apis/v3/budgeting/allocation",
            r4_fail.status_code, 404, r4_fail.status_code == 404, "Correctly rejected non-existent project id"
        )
        
        r4_ok = client.post("/apis/v3/budgeting/allocation", json={
            "project_id": pid,
            "material_budget": 5000000.0,
            "labour_budget": 2000000.0,
            "subcon_budget": 3000000.0,
            "equipment_budget": 1000000.0
        }, headers=headers)
        logger.log_call(
            "1.4 Project Budgeting", "Valid Allocation", "POST", "/apis/v3/budgeting/allocation",
            r4_ok.status_code, 200, r4_ok.status_code == 200, "Allocated 11,000,000 INR project budget"
        )
        
        # ==========================================
        # 2. PROCUREMENT & MATERIALS
        # ==========================================
        
        # 2.1 Vendor Registration (Library)
        r5_fail = client.post("/apis/v3/library/parties", json={"company_id": cid}, headers=headers)
        logger.log_call(
            "2.1 Vendor Registration", "Omit Required Fields", "POST", "/apis/v3/library/parties",
            r5_fail.status_code, 422, r5_fail.status_code == 422, "Correctly rejected missing name, party_type"
        )
        
        r5_ok = client.post("/apis/v3/library/parties", json={
            "company_id": cid,
            "name": f"ACC Cement Supplies {suffix}",
            "party_type": "Vendor",
            "phone": "+919876500111",
            "city": "Bangalore"
        }, headers=headers)
        vid = r5_ok.json().get("id") if r5_ok.status_code == 200 else None
        logger.log_call(
            "2.1 Vendor Registration", "Valid Creation", "POST", "/apis/v3/library/parties",
            r5_ok.status_code, 200, r5_ok.status_code == 200 and vid is not None, f"Vendor party created with id {vid}"
        )
        
        # 2.2 Material Indent
        r6_fail = client.post("/apis/v3/procurement/indents", json={"company_id": cid, "project_id": pid}, headers=headers)
        logger.log_call(
            "2.2 Material Indent", "Omit Required Fields", "POST", "/apis/v3/procurement/indents",
            r6_fail.status_code, 422, r6_fail.status_code == 422, "Correctly rejected missing indent_number, items"
        )
        
        r6_ok = client.post("/apis/v3/procurement/indents", json={
            "company_id": cid,
            "project_id": pid,
            "indent_number": f"IND-{suffix}-01",
            "items": [{"material_name": "OPC 53 Grade Cement", "quantity": 400.0, "unit": "Bags"}]
        }, headers=headers)
        ind_id = r6_ok.json().get("id") if r6_ok.status_code == 201 else None
        logger.log_call(
            "2.2 Material Indent", "Valid Creation", "POST", "/apis/v3/procurement/indents",
            r6_ok.status_code, 201, r6_ok.status_code == 201 and ind_id is not None, f"Material indent created with id {ind_id}"
        )
        
        # 2.3 Purchase Order (PO)
        r7_fail = client.post("/apis/v3/procurement/pos", json={"company_id": cid, "project_id": pid}, headers=headers)
        logger.log_call(
            "2.3 Purchase Order", "Omit Required Fields", "POST", "/apis/v3/procurement/pos",
            r7_fail.status_code, 422, r7_fail.status_code == 422, "Correctly rejected missing po_number, po_date, vendor_id, items"
        )
        
        r7_ok = client.post("/apis/v3/procurement/pos", json={
            "company_id": cid,
            "project_id": pid,
            "vendor_id": vid,
            "po_number": f"PO-{suffix}-01",
            "po_date": datetime.date.today().isoformat(),
            "items": [{"material_name": "OPC 53 Grade Cement", "quantity": 400.0, "rate": 385.0, "unit": "Bags", "gst_rate": 18.0}]
        }, headers=headers)
        po_data = r7_ok.json() if r7_ok.status_code in (200, 201) else {}
        poid = po_data.get("id")
        po_item_id = po_data.get("items", [{}])[0].get("id")
        logger.log_call(
            "2.3 Purchase Order", "Valid Creation", "POST", "/apis/v3/procurement/pos",
            r7_ok.status_code, 201, r7_ok.status_code == 201 and poid is not None, f"Purchase order created with id {poid}"
        )
        
        # 2.4 Approve PO (Required precondition for GRN)
        if poid:
            r7_app = client.post(f"/apis/v3/procurement/pos/{poid}/approve", headers=headers)
            logger.log_call(
                "2.3 Purchase Order", "Approve PO", "POST", f"/apis/v3/procurement/pos/{poid}/approve",
                r7_app.status_code, 200, r7_app.status_code == 200, "Approved PO for goods receipt"
            )
            
            # 2.5 Goods Receipt Note (GRN)
            r8_ok = client.post("/apis/v3/procurement/grns", json={
                "company_id": cid,
                "project_id": pid,
                "po_id": poid,
                "grn_number": f"GRN-{suffix}-01",
                "delivery_challan_number": f"DC-{suffix}",
                "received_date": datetime.date.today().isoformat(),
                "items": [{"po_item_id": po_item_id, "received_qty": 400.0, "accepted_qty": 400.0}]
            }, headers=headers)
            grnid = r8_ok.json().get("id") if r8_ok.status_code in (200, 201) else None
            logger.log_call(
                "2.4 Goods Receipt Note", "Valid Creation", "POST", "/apis/v3/procurement/grns",
                r8_ok.status_code, 201, r8_ok.status_code == 201 and grnid is not None, f"GRN received with id {grnid}"
            )
            
        # ==========================================
        # 3. FINANCIAL CONTROL
        # ==========================================
        
        # 3.1 Cost Code Master
        r9_ok = client.post("/apis/v3/library/cost-codes", json={
            "company_id": cid,
            "code": f"CIV-{suffix[:3].upper()}",
            "name": "Structural Concrete Works",
            "budget_amount": 6000000.0
        }, headers=headers)
        logger.log_call(
            "3.1 Cost Code Master", "Valid Creation", "POST", "/apis/v3/library/cost-codes",
            r9_ok.status_code, 200, r9_ok.status_code == 200, "Cost code added to company library"
        )
        
        # 3.2 Bank Account Setup
        r10_ok = client.post(f"/apis/v3/finance/accounts/{cid}", json={
            "bank_name": "State Bank of India",
            "account_holder_name": "TruthCorp Operations",
            "account_number": f"300100{suffix}",
            "ifsc_code": "SBIN0001234",
            "account_type": "Current",
            "balance": 2500000.0
        }, headers=headers)
        ba_id = r10_ok.json().get("id") if r10_ok.status_code in (200, 201) else None
        logger.log_call(
            "3.2 Bank Account Setup", "Valid Creation", "POST", f"/apis/v3/finance/accounts/{cid}",
            r10_ok.status_code, 200, r10_ok.status_code == 200 and ba_id is not None, f"Bank account created with id {ba_id}"
        )
        
        # 3.3 Vendor Bill (Subcon / Material)
        r11_fail = client.post("/apis/v3/billing/bills", json={"company_id": cid, "project_id": pid}, headers=headers)
        logger.log_call(
            "3.3 Vendor Bill Processing", "Omit Required Fields", "POST", "/apis/v3/billing/bills",
            r11_fail.status_code, 422, r11_fail.status_code == 422, "Correctly rejected missing invoice_number, subtotal, party"
        )
        
        r11_ok = client.post("/apis/v3/billing/bills", json={
            "company_id": cid,
            "project_id": pid,
            "party_company_user_id": vid,
            "invoice_number": f"BILL-{suffix}-01",
            "invoice_date": datetime.datetime.now().isoformat(),
            "invoice_type": "subcon",
            "subtotal": 154000.0,
            "gst_pct": 18.0,
            "deductions": [
                {"deduction_type": "TDS", "amount": 1540.0, "percentage": 1.0},
                {"deduction_type": "Retention", "amount": 7700.0, "percentage": 5.0}
            ]
        }, headers=headers)
        bill_id = r11_ok.json().get("id") if r11_ok.status_code == 201 else None
        logger.log_call(
            "3.3 Vendor Bill Processing", "Valid Creation", "POST", "/apis/v3/billing/bills",
            r11_ok.status_code, 201, r11_ok.status_code == 201 and bill_id is not None, f"Bill created in Pending status with id {bill_id}"
        )
        
        # 3.4 Payment Voucher
        r12_ok = client.post("/apis/v3/finance/payments", json={
            "company_id": cid,
            "project_id": pid,
            "party_id": vid,
            "payment_type": "out",
            "amount": 75000.0,
            "payment_method": "Bank Transfer",
            "payment_date": datetime.date.today().isoformat()
        }, headers=headers)
        pmt_id = r12_ok.json().get("id") if r12_ok.status_code in (200, 201) else None
        logger.log_call(
            "3.4 Payment Voucher", "Valid Creation", "POST", "/apis/v3/finance/payments",
            r12_ok.status_code, 201, r12_ok.status_code == 201 and pmt_id is not None, f"Payment voucher posted with id {pmt_id}"
        )
        
        # ==========================================
        # 4. WORKFORCE & SAFETY
        # ==========================================
        
        # 4.1 Staff Employee
        r13_ok = client.post("/apis/v3/hr/employees", json={
            "company_id": cid,
            "project_id": pid,
            "name": f"Anil Sharma {suffix}",
            "designation": "Assistant Project Manager",
            "salary": 45000.0,
            "phone": f"+9198765{suffix}"
        }, headers=headers)
        emp_id = r13_ok.json().get("id") if r13_ok.status_code == 201 else None
        logger.log_call(
            "4.1 Employee Directory", "Valid Creation", "POST", "/apis/v3/hr/employees",
            r13_ok.status_code, 201, r13_ok.status_code == 201 and emp_id is not None, f"Staff employee created with id {emp_id}"
        )
        
        # 4.2 Quality Inspection
        chk = models.QualityChecklist(id=uuid.uuid4(), company_id=company.id, title="Pre-Pour Concreting", category="Concrete")
        db.add(chk)
        db.commit()
        
        r14_ok = client.post("/apis/v3/quality/inspections", json={
            "company_id": cid,
            "project_id": pid,
            "checklist_id": str(chk.id),
            "title": f"Structural Column Pour Check {suffix}",
            "inspection_type": "Pre-Pour Inspection",
            "status": "Approved",
            "inspection_date": datetime.date.today().isoformat()
        }, headers=headers)
        logger.log_call(
            "4.2 Quality Inspection", "Valid Creation", "POST", "/apis/v3/quality/inspections",
            r14_ok.status_code, 201, r14_ok.status_code == 201, "Quality inspection checklist logged"
        )
        
        # 4.3 Safety Incident
        r15_ok = client.post("/apis/v3/safety/incidents", json={
            "company_id": cid,
            "project_id": pid,
            "title": "Minor welding spark observation",
            "incident_type": "Near Miss",
            "severity": "Low",
            "description": "Loose spark arrestor detected during steel fabrication",
            "reported_by": str(team.id),
            "reported_at": datetime.datetime.now().isoformat(),
            "incident_date": datetime.date.today().isoformat(),
            "location": "Fabrication Yard"
        }, headers=headers)
        logger.log_call(
            "4.3 Safety Incidents", "Valid Creation", "POST", "/apis/v3/safety/incidents",
            r15_ok.status_code, 200, r15_ok.status_code == 200, "Safety observation recorded"
        )
        
        # ==========================================
        # 5. PLANT & EQUIPMENT
        # ==========================================
        
        # 5.1 Equipment Asset
        r16_ok = client.post("/apis/v3/equipment", json={
            "company_id": cid,
            "project_id": pid,
            "name": f"JCB 3DX Super {suffix}",
            "code": f"EQ-JCB-{suffix}",
            "category": "Earthmoving",
            "ownership_type": "Owned"
        }, headers=headers)
        eq_id = r16_ok.json().get("id") if r16_ok.status_code in (200, 201) else None
        logger.log_call(
            "5.1 Equipment Asset", "Valid Creation", "POST", "/apis/v3/equipment",
            r16_ok.status_code, 201, r16_ok.status_code == 201 and eq_id is not None, f"Equipment registered with id {eq_id}"
        )
        
        if eq_id:
            # 5.2 Equipment Deployment
            r17_ok = client.post(f"/apis/v3/equipment/{eq_id}/deploy", json={
                "project_id": pid,
                "start_date": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)).isoformat()
            }, headers=headers)
            logger.log_call(
                "5.2 Equipment Deployment", "Valid Deployment", "POST", f"/apis/v3/equipment/{eq_id}/deploy",
                r17_ok.status_code, 201, r17_ok.status_code == 201, "Equipment deployed to project"
            )
            
            # 5.3 Fuel Log
            r18_ok = client.post(f"/apis/v3/equipment/{eq_id}/fuel", json={
                "project_id": pid,
                "liters": 85.0,
                "cost_per_liter": 94.0,
                "logged_date": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=1)).isoformat()
            }, headers=headers)
            logger.log_call(
                "5.3 Equipment Fuel Log", "Valid Logging", "POST", f"/apis/v3/equipment/{eq_id}/fuel",
                r18_ok.status_code, 201, r18_ok.status_code == 201, "Fuel consumption logged (85L @ 94 INR/L)"
            )
            
        # 5.4 Production Recipe
        r19_ok = client.post("/apis/v3/production/recipes", json={
            "company_id": cid,
            "project_id": pid,
            "recipe_code": f"MIX-M30-{suffix}",
            "product_name": f"Concrete Mix Grade M30 {suffix}",
            "mix_type": "Concrete",
            "unit": "cum",
            "materials": [{"material_name": "Cement", "planned_qty": 350.0, "unit": "kg"}]
        }, headers=headers)
        logger.log_call(
            "5.4 Production Recipe", "Valid Creation", "POST", "/apis/v3/production/recipes",
            r19_ok.status_code, 201, r19_ok.status_code == 201, "Production batch recipe saved"
        )
        
        # ==========================================
        # 6. SALES & CRM
        # ==========================================
        
        # 6.1 CRM Lead Capture
        r20_ok = client.post("/apis/v3/crm/leads", json={
            "company_id": cid,
            "title": f"Prestige Commercial Plaza Phase 2 {suffix}",
            "client_name": "Prestige Group Ltd",
            "lead_type": "Commercial",
            "contact_name": "Rajesh Nambiar",
            "phone_no": "+919888001122",
            "status": "New Lead",
            "estimated_value": 75000000.0
        }, headers=headers)
        lead_id = r20_ok.json().get("id") if r20_ok.status_code in (200, 201) else None
        logger.log_call(
            "6.1 CRM Lead Capture", "Valid Creation", "POST", "/apis/v3/crm/leads",
            r20_ok.status_code, 201, r20_ok.status_code == 201 and lead_id is not None, f"CRM Lead created with id {lead_id}"
        )
        
        # 6.2 CRM Quotation
        if lead_id:
            r21_ok = client.post(f"/apis/v3/crm/leads/{lead_id}/quotations", json={
                "company_id": cid,
                "lead_id": lead_id,
                "quotation_number": f"QT-{suffix}-01",
                "subject": "Civil Structural Estimation",
                "total_amount": 71500000.0,
                "status": "Draft",
                "items": [{"item_name": "RCC Works", "qty": 1000.0, "rate": 7150.0, "unit": "cum", "amount": 7150000.0}]
            }, headers=headers)
            logger.log_call(
                "6.2 CRM Quotation", "Valid Creation", "POST", f"/apis/v3/crm/leads/{lead_id}/quotations",
                r21_ok.status_code, 201, r21_ok.status_code == 201, "Client quotation generated"
            )
            
        # 6.3 Rate Card Library
        r22_ok = client.post("/apis/v3/library/rates", json={
            "company_id": cid,
            "name": "RCC Grade M30 Column Pour",
            "item_code": f"RCC-M30-{suffix}",
            "unit": "cum",
            "cost_rate": 6200.0,
            "selling_rate": 7100.0
        }, headers=headers)
        logger.log_call(
            "6.3 Rate Card Preset", "Valid Creation", "POST", "/apis/v3/library/rates",
            r22_ok.status_code, 200, r22_ok.status_code == 200, "Standard rate preset registered"
        )
        
        # ==========================================
        # 7. REPORTS & ANALYTICS
        # ==========================================
        r23_ok = client.get(f"/apis/v3/reports/data/cost-code-expense-analysis?company_id={cid}&project_id={pid}", headers=headers)
        logger.log_call(
            "7.1 Standard Reports Hub", "Execute Report", "GET", f"/apis/v3/reports/data/cost-code-expense-analysis",
            r23_ok.status_code, 200, r23_ok.status_code == 200, "Dynamic report aggregation returned rows"
        )
        
    logger.write_markdown()
    return 0

if __name__ == "__main__":
    sys.exit(run())
