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
