# Session Log

Append-only. Every working block ends with a 5-line entry. Never edit an existing entry; if a commit was reverted, add a new entry.

## Session 2 — second fix (2026-08-15)

- Action: applied R2-101 (W01 finance.py). Lifted `unbilledCount` and `pendingCount` to component scope and replaced the hardcoded `0` in the Finance header chips with the computed values (+12/-2 lines in `frontend/src/app/c/[company_id]/d/finance/page.tsx`).
- Why this was the right second fix: the audit observed `UNBILLED MATERIALS 0` in the header chip while the toolbar button on the same screen read `New 2`. The chip was hardcoded 0; the button computed from `txns.filter(...)`. Now they share the same source.
- Partial fix explicitly noted in the register: 2 of 3 sub-bugs addressed. Still deferred: (a) toolbar button has no onClick (R2-072 dead button); (b) procurement page computes its own unbilled count from `grns.filter(g => !g.isBilled)` — the audit's "one source of truth via the procurement GRN query" half needs a backend endpoint or shared query cache.
- Verified: static. Both consumers now read the same `useMemo`-wrapped value.
- Blast radius: 1 file, +12/-2 lines.
- Commits: `2253758`.
- Register: R2-101 STATUS TODO → FIXED (partial, with deferral notes).
- TODO W01 after this: R2-179, R2-311, R2-328, R2-335, R2-358 (5 remaining; R2-101 no longer blocks).
- Next session: pick the simplest W01 remaining (R2-358 PARTIAL marker) OR pivot to T1 cross-wave LOW/MEDIUM single-file fixes. Founder's call.

---


## Session 0 — initial dump (2026-08-15)

- Action: copied the 3 master files from `siteflow-audit-continuation-945943/docs/` to `audit/` at repo root. Wrote `START_HERE.md`, `STRATEGY.md`, `BLAST_RADIUS_TEMPLATE.md`. Created this log.
- Files copied: `AUDIT_FIX_REGISTER.md` (64 KB), `AUDIT_CANONICAL_FINDINGS.md` (76 KB), `AUDIT_ROUND2_FINDINGS.md` (1.9 MB).
- Decisions: register-master is `AUDIT_FIX_REGISTER.md`; raw-log is `AUDIT_ROUND2_FINDINGS.md`; canonical is `AUDIT_CANONICAL_FINDINGS.md`.
- Founder requests pending: 1) need Vercel/Supabase/JWT credentials list to know what to ask for when I hit a live-only finding. 2) Confirm npm install + venv already in place for pytest/build baseline.
- Next session: run `npm run build` and `pytest tests/coverage/ -q` to establish the baseline. Then start W01 (finance.py) reading the 4 files in order.

