"""PROMPT_11 / F-ONLY-1: CRM lead -> LibraryParty linkage (finding B9 F-9-3)."""
import uuid

from app import models


def _create_party(db, company, name):
    p = models.LibraryParty(id=uuid.uuid4(), company_id=company.id, name=name, party_type="Client")
    db.add(p)
    db.commit()
    return p


def _create_lead(client, hdr, company_id, **overrides):
    payload = {
        "company_id": str(company_id),
        "lead_type": "Sales",
        "contact_name": "C1",
        "phone_no": "+919999900001",
        "client_company_name": "Acme Builders",
        "status": "New Lead",
        "priority": "medium",
        "budget": 100000.0,
    }
    payload.update(overrides)
    return client.post("/apis/v3/crm/leads", json=payload, headers=hdr)


def test_create_lead_party_from_other_company_rejected(client, db, make_tenant, auth_headers):
    comp_a, user_a, _ = make_tenant(company_name="A", user_name="UA", mobile="+919888770011")
    comp_b, user_b, _ = make_tenant(company_name="B", user_name="UB", mobile="+919888770012")
    other_party = _create_party(db, comp_b, "Foreign Party")
    hdr = auth_headers(user_a, comp_a)

    r = _create_lead(client, hdr, comp_a.id, party_id=str(other_party.id))
    assert r.status_code in (400, 404), r.text


def test_mark_lead_won_autocreates_library_party_idempotent(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UC", mobile="+919888770013")
    hdr = auth_headers(user, comp)

    r = _create_lead(client, hdr, comp.id)
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]
    assert r.json()["party_id"] is None

    # Mark Won -> LibraryParty should be auto-created and linked.
    r2 = client.put(f"/apis/v3/crm/leads/{lead_id}", json={"status": "Won"}, headers=hdr)
    assert r2.status_code == 200, r2.text
    assert r2.json()["party_id"] is not None
    party_id = r2.json()["party_id"]

    parties = db.query(models.LibraryParty).filter(
        models.LibraryParty.company_id == comp.id,
        models.LibraryParty.name == "Acme Builders",
    ).all()
    assert len(parties) == 1
    assert str(parties[0].id) == party_id

    # Re-marking Won must not duplicate the party.
    client.put(f"/apis/v3/crm/leads/{lead_id}", json={"status": "New Lead"}, headers=hdr)
    r3 = client.put(f"/apis/v3/crm/leads/{lead_id}", json={"status": "Won"}, headers=hdr)
    assert r3.status_code == 200, r3.text
    parties_after = db.query(models.LibraryParty).filter(
        models.LibraryParty.company_id == comp.id,
        models.LibraryParty.name == "Acme Builders",
    ).all()
    assert len(parties_after) == 1


def test_existing_lead_without_party_still_works(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UD", mobile="+919888770014")
    hdr = auth_headers(user, comp)

    r = _create_lead(client, hdr, comp.id, client_company_name="Legacy Co", status="Follow-Up")
    assert r.status_code == 201, r.text
    lead_id = r.json()["id"]

    r2 = client.put(f"/apis/v3/crm/leads/{lead_id}", json={"priority": "high"}, headers=hdr)
    assert r2.status_code == 200, r2.text
    assert r2.json()["priority"] == "high"
    assert r2.json()["party_id"] is None

    # Non-won status must not auto-create a party.
    assert db.query(models.LibraryParty).filter(
        models.LibraryParty.name == "Legacy Co"
    ).count() == 0


def test_create_lead_with_valid_party_links(client, db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="A", user_name="UE", mobile="+919888770015")
    hdr = auth_headers(user, comp)
    party = _create_party(db, comp, "Linked Party")

    r = _create_lead(client, hdr, comp.id, client_company_name="Linked Co", party_id=str(party.id))
    assert r.status_code == 201, r.text
    assert r.json()["party_id"] == str(party.id)
