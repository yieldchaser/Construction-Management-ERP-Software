"""R2-605 - the rejection path actually rejects.

POST /procurement/pos/{id}/reject used to change nothing: it never set
approval_flag, never committed, and returned None against a declared
POResponse (so the flushed ApprovalAction rolled back with the session).
It must now persist approval_flag="rejected" and refuse a second rejection.
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


def _mk_po(client, comp, project, hdr):
    r = client.post(
        "/apis/v3/procurement/pos",
        json={
            "company_id": str(comp.id), "project_id": str(project.id),
            "po_number": f"PO-{uuid.uuid4().hex[:8]}",
            "po_date": datetime.datetime.now().isoformat(),
            "items": [{"material_name": "Cement OPC53", "quantity": 10.0, "unit": "bag", "rate": 400.0}],
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _reject(client, po_id, hdr):
    return client.post(f"/apis/v3/procurement/pos/{po_id}/reject", headers=hdr)


def test_reject_persists_and_double_reject_is_refused(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R605A", user_name="U605A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "A")
    po = _mk_po(client, comp, project, hdr)

    # Before: fresh PO is pending.
    assert po["approval_flag"] in ("pending", "pending_approval")

    r1 = _reject(client, po["id"], hdr)
    assert r1.status_code == 200, r1.text
    body = r1.json()
    assert body["approval_flag"] == "rejected"
    # It survives the request: read back from the database.
    db.expire_all()
    row = db.query(models.PurchaseOrder).filter_by(id=uuid.UUID(po["id"])).first()
    assert row is not None
    assert row.approval_flag == "rejected"

    # Double reject: refused sanely, flag unchanged.
    r2 = _reject(client, po["id"], hdr)
    assert r2.status_code == 400, r2.text
    assert "already rejected" in r2.json()["detail"]
    db.expire_all()
    row = db.query(models.PurchaseOrder).filter_by(id=uuid.UUID(po["id"])).first()
    assert row.approval_flag == "rejected"
    assert (
        db.query(models.ApprovalAction).filter_by(entity_type="purchase_order", entity_id=row.id).count() <= 1
    )
