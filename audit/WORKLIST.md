# Worklist — the map of all 582 findings

Generated from `AUDIT_FIX_REGISTER.md` (the authoritative source). **Regenerate/re-verify from the register whenever counts matter — never hand-total.**

## PHASES — the execution strategy (decided Session 25, founder-approved)

Ordering is **severity-ascending**, with founder-gates and live-only work last. One wave = one primary file; findings sharing a file are fixed together (severity-ascending within the file) so one commit's context covers its siblings; class sweeps get dedicated passes (one commit per touched file).

| Phase | Scope | Entry condition | Exit condition |
|---|---|---|---|
| **L** | 8 LOWs (R2-001, 002, 057, 070, 079, 085, 104, 120) | none | all closed, pins added |
| **M** | 123 MEDIUMs (minus gated), wave order W02→… | Phase L green | all closed, pins added |
| **H** | 184 HIGHs (minus gated), wave order | Phase M green | all closed, pins added |
| **C** | 98 CRITICALs (minus gated), wave order | Phase H green | all closed, pins added |
| **G** | 14 founder-gated (D1–D7, CD-1…CD-6, D-008/010/011/012/013) + schema/high-risk | founder answers in DECISIONS.md | decided + closed |
| **V** | live-only items (Render/Vercel/Supabase/browser/Sentry) | anything unreachable | founder agent verifies → FIX_VERIFIED. Standing rule 16: Check Sentry at 90-day window before and after every deploy -- '0 unresolved' at 14d is not '0 unresolved' (six were sitting just outside it, two from outage would have aged out within a fortnight). 0 unresolved at 90 days is definition of done. |

**Interconnection rules:**
- Fix-before orderings (dependency map): R2-042 before the D1-(a) option; R2-114 before D4; additive migrations before any dependent read; a LOW in a file with later CRITICALs is fixed now, pinned, and the file is re-read fresh in its CRITICAL wave.
- No drive-by fixes: siblings go in the Notes column, not the diff.

**Non-regression guarantees (per wave):**
- Every fix adds a tripwire pin to `test_regression_pins.py` BEFORE the wave closes; a red pin = reopened finding (never weaken).
- Verifier subagent reviews every commit; blast-radius template pre/post; `git fetch` + re-read the current code before each wave (register trust is never blind — R2-096/R2-054 lesson).
- Phase exit: `pytest tests/coverage/` (pins included) + `npm run build` green, counts recomputed from the register, push to main.

**Logging policy:** every session → SESSION_LOG; every status change → register; every new gate → DECISIONS.md; every surprise → LEARNINGS.md; anything impossible from our side → `DEFERRED-LIVE:<reason>` in the Notes + session entry (the founder's other agent promotes it after live verification).

**Phase L waves (first concrete queue):**
- L1 ✅ DONE (Session 26): R2-002 (Sidebar emoji → stroke icons, `807f092`) + R2-079 (missing company_id → login redirect, `a1d639b`)
- L2 ✅ DONE (Session 27): R2-001 (evidence-close — Material card opens a working drawer) + R2-104 (Tally summaries from sync logs, `a99e206`)
- L3 ✅ DONE (Session 28): R2-057 (gantt link errors use server detail, `b9a08e6`) + R2-070 (never-persisted indent photo picker dropped, `dd0ed9a`)
- L4 ✅ DONE (Session 29): R2-085 (evidence-close — phase labels already gone via R2-023) + R2-120 (Tally card + Payroll Runs tab name, `06cde63`)

## 🔶 PHASE H IN PROGRESS (Sessions 31-33) — 91 of 188 HIGHs closed (register basis; +13 new siblings filed R2-602..614)

## ⚠️ R2-727 ORPHAN-SHA SWEEP IN PROGRESS (Session 33) — runs BEFORE new Phase H waves
94 closed rows cite fix commits unreachable from campaign/waves (docs/VERIFICATION_ORPHAN_ROWS.txt on founder branch). Method: verify INTENT idiom-independently against live code, 5-row explore micro-chunks; DRIFTED rows get coder fixes with fully-inlined specs.
- finance.py: COMPLETE — 22/32 verified, 12 live defects found, 9 re-fixed (R2-053 b290d51, R2-221 f1a4c43, R2-231 e9dba8b, R2-238 125ebfa, R2-243 2803dad, R2-344+316 bf544f6, R2-417 c0cb9ff, R2-025/235/509 via R2-726 bbb6d51); 10 pending fix tasks spec'd in SESSION_LOG cont.3 (R2-052, R2-100+315, R2-236, R2-276, R2-327 remainder, R2-342+343, R2-533+534, R2-544+549, R2-592; R2-358/R2-420 unverified)
- NOT actionable: R2-345 (founder-escalated product decision)
- hr ×28, reports ×18, procurement ×9, scattered ×5: NOT STARTED

Completed waves:
- H-auth-settings ✅ 7/7 (R2-182, R2-186, R2-196, R2-285, R2-292, R2-405, R2-554; R2-457 evidence)
- H-qss ✅ 8/8 (R2-204, R2-212, R2-363, R2-364, R2-391, R2-551, R2-525, R2-526)
- H-pmp ✅ 14/14 (R2-441, R2-491, R2-552, R2-580, R2-582, R2-583, R2-202, R2-338, R2-340, R2-382, R2-230, R2-253, R2-433, R2-559)
- H-cf-chat ✅ 8/8 (R2-141, R2-142, R2-143, R2-155, R2-156, R2-158, R2-165, R2-260)
- H-zoho-tally ✅ 5/5 (R2-188, R2-267, R2-368, R2-542, R2-595)
- H-miscC ✅ 8/8 (R2-258, R2-263, R2-264, R2-265, R2-284, R2-291, R2-296, R2-297)
- H-analytics ✅ 5/5 Session 33 (R2-305/329/498 fixed; R2-306/499 evidence)
- H-budget ✅ 9/9 Session 33 (R2-152/153/233/249 fixed; R2-151/237/242/250/375 evidence)
- H-budgeting ✅ 7/7 Session 33 (R2-274/275/334/449/450/451/453)
- H-billing ✅ 9/9 Session 33 (R2-177/346/377/381/400/401/403/480 fixed; R2-350 evidence)
- H-calculators ◑ 3/5 Session 33 (R2-279/281/520 fixed; R2-280 and R2-519 still TODO — agent dispatches kept dying; long-form sketches at reg L12310/L26418)
- H-3way-settings ✅ 7/7 Session 33 (R2-241/349/539/594/390/404 fixed; R2-546 evidence)

Remaining HIGH clusters (~97 on the original register + the newly filed siblings):
- UNMAPPED/misc frontend: ~80 scattered across pages (projects/page, d/home W09 cluster ×9+R2-463, labour.py ×4, finance.py ×3, equipment.py ×4, procurement.py ×5, three_way/todos/zoho/tally/files/storage/etc.)
- Founder-gated inside HIGH: R2-021 (D1), R2-041 (D-011/D4), R2-195 (D-013), R2-335 (D-008)
- New sibling rows R2-602..R2-614 (filed Session 33 per verification-pass process note 4)

## ✅ PHASE L COMPLETE (Session 29) — 8/8 LOWs closed

## PHASE M — in progress (Sessions 30+)
- Batch 1 (Session 30): W36 ✅ 4/4 (R2-045, R2-066, R2-193, R2-251), W23 ✅ 3/3 (R2-071, R2-072, R2-428), W05 ✅ 6/6 (R2-298*, R2-336, R2-341*, R2-351, R2-572, R2-573 — *partial, gated by CD-7/CD-8), W11 ⏳ 2/4 (R2-136, R2-255 done; R2-461, R2-566 pending). W02 (other agent): R2-117, R2-119, R2-190, R2-213, R2-268 closed by external commits, registered.
- ⚠️ Tree-state: another agent is working in this checkout (~180 uncommitted files). Code waves PAUSED until the tree settles; central pins + batch verification deferred.
- Remaining Phase M queue (next): W15 models.py (5), W08 analytics.py (3), W06 settings.py (3), W12 statutory.py (3), W22 safety.py (3), W35 files.py (3), W10 projects.py (3), W07 billing.py (3), then the 2-finding waves (W79, W82, W19, W46, W17, W31, W14, W83, W41, W18) and the W02 remainder.

---

## Status summary (as of Session 24)

| Bucket | Count |
|---|---|
| TOTAL register rows | 582 |
| TODO (fixable) | 427 |
| FIXED (code in, awaiting founder live-verify) | 60 |
| FIX_VERIFIED (founder live-confirmed) | 93 |
| RETRACTED (duplicates) | 1 |
| WONTFIX | 1 |

TODO by severity: **CRITICAL 105 · HIGH 188 · MEDIUM 126 · LOW 8**

TODO split by decision gate:
- **Decision-free and fixable now: 413** (98 CRITICAL · 184 HIGH · 123 MEDIUM · 8 LOW) — work these without the founder.
- **Founder-gated: 14** (see below).

---

## Founder-gated findings (14) — do not guess these

| Finding | Severity | Gate | What the decision is |
|---|---|---|---|
| R2-021, R2-042 | HIGH | D1 | What "Cash In" means; margin basis (ex-GST vs GST-inclusive) |
| R2-043, R2-036* | CRITICAL | D3 | Should settlement types be Bill rows? (highest-leverage architecture decision; *R2-036's spend fix is done — D3 only gates the settlement-bill cleanup) |
| R2-041, R2-319 | HIGH/MED | D4 | GST place of supply: derive or keep the assumption (prereq: R2-114 GSTIN fix) |
| R2-030 | MEDIUM | D5 | BOQ manual entry vs Excel-only |
| R2-024 | CRITICAL | D6 | 2-minute env check: is the demo OTP path live on Render? Delete the button either way |
| R2-073, R2-113, R2-169 | CRITICAL | D7 | What "no permissions" means (fail-open vs fail-closed; role_id NULL policy) |
| R2-178 | CRITICAL | CD-1 | Approval categories: wire the 13 inert ones or cut to 2 (highest-priority open decision) |
| R2-010 | MEDIUM | CD-2 | Calculators: pick one of three remedies (wire to API / shared module / contract tests) |
| R2-149 | HIGH | CD-3 | To-Do recurrence: build the expansion runtime or remove the field project-wide |
| R2-039 | CRITICAL | D-012 | 86 hardcoded-empty report columns (5 of 91 done) |
| R2-184 | CRITICAL | D-010 | Needs object storage |
| R2-195 | HIGH | D-013 | Performance task, needs measurements |
| R2-335 | HIGH | D-008 | A missing feature, not a defect |

All details + options in `DECISIONS.md`.

---

## The decision-free queue (413)

Worked in waves (one primary file per wave), severity-first. The register is wave-ordered; the strongest remaining clusters by file:

| Wave | Primary file | TODO count | Notable CRITICALs in the wave |
|---|---|---|---|
| W12 | `statutory.py` | 8 | R2-126, R2-127, R2-128, R2-283, R2-522, R2-523, R2-524 |
| W26 | `face_recognition.py` | 3 | R2-027, R2-086 (Sentry-proven 500), R2-307 |
| W16 | `three_way.py` | 4 | R2-132, R2-133, R2-240, R2-538 |
| W08 | `analytics.py` | 5 | R2-080, R2-081, R2-303, R2-304, R2-497 |
| W14 | `auth.py` | 4 | R2-138, R2-181, R2-308, R2-511 |
| W33 | `towers.py` | 3 | R2-228, R2-248, R2-374 |
| W07 | `billing.py` | 2 | R2-028 (register row TODO despite the template example showing 50a4c89 — verify!), R2-131 |
| W34 | `dashboard/page.tsx` | 3 | R2-423, R2-447, R2-448 |
| W06 | `settings.py` | 4 | R2-288, R2-389, R2-462, R2-541 |
| W17 | `chat.py` | 3 | R2-140 (permanent chat deadlock), R2-468, R2-470 |
| W10 | `projects.py` | 3 | R2-226, R2-487, R2-557 |
| W11 | `planning.py` | 3 | R2-456, R2-458, R2-477 |
| W20 | `zoho_books.py` | 3 | R2-187, R2-209, R2-392 |
| W27 | `d/finance/page.tsx` | 2 | R2-099 (all-zero Finance; R2-198/R2-221 family) |
| W28 | `d/attendance/page.tsx` | 1 | R2-105 (evidence-close candidate — covered by R2-014's fix) |
| W30 | `library.py` | 2 | R2-123 |
| W32 | `custom_fields.py` | 2 | R2-157 (tenant-isolation read leak, live-demonstrated) |
| W18 | `quality.py` | 2 | R2-246, R2-362 |
| W22 | `safety.py` | 2 | R2-252 |
| W02 | `UNMAPPED` | 8 | R2-046, R2-271, R2-399, R2-407, R2-410, R2-418, R2-444 |
| ... | (every other wave in the register's wave table) | | |

**Evidence-close candidates** (verify by grep before closing, then mark FIXED with the fixing commit): R2-105 (R2-014's fix), plus any finding whose long-form line refs point at code that a later commit provably rewrote.

---

## Working rules

1. One wave = one primary file; severity-first within the wave; no drive-by fixes (write them in the Notes column).
2. Every fix: read `STRATEGY.md` (7 anti-regression rules), copy `BLAST_RADIUS_TEMPLATE.md`, delegate to the coder, verify with the verifier, update the register + `SESSION_LOG.md` + counts, and **add a pin to `test_regression_pins.py`**.
3. After every wave: `npm run build` (frontend) and `pytest tests/coverage/` (backend) — pins included.
4. Anything needing the founder: mark `DEFERRED:<reason>` in the Notes, ensure `DECISIONS.md` carries the question, move on.
5. Standing rule 16 -- Sentry 90-day window: SENTRY_DSN configured. Check Sentry at 90-day window before and after every deploy -- '0 unresolved' at default 14d is not '0 unresolved' (six were sitting just outside it, and two from outage would have aged out within a fortnight while still being real). 0 unresolved at 90 days is definition of done.
