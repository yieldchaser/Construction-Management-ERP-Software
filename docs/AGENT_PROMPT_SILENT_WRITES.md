# AGENT PROMPT: the last 10 writes that fail without telling anyone

Small, exact run. Ten named sites. Do not sweep for more, do not refactor anything else.

## Context

The previous run added `readErrorDetail` to `frontend/src/lib/api.ts` and wired it through most of the console. That work was real: **189 mutating write sites now surface the API error, and only 10 do not.** This closes those 10.

The pattern being fixed is a write whose failure is invisible:

```js
const res = await fetch(url, { method: "DELETE", ... });
if (res.ok) refresh();
```

When the request fails the handler returns, the list does not change, and the user is told nothing. A 403 from a missing permission, a 400 from a validation rule, and a button that does nothing are all identical from the user's seat.

**A `catch` block is not a fix for this.** `fetch` only rejects on a network failure. A 400 or a 403 resolves normally, so `catch { /* ignore */ }` never runs for the case that actually happens. Several of the sites below have exactly that and are still silent.

---

## Group A: eight sites with `if (res.ok)` and no `else`

| File | Line | Request |
|---|---|---|
| `app/c/[company_id]/d/hr/page.tsx` | 777 | `POST` payroll run |
| `app/c/[company_id]/d/mom/page.tsx` | 202 | `DELETE` a MOM |
| `app/c/[company_id]/d/towers/page.tsx` | 125 | `DELETE` a tower |
| `app/c/[company_id]/p/[project_id]/boq/page.tsx` | 328 | `PATCH` milestone progress |
| `app/c/[company_id]/p/[project_id]/mom/page.tsx` | 198 | `DELETE` a MOM |
| `app/c/[company_id]/settings/page.tsx` | 737 | `DELETE` revoke a BI API key |
| `app/c/[company_id]/settings/page.tsx` | 1013 | `DELETE` a holiday |
| `app/c/[company_id]/settings/page.tsx` | 1054 | `DELETE` a salary template |

Add the failure branch to each, using `readErrorDetail` and whatever message mechanism that page already uses. Follow the file's own convention rather than introducing a new one. `d/wastage/page.tsx:87-99` is the reference implementation from the last run:

```js
if (res.ok) {
  fetchRecords();
} else {
  const err = await readErrorDetail(res);
  setMessage(err || 'Action failed');
}
```

Two of these need a little more care:

- **`settings/page.tsx:1013` and `:1054`** have **no `try` / `catch` at all**, so a network failure is an unhandled rejection on top of the silent HTTP failure. Wrap each in the same `try` / `catch` shape the neighbouring settings handlers use, and surface the error through the existing settings message state rather than adding a new one.
- **`settings/page.tsx:737`** currently ends `catch { /* leave as-is */ }`. Replace that comment with a real message. Revoking an API key that silently fails is a security-relevant lie: the operator believes a key is dead when it is still live.

---

## Group B: two writes that check nothing at all

`app/c/[company_id]/p/[project_id]/todo/page.tsx`, lines **70** and **78**:

```js
const toggle = async (t: Todo) => {
  const next = t.status === "done" ? "pending" : "done";
  await fetch(getApi(`/todos/${t.id}`), { method: "PUT", ... });
  load();
};

const remove = async (id: string) => {
  await fetch(getApi(`/todos/${id}`), { method: "DELETE", headers: authHeaders() });
  load();
};
```

No `.ok`, no `catch`, no error path. The `load()` afterwards re-reads from the server, so a failed toggle **visibly flips back** and a failed delete leaves the row sitting there, with no explanation. That reads as a broken UI rather than a rejected request.

Give both the same treatment as Group A: capture the response, branch on `res.ok`, surface `readErrorDetail` through this page's existing message mechanism, and wrap in `try` / `catch` for the network case.

---

## Out of scope. Do not touch.

- **The 189 sites that already handle their errors.** They are correct.
- **Silent GET requests.** A failed read leaves an empty list, which is confusing but does not mislead the user into thinking a change was saved. Separate, larger piece of work.
- **`d/finance/page.tsx:1094` and `d/subcon/scorecards/page.tsx:68-69`.** These look like the same pattern but are **GET refreshes that follow a mutation**. The write itself is already handled; the unchecked call only re-reads a list. Correct as they are.
- **`p/[project_id]/transaction/page.tsx:606`, `:637`, `:650`.** These assign to a shared `res` that is checked once further down at roughly line 677, where `setErr` already reports `Save failed (${res.status})`. Already handled.

I checked each of those six myself. Converting them would be churn, and in the transaction case would duplicate an existing check.

---

# Definition of done

- [ ] All 8 Group A sites surface the API error on failure.
- [ ] Both Group B sites check the response and surface the error.
- [ ] `settings/page.tsx:1013` and `:1054` are wrapped in `try` / `catch`.
- [ ] No new notification mechanism introduced. Each page uses what it already has.
- [ ] The six out-of-scope sites listed above are unchanged.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` still 1115 passed, 4 skipped.
- [ ] `cd frontend && npx tsc --noEmit` clean, `npm run build` completes.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.

Report, per site, the file, the line, and the message the user now sees when the request fails.

## One process note

The last run used a script that rewrote 44 files. The output happened to be correct and was verified, but authoring scripts are banned in this repository because every fabrication in its history came from one. **Ten sites is a hand edit.** Do not write a script for this.
