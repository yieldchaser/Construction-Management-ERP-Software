# AGENT PROMPT: purge the remaining AI-slop design from the console

Read this whole file before touching anything. Execute all six parts in one run. Do not stop between parts to ask questions. Every decision here is already made; you are implementing, not designing.

## Why this run exists

The founder pointed at the Safety Incident Board and said the AI-slop design we removed is still there. He is right, and the reason is specific: the previous run purged the **bevel** (`inset 0 1px 0` highlight) completely, which greps to 0 today, but it skipped the other half of the same decision and never touched three related families. The bevel was a symptom. These are the rest.

Everything below is measured against commit `4ce3517`, not estimated. The numbers are your targets.

| Family | Count in console | Rule it breaks |
|---|---|---|
| Shadows on inline elements | **92** | "Cards, panels, table containers: drop the shadow. Only modals, drawers, popovers and the flyout keep one." |
| Unicode glyphs used as controls or status | **129** | "No unicode arrows as controls." |
| Raw Tailwind palette classes | **101** | "No new hardcoded hex, rgba(), or raw Tailwind palette classes." |
| Decorative gradients | **17** | Same rule, plus gradients were never part of the design system |
| Hand-rolled status pills, no shared component | **101 sites, 44 files, 3 competing styles** | Nothing enforced it, which is why it drifted |

"Console" means `frontend/src/app/c/**` and `frontend/src/components/**`. **The marketing site is a different design system (Alexandria, the `alx-` tokens) and is out of scope.** Do not touch `components/marketing/**`, `components/blog/**`, `app/about`, `app/blog`, or anything using `alx-` classes.

---

# PART 1: remove the 92 inline shadows

The decided rule, unchanged from the bevel run: **an element that sits in the page flow gets no shadow. Only an element that genuinely floats above the page keeps exactly one.**

Floating means a modal panel, a drawer, a popover, a dropdown menu, the collapsed-rail flyout, or a toast. In practice these sit inside a `fixed inset-0` overlay or carry a `z-` index. There are **101 such shadows and they all stay.**

Everything else loses its shadow class outright: cards, stat tiles, table containers, list rows, inline buttons, chat bubbles, panel headers. Delete the `shadow-*` class. Do not replace it with a border, a ring, or a background change. These elements already have `border border-border-custom`, and that hairline is what defines them.

The worst offenders by file:

```
7  app/c/[company_id]/d/safety/page.tsx
7  app/c/[company_id]/reports/[slug]/page.tsx
6  app/c/[company_id]/d/home/page.tsx
5  app/c/[company_id]/d/library/page.tsx
5  app/c/[company_id]/settings/page.tsx
4  app/c/[company_id]/d/chat/page.tsx
4  app/c/[company_id]/dashboard/page.tsx
```

Work through every console file, not only these seven.

**Verify:** report the console `shadow-*` count before and after, split floating versus inline, and confirm the inline count is 0 while the floating count is still 101. For any shadow you keep, name the element and why it floats.

---

# PART 2: replace the 101 raw palette classes with tokens

These bypass the design system entirely, so they do not respond to the light/dark theme and they were invisible to the earlier sweep that counted only what it knew to look for.

Use this mapping. It is decided; do not substitute your own.

| Raw palette | Token |
|---|---|
| `sky-*` | `primary` |
| `blue-*`, `cyan-*` | `info` |
| `green-*`, `emerald-*`, `teal-*` | `success` |
| `amber-*`, `yellow-*`, `orange-*` | `warning` |
| `red-*`, `rose-*` | `danger` |
| `gray-*`, `slate-*`, `zinc-*`, `neutral-*`, `stone-*` | `muted` for text, `border-custom` for borders, `elevated` for backgrounds |

Opacity suffixes carry over unchanged: `bg-sky-500/10` becomes `bg-primary/10`, `border-sky-500/20` becomes `border-primary/20`, `text-sky-400` becomes `text-primary`.

**One exception, and it is important.** Where a palette colour is being used as a **categorical scale** rather than a status, map it to the `chart-1` through `chart-8` tokens instead, keeping the categories visually distinct from each other. The clear case is the BOQ category map at `app/c/[company_id]/d/budgeting/boq/page.tsx:50-56`, where each work section gets its own colour. Collapsing those to `primary` and `info` would make two sections look identical. Assign each category a distinct `chart-N` and keep the count of distinct colours the same as it is now.

Known sites include `reports/[slug]/page.tsx` (12), `components/rbac/RolePermissionsModal.tsx` (6), `components/pwa/PwaControls.tsx` (3), `components/ZatcaInvoicePanel.tsx` (3), `d/quality/page.tsx` and `p/[project_id]/quality/page.tsx` (3 each), `d/dpr/page.tsx` (3). Sweep for the rest yourself.

---

# PART 3: flatten the 17 gradients

A gradient fill is decoration carrying no information, and every one of these is also built from raw palette colours, so Part 2 cannot be finished without resolving them.

Replace each with a **flat token fill**:

- Progress and meter bars, for example `bg-gradient-to-r from-green-500 to-emerald-400` at `d/quality/page.tsx:825`: use a single solid token that matches the meaning already in the code. A completion or pass bar is `bg-success`. A generic progress bar is `bg-primary`. A depletion or overage bar is `bg-warning` or `bg-danger` where the surrounding code already branches on that.
- Banners and headers, for example `bg-gradient-to-r from-amber-500 to-orange-600` at `d/finance/page.tsx:2224`: use the flat token for the state it signals, here `bg-warning`.
- Decorative tile washes, for example the `from-emerald-500/20 to-emerald-500/5` entries in the `d/dpr/page.tsx` quick-action list: use the flat tint at the stronger stop, `bg-success/15`.

After this part, `grep -rn "bg-gradient-to-" frontend/src/app/c frontend/src/components` returns 0 outside the excluded marketing and blog directories.

---

# PART 4: replace the 129 unicode glyphs with real icons

The console has an `Icon` component backed by Material Symbols, and it is already used correctly in most places. Then 43 files draw controls and status markers with bare unicode characters instead. A `✕` typed into a button is the single clearest tell of generated UI, and there are 83 glyphs sitting inside a `<button>` or an `onClick` handler.

Convert:

| Glyph | Replace with |
|---|---|
| `✕` `✖` `×` as a close or remove control | `<Icon name="close" />` |
| `✓` `✔` as a confirm control or a done marker | `<Icon name="check" />` |
| `↑` as an upload control, for example `↑ Import Excel` and `↑ Upload New Revision` | `<Icon name="arrow_up" />` |
| `→` as a "go" affordance inside a button, for example `Log Daily Crew Size →` | `<Icon name="arrow_forward" />` |
| `●` as a live or status dot, for example `● Real-time Logs` | a `<span>` with `h-1.5 w-1.5 rounded-full bg-success` |
| `⚠` as a warning marker | `<Icon name="warning" />` |

Match the surrounding icon sizing, usually `className="w-3.5 h-3.5"` or `w-4 h-4`, and keep the existing text label exactly as it reads today.

**Use only icon names that already exist.** `Icon` lives at `components/marketing/Icon.tsx` despite the path, and the console imports it from there; that import is correct and stays. `IconName` is a **closed union of 120 names**, each backed by an inline SVG path in `ICON_PATHS`. A name outside the union fails `tsc`, and a name in the union without a path renders an empty `<svg>` and logs a console warning. All five names above are already present and verified. There is **no `upload` icon**, which is why upload controls use `arrow_up`. Do not add a new icon name; if you believe one is genuinely missing, leave that glyph alone and list it in your report.

## Do not convert these. They are correct typography, not slop.

I checked each of these against its surrounding code. Converting them would be a regression.

1. **`×` as a multiplication sign** in `components/resources/CalculatorTools.tsx` (38 instances, for example `suffix="× 21 sqft"`). That is arithmetic notation, and an icon there would be nonsense.
2. **`→` as a range separator between two values**, for example `{ts.weekStart} → {ts.weekEnd}` at `d/hr/page.tsx:1114` and the equipment run times at `d/equipment/page.tsx:575`. It joins two dates; it is not a control.
3. **`→ Zoho`** at `d/finance/page.tsx:1292`, which reads as a direction of data flow in a push action label. Leave the label wording alone.
4. **Box-drawing characters in comment banners** (`// ─── Tab 1 ───`). Comments, not UI.

If you find a glyph that is genuinely ambiguous, leave it and list it in your report rather than guessing.

---

# PART 5: build the Badge component and adopt it

This is the part that stops the drift from coming back, and it is the direct cause of what the founder photographed. On one incident card, two badges sit side by side in two completely different visual languages: "Fatality" is a solid fill with white text, "Critical" is a tinted fill with a coloured border. Nothing is wrong with either in isolation. Together they look like two people built the page.

There are **101 pill sites across 44 files** in three competing styles: 51 tinted-with-border, 49 uncategorised variants, 1 solid-fill-with-white-text.

## Create `frontend/src/components/ui/Badge.tsx`

One visual language, six tones, no solid-fill variant:

```tsx
type BadgeTone = "neutral" | "primary" | "info" | "success" | "warning" | "danger";

const TONE: Record<BadgeTone, string> = {
  neutral: "bg-muted/10 text-muted border-border-custom",
  primary: "bg-primary/10 text-primary border-primary/20",
  info:    "bg-info/10 text-info border-info/20",
  success: "bg-success/10 text-success border-success/20",
  warning: "bg-warning/10 text-warning border-warning/20",
  danger:  "bg-danger/10 text-danger border-danger/20",
};
```

Base classes: `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold`. Accept an optional `icon` prop rendering an `Icon` at `w-3 h-3` before the label. Write the tone classes as a full literal record exactly as above, because Tailwind cannot see dynamically built class strings.

Convert all 101 pill sites to it. Where a site currently uses a solid fill with white text, it becomes the tinted tone for the same colour; the solid style does not survive anywhere.

**Never collapse two states that must stay distinguishable.** The point of this part is one visual language, not fewer meanings. If a status map has more states than tones, keep every state visually distinct by extending `BadgeTone` with the `chart-1` through `chart-8` tokens for the overflow, following the same `bg-x/10 text-x border-x/20` shape. The known case is `statusColors` in `d/quality/page.tsx` and `p/[project_id]/quality/page.tsx`, which carries **7 states across 6 tones**. Every other map in the console fits inside the six. Before converting any map, count its states and its distinct tones, and if the tone count drops, say so and fix it rather than shipping two states that render identically.

---

# PART 6: fix the Safety incident card specifically

This is the card in the screenshot, and it has a real bug underneath the styling.

## 6.1 A fatality renders in benign blue

`TYPE_COLOR` at `d/safety/page.tsx:79-84` is keyed `'Near Miss'`, `'First Aid'`, `LTI`, `Fatal`. The backend pattern at `backend/app/routers/safety.py:29` is `^(Near Miss|First Aid|LTI|Fatal)$`, so those keys match new rows. But older rows predate that pattern, which the backend itself acknowledges at `safety.py:176-183` where `_LOST_TIME_TYPE_ALIASES` exists precisely to absorb legacy spellings for the LTIF statistics.

`TYPE_COLOR` has no such tolerance. A legacy row typed `Fatality` misses every key, falls through to `|| "var(--primary)"`, and **the worst incident category on a construction site renders in the same calm blue as a near miss.** That is what the founder is looking at right now.

Fix it the way the backend already does. Normalise the lookup: trim, casefold, and match against an alias map so `Fatal`, `Fatality` and `fatal` all resolve to `danger`, and the LTI aliases the backend already recognises resolve to `warning`. Reuse the same alias spellings `safety.py` uses so the two cannot drift apart. When a type still does not resolve, fall back to the `neutral` tone, never to `primary`. An unrecognised category must look unrecognised, not safe.

Apply the same treatment to the severity lookup.

## 6.2 The redundant severity stripe

The card carries a 4px coloured left border (`borderLeftColor` / `borderLeftWidth` at `d/safety/page.tsx:313-316`) encoding severity, and then a severity badge two lines below saying the same thing in words. Once Part 5 gives the badge a consistent tone, the stripe is decoration duplicating a label.

**Remove the stripe.** The severity badge carries the meaning. This is the one accent bar left in the console and it is the last of a treatment the founder has already rejected twice.

## 6.3 The Close Incident button

`"✓ Close Incident"` at `d/safety/page.tsx:387` is covered by Part 4; use `<Icon name="check" />`.

---

# Rules for this run

- **Do not write a generator script that emits whole files.** Every fabrication in this project's history came from exactly that. Checking scripts are welcome and encouraged; authoring scripts are banned. Make these edits in place.
- **Do not redesign anything.** Every choice above was made deliberately. If you think one is wrong, implement it anyway and say so in your report.
- **Do not touch `text-white`.** There are 316 uses and they are correct: the console has no `--on-primary` token, and `--primary` is `#0284C7` in light and `#0369A1` in dark, both dark enough that white text on them passes contrast in either theme. Changing these would be 316 edits of pure churn and a real regression risk. Leave them.
- **Do not touch the marketing site or the blog.** Different design system, deliberately.
- **Do not touch backend behaviour.** Part 6.1 reads an alias list from `safety.py`; it does not change it.
- No em dashes in any user-facing string you write.

# Definition of done

Report each number, measured with the command that produced it, not asserted:

- [ ] Console inline shadows: **92 to 0**. Floating shadows still **101**, each one named with the reason it floats.
- [ ] Console raw palette classes: **101 to 0**. BOQ categories still render in as many distinct colours as before.
- [ ] Console gradients: **17 to 0**.
- [ ] Console control and status glyphs: **129 to 0**, with the four excluded groups above untouched and their counts unchanged (`CalculatorTools.tsx` still has its 38 multiplication signs).
- [ ] `components/ui/Badge.tsx` exists and all **101 pill sites across 44 files** use it. No solid-fill-with-white-text badge remains.
- [ ] `TYPE_COLOR` and the severity lookup resolve legacy spellings, and an unknown type falls back to `neutral`, not `primary`. State what a row typed `Fatality` now renders as.
- [ ] The severity stripe is gone from the incident card.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` still reports **1114 passed, 4 skipped**.
- [ ] `cd frontend && npx tsc --noEmit` reports 0 errors.
- [ ] `cd frontend && npm run build` completes.
- [ ] `python scripts/verification/verify_help_claims.py` still prints `[PASS]` and its coverage line still reads **37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels**. Several of these files are cited by the help content, so a moved line number breaks it. If a count changes, fix the citation, do not edit the validator.

Commit and push to `origin/main` when all boxes are checked.
