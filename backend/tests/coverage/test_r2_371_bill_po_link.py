"""R2-371 - a bill must be able to record the purchase order it bills against.

Bill carried wo_id (subcontractor work orders) and match_id, but no
purchase-order reference. Billed-vs-ordered was therefore uncomputable for
materials and over-invoicing against a PO was structurally undetectable: a
vendor could bill far more than the PO committed and no query in the product
could relate the two documents. The only indirect path,
Bill.match_id -> ThreeWayMatch.po_id, was empty in practice -- of 7 purchase
bills in production, zero carried a match_id.

Fix shape as filed: a nullable FK populated when a bill is raised against a PO,
plus a derived cumulative-billed check at bill creation.
"""
import uuid
from datetime import datetime, timezone

from app import models

BILLS = "/apis/v3/billing/bills"


def _project(db, company_id, name):
    # state is required by the place-of-supply guard on invoice creation.
    p = models.Project(
        id=uuid.uuid4(), company_id=company_id, name=name, status="Ongoing", state="Karnataka"
    )
    db.add(p)
    db.commit()
    return p


def _po(db, company_id, project_id, number, total):
    po = models.PurchaseOrder(
        id=uuid.uuid4(),
        company_id=company_id,
        project_id=project_id,
        po_number=number,
        po_date=datetime(2026, 8, 1, tzinfo=timezone.utc),
        status="approved",
        total_amount=total,
        approval_flag="approved",
    )
    db.add(po)
    db.commit()
    return po


def _bill_payload(comp, project, party_team_id, subtotal, po_id=None, number="INV-1"):
    payload = {
        "company_id": str(comp.id),
        "project_id": str(project.id),
        "party_company_user_id": str(party_team_id),
        "invoice_number": number,
        "invoice_date": "2026-08-20T00:00:00Z",
        "invoice_type": "purchase",
        "subtotal": subtotal,
        "gst_pct": 0.0,
    }
    if po_id is not None:
        payload["po_id"] = str(po_id)
    return payload


def test_bill_records_the_po_it_is_raised_against(client, db, make_tenant, auth_headers):
    comp, _user, team = make_tenant(company_name="R371A", user_name="U371A")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R371A Project")
    po = _po(db, comp.id, project.id, "PO-371-A", 10000.0)

    r = client.post(BILLS, json=_bill_payload(comp, project, team.id, 2500.0, po.id), headers=hdr)
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["po_id"] == str(po.id), "the bill did not record its purchase order"

    stored = db.query(models.Bill).filter(models.Bill.id == uuid.UUID(body["id"])).first()
    assert stored.po_id == po.id


def test_over_invoicing_against_a_po_is_rejected(client, db, make_tenant, auth_headers):
    """The control the missing column made impossible."""
    comp, _user, team = make_tenant(company_name="R371B", user_name="U371B")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R371B Project")
    po = _po(db, comp.id, project.id, "PO-371-B", 1000.0)

    r = client.post(BILLS, json=_bill_payload(comp, project, team.id, 5000.0, po.id), headers=hdr)
    assert r.status_code == 422, r.text
    assert "PO-371-B" in r.json()["detail"]


def test_cumulative_billing_within_the_po_is_allowed(client, db, make_tenant, auth_headers):
    comp, _user, team = make_tenant(company_name="R371C", user_name="U371C")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R371C Project")
    po = _po(db, comp.id, project.id, "PO-371-C", 1000.0)

    first = client.post(
        BILLS, json=_bill_payload(comp, project, team.id, 400.0, po.id, "INV-C1"), headers=hdr
    )
    assert first.status_code == 201, first.text

    second = client.post(
        BILLS, json=_bill_payload(comp, project, team.id, 400.0, po.id, "INV-C2"), headers=hdr
    )
    assert second.status_code == 201, second.text

    # A third would take cumulative billing to 1200 against a 1000 PO.
    third = client.post(
        BILLS, json=_bill_payload(comp, project, team.id, 400.0, po.id, "INV-C3"), headers=hdr
    )
    assert third.status_code == 422, third.text


def test_po_of_another_company_is_rejected(client, db, make_tenant, auth_headers):
    comp_a, user_a, team_a = make_tenant(company_name="R371D", user_name="U371D")
    comp_b, _user_b, _team_b = make_tenant(company_name="R371E", user_name="U371E")
    hdr_a = auth_headers(user_a, comp_a)

    project_a = _project(db, comp_a.id, "R371D Project")
    project_b = _project(db, comp_b.id, "R371E Project")
    foreign_po = _po(db, comp_b.id, project_b.id, "PO-371-E", 1000.0)

    r = client.post(
        BILLS, json=_bill_payload(comp_a, project_a, team_a.id, 100.0, foreign_po.id), headers=hdr_a
    )
    assert r.status_code == 400, r.text


def test_unknown_po_is_rejected(client, db, make_tenant, auth_headers):
    comp, _user, team = make_tenant(company_name="R371F", user_name="U371F")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R371F Project")

    r = client.post(
        BILLS, json=_bill_payload(comp, project, team.id, 100.0, uuid.uuid4()), headers=hdr
    )
    assert r.status_code == 404, r.text


def test_bill_without_a_po_is_unaffected(client, db, make_tenant, auth_headers):
    """po_id is optional; legacy and non-purchase bills must still work."""
    comp, _user, team = make_tenant(company_name="R371G", user_name="U371G")
    hdr = auth_headers(_user, comp)
    project = _project(db, comp.id, "R371G Project")

    r = client.post(BILLS, json=_bill_payload(comp, project, team.id, 100.0), headers=hdr)
    assert r.status_code == 201, r.text
    assert r.json()["po_id"] is None
