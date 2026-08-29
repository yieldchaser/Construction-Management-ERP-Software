"""R2-257 - a timesheet's file_url must not accept a javascript: URL.

The value reaches an <a href> on the Team Action page, so anything the API
stores is script executing in the application's own origin on an ordinary
click (stored, cross-user XSS). The create boundary now allow-lists a
same-origin path (/...) or an https URL on this product's own storage origin,
mirroring the drawings rule; the frontend additionally neutralizes legacy rows
at render (not testable from the backend suite).
"""
import uuid

from app import models
from app.config import settings

_SUFFIX = uuid.uuid4().hex[:8]


def _payload(company_id, project_id, file_url):
    return {
        "company_id": str(company_id),
        "project_id": str(project_id),
        "entry_date": "2026-08-20T00:00:00Z",
        "start_time": "2026-08-20T09:00:00Z",
        "end_time": "2026-08-20T17:00:00Z",
        "remarks": "R2-257 probe",
        "file_url": file_url,
        "file_name": "zz.pdf",
    }


def _seed_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id,
        name=f"R2257-P-{_SUFFIX}", code=f"R2257-{_SUFFIX}", status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def test_javascript_scheme_rejected(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name=f"R2257A-{_SUFFIX}", user_name="U2257A",
        mobile=f"+9196{_SUFFIX}", email=f"r2257a-{_SUFFIX}@test.com",
    )
    proj = _seed_project(db, comp)
    hdr = auth_headers(user, comp)

    r = client.post(
        "/apis/v3/team-schedule/timesheets",
        json=_payload(comp.id, proj.id, "javascript:alert(document.domain)"),
        headers=hdr,
    )
    assert r.status_code == 422, r.text
    listing = client.get(
        f"/apis/v3/team-schedule/timesheets?company_id={comp.id}&project_id={proj.id}",
        headers=hdr,
    )
    assert listing.json() == [], listing.text


def test_blank_file_url_rejected_but_null_allowed(client, db, make_tenant, auth_headers):
    comp, user, _team = make_tenant(
        company_name=f"R2257B-{_SUFFIX}", user_name="U2257B",
        mobile=f"+9196{_SUFFIX}1", email=f"r2257b-{_SUFFIX}@test.com",
    )
    proj = _seed_project(db, comp)
    hdr = auth_headers(user, comp)

    blank = client.post(
        "/apis/v3/team-schedule/timesheets",
        json=_payload(comp.id, proj.id, "   "),
        headers=hdr,
    )
    assert blank.status_code == 422, blank.text

    none_payload = _payload(comp.id, proj.id, None)
    ok = client.post("/apis/v3/team-schedule/timesheets", json=none_payload, headers=hdr)
    assert ok.status_code == 201, ok.text
    assert ok.json()["file_url"] is None, ok.text


def test_same_origin_path_and_storage_https_accepted_foreign_host_rejected(
    client, db, make_tenant, auth_headers, monkeypatch
):
    comp, user, _team = make_tenant(
        company_name=f"R2257C-{_SUFFIX}", user_name="U2257C",
        mobile=f"+9196{_SUFFIX}2", email=f"r2257c-{_SUFFIX}@test.com",
    )
    proj = _seed_project(db, comp)
    hdr = auth_headers(user, comp)

    # The real upload flow stores /files/file/{id}.
    path = client.post(
        "/apis/v3/team-schedule/timesheets",
        json=_payload(comp.id, proj.id, "/files/file/abc123"),
        headers=hdr,
    )
    assert path.status_code == 201, path.text
    assert path.json()["file_url"] == "/files/file/abc123", path.text

    monkeypatch.setattr(settings, "SUPABASE_URL", "https://zsitedemo.supabase.co")
    own = client.post(
        "/apis/v3/team-schedule/timesheets",
        json=_payload(comp.id, proj.id, "https://zsitedemo.supabase.co/storage/v1/object/public/files/x.pdf"),
        headers=hdr,
    )
    assert own.status_code == 201, own.text

    foreign = client.post(
        "/apis/v3/team-schedule/timesheets",
        json=_payload(comp.id, proj.id, "https://evil.example.com/x.pdf"),
        headers=hdr,
    )
    assert foreign.status_code == 422, foreign.text
