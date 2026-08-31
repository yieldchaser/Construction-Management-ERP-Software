# AGENT PROMPT: three defects from a fresh sweep

Short run. Three items, all found by re-running the sweeps against `f257a64`.

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

# Rules

- **No authoring scripts.** Three small changes.
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
- [ ] The project picker distinguishes loading, empty and failed.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable**, exemption file still 30 entries.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1148 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `cd frontend && npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13. **Use a command that actually covers all five**, not one that checks hex and asserts the rest.
- [ ] **Commit and push to `origin/main`.**
