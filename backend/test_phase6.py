import os
import sys
import subprocess
import time
import requests
import uuid

def test_phase6():
    # 1. Clean and setup local DB
    print("Setting up local SQLite database for Phase 6 test...")
    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "test_phase6.db")
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

    # Create all tables (including drawings)
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    company = models.Company(
        id=uuid.uuid4(),
        name="Apex Construction Group"
    )
    db.add(company)
    db.commit()
    
    project = models.Project(
        id=uuid.uuid4(),
        company_id=company.id,
        name="Skyscraper Tower Alpha",
        code="TOW-A"
    )
    db.add(project)
    db.commit()

    project_id = str(project.id)
    print(f"[x] Created Test Company ({company.id}) and Test Project ({project_id})")
    
    # Start FastAPI server
    print("Starting FastAPI backend server...")
    env = os.environ.copy()
    env["PYTHONPATH"] = os.path.dirname(os.path.abspath(__file__))
    env["DATABASE_URL"] = f"sqlite:///{db_path}"
    proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8004"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=env
    )
    
    # Wait for the server to spin up
    time.sleep(5)
    
    try:
        base_url = "http://127.0.0.1:8004"
        
        # 1. Create a drawing (Auto-creates V1 revision)
        print("\nTesting Create Drawing...")
        res = requests.post(
            f"{base_url}/apis/v3/drawings",
            json={
                "project_id": project_id,
                "name": "Architectural Foundation Layout",
                "category": "2D Layout",
                "file_url": "/images/drawings/foundation_v1.pdf"
            }
        )
        assert res.status_code == 200
        drawing = res.json()
        drawing_id = drawing["id"]
        assert drawing["name"] == "Architectural Foundation Layout"
        assert len(drawing["revisions"]) == 1
        v1_rev = drawing["revisions"][0]
        v1_id = v1_rev["id"]
        assert v1_rev["version_code"] == "V1"
        assert v1_rev["approval_status"] == "pending"
        print("[x] Drawing and V1 revision created successfully!")

        # 2. List drawings for project
        print("\nTesting List Drawings...")
        res = requests.get(f"{base_url}/apis/v3/drawings?project_id={project_id}")
        assert res.status_code == 200
        drawings = res.json()
        assert len(drawings) == 1
        assert drawings[0]["id"] == drawing_id
        print("[x] Drawing listed successfully!")

        # 3. Create a V2 revision
        print("\nTesting Add Drawing Revision V2...")
        res = requests.post(
            f"{base_url}/apis/v3/drawings/{drawing_id}/revisions",
            json={
                "version_code": "V2",
                "file_url": "/images/drawings/foundation_v2.pdf",
                "comments": "Shifted columns grid-line C to the left by 100mm"
            }
        )
        assert res.status_code == 200
        v2_rev = res.json()
        v2_id = v2_rev["id"]
        assert v2_rev["version_code"] == "V2"
        assert v2_rev["approval_status"] == "pending"
        print("[x] Revision V2 added successfully!")

        # 4. Approve V2 revision
        print("\nTesting Approve Revision V2...")
        res = requests.post(
            f"{base_url}/apis/v3/drawings/revisions/{v2_id}/approve",
            json={
                "approval_status": "approved",
                "comments": "Reviewed by lead structural engineer, looks good."
            }
        )
        assert res.status_code == 200
        v2_approved = res.json()
        assert v2_approved["approval_status"] == "approved"
        assert v2_approved["comments"] == "Reviewed by lead structural engineer, looks good."
        print("[x] Revision V2 approved successfully!")

        # 5. Add a canvas pin to V2 revision
        print("\nTesting Add Canvas Pin...")
        res = requests.post(
            f"{base_url}/apis/v3/drawings/revisions/{v2_id}/pins",
            json={
                "x_coordinate": 25.4,
                "y_coordinate": 75.8,
                "comment": "Check slab overlap thickness at column C-4"
            }
        )
        assert res.status_code == 200
        pin = res.json()
        pin_id = pin["id"]
        assert pin["x_coordinate"] == 25.4
        assert pin["y_coordinate"] == 75.8
        assert pin["comment"] == "Check slab overlap thickness at column C-4"
        print("[x] Canvas pin added successfully!")

        # 6. Verify drawing lists with new revision and pin
        res = requests.get(f"{base_url}/apis/v3/drawings?project_id={project_id}")
        assert res.status_code == 200
        drawings = res.json()
        revs = drawings[0]["revisions"]
        # Should have V1 and V2
        assert len(revs) == 2
        v2_list = next(r for r in revs if r["id"] == v2_id)
        assert len(v2_list["pins"]) == 1
        assert v2_list["pins"][0]["id"] == pin_id
        print("[x] Drawing response includes complete hierarchy (Drawing -> Revision -> Pins)!")

        # 7. Delete canvas pin
        print("\nTesting Delete Canvas Pin...")
        res = requests.delete(f"{base_url}/apis/v3/drawings/pins/{pin_id}")
        assert res.status_code == 200
        assert res.json()["status"] == "success"
        
        # Verify pin is deleted
        res = requests.get(f"{base_url}/apis/v3/drawings?project_id={project_id}")
        revs = res.json()[0]["revisions"]
        v2_list = next(r for r in revs if r["id"] == v2_id)
        assert len(v2_list["pins"]) == 0
        print("[x] Canvas pin deleted successfully!")

        print("\nALL PHASE 6 DRAWINGS BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY!")

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
    test_phase6()
