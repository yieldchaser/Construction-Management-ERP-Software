"""R2-249 — Tower budget Committed is derived from purchase orders.

Gate: get_tower_budget assigned committed = float(t.budget) per tower, so the
Committed column echoed the budget itself and read 100% committed forever
(live repro: towers showed budget 1000000 / committed 1000000 next to a
single PO of 47200). The no-towers branch of the same function already
computed committed from purchase orders; the tower loop must do the same,
counting only live POs (sent, partial, received — the R2-242 whitelist).

Documents carry no tower_id yet (R2-248 / CD-5), so committed is a
project-level figure repeated on each tower row until a real split exists.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r249-{t}-{_SUFFIX}@test.com"


def _mk_po(db, comp, project, amount, tag, status):
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        vendor_id=None,
        po_number=f"PO-R249-{tag}-{_SUFFIX}",
        po_date=datetime.datetime(2026, 1, 1),
        status=status,
        gross_amount=amount, tax_amount=0.0, total_amount=amount,
        approval_flag="approved",
    )
    db.add(po)
    db.commit()
    return po


def test_tower_budget_committed_comes_from_pos_not_budget(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R249", user_name="U249", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P249", code=f"PRJ-{_SUFFIX}-1", status="Ongoing"
    )
    db.add(project)
    db.commit()

    for name, code, budget in (("Tower A", "TA", 1000000.0), ("Tower B", "TB", 500000.0)):
        db.add(models.ProjectTower(
            id=uuid.uuid4(), project_id=project.id,
            tower_name=name, tower_code=code, budget=budget,
        ))
    db.commit()

    # Live commitments: 100 + 200 + 300 = 600.
    _mk_po(db, comp, project, 100.0, "sent", "sent")
    _mk_po(db, comp, project, 200.0, "partial", "partial")
    _mk_po(db, comp, project, 300.0, "received", "received")
    # Never-sent draft must not count toward committed.
    _mk_po(db, comp, project, 400.0, "draft", "draft")

    r = client.get(f"/apis/v3/budget/committed/{project.id}/towers", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 2, body

    for row in body:
        assert row["committed"] != row["budget"], row
        assert row["committed"] == 600.0, row
