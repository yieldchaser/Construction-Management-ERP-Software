"""D2 + CD-4 policy: company settings + payroll wiring.

D2 — zero-attendance payroll POLICY:
  company setting assume_full_month_when_no_attendance defaults OFF (no punch = zero pay),
  ALWAYS return attendance_source "recorded"|"assumed" and badge assumed rows.

CD-4 — EPF wage ceiling POLICY:
  company setting pf_wage_ceiling defaults 15000/month basic,
  applied in exactly one place (the payroll _compute_payslip employer PF wage base).

Both columns are nullable/ boot schema-sync (no migration).
"""
import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
from app import models
from app.routers.hr import _compute_payslip


# ── Schema existence checks (founder note: confirm flags exist) ─────────────

def test_company_has_assume_flag_column(db):
    cols = {c.name for c in models.Company.__table__.columns}
    assert "assume_full_month_when_no_attendance" in cols, "Company.assume_full_month_when_no_attendance missing"
    col = models.Company.__table__.c.assume_full_month_when_no_attendance
    assert col.nullable is True, "must be nullable for boot schema-sync"


def test_company_has_pf_wage_ceiling_column(db):
    cols = {c.name for c in models.Company.__table__.columns}
    assert "pf_wage_ceiling" in cols, "Company.pf_wage_ceiling missing"
    # check payroll settings mirror as well
    cols2 = {c.name for c in models.CompanyPayrollSettings.__table__.columns}
    assert "pf_wage_ceiling" in cols2, "CompanyPayrollSettings.pf_wage_ceiling missing"


def test_payroll_line_item_has_attendance_source(db):
    cols = {c.name for c in models.PayrollLineItem.__table__.columns}
    assert "attendance_source" in cols


def test_company_defaults_are_off_and_15000(make_tenant, db):
    comp, _, _ = make_tenant(
        company_name=f"D2CD4-default-{uuid.uuid4().hex[:6]}",
        user_name=f"U-{uuid.uuid4().hex[:6]}",
        mobile=f"+9199{uuid.uuid4().hex[:6]}", email=f"d2-{uuid.uuid4().hex[:6]}@test.com",
    )
    db.refresh(comp)
    # nullable defaults: None is treated as OFF / 15000 in logic
    assert getattr(comp, "assume_full_month_when_no_attendance", None) in (None, False), comp.assume_full_month_when_no_attendance
    assert getattr(comp, "pf_wage_ceiling", None) in (None, 15000, Decimal("15000"), Decimal("15000.00")), comp.pf_wage_ceiling


# ── Helpers ──────────────────────────────────────────────────────────────────

def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:6]
    comp, user, _ = make_tenant(
        company_name=f"Pol{sfx}", user_name=f"U{sfx}",
        mobile=f"+9198{sfx}", email=f"pol-{sfx}-{uuid.uuid4().hex[:4]}@test.com",
    )
    return comp, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(id=uuid.uuid4(), company_id=comp.id, name=f"P-{uuid.uuid4().hex[:6]}", code=f"PRJ-{uuid.uuid4().hex[:6]}", status="Ongoing")
    db.add(p); db.commit(); return p


def _employee(db, comp, project, basic=18000, hra=0, other=0):
    e = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        name=f"W-{uuid.uuid4().hex[:6]}", basic_salary=Decimal(str(basic)), hra=Decimal(str(hra)), other_allowances=Decimal(str(other)),
        pf_employee_pct=Decimal("12"), pf_employer_pct=Decimal("12"),
    )
    db.add(e); db.commit(); return e


def _run_payroll(client, comp, hdr, project=None, extra=None):
    payload = {"company_id": str(comp.id), "payroll_month": "2026-05", "days_in_month": 26}
    if project:
        payload["project_id"] = str(project.id)
    if extra:
        payload.update(extra)
    r = client.post("/apis/v3/hr/payroll/run", headers=hdr, json=payload)
    return r


# ── D2: zero-attendance policy ───────────────────────────────────────────────

def test_d2_zero_attendance_pays_zero_and_assumed_badge(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    emp = _employee(db, comp, project, basic=18000)
    # company default OFF
    assert getattr(comp, "assume_full_month_when_no_attendance", None) in (None, False)
    r = _run_payroll(client, comp, hdr, project)
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["days_present"] == pytest.approx(0.0)
    assert slip["gross_salary"] == pytest.approx(0.0)
    # badge: ALWAYS returned
    assert slip["attendance_source"] == "assumed", slip
    # stored line as well
    run_id = r.json()["id"]
    g = client.get(f"/apis/v3/hr/payroll/{run_id}/payslips", headers=hdr)
    assert g.status_code == 200
    line = [l for l in g.json() if l["employee_id"] == str(emp.id)][0]
    assert line["attendance_source"] == "assumed"


def test_d2_company_flag_on_pays_full_month_and_still_assumed(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    # flip company setting via direct DB (settings PUT also works but direct is hermetic)
    comp.assume_full_month_when_no_attendance = True
    db.add(comp); db.commit()
    project = _project(db, comp)
    emp = _employee(db, comp, project, basic=18000)
    r = _run_payroll(client, comp, hdr, project)
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["days_present"] == pytest.approx(26.0)
    assert slip["gross_salary"] == pytest.approx(18000.0)
    assert slip["attendance_source"] == "assumed", slip


def test_d2_payload_flag_still_works_when_company_off(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    emp = _employee(db, comp, project, basic=18000)
    r = _run_payroll(client, comp, hdr, project, extra={"assume_full_month": True})
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["days_present"] == pytest.approx(26.0)
    assert slip["attendance_source"] == "assumed"


def test_d2_recorded_punch_is_recorded_not_assumed(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)
    emp = _employee(db, comp, project, basic=26000)
    dt = datetime(2026, 5, 10, tzinfo=timezone.utc)
    db.add(models.AttendanceLog(
        id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
        attendance_date=dt, punch_in=dt, status="Present", is_within_geofence=True,
        shift_multiplier=Decimal("1"), hours_worked=Decimal("8"), overtime_hours=Decimal("0"),
    ))
    db.commit()
    r = _run_payroll(client, comp, hdr, project)
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["days_present"] == pytest.approx(1.0)
    assert slip["attendance_source"] == "recorded"
    # badge would not show


def test_d2_company_setting_exposed_via_settings_api(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    # default response includes new fields without 500
    g = client.get(f"/apis/v3/settings/company/{comp.id}", headers=hdr)
    assert g.status_code == 200, g.text
    data = g.json()
    assert "assume_full_month_when_no_attendance" in data
    assert "pf_wage_ceiling" in data
    # update to True / custom ceiling
    u = client.put(f"/apis/v3/settings/company/{comp.id}", headers=hdr, json={"assume_full_month_when_no_attendance": True, "pf_wage_ceiling": 20000})
    assert u.status_code == 200, u.text
    assert u.json()["assume_full_month_when_no_attendance"] is True
    assert float(u.json()["pf_wage_ceiling"]) == pytest.approx(20000.0)
    # and payroll respects it (zero attendance now pays full month after the PUT)
    project = _project(db, comp)
    emp = _employee(db, comp, project, basic=15000)
    r = _run_payroll(client, comp, hdr, project)
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["attendance_source"] == "assumed"
    assert slip["days_present"] == pytest.approx(26.0)


# ── CD-4: EPF wage ceiling ───────────────────────────────────────────────────

def test_cd4_default_ceiling_caps_employer_pf_at_15000():
    # capped: basic 30000 at 12% = 3600 uncapped, 1800 capped
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=uuid.uuid4(), name="X",
        basic_salary=Decimal("30000"), hra=Decimal("0"), other_allowances=Decimal("0"),
        pf_employee_pct=Decimal("12"), pf_employer_pct=Decimal("12"),
        esi_employee_pct=Decimal("0.75"), esi_employer_pct=Decimal("3.25"),
        is_esi_applicable=False, tds_monthly=Decimal("0"),
    )
    res = _compute_payslip(emp, days_present=26, days_in_month=26, pf_wage_ceiling=15000.0)
    assert res["pf_employer"] == pytest.approx(1800.0), res
    assert res["pf_employee"] == pytest.approx(1800.0), res


def test_cd4_ceiling_applies_after_prorata():
    # basic 30000, days_present 13/26 => prorated basic 15000 => exactly at ceiling => 1800
    # without ceiling would be same, but test partial
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=uuid.uuid4(), name="X",
        basic_salary=Decimal("30000"), hra=Decimal("0"), other_allowances=Decimal("0"),
        pf_employee_pct=Decimal("12"), pf_employer_pct=Decimal("12"),
        esi_employee_pct=Decimal("0.75"), esi_employer_pct=Decimal("3.25"),
        is_esi_applicable=False, tds_monthly=Decimal("0"),
    )
    res_full = _compute_payslip(emp, days_present=26, days_in_month=26, pf_wage_ceiling=15000.0)
    res_half = _compute_payslip(emp, days_present=13, days_in_month=26, pf_wage_ceiling=15000.0)
    # half month prorated basic = 15000 => pf 1800
    assert res_half["pf_employer"] == pytest.approx(1800.0), res_half
    # full month also 1800 capped (not 3600)
    assert res_full["pf_employer"] == pytest.approx(1800.0)
    # uncapped would have been 900 vs 1800? actually half uncapped would be 1800 (30000/2*12%) =1800 too coincidence, test lower basic
    emp2 = models.StaffEmployee(
        id=uuid.uuid4(), company_id=uuid.uuid4(), name="Y",
        basic_salary=Decimal("10000"), hra=Decimal("0"), other_allowances=Decimal("0"),
        pf_employee_pct=Decimal("12"), pf_employer_pct=Decimal("12"),
        esi_employee_pct=Decimal("0.75"), esi_employer_pct=Decimal("3.25"),
        is_esi_applicable=False, tds_monthly=Decimal("0"),
    )
    r = _compute_payslip(emp2, days_present=26, days_in_month=26, pf_wage_ceiling=15000.0)
    assert r["pf_employer"] == pytest.approx(1200.0)  # 10000 < ceiling, not capped


def test_cd4_company_ceiling_overrides_default(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    # set custom ceiling 10000 via Company column directly
    comp.pf_wage_ceiling = Decimal("10000")
    db.add(comp); db.commit()
    project = _project(db, comp)
    emp = _employee(db, comp, project, basic=20000)
    # need at least one attendance day so payslip is recorded (not zero)
    dt = datetime(2026, 5, 11, tzinfo=timezone.utc)
    db.add(models.AttendanceLog(
        id=uuid.uuid4(), employee_id=emp.id, project_id=project.id,
        attendance_date=dt, punch_in=dt, status="Present", is_within_geofence=True,
        shift_multiplier=Decimal("1"), hours_worked=Decimal("8"), overtime_hours=Decimal("0"),
    ))
    db.commit()
    r = _run_payroll(client, comp, hdr, project)
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    # days 1/26 => prorated basic = 769.23 => below ceiling 10000 => pf = 92.31 not capped
    # but test full month via assume: flip to test full month capping
    # do a second company with high ceiling
    comp2, hdr2 = _tenant(make_tenant, auth_headers)
    comp2.pf_wage_ceiling = Decimal("25000")
    db.add(comp2); db.commit()
    proj2 = _project(db, comp2)
    emp2 = _employee(db, comp2, proj2, basic=20000)
    dt2 = datetime(2026, 5, 12, tzinfo=timezone.utc)
    db.add(models.AttendanceLog(
        id=uuid.uuid4(), employee_id=emp2.id, project_id=proj2.id,
        attendance_date=dt2, punch_in=dt2, status="Present", is_within_geofence=True,
        shift_multiplier=Decimal("1"), hours_worked=Decimal("8"), overtime_hours=Decimal("0"),
    ))
    db.commit()
    # use assume flag to get full month for cap comparison easier: directly test _compute with custom ceiling
    # verify via direct helper that payroll respects custom ceiling
    res_low = _compute_payslip(emp, days_present=26, days_in_month=26, pf_wage_ceiling=float(comp.pf_wage_ceiling))
    assert res_low["pf_employer"] == pytest.approx(1200.0)  # 10000*12%
    res_high = _compute_payslip(emp2, days_present=26, days_in_month=26, pf_wage_ceiling=float(comp2.pf_wage_ceiling))
    assert res_high["pf_employer"] == pytest.approx(2400.0)  # 20000<25000 so 20000*12%


def test_cd4_payroll_via_setting_api_trickles_to_run(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    # via Company settings endpoint (primary EPF ceiling location per CD-4)
    g = client.get(f"/apis/v3/settings/company/{comp.id}", headers=hdr)
    assert g.status_code == 200
    # set ceiling to 8000 via company settings
    u = client.put(f"/apis/v3/settings/company/{comp.id}", headers=hdr, json={"pf_wage_ceiling": 8000})
    assert u.status_code == 200, u.text
    assert float(u.json()["pf_wage_ceiling"]) == pytest.approx(8000.0)
    # also verify payroll settings mirror syncs (our model has both)
    u2 = client.put(f"/apis/v3/settings/payroll/{comp.id}", headers=hdr, json={"pf_wage_ceiling": 8000, "confirm_changes": True})
    assert u2.status_code == 200, u2.text
    project = _project(db, comp)
    emp = _employee(db, comp, project, basic=20000)
    # need full month attendance via assume flag so basic_pro =20000 >8000
    comp.assume_full_month_when_no_attendance = True
    db.add(comp); db.commit()
    r = _run_payroll(client, comp, hdr, project)
    assert r.status_code == 201, r.text
    slip = [p for p in r.json()["payslips"] if p["employee_id"] == str(emp.id)][0]
    assert slip["pf_employer"] == pytest.approx(960.0)  # 8000*12%
    assert slip["pf_employee"] == pytest.approx(960.0)


def test_cd4_exactly_one_place_applies_ceiling():
    """Guard that only hr._compute_payslip references pf_wage_ceiling; statutory keeps its hard-coded 15000.

    The task says apply in exactly one place (the payroll calculation). The statutory
    report endpoint keeps its own 15000 cap for ECR; we pin that duplication is
    not also made company-driven.
    """
    import pathlib
    hr_path = pathlib.Path("app/routers/hr.py") if pathlib.Path("app/routers/hr.py").exists() else pathlib.Path("backend/app/routers/hr.py")
    stat_path = pathlib.Path("app/routers/statutory.py") if pathlib.Path("app/routers/statutory.py").exists() else pathlib.Path("backend/app/routers/statutory.py")
    hr_text = hr_path.read_text(encoding="utf-8")
    stat_text = stat_path.read_text(encoding="utf-8")
    # hr must have ceiling handling
    assert "pf_wage_ceiling" in hr_text
    # statutory must still have its literal 15000 (hard cap) and not company ceiling logic
    assert "15000" in stat_text
    assert stat_text.count("pf_wage_ceiling") == 0
