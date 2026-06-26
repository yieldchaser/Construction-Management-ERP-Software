# -*- coding: utf-8 -*-
"""
Phase 13 Integration Tests -- Safety & Incident Management (HSE)
Tests (isolated SQLite DB, port 8015):
  1.  Log a Near Miss incident (severity=Low)
  2.  Log an LTI incident with 7 lost days (severity=High)
  3.  List incidents for project (assert count=2)
  4.  Close the Near Miss with root cause + corrective action
  5.  Fetch safety stats -- verify LTI count, lost days, LTIF calculation
  6.  Log a toolbox talk (25 attendees)
  7.  List toolbox talks (assert count=1)
  8.  Log a PPE check (30 workers, 27 compliant = 90%)
  9.  List PPE checks and assert compliance%
  10. Validation: compliant > total workers rejected (HTTP 400)
"""

import os
import sys
import time
import uuid
import subprocess
import requests
from datetime import datetime

BASE = "http://127.0.0.1:8015/apis/v3"
DB_FILE = "test_phase13.db"


def start_server():
    env = os.environ.copy()
    env["DATABASE_URL"] = f"sqlite:///./{DB_FILE}"
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", "127.0.0.1", "--port", "8015", "--log-level", "error"],
        env=env,
        cwd=os.path.dirname(os.path.abspath(__file__)),
    )
    for _ in range(30):
        time.sleep(1)
        try:
            if requests.get("http://127.0.0.1:8015/").status_code == 200:
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
        name="Safety Test Co"
    )
    db.add(company)
    db.commit()

    project = models.Project(
        id=project_obj,
        company_id=company.id,
        name="HSE Test Project"
    )
    db.add(project)
    db.commit()
    db.close()


def assert_eq(label, actual, expected):
    assert actual == expected, f"[FAIL] {label}: expected {expected!r}, got {actual!r}"
    print(f"  [OK] {label} = {actual!r}")


def ok(label, r, expected_status=200):
    assert r.status_code == expected_status, \
        f"[FAIL] {label}: HTTP {r.status_code} -- {r.text[:300]}"
    print(f"  [OK] {label}")
    return r.json()


def test_phase13():
    for _ in range(5):
        try:
            if os.path.exists(DB_FILE):
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

        # ── 1. Log Near Miss incident ─────────────────────────────────────────
        r = s.post(f"{BASE}/safety/incidents", json={
            "project_id": project_id,
            "incident_type": "Near Miss",
            "severity": "Low",
            "description": "Worker slipped near water tank. No injury.",
            "location": "Block A - Ground Floor",
            "injured_person": None,
            "lost_time_days": 0,
            "reported_by": "Site Supervisor",
            "reported_at": "2024-06-15T09:30:00"
        })
        near_miss = ok("Log Near Miss incident", r)
        near_miss_id = near_miss["id"]
        assert_eq("Near Miss status", near_miss["status"], "open")
        assert_eq("Near Miss type", near_miss["incident_type"], "Near Miss")

        # ── 2. Log LTI incident (7 lost days) ────────────────────────────────
        r = s.post(f"{BASE}/safety/incidents", json={
            "project_id": project_id,
            "incident_type": "LTI",
            "severity": "High",
            "description": "Worker fell from scaffolding at 3rd floor slab level.",
            "location": "Block B - 3rd Floor",
            "injured_person": "Ravi Kumar",
            "lost_time_days": 7,
            "reported_by": "Safety Officer",
            "reported_at": "2024-06-20T11:00:00"
        })
        lti = ok("Log LTI incident (7 lost days)", r)
        lti_id = lti["id"]
        assert_eq("LTI severity", lti["severity"], "High")

        # ── 3. List incidents (assert count = 2) ─────────────────────────────
        r = s.get(f"{BASE}/safety/incidents/{project_id}")
        incidents = ok("List incidents for project", r)
        assert_eq("Incident count", len(incidents), 2)

        # ── 4. Close Near Miss with root cause ───────────────────────────────
        r = s.patch(f"{BASE}/safety/incidents/{near_miss_id}/close", json={
            "root_cause": "Wet floor due to unreported pipe leak.",
            "corrective_action": "Warning signs installed, pipe fixed. Weekly floor inspections mandated."
        })
        closed = ok("Close Near Miss incident", r)
        assert_eq("Closed status", closed["status"], "closed")
        assert closed["root_cause"] is not None, "[FAIL] root_cause should be set"

        # ── 5. Safety stats + LTIF calculation ───────────────────────────────
        r = s.get(f"{BASE}/safety/stats/{project_id}?total_manhours=100000")
        stats = ok("Get safety stats (LTIF)", r)
        assert_eq("Total incidents", stats["total_incidents"], 2)
        assert_eq("LTI count", stats["lti_count"], 1)
        assert_eq("Total lost days", stats["total_lost_days"], 7)
        expected_ltif = round((1 * 200000) / 100000, 2)  # = 2.0
        assert_eq("LTIF rate", stats["ltif"], expected_ltif)
        assert_eq("Open incidents", stats["open_incidents"], 1)
        assert_eq("Closed incidents", stats["closed_incidents"], 1)

        # ── 6. Log toolbox talk (25 attendees) ───────────────────────────────
        r = s.post(f"{BASE}/safety/toolbox-talks", json={
            "project_id": project_id,
            "topic": "Working at Height -- Scaffolding Safety",
            "conducted_by": "HSE Manager",
            "conducted_at": "2024-06-22T08:00:00",
            "attendee_count": 25,
            "notes": "Distributed harness inspection checklist to all workers."
        })
        talk = ok("Log toolbox talk (25 attendees)", r)
        assert_eq("Talk attendee count", talk["attendee_count"], 25)

        # ── 7. List toolbox talks ─────────────────────────────────────────────
        r = s.get(f"{BASE}/safety/toolbox-talks/{project_id}")
        talks = ok("List toolbox talks", r)
        assert_eq("Talks count", len(talks), 1)
        assert talks[0]["topic"] == "Working at Height -- Scaffolding Safety", \
            f"[FAIL] Talk topic mismatch: {talks[0]['topic']}"

        # ── 8. Log PPE check (30 workers, 27 compliant = 90%) ────────────────
        r = s.post(f"{BASE}/safety/ppe-checks", json={
            "project_id": project_id,
            "checked_by": "Site Engineer",
            "check_date": "2024-06-23T07:30:00",
            "total_workers": 30,
            "compliant_workers": 27,
            "non_compliant_items": ["No safety helmet", "No reflective vest", "No safety boots"]
        })
        ppe = ok("Log PPE check (30w / 27c = 90%)", r)
        assert_eq("PPE compliance %", ppe["compliance_pct"], 90.0)

        # ── 9. List PPE checks ────────────────────────────────────────────────
        r = s.get(f"{BASE}/safety/ppe-checks/{project_id}")
        ppe_list = ok("List PPE checks", r)
        assert_eq("PPE checks count", len(ppe_list), 1)
        assert_eq("PPE list compliance %", ppe_list[0]["compliance_pct"], 90.0)

        # ── 10. Validation: compliant > total rejected ────────────────────────
        r = s.post(f"{BASE}/safety/ppe-checks", json={
            "project_id": project_id,
            "checked_by": "Test",
            "check_date": "2024-06-24T09:00:00",
            "total_workers": 10,
            "compliant_workers": 15,
            "non_compliant_items": []
        })
        assert r.status_code == 400, \
            f"[FAIL] Expected 400 when compliant > total workers, got {r.status_code}"
        print("  [OK] Validation: compliant > total workers rejected (HTTP 400)")

        print("\n=== All Phase 13 Tests Passed ===\n")

    finally:
        proc.terminate()
        time.sleep(1)
        for _ in range(5):
            try:
                if os.path.exists(DB_FILE):
                    os.remove(DB_FILE)
                break
            except Exception:
                time.sleep(1)


if __name__ == "__main__":
    test_phase13()
