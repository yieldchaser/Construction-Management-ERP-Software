"""R2-133 — both integrity halves of the three-way verdict are server-owned.

Half 1 (the verdict): match_status was read from the create payload, so a
client could post "matched" on an invoice with any variance. Half 2 (the
actor): matched_by came from the payload, and the approval endpoint took
approved_by as a query parameter while the authenticated current_user was
used only for the permission check and then discarded, so an approval could
be attributed to a colleague or to nobody.

Evidence-close: half 1 landed with R2-241 (5c73713) - the fields no longer
exist on ThreeWayMatchCreate and the verdict is derived from the variance;
half 2 landed with R2-539 (a76823c) - approve/reject stamp the session user.
This pin replays the combined attack end to end: a smuggled verdict on a
real variance still lands mismatch with no caller-chosen actor, and an
approval carrying ?approved_by=<colleague> records the session user.
"""
import datetime
import inspect
import uuid

from app import models
from app.routers.three_way import ThreeWayMatchCreate, approve_match


def test_create_schema_carries_no_verdict_or_actor_field():
    # The two payload fields the finding names were deleted outright.
    assert "match_status" not in ThreeWayMatchCreate.model_fields
    assert "matched_by" not in ThreeWayMatchCreate.model_fields


def test_approve_endpoint_takes_no_approved_by_parameter():
    # Half 2 structurally: the query parameter is gone from the signature,
    # so there is nothing left to impersonate an approver through.
    assert "approved_by" not in inspect.signature(approve_match).parameters


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
        po_number=f"PO-R133-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 3, 5),
        total_amount=total,
    )
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R133-{uuid.uuid4().hex[:8]}", received_date=datetime.datetime(2026, 3, 6),
    )
    db.add_all([po, grn])
    db.commit()
    return po, grn


def _mk_bill(db, comp, project, team, total_payable):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-R133-{uuid.uuid4().hex[:8]}",
        invoice_date=datetime.datetime(2026, 3, 7),
        invoice_type="purchase", subtotal=total_payable, total_payable=total_payable,
    )
    db.add(bill)
    db.commit()
    return bill


def test_combined_attack_smuggled_verdict_and_impersonated_approver(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R133A", user_name="U133A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    po, grn = _mk_po_grn(db, comp, project, total=60000)
    bill = _mk_bill(db, comp, project, team, total_payable=66000)

    colleague = str(uuid.uuid4())
    r = client.post("/apis/v3/three-way", headers=hdr, json={
        "company_id": str(comp.id), "project_id": str(project.id),
        "po_id": str(po.id), "grn_id": str(grn.id),
        "invoice_id": str(bill.id),
        "match_status": "matched",
        "matched_by": colleague,
    })
    assert r.status_code == 201, r.text
    body = r.json()
    # Half 1: the smuggled verdict is ignored; the Rs 6,000 variance speaks.
    assert body["variance_amount"] == 6000.0
    assert body["match_status"] == "mismatch", body
    # No caller-chosen actor was recorded at creation time either.
    assert body["matched_by"] != colleague

    approve = client.patch(f"/apis/v3/three-way/{body['id']}/approve?approved_by={colleague}", headers=hdr)
    assert approve.status_code == 200, approve.text
    approved = approve.json()
    # Half 2: the stored approver is the session user, never the query string.
    assert approved["match_status"] == "approved"
    assert approved["matched_by"] == str(user.id), approved
    assert approved["matched_by"] != colleague
    assert approved["matched_at"]
