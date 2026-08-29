"""R2-503 - the depreciation schedule's own parameters must constrain entries.

The finding: depreciation_amount, accumulated_depreciation and book_value
were stored verbatim from the client - the schedule row (method, life,
salvage, rate) was read by nothing, so nothing about a statutory schedule
was computed, validated or auditable. Earlier passes on this lineage added
the running-identity guards, strict date ordering and the salvage floor; what
remained live was the amount itself: an SLM/5yr schedule could book Rs 60,000
of a Rs 1,00,000 asset in one dated entry.

Fix: create_entry now reconstructs cost as book_value + accumulated
depreciation and caps every dated entry at ONE YEAR under the declared method
- straight_line: (cost - salvage) / useful_life_years; wdv: opening book
value x depreciation_pct - while shorter periods stay free to post less.

Gate: SLM overbooking is rejected naming the cap, exact-year and monthly
entries pass, and a WDV entry above pct% of its opening book value is
rejected while one at exactly pct% passes.
"""
import uuid

import pytest

from app import models


def _tenant(make_tenant, auth_headers):
    sfx = uuid.uuid4().hex[:8]
    comp, user, _team = make_tenant(
        company_name=f"R2503-{sfx}", user_name=f"U{sfx}",
        mobile=f"+9195{sfx}", email=f"r2503-{sfx}@test.com",
    )
    return comp, auth_headers(user, comp)


def _equipment(db, comp):
    e = models.Equipment(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"Excavator {uuid.uuid4().hex[:6]}",
        code=f"EQ-{uuid.uuid4().hex[:10]}",
        category="Excavator", ownership_type="Owned",
        hourly_rate=0,
    )
    db.add(e)
    db.commit()
    return e


def _schedule(client, hdr, comp, asset_id, method, life, pct):
    r = client.post("/apis/v3/assets/schedules", headers=hdr, json={
        "company_id": str(comp.id), "asset_id": str(asset_id),
        "method": method, "useful_life_years": life,
        "salvage_value": 0, "depreciation_pct": pct,
        "start_date": "2026-04-01T00:00:00Z",
    })
    assert r.status_code == 201, r.text
    return r.json()


def _entry(client, hdr, comp, schedule, dep, acc, bv, date="2027-03-31T00:00:00Z"):
    return client.post("/apis/v3/assets/entries", headers=hdr, json={
        "company_id": str(comp.id),
        "schedule_id": str(schedule["id"]),
        "asset_id": str(schedule["asset_id"]),
        "entry_date": date,
        "depreciation_amount": dep,
        "accumulated_depreciation": acc,
        "book_value": bv,
    })


def test_slm_entry_above_one_years_share_is_rejected(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    asset = _equipment(db, comp)
    sched = _schedule(client, hdr, comp, asset.id, "straight_line", 5, 20)

    # Cost 1,00,000 reconstructed from the entry chain (bv + acc); one year of
    # SLM/5 = 20,000. Booking 60,000 in a single dated entry used to store.
    r = _entry(client, hdr, comp, sched, 60000.0, 60000.0, 40000.0)
    assert r.status_code == 400, r.text
    assert "(cost - salvage) / 5 years" in r.text, r.text
    assert "20000" in r.text, r.text


def test_slm_exact_year_and_monthly_entries_pass(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    asset = _equipment(db, comp)
    sched = _schedule(client, hdr, comp, asset.id, "straight_line", 5, 20)

    r = _entry(client, hdr, comp, sched, 20000.0, 20000.0, 80000.0)
    assert r.status_code == 201, r.text

    # A shorter period may post less than the annual share.
    r2 = _entry(client, hdr, comp, sched, 5000.0, 25000.0, 75000.0,
                date="2027-06-30T00:00:00Z")
    assert r2.status_code == 201, r2.text


def test_wdv_entry_above_pct_of_opening_book_value_is_rejected(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    asset = _equipment(db, comp)
    sched = _schedule(client, hdr, comp, asset.id, "wdv", 5, 10)

    # First entry: opening book value is the implied cost 1,00,000 -> cap 10,000.
    r = _entry(client, hdr, comp, sched, 25000.0, 25000.0, 75000.0)
    assert r.status_code == 400, r.text
    assert "% of the opening book value = 10000.00" in r.text, r.text

    # Exactly at the cap passes...
    ok = _entry(client, hdr, comp, sched, 10000.0, 10000.0, 90000.0)
    assert ok.status_code == 201, ok.text

    # ...and next year's cap is 10% of 90,000 = 9,000, so 9,500 now fails.
    r2 = _entry(client, hdr, comp, sched, 9500.0, 19500.0, 80500.0,
                date="2028-03-31T00:00:00Z")
    assert r2.status_code == 400, r2.text


def test_zero_amount_entry_stays_harmless_no_op(client, db, make_tenant, auth_headers):
    comp, hdr = _tenant(make_tenant, auth_headers)
    asset = _equipment(db, comp)
    sched = _schedule(client, hdr, comp, asset.id, "straight_line", 5, 20)
    r = _entry(client, hdr, comp, sched, 0.0, 0.0, 100000.0)
    assert r.status_code == 201, r.text
