# Prompt 8 — Finance/ledger integrity fixes (Theme C from bug-sweep backlog, 5 items)

## Context
Repo: `C:\Users\Dell\Github\Construction-Management-ERP-Software`. All 5 items live in `backend/app/routers/finance.py`. **I (the orchestrator) independently re-read the actual current code for all 5 before writing this prompt** — all confirmed present and unfixed. Do all 5 (independent, but C1 and C4 touch the same settlement math so read both before touching either).

Relevant models (for reference, do not need to change unless noted): `Payment` (models.py ~1144: `id, company_id, project_id, party_company_user_id, payment_type, amount, unsettled_amount, payment_method, ...`), `PaymentSettlement` (models.py ~1167: `id, payment_id, bill_id, settled_amount` — FK `payment_id` has `ondelete="CASCADE"` from `payments.id`), `Bill` (models.py ~573: `..., status, subtotal, total_payable, paid_amount, ...`).

---

## C1 — `delete_payment` doesn't reverse settlements or bill state (HIGH, real money-correctness bug)
**Verified:** `finance.py:169-184`. `delete_payment` deletes the `Payment` row directly. Because `PaymentSettlement.payment_id` has `ondelete="CASCADE"`, the DB cascade-deletes the `PaymentSettlement` rows automatically — but the linked `Bill.paid_amount` (which was incremented when the payment was created/settled, see `create_payment` lines 144-152) is NEVER decremented, and `Bill.status` is NEVER recomputed. The bill silently keeps showing itself as (fully or partially) paid even though the payment that paid it no longer exists.

**Fix:** before deleting the payment, find all `PaymentSettlement` rows for `payment_id`, and for each one: load its `Bill`, subtract `settlement.settled_amount` from `bill.paid_amount` (floor at 0, i.e. `max(0.0, ...)` — defensive against any prior float drift), and recompute `bill.status`:
- `paid_amount <= 0` → `"Unpaid"`
- `0 < paid_amount < total_payable` → `"Partially Paid"`
- `paid_amount >= total_payable` → `"Paid"` (this branch should be rare after a reversal, but handle it for completeness, e.g. if a bill had multiple settling payments and only one is deleted)
Do the settlement lookup and bill updates BEFORE `db.delete(payment)` (SQLAlchemy will still cascade-delete the settlement rows at commit; you don't need to delete them manually, just read them first to know what to reverse). Model the update pattern on the existing bill-update logic in `create_payment` (lines 144-152) for consistency of style.

## C2 — `get_ledger` double-counts invoice + the payment that settled it
**Verified:** `finance.py:187-319`. `get_ledger` builds the running balance from THREE independent sources: `Payment` rows, `Bill` rows, and `PayrollLineItem` rows — each contributes its own full amount to `running_balance` with no awareness that a `Bill` and the `Payment`(s) that settled it represent the SAME economic event counted twice (once when the bill/invoice is raised, again when the payment that settles it is recorded).

**Fix — the cleanest correct model:** an accrual-basis ledger should post the INVOICE event (bill raised) as the revenue/expense recognition, and the PAYMENT event should only move cash/bank, not re-post revenue/expense. Concretely:
- Keep `Bill` entries in the ledger exactly as they are now (revenue recognized on sale invoice, cost recognized on purchase/subcon invoice) — this is the accrual side, correct as-is.
- For `Payment` entries: STOP posting a payment that is a `PaymentSettlement` against an existing bill as a second independent revenue/expense line (that's the double-count). Only post `Payment` rows that have NO settlement against any bill (i.e., a party_company_user_id-less payment, or a payment whose `unsettled_amount` still equals `amount`, meaning nothing was settled) — these represent standalone cash movements not already recognized via a bill. For payments that DID settle one or more bills, either (a) omit them entirely from the ledger (their economic effect is already reflected in the bill's `Receipt`/`Expense` line), or (b) keep them but re-label/re-categorize them clearly as a "Settlement" info line that does NOT add to `running_balance` (visible for audit trail, zero balance impact). Prefer (a) — simpler, avoids ledger clutter — unless you find the frontend UI expects every payment to appear as its own row (check `frontend/src/app/c/[company_id]/d/finance/page.tsx` or wherever ledger is rendered before deciding; if the UI needs every payment visible, do (b) instead and clearly document the choice in your report).
- To determine "did this payment settle a bill", query `PaymentSettlement` for `payment_id == p.id` — if any rows exist, it settled at least one bill.
- Salary (`PayrollLineItem`) entries are unrelated to bills and stay as-is (no double-count there).

## C3 — `record_payment_request`: balance not cumulative + status force-"Paid" on partial
**Verified:** `finance.py:1090-1119`. `balance_due = max(0.0, req.amount - data.paid_amount - data.deduction - data.tds)` computes balance using ONLY the current payment call's `paid_amount`/`deduction`/`tds` — it never sums prior `PaymentRequestPayment` rows already recorded against the same `req`. Additionally, line 1115-1116 unconditionally sets `req.status = "Paid"` and `req.approval_status = "Approved"` on ANY call to this endpoint, even when the payment recorded is only a partial amount (`balance_due > 0`).

**Fix:**
1. Before computing `balance_due`, sum all PRIOR `PaymentRequestPayment` rows for this `request_id` (excluding the one about to be created): `prior_paid = sum(p.paid_amount for p in db.query(PaymentRequestPayment).filter(PaymentRequestPayment.payment_request_id == req.id).all())`, similarly sum prior `deduction`/`tds` if those should also accumulate (check the field semantics — if `deduction`/`tds` are per-payment adjustments not cumulative totals, only `paid_amount` needs cumulative tracking; use your judgement based on how `PaymentRequestPaymentCreate` fields are used elsewhere, but the core cumulative bug is `paid_amount`).
2. Compute `total_paid_to_date = prior_paid + data.paid_amount` (+ prior/current deduction+tds as appropriate), then `balance_due = max(0.0, req.amount - total_paid_to_date - total_deduction - total_tds)`.
3. Set `req.status` conditionally: `"Paid"` only when `balance_due <= 0` (i.e., fully settled), else `"Partially Paid"` (add this status value if the field doesn't already accept it — check `PaymentRequest.status` column/usage elsewhere for existing partial-status conventions, e.g. `Bill.status` already uses `"Partially Paid"`, mirror that exact string). Do NOT force `req.approval_status = "Approved"` here — approval status is a separate workflow (see `update_payment_request_status`), leave it untouched by this recording endpoint unless it's already `"Approved"`.
4. Keep storing the new `PaymentRequestPayment` row exactly as now (still records each individual payment event) — only the derived `balance_due` and the request's status logic change.

## C4 — FIFO settlement float-equality edge case
**Verified:** `finance.py:147` inside `create_payment`'s FIFO loop: `if bill.paid_amount >= bill.total_payable: bill.status = "Paid"`. Both sides go through repeated `float(...)` arithmetic (`bill.paid_amount = float(bill.paid_amount) + settled`) across potentially many partial payments, so floating-point drift can leave a bill effectively fully paid but sitting a fraction of a paisa below `total_payable`, permanently stuck at `"Partially Paid"` with a non-zero but economically meaningless remainder.

**Fix:** use a small epsilon tolerance for the "fully paid" comparison, e.g. `if bill.paid_amount >= float(bill.total_payable) - 0.01:` (1 paisa/cent tolerance — adjust if the codebase has an existing epsilon convention elsewhere for money comparisons, grep for `0.01` or `epsilon` near other billing/finance float comparisons first and reuse the same tolerance if one already exists, for consistency). Apply the SAME epsilon-aware comparison in your C1 fix (the reversal logic's `>= total_payable` check) and anywhere else in this file doing a paid-amount-vs-total-payable equality check (grep `paid_amount >= ` and `paid_amount <` across `finance.py` to catch all instances, e.g. also check `billing.py`'s `create_bill`/`_sequential_deduction_calc` area doesn't have the identical pattern needing the same fix — if it does, apply it there too and note it in your report).

## C5 — Payment "approval" via `approve_transaction` sets no flag
**Verified:** `finance.py:419-435`. `approve_transaction` handles two entity types: if the id matches a `Bill`, it correctly sets `bill.approval_flag = "approved"` and commits. If the id matches a `Payment` instead, it returns `{"status": "success", "message": "Payment confirmed", "type": "payment"}` WITHOUT ever writing anything to the `Payment` row or any related table — the "approval" is entirely fictional, no state persists.

**Fix:** add a real state field to track payment approval. `Payment` model currently has no approval-status column. Add `approval_flag = Column(String(50), default="pending", nullable=False)` to `Payment` in `models.py` (mirror `Bill.approval_flag`'s exact column definition for consistency), plus an additive Supabase migration (`ALTER TABLE payments ADD COLUMN IF NOT EXISTS approval_flag VARCHAR(50) NOT NULL DEFAULT 'pending';` — follow the existing migration file naming/style in `supabase/migrations/`, do NOT apply it to Supabase yourself, flag it in your report same as the D5 migration from the prior prompt). Then in `approve_transaction`'s payment branch, set `payment.approval_flag = "approved"` and `db.commit()` before returning, so the approval is real and persisted, matching the Bill branch's behavior. Add `approval_flag` to `PaymentResponse` schema too so the frontend can see it if needed.

---

## Rules
- Zero fabrication, zero invented business logic beyond what's specified above — if a design choice is ambiguous (e.g. C2's option a vs b), make the more conservative/simpler choice and clearly flag your reasoning in the report rather than guessing silently.
- Do not change unrelated response shapes/fields.
- C5's migration: same rule as before — file created, NOT applied to Supabase, flagged explicitly in your report.

## Verify
- `python -m py_compile` on `finance.py` and `models.py`; `python -c "import app.main"` clean.
- Existing finance tests (`test_finance_tenant_isolation.py`) and full `backend/tests/coverage` suite still green.
- New regression tests (add to a new `test_finance_ledger_integrity.py` or similar):
  - C1: create a payment that settles a bill to "Paid", delete the payment, assert the bill's `paid_amount` drops back and `status` reverts to `"Unpaid"`/`"Partially Paid"` correctly.
  - C2: create a bill + a payment that settles it, call `get_ledger`, assert the running balance reflects the economic event ONCE, not twice (assert on the actual computed `balance` field of the last entry, or the count/sum of entries, whichever concretely proves no double-count).
  - C3: record two partial payments against the same payment request, assert the SECOND call's `balance_due` correctly accounts for the first payment (i.e., decreases cumulatively, not resets), and assert `status` stays `"Partially Paid"` until the full amount is reached, only becoming `"Paid"` when balance_due hits 0.
  - C4: construct a sequence of partial payments whose float sum lands within a cent of `total_payable`, assert the bill correctly reaches `"Paid"` status despite the float remainder.
  - C5: call the payment branch of `approve_transaction`, assert `payment.approval_flag == "approved"` persists after a fresh query.

## Report back (for me to verify before I commit/push)
- Per item (C1-C5): exact diff summary, and for C2 specifically state clearly which option (a or b) you chose and why (check the frontend rendering first as instructed).
- C5: migration file path, explicitly NOT applied to Supabase.
- Full test results (before/after counts).
- Do NOT commit or push yourself — leave everything in the working tree for me to review and push.
