# SiteFlow — Audit / Fix Campaign

**If you are a new session, READ THIS FIRST.**

This folder is the single source of truth for the 582-finding bug-fixing campaign. Every new session must start here. Do not start fixing without reading the strategy.

---

## The numbers (as of last sync — 2026-08-15)

| Bucket | Count |
|---|---|
| Numbers issued (R2-001 … R2-601) | 601 |
| Retracted as duplicates | 15 |
| FIX_VERIFIED (founder live-confirmed) | 93 |
| FIXED (code in, awaiting founder live-verify) | 21 |
| WONTFIX | 1 |
| **TODO (your job)** | **467** |

By severity of the remaining TODO: **CRITICAL 121 · HIGH 196 · MEDIUM 139 · LOW 11** (re-counted after the 114 closed).

---

## Files in this folder

| File | What it is | When to read it |
|---|---|---|
| `START_HERE.md` | This file. | Always first. |
| `STRATEGY.md` | The per-fix protocol. The "no regression" rule. | Before every fix. |
| `BLAST_RADIUS_TEMPLATE.md` | The pre-fix / post-fix checklist you fill in for each finding. | Copy it for every fix. |
| `SESSION_LOG.md` | Append-only log. Every session writes its report at the bottom. | End of every working block. |
| `AUDIT_FIX_REGISTER.md` | 582 rows, one per actionable finding. The masterwork. STATUS column is yours to update. | To find a finding, or to update its status. |
| `AUDIT_CANONICAL_FINDINGS.md` | 601-entry human-readable list. The input for fix-prompt authoring. | Skim, don't edit. |
| `AUDIT_ROUND2_FINDINGS.md` | 1.9 MB / 29,421-line raw audit log. R2-001 → R2-601. | Read the long-form "why" for a specific finding (each finding has a `reg L<line>` line reference). |

---

## The 5-step protocol (every session)

1. **Read `STRATEGY.md`** — it is short. Memorize the 7 anti-regression rules.
2. **Read `SESSION_LOG.md` end-of-file** — see what the last session did. Resume the wave it ended on.
3. **Pick a wave** (the register is wave-ordered by `Primary file`).
4. **For each finding in that wave:** copy `BLAST_RADIUS_TEMPLATE.md`, fill it in, apply the fix, update the register, append to `SESSION_LOG.md`.
5. **After the wave:** run `npm run build` and `pytest tests/coverage/ -q`. If either fails, fix the regression before moving on.

---

## What "FIXED" vs "FIX_VERIFIED" means

- **FIXED** — code change is in, types pass, blast-radius call-sites were re-read. YOU can mark this.
- **FIX_VERIFIED** — the founder + the live regression-suite (RC-001 … RC-086) has confirmed the fix in production. **Do not mark this yourself.** The existing 93 FIX_VERIFIED entries were promoted by the founder's verification, not by the agent.

---

## What I can do without the founder

- Read the codebase top to bottom.
- Edit Python, TypeScript, SQL, Markdown.
- Run `pytest` and `npm run build` (the latter is slow, use it sparingly).
- Grep for blast radius.
- Update the register, the canonical, and the session log.

## What I cannot do (defer it)

- Hit the live API on `construction-erp-backend-73vm.onrender.com`.
- Authenticate to the founder's Supabase project.
- Drive the founder's browser to reproduce a UI-only bug.
- Verify a Sentry exception is no longer firing.
- Push to `main` on the user's behalf.

If a finding needs any of these, mark it `DEFERRED:<reason>` in the register's Notes column and move it to the bottom of the wave's working list. The founder will pick it up.

---

## Where pending founder decisions live

The raw log and the canonical findings each have a **DECISIONS** section (search for `D1`, `D2`, …). These are the calls only the founder can make. Read them before guessing — the wrong guess will burn hours.

---

## Where deferred Supabase migrations live

Search `AUDIT_ROUND2_FINDINGS.md` for `SUPABASE MIGRATION` and `PENDING SCHEMA`. Migrations are additive-only per repo convention (`supabase/migrations/`). Never modify a column in place — add a new nullable one, backfill, then drop the old one in a later migration.

---

## Recovery: if something breaks

1. `git log --oneline -20` — see the last commits.
2. `git revert <commit>` — back out cleanly.
3. Read the affected finding's Notes column in the register.
4. Update the register back to `TODO` with a `REGRESSED:<reason>` note.
5. Append to `SESSION_LOG.md`.

---

## Convention reminder

- **No drive-by fixes.** If you're in `finance.py` to fix R2-XXX and you spot R2-YYY, write it down in the Notes column, do not fix it now.
- **No em dashes in user-facing copy** (founder pref).
- **Migrations are additive-only.**
- **One wave = one working block.** Don't bounce between files.
- **Commit messages:** `fix(R2-XXX): <one-line>. Blast-radius: n files. Wave: Wyy.`
