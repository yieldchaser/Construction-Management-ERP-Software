"""R2-438 - a past expected_closure can no longer be written, and the CRM
screen stops dressing invalid contact data up as valid.

The create path has rejected past closures since R2-273, but PUT
/crm/leads/{id} still accepted them silently - a closure date in 2020 could
be written after the fact. The update request now runs the same validator.
(The screen half of the finding - phone decoration of junk values and the
Medium/medium split - lives in the frontend and is guarded by tsc + review.)
"""
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _lead_payload(company_id):
    return {
        "company_id": str(company_id),
        "lead_type": "Sales",
        "contact_name": "L438",
        "phone_no": "+919999000438",
        "status": "New Lead",
        "priority": "medium",
    }


def test_update_rejects_past_expected_closure(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R2438a-{_SUFFIX}", user_name="U438",
        mobile=f"+9193602{_SUFFIX[:8]}", email=f"r2438a-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/crm/leads", json=_lead_payload(comp.id), headers=hdr)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]

    u = client.put(
        f"/apis/v3/crm/leads/{lead_id}",
        json={"expected_closure": "2020-01-01T00:00:00"},
        headers=hdr,
    )
    assert u.status_code == 422, u.text

    db.expire_all()
    row = db.query(models.CRMLead).filter_by(id=uuid.UUID(lead_id)).first()
    assert row.expected_closure is None


def test_update_still_accepts_future_expected_closure(client, db, make_tenant, auth_headers):
    """No over-correction: a legitimate forward-looking date still lands."""
    comp, user, _ = make_tenant(
        company_name=f"R2438b-{_SUFFIX}", user_name="U438b",
        mobile=f"+9193603{_SUFFIX[:8]}", email=f"r2438b-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/crm/leads", json=_lead_payload(comp.id), headers=hdr)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]

    u = client.put(
        f"/apis/v3/crm/leads/{lead_id}",
        json={"expected_closure": "2027-03-31T00:00:00"},
        headers=hdr,
    )
    assert u.status_code == 200, u.text
    assert u.json()["expected_closure"].startswith("2027-03-31"), u.text


def test_update_without_closure_field_is_untouched(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name=f"R2438c-{_SUFFIX}", user_name="U438c",
        mobile=f"+9193604{_SUFFIX[:8]}", email=f"r2438c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/crm/leads", json=_lead_payload(comp.id), headers=hdr)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]

    u = client.put(
        f"/apis/v3/crm/leads/{lead_id}",
        json={"budget": 500.0},
        headers=hdr,
    )
    assert u.status_code == 200, u.text
