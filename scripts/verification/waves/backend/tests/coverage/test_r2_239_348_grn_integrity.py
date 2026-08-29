"""R2-239 & R2-348 — goods receipt integrity.

Gate: POST /procurement/grns must never accept stock against an unapproved
purchase order, must never receive more than was ordered (cumulative across
every GRN and every line of the same request), may only move the PO forward
along its lifecycle, and /procurement/stock must never report more received
than the project ordered.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{uuid.uuid4().hex[:8]}-{tag}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_po(client, comp, project, hdr, qty=100.0):
    r = client.post(
        "/apis/v3/procurement/pos",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "po_number": f"PO-{uuid.uuid4().hex[:8]}",
            "po_date": datetime.datetime.now().isoformat(),
            "items": [{"material_name": "Cement OPC53", "quantity": qty, "unit": "bag", "rate": 400.0}],
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _approve_po(client, po_id, hdr):
    r = client.post(f"/apis/v3/procurement/pos/{po_id}/approve", headers=hdr)
    assert r.status_code == 200, r.text
    return r.json()


def _post_grn(client, comp, project, po_json, lines, hdr):
    return client.post(
        "/apis/v3/procurement/grns",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "po_id": str(po_json["id"]),
            "received_date": datetime.datetime.now().isoformat(),
            "items": [{"po_item_id": pid, "received_qty": q} for pid, q in lines],
        },
        headers=hdr,
    )


def _po_row(db, po_json):
    return db.query(models.PurchaseOrder).filter_by(id=uuid.UUID(po_json["id"])).first()


def test_draft_po_is_refused_422(client, db, make_tenant, auth_headers):
    """R2-239(c): a draft PO (approval_flag pending) can never be received;
    the GRN must not jump the lifecycle or write any stock."""
    comp, user, team = make_tenant(company_name="R239A", user_name="U239A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "A")
    po = _mk_po(client, comp, project, hdr)
    assert po["status"] == "draft"
    assert po["approval_flag"] in ("pending", "pending_approval")

    pid = po["items"][0]["id"]
    r = _post_grn(client, comp, project, po, [(pid, 100.0)], hdr)
    assert r.status_code == 422, r.text
    assert "not approved" in r.json()["detail"]

    db.expire_all()
    row = _po_row(db, po)
    assert row.status == "draft"  # no draft -> received jump
    assert db.query(models.GoodsReceiptNote).filter_by(po_id=row.id).count() == 0
    assert db.query(models.WarehouseInventory).filter_by(project_id=project.id).count() == 0
    assert db.query(models.MaterialTransaction).filter_by(project_id=project.id).count() == 0


def test_over_receipt_is_blocked_422_with_quantities(client, db, make_tenant, auth_headers):
    """R2-348: cumulative received is capped at ordered; the rejection names
    the line, the ordered and the already-received quantities."""
    comp, user, team = make_tenant(company_name="R348B", user_name="U348B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "B")
    po = _mk_po(client, comp, project, hdr, qty=100.0)
    po = _approve_po(client, po["id"], hdr)
    assert po["approval_flag"] == "approved"
    pid = po["items"][0]["id"]

    ok = _post_grn(client, comp, project, po, [(pid, 60.0)], hdr)
    assert ok.status_code == 201, ok.text

    over = _post_grn(client, comp, project, po, [(pid, 60.0)], hdr)
    assert over.status_code == 422, over.text
    detail = over.json()["detail"]
    # Ordered 100, already received 60, requested 60 must all be named.
    assert "Over-receipt blocked" in detail
    for figure in ("100", "60"):
        assert figure in detail, detail

    # Two lines of the SAME po item inside one request are capped together.
    dup = _post_grn(client, comp, project, po, [(pid, 30.0), (pid, 30.0)], hdr)
    assert dup.status_code == 422, dup.text

    db.expire_all()
    row = _po_row(db, po)
    assert row.status == "partial"
    grn_items = (
        db.query(models.GRNItem)
        .join(models.GoodsReceiptNote)
        .filter(models.GoodsReceiptNote.po_id == row.id)
        .all()
    )
    assert len(grn_items) == 1
    assert float(grn_items[0].received_qty) == 60.0
    inv = db.query(models.WarehouseInventory).filter_by(
        project_id=project.id, material_name="Cement OPC53"
    ).first()
    assert float(inv.on_hand_qty) == 60.0  # nothing of the rejected GRNs landed


def test_partial_then_complete_receipt_moves_forward_only(client, db, make_tenant, auth_headers):
    """Partial then complete receipts succeed and only ever advance the PO:
    sent -> partial -> received; once fully received nothing remains to take."""
    comp, user, team = make_tenant(company_name="R348C", user_name="U348C")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "C")
    po = _mk_po(client, comp, project, hdr, qty=100.0)
    po = _approve_po(client, po["id"], hdr)
    assert po["status"] == "sent"
    pid = po["items"][0]["id"]

    r1 = _post_grn(client, comp, project, po, [(pid, 40.0)], hdr)
    assert r1.status_code == 201, r1.text
    db.expire_all()
    assert _po_row(db, po).status == "partial"

    r2 = _post_grn(client, comp, project, po, [(pid, 60.0)], hdr)
    assert r2.status_code == 201, r2.text
    db.expire_all()
    assert _po_row(db, po).status == "received"

    # Fully received: even one more unit is an over-receipt.
    r3 = _post_grn(client, comp, project, po, [(pid, 1.0)], hdr)
    assert r3.status_code == 422, r3.text
    db.expire_all()
    assert _po_row(db, po).status == "received"


def test_stock_never_reports_more_than_ordered(client, db, make_tenant, auth_headers):
    """R2-239(b)/R2-348: /procurement/stock is clamped at what the project
    ordered; even a legacy/corrupt ledger over-receipt cannot inflate it."""
    comp, user, team = make_tenant(company_name="R348D", user_name="U348D")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "D")
    po = _mk_po(client, comp, project, hdr, qty=100.0)
    po = _approve_po(client, po["id"], hdr)
    pid = po["items"][0]["id"]

    ok = _post_grn(client, comp, project, po, [(pid, 100.0)], hdr)
    assert ok.status_code == 201, ok.text

    # Simulate pre-fix data: an extra 500 "received" sitting in the ledger.
    db.add(models.MaterialTransaction(
        project_id=project.id, material_name="Cement OPC53",
        qty=500.0, type="received", unit="bag",
    ))
    db.add(models.WarehouseInventory(
        project_id=project.id, material_name="Cement OPC53",
        on_hand_qty=500.0, reserved_qty=0.0, unit="bag",
    ))
    db.commit()

    r = client.get(f"/apis/v3/procurement/stock?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    rows = {row["material_name"]: row for row in r.json()}
    cement = rows["Cement OPC53"]
    assert cement["received"] <= 100.0 + 1e-6      # clamped at ordered, was 600
    assert cement["current_stock"] <= 100.0 + 1e-6
