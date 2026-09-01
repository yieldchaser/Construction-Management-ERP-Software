> **SUPERSEDED. Do not run this file.** Everything in it is in
> `docs/AGENT_PROMPT_NUMBERING_DEFAULTS_AND_SETTINGS.md`. Run that instead.

# AGENT PROMPT: defaults frozen to 2026

A sweep for the same class of defect as the statutory year list: a value that
should follow the calendar, written down as a literal instead. Eleven sites in
nine files. The backend is clean, every one of these is frontend.

Three of them are worse than a stale year and are listed first. Do those three
even if you do nothing else: each is a document number that a user cannot edit
and that the backend rejects as a duplicate, so the screen becomes a dead end
with no way forward.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# PART 1: the GRN form defeats the company's own numbering setting

`d/procurement/page.tsx:345`:

```js
const [grnNum, setGrnNum] = useState("GRN-2026-010");
```

sent at `:672` as `grn_number: grnNum`.

The backend already numbers GRNs properly. `procurement.py:129` declares

```python
grn_number: Optional[str] = None  # omit to auto-generate per Settings -> Workflow Controls -> GRN Numbering
```

and `_generate_grn_number()` at `:857` reads the company's **GRN Numbering**
setting, runs a sequence scoped to either the project or the company, and bumps
past collisions.

The form never omits the field, so that setting has never once taken effect. A
customer who configures Company Level numbering in Settings gets no change,
because every GRN arrives pre-stamped with the same literal string.

**Two things wrong, fix both:** every GRN defaults to the identical number, and
the configured numbering scheme is bypassed.

Leave the field on the form so a user can still type their own number, but start
it **empty** and omit `grn_number` from the request body when it is empty, which
is exactly what the endpoint asks for. Label it so a user knows blank means
automatic. Confirm by creating two GRNs without typing a number that they come
back with different, sequential numbers.

# PART 2: NCR numbers are random, collide, and cannot be corrected

`d/quality/page.tsx:371` and `p/[project_id]/quality/page.tsx:346` both send:

```js
ncr_number: `NCR-2026-${Math.floor(100 + Math.random() * 900)}`,
```

Three problems stacked:

1. The number is generated at submit time and there is **no field for it on the
   form**. Check `ncrForm` at `:144`; it holds inspection, title, description,
   severity and due date, and no number.
2. It is random across only 800 values, and `quality.py:452` enforces
   `uq_ncrs_project_id_ncr_number` per project. By the birthday bound a project
   hits a collision after roughly thirty NCRs.
3. When it collides the user sees the message at `:461`, "An NCR with number
   ... already exists for this project. Use a unique NCR number." **There is no
   field to change it in.** The user is told to fix something the form does not
   let them touch, and retrying re-rolls the same 800-value dice.

So NCR creation degrades from working, to intermittently failing, to a dead end,
and the copy blames the user.

Fix it by numbering NCRs the way GRNs already are: a sequence derived from the
existing NCRs in that project, not a random draw. The GRN helper at
`procurement.py:857` is the pattern to copy, including the collision bump. Put
the resulting number in the request. **You may add a small backend helper for
this**; this is the one part of this run where a backend change is expected.

Also add the number to the form as an optional field so a user can enter their
own, since the error message promises they can.

---

# PART 3: subcontractor work order numbers collide every 16 minutes

Same shape as Part 2, found by sweeping for it deliberately. In
`d/subcon/page.tsx` and `p/[project_id]/subcon/page.tsx`:

```js
:438   woNumber: `WO-${Date.now().toString().slice(-6)}`,
:508   wo_number: woForm.woNumber || `WO-${Date.now().toString().slice(-6)}`,
```

`woForm.woNumber` is set when the modal opens and posted to
`billing/work-orders`, which rejects duplicates at `billing.py:413` with "Work
Order number already exists for this company".

**There is no input bound to `woForm.woNumber`.** Grep it: every reference is a
read, a reset, or a display. The user cannot edit the number they are told to
change.

The last six digits of an epoch millisecond wrap every 1,000,000 ms, which is
16 minutes 40 seconds. So two work orders created any multiple of roughly
sixteen minutes apart collide. That is an ordinary afternoon, not an edge case.

Worth knowing before you fix it: `d/billing/page.tsx` creates work orders
against the **same endpoint** and does it correctly, with an editable field at
`:1097`. Two pages, one resource, two behaviours. Make subcon match billing, and
number them from a sequence rather than a clock, as in Part 2.

# PART 4: the report month picker only knows 2026

`reports/page.tsx:139` and `:143`:

```js
const [selectedMonth, setSelectedMonth] = useState("Jul 2026");
const months = ["Jan 2026", "Feb 2026", ..., "Dec 2026"];
```

`shiftMonth` at `:150` walks this array with `months.indexOf`, so the previous
and next arrows cannot leave 2026 at all. Today the picker opens on a month two
months in the past and cannot reach the current one.

Derive the list from the current date, the way `d/statutory` now does. Cover a
window that reaches back far enough for late reporting and includes the current
month. Default the selection to the month that closed, matching the statutory
page so the two agree.

# PART 5: a hardcoded date range presented as a filter

`dashboard/page.tsx:1009`:

```jsx
<label ...>Txn Date</label>
<div className="flex items-center gap-2 bg-input border ...">
  <Icon name="calendar" ... />
  <span>01 Jan 2026 to 31 Jul 2026</span>
</div>
```

This is static text dressed as a control. It sits under a "Txn Date" label,
inside an input-styled box with a calendar icon, next to real filters. A user
reads it as the range the figures cover. It is not bound to anything and the
figures do not respect it.

**A label that states a range the data does not honour is worse than no label.**
Either bind it to the real range the dashboard is showing, or remove it. Decide
which and say why. Do not leave a plausible-looking range sitting there.

# PART 6: new projects are created with 2026 dates

Two project creation paths write frozen dates:

```
d/attendance/page.tsx:199-200                 start_date: "2026-01-01", end_date: "2026-12-31"
p/[project_id]/attendance/page.tsx:196-197    same
dashboard/page.tsx:1875                       endDate: "2027-12-31"
```

These are not display defects. They write to the database, so a project created
next year carries dates from a year that has already ended, and the dashboard
path gives every project the same end date regardless of what it is.

Default the start to today and leave the end **empty** rather than inventing one,
unless the field is required, in which case say so and pick a sensible relative
default. A wrong end date on a project skews every schedule view that reads it.

# PART 7: two smaller ones

**Work order numbers.** `d/billing/page.tsx:485` resets the field to a template
built from a literal `WO-2026-` prefix and a random four digit suffix. The field
is user-editable at `:1097`, so this is only a prefill and the year is the only
problem, but it will read wrong in January. Use the current year.

**The empty dashboard fallback.** `dashboard/page.tsx:28` has
`chart_months: ["Jun 2026"]` in the zero-state object, so an empty tenant shows a
chart labelled with a month from the past. While you are there, note that the
same object sets `expense_series: [-1000.0]` and `margin_series: [1000.0]`.
Those are not zero. Check whether an empty dashboard renders a thousand rupees
of expense that does not exist, and if it does, fix it and say so.

---

# What to leave alone

These matched the same search and are **fine**. Do not touch them:

```
d/crm/page.tsx:1420             placeholder="e.g. INV-2026-001"
d/finance/page.tsx:3781,3992    placeholder="e.g. INV-2026-08"
d/procurement/rfq/page.tsx:675  placeholder="e.g. RFQ-2026-001"
d/reports/page.tsx:301          placeholder="e.g. Monthly Progress Report - June 2026"
d/statutory/page.tsx:1109       placeholder="2026-06"
```

They are placeholder text showing the shape of an entry, never submitted.
Changing them is churn.

---

# Rules

- No authoring scripts.
- Semantic tokens only.
- Backend changes are confined to the NCR numbering helper in Part 2. Nothing else.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.

# Verify across the calendar, not just today

Anything you derive from the date must be checked in more than the current
month. For the month list in Part 3, report what it produces in January and in
December, since those are the rollover edges.

# Definition of done

- [ ] GRN form starts empty, omits the field when blank, and the company's GRN
      Numbering setting takes effect. Report the numbers two consecutive GRNs get.
- [ ] NCR numbers are sequential per project, not random. State how you generate
      them and confirm thirty consecutive creates in one project do not collide.
- [ ] The NCR form has a number field, so the conflict message is actionable.
- [ ] Subcontractor work order numbers come from a sequence, have an editable
      field, and match how `d/billing` already does it.
- [ ] Report month list derived from the current date. State what it produces in
      January and December.
- [ ] The dashboard transaction date range is either bound to real data or gone.
      Say which and why.
- [ ] Project creation no longer writes 2026 or 2027 literals.
- [ ] Work order prefill uses the current year.
- [ ] Dashboard zero state carries no past month label, and you have reported
      whether it was rendering a phantom expense figure.
- [ ] No placeholder from the leave-alone list was changed. Confirm with a diff
      summary.
- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, exemptions still 30. Report the route total.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts.
- [ ] A new test covers the NCR numbering, and it **fails against the current
      tree at the collision assertion** before your fix. Report that it failed
      first and what the failure said.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] **Commit and push to `origin/main`.**
