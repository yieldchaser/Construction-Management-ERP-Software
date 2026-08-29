"""R2-294 - no route may be registered twice for the same (method, path).

Gate: /admin/migrations/backfill-rbac was declared twice with different bodies;
requests ran the first implementation while openapi.json documented the second,
so anyone reading the API reference to judge a whole-tenant RBAC migration was
reading a function that never executes. FastAPI silently overwrites the schema
entry and never warns, and the deletion alone cannot stop the same mistake from
reappearing anywhere else, so this pins the whole route table: every (method,
path) pair across every included router must be unique.

The installed FastAPI defers include_router() behind lazy _IncludedRouter
wrappers, so plain app.routes only exposes one opaque object per router; the
guard walks into each wrapper's original routes and re-applies its prefix.
"""
from collections import Counter


def _route_pairs(app):
    pairs = []
    for r in app.routes:
        if type(r).__name__ == "_IncludedRouter":
            prefix = getattr(r.include_context, "prefix", "") or ""
            routes = r.original_router.routes
        else:
            prefix = ""
            routes = [r]
        for rr in routes:
            methods = getattr(rr, "methods", None) or []
            for m in methods:
                if m == "HEAD":
                    continue
                pairs.append((m, prefix + rr.path))
    return pairs


def test_no_duplicate_method_path_route_registrations(client):
    dupes = {pair: n for pair, n in Counter(_route_pairs(client.app)).items() if n > 1}
    assert not dupes, f"duplicate (method, path) registrations: {dupes}"
