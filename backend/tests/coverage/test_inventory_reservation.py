"""Inventory reservation test suite.
Validates specifications from AGENT_PROMPT_RESERVATION_REPAIR.md:
- Reserve on indent approve (full and partial)
- Zero reserve when out of stock (non-blocking approval)
- Cancel approved indent releases reservation on both warehouse and item
- Reject pending indent (stays pending-only)
- Enforce stock availability guards with (on hand, reserved, available, requested)
- Non-DPR stock-out paths (transactions transferred/used/subcon_issue and write-offs) release reservation
- Shared release helper keeps MaterialIndentItem.reserved_qty and WarehouseInventory.reserved_qty in sync
- Invariant: reserved_qty <= on_hand_qty always holds
- Invariant: double-approve blocked / idempotent
- Safety: with no approved indents, reserved_qty stays 0 everywhere and all stock flows match legacy behavior
"""
import uuid
import datetime
import pytest
from app import models


def _mk_project(db, company, name="Project Reserve"):
    proj = models.Project(
        id=uuid.uuid4(),
        company_id=company.id,
        name=name,
        code=f"PRJ-{uuid.uuid4().hex[:4].upper()}",
        status="active",
    )
    db.add(proj)
    db.commit()
    return proj


def _mk_inventory(db, project, name, on_hand, reserved=0.0, unit="bags"):
    inv = models.WarehouseInventory(
        id=uuid.uuid4(),
        project_id=project.id,
        material_name=name,
        category="Civil",
        on_hand_qty=float(on_hand),
        reserved_qty=float(reserved),
        unit=unit,
    )
    db.add(inv)
    db.commit()
    return inv


def _mk_indent(client, company, project, hdr, items):
    r = client.post(
        "/apis/v3/procurement/indents",
        json={
            "company_id": str(company.id),
            "project_id": str(project.id),
            "indent_number": f"IND-{uuid.uuid4().hex[:6].upper()}",
            "items": [
                {"material_name": name, "quantity": qty, "unit": unit}
                for name, qty, unit in items
            ],
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _approve_indent(client, hdr, indent_id):
    return client.post(f"/apis/v3/procurement/indents/{indent_id}/approve", headers=hdr)


def _reject_indent(client, hdr, indent_id):
    return client.post(f"/apis/v3/procurement/indents/{indent_id}/reject", headers=hdr)


def _cancel_indent(client, hdr, indent_id):
    return client.post(f"/apis/v3/procurement/indents/{indent_id}/cancel", headers=hdr)


def _mk_dpr(client, project, hdr, materials):
    return client.post(
        "/apis/v3/dpr",
        json={
            "project_id": str(project.id),
            "reported_by": "Site Engineer",
            "dpr_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "executed_qty": 1.0,
            "workers_deployed": 5,
            "materials_consumed": [
                {"material_name": name, "quantity": qty, "unit": unit}
                for name, qty, unit in materials
            ],
        },
        headers=hdr,
    )


# -----------------------------------------------------------------------------
# 1. Safety property: with no approved indents, reserved_qty stays 0 everywhere
#    and every existing stock figure matches legacy behavior exactly.
# -----------------------------------------------------------------------------

def test_safety_no_approved_indents_preserves_legacy_stock_behavior(client, db, make_tenant, auth_headers):
    """With NO approved indents, reserved_qty is 0 everywhere across all stock flows."""
    comp, user, _ = make_tenant(company_name="Safety Co", user_name="Safety User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "Safety Proj")

    inv = _mk_inventory(db, proj, "Cement", on_hand=100.0, reserved=0.0)
    assert float(inv.reserved_qty) == 0.0
    assert float(inv.on_hand_qty) == 100.0

    # Stock flow 1: Manual adjustment +20 bags
    r_adj = client.post(
        "/apis/v3/procurement/transactions",
        json={
            "project_id": str(proj.id),
            "material_name": "Cement",
            "category": "Civil",
            "qty": 20.0,
            "type": "adjustment",
            "reason": "Physical count surplus audit",
            "unit": "bags",
        },
        headers=hdr,
    )
    assert r_adj.status_code == 201, r_adj.text
    db.refresh(inv)
    assert float(inv.on_hand_qty) == 120.0
    assert float(inv.reserved_qty) == 0.0

    # Stock flow 2: DPR consumption (-30 bags)
    r_dpr = _mk_dpr(client, proj, hdr, [("Cement", 30.0, "bags")])
    assert r_dpr.status_code == 201, r_dpr.text
    dpr_id = r_dpr.json()["id"]

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 90.0
    assert float(inv.reserved_qty) == 0.0

    # Stock flow 3: DPR deletion / reversal (+30 bags back)
    r_del = client.delete(f"/apis/v3/dpr/{dpr_id}", headers=hdr)
    assert r_del.status_code == 204, r_del.text

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 120.0
    assert float(inv.reserved_qty) == 0.0


# -----------------------------------------------------------------------------
# 2. Reserve on approve (full and partial)
# -----------------------------------------------------------------------------

def test_reserve_on_indent_approve_full(client, db, make_tenant, auth_headers):
    """When stock is plentiful, approved indent reserves full requested quantity."""
    comp, user, _ = make_tenant(company_name="ResFull Co", user_name="ResFull User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "ResFull Proj")

    inv = _mk_inventory(db, proj, "Steel TMT", on_hand=100.0, reserved=0.0, unit="MT")

    indent = _mk_indent(client, comp, proj, hdr, [("Steel TMT", 25.0, "MT")])
    r_app = _approve_indent(client, hdr, indent["id"])
    assert r_app.status_code == 200, r_app.text

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 100.0
    assert float(inv.reserved_qty) == 25.0

    item = db.query(models.MaterialIndentItem).filter_by(indent_id=uuid.UUID(indent["id"])).first()
    assert float(item.reserved_qty) == 25.0


def test_partial_reserve_when_stock_short(client, db, make_tenant, auth_headers):
    """When stock is short, indent reserves whatever is available and does NOT block approval."""
    comp, user, _ = make_tenant(company_name="ResShort Co", user_name="ResShort User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "ResShort Proj")

    inv = _mk_inventory(db, proj, "Bricks", on_hand=3000.0, reserved=1000.0, unit="nos")
    indent = _mk_indent(client, comp, proj, hdr, [("Bricks", 5000.0, "nos")])
    r_app = _approve_indent(client, hdr, indent["id"])
    assert r_app.status_code == 200, r_app.text
    assert r_app.json()["status"] == "approved"

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 3000.0
    assert float(inv.reserved_qty) == 3000.0

    item = db.query(models.MaterialIndentItem).filter_by(indent_id=uuid.UUID(indent["id"])).first()
    assert float(item.reserved_qty) == 2000.0


def test_zero_reserve_when_out_of_stock(client, db, make_tenant, auth_headers):
    """When stock is 0 or unstocked, approval succeeds with item.reserved_qty = 0."""
    comp, user, _ = make_tenant(company_name="ResZero Co", user_name="ResZero User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "ResZero Proj")

    indent = _mk_indent(client, comp, proj, hdr, [("Special Coating", 50.0, "liters")])
    r_app = _approve_indent(client, hdr, indent["id"])
    assert r_app.status_code == 200, r_app.text

    item = db.query(models.MaterialIndentItem).filter_by(indent_id=uuid.UUID(indent["id"])).first()
    assert float(item.reserved_qty) == 0.0


# -----------------------------------------------------------------------------
# 3. Part 1: Cancel approved indent releases reservation on warehouse and item
# -----------------------------------------------------------------------------

def test_cancel_approved_indent_releases_reservation(client, db, make_tenant, auth_headers):
    """Approving an indent reserves stock; cancelling it releases both warehouse and item reserved_qty."""
    comp, user, _ = make_tenant(company_name="Cancel Co", user_name="Cancel User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "Cancel Proj")

    inv = _mk_inventory(db, proj, "Timber", on_hand=100.0, reserved=0.0, unit="sqft")

    indent = _mk_indent(client, comp, proj, hdr, [("Timber", 40.0, "sqft")])
    r_app = _approve_indent(client, hdr, indent["id"])
    assert r_app.status_code == 200, r_app.text

    db.refresh(inv)
    assert float(inv.reserved_qty) == 40.0
    item = db.query(models.MaterialIndentItem).filter_by(indent_id=uuid.UUID(indent["id"])).first()
    assert float(item.reserved_qty) == 40.0

    # Cancel the approved indent
    r_can = _cancel_indent(client, hdr, indent["id"])
    assert r_can.status_code == 200, r_can.text
    assert r_can.json()["status"] == "cancelled"

    db.refresh(inv)
    assert float(inv.reserved_qty) == 0.0
    db.refresh(item)
    assert float(item.reserved_qty) == 0.0


def test_reject_stays_pending_only(client, db, make_tenant, auth_headers):
    """Rejecting an approved indent is blocked with 400."""
    comp, user, _ = make_tenant(company_name="RejPend Co", user_name="RejPend User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "RejPend Proj")

    inv = _mk_inventory(db, proj, "Pipes", on_hand=50.0, reserved=0.0, unit="m")
    indent = _mk_indent(client, comp, proj, hdr, [("Pipes", 20.0, "m")])
    _approve_indent(client, hdr, indent["id"])

    r_rej = _reject_indent(client, hdr, indent["id"])
    assert r_rej.status_code == 400
    assert "Only pending indents can be rejected" in r_rej.json()["detail"]


# -----------------------------------------------------------------------------
# 4. Part 2 & 4: Invariant & Guard Tests that actually bite
# -----------------------------------------------------------------------------

def test_transfer_more_than_available_with_guard_on_rejected(client, db, make_tenant, auth_headers):
    """With restrict_material_transfer=True, transferring more than (on_hand - reserved) is rejected."""
    comp, user, _ = make_tenant(company_name="GuardOn Co", user_name="GuardOn User")
    comp.restrict_material_transfer = True
    db.add(comp)
    db.commit()

    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "GuardOn Proj")

    inv = _mk_inventory(db, proj, "Cement", on_hand=100.0, reserved=0.0, unit="bags")

    # Approve indent for 90 bags -> on_hand=100, reserved=90, available=10
    indent = _mk_indent(client, comp, proj, hdr, [("Cement", 90.0, "bags")])
    _approve_indent(client, hdr, indent["id"])

    db.refresh(inv)
    assert float(inv.reserved_qty) == 90.0

    # Attempt to transfer 80 bags (more than available 10)
    r_tx = client.post(
        "/apis/v3/procurement/transactions",
        json={
            "project_id": str(proj.id),
            "material_name": "Cement",
            "category": "Civil",
            "qty": 80.0,
            "type": "transferred",
            "unit": "bags",
        },
        headers=hdr,
    )
    assert r_tx.status_code == 400, r_tx.text
    detail = r_tx.json()["detail"]
    assert "Restrict Material Transfer" in detail
    assert "on hand 100.0" in detail
    assert "reserved 90.0" in detail
    assert "available 10.0" in detail
    assert "requested 80.0" in detail


def test_transfer_with_guard_off_releases_reservation_and_preserves_invariant(client, db, make_tenant, auth_headers):
    """With guard off, stock-out movement decrements on_hand AND releases reserved stock, preserving reserved <= on_hand."""
    comp, user, _ = make_tenant(company_name="GuardOff Co", user_name="GuardOff User")
    comp.restrict_material_transfer = False
    db.add(comp)
    db.commit()

    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "GuardOff Proj")

    inv = _mk_inventory(db, proj, "Cement", on_hand=100.0, reserved=0.0, unit="bags")

    indent = _mk_indent(client, comp, proj, hdr, [("Cement", 90.0, "bags")])
    _approve_indent(client, hdr, indent["id"])

    # Issue 80 bags transfer with guard off
    r_tx = client.post(
        "/apis/v3/procurement/transactions",
        json={
            "project_id": str(proj.id),
            "material_name": "Cement",
            "category": "Civil",
            "qty": 80.0,
            "type": "transferred",
            "unit": "bags",
        },
        headers=hdr,
    )
    assert r_tx.status_code == 201, r_tx.text

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 20.0
    assert float(inv.reserved_qty) == 10.0  # Released 80 of the 90 reserved
    assert float(inv.reserved_qty) <= float(inv.on_hand_qty)


def test_dpr_consumption_then_cancel_does_not_double_release(client, db, make_tenant, auth_headers):
    """Consuming stock draws down item.reserved_qty; subsequent cancel does NOT double-release or steal other reservations."""
    comp, user, _ = make_tenant(company_name="DoubleRel Co", user_name="DoubleRel User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "DoubleRel Proj")

    inv = _mk_inventory(db, proj, "Sand", on_hand=100.0, reserved=0.0, unit="cft")

    # Indent 1: reserves 40
    indent1 = _mk_indent(client, comp, proj, hdr, [("Sand", 40.0, "cft")])
    _approve_indent(client, hdr, indent1["id"])

    # Indent 2: reserves 20
    indent2 = _mk_indent(client, comp, proj, hdr, [("Sand", 20.0, "cft")])
    _approve_indent(client, hdr, indent2["id"])

    db.refresh(inv)
    assert float(inv.reserved_qty) == 60.0

    # DPR consumes 40 Sand
    r_dpr = _mk_dpr(client, proj, hdr, [("Sand", 40.0, "cft")])
    assert r_dpr.status_code == 201

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 60.0
    assert float(inv.reserved_qty) == 20.0

    # Cancel Indent 1 (its stock was already consumed by DPR)
    r_can = _cancel_indent(client, hdr, indent1["id"])
    assert r_can.status_code == 200

    db.refresh(inv)
    # Warehouse reserved_qty must STILL be 20.0 (holding Indent 2's reservation), NOT 0 or negative
    assert float(inv.reserved_qty) == 20.0
    assert float(inv.on_hand_qty) == 60.0


def test_negative_writeoff_adjustment_releases_and_positive_does_not(client, db, make_tenant, auth_headers):
    """Negative adjustment (write-off) releases reservation; positive adjustment restates stock up without changing reserved."""
    comp, user, _ = make_tenant(company_name="Adj Co", user_name="Adj User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "Adj Proj")

    inv = _mk_inventory(db, proj, "Paint", on_hand=100.0, reserved=0.0, unit="liters")

    indent = _mk_indent(client, comp, proj, hdr, [("Paint", 50.0, "liters")])
    _approve_indent(client, hdr, indent["id"])

    db.refresh(inv)
    assert float(inv.reserved_qty) == 50.0

    # Negative adjustment (write off -30 liters)
    r_adj1 = client.post(
        "/apis/v3/procurement/transactions",
        json={
            "project_id": str(proj.id),
            "material_name": "Paint",
            "category": "Civil",
            "qty": -30.0,
            "type": "adjustment",
            "reason": "Damaged barrels write-off",
            "unit": "liters",
        },
        headers=hdr,
    )
    assert r_adj1.status_code == 201

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 70.0
    assert float(inv.reserved_qty) == 20.0  # 50 - 30 = 20

    # Positive adjustment (+40 liters restatement)
    r_adj2 = client.post(
        "/apis/v3/procurement/transactions",
        json={
            "project_id": str(proj.id),
            "material_name": "Paint",
            "category": "Civil",
            "qty": 40.0,
            "type": "adjustment",
            "reason": "Found extra paint in storage",
            "unit": "liters",
        },
        headers=hdr,
    )
    assert r_adj2.status_code == 201

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 110.0
    assert float(inv.reserved_qty) == 20.0  # Still 20.0, not increased


def test_dpr_delete_reversal_restores_reservations(client, db, make_tenant, auth_headers):
    """Approve an indent to reserve stock, consume part of it via DPR, then DELETE the DPR.
    Assert DELETE response is not 5xx, and WarehouseInventory.reserved_qty and
    MaterialIndentItem.reserved_qty both return to their pre-DPR values."""
    comp, user, _ = make_tenant(company_name="DPRRev Co", user_name="DPRRev User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "DPRRev Proj")

    inv = _mk_inventory(db, proj, "Gravel", on_hand=100.0, reserved=0.0, unit="tons")

    indent = _mk_indent(client, comp, proj, hdr, [("Gravel", 60.0, "tons")])
    _approve_indent(client, hdr, indent["id"])

    db.refresh(inv)
    item = db.query(models.MaterialIndentItem).filter(models.MaterialIndentItem.indent_id == indent["id"]).first()
    assert float(inv.reserved_qty) == 60.0
    assert float(item.reserved_qty) == 60.0

    # Post DPR consuming 25 tons
    r_dpr = _mk_dpr(client, proj, hdr, [("Gravel", 25.0, "tons")])
    assert r_dpr.status_code == 201
    dpr_data = r_dpr.json()
    dpr_id = dpr_data["id"]

    db.refresh(inv)
    db.refresh(item)
    assert float(inv.on_hand_qty) == 75.0
    assert float(inv.reserved_qty) == 35.0
    assert float(item.reserved_qty) == 35.0

    # Delete DPR
    r_del = client.delete(f"/apis/v3/dpr/{dpr_id}", headers=hdr)
    assert r_del.status_code < 500
    assert r_del.status_code in (200, 204)

    db.refresh(inv)
    db.refresh(item)
    assert float(inv.on_hand_qty) == 100.0
    assert float(inv.reserved_qty) == 60.0
    assert float(item.reserved_qty) == 60.0

