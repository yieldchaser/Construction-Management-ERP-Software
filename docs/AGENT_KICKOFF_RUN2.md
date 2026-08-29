# Kickoff message — remediation run 2

Copy everything below the line into a fresh session.

---

You are continuing the SiteFlow remediation (construction ERP: FastAPI + SQLAlchemy on Render,
Next.js on Vercel, Supabase Postgres). A previous run closed the most critical half. Your job is the
rest. Work autonomously end to end — I do not want to be consulted between items.

## Setup

Everything you need is already on `origin/main`. **No branch archaeology needed** — the previous run's
merge problem is resolved and the plan is merged. Just:

```bash
git fetch origin main && git checkout main && git pull
```

Read `docs/REMEDIATION_MASTER_PLAN.md` completely first. Its **STATUS block at the top** tells you
exactly what is already closed and what remains — that state has been independently verified against
source, so trust it and **do not redo closed work**. Then read **Part F** (how fixes have failed in
this specific codebase) before writing any code.

Full write-ups of every finding are in `docs/VERIFICATION_NEW_FINDINGS.md`.

## Already closed — do not touch

All 8 Part B unmapped regressions (R2-533, R2-534, R2-599, R2-049, R2-358, R2-317, R2-371, R2-588),
all 4 Part A CRITICALs (R2-743, R2-744, R2-745, R2-746), HIGHs R2-747, R2-750, R2-751, R2-755, and
Part C item C1. Verified on `main`.

## Your work, in order

**G0 — FIRST, before any fix: triage the failing test suite.**

`python -m pytest` in `backend/` currently reports **45 failures across 16 files** (41 AssertionError,
2 KeyError, 1 SyntaxError). They predate this run. You cannot prove you introduced no regression
against a red baseline nobody has characterised, so characterise it.

For each failure, decide: `CODE_DEFECT` (the code is genuinely wrong), `BROKEN_TEST` (the test itself
is faulty), or `STALE_EXPECTATION` (the test asserts behaviour that was deliberately changed). Fix the
broken tests. File any genuine code defect as a new finding, continuing the numbering from **R2-765**.
Write the triage table into `docs/TEST_BASELINE_TRIAGE.md` and commit it.

One is already solved for you, as a worked example of what to look for:
`tests/coverage/test_r2_536_delete_log_records_actor.py:35` opens source files with
`encoding="utf-8"` and dies on the UTF-8 BOM in `admin_migrations.py` **before it scans anything**.
The underlying code is fine — an independent AST scan of current `main` finds **32 `log_deletion` call
sites with zero missing `deleted_by`**. It is a **broken gate, not a broken codebase**. Fix is
`utf-8-sig`. Several other failures guard findings this audit already verified as fixed (R2-487,
R2-412/413, the regression pins), so treat a red one there as suspicious in both directions.

**Then, in this order:**

1. **D-014** — Part A HIGH: R2-749, R2-753, R2-754, R2-756, R2-758, R2-762, R2-764.
   **R2-753 must precede R2-754** (holiday dates are stored a day early *and* never reach payroll;
   fixing the second alone gives payroll a correct pipeline fed by wrong dates).
   **R2-764 is the "helper applied to some surfaces" class** — four write paths, sweep by scanning for
   the mechanism, not by listing files.
2. **D-015** — Part A MEDIUM/LOW: R2-748, R2-752, R2-757, R2-759, R2-760, R2-761, R2-763.
   For R2-760, route every new void/delete path through `delete_logs.log_deletion(...)` with
   `deleted_by` keyword-only — do not build a parallel audit path.
3. **D-016** — Part C: C2–C8, C10, C11. **C6 (IST vs UTC) is a global decision, settle it once before
   touching any date handling.** C9 is deliberately left alone.
4. **D-018** — Part E competitor parity from `docs/COMPETITOR_PARITY_ONSITE.md`, tier by tier. Now
   unblocked. Biggest structural gap: no pagination anywhere in the backend.

**Do NOT do:**
- **D-017, the index page** — that gets its own dedicated session, not this one.
- **Part D / D-019** — ops, backups, Render tier, Firebase, production purges are founder-owned.
  In particular: **RLS is correct and deliberately inert by design. Do not "fix" it by switching the
  database role.**

## Pace

The previous run was thorough but slow. Move faster **without lowering the closure standard**:

- Batch related findings into one pass where they touch the same file — the plan's Part F4 lists which
  ones collide.
- Use subagents for parallel investigation and for the G0 triage.
- Do **not** re-verify work the STATUS block already records as closed and verified.
- Report per batch, not per finding.

## The standard, unchanged

- **Read every finding as originally filed**, never a summary:
  `git show campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md`, then find `### FINDING R2-xxx`.
  **Do not check out that branch.**
- **Count the clauses.** Three named defects means three reported outcomes.
- **When you fix a shared helper, sweep every call site by scanning for the mechanism** and state the
  count in the commit ("4 of 4 cost-code write paths"). This is the single most common failure mode in
  this repo.
- **Every fix needs a test that fails against the unfixed tree at the defect's own assertion.** If it
  passes before your fix, the test is wrong. And per G0 — make sure the test actually *runs*; a gate
  that crashes before it asserts is worse than no gate, because it looks like coverage.
- **Never fabricate a value to fill a gap.** Refuse honestly instead: `None` rather than `0.0`, one
  honest row rather than invented splits, removing a false claim rather than faking the feature.
- **Prove every commit landed:** `git merge-base --is-ancestor <sha> origin/main`. Never `git rev-parse`
  for this. Also verify with `git ls-remote origin main` — the previous run found this clone's local
  `origin/main` ref silently stale by six weeks while `git fetch` reported success.
- **Never merge `claude/siteflow-audit-round10-cont-f6961b`.** Do not edit anything under `audit/`.
- **If a lock file blocks a git operation, wait it out — do not delete it.** The previous run cleared a
  `.git/index.lock` and lost 446 files from disk (recovered only because everything was committed).
- **If you cannot close a clause, say so in the commit** and add it to `docs/BACKLOG.md` with a D-code.
  An honest disclosed residual is fine; a row marked closed for work not done is what produced this
  plan.

Production DDL needs my explicit approval — ask, do not run it. Writes are allowed in the
`ZZ R8 Throwaway` tenant (`1fa705a4-7aa6-42f2-9906-65902c96916f`). Check Sentry at a **90-day** window
around any deploy; the 14-day default hides real issues.

Already verified system-wide, do not re-audit: schema, migrations, RLS, API tenant isolation (180
cross-tenant probes over 106 routes, zero leaks), Sentry.

## What to give me at the end

1. The G0 triage table, and the resulting failure count with the command that produced it.
2. Every item closed, with the finding id and **the command whose output proves it**.
3. Everything left open, with its BACKLOG D-code.
4. Confirmation every commit is an ancestor of `origin/main`, with the command.
5. Anything you found that the plan does not mention.

Start with G0.
