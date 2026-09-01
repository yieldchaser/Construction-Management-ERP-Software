# AGENT PROMPT: presentation defects, empty-tenant bugs, and forms that discard input

**This file supersedes `AGENT_PROMPT_STUCK_PAGES_AND_UTC_DATES.md` and
`AGENT_PROMPT_FORMS_THAT_DISCARD_INPUT.md`.** Everything in both is here.

**If you have already started the stuck-pages file, keep that work.** Commit it,
pull, then continue from this file and skip whatever you have already done. Say
in your report which parts you had already finished.

Two groups, **Group A then Group B, separate commits.**

Group A is what the screen shows: pages that never finish loading, a date that is
a day behind, an unreadable dropdown, inconsistent empty states, a doubled plus
sign, raw ISO dates. Group B is what the forms do: one that cannot submit at all
and two that quietly throw away what you typed.

Everything here was found by driving the app signed in against production, on
**all 53 company-scoped routes** against a company with zero projects and **all
40 project-scoped routes** against one with real data, plus a static sweep of
every POST body against the fields its endpoint declares required.

Group B Part 1 is the most serious item in the file: a feature that has never
worked.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# GROUP A: what the screen shows
Seven items, found by driving **all 53 company-scoped routes** on a company with
**zero projects**, and then **all 40 project-scoped routes** on `AK Construction`,
which has real data. Both sweeps signed in against production. That is the state
every new customer is in on day one, and it is not the state most of the earlier
sweeps tested.

The good news first: fifty of the fifty three empty-tenant routes render a
correct empty state, and **no project-scoped route is stuck at all**. The console
is in better shape than this list makes it sound.

Part 3 below is the serious one in this group. It is wrong for the first five
and a half hours of every day, on 29 call sites, and nothing on screen says so.

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

# GROUP B: what the forms do

An interaction-level sweep. Not "does the page render" but "does the form on it
actually do what it says". Three findings, and the first means a whole feature
has never worked.

# PART 1: applying for leave returns 422 from both entry points

`backend/app/routers/hr.py:1167` requires an employee id, and the comment above
it explains exactly why it was made mandatory:

```python
# R2-527: employee_id is mandatory. An optional id let one approved leave
# be counted against every employee sharing the name ...
employee_id: uuid.UUID
```

No `Optional`, no default. **Neither of the two screens that apply for leave
sends it.**

`d/hr/page.tsx:1978`:

```js
body: JSON.stringify({
  project_id: projectId || null,
  employee_name: emp.name,
  leave_type: leaveForm.leaveType,
  start_date: new Date(leaveForm.startDate).toISOString(),
  end_date: new Date(leaveForm.endDate).toISOString(),
  days_count: isNaN(diff) ? 1.0 : parseFloat(diff.toString())
})
```

`d/payroll-attendance/page.tsx:1442` sends the same six fields, also without it.

So `POST /hr/leaves/{company_id}` should reject every submission with a 422 for a
missing required field. The user fills the form, presses apply, and gets an
error, or worse a silent failure if the screen does not surface it.

**Note the shape of the bug.** `d/hr` already has the employee id in hand at that
moment: it looks up `emp` to read `emp.name`, and `emp` is the record whose id is
required. It is one property away.

## What to do

Send `employee_id` from both screens. In `d/hr` use the employee already
resolved for `employee_name`. In `d/payroll-attendance` the applicant is the
signed-in user, so resolve their staff record rather than sending only
`userName`; if that cannot be resolved, block the submit with a clear message
instead of posting something the API will reject.

**Confirm the 422 first.** I did not test this live because it would mean
writing to the founder's production data, so this is read from the code and the
schema. Reproduce it yourself against a scratch company before you fix it, and
report the status code you got. If it does not 422, say so and tell me what I
missed rather than fixing something that is not broken.

Then check whether the failure is even visible: does the screen show the error,
or does the modal close as though it worked? Say which.

# PART 2: the reason for leave is collected and discarded

The Apply Leave modal has a Reason field, bound at `d/hr/page.tsx:1955`. The
submit body above does not include it, `LeaveRequestCreate` has no field for it,
and `LeaveRequest` in `models.py:1508` has no column for it.

A person types why they need the leave, and it goes nowhere. On a product where
an approver decides from that screen, the one piece of context that would inform
the decision is the piece being dropped.

Add it end to end: a nullable column, the schema field, and show it to the
approver. It is optional input, so keep it optional.

# PART 3: the workforce library keeps one field out of five

`d/hr/page.tsx` opens an Add Workforce modal collecting five things: worker type,
rate type, salary per shift, shift hours and cost code. All five are bound to
inputs at `:2067` through `:2117`.

The submit at `:599` sends two:

```js
body: JSON.stringify({ company_id: companyId, name: workforceForm.workerType }),
```

`WorkforceCreate` at `library.py:87` accepts exactly `company_id` and `name`, and
`LibraryWorkforce` at `models.py:2120` has columns for `id`, `company_id`, `name`
and `created_at`. There is nowhere for the other four to go.

**And the library table renders them anyway.** `d/library/page.tsx:930`:

```jsx
<td>{formatLibraryCell(item.salary_per_shift ?? item.salaryPerShift)}</td>
```

reading a field the API cannot return. The Workforce Library tab shows columns
for Cost Code, Salary Per Shift and Shift Hours that are structurally guaranteed
to be blank on every row, forever.

So the loop is: ask for five values, keep one, then display four empty columns
for the four that were dropped.

## What to do

Decide and say which you chose. Either:

- **Complete it.** Add the four columns, extend the create and update schemas,
  send all five from the form, and the table starts working. This is the option
  I would pick, because rate and shift hours on a workforce type are the inputs
  that make labour costing work, and the table already promises them.
- **Cut it back.** Remove the four inputs from the modal and the four columns
  from the table, so the screen stops asking for things it discards.

Do not leave it as it is. A form that quietly drops four of five fields is worse
than either option.

---

---

# What both sweeps found nothing of

So you know where not to spend time, and so you do not re-derive these.

**Stub UI does not exist in this product.** Across every console page:

```
buttons with no handler at all          0
onClick handlers that are empty         0
onClick handlers that only log or alert 0
href="#" placeholder links              0
"coming soon" / "not implemented" copy  0
```

I self-tested the dead-button detector against a file holding one dead button,
one wired button and one disabled button; it reported only the dead one. That
zero is a real result, not a broken tool.

**Required fields reach their endpoints, with one exception.** I compared every
POST body in the frontend against the fields its endpoint's model declares
required: **121 endpoints, 133 frontend POST calls, one real mismatch**, which is
Group B Part 1. Everything else sends what the API demands.

That sweep took four attempts to become trustworthy, and the failures are worth
knowing because they are the same traps you will hit:

- Matching a path as a substring flagged `billing/bills/{id}/deductions/{id}/release`
  against the `billing/bills` model. Match the endpoint as the URL's **tail**.
- Model names repeat across routers. `TimesheetCreate` exists in `hr.py` and
  `team_schedule.py`; `TodoCreate` in `library.py`, `planning.py` and `todos.py`.
  Resolve a model **within its own file** or you will read the wrong schema.
- A class-body regex bled one model's fields into the next. End the body at the
  first dedent.
- Shorthand properties are invisible to a `key:` regex. `{ company_id, qty }`
  sends both.

**No project-scoped route is stuck.** All 40 render. `p/finance`,
`p/transaction` and `p/equipment` sit on a skeleton for several seconds and then
resolve: slow, not hung, and out of scope here.

---

# Rules

- No authoring scripts.
- Semantic tokens only. `bg-input` for selects, never a translucent white.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- Group A is frontend only.
- Group B may add columns and schema fields; use a migration following the
  existing ledger convention.
- Do not create records in the founder's production data to test. Use a scratch
  company.

# Two habits this run depends on

**Check derived dates across the calendar, not just today.** It is September, so
a rule that only misbehaves in January will pass every check you run now. For
anything you derive from the date, report what it produces in January and in
December.

**Verify each stuck page by its own symptom, not one selector.** My probe counted
`.animate-pulse` and returned 0 for `d/production`, which renders `loading ? "…"`
instead. I nearly dropped a real defect because of it.

# Definition of done

## Group A

- [ ] The three stuck pages clear their loading state, using the same shape as
      `d/towers`.
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
- [ ] The browser checks in Group A, each with what you saw.

## Group B

- [ ] The leave 422 reproduced and reported with its status code, then fixed,
      with `employee_id` sent from both screens.
- [ ] Whether the failure was visible to the user before the fix, stated plainly.
- [ ] Leave reason stored and shown to the approver.
- [ ] Workforce library either completed or cut back, with your reasoning.
- [ ] A test that **fails against the current tree** for the leave 422, at the
      assertion. Report that it failed first and what it said.

## Both

- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, exemptions still 30. Report the route total.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts. It is 1165 passed, 4 skipped today.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] Design counts unchanged: gradients, `hover:bg-white/N` and inline shadows,
      with one command covering all three.
- [ ] **Commit and push to `origin/main`**, Group A and Group B separate commits.
