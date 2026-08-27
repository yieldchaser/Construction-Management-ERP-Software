"""R2-737 - CRM expected_closure naive/aware mix raised TypeError -> 500.

backend/app/routers/crm.py:121 and :152 compared a Pydantic-parsed aware
datetime (e.g. "2026-12-31T23:59:59+05:30") to naive datetime.utcnow() which
raises TypeError: can't compare offset-naive and offset-aware datetimes.
The validator must normalize to aware UTC before comparison, copying the
todos.py:57-61 pattern.

Gate: POST a lead with expected_closure carrying +05:30 must return 422
(validation) not 500 (TypeError). Both create and update paths are fixed.
"""
import uuid
from datetime import datetime, timedelta, timezone

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _lead_payload(company_id, **overrides):
    payload = {
        "company_id": str(company_id),
        "lead_type": "Sales",
        "contact_name": "L737",
        "phone_no": "+919999000737",
        "status": "New Lead",
        "priority": "medium",
    }
    payload.update(overrides)
    return payload


def test_create_past_expected_closure_with_tz_is_422_not_500(client, db, make_tenant, auth_headers):
    """Past date with +05:30 must be rejected with 422, not 500 TypeError."""
    comp, user, _ = make_tenant(
        company_name=f"R2737a-{_SUFFIX}",
        user_name="U737a",
        mobile=f"+9193605{_SUFFIX[:8]}",
        email=f"r2737a-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = client.post(
        "/apis/v3/crm/leads",
        json=_lead_payload(comp.id, expected_closure="2020-01-01T00:00:00+05:30"),
        headers=hdr,
    )
    assert r.status_code == 422, f"expected 422 not 500, got {r.status_code}: {r.text}"
    assert r.status_code != 500
    # detail should mention past
    assert "expected_closure" in r.text.lower() or "past" in r.text.lower(), r.text


def test_create_future_expected_closure_with_tz_is_201_not_500(client, db, make_tenant, auth_headers):
    """Future date with +05:30 must succeed (201), not 500."""
    comp, user, _ = make_tenant(
        company_name=f"R2737b-{_SUFFIX}",
        user_name="U737b",
        mobile=f"+9193606{_SUFFIX[:8]}",
        email=f"r2737b-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    # Use far future to guarantee not past regardless of test execution date
    future = (datetime.now(timezone.utc) + timedelta(days=400)).isoformat()
    # Replace offset with +05:30 to exercise the exact gate
    # isoformat gives +00:00, convert to +05:30 by shifting
    # Instead just hardcode far future with +05:30
    future_ist = "2027-12-31T23:59:59+05:30"
    r = client.post(
        "/apis/v3/crm/leads",
        json=_lead_payload(comp.id, expected_closure=future_ist),
        headers=hdr,
    )
    assert r.status_code == 201, f"expected 201 for future +05:30, got {r.status_code}: {r.text}"
    assert r.json()["expected_closure"] is not None


def test_create_future_2026_12_31_with_tz_not_500(client, db, make_tenant, auth_headers):
    """Exact gate example: 2026-12-31T23:59:59+05:30 must not be 500.
    If the date is still future it is 201, if the test runs after that date
    it becomes past and should be 422. Either way it must not be 500.
    """
    comp, user, _ = make_tenant(
        company_name=f"R2737c-{_SUFFIX}",
        user_name="U737c",
        mobile=f"+9193607{_SUFFIX[:8]}",
        email=f"r2737c-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = client.post(
        "/apis/v3/crm/leads",
        json=_lead_payload(comp.id, expected_closure="2026-12-31T23:59:59+05:30"),
        headers=hdr,
    )
    assert r.status_code != 500, f"gate: +05:30 caused 500: {r.text}"
    assert r.status_code in (201, 422), f"expected 201 or 422, got {r.status_code}: {r.text}"
    # If it was 422, it must be validation, not crash
    if r.status_code == 422:
        assert "expected_closure" in r.text.lower() or "past" in r.text.lower(), r.text


def test_update_past_expected_closure_with_tz_is_422_not_500(client, db, make_tenant, auth_headers):
    """Update path (crm.py:152) has same fix."""
    comp, user, _ = make_tenant(
        company_name=f"R2737d-{_SUFFIX}",
        user_name="U737d",
        mobile=f"+9193608{_SUFFIX[:8]}",
        email=f"r2737d-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/crm/leads", json=_lead_payload(comp.id), headers=hdr)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]

    u = client.put(
        f"/apis/v3/crm/leads/{lead_id}",
        json={"expected_closure": "2020-06-15T12:00:00+05:30"},
        headers=hdr,
    )
    assert u.status_code == 422, f"expected 422 not 500, got {u.status_code}: {u.text}"
    assert u.status_code != 500

    # Future update still works
    u2 = client.put(
        f"/apis/v3/crm/leads/{lead_id}",
        json={"expected_closure": "2027-06-15T12:00:00+05:30"},
        headers=hdr,
    )
    assert u2.status_code == 200, f"future update should be 200, got {u2.status_code}: {u2.text}"


def test_create_naive_past_still_422(client, db, make_tenant, auth_headers):
    """Naive datetimes keep original behaviour after normalisation."""
    comp, user, _ = make_tenant(
        company_name=f"R2737e-{_SUFFIX}",
        user_name="U737e",
        mobile=f"+9193609{_SUFFIX[:8]}",
        email=f"r2737e-{_SUFFIX}@test.com",
    )
    hdr = auth_headers(user, comp)
    r = client.post(
        "/apis/v3/crm/leads",
        json=_lead_payload(comp.id, expected_closure="2020-01-01T00:00:00"),
        headers=hdr,
    )
    assert r.status_code == 422, r.text
