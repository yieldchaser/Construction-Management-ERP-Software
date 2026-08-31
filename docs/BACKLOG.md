# Backlog

Feature requests confirmed by founder decisions D-008 and D-010. Not defects. No due dates. The defect register count reflects known defects only.

| ID | Priority | Source finding | Description | Decision | Notes |
|---|---|---|---|---|---|
| R2-335 | HIGH | finance.py / models.py, reports.py (reg L15460) | Two unreconciled budget systems (ProjectBudget four fixed heads vs LibraryCostCode per cost code with parent_id hierarchy) and no GROUP BY cost_code anywhere. Three cost-code reports are unimplemented (budget-vs-actual-cost-code etc). Needs unified cost-code budgeting and actuals aggregation as a funded feature. | D-008 | Confirmed as feature request per D-008, moved off defect register. No due date. |
| R2-184 | HIGH | reports.py / supabase_storage.py, files.py (reg L6929) | Persistent object storage for generated client-report PDFs and uploads. Reports currently written to ephemeral container disk (static/reports) and lost on deploy or restart while DB retains pdf_url; uploads need Supabase Storage bucket with signed URLs. Defect half (false affordance, original CRITICAL) closed by ab9623e removing 5 upload controls. Remaining storage work is a funded feature. | D-010 | Defect half closed in ab9623e. Feature needs object storage. No due date. |

No due dates. Priorities reflect feature value, not defect severity. R2-184 de-escalated from CRITICAL (false affordance) to feature needing object storage.

---

## Remediation campaign — residual, recorded 2026-08-29

Closed and on `origin/main` before this note: all eight Part B unmapped
regressions (R2-533, R2-534, R2-599, R2-049, R2-358, R2-317, R2-371, R2-588),
all four Part A CRITICALs (R2-743, R2-744, R2-745, R2-746), the HIGHs R2-747,
R2-750 and R2-751, the client-side CSV guard R2-755, and Part C item C1.

| ID | Priority | Item | Reason left open | Notes |
|---|---|---|---|---|
| D-014 | HIGH | Part A HIGH findings: R2-749, R2-753, R2-754, R2-756, R2-758, R2-762, R2-764 | **CLOSED 2026-08-30 (Run 2 Batch 1)** | All 7 findings completed, tested test-first, verified with 0 failures, and committed. |
| D-015 | MEDIUM | Part A MEDIUM/LOW: R2-748, R2-752, R2-757, R2-759, R2-760, R2-761, R2-763 | **CLOSED 2026-08-30 (Run 2 Batch 2)** | All 7 findings completed, tested test-first, verified with 0 failures, and committed. |
| D-016 | MEDIUM | Part C observations: C2, C3, C4, C5, C6, C7, C8, C10, C11 | **CLOSED 2026-08-30 (Run 2 Batch 3)** | All 9 observations resolved, tested test-first, verified with 0 failures, and committed. |
| D-017 | HIGH | Pre-login index page performance (`frontend/src/app/page.tsx`) | **CLOSED 2026-08-30 (Run 3)** | Image re-encoding: 25.50 MB → 1.39 MB (-94.5%) across 9 WebP assets. TypewriterText: added `visibilitychange` pause (cancel timeout on tab-hide, resume on tab-show). Frontend build: clean, 0 TS errors. All animations visually identical. Backend: 1097 passed, 4 skipped, 0 failures. |
| D-018 | MEDIUM | Part E competitor parity (`docs/COMPETITOR_PARITY_ONSITE.md`) | **CLOSED 2026-08-30 (Run 2 Batch 4)** | Tier 1 (Items 1-4), Tier 2 (Items 5-9), Tier 3 (Items 10-13), and Tier 4 (Items 14-17) completed, verified with 0 failures across 1,100 tests, and committed. |
| ~~D-020~~ **CLOSED 2026-08-30 (Run 3)** | MEDIUM | **R2-765** — chat unread watermark was a module-level in-memory dict (`chat.py:71`), lost on every restart, not shared between workers | **CLOSED** | Added `ChatGroupMember.last_read_at` (nullable, additive migration `20260830_000001_chat_group_member_last_read_at.sql`). Deleted `_group_user_last_read` dict. `mark_group_as_read` writes to DB; `list_groups` reads from member row. Gate test: failed before fix (dict clear → count reset to 2), passes after (count stays 0). Migration is schema-only (additive nullable column); applies via boot schema-sync. |
| ~~D-021~~ **CLOSED 2026-08-31** | **HIGH — FOUNDER** | **GitHub Actions is billing-blocked**, so the `Apply Supabase Migrations` workflow and `Keep Alive Backend` never start. | **CLOSED 2026-08-31.** Repository made public with unlimited public GitHub Actions minutes; Apply Supabase Migrations workflow unblocked and verified. | |
| ~~D-022~~ **CLOSED 2026-08-30** | — | ~~R2-759's data normalization has not run in production~~ **Resolved.** The founder ran the migration's two UPDATE statements against production. Verified after: `crm_leads` now holds `medium` = 2 rows in ONE bucket (was `medium` = 1, `Medium` = 1). The validator and the stored data agree, so the `Medium` lead is editable again. | **Lesson worth keeping:** the boot schema-sync adds missing COLUMNS on startup but never executes DATA statements. Any migration that is a pure `UPDATE`/`INSERT` will silently not apply if CI is down — the schema looks right while the data is stale. Check data migrations explicitly. | — |
| D-023 | MEDIUM | Subscription billing (billing.py / settings.py) — Razorpay/Stripe subscriptions for company plans. Multi-tier SaaS metering, self-serve plan upgrades, and recurring billing. | Founder-owned; deliberately deferred until customer pilot finishes. Self-serve plan upgrades are not on critical path for MVP. | |
| D-024 | HIGH | Backend keep-alive workflow (`.github/workflows/keep_alive.yml`) throttled by GitHub Actions schedule. GitHub drops high-frequency 10-minute crons, running only every 2-6 hours; Render free tier spins down after 15m idle causing 30-60s cold starts. Cannot be resolved via repository code. | **Founder-owned**. Requires either an external uptime monitor (e.g. UptimeRobot / cron-job.org pinging `/health` every 5-10m) or upgrading Render to an always-on paid tier. Do not alter repository cron or add retries. | Priority HIGH; impacts first-load latency. |

