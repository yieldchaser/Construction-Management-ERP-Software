"""R2-539 — match approve/reject record the authenticated actor and a timestamp.

Gate: PATCH /three-way/{id}/approve must ignore any approved_by query parameter
and stamp matched_by with the session user; reject must also write matched_by
and matched_at. Before the fix the approver was a query parameter that defaulted
to nobody, and a rejection recorded no actor or time at all.
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


def _mk_match(db, comp, project, po_total=60000, invoiced=60000):
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_number=f"PO-R539-{uuid.uuid4().hex[:8]}", po_date=datetime.datetime(2026, 1, 5),
        total_amount=po_total,
    )
    grn = models.GoodsReceiptNote(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id, po_id=po.id,
        grn_number=f"GRN-R539-{uuid.uuid4().hex[:8]}", received_date=datetime.datetime(2026, 1, 6),
    )
    db.add_all([po, grn])
    db.flush()
    m = models.ThreeWayMatch(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        po_id=po.id, grn_id=grn.id, match_status="pending",
        po_amount=po_total, grn_qty=0, invoiced_amount=invoiced,
        variance_amount=invoiced - po_total,
    )
    db.add(m)
    db.commit()
    return m


def test_approve_ignores_supplied_approved_by_and_stamps_session_user(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R539A", user_name="U539A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    m = _mk_match(db, comp, project)

    impostor = str(uuid.uuid4())
    r = client.patch(f"/apis/v3/three-way/{m.id}/approve?approved_by={impostor}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["match_status"] == "approved"
    assert body["matched_by"] == str(user.id), body
    assert body["matched_by"] != impostor
    assert body["matched_at"], body


def test_reject_records_actor_and_time(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R539B", user_name="U539B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    m = _mk_match(db, comp, project)

    r = client.patch(f"/apis/v3/three-way/{m.id}/reject?reason=price%20dispute", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["match_status"] == "rejected"
    assert body["matched_by"] == str(user.id), body
    assert body["matched_at"], body
