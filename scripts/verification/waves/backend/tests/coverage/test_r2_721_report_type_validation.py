"""R2-721 - report_type hardening on statutory reports.

Gate: StatutoryReportCreate.report_type was a bare str matched case-sensitively
inside calculate_due_date, so "PF" saved a row with due_date=None while "pf"
worked, and the list/penalty filters missed case variants. After the fix the
create schema is a normalized Literal (unknown values get FastAPI's automatic
422 naming the valid types) and every comparison site lowercases first.
"""
import uuid

_SUFFIX = uuid.uuid4().hex[:8]


def _mob(t):
    return f"+9193{_SUFFIX}{t:02d}"


def _mail(t):
    return f"r721-{t}-{_SUFFIX}@test.com"


def _payload(comp_id, report_type, return_period="2026-07"):
    return {
        "company_id": str(comp_id),
        "report_type": report_type,
        "return_period": return_period,
    }


def _mk_tenant(db, make_tenant, t):
    comp, user, _ = make_tenant(
        company_name=f"R721-{t}", user_name=f"U721{t}", mobile=_mob(t), email=_mail(t)
    )
    return comp, user


def test_mixed_case_report_types_get_due_dates(client, db, make_tenant, auth_headers):
    cases = {
        "PF": "2026-08-15T00:00:00",      # pf rule: 15th of next month
        "Esi": "2026-08-15T00:00:00",     # esi rule: same day as pf
        "BOCW": "2026-08-15T00:00:00",    # bocw rule: same day as pf
        "TDS": "2026-08-07T00:00:00",     # tds rule: 7th of next month
    }
    for i, (raw, expected_due) in enumerate(cases.items(), start=1):
        comp, user = _mk_tenant(db, make_tenant, i)
        hdr = auth_headers(user, comp)
        r = client.post("/apis/v3/statutory", json=_payload(comp.id, raw), headers=hdr)
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["report_type"] == raw.lower(), body
        assert body["due_date"] == expected_due, (raw, body)


def test_lowercase_baseline_still_works(client, db, make_tenant, auth_headers):
    comp, user = _mk_tenant(db, make_tenant, 9)
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/statutory", json=_payload(comp.id, "pf"), headers=hdr)
    assert r.status_code == 201, r.text
    assert r.json()["due_date"] == "2026-08-15T00:00:00"


def test_unknown_report_type_rejected_422(client, db, make_tenant, auth_headers):
    comp, user = _mk_tenant(db, make_tenant, 10)
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/statutory", json=_payload(comp.id, "xyz"), headers=hdr)
    assert r.status_code == 422, r.text
    errors = r.json()["detail"]
    assert any(
        e.get("loc")[-1] == "report_type" and "xyz" in str(e.get("input"))
        for e in errors
    ), errors
    # The 422 message names the valid types so callers can self-correct.
    msgs = " ".join(str(e.get("msg", "")) for e in errors)
    for valid in ("pf", "esi", "bocw", "tds"):
        assert f"'{valid}'" in msgs, msgs


def test_whitespace_is_tolerated(client, db, make_tenant, auth_headers):
    comp, user = _mk_tenant(db, make_tenant, 11)
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/statutory", json=_payload(comp.id, " PF "), headers=hdr)
    assert r.status_code == 201, r.text
    assert r.json()["due_date"] == "2026-08-15T00:00:00"


def test_list_filter_matches_case_variants(client, db, make_tenant, auth_headers):
    comp, user = _mk_tenant(db, make_tenant, 12)
    hdr = auth_headers(user, comp)
    r = client.post("/apis/v3/statutory", json=_payload(comp.id, "pf"), headers=hdr)
    assert r.status_code == 201, r.text
    r = client.get(f"/apis/v3/statutory/{comp.id}?report_type=PF", headers=hdr)
    assert r.status_code == 200, r.text
    rows = r.json()
    assert len(rows) == 1, rows
    assert rows[0]["report_type"] == "pf"
    assert rows[0]["due_date"] is not None


def test_penalty_lookup_matches_case_variants(client, db, make_tenant, auth_headers):
    comp, user = _mk_tenant(db, make_tenant, 13)
    hdr = auth_headers(user, comp)
    r = client.post(
        "/apis/v3/statutory", json=_payload(comp.id, "tds", "2026-06"), headers=hdr
    )
    assert r.status_code == 201, r.text
    r = client.get(
        f"/apis/v3/statutory/{comp.id}/penalty?report_type=TDS&return_period=2026-06",
        headers=hdr,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["due_date"] == "2026-07-07T00:00:00"
