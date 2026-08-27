# Fix Strategy — the "no regression" rule

The point of this protocol is that **a fix done properly is done forever**. If you have to come back to a finding, you failed. The protocol exists to make failure rare.

---

## The 7 anti-regression rules

1. **The file is the unit of work.** Process one wave at a time. A wave = one primary file.
2. **The blast radius is mandatory.** Before editing, grep every caller of the function/field/table you're touching. Record the count.
3. **Minimal change.** No drive-by refactors. No "while I'm here". If you spot a sibling bug, write it down in the Notes column. Don't fix it now.
4. **Schema changes are additive.** Add a nullable column, backfill, then drop the old one in a separate later migration. Never `ALTER ... DROP COLUMN` in a single step.
5. **Frontend contract changes update the types.** If the API response shape changes, `frontend/src/types/` and the api client must follow in the same commit.
6. **The next-file line numbers shift.** Once a fix lands, every line reference `L<NNN>` in the affected file is stale. Regenerate the register (or at least the affected file's Notes column) after each wave.
7. **A fix that breaks the build is not a fix.** If `npm run build` or `pytest` fails after your commit, revert, then re-do with smaller surface.

---

## The per-fix checklist (lives in `BLAST_RADIUS_TEMPLATE.md`)

Copy the template for every finding. Fill it in. Don't skip sections.

```
PRE-FIX
  [ ] Read the FIX_REGISTER row (file, line, wave, severity).
  [ ] Read the ROUND2 raw log long-form for this finding.
  [ ] Grep the blast radius — every caller, importer, consumer.
  [ ] Read frontend/AGENTS.md if it's a .tsx file.
  [ ] Read backend AGENTS.md (this file) for any .py file.
  [ ] If the blast radius is >1 caller, write a 3-line impact sketch.

DURING
  [ ] Minimal, additive change. No drive-by.
  [ ] Schema change → add a supabase migration next to it.
  [ ] API shape change → update frontend/src/types/ + api client in same commit.
  [ ] Write the smallest unit test that catches the regression.

POST-FIX
  [ ] Re-grep the blast radius. Did the call-site list shrink, stay, or grow?
  [ ] Read the function signature back to confirm shape unchanged.
  [ ] npm run build (only if you touched a frontend file).
  [ ] pytest tests/coverage/ -q (only if you touched a backend file).
  [ ] Sentry 90-day window (standing rule 16): check Sentry at 90-day window before and after every deploy -- '0 unresolved' at 14d is not '0 unresolved'. 0 unresolved at 90 days is definition of done.
  [ ] Update the register STATUS → FIXED, add the commit hash + blast-radius count + test added? in Notes.
  [ ] Append to SESSION_LOG.md.
  [ ] Commit.
```

---

## Sequencing — how to choose the next wave

The register's Waves are roughly ordered by impact (W01 = `finance.py`, biggest cluster). But within a session, you may want to chase a different signal.

**Pick the next wave by:**

1. **Resume priority** — if SESSION_LOG.md ends with "next session: Wxx", do Wxx first.
2. **Severity within file** — within a wave, sort the TODO rows by severity (CRITICAL first).
3. **Cluster signal** — if a fix touches a function also used by another TODO in the same file, do them together. The blast radius overlaps.
4. **Skip signals:**
   - The wave's only remaining TODOs are `DEFERRED:<reason>` → move on.
   - The wave's primary file is a frontend page that has 1-2 findings each → cluster with another adjacent page.

---

## When to stop a session

Stop after any of:

- A wave is complete and the post-wave build/test passes.
- The blast radius of the next finding is > 5 files and you haven't slept on it.
- You hit a finding that needs the founder (Vercel/Supabase/auth). Mark it DEFERRED, append to SESSION_LOG.md, stop.
- 90 minutes of clock time. Diminishing returns are real.

Every stop ends with a 5-line SESSION_LOG entry.

---

## Commit message shape

```
fix(R2-XXX): <one-line summary>

Audit: R2-XXX (and R2-YYY if the same commit covers them)
Wave: Wxx (<primary file>)
Blast-radius: n files (grepped pre-fix), n' files (grepped post-fix)
Verified: <pytest/test-name>, <npm run build if frontend>
Refs: docs/audit/AUDIT_FIX_REGISTER.md L<row>
```

If you have to scope down a finding (e.g. "fixed the 5 of 7 sites, the other 2 need a separate migration"), commit with `fix(R2-XXX): partial — n/m sites` and add `PARTIAL: n/m` to the Notes column.

---

## Deployment verification -- Sentry 90-day window (standing rule 16)

SENTRY_DSN configured. Check Sentry at 90-day window before and after every deploy -- '0 unresolved' at default 14d is not '0 unresolved' (six were sitting just outside it, and two from outage would have aged out within a fortnight while still being real). 0 unresolved at 90 days is definition of done. If a deploy introduces new issues, they appear in the 90-day stream within the deploy window.

---

## Things that will go wrong

- **The founder's environment drifted.** Your static fix may not match the live state. Mitigation: keep the blast-radius count visible in the Notes column so the founder can re-verify.
- **The pytest depends on SQLite.** The repo has `test_competitor_parity.db`, `test_gaps.db`, `test_phase11.db`, `test_phase12.db`, `test_phase13.db`, `test_phase14.db`, `test_phase2.db`, `test_phase6.db`, `test_phase7.db`, `test_phase8.db`, `test.db`. Run pytest against the one that matches your change; `test.db` is the default.
- **The fix you committed is also fixed by a later commit on `main` that you didn't see.** Mitigation: `git fetch origin main` before each wave. If you find a duplicate, mark it `RETRACTED: see R2-YYY` and add to the canonical with `retracted duplicate`.
- **The frontend build is slow.** `npm run build` takes 30-60s. Only run it at the end of a wave, not per fix.
