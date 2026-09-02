> **DONE, not by an agent. Do not run this file.** Every part was fixed directly
> on 2026-09-02 across `956d2f8`, `427ec00` and `29aedf7`, and covered by
> `backend/tests/coverage/test_e2e_workflow_breaks.py`, which fails against
> `041c6d4` on each defect it names.
>
> Verified live on AK Construction after deploy: material wastage records
> end to end, and a safety incident posts an absolute instant and returns 200.
>
> Two corrections to what this file claims. Part 9's a11y item is **retracted**:
> the Reports hub controls are real `<button>` and `<Link>` elements with title
> attributes, not bare svgs; my DOM probe never reached the sibling holding them.
> And the PO vendor fix in Part 6a needed a second pass, because
> `PurchaseOrder.vendor_id` is a foreign key to `company_team`, so the create
> endpoint takes `vendor_party_id` and resolves the link itself.
>
# AGENT PROMPT: eight workflows that do not complete, found by driving the app

I drove SiteFlow end to end on AK Construction as a real site team would:
created a project, registered a vendor and materials, raised an indent, a PO,
a GRN, a subcontractor work order and two RA bills, added an employee, filed a
DPR with material consumption, recorded wastage, deployed and returned an
excavator, ran a quality inspection and raised an NCR, reported a safety
incident, and read the stock report back.

Everything below was reproduced live with the request and response captured.
Nothing here is inferred from reading code alone; the code references are the
mechanism behind an observed failure.

Report as before: command, exit code, one sentence. No pasted output.
"Not run" is acceptable.

Work the parts in order. Parts 1 to 4 are launch blockers.

---

# PART 1: no safety incident can be reported from India

**This is a regression from our own Group A commit 93a3883.**

`frontend/src/app/c/[company_id]/d/safety/page.tsx:169` seeds the form with

```ts
reported_at: nowLocalISO(),
```

which produces a naive local string, e.g. `"2026-09-02T11:55"` in IST. The
backend validator at `backend/app/routers/safety.py:38`:

```python
@field_validator("reported_at")
@classmethod
def reported_at_not_future(cls, v: datetime) -> datetime:
    if v.tzinfo is None:
        v = v.astimezone()          # attaches the SERVER timezone
    if v.astimezone(timezone.utc) > datetime.now(timezone.utc):
        raise ValueError("reported_at cannot be in the future")
```

Render runs UTC, so `11:55` IST is read as `11:55` UTC and compared against
`06:25` UTC. Every submission is rejected:

```
422 {"detail":[{"loc":["body","reported_at"],"msg":"Value error, reported_at cannot be in the future"}]}
```

I hit it four times in a row. The module is unusable, and incident records are
a statutory obligation under the BOCW rules.

`git log -L 169,169` shows what changed:

```
-    reported_at: new Date().toISOString().slice(0, 16),
+    reported_at: nowLocalISO(),
```

The old value was naive UTC, which the server-timezone attach handled correctly
by accident. Replacing date-only UTC defaults with local ones was right. Doing it
to a **datetime** that is sent to a UTC server was not.

## The fix

Send an offset-aware value so the server never has to guess. Keep the input
displaying local time; only the wire format changes.

There are exactly two call sites, both on this page:
- `:169` `reported_at` on the incident form
- `:173` `conducted_at` on the toolbox talk form

Toolbox talks have no not-future validator, so they save but store a time 5.5
hours ahead. Both need the same treatment.

**Do not weaken the backend validator to make this pass.** A not-future check on
an incident timestamp is correct. If you change the backend at all, the only
acceptable change is to treat a naive datetime as the company timezone rather
than the server timezone, and that is a second-order improvement, not the fix.

**Closure standard (D-006):** write the test so it fails against the unfixed
tree at a named assertion, not at import. Assert that a client in a UTC+5:30
timezone can post an incident dated "now" and get 201.

# PART 2: Record Material Wastage always fails, and the failure white-screens the page

Two defects in one submit.

**2a.** `frontend/src/app/c/[company_id]/d/wastage/page.tsx:44` puts
`task_id: ""` in the form initial state. Nothing ever binds it to an input, and
`handleSubmit` spreads the whole form into the body. The backend declares
`task_id: Optional[uuid.UUID]` (`backend/app/routers/wastage.py:29`), so the
empty string fails UUID parsing on every request:

```
422 {"detail":[{"type":"uuid_parsing","loc":["body","task_id"],
     "msg":"Input should be a valid UUID, invalid length: expected length 32 ..."}]}
```

No wastage record can be created at all. Send `null` when there is no task, or
drop the key.

**2b.** The error branch at `:80` is

```ts
const err = await res.json();
setMessage(err.detail || "Failed to record wastage");
```

A FastAPI validation `detail` is an **array of objects**. Rendering it as a React
child throws minified error #31 and the whole route becomes
"This page couldn't load". I watched it happen.

Normalise the detail before it reaches state: a string stays a string, an array
becomes a joined list of `loc` and `msg`. **Sweep for the same pattern.** Any
`setX(err.detail)` or `{err.detail}` that can receive a 422 has this bug. Report
how many sites you found and how many you changed.

**2c.** While you are in this file: Material Name is a free-text input, so
wastage is recorded against a typed string and can never decrement stock. The
DPR modal already does this correctly, offering a dropdown scoped to on-hand
inventory with an "Available Stock" hint. Reuse that control here.

# PART 3: no project can be created through the UI

`POST /projects/` rejects every request the UI can send:

```
422 {"detail":"Project.state is required for invoicing - set the site state
     (GST state code or name) before creating invoices; place of supply
     derives from the site per IGST Act s.12(3)"}
```

The guard is `backend/app/routers/projects.py:376`. It is correct: place of
supply derives from the site.

**No project surface collects `state`.** A grep for it returns nothing relevant
in any of:
- `app/c/[company_id]/projects/page.tsx` (the 3-step wizard)
- `app/c/[company_id]/dashboard/page.tsx` (a second, thinner wizard:
  name, code, address, city, radius, teamMember)
- `components/ProjectSettingsModal.tsx` (so it cannot be fixed afterwards)

Both existing projects on this company have `state: null`, so `billing.py:1309`
and `crm.py:996` block invoicing on them too. Proof: the identical payload with
`state: "Uttar Pradesh"` returns 200.

## The fix

Add **State** to step 1 of the wizard beside City, and to `ProjectSettingsModal`
so existing projects can be corrected. Make it a select of the 36 GST states and
union territories, not free text, and validate against
`backend/app/gst_utils.py` `project_state_code`, which is what the backend checks.

Two more fields the wizard collects nothing for, in the same area:

- **`location`** (site coordinates). `projects.py:255` says this endpoint is the
  only supported way to place a site on the map. The wizard collects
  `attendance_radius_meters` (default 500) and never sends `location`, so the
  geofence has no centre and GPS attendance cannot evaluate. Add it.
- **Stage** and **Category** are free-text inputs, and the projects list filters
  on both. Free text fragments the filter. Make them selects.

# PART 4: the billing preview is not the number that gets stored

**Money, silent, roughly 1% every time, always in the subcontractor favour.**

I captured one submit end to end.

The browser sent:

```json
{"subtotal":200000,"gst_pct":18,"pre_tax_deductions":false,
 "deductions":[{"deduction_type":"TDS","amount":4000,"percentage":2},
               {"deduction_type":"Retention","amount":11800,"percentage":5}]}
```

The panel on screen read **TDS 4,000, Retention 11,800, GST 36,000, Net Payable 2,20,200**.

The backend stored **Retention 10,000, TDS 3,800, total_payable 2,22,200**.

The backend ignores every client-supplied `amount` and recomputes through
`_sequential_deduction_calc` (`backend/app/routers/billing.py:250`) against the
**GST-exclusive** subtotal: retention 5% of 200,000 = 10,000, then TDS 2% of the
remaining 190,000 = 3,800.

The frontend instead computes TDS on the full subtotal and retention on the
GST-**inclusive** total, and treats the two as independent.

Two divergences: the retention base, and the sequencing.

**The backend is right.** `billing.py:1487` says so deliberately: TDS under the
Income Tax Act is on the value of work, not on the GST component. So the fix
belongs in the frontend.

## The fix

Make the preview panel compute exactly what the backend will compute. The
cleanest way is to stop duplicating the rule: extract it once and use it in both
places, or have the preview call a dry-run endpoint. If you keep a client-side
copy, mirror `_sequential_deduction_calc` including the ordering flag.

Also fix two things that document the wrong rule:
- the on-screen note "Retention is computed on the GST-inclusive total"
- the stored deduction note, which reads "5% Post-tax retention" against an
  amount computed on a pre-tax basis

Note for the founder, not for you to change: the form **"Pre-Tax Deductions
Order"** checkbox sets `req.pre_tax_deductions`, which only moves the GST base.
Settings, Finance Controls, **"Pre-Tax Deduction/Retention"** sets
`Company.pretax_deduction_retention`, which decides whether TDS or retention is
computed first. Two controls, nearly the same name, different meanings.

While there: on the same page, the WO progress bar divides `billed_amount`
(GST-inclusive, net of deductions) by `estimated_work_amount` (exclusive).
WO-E2E-001 shows 37.3% for 420,000 of work against 1,250,000, which is 33.6%.
Compare like with like.

# PART 5: a required custom field on "bill" silently blocks all billing, and cannot be removed

`POST /billing/bills` returned
`422 {"detail":"Missing required custom field(s): ZZ R5 Number"}`.

The RA bill form renders no custom-field inputs at all, so the requirement can
never be satisfied from the UI.

Worse, the Custom Fields admin page offers only four entity tabs
(`app/c/[company_id]/d/custom-fields/page.tsx:214-217`: project, invoice, lead,
vendor) while the backend allows six
(`backend/app/routers/custom_fields.py:15`: project, task, bill, invoice, lead,
vendor). A required field on **bill** or **task** is invisible and unmanageable.
This one had been blocking every subcontractor bill on this company since
2026-07-27.

## The fix

- Add the two missing entity types to the admin page filter and to the
  create-field form.
- Render custom fields on the RA bill form, the way the projects wizard already
  does with `components/CustomFieldsSection.tsx`.
  `enforce_required_custom_fields` runs on **bill, invoice and project**; check
  all three surfaces render them, not just the one I hit.

I set `is_required: false` on that field via the API so the rest of the pass
could continue. The field still exists.

# PART 6: procurement dead ends

**6a. A Purchase Order cannot be raised to a supplier.**
The "Supplier Vendor" dropdown is fed by
`fetch(.../billing/subcontractors?company_id=...)`
(`app/c/[company_id]/d/procurement/page.tsx:169`) and keyed on
`company_team_id`. Live, the only two options were subcontractors. The Supplier I
registered in the Party Library ("Shakti Steel and Cement Traders", party_type
Supplier) does not appear. A material PO cannot name the material vendor.
Source it from the party master, filtered to supplier-ish types.

**6b. A short delivery strands the balance forever.**
Ordered 500 bags, received 450. PO went `sent` to `partial`, which is right. But
the Record GRN button is gated on `po.status === "sent"`
(`procurement/page.tsx:1065`), so it disappears at `partial` and the outstanding
50 bags can never be received. Short deliveries are the norm on site. Allow GRN
while `partial`, and stop it at `completed`.

**6c. Indents get no number and are never linked to the PO.**
The indent I raised through the UI stored `indent_number: ""`. Nothing generates
one, so it cannot be quoted to a vendor. GRN, NCR and RA bills all number
correctly; do the same here. The PO also stores `indent_id: null` and there is no
"convert indent to PO" action anywhere, so an approved requisition is re-keyed by
hand.

**6d. The indent list prints "By Site Engineer", then "By Auto-synced".**
`procurement/page.tsx:237`:
`requestedBy: ind.requested_by ? (teamById[...] || "Site Member") : "Auto-synced"`.
Stored `requested_by` was null even though the form dropdown lists real
members. Either persist the selection or stop printing a name for a null.

**6e. The unit is hardcoded "bags" everywhere in procurement.**
The indent form, the PO line label ("Quantity (bags)") and the stored PO item all
say bags whatever the material. Selecting "TMT Steel Bar Fe500D 12mm", whose
library unit is MT, still shows and stores bags. The library carries the UOM;
use it. Same for the DPR consumption row free-text unit.

**6f.** GRN-created inventory rows get `category: "Uncategorized"` although the
library material has a category.

# PART 7: payment requests cannot name the party you owe

The "Party Name*" dropdown in the payment-request drawer is populated from
`fetch(.../hr/employees/{projectId})` (`app/c/[company_id]/d/finance/page.tsx:428`,
stored in `usersList`). That is the employee directory. On a project with no
employees it renders the hint "No parties registered yet" while
`GET /finance/parties/{company}` returns 8 parties.

The same wrong source feeds two more selects at `finance/page.tsx:3832` and
`:3850`. Point all three at the party master.

Also: "Advance against Subcon Work Order" has a **free-text** "Work Order Ref"
prefilled `WO-1001`. The real WO-E2E-001 is not offered, so the advance is never
linked and cannot be recovered against later RA bills. Make it a picker.

# PART 8: equipment usage is never costed

Stop Deployment sends

```
PATCH /equipment/deployments/{id}/return
{"end_date":"...","remarks":"Stop reading: 4358. Photo Proof: false. GPS Lock: true"}
```

but `return_deployment` (`backend/app/routers/equipment.py:259`) takes **no
request body**. It sets `end_date = utcnow()` and returns. Verified: after a
completed deployment the record still reads `remarks: "Start reading: 4350..."`
and `hours_used: 0.0`. The excavator carries 1200 per hour and produces no cost.

Accept a body with the closing meter reading, compute `hours_used` from
`end_date - start_date`, and store start and stop odometer as **columns**, not
inside a free-text remarks string, so the Odometer Run Logs tab can compute
mileage.

# PART 9: smaller things, all observed

- **The project wizard discards your input on any failure.**
  `projects/page.tsx:628` is `if (res.ok) onCreated(); else onClose();`.
  The component already has a `formError` channel it uses at `:600`. Use it.
- **The DPR "Reported By" input is decorative.** I typed
  "Er. Ramesh Kumar (Site Supervisor)" and the backend stored
  "upadhyayprateek574". Either persist it or remove the field.
- **The DPR WBS Task select renders zero options** on a project with no plan.
  Not "no tasks found", an empty select. Add a disabled placeholder.
- **NCR cards print the literal "Site Zone".** `quality/page.tsx:248` hardcodes
  `zone: "Site Zone"`. My NCR is linked to an inspection zoned
  "Tower A, Floor 2, Grid C-D".
- **The inspection register prints a raw UUID for the inspector**, in the table
  and in the "INSPECTED BY" filter. `quality/page.tsx:227`.
- **An employee saves with no name.** My first POST sent `name: ""` and got 201.
  `basic_salary` also accepted 9,811,223,344 and `mobile` accepted the text
  "Civil". Add the obvious validation.
- **The payroll attendance sheet is read-only.** Rows are
  `<td>name</td><td><span>Absent</span></td>`. The filter chips promise
  Present, Absent, Paid Leave and Week Off, and nothing can set one. Marking
  happens only via GPS punch on `d/attendance`, so a crew without smartphones
  cannot be paid.
- **Two finance rows print raw enum values**, `expense` and `payment_in`, beside
  human labels like "Material Purchase" in the same column.
- **Copy:** the billing preview says "Calculated live according to IS-456
  standards" and the payroll table says "statutory deductions per IS code".
  IS 456 is the plain and reinforced concrete code. Neither has anything to do
  with GST, TDS or PF. Also at `quality/page.tsx:871`. Reword by hand.
- **Currency grouping:** the Work Orders table renders 1,250,000 where the
  rest of the product renders 2,62,400.00. Indian grouping is 12,50,000.
- **Raw ISO dates** still render on the PO rows ("Date: 2026-09-02, Exp:
  2026-09-12"), the Work Orders table, the inspection register and the daily
  attendance heading, while the rest of the product shows "02 Sept 2026".
- **Party Type** offers 3 values on the create form (Supplier, Subcontractor,
  Client) and 7 in the filter. Four filter values can never match.
- **Duplicate party IDs.** The library shows PID-1, PID-2, PID-2, PID-4, PID-5,
  then two parties with no ID. `next_party_id_custom` (`library.py:332`) is not
  collision-safe. Parties were missed by the earlier GRN/NCR/WO numbering fix.
- **Phantom columns.** Material Library has CREATOR NAME and ALTERNATE UOM;
  `LibraryMaterial` has no creator field and there is no alternate-unit input
  anywhere. Meanwhile GST rate, standard cost, lead time and HSN are all
  captured and stored and never displayed.
- **`GET /projects/company/{id}/members` 404s**, which is why step 3 of the
  wizard says "No members found" for every company. The members exist; other
  screens list them. `check_route_reachability.py` reports 0 unreachable, so it
  has a blind spot here. Say what the blind spot is.
- **A11y:** the eye and download controls on the Reports hub are bare `<svg>`
  elements with no button wrapper, so they are not keyboard reachable.

# What is working, so you do not churn it

- The GRN to inventory to DPR to stock report chain is correct end to end.
  450 received, 200 consumed, 250 on hand, and the Material Stock Report agrees.
- PO arithmetic, RA bill arithmetic in post-tax mode, employee CTC
  (49,000 gross plus 3,840 employer PF = 52,840).
- Sequential numbering for GRN, NCR and RA bills.
- Quality inspection checkpoint capture and the PARTIAL status, NCR kanban.
- The equipment deploy and return state machine. Only the costing is missing.
- One DPR per project per day is enforced with a 409.
- Empty states on a fresh project, the wastage Type dropdown, and the leave tab
  gating are all correct after the recent fixes.

# Rules

- No authoring scripts.
- Do not weaken any backend validator to make a frontend bug pass.
- Do not touch the marketing help article JSON `body` fields.
- No em dashes in prose you write.
- Do not create records in the founder production data. AK Construction is the
  test company; the project `E2E Audit Tower A` (E2E-001) is mine and safe to use.

# Definition of done

- [ ] Part 1: an incident posted from a UTC+5:30 client at "now" returns 201.
      Test fails on the unfixed tree at a named assertion. Say what it printed.
- [ ] Part 2: wastage records successfully; a forced 422 renders a readable
      message instead of blanking the route. Report how many `err.detail`
      render sites you found and fixed.
- [ ] Part 3: a project is created through the wizard with State and location,
      and an existing project state can be set from ProjectSettingsModal.
- [ ] Part 4: the preview figure equals the stored figure for both deduction
      orders. Show the two numbers for 200,000 at 18% GST, 2% TDS, 5% retention.
- [ ] Part 5: custom fields render on the RA bill form; the admin page lists
      bill and task.
- [ ] Part 6: a PO can name a Supplier; a partial PO accepts a second GRN;
      indents get numbers.
- [ ] Part 7: payment requests list parties, not employees.
- [ ] Part 8: hours_used and a stop odometer are stored after a return.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` fully green,
      passed and skipped counts reported.
- [ ] `cd frontend && npx tsc --noEmit` and `npm run build` both clean.
- [ ] `python scripts/verification/check_route_reachability.py` 0 unreachable.
- [ ] Commit and push to `origin/main`.
