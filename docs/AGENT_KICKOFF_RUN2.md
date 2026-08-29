# Kickoff message — remediation run 2

Copy everything below the line into a fresh session.

---

You are continuing the SiteFlow remediation (construction ERP: FastAPI + SQLAlchemy on Render,
Next.js on Vercel, Supabase Postgres). A previous run closed the most critical half. You are doing the
rest.

**Read this whole message before running anything.** Then work through the list without asking me
between items.

## Setup

Everything is on `origin/main`. No branch hunting:

```bash
git fetch origin main && git checkout main && git pull
```

Read `docs/REMEDIATION_MASTER_PLAN.md` in full. Its **STATUS block at the top** lists what is already
closed — that has been independently verified against source, so **do not redo any of it**. Then read
**Part F** (how fixes have failed in this codebase) before writing code. Findings are written up in
full in `docs/VERIFICATION_NEW_FINDINGS.md`.

## THE ONE RULE THAT MATTERS MOST

**Never state that something works. Show the command and paste its real output.**

This codebase has been through a 599-finding audit. The single reason that audit was necessary is that
previous agents reported work as done when it was not. Every claim you make must be backed by literal
terminal output in your message. "Fixed and tested" with no output is treated as not done.

A worked example of why: `tests/coverage/test_r2_536_delete_log_records_actor.py` **looks** like a
passing safety net. It actually crashes on line 35 with `SyntaxError: invalid non-printable character
U+FEFF` before it checks anything, because it opens files with `encoding="utf-8"` instead of
`utf-8-sig`. **A test that crashes before asserting is worse than no test, because it looks like
coverage.** Fixing it is part of G0 below.

## Working method — follow this loop exactly, one finding at a time

Do **not** batch findings together. For each item:

1. **Read the finding as originally filed** — not a summary:
   `git show campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md` then find `### FINDING R2-xxx`.
   **Do not check out that branch.**
2. **Count its clauses out loud.** "This finding names 3 things: A, B, C." You will report on all 3.
3. **Write the failing test first.** Run it against the unfixed code and **paste the output showing it
   fails at the defect's own assertion.** If it passes before your fix, your test is wrong — fix the
   test, not the code.
4. **Make the fix.**
5. **Run the test again and paste the passing output.**
6. **Run the full backend suite and paste the failure count.** Compare to your G0 baseline. If the
   count went up, you caused a regression — fix it before moving on.
7. **Commit**, with the finding id and the clause count in the message.
8. **Prove it landed:**
   ```bash
   git merge-base --is-ancestor $(git rev-parse HEAD) origin/main && echo LANDED
   ```
   Never use `git rev-parse origin/main` alone to answer "is it on main" — a previous run found this
   clone's local ref silently six weeks stale while `git fetch` reported success. Cross-check with
   `git ls-remote origin main`.

Then the next finding. **Never skip step 3 or step 6.**

## G0 — do this FIRST, before any fix

`python -m pytest` in `backend/` currently reports **45 failures across 16 files** (41 AssertionError,
2 KeyError, 1 SyntaxError). They are pre-existing. **You cannot prove you broke nothing against a red
baseline nobody has characterised.**

1. Run the suite. **Paste the exact failure count.** This is your baseline number for step 6 forever
   after.
2. For each of the 45, classify it: `CODE_DEFECT` (code is genuinely wrong) / `BROKEN_TEST` (the test
   itself is faulty) / `STALE_EXPECTATION` (asserts behaviour deliberately changed).
3. Fix the `BROKEN_TEST` ones. File any `CODE_DEFECT` as a new finding, numbering from **R2-765**.
4. Write the table to `docs/TEST_BASELINE_TRIAGE.md` and commit it.

One is already diagnosed for you: the `utf-8`/BOM crash above. The code it guards is fine — an
independent AST scan of current `main` finds 32 `log_deletion` call sites with zero missing
`deleted_by`. Fix is `utf-8-sig`.

Several failing tests guard findings this audit already verified as **fixed** (`test_r2_487_*`,
`test_r2_412_413_*`, `test_regression_pins.py`). A red test there is suspicious in both directions —
check carefully rather than assuming either way.

**STOP AND REPORT after G0.** Give me the triage table and the new baseline count before continuing.

## Then, in this order

**Batch 1 — D-014, Part A HIGH:** R2-749, R2-753, R2-754, R2-756, R2-758, R2-762, R2-764.
- **R2-753 MUST come before R2-754.** Holiday dates are stored a day early *and* never reach payroll;
  fixing the second alone gives payroll a correct pipeline fed by wrong dates.
- **R2-764 is the "helper applied to some surfaces" class** — 4 write paths. Find them by scanning for
  the mechanism, not by listing files, and **state the count in your commit** ("4 of 4").

**STOP AND REPORT after batch 1.**

**Batch 2 — D-015, Part A MEDIUM/LOW:** R2-748, R2-752, R2-757, R2-759, R2-760, R2-761, R2-763.
- For R2-760, route every new void/delete path through `delete_logs.log_deletion(...)` with
  `deleted_by` as a keyword argument. Do **not** build a parallel audit path.

**STOP AND REPORT after batch 2.**

**Batch 3 — D-016, Part C:** C2–C8, C10, C11.
- **C6 (IST vs UTC) is a decision, not a code change.** Settle it once and write it down before
  touching any date handling. C9 is deliberately left alone — do not "fix" it.

**Batch 4 — D-018, Part E parity:** `docs/COMPETITOR_PARITY_ONSITE.md`, tier by tier. Biggest
structural gap: no pagination anywhere in the backend.

## Do NOT do these

- **The index page (D-017).** It gets its own dedicated session. Not this one.
- **Part D — ops and infrastructure.** Backups, Render tier, Firebase, production data purges are
  mine. **D-019 is already closed** — verified against production, nothing to purge.
- **Do not change the database role to make RLS active.** RLS is correct and deliberately inert by
  design. Changing it will break the application.
- **Do not merge `claude/siteflow-audit-round10-cont-f6961b`.** Do not edit anything under `audit/`.
- **Do not run production DDL.** Ask me first.
- **Do not delete a `.git/*.lock` file.** If git says a lock is held, wait. A previous run deleted one
  and lost 446 files from disk.
- **Do not invent a value to fill a gap.** If data is missing, return `None`, or refuse with a clear
  error, or show `—`. Never `0`, never a plausible-looking placeholder. Half this audit's findings are
  fabricated values.
- **Do not mark something done that you did not finish.** Say what you left and add it to
  `docs/BACKLOG.md` with a D-code. That is always acceptable. A false "done" is not.

## Reference facts you do not need to re-derive

- Already verified system-wide: schema, migrations, RLS, API tenant isolation (180 cross-tenant probes
  over 106 routes, zero leaks), Sentry.
- Test writes are allowed in the `ZZ R8 Throwaway` tenant (`1fa705a4-7aa6-42f2-9906-65902c96916f`).
- Check Sentry at a **90-day** window around any deploy; the 14-day default hides real issues.

## Report format at each STOP

1. The command you ran and its **pasted output** — for each claim.
2. Findings closed, with clause counts ("R2-764: 4 of 4 write paths gated").
3. Suite failure count now vs your G0 baseline.
4. Anything you left open, and its D-code.
5. Anything you found that the plan does not mention.

Start with G0. Report before going further.
