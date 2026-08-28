"""R2-240 — the baseline can no longer be inflated by over-receiving, and
both baseline branches sit on one explicit tax basis.

The finding proved live: a PO worth Rs 47,200 (100 bags @ Rs 400 + 18% GST),
150 bags received, invoice Rs 60,000 -> {"po_amount": 60000, "variance": 0}.
Because received_qty was unbounded, the field named po_amount was really
received_qty x rate, so inflating the receipt inflated what a vendor could
over-bill into a "match". A second defect put the two branches on different
tax bases: the GRN branch was exclusive of tax while the whole-PO fallback
used the tax-inclusive total_amount.

Fix under test: each GRN line counts only min(received_qty, quantity still
authorised after every earlier GRN on this PO) x rate x (1 + line tax%), and
the response surfaces ordered_qty, received_qty and po_total next to the
computed po_amount so an approver sees all three numbers.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_po_with_line(db, comp, project, ordered_qty, rate, tax_pct="18.00"):
    # Mirrors the audit scenario: 100 bags @ Rs 400, PO total Rs 47,200 incl GST.
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number=f"PO-R240-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 4, 5),
        gross_amount=float(ordered_qty) * rate, tax_amount=float(ordered_qty) * rate * 0.18,
        total_amount=float(ordered_qty) * rate * 1.18,
    )
    item = models.PurchaseOrderItem(
        id=uuid.uuid4(), po_id=po.id, material_name=f"Bags-{uuid.uuid4().hex[:6]}",
        quantity=ordered_qty, unit="bag", rate=rate, tax_pct=tax_pct,
        total_amount=float(ordered_qty) * rate,
    )
    db.add_all([po, item])
    db.commit()
    return po, item


def _mk_grn_with_receipt(db, comp, project, po, po_item, received_qty, tag):
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R240-{tag}-{uuid.uuid4().hex[:6]}", received_date=datetime.datetime(2026, 4, 6),
    )
    db.add(grn)
    db.flush()
    db.add(models.GRNItem(id=uuid.uuid4(), grn_id=grn.id, po_item_id=po_item.id, received_qty=received_qty))
    db.commit()
    return grn


def _mk_bill(db, comp, project, team, total_payable, tag):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-R240-{tag}-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime.datetime(2026, 4, 7),
        invoice_type="purchase", subtotal=total_payable, total_payable=total_payable,
    )
    db.add(bill)
    db.commit()
    return bill


def _create_match(client, hdr, comp, project, po, grn, bill):
    return client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
    })


def test_audit_exploit_over_receipt_no_longer_inflates_the_baseline(client, db, make_tenant, auth_headers):
    # The exact proved-live record: PO Rs 47,200, receipt 150/100, bill Rs 60,000.
    comp, user, team = make_tenant(company_name="R240A", user_name="U240A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, item = _mk_po_with_line(db, comp, project, ordered_qty=100, rate=400.0)
    grn = _mk_grn_with_receipt(db, comp, project, po, item, received_qty=150, tag="A")
    bill = _mk_bill(db, comp, project, team, total_payable=60000, tag="A")

    r = _create_match(client, hdr, comp, project, po, grn, bill)
    assert r.status_code == 201, r.text
    body = r.json()
    # Baseline is capped at the authorised 100 bags x Rs 400 + 18% = Rs 47,200;
    # before the fix po_amount read Rs 60,000 with variance exactly zero.
    assert abs(body["po_amount"] - 47200.0) < 0.01, body
    assert abs(body["variance_amount"] - 12800.0) < 0.01, body
    assert body["match_status"] == "mismatch", body
    # All three numbers behind the verdict are visible to the approver.
    assert body["ordered_qty"] == 100.0
    assert body["received_qty"] == 150.0
    assert body["po_total"] == 47200.0


def test_legitimate_partial_delivery_still_matches(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R240B", user_name="U240B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, item = _mk_po_with_line(db, comp, project, ordered_qty=100, rate=400.0)
    grn = _mk_grn_with_receipt(db, comp, project, po, item, received_qty=40, tag="B")
    bill = _mk_bill(db, comp, project, team, total_payable=40 * 400.0 * 1.18, tag="B")

    r = _create_match(client, hdr, comp, project, po, grn, bill)
    assert r.status_code == 201, r.text
    body = r.json()
    # An honest phase delivery invoiced at its own value is not a false mismatch.
    assert abs(body["po_amount"] - 18880.0) < 0.01, body
    assert abs(body["variance_amount"]) < 0.01, body
    assert body["match_status"] == "matched", body


def test_cumulative_grns_cannot_re_authorise_exhausted_quantities(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R240C", user_name="U240C")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, item = _mk_po_with_line(db, comp, project, ordered_qty=100, rate=400.0)

    grn1 = _mk_grn_with_receipt(db, comp, project, po, item, received_qty=150, tag="C1")
    bill1 = _mk_bill(db, comp, project, team, total_payable=60000, tag="C1")
    first = _create_match(client, hdr, comp, project, po, grn1, bill1)
    assert first.status_code == 201, first.text

    # A second GRN on the same PO receives another 50 against an order that is
    # already exhausted by the first receipt's authorised portion.
    grn2 = _mk_grn_with_receipt(db, comp, project, po, item, received_qty=50, tag="C2")
    bill2 = _mk_bill(db, comp, project, team, total_payable=5000, tag="C2")
    second = _create_match(client, hdr, comp, project, po, grn2, bill2)
    assert second.status_code == 201, second.text
    body = second.json()
    # Prior receipts consumed the whole authorised quantity, so this GRN's
    # baseline contribution is zero instead of re-counting the order.
    assert body["po_amount"] == 0.0, body
    assert body["match_status"] == "mismatch", body
    assert body["received_qty"] == 50.0
    assert body["ordered_qty"] == 100.0


def test_listing_surfaces_ordered_received_and_po_total_per_match(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R240D", user_name="U240D")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, item = _mk_po_with_line(db, comp, project, ordered_qty=100, rate=400.0)
    grn = _mk_grn_with_receipt(db, comp, project, po, item, received_qty=150, tag="D")
    bill = _mk_bill(db, comp, project, team, total_payable=60000, tag="D")
    created = _create_match(client, hdr, comp, project, po, grn, bill)
    assert created.status_code == 201, created.text

    r = client.get(f"/apis/v3/three-way/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    row = next(m for m in r.json() if m["id"] == created.json()["id"])
    assert row["ordered_qty"] == 100.0, row
    assert row["received_qty"] == 150.0, row
    assert row["po_total"] == 47200.0, row
