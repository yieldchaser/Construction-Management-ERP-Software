# -*- coding: utf-8 -*-
"""
Phase 10 Integration Test -- Quality Control, Inspections & NCRs
Tests (isolated SQLite DB, port 8008):
  1. Create IS-456 checklist with 3 items
  2. Start a site inspection for Floor 3
  3. Submit bulk pass/fail responses -> status auto-computed as 'partial'
  4. Raise a Critical NCR
  5. Move NCR to under_review
  6. Close NCR with resolution notes
  7. Log cube test result -> auto-pass computed
  8. Log slump test outside acceptable range -> auto-fail
"""

import os
import sys
import time
import uuid
import sqlite3
import subprocess
import requests

BASE = "http://127.0.0.1:8008/apis/v3"
DB_FILE = "test_phase10.db"


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


def seed_db(company_id_raw, project_id_raw):
    time.sleep(1)
    conn = sqlite3.connect(DB_FILE)
    conn.execute(
        "INSERT INTO companies (id, name, currency_decimal_places, quantity_decimal_places, "
        "back_dated_limit_days, negative_stock_lock, bom_restriction, po_restriction, "
        "material_request_restriction, negative_balance_warning, custom_pdf_template_enabled, "
        "created_at, updated_at) "
        "VALUES (?, 'QC Test Co', 2, 3, 7, 0, 0, 0, 0, 0, 0, datetime('now'), datetime('now'))",
        (company_id_raw,)
    )
    conn.execute(
        "INSERT INTO projects (id, company_id, name, status, attendance_radius_meters, "
        "is_location_required, custom_pdf_template_enabled, created_at, updated_at) "
        "VALUES (?, ?, 'QC Test Project', 'Ongoing', 500, 1, 0, datetime('now'), datetime('now'))",
        (project_id_raw, company_id_raw)
    )
    conn.commit()
    conn.close()


def test_phase10():
    proc = start_server()
    try:
        s = requests.Session()

        company_obj = uuid.uuid4()
        project_obj = uuid.uuid4()
        company_id = str(company_obj)
        project_id = str(project_obj)
        seed_db(company_obj.hex, project_obj.hex)

        # ── 1. Create IS-456 checklist ──────────────────────────────────────
        cl_payload = {
            "company_id": company_id,
            "title": "IS 456 Concrete Work Pre-Pour Checklist",
            "category": "Concrete",
            "is_code_reference": "IS 456:2000",
            "description": "Pre-pour checks for RCC structural elements"
        }
        r = s.post(f"{BASE}/quality/checklists", json=cl_payload)
        assert r.status_code == 201, f"Create checklist failed: {r.text}"
        cl = r.json()
        cl_id = cl["id"]
        print(f"  [OK] Created checklist: {cl['title']}")

        # ── 2. Add 3 checklist items ────────────────────────────────────────
        items_data = [
            {"sequence": 1, "description": "Reinforcement cover check", "acceptable_criteria": "Cover >= 40mm", "is_mandatory": True},
            {"sequence": 2, "description": "Shuttering alignment", "acceptable_criteria": "Plumb within 5mm", "is_mandatory": True},
            {"sequence": 3, "description": "Cube mould cleanliness", "acceptable_criteria": "Clean, no old concrete", "is_mandatory": False},
        ]
        item_ids = []
        for item in items_data:
            r = s.post(f"{BASE}/quality/checklists/{cl_id}/items", json=item)
            assert r.status_code == 201, f"Add item failed: {r.text}"
            item_ids.append(r.json()["id"])
        print(f"  [OK] Added 3 checklist items")

        # Verify list
        r = s.get(f"{BASE}/quality/checklists/{cl_id}/items")
        assert r.status_code == 200
        assert len(r.json()) == 3
        print(f"  [OK] Checklist items retrieved (count=3)")

        # ── 3. Start an inspection ──────────────────────────────────────────
        insp_payload = {
            "project_id": project_id,
            "checklist_id": cl_id,
            "zone": "Floor 3 - Grid C-D",
            "inspection_date": "2026-06-26T10:00:00",
            "overall_remarks": "Pre-pour inspection before concreting"
        }
        r = s.post(f"{BASE}/quality/inspections", json=insp_payload)
        assert r.status_code == 201, f"Create inspection failed: {r.text}"
        insp = r.json()
        insp_id = insp["id"]
        assert insp["status"] == "pending"
        print(f"  [OK] Inspection created: {insp['zone']} (status=pending)")

        # ── 4. Submit bulk responses: 2 Pass, 1 Fail -> status = 'partial' ──
        respond_payload = {
            "responses": [
                {"checklist_item_id": item_ids[0], "result": "Pass", "remarks": "Cover verified 45mm"},
                {"checklist_item_id": item_ids[1], "result": "Fail", "remarks": "Shuttering 12mm off plumb — rectify"},
                {"checklist_item_id": item_ids[2], "result": "Pass", "remarks": "Moulds clean"},
            ]
        }
        r = s.patch(f"{BASE}/quality/inspections/{insp_id}/respond", json=respond_payload)
        assert r.status_code == 200, f"Submit responses failed: {r.text}"
        insp_updated = r.json()
        assert insp_updated["status"] == "partial", f"Expected partial, got {insp_updated['status']}"
        assert insp_updated["pass_count"] == 2
        assert insp_updated["fail_count"] == 1
        print(f"  [OK] Inspection responded: pass={insp_updated['pass_count']}, fail={insp_updated['fail_count']}, status=partial")

        # ── 5. Raise NCR (Critical, due to shuttering failure) ───────────────
        ncr_payload = {
            "project_id": project_id,
            "inspection_id": insp_id,
            "ncr_number": "NCR-2026-001",
            "title": "Shuttering misalignment >10mm at Floor 3 Grid C-D",
            "description": "Shuttering found 12mm out of plumb, exceeds IS 456 tolerance of 5mm. Pour must not proceed.",
            "severity": "Critical",
        }
        r = s.post(f"{BASE}/quality/ncr", json=ncr_payload)
        assert r.status_code == 201, f"Raise NCR failed: {r.text}"
        ncr = r.json()
        ncr_id = ncr["id"]
        assert ncr["status"] == "open"
        assert ncr["severity"] == "Critical"
        print(f"  [OK] NCR raised: {ncr['ncr_number']} (severity={ncr['severity']}, status=open)")

        # ── 6. Move to under_review ──────────────────────────────────────────
        r = s.patch(f"{BASE}/quality/ncr/{ncr_id}/review")
        assert r.status_code == 200, f"NCR review failed: {r.text}"
        assert r.json()["status"] == "under_review"
        print(f"  [OK] NCR moved to under_review")

        # ── 7. Close with resolution ─────────────────────────────────────────
        r = s.patch(f"{BASE}/quality/ncr/{ncr_id}/close",
                    json={"resolution_notes": "Shuttering corrected and re-verified. Plumb within 3mm. OK to pour."})
        assert r.status_code == 200, f"NCR close failed: {r.text}"
        closed = r.json()
        assert closed["status"] == "closed"
        assert closed["resolution_notes"] is not None
        assert closed["closed_at"] is not None
        print(f"  [OK] NCR closed with resolution notes")

        # ── 8. Log cube test (auto-pass) ─────────────────────────────────────
        cube_payload = {
            "project_id": project_id,
            "test_type": "Cube Test",
            "material": "Concrete M25",
            "sample_ref": "CB-2026-001",
            "test_date": "2026-06-26T15:00:00",
            "result_value": 28.4,   # MPa at 28 days
            "unit": "MPa",
            "min_acceptable": 25.0,
            "max_acceptable": 50.0,
            "zone": "Floor 3 Column C3",
            "remarks": "28-day cube test, 3 samples avg"
        }
        r = s.post(f"{BASE}/quality/material-tests", json=cube_payload)
        assert r.status_code == 201, f"Cube test failed: {r.text}"
        cube = r.json()
        assert cube["is_pass"] is True, f"Cube test should PASS: value={cube['result_value']}, min=25 MPa"
        print(f"  [OK] Cube test logged: {cube['result_value']} MPa -> PASS (min 25 MPa)")

        # ── 9. Log slump test (auto-fail) ────────────────────────────────────
        slump_payload = {
            "project_id": project_id,
            "test_type": "Slump Test",
            "material": "Concrete M25",
            "sample_ref": "SL-2026-001",
            "test_date": "2026-06-26T09:30:00",
            "result_value": 145.0,  # mm (too high)
            "unit": "mm",
            "min_acceptable": 25.0,
            "max_acceptable": 100.0,
            "zone": "Floor 3 Slab pour",
            "remarks": "Slump too high — water-cement ratio too large"
        }
        r = s.post(f"{BASE}/quality/material-tests", json=slump_payload)
        assert r.status_code == 201, f"Slump test failed: {r.text}"
        slump = r.json()
        assert slump["is_pass"] is False, f"Slump test should FAIL: value=145mm, max=100mm"
        print(f"  [OK] Slump test logged: {slump['result_value']} mm -> FAIL (max 100 mm)")

        # ── 10. List all tests ───────────────────────────────────────────────
        r = s.get(f"{BASE}/quality/material-tests/{project_id}")
        assert r.status_code == 200
        tests = r.json()
        assert len(tests) == 2
        print(f"  [OK] Material tests retrieved (count={len(tests)})")

        print()
        print("  QUALITY SUMMARY:")
        print(f"    Checklists:       1 (IS 456 pre-pour, 3 items)")
        print(f"    Inspections:      1 (partial - 2 Pass, 1 Fail)")
        print(f"    NCRs:             1 (Critical -> closed)")
        print(f"    Material Tests:   2 (1 Pass cube, 1 Fail slump)")
        print()
        print("[PASS] All Phase 10 tests passed!")

    finally:
        proc.terminate()
        proc.wait()
        if os.path.exists(DB_FILE):
            for _ in range(5):
                try:
                    os.remove(DB_FILE)
                    break
                except PermissionError:
                    time.sleep(0.5)


if __name__ == "__main__":
    test_phase10()
