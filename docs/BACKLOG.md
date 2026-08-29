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
| D-014 | HIGH | Part A HIGH findings not started: R2-749 (P&L misallocates 3 of 6 heads), R2-753 + R2-754 (date-only fields shift a day; holidays never reach payroll — must be fixed in that order), R2-756 (PF ECR emits `uan: "NOT_LINKED"`), R2-758 (report PDFs on ephemeral disk), R2-762 (subcon register prints literals), R2-764 (cost-code gate reached payments only) | Session ran out before these were reached. All were read as filed; none has been partially applied, so none is mis-recorded as closed. | R2-753 must precede R2-754 — a correct pipeline fed by dates stored a day early is worse than none. R2-764 is the "helper applied to some surfaces" class and needs the 4-write-path sweep. |
| D-015 | MEDIUM | Part A MEDIUM/LOW not started: R2-748, R2-752, R2-757, R2-759, R2-760, R2-761, R2-763 | Same as D-014. | R2-760 needs a void path per record type; route each through `delete_logs.log_deletion(...)` with `deleted_by` keyword-only (R2-536/R2-537), not a parallel audit path. |
| D-016 | MEDIUM | Part C observations not started: C2 (budget `labour_actual` needs a `finalized` filter), C3 (blank `OTP_DEMO_CODE` issues an empty OTP), C4 (report catalogue advertises 82 reports, 24 exist), C5 (three `except Exception -> 500` wrappers), C6 (IST vs UTC decision), C7 (stale report comment), C8 (dead `newIndentPhoto`), C10 (accept a client `captured_at`), C11 (verify R2-719) | Same as D-014. | C6 is a global decision, not a code fix — settle it once before touching any date handling. C9 (`Team {uuid[:8]}` fallback) is deliberately left as is: no name exists to print, and it shows an id rather than inventing one. |
| D-017 | HIGH | Pre-login index page performance (`frontend/src/app/page.tsx`) | The brief requires this in a separate session/thread, not interleaved with Parts A-E. Not started. | Hard constraint: the page must look and behave identically. Requires a production-build baseline (LCP/CLS/INP/TBT/bytes), before+after per change, and mobile + desktop screenshots proving every animation still runs. |
| D-018 | MEDIUM | Part E competitor parity (`docs/COMPETITOR_PARITY_ONSITE.md`) | Gated behind Parts A and B. A and B are now closed, so this is unblocked but not started. | Most structural gap: no pagination anywhere in the backend. Every list endpoint returns its full result set. |
| ~~D-019~~ **CLOSED 2026-08-29** | — | ~~`uq_bills_po_id` / `uq_equipment_company_id_code` may be skipped on production~~ **Resolved: nothing to purge.** Verified directly against production: `dup_groups` = **0**, `uq_equipment_company_id_code` is **PRESENT** and defined as `UNIQUE (company_id, code)`, the global `equipment_code_key` is **dropped**, and `bills.po_id` **exists**. The startup migration runner applied both migrations, found no violating rows, and created the constraint. No founder purge was needed and none was performed. | **Correction:** `uq_bills_po_id` never existed — `20260829_000002_bill_po_id.sql` is purely additive (one nullable column + one index, both `IF NOT EXISTS`) and cannot skip. That half of D-019 was a documentation error, not a real risk. | — |
