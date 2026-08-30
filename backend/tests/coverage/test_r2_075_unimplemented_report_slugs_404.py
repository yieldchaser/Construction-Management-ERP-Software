"""R2-075: an unimplemented report slug must fail loudly, not lie.

The catalogue advertises 88 viewSlugs while only 24 have handlers. A slug
absent from ``_REPORT_HANDLERS`` used to fall through to ``rows: []`` with
HTTP 200, indistinguishable from a report with no data for the period.
This pins the corrected contract:

- A registered slug keeps its normal contract: 200 with rows and an
  ``errors`` list (emptiness and crash stay distinguishable, R2-076).
- An unknown but catalogue-style slug gets a 404 whose detail names the
  slug and says it is not implemented.
"""

from app.routers import reports as reports_mod

DATA_URL = "/apis/v3/reports/data"


def test_known_slug_is_200_and_unimplemented_slug_is_404(
    client, make_tenant, auth_headers
):
    company, user, _team = make_tenant(company_name="Wave Co", user_name="Wave Owner")

    # Known slug: normal success contract even with no data seeded.
    assert "dpr" in reports_mod._REPORT_HANDLERS
    resp = client.get(
        f"{DATA_URL}/dpr?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["slug"] == "dpr"
    assert body["rows"] == []
    assert body["errors"] == []

    # Slug with no backend handler: loud 404 naming it,
    # never a silent empty 200 (R2-075).
    slug = "unimplemented-sample-report"
    assert slug not in reports_mod._REPORT_HANDLERS
    resp = client.get(
        f"{DATA_URL}/{slug}?company_id={company.id}",
        headers=auth_headers(user, company),
    )
    assert resp.status_code == 404
    detail = resp.json()["detail"]
    assert slug in detail
    assert "not implemented" in detail.lower()
