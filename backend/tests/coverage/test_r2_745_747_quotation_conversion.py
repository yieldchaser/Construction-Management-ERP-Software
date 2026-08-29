"""R2-745 + R2-747 - convert_quotation_to_invoice must not drop tax or HSN.

Same function, same root cause: it hand-assembles a Bill instead of going
through a shared, validated builder, and each hand-assembly drops a different
field.

R2-745 (CRITICAL). The conversion computes
`gst_amount = cgst_amount + sgst_amount`, dropping `igst_amount`. D4 sets
igst_amount to the FULL tax and zeroes CGST/SGST on an inter-state quotation,
so conversion yields gst_amount 0 and subtotal = the tax-inclusive total: the
tax invoice records zero output GST and overstates taxable value by the tax.
Every other reader of those three columns in crm.py sums all three.

R2-745 defect 2: `_validate_bill_line_items` is wired into create_bill only.
This second bill-creation surface calls no validator, so a quotation carrying
additional_charges or round_off emits line items that under-sum the subtotal --
exactly the mismatch the validator exists to reject.

R2-747 (HIGH). items_json is rebuilt with five keys and `hsn_sac` is not among
them, so the invoice's HSN/SAC column prints blank even when the user entered
HSN on the quotation. And nothing requires HSN: the validator enforces a
description and the subtotal reconciliation, and says nothing about HSN.

Each test fails against the unfixed tree at its own defect's assertion.
"""
import json
import uuid

from app import models

CONVERT = "/apis/v3/crm/quotations/{quotation_id}/convert-to-invoice"


def _project(db, company_id, name, state="Karnataka"):
    p = models.Project(
        id=uuid.uuid4(), company_id=company_id, name=name, status="Ongoing", state=state
    )
    db.add(p)
    db.commit()
    return p


def _lead(db, company_id, name="Ramesh Kumar"):
    lead = models.CRMLead(
        id=uuid.uuid4(),
        company_id=company_id,
        lead_type="Residential",
        contact_name=name,
        phone_no="9000000001",
        status="New Lead",
    )
    db.add(lead)
    db.commit()
    return lead


def _quotation(db, lead_id, *, cgst=0.0, sgst=0.0, igst=0.0, total=118000.0,
               additional_charges=0.0, round_off=0.0):
    q = models.CRMQuotation(
        id=uuid.uuid4(),
        lead_id=lead_id,
        subject="QA quotation",
        status="Confirmed",
        cgst_amount=cgst,
        sgst_amount=sgst,
        igst_amount=igst,
        additional_charges=additional_charges,
        round_off=round_off,
        total_amount=total,
    )
    db.add(q)
    db.commit()
    return q


def _item(db, quotation_id, *, amount, hsn="9954", name="Consultancy"):
    it = models.CRMQuotationItem(
        id=uuid.uuid4(),
        quotation_id=quotation_id,
        item_name=name,
        qty=1,
        unit="Nos",
        selling_price=amount,
        total_amount=amount,
        hsn_sac=hsn,
    )
    db.add(it)
    db.commit()
    return it


def _convert(client, hdr, quotation_id, project_id, party_team_id, invoice_number="INV-Q1"):
    return client.post(
        CONVERT.format(quotation_id=quotation_id),
        json={
            "project_id": str(project_id),
            "party_company_user_id": str(party_team_id),
            "invoice_number": invoice_number,
        },
        headers=hdr,
    )


# --- R2-745 ----------------------------------------------------------------

def test_inter_state_quotation_keeps_its_igst(client, db, make_tenant, auth_headers):
    """D4 put the whole tax in igst_amount; conversion must not drop it."""
    comp, _user, team = make_tenant(company_name="R745A", user_name="U745A")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R745A Project")
    lead = _lead(db, comp.id)
    quot = _quotation(db, lead.id, cgst=0.0, sgst=0.0, igst=18000.0, total=118000.0)
    _item(db, quot.id, amount=100000.0)

    r = _convert(client, hdr, quot.id, project.id, team.id)
    assert r.status_code == 201, r.text
    body = r.json()

    assert body["gst_amount"] == 18000.0, "an inter-state invoice recorded zero GST"
    assert body["subtotal"] == 100000.0, (
        "the tax-inclusive total was booked as taxable value"
    )
    assert body["total_payable"] == 118000.0


def test_intra_state_quotation_is_unaffected(client, db, make_tenant, auth_headers):
    """The guarded path: CGST+SGST still sum correctly."""
    comp, _user, team = make_tenant(company_name="R745B", user_name="U745B")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R745B Project")
    lead = _lead(db, comp.id)
    quot = _quotation(db, lead.id, cgst=9000.0, sgst=9000.0, igst=0.0, total=118000.0)
    _item(db, quot.id, amount=100000.0)

    r = _convert(client, hdr, quot.id, project.id, team.id, "INV-Q2")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["gst_amount"] == 18000.0
    assert body["subtotal"] == 100000.0


def test_conversion_runs_the_line_item_validator(client, db, make_tenant, auth_headers):
    """R2-745 defect 2: additional_charges made lines under-sum; no validator ran."""
    comp, _user, team = make_tenant(company_name="R745C", user_name="U745C")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R745C Project")
    lead = _lead(db, comp.id)
    # Lines total 100000 but the quotation carries 5000 of extra charges, so the
    # subtotal implied by total - tax no longer matches the line items.
    quot = _quotation(
        db, lead.id, cgst=0.0, sgst=0.0, igst=18000.0,
        total=123000.0, additional_charges=5000.0,
    )
    _item(db, quot.id, amount=100000.0)

    r = _convert(client, hdr, quot.id, project.id, team.id, "INV-Q3")
    assert r.status_code == 422, (
        "a conversion whose line items do not reconcile to the subtotal was accepted"
    )
    assert "does not match" in r.json()["detail"]


# --- R2-747 ----------------------------------------------------------------

def test_conversion_carries_hsn_sac_into_the_invoice(client, db, make_tenant, auth_headers):
    comp, _user, team = make_tenant(company_name="R747A", user_name="U747A")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R747A Project")
    lead = _lead(db, comp.id)
    quot = _quotation(db, lead.id, cgst=9000.0, sgst=9000.0, igst=0.0, total=118000.0)
    _item(db, quot.id, amount=100000.0, hsn="995421")

    r = _convert(client, hdr, quot.id, project.id, team.id, "INV-H1")
    assert r.status_code == 201, r.text

    bill = db.query(models.Bill).filter(models.Bill.id == uuid.UUID(r.json()["bill_id"])).first()
    lines = json.loads(bill.items_json)
    assert lines[0].get("hsn_sac") == "995421", (
        "the quotation collected HSN/SAC and conversion dropped it, so the "
        "invoice's HSN column prints blank"
    )


def test_tax_invoice_requires_hsn_sac_per_line(client, db, make_tenant, auth_headers):
    """R2-747 leg 1: nothing required HSN on the direct creation path either."""
    comp, _user, team = make_tenant(company_name="R747B", user_name="U747B")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R747B Project")

    r = client.post(
        "/apis/v3/billing/bills",
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "party_company_user_id": str(team.id),
            "invoice_number": "INV-H2",
            "invoice_date": "2026-08-20T00:00:00Z",
            "invoice_type": "sale",
            "subtotal": 1000.0,
            "gst_pct": 18.0,
            "items_json": json.dumps([{"desc": "Consultancy", "qty": 1, "rate": 1000.0,
                                       "amount": 1000.0}]),
        },
        headers=hdr,
    )
    assert r.status_code == 422, r.text
    assert "HSN" in r.json()["detail"]


def test_non_revenue_invoice_does_not_require_hsn(client, db, make_tenant, auth_headers):
    """The rule is for tax invoices; a purchase bill is unaffected."""
    comp, _user, team = make_tenant(company_name="R747C", user_name="U747C")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R747C Project")

    r = client.post(
        "/apis/v3/billing/bills",
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "party_company_user_id": str(team.id),
            "invoice_number": "INV-H3",
            "invoice_date": "2026-08-20T00:00:00Z",
            "invoice_type": "purchase",
            "subtotal": 1000.0,
            "gst_pct": 18.0,
            "items_json": json.dumps([{"desc": "Cement", "qty": 1, "rate": 1000.0,
                                       "amount": 1000.0}]),
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
