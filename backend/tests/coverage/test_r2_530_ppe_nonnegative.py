"""R2-530 - a PPE compliance audit cannot record negative worker counts.

The only validation used to be the relative guard (compliant > total), so
{"total_workers": -5, "compliant_workers": -10} sailed through with a 200.
Gate: POST /safety/ppe-checks now refuses each negative field with a 422 while
a legitimate zero-worker audit and a normal audit still land.
"""
import uuid
import datetime

from app import models


def test_negative_worker_counts_rejected(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R530A", user_name="U530A")
    hdr = auth_headers(user, comp)

    for body in (
        {"total_workers": -5, "compliant_workers": -10},
        {"total_workers": -1, "compliant_workers": 0},
        {"total_workers": 10, "compliant_workers": -2},
    ):
        r = client.post(
            "/apis/v3/safety/ppe-checks",
            headers=hdr,
            json={
                "project_id": str(uuid.uuid4()),
                "checked_by": "Safety Officer",
                "check_date": "2026-02-01T09:00:00",
                "non_compliant_items": [],
                **body,
            },
        )
        assert r.status_code == 422, f"{body} -> {r.status_code} {r.text}"


def test_zero_and_positive_audits_still_accepted(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R530B", user_name="U530B")
    hdr = auth_headers(user, comp)
    project = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(project)
    db.commit()

    def _post(total, compliant):
        return client.post(
            "/apis/v3/safety/ppe-checks",
            headers=hdr,
            json={
                "project_id": str(project.id),
                "checked_by": "Safety Officer",
                "check_date": datetime.datetime(2026, 2, 1).isoformat(),
                "total_workers": total,
                "compliant_workers": compliant,
                "non_compliant_items": ["no helmet"],
            },
        )

    r = _post(0, 0)
    assert r.status_code == 200, r.text
    assert r.json()["compliance_pct"] == 0.0

    r = _post(10, 8)
    assert r.status_code == 200, r.text
    assert r.json()["compliance_pct"] == 80.0

    # The relative guard still holds above the new non-negativity bounds.
    r = _post(5, 6)
    assert r.status_code == 400, r.text
