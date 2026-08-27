"""R2-414 - the client report's lab-test pass rate must not assert failure
where there is no data.

Gate: zero ASSESSED lab tests means no pass rate exists, so the metric is the
None sentinel and the PDF prints "No lab tests assessed"; a genuine 0%
(tests exist and every assessed one fails) still prints as 0%.
"""
import datetime
import os
import uuid

from app.routers.reports import REPORTS_DIR
from app.utils.pdf_generator import generate_client_report_pdf
from app import models


def _mk_project(db, comp):
    p = models.Project(
        id=uuid.uuid4(), company_id=comp.id, name="P", code=f"PRJ-{uuid.uuid4().hex[:8]}", status="Ongoing"
    )
    db.add(p)
    db.commit()
    return p


def _mk_test(db, project, is_pass):
    t = models.MaterialTestResult(
        id=uuid.uuid4(), project_id=project.id, test_type="Cube Test",
        test_date=datetime.datetime(2026, 2, 1), result_value=10.0,
        is_pass=is_pass,
    )
    db.add(t)
    db.commit()
    return t


def _generate(client, hdr, project):
    r = client.post(f"/apis/v3/reports/generate/{project.id}",
                    json={"report_name": "R2-414"}, headers=hdr)
    assert r.status_code == 201, r.text
    report_id = r.json()["id"]
    dl = client.get(f"/apis/v3/reports/{report_id}/download", headers=hdr)
    assert dl.status_code == 200, dl.text
    body = dl.content
    # The endpoint writes the PDF into REPORTS_DIR on disk; clean it up so
    # the suite leaves no artifacts behind.
    try:
        os.remove(os.path.join(REPORTS_DIR, f"{report_id}.pdf"))
    except OSError:
        pass
    return body


# ── unit level: the renderer honours the None sentinel ──────────────────────

def test_pdf_renders_no_rate_sentinel_when_zero_assessed():
    metrics = {
        "quality_tests_total": 3,
        "quality_tests_pass_count": 0,
        "quality_tests_unassessed": 3,
        "quality_tests_pass_rate": None,
    }
    body = generate_client_report_pdf("T", "", metrics)
    assert b"No lab tests assessed" in body
    assert b"Material Lab Tests Pass Rate: 0%" not in body


def test_pdf_keeps_zero_pct_when_all_assessed_fail():
    metrics = {
        "quality_tests_total": 2,
        "quality_tests_pass_count": 0,
        "quality_tests_unassessed": 0,
        "quality_tests_pass_rate": 0,
    }
    body = generate_client_report_pdf("T", "", metrics)
    # Parens arrive backslash-escaped in the PDF content stream.
    assert b"Material Lab Tests Pass Rate: 0% \\(0 passed of 2 assessed; 0 not assessed\\)" in body


def test_pdf_prints_numeric_rate_when_some_pass():
    metrics = {
        "quality_tests_total": 4,
        "quality_tests_pass_count": 3,
        "quality_tests_unassessed": 1,
        "quality_tests_pass_rate": 100,
    }
    body = generate_client_report_pdf("T", "", metrics)
    assert b"Material Lab Tests Pass Rate: 100% \\(3 passed of 3 assessed; 1 not assessed\\)" in body


# ── end to end: the router computes the sentinel honestly ───────────────────

def test_router_metric_is_none_when_no_tests_exist(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R414A", user_name="U414A")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)

    body = _generate(client, hdr, project)
    assert b"No lab tests assessed" in body
    assert b"Material Lab Tests Pass Rate: 0%" not in body


def test_router_metric_is_none_when_only_unassessed_tests(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R414B", user_name="U414B")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    _mk_test(db, project, is_pass=None)
    _mk_test(db, project, is_pass=None)

    body = _generate(client, hdr, project)
    assert b"No lab tests assessed" in body
    assert b"Material Lab Tests Pass Rate: 0%" not in body


def test_router_metric_is_numeric_when_some_fail(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R414C", user_name="U414C")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    _mk_test(db, project, is_pass=True)
    _mk_test(db, project, is_pass=False)
    _mk_test(db, project, is_pass=None)

    body = _generate(client, hdr, project)
    assert b"Material Lab Tests Pass Rate: 50% \\(1 passed of 2 assessed; 1 not assessed\\)" in body


def test_router_metric_is_zero_when_all_assessed_fail(client, db, make_tenant, auth_headers):
    comp, user, team = make_tenant(company_name="R414D", user_name="U414D")
    hdr = auth_headers(user, comp)
    project = _mk_project(db, comp)
    _mk_test(db, project, is_pass=False)
    _mk_test(db, project, is_pass=False)

    body = _generate(client, hdr, project)
    assert b"Material Lab Tests Pass Rate: 0% \\(0 passed of 2 assessed; 0 not assessed\\)" in body
