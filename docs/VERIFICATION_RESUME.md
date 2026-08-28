# Resume the verification phase — read this first

Written 2026-08-21. Paste the block at the bottom into a fresh session.

## Situation in one paragraph

Another agent (opencode) owns the **fixing** on `main` / `campaign/waves`, with its own copy of the
R2 register under `audit/`. Its worktree at
`C:\Users\Dell\AppData\Local\Temp\opencode\siteflow-waves` is **running — never touch it**, read
that branch with `git show campaign/waves:<path>` and never check it out. It has no Vercel,
Supabase or Render access; its own handoff lists "Phase V (live verify)" as waiting on the founder.
**That is this work.** My branch is `claude/siteflow-live-verification-dba0f1` in worktree
`.claude/worktrees/siteflow-audit-continuation-945943`. `claude/siteflow-audit-round10-cont-f6961b`
/ `98b3a3f` is orphaned and must never be merged.

## The protocol (founder-agreed)

Every closed finding gets four rungs. **E1 is never skipped.**

| rung | what |
|---|---|
| **E0** schema | does production have what the fix assumes (Supabase SQL) |
| **E1** code read | does the fix address the defect *as filed*, on *every surface* |
| **E2** gate | does a test exist that fails against the unfixed tree |
| **E3** live | exercise it in the deployed product and watch the response |

`CONFIRMED` = E1 **and** E3 (or E0 where the finding is purely schema). E1 pass with no live route =
`UNVERIFIED`. E1 fail = new finding number.

Verdicts: `CONFIRMED` · `FAKE_GATE` · `REGRESSED` · `UNVERIFIED` · **`NOT_IN_PROD`** (added during
the pass, founder-approved: correct in code, proven absent from the running system — its test is
*"is there any mechanism by which this fix could take effect"*, not *"is the commit deployed"*).

**Order:** blast radius ascending. **Register pinned at `campaign/waves` `c92b707`** (315 closed);
re-sync and append newly closed rows at the start of each session. **Writes are allowed** in test
company **ZZ R8 Throwaway = `1fa705a4-7aa6-42f2-9906-65902c96916f`**. Class-siblings are **grouped
into one class finding**, not filed separately.

## State (2026-08-22)

**220 of 315 worked — 211 CONFIRMED · 3 NOT_IN_PROD · 5 UNVERIFIED · 1 finding of mine retracted.**

**211 of 214 closure claims verified exactly as written.** The three exceptions are R2-025, R2-210
and R2-310 — all from the orphan-lineage class below, all CRITICAL, all live.

The individual fixes hold up under reading. What does not hold is the **evidence layer** around
them — and, newly, the **lineage** of that evidence (R2-727).

**25 live findings filed (R2-701..R2-730, one retracted), `docs/VERIFICATION_NEW_FINDINGS.md`,
id block R2-701..R2-799 reserved**
(register max is R2-601, so the campaign keeps 602+). Four class findings carry most of the weight:

- **R2-712** CRITICAL — 11 instances of fabricated hardcoded data in console forms
- **R2-717** HIGH — 29 closed rows disclose residue with no tracking id
- **R2-718** HIGH — 169 closures have no gate at all; 61 CRITICAL; 28 have zero automated evidence
- **R2-719** CRITICAL — 90 invented-default sites; 16 sentinel-UUID occurrences over 13 files
- **R2-727** CRITICAL — **94 closed rows cite commits that are NOT ancestors of `campaign/waves`**;
  they resolve only on the orphaned branch. 48 CRITICAL. Three confirmed misses so far:
  **R2-726** (Enterprise Rollup sign error, agent has since fixed at `bbb6d51`), **R2-728**
  (punch-out TypeError on Postgres), **R2-729** (Delete Logs loop, measured at ~3.4 req/s live)
- **R2-730** HIGH — first confirmed case of a migration file that exists and never ran

All four zero-evidence CRITICALs from R2-718 are now examined: R2-050, R2-051, R2-060 CONFIRMED;
R2-083 UNVERIFIED (its two edits are right, its "last two" completeness claim is not).

Four founder decisions batched in `docs/VERIFICATION_FOUNDER_DECISIONS.md` — nothing blocks the
pass. **D-V2 is the only time-sensitive one**: the seven missing unique constraints migrate cleanly
only while the duplicate count is zero, which it is today.

## Tools — all self-tested, all in `scripts/verification/`

| script | what it answers |
|---|---|
| `mkverif.py` | rebuilds `docs/VERIFICATION_REGISTER.md`; hand verdicts live in its `VERDICTS` dict |
| `gatecheck.py` | re-evaluates each pin against its fix commit's first parent |
| `fabsweep.py` | fabricated hardcoded data across the console |
| `defaultsweep.py` | falsy-coalesce fallbacks that invent a definite value |
| `migaudit.py` | models.py vs `supabase/migrations` |
| `lineage_audit.py` | **which rows cite commits not on `campaign/waves`** (produced R2-727) |
| `rebuild_worklist.py` | rebuilds `worklist.json`; the original silently dropped 104 rows |
| `orphan_screen.py` | triage order for orphan-cited rows — **poor precision, never quote its count** |
| `cancelsweep.py` | bill aggregations missing the Cancelled exclusion |

Scratch worktree for reverting fix hunks:
`git worktree add --detach C:/Users/Dell/AppData/Local/Temp/claude/verif-scratch campaign/waves`

## Traps that cost real time — read before trusting any negative result

1. **A negative result about someone else's code needs its own input verified first.** Twice a
   "the fix is broken" reading was my own fault: DOM snapshots taken before a refetch (R2-148), and
   GSTINs written from memory (R2-554). Both were one commit from a false CRITICAL.
2. **`read_network_requests` does not capture cross-origin fetches** to the Render host. Its
   silence proves nothing — instrument `window.fetch` instead.
3. **Drive the Supabase SQL editor** via `window.monaco.editor.getModels()[0].setValue(...)` then
   click Run. Typing into Monaco auto-closes brackets and corrupts SQL.
4. **Postgres `LIKE` has no `[_]` bracket escape** — use `escape '/'`, and always put a sanity
   branch in the same query that *must* return rows.
5. **When picking a finding's fix commit, skip commits touching only `audit/` or `docs/`.** A
   register-only commit's parent already contains the fix, which silently inverts a gate verdict.
6. The in-app Browser pane is `mcp__Claude_Browser__`. `claude-in-chrome` is **not** connected.
7. **`git rev-parse` resolves ANY commit in the repo, including orphan-branch ones.** It hands
   you diffs that were never in the live lineage. Always
   `git merge-base --is-ancestor <sha> campaign/waves`. This nearly had me verify my own
   abandoned diffs and credit them to the campaign.
8. **Measuring a rate across a Next.js client-side navigation: start the clock after mount.** A
   window beginning at the click mostly covers the route transition — that reading nearly
   cleared R2-729, a live CRITICAL.
9. **Check the table name before believing an `<ABSENT>` from `information_schema`.** I queried
   `face_recognition_log` and nearly filed three CRITICALs; the table is `face_recognition_logs`.
10. **Compare against the finding's INTENT, never the orphaned diff's shape.** The campaign
    re-fixed in its own idiom, so grepping for the old implementation gives false negatives.

## Register-wide sweeps out-yield finding-by-finding reading

Every one of the four class findings came from a sweep, and each produces a *close-the-class* fix
rather than an instance list. Run a sweep whenever a single finding suggests a pattern.

---

## Paste this into a new session

```
Resume the SiteFlow independent verification phase.

Read docs/VERIFICATION_RESUME.md on branch claude/siteflow-live-verification-dba0f1
(worktree .claude/worktrees/siteflow-audit-continuation-945943) - protocol, state, tools,
traps. Then docs/VERIFICATION_REGISTER.md for per-row verdicts and
docs/VERIFICATION_NEW_FINDINGS.md for the 25 findings I filed (R2-701..R2-730).

Rules: never touch the opencode worktree under AppData/Local/Temp/opencode/siteflow-waves,
never check out campaign/waves (use git show), never edit audit/*, never merge
claude/siteflow-audit-round10-cont-f6961b.

State: 220 of 315 closed rows worked, 211 CONFIRMED. 95 remain.

DIVISION OF LABOUR - this matters. The fix campaign is itself sweeping the 94
orphan-cited rows from R2-727, by file cluster (finance x32, hr x28, reports x18,
procurement x9). Do NOT duplicate that. Take instead:
  1. the ~14 non-orphan rows still unverdicted, and
  2. anything needing Supabase or the live browser, which the campaign cannot do.

Highest-value open items:
  - R2-728 needs a live proof if the founder approves it (punch-out on Postgres; it
    writes attendance data in the test company).
  - The other migrations dated 2026-08-15+ should be checked for whether they RAN, the
    way R2-730 was found. Five are confirmed landed; one never ran.
  - D-V5 needs the founder's Render env answer.

Writes are allowed in test company ZZ R8 Throwaway
(1fa705a4-7aa6-42f2-9906-65902c96916f). Supabase SQL editor and the Vercel console are
logged in in the Browser pane, but the Supabase session expires - ask the founder to
re-login rather than entering credentials.
```
