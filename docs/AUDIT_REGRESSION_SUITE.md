# SiteFlow ΓÇö AUDIT REGRESSION SUITE

Every approved fix prompt's ┬º7 check lands here as a numbered, machine-runnable check.
**After every wave, re-run the WHOLE accumulated suite, not just the new checks.**
Any previously-passing check that now fails ΓçÆ set that finding's STATUS to `REGRESSED` in
`docs/AUDIT_FIX_REGISTER.md` and fix it inside the current wave. Do not proceed.

Run from the repo root unless a check says otherwise.

## Run everything

```bash
cd backend && python -m pytest tests/coverage -q -p no:warnings && cd .. && python scripts/detect_silent_writes.py && cd frontend && npx tsc --noEmit
```

---

## Wave 0

### RC-001 ΓÇö R2-565 ┬╖ predecessor link must not 500 the planning module

```bash
cd backend && python -m pytest tests/coverage/test_r2_565_predecessor_cpm.py -q -p no:warnings
```

Fails before the fix with `TypeError: unsupported operand type(s) for -: 'datetime.datetime' and 'float'`
(`backend/app/routers/planning.py:146`). Also asserts `is_critical` survives the
`db.flush ΓåÆ annotate_critical ΓåÆ db.commit ΓåÆ db.refresh` reorder ΓÇö `is_critical` is an **unmapped**
attribute, so the reorder must be proved, never argued from SQLAlchemy internals.

Verified pre-fix FAIL / post-fix PASS by the verifier on 2026-08-06.

### RC-002 ΓÇö R2-599 ┬╖ `create_dpr` must reject a task from another project

```bash
cd backend && python -m pytest tests/coverage/test_r2_599_dpr_task_scope.py -q -p no:warnings
```

Pre-fix the cross-project POST returns `201` and flips the foreign task to `in_progress`.
Post-fix: `400 "Task does not belong to the same project"`, with an independent read-back
confirming the foreign task is still `not_started`.

Verified pre-fix FAIL / post-fix PASS by the verifier on 2026-08-06.

### RC-003 ΓÇö R2-588 ┬╖ timesheet headers are listable and reflect a submit

```bash
cd backend && python -m pytest tests/coverage/test_r2_588_timesheet_headers.py -q -p no:warnings
```

Pre-fix `GET /apis/v3/hr/timesheets/project/{id}/headers` is `404` ΓÇö no endpoint returned timesheet
**headers** at all (both list endpoints return `List[TimesheetEntryResponse]`). The register's own
"Fix:" note was wrong on this point; see `fixprompts/W00/_VERDICT_wave0.md`.

Verified pre-fix FAIL / post-fix PASS by the verifier on 2026-08-06.

### RC-004 ΓÇö R2-042 ┬╖ payment settles the bill (backend contract)

```bash
cd backend && python -m pytest tests/coverage/test_r2_042_payment_settles_bill.py -q -p no:warnings
```

**This check passes before and after the fix by design** ΓÇö the backend was already correct
(skeleton ┬º4: FIFO settlement, `finance.py:154-184`). It is a *guard*: it fails only if a later wave
breaks settlement. The actual R2-042 defect is client-side and is covered by RC-005.

### RC-005 ΓÇö R2-042 ┬╖ the payment POST body carries the party

```bash
grep -n "party_company_user_id" "frontend/src/app/c/[company_id]/d/finance/page.tsx"
```

Must report the field inside the `/apis/v3/finance/payments` POST body. Zero hits ΓçÆ regressed:
the payment is recorded and settles nothing.

### RC-006 ΓÇö R2-231 ┬╖ the voucher party is an id picker, not free text

```bash
grep -c "company_team_id" "frontend/src/app/c/[company_id]/d/finance/page.tsx"
```

Expect ΓëÑ 2 (the `Member` type and the `<option value=ΓÇª>`). Also assert the members fetch still exists:

```bash
grep -n "projects/\${projectId}/members" "frontend/src/app/c/[company_id]/d/finance/page.tsx"
```

Zero hits on the second command ΓçÆ the `<select>` renders empty and **no voucher can be saved**.

### RC-007 ΓÇö R2-310 ┬╖ `authHeaders` is memoized in delete-logs

```bash
grep -n "useMemo" "frontend/src/app/c/[company_id]/d/delete-logs/page.tsx"
```

Must be present and must feed the `fetchLogs` `useCallback` dependency array. Without it the
identity changes on every render and the effect re-fires ΓÇö measured at 3.6 req/s against production.

### RC-008 ΓÇö R2-590 ┬╖ no console write fails silently

```bash
python scripts/detect_silent_writes.py
```

Exit 0 / `silent write sites: 0`. Non-zero exit lists the offending `file:line`.

### RC-009 ΓÇö R2-590 ┬╖ the error branch is a compile-time requirement

```bash
cd frontend && npx tsc --noEmit
```

`submitJson`'s third parameter (`onError`) is required, so a two-argument call does not compile.
This is what makes RC-008 non-gameable.

### RC-010 ΓÇö R2-590 ┬╖ every mutating call goes through the helper

```bash
python - <<'EOF'
import os, re
ROOT = os.path.join("frontend", "src", "app", "c")
M = re.compile(r'method:\s*["\'](POST|PUT|PATCH|DELETE)["\']')
raw = []
for dp, _, fns in os.walk(ROOT):
    for fn in fns:
        if not fn.endswith((".tsx", ".ts")):
            continue
        p = os.path.join(dp, fn)
        L = open(p, encoding="utf-8", errors="replace").readlines()
        for i, l in enumerate(L):
            if M.search(l) and "submitJson(" not in "".join(L[max(0, i - 6):i + 1]):
                raw.append(f"{p}:{i + 1}")
print("raw mutating fetch sites:", len(raw))
for r in raw:
    print("  ", r)
raise SystemExit(1 if raw else 0)
EOF
```

Expect `0`. Exempt by design: `p/[project_id]/todo/page.tsx` `toggle`/`remove` ΓÇö they are the in-repo
template skeleton ┬º3 assigns to **R2-148** and must stay as raw `fetch` until that prompt is written.
If this check reports those two, that is the expected state, not a regression.

---

## Wave 1a ΓÇö `finance.py`

All nine run from `backend/`:

```bash
python -m pytest tests/coverage -q -p no:warnings
```

Each was executed by the verifier against the unfixed tree and fails at its **defect assertion**
(not in fixture setup ΓÇö that was the reason the first W01a batch was rejected wholesale).

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-011 | R2-221/244 | `test_r2_221_244_naive_utcnow.py` | `TypeError: can't subtract offset-naive and offset-aware datetimes` |
| RC-012 | R2-315 | `test_r2_315_bank_balance_derived.py` | `company_balance 1000.0`, expected `800.0` |
| RC-013 | R2-232 | `test_r2_232_cancel_exclusion.py` | cancelled bill still counted, `total_invoice 1000.0` |
| RC-014 | R2-025 | `test_r2_025_enterprise_balance_sign.py` | `total_balance -130000.0`, expected `70000.0` |
| RC-015 | R2-235 | `test_r2_235_party_balance_sign.py` | `balance -100000.0`, expected `100000.0` |
| RC-016 | R2-243 | `test_r2_243_pl_subcon_not_material.py` | subcon double-counted, `Material Cost 1500.0` |
| RC-017 | R2-052 | `test_r2_052_payment_request_party_fk.py` | `party_name 'Unknown Party'` |
| RC-018 | R2-198 | `test_r2_198_redirect_await.py` | 28 `LegacyRedirect` wrappers read `params` synchronously |
| RC-019 | R2-236 | `test_r2_236_ledger_salary_500.py` | `TypeError: can't compare offset-naive and offset-aware datetimes` |

**RC-012 must run before RC-013.** Both assert on `company_balance` from
`/apis/v3/finance/transactions/{cid}`, and R2-315 changes how that field is computed (stored `SUM`
ΓåÆ derived from `Payment.bank_account_id`).

**RC-019 note ΓÇö the fix landed under the wrong commit.** R2-236's `_ledger_aware` change is inside
commit `7a47131`, which is labelled R2-221/244. Two agents held the same worktree at the same time
and an uncommitted patch was swept into another finding's `git add`. The code is correct and
independently verified; the attribution is not. Do not look for R2-236 in its own commit.

### Migrations ΓÇö NOT applied automatically

Two migrations ship with this wave and must be applied to Supabase **before** the backend deploy:

- `supabase/migrations/20260806_000001_payment_bank_account_id.sql` (R2-315)
- `supabase/migrations/20260806_000002_payment_request_party_fk.sql` (R2-052)

---

## Wave 1b (partial) ΓÇö fixed directly by the verifier, 2026-08-06

Same standard as every other check: written first, run against the unfixed tree, observed failing at
the defect assertion, then fixed and the whole suite re-run green.

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-020 | R2-344 | `test_r2_344_transfer_no_settlement.py` | `transfer settled the vendor bill: paid_amount=5000.00` |
| RC-021 | R2-544 | `test_r2_544_company_payment_in_summary.py` | `out_total dropped the payment: 0.0` |
| RC-022 | R2-327 | `test_r2_327_equipment_bill_in_plant.py` | `equipment bill counted as material spend: 1400.0` |

**R2-509 needs no fix ΓÇö it is the same defect as R2-025/R2-235** (the enterprise rollup balance sign,
`finance.py:760`, `:912`, `:932`). All three lines were corrected in wave W01a and now read
`advance_paid + to_receive - to_pay - advance_received`. RC-014 and RC-015 already guard them.
Marked `FIXED` with the W01a commits; do **not** write a prompt for it.

### Wave 1b (partial) ΓÇö second batch, same session

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-023 | R2-549 | `test_r2_549_p2p_visible_in_summary.py` | `sender leg invisible: out_total=0.0` (run against `3ac2694`) |
| RC-024 | R2-568 | `test_r2_568_no_concurrent_deployment.py` | `back-dated redeploy accepted: 201`, expected `400` |

**R2-356 needs no fix ΓÇö it is the same defect as R2-221/244** (naive `datetime.utcnow()` against an
aware `EquipmentDeployment.start_date` in the Plant & Machinery loop). Closed in W01a; RC-011 guards
it. Do not write a prompt for it.

**R2-549 needed no fix of its own** ΓÇö it is R2-544's root cause seen from the p2p transfer path. The
company-scoped payment query (`41ebbf1`) closed it. RC-023 is the guard, and it was proved by
running against the pre-fix commit, not assumed.

**R2-568 was half-fixed already.** The existing close-the-open-deployment loop prevents two
concurrent open rows ΓÇö the register's live evidence predates that code. What remained was the
back-dated case. Both halves are now pinned by RC-024.

### Wave 1c (partial) ΓÇö same session

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-025 | R2-238 | `test_r2_238_settlement_ledger_head.py` | `settlement voucher filed under a fabricated cost head: Material Cost` |
| RC-026 | R2-343 | `test_r2_343_payment_status_not_hardcoded.py` | `row says Approved but the stored approval_flag is 'pending'` |

**R2-328 ΓÇö half closed, half is not a defect.** Its payment clause was fixed by `41ebbf1` (RC-021).
Its bill clause cannot drop a company-level bill: `Bill.project_id` is `nullable=False`
(`models.py:577`), so every bill has a project and `project_ids` covers all of them. What remains is
only the `if project_ids:` guard, which blanks the tab for a company with no projects at all. Left
open, downgraded, and it needs a prompt of its own ΓÇö do **not** "fix" it by scoping bills to the
company; that changes nothing and touches a hot query.

**Known, deliberately not fixed here:** `get_company_transactions` counts `payment_type == "transfer"`
into `out_total` through its `else` branch. Separate defect, no finding number assigned yet ΓÇö flag it
to the founder for registration.

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-027 | R2-316 (partial) | `test_r2_316_transfer_not_counted_as_out.py` | `transfer counted as spend: out_total=2500.0` |

**R2-316 is only PARTLY closed.** It names five consumers that branch on two of the three
`payment_type` values. `07fde45` fixed the Finance-tab surface (totals + row label). Still open, and
they belong to the `reports.py` wave, not W01:
`_build_party_ledger` (`reports.py:610`), `_rep_bank_statement` (`reports.py:1146`),
`_rep_gstr2_purchase` (`reports.py:1066`), and `_cash_running_balance` (`finance.py:1015-1022`).
Leave the register row at TODO until all five are done.

**R2-345 ΓÇö escalate, do not prompt.** A payment with no project settles the party's oldest bills
company-wide, so `ORDER BY invoice_date ASC` silently allocates cost across projects the payer never
named. There is no apply-to-invoice endpoint and no un-settle endpoint, so the only correction is
deleting the payment. Choosing the right behaviour (refuse a project-less payment against a party
with bills on several projects / add an allocation endpoint / keep FIFO and expose it) is a product
decision. **Founder must rule.** The register's own note records that the missing
`Bill.company_id` filter on that query is *not* a defect ΓÇö `party_company_user_id` is a
`company_team.id` and a team row belongs to exactly one company. Do not re-open that.

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-028 | R2-276 (partial) | `test_r2_276_external_party_name_in_summary.py` | `external party did not resolve: 'Unknown Party'` |

**R2-276 is only PARTLY closed.** The root cause is a `CompanyTeam -> users` lookup with no
`LibraryParty` fallback, so any party without a login reads "Unknown". `8022520` fixed the Finance
tab. Still open, in other files: the work-order response and invoice PDF (`billing.py` ΓÇö note
`billing.py:269-270` already has the fallback, so re-check which surface actually fails before
writing anything), the subcon scorecard (`subcon.py`), and the BOQ PDF (`budgeting.py`).
Leave the register row at TODO until all four are done.

**R2-276 update (`e92e124`).** Two more surfaces fixed with the same three-line chain:
`_resolve_subcontractor_name` (`subcon_performance.py:120`) and `_resolve_team_name`
(`analytics.py:101`, which returned `Team 1a2b3c4d`). **Not independently proved** ΓÇö both are
read-only display paths needing seeded scorecard rows, so they carry no ┬º7 of their own. RC-028 pins
the mechanism. Treat them as fixed-by-analogy until someone writes the scorecard test.

**BOQ PDF is NOT the same defect.** `budgeting.py:408` already resolves through `LibraryParty`
directly; it prints `N/A` only when `doc.client_party_id` is unset, which is a data-entry gap, not a
resolution bug. Do not "fix" it.

### R2-276 and R2-316 ΓÇö CLOSED (`b998d8a`)

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-029 | R2-276 | `test_r2_276_party_name_resolution.py` | users-only lookup returns `Unknown` for a party whose `user_id` is NULL |
| RC-030 | R2-316 | `test_r2_316_transfer_in_reports.py` | `party-ledger still reports the transfer` (amount 7777 present) |

R2-276's five sites now all delegate to `app/party_names.py`, so RC-029 (three resolver branches)
plus RC-028 (Finance tab end-to-end) covers every caller. R2-316's consumers all exclude a
`transfer` rather than inventing a direction.

**Ruled NOT defects ΓÇö do not re-open:**
- `reports.py:1066` (GSTR2 purchase return) filters `payment_type == "out"`. Excluding a transfer is
  correct.
- `budgeting.py:408` (BOQ PDF) already resolves via `LibraryParty`; its `N/A` means
  `client_party_id` is unset ΓÇö a data-entry gap, not a resolution bug.
- `_cash_running_balance` excluding transfers is correct for the same reason as the reports.

**Follow-up worth a finding number:** a `Payment` of type `transfer` carries no from/to account, so
no consumer can give it a direction. Every surface now excludes it, which is the least-wrong
behaviour but means a cash-to-bank transfer moves no balance anywhere. Fixing that is a model change
(from_account / to_account on the transfer), not a reporting change.

---

## Closure audit ΓÇö 2026-08-06

Every finding closed to date was re-checked against D-006 (`docs/DECISIONS.md`). Three gaps were
found and closed; the rest held.

| Check | Finding | Gate | Observed failure before the fix |
|---|---|---|---|
| RC-031 | R2-356 | `test_r2_356_509_closed_as_duplicates.py::test_r2_356_...` | `TypeError: can't subtract offset-naive and offset-aware datetimes` |
| RC-032 | R2-509 | `test_r2_356_509_closed_as_duplicates.py::test_r2_509_...` | `per-company balance subtracts the receivable: -100000.0` |

**Gap 1 ΓÇö R2-343 changed a value the frontend switched on.** Payments began reporting their real
`approval_flag`, and the Finance tab's `statusClass` had no `"Pending"` branch, so a waiting payment
rendered in the red used for Rejected. Fixed in `acd2f4a`. **Rule: a backend value change is not
closed until its frontend consumers are grepped.**

**Gap 2 ΓÇö R2-356 and R2-509 were closed on a code reading**, as duplicates of R2-221/244 and
R2-025/R2-235, with no gate of their own. Both now have one (RC-031, RC-032), each verified failing
against the reverted hunk.

**Gap 3, found by writing gap 2's gate ΓÇö R2-221/244's fix was one-directional.** Replacing a naive
`utcnow()` with an aware `now()` fixed the aware-`start_date` case and created its mirror: a
`start_date` that comes back **naive** then 500s against an aware now. Not live on Postgres
(`timestamptz` always returns aware), but one driver away. Fixed in `d5564d7` with `_as_utc()`, which
normalises both operands. **Any code subtracting or comparing two stored datetimes must use it** ΓÇö
mixed awareness is the most common 500 class in this codebase.

**Swept and clean:** every other value this session changed was checked for strict frontend
consumers ΓÇö the new ledger head `"Settlement"`, the new transaction type `"Transfer"`, the new
`"Pending Approval"` status, the shifted P&L heads. No strict equality or lookup map misses them.


---

## STATUS ON campaign/waves (Session 33 addendum, R2-725)

This document is restored from the orphaned audit branch so the RC-xxx citations in
AUDIT_FIX_REGISTER.md FIX_VERIFIED rows resolve to their definitions. It records intent
and pre-fix failure signatures. The four pytest files its commands invoke
(test_r2_042_payment_settles_bill.py, test_r2_565_predecessor_cpm.py,
test_r2_588_timesheet_headers.py, test_r2_599_dpr_task_scope.py - names as cited)
were orphaned with this branch and are ABSENT from campaign/waves: every RC command
here is INERT on this branch until those files are ported or re-created. Treat the
citations as historical evidence of what was verified live, not as runnable checks.
