"""R2-197 — ESI eligibility must be derived from GROSS wages server-side.

Gate: POST /hr/employees stores is_esi_applicable=false when basic is under
the ceiling but gross (basic + HRA + allowances) exceeds it, regardless of the
client-supplied boolean; genuinely under-gross employees stay eligible; and
PUT /hr/employees re-derives the flag when pay changes.
"""


def _hdr(make_tenant, auth_headers):
    comp, user, _team = make_tenant(company_name="R546ESI", user_name="U197")
    return comp, auth_headers(user, comp)


def test_esi_eligibility_from_gross_not_basic(client, make_tenant, auth_headers):
    comp, hdr = _hdr(make_tenant, auth_headers)

    # Basic 15000 is under the 21000 ceiling, but gross 23000 is over:
    # the stored flag must be false even though the client sent true.
    r = client.post("/apis/v3/hr/employees", headers=hdr, json={
        "company_id": str(comp.id),
        "name": "ZZ R2-197 Over Gross",
        "basic_salary": 15000,
        "hra": 4000,
        "other_allowances": 4000,
        "is_esi_applicable": True,
    })
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["is_esi_applicable"] is False, r.text

    # Genuinely under-gross (15000 + 3600 + 1800 = 20400 <= 21000): stays
    # eligible even though the client sent false.
    r2 = client.post("/apis/v3/hr/employees", headers=hdr, json={
        "company_id": str(comp.id),
        "name": "ZZ R2-197 Under Gross",
        "basic_salary": 15000,
        "hra": 3600,
        "other_allowances": 1800,
        "is_esi_applicable": False,
    })
    assert r2.status_code == 201, r2.text
    assert r2.json()["is_esi_applicable"] is True, r2.text

    # Pay change on update re-derives the flag: raising gross past the
    # ceiling flips eligibility off without any client verdict.
    emp_id = r.json()["id"]
    r3 = client.put(f"/apis/v3/hr/employees/{emp_id}", headers=hdr, json={
        "basic_salary": 15000, "hra": 3000, "other_allowances": 2000,
    })
    assert r3.status_code == 200, r3.text
    assert r3.json()["is_esi_applicable"] is True, r3.text

    r4 = client.put(f"/apis/v3/hr/employees/{emp_id}", headers=hdr, json={
        "other_allowances": 5000,
    })
    assert r4.status_code == 200, r4.text
    assert r4.json()["is_esi_applicable"] is False, r4.text

    # Boundary: gross exactly at the ceiling remains covered (engine parity).
    rb = client.post("/apis/v3/hr/employees", headers=hdr, json={
        "company_id": str(comp.id),
        "name": "ZZ R2-197 Boundary",
        "basic_salary": 18000,
        "hra": 2000,
        "other_allowances": 1000,
        "is_esi_applicable": False,
    })
    assert rb.status_code == 201, rb.text
    assert rb.json()["is_esi_applicable"] is True, rb.text
