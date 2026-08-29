"""Item C6: DPR 'today' tile keys on func.date(DailyProgressReport.dpr_date) matching the feed.
"""
from datetime import datetime, timezone, timedelta
import uuid

from app import models

_SUFFIX = uuid.uuid4().hex[:8]


def _tenant(make_tenant, auth_headers):
    comp, user, team = make_tenant(
        company_name=f"C6-{_SUFFIX}",
        user_name="U-C6",
        mobile=f"+9197{uuid.uuid4().hex[:8]}",
        email=f"c6-{uuid.uuid4().hex[:8]}@test.com",
    )
    return comp, user, team, auth_headers(user, comp)


def test_c6_dpr_backdated_consumption_does_not_pollute_today_tile(client, db, make_tenant, auth_headers):
    comp, user, team, hdr = _tenant(make_tenant, auth_headers)

    project = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name="C6 Project",
        status="Ongoing",
    )
    db.add(project)
    db.commit()

    now = datetime.now(timezone.utc)
    yesterday = now - timedelta(days=1)

    # 1. File a DPR filed today for yesterday's work with 50 units consumed
    res = client.post(
        "/apis/v3/dpr",
        headers=hdr,
        json={
            "project_id": str(project.id),
            "reported_by": "Site Engineer",
            "dpr_date": yesterday.isoformat(),
            "executed_qty": 10.0,
            "workers_deployed": 5,
            "materials_consumed": [{"material_name": "Cement", "quantity": 50.0, "unit": "bags"}],
        },
    )
    assert res.status_code == 201, res.text

    # 2. Check summary for today: material_used_today must be 0.0 because work was for yesterday
    summary_res = client.get(f"/apis/v3/dpr/summary?project_id={project.id}", headers=hdr)
    assert summary_res.status_code == 200, summary_res.text
    summary = summary_res.json()
    assert summary["material_used_today"] == 0.0, f"Expected 0.0 used today, got {summary['material_used_today']}"

    # 3. File a DPR for today's work with 25 units consumed
    res_today = client.post(
        "/apis/v3/dpr",
        headers=hdr,
        json={
            "project_id": str(project.id),
            "reported_by": "Site Engineer",
            "dpr_date": now.isoformat(),
            "executed_qty": 20.0,
            "workers_deployed": 8,
            "materials_consumed": [{"material_name": "Cement", "quantity": 25.0, "unit": "bags"}],
        },
    )
    assert res_today.status_code == 201, res_today.text

    # 4. Check summary for today: material_used_today must now be exactly 25.0
    summary_res2 = client.get(f"/apis/v3/dpr/summary?project_id={project.id}", headers=hdr)
    assert summary_res2.status_code == 200, summary_res2.text
    summary2 = summary_res2.json()
    assert summary2["material_used_today"] == 25.0, f"Expected 25.0 used today, got {summary2['material_used_today']}"
