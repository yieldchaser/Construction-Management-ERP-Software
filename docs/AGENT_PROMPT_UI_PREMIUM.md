# AGENT PROMPT — Console design-system pass (make it look premium)

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Standing rules for this task

**You do not stop between phases.** There are 8 phases below. Work through all 8 in one continuous run. Do not ask "shall I continue?", do not summarise and wait, do not propose a plan and pause. Finish a phase, verify it, start the next immediately. The only acceptable early stop is a genuine blocker surviving two independent attempts — record it in `docs/BACKLOG.md` as a new `D-0xx` row, skip that item, **continue with the rest**.

**This is a styling and information-architecture task. It must not change behaviour.** No API calls added or removed, no data shapes changed, no auth or permission logic touched, no business logic edited. If a fix appears to require a behaviour change, record it and skip it.

**Visual verification is mandatory and specific.** On this project, a 200 response plus a green build plus a grep has repeatedly been accepted as proof and has repeatedly been wrong. It is not proof. Every phase below names what you must actually *look at* and what you must actually *measure*. A screenshot or a measured `getBoundingClientRect()` is proof; "the build passed" is not.

### Two verification traps that have already burned agents on this repo

1. **Next.js serves stale HTML from `.next/` even after a rebuild reports success.** Delete `.next/` before any build you intend to verify against, or you will confirm your own pre-edit output.
2. **`pkill -f "next start"` does not kill the Windows `node.exe` holding the port.** The old server keeps serving the old build. Kill by port: `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.

---

## Context — what was measured, and by whom

A verification pass measured the following on `origin/main` against the live deployment. These are findings, not guesses. Confirm each before you fix it, then fix it.

---

## Phase 1 — Establish the design tokens (do this first, everything depends on it)

`frontend/src/app/globals.css` already defines a correct semantic token set that flips between light and dark:

```
--foreground  --muted  --primary #0284C7  --primary-hover #0369A1
--success #10B981  --warning #F59E0B  --danger #EF4444
```

**But the console hardcodes 166 hex literals across 37 distinct values in 8 files**, including two entire competing palettes for the same three meanings:

| meaning | token | Material set in use | Tailwind-600 set in use |
|---|---|---|---|
| good | `#10B981` | `#26A69A` (19x) | `#16a34a` (8x) |
| warn | `#F59E0B` | `#FFA726` (7x) | `#ca8a04` (3x) |
| bad | `#EF4444` | `#EF5350` (19x) | `#dc2626` (4x) |

So a green number in one card is a different green in the next card. That inconsistency is a large part of why the product does not read as premium.

Two of these are outright bugs, not taste:

- **`#7C5CFF` (10x)** — dashboard charts render **purple** while the brand primary is sky blue `#0284C7`. This colour exists in no token anywhere.
- **`#6b7280` / `#374151` / `#f3f4f6` hardcoded greys** in the analytics and dashboard SVG chart axes. Hardcoded hex bypasses the light/dark token swap entirely, so **chart axis labels do not change colour in light mode** — grey-500 text sitting on a light background.

### Do

1. Add any genuinely missing semantic tokens to `globals.css` — you will likely need a categorical **chart series palette** (charts need 5-8 distinguishable colours, and stretching three semantic tokens across them is wrong). Define it once, in both light and dark, as tokens.
2. Replace all 166 hardcoded hex literals with `var(--token)` or the Tailwind class bound to it. In SVG, use `var(--muted)` / `currentColor` — SVG `fill` accepts CSS custom properties.
3. Map each of the three competing palettes onto the single semantic set. Same meaning must equal same colour everywhere in the app.
4. Decide `#FF8A00` (the reports download button) deliberately: either promote it to a real `--accent` token or fold it into `--primary`. Do not leave it as a fourth loose accent.

### Verify

Load the app in **both light and dark**, on the dashboard and analytics pages, and confirm every chart axis label, gridline and series colour is legible in each. `resize_window` with `colorScheme` will flip the theme. Screenshot both. Then confirm `grep -rE '#[0-9A-Fa-f]{6}' frontend/src/app/c --include=*.tsx` returns zero results, or only results you can individually justify.

---

## Phase 2 — One page shell (the single biggest premium win)

There are currently **five** different page-shell conventions, which is why every screen feels subtly different from the last:

| Page | shell |
|---|---|
| Depreciation | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8` — centered |
| Reports | `p-6` — full bleed |
| Help | `p-6` + inner `max-w-2xl` — **left-ragged** |
| Settings | mixed `max-w-3xl` / `max-w-xl` / `max-w-2xl` — left |
| Everything else | 9 distinct root class strings across 38 pages |

A `PageHeader.tsx` component already exists and is imported by **1 of 95 pages**.

Measured live on `/d/help`, the direct children of one scroll container came out as: `722 / 672 / 672 / 722 / 722` px. On a 1920px screen the banner and accordions run to ~1560px while the search box stays pinned at 672px. That ragged left edge is the "does not look premium" the founder is pointing at, and it is [help/page.tsx:67](frontend/src/app/c/[company_id]/d/help/page.tsx#L67) — the input is correctly `w-full`, but its wrapper is capped at `max-w-2xl`.

### Do

1. Create a single `PageShell` component: one max content width, one horizontal padding scale, one vertical rhythm, centered via `mx-auto`. Pick the width deliberately — dense ERP tables want a wide or full-bleed measure; forms and prose want a narrower one. Support both as an explicit prop (e.g. `width="wide" | "form"`), never as an ad-hoc `max-w-*` sprinkled at the call site.
2. Adopt `PageShell` + the existing `PageHeader` across **all** console pages under `frontend/src/app/c/`.
3. Delete every ad-hoc `max-w-*` that was standing in for a page shell. Keep `max-w-*` only where it is genuinely local (modal widths, drawer widths, a deliberately narrow prose column).
4. Fix the help page specifically: search and the module directory must match the width of the banner and accordions around them.

### Verify

For at least 10 pages spanning both scopes, measure the direct children of the scroll container with `getBoundingClientRect()` and confirm they share one width. Screenshot at 1920, 1280 and 375 wide.

---

## Phase 3 — Responsive grids

```
Fixed  grid-cols-N with no breakpoint prefix:  165 occurrences
Responsive md:/lg:grid-cols-N:                  60 occurrences
```

`settings/page.tsx:1126` is `grid grid-cols-2 gap-6` — no breakpoints at all, so it is two columns from 320px to 4K. Inside a `max-w-3xl` panel on a 1920px screen that is two ~350px fields marooned in a 1560px column; on a phone it is two ~150px fields. Measured live: that grid is 417px wide in a narrow viewport, giving ~195px per field.

The same file contradicts itself — line 1219 is correctly `grid gap-4 md:grid-cols-2 lg:grid-cols-3`.

### Do

Convert all 165 fixed grids to a responsive ladder (single column on mobile, widening at `md:` and `lg:`). Use the same ladder everywhere so field widths are consistent between panels. Do not convert grids that are deliberately fixed — a `grid-cols-[2fr_3fr_1fr_auto]` table header row is intentional; leave those and their matching body rows aligned.

### Verify

Walk the settings tabs, procurement, HR, CRM and billing at 375 / 768 / 1280 / 1920. No field narrower than roughly 200px at any breakpoint, no horizontal body scroll at 375px.

---

## Phase 4 — Collapsible sidebar

`frontend/src/context/SidebarContext.tsx` exposes **only** `mobileOpen`. There is no desktop collapse state. `Sidebar.tsx` is hardcoded `w-64` with `lg:static lg:translate-x-0`.

### Do

1. Add `desktopCollapsed` to `SidebarContext`, persisted to `localStorage` so it survives reload.
2. Collapsed state: icon rail (~64px), labels hidden, each item showing a tooltip on hover. Expanded: current 64 (16rem) width. Animate the width transition.
3. Add an explicit toggle control, and a keyboard shortcut.
4. The main content area must reflow — it must not sit under a fixed rail or leave a dead gutter.
5. Do not break the existing mobile drawer. `mobileOpen` and `desktopCollapsed` are independent concerns; keep them independent.
6. Wrap the localStorage read/write in try/catch — it throws in some privacy modes, and an exception there must not take the whole shell down.

### Verify

Toggle collapsed and expanded on 5+ pages. Confirm persistence across a hard reload. Confirm the mobile drawer still opens, closes on navigation, and closes on backdrop click. Confirm no content is obscured in either state. Screenshot both states.

---

## Phase 5 — Fix the navigation architecture ("More Modules")

This is the most important IA finding and it needs real thought, not a mechanical edit.

**"More Modules" is not competitor parity.** Nothing in `docs/COMPETITOR_PARITY_ONSITE.md` mentions it. The code comment in `Sidebar.tsx` describes it as "modules with no other primary-nav entry" — it is a junk drawer. And it does not even contain the actual overflow:

| Location | Count |
|---|---|
| Sidebar primary | 14 — Dashboard, Project Hub, Report, Project, Team Schedule, Finance, Payroll, CRM, Library, Services, Setting, Help, Delete Logs, Enterprise |
| Sidebar "More Modules" | 8 — Analytics, Budget, Custom Fields, Depreciation, Drawings, Statutory, Towers, Wastage |
| **Help page module directory** | **22** — those 8, **plus 14 more** |
| Company-level screens that actually exist | ~45 (36 under `/d/` + 9 top-level) |

**Procurement, Three Way Match, Billing, Subcon, HR, Attendance, Face Recognition, Labour, DPR, Quality, Safety, Equipment, Production and Cost Codes** are all built and working at `/c/{id}/d/*` and are reachable **only from the Help page**. DPR and Procurement are flagship construction-ERP modules that are not in the navigation.

So there are two competing overflow mechanisms — the sidebar's "More Modules" and the Help page's `HELP_MODULE_LINKS` — and neither is complete.

By contrast the **project** scope (`/c/x/p/y/`, `p/[project_id]/layout.tsx`) has a proper 41-item navigation. Company scope is the broken one. Read the project-scope nav first and understand why it works.

### Do

1. Inventory every company-scope destination. Reconcile the sidebar, `HELP_MODULE_LINKS`, and the actual routes on disk. Every real screen must appear in the primary navigation exactly once.
2. Replace the flat-14-plus-junk-drawer with **domain-grouped collapsible sections**. A defensible grouping for a construction ERP — adjust if the codebase argues otherwise, but justify any change:
   - **Overview** — Dashboard, Project Hub, Analytics, Reports
   - **Projects** — Projects, Planning, Drawings, Towers, Team Schedule
   - **Site Operations** — DPR, Quality, Safety, Labour, Attendance, Face Recognition, Equipment, Production, Wastage
   - **Procurement & Materials** — Procurement, Three-Way Match, Materials, Subcon, Cost Codes
   - **Finance** — Finance, Billing, Payroll, Budget, Depreciation, Statutory
   - **Sales** — CRM
   - **Setup** — Library, Custom Fields, Services, Settings, Enterprise, Delete Logs, Help
3. Retire "More Modules". Nothing should live in an unnamed drawer.
4. Keep group open/closed state in `localStorage`, and auto-open the group containing the active route.
5. Repurpose the Help page's module directory into what it should be — a searchable index — rather than the only path to 14 modules. It must not remain load-bearing navigation.
6. **Preserve the permission filtering.** The sidebar currently filters on `can(it.permission)` and `it.anyOf`. Every item you move must keep its permission gate. A module appearing for a role that previously could not see it is a security regression, not a nav improvement.
7. Groups must work in the Phase 4 collapsed rail — decide and implement that interaction (flyout on hover is the usual answer).

### Verify

Log in as each distinct role and confirm the visible module set is **identical** to what that role saw before your change — no additions, no removals. Confirm every route on disk is reachable from the sidebar. Confirm no module appears twice. Screenshot the nav expanded and collapsed.

---

## Phase 6 — Loading states

**7 of 95 pages have a skeleton loader.** 6 more use a bare `Loading...` string. The remaining ~82 pop content in with no treatment at all, which is the single loudest "this is not a finished product" signal in the app.

### Do

Build one skeleton component family — table skeleton, card skeleton, form skeleton — matching the real content's shape and dimensions so nothing shifts when data lands. Apply across all data-fetching console pages. Replace every bare `Loading...` string.

### Verify

Throttle the network in the browser and load 10+ pages. Confirm a skeleton appears, and confirm **CLS is 0** when real data replaces it. Layout shift on data arrival is a worse outcome than the pop-in you started with.

---

## Phase 7 — Empty states

There are **31** bare `No <x> found` grey text rows. The founder's Depreciation screenshot is exactly this: "No schedules found" as plain muted text inside an otherwise empty bordered table.

### Do

Build one `EmptyState` component: an icon, a short title, one line of explanatory text, and where an action is possible, a primary CTA button. On the Depreciation example the CTA is obviously "New Schedule" — the button already exists in the header, so the empty state should offer it inline where the user is actually looking. Apply to all 31.

### Verify

Visit each of the 31 surfaces with an empty tenant and screenshot. Confirm every one that has a creation path offers it.

---

## Phase 8 — Sweep the class rot

Copy-paste has left classes that silently kill each other (last one wins, earlier one is dead):

- `settings/page.tsx:1124` — `bg-card ... bg-background` and `rounded-lg ... rounded-md`
- `settings/page.tsx:1196` — same pattern
- `billing/page.tsx:919` — `border border-border-custom` duplicated

### Do

Find all conflicting/duplicated utility classes in `frontend/src/app/c` and `frontend/src/components`, and resolve each to the one that was intended. **Check the rendered result** — in several of these the *dead* class is the correct one, so blindly deleting the earlier class will change the visual.

### Verify

Screenshot each touched surface before and after. The intended appearance must be the one that survives.

---

## Cross-cutting rules

- **Behaviour is frozen.** No API, data-shape, auth or business-logic changes. If a visual fix seems to need one, record it in `docs/BACKLOG.md` and skip it.
- **Permissions are frozen.** Phase 5 moves items between nav groups; it must not change who can see what.
- **Accessibility is part of premium.** Every interactive element needs a visible focus ring. Body text must clear WCAG AA against its background in **both** themes — check the light theme especially, since the hardcoded hex bug above means light mode has been getting less real scrutiny than dark.
- Run the full suite with `pytest -n 4` and `npm run build` at the end of each phase, not just at the very end. **Do not delete or skip tests to go faster.**

## Definition of Done — all must hold

- [ ] Zero unjustified hardcoded hex in `frontend/src/app/c`; all semantic colour flows from tokens.
- [ ] Charts legible and correctly coloured in **both** light and dark. Screenshots of both.
- [ ] One `PageShell`, adopted by every console page. Measured proof that sibling blocks share a width.
- [ ] All 165 fixed grids responsive; no horizontal body scroll at 375px anywhere.
- [ ] Sidebar collapses on desktop, persists, animates, reflows content, mobile drawer intact.
- [ ] Every company-scope route appears once in a domain-grouped sidebar. "More Modules" is gone. Per-role visible module sets are byte-identical to before.
- [ ] Skeletons on all data-fetching pages, CLS 0 on data arrival.
- [ ] All 31 empty states use the shared component with a CTA where one exists.
- [ ] Class conflicts resolved with before/after screenshots.
- [ ] `pytest -n 4` green; `npm run build` clean, no new type errors.
- [ ] Committed and **pushed to `origin/main`**. Verify with `git merge-base --is-ancestor HEAD origin/main` — mind the argument order; the reverse gives a false positive and has already left 48 commits unpushed on this project once.

## Final report

Per phase: what you changed, the measurement or screenshot that proves it, and anything you skipped with the reason. For Phase 5, include the per-role before/after module lists. State the test and build results with the commands that produced them.

Do not claim a number you did not measure.
