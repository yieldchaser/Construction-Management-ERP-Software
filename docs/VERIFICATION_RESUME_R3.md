# Round 3 verification — READ THIS FIRST

Written 2026-08-27 at the end of the round-2 session. The founder chose **option 3: verify all 370
remaining closed rows, properly.** This file is the complete handover.

---

## Where the project actually is

**The fixing is done.** `audit/AUDIT_FIX_REGISTER.md` on `origin/main` reads
**502 FIXED · 93 FIX_VERIFIED · 3 WONTFIX · 1 RETRACTED · 0 TODO** across 599 rows. Every finding
filed during round 2 has a fix in production, and I verified each of those against the live system
rather than against the agent's report.

**The verification is 38% done.** Of 595 closed rows, **225 were opened individually**; **370 were
not**. That gap is the entire job for round 3.

Of the 225 read, **211 of 214 closure claims held exactly as written** — a 98.6% claim-accuracy
rate. The three exceptions all traced to one structural cause (orphan lineage, R2-727), which the
campaign has since swept. **Expect a low hit rate.** The measured yield on ordered row-reading was
roughly **one real miss per seventy rows**, so 370 rows should surface ~5 findings. That is the
point of the exercise — the founder is signing off an ERP that will hold other companies' money, and
"we sampled 38% and extrapolated" is not a standard he was willing to accept. Do not let the low
yield tempt you into skimming.

---

## What is already verified system-wide — do not redo this

These properties were established live and cover **all** rows. Round 3 is about per-row claims only.

| property | evidence |
|---|---|
| Schema completeness | all **1458 columns across 139 tables** in `Base.metadata` match production |
| Migrations | ledger `supabase_migrations` at **51 rows**, every file applied, CI workflow gates it |
| RLS correctness | 108 `_tenant_scoped` policies, recursion fixed, isolation proven by simulation (5 of 7 projects visible, **0 foreign**) |
| API tenant isolation | **180 live cross-tenant probes** over **106 routes**, two foreign tenants — 71×403 / 3×401 per sweep, **zero leaks** |
| Error monitoring | Sentry **0 unresolved** at a 90-day window after item 17 |

**RLS is correct but deliberately inert** — Render connects as a `BYPASSRLS` role and
`RLS_SESSION_CONTEXT` defaults off. Tenant isolation today is carried entirely by the FastAPI
`company_id` filters, which is what the 180 probes tested. Do not "fix" this by switching the
database role; that is a sequenced change the founder has parked.

---

## The worklist

- `docs/VERIFICATION_WORKLIST_R3.md` — human-readable checklist, 370 rows.
- `scripts/verification/worklist_r3.json` — same data, machine-readable.

**Sorted CRITICAL → HIGH → MEDIUM → LOW, then by file cluster**, so rows touching the same file are
adjacent. Work it in order; the clustering is the only thing that makes 370 rows tractable.

| severity | count |
|---|---|
| CRITICAL | 144 |
| HIGH | 194 |
| MEDIUM | 31 |
| LOW | 1 |

Biggest clusters: `page.tsx` (70), `finance.py` (37), `hr.py` (29), `reports.py` (21),
`procurement.py` (17), `UNMAPPED` (17), `analytics.py` (12), `billing.py` (11), `budget.py` (11).

---

## The protocol — unchanged from round 2

Four rungs. **E1 is never skipped.**

| rung | what |
|---|---|
| **E0** schema | does production have what the fix assumes (Supabase SQL) |
| **E1** code read | does the fix address the defect *as filed*, on *every surface* |
| **E2** gate | does a test exist that would fail against the unfixed tree |
| **E3** live | exercise it in the deployed product |

`CONFIRMED` = E1 **and** E3, or E0 where the finding is purely schema. E1 pass with no live route =
`UNVERIFIED`. E1 fail = **file a new finding**, do not silently fix.

Verdicts: `CONFIRMED` · `FAKE_GATE` · `REGRESSED` · `UNVERIFIED` · `NOT_IN_PROD`.

**Record every verdict in the `VERDICTS` dict in `scripts/verification/mkverif.py`**, then re-run it
to regenerate the register. That dict is the source of truth for what has been verified; the round-3
worklist was computed by diffing it against the register.

**Read the finding as filed** — `git show campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md`, then find
`### FINDING R2-xxx`. The register row's note is a summary, not the claim. Verifying against the
summary instead of the original text is how a partial fix passes.

---

## Numbering

New findings continue from **R2-743**. Round 2 used R2-701..R2-742; the block R2-701..R2-799 is
reserved for verification findings. The campaign's own register keeps 602+.

---

## Access — all of this is live and logged in

The founder logs in on request; ask rather than entering credentials.

| system | state | what it is for |
|---|---|---|
| Supabase SQL editor | logged in, project `ujdxgiqafaobhrskzkmr` | E0 schema checks |
| SiteFlow app | logged in as a user in **ZZ R8 Throwaway** + **AK Construction** | E3 live checks |
| Render dashboard | logged in, `srv-d92lidfavr4c738i29kg` | env vars, deploy logs, boot logs |
| Vercel | logged in, project `site-flow` | frontend deploys |
| Sentry | logged in, `mit-manipal-u5` | **check at a 90-day window, before and after every deploy** |
| GitHub | logged in, `yieldchaser/SiteFlow` | Actions runs, secrets |

**Company ids.** Member: `1fa705a4-…916f` ZZ R8 Throwaway, `d3724ec3-…7b5d` AK Construction.
Foreign (use these for isolation probes): `e0000000-…0000` Demo Construction Ltd (has 5 projects),
`fcf53673-…7fb9` pranjal ltd, `1776c887-…0f87` Test Claude B2 Construction.

**Writes are allowed in ZZ R8 Throwaway.** Production DDL and anything touching other tenants needs
the founder's word first.

---

## Tools, all self-tested, in `scripts/verification/`

| script | what it answers |
|---|---|
| `mkverif.py` | rebuilds the register; **hand verdicts live in its `VERDICTS` dict** |
| `gatecheck.py` | re-evaluates each pin against its fix commit's first parent |
| `fabsweep.py` | fabricated hardcoded data across the console |
| `defaultsweep.py` | falsy-coalesce fallbacks that invent a definite value |
| `migaudit.py` | models.py vs `supabase/migrations` |
| `lineage_audit.py` | rows citing commits not on the live lineage |
| `cancelsweep.py` | bill aggregations missing the Cancelled exclusion |
| `launch_cleanup.sql` | demo/test tenant removal — **dry-run verified, held for launch** |
| `probe_migrations_ran.sql` | which migrations actually took effect |
| `worklist_r3.json` | this round's 370 rows |

---

## Traps that cost real time

The round-2 list still applies. These are the ones that bit hardest, plus new ones:

1. **A negative result about someone else's code needs its own input verified first.** I claimed
   `logger` was undefined in `google_auth.py` because I truncated a grep and inferred from absence.
   It was defined at line 42. Check the whole file before asserting something is missing.
2. **Do not trust a count-based check to prove a name-based claim.** The "all 139 tables match"
   result compares column *counts*; a rename would pass it. Say which you measured.
3. **The Browser pane's `javascript_tool` times out at 30 seconds.** Batch live probes into chunks
   of ~10 and accumulate into a `window.__x` global across calls.
4. **Calibrate every live probe against a known-positive first.** The isolation sweep began with a
   404 on a path that did not exist — had I not run the same call against my *own* company, I would
   have read "no leak" from a broken probe.
5. **`read_network_requests` does not capture cross-origin fetches.** Instrument `window.fetch` or
   call from the page origin.
6. **Drive the Supabase editor via `window.monaco.editor.getEditors()[0].getModel().setValue(...)`**
   — `getModels()` returns stale models when several query tabs are open, and typing into Monaco
   auto-closes brackets and corrupts SQL. Click Run by matching button text `^Run`.
7. **Wrap destructive SQL in a `DO` block ending in `RAISE EXCEPTION`** — it reports and rolls back
   in one shot. That is how the cleanup dry run was proven safe, and it caught a real bug in my own
   script.
8. **Skip commits touching only `audit/` or `docs/`** when picking a finding's fix commit — a
   register-only commit's parent already contains the fix, which inverts a gate verdict.
9. **`git rev-parse` resolves orphan-branch commits.** Always
   `git merge-base --is-ancestor <sha> origin/main`.
10. **Sentry's default 14-day window hides real issues.** Six were sitting just outside it. Query at
    90 days.
11. **Git-bash mangles `campaign/waves:.github/...` paths** — prefix with `MSYS_NO_PATHCONV=1`.
12. **Two heredocs in one Bash call fail.** Write the file with the Write tool, then `cat >>`.

---

## Rules

- Never touch the opencode worktree under `AppData/Local/Temp/opencode/siteflow-waves`.
- Never check out `campaign/waves` — read it with `git show`.
- Never edit `audit/*` — that is the fixing agent's register.
- Never merge `claude/siteflow-audit-round10-cont-f6961b` (`98b3a3f`), which is orphaned.
- My branch is `claude/siteflow-live-verification-dba0f1`, worktree
  `.claude/worktrees/siteflow-audit-continuation-945943`.
- **Do not fix code.** File findings; the fixing agent fixes. The one exception was production DDL
  to end a live outage, and only with the founder's explicit go-ahead.

---

## Open items that are not round-3 work

Parked by the founder's decision, listed so nobody re-raises them as findings:

- **RLS rollout** — correct and tested, inert by design. Needs a non-`BYPASSRLS` role +
  `RLS_SESSION_CONTEXT=1`, rehearsed on a Supabase branch. After launch.
- **Demo tenant deletion** — `launch_cleanup.sql`, dry-run verified (50 rows, converges in 2
  passes). At launch.
- **Render paid instance** — at first non-founder signup. Measured cold start: **~90 seconds**.
- **Write-path isolation** — the 180 probes were GET only. POST/PUT/DELETE cross-tenant is unproven;
  same guards, so low risk, but say so rather than implying coverage.
- **Firebase phone login** — one approved test number, SMS quota after the Blaze upgrade. Expected
  to work only for the founder's number until then. Not a bug.
