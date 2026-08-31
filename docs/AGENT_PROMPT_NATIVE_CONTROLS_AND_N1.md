# AGENT PROMPT: unreadable native dropdowns, and the work order N+1

Execute all three parts in one run. Do not stop between parts. **Dispatch this only after the UI slop purge run has landed and been pushed**, because Part 1 touches `globals.css` and Part 2 touches a router the other run does not.

---

# PART 1: native dropdowns are unreadable in dark mode

## The defect

Open Wastage Control, click "+ Record Wastage", open the Type dropdown. "Scrap" is readable because the OS paints a blue highlight behind it. **"Offcut", "Damaged", "Expired" and "Theft" are near invisible**, pale grey on white.

## Why

Every `<select>` in the console is styled `className="... text-foreground"`, for example `d/wastage/page.tsx:207`. In the dark theme `--foreground` is `#ECECEF`, near white. That is correct for the closed control, which sits on a dark `bg-white/5` surface.

But the **open dropdown list is painted by the operating system, not by your CSS**. Chrome renders that popup with a white background by default, and each `<option>` inherits `color` from the `<select>`. So the list is near-white text on a white popup.

The root cause is that **`color-scheme` is declared nowhere in the stylesheet.** Grep confirms zero occurrences in `frontend/src/app/globals.css`. Without it the browser assumes a light document and paints every native control accordingly: dropdown popups, date and time pickers, scrollbars, spinners, and the autofill background.

This affects **all 224 `<select>` elements in the console**, not just this one. It is not a Wastage bug.

## The fix, decided

Declare `color-scheme` on both themes in `globals.css`, beside the existing token blocks:

- On the dark `:root`, add `color-scheme: dark;`
- On `:root.light-theme`, add `color-scheme: light;`

That is the whole change. The browser then paints the popup dark in dark mode, and the inherited near-white text becomes correct rather than invisible. It fixes date pickers, scrollbars and spinners at the same time, for free.

**Do not** add per-option classes, do not restyle the `<select>` elements, and do not replace any native `<select>` with a custom component. One property on two selectors.

## Verify

- `grep -n "color-scheme" frontend/src/app/globals.css` returns exactly two lines, one per theme.
- Confirm the dark and light token values are otherwise byte identical to before.
- State in your report which theme block got which value.

---

# PART 2: the work order list is an N+1

## The defect

`get_work_orders` at `backend/app/routers/billing.py:303-341` loads every work order, then **runs three more round trips inside the loop, per row**:

```python
orders = db.query(WorkOrder).filter(WorkOrder.project_id == project_id).all()
for wo in orders:
    items = db.query(WorkOrderItem).filter(WorkOrderItem.wo_id == wo.id).all()   # 1
    subcontractor_name = resolve_party_name(db, wo.subcontractor_id)             # 2
    billed_amt, prog_pct = _compute_wo_billing(db, wo.id, ...)                   # 3
```

A project with 50 work orders issues roughly 150 to 200 queries to serve one page. Against Supabase over the network from Render, that is seconds of latency that grows linearly with the customer's data. It is invisible today only because the tenant that surfaced it has no work orders.

## The fix, decided

Keep the response shape byte identical. Only the query strategy changes.

1. **Items:** fetch every `WorkOrderItem` whose `wo_id` is in the loaded order ids in **one** query, then group them in Python by `wo_id`. Do not use a lazy relationship for this; an explicit `IN` query keeps the count at one regardless of ORM configuration.
2. **Subcontractor names:** collect the distinct `subcontractor_id` values first and resolve them in **one** batched lookup, then read from that dict inside the loop. If `resolve_party_name` cannot be batched without changing its signature, add a batch variant beside it and leave the existing single-id function untouched, since other routers call it.
3. **Billing rollup:** `_compute_wo_billing` currently runs per work order. Compute the same aggregate for all order ids in **one** grouped query, then look each up. The returned `billed_amount` and `progress_pct` values must match what the per-row version produces today, including the rounding and the clamping.

An order with no items, no resolvable subcontractor, or no billing rows must still return exactly what it returns today: an empty item list, the same fallback name, and the same zero or null billing figures. Batched lookups silently drop missing keys, which is precisely how this class of fix introduces a regression.

## Prove it with a query counter, not by reading

This is the gate. A test that only asserts the response body would pass against the unfixed code.

Write a test in `backend/tests/coverage/` that counts SQL statements. Bind a counter to the SQLAlchemy `before_cursor_execute` event on the test engine, seed **one** project with **five** work orders each having items and billing rows, call `GET /apis/v3/billing/work-orders`, and assert:

1. The response body is **identical** to the body the current implementation returns for the same seed. Capture it before you change anything.
2. The query count does **not** grow with the number of work orders. Seed five, record the count, seed ten, and assert the count is unchanged. A constant is the property that matters, not any particular number.

**Run this test against the unfixed tree first and watch it fail on the count assertion.** Paste that failure into your report. A test that has never failed has proved nothing.

## The other eleven

A sweep found the same shape elsewhere. These are **measured but unverified**, so treat each as a candidate, not a defect:

```
reports.py:1200   for b in bills:          projects.py:588   for m in members:
planning.py:214   for link in links:       vendor_performance.py:75  for po in pos:
three_way.py:227  for m in matches:        tally.py:432      for p in payments:
reports.py:855    for it in items:         hr.py:914         for emp in employees:
finance.py:1131   for cid in allowed_ids:  drawings.py:126   for d in drawings:
dpr.py:305        for d in reports:
```

For each, apply the **same query-count test** before touching it. Fix only the ones where the count demonstrably grows with row count, and leave the rest alone. Report the measured count per endpoint either way, including the ones you did not change and why. Do not batch-rewrite them on the strength of the grep; the grep is a hint, not a finding.

---

# PART 3: one backlog row, founder owned

Add one row to `docs/BACKLOG.md` as `D-024`, following the existing `D-0xx` format and column convention.

**The backend keep alive does not work, and it cannot be fixed in code.** `.github/workflows/keep_alive.yml` declares `cron: '*/10 * * * *'`, every ten minutes. The actual run history is every two to six hours:

```
2026-08-31T00:55:55Z  success      2026-08-30T13:12:03Z  failure
2026-08-30T22:43:03Z  success      2026-08-30T07:24:31Z  failure
2026-08-30T20:01:47Z  success      2026-08-30T01:35:11Z  failure
2026-08-30T17:36:52Z  success
```

GitHub heavily throttles and silently drops high frequency scheduled workflows, and three recent runs failed outright. Render's free tier spins a service down after fifteen minutes idle, so a four hour gap guarantees a cold start of thirty to sixty seconds for whoever loads the app next. The founder hit exactly this on the Subcontractors page at 10:19 IST on 2026-08-31, roughly four hours after the 06:25 IST ping. Two of the successful runs took over two minutes, which is the workflow itself waiting for the server to wake.

Record it as **founder owned**, priority HIGH, because every fix costs either money or an external account: a paid Render tier that never sleeps, or an external uptime pinger such as UptimeRobot or cron-job.org hitting `/health` on a schedule GitHub does not control. **Do not change the cron, do not add retries, and do not try to solve this in the repository.** Tightening the schedule makes GitHub throttle it harder.

---

# PART 4: buttons that do nothing

The founder asked whether the Approve button on Material Wastage works. It does: `updateStatus` calls `PATCH /apis/v3/wastage/{id}/status`, the endpoint exists at `wastage.py:119`, and `approved` is in `WASTAGE_STATUSES`. That one is fine. A sweep for the general class found two problems.

## 4.1 Eight buttons with no click handler at all

Each of these renders with hover styling and, in three cases, a tooltip, so it looks live and does nothing when clicked.

**Wire these four. The thing they need already exists, so they are dead buttons on working features.**

| Button | Where | What to wire it to |
|---|---|---|
| `Payslip` | `d/hr/page.tsx:1436` | `GET /apis/v3/hr/payroll/{run_id}/payslips` and `/payslips/export` already exist at `hr.py:1031` and `hr.py:1069`. Match how the neighbouring export actions on this page call theirs. |
| `+ Add Member` | `p/[project_id]/attendance/page.tsx:1372` | `POST /apis/v3/projects/{project_id}/members` exists at `projects.py:611`. Open the same add-member flow the project team surface already uses rather than building a new one. |
| `Copy Key` | `dashboard/page.tsx:1690` | No backend needed. Copy the displayed Tally key to the clipboard and show a brief confirmation. The text beneath it tells the user to paste this key into their Tally agent, so today that instruction cannot be followed. |
| `Pending Entries` | `d/finance/page.tsx:1240` | This is the twin of `Unbilled Materials` directly above it, which toggles `showUnbilledOnly`. Add the matching state and filter, and make the count badge reflect the filtered set exactly as the unbilled one does. |

**Remove these four.** Wiring them means designing and building a feature, which is out of scope for this run, and a control that looks live and is not is worse than no control. This project has done exactly this before: `ab9623e` closed the defect half of R2-184 by removing five upload controls that had no backend.

| Button | Where |
|---|---|
| `Sort` (icon, `title="Sort"`) | `dashboard/page.tsx:261` |
| `Fullscreen` (icon) | `dashboard/page.tsx:276` |
| `More options` (icon) | `dashboard/page.tsx:279` |
| `View` | `d/hr/page.tsx:1135`, the timesheet row action beside `Approve` |

If removing one leaves an empty flex container or a stray gap, clean up the wrapper too.

**Two that look dead and are not. Do not touch them.** `components/rbac/PermissionGate.tsx:42` receives its handler through `{...rest}`, and the rail button at `components/Sidebar.tsx:613` is handled by its wrapping element.

## 4.2 Fifty-two write actions that fail silently

This is the larger problem and it produces the same experience as a dead button. The pattern throughout the console is:

```js
const res = await fetch(url, { method: "PATCH", ... });
if (res.ok) {
  fetchRecords();
}
```

There is no `else`. When the request fails, the handler returns, the UI does not change, and **the user is told nothing.** A 403 from a missing permission, a 400 from a validation rule, and a dead button are indistinguishable from the user's seat. The Wastage `Approve` button at `d/wastage/page.tsx:87-96` is exactly this shape: it works when it works, and it is silent when it does not.

There are **52 such sites on mutating requests** (POST, PATCH, PUT, DELETE), concentrated in `settings` (7), `d/finance` (6), `d/planning/gantt` (5), `d/quality` and `p/[project_id]/quality` (4 each), `d/chat`, `d/hr`, `d/towers`, `p/[project_id]/boq` (3 each). Sweep for the rest yourself.

For every one of them, add the failure branch. Read the error the API already returns and surface it through whatever the page already uses, and do not introduce a new notification mechanism. Most of these pages already have a `message` or `error` state driving a banner; several already do this correctly on other handlers in the same file. Follow the file's own convention:

```js
if (res.ok) {
  fetchRecords();
} else {
  const err = await res.json().catch(() => ({}));
  setMessage(typeof err.detail === "string" ? err.detail : `Could not save (HTTP ${res.status})`);
}
```

The backend returns a useful `detail` string on these paths, including the reservation and stock messages, so the user should see the real reason rather than a generic failure.

**Leave the 57 silent GET requests alone in this run.** A read that fails leaves an empty list, which is confusing but not misleading in the same way, and fixing them is a separate and larger piece of work.

---

# Definition of done

- [ ] `color-scheme` declared once per theme in `globals.css`; token values otherwise unchanged.
- [ ] `get_work_orders` issues a constant number of queries regardless of work order count, proven by a query counting test that was **watched failing** against the unfixed tree, with the failure pasted into your report.
- [ ] The work order response body is byte identical before and after, including empty and missing cases.
- [ ] All twelve candidate N+1 sites measured, with the per endpoint query counts reported and the untouched ones justified.
- [ ] `D-024` added to `docs/BACKLOG.md`, marked founder owned, with no code change attempted.
- [ ] Four dead buttons wired (`Payslip`, `+ Add Member`, `Copy Key`, `Pending Entries`), each demonstrated to call a real endpoint or perform a real action.
- [ ] Four dead buttons removed (`Sort`, `Fullscreen`, `More options`, `View`), with wrappers cleaned up.
- [ ] `PermissionGate.tsx:42` and `Sidebar.tsx:613` untouched.
- [ ] All 52 silent write handlers surface the API `detail` on failure, using each page's existing message mechanism. Report the count before and after.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes with the new test included.
- [ ] `cd frontend && npx tsc --noEmit` clean, `npm run build` completes.
- [ ] `python scripts/verification/verify_help_claims.py` still prints `[PASS]` with its four coverage counts unchanged.
