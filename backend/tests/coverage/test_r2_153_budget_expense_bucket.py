"""R2-153 — every expense invoice type is counted in budget actuals.

Gate: GET /budget/committed/{project_id} used to hardcode "purchase" and
"subcon" bill filters, so "expense" (and "equipment") bills raised real spend
that moved nothing on the screen. After the fix all EXPENSE_INVOICE_TYPES
members are bucketed, unmapped types surface in other_actual, and revenue
bills stay excluded.
"""
import datetime
import uuid

from app import models
from app.constants import EXPENSE_INVOICE_TYPES, REVENUE_INVOICE_TYPES

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r153-{t}-{_SUFFIX}@test.com"


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{_SUFFIX}-{tag}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, team, inv_type, amount, tag):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R153-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type=inv_type, subtotal=amount, total_payable=amount,
    )
    db.add(b)
    db.commit()
    return b


def test_all_expense_invoice_types_counted_in_budget_actuals(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R153", user_name="U153", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, 1)

    _mk_bill(db, comp, project, team, "purchase", 100.0, "mat")
    _mk_bill(db, comp, project, team, "subcon", 200.0, "sub")
    _mk_bill(db, comp, project, team, "expense", 400.0, "oth")
    _mk_bill(db, comp, project, team, "equipment", 50.0, "eq")
    sale = _mk_bill(db, comp, project, team, "sale", 9999.0, "rev")

    assert set(EXPENSE_INVOICE_TYPES) >= {"purchase", "subcon", "expense", "equipment"}
    assert sale.invoice_type in REVENUE_INVOICE_TYPES

    r = client.get(f"/apis/v3/budget/committed/{project.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()

    # Every expense bucket must carry its bills; no type may be dropped.
    assert body["material_actual"] == 100.0, body
    assert body["subcon_actual"] == 200.0, body
    assert body["equipment_actual"] == 50.0, body
    assert body["other_actual"] == 400.0, body

    # Revenue never leaks into actuals and totals reconcile across buckets.
    assert body["total_actual"] == 750.0, body
