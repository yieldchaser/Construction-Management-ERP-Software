# Round 3 verification worklist - 370 unopened closed rows

Generated from `audit/AUDIT_FIX_REGISTER.md` @ origin/main. Sorted CRITICAL first, then by file cluster so related rows read together.

| # | id | sev | status | primary file | register note (truncated) |
|---|---|---|---|---|---|
| 1 | R2-172 | CRITICAL | FIXED | `RolePermissionsModal.tsx` |  / reg L6507 S33-C FIXED aa17f72: WORKFLOW_MODULES extended (7 modules) in permissions.py + rbac.ts mirror - presets round-trip without silent strippi |
| 2 | R2-271 | CRITICAL | FIXED | `UNMAPPED` |  / reg L11831 S33-C EVIDENCE: line-items gate + explicit (No line items) row + 422 mismatch pin all live (R2-401/R2-241 era). |
| 3 | R2-399 | CRITICAL | FIXED | `UNMAPPED` |  / reg L19749 S33-C FIXED 399bf40: last three Rule-46 elements (amount in words, reverse-charge declaration, signatory block) on tax invoice PDF. |
| 4 | R2-407 | CRITICAL | FIXED | `UNMAPPED` |  / reg L20082 S33-C FIXED 74b64ce: payslip CSV neutralizes formula cells (last raw-text exporter). |
| 5 | R2-410 | CRITICAL | FIXED | `UNMAPPED` |  / reg L20196 S33-C FIXED c6f2dfb: Tally export posts GST split (sale/purchase legs, Duties&Taxes parent, balanced vouchers). |
| 6 | R2-418 | CRITICAL | FIXED | `UNMAPPED` |  / reg L20858 S33-C FIXED f18ee2b: party rows show Pay x / Receive y beside net balance. |
| 7 | R2-444 | CRITICAL | FIXED | `UNMAPPED` |  / reg L22245 S33 FIXED 51c5df7: DPR summary tiles count real used/received from ledger rows (fields never existed on payload before). |
| 8 | R2-080 | CRITICAL | FIXED | `analytics.py` |  / reg L3397 S33-C FIXED 45b0358: /health endpoint + keep-alive workflow (RESIDUAL DEFERRED-LIVE: Actions cron throttling needs external pinger or pai |
| 9 | R2-081 | CRITICAL | FIXED | `analytics.py` |  / reg L3510 S33-C EVIDENCE 30a90f3: all total_payable aggregates filter EXPENSE_INVOICE_TYPES + Cancelled; exploit-replay pin added. |
| 10 | R2-303 | CRITICAL | FIXED | `analytics.py` |  / reg L13489 S33-C FIXED f87ba34: burn curve no longer compounds (flat series when spend flat). |
| 11 | R2-304 | CRITICAL | FIXED | `analytics.py` |  / reg L13529 S33-C FIXED 2ea19d3: null-hours logs contribute zero + surface as logs_without_hours (no fabricated 8h). |
| 12 | R2-497 | CRITICAL | FIXED | `analytics.py` |  / reg L24947 S33-C FIXED f87ba34: same atomic change as R2-303 (duplicate row, same site). |
| 13 | R2-503 | CRITICAL | FIXED | `assets.py` |  / reg L25164 S33-C FIXED 917f8bf: depreciation per-entry amount bounded by one year under declared method; naive-vs-aware second-entry 500 fixed. |
| 14 | R2-113 | CRITICAL | FIXED | `auth.py` |  / reg L4430 / S33 FIXED 2f3e63f (D7): same commit as R2-073. |
| 15 | R2-138 | CRITICAL | FIXED | `auth.py` |  / reg L5567 S33-C FIXED f9b55eb: /auth/me capped 120/min (runaway tab gets bounded 429s, pool survives). |
| 16 | R2-169 | CRITICAL | FIXED | `auth.py` |  / reg L6384 / S33 FIXED 2f3e63f (D7): same commit as R2-073; role_id NULL -> Viewer. |
| 17 | R2-181 | CRITICAL | FIXED | `auth.py` |  / reg L6857 S33-C FIXED 03430b2: real team invite flow (settings:manage-gated invite + hashed single-use TTL claim + accept sets password/mints sessi |
| 18 | R2-308 | CRITICAL | FIXED | `auth.py` |  / reg L13823 S33-C FIXED 98423c6: pool fail-fast/self-heal (timeout 15, recycle 1800, pre_ping) via testable build_engine. |
| 19 | R2-511 | CRITICAL | FIXED | `auth.py` |  / reg L25601 S33-C FIXED 2d48e13: uvicorn forwarded-allow-ips + per-identifier auth limiter keys (8 routes). |
| 20 | R2-028 | CRITICAL | FIXED | `billing.py` |  / reg L1330 S33 EVIDENCE 21d85ef: full models binding live at billing.py:14; all four sites valid; binding test added. |
| 21 | R2-131 | CRITICAL | FIXED | `billing.py` |  / reg L5051 S33 FIXED 8de21ee: shared resolve_party_name rewires labour/subcon/finance/payment-request sites (kills Unknown Party/login-name storage) |
| 22 | R2-140 | CRITICAL | FIXED | `chat.py` |  / reg L5691 S33-C FIXED dcfc3d1 (+behavioral 5986794): chat identity gate resolved via company_team_for - permanent deadlock dead. |
| 23 | R2-468 | CRITICAL | FIXED | `chat.py` |  / reg L23554 S33-C FIXED 1188311: canonical company_team resolver at creator lookup; batched predicate kept. |
| 24 | R2-470 | CRITICAL | FIXED | `chat.py` |  / reg L23651 S33-C FIXED 53c4e02: add_member admits recorded creator on empty member table; legacy zero-member rows need ops cleanup. |
| 25 | R2-326 | CRITICAL | FIXED | `constants.py` |  / reg L15019 S33-C FIXED 10d36cf: finance.py bare ==sale branches use canonical buckets; settlements/movements in neither head. |
| 26 | R2-157 | CRITICAL | FIXED | `custom_fields.py` |  / reg L6057 S33-C FIXED 31bca13: custom-field read path derives tenant from parent entity, membership-checked, poisoned-row isolated. |
| 27 | R2-266 | CRITICAL | FIXED | `dpr.py` |  / reg L11595 S33-C FIXED beb5823: DPR CSV export neutralizes formula cells (R2-185 pattern). |
| 28 | R2-599 | CRITICAL | FIX_VERIFIED | `dpr.py` | `bef6c73` / reg L31644; wave 0; suite RC-002 |
| 29 | R2-365 | CRITICAL | FIXED | `drawings.py` |  / reg L17078 S33-C FIXED e1dd303: superseded_at column + supersede-on-approve + latest-first ordering - current revision identifiable. |
| 30 | R2-431 | CRITICAL | FIXED | `errors.py` |  / reg L21423 S33-C FIXED 7be4739: payroll-attendance swallow removed; assume_full_month gate restored on this lineage (D2 option-a flag - founder to  |
| 31 | R2-052 | CRITICAL | FIX_VERIFIED | `finance.py` | `35069ae` / reg L2390; wave W01a; suite RC-017 |
| 32 | R2-198 | CRITICAL | FIX_VERIFIED | `finance.py` | `c5bdcd3` / reg L7530; wave W01a; suite RC-018 S33 SWEEP: backend clause HOLDS (all company-scoped finance routes UUID-typed -> FastAPI 422s literal ' |
| 33 | R2-221 | CRITICAL | FIX_VERIFIED | `finance.py` | `7a47131` / reg L9068; wave W01a; suite RC-011 S33 SWEEP: drift CONFIRMED live (naive utcnow fallback minus aware column) -> re-fixed f1a4c43 with dua |
| 34 | R2-231 | CRITICAL | FIX_VERIFIED | `finance.py` | `8b9a378` / reg L9544; wave 0; suite RC-006 S33 SWEEP: drift CONFIRMED live (FIFO gate unreachable; UI never sends party field) -> re-fixed e9dba8b (p |
| 35 | R2-235 | CRITICAL | FIX_VERIFIED | `finance.py` | `3f65098` / reg L9859; wave W01a; suite RC-015 S33 SWEEP: duplicate of the R2-726 defect family -> fixed by bbb6d51 _net_balance (same helper covers p |
| 36 | R2-236 | CRITICAL | FIX_VERIFIED | `finance.py` | `7a47131` / reg L9920; wave W01a; suite RC-019 (fix mis-attributed into 7a47131) |
| 37 | R2-243 | CRITICAL | FIX_VERIFIED | `finance.py` | `2ac8113` / reg L10340; wave W01a; suite RC-016 S33 SWEEP: drift CONFIRMED live (subcon in EXPENSE bucket double-counted) -> re-fixed 2803dad (materia |
| 38 | R2-244 | CRITICAL | FIX_VERIFIED | `finance.py` | `7a47131` / reg L10396; wave W01a; suite RC-011 |
| 39 | R2-315 | CRITICAL | FIX_VERIFIED | `finance.py` | `dc85e34` / reg L14604; wave W01a; suite RC-012 |
| 40 | R2-327 | CRITICAL | FIX_VERIFIED | `finance.py` | `e918b72` / reg L15066; wave W01b; suite RC-022 |
| 41 | R2-342 | CRITICAL | FIX_VERIFIED | `finance.py` | `4b7add4` / reg L15935; direct-fix pass; suite RC-036 |
| 42 | R2-344 | CRITICAL | FIX_VERIFIED | `finance.py` | `3ac2694` / reg L16091; wave W01b; suite RC-020 |
| 43 | R2-356 | CRITICAL | FIX_VERIFIED | `finance.py` | `d5564d7` / reg L16605; wave W01b; suite RC-031 — own gate added 2026-08-06 |
| 44 | R2-509 | CRITICAL | FIX_VERIFIED | `finance.py` | `f32ca77+3f65098` / reg L25450; wave W01b; suite RC-032 — own gate added 2026-08-06 |
| 45 | R2-533 | CRITICAL | FIX_VERIFIED | `finance.py` | `4b7add4` / reg L27145; direct-fix pass; suite RC-038 |
| 46 | R2-544 | CRITICAL | FIX_VERIFIED | `finance.py` | `41ebbf1` / reg L28090; wave W01b; suite RC-021 |
| 47 | R2-549 | CRITICAL | FIX_VERIFIED | `finance.py` | `41ebbf1` / reg L28469; wave W01b; suite RC-023 — same root cause as R2-544, closed by its fix |
| 48 | R2-568 | CRITICAL | FIX_VERIFIED | `finance.py` | `e3866c9` / reg L29770; wave W01b; suite RC-024 |
| 49 | R2-726 | CRITICAL | FIXED | `finance.py` |  / Definition: docs/VERIFICATION_NEW_FINDINGS.md (founder block). S33 FIXED bbb6d51: Enterprise Rollup net balance had two inverted terms (added liabi |
| 50 | R2-074 | CRITICAL | FIX_VERIFIED | `hr.py` | `acee51f` / reg L3151; hr.py direct-fix pass; suite RC-052 |
| 51 | R2-201 | CRITICAL | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L7675; hr.py direct-fix pass; suite RC-047 |
| 52 | R2-210 | CRITICAL | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L8405; hr.py direct-fix pass; suite RC-045 |
| 53 | R2-222 | CRITICAL | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L9123; hr.py direct-fix pass; suite RC-045 |
| 54 | R2-262 | CRITICAL | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L11354; hr.py direct-fix pass; suite RC-045 |
| 55 | R2-352 | CRITICAL | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L16437; hr.py direct-fix pass; suite RC-047 |
| 56 | R2-353 | CRITICAL | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L16473; hr.py direct-fix pass; suite RC-048 |
| 57 | R2-430 | CRITICAL | FIX_VERIFIED | `hr.py` | `05a41e9` / reg L21389; hr.py direct-fix pass; suite RC-049 |
| 58 | R2-474 | CRITICAL | FIX_VERIFIED | `hr.py` | `ff2a2fc` / reg L23791; hr.py direct-fix pass; suite RC-061 |
| 59 | R2-540 | CRITICAL | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L27683; hr.py direct-fix pass; suite RC-046 |
| 60 | R2-123 | CRITICAL | FIXED | `library.py` |  / reg L4774 S33-C EVIDENCE: all three dropdowns wire real library endpoints with ids; invented lists extinct. |
| 61 | R2-139 | CRITICAL | FIXED | `main.py` |  / reg L5602 S33-C EVIDENCE: prefix mount + UUID-typed ids + frontend updated (R2-291 wave); wildcard gone. |
| 62 | R2-194 | CRITICAL | FIXED | `main.py` |  / reg L7277 S33-C FIXED 4a7b8a5: global Exception handler renders escaped generic 500 with whitelist-checked CORS headers (legs 1+2 pre-landed via R2 |
| 63 | R2-300 | CRITICAL | FIXED | `models.py` |  / reg L13346 S33-C FIXED 8ad5672: project delete 409s with per-type inventory while bills/payments/POs/payroll exist. |
| 64 | R2-042 | CRITICAL | FIX_VERIFIED | `frontend/src/app/c/[company_id]/d/finance/page.tsx` | `db9cfbd` / reg L1784; wave 0; suite RC-004/RC-005 |
| 65 | R2-116 | CRITICAL | FIXED | `frontend/src/app/c/[company_id]/d/delete-logs/page.tsx` |  / reg L4500 S33-C EVIDENCE: refetch loop structurally impossible post-R2-310 useMemo. |
| 66 | R2-137 | CRITICAL | FIXED | `d/face-recognition/page.tsx` |  / reg L5505; CLASS finding (219 of 307 `if (res.ok)` checks have no else) — STILL OPEN as a class. The face-recognition page instance was closed by ` |
| 67 | R2-173 | CRITICAL | FIXED | `p/[project_id]/transaction/page.tsx` |  / reg L6552 S33 FIXED 5692d6d: cash tiles fold /finance/transactions Payment rows by project_id (honest caveat on feed failure) - was Rs 0 vs Rs 90,0 |
| 68 | R2-214 | CRITICAL | FIXED | `d/billing/page.tsx` |  / reg L8847 S33-C FIXED b5b9437: real bill approval endpoint (approval_flag only, 409 cancelled, billing:approve) + button/badge/KPI wired to server  |
| 69 | R2-215 | CRITICAL | FIXED | `d/procurement/page.tsx` |  / reg L8859 S33-C EVIDENCE: usage loop live since 2525cab (R2-094); register row never flipped. |
| 70 | R2-270 | CRITICAL | FIXED | `frontend/src/app/c/[company_id]/d/chat/page.tsx` |  / reg L11773 S33-C FIXED d3d221e: chat create-group payload drops client created_by (server stamps team id). |
| 71 | R2-310 | CRITICAL | FIX_VERIFIED | `frontend/src/app/c/[company_id]/d/delete-logs/page.tsx` | `af04f74` / reg L13927; wave 0; suite RC-007 |
| 72 | R2-396 | CRITICAL | FIXED | `page.tsx` |  / reg L19622 S33-C FIXED 88f9af5: report CSV export neutralizes formula cells client-side (mirror of backend _csv_safe_cell). |
| 73 | R2-416 | CRITICAL | FIXED | `finance/page.tsx` |  / reg L20647 S33-C EVIDENCE: companyId-gated effect live since R2-022 5fda93e (+R2-099 loading/error states). |
| 74 | R2-423 | CRITICAL | FIXED | `dashboard/page.tsx` |  / reg L21023 S33-C EVIDENCE: fabricated projects gone (bd928e7/f5f6749); projects init []. |
| 75 | R2-426 | CRITICAL | FIXED | `d/payment-approval/page.tsx` |  / reg L21170 S33-C EVIDENCE: Create Demo Request button/handler/CTA removed by cd01b15 (also closes R2-406/422-425/427/428/434). |
| 76 | R2-434 | CRITICAL | FIXED | `d/quality/page.tsx` |  / reg L21684 S33-C FIXED fda5bd0: inspected_by server-owned and exposed to both quality pages. |
| 77 | R2-435 | CRITICAL | FIXED | `d/drawings/page.tsx` |  / reg L21762 S33-C FIXED 3103f5f: pin created_by server-owned; failed saves alert instead of rendering local-only pins. |
| 78 | R2-437 | CRITICAL | FIXED | `reports/[slug]/page.tsx` |  / reg L21871 S33-C FIXED 03673ef: funnel filters reconciled to crm DEFAULT_STATUSES (Proposal Stage/Converted present). |
| 79 | R2-447 | CRITICAL | FIXED | `dashboard/page.tsx` |  / reg L22443 S33-C EVIDENCE: 500 root cause fixed by 664b430 CPM timedelta; loader gates res.ok + loadingTasks. |
| 80 | R2-448 | CRITICAL | FIXED | `dashboard/page.tsx` |  / reg L22733 S33 FIXED 1a5f4fd: project dashboard classifies all canonical invoice types (revenue/expense/settlement directional) - totals reconcile. |
| 81 | R2-455 | CRITICAL | FIXED | `d/planning/gantt/page.tsx` |  / reg L23074 S33-C FIXED ea1ad88: comments signed by authenticated caller (server-owned actor, no fictional identity). |
| 82 | R2-459 | CRITICAL | FIXED | `gantt/page.tsx` |  / reg L23204 S33-C FIXED af85499: gantt card renders progress/status/end_date/critical (was dropped JSX). |
| 83 | R2-464 | CRITICAL | FIXED | `d/drawings/page.tsx` |  / reg L23379 S33 FIXED 9290a54: revision register carries real uploaded sheets (file picker + /files/upload + stored link). |
| 84 | R2-469 | CRITICAL | FIXED | `d/chat/page.tsx` |  / reg L23615 S33 EVIDENCE b1bb802: frontend stopped POSTing created_by under R2-270; probe test at API level added. |
| 85 | R2-473 | CRITICAL | FIXED | `p/[project_id]/attendance/page.tsx` |  / reg L23751 S33-C EVIDENCE: all five hardcoded date literals dead (7ffa1c9 + new Date() defaults). |
| 86 | R2-476 | CRITICAL | FIXED | `attendance/page.tsx` |  / reg L23875 S33 FIXED beb2cbd: subcon crew attendance starts empty, inspects every res.ok, reports true saved/failed counts. |
| 87 | R2-482 | CRITICAL | FIXED | `calculators/page.tsx` |  / reg L24159 S33-C FIXED fba2f80: client M5 cement factor 3.2->2.77 (last outlier vs server ratio math). |
| 88 | R2-490 | CRITICAL | FIXED | `transaction/page.tsx` |  / reg L24621 S33 FIXED a44acaa: transaction totals classify all canonical types (settlements to cash heads, post-GST margin legs) - was TOTAL OUT Rs  |
| 89 | R2-515 | CRITICAL | FIXED | `p/[project_id]/attendance/page.tsx` |  / reg L26127 S33-C EVIDENCE: covered by W84 flushQueue fix on the p/[project_id] copy. |
| 90 | R2-588 | CRITICAL | FIX_VERIFIED | `d/hr/page.tsx` | `a99715e` / reg L30505; wave 0; suite RC-003 |
| 91 | R2-171 | CRITICAL | FIXED | `permissions.py` |  / reg L6423 S33 EVIDENCE a6ca960: root fix pre-landed (WORKFLOW_MODULES complete + rbac mirror); API round-trip probe test added. |
| 92 | R2-456 | CRITICAL | FIXED | `planning.py` |  / reg L23123 S33-C FIXED 5598631: Log Progress divides booked qty by linked BOQ item quantity -> Task.progress (cap 100, completes at full qty). |
| 93 | R2-458 | CRITICAL | FIXED | `planning.py` |  / reg L23168 S33-C FIXED 153d11a: lookahead separates overdue-open from completed-overdue. |
| 94 | R2-477 | CRITICAL | FIXED | `planning.py` |  / reg L23964 S33-C FIXED f63c2cf: entry-creation window sweep across subcon-attendance/quality/equipment/leaves/GRN (11 tests). |
| 95 | R2-565 | CRITICAL | FIX_VERIFIED | `planning.py` | `b612f73` / reg L29573; wave 0; suite RC-001 |
| 96 | R2-049 | CRITICAL | FIX_VERIFIED | `procurement.py` | `e9e3308` / reg L2286; procurement.py direct-fix pass; suite RC-086 |
| 97 | R2-178 | CRITICAL | FIXED | `procurement.py` |  / reg L6719 / S33 FIXED 8b9d322 (CD-1): cut to wired categories, legacy preserved hidden. |
| 98 | R2-219 | CRITICAL | FIX_VERIFIED | `procurement.py` | `e9e3308` / reg L8931; procurement.py direct-fix pass; suite RC-085 |
| 99 | R2-239 | CRITICAL | FIX_VERIFIED | `procurement.py` | `e9e3308` / reg L10127; procurement.py direct-fix pass; suite RC-084 |
| 100 | R2-348 | CRITICAL | FIX_VERIFIED | `procurement.py` | `e9e3308` / reg L16257; procurement.py direct-fix pass; suite RC-083 |
| 101 | R2-380 | CRITICAL | FIX_VERIFIED | `procurement.py` | `03db7a3` / reg L17779; procurement.py direct-fix pass; suite RC-089 |
| 102 | R2-432 | CRITICAL | FIX_VERIFIED | `procurement.py` | `e9e3308` / reg L21581; procurement.py direct-fix pass; suite RC-084 — same defect as R2-239 |
| 103 | R2-543 | CRITICAL | FIX_VERIFIED | `procurement.py` | `03db7a3` / reg L28036; procurement.py direct-fix pass; suite RC-088 |
| 104 | R2-226 | CRITICAL | FIXED | `projects.py` |  / reg L9269 S33-C FIXED 1c849c7: project delete requires exact name match to confirm. |
| 105 | R2-487 | CRITICAL | FIXED | `projects.py` |  / reg L24473 S33-C FIXED d93e876: quotation-to-invoice project-side link written; no duplicates, no fabricated link. |
| 106 | R2-557 | CRITICAL | FIXED | `projects.py` |  / reg L28985 S33 FIXED 4ee8129: project delete requires ?confirm=<name> server-side; counts all 51 CASCADE children with per-table inventory in the 4 |
| 107 | R2-246 | CRITICAL | FIXED | `quality.py` |  / reg L10477 S33-C FIXED 9ab8619: NCR close requires under_review + rejects past-due at birth. |
| 108 | R2-362 | CRITICAL | FIXED | `quality.py` |  / reg L16914 S33-C FIXED e44edf4: inspection summary recounted from responses after flush (mixed=partial). |
| 109 | R2-337 | CRITICAL | FIXED | `rate_limit.py` |  / reg L15583 S33-C EVIDENCE: both halves live (forwarded-allow-ips + proxy-headers default; shared storage URI + trust-flag key). Pinned by R2-511/R2 |
| 110 | R2-039 | CRITICAL | FIXED | `reports.py` |  / reg L1672; PARTIAL: 5 of 91 closed with R2-321; rest deferred per D-012 / S33 FIXED 71b5b92 (D-012): 80 empty report columns removed. |
| 111 | R2-043 | CRITICAL | FIX_VERIFIED | `reports.py` | `d5b628a` / reg L1827; reports.py direct-fix pass; suite RC-075 |
| 112 | R2-075 | CRITICAL | FIX_VERIFIED | `reports.py` | `d5b628a` / reg L3225; reports.py direct-fix pass; suite RC-074 |
| 113 | R2-076 | CRITICAL | FIX_VERIFIED | `reports.py` | `723af26` / reg L3285; reports.py direct-fix pass; suite RC-068 — same mechanism as R2-312 |
| 114 | R2-184 | CRITICAL | FIXED | `reports.py` | `ab9623e` / reg L6929; D-010 - de-escalated to feature needing object storage; defect half (false affordance, CRITICAL) closed by ab9623e removing 5 u |
| 115 | R2-312 | CRITICAL | FIX_VERIFIED | `reports.py` | `723af26` / reg L14268; reports.py direct-fix pass; suite RC-068 |
| 116 | R2-313 | CRITICAL | FIX_VERIFIED | `reports.py` | `723af26` / reg L14529; reports.py direct-fix pass; suite RC-069 |
| 117 | R2-339 | CRITICAL | FIX_VERIFIED | `reports.py` | `2ddc411` / reg L15796; reports.py direct-fix pass; suite RC-076 |
| 118 | R2-371 | CRITICAL | FIX_VERIFIED | `reports.py` | `1b841a8` / reg L17366; reports.py direct-fix pass; suite RC-082 |
| 119 | R2-252 | CRITICAL | FIXED | `safety.py` |  / reg L10839 S33-C FIXED 7343c28: incident_type pattern-matched to UI vocabulary; legacy Fatality rows read as LTIF. |
| 120 | R2-073 | CRITICAL | FIXED | `settings.py` |  / reg L3112 / S33 FIXED 2f3e63f (D7): backfill + fail-closed behind per-company flag. |
| 121 | R2-288 | CRITICAL | FIXED | `settings.py` |  / reg L12645 S33-C FIXED e9139f1: statutory payroll rates bounded (pf 0-12, esi 0-1/0-5, tds >=0) + confirm_changes gate on rate edits. |
| 122 | R2-389 | CRITICAL | FIXED | `settings.py` |  / reg L18662 S33-C EVIDENCE-CLOSED abdd36c: team list reads mobile (R2-390 side effect); GET crash site now pinned. |
| 123 | R2-462 | CRITICAL | FIXED | `settings.py` |  / reg L23322 S33-C FIXED adb2b3c: remaining 8 stubs await params (zero raw params interpolations left app-wide) - /c/undefined mechanism extinct. |
| 124 | R2-541 | CRITICAL | FIXED | `settings.py` |  / reg L27736 S33 FIXED 4ad5792: five ungated settings writes now require settings:manage (roles/seed, payroll PUT, salary templates, company-file upl |
| 125 | R2-547 | CRITICAL | FIXED | `settings.py` |  / reg L28332 S33-C EVIDENCE: remedy landed as R2-288 e9139f1 (statutory bounds + confirm gate); probes 422. |
| 126 | R2-126 | CRITICAL | FIXED | `statutory.py` |  / reg L4900 S33-C FIXED 545e20e: GSTR summary sourced from payslip totals incl. leavers; raise-after-period invisible; no-run 409. |
| 127 | R2-127 | CRITICAL | FIXED | `statutory.py` |  / reg L4936 S33-C FIXED a1481c4: exempt colleague contributes 0 ESI both halves; applicability flows from payroll per-employee. |
| 128 | R2-128 | CRITICAL | FIXED | `statutory.py` |  / reg L4963 S33-C FIXED 52fc958: BOCW cess = 1% of period live purchase/subcon subtotals (revenue/cancelled/out-of-period excluded). |
| 129 | R2-283 | CRITICAL | FIXED | `statutory.py` |  / reg L12433 S33-C FIXED 7767751: auto-populate ValidationError dead - nullable filed/acknowledgment fields, create->list roundtrip. |
| 130 | R2-522 | CRITICAL | FIXED | `statutory.py` |  / reg L26557 S33-C FIXED 976e504: GSTR-1 from sales ledger (invoice-wise taxable/GST, party GSTIN, due 11th next month, finance gate). |
| 131 | R2-523 | CRITICAL | FIXED | `statutory.py` |  / reg L26605 S33-C FIXED a050b90: ECR EPS/EPF split at 15k cap, earned wages, month-scoped; RESIDUAL: UAN column does not exist (schema + HR write pa |
| 132 | R2-524 | CRITICAL | FIXED | `statutory.py` |  / reg L26650 S33-C FIXED 4b61a06: 26Q from TransactionDeduction x Bill in real quarters; PAN = NOPANAVAIL only where genuinely absent. |
| 133 | R2-257 | CRITICAL | FIXED | `team_schedule.py` |  / reg L11102 S33-C FIXED 6b378ef: timesheet file_url scheme allowlist server-side + safeHref render guard. |
| 134 | R2-132 | CRITICAL | FIXED | `three_way.py` |  / reg L5140 S33-C EVIDENCE e68160e: satisfied by R2-241 5c73713 (match_status/matched_by deleted from create schema); proof test added. |
| 135 | R2-133 | CRITICAL | FIXED | `three_way.py` |  / reg L5165 S33-C EVIDENCE 5a796ce: verdict server-owned (5c73713) + approver session-stamped (a76823c/R2-539); replay test added. |
| 136 | R2-240 | CRITICAL | FIXED | `three_way.py` |  / reg L10172 S33-C FIXED a1ad81e: three-way baseline capped at ordered-qty (cumulative-aware), tax-inclusive both branches; ordered/received/po_total |
| 137 | R2-538 | CRITICAL | FIXED | `three_way.py` |  / reg L27457 S33-C EVIDENCE 432cbf2: same defect as R2-133 half 1; stored-verdict replay test added. |
| 138 | R2-228 | CRITICAL | FIXED | `towers.py` |  / reg L9319 S33-C FIXED eca532e: consolidated-pnl returns ONE honest Overall row (no project-dressed-as-tower echo). |
| 139 | R2-248 | CRITICAL | FIXED | `towers.py` |  / reg L10557 S33-C FIXED ee3eac8: committed-towers single Overall row; scopes equal project-level endpoint. |
| 140 | R2-374 | CRITICAL | FIXED | `towers.py` |  / reg L17487 S33-C FIXED b877246: budget Overall row prefers ProjectBudget over tower-sum; per-tower schema stays CD-5-gated. |
| 141 | R2-205 | CRITICAL | FIXED | `wastage.py` |  / reg L7890 S33 VERIFIED: W83 production wave (R2-206 cluster) covered wastage_type enum + reported_by + estimated_value on this lineage. |
| 142 | R2-187 | CRITICAL | FIXED | `zoho_books.py` |  / reg L7012 S33-C EVIDENCE: zoho_bill_id column + pre-flight 409 + duplicate-code mapping live. |
| 143 | R2-209 | CRITICAL | FIXED | `zoho_books.py` |  / reg L8295 S33-C FIXED 5096c8a: Zoho bill push retries once without gst_treatment on non-GST orgs (code 8); zoho_bill_id persists. |
| 144 | R2-392 | CRITICAL | FIXED | `zoho_books.py` |  / reg L19238 S33 EVIDENCE: duplicate of R2-209 (5096c8a gst_treatment retry) - same file/element/failure mode. |
| 145 | R2-611 | HIGH | FIXED | `CalculatorTools.tsx` |  / filed S33 from R2-279 closure: public brick calculator (frontend/src/components/resources/CalculatorTools.tsx ~:433) keeps leaves independent of th |
| 146 | R2-199 | HIGH | FIXED | `PwaControls.tsx` |  / reg L7624 S33 FIXED de9793c: PWA push claims relabeled honest (Enable Notifications; no subscription loop exists - option B). |
| 147 | R2-166 | HIGH | FIXED | `UNMAPPED` |  / reg L6267 S33 FIXED 6061e32: attendance header band wraps at mobile widths (no more 494px overflow clip). |
| 148 | R2-189 | HIGH | FIXED | `UNMAPPED` |  / reg L7044 S33 EVIDENCE-CLOSE: prescribed gate already live via R2-192 136a82f (zoho push_bill billing:edit). |
| 149 | R2-245 | HIGH | FIXED | `UNMAPPED` |  / reg L10447 S33 FIXED b993298: MaterialWastage.estimated_value reaches Budget material_actual and P&L Material Cost (stock halves pre-closed by e99f |
| 150 | R2-314 | HIGH | FIXED | `UNMAPPED` |  / reg L14579 S33 FIXED 58c68ab: party ledger/all-party-balances keyed by stable identity (CompanyTeam/StaffEmployee id), names display-only. |
| 151 | R2-408 | HIGH | FIXED | `UNMAPPED` |  / reg L20115 S33 FIXED 9ee09fe: DPR reported_by stamped server-side from session user; free-text field removed from create schema. |
| 152 | R2-419 | HIGH | FIXED | `UNMAPPED` |  / reg L20884 S33 FIXED a11f45c evidence: subcon bill name resolution chain live since R2-174 4d06017; proof test added. |
| 153 | R2-438 | HIGH | FIXED | `UNMAPPED` |  / reg L21904 S33 FIXED 7164694: lead update rejects past expected_closure; phone dialable-only; priority vocabulary normalized. |
| 154 | R2-479 | HIGH | FIXED | `UNMAPPED` |  / reg L24035 S33 PARTIAL-CLOSED b83f08e: two-level PO approval chain verified enforced via existing engine (test); remaining inert categories = CD-1  |
| 155 | R2-294 | HIGH | FIXED | `admin_migrations.py` |  / reg L12969 S33 FIXED b78c8e6: duplicate /backfill-rbac already removed (487f564); app-wide duplicate-route guard test added (445 routes). |
| 156 | R2-305 | HIGH | FIXED | `analytics.py` |  / reg L13573 S33 FIXED f0bd000 (H-analytics): material wastage reads recorded MaterialWastage events; stock_variance_qty reported unclamped; test add |
| 157 | R2-306 | HIGH | FIXED | `analytics.py` |  / reg L13606 S33 EVIDENCE-CLOSE: spend filters already landed via R2-036 (9234220) + R2-036-bis (4ee3856); pinned by test_analytics_spend_excludes_sa |
| 158 | R2-329 | HIGH | FIXED | `analytics.py` |  / reg L15229 S33 FIXED 5b178e4 (H-analytics): stock reconciliation computed per material+unit so mixed-unit scalars cannot mask over-consumption; tes |
| 159 | R2-498 | HIGH | FIXED | `analytics.py` |  / reg L24992 S33 FIXED 6726e1b (H-analytics): Material Leakage tile raises explicit over-consumption warning instead of a clean pct over a glaring ga |
| 160 | R2-499 | HIGH | FIXED | `analytics.py` |  / reg L25018 S33 EVIDENCE-CLOSE: fixed by 248c809 (_resolve_team_name resolves LibraryParty.name); residual Team-{uuid} terminal fallback noted as si |
| 161 | R2-603 | HIGH | FIXED | `analytics.py` |  / filed S33 from R2-305/R2-499 closures: /financial fabricates demo chart data (fixed Jun-2026 labels + 1000 expense) when a company has no bills; fa |
| 162 | R2-722 | HIGH | FIXED | `auth.py` |  / Definition: docs/VERIFICATION_NEW_FINDINGS.md (founder block). S33 FIXED 80e5065 (H-auth-demo): OTP_DEMO_ALLOWLIST/OTP_DEMO_CODE defaults now empty |
| 163 | R2-289 | HIGH | FIXED | `bi_export.py` |  / reg L12691 S33 FIXED 79890c1: BI budget-variance partitions EXPENSE_INVOICE_TYPES per head like Budget (other_actual added); omission/cancel/tz par |
| 164 | R2-177 | HIGH | FIXED | `billing.py` |  / reg L6660 S33 FIXED ff20153 (H-billing): POST /billing/work-orders/{id}/cancel void path (409 double-cancel/open linked bills; editing window honou |
| 165 | R2-346 | HIGH | FIXED | `billing.py` |  / reg L16161 S33 FIXED bdec878 (H-billing): FIFO settlement only settles bills past review; ledger-integrity tests updated; gate test added. NOTE: en |
| 166 | R2-350 | HIGH | FIXED | `billing.py` |  / reg L16338 S33 EVIDENCE-CLOSE: both caller-controlled paths unreachable after R2-241 (5c73713) + R2-539 (a76823c); covered by test_r2_241/test_r2_5 |
| 167 | R2-377 | HIGH | FIXED | `billing.py` |  / reg L17640 S33 FIXED 21c681d (H-billing): retention release endpoint stamps released_at/amount with TDS/cancelled/unreviewed/double/over-release ga |
| 168 | R2-381 | HIGH | FIXED | `billing.py` |  / reg L17832 S33 FIXED e2ae07e (H-billing): restrict-entry window gates create_payment/record_payment_request/p2p_transfer in finance.py (register fi |
| 169 | R2-400 | HIGH | FIXED | `billing.py` |  / reg L19780 S33 FIXED 54db876 (H-billing): bill PDF addressee resolves CompanyTeam.library_party_id -> LibraryParty.name first; never login name or  |
| 170 | R2-401 | HIGH | FIXED | `billing.py` |  / reg L19815 S33 FIXED 2be273f (H-billing): tax invoices require non-empty described line items reconciling to subtotal (422); sibling payload tests  |
| 171 | R2-403 | HIGH | FIXED | `billing.py` |  / reg L19905 S33 FIXED 4e71ebb (H-billing): bill PDF prints registered supplier identity (legal name/GSTIN/phone/address; branch masthead precedence) |
| 172 | R2-480 | HIGH | FIXED | `billing.py` |  / reg L24052 S33 FIXED 518afa5 (H-billing): internal engineering notes in Settings replaced with honest customer copy; false no-server-PDF claim corr |
| 173 | R2-151 | HIGH | FIXED | `budget.py` |  / reg L5923 S33 EVIDENCE-CLOSE: actuals already computed from real data by 241f76c (R2-067 wave); behaviour gate exists at test_domain_formula_fixes. |
| 174 | R2-152 | HIGH | FIXED | `budget.py` |  / reg L5947 S33 FIXED dfca772 (H-budget): GET /budget/committed no longer persists ProjectBudget rows; missing budgets report zeros in memory; test a |
| 175 | R2-153 | HIGH | FIXED | `budget.py` |  / reg L5964 S33 FIXED b9c0a20 (H-budget): committed costs bucket ALL expense invoice types (material/subcon/equipment) via EXPENSE_INVOICE_TYPES with |
| 176 | R2-233 | HIGH | FIXED | `budget.py` |  / reg L9699 S33 FIXED 5c0ef9b (H-budget): budget actuals count only approval_flag=approved, status!=Cancelled bills; fixtures aligned; test added. |
| 177 | R2-237 | HIGH | FIXED | `budget.py` |  / reg L10016 S33 EVIDENCE-CLOSE: subsumed by R2-153 bucketing (b9c0a20) + 241f76c; covered by test_r2_153_budget_expense_bucket.py. |
| 178 | R2-242 | HIGH | FIXED | `budget.py` |  / reg L10285 S33 EVIDENCE-CLOSE: PO committed whitelist (sent/partial/received) already landed via R2-154 (bd41ec7); behavior test added 51384d6. |
| 179 | R2-249 | HIGH | FIXED | `budget.py` |  / reg L10623 S33 FIXED 57e5a7d (H-budget): tower Committed derived from status-whitelisted POs like the no-towers branch (project-level figure until  |
| 180 | R2-250 | HIGH | FIXED | `budget.py` |  / reg L10647 S33 EVIDENCE-CLOSE: tower actual expense-only filter landed via R2-036 (9234220); behavior test added 465f287. |
| 181 | R2-375 | HIGH | FIXED | `budget.py` |  / reg L17543 S33 EVIDENCE-CLOSE: duplicate of R2-249; closed by 57e5a7d; pinned by test_r2_249_tower_budget_committed_from_pos.py. |
| 182 | R2-604 | HIGH | FIXED | `budget.py` |  / filed S33 from R2-249/R2-250/R2-233 closures: no-towers branch (~:172) sums ALL PO statuses without the sent/partial/received whitelist, and neithe |
| 183 | R2-723 | HIGH | FIXED | `budget.py` |  / Definition: docs/VERIFICATION_NEW_FINDINGS.md (founder block). S33 FIXED 55af851 (H-cancelsweep): shared backend/app/bill_scope.py _active_bills he |
| 184 | R2-274 | HIGH | FIXED | `budgeting.py` |  / reg L11993 S33 FIXED c7c2828 (H-budgeting): first BOQ revision records previous_amount/delta from the value replaced; revised amount in BOQ PDF; te |
| 185 | R2-275 | HIGH | FIXED | `budgeting.py` |  / reg L12030 S33 FIXED fbc3f20 (H-budgeting): milestone_done > milestone_total rejected on create/patch (400) and PDF clamps legacy rows; test added. |
| 186 | R2-334 | HIGH | FIXED | `budgeting.py` |  / reg L15424 S33 FIXED 3175e8b (H-budgeting): BOQ cost codes must exist in company Cost Code Library (import + item create, atomic 400 naming unknown |
| 187 | R2-449 | HIGH | FIXED | `budgeting.py` |  / reg L22833 S33 FIXED 4df11c2 (H-budgeting): BOQ items gain PATCH (amount+rounding recompute, library gate parity) and DELETE (204, FKs SET NULL by  |
| 188 | R2-450 | HIGH | FIXED | `budgeting.py` |  / reg L22871 S33 FIXED 9be3e98 (H-budgeting): Excel import reports skipped_count + row-numbered warnings (ValueError/TypeError rows skipped, not 500) |
| 189 | R2-451 | HIGH | FIXED | `budgeting.py` |  / reg L22899 S33 FIXED a73965f (H-budgeting): _effective_unit_rate() composite-wins across import/item-create/PATCH/amount fallbacks so split rates n |
| 190 | R2-453 | HIGH | FIXED | `budgeting.py` |  / reg L22944 S33 FIXED c2af10a (H-budgeting): fake xlsx/zero-row sheets return clean 400s (BadZipFile/InvalidFileException/StopIteration handled), re |
| 191 | R2-279 | HIGH | FIXED | `calculators.py` |  / reg L12267 S33 FIXED 649476b (H-calculators): brickwork derives leaves from thickness_mm/(brick_width+joint), reports derived leaves, 422 outside 2 |
| 192 | R2-280 | HIGH | FIXED | `calculators.py` |  / reg L12310 S33 FIXED eed18dd (H-calculators): paint calculator rejects openings larger than walls (422 naming the rule) instead of returning negati |
| 193 | R2-281 | HIGH | FIXED | `calculators.py` |  / reg L12344 S33 FIXED 8798662 (H-calculators): concrete materials derive from dry_volume via grade true ratios (bags x1440/50); wastage_pct scales o |
| 194 | R2-519 | HIGH | FIXED | `calculators.py` |  / reg L26418 S33 FIXED d3c13b6 (H-calculators): client concrete factors corrected against server ratio math (M7.5 4.0->3.41, M20 8.2->8.06, M25 agg 0 |
| 195 | R2-520 | HIGH | FIXED | `calculators.py` |  / reg L26464 S33 FIXED 8798662 (H-calculators): same defect/lines as R2-281, one inseparable diff naming both ids. |
| 196 | R2-284 | HIGH | FIXED | `cashbook.py` | FIXED 8dd6afd; p2p transfers reject sender == receiver (422) covering both /cashbook/p2p and /finance/cashbook/p2p. |
| 197 | R2-141 | HIGH | FIXED | `chat.py` | FIXED fbbb93a; DELETE /chat/groups/{id} archives the group behind the group-admin guard instead of answering 405. |
| 198 | R2-142 | HIGH | FIXED | `chat.py` | FIXED f311485; chat group member mutations require server-side group-admin role; role values constrained to admin/member/viewer; last admin cannot be  |
| 199 | R2-143 | HIGH | FIXED | `chat.py` | FIXED 696216e; create_group ignores client-supplied created_by, stamps the creator CompanyTeam row and inserts the admin member in the same transactio |
| 200 | R2-471 | HIGH | FIXED | `chat.py` |  / reg L23671 S33 FIXED e74e46e: chat list_groups membership-filtered (colleagues see only their own groups). |
| 201 | R2-359 | HIGH | FIXED | `crm.py` |  / reg L16756 S33 FIXED d13efa8: lead source/category/status resolve against company lookups, unknowns 400. |
| 202 | R2-360 | HIGH | FIXED | `crm.py` |  / reg L16805 S33 FIXED ea6d6e0: Bill.quotation_id FK + convert-to-invoice endpoint with double-conversion 409. |
| 203 | R2-158 | HIGH | FIXED | `custom_fields.py` | FIXED 4d1b3d1; Set Value dispatches on field type - date values sent as value_date, number 0 no longer dropped into text rows. |
| 204 | R2-180 | HIGH | FIXED | `custom_fields.py` |  / reg L6781 S33 FIXED 6127791: custom-fields write models extra=forbid -> 422 naming unknown keys, atomic. |
| 205 | R2-260 | HIGH | FIXED | `custom_fields.py` | FIXED c92b707; custom field values validated against declared type/typed column, target entity must exist inside authorised company, is_required enfor |
| 206 | R2-301 | HIGH | FIXED | `delete_logs.py` |  / reg L13400 S33 FIXED c30bdd9: payment delete-log row carries deleted_by. |
| 207 | R2-536 | HIGH | FIXED | `delete_logs.py` |  / reg L27350 S33 FIXED 869c297: all 30 log_deletion call sites pass actor; deleted_by keyword-only required; AST-scanned. |
| 208 | R2-259 | HIGH | FIXED | `drawings.py` |  / reg L11191 S33 FIXED 873dc06: drawing approvals append-only ledger w/ terminal approved state + actor from caller (+model). |
| 209 | R2-366 | HIGH | FIXED | `drawings.py` |  / reg L17132 S33 FIXED-FULLY 23b3482: cross-revision file reuse blocked (duplicate_file check); R2-466 closed schemes/hosts. |
| 210 | R2-357 | HIGH | FIXED | `equipment.py` |  / reg L16652 S33 FIXED 0520005: EquipmentDeployment.hours_used recorded; P&L bills recorded hours (wall-clock legacy fallback). |
| 211 | R2-531 | HIGH | FIXED | `equipment.py` |  / reg L26989 S33 FIXED 020ddc6: availability derived from open schedules vs today; aware clock. |
| 212 | R2-556 | HIGH | FIXED | `equipment.py` |  / reg L28885 S33 FIXED b68fe92: all equipment write-path refs resolve-and-404 named. |
| 213 | R2-570 | HIGH | FIXED | `equipment.py` |  / reg L29839 S33 FIXED abadbf7: fuel bounds date, requires covering deployment, monotonic odometer. |
| 214 | R2-513 | HIGH | FIXED | `face_recognition.py` |  / reg L25769 S33-C FIXED 5456481: face logs legacy NULL created_at rows serialize honestly (no listing 500). |
| 215 | R2-175 | HIGH | FIXED | `files.py` |  / reg L6610 S33 FIXED be15612: DELETE file (tenant+data:delete+storage removal+audit log) and folder delete 409-while-nonempty. |
| 216 | R2-265 | HIGH | FIXED | `files.py` | FIXED 873d065 (top-up); first depreciation entry requires accumulated == depreciation_amount (parts a-chain and c rate-vs-life closed by a32d60e/a8539 |
| 217 | R2-179 | HIGH | FIXED | `finance.py` |  / reg L6746 S33 FIXED 1b1f22c: APPROVAL_FEATURE_TYPES canonical tuple + Literal in settings + enforcement constants imported by finance/procurement. |
| 218 | R2-238 | HIGH | FIX_VERIFIED | `finance.py` | `de6815f` / reg L10055; wave W01c; suite RC-025 S33 SWEEP: drift CONFIRMED live (settlement vouchers booked Material Bill/Cost, inverted sign) -> re-f |
| 219 | R2-276 | HIGH | FIX_VERIFIED | `finance.py` | `b998d8a` / reg L12064; wave W01c; suite RC-029; all surfaces closed |
| 220 | R2-311 | HIGH | FIXED | `finance.py` |  / reg L14081 S33 FIXED 5440cc7 evidence: rate limiter storage URI + proxy-aware key already wired by campaign rework; wiring tests added. |
| 221 | R2-316 | HIGH | FIX_VERIFIED | `finance.py` | `b998d8a` / reg L14645; wave W01c; suite RC-030; all surfaces closed |
| 222 | R2-328 | HIGH | FIXED | `finance.py` |  / reg L15113 S33 FIXED 5b231f8: company transactions scope by company_id (project-less payments no longer vanish; cash_balance agrees). |
| 223 | R2-343 | HIGH | FIX_VERIFIED | `finance.py` | `d63c2db` / reg L16005; wave W01c; suite RC-026 |
| 224 | R2-345 | HIGH | FIX_VERIFIED | `finance.py` | `a245605` / reg L16125; ESCALATED to founder - cross-project FIFO allocation is a product decision; direct-fix pass; suite RC-040 |
| 225 | R2-417 | HIGH | FIX_VERIFIED | `finance.py` | `a245605` / reg L20688; direct-fix pass; suite RC-041 |
| 226 | R2-534 | HIGH | FIX_VERIFIED | `finance.py` | `4b7add4` / reg L27209; direct-fix pass; suite RC-039 |
| 227 | R2-550 | HIGH | FIX_VERIFIED | `finance.py` | `4b7add4` / reg L28510; direct-fix pass; suite RC-037 |
| 228 | R2-192 | HIGH | FIXED | `google_drive.py` |  / reg L7114 S33 FIXED 136a82f: Sheets authorize settings:manage, payroll export module gate, Zoho push_bill billing:edit; google_drive verified compl |
| 229 | R2-033 | HIGH | FIX_VERIFIED | `hr.py` | `e2e449d` / reg L1471; hr.py direct-fix pass; suite RC-047 |
| 230 | R2-197 | HIGH | FIX_VERIFIED | `hr.py` | `acee51f` / reg L7438; hr.py direct-fix pass; suite RC-053 (frontend ESI ceiling; static) |
| 231 | R2-211 | HIGH | FIX_VERIFIED | `hr.py` | `034bc1e` / reg L8530; hr.py direct-fix pass; suite RC-065 |
| 232 | R2-220 | HIGH | FIX_VERIFIED | `hr.py` | `29a1bdb` / reg L9046; hr.py direct-fix pass; suite RC-063 |
| 233 | R2-325 | HIGH | FIX_VERIFIED | `hr.py` | `70f9750` / reg L14907; hr.py direct-fix pass; suite RC-057 |
| 234 | R2-354 | HIGH | FIX_VERIFIED | `hr.py` | `05a41e9` / reg L16516; hr.py direct-fix pass; suite RC-050 |
| 235 | R2-429 | HIGH | FIX_VERIFIED | `hr.py` | `034bc1e` / reg L21329; hr.py direct-fix pass; suite RC-067 |
| 236 | R2-475 | HIGH | FIX_VERIFIED | `hr.py` | `4134a11` / reg L23841; hr.py direct-fix pass; suite RC-054 |
| 237 | R2-527 | HIGH | FIX_VERIFIED | `hr.py` | `05a53c9` / reg L26813; hr.py direct-fix pass; suite RC-059 |
| 238 | R2-528 | HIGH | FIX_VERIFIED | `hr.py` | `4134a11` / reg L26861; hr.py direct-fix pass; suite RC-055 |
| 239 | R2-561 | HIGH | FIX_VERIFIED | `hr.py` | `4134a11` / reg L29446; hr.py direct-fix pass; suite RC-056 |
| 240 | R2-564 | HIGH | FIX_VERIFIED | `hr.py` | `ff2a2fc` / reg L29517; hr.py direct-fix pass; suite RC-062 |
| 241 | R2-593 | HIGH | FIX_VERIFIED | `hr.py` | `05a53c9` / reg L31102; hr.py direct-fix pass; suite RC-060 |
| 242 | R2-606 | HIGH | FIXED | `hr.py` |  / filed S33 from R2-381 closure: run_payroll period-based write still unguarded by the restrict-entry-creation window (same class as gated payments). |
| 243 | R2-185 | HIGH | FIXED | `labour.py` |  / reg L6958 S33 FIXED b3d3a77: BOCW CSV export neutralizes formula cells. |
| 244 | R2-263 | HIGH | FIXED | `labour.py` | FIXED 6884efe; muster roll hours bounded by workers_present x 24, overtime by hours_worked, BOCW wages require positive workers_count. |
| 245 | R2-333 | HIGH | FIXED | `labour.py` |  / reg L15364 S33 FIXED be0db97: muster roll upsert (project+contractor+day+role) - replay updates in place. |
| 246 | R2-415 | HIGH | FIXED | `labour.py` |  / reg L20535 S33 FIXED d81c0a8: BOCW return month validated, contractor resolved from store, figures derived from attendance/payroll/bills. |
| 247 | R2-507 | HIGH | FIXED | `labour.py` |  / reg L25354 S33 FIXED 7cde59f: omitted muster figures derive from attendance/crew data; empty day -> 422. |
| 248 | R2-440 | HIGH | FIXED | `library.py` |  / reg L21996 S33 FIXED 533fd3e: next_party_id_custom wired into subcontractor-create and CRM won-lead paths (no ID-less parties). |
| 249 | R2-384 | HIGH | FIXED | `mailer.py` |  / reg L17950 S33 FIXED fe94455: assignment notification resolution fail-closed across five shapes + best-effort fan-out. |
| 250 | R2-291 | HIGH | FIXED | `backend/app/main.py` | FIXED aeb5642; delete-logs router moved to /apis/v3/delete-logs, path ids UUID-typed (422 not ValueError-500), catch-all /apis/v3/{path} 404 handler a |
| 251 | R2-055 | HIGH | FIXED | `projects/page.tsx` |  / reg L2473 S33 FIXED 67a18c1: all 8 unchecked project-surface writes gate res.ok + surface detail; optimistic status reverts on failure. |
| 252 | R2-059 | HIGH | FIXED | `d/payment-approval/page.tsx` |  / reg L2596 S33 FIXED 51ebadc: payment approve/reject/mark-paid surface server detail on non-2xx + network-failure alert. |
| 253 | R2-087 | HIGH | FIXED | `d/finance/page.tsx` |  / reg L3692 S33 EVIDENCE-CLOSE: all prescribed components verified live (gst_treatment handling, account mapping, error surfacing); no change needed. |
| 254 | R2-155 | HIGH | FIXED | `d/custom-fields/page.tsx` | FIXED 0f6ba71; Set Value screen parses stored custom-field values into state and renders current value per field card. |
| 255 | R2-156 | HIGH | FIXED | `d/custom-fields/page.tsx` | FIXED b2955f1; field builder select cut to project/invoice (the wired entity types); list follows user-controlled entity-type filter. |
| 256 | R2-160 | HIGH | FIXED | `d/reports/calculators/page.tsx` |  / reg L6133 S33 FIXED 8ef468b: concrete tab has own column state (no steel-column bleed). |
| 257 | R2-161 | HIGH | FIXED | `page.tsx` |  / reg L6156 S33 FIXED f48dfb7: house-cost base rate editable input; fabricated CITY_MAP multipliers dropped; wall length/contingency exposed. |
| 258 | R2-163 | HIGH | FIXED | `page.tsx` |  / reg L6189 S33 FIXED 73e3cb6: console mirrors /calculators/house-cost math exactly (pre-contingency headline, no double-count). |
| 259 | R2-165 | HIGH | FIXED | `d/chat/page.tsx` | FIXED 35c756b; chat collapses to single pane below md with conversation list as drawer. |
| 260 | R2-203 | HIGH | FIXED | `d/safety/page.tsx` |  / reg L7843 S33 FIXED 5c7d445: safety caption renders API total_manhours_used instead of literal 50,000. |
| 261 | R2-216 | HIGH | FIXED | `d/procurement/page.tsx` |  / reg L8874 S33 FIXED 5de540c: isBilled derived from server three-way matches (survives refresh); mark-billed alerts honestly - no endpoint exists. |
| 262 | R2-224 | HIGH | FIXED | `d/team-action/page.tsx` |  / reg L9223 S33 FIXED cc07d3a: timesheet POST carries real UTC offset instead of fabricating Z on wall-clock values. |
| 263 | R2-393 | HIGH | FIXED | `reports/[slug]/page.tsx` |  / reg L19461 S33 EVIDENCE: funnel stages reconciled by R2-437 03673ef; custom-status mapping left founder decision. |
| 264 | R2-394 | HIGH | FIXED | `reports/[slug]/page.tsx` |  / reg L19509 S33 FIXED dd87dd9: Total Spent now sums expense-type rows from GET /finance/transactions (was POST-only 405 swallowed to empty). |
| 265 | R2-395 | HIGH | FIXED | `page.tsx` |  / reg L19597 S33 FIXED 3d10926: phantom xlsx menu entry removed; only producible formats offered. |
| 266 | R2-397 | HIGH | FIXED | `page.tsx` |  / reg L19653 S33 FIXED 96f6ffe: popup-blocked print fails honestly; HTML/print exports escapeHtml at all interpolation sites. |
| 267 | R2-422 | HIGH | FIXED | `dashboard/page.tsx` |  / reg L20993 S33-C EVIDENCE: fabricated dashboard state gone (bd928e7/f5f6749); projects init []. |
| 268 | R2-424 | HIGH | FIXED | `reports/dpr/page.tsx` |  / reg L21077 S33 FIXED f1f581a: DPR project filter derives options from real fetched rows (fictional options long gone via cd01b15). |
| 269 | R2-425 | HIGH | FIXED | `d/hr/page.tsx` |  / reg L21108 S33-C EVIDENCE: invented workers/PostGIS caption/site name gone; real geofence columns consumed. |
| 270 | R2-427 | HIGH | FIXED | `d/equipment/page.tsx` |  / reg L21214 S33 EVIDENCE-CLOSE: honest catch + empty states live via cd01b15/89839c9; no mock rows remain. |
| 271 | R2-445 | HIGH | FIXED | `delete-logs/page.tsx` |  / reg L22276 S33 FIXED ab7cb76: fetch errors render a named error row instead of the all-clear empty state (post-R2-310). |
| 272 | R2-454 | HIGH | FIXED | `boq/page.tsx` |  / reg L22978 S33 FIXED 024e3fd: shared downloadWithAuth (fetch+blob+anchor, non-2xx throws) for BOQ/Billing/Procurement PDFs - no more 401 tabs. |
| 273 | R2-463 | HIGH | FIXED | `frontend/src/app/c/[company_id]/d/page.tsx` |  / reg L23348 S33 FIXED e3ecaee: all 21 module redirect stubs await params, carry ?project=<id>, and ProjectContext prefers route/query id over stored |
| 274 | R2-465 | HIGH | FIXED | `d/drawings/page.tsx` |  / reg L23416 S33 EVIDENCE-CLOSE: publish failure already alerts + returns before setDrawings (3257e0a/7fa1131). |
| 275 | R2-466 | HIGH | FIXED | `page.tsx` |  / reg L23437 S33 FIXED ffe4f5f: drawings file URLs validated same-origin/https (blocks javascript:/data://host); seeded malicious rows need ops clean |
| 276 | R2-483 | HIGH | FIXED | `page.tsx` |  / reg L24208 S33 FIXED aafe230: brick thickness derives from leaves x width + joints - controls cannot disagree. |
| 277 | R2-484 | HIGH | FIXED | `page.tsx` |  / reg L24254 S33 FIXED fb67016: stirrup cut length 14d->6d matching the documented arithmetic. |
| 278 | R2-485 | HIGH | FIXED | `page.tsx` |  / reg L24287 S33 EVIDENCE-CLOSE: remedies already at HEAD via f48dfb7/590560f/73e3cb6 (inputs exposed, inert selector removed, honest split lines). |
| 279 | R2-494 | HIGH | FIXED | `subcon/page.tsx` |  / reg L24772 S33 FIXED ad8712f: subcon register renders honest em-dash (no fabricated 0%/Rs 0). |
| 280 | R2-502 | HIGH | FIXED | `production/page.tsx` |  / reg L25119 S33 FIXED f5e859d: output progress unclamped (200% shows 200%; bar cap preserved). |
| 281 | R2-506 | HIGH | FIXED | `safety/page.tsx` |  / reg L25316 S33 EVIDENCE-CLOSE: manhours caption already renders API value via R2-203 5c7d445. |
| 282 | R2-516 | HIGH | FIXED | `page.tsx` |  / reg L26195 S33 FIXED 6918efc: queued punches persist ISO capture time (server replay stamping still server-now - backend accepts no client ts). |
| 283 | R2-562 | HIGH | FIXED | `hr/page.tsx` |  / reg L29482 S33 EVIDENCE-CLOSE: negative durations impossible since 0977492 guard. |
| 284 | R2-589 | HIGH | FIXED | `d/quality/page.tsx` |  / reg L30544 S33 FIXED 9f294a5: is_pass null renders Not evaluated (no FAIL fabrication); tiles exclude it. |
| 285 | R2-590 | HIGH | FIX_VERIFIED | `d/quality/page.tsx` | `dabbcd8` / reg L30611; wave 0; suite RC-008/009/010 |
| 286 | R2-601 | HIGH | FIXED | `d/finance/page.tsx` |  / reg L32163 S33 FIXED 590fb02: steel price no longer hardcoded 62/kg - editable Steel Rate + Aggregate Rate inputs, zero-guarded memos; real file ca |
| 287 | R2-610 | HIGH | FIXED | `p/[project_id]/boq/page.tsx` |  / filed S33 from R2-450/R2-451 closures: project BOQ page ignores import response body (:250, no skip visibility) and recomputes qty x (rate+supply+i |
| 288 | R2-170 | HIGH | FIXED | `permissions.py` |  / reg L6399 S33 FIXED eda6dc4: attendance/drawings/reports in WORKFLOW_MODULES (re-added after a concurrent-write clobber lost 8c4c496 lines; mechani |
| 289 | R2-254 | HIGH | FIXED | `procurement.py` |  / reg L10940 S33 FIXED 5b0a14d: negative_stock_lock armed on production usage (completed batch over stock -> 400, zero txns); live site was productio |
| 290 | R2-297 | HIGH | FIXED | `procurement.py` | FIXED ef5f171; unit change refused (422) while on_hand_qty/reserved_qty non-zero. |
| 291 | R2-372 | HIGH | FIXED | `procurement.py` |  / reg L17397 S33 FIXED 4984fec: PO with indent_id flips indent to ordered; second PO 422; over-indent-qty 422 naming material. |
| 292 | R2-386 | HIGH | FIX_VERIFIED | `procurement.py` | `03db7a3` / reg L18068; procurement.py direct-fix pass; suite RC-087 |
| 293 | R2-387 | HIGH | FIXED | `procurement.py` |  / reg L18282 S33 FIXED 17d5ef9: stock adjustment type requires reason; adjustments never move received/consumed; /stock.adjusted folds into current_s |
| 294 | R2-478 | HIGH | FIXED | `procurement.py` |  / reg L24006 S33 FIXED 5d44289: po_restriction=on blocks unlinked POs (403); approved-indent path 201. Inert settings (bom_restriction etc.) left fou |
| 295 | R2-488 | HIGH | FIXED | `procurement.py` |  / reg L24517 S33 FIXED 93582b4: material page renders per-unit breakdown, never a cross-unit sum; rows keep non-null unit. |
| 296 | R2-607 | HIGH | FIXED | `procurement.py` |  / filed S33 from R2-403 closure: supplier identity stored but unprinted in PO PDF (:998), BOQ PDF (budgeting.py ~:649) and client report PDF (reports |
| 297 | R2-021 | HIGH | FIXED | `projects.py` |  / reg L964 / S33 FIXED e6170aa (D1): Billed In/Out rename + margin ex-GST. |
| 298 | R2-421 | HIGH | FIXED | `projects.py` |  / reg L20967 S33 FIXED 0a2f9f1: PROJECT_STATUS_PATTERN shared by projects PUT + planning PATCH (off-vocab 422). |
| 299 | R2-299 | HIGH | FIXED | `public_leads.py` |  / reg L13242 S33 FIXED b1d4968: rate limiter fleet-wide (storage URI documented + startup warning), proxy-aware bucket key behind explicit trust flag |
| 300 | R2-545 | HIGH | FIXED | `public_leads.py` |  / reg L28210 S33 FIXED f5ecf88: operator console read for captured leads (newest-first, email_sent), fail-closed ADMIN_MIGRATION_SECRET gate. |
| 301 | R2-041 | HIGH | FIXED | `reports.py` |  / reg L1745; DEFERRED per D-011 — needs place-of-supply schema S33 FIXED 520fb87 (D4): POS derives from Project.state (IGST s.12(3)); IGST inter-stat |
| 302 | R2-317 | HIGH | FIX_VERIFIED | `reports.py` | `723af26` / reg L14673; reports.py direct-fix pass; suite RC-070 |
| 303 | R2-318 | HIGH | FIX_VERIFIED | `reports.py` | `723af26` / reg L14704; reports.py direct-fix pass; suite RC-071 |
| 304 | R2-320 | HIGH | FIX_VERIFIED | `reports.py` | `723af26` / reg L14765; reports.py direct-fix pass; suite RC-072 |
| 305 | R2-323 | HIGH | FIX_VERIFIED | `reports.py` | `723af26` / reg L14840; reports.py direct-fix pass; suite RC-073 — weaker evidence, see suite note |
| 306 | R2-324 | HIGH | FIX_VERIFIED | `reports.py` | `723af26` / reg L14875; reports.py direct-fix pass; suite RC-068 |
| 307 | R2-560 | HIGH | FIX_VERIFIED | `reports.py` | `723af26` / reg L29155; reports.py direct-fix pass; suite RC-068/RC-069 — the swallow and the ledger accumulator |
| 308 | R2-598 | HIGH | FIXED | `rfq.py` |  / reg L31550 S33 FIXED d3b9bf8: RFQ send/close transitions added (draft->sent->closed, 409 invalid); CD-7 direction (a) implemented - founder to conf |
| 309 | R2-530 | HIGH | FIXED | `safety.py` |  / reg L26956 S33 FIXED ecdac7c: PPE checks reject negative worker counts. |
| 310 | R2-390 | HIGH | FIXED | `settings.py` |  / reg L18719 S33 FIXED 6e58eec (H-3way-settings): team-role assignment resolves user once, missing backing user answers 200 not 500, so privilege cha |
| 311 | R2-404 | HIGH | FIXED | `settings.py` |  / reg L19932 S33 FIXED ac9c310 (H-3way-settings): uploaded logo/signature/stamp decoded and embedded in bill/PO/BOQ/client-report PDFs (watermark beh |
| 312 | R2-546 | HIGH | FIXED | `settings.py` |  / reg L28243 S33 EVIDENCE-CLOSE 0dac2f2: bounds landed in 6e2f696 reject decimals 7/9 and unknown grn_numbering/name-display with 422; tripwire test  |
| 313 | R2-264 | HIGH | FIXED | `subcon.py` | FIXED 5df994e; subcon attendance shift_multiplier bounded 0.5-3.0, workers required when OT/allowance logged, OT capped at 12h per worker. |
| 314 | R2-296 | HIGH | FIXED | `subcon.py` | FIXED f2e276a; work-order amendments whitelist amendable fields {estimated_work_amount, terms}, applied in same transaction, amended_by from authentic |
| 315 | R2-332 | HIGH | FIXED | `subcon_attendance.py` |  / reg L15329 S33 FIXED d0ef1b5: subcon attendance idempotency key matches role trim/lower; inserts store trimmed role. |
| 316 | R2-597 | HIGH | FIXED | `subcon_performance.py` |  / reg L31481 S33 FIXED 768796a: scorecard empty history -> 0.0 metrics, never fabricated 100%. |
| 317 | R2-510 | HIGH | FIXED | `supabase_storage.py` |  / reg L25505 S33 FIXED d6edc4c: RLS tenant predicates on 108 tables + FORCE ROW LEVEL SECURITY + missing-table coverage (migration 20260824_000001);  |
| 318 | R2-517 | HIGH | FIXED | `supabase_storage.py` |  / reg L26217 S33 FIXED 402c5ad: signed URL joins /storage/v1 base (relative signedURL no longer produces broken host). |
| 319 | R2-267 | HIGH | FIXED | `tally.py` | FIXED 4c3e02b; Tally export books settlement bills as Receipt/Payment vouchers instead of Purchase. |
| 320 | R2-369 | HIGH | FIXED | `tally.py` |  / reg L17270 S33 FIXED 1e717ca: export holds voucher sequence (re-downloads byte-identical); mark-synced consumes. |
| 321 | R2-409 | HIGH | FIXED | `tally.py` |  / reg L20131 S33 FIXED 19cef93: payslip CSV identity block (pay period/run id/company/project) appended; lives in hr.py not tally.py. |
| 322 | R2-542 | HIGH | FIXED | `tally.py` | FIXED 12346aa; mark-synced requires settings:manage, unmark-synced route restores vouchers, /tally/pending reports pre-window exclusions. |
| 323 | R2-595 | HIGH | FIXED | `tally.py` | FIXED 937d984; Tally export resolves bank/cash ledger from its own account via bank mappings; /tally/mappings/bank gives the mapping table a writer. |
| 324 | R2-258 | HIGH | FIXED | `team_schedule.py` | FIXED 521d887; same-day timesheets with end_time not after start_time rejected with 422 instead of wrapping into phantom 23-hour shift. |
| 325 | R2-241 | HIGH | FIXED | `three_way.py` |  / reg L10228 S33 FIXED 5c73713 (H-3way-settings): match verdict server-computed from variance; match_status/matched_by removed from create schema; aw |
| 326 | R2-349 | HIGH | FIXED | `three_way.py` |  / reg L16310 S33 FIXED 1961a62 (H-3way-settings): reconciliation reads identified bill total_payable; invoice_id required on create; console form pic |
| 327 | R2-539 | HIGH | FIXED | `three_way.py` |  / reg L27497 S33 FIXED a76823c (H-3way-settings): approve/reject stamp session user + timestamp; caller approved_by ignored; rejected joins model voc |
| 328 | R2-594 | HIGH | FIXED | `three_way.py` |  / reg L31194 S33 FIXED 1fb4a64 (H-3way-settings): one match per PO/GRN pair (409 + unique constraint WITH additive dedupe-aware migration per live-sc |
| 329 | R2-613 | HIGH | FIXED | `three_way.py` |  / filed S33 from R2-594 closure: legacy duplicate three-way rows keep the additive unique constraint from enabling on prod (migration skips with NOTI |
| 330 | R2-383 | HIGH | FIXED | `todos.py` |  / reg L17913 S33 FIXED a3adb74: completion-time recurrence spawn (daily/weekly/monthly, month-end clamped, assignees copied). |
| 331 | R2-442 | HIGH | FIXED | `todos.py` |  / reg L22154 S33 FIXED e9a586b: legacy non-http(s) todo urls serialize null + clearable via PUT null; write allowlist e59316f. |
| 332 | R2-229 | HIGH | FIXED | `towers.py` |  / reg L9346 S33 FIXED 9a5685e evidence: towers Billed already revenue-only via _active_bills/REVENUE_INVOICE_TYPES; behavior test locks it. |
| 333 | R2-330 | HIGH | FIXED | `wastage.py` |  / reg L15266 S33 FIXED e99fac7: wastage gates stock availability, decrements inventory, writes used MaterialTransaction linked by source_ref_id. |
| 334 | R2-412 | HIGH | FIXED | `zatca.py` |  / reg L20303 S33 FIXED 28e8c0f: Zatca QR 409s unless enabled + VAT stored; GSTIN never fills tax slots. |
| 335 | R2-413 | HIGH | FIXED | `zatca.py` |  / reg L20329 S33 FIXED 34ec614: Zatca lines read real desc keys, derive qty x rate, 409 on unreconciled totals - fabricated Item line dead. |
| 336 | R2-188 | HIGH | FIXED | `zoho_books.py` | FIXED b6bf9e8; Zoho push resolves vendor from linked library party instead of inventing a contact named Vendor. |
| 337 | R2-272 | HIGH | FIXED | `zoho_books.py` |  / reg L11876 S33 FIXED c6e4b9d: tax-invoice PDF fields (title, recipient GSTIN, place of supply, HSN/SAC, IGST split) - real file billing.py not zoho |
| 338 | R2-368 | HIGH | FIXED | `zoho_books.py` | FIXED 52179b9; Zoho push persists bills.zoho_bill_id, short-circuits re-pushes with 409, maps duplicate codes 13011/3062 to 409. |
| 339 | R2-125 | MEDIUM | FIXED | `UNMAPPED` | NEEDS-DECISION -> D4; quotation structure is CGST/SGST-only (crm.py:585-587); adding IGST is a schema + tax-model change routed through D4 (OPEN, bloc |
| 340 | R2-218 | MEDIUM | FIXED | `UNMAPPED` | FIXED (evidence); handleCreateBill already refetches the bills list on success (billing page). |
| 341 | R2-537 | MEDIUM | FIXED | `UNMAPPED` | FIXED d9f99b3; log_deletion no longer commits or swallows - the audit row lands in the caller transaction (all-or-nothing); redundant try/except:pass  |
| 342 | R2-602 | MEDIUM | FIXED | `analytics.py` |  / filed S33 from R2-305 closure: project_spend (~:234) does not exclude Cancelled bills while operational spend (~:453) does; R2-370 sweep miss. reg  |
| 343 | R2-053 | MEDIUM | FIX_VERIFIED | `finance.py` | `a6bfdb4` / reg L2426; direct-fix pass; suite RC-033 S33 SWEEP: drift confirmed (schema required details vs nullable model) -> re-fixed b290d51 (Optio |
| 344 | R2-100 | MEDIUM | FIX_VERIFIED | `finance.py` | `a6bfdb4` / reg L4040; direct-fix pass; suite RC-035 |
| 345 | R2-347 | MEDIUM | FIX_VERIFIED | `finance.py` | `e69bcae` / reg L16181; direct-fix pass; suite RC-043 |
| 346 | R2-358 | MEDIUM | FIXED | `finance.py` | FIXED (evidence, PARTIAL stands); (b) per-company Equipment.code uniqueness already landed (a245605 + migration); (a) zero-rate report explicitly defe |
| 347 | R2-592 | MEDIUM | FIX_VERIFIED | `finance.py` | `e69bcae` / reg L30680; direct-fix pass; suite RC-044 |
| 348 | R2-608 | MEDIUM | FIXED | `finance.py` |  / filed S33 from R2-453 closure: generic except Exception -> 500 wrappers swallow user errors at finance.py:1407, hr.py:929, billing.py:663, procurem |
| 349 | R2-609 | MEDIUM | FIXED | `finance.py` |  / filed S33 from R2-334 closure: free-text cost_code fields written without library validation outside budgeting: finance.py Payment.cost_code/sub_co |
| 350 | R2-200 | MEDIUM | FIX_VERIFIED | `hr.py` | `29a1bdb` / reg L7643; hr.py direct-fix pass; suite RC-066 |
| 351 | R2-302 | MEDIUM | FIX_VERIFIED | `hr.py` | `acee51f` / reg L13433; hr.py direct-fix pass; suite RC-053 |
| 352 | R2-355 | MEDIUM | FIX_VERIFIED | `hr.py` | `05a41e9` / reg L16554; hr.py direct-fix pass; suite RC-051 |
| 353 | R2-481 | MEDIUM | FIX_VERIFIED | `hr.py` | `29a1bdb` / reg L24087; hr.py direct-fix pass; suite RC-064 |
| 354 | R2-529 | MEDIUM | FIX_VERIFIED | `hr.py` | `70f9750` / reg L26891; hr.py direct-fix pass; suite RC-058 |
| 355 | R2-385 | MEDIUM | FIXED | `models.py` |  / NEEDS-DECISION → CD-9 (see DECISIONS.md): TaskTodo vs Todo are both live and console-reachable; merging requires a surviving-vocabulary choice (is_ |
| 356 | R2-010 | MEDIUM | FIXED | `frontend/src/app/c/[company_id]/d/reports/calculators/page.tsx` |  / reg L522 / S33 FIXED dbea13e (CD-2): one shared calc module + contract tests. |
| 357 | R2-030 | MEDIUM | FIXED | `/boq/page.tsx` |  / reg L1417 / S33 FIXED b6c948f (D5): inline BOQ row + POST /boq-documents/{doc_id}/items. |
| 358 | R2-406 | MEDIUM | FIXED | `settings/page.tsx` | FIXED (evidence, 34d44b9); placeholder already reads "This section is not available yet." |
| 359 | R2-428 | MEDIUM | FIXED | `d/finance/page.tsx` | FIXED (evidence, cd01b15); finance CSV import template is header-only since the demo-data purge - no sample rows remain. |
| 360 | R2-518 | MEDIUM | FIXED | `page.tsx` | FIXED (evidence, 287db85); geolocation failure already blocks punches with an alert (R2-060) - no fabricated coordinates anywhere. |
| 361 | R2-612 | MEDIUM | FIXED | `three_way/page.tsx` |  / filed S33 from R2-594 closure: three-way page approve/reject handlers show no error message on non-2xx (success-toast discipline class). reg - S33  |
| 362 | R2-605 | MEDIUM | FIXED | `procurement.py` |  / filed S33 from R2-242 closure: reject_po (~:586-606) shows no visible assignment of approval_flag=rejected nor commit; possible dead rejection path |
| 363 | R2-286 | MEDIUM | FIX_VERIFIED | `reports.py` | `2ddc411` / reg L12577; reports.py direct-fix pass; suite RC-077 |
| 364 | R2-319 | MEDIUM | FIXED | `reports.py` |  / reg L14735; DEFERRED per D-011 — needs place-of-supply schema S33 FIXED 520fb87 (D4): state-required gate + site-derived IGST; completes D-011. |
| 365 | R2-321 | MEDIUM | FIX_VERIFIED | `reports.py` | `d4db32f` / reg L14796; reports.py direct-fix pass; suite RC-078 |
| 366 | R2-322 | MEDIUM | FIX_VERIFIED | `reports.py` | `d4db32f` / reg L14818; reports.py direct-fix pass; suite RC-079 |
| 367 | R2-414 | MEDIUM | FIX_VERIFIED | `reports.py` | `d4db32f` / reg L20452; reports.py direct-fix pass; suite RC-080 |
| 368 | R2-505 | MEDIUM | FIXED | `statutory.py` | FIXED (evidence, 6ef2cc8); PHASE 16 eyebrow already removed from d/production by the R2-023 sweep; zero PHASE matches in frontend/src. |
| 369 | R2-721 | MEDIUM | FIXED | `statutory.py` |  / Definition: docs/VERIFICATION_NEW_FINDINGS.md (founder block). S33 FIXED 25cdada (H-statutory-gate): report_type Literal allowlist + case normaliza |
| 370 | R2-614 | LOW | FIXED | `supabase_storage.py` |  / filed S33 from R2-404 closure: company branding upload validates asset_type but not bytes/content-type (harmless post-R2-404 since renderer skips j |
