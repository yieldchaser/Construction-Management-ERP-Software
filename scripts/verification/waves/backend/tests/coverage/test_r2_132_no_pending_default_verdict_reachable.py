"""R2-132 — every match was created as "pending"; the matched/mismatch
classification was unreachable because ThreeWayMatchCreate defaulted
match_status to the truthy string "pending", so the ternary never reached
the computed branch and matched_at stayed None forever.

Evidence-close: the field was removed from the create payload entirely (the
stronger of the two fixes the finding prescribes), so a normal payload that
sends no status key at all gets the server verdict derived from the variance,
and matched_at is stamped on a matched row.
"""
import datetime
import uuid

from app import models
from app.routers.three_way import ThreeWayMatchCreate


def test_create_schema_carries_no_match_status_field():
    # The defect lived in this exact default: `match_status: str = "pending"`
    # made the computed classification dead code under every normal call.
    assert "match_status" not in ThreeWayMatchCreate.model_fields


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
        po_number=f"PO-R132-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 2, 5),
        total_amount=total,
    )
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R132-{uuid.uuid4().hex[:8]}", received_date=datetime.datetime(2026, 2, 6),
    )
    db.add_all([po, grn])
    db.commit()
    return po, grn


def _mk_bill(db, comp, project, team, total_payable):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-R132-{uuid.uuid4().hex[:8]}",
        invoice_date=datetime.datetime(2026, 2, 7),
        invoice_type="purchase", subtotal=total_payable, total_payable=total_payable,
    )
    db.add(bill)
    db.commit()
    return bill


def test_plain_payload_without_any_status_key_classifies_matched(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R132A", user_name="U132A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)
    po, grn = _mk_po_grn(db, comp, project, total=60000)
    bill = _mk_bill(db, comp, project, team, total_payable=60000)

    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
    })
    assert r.status_code == 201, r.text
    body = r.json()
    # No status key was sent: the zero-variance verdict is computed anyway...
    assert body["match_status"] == "matched", body
    # ...and the knock-on fires: matched_at is no longer permanently None.
    assert body["matched_at"] is not None


def test_plain_payload_beyond_tolerance_classifies_mismatch(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R132B", user_name="U132B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 2)
    po, grn = _mk_po_grn(db, comp, project, total=60000)
    bill = _mk_bill(db, comp, project, team, total_payable=66000)

    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
    })
    assert r.status_code == 201, r.text
    body = r.json()
    # A Rs 6,000 variance against a Rs 60,000 baseline (tolerance Rs 600)
    # lands on the mismatch branch: the classification discriminates.
    assert body["variance_amount"] == 6000.0, body
    assert body["match_status"] == "mismatch", body
    assert body["matched_at"] is None
