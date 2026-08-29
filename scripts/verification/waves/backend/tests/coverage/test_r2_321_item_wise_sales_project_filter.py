"""R2-321 — item-wise sales honours the project filter and drops fabricated columns.

The handler accepted pid and never referenced it, so a project selection
returned every quotation line in the company. Quotation lines hang off leads
(CRMQuotationItem -> CRMQuotation -> CRMLead) and crm_leads carries no project
linkage at all, so an explicit project filter can only truthfully select zero
rows. The five invoice-shaped headers with no backing data on a quotation line
(Sale Type, Project Name, Invoice Number, Tax Amount, Gross Amount) were
hardcoded "" and are gone from the response instead.
"""
import uuid

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


def _mk_quotation_item(db, comp, client_name, item_name):
    lead = models.CRMLead(
        id=uuid.uuid4(), company_id=comp.id, lead_type="New Project",
        contact_name=f"Contact {client_name}", phone_no="9999999999",
        client_company_name=client_name,
    )
    db.add(lead)
    db.flush()
    quot = models.CRMQuotation(id=uuid.uuid4(), lead_id=lead.id, subject=f"{client_name} quote")
    db.add(quot)
    db.flush()
    item = models.CRMQuotationItem(
        id=uuid.uuid4(), quotation_id=quot.id, item_name=item_name,
        qty=2, unit="Nos", selling_price=1000, total_amount=2000,
    )
    db.add(item)
    db.commit()
    return item


def test_pid_filters_rows_and_fabricated_columns_are_gone(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R2321A", user_name="U2321A")
    hdr = auth_headers(user, comp)
    proj_a = _mk_project(db, comp, "Wave-H-321A")
    proj_b = _mk_project(db, comp, "Wave-H-321B")
    tag = uuid.uuid4().hex[:6]
    _mk_quotation_item(db, comp, f"Client A {tag}", f"Steel-{tag}")
    _mk_quotation_item(db, comp, f"Client B {tag}", f"Cement-{tag}")

    # Without a project: the report stays company-wide and returns both lines.
    r = client.get(f"{DATA}/item-wise-sales?company_id={comp.id}", headers=hdr)
    assert r.status_code == 200
    rows = [x for x in r.json()["rows"] if tag in str(x.get("Item Name", ""))]
    assert len(rows) == 2

    # No row may still carry one of the structurally unfillable headers.
    fabricated = {"Sale Type", "Project Name", "Invoice Number", "Tax Amount", "Gross Amount"}
    for x in r.json()["rows"]:
        assert not fabricated & set(x.keys())

    # Passing either project's id filters rows: leads have no project linkage,
    # so the truthful filtered result is zero of this company's lines.
    for proj in (proj_a, proj_b):
        rf = client.get(
            f"{DATA}/item-wise-sales?company_id={comp.id}&project_id={proj.id}",
            headers=hdr,
        )
        assert rf.status_code == 200
        assert [x for x in rf.json()["rows"] if tag in str(x.get("Item Name", ""))] == []
