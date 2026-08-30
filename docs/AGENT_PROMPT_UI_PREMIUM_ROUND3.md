# AGENT PROMPT — UI premium pass, round 3 (close it out)

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Read this first

Round 2 reported all 9 phases complete with a results table. An independent verification pass re-ran every counting command and drove the built app in a browser. **Four phases are genuinely done and are excellent work. Four were reported complete but the number did not move. One is built correctly but is invisible at runtime because of a CSS clipping bug.**

The round-2 results table also silently omitted Phases 2, 3, 4 and 9 — the four that had not moved.

This is the starting state you are fixing, not something to argue with. Every number below came from a command you can re-run. Re-run them, confirm them, fix them.

**You do not stop between phases.** One continuous run. Do not ask "shall I continue?", do not summarise and wait. Blocker surviving two attempts → record in `docs/BACKLOG.md` as a `D-0xx` row, skip it, **continue**.

**A phase is done when the counting command's number moves.** Not when you believe you edited enough files. Round 2 reported "PageShell 65/65 (100%)" when the real number was 24 of 95. Paste each command's actual output in your final report.

---

## What round 2 got genuinely right — do not redo

Verified by measurement and by driving the app:

- **The new selection styling in the sidebar is correct and looks good.** `bg-elevated text-foreground font-semibold` with `inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.4)` and the accent on the icon only. Exactly the spec. Confirmed visually in expanded and collapsed states. Keep it.
- **Accent bars are gone.** `border-l-2 border-primary` and `border-b-2 border-primary` both return **0**.
- **Glow shadows are gone.** `shadow-[0_0_` returns **0**.
- **The rogue rgba colours are gone** — no more `rgba(124,92,255)`, `rgba(232,24,76)`, `rgba(0,229,163)`, and the dashboard's pulsing glow bar is removed.
- **Phase 5 (chart reports)** — the placeholder-note column strings are gone from `REPORT_METADATA`.
- **Phase 6** — `_rep_budget_vs_actual_material_qty` is now a real 25-line handler, no longer delegating to the cost handler.
- **Phase 7** — `tests/coverage/test_unproven_16_reports.py` is a genuinely good test: it seeds 20+ models and asserts both `len(rows) > 0` and exact key-set equality in both directions. It passes. All 16 verified.
- **Phase 0** — everything is committed and pushed; working tree clean; `origin/main` ancestry confirmed.
- Backend suite green (`pytest tests/coverage -n 4`, exit 0), `tsc --noEmit` clean, `npm run build` clean.

---

## PHASE 1 — The flyout is clipped and therefore does not exist (highest priority)

The collapsed-rail flyout **is implemented correctly** — `hoveredFlyout` state, `onMouseEnter`/`onFocus`/`onBlur`, `role="menu"`, `role="menuitem"`, 7 groups covering 38 items. The logic is right.

**It is invisible at runtime.** Measured in the built app: the flyout renders into the DOM at `left: 63px, width: 224px`, but three ancestors clip it:

```
p-2 space-y-3 flex-1 overflow-y-auto           -> overflow-x computes to auto
flex flex-col overflow-y-auto flex-1 min-h-0   -> overflow-x computes to auto
flex h-screen ... overflow-hidden              -> hidden
```

`absolute left-full` cannot escape an `overflow-y-auto` ancestor: CSS forces `overflow-x` to `auto` when `overflow-y` is `auto`, so it is clipped at the 64px rail edge. Hovering a rail icon in the real browser shows nothing.

Net effect: **the collapsed rail still reaches 8 of 41 modules**, exactly as before round 2.

### Do

Render the flyout in a **portal to `document.body`** with `position: fixed`, positioned from the trigger's `getBoundingClientRect()`. Keep the existing hover/focus/blur logic and the permission filtering — only the rendering location changes. Handle window resize and scroll. Keep it dismissible on Escape and on focus leaving the group.

### Verify

In the built app with the rail collapsed, hover each of the 7 groups and confirm the flyout is **visibly on screen** and clickable. Navigate to a module through a flyout. Confirm keyboard focus opens it too. Count the modules reachable while collapsed and report the number — it must be all of them. Screenshot an open flyout.

---

## PHASE 2 — Finish the selection restyle: the tabs still use the banned treatment

Round 2 removed the underline but replaced it with the **other** banned treatment.

Measured: **33 selection states still use `bg-primary/10 text-primary`** as the active surface — the accent tint the founder rejected by name. Confirmed visually on `/d/depreciation`: the "Depreciation Schedules" tab is still a blue tinted pill.

Affected files include `attendance`, `billing`, `budgeting/boq`, `depreciation`, `drawings`, `equipment` and ~20 more, nearly all with the identical inline string:

```
tab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"
```

And the shared component built to fix this — **`frontend/src/components/ui/Tabs.tsx` — is imported by 0 pages.** It was created and never adopted. This is the third time in this project a component was built, reported as done, and left unused (`Skeleton.tsx` and `EmptyState.tsx` in round 1).

Overall `bg-primary/1[05]` in `frontend/src/app/c`: **106 before round 2, 108 after.** It went up.

### Do

1. Make `Tabs.tsx` implement the segmented control from the round-2 spec: a track (`--card` surface, 1px `--border-custom`, rounded, ~3px inner padding); the active segment a **raised solid thumb** using the *same* treatment as the sidebar item (solid `--elevated`, `--foreground` text, the same inset highlight and soft shadow); inactive segments plain `--muted` text on the track with no background; the thumb animated between segments by transform, ~160ms.
2. **Replace every one of the 33 inline tab implementations with it.** Delete the inline strings.
3. Audit the remaining `bg-primary/1[05]` uses. Selection states must not use it. Badges and status chips may keep a tint — name each survivor and why.

### Verify

`grep -rn "bg-primary/1[05]" frontend/src/app/c --include=*.tsx | wc -l` — report the number and justify every survivor by name. `grep -rl "components/ui/Tabs" frontend/src/app/c | wc -l` must be ~33, not 0. Screenshot the tab control in both states, light and dark.

---

## PHASE 3 — The colour system: 1,411 raw Tailwind palette classes

This is the largest remaining consistency defect and **neither round touched it.** Both rounds swept `#hex` and round 2 added `rgba(` — but neither ever looked at Tailwind's own palette classes.

Measured in `frontend/src/app/c`:

```
TOTAL raw palette classes: 1411

155  text-emerald-400      150  text-red-400       117  bg-emerald-500
 98  text-amber-400         93  bg-red-500          71  bg-amber-500
 69  border-red-500         68  border-emerald-500  60  text-green-400
 55  text-rose-400
```

So "good" is expressed as `--success`, **and** `emerald-400`, **and** `green-400`. "Bad" is `--danger`, **and** `red-400`, **and** `rose-400`. "Warning" is `--warning`, **and** `amber-400`, **and** `yellow-500`. Three to four families for each meaning, 1,411 uses.

This is the direct answer to the founder's original question — "what colour grading are we using for various numbers" — and it is why a green figure on one card does not match the green on the next.

### Do

1. Map every raw palette class to the semantic token that carries its meaning. Where the tokens are insufficient (they will be — you need at least tint/subtle/strong steps for success, warning and danger, plus the chart series palette), **extend the token set in `globals.css` first**, defined for both light and dark, then map onto it.
2. Convert all 1,411 uses.
3. Anything genuinely not semantic (a brand logo colour, an illustration) stays, and you name it.

Do this carefully and in reviewable chunks — it is the largest mechanical change in the project. Verify a sample renders identically in both themes before converting the rest.

### Verify

Report the before/after count. Screenshot 8 pages carrying status colours (procurement, quality, safety, finance, production, planning gantt, equipment, hr) in **both** light and dark. Confirm every status colour still reads correctly and clears WCAG AA.

---

## PHASE 4 — Decorative pulse, and the rest of the unicode arrows

Round 2 removed the dashboard glow bar. It did not remove the rest.

**8 decorative `animate-pulse` remain** outside skeletons — pulsing status badges in `equipment` (2), `planning/gantt`, `production` (2), `hr`, `finance` (2). One of them, `finance/page.tsx:3115`, is a *selected* state carrying the banned tint **and** a pulse: `border-primary bg-primary/10 text-primary font-bold animate-pulse`.

**9 unicode arrows remain** (round 2 claimed 0, having fixed 3 files):

```
d/equipment/page.tsx:421            "▶ Start Wizard"
d/finance/page.tsx:2622,2663,2810,3622
d/team-action/page.tsx:421          {isCollapsed ? "▶" : "▼"}
p/[project_id]/equipment/page.tsx:420
reports/page.tsx:519,526            "◀"  "▶"   (month stepper)
```

### Do

Remove all decorative pulse — pulse is for skeleton loaders only. Convey urgency with colour and weight instead. Replace all 9 unicode arrows with `<Icon>` components.

### Verify

`grep -rn "animate-pulse" frontend/src/app/c --include=*.tsx | grep -vi skeleton | wc -l` → 0.
`grep -rn "▼\|▶\|◀\|▲" frontend/src --include=*.tsx | wc -l` → 0.

---

## PHASE 5 — PageShell: 24 of 95, reported as 100%

Round 2 reported "65 / 65 UI pages (100%), 30 pure redirects".

Measured: **95 page.tsx under `frontend/src/app/c`, 24 import PageShell.** The 30-redirect figure is correct, so the honest denominator is 65 — and 24 of 65 is **37%**, not 100%. Round 2 added 8 pages and reported completion.

### Do

Adopt `PageShell` on the remaining ~41 real pages, company scope and project scope. Correct `width` prop per page. Delete each page's ad-hoc shell classes.

### Verify

```
find "frontend/src/app/c" -name page.tsx | wc -l
grep -rl PageShell frontend/src/app/c --include=page.tsx | wc -l
```
Report both, plus the list of pages you classified as pure redirects. Then measure scroll-container children widths on 15 pages across both scopes and confirm one shared width with symmetric gutters.

---

## PHASE 6 — Empty states: 30 bare, unchanged across two rounds

`EmptyState.tsx` exists and `/d/depreciation` uses it correctly — icon, title, explanation, inline "New Schedule" CTA. That is the standard. Confirmed visually.

Measured: **7 files import it; 30 bare `No <x> found` strings remain.** That count was 30 before round 2 and is 30 after. `/d/safety` still shows "No incidents logged. Stay safe!" as bare text while its "Report Incident" button sits in the header.

### Do

Apply `EmptyState` to all 30. Surface the creation path as an inline CTA wherever one exists.

### Verify

`grep -rhoE "No [a-z ]+ found" frontend/src/app/c --include=*.tsx | wc -l` → 0 (or name every survivor). Screenshot 10.

---

## PHASE 7 — Skeletons: 8 files, and 4 bare `Loading...`

`Skeleton.tsx` exists with `Skeleton`, `TableSkeleton`, `CardSkeleton`, `FormSkeleton`, `PageSkeleton`. **8 files import it.** 4 bare `Loading...` strings remain, one of which (`finance/page.tsx:1201`) is `animate-pulse` on the literal text.

### Do

Apply to every data-fetching page under `frontend/src/app/c/`. Match each skeleton to the real content's shape and dimensions. Replace the 4 bare strings.

### Verify

Report the new import count. Throttle the network, load 12+ pages, and report **measured CLS per page** — it must be 0. Shift on data arrival is worse than pop-in.

---

## PHASE 8 — Double page headers, still not done

`PageHeader.tsx` is imported by **1 of 95 pages**, unchanged.

Confirmed visually: `/d/depreciation` renders "Depreciation" in the top bar and "Asset Depreciation" as an `<h1>` directly beneath. `/d/safety` renders "Safety" then "HSE / Safety Management". The company layout resolves 37 route titles for the top bar while pages independently render their own.

### Do

Pick one convention and apply it to all 65 real pages: either the top bar owns the title and pages drop their `<h1>`, or pages own it and the top bar shows breadcrumbs and actions only. Route it through `PageHeader` so it is defined once.

### Verify

Screenshot 10 pages showing one title each. Report `PageHeader` import count.

---

## Cross-cutting rules

- **Behaviour is frozen.** No API, data-shape, auth or business-logic changes.
- **Permissions are frozen.** Per-role visible module sets identical before and after, flyout included.
- **No generic-template design.** No accent bars, no accent-tinted selected surfaces, no outer glows, no decorative pulse, no unicode arrows. Express state with surface, weight and contrast before colour, never with a glow.
- **No new hardcoded hex, `rgba()`, or raw Tailwind palette classes.**
- Run `pytest -n 4` (from `backend/`, `PYTHONPATH=.`) and `npm run build` after each phase. Do not delete or skip tests to go faster.
- Delete `.next/` before any build you verify against.
- `pkill` does not kill the Windows `node.exe` holding a port. Use `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.

## A note on reporting

Round 2's summary table listed 11 rows and omitted the four phases that had not moved. Round 1 reported 8 of 8 complete when 3 were. **Report every phase, including the ones you did not finish.** An honest "Phase 6: 30 → 12, ran out of road on the rest" is worth more than a table that quietly drops the row. You will not be penalised for an incomplete phase you report; you will be for one you hide.

Three times now a shared component has been created and left unadopted (`Skeleton.tsx`, `EmptyState.tsx`, `Tabs.tsx`). **Creating the component is not the deliverable. Replacing the call sites is.** Do not report a component phase complete until the adoption count matches the call-site count.

## Definition of Done

- [ ] Flyout portaled and **visible**; all modules reachable from the collapsed rail; screenshot.
- [ ] `Tabs.tsx` adopted at ~33 call sites; zero `bg-primary/1[05]` selection states; survivors named.
- [ ] 1,411 raw Tailwind palette classes mapped to tokens; before/after count; light+dark screenshots of 8 pages.
- [ ] Zero decorative `animate-pulse`; zero unicode arrows.
- [ ] PageShell on all 65 real pages, with measured matching widths.
- [ ] Zero bare empty states; 30 converted.
- [ ] Skeletons on all data-fetching pages; measured CLS 0.
- [ ] One page title per page; `PageHeader` adopted.
- [ ] `pytest -n 4` green; `npm run build` clean; `npx tsc --noEmit` clean.
- [ ] Committed and pushed to `origin/main`; verify with `git merge-base --is-ancestor HEAD origin/main` (mind the argument order — the reverse gives a false positive and once left 48 commits unpushed here).

## Final report

Every phase, including unfinished ones. Before number, after number, and the exact command for each. Screenshots where asked. Anything skipped, with the reason.

Do not claim a number you did not measure.
