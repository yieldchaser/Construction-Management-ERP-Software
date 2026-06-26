import os
import sys
import subprocess
import time
import requests
import openpyxl
import uuid
from datetime import datetime, timedelta

def setup_excel_file():
    print("Generating mock Excel BOQ file...")
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "WBS BOQ"
    
    # Header row
    ws.append(["item_name", "qty", "unit", "rate", "section_name"])
    
    # Test rows
    # 1. Steel item (should round to 3 decimals)
    ws.append(["TMT Steel Reinforcement 12mm", 10.35712, "kg", 65.0, "Foundations"])
    # 2. Brick item (should round to 0 decimals)
    ws.append(["Traditional Clay Bricks", 2500.85, "bags", 12.0, "Superstructure"])
    # 3. Excavation item (should round to 2 decimals)
    ws.append(["Soil Excavation & Shoring", 150.456, "m3", 450.0, "Foundations"])
    
    file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_boq.xlsx")
    wb.save(file_path)
    return file_path

def test_phase2():
    # 1. Clean and setup local DB
    print("Setting up local SQLite database...")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_phase2.db")
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
        except Exception:
            pass

    # Pre-populate DB with Company and Project context using SQLAlchemy models
    os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    from app.database import SessionLocal, engine
    from app import models

    # Create WBS and budgeting tables
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    company = models.Company(
        id=uuid.uuid4(),
        name="Test Airport Construction Ltd"
    )
    db.add(company)
    db.commit()
    
    project = models.Project(
        id=uuid.uuid4(),
        company_id=company.id,
        name="Airport Runway Extension",
        code="RUN-02"
    )
    db.add(project)
    db.commit()

    project_id = str(project.id)
    print(f"[x] Created Test Company ({company.id}) and Test Project ({project_id})")
    
    # 2. Build mock Excel sheet
    excel_file = setup_excel_file()
    
    # 3. Start FastAPI server
    print("Starting FastAPI backend server...")
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    proc = subprocess.Popen(
        ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    # Wait for the server to spin up
    time.sleep(5)
    
    try:
        base_url = "http://127.0.0.1:8000"
        
        # 4. Upload BOQ spreadsheet
        print("\nTesting BOQ Excel Upload...")
        with open(excel_file, "rb") as f:
            res = requests.post(
                f"{base_url}/apis/v3/budgeting/boq/import",
                data={"project_id": project_id},
                files={"file": ("test_boq.xlsx", f, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
            )
        if res.status_code != 201:
            print("Response status code:", res.status_code)
            print("Response text:", res.text)
        assert res.status_code == 201
        data = res.json()
        assert data["success"] is True
        assert data["imported_count"] == 3
        print("[x] BOQ Import passed successfully!")

        # 5. Fetch BOQ and verify quantity precision limits
        print("\nTesting quantity precision limits & calculations...")
        res = requests.get(f"{base_url}/apis/v3/budgeting/boq?project_id={project_id}")
        assert res.status_code == 200
        items = res.json()
        
        for item in items:
            print(f"  Item: {item['item_name']}, Qty: {item['quantity']}, Unit: {item['unit']}, Amount: {item['amount']}")
            if "Steel" in item["item_name"]:
                # kg should have 3 decimals: 10.35712 -> 10.357
                assert item["quantity"] == 10.357
            elif "Bricks" in item["item_name"]:
                # bags should have 0 decimals: 2500.85 -> 2501
                assert item["quantity"] == 2501.0
            elif "Excavation" in item["item_name"]:
                # m3 should have 2 decimals: 150.456 -> 150.46
                assert item["quantity"] == 150.46
        print("[x] Quantity float precision limits applied successfully!")

        # 6. Create Task A
        print("\nTesting Task WBS Scheduler (Task A)...")
        start_a = (datetime.utcnow() + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        res = requests.post(
            f"{base_url}/apis/v3/planning/tasks",
            json={
                "project_id": project_id,
                "name": "Task A: Shoring excavation",
                "duration_days": 10,
                "start_date": start_a
            }
        )
        assert res.status_code == 201
        task_a = res.json()
        task_a_id = task_a["id"]
        # Verify end_date calculation (start + 10 days)
        dt_start_a = datetime.strptime(task_a["start_date"], "%Y-%m-%dT%H:%M:%S")
        dt_end_a = datetime.strptime(task_a["end_date"], "%Y-%m-%dT%H:%M:%S")
        assert (dt_end_a - dt_start_a).days == 10
        print(f"[x] Task A created successfully. End date matches: {task_a['end_date']}")

        # 7. Create Task B (starting early, will get pushed by predecessor constraint)
        print("\nTesting Task B Creation...")
        start_b = (datetime.utcnow() + timedelta(days=2)).strftime("%Y-%m-%dT%H:%M:%SZ")
        res = requests.post(
            f"{base_url}/apis/v3/planning/tasks",
            json={
                "project_id": project_id,
                "name": "Task B: Reinforcement steel base",
                "duration_days": 5,
                "start_date": start_b
            }
        )
        assert res.status_code == 201
        task_b = res.json()
        task_b_id = task_b["id"]
        print(f"[x] Task B created successfully. Start: {task_b['start_date']}, End: {task_b['end_date']}")

        # 8. Link Predecessor (Task A -> Task B) and check forward-pass propagation
        print("\nLinking Predecessor dependency (Task A is predecessor to Task B)...")
        res = requests.post(
            f"{base_url}/apis/v3/planning/tasks/{task_b_id}/predecessors",
            json={
                "predecessor_id": task_a_id,
                "type": "finish_to_start"
            }
        )
        assert res.status_code == 201
        print("[x] Predecessor linked successfully!")

        # Fetch Task B again to verify start date shifted to Task A end date
        res = requests.get(f"{base_url}/apis/v3/planning/tasks?project_id={project_id}")
        tasks_list = res.json()
        task_b_updated = next(t for t in tasks_list if t["id"] == task_b_id)
        
        print(f"  Updated Task B dates: Start: {task_b_updated['start_date']}, End: {task_b_updated['end_date']}")
        # Task B start_date must equal Task A end_date
        assert task_b_updated["start_date"] == task_a["end_date"]
        # Task B duration must still be 5 days, so end date must shift accordingly
        dt_start_b = datetime.strptime(task_b_updated["start_date"], "%Y-%m-%dT%H:%M:%S")
        dt_end_b = datetime.strptime(task_b_updated["end_date"], "%Y-%m-%dT%H:%M:%S")
        assert (dt_end_b - dt_start_b).days == 5
        print("[x] Forward-pass schedule propagation succeeded!")

        # 9. Verify Circular Dependency Protection (Task B -> Task A)
        print("\nTesting Circular Dependency protection...")
        res = requests.post(
            f"{base_url}/apis/v3/planning/tasks/{task_a_id}/predecessors",
            json={
                "predecessor_id": task_b_id,
                "type": "finish_to_start"
            }
        )
        # Should fail with 400 Bad Request
        assert res.status_code == 400
        print("[x] Circular dependency correctly blocked:", res.json()["detail"])

        print("\nALL PHASE 2 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")

    except Exception as e:
        print(f"\nTEST FAILED: {e}")
        # Print logs if failed
        proc.terminate()
        out, err = proc.communicate()
        print("stdout:", out)
        print("stderr:", err)
        sys.exit(1)
        
    finally:
        print("Stopping backend server...")
        proc.terminate()
        proc.wait()
        # Clean up files
        if os.path.exists(excel_file):
            try:
                os.remove(excel_file)
            except Exception:
                pass
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                pass

if __name__ == "__main__":
    test_phase2()
