# -*- coding: utf-8 -*-
"""
Phase 12 Integration Test -- Equipment & Machinery Tracking
Tests (isolated SQLite DB, port 8008):
  1. Add equipment (owned crane, hired excavator)
  2. List equipment fleet
  3. Deploy equipment to a project (status transitions to 'deployed')
  4. List project deployments
  5. Log fuel consumption (liters, rate, total_cost auto-calculated)
  6. Fetch fuel logs
  7. Schedule maintenance (status transitions to 'maintenance')
  8. Complete maintenance (status transitions back to 'available')
"""

import os
import sys
import time
import uuid
import subprocess
import requests
from datetime import datetime

BASE = "http://127.0.0.1:8008/apis/v3"
DB_FILE = "test_phase12.db"


def start_server():
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8008", "--log-level", "error"],
        env=env,
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    for _ in range(30):
        time.sleep(1)
        try:
            if requests.get("http://127.0.0.1:8008/").status_code == 200:
                return proc
        except Exception:
            pass
    proc.terminate()
    raise RuntimeError("Server failed to start within 30s")


def seed_db(company_obj, project_obj):
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    os.environ["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
    
    from app.database import SessionLocal, engine
    from app import models

    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    company = models.Company(
        id=company_obj,
        name="Equipment Test Co"
    )
    db.add(company)
    db.commit()

    project = models.Project(
        id=project_obj,
        company_id=company.id,
        name="Equipment Test Project"
    )
    db.add(project)
    db.commit()
    db.close()


def test_phase12():
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

    seed_db(company_obj, project_obj)

    proc = start_server()
    try:
        s = requests.Session()

        # ── 1. Add Equipment ─────────────────────────────────────────────────
        crane_payload = {
            "company_id": company_id,
            "name": "Liebherr LTM 1050 Mobile Crane",
            "code": "EQ-CRN-01",
            "category": "Crane",
            "ownership_type": "Owned",
            "hourly_rate": 120.0
        }
        r = s.post(f"{BASE}/equipment", json=crane_payload)
        assert r.status_code == 201, f"Add crane failed: {r.text}"
        crane = r.json()
        crane_id = crane["id"]
        assert crane["status"] == "available"
        print(f"  [OK] Added equipment: {crane['name']} (status=available)")

        excavator_payload = {
            "company_id": company_id,
            "name": "CAT 320 Hydraulic Excavator",
            "code": "EQ-EXC-01",
            "category": "Excavator",
            "ownership_type": "Hired",
            "hourly_rate": 85.0
        }
        r = s.post(f"{BASE}/equipment", json=excavator_payload)
        assert r.status_code == 201
        excavator = r.json()
        excavator_id = excavator["id"]
        print(f"  [OK] Added equipment: {excavator['name']} (ownership=Hired)")

        # ── 2. List Fleet ────────────────────────────────────────────────────
        r = s.get(f"{BASE}/equipment/{company_id}")
        assert r.status_code == 200
        fleet = r.json()
        assert len(fleet) == 2
        print(f"  [OK] Fleet list retrieved (count=2)")

        # ── 3. Deploy Equipment ──────────────────────────────────────────────
        deploy_payload = {
            "project_id": project_id,
            "start_date": "2026-06-26T08:00:00",
            "remarks": "Deploying for foundation structural lifting"
        }
        r = s.post(f"{BASE}/equipment/{crane_id}/deploy", json=deploy_payload)
        assert r.status_code == 201, f"Deployment failed: {r.text}"
        dep = r.json()
        assert dep["equipment_id"] == crane_id
        
        # Verify equipment status is now 'deployed'
        r = s.get(f"{BASE}/equipment/{company_id}")
        assert r.status_code == 200
        crane_updated = [e for e in r.json() if e["id"] == crane_id][0]
        assert crane_updated["status"] == "deployed"
        print(f"  [OK] Crane deployed to project. Status transitioned to 'deployed'")

        # ── 4. List Deployments ──────────────────────────────────────────────
        r = s.get(f"{BASE}/equipment/deployments/{project_id}")
        assert r.status_code == 200
        deployments = r.json()
        assert len(deployments) == 1
        assert deployments[0]["equipment_id"] == crane_id
        print(f"  [OK] Project deployments listed (count=1)")

        # ── 5. Log Fuel Consumption ──────────────────────────────────────────
        fuel_payload = {
            "project_id": project_id,
            "logged_date": "2026-06-26T12:00:00",
            "liters": 75.5,
            "cost_per_liter": 1.80,
            "odometer_hours": 342.1,
            "remarks": "Refilled diesel tank"
        }
        r = s.post(f"{BASE}/equipment/{crane_id}/fuel", json=fuel_payload)
        assert r.status_code == 201, f"Fuel log failed: {r.text}"
        fuel = r.json()
        assert fuel["total_cost"] == 135.9  # 75.5 * 1.80 = 135.90
        print(f"  [OK] Logged fuel: {fuel['liters']} liters @ {fuel['cost_per_liter']}/L. Total cost={fuel['total_cost']} (auto-calculated)")

        # ── 6. Get Fuel Logs ─────────────────────────────────────────────────
        r = s.get(f"{BASE}/equipment/fuel-logs/{project_id}")
        assert r.status_code == 200
        logs = r.json()
        assert len(logs) == 1
        assert logs[0]["equipment_id"] == crane_id
        print(f"  [OK] Project fuel logs listed (count=1)")

        # ── 7. Schedule Maintenance ──────────────────────────────────────────
        maint_payload = {
            "service_type": "Hydraulic System Check",
            "scheduled_date": "2026-06-27T09:00:00",
            "cost": 350.0,
            "status": "scheduled",
            "remarks": "Routine hydraulic inspection"
        }
        r = s.post(f"{BASE}/equipment/{crane_id}/maintenance", json=maint_payload)
        assert r.status_code == 201, f"Maintenance scheduling failed: {r.text}"
        maint = r.json()
        assert maint["status"] == "scheduled"
        
        # Verify status transitions to maintenance
        r = s.get(f"{BASE}/equipment/{company_id}")
        crane_maint = [e for e in r.json() if e["id"] == crane_id][0]
        assert crane_maint["status"] == "maintenance"
        print(f"  [OK] Scheduled maintenance. Crane status transitioned to 'maintenance'")

        # ── 8. Complete Maintenance ──────────────────────────────────────────
        maint_complete_payload = {
            "service_type": "Hydraulic System Check",
            "scheduled_date": "2026-06-27T09:00:00",
            "cost": 380.0,  # updated actual cost
            "status": "completed",
            "remarks": "Hydraulics checked. Hose replaced."
        }
        r = s.post(f"{BASE}/equipment/{crane_id}/maintenance", json=maint_complete_payload)
        assert r.status_code == 201
        maint_done = r.json()
        assert maint_done["status"] == "completed"

        # Verify status transitions back to available
        r = s.get(f"{BASE}/equipment/{company_id}")
        crane_avail = [e for e in r.json() if e["id"] == crane_id][0]
        assert crane_avail["status"] == "available"
        print(f"  [OK] Completed maintenance. Crane status transitioned back to 'available'")

        # ── 9. List Maintenance Schedules ────────────────────────────────────
        r = s.get(f"{BASE}/equipment/maintenance-schedules/{crane_id}")
        assert r.status_code == 200
        schedules = r.json()
        assert len(schedules) == 2
        print(f"  [OK] Crane maintenance schedules retrieved (count=2)")

        print()
        print("[PASS] All Phase 12 Equipment & Machinery Tracking tests passed!")

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


if __name__ == "__main__":
    test_phase12()
