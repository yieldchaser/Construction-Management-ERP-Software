"""Tier 2 Parity Item 9: Download equipment expense bills as PDF.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P9-{_SUFFIX}",
        user_name="U-P9",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p9-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier2_equipment_expense_pdf(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Metro Station Line 4",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)

    lp = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="JCB Heavy Rentals",
        party_type="Equipment Supplier",
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
    db.flush()

    now = datetime.now(timezone.utc)

    # 1. Create equipment bill
    eq_bill = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=party_team.id,
        invoice_number="EQ-BILL-001",
        invoice_date=now,
        invoice_type="equipment",
        status="Pending",
        subtotal=25000.0,
        gst_amount=4500.0,
        total_payable=29500.0,
        paid_amount=0.0,
        approval_flag="approved",
        created_at=now,
    )
    # 2. Create purchase bill (non-equipment)
    other_bill = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=party_team.id,
        invoice_number="PURCH-001",
        invoice_date=now,
        invoice_type="purchase",
        status="Pending",
        subtotal=5000.0,
        gst_amount=900.0,
        total_payable=5900.0,
        paid_amount=0.0,
        approval_flag="approved",
        created_at=now,
    )
    db.add_all([eq_bill, other_bill])
    db.commit()

    # 3. Test equipment PDF endpoint
    res_pdf = client.get(f"/apis/v3/equipment/expenses/{eq_bill.id}/pdf", headers=hdr)
    assert res_pdf.status_code == 200, res_pdf.text
    assert res_pdf.headers["content-type"] == "application/pdf"
    assert "EQ-BILL-001.pdf" in res_pdf.headers.get("content-disposition", "")
    assert res_pdf.content.startswith(b"%PDF")

    # 4. Test 404 on non-existent bill
    res_404 = client.get(f"/apis/v3/equipment/expenses/{uuid.uuid4()}/pdf", headers=hdr)
    assert res_404.status_code == 404

    # 5. Test 400 on non-equipment bill
    res_400 = client.get(f"/apis/v3/equipment/expenses/{other_bill.id}/pdf", headers=hdr)
    assert res_400.status_code == 400
    assert "not an equipment expense" in res_400.text
