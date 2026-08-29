"""R2-219 & R2-380 - PO approval must not rewind fulfilment, and the DPR
consumption path must honour negative_stock_lock.

R2-219: POST /procurement/pos/{id}/approve used to stamp status="sent"
unconditionally in both branches of the approval path, so approving a
partially/fully received PO rewound it to "sent" and re-opened goods receipt
for stock already booked in. Approval now lifts only a not-yet-sent PO to
"sent" (same forward-only rank map goods receipt uses) and leaves any later
lifecycle stage untouched.

R2-380: POST /dpr wrote MaterialTransaction(type="used") rows and inventory
decrements - even brand-new inventory rows at negative quantity - with no
negative_stock_lock enforcement (the lock guarded only manual
/procurement/transactions). The DPR path now runs the same "Restrict Material
Usage" check for every consumed material before anything is written.
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


def _approve(client, hdr, po_id):
    return client.post(f"/apis/v3/procurement/pos/{po_id}/approve", headers=hdr)


def _mk_inventory(db, project, name, qty, unit="bag"):
    inv = models.WarehouseInventory(
        id=uuid.uuid4(), project_id=project.id, material_name=name,
        on_hand_qty=qty, reserved_qty=0.0, unit=unit,
    )
    db.add(inv)
    db.commit()
    return inv


def _mk_dpr(client, project, hdr, mats):
    return client.post(
        "/apis/v3/dpr",
        json={
            "project_id": str(project.id),
            "reported_by": "Site Engineer",
            "dpr_date": datetime.datetime.now().isoformat(),
            "executed_qty": 1.0,
            "workers_deployed": 3,
            "materials_consumed": [
                {"material_name": n, "quantity": q, "unit": u} for n, q, u in mats
            ],
        },
        headers=hdr,
    )


# ------------------------------------------------------------- R2-219

def test_approve_still_advances_draft_po_to_sent(client, db, make_tenant, auth_headers):
    """Approval keeps lifting a not-yet-sent PO to "sent" (no over-correction)."""
    comp, user, team = make_tenant(company_name="R219A", user_name="U219A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "A")
    po = _mk_po(client, comp, project, hdr)

    r = _approve(client, hdr, po["id"])
    assert r.status_code == 200, r.text
    assert r.json()["approval_flag"] == "approved"
    assert r.json()["status"] == "sent"


def test_approve_never_rewinds_received_po(client, db, make_tenant, auth_headers):
    """R2-219 core scenario: material arrives and is booked in before the
    paperwork clears; approving afterwards must leave status="received"."""
    comp, user, team = make_tenant(company_name="R219B", user_name="U219B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "B")
    po = _mk_po(client, comp, project, hdr)

    row = db.query(models.PurchaseOrder).filter_by(id=uuid.UUID(po["id"])).first()
    row.status = "received"
    db.commit()

    r = _approve(client, hdr, po["id"])
    assert r.status_code == 200, r.text
    assert r.json()["approval_flag"] == "approved"
    assert r.json()["status"] == "received"

    db.expire_all()
    assert (
        db.query(models.PurchaseOrder).filter_by(id=row.id).first().status
        == "received"
    )


def test_approve_rule_gated_po_keeps_partial_status(client, db, make_tenant, auth_headers):
    """Same guarantee on the multi-level rule branch of approve_po."""
    comp, user, team = make_tenant(
        company_name="R219C", user_name="U219C", email="mgr219@co.in"
    )
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "C")
    po = _mk_po(client, comp, project, hdr)

    rule = models.ApprovalRule(
        company_id=comp.id, feature_type="Purchase Order",
        min_amount=0.0, levels=1, approvers="mgr219@co.in",
    )
    db.add(rule)
    row = db.query(models.PurchaseOrder).filter_by(id=uuid.UUID(po["id"])).first()
    row.approval_rule_id = rule.id
    row.status = "partial"
    db.commit()

    r = _approve(client, hdr, po["id"])
    assert r.status_code == 200, r.text
    assert r.json()["approval_flag"] == "approved"
    assert r.json()["status"] == "partial"


# ------------------------------------------------------------- R2-380

def test_dpr_usage_blocked_by_negative_stock_lock(client, db, make_tenant, auth_headers):
    """With the lock on, a DPR cannot consume beyond held stock and writes
    nothing: no transaction, no decrement, no extra inventory row."""
    comp, user, team = make_tenant(company_name="R380A", user_name="U380A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "D")
    comp.negative_stock_lock = True
    db.commit()

    _mk_inventory(db, project, "Cement OPC53", 10.0)
    r = _mk_dpr(client, project, hdr, [("Cement OPC53", 50.0, "bag")])
    assert r.status_code == 400, r.text
    assert "Restrict Material Usage" in r.json()["detail"]

    db.expire_all()
    inv = (
        db.query(models.WarehouseInventory)
        .filter_by(project_id=project.id, material_name="Cement OPC53")
        .first()
    )
    assert float(inv.on_hand_qty) == 10.0
    assert (
        db.query(models.MaterialTransaction)
        .filter_by(project_id=project.id, type="used")
        .count() == 0
    )
    assert (
        db.query(models.WarehouseInventory)
        .filter_by(project_id=project.id)
        .count() == 1
    )


def test_dpr_lock_stops_negative_row_for_unknown_material(client, db, make_tenant, auth_headers):
    """With the lock on, consuming a material that has no inventory row at all
    is refused instead of inventing stock as a new negative-quantity row."""
    comp, user, team = make_tenant(company_name="R380B", user_name="U380B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "E")
    comp.negative_stock_lock = True
    db.commit()

    r = _mk_dpr(client, project, hdr, [("Phantom Sand", 500.0, "m3")])
    assert r.status_code == 400, r.text

    db.expire_all()
    assert (
        db.query(models.WarehouseInventory)
        .filter_by(project_id=project.id, material_name="Phantom Sand")
        .count() == 0
    )
    assert (
        db.query(models.MaterialTransaction)
        .filter_by(project_id=project.id, type="used")
        .count() == 0
    )


def test_dpr_without_lock_keeps_flexible_consumption(client, db, make_tenant, auth_headers):
    """Without the lock the pre-existing flexibility is preserved: stock may go
    negative and unknown materials still get a (negative) row, each with a
    type="used" ledger entry."""
    comp, user, team = make_tenant(company_name="R380C", user_name="U380C")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "F")

    _mk_inventory(db, project, "Cement OPC53", 10.0)
    r = _mk_dpr(
        client, project, hdr,
        [("Cement OPC53", 50.0, "bag"), ("Phantom Sand", 25.0, "m3")],
    )
    assert r.status_code == 201, r.text

    db.expire_all()
    cement = (
        db.query(models.WarehouseInventory)
        .filter_by(project_id=project.id, material_name="Cement OPC53")
        .first()
    )
    sand = (
        db.query(models.WarehouseInventory)
        .filter_by(project_id=project.id, material_name="Phantom Sand")
        .first()
    )
    assert float(cement.on_hand_qty) == -40.0
    assert float(sand.on_hand_qty) == -25.0
    txns = (
        db.query(models.MaterialTransaction)
        .filter_by(project_id=project.id, type="used")
        .all()
    )
    assert sorted(t.material_name for t in txns) == ["Cement OPC53", "Phantom Sand"]
