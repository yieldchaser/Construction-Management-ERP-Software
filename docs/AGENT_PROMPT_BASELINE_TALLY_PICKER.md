# AGENT PROMPT: seven defects from a fresh sweep

Seven items against `f257a64`. Three came from re-running the static sweeps. Four came from driving the live app in a browser against production, and none of those four could have been found any other way.

Report as before: for each item, the command, its exit code, and one sentence. No pasted output. "Not run" is an acceptable answer.

---

# PART 1: the Freeze New Baseline button can never succeed

`d/planning/gantt/page.tsx:168` calls:

```
POST /apis/v3/planning/projects/${projectId}/baseline
```

**That route does not exist.** The only baseline endpoint in the entire backend is `POST /planning/tasks/{task_id}/set-baseline` at `planning.py:391`. So the button 404s every time it is pressed.

It is not silent, at least: the handler branches on `res.ok` and surfaces `readErrorDetail`, so a user sees an error rather than nothing. But a visible primary action on the planning screen has never worked.

## The fix, decided

**Add the project-level endpoint. Do not change the button to loop over tasks**, which would fire one request per task and leave a half-applied baseline if any of them failed.

Add `POST /apis/v3/planning/projects/{project_id}/baseline` in `planning.py`, doing for every task in the project exactly what `set_baseline` does for one:

- Copy `start_date` into `baseline_start` and `end_date` into `baseline_end`.
- Same guards as the per-task version: 404 when the project is missing, `get_company_membership`, and `require_permission(..., "planning:edit")`.
- Call `annotate_critical` once at the end over the project's tasks, rather than once per task.
- Return something the UI can use, and make the button report how many tasks were baselined.

**Extract the per-task snapshot into one helper used by both endpoints** so the two cannot drift, the same way `_compute_estimated_work_amount` is shared between work order create and update.

Commit the whole thing atomically: either every task in the project gets its baseline or none does.

## Test

A test that creates a project with several tasks having start and end dates, calls the new endpoint, and asserts every task's `baseline_start` and `baseline_end` now equal its `start_date` and `end_date`. **Run it before the endpoint exists and watch it 404**, then report that it failed first.

---

# PART 2: deleting the Tally connection fails silently

`d/finance/page.tsx:901`, in `deleteTallyConnection`:

```js
const res = await fetch(`.../tally/connections/${tallyConn.id}`, { method: "DELETE", ... });
if (res.ok) {
  setTallyConn(null);
  setTallyMsg({ type: "ok", text: "Tally connection removed." });
}
```

No `else`. The `catch` only fires on a network failure, so a 403 or a 409 resolves normally, nothing happens, and the connection stays on screen with no explanation.

This is the last one of its kind: a sweep of every mutating write finds **239 handled and this one unhandled**, with three further hits that are `GET` refreshes following an already-handled write and are correct as they are.

Add the failure branch using `readErrorDetail` and the `setTallyMsg` mechanism the function already uses for its catch.

---

# PART 3: the project picker says "Loading projects..." when there is nothing to load

`components/Sidebar.tsx:707-712`:

```jsx
{projects.length === 0 && (
  <option value={activeProjectId}>
    {projectContext.name && projectContext.name !== "Project Context"
      ? `${projectContext.name}...`
      : "Loading projects..."}
  </option>
)}
```

`projects.length === 0` is used for three different situations and shows the same words for all of them:

- the fetch is genuinely in flight,
- the fetch finished and the company has **no projects**,
- the fetch **failed**.

A company with no projects, or one whose project fetch errored, sits on "Loading projects..." forever. It reads as a hung app.

## The fix

Track the fetch state properly and show the right thing for each case:

- **In flight:** "Loading projects..." as now.
- **Loaded, none exist:** say there are no projects yet and point at where a project is created. Keep it to the words that fit in a `<select>`; this is a picker, not an empty state panel.
- **Failed:** say loading failed rather than pretending it is still going. If the surrounding code has a retry, offer it; if not, do not invent one.

Do not change how projects are fetched, and do not add a spinner to the sidebar. This is about telling the truth in three states instead of one.

---

# PART 4: internal developer notes are rendered as user copy

Two strings written for a code reviewer are on screen for the customer.

**`d/home/page.tsx:468`**, on the Project Hub, under the project details heading:

> Pulled from the planning projects endpoint so the home page exposes the richer project labels the workbook called out.

**`settings/page.tsx:2243`**, under Custom Fields:

> Define extra fields attached to a document/entity type. Wired to the generic CustomField backend (entity_type-based).

Both name internals a user has no concept of: an endpoint, a workbook, a backend class, a parameter name. Rewrite each as one plain sentence saying what the thing is for, in the voice the rest of the help copy uses. No endpoint names, no class names, no reference to specs or findings.

A sweep for this phrasing across the console finds exactly these two, so do not go looking for more.

---

# PART 5: a cold page load fires a burst of failing requests

Loading a console page from cold, on a company that has no project selected, produces **twelve 422s and two 404s** before the page settles. Confirmed in the browser against production.

The cause is pinned to one line. `ProjectContext.tsx:153` calls `/planning/projects/${nextProjectId}` before that id resolves. Probing production directly:

```
422  /planning/projects/undefined
404  /planning/projects/
```

Those are the twelve and the two. There is no stale value in storage; the id is simply not resolved yet when the call goes out.

It is not user visible, and the app recovers. It matters for two reasons: it makes a genuine error impossible to spot in the console, and every one of those wasted calls hits a backend that may be cold starting, which is the slowest moment in the product.

**Fix it by guarding, not by suppressing.** A project-scoped fetch must not fire until `activeProjectId` is a resolved, valid identifier. `d/dpr/page.tsx` already does this correctly and fires nothing when no project is selected: follow that pattern rather than inventing a new one.

Do not add retries, do not swallow the 422, and do not change any endpoint to accept an empty id.

**Verify by loading a console page cold with no project selected and reporting how many failing `/apis/v3` requests occur. It must be zero.**

---

# PART 6: six pages render nothing at all for a company with no project

This is the most serious item in this file and it is the first thing a new customer sees.

`d/equipment/page.tsx` is the clearest case:

```js
const [loading, setLoading] = useState(true);   // line 85
...
useEffect(() => {
  if (companyId && projectId) {                 // line 174
    fetchData();
  }
}, [companyId, projectId]);
```

`setLoading(false)` only runs inside `fetchData`. When no project is selected the effect never calls it, so **`loading` stays `true` forever** and the page renders its skeleton permanently. A skeleton has no text, which is why the screen looks simply empty.

**Confirmed blank in the browser against production, on a company that has no projects:**

```
d/equipment                        header and tabs, nothing below, after 8 seconds
d/towers                           header only
d/budget                           header only
d/procurement/rfq                  header and "RFQ REGISTER 0 Total", no table, no empty state
d/procurement/vendor-performance   header only
d/subcon/scorecards                renders no main content region at all
```

A seventh, `p/[project_id]/equipment`, has the same shape but could not be loaded because no project exists to put in the URL. Check it and fix it with the others.

**Two pages my static sweep flagged are false positives and must not be touched:** `d/reports` renders "No Report Selected" correctly, and `d/labour` renders a proper empty state. I verified both live.

## The fix

For each affected page, when there is no project selected: **stop loading and render an `EmptyState`** saying a project needs to be selected or created, with a CTA to create one. Do not simply call `setLoading(false)` and leave an empty table, and do not remove the `projectId` guard on the fetch.

The company has no projects at all today, so "select a project" alone would be a dead end. Follow the Project Hub's wording, which already gets this right: `No active projects. Click "+ New Project" to create one.`

**Verify each of the seven in a browser and say what each renders now.** This is the one part of this prompt that cannot be proved by a grep.

---

# PART 7: an empty register claims your filter is at fault

`d/quality` with zero inspections renders:

> No inspections match the filter.

There is no filter applied and nothing to match. The user is sent to adjust filters that are not the problem.

Separate the two states wherever a list is both filterable and empty: when the underlying list is empty say there is nothing yet and offer the create action; only say nothing matches when a filter or search is actually active. Fix it on `d/quality` and check its project-scoped twin `p/[project_id]/quality`, which is a near-duplicate and has drifted before.

Do not sweep the whole console for this in the same run. Fix the two quality pages and note in your report if you noticed others.

---

## Confirmed working. Do not change these.

Checked live in the browser during this sweep, so they need no attention:

- All eleven Library registers render and load: Party, Party Balances, Asset Type, Cost Code, Deduction, Progress, Workforce, Material, Rate, Retention, Material Category and To Do.
- `d/dpr` correctly fires no project-scoped requests when no project is selected.
- The statutory generators are live: GSTR-1 and TDS-26Q both return 200, and PF-ECR correctly returns 409 with `No finalized payroll run exists for 2026-08. Finalize payroll before generating`, which is the right behaviour and a good message.
- The Project Hub empty state is correct: `No active projects. Click "+ New Project" to create one.`

---

# Rules

- **No authoring scripts.**
- Every write branches on `res.ok` and surfaces `readErrorDetail`.
- New endpoints carry the same permission and tenant checks as their sibling.
- `Badge`, `Icon` from the closed 120-name union, semantic tokens only. No raw palette, gradients, hex, `hover:bg-white/N`, control glyphs, emoji, inline shadows.
- Plain language in UI copy. No endpoint paths, table names or permission keys. No em dashes.

---

# Definition of done

Command, exit code, one sentence.

- [ ] `POST /planning/projects/{project_id}/baseline` exists, shares the snapshot helper with the per-task endpoint, and applies to every task atomically.
- [ ] The new test was run before the endpoint existed and failed, then passes. Say what the failure was.
- [ ] The Freeze New Baseline button succeeds and reports how many tasks were baselined.
- [ ] `deleteTallyConnection` surfaces the API error on failure.
- [ ] The project picker distinguishes loading, empty and failed. Note: the test company genuinely has zero projects, so the empty case is reproducible today.
- [ ] Both developer-note strings replaced with plain user copy.
- [ ] A cold console page load with no project selected produces **zero** failing `/apis/v3` requests. Report the count you measured.
- [ ] All seven pages in Part 6 render a real empty state instead of a permanent skeleton. **Say what each of the seven shows now, checked in a browser.** `d/reports` and `d/labour` untouched.
- [ ] `d/quality` and `p/[project_id]/quality` distinguish an empty register from a filtered one.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable**, exemption file still 30 entries.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1148 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `cd frontend && npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13. **Use a command that actually covers all five**, not one that checks hex and asserts the rest.
- [ ] **Commit and push to `origin/main`.**
