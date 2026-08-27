"""R2-238 - /finance/ledger must book settlement vouchers as cash movements.

SETTLEMENT_INVOICE_TYPES bills (payment_in, payment_out, i_paid, i_received)
fell into get_ledger's cost ternary: category "Material Bill", ledger head
"Material Cost", sign inverted, so recording a receipt rendered as an
Expense of -amount and reduced the running balance.

After the fix they are classified explicitly before the revenue/cost
ternaries: category "Settlement", head "Cash Movement", signed by direction
(payment_in / i_received are money-in receipts).

Gate: one payment_in bill -> exactly one Receipt-type row, category
"Settlement", ledger "Cash Movement", positive amount; never Material
Bill / Material Cost.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_bill(db, comp, project, team, inv_type, amount):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R238-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type=inv_type, subtotal=amount, total_payable=amount,
        approval_flag="approved",
    )
    db.add(b)
    db.commit()
    return b


def test_payment_in_voucher_is_settlement_receipt_not_material_cost(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R238", user_name="U238",
        mobile=f"+9192{_SUFFIX}", email=f"r238-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P238", code=f"PRJ-{_SUFFIX}", status="Ongoing"
    )
    db.add(project)
    db.commit()

    _mk_bill(db, comp, project, team, "payment_in", 590.0)

    r = client.get(f"/apis/v3/finance/ledger?project_id={project.id}", headers=hdr)
    assert r.status_code == 200, r.text

    rows = [row for row in r.json() if row["ref"] == f"INV-R238-{_SUFFIX}"]
    assert len(rows) == 1, r.json()
    row = rows[0]

    # Settlement vouchers are cash movements, signed by direction.
    assert row["type"] == "Receipt", row
    assert row["category"] == "Settlement", row
    assert row["ledger"] == "Cash Movement", row
    assert row["amount"] == 590.0, row

    # Pin the exact defect shape reported live: an Expense of -590 under
    # Material Bill / Material Cost must never come back for payment_in.
    assert row["category"] != "Material Bill", row
    assert row["ledger"] != "Material Cost", row
    assert row["type"] != "Expense", row
    assert row["amount"] != -590.0, row
