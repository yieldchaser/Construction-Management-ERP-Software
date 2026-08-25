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
    return emp


# ── R2-283: a statutory record can actually be created and read back ─────────

def test_r2_283_create_list_roundtrip_and_auto_populate_response(client, db, make_tenant, auth_headers):
    comp, user, hdr = _hdr(auth_headers, make_tenant, db, "R2283")

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
    for i in range(3):
        e = _emp(db, comp, f"E{i}", is_esi_applicable=(i == 0))
        if i > 0:
            # Non-applicable colleagues earn more than the applicable one, so
            # the old any()-guarded sum would overstate ESI even harder.
            e.basic_salary = 40000
    db.commit()

    r = client.get(
        f"/apis/v3/statutory/{comp.id}/auto-populate?report_type=esi&return_period=2026-07",
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    # Only E0 (gross 27,500) is ESI-applicable: 0.75% ee / 3.25% er.
    assert body["esi_employee_contribution"] == 206.25, body
    assert body["esi_employer_contribution"] == 893.75, body

