# Prompt 9 — Domain/formula-decision fixes (Theme E from bug-sweep backlog, 7 items)

## Context
Repo: `C:\Users\Dell\Github\Construction-Management-ERP-Software`. **I (the orchestrator) independently re-read the actual current code for all 7 items before writing this prompt** — most match the backlog description, but **E4 is WORSE than the backlog described** (a real runtime crash, not just an omission — see below). Do all 7; they're independent and touch different files.

---

## E1 — Billing default computes TDS/Retention on GST-inclusive gross
**File:** `backend/app/routers/billing.py`, `create_bill` (~line 517-532) + `_sequential_deduction_calc` (~line 187).
**Verified:** when `req.pre_tax_deductions` is `False` (the default), GST is computed on `subtotal` first (`gst_amount = subtotal * gst_pct/100`), then deductions (TDS, Retention, etc.) are calculated against `gross_total = subtotal + gst_amount` — i.e. against a GST-INCLUSIVE amount. Indian TDS under the Income Tax Act is levied on the value of work/services (GST-exclusive base), not on the GST component itself. So the current default over-deducts TDS by effectively also taxing the GST portion.

**Fix:** this is a genuine domain-correctness question, not a pure bug — do NOT silently change default behavior for existing bills/reports. Instead:
1. In `_sequential_deduction_calc`'s docstring/logic, keep the existing `pretax_order` parameter's meaning intact (it governs Retention-vs-TDS ORDER, a separate concern from GST-inclusive-vs-exclusive BASE).
2. Add the real domain fix: when NOT `req.pre_tax_deductions`, compute deductions against `req.subtotal` (GST-exclusive) instead of `gross_total`, then still add GST on top for the final `total_payable`. Concretely: `deduction_details, ded_amt = _sequential_deduction_calc(req.deductions, req.subtotal, pretax_order)` (note: `req.subtotal`, not `gross_total`), then `total_payable = req.subtotal - ded_amt + gst_amount` (GST added back after, not before, deduction). This makes TDS/Retention always compute on the GST-exclusive work value regardless of the `pre_tax_deductions` flag — the flag should now only control whether GST itself is shown/settled before or after deductions in the invoice presentation, not whether deductions include GST in their base.
3. Re-derive `gst_amount` and `total_payable` for BOTH branches (`pre_tax_deductions=True` and `False`) so they're now mathematically consistent (same deduction base in both cases, only presentation/order differs). Read both branches fully before changing anything — do not break the `pre_tax_deductions=True` branch, which already correctly uses `req.subtotal` as the deduction base.
4. This changes bill math going forward — do NOT touch already-created `Bill` rows. Flag this clearly in your report as a forward-looking correctness fix, not a data migration.

## E2 — Payroll `days_present` never adds approved-leave days
**File:** `backend/app/routers/hr.py`, `run_payroll` (~line 594-660).
**Verified:** `att_count` sums only `AttendanceLog` rows with `status in ("Present", "Present (Off-Site)")`. Approved leave (`LeaveRequest` with `status == "Approved"`) is never added. An employee on 6 approved paid-leave days with 20 real punches gets `days_present = 20`, undercounting by the leave days if leave is meant to be paid.

**Fix:** before computing `days_present` for each employee, also query approved `LeaveRequest` rows for that employee within `[month_start, month_end)` (match by `employee_name` case-insensitively against `emp.name`, mirroring the exact matching pattern already used in `get_leave_balances` — see E3 below, same file, for the existing convention) and sum `days_count` for leave types that are meant to be PAID (check `LeaveTemplate`/company settings for a "paid leave type" concept — if `LeaveRequest.leave_type` distinguishes paid vs unpaid leave, only add paid ones; if there's no such distinction in the schema, treat casual/sick/earned as paid by default since those are the templated types, and flag any other leave_type value as needing a founder decision in your report rather than guessing). Add this `approved_leave_days` figure to `att_count` before the `days_present = float(att_count) if att_count > 0 else default_days` line, i.e. `days_present = float(att_count + approved_leave_days) if (att_count + approved_leave_days) > 0 else default_days`.

## E3 — Leave balance matched by employee name, not FK (collision + fragility risk)
**File:** `backend/app/routers/hr.py`, `get_leave_balances` (~line 1246-1360).
**Verified:** `approved` query groups by `func.lower(LeaveRequest.employee_name)` and matches against `emp.name.lower()` at line 1333 (`used = used_map.get(emp.name.lower(), {})`). `LeaveRequest` has no FK to `StaffEmployee` at all — confirmed by reading the model. Two employees sharing a name in the same company would have their leave usage merged/collide.

**Fix (real schema change):**
1. Add `employee_id = Column(UUID(as_uuid=True), ForeignKey("staff_employees.id", ondelete="SET NULL"), nullable=True)` to `LeaveRequest` in `models.py` (nullable so existing rows aren't broken; new rows should populate it).
2. Additive migration (`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES staff_employees(id) ON DELETE SET NULL;`) — created, NOT applied to Supabase, flagged in report per standing convention.
3. In `create_leave_request` (find the endpoint that creates `LeaveRequest` rows — check both the `/leaves/{company_id}` POST and anywhere else `LeaveRequest(...)` is constructed), populate `employee_id` when the caller can resolve one — check what identifies the employee in the request body today (likely just `employee_name` as free text) and add an optional `employee_id` field to the request schema so the frontend can pass it once available; if the frontend doesn't have an employee-picker for this form yet, keep `employee_name` as the fallback text field (do not break existing callers) but prefer `employee_id` when present.
4. In `get_leave_balances`, change the matching: prefer joining/filtering `LeaveRequest.employee_id == emp.id` when populated; only fall back to the existing name-matching for legacy rows where `employee_id IS NULL`. This makes old data still work while new data is collision-proof.
5. Do NOT attempt to backfill `employee_id` on existing rows via fuzzy name-matching in this prompt — that's a separate, riskier data-migration task; leave existing rows with `employee_id = NULL` and explicitly note this in your report.

## E4 — BI export budget-variance feed references a `Bill.category` column THAT DOES NOT EXIST (real crash, worse than originally described)
**File:** `backend/app/routers/bi_export.py`, `feed_budget_variance` (~line 235-280).
**Verified (I ran this myself, not just read it):** `models.Bill` has NO `category` column at all — confirmed via `python -c "from app.models import Bill; print([c.name for c in Bill.__table__.columns])"`, which lists `id, company_id, project_id, party_company_user_id, invoice_number, invoice_date, due_date, invoice_type, status, subtotal, gst_amount, total_payable, paid_amount, approval_flag, is_milestone_fixed_amount, tally_synced, boq_document_id, items_json, payment_mode, payment_bank_name, payment_ref, ship_to, terms, created_at, updated_at` — no `category` anywhere. But `feed_budget_variance` filters `models.Bill.category == "material"` and `models.Bill.category == "subcon"` (lines 256, 262). **This means every single call to this BI feed endpoint currently raises an `AttributeError`/`InvalidRequestError` at query-build time — HTTP 500, always, not just "omits labour/equipment actuals" as previously described.** This is the real, more severe bug: the feed is 100% broken right now, not partially inaccurate.

**Fix:**
1. `Bill` already has `invoice_type` (`"sale"`, `"purchase"`, `"subcon"`) — this is almost certainly what the code MEANT to filter on. Replace `models.Bill.category == "material"` with `models.Bill.invoice_type == "purchase"` (material bills are invoice_type=purchase per the convention used everywhere else in this codebase, e.g. `finance.py`'s P&L calc at `material_actual = ... Bill.invoice_type == "purchase"`), and replace `models.Bill.category == "subcon"` with `models.Bill.invoice_type == "subcon"` (already correct semantically, just wrong column name).
2. Additionally implement the ALREADY-known gap from the original backlog note: `total_actual` only sums material+subcon Bill amounts, but `total_budget` includes labour_budget+equipment_budget too, so labour/equipment overruns are invisible in the variance. Real labour/equipment actuals come from payroll (`PayrollLineItem.net_payable` summed by project, same pattern as `finance.py`'s `get_project_pl`) and equipment (`EquipmentDeployment` hourly cost + `FuelLog.total_cost`, same pattern as `finance.py`'s `get_project_pl` lines ~361-374) — NOT from `Bill` at all. Add `labour_actual` and `equipment_actual` computed the exact same way `finance.py::get_project_pl` does it (reuse/mirror that logic, don't reinvent), and include them in `total_actual` and as their own columns in the feed response (`labour_actual`, `equipment_actual` alongside the existing `material_actual`, `subcon_actual`).
3. Verify the fix by actually calling the endpoint (not just reading code) — this is critical since the current bug is a silent-until-called crash that no test caught.

## E5 — Analytics `completed_area` falls back to counting ALL BOQ area when nothing is completed
**File:** `backend/app/routers/analytics.py` (~line 308-320).
**Verified:** if no completed tasks have a linked BOQ item, `completed_area` falls back to `sum(boq.quantity for boq in boq_items if unit in AREA_UNITS)` — i.e., 100% of the project's total area BOQ quantity, even though ZERO work is actually complete. `labour_productivity = completed_area / labour_days` is then wildly inflated (implies full-project completion with whatever labour was logged).

**Fix:** remove the fallback entirely — when no completed-task-linked BOQ area exists, `completed_area` should be `0.0`, and `labour_productivity` should correctly compute to `0.0` (or be omitted/null if the frontend has a "not enough data" display convention — check how `labour_productivity=0` renders in `frontend/src/app/c/[company_id]/d/analytics/page.tsx` or wherever this feed is consumed, and use whatever the existing empty/zero convention is for this metric).

## E6 — Analytics subcontractor "on-time" check treats null due_date as always on-time
**File:** `backend/app/routers/analytics.py` (~line 335-340).
**Verified:** `on_time_bills` counts a bill as on-time if `bill.due_date is None OR bill.updated_at <= bill.due_date`. Both `due_date` and `updated_at` are `DateTime` columns (confirmed via model inspection — this is NOT a type-mismatch bug as sometimes assumed, just a semantics question). The real issue: `updated_at` is a generic "last modified" timestamp (auto-updates on ANY field change, e.g. `tally_synced` flip, not specifically "date paid") — using it as a proxy for "payment date" is imprecise. Also treating `due_date IS NULL` as unconditionally on-time may inflate the score for bills that never had a due date set at all.

**Fix:** Bill doesn't track a dedicated "paid_at"/"settled_at" timestamp. Rather than inventing a new column for this (out of scope for this prompt), use the more defensible existing signal: a bill is "on-time" if its `status == "Paid"` AND (`due_date is None` OR the bill's `updated_at <= due_date`) — i.e., only count PAID bills toward the on-time metric at all (unpaid/partially-paid bills shouldn't count as "on time" just because they haven't hit their due date yet — that's "not yet late", not "on time"). Also make the null-due_date case NOT automatically count as on-time — instead, exclude bills with no due_date from the on-time denominator entirely (can't judge on-time-ness without a due date), rather than assuming they're fine. Recompute the on-time percentage using only in-scope bills (paid, with a due_date) as the denominator, and clearly document this in the response/report as the definition used.

## E7 — Tally voucher sequence number restarts on every export/pending call, colliding across partial syncs
**File:** `backend/app/routers/tally.py`, `_build_vouchers` (~line 172-190) — `seq = 1` at the top of the function, incremented per bill/payment processed (lines 250, 294).
**Verified:** `seq` is a purely local counter, reset to `1` every time `_build_vouchers` is called (from both `/pending` and `/export`, each independent HTTP call). If a company exports 3 unsynced bills (getting voucher numbers 1-3), marks 2 as synced via `/mark-synced`, then 2 NEW bills arrive — the next `/export` call reuses voucher numbers 1 and 2 for the NEW bills, colliding with the previously-synced vouchers 1-2 already imported into Tally.

**Fix:** the voucher number needs to be a durable, monotonically-increasing counter PER COMPANY, not a per-call local variable. Add a counter column to `TallyConnection` (the per-company connection settings model — check its exact fields in `models.py` first) e.g. `last_voucher_seq = Column(Integer, default=0, nullable=False)`, additive migration (created, NOT applied to Supabase, flagged in report). In `_build_vouchers`, instead of `seq = 1`, read `conn.last_voucher_seq` as the starting point (`seq = conn.last_voucher_seq + 1`), and after building all vouchers for a call, persist the new high-water mark back onto `conn.last_voucher_seq` — but ONLY do this in the `/export` path (the actual file-generating call), NOT in `/pending` (which is just a preview/count and must NOT consume sequence numbers, since a user might call `/pending` many times without ever exporting). Read both `/pending` (line ~489) and `/export` (line ~523) call sites carefully to make sure only `/export` advances and commits the counter. If `/pending` and `/export` need genuinely different sequence behavior (preview shouldn't mutate state), consider passing a flag into `_build_vouchers(..., advance_sequence: bool = False)` so the preview path can still render numbers (starting from `conn.last_voucher_seq + 1`, read-only) without committing the increment, while `/export` passes `advance_sequence=True` and commits.

---

## Rules
- Zero fabrication; if a design choice is genuinely ambiguous (E1's forward-only fix, E2's paid-leave-type detection, E6's on-time definition), make the documented, conservative choice specified above rather than guessing differently — flag your reasoning in the report.
- Schema changes (E3, E7) get additive migrations, created but NOT applied to Supabase — flag explicitly in the report, same discipline as prior prompts.
- Do not touch historical data (E1, E3) — these are forward-looking correctness fixes only.
- E4 is the highest-priority item in this batch since it's a currently-crashing endpoint — verify the fix by actually calling it, not just reading the diff.

## Verify
- `python -m py_compile` on every touched file (`billing.py`, `hr.py`, `bi_export.py`, `analytics.py`, `tally.py`, `models.py`); `python -c "import app.main"` clean.
- Full existing `backend/tests/coverage` suite still green (currently 121 passing — confirm no regressions).
- New regression tests per item:
  - E1: a bill with GST + a TDS deduction, confirm TDS is computed against the GST-exclusive subtotal in BOTH the pre_tax_deductions=True and False paths, with total_payable still correct.
  - E2: an employee with real attendance + an approved leave request in the same month, confirm `days_present` includes both.
  - E3: two employees with the same name, confirm their leave usage no longer merges once `employee_id` is populated (test both the new FK path and the legacy name-fallback path).
  - E4: call `/apis/v3/bi/feed/{company_id}/budget-variance` end-to-end (not just unit-test the function) with real material/subcon bills + a payroll run + an equipment deployment, confirm it returns 200 (not 500) and includes correct labour_actual/equipment_actual.
  - E5: a project with zero completed tasks, confirm `completed_area` is `0.0`, not the full BOQ area sum.
  - E6: a mix of paid/unpaid bills with and without due_date, confirm the on-time percentage only considers paid bills with a real due_date.
  - E7: simulate export→mark-synced→export again with new bills, confirm voucher numbers never repeat across the two exports; confirm calling `/pending` repeatedly does NOT advance the sequence.

## Report back (for me to verify before I commit/push)
- Per item (E1-E7): exact diff summary, and for any ambiguous design choice, your reasoning per the "Rules" section above.
- E3 and E7: migration file paths, explicitly NOT applied to Supabase.
- E4: explicit confirmation you called the endpoint live (not just unit-tested) and it no longer 500s.
- Full test results (before/after counts).
- Do NOT commit or push yourself — leave everything in the working tree for me to review and push.
