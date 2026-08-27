"""R2-328 - /finance/transactions must report the company, not project members.

get_company_transactions scoped bills and payments by current project
membership (project_id IN company projects), so project-less payments
(Payment.project_id is nullable and SET NULL on project delete) vanished from
in_total/out_total/rows while cash_balance in the same payload used
Payment.company_id and saw them: one response, two populations.

Gate: a 40000 in on a project plus the finding's 50000 project-less cash out
- totals include both, the row is present with no project, and cash_balance
covers the same population (-50000) instead of disagreeing.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P328", code=f"PRJ-P328-{_SUFFIX}", status="Ongoing"
    )
    db.add(project)
    db.commit()
    return project


def _mk_payment(db, comp, project_id, ptype, amount, method, desc):
    db.add(models.Payment(
        id=uuid.uuid4(), company_id=comp.id, project_id=project_id,
        payment_type=ptype, amount=amount, unsettled_amount=0,
        payment_method=method, payment_date=datetime.datetime(2026, 7, 27),
        description=desc,
    ))
    db.commit()


def test_projectless_payments_reach_company_transactions(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R328-{_SUFFIX}", user_name="UR328")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    _mk_payment(db, comp, project.id, "in", 40000, "Bank Transfer", "receipt on project")
    _mk_payment(db, comp, None, "out", 50000, "Cash", "P328 projectless out")

    r = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()

    assert body["in_total"] == 40000.0, body
    assert body["out_total"] == 50000.0, body

    descs = {row["details"]: row for row in body["transactions"]}
    orphan = descs.get("P328 projectless out")
    assert orphan is not None, body
    assert orphan["type"] == "Payment Out"
    assert orphan["project_id"] is None and orphan["project_name"] is None

    # Same payload must hold one population: cash balance is company-scoped,
    # so after the fix both figures see the project-less payment.
    assert body["cash_balance"] == -50000.0, body


def test_other_companies_payments_stay_excluded(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name=f"R328A-{_SUFFIX}", user_name="UR328A")
    comp_b, _, _ = make_tenant(company_name=f"R328B-{_SUFFIX}", user_name="UR328B")
    hdr = auth_headers(user_a, comp_a)
    _mk_payment(db, comp_b, None, "in", 99999, "Cash", "P328 foreign money")

    r = client.get(f"/apis/v3/finance/transactions/{comp_a.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["in_total"] == 0.0, body
    assert all(row["details"] != "P328 foreign money" for row in body["transactions"]), body
