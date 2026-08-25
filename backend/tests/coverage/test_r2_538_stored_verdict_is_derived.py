"""R2-538 — the stored verdict is always the one the server derived.

The router computed the variance correctly and then accepted
payload.match_status over it, so live data held a record asserting "matched"
against a Rs 7,17,777 variance; matched_by was caller-chosen too. The
prescribed fix was to delete match_status and matched_by from
ThreeWayMatchCreate, which landed with R2-241 (5c73713).

Evidence-close: this pin asserts the create schema no longer carries either
field, and replays the exact live-data exploit - an invoice of Rs 7,77,777
against goods worth Rs 60,000 posted with match_status "matched" - checking
the persisted row itself, not just the response envelope.
"""
import datetime
import uuid

from app import models
from app.routers.three_way import ThreeWayMatchCreate


def test_create_schema_carries_neither_verdict_nor_actor():
    assert "match_status" not in ThreeWayMatchCreate.model_fields
    assert "matched_by" not in ThreeWayMatchCreate.model_fields


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
        po_number=f"PO-R538-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 5, 5),
        total_amount=total,
    )
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R538-{uuid.uuid4().hex[:8]}", received_date=datetime.datetime(2026, 5, 6),
    )
    db.add_all([po, grn])
    db.commit()
    return po, grn


def _mk_bill(db, comp, project, team, total_payable):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-R538-{uuid.uuid4().hex[:8]}",
        invoice_date=datetime.datetime(2026, 5, 7),
        invoice_type="purchase", subtotal=total_payable, total_payable=total_payable,
    )
    db.add(bill)
    db.commit()
    return bill


def test_seven_lakh_variance_declared_matched_stores_mismatch(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R538A", user_name="U538A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, grn = _mk_po_grn(db, comp, project, total=60000)
    bill = _mk_bill(db, comp, project, team, total_payable=777777)

    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
        "match_status": "matched",
        "matched_by": str(user.id),
    })
    assert r.status_code == 201, r.text

    # Read the record back from storage: what persists is the derived verdict,
    # not the string the caller asked for.
    db.expire_all()
    row = db.query(models.ThreeWayMatch).filter(
        models.ThreeWayMatch.po_id == str(po.id),
        models.ThreeWayMatch.grn_id == str(grn.id),
    ).one()
    assert float(row.variance_amount) == 717777.0, row.__dict__
    assert row.match_status == "mismatch", row.__dict__
