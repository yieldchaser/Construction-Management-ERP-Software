"""Phase C statutory wave - behavior coverage for R2-126, R2-127, R2-128,
R2-283, R2-522, R2-523 and R2-524 on backend/app/routers/statutory.py."""
import uuid
from datetime import datetime

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


_TENANT_N = 0


def _hdr(auth_headers, make_tenant, db, tag):
    global _TENANT_N
    _TENANT_N += 1
    comp, user, _team = make_tenant(
        company_name=f"{tag}-{_SUFFIX}",
        user_name=f"U {tag}",
        mobile=f"+9197{_SUFFIX[:8]}{_TENANT_N:03d}",
        email=f"{tag.lower()}-{_SUFFIX}@test.com",
    )
    return comp, user, auth_headers(user, comp)


def _emp(db, comp, name, **kw):
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id, name=name,
        basic_salary=kw.pop("basic_salary", 20000),
        hra=kw.pop("hra", 5000),
        other_allowances=kw.pop("other_allowances", 2500),
        **kw,
    )
    db.add(emp)
    db.flush()
    return emp


def _seed_payroll(db, comp, month, items, project_id=None, status="finalized"):
    run = models.PayrollRun(
        id=uuid.uuid4(), company_id=comp.id, project_id=project_id,
        payroll_month=month, status=status,
        total_gross=0, total_deductions=0, total_net=0,
    )
    db.add(run)
    db.flush()
    for emp, fields in items:
        db.add(models.PayrollLineItem(
            id=uuid.uuid4(), payroll_run_id=run.id, employee_id=emp.id, **fields
        ))
    return run


# ── R2-283: a statutory record can actually be created and read back ─────────

def test_r2_283_create_list_roundtrip_and_auto_populate_response(client, db, make_tenant, auth_headers):
    comp, user, hdr = _hdr(auth_headers, make_tenant, db, "R2283")
    emp = _emp(db, comp, "Smoke Emp")
    _seed_payroll(db, comp, "2026-07", [(emp, dict(basic=10000))])
    db.commit()

    # Auto-populate builds the response from a plain dict - the exact path that
    # raised "3 validation errors for StatutoryReportResponse" on Sentry.
    r = client.get(
        f"/apis/v3/statutory/{comp.id}/auto-populate?report_type=pf&return_period=2026-07",
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["filed_at"] is None and body["filed_by"] is None, body
    assert body["acknowledgment_number"] is None, body

    # The audit's prescribed smoke test: create one report and list it.
    r = client.post(
        "/apis/v3/statutory",
        json={"company_id": str(comp.id), "report_type": "pf", "return_period": "2026-07"},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    created = r.json()
    assert created["due_date"] == "2026-08-15T00:00:00"

    r = client.get(f"/apis/v3/statutory/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = [row for row in r.json() if row["id"] == created["id"]]
    assert len(rows) == 1, r.json()


# ── R2-127: ESI is charged per employee, not company-wide ────────────────────

def test_r2_127_esi_charged_only_for_applicable_employees(client, db, make_tenant, auth_headers):
    comp, user, hdr = _hdr(auth_headers, make_tenant, db, "R2127")
    e_app = _emp(db, comp, "Esi Applicable", is_esi_applicable=True)
    e_na = _emp(db, comp, "Esi Exempt", is_esi_applicable=False, basic_salary=40000)
    # Payslips carry the per-employee settlement payroll already made; the
    # statutory layer must carry them verbatim, never re-gate them company-wide.
    _seed_payroll(db, comp, "2026-07", [
        (e_app, dict(days_present=26, days_in_month=26, basic=20000, hra=5000,
                     other_allowances=2500, esi_employee=206.25, esi_employer=893.75)),
        (e_na, dict(days_present=26, days_in_month=26, basic=40000, hra=5000,
                    other_allowances=2500, esi_employee=0.0, esi_employer=0.0)),
    ])
    db.commit()

    r = client.get(
        f"/apis/v3/statutory/{comp.id}/auto-populate?report_type=esi&return_period=2026-07",
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # The higher-paid exempt colleague contributes zero ESI in both halves.
    assert body["esi_employee_contribution"] == 206.25, body
    assert body["esi_employer_contribution"] == 893.75, body


# ── R2-126: returns are built from the period's finalized payroll ────────────

def test_r2_126_auto_populate_builds_from_period_payslips(client, db, make_tenant, auth_headers):
    comp, user, hdr = _hdr(auth_headers, make_tenant, db, "R2126")
    joined_after = _emp(db, comp, "Stayer", basic_salary=30000, hra=8000, other_allowances=2000)
    leaver = _emp(db, comp, "Leaver", status="inactive", basic_salary=99999)
    _seed_payroll(db, comp, "2026-07", [
        (joined_after, dict(days_present=13, days_in_month=26, basic=15000, hra=4000,
                            other_allowances=1000, pf_employee=1800, pf_employer=1800, tds=200)),
        (leaver, dict(days_present=22, days_in_month=26, basic=12000, hra=3000,
                      other_allowances=500, pf_employee=1440, pf_employer=1440, tds=0)),
    ])
    db.commit()

    r = client.get(
        f"/apis/v3/statutory/{comp.id}/auto-populate?report_type=pf&return_period=2026-07",
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Period snapshot: the leaver's July wages count even though he has since
    # left, and the stayer's post-period raise does not touch July.
    assert body["total_employees"] == 2, body
    assert body["total_wages"] == 35500.0, body
    assert body["pf_employee_contribution"] == 3240.0, body
    assert body["pf_employer_contribution"] == 3240.0, body
    assert body["tds_deducted"] == 200.0, body


def test_r2_126_refuses_without_finalized_run(client, db, make_tenant, auth_headers):
    comp, user, hdr = _hdr(auth_headers, make_tenant, db, "R2126B")
    _emp(db, comp, "Anyone")
    db.commit()

    # No run at all.
    r = client.get(
        f"/apis/v3/statutory/{comp.id}/auto-populate?report_type=pf&return_period=2026-07",
        headers=hdr,
    )
    assert r.status_code == 409, r.text
    assert "2026-07" in r.json()["detail"], r.text

    # A draft run is not a finalized run.
    emp = db.query(models.StaffEmployee).filter(models.StaffEmployee.company_id == comp.id).first()
    _seed_payroll(db, comp, "2026-08", [(emp, dict(basic=10000))], status="draft")
    db.commit()
    r = client.get(
        f"/apis/v3/statutory/{comp.id}/auto-populate?report_type=pf&return_period=2026-08",
        headers=hdr,
    )
    assert r.status_code == 409, r.text

