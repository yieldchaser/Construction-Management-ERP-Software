# AGENT PROMPT: eleven defects from a fresh sweep

Eleven items against `f257a64`. Three came from re-running the static sweeps. Eight came from driving the live app against production: **all 53 company-scoped routes**, then the project-scoped routes against a real project in the founder's second company. None of those eight was visible to any static check.

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

# PART 8: copy defects found by walking every console page

All 53 company-scoped routes were loaded in a browser against production. These are what that turned up beyond Part 6.

**8.1 Page titles interpolate a lowercase slug.** Two files build a title from a tab id:

```
d/library/page.tsx:656            title={`${activeTab.replace("-", " ")} Library`}
d/reports/calculators/page.tsx:356 title={`${activeCalc.replace(/_/g, " ")} Quantity Estimator`}
```

Which renders, live: `party Library`, `material Library`, `cost code Library`, `steel column Quantity Estimator`. Title-case the interpolated word, or map each id to a proper label. A label map is better, because `boq` should read `BOQ` and not `Boq`.

**8.2 Delete Logs shows raw entity names.** The entity type filter lists `Approval_rule`, `Asset_type`, `Chat_group_member`, `Cost_code`, `Crm_lead` and the rest, straight from the internal vocabulary, underscores and all. Map them to human labels: "Approval rule", "Asset type", "Chat group member", "Cost code", "CRM lead".

**8.3 An HTTP endpoint is printed on screen.** `d/budgeting/boq/page.tsx:428` and `p/[project_id]/boq/page.tsx:593` render `POST /boq-documents/{doc_id}/items` as help text next to the import control. Replace with a sentence about what the import accepts. No user has ever needed to read a method and a path.

**8.4 A third internal note as user copy.** `settings/page.tsx:2232` begins "Partially wired: the shared currency formatter (fmtINR) now accepts an optional decimal-places argument". That is a commit message, not help text. Rewrite it as what the setting does, or delete it.

**8.5 Em dashes in prose.** 22 user-facing strings contain an em dash inside a sentence, against the standing rule. Examples: `d/budget/page.tsx:156`, `d/mom/page.tsx:234`, `d/planning/gantt/page.tsx:696`, `p/[project_id]/task/page.tsx:139`.

**Do not touch the roughly 300 standalone `"—"` values.** Those are null placeholders in tables and are correct typography. Only change em dashes sitting between words in a sentence. JSX comments do not count either.

---

# PART 9: the offline banner claims demo data that does not exist

Four pages render this when a fetch fails:

```
d/procurement/page.tsx:822        Using demo procurement data, backend connection unavailable
d/quality/page.tsx:552            Using demo quality data, backend connection unavailable
d/reports/page.tsx:158            Using demo reports, backend connection unavailable
p/[project_id]/quality/page.tsx:527  same as quality
```

`setIsOffline(true)` is called in the `catch`, and **that is all it does**. There is no mock dataset anywhere in these files; grepping for one finds nothing. So the list stays empty and the banner tells the user the empty screen is demo data.

This matters more than it looks. The backend cold starts on the free tier (`D-024`), so a failed first fetch is a realistic event, and the message a customer gets in that moment is false.

**Fix it by telling the truth:** say the data could not be loaded and offer a retry. Keep the warning styling. Do not add demo data to make the message true.

---

# PART 10: the file upload allowlist fails open

`backend/app/routers/files.py:250-265`:

```python
sniffed = _sniff_content_type(contents)
if sniffed and sniffed not in ALLOWED_CONTENT_TYPES:
    raise HTTPException(415, ...)

if declared_type in ALLOWED_CONTENT_TYPES:
    content_type = declared_type
elif sniffed in ALLOWED_CONTENT_TYPES:
    content_type = sniffed
else:
    raise HTTPException(415, ...)
```

`_sniff_content_type` recognises PDF, PNG, JPEG, GIF, WEBP, ZIP, RAR, 7z, GZIP and BMP by magic bytes. **Anything it does not recognise returns `None`**, which makes the first guard fall through, and then the **client-declared MIME type is trusted**.

So a file whose bytes are not in that signature list is accepted purely on the say-so of the uploader. A Windows executable is not in the list. **This is demonstrated, not theoretical: `probe.exe` is sitting in the project file repository right now**, visible in the browser on the project files page.

The stored object is then labelled with the declared type, so it will be served back to another user as whatever the uploader claimed it was.

## The fix

Make the allowlist **fail closed**: require a positive identification.

- If `_sniff_content_type` returns `None`, reject. Do not fall through to the declared type.
- When it does return a type, that sniffed type is authoritative. Store it, and use it as the served `content_type`. **Never store or serve a client-supplied MIME type.**
- Keep the 50 MB cap as it is.
- Extend the signature table only as far as the formats the allowlist genuinely needs. A CAD or Office file that cannot be identified should be rejected with a clear message rather than waved through.

This will reject some files that are accepted today, which is the point. Say in your report which formats in `ALLOWED_CONTENT_TYPES` have no signature in the sniffer, because those become unuploadable and the founder needs to know which.

**Do not delete `probe.exe`.** It is the founder's own test artefact and evidence.

---

# PART 11: two more pages that never finish loading, and raw values on screen

**11.1** Checked against a real project in the founder's second company, AK Construction:

- `p/[project_id]/subcon/scorecards` renders a **completely empty main region**, with a project selected and data present. It is blank regardless of project, so it is worse than the Part 6 pages.
- `p/[project_id]/finance` sits on **"Loading transactions..." permanently**, still there after 12 seconds, while `GET /finance/transactions/{company_id}` returns 200 with real totals. The same loading state is never cleared. I reached it by direct URL into a second company, so confirm the exact trigger before fixing, but the rule is the same as Part 6: **a fetch that fails or never fires must still clear the loading state.**

**11.2 Raw internal values are rendered to users.** `p/[project_id]/task` displays a task status as `not_started`. Delete Logs lists `Approval_rule`, `Asset_type`, `Chat_group_member`. A sweep finds **70 places** that render a `status`, `type`, `state`, `priority` or `entity_type` straight into JSX with no label mapping.

Add one shared label formatter and use it wherever such a value is displayed. The visible damage is anywhere the value contains an underscore, so fix those first and apply the helper broadly. **Single-word values like `approved` or `pending` are acceptable as they are** if title-cased; do not invent new vocabulary for them.

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
- [ ] Page titles read correctly: Library and Quantity Estimator no longer show a lowercase slug.
- [ ] Delete Logs entity filter shows human labels, not underscored internal names.
- [ ] No HTTP method or path is rendered anywhere in the UI.
- [ ] The `fmtINR` note is gone from settings.
- [ ] Em dashes inside sentences: 22 to 0. The standalone `"—"` null placeholders are **unchanged**; report both counts.
- [ ] The four offline banners say loading failed and offer a retry, and no demo dataset was added.
- [ ] File upload fails closed: an unidentifiable file is rejected, the sniffed type is authoritative, and no client-supplied MIME type is stored or served. Report which allowed formats now lack a signature.
- [ ] `p/[project_id]/subcon/scorecards` renders content, and `p/[project_id]/finance` no longer sits on "Loading transactions...". Checked in a browser.
- [ ] A shared label formatter is applied wherever a status or type is rendered. Report the count of underscored values still reaching the screen; it must be 0.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable**, exemption file still 30 entries.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1148 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `cd frontend && npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13. **Use a command that actually covers all five**, not one that checks hex and asserts the rest.
- [ ] **Commit and push to `origin/main`.**
