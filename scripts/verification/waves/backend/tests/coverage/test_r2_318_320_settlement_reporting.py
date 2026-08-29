"""R2-318 / R2-320 — settlement-aware expense reporting and honest payment summary.

R2-318: GSTR-2 Purchase used to append every Payment Out row on top of every
expense bill, so a purchase settled FIFO via POST /finance/payments appeared
twice (bill + the payment that paid it). PaymentSettlement records exactly
that link; the report must now count only the portion of a payout that did
not settle a bill already listed, mirroring the finance ledger precedent of
excluding settled payments from cash populations.

R2-320: Project-wise Payment Summary put three populations on one row:
count = both directions, "Amount Paid" = receipts only, "Remaining" = netted
in+out. The row is now split per direction (receipts vs payouts: count,
amount, unsettled) so unlike money is never merged into one figure.
"""
import datetime
import uuid

import pytest

from app import models

DATA = "/apis/v3/reports/data"


def _mk_project(db, comp, name):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=name,
        code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, team, number, inv_type, amount):
    bill = models.Bill(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team.id, invoice_number=number,
        invoice_date=datetime.datetime(2026, 1, 10), invoice_type=inv_type,
        subtotal=amount, total_payable=amount,
    )
    db.add(bill)
    db.commit()
    return bill


def _approve(client, hdr, bill_id):
    r = client.patch(f"/apis/v3/finance/approve/{bill_id}", headers=hdr)
    assert r.status_code == 200


def _post_payment(client, hdr, comp, project, ptype, amount):
    r = client.post(
        "/apis/v3/finance/payments",
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "payment_type": ptype,
            "amount": amount,
            "payment_method": "Cash",
            "payment_date": "2026-01-20T00:00:00",
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()


def test_full_fifo_settlement_reports_purchase_once_and_summary_reconciles(
    client, db, make_tenant, auth_headers
):
    comp, user, team = make_tenant(company_name="R2318A", user_name="U2318A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "Wave-H-318A")
    tag = uuid.uuid4().hex[:6]

    # Seeded purchase bill, approved so the FIFO engine may settle it.
    purchase = _mk_bill(db, comp, project, team, f"PUR-{tag}", "purchase", 100000.0)
    _approve(client, hdr, purchase.id)

    # Full FIFO settlement: an out-payment exactly covering the bill.
    payout = _post_payment(client, hdr, comp, project, "out", 100000.0)
    settle_rows = (
        db.query(models.PaymentSettlement)
        .filter_by(payment_id=uuid.UUID(payout["id"]))
        .all()
    )
    assert len(settle_rows) == 1
    assert settle_rows[0].bill_id == purchase.id
    assert float(settle_rows[0].settled_amount) == pytest.approx(100000.0)

    # An independent receipt that settles nothing (no revenue bills exist).
    receipt = _post_payment(client, hdr, comp, project, "in", 5000.0)
    assert float(receipt["unsettled_amount"]) == pytest.approx(5000.0)

    # R2-318: the purchase appears once; the fully-settled payout adds no row.
    rep = client.get(f"{DATA}/gstr2-purchase?company_id={comp.id}", headers=hdr)
    assert rep.status_code == 200
    rows = [
        r for r in rep.json()["rows"]
        if r["Project Name"] == project.name or r["Project Name"] == ""
    ]
    purchase_rows = [r for r in rows if r["Bill Number"] == f"PUR-{tag}"]
    assert len(purchase_rows) == 1
    assert float(purchase_rows[0]["Expense Amount"]) == pytest.approx(100000.0)
    assert not [r for r in rows if r["Expense Type"] == "Payment Out"]

    # R2-320: one row for this project, split honestly per direction.
    summ = client.get(
        f"{DATA}/project-wise-payment-summary?company_id={comp.id}&project_id={project.id}",
        headers=hdr,
    )
    assert summ.status_code == 200
    srows = summ.json()["rows"]
    assert len(srows) == 1
    row = srows[0]
    assert row["Receipts Count"] == 1
    assert float(row["Receipts Amount (INR)"]) == pytest.approx(5000.0)
    assert row["Payouts Count"] == 1
    assert float(row["Payouts Amount (INR)"]) == pytest.approx(100000.0)
    assert float(row["Unsettled Receipts (INR)"]) == pytest.approx(5000.0)
    assert float(row["Unsettled Payouts (INR)"]) == pytest.approx(0.0)

    # Reconciliation: directions stay distinct yet account for every rupee.
    assert row["Receipts Count"] + row["Payouts Count"] == 2
    assert float(row["Payouts Amount (INR)"]) - float(row["Unsettled Payouts (INR)"]) == pytest.approx(100000.0)


def test_partially_settled_payout_reports_only_unsettled_residual(
    client, db, make_tenant, auth_headers
):
    comp, user, team = make_tenant(company_name="R2318B", user_name="U2318B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp, "Wave-H-318B")
    tag = uuid.uuid4().hex[:6]

    purchase = _mk_bill(db, comp, project, team, f"PUR-{tag}", "purchase", 40000.0)
    _approve(client, hdr, purchase.id)

    # Payout of 60000 settles 40000 against the bill; 20000 remain standalone.
    payout = _post_payment(client, hdr, comp, project, "out", 60000.0)
    assert float(payout["unsettled_amount"]) == pytest.approx(20000.0)

    rep = client.get(f"{DATA}/gstr2-purchase?company_id={comp.id}&project_id={project.id}", headers=hdr)
    assert rep.status_code == 200
    rows = rep.json()["rows"]
    assert [r["Bill Number"] for r in rows if r["Bill Number"]] == [f"PUR-{tag}"]
    out_rows = [r for r in rows if r["Expense Type"] == "Payment Out"]
    assert len(out_rows) == 1
    # Only the money NOT already carried by the bill row may appear.
    assert float(out_rows[0]["Expense Amount"]) == pytest.approx(20000.0)

    summ = client.get(
        f"{DATA}/project-wise-payment-summary?company_id={comp.id}&project_id={project.id}",
        headers=hdr,
    )
    assert summ.status_code == 200
    row = summ.json()["rows"][0]
    assert row["Payouts Count"] == 1
    assert float(row["Payouts Amount (INR)"]) == pytest.approx(60000.0)
    assert float(row["Unsettled Payouts (INR)"]) == pytest.approx(20000.0)
    assert row["Receipts Count"] == 0
    assert float(row["Receipts Amount (INR)"]) == pytest.approx(0.0)
