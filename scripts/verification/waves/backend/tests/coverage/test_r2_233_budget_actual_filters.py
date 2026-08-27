"""R2-233 — Budget actuals count only approved, non-cancelled bills.

Gate: GET /budget/committed/{project_id} summed total_payable over every
expense-side bill regardless of approval_flag (default "pending") and status,
so an unapproved bill booked spend the instant it was typed and a cancelled
bill never left the report. After the fix only approval_flag == "approved"
bills with status != "Cancelled" are counted.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r233-{t}-{_SUFFIX}@test.com"


def _mk_bill(db, comp, project, team, inv_type, amount, tag, approved=True, cancelled=False):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R233-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type=inv_type, subtotal=amount, total_payable=amount,
        approval_flag="approved" if approved else "pending",
        status="Cancelled" if cancelled else "Unpaid",
    )
    db.add(b)
    db.commit()
    return b


def test_budget_actuals_exclude_pending_and_cancelled_bills(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R233", user_name="U233", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P233", code=f"PRJ-{_SUFFIX}-1", status="Ongoing"
    )
    db.add(project)
    db.commit()

    _mk_bill(db, comp, project, team, "purchase", 100.0, "mat-ok")
    _mk_bill(db, comp, project, team, "purchase", 200.0, "mat-pending", approved=False)
    _mk_bill(db, comp, project, team, "subcon", 300.0, "sub-cancelled", cancelled=True)
    _mk_bill(db, comp, project, team, "expense", 400.0, "oth-ok")

    r = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()

    # Approved bills count; pending and cancelled bills do not.
    assert body["material_actual"] == 100.0, body
    assert body["subcon_actual"] == 0.0, body
    assert body["other_actual"] == 400.0, body
    assert body["total_actual"] == 500.0, body
