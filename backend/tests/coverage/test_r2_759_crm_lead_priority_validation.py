"""Finding R2-759: CRM lead priority is strictly validated and normalized to lowercase (low, medium, high).

Clauses:
1. LeadCreateRequest validates priority against (low, medium, high), rejecting unknown strings with 422.
2. LeadUpdateRequest validates priority against (low, medium, high), rejecting unknown strings with 422.
3. Case variants ('High', 'MEDIUM', 'Low') are normalized to lowercase on write.
"""
import uuid
import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, team = make_tenant(
        company_name=f"CRMPri-{sfx}", user_name=f"UCRMPri-{sfx}",
        mobile=f"+9193{sfx}", email=f"crmpri-{sfx}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_r2_759_crm_lead_priority_create_validation(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    # 1. Invalid priority rejected with 422
    payload_bad = {
        "company_id": str(comp.id),
        "lead_type": "client",
        "contact_name": "Test Client",
        "phone_no": "+919876543210",
        "priority": "Urgent",
    }
    res = client.post("/apis/v3/crm/leads", json=payload_bad, headers=hdr)
    assert res.status_code == 422, f"Expected 422 for invalid priority, got {res.status_code}: {res.text}"

    # 2. Case variant 'High' accepted and normalized to 'high'
    payload_good = {
        "company_id": str(comp.id),
        "lead_type": "client",
        "contact_name": "Test Client",
        "phone_no": "+919876543210",
        "priority": "High",
    }
    res = client.post("/apis/v3/crm/leads", json=payload_good, headers=hdr)
    assert res.status_code == 201, f"Expected 201, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["priority"] == "high", f"Expected 'high', got '{data['priority']}'"


def test_r2_759_crm_lead_priority_update_validation(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    lead = models.CRMLead(
        id=uuid.uuid4(),
        company_id=comp.id,
        lead_type="client",
        contact_name="Update Lead",
        phone_no="+919876543210",
        priority="medium",
        status="New Lead",
    )
    db.add(lead)
    db.commit()

    # 1. Invalid priority rejected on update with 422
    res = client.put(f"/apis/v3/crm/leads/{lead.id}", json={"priority": "Critical"}, headers=hdr)
    assert res.status_code == 422, f"Expected 422 for invalid priority on update, got {res.status_code}: {res.text}"

    # 2. Case variant 'LOW' accepted and normalized to 'low'
    res = client.put(f"/apis/v3/crm/leads/{lead.id}", json={"priority": "LOW"}, headers=hdr)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["priority"] == "low", f"Expected 'low', got '{data['priority']}'"
