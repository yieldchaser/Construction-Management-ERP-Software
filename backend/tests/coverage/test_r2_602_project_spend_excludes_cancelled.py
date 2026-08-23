"""R2-602 - analytics project spend must exclude Cancelled bills.

GET /analytics/company/{id} summed Bill.total_payable over ALL bills, so a
Cancelled bill booked cost into project_spend / total_spend / the burn curve,
while the operational site (Bill.status != "Cancelled") did not - the two
dashboards disagreed. Every spend surface here must price only live bills.
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


def _mk_budget(db, project, material_budget):
    b = models.ProjectBudget(id=uuid.uuid4(), project_id=project.id, material_budget=material_budget)
    db.add(b)
    db.commit()
    return b


def _mk_bill(db, comp, project, team, amount, status):
    b = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=project.id,
        party_company_user_id=team.id,
        invoice_number=f"INV-{uuid.uuid4().hex[:10]}",
        invoice_date=datetime.datetime.now(),
        invoice_type="purchase",
        status=status,
        subtotal=amount,
        total_payable=amount,
    )
    db.add(b)
    db.commit()
    return b


def test_project_spend_excludes_cancelled(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R602A", user_name="U602A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "A")
    # Budget 6k: live-only spend (2k) stays Healthy; counting the cancelled
    # bill would push spend to 7k and flip health to Critical.
    _mk_budget(db, project, 6000.0)

    _mk_bill(db, comp, project, team, 5000.0, "Cancelled")
    live = _mk_bill(db, comp, project, team, 2000.0, "Unpaid")
    assert db.query(models.Bill).filter_by(project_id=project.id).count() == 2

    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()

    row = next(p for p in body["projects"] if p["project_id"] == str(project.id))
    assert row["spend"] == 2000.0, row
    assert row["variance"] == 4000.0, row
    assert body["total_spend"] == 2000.0, body["total_spend"]
    # Burn curve prices live bills only too.
    assert body["budget_burn_series"][-1]["spend"] == 2000.0

    # Operational site is the reference pattern - both dashboards agree now.
    r2 = client.get(f"/apis/v3/analytics/company/{comp.id}/operational", headers=hdr)
    assert r2.status_code == 200, r2.text
    op_row = next(p for p in r2.json()["projects"] if p["project_id"] == str(project.id))
    assert op_row["health"] == "Healthy", op_row

    # Financial summary prices only active bills as well.
    r3 = client.get(f"/apis/v3/analytics/company/{comp.id}/financial", headers=hdr)
    assert r3.status_code == 200, r3.text
    fin_row = next(p for p in r3.json()["project_summaries"] if p["project_id"] == str(project.id))
    assert fin_row["total_expense"] == 2000.0, fin_row
