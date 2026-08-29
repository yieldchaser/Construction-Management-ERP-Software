"""R2-359 + R2-360 - CRM lookups are actually referenced, and a quotation can
become an invoice.

R2-359: three company-scoped lookup tables (sources, categories, statuses) and
six endpoints maintain them, yet create_lead/update_lead wrote source,
category and status as free text while validating party_id properly. Now every
supplied value must resolve against the company's own lookup: case variants
normalise to the stored name and unknown values are refused with 400 naming
the options.

R2-360: a won quotation was a dead end - no endpoint created a Bill from a
CRMQuotation and neither table carried a reference to the other. Bill grows a
nullable quotation_id and POST /crm/quotations/{id}/convert-to-invoice turns
the quotation into a sale invoice built from its own arithmetic, itemised into
items_json, one active invoice per quotation.
"""
import json
import uuid
from datetime import datetime

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _lead_payload(company_id, **overrides):
    payload = {
        "company_id": str(company_id),
        "lead_type": "Sales",
        "contact_name": "L1",
        "phone_no": "+919999000001",
        "client_company_name": "Acme Builders",
        "status": "New Lead",
        "priority": "medium",
        "budget": 100000.0,
    }
    payload.update(overrides)
    return payload


def _create_lead(client, hdr, company_id, **overrides):
    return client.post(
        "/apis/v3/crm/leads",
        json=_lead_payload(company_id, **overrides),
        headers=hdr,
    )


# ─── R2-359 ──────────────────────────────────────────────────────────────────


def test_r2_359_unknown_category_refused(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R2359a-{_SUFFIX}", user_name="U359",
        mobile=f"+9193600{_SUFFIX[:8]}", email=f"r2359a-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = _create_lead(client, hdr, comp.id, category="Retail")
    assert r.status_code == 400, r.text
    assert "CRM category" in r.json()["detail"], r.text


def test_r2_359_lookup_values_normalise_and_resolve(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2359b-{_SUFFIX}", user_name="U359b",
        mobile=f"+9193601{_SUFFIX[:8]}", email=f"r2359b-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)

    # A custom source only exists once the company creates it through the
    # lookup endpoint.
    r_src = client.post(
        f"/apis/v3/crm/lead-sources/{comp.id}", json={"name": "Trade Fair"}, headers=hdr,
    )
    assert r_src.status_code == 201, r_src.text

    r = _create_lead(client, hdr, comp.id, source="trade fair")
    assert r.status_code == 201, r.text
    assert r.json()["source"] == "Trade Fair", r.text
    lead_id = r.json()["id"]

    # Status casing collapses onto the stored name ("won" -> "Won"), and the
    # Won pipeline state is part of the seeded vocabulary so ensure_lead_party
    # keeps firing.
    r2 = client.put(f"/apis/v3/crm/leads/{lead_id}", json={"status": "won"}, headers=hdr)
    assert r2.status_code == 200, r2.text
    assert r2.json()["status"] == "Won", r2.text
    assert r2.json()["party_id"] is not None, r2.text

    statuses = client.get(f"/apis/v3/crm/lead-statuses/{comp.id}", headers=hdr).json()
    assert "Won" in [s["name"] for s in statuses]

    db.expire_all()
    row = db.query(models.CRMLead).filter(models.CRMLead.id == uuid.UUID(lead_id)).first()
    assert row.source == "Trade Fair" and row.status == "Won"


def test_r2_359_values_outside_the_lookup_are_refused_with_options(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R2359c-{_SUFFIX}", user_name="U359c",
        mobile=f"+9193602{_SUFFIX[:8]}", email=f"r2359c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)

    r = _create_lead(client, hdr, comp.id)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]

    r2 = client.put(
        f"/apis/v3/crm/leads/{lead_id}", json={"status": "Closed Won"}, headers=hdr,
    )
    assert r2.status_code == 400, r2.text
    detail = r2.json()["detail"]
    assert "New Lead" in detail and "Lost" in detail

    r3 = _create_lead(client, hdr, comp.id, source="Dark Web")
    assert r3.status_code == 400, r3.text
    assert "Website" in r3.json()["detail"]


# ─── R2-360 ──────────────────────────────────────────────────────────────────


def _make_quotation(client, hdr, comp, db):
    """Seed a bill_level quotation (10 nos x 1000 @ 18% GST = 11800) straight
    through the ORM: POST /quotations itself currently fails to serialise its
    response (unrelated pre-existing defect, out of this wave's scope)."""
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P360-{_SUFFIX}",
        code=f"PRJ-360-{_SUFFIX}", status="Ongoing", state="Karnataka",
    )
    db.add(project)

    lead_res = _create_lead(client, hdr, comp.id)
    assert lead_res.status_code == 201, lead_res.text
    lead = db.query(models.CRMLead).filter(models.CRMLead.id == uuid.UUID(lead_res.json()["id"])).first()

    qt_no = f"QT-360-{_SUFFIX}"
    quot = models.CRMQuotation(
        id=uuid.uuid4(), lead_id=lead.id, subject="Interior fitout",
        tax_type="bill_level", status="Confirmed",
        gst_pct=18.0, cgst_pct=9.0, sgst_pct=9.0,
        cgst_amount=900.0, sgst_amount=900.0,
        discount=0.0, additional_charges=0.0, round_off=0.0,
        qt_no=qt_no, total_amount=11800.0,
    )
    db.add(quot)
    db.flush()
    db.add(models.CRMQuotationItem(
        id=uuid.uuid4(), quotation_id=quot.id, item_name="Modular wardrobe",
        qty=10, unit="nos", cost_price=0, selling_price=1000.0,
        supply_rate=0, installation_rate=0, supply_tax_pct=18.0,
        installation_tax_pct=12.0, total_amount=10000.0, markup=0,
        hsn_sac="9954",
    ))
    db.commit()
    return project, {"id": str(quot.id), "qt_no": qt_no}


def test_r2_360_quotation_converts_to_linked_sale_invoice(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"R2360a-{_SUFFIX}", user_name="U360",
        mobile=f"+9193603{_SUFFIX[:8]}", email=f"r2360a-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    project, quot = _make_quotation(client, hdr, comp, db)

    r = client.post(
        f"/apis/v3/crm/quotations/{quot['id']}/convert-to-invoice",
        json={"project_id": str(project.id), "party_company_user_id": str(team.id)},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    conv = r.json()
    assert conv["invoice_number"] == f"INV-{quot['qt_no']}", conv
    assert conv["quotation_id"] == quot["id"]
    assert conv["subtotal"] == 10000.0 and conv["gst_amount"] == 1800.0
    assert conv["total_payable"] == 11800.0

    db.expire_all()
    bill = db.query(models.Bill).filter(models.Bill.id == uuid.UUID(conv["bill_id"])).first()
    assert bill is not None
    assert str(bill.quotation_id) == quot["id"]
    assert bill.invoice_type == "sale" and bill.status == "Unpaid"
    assert float(bill.subtotal) == 10000.0 and float(bill.total_payable) == 11800.0
    lines = json.loads(bill.items_json)
    assert [l["desc"] for l in lines] == ["Modular wardrobe"]
    assert lines[0]["rate"] == 1000.0 and lines[0]["amount"] == 10000.0

    # The reconciliation CRM never had: quotations -> invoices is answerable.
    linked = (
        db.query(models.Bill)
        .filter(models.Bill.quotation_id == uuid.UUID(quot["id"]), models.Bill.status != "Cancelled")
        .count()
    )
    assert linked == 1

    # A second conversion would double-bill the same won work: refused.
    r2 = client.post(
        f"/apis/v3/crm/quotations/{quot['id']}/convert-to-invoice",
        json={"project_id": str(project.id), "party_company_user_id": str(team.id)},
        headers=hdr,
    )
    assert r2.status_code == 409, r2.text
    assert "already converted" in r2.json()["detail"]


def test_r2_360_conversion_resolves_references_and_numbers(client, db, make_tenant, auth_headers):
    comp_a, user_a, team_a = make_tenant(
        company_name=f"R2360b-{_SUFFIX}", user_name="U360b",
        mobile=f"+9193604{_SUFFIX[:8]}", email=f"r2360b-{_SUFFIX}@test.com",
    )
    comp_b, _, _ = make_tenant(
        company_name=f"R2360c-{_SUFFIX}", user_name="U360c",
        mobile=f"+9193605{_SUFFIX[:8]}", email=f"r2360c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user_a, comp_a)
    project, quot = _make_quotation(client, hdr, comp_a, db)

    other_project = models.Project(
        id=uuid.uuid4(), company_id=comp_b.id, name="Foreign",
        code=f"PRJ-F-{_SUFFIX}", status="Ongoing", state="Karnataka",
    )
    db.add(other_project)
    db.commit()

    # Another company's project can never receive this company's invoice.
    r = client.post(
        f"/apis/v3/crm/quotations/{quot['id']}/convert-to-invoice",
        json={"project_id": str(other_project.id), "party_company_user_id": str(team_a.id)},
        headers=hdr,
    )
    assert r.status_code == 403, r.text

    # A party row outside the company is named and refused.
    r2 = client.post(
        f"/apis/v3/crm/quotations/{quot['id']}/convert-to-invoice",
        json={"project_id": str(project.id), "party_company_user_id": str(uuid.uuid4())},
        headers=hdr,
    )
    assert r2.status_code == 400, r2.text
    assert "Invoice party" in r2.json()["detail"]

    # An explicit invoice number colliding with an existing one is refused.
    db.add(models.Bill(
        id=uuid.uuid4(), company_id=comp_a.id, project_id=project.id,
        party_company_user_id=team_a.id, invoice_number="DUP-1",
        invoice_date=datetime.utcnow(), invoice_type="sale", status="Unpaid",
        subtotal=1.0, gst_amount=0.0, total_payable=1.0,
    ))
    db.commit()
    r3 = client.post(
        f"/apis/v3/crm/quotations/{quot['id']}/convert-to-invoice",
        json={"project_id": str(project.id), "party_company_user_id": str(team_a.id),
              "invoice_number": "DUP-1"},
        headers=hdr,
    )
    assert r3.status_code == 409, r3.text
    assert "already exists" in r3.json()["detail"]

    # A distinct explicit number converts fine.
    r4 = client.post(
        f"/apis/v3/crm/quotations/{quot['id']}/convert-to-invoice",
        json={"project_id": str(project.id), "party_company_user_id": str(team_a.id),
              "invoice_number": "SALE-360-1"},
        headers=hdr,
    )
    assert r4.status_code == 201, r4.text
    assert r4.json()["invoice_number"] == "SALE-360-1"
