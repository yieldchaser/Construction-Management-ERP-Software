"""R2-052 - PaymentRequest.party_company_user_id references company_team, not users.

Every sibling table carrying the same-named column (bills, debit_notes,
credit_notes, payments) points it at company_team.id; payment_requests alone
pointed at users.id, so a party without a platform login (CompanyTeam with
user_id NULL, real name on LibraryParty) could never receive a payment request
and the stored party_name degraded to "Unknown Party".
"""
import uuid

from app import models


def test_fk_target_matches_siblings():
    fk = next(iter(models.PaymentRequest.__table__.c.party_company_user_id.foreign_keys))
    assert fk.target_fullname == "company_team.id"


def test_external_party_payment_request_resolves_library_name(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R052A", user_name="U052A")
    party = models.LibraryParty(id=uuid.uuid4(), company_id=comp.id, name="ZZ External Vendor Co")
    ext_team = models.CompanyTeam(
        id=uuid.uuid4(), company_id=comp.id, user_id=None,
        priority_type="subcontractor", library_party_id=party.id,
    )
    db.add_all([party, ext_team])
    db.commit()

    hdr = auth_headers(user, comp)
    r = client.post(
        f"/apis/v3/finance/payment-requests/{comp.id}",
        json={"party_company_user_id": str(ext_team.id), "amount": 1000.0},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert str(body["party_company_user_id"]) == str(ext_team.id)
    assert body["party_name"] == "ZZ External Vendor Co"

    lst = client.get(f"/apis/v3/finance/payment-requests/{comp.id}", headers=hdr)
    assert lst.status_code == 200
    row = next(x for x in lst.json() if x["id"] == body["id"])
    assert row["party_name"] == "ZZ External Vendor Co"
