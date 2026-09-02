> **DONE, not by an agent. Do not run this file.** Fixed at `ed1ac2c` and
> verified live: the leave tab shows the warning inline and still renders the
> history table below it.
>
# AGENT PROMPT: the leave tab now hides history behind a name match

Group B is otherwise correct and verified. One regression came with it.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: the early return hides more than the form

`frontend/src/app/c/[company_id]/d/payroll-attendance/page.tsx:1415`:

```tsx
const me = employees.find((e) => e.name === userName);
...
if (!me) {
  return (
    <div className="...">
      No employee staff record linked to your user account ({userName || "current user"}). Please register in Employee Directory first.
    </div>
  );
}
```

`userName` is `localStorage.getItem("user_name")`. The match is an exact
string compare against the employee directory.

Before this change the tab rendered, the history list loaded, and only the
submit 422'd. Now the whole sub-component is replaced, so **the leave history
a user could previously read disappears** whenever the name does not match
exactly. A company owner who is not in the employee directory at all, which is
the normal case, now sees only the warning on that tab.

## The fix

Gate the **form**, not the tab. Keep the history list, the assigned-template
banner, and the balance summary rendering as before. Where the form was, render
the existing warning copy in place of the input row.

Do not change `load()`, which filters on `employee_name === userName`. That
matching is unchanged from before and is out of scope here.

# PART 2: two small things in the same commit

**`backend/app/routers/library.py:772`** guards each update field with
`if payload.X is not None`, so once `rate_type` or `cost_code` is set it can
never be cleared back to empty from the UI. Distinguish "absent" from
"explicitly null" using Pydantic's `model_fields_set`, or accept empty string
as a clear. Whichever you pick, say which.

**`frontend/src/app/c/[company_id]/p/[project_id]/attendance/page.tsx:839`**
still reads `log.distance_meters` as a fallback after the corrected
`log.distance_from_site_m`. The backend never emits that name. Delete the
fallback and its type declaration.

# Rules

- No authoring scripts.
- No new migration. `ensure_postgres_schema_sync()` at `main.py:280` already
  adds the five nullable columns from Group B on the next backend boot.
- Do not change how `employees` is fetched.

# Definition of done

- [ ] Leave history and template banner render for a user with no matching
      employee record; only the form is replaced by the warning.
- [ ] Workforce update can clear an optional field, with the chosen mechanism
      named.
- [ ] `distance_meters` returns 0 hits under `grep -rn distance_meters frontend/src`.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -q` exit 0.
- [ ] `cd frontend && npx tsc --noEmit` exit 0.
- [ ] `python scripts/verification/check_route_reachability.py` reports 0 unreachable.
- [ ] Commit and push to `origin/main`.
