"""R2-250 — Tower budget Actual counts only expense invoice types.

Gate: both branches of get_tower_budget summed total_payable over every
Bill on the project with no invoice_type filter, so revenue invoices
(sale, material_sale) and settlement vouchers (payment_in etc.) were
reported as cost — the audit repro showed a 118000 sale invoice and an
11800 payment_in voucher inside actual: 271400. The
EXPENSE_INVOICE_TYPES filter now excludes them; this test pins that a
sale bill and a payment_in voucher never inflate any tower row's Actual.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9190{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r250-{t}-{_SUFFIX}@test.com"


def _mk_bill(db, comp, project, team, inv_type, amount, tag):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R250-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type=inv_type, subtotal=amount, total_payable=amount,
        approval_flag="approved", status="Unpaid",
    )
    db.add(b)
    db.commit()
    return b


def test_tower_actual_excludes_revenue_and_settlement_bills(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R250", user_name="U250", mobile=_mob(1), email=_mail(1)
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P250", code=f"PRJ-{_SUFFIX}-1", status="Ongoing"
    )
    db.add(project)
    db.commit()

    db.add(models.ProjectTower(
        id=uuid.uuid4(), project_id=project.id,
        tower_name="Tower A", tower_code="TA", budget=1000000.0,
    ))
    db.add(models.ProjectTower(
        id=uuid.uuid4(), project_id=project.id,
        tower_name="Tower B", tower_code="TB", budget=500000.0,
    ))
    db.commit()

    # The only real cost is 1000 of purchases.
    _mk_bill(db, comp, project, team, "purchase", 1000.0, "mat-ok")
    # Audit-repro noise: a client sale invoice and a payment_in voucher.
    _mk_bill(db, comp, project, team, "sale", 118000.0, "sale-noise")
    _mk_bill(db, comp, project, team, "material_sale", 5000.0, "msale-noise")
    _mk_bill(db, comp, project, team, "payment_in", 11800.0, "pin-noise")

    r = client.get(f"/apis/v3/budget/committed/{project.id}/towers", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert len(body) == 2, body

    for row in body:
        assert row["actual"] == 1000.0, row
