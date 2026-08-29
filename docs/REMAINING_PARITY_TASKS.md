# Remaining Parity Tasks

> ## ⚠ STALE IN THREE PLACES — corrected 2026-08-29 (Round 3 verification)
>
> This file predates the audit fixes and **three of its statements about `log_deletion` are now wrong.**
> Following it as written would undo work the audit landed:
>
> | This file says | Current truth | Landed by |
> |---|---|---|
> | `log_deletion` is "non-blocking (never raises into caller), wrapped in try/except" | It **queues the audit row on the caller's session** so the log and the deletion commit together, all-or-nothing. The redundant `try/except: pass` was **removed at every call site** | R2-537 |
> | `deleted_by` is a positional parameter | `deleted_by` is **keyword-only and required** (`*, deleted_by: str`) — omitting it is a `TypeError`, not a silent `None`. Verified by AST scan: 32 call sites, zero missing | R2-536 |
> | Router registered at prefix `/apis/v3` | Registered at **`/apis/v3/delete-logs`** (`main.py:680`), with a catch-all 404 for unmatched `/apis/v3/*` paths | R2-291 |
>
> **So the closing instruction below — "add a `log_deletion(...)` call (try/except, non-blocking)" — is
> exactly backwards. Do not wrap it. Let it raise.**
>
> The "Skipped (no DELETE endpoint exists)" list below is superseded by finding **R2-760**, which
> counted the current state properly: three record types now have a void path (bill, work order,
> purchase order) and sixteen routers still have no delete or cancel at all.
>
> **Authoritative source for all outstanding work: [`REMEDIATION_MASTER_PLAN.md`](./REMEDIATION_MASTER_PLAN.md).**
> Competitor parity specifically: [`COMPETITOR_PARITY_ONSITE.md`](./COMPETITOR_PARITY_ONSITE.md).
> This file is retained for its record of what was built, not as a source of instructions.


Tracking of competitor-parity modules still to be built or extended for SiteFlow.

## Built / Implemented
- **Delete Logs** (audit trail of deleted records) — COMPETED.
  - Backend `DeleteLog` model in `backend/app/models.py` (`delete_logs` table).
  - Router `backend/app/routers/delete_logs.py` registered at `app.include_router(delete_logs.router, prefix="/apis/v3")`.
    - `GET /apis/v3/{company_id}` — list with `?entity_type=&party=&from_date=&to_date=` filters.
    - `DELETE /apis/v3/{company_id}/{log_id}` — purge a single log entry.
  - `log_deletion(db, company_id, entity_type, entity_id, summary, party_name, deleted_by)` helper: non-blocking (never raises into caller), wrapped in try/except.
  - Wired delete-logging hooks into existing DELETE endpoints:
    - `planning.py` → `DELETE /tasks/todos/{todo_id}` (logs entity_type `task`).
    - `library.py` → `DELETE /materials/{item_id}` (entity_type `material`) and `DELETE /parties/{party_id}` (entity_type `party`, populates `party_name`).
  - Frontend: `frontend/src/app/c/[company_id]/d/delete-logs/page.tsx` (filters, table, per-row Purge).
  - Nav: existing sidebar "Delete Logs" placeholder repointed to `/c/{company_id}/d/delete-logs`.

## Skipped (no clean DELETE endpoint exists in this codebase)
The following routers named in the spec have **no deletion endpoint** at all, so no logging hook was added:
- `crm.py` — leads are updated via PUT only (no DELETE lead route).
- `finance.py` — payments / payment-requests have no DELETE route.
- `hr.py` — timesheets are patched (submit/approve), no DELETE route.
- `subcon_performance.py` / `subcon_attendance.py` — no workorder DELETE route.
> When DELETE endpoints are later added for project / task / lead / workorder / payment / timesheet, add a `log_deletion(...)` call (try/except, non-blocking) before the `db.delete(...)` to populate the audit trail.

## Not Yet Built (future)
- **Schedule / Gantt planning board** — dedicated planning module.
- Expand delete-log capture to additional entity types as more DELETE endpoints land.
