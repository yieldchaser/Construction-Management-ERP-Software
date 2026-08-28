"""R2-281 / R2-520 - the concrete calculator's wastage must reach the ordered materials.

wastage_pct used to change only the displayed dry_volume while cement/sand/
aggregate were derived from wet volume, so every order under-bought by the
default 5% and the response contradicted itself. Materials now come from
dry_volume via the grade's true nominal ratio (M20 = 1:1.5:3), cement bags via
x1440/50, exactly like calc_brick and calc_plaster.
"""
import pytest


def _payload(wastage_pct):
    return {
        "wet_volume": 10.0,
        "grade": "M20",
        "wastage_pct": wastage_pct,
    }


def test_concrete_wastage_scales_all_ordered_materials(client, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name="R281", user_name="U281",
        mobile="+91900000281", email="r281@test.com",
    )
    hdr = auth_headers(user, comp)

    r0 = client.post("/apis/v3/calculators/concrete", json=_payload(0.0), headers=hdr)
    r5 = client.post("/apis/v3/calculators/concrete", json=_payload(5.0), headers=hdr)
    assert r0.status_code == 200, r0.text
    assert r5.status_code == 200, r5.text
    zero, five = r0.json(), r5.json()

    # Dry volumes: 10 * 1.54 and 10 * 1.54 * 1.05.
    assert zero["dry_volume_m3"] == pytest.approx(15.4, abs=1e-3)
    assert five["dry_volume_m3"] == pytest.approx(16.17, abs=1e-3)

    # Hand-checked M20 ratio math at 0% wastage: dry 15.4 split by 1:1.5:3 (sum 5.5)
    # gives cement 2.8 m3 = 80.64 bags, sand 4.2 m3, aggregate 8.4 m3.
    assert zero["cement_bags"] == pytest.approx(80.64, abs=0.01)
    assert zero["sand_m3"] == pytest.approx(4.2, abs=1e-6)
    assert zero["aggregate_m3"] == pytest.approx(8.4, abs=1e-6)

    # Every material anyone orders scales by exactly 1.05 with 5% wastage.
    # Bags are rounded to 2 decimals in the response, hence the cent-level slack.
    assert five["cement_bags"] == pytest.approx(zero["cement_bags"] * 1.05, abs=0.01)
    assert five["sand_m3"] == pytest.approx(zero["sand_m3"] * 1.05, rel=1e-9)
    assert five["aggregate_m3"] == pytest.approx(zero["aggregate_m3"] * 1.05, rel=1e-9)

    # The response no longer contradicts itself: materials track dry_volume.
    # M20 cement share of dry is 1/5.5; bags = m3 * 1440/50 = m3 * 28.8.
    implied_dry_from_bags = five["cement_bags"] / 28.8 * 5.5
    assert implied_dry_from_bags == pytest.approx(five["dry_volume_m3"], rel=1e-3)


def test_concrete_engineered_mix_branch_still_reports_volumes(client, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name="R281B", user_name="U281B",
        mobile="+91900000282", email="r281b@test.com",
    )
    hdr = auth_headers(user, comp)

    r = client.post(
        "/apis/v3/calculators/concrete",
        json={"wet_volume": 10.0, "grade": "M30", "wastage_pct": 5.0},
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["engineered_design_mix_required"] is True
    assert body["dry_volume_m3"] == pytest.approx(16.17, abs=1e-3)
