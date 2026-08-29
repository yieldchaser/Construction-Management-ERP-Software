"""Item C7: Item-wise sales report honours project filter through Bill.quotation_id.
"""
from datetime import datetime, timezone
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]
DATA = "/apis/v3/reports/data"


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"C7-{_SUFFIX}",
        user_name="U-C7",
        mobile=f"+9195{uuid.uuid4().hex[:8]}",
        email=f"c7-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_c7_item_wise_sales_filters_by_bill_quotation_linkage(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    proj_a = models.Project(id=uuid.uuid4(), company_id=comp.id, name="C7 Proj A", status="Ongoing")
    proj_b = models.Project(id=uuid.uuid4(), company_id=comp.id, name="C7 Proj B", status="Ongoing")
    db.add_all([proj_a, proj_b])
    db.commit()

    # Lead and quotation A
    lead_a = models.CRMLead(
        id=uuid.uuid4(), company_id=comp.id, lead_type="New Project",
        contact_name="Lead A", client_company_name="Client A",
        phone_no="9999999999",
    )
    db.add(lead_a)
    db.flush()

    quot_a = models.CRMQuotation(id=uuid.uuid4(), lead_id=lead_a.id, subject="Quote A")
    db.add(quot_a)
    db.flush()

    item_a = models.CRMQuotationItem(
        id=uuid.uuid4(), quotation_id=quot_a.id, item_name=f"Steel-{_SUFFIX}",
        qty=5, unit="MT", selling_price=50000, total_amount=250000,
    )
    db.add(item_a)

    # Lead and quotation B (not linked to any project's bill)
    lead_b = models.CRMLead(
        id=uuid.uuid4(), company_id=comp.id, lead_type="New Project",
        contact_name="Lead B", client_company_name="Client B",
        phone_no="9999999999",
    )
    db.add(lead_b)
    db.flush()

    quot_b = models.CRMQuotation(id=uuid.uuid4(), lead_id=lead_b.id, subject="Quote B")
    db.add(quot_b)
    db.flush()

    item_b = models.CRMQuotationItem(
        id=uuid.uuid4(), quotation_id=quot_b.id, item_name=f"Cement-{_SUFFIX}",
        qty=100, unit="Bags", selling_price=400, total_amount=40000,
    )
    db.add(item_b)

    # Link quot_a to a live Bill on Proj A
    bill_a = models.Bill(
        id=uuid.uuid4(),
        company_id=comp.id,
        project_id=proj_a.id,
        party_company_user_id=team.id,
        quotation_id=quot_a.id,
        invoice_number=f"INV-C7-{_SUFFIX}",
        invoice_date=datetime.now(timezone.utc),
        invoice_type="sale",
        subtotal=250000.0,
        total_payable=250000.0,
        status="Unpaid",
    )
    db.add(bill_a)
    db.commit()

    # 1. Company-wide: returns both quotation items
    r_all = client.get(f"{DATA}/item-wise-sales?company_id={comp.id}", headers=hdr)
    assert r_all.status_code == 200, r_all.text
    rows_all = [x for x in r_all.json()["rows"] if _SUFFIX in str(x.get("Item Name", ""))]
    assert len(rows_all) == 2

    # 2. Filtered by Project A: returns only Quote A's item (linked via Bill.quotation_id)
    r_proj_a = client.get(f"{DATA}/item-wise-sales?company_id={comp.id}&project_id={proj_a.id}", headers=hdr)
    assert r_proj_a.status_code == 200, r_proj_a.text
    rows_a = [x for x in r_proj_a.json()["rows"] if _SUFFIX in str(x.get("Item Name", ""))]
    assert len(rows_a) == 1
    assert rows_a[0]["Item Name"] == f"Steel-{_SUFFIX}"

    # 3. Filtered by Project B: returns 0 items (no bill on Proj B links to a quotation)
    r_proj_b = client.get(f"{DATA}/item-wise-sales?company_id={comp.id}&project_id={proj_b.id}", headers=hdr)
    assert r_proj_b.status_code == 200, r_proj_b.text
    rows_b = [x for x in r_proj_b.json()["rows"] if _SUFFIX in str(x.get("Item Name", ""))]
    assert len(rows_b) == 0
