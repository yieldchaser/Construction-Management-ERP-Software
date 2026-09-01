# AGENT PROMPT: stuck skeletons, a date that is a day behind, an unreadable dropdown

Seven items, found by driving **all 53 company-scoped routes** on a company with
**zero projects**, and then **all 40 project-scoped routes** on `AK Construction`,
which has real data. Both sweeps signed in against production. That is the state
every new customer is in on day one, and it is not the state most of the earlier
sweeps tested.

The good news first: fifty of the fifty three empty-tenant routes render a
correct empty state, and **no project-scoped route is stuck at all**. The console
is in better shape than this list makes it sound.

Item 3 is the serious one. It is wrong for the first five and a half hours of
every day, on 29 call sites, and nothing on screen says so.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: three pages show a loading skeleton forever

`d/labour`, `d/production` and `d/reports` never finish loading on a company
with no projects. I drove **all 53 company-scoped console routes** signed in
against production on `ZZ R8 Throwaway`, and these three are the only ones. The
other fifty render a correct empty state.

Each shows it differently, which is why one probe will not catch all three.
Verify each by its own symptom:

```
d/labour       27 pulsing skeleton bars, on all three tabs, sitting above the
               empty state, so the page claims to be loading and empty at once
d/production   four stat tiles reading "…" forever: PLANNED OUTPUT,
               ACTUAL OUTPUT, and two more. No skeleton element at all
d/reports      4 pulsing bars in the REPORT LOGS side panel. The main pane
               correctly shows "No Report Selected", so only the panel is stuck
```

I want to be straight about `d/production`, because it nearly got dropped from
this prompt. My browser probe counted `.animate-pulse` elements and returned 0
for it, which looked like a pass. It renders `loading ? "…"` instead of a
skeleton, so the probe was blind to it. The static read had been right. **Do not
verify these with a single selector.** Check for a stuck skeleton, a stuck
placeholder string, and a stat that never resolves.

The cause is the same in all three. The loading flag starts `true`, and the only
thing that clears it sits inside a fetch that a guard prevents from running:

```js
const [loading, setLoading] = useState(true);

const fetchData = async () => {
  setLoading(true);
  ...
  setLoading(false);      // the only place it is cleared
};

useEffect(() => { if (projectId) fetchData(); }, [projectId]);
```

No project means no `projectId`, so `fetchData` never runs, so `loading` is never
false. `d/production` and `d/reports` have the identical shape with a braced
`if (projectId) { ... }` and no else. In `d/production` the flag is consumed at
`:363, 369, 375, 381`; in `d/reports` at `:172`.

**The fix already exists in this codebase.** `d/towers` and `d/subcon/scorecards`
do it correctly:

```js
useEffect(() => {
  if (projectId) {
    fetchData();
  } else {
    setLoading(false);
  }
}, [projectId]);
```

Apply that shape to the three.

You do not need to re-sweep the company-scoped console for more of these. I
drove all 53 routes and there are no others. I have since driven all 40 project-scoped routes on a company with data and
**none of them is stuck**. `p/finance`, `p/transaction` and `p/equipment` sit on
a skeleton for several seconds and then resolve; they are slow, not hung, and
that is out of scope here.

Note `d/subcon/scorecards` has a second copy of the same trap: `fetchData` opens
with `if (!projectId) return;` **before** `setLoading(true)`. It happens to be
safe because the effect has the else branch. Leave it working, but if you can
make the intent obvious without churn, do.

# PART 2: the wastage type dropdown is unreadable

Live on `d/wastage`, opening **Record Material Wastage** and clicking **Type**
renders the option list nearly white on white. Only the hovered row is legible.

`d/wastage/page.tsx:209`:

```jsx
<select className="w-full bg-white/5 border border-border-custom rounded-md px-4 py-2 text-foreground">
```

`bg-white/5` is `rgba(255,255,255,0.05)`, essentially transparent. The browser
paints the native option list from the select's own computed background, so it
comes out near white, while the option text stays `text-foreground`, which is
near white in dark mode.

Twenty two selects in the console use `bg-input` and render correctly. **Four use
`bg-white/5` and are broken**, all of them missed by the earlier dropdown pass:

```
d/wastage/page.tsx:209
d/three-way/page.tsx:265, 275, 285
```

Change those four to match the working twenty two. Then confirm no `<select>`
anywhere in `app/c` carries a translucent background, and report the count.

# PART 3: every defaulted date is a day behind until 05:30

This is the one that matters.

Seen live: the **Create Work Order** modal at 00:37 on 2 September showed a date
of **01-09-2026**. Not a display bug. The default is computed as:

```js
date: new Date().toISOString().split("T")[0],
```

`toISOString()` converts to **UTC**. India Standard Time is UTC plus five and a
half hours, so from midnight until 05:30 local, that expression returns
**yesterday's date**.

There are **29 of these** across the console.

Think about who uses this product. Site work starts before dawn. A muster roll
taken at 05:00, a DPR opened at 05:15, a work order raised on the way to site at
04:30, all silently default to the previous day. The user sees a plausible date
in the field, so nothing prompts them to check it. It lands in attendance
records, progress reports and contract documents.

## The fix

Add one helper beside the date formatters already in `lib/siteflow.ts` that
returns today's date in the **local** timezone as `YYYY-MM-DD`, suitable for an
`<input type="date">` value. Build it from `getFullYear`, `getMonth` and
`getDate`, which are local, rather than by converting through UTC.

Replace all 29 sites. Report the count before and after; it must reach 0.

**Be careful what you do not change.** `new Date(value).toISOString()` when
*submitting* a value to the backend is correct and must stay: the API expects an
instant in UTC. The defect is only in deriving a **calendar day for display or
as a form default**. The two look similar and sit next to each other, for example
at `d/subcon/page.tsx:508`, which correctly sends `wo_date` as an ISO instant
while `:440` wrongly derives the default day. Read each site before touching it,
and say how many you found that were the submit kind and correctly left alone.

# PART 4: the eleven library tabs disagree about what empty looks like

The Central Library has eleven tabs. They handle "nothing here yet" three
different ways:

```
2 tabs   Material, Rate        <EmptyState> card: icon, message, an action button
5 tabs   Party, Workforce,     a bare table row: "No workforces registered in library."
         and three others      no icon, no button, no way forward
4 tabs   something else
```

Live, Material Library shows a card with an icon and a **+ Add Material** button.
Workforce Library, one tab away, shows a line of grey text in a table row. Same
product, same screen, one click apart.

`EmptyState` is already imported in that file at line 14 and used twice. Bring
the other nine tabs onto it, with a message written for that tab and an action
that starts the thing the tab is for.

To be explicit, since you asked the right question about this last time: **this
is not intended design.** It is the residue of the tabs being built at different
times. Make them consistent.

# PART 5: two smaller things the same sweep turned up

**A table with headers and nothing else.** `d/hr` on an empty company renders
its header row, `DEPARTMENT / BASIC / HRA / ALLOWANCES / GROSS/MO / PF% / ESI /
TDS/MO / STATUS`, and then stops. No row, no message, no button. It reads as
though the page failed rather than that there is nothing yet. Give it an empty
state like its neighbours have.

**A budget summary for a project that does not exist.** `d/budgeting/boq` on a
company with no projects renders:

```
PROJECT TOTAL   ₹0   ₹0   +₹0(0.0%)   ON TRACK
```

A green "ON TRACK" verdict on a portfolio with nothing in it. It is not wrong
arithmetic, it is a judgement about nothing. Suppress the summary row when there
is no project, or show the same "No active projects" state the other pages use.

---

# PART 6: the same plus sign twice on seven buttons

`d/towers/page.tsx:170`:

```jsx
action={{
  label: "+ New Project",
  href: `/c/${companyId}/projects`,
  icon: "add",
}}
```

`EmptyState` renders the `add` icon **and** the label, and the label already
begins with a literal `+`. Confirmed in the DOM: the button holds one plus SVG
and the text "+ New Project", so it reads as two plus signs side by side.

Seven sites, all identical:

```
d/budget/page.tsx:148                          d/subcon/scorecards/page.tsx:110
d/equipment/page.tsx:408                       d/towers/page.tsx:170
d/procurement/rfq/page.tsx:407                 p/[project_id]/equipment/page.tsx:391
d/procurement/vendor-performance/page.tsx:112
```

Drop the `+` from the label and keep the icon, since the icon is the house style
elsewhere. Then check every other `EmptyState` action and `PageHeader` action for
the same doubling, and report the count.

# PART 7: raw ISO dates on six screens

Group A of an earlier run took bare `toLocaleDateString()` to zero, but it only
looked for that one call. A second idiom slipped through: slicing the ISO string
directly. These render `2026-07-01` where every other screen renders
`01 Jul 2026`.

Seen live on `AK Construction`:

```
p/[project_id]/task            "2026-07-01 → 2026-07-06" and "2026-09-22"
p/[project_id]/quality         "2026-07-27"
p/[project_id]/transaction     "2026-07-01"
d/subcon/scorecards            "2026-08-31 to 2026-09-30"
```

The code sites, by mechanism rather than by count, because my grep undercounts
the ones wrapped in a ternary:

```
d/labour/page.tsx:196                     period_start?.split("T")[0]
d/payroll-attendance/page.tsx:1363,1364,1366,1504,1505,1584   .slice(0, 10)
d/subcon/scorecards/page.tsx:192          period_start?.split("T")[0]
d/subcon/work-orders/amendments/page.tsx:120
p/[project_id]/transaction/page.tsx:426   r.date.slice(0, 10) inside a ternary
p/[project_id]/quality/page.tsx:646,861,895,1088   renders a value that was
                                          sliced to ISO when parsed at :216,244,245,265
p/[project_id]/task/page.tsx:25           its own fmtDate returning YYYY-MM-DD
```

Sweep for **both** idioms, `.split("T")[0]` and `.slice(0, 10)`, anywhere the
result is rendered rather than fed to an `<input type="date">`, and route them
through the shared date formatter. Report the count before and after.

**One useful thing in there.** `p/[project_id]/task/page.tsx:25` already contains
exactly the local-date implementation Part 3 asks you to write:

```js
const fmtDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
```

It is built from the local getters, so it has none of the UTC problem. Lift that
into `lib/siteflow.ts` as the shared local-day helper for Part 3, and separately
fix this page to *display* through the `DD Mon YYYY` formatter.

---

# Rules

- No authoring scripts.
- Semantic tokens only. `bg-input` for selects, never a translucent white.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- No backend change in this run. All four items are frontend.

# Verify this one in a browser, because a grep cannot see any of it

Every item here was found by driving the app, and three of the four are invisible
to static analysis. State what you observed for each:

- [ ] On a company with **no projects**, `d/labour`, `d/production` and
      `d/reports` show their empty state and **no skeleton**.
- [ ] On a company **with** projects, those three still load their data as
      before. Do not fix the empty case by breaking the populated one.
- [ ] The wastage Type dropdown is readable when opened, and so are the three on
      `d/three-way`.
- [ ] A date field defaulted before 05:30 local shows **today**. You can test
      this without waiting for 5am by evaluating the old and new expressions
      against a fixed local time in the early morning and comparing.
- [ ] Two library tabs picked at random look like each other when empty.

# Definition of done

- [ ] The three stuck pages clear their loading state, using the same shape as
      `d/towers`. Report how many other pages your sweep found.
- [ ] Zero `<select>` elements in `app/c` use a translucent background. Report
      before and after.
- [ ] Local-date helper exists; `new Date().toISOString().split("T")[0]` reaches
      **0** as a date default. Report before and after, plus how many submit-path
      `toISOString()` calls you correctly left alone.
- [ ] All eleven library tabs use `EmptyState` when empty.
- [ ] `d/hr` shows an empty state rather than a bare header row.
- [ ] `d/budgeting/boq` does not render an "ON TRACK" summary when there is no
      project.
- [ ] No button renders two plus signs. Report how many you fixed.
- [ ] Raw ISO dates reach 0 on screen. Report before and after, covering both
      `.split("T")[0]` and `.slice(0, 10)`.
- [ ] The five browser checks above, each with what you saw.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, 544 routes, exemptions still 30.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts. It is 1165 passed, 4 skipped today.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
