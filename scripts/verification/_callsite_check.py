"""FRONTEND -> BACKEND reachability: does every URL the frontend calls exist?

check_route_reachability.py only ever asked the other question, "is every backend
route called from some screen", which catches dead endpoints. It cannot catch a
screen calling an endpoint that was never built.

That gap is not theoretical. The project creation wizard shipped calling
GET /apis/v3/projects/company/{id}/members, a route that has never existed. Step 3
of the wizard said "No members found" for every company on the platform, and this
gate reported 0 unreachable the whole time.

Matching rule: STRICT. A literal segment the frontend wrote must be that literal
in the route, and an interpolated segment must be a route param.

A generous rule was tried first, letting an interpolated segment stand in for a
route literal too. It reported a clean zero and did not catch the very bug that
motivated this file: /projects/company/{id}/members lined up against
DELETE /projects/{project_id}/members/{member_id} by accident, the param
absorbing "company" and the literal "members" landing on {member_id}. A gate that
reports zero without detecting the known case is worse than no gate.

The cost of strictness is the handful of call sites that build a resource segment
from a variable. Those are listed in DYNAMIC_SEGMENT_CALLSITES by name, so each
one is a decision somebody made rather than a hole the rule leaves open.

Imported by check_route_reachability.py so both directions run from one command.
"""

import re

# Frontend URLs that deliberately do not map to a FastAPI route in this repo.
CALLSITE_EXEMPT_PREFIXES = (
    "/apis/v3/auth/resolve-company",  # handled by slug middleware, not a router
)

# Files that mention endpoint paths as documentation rather than calling them.
CALLSITE_EXEMPT_FILES = ("helpcontent.tsx",)

# Call sites that build a resource segment from a variable, so the path cannot be
# resolved statically. Each was checked by hand against the router.
DYNAMIC_SEGMENT_CALLSITES = {
    # library/page.tsx switches on the active tab: parties, materials, rates, ...
    "/apis/v3/library/{param}",
    "/apis/v3/library/{param}/{param}",
    # billing/page.tsx cancels either a bill or a work order
    "/apis/v3/billing/{param}/{param}/cancel",
    # hr/page.tsx approves or rejects a timesheet
    "/apis/v3/hr/timesheets/{param}/{param}",
    # quality/page.tsx moves an NCR between statuses
    "/apis/v3/quality/ncr/{param}/{param}",
    # settings/page.tsx uploads logo / signature / stamp / watermark
    "/apis/v3/settings/company-file/{param}/logo",
    "/apis/v3/settings/company-file/{param}/signature",
    "/apis/v3/settings/company-file/{param}/stamp",
    "/apis/v3/settings/company-file/{param}/watermark",
    # delete-logs and statutory append a query string built inline
    "/apis/v3/delete-logs/{param}",
    "/apis/v3/statutory/{param}",
}

PARAM = "{param}"

# Stop at the first character that cannot be part of a URL. `$` is allowed only
# as the start of a `${...}` interpolation; a bare `$` ends the match, otherwise
# a template like `/x/${a}${b}` produced a garbage path ending in "${".
_SEG = r"(?:/(?:\$\{[^}]*\}|[A-Za-z0-9_\-.{}:]+))+"
_URL_RE = re.compile(r"/apis/v3" + _SEG)

# Calls made through the api()/getApi() helper, which prepends /apis/v3 at
# runtime. Missing these was not academic: the wizard's broken members call was
# written as api(`/projects/company/${companyId}/members`), so a checker that
# only looked for a literal /apis/v3 could not see the one bug it exists for.
_HELPER_RE = re.compile(r"\b(?:api|getApi)\(\s*[`'\"](" + _SEG + r")")


def extract_frontend_callsites(frontend_contents):
    """Every /apis/v3/... URL the frontend builds, normalised to a route shape."""
    seen = {}
    for fname, content in frontend_contents:
        if fname.lower().endswith(CALLSITE_EXEMPT_FILES):
            continue
        for m in _URL_RE.finditer(content):
            path = re.sub(r"\$\{[^}]*\}", PARAM, m.group(0)).rstrip("/")
            if not path or path == "/apis/v3":
                continue
            line = content[: m.start()].count("\n") + 1
            seen.setdefault(path, (fname, line))
        for m in _HELPER_RE.finditer(content):
            path = "/apis/v3" + re.sub(r"\$\{[^}]*\}", PARAM, m.group(1)).rstrip("/")
            if path == "/apis/v3":
                continue
            line = content[: m.start()].count("\n") + 1
            seen.setdefault(path, (fname, line))
    return seen


def _segments(path):
    return [s for s in path.strip("/").split("/") if s]


def route_shape(path):
    """Backend route path -> /apis/v3-prefixed segments with params normalised."""
    p = ("/apis/v3/" + path.strip("/")).rstrip("/")
    return re.sub(r"\{[a-zA-Z0-9_]+\}", PARAM, p)


def _matches(call_segs, route_segs):
    """Asymmetric, and the asymmetry is the whole point.

    A literal the frontend wrote MAY fill a route param: /reports/data/dpr is a
    perfectly good call to /reports/data/{slug}.

    An interpolated segment may NOT stand in for a route literal. That is the
    direction that lets unrelated paths line up by accident, and it is exactly
    how /projects/company/{id}/members matched
    DELETE /projects/{project_id}/members/{member_id}: the route param absorbed
    "company" and the written literal "members" landed on {member_id}.
    """
    if len(call_segs) != len(route_segs):
        return False
    for c, r in zip(call_segs, route_segs):
        if r == PARAM:
            # Route param accepts anything the caller put there.
            continue
        if c == PARAM:
            # Route wants a fixed word here; a runtime value cannot be assumed
            # to be it.
            return False
        if c.lower() != r.lower():
            return False
    return True


def check_callsites(routes, frontend_contents):
    """Return [(path, file, line)] for frontend calls that match no backend route."""
    route_segs = [_segments(route_shape(r["path"])) for r in routes]
    unknown = []
    for path, (fname, line) in sorted(extract_frontend_callsites(frontend_contents).items()):
        if path.startswith(CALLSITE_EXEMPT_PREFIXES):
            continue
        if path in DYNAMIC_SEGMENT_CALLSITES:
            continue
        call_segs = _segments(path)
        if any(_matches(call_segs, rs) for rs in route_segs):
            continue
        unknown.append((path, fname, line))
    return unknown


def callsite_self_test():
    """Both directions, because a checker that finds nothing passes trivially."""
    routes = [
        {"method": "GET", "path": "/projects/company/{company_id}/summary"},
        {"method": "GET", "path": "/library/parties/{company_id}"},
    ]
    good = [("good.tsx", "fetch(`${host}/apis/v3/projects/company/${cid}/summary`)")]
    # The real defect: a route that has never existed.
    bad = [("bad.tsx", "fetch(`${host}/apis/v3/projects/company/${cid}/members`)")]
    # The same bug as it was actually written, through the api() helper.
    bad_helper = [("bad2.tsx", "fetch(api(`/projects/company/${companyId}/members`))")]
    # A listed dynamic call site must not be reported.
    dynamic = [("dyn.tsx", "fetch(`${host}/apis/v3/library/${kind}/${cid}`)")]
    # Documentation must not be treated as a call site.
    docs = [("helpContent.tsx", "GET /apis/v3/nope/{id}/never")]

    if check_callsites(routes, good):
        print("[self-test] FAIL: a real call site was reported as unknown.")
        return False
    if not check_callsites(routes, bad):
        print("[self-test] FAIL: a call to a nonexistent route was not detected.")
        return False
    if not check_callsites(routes, bad_helper):
        print("[self-test] FAIL: a bad call through the api() helper was not detected.")
        return False
    if check_callsites(routes, dynamic):
        print("[self-test] FAIL: an interpolated resource segment was reported.")
        return False
    if check_callsites(routes, docs):
        print("[self-test] FAIL: documentation prose was treated as a call site.")
        return False
    print("[self-test] Call-site direction PASSED (real, missing, dynamic, docs).")
    return True
