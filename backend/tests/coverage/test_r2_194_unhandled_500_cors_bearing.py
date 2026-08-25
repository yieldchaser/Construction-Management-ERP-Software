"""R2-194 - escaped errors answer as a CORS-bearing 500; the namespace stays closed.

The greedy delete-logs mount used to swallow every single-segment /apis/v3
path and die as an unhandled UUID ValueError 500 with no CORS headers, which
the browser reports as "TypeError: Failed to fetch" instead of a status code.
R2-291 moved the router to /apis/v3/delete-logs and UUID-typed its params;
this pins the remaining prescribed leg: any exception that still escapes is
rendered by a global handler whose 500 carries CORS headers for whitelisted
origins, while plausible collection paths get real statuses again.
"""
import uuid

from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app

_ORIGIN = "http://localhost:3000"


def test_single_segment_probes_answer_with_statuses_not_network_failures(client):
    hdr = {"Origin": _ORIGIN}

    r_towers = client.get("/apis/v3/towers", headers=hdr)
    assert r_towers.status_code == 404, r_towers.text
    assert r_towers.headers["access-control-allow-origin"] == _ORIGIN

    r_equipment = client.get("/apis/v3/equipment", headers=hdr)
    assert r_equipment.status_code < 500, r_equipment.text


def test_delete_logs_bad_uuid_is_422_not_valueerror_500(client, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="R194-DL", user_name="U194DL")
    r = client.get("/apis/v3/delete-logs/not-a-uuid", headers=auth_headers(user, comp))
    assert r.status_code == 422, r.text


def test_unhandled_exception_renders_cors_bearing_generic_500():
    def _boom():
        raise RuntimeError("synthetic escape R2-194")

    app.dependency_overrides[get_db] = _boom
    try:
        raw = TestClient(app, raise_server_exceptions=False)

        r = raw.get(
            f"/apis/v3/billing/subcontractors?company_id={uuid.uuid4()}",
            headers={"Origin": _ORIGIN},
        )
        assert r.status_code == 500, r.text
        assert r.json() == {"detail": "Internal server error"}
        assert "synthetic escape" not in r.text
        assert r.headers["access-control-allow-origin"] == _ORIGIN
        assert r.headers["access-control-allow-credentials"] == "true"

        r_no_origin = raw.get(f"/apis/v3/billing/subcontractors?company_id={uuid.uuid4()}")
        assert r_no_origin.status_code == 500, r_no_origin.text
        assert "access-control-allow-origin" not in r_no_origin.headers
    finally:
        app.dependency_overrides.pop(get_db, None)
