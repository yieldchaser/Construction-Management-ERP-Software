"""R2-603/R2-604 - honest analytics charts and aligned budget gates.

R2-603: GET /analytics/company/{id}/financial fabricated a demo chart when the
company had no bills ("Jun 2026"/"Jul 2026" months plus a 1000 expense point
and a Debit Note entry). A company with no spend must get an honestly empty
chart: no fabricated labels or points.

R2-604: the no-towers branch of GET /budget/committed/{project_id}/towers
summed every purchase-order status (drafts booked committed cost), and neither
tower branch applied the approved/non-cancelled bill gates the main endpoint
has had since R2-233/R2-723.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r603-{t}-{_SUFFIX}@test.com"


def _mk_po(db, comp, project, amount, tag, status):
    po = models.PurchaseOrder(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        vendor_id=None,
        po_number=f"PO-R604-{tag}-{_SUFFIX}",
        po_date=datetime.datetime(2026, 1, 1),
        status=status,
        gross_amount=amount, tax_amount=0.0, total_amount=amount,
        approval_flag="approved",
    )
    db.add(po)
    db.commit()
    return po


def _mk_bill(db, comp, project, team, amount, tag, approved=True, cancelled=False):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R604-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type="purchase", subtotal=amount, total_payable=amount,
        approval_flag="approved" if approved else "pending",
        status="Cancelled" if cancelled else "Unpaid",
    )
    db.add(b)
    db.commit()
    return b


def test_financial_chart_is_honestly_empty_without_bills(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R603", user_name="U603", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    db.add(models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P603",
        code=f"PRJ-{_SUFFIX}-A", status="Ongoing",
    ))
    db.commit()

    r = client.get(f"/apis/v3/analytics/company/{comp.id}/financial", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()

    # No bills means no months and no points: nothing fabricated.
    assert body["chart_months"] == [], body
    assert body["sales_series"] == [], body
    assert body["expense_series"] == [], body
    assert body["margin_series"] == [], body
    # The old fabrication also seeded a 1000 Debit Note entry.
    assert body["expense_by_type"] == [], body


def test_no_tower_budget_excludes_draft_po_and_unapproved_bills(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R604A", user_name="U604A", mobile=_mob(2), email=_mail(2)
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P604A",
        code=f"PRJ-{_SUFFIX}-B", status="Ongoing",
    )
    db.add(project)
    db.commit()

    # Draft PO must not book committed cost in this branch (the filed gap).
    _mk_po(db, comp, project, 400.0, "draft", "draft")
    # Only the approved, non-cancelled bill is actual spend.
    _mk_bill(db, comp, project, team, 100.0, "ok")
    _mk_bill(db, comp, project, team, 200.0, "pending", approved=False)

    r = client.get(f"/apis/v3/budget/committed/{project.id}/towers", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 1, body
    row = body[0]
    assert row["committed"] == 0.0, row
    assert row["actual"] == 100.0, row


def test_tower_budget_actual_excludes_cancelled_and_pending_bills(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R604B", user_name="U604B", mobile=_mob(3), email=_mail(3)
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P604B",
        code=f"PRJ-{_SUFFIX}-C", status="Ongoing",
    )
    db.add(project)
    db.commit()
    db.add(models.ProjectTower(
        id=uuid.uuid4(), project_id=project.id,
        tower_name="Tower A", tower_code="TA", budget=10000.0,
    ))
    db.commit()

    _mk_bill(db, comp, project, team, 100.0, "ok")
    _mk_bill(db, comp, project, team, 300.0, "cancelled", cancelled=True)
    _mk_bill(db, comp, project, team, 200.0, "pending", approved=False)

    r = client.get(f"/apis/v3/budget/committed/{project.id}/towers", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 1, body
    row = body[0]
    assert row["actual"] == 100.0, row
