"""RA-bill (subcontractor bill) end-to-end + deduction-ordering tests.

Exercises the real POST /apis/v3/billing/bills engine end-to-end (create ->
deductions -> totals) and the two documented, order-sensitive settings:

   - BillCreateRequest.pre_tax_deductions (GST timing):
       E1 fix: deductions (Retention/TDS) are ALWAYS computed on the
       GST-EXCLUSIVE subtotal. The flag only controls invoice presentation/order;
       GST is added back on top of (subtotal - deductions) in both paths.
  - Company.pretax_deduction_retention (Retention/TDS ordering), applied by
    _sequential_deduction_calc as pretax_order:
      False (default) -> Retention first, TDS on the post-retention base.
      True            -> TDS first, Retention on the post-TDS base.

These assert the REAL documented arithmetic; they do not "fix" the behaviour."""
import datetime
import uuid

import pytest

from app import models


def _project(db, company):
    p = models.Project(
        id=uuid.uuid4(), company_id=company.id, name="BillProj",
        code=uuid.uuid4().hex[:6], status="Ongoing", state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


def _bill_payload(company_id, project_id, party_id, **kw):
    payload = {
        "company_id": str(company_id),
        "project_id": str(project_id),
        "party_company_user_id": str(party_id),
        "invoice_number": "INV-RA1",
        "invoice_date": datetime.datetime.now().isoformat(),
        "invoice_type": "subcon",
        "subtotal": 100000.0,
        "gst_pct": 18.0,
        "deductions": [
            {"deduction_type": "Retention", "amount": 0.0, "percentage": 5.0},
            {"deduction_type": "TDS", "amount": 0.0, "percentage": 10.0},
        ],
    }
    payload.update(kw)
    return payload


def _ded_map(resp):
    return {d["deduction_type"]: float(d["amount"]) for d in resp["deductions"]}


def test_ra_bill_e2e_post_tax_default(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="A", user_name="UA", mobile="+919888740001")
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)

    r = client.post("/apis/v3/billing/bills", json=_bill_payload(comp.id, proj.id, team.id), headers=hdr)
    assert r.status_code == 201, r.text
    body = r.json()
    # E1 fix: deductions (Retention/TDS) are computed on the GST-EXCLUSIVE
    # subtotal, not the gross total. GST (18%) = 18000 is added back on top.
    assert body["gst_amount"] == pytest.approx(18000.0)
    # Retention 5% of subtotal 100000 = 5000; TDS 10% of (100000-5000) = 9500.
    ded = _ded_map(body)
    assert ded["Retention"] == pytest.approx(5000.0)
    assert ded["TDS"] == pytest.approx(9500.0)
    # total = 100000 - 14500 + 18000 = 103500.
    assert body["total_payable"] == pytest.approx(103500.0)


def test_ra_bill_pre_tax_deductions_gst_timing(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="A", user_name="UA", mobile="+919888740002")
    proj = _project(db, comp)
    hdr = auth_headers(user, comp)

    # pre_tax_deductions=True: deductions computed off subtotal first.
    r = client.post(
        "/apis/v3/billing/bills",
        json=_bill_payload(comp.id, proj.id, team.id, pre_tax_deductions=True),
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    # Retention 5% of 100000 = 5000; TDS 10% of (100000-5000)=95000 = 9500.
    ded = _ded_map(body)
    assert ded["Retention"] == pytest.approx(5000.0)
    assert ded["TDS"] == pytest.approx(9500.0)
    # GST on (100000 - 14500) = 15390; total = 100000 - 14500 + 15390 = 100890.
    assert body["gst_amount"] == pytest.approx(15390.0)
    assert body["total_payable"] == pytest.approx(100890.0)


def test_ra_bill_pretax_retention_ordering(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="A", user_name="UA", mobile="+919888740003")
    proj = _project(db, comp)
    # Company setting flips the Retention/TDS ordering (pretax_order=True).
    comp.pretax_deduction_retention = True
    db.commit()
    hdr = auth_headers(user, comp)

    r = client.post("/apis/v3/billing/bills", json=_bill_payload(comp.id, proj.id, team.id), headers=hdr)
    assert r.status_code == 201, r.text
    body = r.json()
    # E1 fix: post-tax path now computes deductions on the GST-EXCLUSIVE
    # subtotal (100000), not the gross. TDS-first ordering (pretax_order=True):
    # TDS 10% of subtotal 100000 = 10000; Retention 5% of (100000-10000)=90000
    # = 4500.
    ded = _ded_map(body)
    assert ded["TDS"] == pytest.approx(10000.0)
    assert ded["Retention"] == pytest.approx(4500.0)
    # GST 18% of subtotal = 18000; total = 100000 - 14500 + 18000 = 103500.
    assert body["total_payable"] == pytest.approx(103500.0)

