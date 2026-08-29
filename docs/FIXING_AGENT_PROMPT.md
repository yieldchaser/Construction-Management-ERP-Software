# Prompt for the fixing agent

Copy everything between the lines below into a fresh session.

---

You are fixing SiteFlow, a construction ERP (FastAPI + SQLAlchemy on Render, Next.js 15 on Vercel,
Supabase Postgres). It has just come out of a 599-finding audit and a 370-row independent
verification. Your job is to clear the remaining work **without creating new defects**, because the
verification that found this work took months and we are not doing it again.

## Start here

Read `docs/REMEDIATION_MASTER_PLAN.md` completely before you touch anything. It is the authoritative
index and it names every other document you need. Do not begin from any other file — the outstanding
work is spread across three sources and that plan is what unifies them.

Then read, in this order:
1. `docs/REMEDIATION_MASTER_PLAN.md` — **Part F first** (how fixes have failed in this specific
   codebase, and the interaction warnings), then Parts A–E.
2. `docs/VERIFICATION_NEW_FINDINGS.md` — full write-ups of findings R2-743 … R2-764.
3. For any register row you are fixing, its verdict in
   `scripts/verification/VERIFICATION_REGISTER.md` (search the row id).

## The work

- **Part A** — 22 findings, R2-743 … R2-764. Each has mechanism, evidence, a fix and a gate.
- **Part B** — 23 regressions. Fifteen close when you fix the mapped Part A finding. **Eight have no
  finding number and are the most dangerous items in the plan**, because they were recorded as fixed
  against commits that never reached `origin/main`. Do these first.
- **Part C** — 11 recorded observations with the reasoning for each. Cheap; overrule the reasoning if
  you disagree, but say so.
- **Part D** — ops, data and infrastructure. **Not code. Do not attempt these.**
- **Part E** — competitor parity, only after A and B.

Work in the order given in **Part G** unless you have a reason to deviate; if you deviate, say why.

## Hard rules

1. **Read every finding as originally filed, never the summary.**
   `git show campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md`, then find `### FINDING R2-xxx`.
   **Do not check out `campaign/waves`.** Verifying against a summary is exactly how a partial fix
   passed review last time.
2. **Count the clauses before you start.** If a finding names three things, your PR lists three
   outcomes. Uneven clause closure produced four of the 23 regressions.
3. **When you fix a shared helper, sweep every call site by scanning for the mechanism, not by
   listing known files** — then state the count in the commit ("5 of 5 CSV builders"). One helper
   applied to some surfaces and not others is the single most common failure mode here.
4. **Confirm every fix is actually on main:** `git merge-base --is-ancestor <sha> origin/main`.
   Never use `git rev-parse` for this — it resolves orphan-branch commits happily and proves nothing.
5. **Never merge `claude/siteflow-audit-round10-cont-f6961b`.** Fixes exist on that orphan branch;
   reimplement them from the description.
6. **Do not edit anything under `audit/`.** Do not touch the opencode worktree under
   `AppData/Local/Temp/opencode/siteflow-waves`.
7. **Fix at the layer that makes the defect unrepresentable** — constrain the schema, derive the value
   server-side, or centralise the rule in one module. The fixes that regressed here patched a call
   site; the ones that held changed what could be expressed.
8. **Never fabricate a value to fill a gap.** The strongest closures in this audit refused: `None`
   instead of `0.0` when there is no data, one honest "Overall" row instead of per-tower guesses,
   removing a false claim instead of faking the feature. Follow that.
9. **Migrations are additive and dedupe-aware.** Follow the pattern already in the tree: skip with a
   NOTICE if existing data would violate a new constraint, and purge separately. Production DDL needs
   the founder's explicit go-ahead — ask, do not run it.
10. **If you cannot close a clause, say so in the commit and add it to `docs/BACKLOG.md` with a
    D-code.** An honest disclosed residual is fine. A row marked closed for work that was not done is
    what produced this plan.

## Gates

Several findings ask for an **enumeration test** — one that discovers surfaces by scanning for the
mechanism rather than listing known files. Write those; per-file pins are what let the misses through:

- every CSV-producing path neutralises a leading `= + - @` (R2-743, R2-755)
- every path constructing a `Bill` passes through `_validate_bill_line_items` (R2-745)
- every model with a `cost_code` column validates against `LibraryCostCode` (R2-764)
- every write endpoint taking `company_id` in its **body** rather than its path is tenant-checked
  (R2-049 class, R2-751)

**The closure standard on this project:** the test must run against the unfixed tree and **fail at the
defect's assertion**. "Fixed by analogy" is not a closure. If your test passes before your fix, the
test is wrong.

## Interaction warnings

Part F4 of the plan lists the fixes that collide. The ones that will bite hardest:

- **R2-745 and R2-747 are the same function** — fix in one pass. The `Project.state` guard above the
  bug cites the statute and then never reads the value; it is not the place-of-supply fix it appears
  to be.
- **R2-753 before R2-754.** Holiday dates are stored a day early *and* not read by payroll. Fixing the
  second alone gives payroll a correct pipeline fed by wrong dates.
- **R2-750 before any location work** — no project can store coordinates today, so every geofence
  feature is inert regardless of how correct its code is.
- **R2-533 and R2-534 are the same handler** (`finance.py:1602-1723`). The single-payment endpoint at
  `:223-232` already has the duplicate guard the CSV path bypasses — reuse it.
- **Decide IST vs UTC once, globally**, before touching any date handling.

## What is already verified — do not re-audit

Database schema (1,458 columns across 139 tables match production), migrations (ledger at 51, applied,
CI-gated), RLS (policies correct and **deliberately inert by design — do not switch the DB role**), API
tenant isolation (180 live cross-tenant probes over 106 routes, zero leaks), Sentry (0 unresolved at a
90-day window).

## Working agreement

- Commit per finding or per tightly-coupled group, with the finding id in the message and the clause
  count you closed.
- Check Sentry at a **90-day** window before and after any deploy; the default 14d hides real issues.
- Writes are allowed in the `ZZ R8 Throwaway` tenant (`1fa705a4-7aa6-42f2-9906-65902c96916f`).
  Production DDL needs the founder's explicit approval first.
- When you finish a batch, report: what you closed, what you left open and why, and the command whose
  output proves each fix — not a claim that it works.

---

## Optional second message, if you want parity work in the same run

> After Parts A, B and C are complete and verified, do Part E from
> `docs/COMPETITOR_PARITY_ONSITE.md`, tier by tier. Tier 1 should already be done — it ships as a
> by-product of R2-762, R2-763, R2-764 and R2-750. Before building any new surface, note that every
> new surface must obey the rules this audit established: server-computed identity, permission gates,
> honest empty states, validated vocabularies, no fabricated values. Adding a feature carelessly
> reopens the classes this audit spent months closing.
