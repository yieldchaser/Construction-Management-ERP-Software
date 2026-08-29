"""R2-280 - the paint calculator must not quote negative quantities.

Doors and windows are subtracted from the wall area, but nothing checked
that the openings actually fit. 99 doors plus 99 windows in a 10x10x10
room used to sail through as a 200 with a negative paintable area and
negative paint, putty and primer. The request is now rejected with a 422.
"""


def _payload(doors, windows):
    return {
        "room_length_ft": 10.0,
        "room_width_ft": 10.0,
        "ceiling_height_ft": 10.0,
        "doors_count": doors,
        "windows_count": windows,
    }


def test_paint_rejects_openings_larger_than_walls(client, make_tenant, auth_headers):
    comp, user, _ = make_tenant(
        company_name="R280", user_name="U280",
        mobile="+91900000280", email="r280@test.com",
    )
    hdr = auth_headers(user, comp)

    # 99 doors (21 sqft each) + 99 windows (12 sqft each) dwarf the walls.
    r_bad = client.post("/apis/v3/calculators/paint", json=_payload(99, 99), headers=hdr)
    assert r_bad.status_code == 422, r_bad.text
    assert "exceeds the wall area" in r_bad.json()["detail"]

    # A normal room still quotes every quantity and all of them stay positive.
    r_ok = client.post("/apis/v3/calculators/paint", json=_payload(1, 2), headers=hdr)
    assert r_ok.status_code == 200, r_ok.text
    body = r_ok.json()
    for field in ("paintable_area_sqft", "paint_litres", "putty_kg", "primer_litres"):
        assert field in body
        assert body[field] > 0, f"{field} is {body[field]}"
