"""R2-440 - no LibraryParty may be stored without an identifier.

The audit found both subcontractors (including the Rs 5,90,000 counterparty)
showing '-' in PARTY ID: POST /billing/subcontractors and the CRM
won-lead conversion built LibraryParty rows that bypassed library.py's PID
generator entirely, and the generator itself stored whitespace-only supplied
IDs verbatim (truthy, renders blank).

Gate: every creation site ends with a non-empty party_id_custom - the
subcontractor path, the whitespace-only and trimmed-supplied library paths,
and the won-lead conversion.
"""
import uuid

from app import models
from app.routers.crm import ensure_lead_party

_SUFFIX = uuid.uuid4().hex[:8]


def _mk_tenant(client, db, make_tenant, auth_headers, tag):
    comp, user, _ = make_tenant(company_name=f"R440{tag}-{_SUFFIX}", user_name=f"UR440{tag}")
    return comp, auth_headers(user, comp)


def test_subcontractor_gets_a_party_id(client, db, make_tenant, auth_headers):
    comp, hdr = _mk_tenant(client, db, make_tenant, auth_headers, "S")
    r = client.post(
        "/apis/v3/billing/subcontractors",
        json={"company_id": str(comp.id), "name": "R440 Subcon Co"},
        headers=hdr,
    )
    assert r.status_code == 201, r.text
    party = db.query(models.LibraryParty).filter(models.LibraryParty.id == r.json()["library_party_id"]).first()
    assert party is not None
    assert party.party_id_custom, "the finding's repro: subcontractor stored with no ID"
    assert party.party_id_custom.startswith("PID-")


def test_library_party_whitespace_and_supplied_ids(client, db, make_tenant, auth_headers):
    comp, hdr = _mk_tenant(client, db, make_tenant, auth_headers, "L")

    r_blank = client.post(
        "/apis/v3/library/parties",
        json={"company_id": str(comp.id), "name": "R440 Blank", "party_id_custom": "   "},
        headers=hdr,
    )
    assert r_blank.status_code == 200, r_blank.text
    assert r_blank.json()["party_id_custom"], "whitespace-only ID must fall through to the generator"
    assert r_blank.json()["party_id_custom"].startswith("PID-")

    r_supplied = client.post(
        "/apis/v3/library/parties",
        json={"company_id": str(comp.id), "name": "R440 Supplied", "party_id_custom": "  PID-XYZ  "},
        headers=hdr,
    )
    assert r_supplied.status_code == 200, r_supplied.text
    assert r_supplied.json()["party_id_custom"] == "PID-XYZ"


def test_won_lead_conversion_creates_identified_party(db, make_tenant):
    comp, _, _ = make_tenant(company_name=f"R440C-{_SUFFIX}", user_name="UR440C")
    lead = models.CRMLead(
        id=uuid.uuid4(), company_id=comp.id, lead_type="New Project",
        contact_name="R440 Contact", phone_no="+919000000001",
        client_company_name="R440 Client Co", status="Won",
    )
    db.add(lead)
    db.commit()

    ensure_lead_party(db, lead)

    party = db.query(models.LibraryParty).filter(
        models.LibraryParty.company_id == comp.id,
        models.LibraryParty.name == "R440 Client Co",
    ).first()
    assert party is not None
    assert party.party_id_custom, "converted client must not repeat the ID-less-party finding"
