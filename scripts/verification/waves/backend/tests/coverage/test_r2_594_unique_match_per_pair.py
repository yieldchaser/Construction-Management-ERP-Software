"""R2-594 — one three-way match per PO/GRN pair, and the linked match must agree with the bill.

Gate: creating a second match for the same PO/GRN pair returns 409, and
linking a bill to an approved match whose invoiced amount differs from the
bill's total_payable returns 400. Before the fix one pair could hold unlimited
contradictory verdicts and a bill could link to whichever was approved.
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


def _mk_po_grn(db, comp, project, total):
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number=f"PO-R594-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 1, 5),
        total_amount=total,
    )
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R594-{uuid.uuid4().hex[:8]}", received_date=datetime.datetime(2026, 1, 6),
    )
    db.add_all([po, grn])
    db.commit()
    return po, grn


def _mk_bill(db, comp, team, project, payable):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R594-{uuid.uuid4().hex[:8]}",
        invoice_date=datetime.datetime(2026, 1, 10), invoice_type="purchase",
        subtotal=payable, total_payable=payable,
    )
    db.add(b)
    db.commit()
    return b


def _create_match(client, hdr, comp, project, po, grn, bill):
    return client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
    })


def test_second_match_for_same_pair_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R594A", user_name="U594A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, grn = _mk_po_grn(db, comp, project, 60000)
    bill = _mk_bill(db, comp, team, project, 60000)

    r1 = _create_match(client, hdr, comp, project, po, grn, bill)
    assert r1.status_code == 201, r1.text

    r2 = _create_match(client, hdr, comp, project, po, grn, bill)
    assert r2.status_code == 409, r2.text
    assert "PO/GRN" in r2.json()["detail"], r2.text


def test_bill_cannot_link_to_match_disagreeing_on_amount(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R594B", user_name="U594B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, grn = _mk_po_grn(db, comp, project, 60000)

    # Match reconciles a bill of 60,000; the target bill claims 75,000.
    match_bill = _mk_bill(db, comp, team, project, 60000)
    r = _create_match(client, hdr, comp, project, po, grn, match_bill)
    assert r.status_code == 201, r.text
    match_id = r.json()["id"]

    appr = client.patch(f"/apis/v3/three-way/{match_id}/approve", headers=hdr)
    assert appr.status_code == 200, appr.text

    other_bill = _mk_bill(db, comp, team, project, 75000)
    link = client.patch(f"/apis/v3/billing/bills/{other_bill.id}/match", headers=hdr,
                        json={"match_id": match_id})
    assert link.status_code == 400, link.text
    assert "does not agree" in link.json()["detail"], link.text

    # A bill for the same figure still links cleanly.
    agree_bill = _mk_bill(db, comp, team, project, 60000)
    ok = client.patch(f"/apis/v3/billing/bills/{agree_bill.id}/match", headers=hdr,
                      json={"match_id": match_id})
    assert ok.status_code == 200, ok.text
