"""R2-053 - PaymentRequest.details is optional end to end.

The model column has always been nullable (models.PaymentRequest.details),
but PaymentRequestCreate demanded a plain `details: str`, so the transaction
modal's blank "Ship To" (sent as null) 422'd the create. The create schema now
matches the model, and rows persisted without details serialize through the
plain-str response with the standard empty-value glyph instead of crashing.
"""
import uuid

from app import models


def _payload(user):
    return {
        "party_company_user_id": str(user.id),
        "amount": 250.0,
    }


def test_create_without_details_succeeds_and_list_renders(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R053A", user_name="U053A")
    hdr = auth_headers(user, comp)

    r = client.post(
        f"/apis/v3/finance/payment-requests/{comp.id}",
        json=_payload(user),
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["request_no"] == "PR-1"

    row = db.query(models.PaymentRequest).filter_by(company_id=comp.id).one()
    assert row.details is None

    lst = client.get(f"/apis/v3/finance/payment-requests/{comp.id}", headers=hdr)
    assert lst.status_code == 200, lst.text
    items = [x for x in lst.json() if x["id"] == str(row.id)]
    assert len(items) == 1
    # None must not blow up the plain-str response field.
    assert items[0]["details"] == "\u2014"


def test_create_with_details_unchanged(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R053B", user_name="U053B")
    hdr = auth_headers(user, comp)

    payload = _payload(user)
    payload["details"] = "Site B - cement"
    r = client.post(
        f"/apis/v3/finance/payment-requests/{comp.id}",
        json=payload,
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    assert r.json()["details"] == "Site B - cement"

    lst = client.get(f"/apis/v3/finance/payment-requests/{comp.id}", headers=hdr)
    assert lst.status_code == 200
    assert lst.json()[0]["details"] == "Site B - cement"


def test_blank_string_details_still_persists_and_renders_glyph(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R053C", user_name="U053C")
    hdr = auth_headers(user, comp)

    payload = _payload(user)
    payload["details"] = ""
    r = client.post(
        f"/apis/v3/finance/payment-requests/{comp.id}",
        json=payload,
        headers=hdr,
    )
    assert r.status_code == 200, r.text

    lst = client.get(f"/apis/v3/finance/payment-requests/{comp.id}", headers=hdr)
    assert lst.status_code == 200
    assert lst.json()[0]["details"] == "\u2014"
