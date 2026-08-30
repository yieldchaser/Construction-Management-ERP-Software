"""Tier 3 Parity Item 11: Unit master and dual-unit support.
"""
import uuid

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"P11-{_SUFFIX}",
        user_name="U-P11",
        mobile=f"+9191{uuid.uuid4().hex[:8]}",
        email=f"p11-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_parity_tier3_unit_master_and_dual_units(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    # 1. Search for units
    res_units = client.get("/apis/v3/library/units", headers=hdr)
    assert res_units.status_code == 200, res_units.text
    units = res_units.json()
    assert isinstance(units, list)
    unit_codes = [u["code"] if isinstance(u, dict) else u for u in units]
    assert "Bag" in unit_codes
    assert "MT" in unit_codes
    assert "Kg" in unit_codes
    assert "Nos" in unit_codes

    # Search filter on units
    res_search = client.get("/apis/v3/library/units?search=ton", headers=hdr)
    assert res_search.status_code == 200
    filtered = res_search.json()
    filtered_codes = [u["code"] if isinstance(u, dict) else u for u in filtered]
    assert "Ton" in filtered_codes or "MT" in filtered_codes
    assert "Bag" not in filtered_codes

    # 2. Dual unit material creation
    payload_valid = {
        "company_id": str(comp.id),
        "name": "OPC 53 Cement",
        "unit": "Bag",
        "alternate_unit": "Kg",
        "gst_rate": 18.0,
        "category": "Cement",
        "unit_cost": 380.0,
        "lead_time_days": 2,
    }
    res_mat = client.post("/apis/v3/library/materials", json=payload_valid, headers=hdr)
    assert res_mat.status_code in (200, 201), res_mat.text
    data = res_mat.json()
    assert data["unit"] == "Bag"
    assert data["alternate_unit"] == "Kg"

    # 3. Identical alternate unit rejected
    payload_invalid = {
        "company_id": str(comp.id),
        "name": "TMT Rebar 12mm",
        "unit": "MT",
        "alternate_unit": "MT",
        "gst_rate": 18.0,
        "category": "Steel",
        "unit_cost": 65000.0,
        "lead_time_days": 3,
    }
    res_inv = client.post("/apis/v3/library/materials", json=payload_invalid, headers=hdr)
    assert res_inv.status_code == 422
    assert "must differ" in res_inv.text or "Alternate unit" in res_inv.text
