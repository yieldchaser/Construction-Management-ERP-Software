"""R2-081 - project spend counts expense invoices only.

The dashboard summed Bill.total_payable with no invoice_type filter, so a
Rs 1,18,000 sales invoice was reported as money spent. Every one of the twelve
canonical invoice types is pinned here: only EXPENSE_INVOICE_TYPES may reach
project spend.
"""
import datetime
import uuid

from app import models
from app.constants import EXPENSE_INVOICE_TYPES, REVENUE_INVOICE_TYPES, SETTLEMENT_INVOICE_TYPES


def test_spend_counts_only_expense_invoice_types(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R081A", user_name="U081A")
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P081", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(project)
    db.commit()

    amounts = {}
    all_types = list(REVENUE_INVOICE_TYPES) + list(EXPENSE_INVOICE_TYPES) + list(SETTLEMENT_INVOICE_TYPES)
    for i, invoice_type in enumerate(all_types):
        amount = 100.0 * (i + 1)
        amounts[invoice_type] = amount
        db.add(
            models.Bill(
                id=uuid.uuid4(),
                company_id=comp.id,
                project_id=project.id,
                party_company_user_id=team.id,
                invoice_number=f"T081-{uuid.uuid4().hex[:10]}",
                invoice_date=datetime.datetime(2026, 7, 10),
                invoice_type=invoice_type,
                status="Unpaid",
                subtotal=amount,
                total_payable=amount,
            )
        )
    db.commit()
    assert len(amounts) == len(set(all_types)) == 10

    r = client.get(f"/apis/v3/analytics/company/{comp.id}", headers=hdr)
    assert r.status_code == 200, r.text
    body = r.json()
    row = next(p for p in body["projects"] if p["project_id"] == str(project.id))

    expected = sum(amounts[t] for t in EXPENSE_INVOICE_TYPES)
    assert row["spend"] == expected, row
    assert body["total_spend"] == expected, body["total_spend"]
    # The burn curve inherits the same filter.
    assert body["budget_burn_series"][-1]["spend"] == expected, body["budget_burn_series"]
