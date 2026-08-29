"""Finding R2-762: Work Order response includes real billed_amount and progress_pct excluding cancelled bills.

Clauses:
1. WOResponse includes billed_amount and progress_pct.
2. GET /billing/work-orders computes billed_amount from active (non-cancelled) bills linked by Bill.wo_id.
3. Cancelled bills linked to the work order are excluded from billed_amount and progress_pct.
4. progress_pct accurately reflects billed_amount / estimated_work_amount.
"""
import uuid
import datetime
import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"SubconWO-{sfx}", user_name=f"USubconWO-{sfx}",
        mobile=f"+9194{sfx}", email=f"subconwo-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="SubconWO-Proj",
        code=f"PRJ-SWO-{uuid.uuid4().hex[:6]}", status="Ongoing", state="Karnataka",
    )
    db.add(p)
    db.commit()
    return p


def test_r2_762_work_order_billed_amount_and_progress(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)
    project = _project(db, comp)

    # 1. Create Work Order using the tenant's team member
    wo = models.WorkOrder(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        subcontractor_id=team.id,
        wo_number="WO-2026-001",
        wo_date=datetime.datetime.utcnow(),
        status="approved",
        estimated_work_amount=100000.0,
    )
    db.add(wo)
    db.commit()

    # 2. Create two bills linked to this WO: one active (35,000) and one cancelled (15,000)
    b_active = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=team.id,
        wo_id=wo.id,
        invoice_number="BILL-ACTIVE-01",
        invoice_date=datetime.datetime.utcnow(),
        invoice_type="subcon",
        subtotal=35000.0,
        gst_amount=0.0,
        total_payable=35000.0,
        status="approved",
    )
    b_cancelled = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=team.id,
        wo_id=wo.id,
        invoice_number="BILL-CANCELLED-02",
        invoice_date=datetime.datetime.utcnow(),
        invoice_type="subcon",
        subtotal=15000.0,
        gst_amount=0.0,
        total_payable=15000.0,
        status="Cancelled",
    )
    db.add_all([b_active, b_cancelled])
    db.commit()

    # 4. Fetch work orders
    res = client.get(f"/apis/v3/billing/work-orders?project_id={project.id}", headers=hdr)
    assert res.status_code == 200, res.text
    data = res.json()
    assert len(data) == 1
    wo_data = data[0]

    assert wo_data.get("billed_amount") == 35000.0, f"Expected 35000.0 billed, got {wo_data.get('billed_amount')}"
    assert wo_data.get("progress_pct") == 35.0, f"Expected 35.0% progress, got {wo_data.get('progress_pct')}"
