"""R2-272 - the invoice PDF must carry what an Indian GST tax invoice requires.

Gate: GET /apis/v3/billing/bills/{id}/pdf titles GST-bearing invoices with the
words Tax Invoice, prints the recipient GSTIN held on LibraryParty.tax_no and
the Place of Supply state code read from it, renders an HSN/SAC column fed from
items_json lines (the key the quotation-to-invoice conversion already writes),
and splits the combined gst_amount into IGST when the supplier and recipient
state codes differ and CGST/SGST halves when they match.
"""
import uuid
import datetime

from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_bill(db, comp, project, team_id, **kw):
    fields = dict(
        id=uuid.uuid4(), company_id=comp.id, project_id=project.id,
        party_company_user_id=team_id,
        invoice_number=f"INV-R272-{uuid.uuid4().hex[:6]}",
        invoice_date=datetime.datetime(2026, 2, 1), invoice_type="sale",
        subtotal=1000.0, gst_amount=180.0, total_payable=1180.0,
    )
    fields.update(kw)
    bill = models.Bill(**fields)
    db.add(bill)
    db.commit()
    return bill


def _get_pdf(client, hdr, bill):
    r = client.get(f"/apis/v3/billing/bills/{bill.id}/pdf", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.headers["content-type"] == "application/pdf"
    return r.content


def test_inter_state_sale_prints_tax_invoice_recipient_gstin_place_of_supply_hsn_and_igst(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R272A", user_name="U272A")
    hdr = auth_headers(user, comp)
    comp.gstin = "29ABCDE1234F1Z5"  # supplier registered in Karnataka (29)
    db.commit()
    project = _mk_project(db, comp)

    lp = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name="R272 Buyer Co", tax_no="27AAECS1234F1Z5")  # Maharashtra (27)
    db.add(lp)
    db.commit()
    team.library_party_id = lp.id
    db.commit()

    bill = _mk_bill(
        db, comp, project, team.id,
        items_json='[{"desc":"Slab work","hsn_sac":"990722","qty":"1","rate":"1000","amount":"1000"}]',
    )
    body = _get_pdf(client, hdr, bill)

    assert b"Tax Invoice" in body
    assert b"Recipient GSTIN: 27AAECS1234F1Z5" in body
    assert b"Place of Supply: 27" in body
    assert b"HSN/SAC" in body
    assert b"990722" in body
    assert b"IGST: 180.00" in body
    assert b"CGST:" not in body
    assert b"SGST:" not in body


def test_intra_state_supply_splits_gst_into_cgst_sgst_halves(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R272B", user_name="U272B")
    hdr = auth_headers(user, comp)
    comp.gstin = "29ABCDE1234F1Z5"
    db.commit()
    project = _mk_project(db, comp)

    lp = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name="R272 Local Buyer", tax_no="29AACCL5678G1Z3")  # same state (29)
    db.add(lp)
    db.commit()
    team.library_party_id = lp.id
    db.commit()

    bill = _mk_bill(db, comp, project, team.id)
    body = _get_pdf(client, hdr, bill)

    assert b"Tax Invoice" in body
    assert b"Recipient GSTIN: 29AACCL5678G1Z3" in body
    assert b"Place of Supply: 29" in body
    assert b"CGST: 90.00" in body
    assert b"SGST: 90.00" in body
    assert b"IGST:" not in body


def test_gst_split_lines_absent_when_bill_carries_no_tax(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R272C", user_name="U272C")
    hdr = auth_headers(user, comp)
    db.commit()
    project = _mk_project(db, comp)

    bill = _mk_bill(db, comp, project, team.id, gst_amount=0.0, total_payable=1000.0)
    body = _get_pdf(client, hdr, bill)

    assert b"Tax Invoice" in body
    assert b"GST Amount: 0.0" in body or b"GST Amount: 0" in body
    assert b"CGST:" not in body
    assert b"SGST:" not in body
    assert b"IGST:" not in body
