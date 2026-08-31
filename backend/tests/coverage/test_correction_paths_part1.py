import uuid
from decimal import Decimal
from datetime import datetime, timezone
import pytest
from app import models

def test_debit_and_credit_note_creation_and_cancellation(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="Notes Test Co", user_name="Notes User")
    hdr = auth_headers(user, comp)
    cid = str(comp.id)

    # Add Subcontractor user and team member
    sub_user = models.User(id=uuid.uuid4(), name="Subcon Vendor", email="subcon@example.com")
    db.add(sub_user)
    db.flush()

    subcon_team = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=comp.id,
        user_id=sub_user.id,
        priority_type="partner",
    )
    db.add(subcon_team)

    # Add Project
    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Notes Test Project",
        status="active",
    )
    db.add(proj)
    db.commit()

    pid = str(proj.id)
    subcon_id = str(subcon_team.id)

    # Add Bill
    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=subcon_team.id,
        invoice_number="INV-2026-001",
        invoice_date=datetime.now(timezone.utc),
        invoice_type="subcon",
        subtotal=Decimal("50000.00"),
        gst_amount=Decimal("9000.00"),
        total_payable=Decimal("59000.00"),
        paid_amount=Decimal("0.00"),
        status="Unpaid",
    )
    db.add(bill)
    db.commit()
    bid = str(bill.id)

    # 1. Create debit note with bill_id, work_amount, gst_amount, total_amount
    create_dn_res = client.post(
        "/apis/v3/billing/debit-notes",
        headers=hdr,
        json={
            "company_id": cid,
            "project_id": pid,
            "party_company_user_id": subcon_id,
            "notes": "Quality penalty deduction",
            "work_amount": 10000.0,
            "gst_amount": 1800.0,
            "total_amount": 11800.0,
            "bill_id": bid,
            "reference_number": "DN-001",
        },
    )
    assert create_dn_res.status_code == 201, create_dn_res.text
    dn_data = create_dn_res.json()
    assert dn_data["bill_id"] == bid
    assert dn_data["work_amount"] == 10000.0
    assert dn_data["gst_amount"] == 1800.0
    assert dn_data["total_amount"] == 11800.0
    assert dn_data["approval_flag"] == "pending"
    dn_id = dn_data["id"]

    # 2. Cancel debit note
    cancel_dn_res = client.post(
        f"/apis/v3/billing/debit-notes/{dn_id}/cancel",
        headers=hdr,
    )
    assert cancel_dn_res.status_code == 200, cancel_dn_res.text
    assert cancel_dn_res.json()["approval_flag"] == "cancelled"

    # 3. Cancelling again returns 409
    cancel_again = client.post(
        f"/apis/v3/billing/debit-notes/{dn_id}/cancel",
        headers=hdr,
    )
    assert cancel_again.status_code == 409

    # 4. Create credit note with bill_id, total_amount
    create_cn_res = client.post(
        "/apis/v3/billing/credit-notes",
        headers=hdr,
        json={
            "company_id": cid,
            "project_id": pid,
            "party_company_user_id": subcon_id,
            "notes": "Extra rate escalation credit",
            "total_amount": 5000.0,
            "bill_id": bid,
            "reference_number": "CN-001",
        },
    )
    assert create_cn_res.status_code == 201, create_cn_res.text
    cn_data = create_cn_res.json()
    assert cn_data["bill_id"] == bid
    assert cn_data["total_amount"] == 5000.0
    assert cn_data["approval_flag"] == "pending"
    cn_id = cn_data["id"]

    # 5. Cancel credit note
    cancel_cn_res = client.post(
        f"/apis/v3/billing/credit-notes/{cn_id}/cancel",
        headers=hdr,
    )
    assert cancel_cn_res.status_code == 200, cancel_cn_res.text
    assert cancel_cn_res.json()["approval_flag"] == "cancelled"

    # 6. Cancelling again returns 409
    cancel_cn_again = client.post(
        f"/apis/v3/billing/credit-notes/{cn_id}/cancel",
        headers=hdr,
    )
    assert cancel_cn_again.status_code == 409
