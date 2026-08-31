import uuid
import datetime
import pytest
from app import models


def test_create_po_with_tax_and_expected_delivery_date(client, db, make_tenant, auth_headers):
    """Verify PO creation computes gross, tax, total with per-item tax_pct and stores expected_delivery_date."""
    comp, user, _ = make_tenant(company_name="PO Tax Co", user_name="PO Tax User")
    hdr = auth_headers(user, comp)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="PO Tax Project",
        code=f"PRJ-{uuid.uuid4().hex[:4].upper()}",
        status="active",
    )
    db.add(proj)
    db.commit()

    po_date = datetime.datetime.now(datetime.timezone.utc)
    expected_delivery = po_date + datetime.timedelta(days=7)

    # Item 1: 100 bags @ 350, 18% GST -> gross 35000, tax 6300, total 41300
    # Item 2: 2 tons @ 50000, 12% GST -> gross 100000, tax 12000, total 112000
    # Total Gross: 135000, Total Tax: 18300, Total Amount: 153300
    po_res = client.post(
        "/apis/v3/procurement/pos",
        json={
            "company_id": str(comp.id),
            "project_id": str(proj.id),
            "po_number": f"PO-{uuid.uuid4().hex[:6].upper()}",
            "po_date": po_date.isoformat(),
            "expected_delivery_date": expected_delivery.isoformat(),
            "items": [
                {
                    "material_name": "Cement OPC 53",
                    "quantity": 100.0,
                    "unit": "bags",
                    "rate": 350.0,
                    "tax_pct": 18.0,
                },
                {
                    "material_name": "Structural Steel",
                    "quantity": 2.0,
                    "unit": "tons",
                    "rate": 50000.0,
                    "tax_pct": 12.0,
                },
            ],
            "terms": "Net 30 days payment upon delivery",
        },
        headers=hdr,
    )
    assert po_res.status_code == 201, po_res.text
    po_data = po_res.json()

    assert po_data["gross_amount"] == 135000.0
    assert po_data["tax_amount"] == 18300.0
    assert po_data["total_amount"] == 153300.0
    assert po_data["expected_delivery_date"] is not None

    po_id = po_data["id"]

    # Verify retrieval from GET /apis/v3/procurement/pos
    get_res = client.get(
        f"/apis/v3/procurement/pos?project_id={proj.id}",
        headers=hdr,
    )
    assert get_res.status_code == 200, get_res.text
    pos = get_res.json()
    assert len(pos) == 1
    retrieved = pos[0]
    assert retrieved["id"] == po_id
    assert retrieved["gross_amount"] == 135000.0
    assert retrieved["tax_amount"] == 18300.0
    assert retrieved["total_amount"] == 153300.0
    assert len(retrieved["items"]) == 2
    item1 = next(it for it in retrieved["items"] if it["material_name"] == "Cement OPC 53")
    assert item1["tax_pct"] == 18.0
    assert item1["total_amount"] == 41300.0
    item2 = next(it for it in retrieved["items"] if it["material_name"] == "Structural Steel")
    assert item2["tax_pct"] == 12.0
    assert item2["total_amount"] == 112000.0
