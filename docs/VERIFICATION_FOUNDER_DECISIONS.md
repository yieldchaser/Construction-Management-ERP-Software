# Pending founder decisions — verification phase

**Nothing here blocks the verification pass.** Founder's instruction (2026-08-21): batch every
decision to the end and take them in one sitting. Items are appended as they surface, with enough
context to decide without re-reading the finding.

The fix campaign keeps its own gated list in `audit/DECISIONS.md`. This file is only the decisions
that came out of **independent verification**, so the two do not collide.

Each item states what is true, what the options are, and what I would do — so the decision is a
yes/no, not an investigation.

---

## D-V1 · A demo tenant lives in the production database

**Source:** R2-719 Tier 1.

`companies` row `e0000000-0000-0000-0000-000000000000` is **"Demo Construction Ltd"** and holds
**5 projects**. `users` row `e0000000-0000-0000-0000-000000000100` is **"Demo Engineer" /
demo@siteflow.co**.

**Where it came from.** `GET /settings/company` used to *create* it: if the requested company id
was the sentinel UUID, the endpoint INSERTed "Demo Construction Ltd" and committed. R2-115
(`093fd10`) removed that and now 404s — verified. So the tenant is a leftover of the old behaviour,
and nothing recreates it today. That makes deleting it safer than it would otherwise be.

R2-115's closure also judged the residual demo chain "cosmetic only". R2-719 contradicts that: six
pages still send the sentinel company id, and the attendance punch path writes against the sentinel
user. The fix is right; that assessment is not.

These are not inert. Eight console sites coalesce a missing route param or employee id into exactly
those UUIDs, so six pages will fetch that tenant's data and the attendance punch path will write
against that user.

**Options**

1. **Delete both rows**, and make the fallbacks throw. Cleanest. Needs a check first for anything
   else referencing them (5 projects and their children cascade).
2. **Keep them, remove every fallback.** The demo tenant stays available for screenshots and demos;
   the code can no longer reach it by accident.
3. Keep both as-is. Not recommended — the write path is the problem, not the rows.

**My recommendation: option 2 now, option 1 when you no longer need a demo tenant.** Removing the
fallbacks is the part that actually fixes the defect; deleting the rows is a separate cleanup and
carries cascade risk.

---

## D-V2 · The seven missing unique constraints — apply now or later

**Source:** R2-701, R2-702.

Six document-number uniques (PO, GRN, indent, bill, work order, cost code) plus `company_team`
membership exist in `models.py` and **in no migration**, so they do not exist in production.
Duplicate document numbers are accepted today.

**The window matters.** Duplicate count is currently **zero** on all six pairs, so
`CREATE UNIQUE INDEX` applies cleanly with no data decision. Once real duplicates exist, each one
becomes a "which row survives" judgement on live records.

**Options**

1. **Write and apply the migration now**, while the count is zero.
2. Defer until the fix campaign reaches its schema phase, and accept a dedupe exercise later.

**My recommendation: option 1, and it is the one time-sensitive item in this file.** The fix is one
migration file; every week of real data makes it harder.

---

## D-V3 · Internal Transfer writes account names that exist for nobody

**Source:** R2-712 instance 3.

Finance → Transaction → **+ Internal Transfer** offers three hardcoded accounts and defaults its
state to them. `bank_accounts` holds **zero rows for the entire database**, so account selection is
a free-text string matching no record for any company.

This is a money-movement path. The question needing your decision is not whether to fix the
dropdown — it is **what the endpoint has already persisted**, and whether any transfer records need
correcting.

**Options**

1. Wire the dropdowns to `bank_accounts`/`cash_accounts`, and treat existing transfer rows as
   suspect until inspected.
2. Disable the Internal Transfer control until it is wired.

**My recommendation: option 2 until the endpoint is inspected**, because a money path that writes
unresolvable account names should not stay reachable while it is being investigated. I have not
yet checked what the endpoint stores — that is next in the pass, and may downgrade this.

---

## D-V4 · Whether to backfill behavioural tests for the 61 gate-less CRITICALs

**Source:** R2-718.

169 of 315 closed findings have no automated gate; 61 of those are CRITICAL, and 28 rows have
neither a pin nor a test at all.

This is a scope question, not a defect: writing 61 behavioural tests is real work, and some of
those findings may not be testable without fixtures that do not exist.

**Options**

1. Backfill behavioural tests for all 61 CRITICALs.
2. Backfill the **28 zero-evidence rows** only — the ones where nothing at all would notice a
   regression — and record a reason on the rest.
3. Accept the gap with a logged decision and rely on the verification pass instead.

**My recommendation: option 2.** It is bounded, it targets the rows with literally no evidence, and
it turns the remaining absence into a recorded decision rather than an oversight.

---

## Log

| id | raised | decision | date |
|---|---|---|---|
| D-V1 | 2026-08-21 | pending | — |
| D-V2 | 2026-08-21 | pending — **time-sensitive** | — |
| D-V3 | 2026-08-21 | pending | — |
| D-V4 | 2026-08-21 | pending | — |
