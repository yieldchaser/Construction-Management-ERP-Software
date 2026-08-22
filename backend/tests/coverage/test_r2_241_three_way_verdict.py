"""R2-241 — the three-way match verdict is server-computed, never caller-supplied.

Gate: POST /three-way must ignore any match_status in the request body and store
the verdict derived from the variance. Before the fix the caller's value always
won (a ₹717,777 variance was stored as "matched" on request).

R2-349 follow-up: the reconciled figure is the identified bill's stored
total_payable, so every payload carries invoice_id and any caller-typed
invoiced_amount/match_status/matched_by is ignored.
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


def _mk_po_grn(db, comp, project, total):
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number=f"PO-R241-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 1, 5),
        total_amount=total,
    )
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R241-{uuid.uuid4().hex[:8]}", received_date=datetime.datetime(2026, 1, 6),
    )
    db.add_all([po, grn])
    db.commit()
    return po, grn


def _mk_bill(db, comp, project, team, total_payable):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-R241-{uuid.uuid4().hex[:8]}",
        invoice_date=datetime.datetime(2026, 1, 7),
        invoice_type="purchase", subtotal=total_payable, total_payable=total_payable,
    )
    db.add(bill)
    db.commit()
    return bill


def test_caller_cannot_declare_matched_on_huge_variance(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R241A", user_name="U241A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)
    po, grn = _mk_po_grn(db, comp, project, total=60000)
    bill = _mk_bill(db, comp, project, team, total_payable=777777)

    # Caller sends match_status "matched" on a ₹717,777 discrepancy. R2-241:
    # the verdict is server-computed; R2-349: the invoiced figure is the bill's
    # stored total_payable, so the typed invoiced_amount/matched_by are ignored.
    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
        "invoiced_amount": 1,
        "match_status": "matched",
        "matched_by": str(user.id),
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["variance_amount"] == 717777.0
    assert body["match_status"] == "mismatch", body
    assert body["invoiced_amount"] == 777777.0
    assert body["matched_by"] is None


def test_perfect_match_auto_classifies_matched(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R241B", user_name="U241B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 2)
    po, grn = _mk_po_grn(db, comp, project, total=60000)
    bill = _mk_bill(db, comp, project, team, total_payable=60000)

    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
        "match_status": "pending",
    })
    assert r.status_code == 201, r.text
    body = r.json()
    # The caller's "pending" is ignored: the zero-variance verdict is computed.
    assert body["match_status"] == "matched", body
    assert body["matched_at"] is not None
    assert str(body["matched_by"]) == str(user.id)
