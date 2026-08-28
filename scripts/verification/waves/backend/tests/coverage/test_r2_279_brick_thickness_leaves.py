"""R2-279 - the brickwork calculator must derive leaves from wall thickness.

A 230 mm modular-brick wall is two leaves, a 115 mm wall is one, so the two
walls must not be quoted the same brick count any more. Mortar has to stay
inside the physical 20-35% share of wall volume for both.
"""
import pytest


def _payload(thickness_mm):
    return {
        "length_m": 5.0,
        "height_m": 3.0,
        "thickness_mm": thickness_mm,
        "brick_length_mm": 190.0,
        "brick_width_mm": 90.0,
        "brick_height_mm": 90.0,
        "joint_mm": 10.0,
        "wastage_pct": 10.0,
    }


def test_brickwork_brick_count_scales_with_wall_thickness(client, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name="R279", user_name="U279",
        mobile="+91900000279", email="r279@test.com",
    )
    hdr = auth_headers(user, comp)

    r_full = client.post("/apis/v3/calculators/brickwork", json=_payload(230.0), headers=hdr)
    r_half = client.post("/apis/v3/calculators/brickwork", json=_payload(115.0), headers=hdr)
    assert r_full.status_code == 200, r_full.text
    assert r_half.status_code == 200, r_half.text
    full, half = r_full.json(), r_half.json()

    # 230 mm derives a double leaf, 115 mm a single leaf, and the response reports it.
    assert full["leaves"] == 2
    assert half["leaves"] == 1

    # The full-brick wall needs about twice the bricks of the half-brick wall.
    ratio = full["bricks_needed"] / half["bricks_needed"]
    assert ratio == pytest.approx(2.0, rel=1e-9)

    # Mortar stays inside the physical band for both walls.
    for body in (full, half):
        share = body["mortar_volume_m3"] / body["wall_volume_m3"]
        assert 0.20 <= share <= 0.35, f"mortar share {share:.3f} outside band"

    # A supplied leaves value never overrides thickness; the derived count wins.
    r_override = client.post(
        "/apis/v3/calculators/brickwork", json={**_payload(115.0), "leaves": 4}, headers=hdr
    )
    assert r_override.status_code == 200, r_override.text
    override = r_override.json()
    assert override["leaves"] == 1
    assert override["bricks_needed"] == half["bricks_needed"]

    # Inconsistent geometry fails loudly instead of quoting an impossible wall:
    # a 250 mm wall cannot honestly be two 100 mm nominal leaves, so mortar
    # balloons past the 35% ceiling and the request is rejected.
    r_bad = client.post("/apis/v3/calculators/brickwork", json=_payload(250.0), headers=hdr)
    assert r_bad.status_code == 422, r_bad.text
    assert "mortar works out to" in r_bad.json()["detail"]
