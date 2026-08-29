"""Finding R2-764: Cost code library gate sweep across CRM quotations, HR payroll profiles, Library rates, and Finance payments.

Clauses:
1. CRM quotation creation rejects unknown cost codes on quotation items with 422 naming the unknown code.
2. HR payroll profile upsert rejects unknown cost codes with 422 naming the unknown code.
3. Library rate creation rejects unknown cost codes with 422 naming the unknown code.
4. Finance payment creation rejects unknown cost codes / sub cost codes with 422 naming the unknown code.
5. All four write paths succeed when valid cost codes registered in LibraryCostCode are supplied.
"""
import uuid
import datetime
import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"CostCodeGate-{sfx}", user_name=f"UCostCode-{sfx}",
        mobile=f"+9193{sfx}", email=f"costcode-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_r2_764_crm_quotation_cost_code_gate(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    lead = models.CRMLead(
        id=uuid.uuid4(),
        company_id=comp.id,
        lead_type="client",
        contact_name="Apex Developers",
        phone_no=f"+9198{uuid.uuid4().hex[:8]}",
        status="Qualified",
    )
    db.add(lead)
    db.commit()

    # 1. Unknown cost code should fail 422
    payload_bad = {
        "subject": "Main Civil Works",
        "tax_type": "item_level",
        "items": [
            {
                "item_name": "Earthwork excavation",
                "qty": 100.0,
                "unit": "cum",
                "selling_price": 500.0,
                "cost_code": "CIV-EXC-UNKNOWN-99",
            }
        ]
    }
    res = client.post(f"/apis/v3/crm/leads/{lead.id}/quotations", json=payload_bad, headers=hdr)
    assert res.status_code == 422, f"Expected 422, got {res.status_code}: {res.text}"
    assert "CIV-EXC-UNKNOWN-99" in res.text

    # 2. Known cost code should succeed 201
    cc = models.LibraryCostCode(
        id=uuid.uuid4(),
        company_id=comp.id,
        code="CIV-EXC-01",
        name="Earthwork Excavation",
    )
    db.add(cc)
    db.commit()

    payload_good = {
        "subject": "Main Civil Works",
        "tax_type": "item_level",
        "items": [
            {
                "item_name": "Earthwork excavation",
                "qty": 100.0,
                "unit": "cum",
                "selling_price": 500.0,
                "cost_code": "CIV-EXC-01",
            }
        ]
    }
    res = client.post(f"/apis/v3/crm/leads/{lead.id}/quotations", json=payload_good, headers=hdr)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"


def test_r2_764_hr_payroll_profile_cost_code_gate(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    emp = models.StaffEmployee(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Ramesh Kumar",
        designation="Site Engineer",
        mobile=f"+9198{uuid.uuid4().hex[:8]}",
        basic_salary=45000.0,
    )
    db.add(emp)
    db.commit()

    # 1. Unknown cost code should fail 422
    payload_bad = {
        "salary_amount": 45000.0,
        "cost_code": "HR-LAB-UNKNOWN-88",
    }
    res = client.put(f"/apis/v3/hr/payroll-profiles/{emp.id}", json=payload_bad, headers=hdr)
    assert res.status_code == 422, f"Expected 422, got {res.status_code}: {res.text}"
    assert "HR-LAB-UNKNOWN-88" in res.text

    # 2. Known cost code should succeed 200
    cc = models.LibraryCostCode(
        id=uuid.uuid4(),
        company_id=comp.id,
        code="HR-SITE-ENG",
        name="Site Engineering Staff",
    )
    db.add(cc)
    db.commit()

    payload_good = {
        "salary_amount": 45000.0,
        "cost_code": "HR-SITE-ENG",
    }
    res = client.put(f"/apis/v3/hr/payroll-profiles/{emp.id}", json=payload_good, headers=hdr)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"


def test_r2_764_library_rate_cost_code_gate(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    # 1. Unknown cost code should fail 422
    payload_bad = {
        "company_id": str(comp.id),
        "name": "Tile Fixing Labour",
        "unit": "sqft",
        "unit_cost": 45.0,
        "unit_sale_price": 60.0,
        "cost_code": "FIN-TILE-UNKNOWN-77",
    }
    res = client.post("/apis/v3/library/rates", json=payload_bad, headers=hdr)
    assert res.status_code == 422, f"Expected 422, got {res.status_code}: {res.text}"
    assert "FIN-TILE-UNKNOWN-77" in res.text

    # 2. Known cost code should succeed 200
    cc = models.LibraryCostCode(
        id=uuid.uuid4(),
        company_id=comp.id,
        code="FIN-TILE-01",
        name="Tile Fixing Labour Rate",
    )
    db.add(cc)
    db.commit()

    payload_good = {
        "company_id": str(comp.id),
        "name": "Tile Fixing Labour",
        "unit": "sqft",
        "unit_cost": 45.0,
        "unit_sale_price": 60.0,
        "cost_code": "FIN-TILE-01",
    }
    res = client.post("/apis/v3/library/rates", json=payload_good, headers=hdr)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
