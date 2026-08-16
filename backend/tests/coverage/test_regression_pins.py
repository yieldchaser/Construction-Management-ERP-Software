from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
FRONTEND_ROOT = Path(__file__).resolve().parents[3] / "frontend"


def _read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def _read_frontend(rel):
    return (FRONTEND_ROOT / rel).read_text(encoding="utf-8")


def test_pin_R2_096_party_balance_nets_correctly():
    src = _read("app/routers/finance.py")
    assert "advance_paid + to_receive - advance_received - to_pay" in src, "R2-096 balance formula regressed"
    assert 'status = "To Receive"' in src, "R2-096 net-sign status derivation regressed"


def test_pin_R2_054_pr_number_collision_loop():
    src = _read("app/routers/finance.py")
    assert "PaymentRequest.request_no == candidate" in src, "R2-054 PR collision loop regressed"


def test_pin_R2_098_pid_collision_loop():
    src = _read("app/routers/library.py")
    assert "LibraryParty.party_id_custom == candidate" in src, "R2-098 PID collision loop regressed"


def test_pin_R2_035_project_progress_reads_task_progress():
    src = _read("app/routers/projects.py")
    assert "float(t.progress or 0.0) / 100.0" in src, "R2-035 task-progress read regressed"


def test_pin_R2_036_spend_filters_expense_types():
    analytics = _read("app/routers/analytics.py")
    budget = _read("app/routers/budget.py")
    towers = _read("app/routers/towers.py")
    assert analytics.count("Bill.invoice_type.in_(EXPENSE_INVOICE_TYPES)") >= 1, "R2-036 operational spend filter regressed"
    assert analytics.count("bill.invoice_type in EXPENSE_INVOICE_TYPES") >= 2, "R2-036 project/month spend filters regressed"
    assert budget.count("Bill.invoice_type.in_(EXPENSE_INVOICE_TYPES)") >= 2, "R2-036 budget actual filters regressed"
    assert towers.count("Bill.invoice_type.in_(REVENUE_INVOICE_TYPES)") >= 2, "R2-036 towers billed filters regressed"


def test_pin_R2_037_wastage_suppressed_without_consumption():
    src = _read("app/routers/analytics.py")
    assert "has_consumption" in src, "R2-037 wastage suppression regressed"


def test_pin_R2_067_labour_and_equipment_actuals():
    src = _read("app/routers/budget.py")
    assert "PayrollLineItem.net_payable" in src, "R2-067 labour actual regressed"
    assert 'Bill.invoice_type == "equipment"' in src, "R2-067 equipment actual regressed"


def test_pin_R2_029_zoho_duplicate_search_all_contact_types():
    src = _read("app/routers/zoho_books.py")
    assert 'contact_type: Optional[str] = "vendor"' in src, "R2-029 keyword param regressed"
    assert "contact_type=None" in src, "R2-029 unfiltered duplicate search regressed"


def test_pin_R2_106_location_verified_derived_from_geofence():
    src = _read("app/routers/hr.py")
    assert src.count("location_verified=within_geofence") >= 1, "R2-106 punch-in verification regressed"
    assert "log.location_verified = within_geofence" in src, "R2-106 punch-out verification regressed"


def test_pin_R2_031_task_status_derives_from_progress():
    src = _read("app/routers/planning.py")
    assert 'task.status = "ongoing"' in src, "R2-031 ongoing derivation regressed"
    assert 'task.status = "in_progress"' not in src, "R2-031 non-canonical in_progress reintroduced"


def test_pin_R2_044_billing_bucket_gates():
    src = _read("app/routers/billing.py")
    assert src.count("REVENUE_INVOICE_TYPES") >= 2, "R2-044 revenue bucket gate regressed"
    assert src.count("EXPENSE_INVOICE_TYPES") >= 2, "R2-044 expense bucket gate regressed"


def test_pin_R2_011_party_type_allowlist_covers_ui_vocabulary():
    src = _read("app/routers/library.py")
    assert "Investor" in src, "R2-011 Investor party_type regressed"
    assert "Labour Contractor" in src, "R2-011 Labour Contractor party_type regressed"
    assert "Other Vendor" in src, "R2-011 Other Vendor party_type regressed"


def test_pin_R2_003_delete_logs_entity_types():
    src = _read_frontend("src/app/c/[company_id]/d/delete-logs/page.tsx")
    assert '"crm_lead",' in src, "R2-003 crm_lead entity type regressed"
    assert '"workorder",' not in src, "R2-003 dead workorder option reintroduced"


def test_pin_R2_060_no_fabricated_coordinates():
    d = _read_frontend("src/app/c/[company_id]/d/attendance/page.tsx")
    p = _read_frontend("src/app/c/[company_id]/p/[project_id]/attendance/page.tsx")
    for src in (d, p):
        assert "Location unavailable. Punch not recorded" in src, "R2-060 location guard regressed"
        assert "12.9716" not in src, "R2-060 fabricated Bangalore coords reintroduced"
        assert "Metro Geofence Yard" not in src, "R2-060 fabricated geofence label reintroduced"


def test_pin_R2_068_009_no_stock_photos_anywhere():
    hits = [
        str(p)
        for p in FRONTEND_ROOT.rglob("*.tsx")
        if "unsplash" in p.read_text(encoding="utf-8", errors="ignore").lower()
    ]
    assert not hits, f"R2-068/009 unsplash fabrication reintroduced in: {hits}"


def test_pin_R2_040_report_export_never_xlsx():
    src = _read_frontend("src/app/c/[company_id]/reports/[slug]/page.tsx")
    assert ".xlsx" not in src, "R2-040 fake xlsx extension reintroduced"


def test_pin_R2_148_todo_mutations_persist():
    src = _read_frontend("src/app/c/[company_id]/d/todo/page.tsx")
    assert src.count("apis/v3/todos/${") >= 2, "R2-148 todo PUT/DELETE wiring regressed"


def test_pin_R2_149_repeat_settings_removed():
    src = _read_frontend("src/app/c/[company_id]/d/todo/page.tsx")
    assert "isRepeatModalOpen" not in src, "R2-149 repeat modal state reintroduced"
    assert "repeatType" not in src, "R2-149 repeat type state reintroduced"


def test_pin_R2_032_ctc_no_double_count():
    src = _read_frontend("src/app/c/[company_id]/d/hr/page.tsx")
    assert "e.basic * 0.24" not in src, "R2-032 PF double-count formula reintroduced"


def test_pin_R2_168_no_frozen_dates():
    src = _read_frontend("src/app/c/[company_id]/d/hr/page.tsx")
    assert 'useState("2026' not in src, "R2-168 frozen date seed reintroduced"


def test_pin_R2_084_dashboard_status_normalization():
    src = _read_frontend("src/app/c/[company_id]/dashboard/page.tsx")
    assert 'p.status === "On Hold" || p.status === "Onhold"' in src, "R2-084 status normalization regressed"


def test_pin_R2_014_flush_queue_honest_counts():
    d = _read_frontend("src/app/c/[company_id]/d/attendance/page.tsx")
    p = _read_frontend("src/app/c/[company_id]/p/[project_id]/attendance/page.tsx")
    for src in (d, p):
        assert "failed and remain queued" in src, "R2-014 honest flush message regressed"


def test_pin_R2_107_dates_default_to_today():
    src = _read_frontend("src/app/c/[company_id]/d/attendance/page.tsx")
    assert 'useState(new Date().toISOString().split("T")[0])' in src, "R2-107 today default regressed"


def test_pin_R2_107_no_frozen_dates_in_project_attendance():
    src = _read_frontend("src/app/c/[company_id]/p/[project_id]/attendance/page.tsx")
    assert 'useState("2026' not in src, "R2-107 frozen date seed reintroduced in project attendance"


def test_pin_R2_013_details_drawer_controlled():
    src = _read_frontend("src/app/c/[company_id]/d/hr/page.tsx")
    assert "defaultValue" not in src, "R2-013 uncontrolled drawer input reintroduced"


def test_pin_R2_015_quick_add_posts_real_todo():
    src = _read_frontend("src/app/c/[company_id]/d/home/page.tsx")
    assert src.count("/apis/v3/todos/") >= 2, "R2-015 quick-add POST wiring regressed"


def test_pin_R2_062_083_dashboard_no_fabricated_identity():
    src = _read_frontend("src/app/c/[company_id]/dashboard/page.tsx")
    assert "Acme Corp" not in src, "R2-062/083 fabricated customer name reintroduced"
    assert "Siddharth Malhotra" not in src, "R2-062/083 fabricated key person reintroduced"
    assert "fallbackMaterials" not in src, "R2-062 fabricated materials fallback reintroduced"
