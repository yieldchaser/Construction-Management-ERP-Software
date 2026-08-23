"""R2-229 — tower consolidated P&L "Billed" must count client revenue bills only.

Gate: GET /towers/{project_id}/consolidated-pnl summed total_payable over every
bill regardless of invoice_type, so purchases, expenses, subcontractor bills and
even payment_in money-receipts inflated the billed figure. After the fix only
revenue invoices (sale, material_sale) count, on both the no-tower "Overall
Project" branch and the per-tower branch.
"""
import datetime
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_bill(db, comp, project, team, amount, tag, invoice_type):
    b = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=f"INV-R229-{tag}-{_SUFFIX}",
        invoice_date=datetime.datetime(2026, 1, 1),
        invoice_type=invoice_type, subtotal=amount, total_payable=amount,
        approval_flag="approved", status="Unpaid",
    )
    db.add(b)
    db.commit()
    return b


def test_consolidated_pnl_billed_counts_revenue_invoices_only(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name="R229", user_name="U229", mobile=f"+9190{_SUFFIX}01", email=f"r229-1-{_SUFFIX}@test.com"
    )
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P229", code=f"PRJ-{_SUFFIX}-1", status="Ongoing"
    )
    db.add(project)
    db.commit()

    db.add(models.ProjectBudget(
        id=uuid.uuid4(), project_id=project.id,
        material_budget=500000.0, labour_budget=0.0, subcon_budget=0.0, equipment_budget=0.0,
    ))
    db.commit()

    # Every non-revenue family from the audit ledger: purchase, expense,
    # subcon and a payment_in receipt. All active, so invoice_type is the
    # only discriminator under test here.
    _mk_bill(db, comp, project, team, 118000.0, "sale", "sale")
    _mk_bill(db, comp, project, team, 50000.0, "msale", "material_sale")
    _mk_bill(db, comp, project, team, 11800.0, "purchase", "purchase")
    _mk_bill(db, comp, project, team, 5900.0, "expense", "expense")
    _mk_bill(db, comp, project, team, 111100.0, "subcon", "subcon")
    _mk_bill(db, comp, project, team, 11800.0, "payin", "payment_in")

    r = client.get(f"/apis/v3/towers/{project.id}/consolidated-pnl", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1, rows
    overall = rows[0]
    assert overall["tower_code"] == "ALL", overall
    # 118000 + 50000; purchases/expenses/subcon/payment_in are not billed value.
    assert overall["total_billed"] == 168000.0, overall

    db.add(models.ProjectTower(
        id=uuid.uuid4(), project_id=project.id,
        tower_name="Tower A", tower_code=f"TA-{_SUFFIX}", budget=200000.0,
    ))
    db.commit()

    r = client.get(f"/apis/v3/towers/{project.id}/consolidated-pnl", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    per_tower = [row for row in rows if row["tower_code"] != "ALL"]
    assert len(per_tower) == 1, rows
    assert per_tower[0]["total_billed"] == 168000.0, per_tower
