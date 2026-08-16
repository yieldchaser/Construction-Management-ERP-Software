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
| **V** | live-only items (Render/Vercel/Supabase/browser/Sentry) | anything unreachable | founder agent verifies → FIX_VERIFIED |

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

## ✅ PHASE L COMPLETE (Session 29) — 8/8 LOWs closed, exit condition met (pytest 254/254 incl. 37 pins, npm build green, counts recomputed from the register, pushed)

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
