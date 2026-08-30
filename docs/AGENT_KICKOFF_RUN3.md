# Kickoff message — run 3

Copy everything below the line into a fresh session.

---

You are working on SiteFlow (construction ERP: FastAPI + SQLAlchemy on Render, Next.js on Vercel,
Supabase Postgres). Two previous runs cleared the remediation backlog. **Only two items remain.**

## Setup

```bash
git fetch origin main && git checkout main && git pull
```

Current state, independently verified 2026-08-30: full backend suite **0 failures**, frontend
production build **clean, 23/23 pages**, and all of Parts A–E of `docs/REMEDIATION_MASTER_PLAN.md`
are closed except the two tasks below. Do not re-open closed work.

## Rule zero — how to prove your work landed

The previous run ran this and believed it was safe:

```bash
git merge-base --is-ancestor origin/main $(git rev-parse HEAD)   # WRONG
```

That asks *"is main an ancestor of me?"* — i.e. "am I ahead of main", which is trivially true the
moment you commit locally. It reported OK while **48 commits sat unpushed**. The arguments are
reversed. The correct check is:

```bash
git fetch origin main
git merge-base --is-ancestor $(git rev-parse HEAD) origin/main && echo LANDED
git ls-remote origin main            # cross-check: must equal your HEAD after pushing
```

**And actually push.** `git push origin main`. Committing is not landing.

## Task 1 — R2-765: give chat unread counts a real home (small, do this first)

`backend/app/routers/chat.py:71` stores the read watermark in a module-level in-memory dict:

```python
_group_user_last_read: Dict[Tuple[uuid.UUID, uuid.UUID], datetime] = {}
```

Written at `:226`, read at `:193`. There is no column behind it. So mark-as-read **dies on every
deploy** (Render recycles containers), **differs per worker** (the badge flickers between two values
depending on which process answers), and the dict **never evicts**.

Fix: add `last_read_at = Column(DateTime(timezone=True), nullable=True)` to `ChatGroupMember`
(`models.py:1816`), with an **additive migration** in `supabase/migrations/` — nullable, no backfill;
NULL means "never read", which is exactly how the current code treats a missing entry. Write it in the
mark-as-read endpoint, read it in `list_groups`, and delete the dict.

Gate: a test asserting the watermark survives a new process — write it, discard the app instance,
re-read, assert the count is still zero. It must fail before your fix.

Full write-up: `docs/VERIFICATION_NEW_FINDINGS.md`, finding **R2-765**. Backlog row **D-020**.

## Task 2 — D-017: make the pre-login index page fast, changing nothing visible

This is the main job. One constraint overrides every optimisation instinct you have:

> **The page must look and behave EXACTLY the same when you are done.** Every animation, gradient,
> mockup, count-up and typewriter effect stays. You are optimising *delivery and execution*, not
> design. "It was slow because of the fancy bit, so I removed the fancy bit" is a **failed task**.

Target: `frontend/src/app/page.tsx` and the components it pulls in — `MarketingShell`, `MockupFrame`,
`Icon`, `TypewriterText`, `CountUp`, `Aurora`, `EmberSparks`.

**Measure first and keep the numbers.** Baseline LCP, CLS, INP, TBT, transferred bytes, JS bytes and
main-thread long tasks, on a **production build** (`npm run build && npm start`) — never the dev
server, whose numbers are meaningless here. Re-measure after each change and report before/after per
change. **A change with no measured improvement gets reverted, however sensible it looked.**

Confirmed starting points, verified in the tree:

1. **Images dominate. `frontend/public` is 83 MB.**
   - `resources/glossary/construction-hero.png` — 8.5 MB
   - `resources/glossary/construction-hero.webp` — **also 8.5 MB**, i.e. that WebP never actually
     compressed. Re-encode properly.
   - `marketing/landing/feature-dpr-phones.png` — **4.1 MB, and it is on the landing page**
   - several 1.8–2.0 MB PNGs under `marketing/mocks/` and `marketing/blog/`

   Convert to WebP/AVIF at sane quality, generate responsive sizes, serve via `next/image` with correct
   `sizes`, `priority` on the LCP image only, lazy-load the rest. **Compare crops before/after at
   display size** — do not trust the byte count alone.

2. **Three client components run animation loops.** `TypewriterText` (8 rAF/timer call sites in 85
   lines) and `CountUp` (4 in 98) are `"use client"` with running timers; `EmberSparks` is client too.
   Most likely source of the hang. Drive animation with CSS transforms/opacity where the effect allows;
   make every loop cancel on unmount, pause off-screen (`IntersectionObserver`) and pause on
   `visibilitychange`; never animate layout-triggering properties. `CountUp` must not run before it
   scrolls into view.

3. `MockupFrame` (562 lines) and `Aurora` are **server** components — keep them that way. Run the
   bundle analyser and check nothing large crossed into the client bundle.

4. **Fonts:** confirm `next/font` self-hosting with `display: swap` and preloaded subsets. A
   render-blocking font is an invisible hang that costs nothing visual to fix.

5. **The service worker serves stale marketing pages.** Measure with it unregistered, then again with
   it active, or you will measure the cache instead of your change. A previous run accidentally
   modified `frontend/public/sw.js` and had to revert it — leave it alone.

**Acceptance:** before/after numbers per change on a production build; screenshots at mobile and
desktop widths proving every animation still runs; no console errors, no new network failures, no
layout shift introduced. Keep going until there is no perceptible hang on a mid-range device — but
**stop before removing anything visual.** If you believe a specific effect genuinely cannot be made
smooth, report it with its measurement and let me decide. Do not decide that yourself.

## Standing rules

- **Show, don't claim.** Every assertion needs the command and its pasted output. "Done and tested"
  with no output is treated as not done.
- Every fix needs a test that **fails against the unfixed tree at the defect's own assertion**. If it
  passes before your fix, the test is wrong. And make sure the test actually *runs* — a gate that
  crashes before asserting looks like coverage and is worse than none.
- Run the full backend suite (`python -m pytest` in `backend/`, not just `tests/coverage`) and the
  frontend build before you claim green. Current baseline: **0 failures, build exit 0.** If either
  moves, you caused it.
- **Never fabricate a value or a store.** If state must persist, it goes in the database — R2-765
  above exists because a feature was built on a process-local dict.
- **Do not** touch Part D (ops/infra: backups, Render tier, Firebase, production purges), do not change
  the DB role to activate RLS (it is inert by design), do not run production DDL without asking, do not
  merge `claude/siteflow-audit-round10-cont-f6961b`, do not edit `audit/`.
- **Do not delete a `.git/*.lock` file.** Wait it out. A previous run deleted one and lost 446 files.
- If you cannot finish something, say so and add it to `docs/BACKLOG.md` with a D-code. An honest
  residual is fine; a false "done" is not.

Report when Task 1 is landed, then again when Task 2 has measurements.
