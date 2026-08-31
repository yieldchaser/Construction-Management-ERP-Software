import uuid
from decimal import Decimal
from datetime import datetime, timezone
import pytest
from app import models

def test_project_avatar_and_source_ref_id_part4(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="Part 4 Test Co", user_name="Part 4 User")
    hdr = auth_headers(user, comp)
    cid = str(comp.id)

    # 1. Test project creation and update with project_avatar
    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Avatar Test Project",
        status="active",
    )
    db.add(proj)
    db.commit()
    pid = str(proj.id)

    update_res = client.put(
        f"/apis/v3/projects/{pid}",
        headers=hdr,
        json={
            "name": "Avatar Test Project Revised",
            "project_avatar": "https://assets.siteflow.ai/avatars/proj_cover_1.png"
        }
    )
    assert update_res.status_code == 200, update_res.text
    assert update_res.json()["project_avatar"] == "https://assets.siteflow.ai/avatars/proj_cover_1.png"

    # Verify in DB
    db.expire_all()
    p_db = db.query(models.Project).filter(models.Project.id == proj.id).first()
    assert p_db.project_avatar == "https://assets.siteflow.ai/avatars/proj_cover_1.png"

    # 2. Test server-side source_ref_id assignment on DPR and GRN
    # GRN path
    po = models.PurchaseOrder(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        po_number="PO-AV-01",
        status="approved",
        approval_flag="approved",
        po_date=datetime.now(timezone.utc),
        total_amount=Decimal("1000.00"),
    )
    db.add(po)
    db.flush()

    po_item = models.PurchaseOrderItem(
        id=uuid.uuid4(),
        po_id=po.id,
        material_name="Steel Rod 12mm",
        unit="Kg",
        quantity=Decimal("50.00"),
        rate=Decimal("70.00"),
        tax_pct=Decimal("18.00"),
        total_amount=Decimal("3500.00"),
    )
    db.add(po_item)
    db.commit()

    grn_res = client.post(
        "/apis/v3/procurement/grns",
        headers=hdr,
        json={
            "company_id": cid,
            "project_id": pid,
            "po_id": str(po.id),
            "received_date": datetime.now(timezone.utc).isoformat(),
            "items": [
                {"po_item_id": str(po_item.id), "received_qty": 20.0}
            ]
        }
    )
    assert grn_res.status_code == 201, grn_res.text
    grn_id = grn_res.json()["id"]

    # Verify MaterialTransaction has source_ref_id set to GRN id
    txns = db.query(models.MaterialTransaction).filter(
        models.MaterialTransaction.project_id == proj.id,
        models.MaterialTransaction.source_ref_id == uuid.UUID(grn_id)
    ).all()
    assert len(txns) == 1
    assert str(txns[0].source_ref_id) == grn_id
