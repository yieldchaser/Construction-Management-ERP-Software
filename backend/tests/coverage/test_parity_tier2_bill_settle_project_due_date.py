"""Tier 2 Parity Item 6: Project name on bills and expense due dates in settle view.
"""
from datetime import datetime, timezone, timedelta
from pathlib import Path
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P6-{_SUFFIX}",
        user_name="U-P6",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p6-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier2_project_name_and_due_date_on_bills(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    # Create project
    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Skyscraper Tower A",
        status="active",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)

    # Create a vendor party
    lp = models.LibraryParty(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Apex Cement Suppliers",
        party_type="Supplier",
    )
    db.add(lp)
    db.flush()

    party_team = models.CompanyTeam(
        id=uuid.uuid4(),
        company_id=comp.id,
        user_id=None,
        library_party_id=lp.id,
        priority_type="subcontractor",
    )
    db.add(party_team)
    db.flush()

    now = datetime.now(timezone.utc)
    due = now + timedelta(days=15)

    # Create Bill with due_date
    bill = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj.id,
        party_company_user_id=party_team.id,
        invoice_number="BILL-APEX-001",
        invoice_date=now,
        due_date=due,
        invoice_type="purchase",
        status="Pending",
        subtotal=10000.0,
        gst_amount=1800.0,
        total_payable=11800.0,
        paid_amount=0.0,
        approval_flag="approved",
        created_at=now,
    )
    db.add(bill)
    db.commit()

    # 1. Query finance transactions
    res_txn = client.get(f"/apis/v3/finance/transactions/{comp.id}", headers=hdr)
    assert res_txn.status_code == 200, res_txn.text
    txns = res_txn.json()["transactions"]
    matching_txn = next((t for t in txns if t["id"] == str(bill.id)), None)
    assert matching_txn is not None, "Bill not found in finance transactions"
    assert matching_txn["project_name"] == "Skyscraper Tower A"
    assert matching_txn.get("due_date") == due.strftime("%Y-%m-%d"), f"Due date missing or mismatch: {matching_txn}"

    # 2. Query billing bills
    res_bills = client.get(f"/apis/v3/billing/bills?project_id={proj.id}", headers=hdr)
    assert res_bills.status_code == 200, res_bills.text
    bills_data = res_bills.json()
    matching_bill = next((b for b in bills_data if b["id"] == str(bill.id)), None)
    assert matching_bill is not None
    assert matching_bill["project_name"] == "Skyscraper Tower A"

    # 3. Static check on finance page for due_date rendering
    page_path = (
        Path(__file__).resolve().parents[3]
        / "frontend" / "src" / "app" / "c" / "[company_id]" / "d" / "finance" / "page.tsx"
    )
    content = page_path.read_text(encoding="utf-8")
    assert "due_date" in content, "Finance page does not reference due_date"
