"""Tier 4 Parity Item 17: Preserving original filenames on download via CORS expose-headers.
"""
from app.main import app
from fastapi.testclient import TestClient

_ORIGIN = "http://localhost:3000"


def test_cors_expose_headers_includes_content_disposition_and_total_count(client):
    r = client.get("/health", headers={"Origin": _ORIGIN})
    assert r.status_code == 200
    exposed = r.headers.get("access-control-expose-headers", "")
    exposed_lower = [h.strip().lower() for h in exposed.split(",") if h.strip()]
    assert "content-disposition" in exposed_lower, f"content-disposition missing from {exposed}"
    assert "x-total-count" in exposed_lower, f"x-total-count missing from {exposed}"
