import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import models

client = TestClient(app)

def test_project_baseline_freeze(db, make_tenant, auth_headers):
    comp, user, _ = make_tenant(company_name="Baseline Test Co", user_name="Baseline User")
    headers = auth_headers(user, comp)

    proj = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="Baseline Project",
        code="BP01",
        status="active"
    )
    db.add(proj)
    db.commit()

    now = datetime.now(timezone.utc)
    t1 = models.Task(
        id=uuid.uuid4(),
        project_id=proj.id,
        name="Task 1",
        duration_days=5,
        start_date=now,
        end_date=now + timedelta(days=5),
        baseline_start=None,
        baseline_end=None,
        progress=0.0
    )
    t2 = models.Task(
        id=uuid.uuid4(),
        project_id=proj.id,
        name="Task 2",
        duration_days=5,
        start_date=now + timedelta(days=5),
        end_date=now + timedelta(days=10),
        baseline_start=None,
        baseline_end=None,
        progress=0.0
    )
    db.add_all([t1, t2])
    db.commit()

    res = client.post(f"/apis/v3/planning/projects/{proj.id}/baseline", headers=headers)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data.get("tasks_updated") == 2

    db.refresh(t1)
    db.refresh(t2)
    assert t1.baseline_start == t1.start_date
    assert t1.baseline_end == t1.end_date
    assert t2.baseline_start == t2.start_date
    assert t2.baseline_end == t2.end_date
