import uuid
import datetime
import pytest
from app import models


def test_dpr_material_consumption_e2e_lifecycle(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="DPR E2E Co", user_name="DPR E2E User")
    hdr = auth_headers(user, comp)

    # 1. Create project and seed initial inventory
    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="DPR E2E Project",
        code=f"PRJ-{uuid.uuid4().hex[:4].upper()}",
        status="active",
    )
    db.add(proj)
    db.commit()

    inv = models.WarehouseInventory(
        id=uuid.uuid4(),
        project_id=proj.id,
        material_name="OPC 53 Cement",
        category="Civil",
        on_hand_qty=100.0,
        reserved_qty=0.0,
        unit="bags",
    )
    db.add(inv)
    db.commit()

    # Step 1 initial state: on_hand=100, reserved=0
    assert float(inv.on_hand_qty) == 100.0
    assert float(inv.reserved_qty) == 0.0

    # 2. Create and approve an indent for 40 bags
    indent_res = client.post(
        "/apis/v3/procurement/indents",
        json={
            "company_id": str(comp.id),
            "project_id": str(proj.id),
            "indent_number": f"IND-{uuid.uuid4().hex[:6].upper()}",
            "items": [
                {"material_name": "OPC 53 Cement", "quantity": 40.0, "unit": "bags"}
            ],
        },
        headers=hdr,
    )
    assert indent_res.status_code in (200, 201), indent_res.text
    indent_id = indent_res.json()["id"]

    approve_res = client.post(
        f"/apis/v3/procurement/indents/{indent_id}/approve",
        headers=hdr,
    )
    assert approve_res.status_code in (200, 201), approve_res.text

    db.refresh(inv)
    # After approval: on_hand=100, reserved=40, available=60
    assert float(inv.on_hand_qty) == 100.0
    assert float(inv.reserved_qty) == 40.0

    # 3. Post DPR consuming 25 bags of OPC 53 Cement
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    dpr_res = client.post(
        "/apis/v3/dpr",
        json={
            "project_id": str(proj.id),
            "dpr_date": now_iso,
            "weather": "Clear",
            "executed_qty": 50.0,
            "workers_deployed": 12,
            "materials_consumed": [
                {"material_name": "OPC 53 Cement", "quantity": 25.0, "unit": "bags"}
            ],
            "notes": "Poured foundation concrete",
        },
        headers=hdr,
    )
    assert dpr_res.status_code in (200, 201), dpr_res.text
    dpr_data = dpr_res.json()
    dpr_id = dpr_data["id"]

    # 4. Verify on_hand_qty fell from 100 to 75, and reserved_qty fell from 40 to 15
    db.refresh(inv)
    assert float(inv.on_hand_qty) == 75.0
    assert float(inv.reserved_qty) == 15.0

    # 5. Verify MaterialTransaction row was written
    txns = db.query(models.MaterialTransaction).filter(
        models.MaterialTransaction.project_id == proj.id,
        models.MaterialTransaction.material_name == "OPC 53 Cement",
    ).all()
    assert len(txns) >= 1
    dpr_txn = [t for t in txns if str(t.source_ref_id) == str(dpr_id)]
    assert len(dpr_txn) == 1
    assert float(dpr_txn[0].qty) == 25.0

    # 6. Verify DPR summary reports material_used_today
    summary_res = client.get(
        f"/apis/v3/dpr/summary?project_id={proj.id}",
        headers=hdr,
    )
    assert summary_res.status_code == 200, summary_res.text
    summary_data = summary_res.json()
    assert summary_data.get("material_used_today") == 25.0

    # 7. Delete the DPR and verify reversal
    del_res = client.delete(
        f"/apis/v3/dpr/{dpr_id}",
        headers=hdr,
    )
    assert del_res.status_code in (200, 204), del_res.text

    # Verify inventory is restored: on_hand=100, reserved=40
    db.refresh(inv)
    assert float(inv.on_hand_qty) == 100.0
    assert float(inv.reserved_qty) == 40.0

    # Verify summary after deletion
    summary_del_res = client.get(
        f"/apis/v3/dpr/summary?project_id={proj.id}",
        headers=hdr,
    )
    assert summary_del_res.status_code == 200
    assert summary_del_res.json().get("material_used_today", 0) == 0.0
