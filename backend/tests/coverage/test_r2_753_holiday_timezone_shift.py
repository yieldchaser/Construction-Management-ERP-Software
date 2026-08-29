"""Finding R2-753: Holiday calendar date-only timezone shifts.

Clauses:
1. A holiday posted as "2026-08-15" must be stored with calendar date 2026-08-15 at UTC midnight.
2. A holiday posted as "2026-08-14T18:30:00.000Z" (IST browser shifted instant) must resolve to calendar date 2026-08-15 at UTC midnight.
3. A holiday posted with IST offset "2026-08-15T00:00:00+05:30" must resolve to calendar date 2026-08-15 at UTC midnight.
4. Holiday date retrieved via GET /hr/holidays/{company_id} must represent 2026-08-15.
"""
import uuid
import pytest

from app import models


def test_r2_753_holiday_date_preserves_calendar_day_across_timezones(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="Holi-Tenant", user_name="Holi-User")
    hdr = auth_headers(user, comp)

    # 1. Post date as "2026-08-14T18:30:00.000Z" (what new Date("2026-08-15T00:00:00").toISOString() sends in IST)
    r1 = client.post(
        f"/apis/v3/hr/holidays/{comp.id}",
        headers=hdr,
        json={"name": "Independence Day (IST Shifted)", "date": "2026-08-14T18:30:00.000Z"},
    )
    assert r1.status_code == 201, r1.text
    h1 = r1.json()
    assert "2026-08-15" in h1["date"], f"Expected 2026-08-15 but got {h1['date']}"

    # 2. Post date as "2026-08-15"
    r2 = client.post(
        f"/apis/v3/hr/holidays/{comp.id}",
        headers=hdr,
        json={"name": "Independence Day (Date-only)", "date": "2026-08-15"},
    )
    assert r2.status_code == 201, r2.text
    h2 = r2.json()
    assert "2026-08-15" in h2["date"], f"Expected 2026-08-15 but got {h2['date']}"

    # 3. Post date with explicit +05:30 offset
    r3 = client.post(
        f"/apis/v3/hr/holidays/{comp.id}",
        headers=hdr,
        json={"name": "Independence Day (IST Offset)", "date": "2026-08-15T00:00:00+05:30"},
    )
    assert r3.status_code == 201, r3.text
    h3 = r3.json()
    assert "2026-08-15" in h3["date"], f"Expected 2026-08-15 but got {h3['date']}"

    # 4. Verify list_holidays returns 2026-08-15 for all
    res = client.get(f"/apis/v3/hr/holidays/{comp.id}", headers=hdr)
    assert res.status_code == 200, res.text
    dates = [h["date"] for h in res.json()]
    for d in dates:
        assert "2026-08-15" in d, f"Found shifted holiday in list: {d}"
