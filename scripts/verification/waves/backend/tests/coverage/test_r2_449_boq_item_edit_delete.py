"""R2-449 — BOQ line items can be edited and deleted through the API.

Gate: the only writers were the Excel importer and POST boq-documents items;
a wrong rate could never be fixed in place and a bad row could never be
removed, so the corrective re-import doubled the document's lines. PATCH /boq
and DELETE /boq close that loop.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R449-{_SUFFIX}-{uuid.uuid4().hex[:4]}",
        user_name="U449",
        mobile=f"+9190{uuid.uuid4().hex[:8]}",
        email=f"r449-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, auth_headers(user, comp)


def test_boq_item_patch_recalculates_amount_and_rounding_base(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P449-{_SUFFIX}A",
        code=f"PRJ-{_SUFFIX}A", status="Ongoing",
    )
    db.add(project)
    db.commit()

    r = client.post("/apis/v3/budgeting/boq-documents", headers=hdr, json={
        "project_id": str(project.id), "title": "BOQ 449",
    })
    assert r.status_code == 201, r.text
    doc_id = r.json()["id"]

    r = client.post(f"/apis/v3/budgeting/boq-documents/{doc_id}/items", headers=hdr, json={
        "item_name": "Brick work", "unit": "Nos", "quantity": 10, "rate": 100,
    })
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["amount"] == 1000.0

    # Patch the wrong rate in place instead of re-importing the whole sheet.
    r = client.patch(f"/apis/v3/budgeting/boq/{item['id']}", headers=hdr, json={"rate": 25})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["rate"] == 25.0
    assert body["amount"] == 250.0  # 10 x (25 + 0 + 0)

    # Unit change re-derives the rounding base (kg -> 3 decimals).
    r = client.patch(f"/apis/v3/budgeting/boq/{item['id']}", headers=hdr, json={"unit": "kg"})
    assert r.status_code == 200, r.text
    assert r.json()["quantity_float_limit"] == 3


def test_boq_item_patch_enforces_cost_code_library_gate(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P449-{_SUFFIX}B",
        code=f"PRJ-{_SUFFIX}B", status="Ongoing",
    )
    db.add(project)
    db.commit()

    r = client.post("/apis/v3/budgeting/boq-documents", headers=hdr, json={
        "project_id": str(project.id), "title": "BOQ 449 B",
    })
    assert r.status_code == 201, r.text
    doc_id = r.json()["id"]
    r = client.post(f"/apis/v3/budgeting/boq-documents/{doc_id}/items", headers=hdr, json={
        "item_name": "Steel work", "unit": "kg", "quantity": 5, "rate": 70,
    })
    assert r.status_code == 201, r.text
    item_id = r.json()["id"]

    # R2-334 parity: edits cannot fork a cost code outside the library either.
    r = client.patch(f"/apis/v3/budgeting/boq/{item_id}", headers=hdr, json={"cost_code": "ZZ-GHOST"})
    assert r.status_code == 400, r.text
    assert "Cost Code Library" in r.json()["detail"]


def test_boq_item_delete_removes_row_then_404s(client, db, make_tenant, auth_headers):
    comp, user, hdr = _tenant(make_tenant, auth_headers)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P449-{_SUFFIX}C",
        code=f"PRJ-{_SUFFIX}C", status="Ongoing",
    )
    db.add(project)
    db.commit()

    r = client.post("/apis/v3/budgeting/boq-documents", headers=hdr, json={
        "project_id": str(project.id), "title": "BOQ 449 C",
    })
    assert r.status_code == 201, r.text
    doc_id = r.json()["id"]
    r = client.post(f"/apis/v3/budgeting/boq-documents/{doc_id}/items", headers=hdr, json={
        "item_name": "Wrong row", "unit": "Nos", "quantity": 1, "rate": 1,
    })
    assert r.status_code == 201, r.text
    item_id = r.json()["id"]

    r = client.delete(f"/apis/v3/budgeting/boq/{item_id}", headers=hdr)
    assert r.status_code == 204, r.text
    assert db.query(models.BOQItem).filter(
        models.BOQItem.id == uuid.UUID(item_id)
    ).first() is None

    # Deleting again is a 404, not a silent success.
    r = client.delete(f"/apis/v3/budgeting/boq/{item_id}", headers=hdr)
    assert r.status_code == 404, r.text
