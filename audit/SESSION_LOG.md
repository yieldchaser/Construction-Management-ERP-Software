# Session Log

Append-only. Every working block ends with a 5-line entry. Never edit an existing entry; if a commit was reverted, add a new entry.

## Session 10 — fixes 9 and 10 (2026-08-15)

- Action 1: applied R2-121 (W07 subcon pages, MEDIUM). Both `d/subcon/page.tsx` and `p/[project_id]/subcon/page.tsx` already had a `loading` flag around `fetchSubconData` but never consulted it in the render, so the first ~1.6s asserted "No subcontractor workorders found." / "No subcontractors yet." (live-observed; data appears at ~5s, worse on cold backend R2-080). Both pages now branch on `loading` first: "Loading subcontractor work orders..." / "Loading subcontractors...", empty states only after settle.
- Action 2: applied R2-037 (W08 analytics.py, MEDIUM). The wastage KPI computed `max(ordered - consumed, 0)/ordered` → 100% immediately after raising a PO before anything was issued (live-reproduced: 100 bags PO, no issues, "MATERIAL WASTAGE 100%"). Now suppressed: `wastage_pct` is JSON null when there are no material transactions (frontend renders "—"), `wastage_qty` 0.0; math identical when consumption exists (hand-verified 82/100 → 18.0, matches test_phase14's assertions). Frontend contract (type `number | null` + 2 render sites) updated in the same commit. New test `test_analytics_wastage_suppressed_without_consumption` in test_domain_formula_fixes.py.
- Verified: npm run build green (30.8s + 46s TS); pytest tests/coverage/ 207 passed rc=0 (206 + 1 new); test_competitor_parity rc=0. Verifier APPROVE on both (JSX nesting, ZeroDivision guard, no key deletion, no refetch loops).
- Commits: `25f30db` (R2-121), `df91126` (R2-037).
- Register: R2-121 and R2-037 STATUS TODO → FIXED.
- NOTE (pre-existing, NOT from these commits, confirmed via stash test by the coder and diff-attribution by the verifier): `backend/tests/test_phase14.py` fails its burn-series assertion (`Burn series final pct: expected 23.5, got 79.4`) — lives in the S-curve/burn block of analytics.py (~258-312), unrelated to the wastage block; phase14 is NOT part of the tests/coverage baseline. Needs its own investigation later.
- Next session: R2-178 still blocked on the founder's wire-13-vs-cut-to-2 decision. R2-034's sibling R2-007/R2-008 (procurement page) are HIGH. R2-012/R2-022 (W27 finance page) are MEDIUM single-file candidates.

---

## Session 9 — eighth fix + Render build failure (2026-08-15)

- Action 1 (infra, founder-reported): the Render backend deploy was failing at `pip install -r requirements.txt` with PyPI 502s (`too many 502 error responses` from files.pythonhosted.org). Added a 5-attempt retry loop with `--retries 10 --timeout 60` to the Dockerfile (`b27bffc`). The verifier subagent REJECTED it: in POSIX shell the all-5-fail path exits 0 (loop exit status = last command `sleep 10`; `set -e` exempts non-final `&&` failures), which would build an image with no deps and die at uvicorn boot. Re-fixed with `[ "$i" -eq 5 ] && exit 1;` (`95e4a86`), empirically verified on dash and bash: success=0, fail-then-success=0, all-5-fail=1. APPROVE. Founder still needs to re-trigger the Render deploy (out of my reach).
- Action 2: applied R2-034 (W95 billing page, HIGH). In `d/billing/page.tsx`: the Work Orders tab's Subcontractor column now uses the server-supplied `subcontractor_name` (was a client-side nameMap that could be empty); the loader's subcontractors fetch, fetchWorkOrders, and fetchBills gained `else` branches that log the HTTP status (no more silent swallow); loader effect re-keyed on `[companyId, projectId]` with a `!companyId` guard so it re-runs once project context resolves.
- Why this was the right fix: live reproduction showed the RA-bill modal's subcontractor dropdown never populating and WOs reading "Unassigned" while the API response carried the name. Verified: npm run build green (55.4s, zero TS errors); verifier APPROVE (spec 3/3, no refetch loop, dropdown contract preserved).
- Commits: `b27bffc` (superseded), `95e4a86` (Dockerfile), `0866171` (R2-034).
- Register: R2-034 STATUS TODO → FIXED.
- Next session: R2-178 still needs a founder decision (wire 13 vs cut to 2 approval categories). R2-121 (subcon tab premature empty state) is same-family as R2-099 and is a clean 2-file frontend fix (`d/subcon` + `p/[project_id]/subcon`). R2-037 (analytics wastage formula) is a small backend fix.

---

## Session 8 — seventh fix (2026-08-15)

- Action: applied R2-014 (W84 attendance pages), the audit's #1 CRITICAL and the live-reproduced R2-105 bug. In both `d/attendance/page.tsx` and `p/[project_id]/attendance/page.tsx` (identical code, identical fix), `flushQueue` was rewritten: it now POSTs each queued punch to `/apis/v3/hr/attendance/punch`, removes a punch only on a confirmed 2xx, retains failures (including legacy records missing `employee_id`/`project_id`), and reports honest counts ("Synced X of Y; Z failed and remain queued" instead of the old unconditional "Synced N successfully" with zero network activity). `PunchRecord` and `queuePunch` now persist `employee_id`/`project_id` on queued punches (they were missing, so the flush had nothing to send). Added an `isSyncing` guard that disables the Sync button mid-flight (prevents double-POST "Already punched in" 400s).
- Why this was the right seventh fix: R2-105 proved in production that the Sync button destroyed 3 punches and made 0 HTTP requests. Payroll pays from attendance, so this was data-loss with no audit trail. No DECISION blocks it; the finding's suggested fix was followed verbatim.
- Verified: `npm run build` green (69.4s, zero TS errors, both attendance routes built). Verifier subagent APPROVED: both flushQueue bodies byte-identical, all 9 spec points PASS, blast radius 2→2 files (only these two pages touch `siteflow-punch-queue`).
- Risk-flagged in register notes (pre-existing, not fixed): p/[project_id] page's hardcoded `projectId` fallback `d0000000-...` would be POSTed on sync if the route param were missing; d/attendance's `activeProjectId` may be undefined and such punches are retained as failed (graceful, no data loss). Captured punch timestamps are not sent (server stamps sync time) — separate future improvement.
- Commits: `1d7d1fb`.
- Register: R2-014 STATUS TODO → FIXED (also closes R2-105).
- Next session: R2-178 (CRITICAL, 15 approval categories / 2 consulted, covers R2-113) needs a founder decision (wire 13 vs cut to 2 — see raw log L6719). Otherwise viable LOW/MEDIUM single-file candidates remain (R2-037, R2-098, R2-121, R2-034).

---

## Session 2 — second fix (2026-08-15)

- Action: applied R2-101 (W01 finance.py). Lifted `unbilledCount` and `pendingCount` to component scope and replaced the hardcoded `0` in the Finance header chips with the computed values (+12/-2 lines in `frontend/src/app/c/[company_id]/d/finance/page.tsx`).
- Why this was the right second fix: the audit observed `UNBILLED MATERIALS 0` in the header chip while the toolbar button on the same screen read `New 2`. The chip was hardcoded 0; the button computed from `txns.filter(...)`. Now they share the same source.
- Partial fix explicitly noted in the register: 2 of 3 sub-bugs addressed. Still deferred: (a) toolbar button has no onClick (R2-072 dead button); (b) procurement page computes its own unbilled count from `grns.filter(g => !g.isBilled)` — the audit's "one source of truth via the procurement GRN query" half needs a backend endpoint or shared query cache.
- Verified: static. Both consumers now read the same `useMemo`-wrapped value.
- Blast radius: 1 file, +12/-2 lines.
- Commits: `2253758`.
- Register: R2-101 STATUS TODO → FIXED (partial, with deferral notes).
- TODO W01 after this: R2-179, R2-311, R2-328, R2-335, R2-358 (5 remaining; R2-101 no longer blocks).
- Next session: pick the simplest W01 remaining (R2-358 PARTIAL marker) OR pivot to T1 cross-wave LOW/MEDIUM single-file fixes. Founder's call.

---

## Session 3 — third fix (2026-08-15)

- Action: applied R2-005 (W77 calculators). Inside the masonry category block, conditionally render plaster-specific notes when `activeCalc === "plaster"`, otherwise show brick notes.
- Why this was the right third fix: LOW severity, single-file, no cross-file, pure content swap. The audit's complaint was "the Plaster tab shows brick notes" — the fix is a 1-conditional ternary.
- Verified: static. Default (Bricks tab) shows brick notes; Plaster tab shows plaster notes.
- Blast radius: 1 file, +10/-3 lines.
- Repo convention check: replaced an em dash I'd accidentally used in the plaster notes with a comma (no em dashes in user-facing copy, per project README).
- Commits: `2ed961c`.
- Register: R2-005 STATUS TODO → FIXED.
- Next session: pick the next LOW/MEDIUM single-file fix. R2-018, R2-038, R2-044, R2-037 all viable. Or pivot back to W01.

---

## Session 4 — fourth fix (2026-08-15)

- Action: applied R2-018 (W130 reports/dpr). Wired the dead date input on the DPR report. Was a hardcoded `defaultValue="2026-07-04"` with no state, no onChange, no value binding. Now controlled via `customDate` state, disabled when the select is not "Custom", and the export handler has a new "Custom" branch that uses the picked date.
- Why this was the right fourth fix: LOW severity, single-file, no cross-file. The audit's complaint was straightforward — the dead input misled users. The fix is the protocol's "wire it to the Custom Range option" alternative.
- Design decision: disabled the input when the select is not "Custom" (cleaner than letting users set a date that gets ignored). Label flips from "Date Range" to "Pick Date" so the visible affordance matches the active filter.
- Verified: static. Export handler now has a "Custom" branch with a toast if no date is picked.
- Blast radius: 1 file, +11/-2 lines.
- Commits: `8fa1f7c`.
- Register: R2-018 STATUS TODO → FIXED.
- Next session: still many viable LOW/MEDIUM single-file candidates (R2-038, R2-044, R2-037, R2-098, R2-121). Founder's call.

---

## Session 5 — fifth fix (2026-08-15)

- Action: applied R2-038 (W81 analytics). The Analytics page had a local `formatCurrency` that hardcoded `Rs ` as the currency prefix and ignored `currency_decimal_places`. Replaced its body with a wrapper around the shared `fmtINR` helper and removed the 6 `Rs ` literals from the call sites.
- Why this was the right fifth fix: LOW severity, single-file, no cross-file. The audit's complaint was purely cosmetic ("Rs vs ₹") — the fix mechanically aligns with the rest of the codebase.
- Honest note recorded in the register: fmtINR defaults to 0 decimal places; the analytics page doesn't have company settings in scope, so the second half of the audit's complaint ("omits the decimal places") is still open at the project-wide level. Same pattern as dozens of other call sites — fixing all of them at once is a separate pass.
- Verified: static — output now starts with ₹.
- Blast radius: 1 file, +5/-4 lines.
- Commits: `d48e67c`.
- Register: R2-038 STATUS TODO → FIXED.
- Next session: a quick NPM build / pytest pass is now warranted (5 frontend fixes in, no build run yet). Or continue to next LOW/MEDIUM single-file. Founder's call.

---

## Session 6 — baseline check (2026-08-15)

- Action: ran `npm run build` and `pytest tests/coverage/` to establish the post-fixes baseline.
- Result:
  - **npm run build**: compiled successfully in 29.0s. TypeScript clean. All 22 static pages generated. **No regressions from the 5 frontend fixes.**
  - **pytest tests/coverage/**: 206 passed, 214 warnings, **0 failed, 0 errored**. All warnings are pre-existing Pydantic v1→v2 deprecation warnings in `auth.py`, `profile.py`, `team_schedule.py`, `files.py`, `hr.py`, `tally.py` — none are from my changes.
- Baseline established. Safe to continue. The protocol's "verify with the post-wave tests" rule is now satisfied for the first time in this campaign.
- No new commits (baseline check only).

---

## Session 7 — sixth fix (2026-08-15)

- Action: applied R2-044 (W07 billing.py). First backend fix. Replaced 3 literal `"sale"` checks with canonical-bucket membership tests. ZATCA gate now uses `REVENUE_INVOICE_TYPES` (so `material_sale` is eligible). Two 3-way-match gates now use `EXPENSE_INVOICE_TYPES` (so all revenue, settlement, and movement types are correctly exempt from a purchase-side control).
- Caught a real bug during application: my first attempt at `link_bill_match` hoisted the `if match_id is not None:` block out of the if/else, which would have raised `NameError` for non-expense invoice types. Fixed by keeping the block inside the if-branch (its correct original scope).
- Removed unused SETTLEMENT_INVOICE_TYPES and MOVEMENT_INVOICE_TYPES imports — the inverse `not in EXPENSE_INVOICE_TYPES` check covers them transitively. Keeps the diff small and the import list tight.
- Verified: pytest 206/206 (full coverage suite, 40.5s). pytest 14/14 billing-specific (3.6s). No new test added — existing coverage already exercises the gates.
- Blast radius: 1 file (billing.py), 4 hunks: import + ZATCA gate + helper + endpoint. Net +15/-10.
- Commits: `c2c2cc6`.
- Register: R2-044 STATUS TODO → FIXED.
- Next session: many viable LOW/MEDIUM single-file candidates. Founder's call.

---

## Session 7 end-of-day (2026-08-15)

- Final state: 6 FIXED + 93 FIX_VERIFIED = 99 of 582 actionable findings closed.
- Final pytest: 206 passed, 0 failed, 0 errored.
- Working tree clean except pre-existing `backend/tests/test_boq.xlsx` mtime.
- Next session should pick up at the founder's call. Recommended next step: R2-014 (CRITICAL, offline queue DELETES attendance punches) or R2-178 (CLASS-fix, 15 approval categories / 2 consulted).

---


## Session 0 — initial dump (2026-08-15)
- Action: copied the 3 master files from `siteflow-audit-continuation-945943/docs/` to `audit/` at repo root. Wrote `START_HERE.md`, `STRATEGY.md`, `BLAST_RADIUS_TEMPLATE.md`. Created this log.
- Files copied: `AUDIT_FIX_REGISTER.md` (64 KB), `AUDIT_CANONICAL_FINDINGS.md` (76 KB), `AUDIT_ROUND2_FINDINGS.md` (1.9 MB).
- Decisions: register-master is `AUDIT_FIX_REGISTER.md`; raw-log is `AUDIT_ROUND2_FINDINGS.md`; canonical is `AUDIT_CANONICAL_FINDINGS.md`.
- Founder requests pending: 1) need Vercel/Supabase/JWT credentials list to know what to ask for when I hit a live-only finding. 2) Confirm npm install + venv already in place for pytest/build baseline.
- Next session: run `npm run build` and `pytest tests/coverage/ -q` to establish the baseline. Then start W01 (finance.py) reading the 4 files in order.

