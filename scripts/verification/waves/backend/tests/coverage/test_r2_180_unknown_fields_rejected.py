"""R2-180 - write endpoints accepted unknown fields and returned success.

The custom-fields request models were plain BaseModels (Pydantic default
extra="ignore"), so a client field-name typo was silently dropped before the
handler saw it and the endpoint answered 200/201 with nothing written - the
server-side twin of the frontend's "reports success, does nothing" family.
With extra="forbid" FastAPI rejects such payloads with a 422 naming the key.
"""
import uuid


def _hdrs(make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R2-180", user_name="Owner")
    return comp, auth_headers(user, comp)


def test_create_field_rejects_unknown_field_and_writes_nothing(
    client, db, make_tenant, auth_headers
):
    comp, hdr = _hdrs(make_tenant, auth_headers)
    payload = {
        "company_id": str(comp.id),
        "entity_type": "project",
        "field_name": "client_rank",
        "field_label": "Client Rank",
        "field_type": "number",
        "progress_percentage": 76,
    }
    r = client.post("/apis/v3/custom-fields/fields", json=payload, headers=hdr)
    assert r.status_code == 422, r.text
    assert "progress_percentage" in r.text

    from app import models

    assert (
        db.query(models.CustomField)
        .filter_by(company_id=comp.id, field_name="client_rank")
        .first()
        is None
    )


def test_set_value_rejects_unknown_field(client, db, make_tenant, auth_headers):
    comp, hdr = _hdrs(make_tenant, auth_headers)
    payload = {
        "company_id": str(comp.id),
        "field_id": str(uuid.uuid4()),
        "entity_type": "project",
        "entity_id": str(uuid.uuid4()),
        "value_number": 5,
        "nonsense_field": "x",
    }
    r = client.post("/apis/v3/custom-fields/values", json=payload, headers=hdr)
    assert r.status_code == 422, r.text
    assert "nonsense_field" in r.text

    from app import models

    # R2-157's read-path rework left the suite with sibling tests that store
    # values in the shared test DB, so the no-write check must be scoped to
    # this tenant rather than a global count.
    assert (
        db.query(models.CustomFieldValue)
        .filter_by(company_id=comp.id)
        .first()
        is None
    )


def test_valid_payload_still_creates(client, make_tenant, auth_headers):
    """Control: forbid only rejects unknown keys; well-formed writes succeed."""
    comp, hdr = _hdrs(make_tenant, auth_headers)
    r = client.post(
        "/apis/v3/custom-fields/fields",
        json={
            "company_id": str(comp.id),
            "entity_type": "project",
            "field_name": "client_rank",
            "field_label": "Client Rank",
            "field_type": "number",
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
