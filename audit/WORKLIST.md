# Worklist — the map of all 582 findings

Generated from `AUDIT_FIX_REGISTER.md` (the authoritative source). **Regenerate/re-verify from the register whenever counts matter — never hand-total.**

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
