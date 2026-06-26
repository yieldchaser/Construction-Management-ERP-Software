# -*- coding: utf-8 -*-
"""
Phase 16 Integration Test -- Production Management
Tests (isolated SQLite DB, port 8017):
  1. Seed a company, project, and raw inventory rows
  2. Create a production recipe with a material bill of quantities
  3. Log a batch run with actual consumption and output variance
  4. Verify inventory deduction, transaction logging, and summary aggregation
"""

import os
import sys
import time
import uuid
import subprocess
import requests
from datetime import datetime

BASE = "http://127.0.0.1:8017/apis/v3"
DB_FILE = "test_phase16.db"


def start_server():
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8017", "--log-level", "error"],
        env=env,
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    for _ in range(30):
        time.sleep(1)
        try:
            if requests.get("http://127.0.0.1:8017/").status_code == 200:
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

    company = models.Company(id=company_obj, name="Production Build Co")
    project = models.Project(id=project_obj, company_id=company.id, name="Batch Plant Project", code="BPP-01")
    db.add_all([company, project])
    db.commit()

    db.add_all([
        models.WarehouseInventory(
            project_id=project.id,
            material_name="Cement",
            on_hand_qty=200,
            reserved_qty=20,
            unit="bags",
        ),
        models.WarehouseInventory(
            project_id=project.id,
            material_name="Sand",
            on_hand_qty=25,
            reserved_qty=0,
            unit="m3",
        ),
        models.WarehouseInventory(
            project_id=project.id,
            material_name="Aggregate",
            on_hand_qty=40,
            reserved_qty=0,
            unit="m3",
        ),
    ])
    db.commit()
    db.close()


def assert_close(label, actual, expected, tol=1e-6):
    assert abs(actual - expected) <= tol, f"{label}: expected {expected}, got {actual}"


def main():
    company_id = uuid.uuid4()
    project_id = uuid.uuid4()
    seed_db(company_id, project_id)

    proc = start_server()
    db = None
    try:
        recipe_payload = {
            "company_id": str(company_id),
            "project_id": str(project_id),
            "recipe_code": "RMC-M20-001",
            "product_name": "M20 Ready Mix Concrete",
            "mix_type": "Concrete Batch",
            "unit": "m3",
            "target_output_qty": 10,
            "wastage_pct": 5,
            "notes": "Standard site pour mix for slab work.",
            "materials": [
                {"material_name": "Cement", "planned_qty": 50, "unit": "bags", "is_optional": False},
                {"material_name": "Sand", "planned_qty": 3.5, "unit": "m3", "is_optional": False},
                {"material_name": "Aggregate", "planned_qty": 6.5, "unit": "m3", "is_optional": False},
            ],
        }
        recipe_res = requests.post(f"{BASE}/production/recipes", json=recipe_payload)
        assert recipe_res.status_code == 201, recipe_res.text
        recipe = recipe_res.json()

        batch_payload = {
            "company_id": str(company_id),
            "project_id": str(project_id),
            "recipe_id": recipe["id"],
            "batch_number": "BATCH-2026-001",
            "planned_output_qty": 10,
            "actual_output_qty": 9.5,
            "status": "completed",
            "started_at": "2026-06-26T08:00:00",
            "completed_at": "2026-06-26T10:00:00",
            "notes": "Morning pour completed with slight mix variance.",
            "materials": [
                {"material_name": "Cement", "actual_qty": 52, "unit": "bags"},
                {"material_name": "Sand", "actual_qty": 3.2, "unit": "m3"},
                {"material_name": "Aggregate", "actual_qty": 6.7, "unit": "m3"},
            ],
        }
        batch_res = requests.post(f"{BASE}/production/batches", json=batch_payload)
        assert batch_res.status_code == 201, batch_res.text
        batch = batch_res.json()

        assert batch["recipe_code"] == "RMC-M20-001"
        assert batch["batch_number"] == "BATCH-2026-001"
        assert_close("planned output", batch["planned_output_qty"], 10.0)
        assert_close("actual output", batch["actual_output_qty"], 9.5)
        assert_close("material variance", batch["consumption_variance_qty"], 1.9)
        assert len(batch["materials"]) == 3

        summary_res = requests.get(f"{BASE}/production/summary", params={"project_id": str(project_id)})
        assert summary_res.status_code == 200, summary_res.text
        summary = summary_res.json()

        assert summary["recipe_count"] == 1
        assert summary["batch_count"] == 1
        assert_close("summary planned output", summary["planned_output_qty"], 10.0)
        assert_close("summary actual output", summary["actual_output_qty"], 9.5)
        assert_close("summary material variance", summary["material_variance_qty"], 1.9)
        assert len(summary["recipes"]) == 1
        assert len(summary["batches"]) == 1
        assert len(summary["inventory_alerts"]) == 3

        sys.path.append(os.path.dirname(os.path.abspath(__file__)))
        os.environ["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
        from app.database import SessionLocal
        from app import models

        db = SessionLocal()
        cement_inventory = db.query(models.WarehouseInventory).filter(
            models.WarehouseInventory.project_id == project_id,
            models.WarehouseInventory.material_name == "Cement",
        ).first()
        assert cement_inventory is not None
        assert_close("cement on hand", float(cement_inventory.on_hand_qty), 148.0)

        sand_inventory = db.query(models.WarehouseInventory).filter(
            models.WarehouseInventory.project_id == project_id,
            models.WarehouseInventory.material_name == "Sand",
        ).first()
        assert sand_inventory is not None
        assert_close("sand on hand", float(sand_inventory.on_hand_qty), 21.8)

        transactions = db.query(models.MaterialTransaction).filter(
            models.MaterialTransaction.project_id == project_id,
            models.MaterialTransaction.type == "used",
        ).all()
        assert len(transactions) == 3
        assert {str(tx.source_ref_id) for tx in transactions} == {batch["id"]}
        print("Phase 16 production management test passed.")
    finally:
        if db is not None:
            db.close()
        proc.terminate()
        proc.wait(timeout=10)


if __name__ == "__main__":
    main()
