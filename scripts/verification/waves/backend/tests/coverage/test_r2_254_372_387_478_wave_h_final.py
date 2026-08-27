"""Wave H-final behavior tests - R2-254 / R2-372 / R2-387 / R2-478 / R2-488.

R2-254: a production batch consumes stock exactly like manual usage and the
DPR do, so an armed negative_stock_lock must gate every batch consumption
site (create-time completed, deferred complete) BEFORE any row is written.

R2-372: a PO raised from an indent carries the link, may only come off an
APPROVED indent (ordering flips it to "ordered", so one approval can never
fund a second PO), and may never exceed the approved quantity per material.

R2-387: stock is correctable through type="adjustment" movements with a
mandatory reason; adjustments are excluded from received/consumed aggregates
so consumption analytics stay truthful while current_stock includes them.

R2-478: Settings -> Material Purchase Order Restriction finally reads:
with the control armed, direct unlinked PO creation is refused and POs must
come off an approved indent. (weekly_off_days / back_dated_limit_days are
evidence-closed in the register - payroll reads the former, Entry Controls
enforce the capability the latter advertised.)

R2-488: the Material screen's headline tiles render a per-unit breakdown
from the /procurement/stock rows instead of summing bags + tonnes + cft;
the rows themselves must keep carrying the unit that makes that possible.
"""
import datetime
import uuid

from app import models


def _sfx():
    return uuid.uuid4().hex[:8]


def _tenant(db, make_tenant, auth_headers, tag):
    sfx = _sfx()
    comp, user, _team = make_tenant(
        company_name=f"{tag}-{sfx}", user_name=f"U{sfx}", email=f"{tag}-{sfx}@t.com",
    )
    return comp, auth_headers(user, comp)


def _project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"P-{_sfx()}", code=f"PRJ-{_sfx()}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _stock(db, project, name, qty, unit="bag"):
    db.add(models.WarehouseInventory(
        id=uuid.uuid4(), project_id=project.id, material_name=name,
        on_hand_qty=qty, reserved_qty=0.0, unit=unit,
    ))
    db.commit()


def _stock_rows(client, project, hdr):
    r = client.get(f"/apis/v3/procurement/stock?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    return {row["material_name"]: row for row in r.json()}


# ─── R2-254: negative_stock_lock gates production batch consumption ──────────


def _recipe(client, comp, project, hdr, material):
    r = client.post(
        "/apis/v3/production/recipes",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "recipe_code": f"RC-{_sfx()}", "product_name": "Slab", "mix_type": "M25",
            "unit": "m3", "target_output_qty": 1.0, "wastage_pct": 0,
            "materials": [{"material_name": material, "planned_qty": 10.0, "unit": "bag"}],
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _batch(client, comp, project, hdr, recipe_id, status, actual_qty):
    r = client.post(
        "/apis/v3/production/batches",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "recipe_id": recipe_id, "batch_number": f"B-{_sfx()}",
            "status": status,
            "materials": [{"material_name": "ZZ Cement R254", "actual_qty": actual_qty, "unit": "bag"}],
        },
        headers=hdr,
    )
    return r


def test_batch_consumption_blocked_by_negative_stock_lock_at_create(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R254a")
    project = _project(db, comp)
    _stock(db, project, "ZZ Cement R254", 100.0)
    comp.negative_stock_lock = True
    db.commit()
    recipe = _recipe(client, comp, project, hdr, "ZZ Cement R254")

    # 9999 bags against 100 on hand: refused before any row is written.
    r = _batch(client, comp, project, hdr, recipe["id"], "completed", 9999)
    assert r.status_code == 400, r.text
    assert "insufficient stock" in r.json()["detail"], r.text
    assert "Restrict Material Usage" in r.json()["detail"], r.text

    txns = db.query(models.MaterialTransaction).filter(
        models.MaterialTransaction.project_id == project.id,
        models.MaterialTransaction.type == "used",
    ).all()
    assert txns == [], "blocked batch must write zero consumption rows"
    inv = db.query(models.WarehouseInventory).filter(
        models.WarehouseInventory.project_id == project.id,
        models.WarehouseInventory.material_name == "ZZ Cement R254",
    ).first()
    assert float(inv.on_hand_qty) == 100.0, "inventory row untouched by blocked batch"


def test_deferred_complete_path_blocked_too_and_lock_off_still_allows(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R254b")
    project = _project(db, comp)
    _stock(db, project, "ZZ Cement R254", 100.0)

    # Lock OFF (default): over-consumption still allowed - the lock is opt-in.
    recipe = _recipe(client, comp, project, hdr, "ZZ Cement R254")
    r = _batch(client, comp, project, hdr, recipe["id"], "running", 9999)
    assert r.status_code == 201, r.text
    batch_id = r.json()["id"]
    r = client.patch(f"/apis/v3/production/batches/{batch_id}/complete", headers=hdr)
    assert r.status_code == 200, r.text
    rows = _stock_rows(client, project, hdr)["ZZ Cement R254"]
    # Ledger view: nothing was ever received, so the batch's consumption takes
    # current stock straight to -9999 while the lock is off.
    assert rows["consumed"] == 9999.0 and rows["current_stock"] == -9999.0, rows

    # Lock ON: the same deferred completion is refused.
    comp.negative_stock_lock = True
    db.commit()
    recipe2 = _recipe(client, comp, project, hdr, "ZZ Cement R254")
    r = _batch(client, comp, project, hdr, recipe2["id"], "running", 5000)
    assert r.status_code == 201, r.text
    r = client.patch(f"/apis/v3/production/batches/{r.json()['id']}/complete", headers=hdr)
    assert r.status_code == 400, r.text
    assert "insufficient stock" in r.json()["detail"], r.text


# ─── R2-372: approved indent constrains the PO raised from it ────────────────


def _indent(db, comp, project, status="approved", qty=100.0):
    ind = models.MaterialIndent(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        requested_by=None, indent_number=f"IND-{_sfx()}", status=status,
    )
    db.add(ind)
    db.flush()
    db.add(models.MaterialIndentItem(
        id=uuid.uuid4(), indent_id=ind.id, material_name="ZZ Steel R372",
        quantity=qty, unit="kg",
    ))
    db.commit()
    return ind


def _po_body(comp, project, indent_id=None):
    body = {
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_number": f"PO-R372-{_sfx()}",
        "po_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "items": [{"material_name": "ZZ Steel R372", "quantity": 100, "unit": "kg", "rate": 10, "tax_pct": 0}],
    }
    if indent_id is not None:
        body["indent_id"] = str(indent_id)
    return body


def test_po_from_approved_indent_links_caps_and_marks_ordered(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R372a")
    project = _project(db, comp)
    ind = _indent(db, comp, project, status="approved", qty=100.0)

    r = client.post("/apis/v3/procurement/pos", json=_po_body(comp, project, ind.id), headers=hdr)
    assert r.status_code == 201, r.text
    assert r.json()["indent_id"] == str(ind.id), r.text
    db.refresh(ind)
    assert ind.status == "ordered", "approved indent must be consumed by the PO"

    # One approval can never fund a second PO.
    r = client.post("/apis/v3/procurement/pos", json=_po_body(comp, project, ind.id), headers=hdr)
    assert r.status_code == 422, r.text
    assert "ordered" in r.json()["detail"], r.text


def test_po_rejected_beyond_indent_quantity_or_nonapproved_indent(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R372b")
    project = _project(db, comp)
    ind = _indent(db, comp, project, status="approved", qty=100.0)

    body = _po_body(comp, project, ind.id)
    body["items"][0]["quantity"] = 150
    r = client.post("/apis/v3/procurement/pos", json=body, headers=hdr)
    assert r.status_code == 422, r.text
    assert "ZZ Steel R372" in r.json()["detail"] and "150" in r.json()["detail"], r.text

    # A pending approval authorises nothing.
    pending = _indent(db, comp, project, status="pending")
    r = client.post("/apis/v3/procurement/pos", json=_po_body(comp, project, pending.id), headers=hdr)
    assert r.status_code == 422, r.text
    assert "approved indent" in r.json()["detail"], r.text

    # Cross-project indent links are refused.
    other = _project(db, comp)
    stray = _indent(db, comp, other)
    r = client.post("/apis/v3/procurement/pos", json=_po_body(comp, project, stray.id), headers=hdr)
    assert r.status_code == 403, r.text


def test_unlinked_po_legacy_behaviour_unchanged(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R372c")
    project = _project(db, comp)
    r = client.post("/apis/v3/procurement/pos", json=_po_body(comp, project), headers=hdr)
    assert r.status_code == 201, r.text
    assert r.json()["indent_id"] is None, r.text


# ─── R2-387: adjustments restate stock without corrupting consumption ─────────


def _movement(client, project, hdr, mtype, qty, reason=None, name="ZZ Sand R387"):
    body = {
        "project_id": str(project.id), "material_name": name,
        "type": mtype, "qty": qty, "category": "Civil", "unit": "cft",
    }
    if reason is not None:
        body["reason"] = reason
    return client.post("/apis/v3/procurement/transactions", json=body, headers=hdr)


def test_adjustment_requires_reason_and_restates_stock_without_touching_received_or_consumed(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R387a")
    project = _project(db, comp)
    assert _movement(client, project, hdr, "received", 300).status_code == 201
    assert _movement(client, project, hdr, "used", 50).status_code == 201

    # No reason, no adjustment.
    r = _movement(client, project, hdr, "adjustment", -30)
    assert r.status_code == 422, r.text
    assert "reason" in r.json()["detail"], r.text
    r = _movement(client, project, hdr, "adjustment", 0, reason="zero delta")
    assert r.status_code == 422, r.text

    r = _movement(client, project, hdr, "adjustment", -330, reason="physical count correction")
    assert r.status_code == 201, r.text
    assert r.json()["reason"] == "physical count correction", r.text

    rows = _stock_rows(client, project, hdr)
    row = rows["ZZ Sand R387"]
    assert row["received"] == 300.0 and row["consumed"] == 50.0, row
    assert row["adjusted"] == -330.0, row
    assert row["current_stock"] == 300.0 - 50.0 - 330.0, row

    # The ledger keeps the signed correction visible with its reason.
    r = client.get(f"/apis/v3/procurement/transactions?project_id={project.id}", headers=hdr)
    adj = [t for t in r.json() if t["type"] == "adjustment"]
    assert len(adj) == 1 and adj[0]["reason"] == "physical count correction", r.text


def test_negative_write_off_repairs_stock_and_used_still_rejects_negative_qty(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R387b")
    project = _project(db, comp)
    _stock(db, project, "ZZ Phantom R387", -9699.0, unit="tonne")

    # The audit's own -9,699 tonne repair path: one reasoned adjustment.
    r = _movement(client, project, hdr, "adjustment", 9699, reason="negative-stock repair", name="ZZ Phantom R387")
    assert r.status_code == 201, r.text
    inv = db.query(models.WarehouseInventory).filter(
        models.WarehouseInventory.project_id == project.id,
        models.WarehouseInventory.material_name == "ZZ Phantom R387",
    ).first()
    assert float(inv.on_hand_qty) == 0.0, float(inv.on_hand_qty)

    # Ordinary types keep the positive-qty contract.
    r = _movement(client, project, hdr, "used", -5)
    assert r.status_code == 422, r.text


# ─── R2-478: po_restriction finally gates purchase order creation ────────────


def test_po_restriction_forces_indent_backed_purchase(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R478")
    project = _project(db, comp)
    comp.po_restriction = True
    db.commit()

    # Direct unlinked PO creation is refused under the control.
    r = client.post("/apis/v3/procurement/pos", json=_po_body(comp, project), headers=hdr)
    assert r.status_code == 403, r.text
    assert "Material Purchase Order Restriction" in r.json()["detail"], r.text

    # The requisitioned flow stays open.
    ind = _indent(db, comp, project, status="approved")
    r = client.post("/apis/v3/procurement/pos", json=_po_body(comp, project, ind.id), headers=hdr)
    assert r.status_code == 201, r.text


# ─── R2-488: /stock rows carry units so headlines can break down per unit ────


def test_stock_rows_carry_unit_for_per_unit_headline_breakdown(db, client, make_tenant, auth_headers):
    comp, hdr = _tenant(db, make_tenant, auth_headers, "R488")
    project = _project(db, comp)
    hdr2 = {"Content-Type": "application/json", **hdr}
    r1 = client.post("/apis/v3/procurement/transactions", headers=hdr2, json={
        "project_id": str(project.id), "material_name": "Cement",
        "type": "received", "qty": 100, "unit": "bag",
    })
    assert r1.status_code == 201, r1.text
    r2 = client.post("/apis/v3/procurement/transactions", headers=hdr2, json={
        "project_id": str(project.id), "material_name": "Steel",
        "type": "received", "qty": 10000, "unit": "tonne",
    })
    assert r2.status_code == 201, r2.text

    rows = _stock_rows(client, project, hdr)
    # Two materials whose quantities must NEVER be summed into one headline:
    # each row carries its own unit so the screen can print 100 bags and
    # 10,000 tonne separately instead of 10,100 of anything.
    assert rows["Cement"]["unit"] == "bag" and rows["Cement"]["received"] == 100.0, rows
    assert rows["Steel"]["unit"] == "tonne" and rows["Steel"]["received"] == 10000.0, rows
