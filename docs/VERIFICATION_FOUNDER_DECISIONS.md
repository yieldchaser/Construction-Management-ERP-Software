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

**Where it came from — CORRECTED 2026-08-22.** I first wrote that nothing recreates this tenant.
**That was wrong**, and the correction matters for the decision.

`GET /settings/company` used to create it, and R2-115 (`093fd10`) removed that path — verified. But
there is a **second, independent creation path** in a different router: `_ensure_demo_company`
(`auth.py:186`) creates the company *and* seeds its 5 projects, and it runs at `auth.py:415` on any
successful login by an allowlisted demo number. See R2-722.

So **deleting the rows alone will not hold** — the next demo-number login recreates them. The code
path has to go first.

R2-115's closure also judged the residual demo chain "cosmetic only". R2-719 contradicts that. The
fix is right; that assessment is not.

**These are not inert, and the count is larger than I first said.** A direct grep finds the sentinel
at 16 places across 13 files: **11 pages coalesce a missing `company_id` into the demo tenant's id**,
2 more default a *user* id to it in chat, and the attendance punch path defaults `selectedEmpId` to
the demo user and then **writes**. (My first figure of 8 came from a sweep that missed the ternary
form; corrected in R2-719.)

**One genuinely encouraging detail:** three other sites already do the right thing —
`layout.tsx:44,46` detects the sentinel in the route and rewrites the path away from it, and
`projects/page.tsx:62` checks for it. The correct handling exists in the codebase; it simply is not
applied at the 11 fallback sites. So the frontend half of this decision is "apply the guard you
already have", not "design something new".

**One more detail, in favour of deleting it.** The seeded demo company's GSTIN,
`27AADCD2424B1ZP`, has an **invalid check digit** — the canonical GSTN mod-36 algorithm gives `A`
for that body, not `P`. So the demo tenant would now be rejected by the product's own GSTIN
validation (R2-554, verified correct). It cannot be edited and saved as-is.

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

## D-V3 · Internal Transfer — RESOLVED, and it is not what I thought

**Source:** R2-712 instance 3, discharged by R2-720.

I said I would check what the endpoint persists before you decided. **It persists nothing, because
Save fires no request at all.**

`handleRecordPayment` branches for Party to Party and then falls through to
`if (!amount || amtVal <= 0 || !partyName.trim()) return;`. The Internal Transfer form has no party
field, so `partyName` is empty and the handler exits on a **bare return with no alert**. Verified
live in the test company: amount 2500 typed, Save clicked, `window.fetch` recorded zero calls, the
drawer stayed open, nothing was reported. The instrumentation was validated with a positive control
afterwards, so the zero is real.

**So the data-integrity worry is withdrawn.** No transfer rows carry bogus account names, because
no transfer rows are created. Nothing needs correcting and there is nothing to inspect.

**What remains is a smaller, ordinary decision:** the control looks functional and does nothing.
All three transfer types (Bank To Bank, Cash Deposit, Cash Withdraw) share the handler and the same
missing party field, so all three are inert.

**Options**

1. **Remove the control** until a real endpoint exists. Matches the audit's standing preference for
   an honest absence over a decorative affordance.
2. Build the handler and endpoint now.
3. Leave it, but make the bare `return` a visible error so it stops pretending.

**My recommendation: option 1**, with option 3 as the one-line stopgap if removal is awkward
mid-campaign. This is no longer urgent — downgraded from the money-path concern it looked like.

---

## D-V5 · Is the demo OTP path live on Render? (needs your environment)

**Source:** R2-722.

`OTP_DEMO_ALLOWLIST` defaults to `9876543210,+919876543210` and `OTP_DEMO_CODE` to `123456` **in
source** (`config.py:43-44`). The fixed code is accepted only when no SMS provider is configured
(`use_demo_code = is_demo and not provider_ready`), so the answer turns entirely on your Render
environment.

**I did not probe this.** Determining `provider_ready` live means calling `/auth/send-otp`, which
sends a real message to whatever number is submitted — I was not willing to message an arbitrary
handset to satisfy a check.

**What I need from you:** whether Render sets an SMS provider, and whether it overrides
`OTP_DEMO_ALLOWLIST` / `OTP_DEMO_CODE`.

- **SMS configured and allowlist overridden** → no bypass; R2-722 reduces to the demo-tenant
  recreation, which still wants fixing.
- **SMS not configured** → `9876543210` + `123456` is a working login to the demo tenant on the
  public API. That would be the most urgent item in this file.

**My recommendation regardless of the answer:** the defaults should be empty strings in source, so
an unset env disables the path instead of enabling a known credential.

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
| D-V3 | 2026-08-21 | **resolved by verification — downgraded, see R2-720** | 2026-08-21 |
| D-V4 | 2026-08-21 | pending | — |
| D-V5 | 2026-08-22 | pending — **needs your Render env** | — |
