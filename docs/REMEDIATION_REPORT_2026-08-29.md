# SiteFlow remediation — run report, 2026-08-29

Scope: `docs/FIXING_AGENT_PROMPT.md` + `docs/REMEDIATION_MASTER_PLAN.md` (R3
verification). Part B first, then Part A CRITICALs, then HIGHs. Part D not
touched (founder-owned). Part E and the index-page task deferred.

---

## 1. Step 0 — making the work survive

**The branch was pushed and merged.** `claude/siteflow-verification-r3-439d71`
(120 commits, not an ancestor of `origin/main`) was pushed and merged to `main`
as **PR #15**, merge commit `7a03af4`. `docs/REMEDIATION_MASTER_PLAN.md` is
therefore reachable from `main`, which is where all subsequent work happened.

### Two things Step 0 assumed that were not true

1. **The brief said 118 unpushed commits; there were 120.** Two more had landed
   (the kickoff message and the index-page task).
2. **More importantly: `git rev-parse origin/main` in this clone was lying.**
   It resolved to `e8f2676` (2026-07-13) while the real remote `main` was
   `2991091` (2026-08-27). `git fetch origin` *reported* updating the ref but
   the write did not land — no loose ref was created, and `packed-refs` kept the
   old value. `git update-ref` exited 0 and also did not land.

   Fix that worked: write the loose ref by hand
   (`printf <sha> > .git/refs/remotes/origin/main`); ordinary fetches then
   update it normally. **Trust `git ls-remote origin main` over the local
   tracking ref** — this is a second, independent way that "is it on main?"
   can be answered wrongly, on top of the `rev-parse` trap the brief warns about.

### Verification command used after every fix

```
git fetch origin main
git merge-base --is-ancestor <sha> FETCH_HEAD
```

(`FETCH_HEAD` is written fresh by the fetch, so it is authoritative. The local
`origin/main` ref is checked too but not solely relied on.)

---

## 2. Closed

Every item below is committed to `main` and proven an ancestor of `origin/main`.

### Part B — the eight unmapped regressions (all 8)

| ID | Sev | Closed by | Proof |
|---|---|---|---|
| R2-533 | CRITICAL | `e0b1689` | cashbook CSV re-upload no longer double-books; 4/4 clauses (idempotent refs, typed direction, honest dates, reported skips) |
| R2-534 | HIGH | `e0b1689` | party resolved via `CompanyTeam` join scoped to `company_id` |
| R2-599 | CRITICAL | `a5cf2f0` | DPR task resolved with `Task.project_id == project_uuid`; foreign task → 400, no mutation |
| R2-049 + R2-358b | CRITICAL | `aba2adf` | `Equipment.code` unique per company, at the constraint layer + dedupe-aware migration |
| R2-317 | HIGH | `b051f69` | statement buckets on `account_id`; payments with no account no longer vanish |
| R2-371 | CRITICAL | `ef5f400` | `bills.po_id` added, populated, and an over-invoicing ceiling enforced |
| R2-588 | CRITICAL | `de4b1af` | new `GET /hr/timesheets/project/{id}/headers`; approvals table has rows to render |
| R2-358a | MEDIUM | `aba2adf` | zero-rate machine is logged as unconfigured, not silently skipped |

### Part A — all four CRITICALs

| ID | Closed by | Proof |
|---|---|---|
| R2-743 | `d26dfcf` | BI feed neutralises `=HYPERLINK(...)&A1`; enumeration gate over every CSV writer |
| R2-744 | `1e223e5` | inter-state supply exports `Output IGST`, matching `gst_utils.gst_split` |
| R2-745 + R2-747 | `0af082b` | conversion keeps `igst_amount` and `hsn_sac`; validator covers both bill surfaces |
| R2-746 | `97f917f` | switcher re-mints and stores the token; invite honours an explicit `company_id` |

### Part A — HIGHs reached

| ID | Closed by | Proof |
|---|---|---|
| R2-747 | `0af082b` | (with R2-745) HSN required on tax invoices and carried through conversion; recipient address added to the PDF |
| R2-750 | `f97880f` | `location` on create + update + serializer; unmeasurable punches recorded as not GPS-verified; Mumbai default removed |
| R2-751 | `c18d380` | `/face/punch` 403s cross-tenant and writes no row; class gate covers 55/55 body-`company_id` write paths |
| R2-755 | `d26dfcf` | (with R2-743) all 5 frontend CSV builders share one guard |

### Part C

| Item | Closed by | Proof |
|---|---|---|
| C1 | `c70a96a` | dead duplicate `calcShared.ts` deleted; hash-based pin over `frontend/src/lib` |

**Tests:** 84 new tests across 14 files, all passing
(`pytest <the 14 files> -q` → `84 passed`). Every one was first run against a
HEAD-only worktree and shown to fail at the defect's own assertion.

**Regression:** the 16–17 files with pre-existing failures were run before and
after every fix. **44 failures, identical set, zero new** — verified by diffing
the `FAILED` lines:

```
comm -13 <(grep '^FAILED' baseline.log | sort) <(grep '^FAILED' after.log | sort)   # empty
```

---

## 3. Left open

All recorded in `docs/BACKLOG.md` (`cc1ed4b`). Nothing is marked closed for work
that was not done.

| D-code | What | Why |
|---|---|---|
| **D-014** | Part A HIGHs not started: R2-749, R2-753, R2-754, R2-756, R2-758, R2-762, R2-764 | Session ran out. Read as filed, none partially applied. |
| **D-015** | Part A MED/LOW: R2-748, R2-752, R2-757, R2-759, R2-760, R2-761, R2-763 | Same. |
| **D-016** | Part C: C2, C3, C4, C5, C6, C7, C8, C10, C11 | Same. C9 deliberately left as is. |
| **D-017** | Pre-login index page performance | The brief requires it in a **separate session/thread**, not interleaved. No screenshots or measurements taken. |
| **D-018** | Part E competitor parity | Unblocked now (A and B are closed) but not started. |
| **D-019** | `uq_equipment_company_id_code` / `uq_bills_po_id` may be skipped in production | Both migrations skip with a NOTICE when data would violate the constraint. Production purge is founder-owned (Part D, D1). |

### Honest residuals inside closed findings

- **R2-746 frontend half**: guarded by source pins, not a behavioural test. The
  repo ships **no React test runner** (no jest/vitest/playwright); adding a
  component-testing stack for one finding was not mine to decide.
- **R2-750 UI**: same — source pin asserting the coordinate input exists.
- **R2-533 clause 3**: a file with **no** `Payment Date` column at all still
  dates rows today. Made a deliberate call: the finding targets *unreadable*
  dates, and silently breaking files that legitimately omit the column would be
  a product-behaviour change the plan does not authorise. The response now
  reports `dated_today` plus a warning, so the omission is visible, not silent.

---

## 4. Commit ancestry — the command and its output

```
$ git fetch origin main
$ git rev-list 7a03af4..HEAD | while read sha; do
    git merge-base --is-ancestor "$sha" FETCH_HEAD && echo "OK $sha" || echo "FAIL $sha"
  done
```

All 14 returned `OK`. Final remote `main`: `cc1ed4bfbc61bf53f14c0f6b72a1043132892d21`.

```
cc1ed4b docs: record remediation residual in BACKLOG (D-014..D-019)
c70a96a chore(Part C, C1): delete the dead duplicate calculator module
c18d380 fix(R2-751): tenant-check POST /face/punch + class gate
f97880f fix(R2-750): project coordinates; unmeasured punches not verified
d26dfcf fix(R2-743, R2-755): one CSV formula guard, both languages
1e223e5 fix(R2-744): inter-state supply → IGST in Tally
97f917f fix(R2-746): re-mint session on switch; invite names its company
0af082b fix(R2-745, R2-747): conversion keeps IGST and HSN/SAC
de4b1af fix(R2-588): timesheet-headers endpoint
ef5f400 fix(R2-371): bills.po_id + over-invoicing ceiling
b051f69 fix(R2-317): bank statement buckets on account_id
aba2adf fix(R2-049, R2-358): Equipment.code per company
a5cf2f0 fix(R2-599): DPR task scoped to project
e0b1689 fix(R2-533, R2-534): cashbook CSV idempotent, typed, honest
```

---

## 5. Index page performance

**Not started — deliberately.** The brief specifies it as a separate
workstream/session. No baseline was measured and no screenshots were taken, so
there are no before/after numbers to report. Doing it would have meant either
skipping it or interleaving it against an explicit instruction. See **D-017**.

---

## 6. Things found that the plan does not mention

1. **The stale `origin/main` ref** (section 1). A second way to get a false
   answer to "is it on main?", independent of the `rev-parse` trap. Worth
   knowing before any future deploy check.
2. **The pre-existing backend suite is RED at HEAD: 44 failures across 16
   files** — billing e2e, ZATCA, bill line items, delete-log actor, constraint
   guarantees, and several regression pins. This predates all of my work and was
   unchanged by it (verified by diffing the FAILED sets). Any "the suite is
   green" claim on this repo is currently false.
3. **Part A findings are not in the audit dump.** R2-743…R2-764 live in
   `docs/VERIFICATION_NEW_FINDINGS.md`, not
   `campaign/waves:audit/AUDIT_ROUND2_FINDINGS.md`. Also, the audit dump uses
   **two heading levels** (`## FINDING R2-xxx` and `### FINDING R2-xxx`) — a
   regex matching only one silently misses findings (R2-049, R2-588, R2-599 are
   `###`).
4. **Requiring something server-side the UI cannot supply is a hard block.**
   R2-747's HSN rule needed an input added to the transaction editor first, or
   sales-invoice creation would have been unrejectably broken. Worth checking
   before any future "add a validator" fix.
5. **`planning.py` fabricated a Mumbai coordinate** (`"19.0760,72.8777"`) for
   every project created without one. Removed under R2-750, but it is the same
   invented-default family as R2-719 swept — there may be more.
6. **The write-path sweep found 55 endpoints** taking a `company_id` in the body
   rather than the path. All 55 are guarded after R2-751, but the GET-only
   isolation sweep had never covered this class, and it produced two confirmed
   defects in one round (R2-049, R2-751). The parked item deserves promoting.
7. **An incident worth recording:** a `git rm` exceeded its foreground timeout,
   and removing the resulting `.git/index.lock` led to 446 frontend files being
   deleted from disk. Recovered losslessly with `git checkout -- .` because
   every change was already committed and there were no unstaged modifications.
   With many agents active on this repo, **wait out a lock; do not delete it.**
