# AGENT PROMPT: stuck skeletons, a date that is a day behind, an unreadable dropdown

Four items, all found by driving the app on a company that has **zero projects**.
That is the state every new customer is in on day one, and it is not the state
most of the earlier sweeps tested.

Item 3 is the serious one. It is wrong for the first five and a half hours of
every day, on 29 call sites, and nothing on screen says so.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: three pages show a loading skeleton forever

`d/labour`, `d/production` and `d/reports` render their skeleton permanently on a
company with no projects. Confirmed live on `ZZ R8 Throwaway`: Labour Management
shows a five row skeleton above the empty state on all three of its tabs, at the
same time, so the page claims to be both loading and empty.

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
`if (projectId) { ... }` and no else.

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

Apply that shape to the three. Then sweep the console for any other page where a
loading flag initialised `true` can only be cleared inside a guarded call, and
report how many you found and fixed. My sweep found these three; treat that as a
floor, not a total, because my pattern matching was crude and I would rather you
found more than fewer.

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
- [ ] The five browser checks above, each with what you saw.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, 544 routes, exemptions still 30.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts. It is 1165 passed, 4 skipped today.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
