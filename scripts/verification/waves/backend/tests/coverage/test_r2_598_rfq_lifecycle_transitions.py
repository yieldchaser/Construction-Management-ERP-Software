"""R2-598 - an RFQ must be able to leave "draft": send, close, and a closed gate.

RFQ.status documented `draft, sent, closed` (models.py) was write-never - every
RFQ stayed "draft" forever and the two documented states were unreachable, so
quotes accumulated against a permanently-open enquiry nothing could terminate.

Gate: draft --POST /rfq/{id}/send--> sent --POST /rfq/{id}/close--> closed;
invalid transitions 409, a closed RFQ refuses new quotes, and the listing
returns the persisted transitioned status.
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_project(db, comp):
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name=f"P598-{_SUFFIX}",
        code=f"PRJ-P598-{_SUFFIX}", status="Ongoing",
    )
    db.add(project)
    db.commit()
    return project


def _create_rfq(client, hdr, comp, project, number):
    r = client.post(
        "/apis/v3/procurement/rfq",
        json={
            "company_id": str(comp.id),
            "project_id": str(project.id),
            "rfq_number": number,
            "items": [{"material_name": "Cement OPC 53", "quantity": 200, "unit": "bags"}],
        },
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    return r.json()


def _submit_quote(client, hdr, rfq_id, item_id, rate):
    return client.post(
        f"/apis/v3/procurement/rfq/{rfq_id}/quotes",
        json={
            "vendor_name": "Vendor A",
            "item_id": item_id,
            "quoted_rate": rate,
        },
        headers=hdr,
    )


def test_rfq_lifecycle_send_close_and_closed_gate(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name=f"R598-{_SUFFIX}", user_name="UR598A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    rfq = _create_rfq(client, hdr, comp, project, f"RFQ-598-{_SUFFIX}")
    assert rfq["status"] == "draft"
    rfq_id, item_id = rfq["id"], rfq["items"][0]["id"]

    r = client.post(f"/apis/v3/procurement/rfq/{rfq_id}/close", headers=hdr)
    assert r.status_code == 409, "closing a never-sent draft must be refused"

    r = client.post(f"/apis/v3/procurement/rfq/{rfq_id}/send", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "sent"
    assert client.post(f"/apis/v3/procurement/rfq/{rfq_id}/send", headers=hdr).status_code == 409

    r = _submit_quote(client, hdr, rfq_id, item_id, 350.0)
    assert r.status_code == 201, "quotes are collected while the RFQ is open for pricing"

    r = client.post(f"/apis/v3/procurement/rfq/{rfq_id}/close", headers=hdr)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "closed"

    assert client.post(f"/apis/v3/procurement/rfq/{rfq_id}/close", headers=hdr).status_code == 409
    assert client.post(f"/apis/v3/procurement/rfq/{rfq_id}/send", headers=hdr).status_code == 409
    r = _submit_quote(client, hdr, rfq_id, item_id, 340.0)
    assert r.status_code == 409, "a closed RFQ must refuse further quotes"

    listed = client.get(f"/apis/v3/procurement/rfq/{project.id}", headers=hdr).json()
    row = next(x for x in listed if x["id"] == rfq_id)
    assert row["status"] == "closed", "listing must reflect the persisted transition"
