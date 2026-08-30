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
| D-017 | HIGH | Pre-login index page performance (`frontend/src/app/page.tsx`) | Scheduled for dedicated frontend performance pass. | Hard constraint: the page must look and behave identically. Requires a production-build baseline (LCP/CLS/INP/TBT/bytes), before+after per change, and mobile + desktop screenshots proving every animation still runs. |
| D-018 | MEDIUM | Part E competitor parity (`docs/COMPETITOR_PARITY_ONSITE.md`) | **CLOSED 2026-08-30 (Run 2 Batch 4)** | Tier 1 (Items 1-4), Tier 2 (Items 5-9), Tier 3 (Items 10-13), and Tier 4 (Items 14-17) completed, verified with 0 failures across 1,100 tests, and committed. |
| ~~D-019~~ **CLOSED 2026-08-29** | — | ~~`uq_bills_po_id` / `uq_equipment_company_id_code` may be skipped on production~~ **Resolved: nothing to purge.** Verified directly against production: `dup_groups` = **0**, `uq_equipment_company_id_code` is **PRESENT** and defined as `UNIQUE (company_id, code)`, the global `equipment_code_key` is **dropped**, and `bills.po_id` **exists**. The startup migration runner applied both migrations, found no violating rows, and created the constraint. No founder purge was needed and none was performed. | **Correction:** `uq_bills_po_id` never existed — `20260829_000002_bill_po_id.sql` is purely additive (one nullable column + one index, both `IF NOT EXISTS`) and cannot skip. That half of D-019 was a documentation error, not a real risk. | — |
| D-020 | MEDIUM | **R2-765** — chat unread watermark is a module-level in-memory dict (`chat.py:71`), so mark-as-read is lost on every restart, differs per worker, and never evicts | Found while verifying run 2's parity Tier 3 Item 13. The sibling half (task status logging) correctly uses a DB row; only the chat watermark is in memory. | Fix: add `ChatGroupMember.last_read_at` (nullable, additive migration), write it in mark-as-read, read it in list_groups, delete the dict. Gate: assert the watermark survives a new process. |
| D-021 | **HIGH — FOUNDER** | **GitHub Actions is billing-blocked**, so the `Apply Supabase Migrations` workflow and `Keep Alive Backend` never start. Run 33297710520: *"The job was not started because recent account payments have failed or your spending limit needs to be increased."* | Every migration since 2026-08-29 13:49 has therefore not been applied or tracked by CI. | Fix billing, then re-run the workflow (`workflow_dispatch`). Both pending migrations are idempotent, so a re-run is safe. |
| D-022 | **MEDIUM — FOUNDER** | **R2-759's data normalization has not run in production.** Verified 2026-08-30: `crm_leads` holds `medium` = 1 row and `Medium` = 1 row — the exact split the finding described. The `uan` COLUMN is present (added by the boot schema-sync), but neither new migration is recorded in `supabase_migrations` (53 tracked, neither listed). | The boot schema-sync adds missing COLUMNS; it does not run DATA statements, and `20260829_000004_crm_lead_priority_normalized.sql` is a pure `UPDATE`. Worse than before the fix: the new `^(low\|medium\|high)$` validator now 422s any attempt to edit the `Medium` lead. | Run the two-line UPDATE from that migration against production (idempotent), or let CI do it once D-021 is fixed. |
