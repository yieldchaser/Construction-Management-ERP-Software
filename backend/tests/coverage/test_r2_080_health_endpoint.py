"""R2-080 - the keep-alive pings a real liveness endpoint.

The Render keep-alive curl hit `/`, the app root, and GitHub Actions cron is
throttled anyway; the audit's standing item was a dedicated `/health` for any
pinger (external or Actions) to target instead of `/`.
"""


def test_health_endpoint_answers(client):
    r = client.get("/health")
    assert r.status_code == 200, r.text
    assert r.json() == {"status": "ok"}


def test_keepalive_workflow_targets_health():
    import os

    path = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", ".github", "workflows", "keep_alive.yml"
    )
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    assert "/health" in content
    assert "onrender.com/health" in content
