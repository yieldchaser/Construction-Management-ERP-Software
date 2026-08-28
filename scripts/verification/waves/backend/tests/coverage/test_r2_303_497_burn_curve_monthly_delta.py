"""R2-303 / R2-497 - the budget burn series must not compound.

month_spend filtered only by invoice_date <= month_end was already cumulative;
adding it into a running accumulator reported N x real spend by month N (the
live proof: Aug 2026 showed exactly 2x July on a month with zero bills). Each
month now contributes only the bills dated inside it, so a bill-free month
leaves the series flat.
"""
import datetime
import uuid

from app import models


def _mk_project(db, comp, tag):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P{tag}", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_budget(db, project, amount):
    b = models.ProjectBudget(id=uuid.uuid4(), project_id=project.id, material_budget=amount)
    db.add(b)
    db.commit()
    return b


def _mk_bill(db, comp, project, team, amount, invoice_date, invoice_type="purchase"):
    b = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"B-{uuid.uuid4().hex[:10]}",
        invoice_date=invoice_date,
        invoice_type=invoice_type,
        status="Unpaid",
        subtotal=amount,
        total_payable=amount,
    )
    db.add(b)
    db.commit()
    return b


def _series_for(client, hdr, comp):
    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    return [(pt["label"], pt["spend"], pt["burn_pct"]) for pt in r.json()["budget_burn_series"]]


def test_month_with_no_bills_leaves_series_flat(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R303A", user_name="U303A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "A")
    _mk_budget(db, project, 10000.0)

    # All spend is dated July; a revenue invoice in August stretches the chart
    # window into a bill-free month without adding expense.
    _mk_bill(db, comp, project, team, 1000.0, datetime.datetime(2026, 7, 15))
    _mk_bill(db, comp, project, team, 999.0, datetime.datetime(2026, 8, 20), invoice_type="sale")

    series = _series_for(client, hdr, comp)
    labels = [label for label, _, _ in series]
    assert labels == ["Jul 2026", "Aug 2026"], series
    # August books no expense: the curve must hold flat at July's figure,
    # never double it.
    assert series[0][1] == 1000.0, series
    assert series[1][1] == 1000.0, series
    assert series[0][2] == series[1][2] == 10.0, series


def test_each_month_adds_only_its_own_bills(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R497A", user_name="U497A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "B")
    _mk_budget(db, project, 10000.0)

    _mk_bill(db, comp, project, team, 300.0, datetime.datetime(2026, 7, 5))
    _mk_bill(db, comp, project, team, 500.0, datetime.datetime(2026, 8, 25))

    series = _series_for(client, hdr, comp)
    # Cumulative grows by exactly each month's own delta: 300 then 800.
    # The old accumulator reported 300 then 1100 (July counted twice).
    assert [spend for _, spend, _ in series] == [300.0, 800.0], series
