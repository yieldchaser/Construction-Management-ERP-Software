"""Tier 3 Parity Item 12: Auto-generated document numbers across bills, notes, and returns.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P12-{_SUFFIX}",
        user_name="U-P12",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p12-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier3_auto_generated_document_numbers(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Metro Tower 9",
        state="Maharashtra",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)

    lp = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="BuildTech Supplies",
        party_type="Supplier",
    )
    db.add(lp)
    db.flush()

    party_team = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=comp.id,
        user_id=None,
        library_party_id=lp.id,
        priority_type="supplier",
    )
    db.add(party_team)
    db.commit()

    now = datetime.now(timezone.utc)
    current_year = now.year

    # 1. Test next-number endpoint
    res_next = client.get(f"/apis/v3/billing/next-number/{comp.id}?invoice_type=purchase", headers=hdr)
    assert res_next.status_code == 200, res_next.text
    doc_num = res_next.json()["invoice_number"]
    assert doc_num.startswith(f"PUR-{current_year}-")
    assert doc_num.endswith("0001")

    # 2. Test auto-generation when invoice_number is omitted in create_bill
    bill_payload = {
        "company_id": str(comp.id),
        "project_id": str(proj.id),
        "party_company_user_id": str(party_team.id),
        "invoice_number": "",  # Empty -> auto generate
        "invoice_date": now.isoformat(),
        "invoice_type": "purchase",
        "subtotal": 10000.0,
        "gst_pct": 18.0,
    }
    res_b1 = client.post("/apis/v3/billing/bills", json=bill_payload, headers=hdr)
    assert res_b1.status_code == 201, res_b1.text
    b1_data = res_b1.json()
    assert b1_data["invoice_number"] == f"PUR-{current_year}-0001"

    # 3. Create second bill with invoice_number="auto" -> increments to 0002 without collision
    bill_payload2 = {
        "company_id": str(comp.id),
        "project_id": str(proj.id),
        "party_company_user_id": str(party_team.id),
        "invoice_number": "auto",
        "invoice_date": now.isoformat(),
        "invoice_type": "purchase",
        "subtotal": 15000.0,
        "gst_pct": 18.0,
    }
    res_b2 = client.post("/apis/v3/billing/bills", json=bill_payload2, headers=hdr)
    assert res_b2.status_code == 201, res_b2.text
    b2_data = res_b2.json()
    assert b2_data["invoice_number"] == f"PUR-{current_year}-0002"
