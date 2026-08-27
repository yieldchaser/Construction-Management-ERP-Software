"""R2-546 — company settings reject out-of-range decimals and unknown enum values.

Gate: PUT /settings/company/{cid} must refuse decimal places outside 0..4,
a grn_numbering outside {"Project Level", "Company Level"}, and a
document_company_name_display outside {"company", "branch"} — the exact probes
the audit stored successfully before the schema was bounded.
"""
import uuid


def _hdr(make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R546", user_name="U546")
    return comp, auth_headers(user, comp)


def test_decimal_places_bounded_0_to_4(client, make_tenant, auth_headers):
    comp, hdr = _hdr(make_tenant, auth_headers)
    for probe in ({"currency_decimal_places": 7}, {"quantity_decimal_places": 9}, {"currency_decimal_places": -1}):
        r = client.put(f"/apis/v3/settings/company/{comp.id}", headers=hdr, json=probe)
        assert r.status_code == 422, f"{probe}: {r.text}"


def test_grn_numbering_and_name_display_are_closed_enums(client, make_tenant, auth_headers):
    comp, hdr = _hdr(make_tenant, auth_headers)
    for probe in (
        {"grn_numbering": "NOT_A_REAL_SCOPE"},
        {"document_company_name_display": "NOT_A_REAL_MODE"},
    ):
        r = client.put(f"/apis/v3/settings/company/{comp.id}", headers=hdr, json=probe)
        assert r.status_code == 422, f"{probe}: {r.text}"


def test_canonical_values_still_accepted(client, db, make_tenant, auth_headers):
    from app import models as _m  # noqa: F401  (models imported so SQLite schema is materialised)

    comp, hdr = _hdr(make_tenant, auth_headers)
    r = client.put(f"/apis/v3/settings/company/{comp.id}", headers=hdr, json={
        "currency_decimal_places": 2,
        "quantity_decimal_places": 3,
        "grn_numbering": "Project Level",
        "document_company_name_display": "company",
    })
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["currency_decimal_places"] == 2
    assert body["grn_numbering"] == "Project Level"
