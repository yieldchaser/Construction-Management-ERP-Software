# The message to paste into the fixing agent

Copy everything below the line.

---

You are taking over SiteFlow, a construction ERP (FastAPI + SQLAlchemy on Render, Next.js on Vercel,
Supabase Postgres). It has just finished a 599-finding audit and a 370-row independent verification.
There is a complete, ordered work plan waiting for you. Work autonomously through it end to end — I do
not want to be consulted between items.

## Step 0 — before anything else, make sure you can see the work, and that your work will survive

The plan and all evidence currently live on the branch `claude/siteflow-verification-r3-439d71` inside
the worktree at:

```
C:\Users\Dell\Github\Construction-Management-ERP-Software\.claude\worktrees\siteflow-audit-round-5-c53b63
```

That branch has **118 commits that have never been pushed**, and it is **not an ancestor of
`origin/main`**. Verify this yourself:

```bash
git merge-base --is-ancestor HEAD origin/main && echo "on main" || echo "NOT on main"
git log --oneline origin/main..HEAD | wc -l
```

**This matters more than it looks.** Eight of the live defects you are about to fix exist *precisely
because* someone's fixes landed on a branch that never reached `origin/main`, while the register
recorded them as verified. Do not recreate that. So, first:

1. Push the branch and open a PR against `main` (preferred), **or** merge it to `main` if that is the
   house style. Ask me only if neither is possible.
2. Confirm afterwards that `docs/REMEDIATION_MASTER_PLAN.md` is reachable from wherever you will
   actually be working.
3. From then on, after every fix, prove it landed: `git merge-base --is-ancestor <sha> origin/main`.
   **Never use `git rev-parse` for this** — it resolves orphan-branch commits happily and proves
   nothing. That single mistake is what hid eight defects.

## Step 1 — read the plan

Read `docs/FIXING_AGENT_PROMPT.md` in full and follow it. It is written for you and it contains your
complete instructions, rules, gates and interaction warnings. It points you at
`docs/REMEDIATION_MASTER_PLAN.md`, which is the authoritative index to everything else.

Read **Part F of the master plan first** — it documents how fixes have specifically failed in this
codebase, which is the difference between clearing this list and regenerating it.

## The work, in order

1. **Part B's eight unmapped regressions first.** These read as "FIX_VERIFIED" in the register and are
   live in production. They include: cashbook CSV re-upload **double-booking every payment**, the same
   importer resolving users by display name **with no company scope**, a DPR **mutating another
   project's task**, `Equipment.code` being **unique across all tenants**, the Bank Statement report
   **returning nothing at all** in production, bills having **no `po_id`** so over-invoicing is
   undetectable, and Weekly Timesheet Approvals rendering an array nothing populates.
2. **Part A** — the 22 findings R2-743 … R2-764, CRITICAL first.
3. **Part C** — 11 cheap recorded observations.
4. **Part E** — competitor parity from `docs/COMPETITOR_PARITY_ONSITE.md`, tier by tier, only after A
   and B are done and verified.
5. **The pre-login index page performance task** — it is the last section of
   `docs/FIXING_AGENT_PROMPT.md`. Do it in a **separate session/thread**, not interleaved with the
   above. Hard constraint: the page must look and behave **exactly** the same afterwards. Nothing
   visual is removed. "It was slow because of the fancy bit, so I removed the fancy bit" is a failed
   task. Measure on a production build, report before/after per change, and prove with screenshots at
   mobile and desktop that every animation still runs.

**Do NOT do Part D.** It is ops, data and infrastructure — backups, Render tier, Firebase, production
data purges. Those are mine. In particular: **RLS is correct and deliberately inert by design. Do not
"fix" it by switching the database role.**

## How to work while I am away

Keep going without checking in. Use subagents freely if that helps you parallelise.

**Stop and ask me only for:** production DDL, anything destructive to production data, or a decision
that changes product behaviour in a way the plan does not already authorise. Everything else, decide
yourself and record the decision.

**Do not stop just because something is hard or ambiguous.** If you cannot close part of a finding,
close everything else, then say plainly in the commit what you left and why, and add it to
`docs/BACKLOG.md` with a D-code. An honest disclosed residual is acceptable. A row marked closed for
work that was not done is exactly what produced this plan.

## The standard I will check you against

- **Read every finding as originally filed**, never its summary:
  `git show campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md` then find `### FINDING R2-xxx`.
  **Do not check that branch out.** Verifying against a summary is how partial fixes passed last time.
- **Count the clauses.** If a finding names three things, your commit reports three outcomes.
- **When you fix a shared helper, sweep every call site by scanning for the mechanism, not by listing
  files** — and state the count ("5 of 5 CSV builders"). One helper applied to some surfaces and not
  others is the single most common failure mode in this repo.
- **Every fix needs a test that fails against the unfixed tree at the defect's assertion.** If your
  test passes before your fix, the test is wrong. "Fixed by analogy" is not a closure.
- **Never fabricate a value to fill a gap.** The fixes that held in this codebase refused: `None`
  instead of `0.0` when there is no data, one honest row instead of invented per-tower splits,
  removing a false claim instead of faking the feature.
- **Never merge `claude/siteflow-audit-round10-cont-f6961b`** — reimplement from the description.
- **Do not edit anything under `audit/`.**

Already verified system-wide, do not re-audit: schema (1,458 columns / 139 tables), migrations (ledger
at 51, CI-gated), RLS, API tenant isolation (180 cross-tenant probes over 106 routes, zero leaks),
Sentry (0 unresolved at 90 days). Check Sentry at a **90-day** window around any deploy — the default
14 days hides real issues.

Writes are allowed in the `ZZ R8 Throwaway` tenant (`1fa705a4-7aa6-42f2-9906-65902c96916f`).

## What to give me at the end

One report:

1. Every item closed, with the finding/row id and the **command whose output proves it** — not a claim
   that it works.
2. Everything left open, with the reason and its BACKLOG D-code.
3. Confirmation that every commit is an ancestor of `origin/main`, with the command you ran.
4. For the index page: before/after numbers per change, plus the screenshots.
5. Anything you found that the plan does not mention.

Start with Step 0 now.
