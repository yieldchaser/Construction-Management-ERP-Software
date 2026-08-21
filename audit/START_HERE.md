# SiteFlow — Audit / Fix Campaign

**If you are a new session, READ THIS FIRST.**

This folder is the single source of truth for the 582-finding bug-fixing campaign.

---

## Current state (as of Session 32 — 2026-08-16)

| Bucket | Count |
|---|---|
| Numbers issued (R2-001 … R2-601) | 601 |
| Retracted as duplicates | 16 |
| FIX_VERIFIED (founder live-confirmed) | 93 |
| FIXED (code in, awaiting founder live-verify) | 243 |
| WONTFIX | 1 |
| **TODO (your job)** | **244** |

By severity of the remaining TODO: **CRITICAL 102 · HIGH 137 · MEDIUM 5 · LOW 0**.

**Phase progress:**
- ✅ Phase L (LOW): COMPLETE — all 8 closed
- ✅ Phase M (MEDIUM): COMPLETE — all 121 non-gated closed; 5 remain founder-gated (R2-010/CD-2, R2-030/D5, R2-125/D4, R2-319/D4, R2-385/CD-9)
- 🔶 Phase H (HIGH): IN PROGRESS — 51 of 188 closed; ~137 remaining
- ⬜ Phase C (CRITICAL): not started — 102 remaining
- ⬜ Phase G (founder-gated): blocked on DECISIONS.md answers
- ⬜ Phase V (live verification): deferred items for the founder's other agent

**Working mode:** the campaign runs in an isolated worktree at `C:\Users\Dell\AppData\Local\Temp\opencode\siteflow-waves` (branch `campaign/waves`) because the main checkout has concurrent activity from another agent. Pushes go via `git push origin campaign/waves:main`.

---

## Files in this folder

| File | What it is | When to read it |
|---|---|---|
| `START_HERE.md` | This file. | Always first. |
| `STRATEGY.md` | The per-fix protocol. The "no regression" rule. | Before every fix. |
| `BLAST_RADIUS_TEMPLATE.md` | The pre-fix / post-fix checklist you fill in for each finding. | Copy it for every fix. |
| `SESSION_LOG.md` | Append-only log. Sessions 1–32 recorded. Read the LAST entry to resume. | Start and end of every session. |
| `AUDIT_FIX_REGISTER.md` | 582 rows, one per actionable finding. STATUS column tracks progress. | To find a finding, or to update its status. |
| `WORKLIST.md` | The map: phases, gated findings, wave queue, working rules. **Has the execution strategy.** | Start of every session — pick the next batch from it. |
| `DECISIONS.md` | Every pending decision (D1–D7, D-006…D-013, CD-1…CD-10). | Before touching any gated finding. |
| `LEARNINGS.md` | Every lesson the campaign has paid for. | Before every fix; add to it when surprised. |
| `AUDIT_CANONICAL_FINDINGS.md` | 601-entry human-readable list. | Skim, don't edit. |
| `AUDIT_ROUND2_FINDINGS.md` | 1.9 MB raw audit log with long-form "why" per finding. | Read the long-form for a specific finding. |

---

## How to resume (new session checklist)

1. `git log --oneline -10` — see where you are.
2. Read `audit/SESSION_LOG.md` — the LAST entry tells you exactly where the previous session stopped.
3. Read `audit/WORKLIST.md` — the PHASES section shows which phase you're in and what's next.
4. Read `audit/DECISIONS.md` — check if any founder decisions have been answered.
5. Pick findings from the register (TODO rows), group by file cluster, dispatch parallel coder agents.
6. After each batch: central pin collection → full pytest → npm build → register + session log + counts → push.

---

## The regression guard — READ BEFORE EVERY WAVE

Two founder-verified fixes were silently reintroduced by parallel-branch merges. The durable guard is **`backend/tests/coverage/test_regression_pins.py`**: now **147 tripwire tests** that read the current sources and fail loudly, naming the finding, if any closed fix regresses.

Rules:
- It runs with the normal suite (`pytest tests/coverage/`) — a red pin is a REOPENED finding, not a test failure.
- When you close a fix, ADD a pin for it in the same wave. Don't weaken a pin because the code regressed — fix the code.
- Every session's final baseline must show the pins green.

---

## Batch-mode protocol (how we work now)

The campaign uses **parallel subagent waves** for throughput:

1. Group 8–15 findings by primary file into waves.
2. Dispatch 4–6 parallel CODER agents, each handling one wave (different files = no conflicts).
3. Each agent: reads the long-form, applies the minimal fix, commits per finding, reports back.
4. Orchestrator collects results, dispatches a VERIFIER agent for adversarial review.
5. Central pin collection: one agent appends all new pins to `test_regression_pins.py`.
6. Full pytest + npm build as batch verification.
7. Register + session log + counts + push.

**Key rules:**
- Never `git add -A` — stage only your files (other agents commit concurrently).
- Success toasts only after confirmed 2xx; failures alert with server detail.
- No fabricated data anywhere — honest empty states.
- Every fix gets a regression pin.

---

## Pending founder decisions

See `DECISIONS.md` for the full list. The highest-priority open decisions:
- **CD-1** (R2-178): approval categories — wire 13 or cut to 2
- **CD-7** (R2-298): RFQ status transitions — no "sent" writer exists
- **CD-8** (R2-341): PO close/cancel transition doesn't exist
- **CD-9** (R2-385): TaskTodo vs Todo vocabulary merge
- **D6**: Is the demo OTP path live on Render? (2-minute env check)

---

## Convention reminder

- **No drive-by fixes.** Report siblings in Notes, don't fix them now.
- **No em dashes in user-facing copy** (founder pref). Em dash U+2014 is the empty-value display glyph.
- **Migrations are additive-only.**
- **Batch mode:** multiple parallel agents, one verification pass at the end.
- **Commit messages:** `fix(R2-XXX): <one-line>. Wave: Wxx. Blast-radius: n files.`

---

## Recovery: if something breaks

1. `git log --oneline -20` — see the last commits.
2. `git revert <commit>` — back out cleanly.
3. Read the affected finding's Notes column in the register.
4. Update the register back to `TODO` with a `REGRESSED:<reason>` note.
5. Append to `SESSION_LOG.md`.
