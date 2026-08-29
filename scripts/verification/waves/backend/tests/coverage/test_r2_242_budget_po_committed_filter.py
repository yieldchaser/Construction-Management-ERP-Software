"""R2-242 — Budget committed cost counts only live purchase orders.

Gate: get_committed_costs summed every PO except status == "closed", so a
draft PO that was never sent or approved booked committed spend the moment it
was typed (live repro: a fresh draft showed material_committed 47200). The
whitelist landed with R2-154 (bd41ec7) pins this: only sent, partial and
received POs count toward material_committed; draft, closed and rejected
purchase orders are excluded.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r242-{t}-{_SUFFIX}@test.com"


def _mk_po(db, comp, project, amount, tag, status, approval_flag="pending"):
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        vendor_id=None,
        po_number=f"PO-R242-{tag}-{_SUFFIX}",
        po_date=datetime.datetime(2026, 1, 1),
        status=status,
        gross_amount=amount, tax_amount=0.0, total_amount=amount,
        approval_flag=approval_flag,
    )
    db.add(po)
    db.commit()
    return po


def test_budget_committed_excludes_draft_closed_and_rejected_pos(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R242", user_name="U242", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P242", code=f"PRJ-{_SUFFIX}-1", status="Ongoing"
    )
    db.add(project)
    db.commit()

    # Live commitments: sent (approved), partially received, fully received.
    _mk_po(db, comp, project, 100.0, "sent", "sent", approval_flag="approved")
    _mk_po(db, comp, project, 200.0, "partial", "partial", approval_flag="approved")
    _mk_po(db, comp, project, 300.0, "received", "received", approval_flag="approved")

    # Non-commitments: never-sent draft (the filed defect), closed-out order,
    # and a rejected order.
    _mk_po(db, comp, project, 400.0, "draft", "draft")
    _mk_po(db, comp, project, 500.0, "closed", "closed", approval_flag="approved")
    _mk_po(db, comp, project, 700.0, "rejected", "rejected", approval_flag="rejected")

    r = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()

    # Only sent + partial + received count: 100 + 200 + 300.
    assert body["material_committed"] == 600.0, body
    assert body["total_committed"] == 600.0, body
