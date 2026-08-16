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


def test_pin_R2_027_face_log_has_created_at():
    src = _read("app/models.py")
    assert "created_at = Column(DateTime(timezone=True), default=func.now(), nullable=True)" in src, "R2-027 FaceRecognitionLog created_at regressed"


def test_pin_R2_086_face_page_surfaces_errors():
    src = _read_frontend("src/app/c/[company_id]/d/face-recognition/page.tsx")
    assert "setLoadError" in src, "R2-086 face page error state regressed"


def test_pin_R2_002_no_emoji_in_sidebar():
    sidebar = _read_frontend("src/components/Sidebar.tsx")
    reports = _read_frontend("src/app/c/[company_id]/reports/[slug]/page.tsx")
    for glyph in ("\U0001F4DD", "\u2705", "\U0001F4AC", "\u2B06"):
        assert glyph not in sidebar, f"R2-002 emoji {hex(ord(glyph))} reintroduced in Sidebar"
        assert glyph not in reports, f"R2-002 emoji {hex(ord(glyph))} reintroduced in reports page"


def test_pin_R2_079_no_demo_company_fallback():
    header = _read_frontend("src/components/PageHeader.tsx")
    reports = _read_frontend("src/app/c/[company_id]/reports/page.tsx")
    assert "demo-construction" not in header, "R2-079 demo company fallback reintroduced in PageHeader"
    assert "demo-construction" not in reports, "R2-079 demo company fallback reintroduced in reports dashboard"


def test_pin_R2_104_tally_summary_derived_from_logs():
    src = _read_frontend("src/app/c/[company_id]/d/finance/page.tsx")
    assert "setTallyLastMarked(new Date(Math.max(...markedTimes))" in src, "R2-104 tally summary derivation regressed"


def test_pin_R2_001_material_card_opens_drawer():
    src = _read_frontend("src/app/c/[company_id]/d/home/page.tsx")
    assert "setIsMaterialDrawerOpen(true)" in src, "R2-001 material card drawer affordance regressed"


def test_pin_R2_057_gantt_link_errors_use_server_detail():
    src = _read_frontend("src/app/c/[company_id]/d/planning/gantt/page.tsx")
    assert 'detail.toLowerCase().includes("circular")' in src, "R2-057 gantt link error detail regressed"


def test_pin_R2_070_no_local_only_indent_photo_input():
    src = _read_frontend("src/app/c/[company_id]/d/procurement/page.tsx")
    assert "setPreviewUrl(URL.createObjectURL(file))" not in src, "R2-070 local-only indent photo picker reintroduced"


def test_pin_R2_120_tally_card_and_tab_name():
    src = _read_frontend("src/app/c/[company_id]/settings/page.tsx")
    assert "tally/connections?company_id=" in src, "R2-120 Tally status fetch regressed"
    assert "Payroll Runs tab (HR)" in src, "R2-120 wrong tab name reintroduced"


def test_pin_R2_085_no_internal_phase_labels():
    import re
    src = _read_frontend("src/app/c/[company_id]/analytics/page.tsx")
    assert not re.search(r"PHASE 1[0-9]", src), "R2-085 internal phase label reintroduced on analytics"


def test_pin_R2_045_066_purchase_expense_and_equipment_bills():
    src = _read("app/routers/bi_export.py")
    assert 'Bill.invoice_type.in_(("purchase", "expense"))' in src, "R2-045 purchase/expense BI export filter regressed"
    assert 'Bill.invoice_type == "equipment"' in src, "R2-066 equipment BI export filter regressed"


def test_pin_R2_193_bi_api_key_inactivity_window():
    src = _read("app/routers/bi_export.py")
    assert "total_seconds() > 300" in src, "R2-193 BI API key 5-minute inactivity window regressed"


def test_pin_R2_251_mom_creator_from_session_user():
    src = _read("app/routers/mom.py")
    assert "created_by=current_user.name," in src, "R2-251 MOM created_by no longer derived from session user"


def test_pin_R2_071_wo_terms_uses_inner_text():
    src = _read_frontend("src/app/c/[company_id]/d/finance/page.tsx")
    assert "currentTarget.innerText" in src, "R2-071 WO terms innerText capture regressed"
    assert "currentTarget.innerHTML" not in src, "R2-071 WO terms innerHTML capture reintroduced"


def test_pin_R2_072_unbilled_materials_toggle():
    src = _read_frontend("src/app/c/[company_id]/d/finance/page.tsx")
    assert "setShowUnbilledOnly(!showUnbilledOnly)" in src, "R2-072 Unbilled Materials toolbar toggle regressed"


def test_pin_R2_428_csv_template_has_payment_type_no_sample():
    src = _read_frontend("src/app/c/[company_id]/d/finance/page.tsx")
    assert 'const tpl = "Payment Type' in src, "R2-428 CSV template string regressed"
    tpl_line = next(line for line in src.splitlines() if 'const tpl = "Payment Type' in line)
    assert "Sample" not in tpl_line, "R2-428 CSV template sample filler reintroduced"


def test_pin_R2_298_rfq_compare_metrics():
    src = _read("app/routers/rfq.py")
    assert "is_lowest" in src, "R2-298 RFQ is_lowest metric regressed"
    assert "price_spread" in src, "R2-298 RFQ price_spread metric regressed"
    assert "recommended_vendor_name" in src, "R2-298 RFQ recommended_vendor_name metric regressed"


def test_pin_R2_336_movements_do_not_reclassify_master_category():
    src = _read("app/routers/procurement.py")
    tx_body = src.split("def create_transaction", 1)[1].split("def ", 1)[0]
    assert "inv.category = req.category" not in tx_body, "R2-336 material movement reclassifies inventory master category"


def test_pin_R2_341_po_item_pending_qty_report():
    src = _read("app/routers/reports.py")
    assert '"PO Pending Qty"' in src, "R2-341 PO-item pending qty report regressed"


def test_pin_R2_351_grn_transaction_keeps_po_item_unit():
    src = _read("app/routers/procurement.py")
    assert "unit=po_item.unit" in src, "R2-351 GRN transaction unit derivation regressed"


def test_pin_R2_572_po_requires_at_least_one_item():
    src = _read("app/routers/procurement.py")
    assert "items: List[POCreateItemSchema] = Field(..., min_length=1)" in src, "R2-572 PO min-length items validation regressed"


def test_pin_R2_573_grn_rejects_future_received_date():
    src = _read("app/routers/procurement.py")
    assert "def received_date_not_future(cls, v: datetime) -> datetime:" in src, "R2-573 GRN future received_date validator regressed"
    assert 'raise ValueError("received_date cannot be in the future")' in src, "R2-573 GRN future-date rejection regressed"


def test_pin_R2_136_milestone_type_discriminator_pattern():
    src = _read("app/routers/planning.py")
    assert "pattern=MILESTONE_TYPE_PATTERN" in src, "R2-136 milestone type discriminator pattern regressed"
    assert "pattern=PREDECESSOR_LINK_TYPE_PATTERN" in src, "R2-136 predecessor link type discriminator pattern regressed"


def test_pin_R2_255_task_duration_non_negative():
    src = _read("app/routers/planning.py")
    assert "duration_days: int = Field(..., ge=0)" in src, "R2-255 task duration negative guard regressed"


def test_pin_R2_277_drawing_pin_bounds_and_creator():
    src = _read("app/routers/drawings.py")
    assert src.count("le=9999.99") >= 2, "R2-277 drawing pin coordinate bounds regressed"
    assert "created_by=membership.id" in src, "R2-277 drawing pin creator derivation regressed"


def test_pin_R2_373_indent_approval_guards_and_reject():
    src = _read("app/routers/procurement.py")
    assert 'if indent.status != "pending":' in src, "R2-373 indent approve pending-only guard regressed"
    assert "/indents/{indent_id}/reject" in src, "R2-373 indent reject endpoint regressed"
    models = _read("app/models.py")
    assert 'approved_by = Column(UUID(as_uuid=True), ForeignKey("company_team.id"), nullable=True)' in models, "R2-373 indent approved_by FK regressed"


def test_pin_R2_378_no_dead_transaction_retention_model():
    src = _read("app/models.py")
    assert "class TransactionRetention" not in src, "R2-378 dead TransactionRetention model reintroduced"
    assert "transaction_retentions" not in src, "R2-378 dead transaction_retentions table reintroduced"


def test_pin_R2_411_tally_alter_ledger_with_reference():
    src = _read("app/tally_xml.py")
    assert 'ACTION="Alter"' in src, "R2-411 Tally Alter ledger action regressed"
    assert "<ALTERID>" in src, "R2-411 Tally ALTERID regressed"
    assert "<REFERENCE>" in src, "R2-411 Tally reference tag regressed"


def test_pin_R2_089_project_status_buckets():
    src = _read("app/routers/analytics.py")
    assert 'status_counts["Other"] += 1' in src, "R2-089 Other status bucket regressed"
    assert '"Cancelled": 0' in src, "R2-089 Cancelled status bucket regressed"
    assert '"Planning": 0' in src, "R2-089 Planning status bucket regressed"


def test_pin_R2_309_sentry_release_wired():
    main = _read("app/main.py")
    config = _read("app/config.py")
    assert "release=_app_settings.SENTRY_RELEASE or None" in main, "R2-309 Sentry release wiring regressed"
    assert "SENTRY_RELEASE: str = \"\"" in config, "R2-309 Sentry release setting regressed"


def test_pin_R2_496_three_way_po_amount_formatted_inr():
    src = _read_frontend("src/app/c/[company_id]/d/three-way/page.tsx")
    assert "fmtINR(m.po_amount)" in src, "R2-496 three-way PO amount INR formatting regressed"
    assert "toLocaleString" not in src, "R2-496 toLocaleString fallback reintroduced"


def test_pin_R2_115_no_demo_uuid_in_company_settings():
    src = _read("app/routers/settings.py")
    body = src.split("def get_company_settings", 1)[1]
    assert "e0000000-0000-0000-0000-000000000000" not in body, "R2-115 demo UUID fallback reintroduced in get_company_settings"


def test_pin_R2_290_breakup_and_gstin_validation():
    src = _read("app/routers/settings.py")
    assert "breakup components must sum to 100" in src, "R2-290 breakup sum validation regressed"
    assert 'pattern=r"^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$"' in src, "R2-290 GSTIN pattern validation regressed"


def test_pin_R2_548_settings_literals_and_decimals():
    src = _read("app/routers/settings.py")
    assert 'Literal["Project Level", "Company Level"]' in src, "R2-548 grn_numbering literal regressed"
    assert 'Literal["company", "branch"]' in src, "R2-548 document company display literal regressed"
    assert "Field(None, ge=0, le=4)" in src, "R2-548 decimal places bounds regressed"


def test_pin_R2_129_statutory_due_date_derivation():
    from datetime import datetime
    from app.routers.statutory import calculate_due_date
    assert calculate_due_date("pf", "2026-07") == datetime(2026, 8, 15), "R2-129 PF due date derivation regressed"
    assert calculate_due_date("tds", "2026-06") == datetime(2026, 7, 7), "R2-129 TDS due date derivation regressed"
    assert calculate_due_date("pf", "2026-12") == datetime(2027, 1, 15), "R2-129 year-rollover due date derivation regressed"


def test_pin_R2_130_no_penalty_calculator():
    src = _read("app/routers/statutory.py")
    assert "calculate_penalty" not in src, "R2-130 penalty calculator reintroduced"


def test_pin_R2_505_no_internal_phase_labels_on_production():
    import re
    src = _read_frontend("src/app/c/[company_id]/d/production/page.tsx")
    assert not re.search(r"PHASE 1[0-9]", src), "R2-505 internal phase label reintroduced on production page"


def test_pin_R2_461_cpm_backward_pass_timedeltas():
    src = _read("app/routers/planning.py")
    assert "timedelta(days=request.duration_days - 1)" in src, "R2-461 task end-date timedelta regressed"
    assert "timedelta(days=dur_by_id.get(s, 1))" in src, "R2-461 CPM backward pass timedelta regressed"


def test_pin_R2_566_task_default_and_create_status():
    src = _read("app/routers/planning.py")
    assert 'status: str = "not_started"' in src, "R2-566 task default status regressed"
    assert "status=request.status," in src, "R2-566 task create status wiring regressed"


def test_pin_R2_135_depreciation_method_and_book_value_guards():
    src = _read("app/routers/assets.py")
    assert 'pattern="^(straight_line|wdv)$"' in src, "R2-135 depreciation method pattern regressed"
    assert "accumulated_depreciation must equal the prior accumulated total" in src, "R2-135 accumulated total guard regressed"
    assert "book_value cannot fall below the schedule's salvage_value" in src, "R2-135 book value floor guard regressed"


def test_pin_R2_256_incident_close_audit_and_lost_time_guard():
    src = _read("app/routers/safety.py")
    assert "incident.closed_by = current_user.id" in src, "R2-256 incident close auditor regressed"
    assert "lost_time_days: int = Field(0, ge=0)" in src, "R2-256 lost time days guard regressed"
    assert "reported_at cannot be in the future" in src, "R2-256 future reported_at rejection regressed"
    models = _read("app/models.py")
    assert 'closed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"' in models, "R2-256 incident closed_by FK regressed"


def test_pin_R2_532_safety_create_schemas_typed_ids():
    src = _read("app/routers/safety.py")
    assert src.count("project_id: uuid.UUID") >= 3, "R2-532 safety create schema project_id typing regressed"
    assert "conducted_at: datetime" in src, "R2-532 toolbox talk conducted_at typing regressed"
    assert "check_date: datetime" in src, "R2-532 PPE check check_date typing regressed"
    assert "uuid.UUID(payload" not in src, "R2-532 untyped uuid.UUID(payload coercion reintroduced"


def test_pin_R2_174_txn_party_name_resolves_library_party():
    src = _read("app/routers/finance.py")
    body = src.split("def _txn_party_name", 1)[1].split("def ", 1)[0]
    assert "LibraryParty" in body, "R2-174 _txn_party_name no longer resolves through LibraryParty"


def test_pin_R2_176_upload_content_type_sniffing():
    src = _read("app/routers/files.py")
    assert "ALLOWED_CONTENT_TYPES" in src, "R2-176 upload content-type allowlist regressed"
    assert "_sniff_content_type" in src, "R2-176 upload content-type sniffing regressed"
    assert "download=true" in src, "R2-176 signed URL download param regressed"


def test_pin_R2_489_quality_inspector_options_no_dash_placeholder():
    d = _read_frontend("src/app/c/[company_id]/d/quality/page.tsx")
    p = _read_frontend("src/app/c/[company_id]/p/[project_id]/quality/page.tsx")
    frag = 'filter((name) => name && name !== "\u2014")'
    for src in (d, p):
        assert frag in src, "R2-489 inspector options dash placeholder reintroduced"


def test_pin_R2_227_planning_is_pinned_default():
    src = _read("app/routers/planning.py")
    assert "is_pinned: bool = False" in src, "R2-227 planning is_pinned default regressed"


def test_pin_R2_287_project_party_opening_balance_guards():
    src = _read("app/routers/projects.py")
    assert 'pattern="^(will_pay|will_receive)$"' in src, "R2-287 project party direction pattern regressed"
    assert "opening_balance_amount: Optional[float] = Field(0.0, ge=0)" in src, "R2-287 opening balance negative guard regressed"


def test_pin_R2_492_project_member_company_team_join():
    src = _read("app/routers/projects.py")
    assert "models.ProjectMember.company_team_id == models.CompanyTeam.id" in src, "R2-492 project member company-team join regressed"


def test_pin_R2_370_bill_cancel_audit():
    src = _read("app/routers/billing.py")
    assert '@router.post("/bills/{bill_id}/cancel"' in src, "R2-370 bill cancel endpoint regressed"
    assert "bill.cancelled_at = datetime.now(timezone.utc)" in src, "R2-370 bill cancel audit timestamp regressed"
    models = _read("app/models.py")
    assert "cancelled_at = Column(DateTime(timezone=True), nullable=True)" in models, "R2-370 bill cancelled_at column regressed"
