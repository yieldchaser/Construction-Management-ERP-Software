"""FINDING 18: standing two-tenant isolation gate.

Creates two companies and a user in only one, then enumerates every GET route
from the live OpenAPI schema whose path contains {company_id} or {project_id}
as its sole path placeholder. For each such route the test probes the OTHER
tenant's ID using the first tenant's JWT and asserts 403.

Enumerated from app.openapi() at test time so new routes are covered
automatically. Verified 101 JWT-authenticated sole-placeholder GET routes
at 53cfa95 with zero leaks. Admin (X-Admin-Secret) and BI feed (X-API-Key)
routes are excluded because they do not use JWT tenant isolation.
"""

import re
import uuid

from app.main import app
from app import models


def test_two_tenant_isolation_get_routes_enumerated_from_openapi(
    client, db, make_tenant, auth_headers
):
    # Two tenants, user only in A.
    comp_a, user_a, _ = make_tenant(
        company_name="TISO-A",
        user_name="TISO-UA",
        mobile="+919999990001",
        email="tiso-a@test.com",
    )
    comp_b, user_b, _ = make_tenant(
        company_name="TISO-B",
        user_name="TISO-UB",
        mobile="+919999990002",
        email="tiso-b@test.com",
    )

    # Real project in B so project_id probes hit the membership check (403)
    # rather than the missing-project path (404). Without a real row a 404
    # would mask a missing isolation guard.
    project_b = models.Project(
        id=uuid.uuid4(),
        company_id=comp_b.id,
        name="TISO Project B",
        code="TISO-PB",
        status="Ongoing",
    )
    db.add(project_b)
    db.commit()

    hdr_a = auth_headers(user_a, comp_a)

    schema = app.openapi()
    paths = schema.get("paths", {})

    # Collect GET routes whose path has exactly one placeholder and that
    # placeholder is company_id or project_id.
    targets = []
    for path, methods in sorted(paths.items()):
        if "get" not in methods:
            continue
        placeholders = re.findall(r"\{([^}]+)\}", path)
        if len(placeholders) != 1 or placeholders[0] not in ("company_id", "project_id"):
            continue
        # Non-JWT tenant isolation: admin uses X-Admin-Secret, BI feeds use
        # X-API-Key. Probing them with a JWT yields 401 or admin-secret 403
        # for the wrong reason, so skip them explicitly.
        if "/admin/" in path or "/integrations/bi/feed/" in path:
            continue
        targets.append((path, placeholders[0]))

    assert targets, "no GET sole-tenant routes enumerated from OpenAPI"

    failures = []
    probed = 0
    for path, placeholder in targets:
        url = path
        if placeholder == "company_id":
            url = url.replace("{company_id}", str(comp_b.id))
        else:
            url = url.replace("{project_id}", str(project_b.id))

        r = client.get(url, headers=hdr_a)
        probed += 1
        if r.status_code != 403:
            failures.append(
                f"{path} -> {url}: expected 403 got {r.status_code} body={r.text[:300]!r}"
            )

    # Positive control: own tenant must not be blocked.
    own_company_url = f"/apis/v3/projects/company/{comp_a.id}"
    # This route is in the enumerated set; ensure it is reachable for the owner.
    # Not every own-tenant GET is 200 (some return empty lists), but it must
    # not be 403.
    rc = client.get(own_company_url, headers=hdr_a)
    assert rc.status_code != 403, f"positive control failed: own company blocked {rc.status_code} {rc.text[:200]}"

    own_project = models.Project(
        id=uuid.uuid4(),
        company_id=comp_a.id,
        name="TISO Project A",
        code="TISO-PA",
        status="Ongoing",
    )
    db.add(own_project)
    db.commit()
    rp = client.get(f"/apis/v3/projects/{own_project.id}", headers=hdr_a)
    assert rp.status_code != 403, f"positive control failed: own project blocked {rp.status_code} {rp.text[:200]}"

    assert probed == len(targets), f"probed {probed} but targets {len(targets)}"
    assert not failures, (
        f"tenant isolation leak on {len(failures)}/{probed} GET routes:\n"
        + "\n".join(failures)
    )
