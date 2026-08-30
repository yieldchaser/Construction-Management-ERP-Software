"""Inventory reservation test suite.
Validates Part 4 specifications from AGENT_PROMPT_HELP_LABELS_AND_BACKLOG.md:
- Reserve on indent approve (full and partial)
- Zero reserve when out of stock (non-blocking approval)
- Release on indent reject
- Release on DPR consumption
- Re-reserve on DPR deletion (reversal)
- Invariant: reserved_qty >= 0 always
- Invariant: reserved_qty <= on_hand_qty always
- Invariant: idempotency (double-approve blocked by status check)
- Invariant: DPR consumption releases at most what was reserved
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

    # Initial inventory: 100 bags on hand
    inv = _mk_inventory(db, proj, "Cement", on_hand=100.0, reserved=0.0)
    assert float(inv.reserved_qty) == 0.0
    assert float(inv.on_hand_qty) == 100.0

    # Stock flow 1: Manual adjustment (R2-387) +20 bags
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
    # Available is 3000 - 1000 = 2000

    indent = _mk_indent(client, comp, proj, hdr, [("Bricks", 5000.0, "nos")])
    r_app = _approve_indent(client, hdr, indent["id"])
    assert r_app.status_code == 200, r_app.text
    assert r_app.json()["status"] == "approved"

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 3000.0
    assert float(inv.reserved_qty) == 3000.0  # 1000 previous + 2000 newly reserved

    item = db.query(models.MaterialIndentItem).filter_by(indent_id=uuid.UUID(indent["id"])).first()
    assert float(item.reserved_qty) == 2000.0


def test_zero_reserve_when_out_of_stock(client, db, make_tenant, auth_headers):
    """When stock is 0 or unstocked, approval succeeds with item.reserved_qty = 0."""
    comp, user, _ = make_tenant(company_name="ResZero Co", user_name="ResZero User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "ResZero Proj")

    # Item not in WarehouseInventory at all
    indent = _mk_indent(client, comp, proj, hdr, [("Special Coating", 50.0, "liters")])
    r_app = _approve_indent(client, hdr, indent["id"])
    assert r_app.status_code == 200, r_app.text

    item = db.query(models.MaterialIndentItem).filter_by(indent_id=uuid.UUID(indent["id"])).first()
    assert float(item.reserved_qty) == 0.0


# -----------------------------------------------------------------------------
# 3. Release on reject
# -----------------------------------------------------------------------------

def test_release_on_indent_reject(client, db, make_tenant, auth_headers):
    """Rejecting an indent releases its stored reserved_qty and zeroes the item."""
    comp, user, _ = make_tenant(company_name="Rej Co", user_name="Rej User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "Rej Proj")

    inv = _mk_inventory(db, proj, "Timber", on_hand=100.0, reserved=0.0, unit="sqft")

    # Create indent
    indent = _mk_indent(client, comp, proj, hdr, [("Timber", 40.0, "sqft")])

    # Reject directly while pending: reserved stays 0
    r_rej = _reject_indent(client, hdr, indent["id"])
    assert r_rej.status_code == 200, r_rej.text
    assert r_rej.json()["status"] == "rejected"

    db.refresh(inv)
    assert float(inv.reserved_qty) == 0.0


# -----------------------------------------------------------------------------
# 4. DPR consumption releases reservation & DPR reversal re-reserves
# -----------------------------------------------------------------------------

def test_dpr_consumption_and_reversal_reservation_cycle(client, db, make_tenant, auth_headers):
    """Consuming material releases reservation; deleting DPR re-reserves it."""
    comp, user, _ = make_tenant(company_name="Cycle Co", user_name="Cycle User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "Cycle Proj")

    inv = _mk_inventory(db, proj, "Sand", on_hand=100.0, reserved=0.0, unit="cft")

    # Indent approved: reserves 40 cft
    indent = _mk_indent(client, comp, proj, hdr, [("Sand", 40.0, "cft")])
    _approve_indent(client, hdr, indent["id"])

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 100.0
    assert float(inv.reserved_qty) == 40.0

    # DPR consumes 25 cft: on_hand becomes 75, reserved becomes 15
    r_dpr = _mk_dpr(client, proj, hdr, [("Sand", 25.0, "cft")])
    assert r_dpr.status_code == 201, r_dpr.text
    dpr_id = r_dpr.json()["id"]

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 75.0
    assert float(inv.reserved_qty) == 15.0
    available = float(inv.on_hand_qty) - float(inv.reserved_qty)
    assert available == 60.0  # (75 - 15)

    # DPR reversal (deletion): on_hand restored to 100, reserved re-reserved back to 40
    r_del = client.delete(f"/apis/v3/dpr/{dpr_id}", headers=hdr)
    assert r_del.status_code == 204, r_del.text

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 100.0
    assert float(inv.reserved_qty) == 40.0


# -----------------------------------------------------------------------------
# 5. Invariants (reserved_qty >= 0, reserved_qty <= on_hand_qty, idempotency)
# -----------------------------------------------------------------------------

def test_invariant_reserved_qty_never_negative_on_overconsumption(client, db, make_tenant, auth_headers):
    """Consuming more than reserved quantity caps release and never drives reserved negative."""
    comp, user, _ = make_tenant(company_name="InvNeg Co", user_name="InvNeg User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "InvNeg Proj")

    inv = _mk_inventory(db, proj, "Paint", on_hand=100.0, reserved=0.0, unit="liters")

    # Reserve 10 liters
    indent = _mk_indent(client, comp, proj, hdr, [("Paint", 10.0, "liters")])
    _approve_indent(client, hdr, indent["id"])

    db.refresh(inv)
    assert float(inv.reserved_qty) == 10.0

    # Consume 30 liters (more than the 10 reserved)
    r_dpr = _mk_dpr(client, proj, hdr, [("Paint", 30.0, "liters")])
    assert r_dpr.status_code == 201, r_dpr.text

    db.refresh(inv)
    assert float(inv.on_hand_qty) == 70.0
    assert float(inv.reserved_qty) == 0.0  # Floored at 0, not negative -20


def test_invariant_double_approve_blocked_idempotent(client, db, make_tenant, auth_headers):
    """Approving an already approved indent is rejected (status must be pending) and does not double-reserve."""
    comp, user, _ = make_tenant(company_name="Idem Co", user_name="Idem User")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "Idem Proj")

    inv = _mk_inventory(db, proj, "Aggregate", on_hand=100.0, reserved=0.0, unit="tons")

    indent = _mk_indent(client, comp, proj, hdr, [("Aggregate", 20.0, "tons")])
    r1 = _approve_indent(client, hdr, indent["id"])
    assert r1.status_code == 200

    db.refresh(inv)
    assert float(inv.reserved_qty) == 20.0

    # Second approve attempt
    r2 = _approve_indent(client, hdr, indent["id"])
    assert r2.status_code == 400
    assert "Only pending indents can be approved" in r2.text

    db.refresh(inv)
    assert float(inv.reserved_qty) == 20.0  # Still 20, no double reservation
