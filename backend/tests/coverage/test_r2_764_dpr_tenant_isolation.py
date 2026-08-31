"""R2-764 - Tenant isolation for DPR counts and author name resolution.

1. Leaderboard DPR count is scoped by company through Project, and honours pid when given.
2. Two-company same-name isolation test proves no cross-tenant leakage.
3. DPR author resolution resolves legacy UUIDs in feed, summary, export, and leaderboard.
"""
import datetime
import io
import csv
import uuid
from decimal import Decimal

from app import models


def _mk_project(db, comp, name="P1"):
    p = models.Project(
        id=uuid.uuid4(),
        company_id=comp.id,
        name=name,
        code=f"PRJ-{uuid.uuid4().hex[:8]}",
        status="Ongoing",
    )
    db.add(p)
    db.commit()
    return p


def _mk_dpr(db, project, reported_by, issues=None):
    d = models.DailyProgressReport(
        id=uuid.uuid4(),
        project_id=project.id,
        reported_by=reported_by,
        dpr_date=datetime.datetime.now(datetime.timezone.utc),
        executed_qty=Decimal("10.0"),
        workers_deployed=5,
        weather="Clear",
        issues=issues,
        status="submitted",
    )
    db.add(d)
    db.commit()
    return d


def test_dpr_count_tenant_isolation_same_user_name(client, db, make_tenant, auth_headers):
    # Two distinct companies, each having a user with the EXACT same display name
    comp_a, user_a, team_a = make_tenant(company_name="Tenant Alpha", user_name="Rajesh Kumar")
    comp_b, user_b, team_b = make_tenant(company_name="Tenant Beta", user_name="Rajesh Kumar")

    proj_a = _mk_project(db, comp_a, "Project Alpha")
    proj_b = _mk_project(db, comp_b, "Project Beta")

    # Seed 1 DPR under Company A, and 1 DPR under Company B, both authored by "Rajesh Kumar"
    _mk_dpr(db, proj_a, reported_by="Rajesh Kumar")
    _mk_dpr(db, proj_b, reported_by="Rajesh Kumar")

    # Fetch leaderboard for Company A
    hdr_a = auth_headers(user_a, comp_a)
    res_a = client.get(
        f"/apis/v3/reports/data/company-user-activity-leaderboard?company_id={comp_a.id}",
        headers=hdr_a,
    )
    assert res_a.status_code == 200, res_a.text
    data_a = res_a.json()
    rows_a = data_a.get("rows", [])

    rajesh_a = next((r for r in rows_a if r.get("Creator Name") == "Rajesh Kumar"), None)
    assert rajesh_a is not None, f"Expected Rajesh Kumar in rows: {rows_a}"

    # Company A's leaderboard MUST count ONLY Company A's DPRs (1), not cross-tenant count (2)
    assert rajesh_a["Progress Count"] == 1, (
        f"Cross-tenant leak: expected Progress Count 1 for Company A, got {rajesh_a['Progress Count']}"
    )


def test_dpr_leaderboard_pid_filter_and_legacy_uuid(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="Tenant Gamma", user_name="Vikram Seth")
    hdr = auth_headers(user, comp)

    proj_1 = _mk_project(db, comp, "Proj 1")
    proj_2 = _mk_project(db, comp, "Proj 2")

    # 1 DPR in proj_1 using user.name
    _mk_dpr(db, proj_1, reported_by="Vikram Seth")
    # 1 DPR in proj_2 using legacy user.id UUID
    _mk_dpr(db, proj_2, reported_by=str(user.id))

    # Leaderboard without pid: total should be 2 (both name and legacy UUID count)
    res = client.get(
        f"/apis/v3/reports/data/company-user-activity-leaderboard?company_id={comp.id}",
        headers=hdr,
    )
    assert res.status_code == 200
    rows = res.json().get("rows", [])
    vikram = next((r for r in rows if r.get("Creator Name") == "Vikram Seth"), None)
    assert vikram is not None
    assert vikram["Progress Count"] == 2

    # Leaderboard with pid=proj_1: only proj_1's DPR should be counted (1)
    res_p1 = client.get(
        f"/apis/v3/reports/data/company-user-activity-leaderboard?company_id={comp.id}&project_id={proj_1.id}",
        headers=hdr,
    )
    assert res_p1.status_code == 200
    rows_p1 = res_p1.json().get("rows", [])
    vikram_p1 = next((r for r in rows_p1 if r.get("Creator Name") == "Vikram Seth"), None)
    assert vikram_p1 is not None
    assert vikram_p1["Progress Count"] == 1


def test_dpr_author_resolution_feed_summary_export(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="Tenant Delta", user_name="Anita Roy")
    hdr = auth_headers(user, comp)
    proj = _mk_project(db, comp, "Proj Delta")

    unknown_uuid = str(uuid.uuid4())
    # 1. Plain text author
    _mk_dpr(db, proj, reported_by="Plain Text Author", issues="Issue 1")
    # 2. Legacy valid user UUID
    _mk_dpr(db, proj, reported_by=str(user.id), issues="Issue 2")
    # 3. Legacy unknown user UUID
    _mk_dpr(db, proj, reported_by=unknown_uuid, issues="Issue 3")

    # Check GET /dpr (feed)
    r_feed = client.get(f"/apis/v3/dpr?project_id={proj.id}", headers=hdr)
    assert r_feed.status_code == 200
    feed_items = r_feed.json()
    reporters = {item["issues"]: item["reported_by"] for item in feed_items}
    assert reporters["Issue 1"] == "Plain Text Author"
    assert reporters["Issue 2"] == "Anita Roy"
    assert reporters["Issue 3"] == "Unknown"

    # Check GET /dpr/summary
    r_summary = client.get(f"/apis/v3/dpr/summary?project_id={proj.id}", headers=hdr)
    assert r_summary.status_code == 200
    summary_issues = {item["issue"]: item["reporter"] for item in r_summary.json()["flagged_issues_list"]}
    assert summary_issues["Issue 1"] == "Plain Text Author"
    assert summary_issues["Issue 2"] == "Anita Roy"
    assert summary_issues["Issue 3"] == "Unknown"

    # Check GET /dpr/export
    r_export = client.get(f"/apis/v3/dpr/export?project_id={proj.id}", headers=hdr)
    assert r_export.status_code == 200
    reader = csv.reader(io.StringIO(r_export.text))
    rows = list(reader)
    # Header: Date, Project, Author, Executed Qty, Work Done, Labour Count, Materials, Remarks, Status
    export_authors = [row[2] for row in rows[1:]]
    assert "Plain Text Author" in export_authors
    assert "Anita Roy" in export_authors
    assert "Unknown" in export_authors
