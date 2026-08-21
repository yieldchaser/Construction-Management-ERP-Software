"""R2-401 - invoices must not be creatable without verifiable line detail.

Gate: POST /billing/bills rejects a tax invoice (sale / material_sale) whose
items_json is null or empty (the live repro: ZZ-QA-NOGST-001 stored
items_json: null with subtotal 1,000 and its PDF printed "(No line items)");
whenever line items ARE supplied, every line needs a description and the line
amounts must reconcile to the bill subtotal. Non-tax flows that legitimately
carry no lines (e.g. the dashboard RA-bill form for subcon bills) stay open.
"""
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


def _payload(comp, project, team, **kw):
    payload = {
        "company_id": str(comp.id),
        "project_id": str(project.id),
        "party_company_user_id": str(team.id),
        "invoice_number": f"INV-R401-{uuid.uuid4().hex[:6]}",
        "invoice_date": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "invoice_type": "sale",
        "subtotal": 1000.0,
        "gst_pct": 18.0,
        "deductions": [],
    }
    payload.update(kw)
    return payload


def _lines(*amounts):
    return json.dumps([
        {"desc": f"Supply line {i + 1}", "qty": 1, "rate": a, "amount": a}
        for i, a in enumerate(amounts)
    ])


def test_sale_invoice_without_line_items_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R401A", user_name="U401A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    r = client.post("/apis/v3/billing/bills", json=_payload(comp, project, team), headers=hdr)
    assert r.status_code == 422, r.text
    assert "line item" in r.json()["detail"].lower()


def test_sale_invoice_with_empty_lines_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R401B", user_name="U401B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    r = client.post(
        "/apis/v3/billing/bills",
        json=_payload(comp, project, team, items_json="[]"),
        headers=hdr,
    )
    assert r.status_code == 422, r.text


def test_unreconciled_line_total_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R401C", user_name="U401C")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    # Lines sum to 900 against a claimed subtotal of 1,000.
    r = client.post(
        "/apis/v3/billing/bills",
        json=_payload(comp, project, team, items_json=_lines(500.0, 400.0)),
        headers=hdr,
    )
    assert r.status_code == 422, r.text
    assert "does not match the bill subtotal" in r.json()["detail"]


def test_undescribed_line_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R401D", user_name="U401D")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    lines = json.dumps([{"desc": "", "qty": 1, "rate": 1000.0, "amount": 1000.0}])
    r = client.post(
        "/apis/v3/billing/bills",
        json=_payload(comp, project, team, items_json=lines),
        headers=hdr,
    )
    assert r.status_code == 422, r.text
    assert "description" in r.json()["detail"].lower()


def test_sale_invoice_with_reconciled_lines_created(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R401E", user_name="U401E")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    r = client.post(
        "/apis/v3/billing/bills",
        json=_payload(comp, project, team, items_json=_lines(600.0, 400.0)),
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["subtotal"] == 1000.0
    assert '"desc": "Supply line 1"' in body["items_json"]


def test_subcon_ra_bill_without_items_still_allowed(client, db, make_tenant, auth_headers):
    """The dashboard RA-bill form posts subcon bills with no items_json; that
    non-tax flow must keep working (only tax invoices force line detail)."""
    comp, user, team = make_tenant(company_name="R401F", user_name="U401F")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    r = client.post(
        "/apis/v3/billing/bills",
        json=_payload(comp, project, team, invoice_type="subcon"),
        headers=hdr,
    )
    assert r.status_code == 201, r.text
