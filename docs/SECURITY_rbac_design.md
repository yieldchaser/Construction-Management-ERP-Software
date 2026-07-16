# RBAC (role-based access control) — design + phased build spec

## Goal
Right now every company member can do every action within their own company (cross-tenant isolation is already enforced, but not *intra*-company roles). We want: an admin defines roles with permissions, assigns members to roles, and the backend enforces + the frontend hides what a member can't do. The scaffolding already exists — this spec completes it.

## What already exists (do NOT rebuild — extend)
- `CompanyRole` model: `id, company_id, role_name, permissions (JSONB), created_at`. Onboarding creates an "Owner" role with `permissions={"all": True}` and assigns the founder (`CompanyTeam.role_id`, `priority_type="partner"`).
- `CompanyTeam`: `role_id` (FK → CompanyRole, nullable), `priority_type` (default "employee"; owners are "partner").
- `settings.py`: `GET /roles/{company_id}`, `POST /roles/{company_id}` (creates a role with `permissions={}` — empty!), `POST /roles/seed/{company_id}` (seeds 8 `DEFAULT_ROLES` = Admin, Client, Accountant, Sub Contractor, Associate HR, Project partner, Site Engineer, Manager — all with empty permissions).
- `auth.get_me` returns `{role_id, role, priority_type}` but NOT the permission set.
- Frontend `settings/page.tsx` has a Roles section (assign roles to members).

The gap: permissions are always `{}` (nothing granted, nothing checked). We define a taxonomy, presets, enforcement, and a frontend editor.

---

## Design decisions (the model)

### Permission taxonomy — flat `module:action` boolean keys
`CompanyRole.permissions` becomes a flat dict of boolean keys, plus a superuser flag:
```json
{ "all": true }                      // superuser (Owner/Admin) — bypasses every check
```
or, for a scoped role:
```json
{ "finance:view": true, "finance:edit": true, "finance:approve": false, "settings:manage": false, ... }
```

**Modules** (align to the app's functional areas / sidebar): `dashboard, projects, finance, billing, procurement, budgeting, payroll, attendance, crm, library, production, quality, safety, drawings, equipment, reports, planning, subcontractor`.
**Actions per module:** `view` (read), `edit` (create/update). 
**Workflow modules also support** `approve` (finance, billing, procurement, budgeting, payroll, subcontractor).
**Delete** is gated by a single per-module `edit` for simplicity in v1 EXCEPT high-value deletes — see "global capabilities".
**Global capability keys** (cross-cutting, high-risk): `settings:manage` (company config, roles, approval rules, branches), `team:manage` (add/remove members, assign roles), `payroll:run`, `data:delete` (destructive deletes across modules).

Define this taxonomy ONCE in a new module `backend/app/permissions.py`:
- `MODULES` list, `ACTIONS` per module, and a canonical `ALL_PERMISSION_KEYS` set (used to validate incoming permission dicts and to render the frontend editor).
- Helper `has_permission(perms: dict, key: str) -> bool`: returns `True` if `perms.get("all") is True or perms.get(key) is True`.

### Default-role presets (fill the 8 empty DEFAULT_ROLES + Owner)
Concrete preset per role (a role "has" a key = that key is `true`; everything else `false`). Keep it sensible for a construction ERP:

| Role | Preset |
|---|---|
| **Owner** | `{"all": true}` (created at onboarding; never editable to less than all) |
| **Admin** | `{"all": true}` |
| **Manager** | `view+edit+approve` on all operational modules (projects, finance, billing, procurement, budgeting, crm, production, quality, safety, drawings, equipment, reports, planning, subcontractor, attendance); `view+edit` on library; `view` on payroll; `team:manage` yes; `settings:manage` NO; `payroll:run` NO; `data:delete` NO |
| **Accountant** | finance/billing/budgeting `view+edit+approve`; reports `view`; procurement `view`; everything else `view`; no settings/team/payroll-run/delete |
| **Site Engineer** | projects/production/quality/safety/drawings/attendance/planning/procurement(indent) `view+edit`; dashboard/reports `view`; finance/billing/budgeting/payroll `view` only (NO approve/edit); no settings/team/payroll-run/delete |
| **Associate HR** | payroll/attendance `view+edit`; `payroll:run` yes; others `view`; no finance-approve/settings/delete |
| **Project partner** | like Manager but `settings:manage` NO and `team:manage` NO (broad operational, not admin) |
| **Client** | `view` only on projects, reports, billing (external stakeholder); nothing else |
| **Sub Contractor** | `view` on subcontractor + drawings + projects; nothing else |

Encode these presets as a `DEFAULT_ROLE_PRESETS: dict[str, dict]` in `permissions.py`. (Adjust wording to the exact module keys.)

### Enforcement approach (backend)
- New dependency/​helper in `app/auth.py` (or `permissions.py`): `require_permission(db, user, company_id, permission_key)` → loads the user's `CompanyTeam` for `company_id` (reuse `get_company_membership`, which already 403s non-members), reads its `role_id → CompanyRole.permissions`, and 403s unless `has_permission(perms, permission_key)`.
- **Owner/partner failsafe:** if the membership's `priority_type == "partner"` OR the role has `all: true`, allow (owners/partners always pass). This prevents lockout.
- **Un-migrated failsafe:** if the member has NO role_id, OR the role's permissions dict is empty `{}` (un-migrated), ALLOW (fail-open) — we only start denying once a role has real permissions. This guarantees existing tenants keep working until an admin actually configures roles. (After the Phase-1 backfill assigns presets, this rarely triggers.)
- Because every write endpoint already resolves `company_id` for the tenant guard, enforcement slots in right after it: `require_permission(db, current_user, <company_id>, "finance:approve")`.

### Rollout safety
Enforce the HIGH-RISK actions first (Phase 2a) — `approve`, `payroll:run`, `settings:manage`, `team:manage`, `data:delete` — because a misconfigured role there is safer than blocking everyday create/view. Broaden to module `edit`/`view` gating later (Phase 2b) only after the frontend editor (Phase 3) lets admins configure roles. Never enforce in a way that can lock out an Owner/partner.

---

## PHASE 1 — backend foundation (NO endpoint enforcement yet). BUILD THIS FIRST.
1. Create `backend/app/permissions.py`: `MODULES`, `ACTIONS`, `ALL_PERMISSION_KEYS`, `DEFAULT_ROLE_PRESETS`, `has_permission(perms, key)`.
2. Update role creation/seed so roles get real presets: `POST /roles/seed/{company_id}` seeds the 8 default roles WITH their preset permissions (not `{}`). Keep `POST /roles/{company_id}` (custom role) but let it accept an optional `permissions` dict (validated against `ALL_PERMISSION_KEYS`); default a new custom role to all-`view`.
3. Add `PUT /roles/{role_id}/permissions` (settings.py) — body = a permissions dict; validate keys against `ALL_PERMISSION_KEYS`; reject editing an Owner role below `all:true`; guarded by `verify_company_access` (path resolves company via the role). Also allow renaming/deleting non-default custom roles (if not already present).
4. `auth.get_me` (and the login context): also return the caller's effective `permissions` dict (resolved role permissions, or `{"all": true}` for partners) so the frontend can gate UI. Add a small `GET /me/permissions` if cleaner.
5. **Backfill (idempotent), exposed as a secret-gated admin route** like the existing `POST /admin/migrations/...` pattern (X-Admin-Secret): for every existing company — (a) ensure the 8 default roles exist and SET their permissions to the presets (overwrite empty `{}` only; don't clobber an admin's customizations — i.e. only fill roles whose permissions are empty); (b) for every `CompanyTeam` with `role_id IS NULL`: assign a role by `priority_type` — `partner` → Owner/Admin (all), else → "Manager" (broad, so existing employees keep working). Report counts.
6. Do NOT add `require_permission` to any endpoint yet.

**Verify Phase 1:** seed/backfill runs idempotently; a seeded role's permissions match its preset; `get_me` returns a permissions dict; existing members all have a role; nothing is enforced yet so no behavior changes for current users. `python -c "import app.main"` clean; coverage suite green.

## PHASE 2 — backend enforcement (after Phase 1 verified)
2a. Apply `require_permission(...)` to HIGH-RISK endpoints only: all `approve_*`/`reject_*` (finance, procurement PO/indent, billing, payment-request approve), `run_payroll` (`payroll:run`), settings mutations (`settings:manage` — roles, approval rules, branches, company config), team add/remove/role-assign (`team:manage`), and destructive deletes (`data:delete`). Use the failsafes (partner/all bypass, empty-perms fail-open). 
2b. (Optional, later) broaden to module `edit` gating on create/update endpoints once the frontend editor exists.
Add regression tests (model on `tests/coverage/test_router_tenant_isolation.py`): a member whose role LACKS `finance:approve` gets 403 on approve; an Owner/partner passes; a member with the permission passes.

**Verify Phase 2:** new tests pass; coverage suite green; manual sanity that an Owner is never blocked.

## PHASE 3 — frontend (after Phase 2 verified)
- Settings → Roles: a permission-matrix editor (modules × actions checkboxes) that reads `ALL_PERMISSION_KEYS` and PUTs to `/roles/{role_id}/permissions`. Show the 8 default roles + custom roles; Owner/Admin shown as "full access" (locked).
- Settings → Team: assign a role to each member (may partially exist — extend).
- UI gating: use the caller's `permissions` from `get_me` to hide/disable sidebar modules and action buttons (approve/delete/run-payroll/settings) the user lacks. Fail-open on missing data (don't hide everything if perms fail to load).

**Verify Phase 3:** as an Owner, all visible; create a limited role (e.g. Site Engineer), assign a test member, confirm (in a fresh session) the restricted actions are hidden AND the backend 403s if forced. Both light/dark.

---

## Global rules for all phases
- Owner/partner must NEVER be lockable out.
- Fail-open where data is missing/un-migrated (empty perms, null role) — deny only when a real permission set explicitly withholds the key.
- Zero change to cross-tenant tenant guards already in place — RBAC is an ADDITIONAL layer on top of membership, not a replacement.
- Validate any incoming permissions dict against `ALL_PERMISSION_KEYS` (reject unknown keys) to prevent typo-perms that silently never match.
- Each phase: `python -c "import app.main"` clean + `pytest tests/coverage/ -q` green before it's considered done.

Run PHASE 1 first, report, and stop for verification before Phase 2.
