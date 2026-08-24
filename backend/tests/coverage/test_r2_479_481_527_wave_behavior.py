"""Wave H-highs behavior tests - R2-479 / R2-481 / R2-527.

R2-479 (report-only closure): the finding's own scenario was a published
two-level Rs 5-lakh Purchase Order chain that gated nothing. The shared
engine in app/approvals.py now enforces exactly that chain end to end:
creation holds the PO at pending_approval until BOTH configured approvers
sign, an unconfigured actor gets 403, one person cannot rubber-stamp both
levels, and out-of-range amounts stay ungated as before. The remaining inert
approval categories are CD-1 (open founder decision: wire them or cut the
list), so this row closes report-only with the mechanism pinned here.

R2-481: payroll's denominator is resolved server-side from the real calendar
length of payroll_month minus the company's configured weekly_off_days when
the client omits days_in_month (the old silent default of 26 is gone). An
explicit value stays honored, and R2-354's pro-rata clamp still caps gross at
one full month no matter what denominator is in play.

R2-527: leave balances merge the id-keyed bucket with the legacy name-matched
(NULL-id) bucket instead of consuming them either/or, POST /hr/leaves now
requires employee_id, and pending leaves never count.
"""
import datetime
import uuid

from app import models
from app.routers.hr import _compute_payslip


def _sfx():
    return uuid.uuid4().hex[:8]


# ─── R2-481: server-derived payroll denominator ──────────────────────────────


def _payroll_tenant(db, make_tenant, auth_headers, weekly_off_days):
    sfx = _sfx()
    comp, user, _team = make_tenant(
        company_name=f"W481-{sfx}", user_name=f"U{sfx}",
        email=f"w481-{sfx}@test.com",
    )
    if weekly_off_days is not None:
        comp.weekly_off_days = weekly_off_days
        db.commit()
    emp = models.StaffEmployee(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"Emp-{sfx}", status="active",
        basic_salary=22000, hra=0, other_allowances=0,
        pf_employee_pct=0, pf_employer_pct=0,
        esi_employee_pct=0, esi_employer_pct=0,
        tds_monthly=0, is_esi_applicable=False,
        date_of_joining=datetime.datetime(2025, 1, 1, tzinfo=datetime.timezone.utc),
    )
    db.add(emp)
    db.commit()
    return comp, auth_headers(user, comp), emp


def _run_payroll(client, comp, hdr, month="2026-09", extra=None):
    body = {"company_id": str(comp.id), "payroll_month": month}
    if extra:
        body.update(extra)
    return client.post("/apis/v3/hr/payroll/run", json=body, headers=hdr)


def test_denominator_derives_working_days_from_weekly_offs(client, db, make_tenant, auth_headers):
    # Sept 2026 has 30 days; Sundays 6/13/20/27 and Saturdays 5/12/19/26 are
    # off -> 22 working days replace the old constant default of 26.
    comp, hdr, emp = _payroll_tenant(db, make_tenant, auth_headers, ["Sunday", "Saturday"])

    r = _run_payroll(client, comp, hdr)
    assert r.status_code == 201, r.text
    slip = r.json()["payslips"][0]
    assert slip["days_in_month"] == 22, r.text
    # Zero attendance keeps the D2 full-period fallback basis, but that basis
    # is now the honest derived denominator, not a magic 26.
    assert slip["days_present"] == 22.0, r.text
    assert slip["gross_salary"] == 22000.0, r.text


def test_no_weekly_offs_configured_uses_real_month_length(client, db, make_tenant, auth_headers):
    comp, hdr, _emp = _payroll_tenant(db, make_tenant, auth_headers, [])

    r = _run_payroll(client, comp, hdr)
    assert r.status_code == 201, r.text
    slip = r.json()["payslips"][0]
    assert slip["days_in_month"] == 30, r.text


def test_legacy_abbreviated_day_names_normalize(client, db, make_tenant, auth_headers):
    comp, hdr, _emp = _payroll_tenant(db, make_tenant, auth_headers, ["Sun", "Sat"])

    r = _run_payroll(client, comp, hdr)
    assert r.status_code == 201, r.text
    assert r.json()["payslips"][0]["days_in_month"] == 22, r.text


def test_explicit_days_in_month_still_wins(client, db, make_tenant, auth_headers):
    comp, hdr, _emp = _payroll_tenant(db, make_tenant, auth_headers, ["Sunday", "Saturday"])

    r = _run_payroll(client, comp, hdr, extra={"days_in_month": 26})
    assert r.status_code == 201, r.text
    assert r.json()["payslips"][0]["days_in_month"] == 26, r.text


def test_r2354_clamp_holds_over_derived_denominator():
    emp = models.StaffEmployee(
        id=uuid.uuid4(), basic_salary=1000, hra=0, other_allowances=0,
        pf_employee_pct=0, pf_employer_pct=0,
        esi_employee_pct=0, esi_employer_pct=0,
        tds_monthly=0, is_esi_applicable=False,
    )
    c = _compute_payslip(emp, days_present=40.0, days_in_month=22, overtime_hours=0)
    assert c["gross_salary"] == 1000.0
    assert c["days_in_month"] == 22


# ─── R2-479: the published PO chain actually gates (report-only closure) ─────


def _project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P{tag}-{_sfx()}", code=f"PRJ-{_sfx()}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _member(db, comp, email):
    u = models.User(id=uuid.uuid4(), name=email.split("@")[0], email=email)
    db.add(u)
    db.flush()
    db.add(models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=u.id, priority_type="partner",
    ))
    db.commit()
    return u


def _create_po(client, comp, project, hdr, rate, tag):
    r = client.post(
        "/apis/v3/procurement/pos",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "po_number": f"PO-R479-{tag}-{_sfx()}",
            "po_date": datetime.datetime.now().isoformat(),
            "items": [{"material_name": "Steel", "quantity": 100, "unit": "kg",
                       "rate": rate, "tax_pct": 0}],
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_two_level_po_rule_chain_gates_creation_and_approval(client, db, make_tenant, auth_headers):
    sfx = _sfx()
    comp, owner, _team = make_tenant(
        company_name=f"W479-{sfx}", user_name=f"O{sfx}",
        email=f"owner-{sfx}@t.com",
    )
    hdr_owner = auth_headers(owner, comp)
    lvl1_email = f"lvl1-{sfx}@t.com"
    lvl2_email = f"lvl2-{sfx}@t.com"
    u1 = _member(db, comp, lvl1_email)
    u2 = _member(db, comp, lvl2_email)
    outsider = _member(db, comp, f"out-{sfx}@t.com")
    project = _project(db, comp, "A")

    # The finding's own example: a two-level chain for ~Rs 5 lakh purchase orders.
    db.add(models.ApprovalRule(
        company_id=comp.id, feature_type="Purchase Order",
        min_amount=400000.0, max_amount=600000.0, levels=2,
        approvers=f"{lvl1_email}, {lvl2_email}",
    ))
    db.commit()

    po = _create_po(client, comp, project, hdr_owner, rate=5000, tag="gated")  # 500000 total
    assert po["approval_flag"] == "pending_approval", po
    assert po["approvals_required"] == 2, po
    assert po["approval_rule_id"], po

    def _approve(hdr, po_id):
        return client.post(f"/apis/v3/procurement/pos/{po_id}/approve", headers=hdr)

    r = _approve(auth_headers(u1, comp), po["id"])
    assert r.status_code == 200, r.text
    assert r.json()["approval_flag"] == "pending_approval", r.text
    assert r.json()["approvals_completed"] == 1, r.text

    # One person cannot rubber-stamp both levels of the chain.
    r = _approve(auth_headers(u1, comp), po["id"])
    assert r.status_code == 400, r.text
    assert "already recorded" in r.json()["detail"], r.text

    # An actor outside the configured approvers list can never sign.
    r = _approve(auth_headers(outsider, comp), po["id"])
    assert r.status_code == 403, r.text
    assert "not a configured approver" in r.json()["detail"], r.text

    # Second configured level completes the chain; the PO finalizes forward.
    r = _approve(auth_headers(u2, comp), po["id"])
    assert r.status_code == 200, r.text
    assert r.json()["approval_flag"] == "approved", r.text
    assert r.json()["status"] == "sent", r.text


def test_po_outside_rule_range_stays_single_approve(client, db, make_tenant, auth_headers):
    sfx = _sfx()
    comp, owner, _team = make_tenant(
        company_name=f"W479b-{sfx}", user_name=f"O{sfx}",
        email=f"owner-{sfx}@t.com",
    )
    hdr = auth_headers(owner, comp)
    _member(db, comp, f"lvl1-{sfx}@t.com")
    project = _project(db, comp, "B")

    db.add(models.ApprovalRule(
        company_id=comp.id, feature_type="Purchase Order",
        min_amount=400000.0, max_amount=600000.0, levels=2,
        approvers=f"lvl1-{sfx}@t.com, lvl2-{sfx}@t.com",
    ))
    db.commit()

    po = _create_po(client, comp, project, hdr, rate=200, tag="small")  # 20000 total
    assert po["approval_flag"] == "pending", po
    assert po["approval_rule_id"] is None, po

    r = client.post(f"/apis/v3/procurement/pos/{po['id']}/approve", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json()["approval_flag"] == "approved", r.text


# ─── R2-527: merged leave buckets + required employee_id ─────────────────────


def _leave_tenant(db, make_tenant, auth_headers):
    sfx = _sfx()
    comp, user, _team = make_tenant(
        company_name=f"W527-{sfx}", user_name=f"U{sfx}",
        email=f"w527-{sfx}@test.com",
    )
    dup = f"Dup Name {sfx}"
    e1 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, name=dup, status="active")
    e2 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, name=dup, status="active")
    e3 = models.StaffEmployee(id=uuid.uuid4(), company_id=comp.id, name=f"Solo {sfx}", status="active")
    db.add_all([e1, e2, e3])
    db.commit()
    return comp, auth_headers(user, comp), e1, e2, e3


def _seed_leave(db, comp, emp_id, name, ltype, days, status):
    db.add(models.LeaveRequest(
        id=uuid.uuid4(), company_id=comp.id, employee_id=emp_id,
        employee_name=name, leave_type=ltype,
        start_date=datetime.datetime(2026, 2, 10),
        end_date=datetime.datetime(2026, 2, 12),
        days_count=days, status=status,
    ))
    db.commit()


def _balances(client, comp, hdr):
    r = client.get(f"/apis/v3/hr/leave-balances/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    return {str(e["employee_id"]): e for e in r.json()["employees"]}


def test_id_keyed_and_legacy_null_rows_merge_per_employee(client, db, make_tenant, auth_headers):
    comp, hdr, e1, e2, e3 = _leave_tenant(db, make_tenant, auth_headers)

    # id-keyed casual leave for e1...
    _seed_leave(db, comp, e1.id, e1.name, "casual", 3.0, "Approved")
    # ...and a legacy NULL-id sick row matching the shared name (lowercase).
    _seed_leave(db, comp, None, e1.name.lower(), "sick", 2.0, "Approved")
    # Pending leave never counts, even when the name matches.
    _seed_leave(db, comp, None, e3.name.lower(), "earned", 5.0, "Pending")

    bal = _balances(client, comp, hdr)
    # e1 holds both kinds: the merge must show casual AND sick (either/or hid
    # the sick half from exactly this employee before the fix).
    assert bal[str(e1.id)]["casual"]["used"] == 3.0, str(bal)
    assert bal[str(e1.id)]["sick"]["used"] == 2.0, str(bal)
    # e2 shares only the name: the ambiguous legacy row still counts there,
    # but nothing fabricated beyond it.
    assert bal[str(e2.id)]["casual"]["used"] == 0.0, str(bal)
    assert bal[str(e2.id)]["sick"]["used"] == 2.0, str(bal)
    # Pending rows count nowhere.
    assert bal[str(e3.id)]["earned"]["used"] == 0.0, str(bal)


def test_leave_create_requires_employee_id_and_counts_by_id(client, db, make_tenant, auth_headers):
    comp, hdr, e1, _e2, e3 = _leave_tenant(db, make_tenant, auth_headers)

    base = {
        "employee_name": e3.name,
        "leave_type": "casual",
        "start_date": "2026-03-02T00:00:00",
        "end_date": "2026-03-03T00:00:00",
        "days_count": 1,
    }

    # Omitting employee_id is a contract violation now (was silently NULL).
    r = client.post(f"/apis/v3/hr/leaves/{comp.id}", json=base, headers=hdr)
    assert r.status_code == 422, r.text

    r = client.post(f"/apis/v3/hr/leaves/{comp.id}", json={**base, "employee_id": str(e3.id)}, headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json()["employee_id"] == str(e3.id), r.text
    leave_id = r.json()["id"]

    r = client.put(f"/apis/v3/hr/leaves/approve/{leave_id}", headers=hdr, json={"status": "Approved"})
    assert r.status_code == 200, r.text

    bal = _balances(client, comp, hdr)
    assert bal[str(e3.id)]["casual"]["used"] == 1.0, str(bal)
