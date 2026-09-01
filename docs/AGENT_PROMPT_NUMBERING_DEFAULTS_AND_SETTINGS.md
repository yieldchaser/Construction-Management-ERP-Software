# AGENT PROMPT: dead-end document numbers, frozen defaults, and inert settings

**This file supersedes `AGENT_PROMPT_FROZEN_DEFAULTS.md` and
`AGENT_PROMPT_INERT_SETTINGS.md`.** Neither was run. Everything in them is here.
Run this one and ignore those two.

Two groups. **Group A first, then Group B, as separate commits.** The order
matters for once: Group A builds a document numbering helper that Group B may
want to reuse, and both groups touch `d/procurement`. Do not interleave them.

Group A is values written down as literals that should follow the calendar or a
sequence. Group B is settings a customer can change that no code reads.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

---

# GROUP A: frozen defaults and dead-end document numbers

A sweep for the same class of defect as the statutory year list: a value that
should follow the calendar, written down as a literal instead. Eleven sites in
nine files. No backend literal-year defaults exist; every site listed here is
frontend, though fixing the numbering needs one backend helper.

Three of them are worse than a stale year and are listed first. Do those three
even if you do nothing else: each is a document number that a user cannot edit
and that the backend rejects as a duplicate, so the screen becomes a dead end
with no way forward.

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

# GROUP B: settings that save but never do anything

A different class from Group A. These are controls the customer can find, read,
change and save, that no code anywhere consults. The value round trips to the
database and back to the screen, so the setting looks like it worked. Nothing
changes.

Found by listing all 51 `Company` columns and checking each for a reader outside
`settings.py`, on both the backend and the frontend. Run that sweep again
yourself before you start, with the self test described near the end, because
the list must be true on the day you fix it, not the day I wrote it.

# The finding

Seven controls are inert. Each has a visible control in Settings and no reader:

```
quantity_decimal_places        Field  "Quantity Decimal Places"
back_dated_limit_days          Field  (Workflow Controls)
bom_restriction                Toggle "Restrict BOM Material"
                                      desc "Restrict edits to Bills of Material"
material_request_restriction   Toggle "Material Request Restriction"
                                      desc "Restrict the Material Request flow"
negative_balance_warning       Toggle (Workflow Controls)
google_sheets_enabled          Toggle (Integrations)
weekly_off                     (superseded, see below)
```

**What makes this bad is the company they keep.** The same Workflow Controls
panel holds toggles that genuinely work:

```
po_restriction                 enforced at procurement.py:613
negative_stock_lock            enforced at workflow_controls.py, dpr.py
restrict_entry_creation_days   enforced at workflow_controls.py
```

A site manager reading that panel has no way to tell "Restrict BOM Material"
from "PO Restriction". They look identical, they save identically, and one of
them protects the books while the other does nothing at all. A customer who
turns on a restriction and believes it is on is worse off than one who never
found the setting.

---

# What to do with each

Do not assume the answer is "wire it up". For some of these the honest fix is to
take the control off the screen. Decide per item and **state your reasoning for
each in the report.**

## 1. `quantity_decimal_places`

`CompanySettingsContext` already fetches it and exposes `quantityDecimalPlaces`.
No component reads that value. Meanwhile `currencyDecimalPlaces` from the same
context is consumed by `d/crm`, `d/payroll-attendance`, `enterprise` and
`p/[project_id]/boq`, so the plumbing works and only this one is unconnected.

**Wire it.** Quantities are rendered with hardcoded precision in roughly 71
places across the console. You do not need to convert all of them in this run,
and you should not try. Convert the quantity displays that matter most on a
material heavy product: stock on hand, reserved and available in `d/procurement`
and `d/production`, and DPR consumption. Report how many call sites you changed
and how many remain.

## 2. `back_dated_limit_days`

Look closely before touching this. `restrict_entry_creation_enabled` and
`restrict_entry_creation_days` already implement a back dating window and are
enforced. `back_dated_limit_days` looks like an earlier attempt at the same idea
that was superseded and left behind.

**If it is a duplicate, remove the control from the screen** rather than wiring a
second competing window, and say so in your report. Two settings that both claim
to limit back dating, where one works and one does not, is worse than one
setting. Leave the column in the database; dropping it is a migration and is not
this run.

If you find it is genuinely distinct from the entry creation window, wire it, and
explain what the difference is.

## 3. `bom_restriction` and `material_request_restriction`

Both are toggles promising to restrict a flow. Neither is read anywhere.

Work out what each is supposed to restrict by reading how `po_restriction` does
its job at `procurement.py:613`, which blocks a purchase order that has no
originating indent. Then either enforce the equivalent rule for bills of material
and for material requests, or remove the toggles.

**Prefer enforcing.** These are exactly the controls a customer buys this
product for. But if the flow they name does not exist in a form that can be
restricted, say that plainly and take the toggle off the screen rather than
inventing a rule nobody asked for.

## 4. `negative_balance_warning`

This one is now entangled with recent work. The procurement and production
screens were just changed to show negative stock in the danger tone with a
"needs reconciling" label, unconditionally.

So the behaviour this setting names is currently always on. Either make the
warning honour the toggle, or remove the toggle because the warning is now
standard behaviour. **I lean to removing it**, because a warning about a broken
ledger is not something a company should be able to switch off, and that was the
reasoning behind showing negatives in the first place. Make the call, do it, and
say which you chose.

## 5. `google_sheets_enabled` and `google_sheets_auth_phone`

Note that `google_sheets_authorized_phones`, the plural one, **is** read and
enforced. The enable toggle and the singular phone field are not.

That is the worst arrangement of the three: a customer can turn the integration
"off" while the authorised phone list continues to work. Find out whether the
enable toggle is meant to gate the integration, and if so gate it. If the plural
list is the real control and the other two are leftovers, remove them from the
screen.

## 6. `weekly_off`

`weekly_off_days`, the plural, is read and used. The singular `weekly_off` is
not. Same shape as the phone fields. Remove the dead one from the screen.

---

# Not in scope

Leave these alone. They came up in the same sweep and are not defects:

- `subscription_plan`, `subscription_start`, `subscription_end`,
  `subscription_renewal`. Billing is deliberately deferred and is the founder's
  own work, tracked as D-023. Do not build anything here.
- `business_segment`, `company_size`, `construction_types`, and the
  `onboarding_*` fields. These are descriptive profile data. Storing them
  without acting on them is the point.

---

# Rules

- No authoring scripts.
- Semantic tokens only.
- Backend changes are confined to the document numbering helper in Group A, and
  whatever enforcement you add in Group B. Nothing else.
- Do not drop any database column. Removing a control from the screen means
  removing the control, not the data.
- Plain language in UI copy. No endpoint paths, table names or permission keys.
  No em dashes in prose.
- Every rule you enforce needs a test that fails against the current tree.

# Two habits this run depends on

**Check derived dates across the calendar, not just today.** It is September, so
a rule that only misbehaves in January will pass every check you run now. For
anything you derive from the date, report what it produces in January and in
December. The month picker in Group A is the one that matters.

**Self test the settings sweep before you believe it.** Feed it
`po_restriction`, `negative_stock_lock` and `restrict_entry_creation_days`,
which must come back wired, and a column name that does not exist, which must
come back inert. I built that sweep and got the wrong answer on the first pass
because I searched only the backend, which made `currency_decimal_places` look
dead when it is enforced in the frontend. Search both sides or you will report a
working setting as broken.

# Definition of done

## Group A

- [ ] GRN form starts empty, omits the field when blank, and the company's GRN
      Numbering setting takes effect. Report the numbers two consecutive GRNs get.
- [ ] NCR numbers are sequential per project, not random. State how you generate
      them and confirm thirty consecutive creates in one project do not collide.
- [ ] The NCR form has a number field, so the conflict message is actionable.
- [ ] Subcontractor work order numbers come from a sequence, have an editable
      field, and match how `d/billing` already does it.
- [ ] A new test covers the NCR and work order numbering, and it **fails against
      the current tree at the collision assertion** before your fix. Report that
      it failed first and what the failure said.
- [ ] Report month list derived from the current date. State what it produces in
      January and December.
- [ ] The dashboard transaction date range is either bound to real data or gone.
      Say which and why.
- [ ] Project creation no longer writes 2026 or 2027 literals.
- [ ] Work order prefill in `d/billing` uses the current year.
- [ ] Dashboard zero state carries no past month label, and you have reported
      whether it was rendering a phantom expense figure.
- [ ] No placeholder from the leave-alone list was changed. Confirm with a diff
      summary.

## Group B

- [ ] The sweep re-run by you, with its self test, and the current inert list
      reported. Say whether it matches the seven listed.
- [ ] A decision stated for each of the seven: enforced, or control removed, with
      one line of reasoning.
- [ ] `quantity_decimal_places` reaches the stock and consumption displays.
      Report call sites changed and remaining.
- [ ] For every setting you enforced, a test that **fails against the current
      tree** at the enforcement assertion. Report that it failed first and what
      the failure said.
- [ ] For every control you removed, confirmation the column still exists and
      only the UI changed.
- [ ] No `subscription_*` or profile field touched. Confirm with a diff summary.

## Both

- [ ] `python scripts/verification/check_route_reachability.py` reports
      **0 unreachable**, exemptions still 30. Report the route total.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green.
      Report passed and skipped counts.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at
      37 / 38 / 73 / 116.
- [ ] Design counts unchanged: gradients 0, `hover:bg-white/N` 0, inline shadows
      0, with one command covering all three.
- [ ] **Commit and push to `origin/main`**, Group A and Group B as separate
      commits.
