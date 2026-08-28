"""R2-412 / R2-413 - the ZATCA artefact must be deliberate, identified and real.

R2-412: the endpoint used to hand out a complete, official-looking e-invoice
(QR + UBL) for every revenue bill regardless of configuration - rupees
labelled SAR and the company's Indian GSTIN presented as a Saudi VAT
registration number. Now the document only exists when the operator has
actually enabled ZATCA AND stored the seller's VAT registration number.

R2-413: the generator synthesised a placeholder line ("Item", 10.00 against a
100,000 total) whenever items_json was empty or its keys did not match; real
line items are stored with the key "desc" (crm.py conversion, models.Bill
comment) so every genuine line rendered as "Item". Now the lines come from
the bill's own data, amounts derive qty*rate when amount is absent, and any
bill without reconcilable line detail is refused instead of fabricated.
"""
import base64
import datetime
import json
import uuid

from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _lines(*specs):
    return json.dumps([{"desc": d, "qty": 1, "rate": a, "amount": a} for d, a in specs])


def _mk_sale_bill(client, db, comp, user, team, items_json=None, subtotal=1000.0, gst_pct=18.0):
    project = _mk_project(db, comp)
    payload = {
        "company_id": str(comp.id),
        "project_id": str(project.id),
        "party_company_user_id": str(team.id),
        "invoice_number": f"INV-Z41x-{uuid.uuid4().hex[:6]}",
        "invoice_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "invoice_type": "sale",
        "subtotal": subtotal,
        "gst_pct": gst_pct,
        "deductions": [],
    }
    if items_json is not None:
        payload["items_json"] = items_json
    r = client.post("/apis/v3/billing/bills", json=payload, headers={"Authorization": _hdr(db, comp, user)})
    assert r.status_code == 201, r.text
    return r.json()["id"]


def _hdr(db, comp, user):
    from app.auth import create_access_token

    token = create_access_token(
        {"sub": str(user.id), "company_id": str(comp.id), "user_name": user.name}
    )
    return f"Bearer {token}"


def _configure_zatca(db, comp, vat="300000000000003"):
    comp.is_zatca_enable = True
    comp.vat_number = vat
    db.commit()


def _qr_tags(qr_b64: str) -> dict:
    raw = base64.b64decode(qr_b64)
    out, i = {}, 0
    while i < len(raw):
        tag, ln = raw[i], raw[i + 1]
        out[tag] = raw[i + 2 : i + 2 + ln].decode("utf-8")
        i += 2 + ln
    return out


def _get_zatca(client, comp, user, bill_id):
    return client.get(
        f"/apis/v3/billing/bills/{bill_id}/zatca",
        headers={"Authorization": _hdr(None, comp, user)},
    )


# ---------------------------------------------------------------- R2-412


def test_unconfigured_company_gets_no_artefact(client, db, make_tenant):
    """Default company: no QR, no UBL, 409 - not a full payload plus an
    easy-to-ignore boolean."""
    comp, user, team = make_tenant(company_name="Z412A", user_name="U412A")
    bill_id = _mk_sale_bill(client, db, comp, user, team, items_json=_lines(("Supply", 1000.0)))
    comp.gstin = "29ABCDE1234F1Z5"
    db.commit()

    r = _get_zatca(client, comp, user, bill_id)
    assert r.status_code == 409, r.text
    body = r.json()
    assert "not enabled" in body["detail"].lower()
    assert "qr_tlv_base64" not in body and "ubl_xml" not in body


def test_gstin_never_presents_as_saudi_vat_number(client, db, make_tenant):
    """Enabled but no stored VAT registration: refuse rather than dress the
    GSTIN up as the seller's Saudi VAT number."""
    comp, user, team = make_tenant(company_name="Z412B", user_name="U412B")
    bill_id = _mk_sale_bill(client, db, comp, user, team, items_json=_lines(("Supply", 1000.0)))
    comp.gstin = "29ABCDE1234F1Z5"
    comp.is_zatca_enable = True
    comp.vat_number = None
    db.commit()

    r = _get_zatca(client, comp, user, bill_id)
    assert r.status_code == 409, r.text
    assert "vat registration" in r.json()["detail"].lower()


def test_configured_seller_document_carries_stored_vat_only(client, db, make_tenant):
    """The one happy path: explicitly enabled + stored registration number.
    The QR tag 2 and the UBL CompanyID carry that number; the GSTIN appears
    nowhere in the tax-identity slots."""
    comp, user, team = make_tenant(company_name="Z412C", user_name="U412C")
    bill_id = _mk_sale_bill(
        client, db, comp, user, team,
        items_json=_lines(("Cement supply", 600.0), ("Steel supply", 400.0)),
    )
    comp.gstin = "29ABCDE1234F1Z5"
    _configure_zatca(db, comp, vat="300000000000003")

    r = _get_zatca(client, comp, user, bill_id)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["is_zatca_enabled"] is True

    tags = _qr_tags(body["qr_tlv_base64"])
    assert tags[2] == "300000000000003"

    xml = body["ubl_xml"]
    assert "<cbc:CompanyID>300000000000003</cbc:CompanyID>" in xml
    assert "29ABCDE1234F1Z5" not in xml.split("</cac:AccountingSupplierParty>")[0]


# ---------------------------------------------------------------- R2-413


def _configured_tenant(client, db, make_tenant, name, user):
    comp, user, team = make_tenant(company_name=name, user_name=user)
    _configure_zatca(db, comp)
    return comp, user, team


def test_legacy_bill_without_lines_refuses_instead_of_fabricating(client, db, make_tenant):
    """items_json NULL (pre-R2-401 rows): the old code synthesised a summary
    line; now the document is refused outright."""
    comp, user, team = _configured_tenant(client, db, make_tenant, "Z413A", "U413A")
    bill_id = _mk_sale_bill(client, db, comp, user, team, items_json=_lines(("Supply", 1000.0)))
    bill = db.query(models.Bill).filter(models.Bill.id == uuid.UUID(bill_id)).first()
    bill.items_json = None
    db.commit()

    r = _get_zatca(client, comp, user, bill_id)
    assert r.status_code == 409, r.text
    assert "no line items" in r.json()["detail"].lower()
    assert "ubl_xml" not in r.json()


def test_real_lines_render_desc_names_and_reconcile_to_total(client, db, make_tenant):
    """The live fabrication path: stored entries key on "desc", so every real
    line used to render as <cbc:Name>Item</cbc:Name>. Names now come through
    and the invoice lines sum to the LegalMonetaryTotal."""
    comp, user, team = _configured_tenant(client, db, make_tenant, "Z413B", "U413B")
    bill_id = _mk_sale_bill(
        client, db, comp, user, team,
        items_json=_lines(("Cement supply", 600.0), ("Steel supply", 400.0)),
    )

    body = _get_zatca(client, comp, user, bill_id).json()
    xml = body["ubl_xml"]
    assert "<cbc:Name>Cement supply</cbc:Name>" in xml
    assert "<cbc:Name>Steel supply</cbc:Name>" in xml
    assert "<cbc:Name>Item</cbc:Name>" not in xml

    segments = xml.split("<cac:InvoiceLine>")[1:]
    amounts = [float(s.split("</cbc:LineExtensionAmount>")[0].rsplit(">", 1)[-1]) for s in segments]
    assert len(amounts) == 2
    assert abs(sum(amounts) - 1000.0) <= 0.01
    assert "<cbc:LineExtensionAmount currencyID=\"SAR\">1000.00</cbc:LineExtensionAmount>" in xml.split(
        "<cac:LegalMonetaryTotal>"
    )[1]


def test_qty_rate_only_lines_derive_amounts_like_the_validator(client, db, make_tenant):
    """Lines carrying qty/rate without an amount key pass the create-time
    validator via qty*rate; the e-invoice must price them the same way
    instead of emitting 0.00 against the subtotal."""
    comp, user, team = _configured_tenant(client, db, make_tenant, "Z413C", "U413C")
    items = json.dumps([{"desc": "Formwork", "qty": 10, "rate": 100}])
    bill_id = _mk_sale_bill(client, db, comp, user, team, items_json=items, subtotal=1000.0, gst_pct=0)

    body = _get_zatca(client, comp, user, bill_id)
    assert body.status_code == 200, body.text
    xml = body.json()["ubl_xml"]
    assert "<cbc:PriceAmount currencyID=\"SAR\">1000.00</cbc:PriceAmount>" in xml


def test_divergent_legacy_rows_refuse(client, db, make_tenant):
    """A legacy row whose lines no longer reconcile with its totals (the
    audit's literal 10.00-vs-100,000 shape) is refused, not emitted."""
    comp, user, team = _configured_tenant(client, db, make_tenant, "Z413D", "U413D")
    bill_id = _mk_sale_bill(
        client, db, comp, user, team,
        items_json=_lines(("Supply", 600.0), ("Install", 400.0)),
    )
    bill = db.query(models.Bill).filter(models.Bill.id == uuid.UUID(bill_id)).first()
    bill.items_json = json.dumps([{"desc": "Legacy row", "qty": 1, "rate": 10, "amount": 10.0}])
    db.commit()

    r = _get_zatca(client, comp, user, bill_id)
    assert r.status_code == 409, r.text
    assert "do not sum to the document total" in r.json()["detail"]
