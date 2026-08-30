# AGENT PROMPT — UI premium pass, round 2 (finish what round 1 left)

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Read this first

Round 1 of `docs/AGENT_PROMPT_UI_PREMIUM.md` reported all 8 phases complete. An independent verification pass measured the actual tree and the live site. **Three phases are genuinely done. Two were barely started. One is 17% done. And none of the work is committed.**

This is not a criticism to argue with — it is the starting state you are fixing. The measurements below were taken with commands you can re-run yourself. Re-run them, confirm them, then fix them.

**Do not stop between phases.** Work through every item below in one continuous run. Do not ask "shall I continue?", do not summarise and wait. The only acceptable early stop is a genuine blocker surviving two independent attempts — record it in `docs/BACKLOG.md` as a new `D-0xx` row, skip that item, **continue with the rest**.

**Do not report a phase complete without the measurement that proves it.** Every item below names the command or measurement that settles it. Run that command and paste its output in your final report. A phase is done when the number moves, not when you believe you edited enough files.

---

## PHASE 0 — Commit and push what already exists (do this before anything else)

All of round 1's work is sitting **uncommitted** in the working tree: 64 modified files and 4 new paths, including `Sidebar.tsx`, `SidebarContext.tsx`, `PageShell.tsx`, `Skeleton.tsx` and `EmptyState.tsx`. It is not on `main`, it is not deployed, and a single `git checkout` destroys all of it.

Round 1's own Definition of Done required "committed and pushed to `origin/main`". That box was ticked without being done.

1. Review the full diff before committing — you are committing work you did not necessarily write.
2. Commit in coherent chunks with real messages.
3. Push to `origin/main`.
4. Verify: `git merge-base --is-ancestor HEAD origin/main` — **mind the argument order**; the reverse gives a false positive and has already left 48 commits unpushed on this project once.

Do this first so nothing further is at risk.

---

## What round 1 actually got right — do not redo these

Confirmed by measurement. Leave them alone except where a later phase touches them.

- **Design tokens / hex removal.** 166 hardcoded hex literals down to 11, and all 11 remaining are inside the generated print/PDF stylesheet in `reports/[slug]/page.tsx`, where hardcoding is correct. Effectively complete.
- **Responsive grids.** 165 fixed `grid-cols-N` down to **0**. Complete.
- **Navigation architecture.** Sidebar went from 25 hrefs to 41 with **zero routes removed** — every module that was in "More Modules" (Analytics, Budget, Custom Fields, Depreciation, Drawings, Statutory, Towers, Wastage) is preserved and promoted into a named group, and the 14 modules that were previously reachable only from the Help page are now in the nav. All 21 permission strings used validate against `ALL_PERMISSION_KEYS`. Complete and correct.
- **The three known class conflicts** (`settings/page.tsx:1124`, `settings/page.tsx:1196`, `billing/page.tsx:919`) are fixed.
- **PageShell itself is correct where applied.** Measured on `/d/help` at 1600px: content 1280px wide with 125px/131px gutters — properly centered. The help search box that was capped at `max-w-2xl` (672px) is now `w-full` at 1216px. The component works. It is just barely adopted — see Phase 2.

---

## PHASE 1 — Finish PageShell adoption (currently 17%)

Measured:

```
frontend/src/app/c/[company_id]/d :  12 / 42 pages adopt PageShell
frontend/src/app/c/[company_id]/p :   0 / 42 pages adopt PageShell
overall console                   :  16 / 95
```

Adopted: `attendance billing budget crm delete-logs depreciation dpr finance help procurement statutory three-way`

**Not adopted** — including most of the modules round 1 just promoted into the sidebar:
`budgeting/boq chat custom-fields drawings equipment face-recognition home hr labour library mom payment-approval payroll-attendance planning planning/gantt procurement/rfq procurement/vendor-performance production quality reports reports/calculators safety services subcon subcon/scorecards subcon/work-orders/amendments team-action todo towers wastage`

The visible consequence, measured at 1600px viewport:

| page | content width | left edge | result |
|---|---|---|---|
| `/d/help` (adopted) | 1280 | 125px gutter | centered |
| `/d/safety` (not adopted) | 1344 | flush at 256 | full bleed |

Clicking between them looks like two different products. This is now the single largest remaining "does not look premium" defect, and round 1 made it *more* visible by promoting the un-adopted modules into the nav.

### Do

Adopt `PageShell` on **every** page under `frontend/src/app/c/` — company scope and project scope. Pick the correct `width` prop per page (dense tables wide, forms narrower). Delete the ad-hoc shell classes each page currently carries.

Also: `frontend/src/components/PageShell.tsx` is an 82-byte re-export stub of `frontend/src/components/layout/PageShell.tsx`, imported by nothing. Either route all imports through it or delete it. Do not leave two paths to one component.

### Verify

For 15 pages spanning both scopes, measure the scroll container's direct children with `getBoundingClientRect()` and confirm one shared width and symmetric gutters. Paste the numbers.

---

## PHASE 2 — Make the collapsed rail usable (currently a dead end)

The collapse itself works: `Ctrl+B` toggles, the rail goes to 64px, state persists in `localStorage` under `siteflow_sidebar_collapsed`, and content reflows. Good.

**But the collapsed rail contains 8 clickable elements for 41 modules.** Measured: `document.querySelector('aside').querySelectorAll('a,button,[role=button]').length === 8`. Hovering a rail icon produces no flyout, no tooltip, no popover. **33 of 41 modules are unreachable while collapsed.**

Round 1's spec said groups must work in the collapsed rail and named hover flyout as the usual answer. That was not built.

### Do

Implement the collapsed-rail interaction properly. Hovering (and keyboard-focusing) a group icon must reveal that group's items — a flyout panel anchored to the rail, or an equivalent. Every module reachable when expanded must be reachable when collapsed, by mouse and by keyboard.

Respect the same permission gating in the flyout as in the expanded nav. A flyout that skips the `can()` filter is a security regression.

### Verify

With the rail collapsed, reach **all 41 modules** and record the count. Confirm keyboard navigation works. Screenshot a flyout open.

---

## PHASE 3 — Skeletons (currently zero net change)

Round 1 created `frontend/src/components/ui/Skeleton.tsx` with `Skeleton`, `TableSkeleton`, `CardSkeleton`, `FormSkeleton`, `PageSkeleton`, then applied it almost nowhere.

Measured before vs after round 1:

```
files containing "animate-pulse" :  7  ->  7     (zero change)
files containing "Loading..."    :  6  ->  4     (2 replaced)
files importing Skeleton         :          5
```

The component exists. The adoption does not.

### Do

Apply the skeleton family to **every data-fetching page** under `frontend/src/app/c/`. Match each skeleton to the real content's shape and dimensions so nothing shifts when data lands. Replace the 4 remaining bare `Loading...` strings.

### Verify

Throttle the network and load 12+ pages. Confirm a skeleton renders, and confirm **CLS is 0** when real data replaces it. Layout shift on data arrival is worse than the pop-in you started with. Report the measured CLS per page, and report the new `animate-pulse` file count.

---

## PHASE 4 — Empty states (currently one file changed)

Round 1 created `frontend/src/components/ui/EmptyState.tsx` and applied it to 4 files.

Measured before vs after:

```
files with a bare "No <x> found" :  22  ->  21     (one file)
bare occurrences remaining       :  30
files importing EmptyState       :   4
```

The `/d/depreciation` example is genuinely fixed and is the standard to copy — icon, title, one line of explanation, and a "New Schedule" CTA inline where the user is looking. Confirmed by screenshot.

But `/d/safety` still shows "No incidents logged. Stay safe!" as bare text while its "Report Incident" button sits up in the header, away from where the user's eye is. That pattern repeats 29 more times.

### Do

Apply `EmptyState` to all 30 remaining bare empty states. Where a creation path exists, surface it as the inline CTA.

### Verify

Visit each of the 30 with an empty tenant and screenshot. Report how many now carry a CTA and name any that legitimately cannot.

---

## PHASE 5 — Fix the three chart-type reports rendering placeholder text as a column header

Round 1 of the reports work (a separate task, already on `main` and live) implemented all 82 reports. Live probing of all 82 found 0 errors, 66 returning real rows, and 0 column mismatches. That work is sound.

But three reports are chart-shaped, and their `REPORT_METADATA` `columns` array held a **note to a human**, not a column name. The handlers now return real aggregate values keyed by that note, so the live UI renders a one-cell table whose column header reads:

```
"(No tabular columns - rendered as a funnel/visual chart, not a data table)"   -> "Total Leads: 2"
"(No flat table captured - appears to be a chart/analysis view ...)"           -> "Total Cost Code Expense: 802754.0"
"(No tabular header captured - likely a chart/summary style report)"           -> "Revenue: 236000.0, Expense: 802754.0, Net P&L: -566754.0"
```

Affected: `lead-status-funnel`, `cost-code-expense-analysis`, `monthly-pl`.

The underlying numbers are correct and real. The presentation is not shippable.

### Do

Give each of the three a proper visual treatment in `reports/[slug]/page.tsx` — a funnel for `lead-status-funnel`, and summary/stat cards or a chart for the other two. Return structured fields from the backend (e.g. `{stage, count}` for the funnel; `{revenue, expense, net}` for the P&L) instead of a formatted string in one cell. Replace the placeholder `columns` entries with the real shape.

Use the design tokens and the chart series palette from round 1. Do not introduce new hex.

### Verify

Screenshot all three rendering with real data from company `d3724ec3-edac-4b5f-b296-fc6a013b7b5d` (AK Construction), which has data.

---

## PHASE 6 — Fix `budget-vs-actual-material-qty`

`_rep_budget_vs_actual_material_qty` is a one-line delegation:

```python
return _rep_budget_vs_actual_material_cost(db, cid, pid)
```

So the "Budget vs Actual (Material Qty)" report returns **cost** columns. Its `REPORT_METADATA` spec is `['Project', 'Material', 'Unit', 'Budget Qty', 'Actual Qty', 'Variance Qty']` — none of which the cost handler produces.

This did not surface in live probing only because the tenant has no BOQ/budget rows, so both return empty. It will produce wrong columns the moment a customer has budget data.

### Do

Write a real quantity handler returning the spec'd columns.

### Verify

Seed budget + material data for a test tenant, call the endpoint, and confirm the returned keys match the spec exactly.

---

## PHASE 7 — Verify the 16 unproven reports with seeded data

Live probing of all 82 reports against AK Construction returned 66 with rows and **16 empty**. Empty is not proof of breakage — two of the 16 (`item-wise-sales`, `payment-request`) are original, previously-verified handlers, so the tenant simply lacks that data. But it is also not proof of correctness.

Unproven, all returning `200` with `0` rows:

```
boq-bom  boq-item  boq-measurement-book  budget-vs-actual-cost-code
budget-vs-actual-material-cost  budget-vs-actual-material-qty  cost-code-library
item-wise-sales  material-received-without-po  material-request-item  payment-request
quotation  quotation-item  rate-card-library  subcon-material-issue  todo-report
```

### Do

Seed a test tenant with the underlying records each of these reads (BOQ items, quotations, rate cards, cost codes, material requests, todos, subcon material issues, payment requests, budgets). Then call all 16 and confirm each returns rows whose keys match its `REPORT_METADATA.columns` exactly.

### Verify

Report a 16-row table: slug, rows returned, key match yes/no.

---

## PHASE 8 — Replace the selection styling (founder-rejected, highest priority after Phase 0)

**The founder has explicitly rejected the current active/selected styling as generic AI-generated design.** He removed this exact treatment once before and it came back. It is not a matter of taste to re-argue; it is a hard requirement.

### What is banned, everywhere, permanently

1. **The 2px accent bar.** `border-l-2 border-primary` on the active sidebar item (3 uses), and `border-b-2 border-primary` as the active tab underline (10 uses). No accent bar on any edge, in any direction, as a selection indicator.
2. **The translucent accent tint as a selected surface.** `bg-primary/10` and `bg-primary/15` used to mark selection — 21 and ~12 uses respectively, and the two opacities are used interchangeably for the same meaning, which is its own inconsistency.
3. **Glow shadows.** `shadow-[0_0_15px_rgba(...)]`, `shadow-[0_0_20px_rgba(...)]`, `shadow-[0_0_40px_rgba(...)]` — 5 uses. Outer glows read as template output.
4. **Decorative `animate-pulse`.** `dashboard/page.tsx:1665` has a permanently pulsing glowing bar. Pulse is for skeleton loaders only, never for decoration.
5. **Unicode arrows as UI chevrons.** `▼ ▶ ◀ ▲ ✕` used as controls in `Sidebar.tsx` and elsewhere. Use real icons from the existing `Icon` component.

### Bonus defect found while auditing this

Round 1's hex sweep only matched `#rrggbb` and **missed `rgba()`**. The purple `#7C5CFF` — which is in no token and clashes with the sky-blue primary — survives as `rgba(124,92,255,...)` in `dashboard/page.tsx:1665` and `drawings/page.tsx:471`. Also surviving: `rgba(232,24,76,...)` (pink) and `rgba(0,229,163,...)` (green), neither in the token set. Worse, `dashboard/page.tsx:1651` puts a **pink** glow on a `bg-primary` (blue) bar.

Sweep `rgba(` in addition to `#hex` and route every one through the tokens.

### What to build instead

These were prototyped and compared side by side before being chosen. Do not substitute your own approach without building the comparison and showing it.

**One idea, applied in both places: the selected thing becomes a raised solid object.** Not tinted, not outlined, not glowing. It reads as a physical surface lifted off the rail, the way a native macOS sidebar or Linear does it.

**Sidebar active item:**
- Background: a **solid neutral elevated surface** (`--elevated`), not an accent tint.
- Text: full `--foreground` at semibold. Inactive stays `--muted` at medium.
- Accent: **only the icon** takes `--primary`. That is the sole use of colour.
- Depth: `inset 0 1px 0 rgba(255,255,255,.06)` plus a soft `0 1px 2px rgba(0,0,0,.4)`. Subtle lift, no glow.
- No border on any edge.

**Centre-panel tabs — replace the underline with a segmented control:**
- A track: the existing `--card` surface, 1px `--border-custom`, rounded, ~3px inner padding.
- The active segment is a **raised solid thumb** using the same treatment as the sidebar item above (solid `--elevated`, `--foreground` text, the same inset highlight and soft shadow).
- Inactive segments are plain `--muted` text on the track, no background.
- Animate the thumb between segments (transform, ~160ms). Never animate colour alone.

**Both must be defined once** as shared components or shared token classes, and every call site must use them. The reason there are two opacities and three treatments today is that this was inlined at 40+ call sites.

### Rejected alternatives, and why (do not re-propose these)

- **Weight/contrast change only, no surface.** Too subtle. In a 41-item grouped nav you cannot locate the active row at a glance. Fails the functional job.
- **Solid saturated accent fill on the selected row.** Legible, but a big saturated blue block dominates the rail and competes with the content area. Wrong for a dense ERP where the nav should recede.
- **Literally growing the selected item.** The founder floated this. Do not implement size growth on selection: it causes layout shift in a nav list and reads janky on every click. The raised-surface treatment delivers the same "it lifts and becomes an object" intent with nothing moving. A subtle scale on *hover* is acceptable; on *selection* it is not.

### Verify

- `grep -rn "border-l-2 border-primary\|border-b-2 border-primary" frontend/src` returns **0**.
- `grep -rn "bg-primary/1[05]" frontend/src` returns 0 for selection states (badges and chips may legitimately keep a tint — justify each survivor by name).
- `grep -rn "shadow-\[0_0_" frontend/src` returns 0.
- `grep -rnE "rgba\([0-9]" frontend/src/app/c` returns only token-derived values.
- No decorative `animate-pulse` remains; skeletons only.
- Screenshot the sidebar with an item selected and the tab control in both states, in **light and dark**.

---

## PHASE 9 — Double page headers

Several pages render the route title in the top bar **and** an `<h1>` immediately below saying nearly the same thing — `/d/depreciation` shows "Depreciation" then "Asset Depreciation"; `/d/safety` shows "Safety" then "HSE / Safety Management". Two headers stacked in the first 120px of every page is a large part of why the console reads as cluttered.

### Do

Decide one convention and apply it everywhere: either the top bar carries the title and pages drop their `<h1>`, or pages own the title and the top bar shows only breadcrumbs/actions. Route it through the existing `PageHeader` component so it is defined in one place.

### Verify

Screenshot 10 pages showing one title each.

---

## Cross-cutting rules

- **Behaviour is frozen.** No API, data-shape, auth or business-logic changes, except the report-shape changes explicitly required by Phases 5 and 6.
- **Permissions are frozen.** Per-role visible module sets must be identical before and after. This applies to the Phase 2 flyout.
- **Accessibility.** Visible focus ring on every interactive element. Body text clears WCAG AA in **both** themes.
- **No new hardcoded hex or `rgba()`** outside the print stylesheet.
- **No generic-template design.** The founder reads accent bars, accent-tinted selected surfaces, outer glows, decorative pulses and unicode arrows as AI-generated filler, and has rejected them by name. This applies to anything new you add in any phase, not only to Phase 8. When you need to express state, express it with surface, weight and contrast before reaching for colour, and never with a glow.
- Run `pytest -n 4` (from `backend/`, with `PYTHONPATH=.`) and `npm run build` after each phase. **Do not delete or skip tests to go faster.**
- Delete `.next/` before any build you intend to verify against — Next.js will otherwise serve stale pre-edit HTML from cache and you will confirm your own old output.
- `pkill -f "next start"` does not kill the Windows `node.exe` holding the port. Kill by port: `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.

## Definition of Done

- [ ] Round 1's work is committed and pushed to `origin/main`, verified by ancestry check.
- [ ] `PageShell` adopted by every page under `frontend/src/app/c/` (95/95), with measured matching widths.
- [ ] Collapsed rail reaches all 41 modules by mouse and keyboard, permission-gated, with a screenshot.
- [ ] Skeletons on all data-fetching pages; measured CLS 0.
- [ ] All 30 remaining bare empty states use `EmptyState`.
- [ ] The 3 chart reports render as charts/stat cards, screenshotted with real data.
- [ ] `budget-vs-actual-material-qty` returns its own spec'd columns.
- [ ] All 16 previously-empty reports verified against seeded data.
- [ ] Selection styling replaced everywhere: zero accent bars, zero accent-tint selected surfaces, zero glow shadows, zero decorative pulse, zero unicode arrows as controls. Sidebar item and tab control both use the shared raised-surface treatment, defined once. Screenshots in light and dark.
- [ ] `rgba()` colours swept alongside hex; the purple, pink and green non-token colours are gone.
- [ ] One page title per page.
- [ ] `pytest -n 4` green; `npm run build` clean; `npx tsc --noEmit` clean.
- [ ] Committed and pushed to `origin/main`, ancestry verified.

## Final report

Per phase: the before number, the after number, and the command that produced each. Screenshots where the phase asks for them. Anything skipped, with the reason.

Do not claim a number you did not measure. Round 1 reported 8 of 8 phases complete when 3 were; the difference was that nobody ran the counting command.
