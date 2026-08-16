# Learnings — mistakes not to repeat

This file records every lesson the campaign has paid for, so no session re-learns it. Add to it whenever a fix surprises you. Every entry has a source session so the trail is traceable.

---

## 1. Regressions — the two incidents (Sessions 23-24)

**What happened:** two founder-verified fixes were silently reintroduced in broken form by parallel-branch merges:
- R2-096 party-balance formula (`f8c097f`, a Finance-module rebuild based *before* the original fix, reintroduced the wrong formula + the to_pay-first ladder).
- R2-054 PR-number collision loop (same rebuild reintroduced plain `count + 1`).

**Why nothing caught it:** no test pinned either fix. The suite stayed green because nothing asserted the formulas.

**The rule that now exists:**
1. Every closed fix gets a **tripwire pin** in `backend/tests/coverage/test_regression_pins.py` (27 pins; reads current sources; fails loudly naming the finding).
2. A red pin is a REOPENED finding — fix the code, never weaken the pin.
3. `git fetch origin main` before each wave; if a branch merge looks parallel-built (not based on the latest main), diff the touched files against the register's commit hashes.
4. Verification greps beat register trust: **always re-read the code** — a FIX_VERIFIED row does not mean the code still contains the fix.

## 2. Audit line references go stale (Sessions 8-24)

The raw log's `L<NNN>` references describe the code at audit time. The codebase moves (parallel branches, refactors, later fixes). **Every session: verify the line numbers before delegating, and treat "already fixed" as a hypothesis to prove by grep** (R2-017, R2-061, R2-097, R2-009's consts, R2-110, R2-167 were all evidence-closed this way — and R2-009's register "FIXED" was premature, the consts survived).

## 3. Duplicate findings exist (R2-109, R2-439, R2-591...)

The same defect was filed more than once (R2-032/R2-109 CTC, R2-098/R2-439 PID). When fixing, grep the raw log for the finding's mechanism before treating it as unique; when closing, check the canonical's retraction table. Marked RETRACTED in the register, recorded in `AUDIT_CANONICAL_FINDINGS.md`.

## 4. The fabricated-data class (Sessions 8-24)

A recurring defect family: hardcoded demo/invented data shipped in the console — stock photos (`unsplash`), invented vendors/materials/fleets/quotes, phantom files/folders, fake success messages, placeholder IDs. The pin suite now enforces `unsplash` = 0 repo-wide and other absence pins. **When building a screen, assume the API answers with empty arrays and render an honest empty state.**

## 5. Two implementations of one formula = drift (R2-010)

The calculators exist twice (console `useMemo` + backend endpoints) with no contract test. The same pattern appeared in payroll (deleted in R2-065) and elsewhere. **Never ship a second implementation of a formula that already exists server-side; wire to the API or extract one shared module.**

## 6. Vocabulary drift (R2-003, R2-084, R2-011, R2-031, R2-106)

Hand-typed status/type lists drift from the canonical set: "Onhold" vs "On Hold", "Not Started" vs "Planning", `lead` vs `crm_lead`, "in_progress" vs "ongoing", the 15 approval categories vs 2 consulted. **Enumerate every dropdown/const that feeds a constrained field** — grepping literal assignments is not verification. Pin the canonical forms.

## 7. Frontend field-name traps (R2-108-bis)

The backend field is `employee_code`; the frontend read `emp.code` — a silent no-op that renders nothing and compiles fine. **Map API payload fields explicitly; a `??` chain to a legacy name is a code smell that the pin suite should watch.**

## 8. The Decimal/float trap (R2-035)

`Decimal("75") / 100.0` raises TypeError in Python 3. SQLAlchemy `Numeric` columns yield `Decimal` at runtime. **Wrap Numeric-derived values in `float(...)` before float math.**

## 9. Success-toast discipline (R2-013, R2-050, R2-148, R2-094, R2-006...)

The most misleading failure mode in the product: toasting/displaying success without a confirmed 2xx. **Toast only inside `res.ok`; alert the server detail on failure; refetch rather than patching local state.** The GRN/PO/usage handlers were all converted off this class.

## 10. Uncontrolled inputs silently discard edits (R2-013, R2-012, R2-018)

`defaultValue` with no `onChange`/state = edits that never exist anywhere. The pin suite bans `defaultValue` in d/hr. **Every form input must be controlled.**

## 11. Empty state standing in for unknown state (R2-121, R2-099 family)

Rendering "you have none" while the fetch is in flight (or when it failed) hides data loss. **Render loading state until the request settles; empty state only after.**

## 12. The register is the source of truth for COUNTING

START_HERE's numbers are recomputed directly from the register (582 rows; statuses sum to 582). Session-19's hand arithmetic drifted by 3. **Never hand-total; count from the register.**

## 13. Placeholder/reference data in payloads (R2-051, R2-068)

`po_item_id: "placeholder-0"` and hardcoded photo URLs were sent as real data. **Never transmit a fabricated identifier or URL; if the real id isn't available, abort with an honest message.**

## 14. Em-dash rule has one exception (R2-063-bis)

No em dashes in *prose* (alerts, copy). But the codebase's established empty-value **display glyph** is the em dash U+2014 ("—") — used consistently in mappings. ASCII "-" misapplied the prose rule to a display glyph (verifier rejected it).

## 15. Test seeds and FK contracts (R2-067, R2-096 tests)

Several test seeds violate FK contracts (company_team id used for staff_employees; bills with random project ids) — they pass only because SQLite runs with FK enforcement off. **Mirror the sibling pattern, but prefer valid FK values; flag latent FK seeds in the register.**

## 16. Verification beats authorship (every session)

The verifier subagent has caught: a silent no-op (R2-108), a false "absent" claim (R2-062), a wrong glyph (R2-063), an exit-code inversion in my own Dockerfile loop (R2-infra), and a register/status discrepancy (R2-009). **The verifier is not a formality — it is the last line of defense.**

## 17. Evidence-close discipline (Sessions 25-27)

Several findings are already fixed in the tree when we reach them (R2-017, R2-061, R2-097, R2-110, R2-167, R2-001). The rules: (a) verify by grep + read, never by register trust; (b) if the current code satisfies the finding's intent even by a different mechanism (R2-001's working drawer vs the audit's "dead card"), close with evidence and note the divergence; (c) record the fixing commit; (d) still add a pin when a meaningful tripwire exists. Also: the register's primary-file attribution is occasionally wrong (R2-001 says payment-approval, the card is in d/home) — trust the finding's "Where" over the register's file column.

---

## How to add a learning

1. Append here with the source session.
2. If the learning has a tripwire, make sure `test_regression_pins.py` enforces it.
3. Reference it from the register row of the finding that produced it (Notes column).
