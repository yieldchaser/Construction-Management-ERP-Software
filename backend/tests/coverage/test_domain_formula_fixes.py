"""Regression tests for PROMPT_9 (Theme E) domain/formula fixes:
E1 billing TDS/Retention on GST-exclusive base, E2 payroll approved-leave days,
E3 leave FK + name collision, E4 BI budget-variance crash + labour/equipment,
E5 analytics completed_area fallback removed, E6 analytics on-time definition,
E7 Tally durable per-company voucher sequence.

NOTE: the coverage suite shares one session-scoped SQLite DB; users.email /
users.mobile are UNIQUE, so every tenant identity is suffixed with a per-module
random tag to avoid collisions with other test modules.
"""
import datetime
import uuid
from datetime import timezone
from decimal import Decimal

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(tag: int) -> str:
    return f"+9188{_SUFFIX}{tag:02d}"


def _mail(tag: int) -> str:
    return f"dom-{tag}-{_SUFFIX}@test.com"


def _utc(y, m, d, h=0, mi=0):
    return datetime.datetime(y, m, d, h, mi, tzinfo=timezone.utc)


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="Proj", code="PRJ-1", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


# ── E1: TDS computed on GST-exclusive subtotal (both deduction-order paths) ──
def test_bill_tds_on_gst_exclusive_base_both_paths(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="E1", user_name="UE1", mobile=_mob(20), email=_mail(20))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    def make(pre_tax):
        r = client.post(
            "/apis/v3/billing/bills",
            json={
                "company_id": str(comp.id),
                "project_id": str(project.id),
                "party_company_user_id": str(team.id),
                "invoice_number": f"INV-E1-{pre_tax}",
                "invoice_date": "2026-01-01T00:00:00",
                "invoice_type": "purchase",
                "subtotal": 1000.0,
                "gst_pct": 18.0,
                "deductions": [{"deduction_type": "TDS", "percentage": 10.0, "amount": 0.0}],
                "pre_tax_deductions": pre_tax,
            },
            headers=hdr,
        )
        assert r.status_code == 201, r.text
        return r.json()

    # Post-Tax presentation (pre_tax_deductions=False): TDS on 1000 = 100,
    # GST on 1000 = 180, total = 1000 - 100 + 180 = 1080.
    r_false = make(False)
    tds_false = r_false["deductions"][0]["amount"]
    assert tds_false == 100.0, tds_false
    assert r_false["gst_amount"] == 180.0
    assert r_false["total_payable"] == 1080.0

    # Pre-Tax presentation (pre_tax_deductions=True): TDS on 1000 = 100 (same
    # GST-exclusive base), GST on (1000 - 100) = 162, total = 1062.
    r_true = make(True)
    tds_true = r_true["deductions"][0]["amount"]
    assert tds_true == 100.0, tds_true
    assert r_true["gst_amount"] == 162.0
    assert r_true["total_payable"] == 1062.0


# ── E2: payroll adds approved paid-leave days to days_present ───────────────
def test_payroll_includes_approved_leave_days(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="E2", user_name="UE2", mobile=_mob(21), email=_mail(21))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, name="Emp E2",
        status="active", basic_salary=1000.0, hra=0.0, other_allowances=0.0,
        pf_employee_pct=0.0, pf_employer_pct=0.0, esi_employee_pct=0.0,
        esi_employer_pct=0.0, tds_monthly=0.0, is_esi_applicable=False,
    )
    db.add(emp)
    db.commit()

    for d in (3, 8):
        db.add(models.AttendanceLog(
            id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
            attendance_date=_utc(2026, 1, d, 9), status="Present",
        ))
    db.add(models.LeaveRequest(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, employee_id=emp.id,
        employee_name=emp.name, leave_type="Casual", start_date=_utc(2026, 1, 10),
        end_date=_utc(2026, 1, 15), days_count=3.0, status="Approved",
    ))
    db.commit()

    r = client.post(
        "/apis/v3/hr/payroll/run",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "payroll_month": "2026-01", "days_in_month": 30,
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    slip = next(p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id))
    # 2 real punches + 3 approved paid-leave days = 5.
    assert slip["days_present"] == 5.0


# ── E3: same-name employees no longer merge leave once employee_id is set ────
def test_leave_balances_fk_path_not_merged(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="E3a", user_name="UE3a", mobile=_mob(22), email=_mail(22))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    e1 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
                              name="Same Name", status="active")
    e2 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
                              name="Same Name", status="active")
    db.add_all([e1, e2])
    db.commit()

    db.add(models.LeaveRequest(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, employee_id=e1.id,
        employee_name="Same Name", leave_type="Casual", start_date=_utc(2026, 1, 1),
        end_date=_utc(2026, 1, 2), days_count=2.0, status="Approved"))
    db.add(models.LeaveRequest(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, employee_id=e2.id,
        employee_name="Same Name", leave_type="Casual", start_date=_utc(2026, 1, 1),
        end_date=_utc(2026, 1, 2), days_count=5.0, status="Approved"))
    db.commit()

    r = client.get(f"/apis/v3/hr/leave-balances/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    by_emp = {str(e["employee_id"]): e for e in r.json()["employees"]}
    assert by_emp[str(e1.id)]["casual"]["used"] == 2.0
    assert by_emp[str(e2.id)]["casual"]["used"] == 5.0


def test_leave_balances_legacy_name_fallback(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="E3b", user_name="UE3b", mobile=_mob(23), email=_mail(23))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    e1 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
                              name="Same Name", status="active")
    e2 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
                              name="Same Name", status="active")
    db.add_all([e1, e2])
    db.commit()

    # Legacy rows: employee_id NULL, only employee_name (used before the FK existed).
    db.add(models.LeaveRequest(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, employee_id=None,
        employee_name="Same Name", leave_type="Casual", start_date=_utc(2026, 1, 1),
        end_date=_utc(2026, 1, 2), days_count=2.0, status="Approved"))
    db.add(models.LeaveRequest(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, employee_id=None,
        employee_name="Same Name", leave_type="Casual", start_date=_utc(2026, 1, 1),
        end_date=_utc(2026, 1, 2), days_count=5.0, status="Approved"))
    db.commit()

    r = client.get(f"/apis/v3/hr/leave-balances/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    # Legacy name-fallback: usage still matched by name and therefore merged.
    for e in r.json()["employees"]:
        assert e["casual"]["used"] == 7.0


# ── E4: budget-variance feed no longer 500s; includes labour/equipment ──────
def test_budget_variance_feed_live_with_actuals(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="E4", user_name="UE4", mobile=_mob(24), email=_mail(24))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    db.add(models.ProjectBudget(
        id=uuid.uuid4(), project_id=project.id, material_budget=0, labour_budget=0,
        subcon_budget=0, equipment_budget=0))
    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=user.id, invoice_number="MAT", invoice_date=_utc(2026, 1, 1),
        invoice_type="purchase", subtotal=1000.0, total_payable=1000.0))
    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=user.id, invoice_number="SUB", invoice_date=_utc(2026, 1, 1),
        invoice_type="subcon", subtotal=500.0, total_payable=500.0))

    run = models.PayrollRun(id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
                            payroll_month="2026-01", status="finalized")
    db.add(run)
    db.flush()
    db.add(models.PayrollLineItem(
        id=uuid.uuid4(), payroll_run_id=run.id, employee_id=user.id, days_present=10,
        days_in_month=30, gross_salary=2000.0, basic=0.0, hra=0.0, other_allowances=0.0,
        overtime_amount=0.0, pf_employee=0.0, pf_employer=0.0, esi_employee=0.0,
        esi_employer=0.0, tds=0.0, advance_recovery=0.0, other_deductions=0.0,
        total_deductions=0.0, net_payable=Decimal("2000")))

    eq = models.Equipment(id=uuid.uuid4(), company_id=comp.id, name="Exc", code="X",
                          category="Plant", ownership_type="own", status="active", hourly_rate=10.0)
    db.add(eq)
    db.flush()
    db.add(models.EquipmentDeployment(
        id=uuid.uuid4(), equipment_id=eq.id, project_id=project.id,
        start_date=_utc(2026, 1, 1, 0), end_date=_utc(2026, 1, 1, 10)))
    db.add(models.FuelLog(
        id=uuid.uuid4(), equipment_id=eq.id, project_id=project.id, logged_date=_utc(2026, 1, 1),
        liters=5.0, cost_per_liter=10.0, total_cost=50.0))
    db.commit()

    # Create a BI API key (end-to-end) and call the feed live.
    k = client.post(
        f"/apis/v3/integrations/bi/companies/{comp.id}/keys",
        json={"label": "test"}, headers=hdr)
    assert k.status_code == 200, k.text
    raw_key = k.json()["key"]

    r = client.get(
        f"/apis/v3/integrations/bi/feed/{comp.id}/budget-variance?fmt=json",
        headers={"X-API-Key": raw_key})
    assert r.status_code == 200, r.text
    row = r.json()[0]
    assert row["material_actual"] == 1000.0
    assert row["subcon_actual"] == 500.0
    assert row["labour_actual"] == 2000.0
    assert row["equipment_actual"] == 150.0  # 10h * 10 + 50 fuel
    assert row["total_actual"] == 3650.0


# ── E5: analytics completed_area is 0 when nothing is completed ─────────────
def test_analytics_completed_area_zero_with_no_completed_task(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="E5", user_name="UE5", mobile=_mob(25), email=_mail(25))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    boq = models.BOQItem(id=uuid.uuid4(), project_id=project.id, section_name="S",
                         item_name="Area", unit="m2", quantity=100.0)
    db.add(boq)
    db.flush()
    db.add(models.Task(
        id=uuid.uuid4(), project_id=project.id, name="T", status="in_progress",
        duration_days=5, start_date=_utc(2026, 1, 1), end_date=_utc(2026, 1, 10),
        boq_item_id=boq.id))
    db.commit()

    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json()["labour_productivity"]["completed_area_m2"] == 0.0


# ── E6: on-time only counts paid bills with a real due date ─────────────────
def test_analytics_on_time_only_paid_with_due_date(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="E6", user_name="UE6", mobile=_mob(26), email=_mail(26))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    db.add(models.WorkOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        subcontractor_id=team.id, wo_number="WO1", wo_date=_utc(2026, 1, 1), status="active"))

    base = dict(company_id=comp.id, project_id=project.id, party_company_user_id=team.id,
                invoice_type="subcon", subtotal=100.0, total_payable=100.0)
    bills = [
        # Paid, due in future -> on-time
        models.Bill(id=uuid.uuid4(), invoice_number="B1", invoice_date=_utc(2026, 1, 1),
                    status="Paid", due_date=_utc(2026, 12, 31), **base),
        # Paid, due in past -> late
        models.Bill(id=uuid.uuid4(), invoice_number="B2", invoice_date=_utc(2026, 1, 1),
                    status="Paid", due_date=_utc(2026, 1, 1), **base),
        # Unpaid, due in future -> excluded from denominator
        models.Bill(id=uuid.uuid4(), invoice_number="B3", invoice_date=_utc(2026, 1, 1),
                    status="Unpaid", due_date=_utc(2026, 12, 31), **base),
        # Paid, no due date -> excluded from denominator
        models.Bill(id=uuid.uuid4(), invoice_number="B4", invoice_date=_utc(2026, 1, 1),
                    status="Paid", due_date=None, **base),
    ]
    db.add_all(bills)
    db.commit()

    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    sc = next(s for s in r.json()["subcontractor_scorecard"] if s["subcontractor_id"] == str(team.id))
    assert sc["bill_count"] == 4
    assert sc["on_time_rate"] == 50.0  # 1 on-time of 2 in-scope (paid + due date)
    assert sc["late_bills"] == 1


# ── E7: Tally voucher numbers never repeat across partial syncs ─────────────
def test_tally_voucher_sequence_durable(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="E7", user_name="UE7", mobile=_mob(27), email=_mail(27))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    conn = models.TallyConnection(
        id=uuid.uuid4(), company_id=comp.id, tally_company_name="E7 Co",
        registered_mobile="9999999999", sync_window_start_date=_utc(2025, 1, 1),
        voucher_number_template="ONS-{year}-{number}")
    db.add(conn)
    db.commit()

    def add_bill(n):
        b = models.Bill(
            id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
            party_company_user_id=team.id, invoice_number=n, invoice_date=_utc(2026, 1, 1),
            invoice_type="purchase", subtotal=100.0, total_payable=100.0,
            tally_synced=False)
        db.add(b)
        db.commit()
        return b

    b1, b2, b3 = add_bill("num-101"), add_bill("num-102"), add_bill("num-103")
    db.expire_all()

    def conn_seq():
        db.expire_all()
        return db.query(models.TallyConnection).filter_by(id=conn.id).first().last_voucher_seq

    # First export advances the sequence to 3 (three unsynced bills).
    ex1 = client.get(f"/apis/v3/tally/export?company_id={comp.id}", headers=hdr)
    assert ex1.status_code == 200, ex1.text
    assert conn_seq() == 3

    # /pending is a read-only preview and must NOT consume the sequence.
    for _ in range(3):
        r = client.get(f"/apis/v3/tally/pending?company_id={comp.id}", headers=hdr)
        assert r.status_code == 200, r.text
        assert len(r.json()["vouchers"]) == 3
    assert conn_seq() == 3

    # Mark 2 of the original bills synced, then 2 new bills arrive.
    ms = client.post(
        "/apis/v3/tally/mark-synced",
        json={"bill_ids": [str(b1.id), str(b2.id)], "payment_ids": []}, headers=hdr)
    assert ms.status_code == 200, ms.text
    add_bill("num-104")
    add_bill("num-105")
    db.expire_all()

    # /pending now shows 3 unsynced vouchers (remaining original #3 + 2 new).
    rp = client.get(f"/apis/v3/tally/pending?company_id={comp.id}", headers=hdr)
    assert rp.status_code == 200, rp.text
    assert len(rp.json()["vouchers"]) == 3

    # Second export advances the high-water mark to 6 (3 + 3), so the new
    # vouchers get numbers 4..6 and never repeat the first export's 1..3.
    ex2 = client.get(f"/apis/v3/tally/export?company_id={comp.id}", headers=hdr)
    assert ex2.status_code == 200, ex2.text
    assert conn_seq() == 6


def test_analytics_wastage_suppressed_without_consumption(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="E8", user_name="UE8", mobile=_mob(28), email=_mail(28))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number="PO-1", po_date=_utc(2026, 1, 1), status="received",
        gross_amount=Decimal("100.00"), tax_amount=Decimal("0.00"),
        total_amount=Decimal("100.00"))
    db.add(po)
    db.flush()
    db.add(models.PurchaseOrderItem(
        id=uuid.uuid4(), po_id=po.id, material_name="Cement",
        quantity=Decimal("100"), unit="bags", rate=Decimal("10.00"),
        tax_pct=Decimal("0.00")))
    db.commit()

    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    mw = r.json()["material_wastage"]
    assert mw["ordered_qty"] == 100.0
    assert mw["consumed_qty"] == 0.0
    assert mw["wastage_pct"] is None
    assert mw["wastage_qty"] == 0.0


def test_project_progress_reads_task_progress(client, db, make_tenant, auth_headers, monkeypatch):
    comp, user, _ = make_tenant(company_name="E9a", user_name="UE9a", mobile=_mob(29), email=_mail(29))
    hdr = auth_headers(user, comp)
    p1 = _mk_project(db, comp)

    db.add(models.Task(
        id=uuid.uuid4(), project_id=p1.id, name="T1", status="not_started",
        duration_days=10, progress=Decimal("75"),
        start_date=_utc(2026, 1, 1), end_date=_utc(2026, 1, 11)))
    db.commit()

    r = client.get(f"/apis/v3/projects/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    by_id = {str(p["id"]): p for p in r.json()}
    assert by_id[str(p1.id)]["progress"] == 75.0

    import types
    from app.routers import projects as projects_mod
    class _StubTask:
        def __init__(self, duration_days, progress, status):
            self.duration_days = duration_days
            self.progress = progress
            self.status = status
    stub_db = types.SimpleNamespace(query=lambda m: types.SimpleNamespace(
        filter=lambda *a, **k: types.SimpleNamespace(
            all=lambda: [_StubTask(10, None, "completed")])))
    assert projects_mod._project_progress(stub_db, p1.id) == 100.0


def test_analytics_spend_excludes_sales(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="E10", user_name="UE10", mobile=_mob(31), email=_mail(31))
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    base = dict(company_id=comp.id, project_id=project.id, party_company_user_id=user.id,
                invoice_date=_utc(2026, 1, 1))
    db.add_all([
        models.Bill(id=uuid.uuid4(), invoice_number="SALE-1", invoice_type="sale",
                    subtotal=Decimal("118000"), total_payable=Decimal("118000"), **base),
        models.Bill(id=uuid.uuid4(), invoice_number="PUR-1", invoice_type="purchase",
                    subtotal=Decimal("23600"), total_payable=Decimal("23600"), **base),
    ])
    db.commit()

    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["projects"][0]["spend"] == 23600.0
    assert data["total_spend"] == 23600.0
    assert data["total_spend"] != 141600.0
    jan_burn = next(b for b in data["budget_burn_series"] if b["label"].startswith("Jan"))
    assert jan_burn["spend"] == 23600.0
    assert jan_burn["spend"] != 141600.0
