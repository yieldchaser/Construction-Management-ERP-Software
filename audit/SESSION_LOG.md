# Session Log

Append-only. Every working block ends with a 5-line entry. Never edit an existing entry; if a commit was reverted, add a new entry.

## Session 33 (cont. 11) — sweep: procurement+scattered verified, constraints migrated (2026-08-23)

- New: R2-386+543 `2efc31a` (SEVEN UniqueConstraints reached prod path via one duplicate-safe NOTICE-skip migration: the five unmigrated model constraints + NEW uq_ncrs_project_id_ncr_number + uq_payments_company_id_reference_number; NCR blind-insert -> 409); R2-310 `6ce1203` (delete-logs infinite refetch loop dead via useMemo'd authHeaders); R2-592 f5f6749 landed earlier this block.
- Verified HOLDS: R2-398, R2-406, R2-420. Verified DRIFTED awaiting fixes: R2-219 (approve_po rewinds received->sent), R2-380 (dpr.py bypasses stock lock), R2-481+527, R2-302, R2-475 slice, R2-052, R2-100+315, R2-276, R2-327r, R2-043r tally, R2-317 (needs R2-100 first), R2-371 gate-check.
- Suite incident resolved: r2_236's tz test rebuilds the SHARED sqlite payments table (CREATE TABLE AS SELECT) stripping constraints - r2_386/543 test now restores live schema before asserting (`bc8c379`); FOLLOW-UP: make r2_236's test restore/cleanup its own schema change instead of leaking it.
- Suite GREEN exit=0 at bc8c379. SWEEP FINAL TALLY this session: 80/94 rows verified (finance 22, hr 28, reports 18, procurement 7, scattered 5), 44 live defects re-fixed, gated surfaced D2 x3 + founder x1 + CD-6/D7 slices. Unverified remaining: R2-358, R2-420(HOLDS counted? no - 420 HOLDS; unverified = none scattered... see WORKLIST) - reconcile counts next session. Remaining fix queue as listed in cont.10 + R2-590 quality-page silent failures.

---

## Session 33 (cont. 10) — sweep: procurement 5/7 verified, GRN integrity re-fixed (2026-08-23)

- New: R2-239+348 `7fbb78f` (GRN requires approved PO, forward-only lifecycle rank map, cumulative per-line receipt cap with 422 naming quantities, /stock clamped; prompt10 fixture updated for the new gate). Reports earlier this block: R2-592 f5f6749, 076/312/560 61df2f0, 286b 891f483, 075 9581917, 318+320 b53f5ab, 321 b9987d2, 414 db873cb, 322/323/324r 538e014.
- Procurement verified DRIFTED awaiting fixes: R2-049 (Equipment.code GLOBAL unique constraint - cross-tenant squat; fix needs per-company uniqueness = additive migration + company-scoped guard), R2-219 (approve_po rewinds received->sent unconditionally), R2-380 (dpr.py material usage bypasses negative_stock_lock; creates negative inventory rows). Unverified: R2-386, R2-543.
- Suite GREEN exit=0 at 7fbb78f. Sweep totals: 73/94 verified (finance 22, hr 28, reports 18, procurement 5), 41 live re-fixed. Remaining verify: procurement x2, scattered x5 (R2-310/398/406/420/590). Pending fixes: procurement trio above, R2-052, R2-100+315, R2-276, R2-327r, R2-302, R2-475 slice, R2-481+527, R2-043r tally, R2-317 (after R2-100), R2-371 gate-check, R2-533+534.

---

## Session 33 (cont. 9) — sweep: reports.py 18/18 verified, 13 re-fixed (2026-08-23)

- New re-fixes: R2-076+312+560 `61df2f0` (logger.exception at all 17 swallow sites + top-level errors marker distinguishing crash-empty from true-empty; per-party ledger accumulator); R2-286b `891f483` (self-approval 403, approved_by/at stamped, generated_by populated; nullable columns via boot sync); R2-075 `9581917` (unimplemented slugs -> 404 naming slug; catalogue download degrades honestly); R2-318+320 `b53f5ab` (gstr2 purchase reports only unsettled residual via PaymentSettlement; payment summary split per-direction, frontend columns updated); R2-321 `b9987d2` (pid filter honored truthfully; five fabricated headers dropped); R2-414 `db873cb` ("No lab tests assessed" sentinel replaces fabricated 0% headline); R2-322+323+324r `538e014` (Creator Name honest-empty - no creator columns exist; material ledger keyed project+name+unit with UOM; malformed ids 422; helper swallow removed).
- Verified HOLDS: R2-339 (completion pct from Task.progress), R2-313 (per-party accumulator).
- Pending: R2-043r (tally MOVEMENT bucket falls to Purchase; receipts-post-twice compounding), R2-317 (needs R2-100's bank_account_id first), R2-371 (PO-bill linkage - gate-check long-form L17366 before building).
- Suite GREEN exit=0 at 538e014. Sweep totals: 68/94 verified (finance 22, hr 28, reports 18), 40 live defects re-fixed this session, gated surfaced: D2 x3, founder-escalated x1, CD-6/D7 slices x1. Remaining verify: procurement x9, scattered x5 (R2-310/398/406/420/590).

---

## Session 33 (cont. 8) — sweep: hr.py COMPLETE 28/28; finance straggler R2-236 closed (2026-08-23)

- New re-fixes: R2-236 `7aa31e6` (_ledger_sort_dt helper; the chronic-failure dispatch finally landed); R2-592 `f5f6749` (??: honest nulls replace ||0/||100/||500 fabrication across quality/projects/dashboard/hr pages); R2-561+564 `0977492` (timesheet duration server-derived, ghost-employee headers 404, drawer failures alert).
- hr.py SWEEP COMPLETE: 28/28 verified. Incidental closes noted: R2-562 (ordering guard from R2-561), R2-563 (week bounds already present). R2-593 dispatch died - gate check spec preserved: wire face-punch->AttendanceLog ONLY if long-form L31102 prescribes; else BLOCKED-GATED.
- Sweep totals: 50/94 verified, 27 live defects re-fixed, 3 D2-gated surfaced (033/201/352), R2-345 founder-gated skipped, R2-593 verdict pending.
- Suite GREEN exit=0 at 0977492. Remaining queue: fixes R2-052, R2-100+315, R2-276, R2-327r, R2-481+527, R2-302, R2-475 slice, R2-533+534; verify reports x18, procurement x9, scattered x5; pins sets B/C.

---

## Session 33 (cont. 7) — sweep: 46/94 verified, 23 re-fixed; sibling alarms cleared (2026-08-23)

- New: R2-528+529 `51ecbe9` (leave status Literal + case-normalized balances; approved_by stamped; submit gated attendance:edit); R2-430/429/211/540 landed earlier this block.
- Sibling alarms CLEARED: R2-447 false positive (Task.company_id never existed per git -S; audit's 500 was self-described hypothesis), R2-389 fixed by 161b2c0 (u.mobile), R2-513 fixed by 97f4eb4 (+migration). Residual noted: legacy NULL FaceRecognitionLog.created_at vs non-Optional response field.
- Verified DRIFTED still queued: R2-481 (days_in_month default 26 denominator + weekly_off_days dead), R2-527 (leave id/name bucketing fallback quirks), R2-052, R2-100+315, R2-236, R2-276, R2-327r, R2-302, R2-475 slice, R2-592, R2-533+534 (chronic dispatch failure - spec in cont.3).
- Suite GREEN exit=0 at 51ecbe9. Totals: 46/94 verified, 23 live defects re-fixed, 3 D2-gated surfaced, R2-345 skipped (founder-gated). Remaining verify queue: hr F (R2-561/564/593), reports x18, procurement x9, scattered x5.

---

## Session 33 (cont. 6) — sweep: hr chunk E verified, 3 more re-fixed (2026-08-23)

- New re-fixes: R2-429 `fb3d653` (roster shows employee_code; dishonest Office/Site split relabeled to project-assignment truth per long-form - no invented backend category); R2-540 `635197f` (/timesheets/company filtered nonexistent Timesheet.company_id -> guaranteed 500; now Project.company_id join, cross-tenant test).
- Verified DRIFTED awaiting fixes: R2-481 (client-supplied days_in_month default 26 = payroll denominator; weekly_off_days zero readers), R2-527 (leave bucketing either/or null-id quirks), R2-528 (LeaveStatusUpdate.status unvalidated str + case-sensitive balance filter -> stored-but-never-counted), R2-529 (approve_timesheet never writes approved_by; submit_timesheet lacks permission gate). Sibling alarm from 540 fix: R2-447/R2-389/R2-513 may have the same nonexistent-column filter pattern - verify next.
- Sweep totals: 42/94 rows verified, 21 live defects re-fixed, suite GREEN exit=0 at 635197f. Queue: fixes R2-052, R2-100+315, R2-236, R2-276, R2-327r, R2-481+527+528+529, R2-302, R2-475 slice, R2-592, R2-533+534 (repeatedly failing dispatch); verify hr F (R2-561/564/593) + reports x18 + procurement x9 + scattered x5 + sibling alarms R2-447/389/513.

---

## Session 33 (cont. 5) — sweep: +9 re-fixed across finance/hr (2026-08-23)

- New re-fixes: R2-342+343 `141cb5c` (approve_transaction 409s double/cancelled, consults Payment Entries rule chain, stamps ApprovalAction actor+time; transactions list shows real approval_flag); R2-200 `acf7cb9`; R2-197 `5b26e8c`; R2-210/220/222/262 `5ae8c5d`; R2-354/355 `8e56f33`; R2-325/353 `a9ef700` (+migration); R2-074 `8c4c496`; R2-211 `2297ed0` (settlement vouchers reject GST server-side, form gates the field); R2-430 `29aa92e` (company attendance joined real names; was ValidationError-on-any-row).
- Verified HOLDS: R2-474 (server-derived location_verified; client flag gone).
- New DRIFTED awaiting fixes: R2-302 (site coords unvalidated: free-text lat/lng, no bounds on _parse_site_coords), R2-429 (office/site split client-only; roster lacks employee_code column -> duplicates indistinguishable), R2-475 fixable slice only (render "0m (Inside)" for unmeasured distance = fabricated; fail-open default is D7-pinned-intended, badge wording is CD-6 - do not touch those), R2-533+534 CSV importer (STILL failing dispatch - 6+ attempts, full spec in cont.3 entry).
- Suite GREEN exit=0 at 29aa92e. Sweep totals so far: 37/94 rows verified (finance 22, hr 15), 19 live defects re-fixed, 3 D2-gated surfaced (R2-033/201/352), R2-345 founder-gated skipped. Remaining queue unchanged plus new drifted trio.

---

## Session 33 (cont. 4) — sweep: hr.py 15/28 verified, 8 re-fixed, 3 gated D2 (2026-08-23)

- New re-fixes: R2-074 `8c4c496` (26 enforced permission keys audited; attendance/drawings/reports :approve made grantable via WORKFLOW_MODULES + catalogue class-test); R2-200 `acf7cb9` (sw.js build-stamped cache id, network-first HTML/RSC, /offline page replaces /login fallback; static tests honest about limits); R2-197 `5b26e8c` (ESI ceiling recomputed server-side from gross basic+HRA+allowances; client bool ignored; frontend parity); R2-210/220/222/262 `5ae8c5d` (hr punch/holiday + statutory overdue tz normalization; punch-out TypeError dead; Postgres-aware simulation via load-event listener); R2-354+355 `8e56f33` (pro-rata clamped min(1.0); payroll_month real-month validator -> 422 not 500); R2-325+353 `a9ef700` (attendance report counts both Present statuses like payroll; same-month PayrollRun re-run -> 409 naming existing run + UniqueConstraint WITH supabase migration).
- Verified HOLDS: none new in hr (all inspected rows drifted or gated).
- FOUNDER-GATED findings surfaced by the sweep (do NOT auto-fix): R2-033, R2-201, R2-352 all = DECISIONS.md **D2** (zero-attendance full-month pay policy) - register notes updated accordingly.
- Pending fixes carried: finance R2-052, R2-100+315, R2-236, R2-276, R2-327r, R2-533+534, R2-544+549, R2-592; hr R2-211 (settlement GST exposure), R2-302/429/430/474/475/481/527/528/529/540/561/564/593 unverified.
- Suite GREEN exit=0. Next: continue sweep chunks (hr D/E/F, reports x18, procurement x9, scattered x5) + pending fix queue.

---

## Session 33 (cont. 3) — orphan sweep: finance.py COMPLETE 22/32 verified, 12 live, 9 re-fixed (2026-08-22)

- New re-fixes this block: R2-344+R2-316 `bf544f6` ("transfer" payment_type dropped from schema via validator naming in/out + P2P endpoint - no product path ever wrote it; FIFO/summary now total on two values); R2-417 `c0cb9ff` (salary branch read nonexistent StaffEmployee.company_user_id -> AttributeError; now emp.name per hr.py idiom; class site reports.py:670 fixed same wave).
- Verified-HOLDS: R2-198, R2-244+R2-356 (tz class closed by f1a4c43), R2-347 (transactional log_deletion), R2-509 (=R2-726 helper), R2-550 (P2P self-transfer guard, H-miscC), R2-568.
- Confirmed DRIFTED awaiting fixes (specs recorded): R2-052 party FK repoint; R2-236 ledger sort tz; R2-100+R2-315 bank receipts never mutate accounts (Payment lacks bank_account_id; one fix closes both); R2-276 ledger silent placeholder party names (_txn_party_name exists but unused by get_ledger); R2-327 remainder (equipment bills absorbed into Material Cost + overhead actual=0.0 hardcoded); R2-342 approve path consults no rules/records no actor (+R2-343 one-liner payments list hardcodes status="Approved" :1091); R2-533+534 CSV importer (random refs no dedup, utcnow fallback, silent skips, global User.name scan); R2-544 project-less payments invisible in summary but move cash_balance; R2-549 P2P legs hardcode project_id=None (same visibility mechanism); R2-592 fabricated ||0/||100/||500 fallbacks across five frontend pages.
- NOT actionable: R2-345 explicitly founder-escalated (cross-project FIFO = product decision) - excluded from auto-fix per register note.
- Sweep score finance.py: 22 verified of 32 (R2-358 + R2-420 outstanding), 12 live defects, 9 re-fixed, 10 fix-tasks pending. Suite GREEN exit=0 after all landings. Remaining sweep queue unchanged: hr x28, reports x18, procurement x9, scattered x5.

---

## Session 33 (cont. 2) — R2-726 hotfix + R2-727 orphan-sha sweep begun (2026-08-22)

- **R2-726 FIXED `bbb6d51`** (founder-flagged CRITICAL, live): Enterprise Rollup net balance had two inverted terms (advance_paid + advance_received - to_pay - to_receive); correct expression existed at :739 (the R2-096 party balance) while the rollup sites stayed wrong - both right and wrong formulas coexisted in one file. Extracted shared `_net_balance` helper, wired all three sites; test red/green proven (-130000 -> +70000).
- **R2-727 sweep STARTED** (94 orphan-sha rows: 48C/29H/17M; list = docs/VERIFICATION_ORPHAN_ROWS.txt on founder branch). Method per founder: ancestry via merge-base --is-ancestor (not rev-parse); verify INTENT idiom-independently, never orphan-diff shapes; explore agents in 5-row micro-chunks.
  - Chunk A (finance): R2-052 DRIFTED (party FK -> users.id vs company_team.id siblings; User-name resolution w/ Unknown Party fallback), R2-053 DRIFTED->RE-FIXED b290d51, R2-100 PARTIAL DRIFT (cash half holds; bank receipts never touch accounts), R2-198 HOLDS (backend clause), R2-221 DRIFTED->RE-FIXED f1a4c43 (+class sites budget.py/bi_export.py; SQLite round-trips aware columns naive - normalize BOTH operands).
  - Chunk B (finance): R2-231 DRIFTED->RE-FIXED e9dba8b (settlement engine unreachable: UI never sends party_company_user_id so FIFO gate never fired; now scopes by company/project/direction when party absent; review gate kept; reversal intact; 4 tests). R2-235 = duplicate of R2-726 family -> fixed by bbb6d51. R2-236 DRIFTED (ledger sort mixes naive datetime.min with aware datetimes -> deterministic 500) FIX PENDING (3 dispatch attempts died). R2-238 DRIFTED->RE-FIXED 125ebfa (payment_in booked as Material Cost -590; now Settlement/Cash Movement signed by direction). R2-243 DRIFTED->RE-FIXED 2803dad (subcon double-counted material+subcon heads; reports.py sibling sites checked clean).
  - Score so far: 10 rows verified, 7 live defects found, 5 re-fixed, 2 pending fixes (R2-052, R2-100 partial, R2-236 - all with full context recorded here). Founder's sample said 1-in-5; ours is worse - the sweep was justified.
- **R2-725 addendum DONE** (`3b258eb`, `09ee4b8`): suite doc notes its RC commands are inert on campaign/waves (four cited pytest files orphaned); converted UTF-16 -> UTF-8.
- Suite GREEN (exit=0) after all sweep fixes. Register: swept rows annotated with S33 SWEEP verdicts + new commits; R2-726 row added pointing at docs/VERIFICATION_NEW_FINDINGS.md. Counts: 599 rows, TODO 217 unchanged (sweep fixes were already-FIXED rows being repaired).
- REMAINING SWEEP QUEUE (next sessions): finance C (R2-244/276/315/316/327) + part 2 (R2-342..592, 16 rows), hr x28 (chunks of 5), reports x18, procurement x9, scattered (R2-398 billing, R2-406 settings page, R2-420 finance page, R2-310 delete-logs page, R2-590 quality page). Pending fixes first: R2-052 (party FK repoint, may need additive migration), R2-236 (sort tz), R2-100 (bank account mutation). Central pins sets B/C still pending.

---

## Session 33 (continued) — verification-pass fixes R2-721/722/723 + suite green (2026-08-22)

- Adopted the founder's five follow-ups. R2-725 DONE by orchestrator: docs/AUDIT_REGRESSION_SUITE.md restored from orphan 27fab37 (`d0b40cb`) — RC citations in 93 FIX_VERIFIED rows now resolve; ids never defined anywhere stay honestly undefined. Red-test risk named per founder: ALL FOUR classified category (a) stale bookkeeping with per-test evidence recorded in START_HERE (live code read directly: three_way.py:14/145 tolerance intact; settings.py:620/674 mobile reads intact) — none mirrors drifted code.
- R2-723 FIXED `55af851` (H-cancelsweep): shared backend/app/bill_scope.py `_active_bills` helper; LIVE-CODE TRUTH corrected the doc's site list — 5 unguarded fixed (budget tower branch ×2, towers ×2, bi_export equipment actual); budget.py:86/98/108 were already guarded by R2-233's chain; full census of all guarded sites across finance/analytics/reports/billing/budgeting/projects/tally logged. Test added.
- R2-721 FIXED `25cdada` (H-statutory-gate): report_type Literal allowlist + case normalization (PF/Esi/BOCW/TDS all work, xyz→422). BONUS catch: StatutoryReport had NO due_date column — every POST /statutory was a 500; nullable column added via boot schema-sync (columns safe per founder note). Siblings noted: pt/it allowed per UI dropdown semantics (no derived due date); export_gstr1's hardcoded "gst" unreachable.
- R2-722 FIXED `80e5065` (H-auth-demo): OTP_DEMO_ALLOWLIST/OTP_DEMO_CODE defaults → "" (unset env disables known credential); _seed_demo_projects one-time guard (repeated demo logins can't re-seed); feature retained pending D6. Follow-up: 5 existing OTP tests re-pinned to explicit settings (`3f014c6`).
- Suite brought GREEN: 11 reds at start of this block → 0. All were category (a): 5 demo-path tests orphaned by the default change; prompt7 cost-code fixture (R2-334 gate); pins R2_036/R2_045_066 broken by R2-723's own helper refactor (filter moved to bill_scope.py — intent pinned at its new home), R2_067 approval_flag seeds, R2_134/R2_405 substring drift. Fixups: `6df8303`, `70de4ce`, `3f014c6`. Full pytest exit=0; npm build green earlier in session.
- Register: +3 rows R2-721/722/723 marked FIXED pointing at docs/VERIFICATION_NEW_FINDINGS.md. Counts: 598 rows = FIXED 286 + FIX_VERIFIED 93 + RETRACTED 1 + WONTFIX 1 + TODO 217 (CRITICAL 102 · HIGH 104 · MEDIUM 10 · LOW 1).
- STILL PENDING (next session, in order): (1) central pin collection for S33 closures — 19-pin spec written, 3 dispatch attempts died, spec preserved in prior log entry + this one's pin list; (2) R2-280 (paint openings guard; brick half done via 649476b) and R2-519 (client M7.5 factor 4.0→3.41 port; engine deletion CD-2-gated); (3) Phase H remainder ~97 + siblings R2-602..614 (W09 d/home ×10 biggest); (4) EMAIL_OTP_DEMO_ALLOWLIST default "demo@siteflow.co" same-class as R2-722 half-A.

---

## Session 33 — Phase H batch 1: six clusters, 40 closes (worktree mode) (2026-08-22)

- RESUMED per handoff; adopted 4 process notes from the founder's independent live-verification pass (docs/VERIFICATION_NEW_FINDINGS.md on claude/siteflow-live-verification-dba0f1): (1) model-level UniqueConstraints/Indexes NEVER reach prod (create_all only makes tables; boot sync only adds columns) — any wave adding one ships a supabase migration [honored: R2-594 dedupe constraint+migration, R2-334 width migration, R2-377 lifecycle-columns migration]; (2) never overclaim pin strength — pins are mostly substring asserts; wording corrected in docs; (3) scope fixes to the DEFECT CLASS, not the named file/line — class-sweep rule added to every coder brief this session; (4) every disclosed sibling gets a filed id → R2-602..R2-614 filed.
- Batch mode with 6 wave-clusters (42 findings): H-budget ×9, H-budgeting ×7, H-billing ×9, H-analytics ×5, H-calculators ×5, H-3way-settings ×7. LANDED 40/42: analytics R2-305 f0bd000, R2-329 5b178e4, R2-498 6726e1b (+R2-306/R2-499 evidence); budget R2-152 dfca772, R2-153 b9c0a20, R2-233 5c0ef9b, R2-249 57e5a7d (+R2-151/237/242/250/375 evidence); budgeting R2-274 c7c2828, R2-275 fbc3f20, R2-334 3175e8b, R2-449 4df11c2, R2-450 9be3e98, R2-451 a73965f, R2-453 c2af10a (7/7); billing R2-177 ff20153, R2-346 bdec878, R2-377 21c681d, R2-381 e2ae07e, R2-400 54db876, R2-401 2be273f, R2-403 4e71ebb, R2-480 518afa5 (+R2-350 evidence); calculators R2-279 649476b, R2-281+R2-520 8798662; 3way-settings R2-241 5c73713, R2-349 1961a62, R2-539 a76823c, R2-594 1fb4a64, R2-390 6e58eec, R2-404 ac9c310 (+R2-546 evidence tripwire).
- **INFRA INCIDENT:** subagent dispatches failed ~50%+ ("empty" completions that did nothing, or stalled mid-work; one died on API connect errors). Recovery pattern that worked: compact SINGLE-finding prompts, inline fix sketches from the long-form, immediate retries, and verifying via git log after EVERY dispatch — at least two "empty" agents actually completed work silently (the three-way test alignment + a register/bookkeeping pass whose output I audited hash-by-hash before keeping). R2-280 and R2-519 each failed 2-5 dispatches and remain TODO (sketches: reg L12310 = bound paint openings < wall area + non-negative guard, brick half already closed by 649476b; reg L26418 = client M7.5 factor 4.0→3.41 port, engine deletion itself is CD-2-gated).
- Verification: full pytest found 8 reds → three-way trio fixed + green (commit `6df8303`); FOUR REDS REMAIN by wrap (all test-contract staleness, NOT product bugs — next session's first fixup, exact data): test_prompt7_features.py:119 needs LibraryCostCode seeds for 1.1/1.2 (R2-334 gate); pin R2_067 seeds need approval_flag='approved' (R2-233 filter); pin R2_134 re-pin to server-computed verdict shape; pin R2_405 '.first().mobile' substring gone after R2-390 rewrite. npm build GREEN. Central pin collection for this session's fixes PENDING (suggestions below).
- Pin suggestions collected (substring/behavior, add centrally next session): R2-153 expense-bucket count≥3 in get_committed_costs; R2-152 no db.commit/db.add in GET committed fn; R2-274 revision previous_amount derivation string; R2-275 milestone_done>total→400; R2-334 import unknown cost_code→400 atomic; R2-449 PATCH amount==qty*(rate+supply+install), DELETE→204 then 404; R2-451 composite rate never double-counted (amount==2000 for rate1000+600/400 split qty2); R2-453 fake-xlsx→400; R2-177 wo.status="cancelled" path exists; R2-346 pending bill + payment stays Unpaid zero-settlements; R2-377 release stamps released_at/released_amount + gate 409/422s; R2-381 backdated payment→400 under restrict window; R2-400 userless-vendor PDF prints LibraryParty.name; R2-401 sale+items_json:null→422, lines≠subtotal→422; R2-403 PDF contains GSTIN bytes; R2-480 settings copy free of 'pending a later round'/'Enforcement gap'/column names; R2-249 towers committed==PO-sum ≠ budget; R2-279 leaves-from-thickness + mortar-band guard strings; R2-281/520 wastage scales cement/sand/aggregate ×1.05 exactly.
- Register: 40 rows TODO→FIXED (hashes verified against git log row-by-row), siblings R2-602..R2-614 appended (`8e933d0`). Counts recomputed: rows 595 = FIXED 283 + FIX_VERIFIED 93 + RETRACTED 1 + WONTFIX 1 + TODO 217 (CRITICAL 102 · HIGH 104 · MEDIUM 10 · LOW 1). WORKLIST Phase H section updated (91/188; remaining ~97 + siblings).
- Next session: (1) fixup agent for the 4 known-red tests; (2) central pin collection (list above); (3) redispatch R2-280 + R2-519 with inline sketches; (4) continue Phase H remainder — W09 d/home cluster ×10 (R2-161/163/395/397/463/466/483/484/485/516), labour.py ×4, finance.py ×3, procurement.py ×5, equipment.py ×4, UNMAPPED ×8, then scattered singles; (5) keep single-finding compact dispatch shape until subagent infra stabilizes.

---

## Session 32 (continued) — documentation overhaul + context handoff prep (2026-08-16)

- Action: START_HERE.md fully rewritten with current numbers (244 TODO, 336 closed), phase progress tracker, batch-mode protocol, and a "How to resume" checklist for new sessions. WORKLIST.md updated with Phase H progress (51/188 done, remaining clusters mapped). All audit docs verified consistent.
- The campaign moved to worktree mode (`siteflow-waves`, branch `campaign/waves`) due to concurrent activity in the main checkout. Pushes go via `git push origin campaign/waves:main`.
- Final state: 336 closed (93 FIX_VERIFIED + 243 FIXED) · 244 TODO · CRITICAL 102 / HIGH 137 / MEDIUM 5 / LOW 0. Register: 582 rows, statuses sum exactly. pytest green. npm build green. Tree clean. All pushed.
- **FOR THE NEXT SESSION:** Read `audit/START_HERE.md` first — it has the full resume checklist, current numbers, phase progress, and the batch-mode protocol. Then read `audit/SESSION_LOG.md` last entry and `audit/WORKLIST.md` PHASES section. The next work is Phase H remainder (~137 HIGHs) starting with budget.py/budgeting.py (~16), billing.py (~9), then the scattered frontend/misc HIGHs.

---

## Session 32 — Phase M COMPLETE (rounds 5-6, worktree mode, 64 findings) (2026-08-16)

- Round 5 (5 parallel waves, 15 closes + 1 needs-decision): W14 auth (R2-183 GSTIN checksum on onboarding; R2-191 evidence — CompanyTeam unique constraint, bundled in b4c0a37), W83 production (R2-206 wastage_type enum + reported_by server-derived + estimated_value from PO rate + migration; R2-207 recipe allowance applied), W41 team_schedule (R2-225 timesheet save surfaces errors; R2-261 duplicate-DPR 409), W18 quality (R2-247 caller-derived identities; R2-361 dead Quotation model removed), W02 remainder (R2-282 steel dual-set 422; R2-508 LTIF basis param; R2-537 log_deletion no-commit at 30 call sites; evidence: R2-118/218/500/501; R2-125 -> D4).
- Round 6 (5 parallel waves, 49 closes): M-A (R2-004/521/134/154/159/269/273/293/295/331), M-B (R2-358 evidence + R2-367/376/379/398/495 evidence/504/512/535/553), M-C (R2-555/558/088/217/278/077/056/082), M-D (R2-078/103/124/208/402/406 evidence/420/436/446/460), M-E (R2-144/162/164/467/472/486/493/518 evidence/563/596/600).
- **PHASE M COMPLETE: all 121 non-gated MEDIUMs closed.** Remaining MEDIUMs (5) are founder-gated: R2-010 (CD-2), R2-030 (D5), R2-125 (D4), R2-319 (D4), R2-385 (CD-9).
- Batch verification caught 5 issues, all fixed in follow-ups: R2-461's CPM `datetime - float` TypeError; R2-573's naive-local-as-UTC validator; R2-124's dangling JSX closers (build breaker); R2-467's missing approvalStatus on the local revision object; R2-078's stale setNotifOpen; R2-398's CSV cell `.replace` on `{}`. Plus one stale test updated (R2-367's approval_status pending is now valid by contract).
- Pins: 37 -> 147 (110 added across 6 rounds). Full suite green every round; npm build green at the end.
- Sweep-interleaving incidents logged: b2ddf1f/e59316f/8025709 swept other waves' staged files into their commits (content verified intact; no amendment to avoid rewriting concurrent history).
- Register: 192 FIXED + 93 FIX_VERIFIED + 1 RETRACTED + 1 WONTFIX + 295 TODO (CRITICAL 102 · HIGH 188 · MEDIUM 5).
- Next: **Phase H begins** — 188 HIGHs (minus gated), wave order per WORKLIST. Founder-gated set unchanged: D1-D7, CD-1..CD-10, D-008/010/011/012/013.

---

## Session 31 — Phase M round 2: W15+W08+W06+W12+W11 (worktree mode) (2026-08-16)

- CONTEXT: the main checkout had ~460 uncommitted files from the founder's other agent, so this session moved the campaign into an isolated worktree (`C:\Users\Dell\AppData\Local\Temp\opencode\siteflow-waves`, branch `campaign/waves`) and pushed results to main via `git push origin campaign/waves:main`.
- Round 2 (5 parallel waves, 16 findings): W15 models 4/5 FIXED (R2-277, R2-373 + additive indent-approval migration, R2-378, R2-411; R2-385 → CD-9 needs-decision), W08 analytics 3/3 (R2-089 status buckets, R2-309 Sentry release tracking, R2-496 fmtINR on three-way), W06 settings 3/3 (R2-115 no demo-INSERT-on-GET, R2-290 GSTIN+breakup validation, R2-548 schema bounds), W12 statutory 3/3 (R2-129 due dates 15th/7th following month, R2-130 invented penalty formula deleted, R2-505 evidence), W11 remainder 2/2 (R2-461 inclusive end dates, R2-566 client status honored).
- Two regression catches during central verification, both fixed in follow-up commits: (a) the R2-461 commit broke the CPM backward pass (`datetime - float` TypeError) — fixed with a timedelta (`664b430`); (b) the R2-573 received_date validator treated naive local times as UTC, rejecting any local-clock "now" (IST) as future — fixed to interpret naive as local (`2a30c96`). Both failures were caught by the existing test suite (the regression-pins + behavior tests did their job).
- Central pins: 37 → 66 (+29 pins covering both Phase M batches), pins run green.
- Verified: pytest tests/coverage/ FULL SUITE rc=0; npm build green in the worktree (fresh npm install, 2m).
- Commits on campaign/waves (round 2): `bdaa883`, `80f6409`, `438ec20`, `fac73c8`, `87b15ad`, `94988a2`, `43fe151`, `093fd10`, `582d215`, `6e2f696`, `551831e`, `b298269`, `3e980de`, `5847922`, `664b430`, `2a30c96`, `7165dca` (pins), docs commit.
- Register: 16 rows updated (15 FIXED + R2-385 TODO/CD-9). Counts: TODO 381 (CRITICAL 102 · HIGH 188 · MEDIUM 91 · LOW 0), FIXED 106.
- Siblings logged (report-only): dpr.py writes non-canonical `in_progress`; gantt form sends `pending` status; export_pf_ecr due-date string same-month; LibraryRetention unreferenced; billing page local fmtINR shadow; UI max=6 vs backend cap 4 on number formats; Residual demo-construction chain in layout/Sidebar/projects (cosmetic).
- Next: Phase M round 3 — W22 safety (3), W35 files (3), W10 projects (3), W07 billing (3), then W79/W82/W19/W46/W17/W31/W14/W83/W41/W18 (2 each) and the W02 remainder (8). Founder-gated: CD-1..CD-9 + D1..D7.

---

## Session 30 — Phase M batch 1: W36+W23+W05+W11 (docs registered; code waves landed) (2026-08-16)

- Batch mode (founder request: fix more per pass): dispatched 4 parallel waves — W36 bi_export (4), W23 finance page (3), W05 procurement (6), W11 planning (4). Landed: **W36 4/4, W23 3/3, W05 6/6, W11 2/4** (R2-136, R2-255; R2-461, R2-566 still TODO — redispatch later). All wave commits verified by each wave's own review pass; central pins + batch pytest/npm build were DEFERRED (see the tree-state note).
- **TREE-STATE ALERT (important):** the working tree now contains ~180 uncommitted modified files (marketing content, blogs, help, migrations, libs, several routers/tests) that are NOT from this campaign, plus five committed W02 fixes (R2-117, R2-119, R2-190, R2-213, R2-268) that this session did not dispatch — the founder's other agent is evidently working in the same checkout. **All code work and further commits are PAUSED until the tree settles or the founder confirms ownership.** This session only committed `audit/` files (register, DECISIONS, WORKLIST, session log) — no code files were staged.
- Registered: 20 findings → FIXED (15 from our waves + 5 from the other agent's committed W02 work): R2-045, R2-066, R2-193, R2-251 (W36); R2-071, R2-072, R2-428 (W23, 428 evidence-close via cd01b15); R2-298, R2-336, R2-341, R2-351, R2-572, R2-573 (W05); R2-136, R2-255 (W11); R2-117, R2-119, R2-190, R2-213, R2-268 (W02, other agent's commits).
- Needs-decision logged: CD-7 (RFQ has no "sent" writer — gates R2-298's remaining half) and CD-8 (PO close/cancel transition doesn't exist — gates R2-341's remaining half) added to DECISIONS.md.
- Siblings logged (report-only, not fixed): finance Pending Entries toolbar button dead; dashboard Copy Key dead; `create_transaction` still overwrites inventory unit; IndentCreateRequest.items and RFQ items lack min_length; POCreateRequest.po_date accepts future dates; BI CSV formula-injection (R2-185 class) noted.
- Commits (campaign waves, already in history): `ea0ee87`, `650077a` (W23); `b70ebac`, `07764bc`, `b8e837b` (W36 — note: an absorbed intermediate `48bd6d1` with the R2-045/066 message also contains the R2-193 change; final tree is correct, history cleanup deferred); `04b7c10`, `9906aa9`, `57f78de`, `53b9499`, `4d85244`, `00427eb` (W05); `048f72f`, `bd1c9f7` (W11).
- Next (when the tree is clean): add the collected pins centrally, run batch pytest + npm build, redispatch W11's remaining two (R2-461, R2-566) plus the next Phase M waves (W15 models, W08 analytics, W06 settings).

---

## Session 29 — Phase L wave L4 — PHASE L COMPLETE (2026-08-16)

- Action 1 (Phase L, wave L4): R2-085 closed by evidence — the "PHASE 14" analytics eyebrow was already removed by R2-023 (`6ef2cc8`); verified zero `PHASE 1[0-9]`/`Phase 1[0-9]` across frontend/src (ZATCA "Phase 1" untouched, legitimate). Pinned.
- Action 2 (Phase L, wave L4): R2-120 — the Integrations page's wrong "Payroll tab (HR)" instruction now says "Payroll Runs tab (HR)" (same in the export-flow copy), and the missing fifth integration — Tally — gained a card with a real status fetch (strict boolean `connected` gate, no fabrication) and a verified deep link to Finance → Tally Sync.
- **PHASE L COMPLETE: 8/8 LOWs closed.** Phase exit condition met: pytest 254/254 rc=0 (247 behavior + 37 pins), npm build green, counts recomputed from the register, pushed to main.
- Verified: verifier APPROVE (Tally card structure mirrors siblings, effect deps clean, deep-link tab verified in the finance allowlist, pins byte-exact, tree clean).
- Commits: `06cde63` (R2-120 + 2 pins). R2-085 closed via evidence (`6ef2cc8`).
- Register: R2-085, R2-120 STATUS TODO → FIXED. LOW bucket: 0 remaining.
- Next session: **Phase M begins** — MEDIUM (126, minus gated), wave order per WORKLIST: start with the largest clusters (W02: 13, W09: 6, W05: 6, W15: 5).

---

## Session 28 — Phase L wave L3 (2026-08-16)

- Action 1 (Phase L, wave L3): R2-057 — the Gantt predecessor-link handler reported every non-2xx as "Link loop detected"; it now reads the server detail and reserves the loop message for the backend's cycle 400 (detail contains "circular"), surfacing the real error otherwise (401/403/404/500 included).
- Action 2 (Phase L, wave L3): R2-070 — the indent card's hidden file input (local-only objectURL preview that was never uploaded or revoked) is removed; the "View item photo proof" button stays (genuine server-URL preview). Upload wiring remains the deferred proper fix.
- Incident handled: a stray working-tree modification deleted the committed LEARNINGS.md #17 lesson mid-session (origin unknown — likely an editor/process touch); restored via checkout, committed state was intact, tree clean afterwards.
- Verified: npm build green (33.9s + 39.9s TS); pytest 252 rc=0 (247 behavior + 35 pins); verifier APPROVE on all three (backend cycle-message cross-check, remaining setPreviewUrl sites legitimate, pins byte-exact).
- Commits: `b9a08e6` (R2-057), `dd0ed9a` (R2-070), `70fbd2d` (pins).
- Register: R2-057, R2-070 STATUS TODO → FIXED. Phase L progress: 6 of 8 done.
- Next session: Phase L wave L4 (final LOW wave) — R2-085 (analytics.py internal labels) + R2-120 (google_drive.py).

---

## Session 27 — Phase L wave L2 (2026-08-15)

- Action 1 (Phase L, wave L2): R2-001 closed by evidence — the "Material (Pending)" card opens a fully functional Material Requests drawer (real indents, status tabs, filters, working Approve with POST+refetch+toast); the audit's "dead card" premise predates the drawer's onClick. Verifier confirmed functionality and the single usage site. Register note records the primary-file misattribution (payment-approval vs d/home).
- Action 2 (Phase L, wave L2): R2-104 — the Tally Sync "Last export"/"Last marked synced" summaries are now derived from the sync-log rows the same panel fetches (max exported_at / marked_synced_at, empty-guarded), fixing the live "Not yet" vs history contradiction that invited duplicate Tally exports.
- Verified: npm build green (46s + 56s TS); pytest 250 rc=0 (247 behavior + 33 pins); verifier APPROVE (fetch restructure, untouched mark-synced POST path, pins byte-exact, R2-001 evidence verdict sound).
- Commits: `a99e206` (R2-104 + 2 pins). R2-001 closed without code.
- Register: R2-001, R2-104 STATUS TODO → FIXED. Phase L progress: 4 of 8 done.
- Next session: Phase L wave L3 — R2-057 (gantt) + R2-070 (procurement photo preview).

---

## Session 26 — Phase L wave L1 (2026-08-15)

- Action 0: logged the phased execution strategy into WORKLIST.md (phases L/M/H/C/G/V, interconnection rules, non-regression guarantees, logging policy, concrete wave queue) per the founder's instruction to document the strategy before executing.
- Action 1 (Phase L, wave L1): R2-002 — the last four console emoji (📝 MOM, ✅ To Do, 💬 Chat in the Sidebar; ⬆️ Export in reports/[slug]) replaced with existing stroke icons (`note`, `check`, `chat_bubble`, `arrow_up`); full-range emoji scan = 0 remaining; codepoint-based pin added (covers the U+FE0F variation-selector form).
- Action 2 (Phase L, wave L1): R2-079 — the fabricated "demo-construction" fallback chain in PageHeader (and the disagreeing demo-UUID default in reports/page.tsx) replaced with an honest /login redirect on a missing company_id; loop-analysis: PageHeader has exactly one usage site (c/[company_id]/layout.tsx), so the redirect cannot fire on /login; greps = 0; pin added.
- Verified: npm build green (55s + 36.4s TS); pytest 248 rc=0 (247 behavior + 31 pins); verifier APPROVE on all three commits (icon names verified in the type union, loop analysis, handleLogout untouched, pins correctly scoped).
- Commits: `807f092` (R2-002), `a1d639b` (R2-079), `da76f31` (pins).
- Register: R2-002, R2-079 STATUS TODO → FIXED. Phase L progress: 2 of 8 done.
- Next session: Phase L wave L2 — R2-001 (payment-approval) + R2-104 (finance page).

---

## Session 25 — the system docs + the face-recognition wave (2026-08-15)

- Action 0 (founder request: "maintain all findings, learnings, state so resuming is easy and regressions never repeat"): completed the documentation system — `audit/LEARNINGS.md` (16 consolidated lessons, incl. the two regression incidents and the verification-beats-register rule), `audit/WORKLIST.md` (the map of all 582: status summary, the 14 founder-gated findings with their decision IDs, the 413-fixable queue by wave with the notable CRITICALs, evidence-close candidates, working rules), and START_HERE now points at both plus DECISIONS.md. The full 582 triage was computed programmatically from the register.
- Action 1: applied the face-recognition wave (R2-027, R2-086, R2-307 — CRITICAL ×3, one root cause, Sentry-proven). `FaceRecognitionLog` had no `created_at` column while four query sites and the response model required it — every endpoint 500'd, the POST committed-then-failed (punches stored but unreadable), and the frontend's `if (res.ok)` with no else rendered it as an empty module. Added the nullable column (no false timestamps on legacy rows), `.nulls_last()` ordering, an additive prod migration, honest load-error states on the page (the R2-137 instance), a behavior test, and two pins. CORRECTION recorded: the face endpoints ARE auth-gated (router-level dependency) — the audit's "no auth" claim was wrong.
- Verified: pytest 246 rc=0 (243 + 1 test + 2 pins; 29 pins total); npm build green (36.6s + 38.8s TS); verifier APPROVE on both commits incl. the auth-claim verdict and the midnight-crossing test-flake note.
- Commits: `97f4eb4` (R2-027/086/307), `f30fffe` (R2-137 page instance).
- Register: R2-027, R2-086, R2-307 STATUS TODO → FIXED; R2-137 keeps TODO (class open) with the instance closure noted.
- Next session: W12 statutory.py (6 CRITICALs incl. the R2-127 any()-guard class), W16 three_way.py (4 CRITICALs), or W08 analytics (R2-080 backend asleep / R2-081). R2-178 + the D-set still await the founder (DECISIONS.md).

---

## Session 24 — the regression guard + R2-098 (2026-08-15)

- Context (founder-raised): "this regressions thing is pretty serious" — and it is. Two FIX_VERIFIED findings were silently reintroduced by parallel-branch merges: R2-096's party-balance formula (found in session 23) and — discovered this session — R2-054's PR-number collision loop (plain `count + 1` again, reintroduced by the same Finance rebuild that won the merge). Pattern confirmed: without tests pinning the fix, a merge can re-break anything.
- Action 1: created `backend/tests/coverage/test_regression_pins.py` — 27 tripwire tests that read the CURRENT sources and fail loudly, naming the finding, if any closed fix regresses: formula shapes (R2-096 balance, R2-035 progress read), allowlist membership (R2-011 party types, R2-036 bucket filters ×5 sites), loop presence (R2-098 PID, R2-054 PR), vocabulary (R2-031 ongoing, R2-106 geofence assignment ×2), and fabrication absence (repo-wide `unsplash` = 0, `.xlsx`, frozen dates, `basic * 0.24`, `12.9716`, Acme Corp, defaultValue ban in d/hr). START_HERE now carries the regression-guard rule: pins must go green every session and every new fix adds a pin.
- Action 2: applied R2-098 (library.py, MEDIUM) — the party PID generator now uses the GRN-canonical collision loop (no more PID reissues/skips); test added (PID-4 gap → auto-create lands PID-5). The R2-054 regression was restored in the same commit (finance.py PR loop).
- Verified: pytest 243 rc=0 (216 behavior + 27 pins); verifier APPROVE on the pins file (8 pins spot-checked by hand, weak-pin analysis done — R2-044/107/013 strengthened in a follow-up) and on the R2-098/054 commit (test status-code assert verified against the endpoint).
- Commits: `551cd53` (pins), `6e43ff0` (R2-098 + R2-054 restore), `ed78914` (pins strengthen).
- Register: R2-098 STATUS TODO → FIXED; R2-054 Notes updated (regression documented).
- Deferred notes: DB-level unique constraint on party_id_custom + blank backfill (schema work — DECISIONS.md); R2-044 pin thresholds assume the import stays one line (safe direction).
- Next session: R2-071 (work-order terms innerHTML, MEDIUM), R2-099 (W27 finance all-zero, CRITICAL — R2-198/R2-221 family), R2-100-family rollups. R2-178 still awaits the founder (DECISIONS.md CD-1).

---

## Session 23 — fixes 59, 60 and 61 + a regressed-fix restoration (2026-08-15)

- Action 1: R2-096 (finance.py) — the register said FIX_VERIFIED (d4db32f), but the code had REGRESSED: commit `f8c097f` (a parallel-branch Finance rebuild based before d4db32f) reintroduced the wrong balance formula and the to_pay-first status ladder. Restored the audit-correct formula (live case +54,400 "To Receive" instead of −1,01,600 "TO PAY") and derived status from the net sign per the audit's suggestion; test `test_party_balance_nets_receivables_and_payables` added (215/215). Lesson logged: verification greps beat register trust — always re-read the code.
- Action 2: R2-069 (finance page, HIGH) — the payment attachment control stored only a filename with a paperclip "attached" affordance; relabeled "Reference / document name (file is not uploaded)", paperclip removed.
- Action 3: R2-094 (procurement, MEDIUM) — "Log Usage -" label fixed and `handleRecordUsage` now POSTs to /procurement/transactions (2xx-gated, honest alerts); the same wave converted the GRN handler off the identical local-only fake-success class (verifier approved the in-wave extension).
- Action 4: R2-095 (procurement, LOW) — honest empty states for the Indent/Inventory/Ledger tabs; "(Stock Contextual)" internal phrasing removed from the heading.
- Verified: npm run build green (30.8s + 47s TS); pytest 215 rc=0; verifier APPROVE on all four (incl. hand-math on the balance, the GRN-extension verdict, colSpan counts).
- Commits: `f5da315` (R2-096), `a07d1e2` (R2-069), `2525cab` (R2-094), `6111efe` (R2-095).
- Register: R2-069, R2-094, R2-095 STATUS TODO → FIXED; R2-096 Notes updated (regression documented, hash appended; status stays FIX_VERIFIED).
- Notes logged: dead statusChip branch (finance:1255); usage transactions lose the free-text reference (source_ref_id is UUID-typed); test seeds use non-existent project ids (latent FK, SQLite-off).
- Next session: R2-098 (party custom IDs duplicate/skip — W02 UNMAPPED, backend library.py, decision-free: per-company sequence + unique constraint + backfill), R2-071 (work-order terms innerHTML, MEDIUM), R2-099 (W27 finance, CRITICAL — root cause now known to be R2-198/R2-221 family). R2-178 still awaits the founder (DECISIONS.md CD-1).

---

## Session 22 — fixes 50–58 (procurement wave + attendance + drawings, 2026-08-15)

- Action 1: applied R2-050 + R2-090 (W38, CRITICAL ×2) — procurement approval buttons no longer mark themselves approved regardless of the server (the unconditional state patch that made a 403 look like APPROVED/SENT, live-proven in R2-090). Both handlers now alert the server detail on non-2xx and refetch on success.
- Action 2: applied R2-051 (W38, CRITICAL) — GRNs now POST real PO item ids instead of `placeholder-N` (the restructure also fixed a latent re-index bug in the checked/qty lookups), and the fabricated PO/Indent numbers (`PO-2026-043`, auto-increment) are gone — user-entered with required inputs.
- Action 3: applied R2-091 (W55, CRITICAL) — every hardcoded material list in procurement now comes from the real material library; empty-row defaults and "Select Material" placeholders.
- Action 4: applied R2-068 + R2-093 (W39/W55, CRITICAL+HIGH) — all fabricated photo-evidence controls removed (indent photo button, GRN gate file input that discarded the file, subcon crew-photo buttons); the GRN input now keeps a real local preview; `unsplash` = 0 repo-wide. The rfq page's own fabrications (seed number, item seed, caption) went with it — R2-092's remaining scope closed.
- Action 5: applied R2-108 (W02, MEDIUM) — duplicate-employee creation warns (confirm gate) and attendance pickers disambiguate with the real `employee_code` (a follow-up commit fixed the first attempt reading a nonexistent `emp.code` field — the verifier caught it).
- Action 6: closed R2-009's remaining scope (drawings Project Files tab still shipped 3 unsplash photos + 47 phantom files) — `SITE_PHOTOS`/`FOLDERS` consts and their render blocks removed, honest empty state; the canonical's premature "FIXED by cd01b15" is now annotated with the real closer `769ba9b`.
- Verified: npm run build green (3 builds this session); verifier APPROVE on all 7 commits incl. the GRN index-alignment verdict (coder's re-index claim correct) and the R2-009 register-discrepancy catch.
- Commits: `fe3db93` (R2-050/090), `2d97459` (R2-051), `ab50c9d` (R2-091), `401cf1e` (R2-068/093/092-rfq), `a2a6566` + `50a0701` (R2-108), `769ba9b` (R2-009).
- Register: R2-050, R2-051, R2-068, R2-090, R2-091, R2-092, R2-093, R2-108 STATUS TODO → FIXED.
- Follow-ups logged: handleCreatePO + GRN handler still have fake-optimistic local patches; gatePhotoUrl objectURL not persisted server-side (real upload wiring deferred); material selects lack `required`; existing duplicate employees not merged (decision if wanted).
- Next session: R2-094 (W38 "Log Usage" dead button, MEDIUM), R2-095 (W38 empty-state tabs, LOW), R2-069 (W23 finance page, HIGH), R2-096 (party ledger sign inversion, HIGH). R2-178 still awaits the founder (DECISIONS.md CD-1).

---

## Session 21 — fixes 48 and 49, two evidence-closes (2026-08-15, resumed)

- Action 1: applied R2-168's last site (W29 d/hr page, HIGH). The bounded five-site hardcoded-date sweep is now fully closed: this session fixed `payrollMonth` — the payroll screen defaulted to "2026-06" (the previous month, payroll-affecting) and now defaults to the current month (`new Date().toISOString().slice(0, 7)`).
- Action 2: applied R2-111's remaining half (W97, HIGH). The workforce save was already wired by R2-013; this session replaced both fabricated Cost Code dropdowns (hardcoded C-101/C-204/C-509) with the real cost-code module (GET /apis/v3/library/cost-codes/{companyId}, rendered `{code} ({name})`).
- Action 3: closed R2-110 (CRITICAL) and R2-167 (HIGH) with evidence — both are re-filings of defects already fixed: R2-110 is the holiday-calendar local-only/seed defect (fixed by the R2-013/R2-019 wave; verified in tree: no Diwali seed, fetchHolidays + handleDeleteHoliday wired), R2-167 is the hardcoded attendance date (fixed by R2-107; verified in tree: date defaults to today).
- Verified: npm run build green (76s + 71s TS); verifier APPROVE on both commits (consumers format-consistent, fetch isolation, zero hardcoded cost-code strings remaining). pytest not needed (frontend-only wave).
- Commits: `99d9287` (R2-168), `a0ceefb` (R2-111). R2-110/R2-167 closed via earlier commits (`45ffb76`/`820717b`, `7ffa1c9`).
- Register: R2-110, R2-111, R2-167, R2-168 STATUS TODO → FIXED.
- Follow-ups logged: R2-168-bis (`daysInMonth` hardcoded 26 vs dynamic month — a February run would report 26 days); R2-111-bis (workforce POST lacks cost_code_id — backend field needed to persist the now-real selection).
- Next session: R2-108 (duplicate-employee guard, decision-free: warn rather than block + disambiguate dropdown labels), R2-030 (blocked by D5), R2-024 (blocked by D6), R2-050/090 family (approvals ignore the server — D7 adjacent). R2-178 still awaits the founder (DECISIONS.md CD-1).

---

## Session 20 — fixes 46 and 47, one retraction, one counts correction (2026-08-15)

- Action 1: applied R2-106 (W28, CRITICAL) — the "Simulate GPS lock (On-Site)" checkbox (default ON) is deleted; `location_verified` is now derived server-side from the geofence comparison in BOTH punch directions (the coder found the punch-out path also read the client value — unmentioned in the audit) and client-supplied values are ignored. The "Location verified:" claim is out of the notes, the label is "GPS coordinates captured". Test `test_punch_location_verified_derived_from_geofence` proves both directions (inside + client false → true; far outside + client true → false).
- Action 2: applied R2-003 (W49, MEDIUM) — the delete-logs filter's entity list now matches the 29 entity types the backend actually writes (enumerated from every log_deletion call site); the permanently-dead `lead`/`workorder` options are gone.
- Action 3: R2-063-bis/ter — the `is_code_reference || "IS 456:2000"` and `category || "Concrete"` fabrications now render the em-dash empty glyph (byte-verified U+2014) after a verifier rejection of the first attempt (ASCII hyphen misapplied the no-em-dash prose rule to a display glyph).
- Action 4: RETRACTED R2-109 — it is an exact duplicate of R2-032 (same formula, same line, same ₹55,440 repro) already closed by `261bd41`.
- Correction: the previous session's START_HERE FIXED/severity numbers were recomputed from the register — FIXED is 42 (not 45), and the severity split is CRITICAL 114 · HIGH 193 · MEDIUM 130 · LOW 9; the register (582 rows, statuses summing to 582) is authoritative for all future counting.
- Verified: pytest tests/coverage/ 214 passed rc=0 (213 + 1 new; rbac + domain-fixes files re-run together); npm run build green (49s + 77s, then 41s + 71s after the glyph fix); verifier APPROVE on A/B and the glyph re-fix.
- Commits: `3a559d9` (R2-106), `4d27bcd` (R2-003), `75a98b3` + `b711a57` (R2-063 bis/ter).
- Register: R2-003, R2-106 STATUS TODO → FIXED; R2-109 STATUS TODO → RETRACTED (duplicate of R2-032).
- Notes logged: `PunchRequest.location_verified` is dead schema (future removal candidate); "Geofence: Active" badge kept; quality mapping lines landed at column 0 (indent regression, valid JS — restore on a future touch); `material: t.material || "Concrete"` in the lab-test mapping is the same class (follow-up).
- Next session: R2-110 (W29 hr holidays local-only — sibling of R2-019, likely already fixed by it), R2-167 (W28 attendance), R2-030 (blocked by D5). R2-178 still awaits the founder.

---

## Session 19 — fixes 38, 39, 40, 41, 42, 43, 44 and 45 (2026-08-15)

- Action 1: applied R2-067 (W13 budget.py, CRITICAL). Cost Control hardcoded labour and equipment actual to ₹0 — a user budgeting labour saw a permanent ₹0 actual and favourable variance. Both actuals now compute from real data (payroll net_payable for labour; equipment bills + deployment hours + fuel for equipment), mirroring the finance P&L. Test added (5000/3000). Committed-at-zero and the per-tower project-wide-total gap are logged as open.
- Action 2: applied R2-063 (W44 quality ×2, MEDIUM). Checklist responses no longer persist the fabricated remark "Checked on site" (now null); unresolvable checklists read "Unknown checklist" instead of a fake IS code; the dead mock CHECKLISTS const is deleted. Follow-up flagged: `is_code_reference || "IS 456:2000"` fallback in the same mapping (display-only).
- Action 3: applied R2-064 (W132 boq, LOW) — the import-failure message no longer claims "using demo data" when nothing loads; and R2-065 (W30 hr, LOW) — the dead duplicate payroll calculator computePayslips is deleted.
- Action 4: applied R2-084 (W34 dashboard, MEDIUM). The status counters matched a dead vocabulary ("Not Started"/"Onhold" — canonical is Planning/On Hold/Cancelled), so a company with one Planning project showed all-zero summary. Counters/filter/badge now use the canonical list with legacy normalization, and a Cancelled counter card was added.
- Action 5: applied R2-083 (W47 dashboard, CRITICAL) — the last fabricated attribute fallbacks (category "General", stage "Structure") render "—" now. R2-061 (equipment, MEDIUM) closed with evidence: already fixed by cd01b15 (catch blocks only set the error banner; setFleet only gets API data or []).
- Action 6: R2-062 (W47 dashboard, MEDIUM) — the verifier caught that the fabricated fallback consts (Cement/Sand demo rows) and a 94-line dead rows/options pipeline still existed despite the earlier cd01b15 sweep (invisible today, a landmine for future JSX wiring). Deleted in `bd928e7` (pure removal, -94).
- Verified: npm run build green (47s + 76s, then 45s + 70s after the cleanup); pytest tests/coverage/ 213 passed rc=0 (212 + 1 new); verifier APPROVE on all seven commits plus both evidence checks.
- Commits: `241f76c` (R2-067), `6114f17` (R2-063), `ba7e65f` (R2-064), `f53dafd` (R2-065), `355cfc3` (R2-084), `b8e314b` (R2-083), `bd928e7` (R2-062). R2-061 closed via `cd01b15` (pre-existing main commit).
- Register: R2-061, R2-062, R2-063, R2-064, R2-065, R2-067, R2-083, R2-084 STATUS TODO → FIXED.
- Follow-ups logged: R2-063-bis (is_code_reference fallback); formatMoney dead const; R2-067 committed-at-zero + per-tower scoping (needs schema decision); test FK seed mismatch (latent).
- Next session: R2-063-bis (1-liner), R2-106 (W28 GPS-verification checkbox, CRITICAL, contract change), R2-109 (CTC), R2-003 (W06 delete-logs filters, MEDIUM). R2-178 still awaits the founder.

---

## Session 18 — fixes 33, 34, 35, 36 and 37 (2026-08-15)

- Action 1: applied R2-060 (W28 attendance ×2, CRITICAL). `captureLocation` used to substitute a hardcoded Bangalore pair ("Metro Geofence Yard") on geolocation failure — invented location evidence stored indistinguishably from a real fix. Now returns null on every failure path and `queuePunch` blocks the punch with an explicit message; no coordinates are ever fabricated.
- Action 2: applied R2-107 (W28, MEDIUM). Attendance and HR pages opened on hardcoded past dates (`2026-06-30` / `2026-06-26`) whose staleness grew daily. The three date defaults now default to today.
- Action 3: applied R2-149 (W98 d/todo, HIGH). The Repeat Settings modal configured nothing — `repeat_type` was never sent and no recurrence runtime exists anywhere. Removed the modal, trigger and all five repeat states (−144 lines); the hardcoded endsDate default went with it (also closing R2-107's d/todo half).
- Action 4: applied R2-148 (W98 d/todo, CRITICAL). Complete/delete only changed React state — every tick and deletion silently reverted on the next fetch. Both handlers now PUT/DELETE to /apis/v3/todos/{id} and refetch only on success, with honest alerts on failure.
- Action 5: applied R2-040 (W117 reports/[slug], MEDIUM). "Export as Excel" shipped CSV content under a .xlsx name (Excel warning; openpyxl/pandas fail). Item relabeled "Export as CSV (Excel-compatible)" and the handler always writes .csv.
- Verified: npm run build green (41s + 51s TS, zero errors); pytest 212 rc=0 (no backend changes); verifier APPROVE on all five (JSX balance after the modal removal, TS narrowing in the GPS guard, status vocabulary consistent end-to-end, no .xlsx can be produced).
- Commits: `287db85` (R2-060), `7ffa1c9` (R2-107), `6d9493c` (R2-149), `534451e` (R2-148), `8759d2a` (R2-040).
- Register: R2-040, R2-060, R2-107, R2-148, R2-149 STATUS TODO → FIXED.
- Still open (logged): the project-level To-Do page still SENDS `repeat_type` to a backend with no recurrence runtime (needs a product decision); d/hr's attendance `selectedDate` has no bound UI input.
- Next session: R2-106 (W28 "Simulate GPS lock" checkbox — server-side geofence verification is a contract change), R2-061 (W74 equipment demo-data fallback, MEDIUM), R2-003/others in W06 settings. R2-178 still awaits the founder.

---

## Session 17 — fixes 30, 31 and 32 (2026-08-15)

- Action 1: applied R2-029 (W20 zoho_books.py, MEDIUM). The duplicate-vendor fallback (Sentry 3062) re-ran the same vendor-filtered by-name query that had just returned [] — the telemetry proved the query can't see the duplicate. `_search_vendor` now takes `contact_type` (default "vendor"; existing call sites unchanged) and the 3062 fallback searches across ALL contact types (Zoho enforces name uniqueness across types; a same-named customer blocks vendor creation but was invisible to the vendor filter). Test `test_zoho_duplicate_vendor_searches_all_contact_types` added — verified to fail pre-fix.
- Action 2: closed two logged follow-ups. `add_task_comment` (planning.py:744) now writes the canonical "ongoing" instead of "in_progress" (which the R2-035 rollup fallback silently counted at 0%). The "Add Existing Party" modal (party page) now alerts and stays open on failure instead of closing silently.
- Verified: pytest tests/coverage/ 212 passed rc=0 (211 + 1 new); npm run build green (63s + 68s TS); verifier APPROVE on all three (one-line vocab diff, alert guards handle FastAPI's list-typed 422 details, the test genuinely fails pre-fix, no call-site drift from the new keyword default).
- Commits: `e771b66` (R2-031 follow-up), `8a934f0` (R2-011 follow-up), `ce0e154` (R2-029).
- Register: R2-029 STATUS TODO → FIXED; R2-011 and R2-031 Notes updated (follow-ups resolved).
- Next session: R2-039 (W04 reports.py) stays deferred per D-012; viable candidates: R2-010 (calculators — needs an option pick), R2-040 (W117 reports slug page, MEDIUM), R2-012-family done, R2-024 (blocked by D6). R2-178 still awaits the founder.

---

## Session 16 — fixes 27, 28 and 29 (2026-08-15)

- Action 1: fixed R2-036-bis (the logged follow-up). `month_spend` in the S-curve/burn block (analytics.py:293) still summed total_payable unfiltered, so budget_burn_series stayed inflated by sales while the headline burn rate was already fixed — the two displays disagreed. Now EXPENSE-filtered; the R2-036 test extended to assert the burn series shows 23600 not 141600.
- Action 2: applied R2-011 (W43 party page + library.py, HIGH) — the second instance of the invoice_type bug class. 6 of the 9 UI party_type options 422'd (Investor, Worker, Labour Contractor, Material Supplier, Equipment Supplier, Other Vendor) and the modal closed silently as if saved (live-proven with Investor). The backend pattern is now a union allowlist covering both vocabularies — every UI option validates AND every previously-stored value still matches. The form now alerts with the server detail and stays open on non-2xx.
- Action 3: applied R2-031 (W11 planning.py, MEDIUM). `update_task` derives status from progress when status isn't supplied (0 → not_started, 0<p<100 → ongoing, 100 → completed; explicit status wins) — a task at 75% no longer reads "not_started", fixing status filters/rollups (Lookahead, Milestones). Chose "ongoing" over the audit's "in_progress" wording after verifier adjudication (a new token would silently fall to the 0.0 rollup fallback). Test `test_task_status_derives_from_progress` added.
- Verified: pytest tests/coverage/ 211 passed rc=0 (209 + 2 new); npm run build green (78s + 41s TS, party page touched); verifier APPROVE on all three plus adjudication.
- Follow-ups flagged (not fixed, drive-by rule): (a) planning.py:742-744 `add_task_comment` writes `status = "in_progress"` without touching progress — dual vocabulary that counts those tasks at 0% in the R2-035 rollup when progress is NULL; fix = "ongoing" there; (b) the "Add Existing Party" flow (party page ~:326) has the same silent-close pattern.
- Commits: `4ee3856` (R2-036-bis), `ca3a742` (R2-011), `c962290` (R2-031).
- Register: R2-011, R2-031 STATUS TODO → FIXED; R2-036 Notes updated (bis resolved).
- Next session: R2-031-followup (planning.py:742), R2-029 (W20 zoho_books, MEDIUM), R2-039 (W04 reports.py, CRITICAL, PARTIAL 5/91 — needs care), R2-034-family. R2-178 still awaits the founder.

---

## Session 15 — fixes 25 and 26 (2026-08-15)

- Action 1: applied R2-036 (W08 analytics/budget/towers, CRITICAL). All 5 systemic bill-sum sites now filter by invoice-type bucket: analytics project_spend (:223) + operational spend (:440) → EXPENSE_INVOICE_TYPES; budget committed/actual (:145/:159) → EXPENSE_INVOICE_TYPES; towers consolidated-pnl "Billed" (:177/:199) → REVENUE_INVOICE_TYPES (the finance P&L labels the same figure "Revenue (Billed)" — verifier agreed with the revenue-side choice). Live repro was "Spend ₹1,41,600" for ₹23,600 of purchases + one ₹1,18,000 sale; now ₹23,600. Regression test `test_analytics_spend_excludes_sales` added (209/209).
- Action 2: closed R2-017 (W47 dashboard, CRITICAL) with NO code — already fixed by main commit `cd01b15` (2026-07-28 "remove fabricated demo data shipped to production"): the 4 invented projects, defaultMatch merge, demo filter options in the dpr/item-wise-sales reports and the "Metro Terminal" caption in hr are all gone from the working tree (greps verified; the audit's line refs predate that commit). Marked FIXED with that hash and the evidence recorded.
- Verified: pytest tests/coverage/ 209 passed rc=0; verifier APPROVE on the commit (6 query lines + test, import hygiene, no cross-test leakage, semantics: settlements correctly excluded from spend). npm build not needed (backend-only wave).
- Follow-up logged (R2-036-bis, not fixed — drive-by rule): `month_spend` at analytics.py:293 still sums total_payable unfiltered, so `budget_burn_series` remains inflated by sales while the headline burn_rate_pct is now fixed — the two displays disagree. One-line fix, file it next session. NOTE: party_balances (analytics.py:618) nets all types — likely intentional; don't re-file.
- Commits: `9234220` (R2-036). R2-017 closed via `cd01b15` (pre-existing main commit).
- Register: R2-036, R2-017 STATUS TODO → FIXED.
- Next session: R2-036-bis (analytics.py:293 month_spend, 1 line), then R2-011 (W43 party page, HIGH), R2-035-sibling rollups, R2-029 (zoho_books), R2-033-family backend fixes. R2-178 still awaits the founder.

---

## Session 14 — fixes 22, 23 and 24 (2026-08-15)

- Action 1: applied R2-019 (W40 hr page, HIGH). The Holidays feature was entirely local-only: a fabricated "Diwali 2026-07-04" seed (factually wrong date), no load, no delete persistence. Now: seed removed, list loads from GET /apis/v3/hr/holidays/{companyId} (mapped to the same shape the R2-013 add path uses), Delete calls DELETE /hr/holidays/{id} and removes the row only on 204.
- Action 2: applied R2-020 (W115 dpr page, MEDIUM). The M.B. Sheet modal opened pre-filled with two fabricated takeoff rows totalling 20.430 m³ (live-confirmed), so one click on "Apply to Executed Qty" injected measurements that were never taken into a progress report that feeds billing. Now opens with a single empty row; the total is 0.000 until real entries.
- Action 3: applied R2-035 (W10 projects.py, CRITICAL). Project progress ignored the Task.progress column entirely — earned value came from a 4-bucket status map, so a task at 75% with status "not_started" left the project at 0% forever (live-reproduced; the Gantt only exposes a progress input). Now reads progress (with a float() wrap for the Numeric/Decimal runtime type — my original spec would have crashed on a real Decimal, caught by the coder) and falls back to status only for legacy NULL rows. Test added (75.0 via HTTP, 100.0 fallback via stubbed query — the NULL case is unreachable through the ORM since the column is NOT NULL default 0.0; the coder proved the HTTP path can't produce it).
- Verified: npm run build green (71s + 55s TS); pytest tests/coverage/ 208 passed rc=0 (207 + 1 new). Verifier APPROVE on all three, including verdicts that both coder deviations (float wrap, stubbed fallback test) were correct.
- Commits: `45ffb76` (R2-019), `4be5ccf` (R2-020), `89c607a` (R2-035).
- Register: R2-019, R2-020, R2-035 STATUS TODO → FIXED.
- Deferred this session: R2-010 (calculators: 14 orphaned endpoints; the audit offers three fix options — wire console to API, shared formula module, or contract tests — an implementer pick, sizeable; logged for a dedicated session).
- Next session: R2-036 (W08 analytics spend counting revenue as expenditure, CRITICAL — the fix already exists in constants.py as EXPENSE_INVOICE_TYPES), R2-025-adjacent rollups, R2-017 (W47 dashboard, CRITICAL). R2-178 still awaits the founder.

---

## Session 13 — fixes 18, 19, 20 and 21 (2026-08-15)

- Action 1: applied R2-016 (W114 task page, MEDIUM). `updateProgress` never checked the PUT response and applied the optimistic state update unconditionally — a 422/500 rendered the new progress as saved (Gantt/Forecast End/S-curve all derive from it). Now sets state only on `res.ok` and alerts with the server detail on failure.
- Action 2: applied R2-006 (W94 drawings page, HIGH) — the module was unusable from a cold start: with zero drawings the modal button silently did nothing (`!activeDrawing` early return) and every failure was console.error + fake-optimistic local state. Now a first publish POSTs /apis/v3/drawings (new Drawing Name input + Category select) then the revision under the new id; all failures alert and leave state untouched; the misleading "will be archived as Superseded" subtitle swaps when no drawing exists.
- Action 3: applied R2-007 (W38 procurement page, HIGH). POs were saved vendorless (the UI showed a hardcoded "Shree Cement Traders" that never reached the DB; after reload the column read "Vendor"). The modal select now uses live company team data, `vendor_id` is sent, and the list resolves names from the same source. Backend needed no change.
- Action 4: applied R2-008 (W38 procurement page, HIGH). The RFQ Analysis Center presented invented quotes/ratings/credit terms (incl. real brand names) as "L1 PREFERRED" recommendations. Per the audit's sanctioned option, the fabricated constants are deleted and the drawer shows an honest empty state; wiring to the real rfq.py endpoints is deferred.
- Verified: npm run build green (27.2s + 29.1s TS, zero errors); verifier APPROVE on all four (setTasks only in res.ok, first-drawing flow correct, vendor resolution resilient to vendor-fetch failure, zero fabricated-data remnants). pytest unaffected (frontend-only wave); tree clean.
- Commits: `ddf1290` (R2-016), `3257e0a` (R2-006), `2205ffd` (R2-007), `fc22a98` (R2-008).
- Register: R2-006, R2-007, R2-008, R2-016 STATUS TODO → FIXED.
- Follow-ups logged in register: handleCreatePO still prepends its local row when the POST fails (fake-optimistic, same family as the old drawings catch); newDrawingName/category not reset after publish; orphan drawing edge case if the revision POST fails after the drawing POST succeeds; dead selectedRFQItem state.
- Next session: R2-019 (W40 hr), R2-020 (W115 dpr), R2-010 (W77 calculators), R2-035 (W10 projects progress, HIGH) are decision-free. R2-178 still awaits the founder.

---

## Session 12 — fixes 14, 15, 16 and 17 (2026-08-15)

- Action 1: applied R2-032 (W40 hr page, HIGH). "Total Monthly CTC" double-counted PF (basic × 0.24 = employee 12% + employer 12%, the employee half already inside grossMonthly) and hardcoded the rate. Now uses the per-employee `pf_employer_pct` from the API: `grossMonthly + basic × (pfEmployerPct ?? 12) / 100`.
- Action 2: applied R2-013 (W40 hr page, HIGH) — the audit's "reports success while saving nothing" trio, the most misleading failure mode found. Save Holiday now POSTs /apis/v3/hr/holidays/{companyId} and appends the server response; Save Workforce POSTs /apis/v3/library/workforces; the Employee Details drawer's inputs are now controlled (were defaultValue-only, so salary/OT/designation edits were never even captured) and Save does Promise.all of PUT payroll-profiles + PUT employees, closing/refetching only on both 2xx. Success toasts only after confirmed 2xx; failures alert and keep the modal open.
- Action 3: applied R2-026 (W78 home page, MEDIUM). "TO DO (PENDING)" was a hardcoded `useState(3)` no fetch ever populated. Now fetched from /apis/v3/todos/company/{companyId} counting `status === "pending"` — the exact definition the projects API uses.
- Action 4: applied R2-015 (W78 home page, MEDIUM). The "+" quick-add button now POSTs a real todo (/apis/v3/todos/ with the row's project_id, title "Quick task") and only then increments the counter; failures toast honestly.
- Verified: npm run build green (30.5s + 36s TS, zero errors; one intermediate failure on a missing `pfEmployerPct` interface field was fixed by the coder within the wave); verifier APPROVE on all four (no leftover defaultValue / useState(3) / 0.24, success toasts only in res.ok branches, correct history after two soft-reset splits + an amend). pytest unaffected (frontend-only wave); tree clean.
- Commits: `261bd41` (R2-032), `820717b` (R2-013), `e870664` (R2-026), `a83510d` (R2-015).
- Register: R2-013, R2-015, R2-026, R2-032 STATUS TODO → FIXED.
- Deferred notes in register: statutory PF ceiling (₹15,000) not applied (R2-032 Defect 3); Workforce drawer's rate/salary/cost-code fields still unpersisted + fabricated cost-code options (R2-008/R2-009 family).
- Next session: W40 is nearly cleared; strong remaining candidates — R2-016 (W114 task page, MEDIUM), R2-019/R2-020 (W40 hr/dpr), R2-006 (W94 drawings, HIGH), R2-007/R2-008 (W38 procurement, HIGH). R2-178 still awaits the founder.

---

## Session 11 — fixes 11, 12 and 13 (2026-08-15)

- Action 1: applied R2-012 (W27 finance page, MEDIUM). The Payment Method radio group in the Standard Voucher drawer was uncontrolled (no value/checked/onChange — `paymentMethod` appeared once in the file as a name attribute) and `handleRecordPayment` hardcoded `payment_method: "Cash"` in the POST body. Now: `paymentMethod` state, controlled radios, and the payload sends the actual selection. Backend allowlist verified (`finance.py:32` covers all three labels).
- Action 2: applied R2-022 (W27 finance page, MEDIUM). The loader effect ran only when `projectId` was set, though fetchData is almost entirely company-scoped — no active project → empty Finance module with real API data available. Effect now runs on `companyId`; P&L/employees fetches stay internally project-guarded.
- Action 3: applied R2-023 (LOW). Removed the internal "PHASE 14"/"PHASE 16" eyebrow labels from the Analytics and Production pages (build-plan labels meant nothing to customers); ZATCA "Phase 1" in settings untouched.
- Verified: npm run build green (32.3s + 25.1s TS, zero errors); verifier APPROVE on all three (controlled radios, only-2-line effect diff, project guards intact, no Phase remnants). The coder's mid-task soft-reset (erroneous commit mixing A+B) left no residue — verifier confirmed linear history and cleanly separated diffs.
- Commits: `e9111eb` (R2-012), `5fda93e` (R2-022), `6ef2cc8` (R2-023).
- Register: R2-012, R2-022, R2-023 STATUS TODO → FIXED.
- Next session: R2-013/R2-032 (W40 hr page, HIGH — "reports success while saving nothing" trio, no founder decision needed) and R2-015/R2-026 (W78 home page) are the best remaining candidates; R2-178 still awaits the founder's wire-vs-cut decision.

---

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

