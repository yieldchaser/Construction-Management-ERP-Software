"""Standing two-tenant isolation gate.

Creates two companies and a user in only one, then asserts 403 for
every GET route carrying {company_id} or {project_id} as its sole
path param, enumerated from the OpenAPI schema so new routes are
covered automatically.

At 53cfa95 a manual pass verified 180 such routes with zero leaks.
This test automates the same gate dynamically via app.openapi().
"""

import re
import uuid

from app.main import app
from app import models


def _enumerate_get_sole_routes():
    """Return list of (path_template, param_name, operation) for GET routes
    where the path contains exactly one param and it is company_id or
    project_id. Only routes that require JWT bearer auth are included;
    feed/admin endpoints that use API-key or admin-secret are skipped
    because they do not tenant-check via JWT membership.
    """
    oas = app.openapi()
    out = []
    for path, methods in oas.get("paths", {}).items():
        if "get" not in methods:
            continue
        op = methods["get"]
        param_names = re.findall(r"\{([^}]+)\}", path)
        if len(param_names) != 1:
            continue
        if param_names[0] not in ("company_id", "project_id"):
            continue
        # Only JWT-authenticated routes are tenant-checked via
        # verify_company_access / verify_project_access.
        sec = op.get("security")
        if not sec:
            # No security entry means unauthenticated or API-key/admin-secret.
            # Skip bi feed and admin migration endpoints.
            continue
        has_bearer = any("OAuth2PasswordBearer" in s for s in sec)
        if not has_bearer:
            continue
        out.append((path, param_names[0], op))
    return out


def _dummy_for_query_param(param, project_b_id):
    """Return a plausible dummy value for a required query param.

    For uuid query params named project_id we return the isolated
    project's id so the request reaches the tenant gate with a real
    entity (otherwise a random uuid would 404 before 403). For known
    statutory / face params we return values that satisfy FastAPI
    validation so the tenant check is reached before 422.
    """
    name = param.get("name")
    schema = param.get("schema") or {}
    ptype = schema.get("type")
    fmt = schema.get("format")

    if name == "project_id" and fmt == "uuid":
        if project_b_id:
            return str(project_b_id)
        return str(uuid.uuid4())

    if ptype == "integer":
        if name == "month":
            return 1
        if name == "year":
            return 2026
        # Respect minimum if declared
        minimum = schema.get("minimum")
        if minimum is not None:
            return int(minimum)
        return 1

    if ptype == "string":
        if name == "date":
            return "2026-01-01"
        if name == "report_type":
            return "pf"
        if name == "return_period":
            return "2026-01"
        if name == "quarter":
            return "Q1"
        # Handle enum if present
        enum_vals = schema.get("enum")
        if enum_vals:
            return enum_vals[0]
        return "test"

    # Fallback
    return "test"


def test_two_tenant_get_routes_isolation(client, db, make_tenant, auth_headers):
    """Two-tenant gate: user in company A must get 403 for every GET
    route that carries {company_id} or {project_id} as its sole path
    param when called with company B / project B identifiers.

    The set of routes is discovered from app.openapi() so new routes
    are covered without manual updates.
    """
    # Use unique suffix to avoid collisions across parallel runs.
    sfx = uuid.uuid4().hex[:6]

    comp_a, user_a, _team_a = make_tenant(
        company_name=f"TT-A-{sfx}",
        user_name=f"TTUserA{sfx}",
        mobile=f"+91990{sfx}01",
        email=f"tta-{sfx}@test.com",
    )
    comp_b, _user_b, _team_b = make_tenant(
        company_name=f"TT-B-{sfx}",
        user_name=f"TTUserB{sfx}",
        mobile=f"+91990{sfx}02",
        email=f"ttb-{sfx}@test.com",
    )

    # Project in company B for {project_id} variant. The user in A
    # has no membership in B, so any project scoped to B must 403.
    project_b = models.Project(
        id=uuid.uuid4(),
        company_id=comp_b.id,
        name=f"TT-Project-B-{sfx}",
        code=f"TTPB-{sfx}",
        status="Ongoing",
    )
    db.add(project_b)
    db.commit()

    hdr_a = auth_headers(user_a, comp_a)

    routes = _enumerate_get_sole_routes()

    # Sanity: we must have discovered a non-trivial set. At 53cfa95
    # the manual count was 180; the current OpenAPI enumeration at
    # this commit is 102 JWT-protected sole-param GET routes (106
    # including unauthenticated feed/admin which are intentionally
    # skipped). Assert the gate is not vacuous.
    assert len(routes) >= 90, f"Expected at least 90 tenant-checked GET sole-param routes, got {len(routes)}: {routes}"
    # Provide visibility in -v output
    print(f"\n[two-tenant gate] discovered {len(routes)} GET sole-param routes (JWT-protected)")

    failures = []
    skipped = []

    for path_template, param_name, op in sorted(routes):
        if param_name == "company_id":
            target_id = str(comp_b.id)
        else:
            target_id = str(project_b.id)

        url = path_template.replace("{" + param_name + "}", target_id)

        # Build required query params so the request reaches the
        # tenant check rather than 422ing on missing required query.
        query = {}
        for p in op.get("parameters", []) or []:
            if p.get("in") == "query" and p.get("required"):
                qname = p.get("name")
                # Do not treat path param as query
                if qname == param_name:
                    continue
                query[qname] = _dummy_for_query_param(p, project_b.id)

        resp = client.get(url, params=query, headers=hdr_a)

        # Every such route must tenant-check via verify_company_access
        # or verify_project_access and return 403 for a non-member.
        # A 200 would be a direct tenant leak. 404 for a missing
        # project is not expected here because the project exists but
        # belongs to the other tenant; it should still be 403 (hidden
        # existence would be 404 but the current codebase uses 403).
        if resp.status_code != 403:
            # Collect detailed failure for final assertion message.
            body = resp.text[:800] if hasattr(resp, "text") else str(resp.content[:800])
            failures.append(
                f"{path_template} -> {url} params={query} expected 403 got {resp.status_code} body={body}"
            )

    if failures:
        # Show up to 20 failures in the assertion message for triage.
        head = "\n".join(failures[:20])
        extra = f"\n... and {len(failures) - 20} more" if len(failures) > 20 else ""
        raise AssertionError(
            f"Two-tenant isolation gate failed for {len(failures)}/{len(routes)} routes:\n{head}{extra}\n"
            f"Discovered routes: {len(routes)}"
        )

    # Success: report coverage in output for humans and CI.
    print(f"[two-tenant gate] PASS {len(routes)} routes all returned 403 for cross-tenant GET")
