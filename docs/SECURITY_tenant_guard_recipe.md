# Security recipe — add multi-tenant membership guards to write endpoints (per router)

## The vulnerability
Across the backend, `POST`/`PUT`/`PATCH`/`DELETE` endpoints take a client-supplied `company_id`/`project_id` (from the request body or URL) and at most check the row EXISTS — they never verify the authenticated caller belongs to that company. Every router requires login (`dependencies=[Depends(get_current_user)]`) but not membership, so any logged-in user can create/modify/delete another company's data (IDOR / cross-tenant write). finance.py was fixed as the first instance; this recipe fixes the rest, one router at a time.

## Guard helpers (already in `app/auth.py`, import as needed)
- `get_company_membership(db, user, company_id)` — imperative; call inside the function body after you have the company_id / loaded entity. Raises 403 if the user isn't a member. **Use this for body params and entity-id endpoints.**
- `verify_company_access` / `verify_project_access` — FastAPI **dependencies** that read a `company_id`/`project_id` **path or query param** declared on the endpoint and 403 if the caller isn't a member. **Use these (as `_: None = Depends(verify_company_access)`) only when the id is a path/query param**, not a body field.
- `get_current_user` (+ `User` model) — inject `current_user: User = Depends(get_current_user)` when you need the user for the imperative check.

## Decision rule — for EVERY write endpoint in the router
Audit each `@router.(post|put|patch|delete)`. If it mutates data scoped to a company/project and does NOT already enforce membership (via one of the helpers above), add the guard:

1. **id is a path/query param** (`def f(company_id: uuid.UUID, ...)`) → add `_: None = Depends(verify_company_access)` (or `verify_project_access`) to the signature. Done.
2. **id is in the request body** (`req.company_id` / `data.company_id`) → add `current_user: User = Depends(get_current_user)` to the signature; after parsing, call `get_company_membership(db, current_user, <company_id>)` BEFORE any write.
3. **body has `project_id` but no `company_id`** → load the project (`db.query(Project).filter(Project.id == req.project_id).first()`, 404 if missing), then `get_company_membership(db, current_user, project.company_id)`.
4. **endpoint takes only an entity id** (`task_id`, `po_id`, `item_id`, etc.) → load the entity, resolve its owning company (directly via `entity.company_id`, or via `entity.project_id → Project.company_id`), then `get_company_membership(db, current_user, <resolved company_id>)` BEFORE mutating. Put the check right after the not-found check.

Model the exact style on the already-correct examples: `finance.delete_payment`, `finance.create_payment` (post-fix), and `verify_project_access` in auth.py.

## Rules
- The guard MUST run BEFORE any DB write / state change / commit in the handler.
- Do NOT change business logic, response shapes, or add/remove fields — only add the membership check (+ the `current_user`/`Depends` needed for it).
- Skip endpoints that are legitimately pre-auth / onboarding: in `auth.py`, `verify_otp`, `oauth_exchange`, and `create_company` (onboarding creates a NEW company for the caller) are NOT this bug — leave them.
- Skip endpoints already guarded (don't double-guard).
- If an endpoint's tenancy genuinely can't be resolved (no company/project link at all), flag it in the report rather than guessing.

## Verify (per router)
- `python -m py_compile backend/app/routers/<router>.py` and `python -c "import app.main"` from `backend/` → clean.
- Run any existing tests for that router if present.
- Report: every endpoint changed, the guard type applied (dependency vs imperative vs entity-resolve), and anything skipped with the reason.

Tenant-isolation regression tests will be added in a consolidated pass after the guards land (model on `backend/tests/coverage/test_finance_tenant_isolation.py`).
