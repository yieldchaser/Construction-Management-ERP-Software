# AGENT PROMPT: work order editing, the dead consumption path, and records that cannot be corrected

Five parts, one run, in order. **Part 2 is the most serious thing found so far and should be treated as the priority even though Part 1 comes first for continuity.**

These came from four systematic sweeps run after the last verification, not from spotting things one at a time:

1. Resources with create but no update or delete.
2. Request-schema fields the frontend never sends.
3. Tenant-scoped models queried without a tenant filter.
4. Hardcoded empty structural payloads.

Sweep 3 came back **clean**: the User Activity Leaderboard was the only name-matched unscoped query and it is fixed. The rest of this file is what sweeps 1, 2 and 4 turned up.

---

# PART 1: work orders cannot be edited

The founder has decided work orders should be editable.

`billing.py` exposes `GET`, `POST` and `cancel` for work orders. There is no `PUT` or `PATCH`, so a work order created with the wrong subcontractor, date, terms or line items can never be corrected. Until the last run it could not even be given line items.

## Build

**1.1 Backend.** Add `PUT /apis/v3/billing/work-orders/{wo_id}` accepting the same shape as `WOCreateRequest` minus the identifiers that must not move (`company_id`, `project_id`). It must:

- Reject a work order that is already cancelled, with 409 and a clear message.
- Replace the line items wholesale and **recompute `estimated_work_amount` with the same expression `create_work_order` uses**, `sum(item.quantity * item.rate for item in req.items)`. Do not duplicate that arithmetic; extract it into one helper used by both create and update so they cannot drift.
- Enforce the same permission the create path enforces.

**1.2 Guard against editing a billed work order.** Bills reference a work order through `Bill.wo_id`, and `_compute_wo_billing` measures billed amount against `estimated_work_amount`. If the value changes after bills exist, previously computed progress becomes retrospectively wrong.

**Decision: allow the edit, but block it once any non-cancelled bill references the work order.** Return 409 with a message saying the work order has been billed against and must be revised through a new work order instead. This is the honest construction answer: an amended subcontract with money already paid against it is a variation, not an edit.

**1.3 Frontend.** Add an edit action on the work order row in both `d/subcon/page.tsx` and `p/[project_id]/subcon/page.tsx`, opening the same drawer the create flow uses, pre-filled. Hide the action on a cancelled work order, and surface the 409 message when the work order has been billed.

**1.4 Tests.** A test that edits a work order and asserts `estimated_work_amount` is recomputed from the new items, and a test that a work order with a live bill returns 409. **Watch both fail before the endpoint exists** and paste the failures.

---

# PART 2: material consumption cannot be recorded, so stock never moves

## The defect

`DPRCreateRequest` accepts `materials_consumed: List[MaterialConsumptionSchema]`. In `create_dpr` that list is what:

- decrements `WarehouseInventory.on_hand_qty`,
- writes the `MaterialTransaction` ledger rows,
- and calls `release_reservation` to free stock held by an approved indent.

**No frontend file sends `materials_consumed`. Zero occurrences across the whole of `frontend/src`.** The DPR create payload carries `project_id`, `task_id`, `reported_by`, `dpr_date`, `executed_qty`, `workers_deployed`, `weather` and `notes`, and nothing else.

So the daily progress report, which is the primary site record, **cannot record what materials were used.** Consequences:

- Site consumption never reduces warehouse stock. On-hand only ever moves through GRN receipt and the manual transactions screen.
- The material transaction ledger has no entries from daily reporting.
- **The entire inventory reservation release path is unreachable in practice.** Two full runs were spent building and verifying `release_reservation`, `rereserve_reservation` and the DPR delete reversal. All of it is correct, tested, and cannot be triggered by a user.
- The DPR page's own "Material Used Today" tile can only ever read "No consumption logged", which is exactly what the founder is seeing.

This is the largest gap found so far, and it is invisible to every check the project has: the backend tests pass because they post `materials_consumed` directly, and the reachability gate passes because `POST /dpr` is called.

## Build

Add a materials section to the DPR create form in `d/dpr/page.tsx`: a repeatable row of material, quantity and unit, posted as `materials_consumed`. **Read `MaterialConsumptionSchema` first and match it exactly.**

The material selector must come from the same source the procurement screens use, with the `FieldHint` rule when it is empty. Show the current available stock for the selected material where the page can already get it, so a site engineer sees what they are drawing against.

`enforce_stock_availability` may reject the DPR when the company has the stock guard enabled and the quantity exceeds `on_hand - reserved`. That error must be surfaced through `readErrorDetail`, because its message is the useful one: it names on hand, reserved, available and requested.

**Verify this end to end and report it step by step:** approve an indent so stock is reserved, post a DPR consuming some of that material, and show that `on_hand_qty` fell, `reserved_qty` fell, a `MaterialTransaction` row was written, and the DPR page's material tile now reads something other than "No consumption logged". Then delete the DPR and show all three reverse.

---

# PART 3: purchase order lines carry no tax and no delivery date

`POCreateItemSchema` accepts `tax_pct`. The backend uses it six times, including in the line `total_amount`. **No form collects it**, so every purchase order line is created at the default and PO totals carry no GST. For an Indian construction business that is a wrong number on a document sent to a supplier.

`POCreateRequest` accepts `expected_delivery_date`, also never sent, so a PO carries no delivery commitment and nothing downstream can chase a late delivery.

Add both to the PO modal in `d/procurement/page.tsx`: a `tax_pct` field per line item, defaulting to the company's usual rate if the settings expose one and otherwise to a plain editable number, and an expected delivery date on the PO. Show the tax and the gross total in the modal's running total so the number the user sees matches the number that gets stored.

**Check the existing PO total display afterwards.** If it currently shows a total computed without tax, it must now agree with the backend.

---

# PART 4: five more fields the API accepts and no form sends

Each is a one-field gap that breaks a link or loses information. Add each to the form that creates the record, matching the field's schema.

| Field | Schema | Why it matters |
|---|---|---|
| `inspection_id` | `NCRCreate` (`quality.py`) | An NCR raised from a failed inspection cannot be linked to it, so the quality trail breaks at the point it matters. Pre-fill it when the NCR is raised from an inspection. |
| `received_by` | `GRNCreateRequest` | Nobody is recorded as having received the goods. |
| `requested_by` | `IndentCreateRequest` | Nobody is recorded as having raised the indent. |
| `hours_used` | `DeploymentCreate` (`equipment.py`) | Equipment hours are the basis of utilisation and hire cost. |
| `tagged_user_id` | `PinCreateRequest` (`drawings.py`) | A drawing pin cannot be assigned to anyone, so markups have no owner. |

For `received_by` and `requested_by`, default to the signed-in user and let it be changed, rather than making it a required blank.

Also in this class but **left alone deliberately**, so do not build them and do not report them as missed: `aadhaar_file` and `pan_file` on `PartyCreate` (file upload for KYC documents is a larger piece of work), and `pf_wage_ceiling` and `assume_full_month_when_no_attendance` in payroll settings (statutory payroll configuration needs the founder's input on defaults before it is exposed).

---

# PART 5: master data that can be created and never corrected

A sweep of every resource found **65 with create but no update, no delete, or neither.** Many of those are correct, so this part builds only the ones where being unable to correct a record is indefensible.

## Build update for these master registers

All of these already have `GET`, `POST` and `DELETE`, and are missing only `PUT`. They are reference data that a company maintains, and a typo in one currently means deleting and recreating, which breaks anything already pointing at it.

```
library/materials          library/parties            library/rates
library/cost-codes         library/asset-types        library/deductions
library/progresses         library/retentions         library/todos
library/workforces         library/material-categories
equipment                  files/folders (rename)
```

`equipment` is the sharpest one: an equipment record cannot be edited at all, so a wrong registration number or hire rate is permanent.

## Build update and delete for these

These have only `GET` and `POST`, so records are permanent from creation:

```
hr/designations            crm/lead-statuses          crm/lead-sources
crm/lead-categories        quality/checklists         finance/accounts
finance/cash-account       billing/subcontractors     custom-fields/fields
tally/agents               tally/connections          tally/mappings/bank
tally/mappings/party       tally/mappings/ledger      tally/mappings/cost-centre
```

## Build delete for these

```
hr/employees      (offboarding is impossible today)
planning/tasks    planning/projects    settings/branches
```

For `hr/employees`, prefer a deactivate flag over a hard delete if the model already carries one, since payroll history must survive. **Read the model before choosing**, and say which you did and why.

## Correct as they are. Do not add update or delete to these.

- **`labour/muster-roll`.** A statutory register is a point-in-time attestation and is frozen at write time on purpose, per finding R2-333. Re-posting the same project, contractor, day and role updates it in place, which is the intended correction path. **Do not make it editable.**
- **`procurement/transactions`.** A stock ledger is append-only. Corrections happen with a reversing entry, not an edit.
- **`assets/entries`.** Depreciation entries are derived from a schedule.
- **`public/leads`.** Submissions from the public site are records of what was submitted.
- **`billing/bills`, `procurement/pos`, `procurement/indents`, `procurement/grns`, `billing/work-orders`.** Financial and procurement documents already have a cancel or amend path, or get one in Part 1. Do not add a raw delete to any of them.

## Frontend

Every new update and delete needs a UI control on the register it belongs to, with a confirmation on delete and the API error surfaced through `readErrorDetail`. Where a register has no screen at all, say so rather than building a new page in this run.

---

# Rules

The standing rules from the previous prompts apply in full. The ones that matter most here:

- **Do not change existing backend behaviour.** You are adding endpoints in Parts 1 and 5, which is explicitly authorised. Everything else is UI wiring. Do not modify a working endpoint's semantics.
- Every new endpoint enforces the same permission and tenant checks as its sibling create endpoint. Copy the pattern from the create handler in the same file; do not invent a new one.
- Every write branches on `res.ok` and surfaces `readErrorDetail`. A `catch` alone is not error handling.
- `PageHeader` action slot, `Badge`, `EmptyState`, `FieldHint`, `Icon` from the closed 120-name union.
- Semantic tokens only. No raw palette, gradients, hex, `hover:bg-white/N`, control glyphs, emoji, inline shadows.
- Plain language in UI copy. No endpoint paths, table names or permission keys. No em dashes.
- **No authoring scripts.** Edit in place.

---

# Definition of done

Report a measured number with the command that produced it for every line.

- [ ] Work orders editable, value recomputed by a **shared** helper used by both create and update, 409 when bills exist. Both tests watched failing first, failures pasted.
- [ ] DPR records `materials_consumed`. **The full end-to-end walk from Part 2 reported step by step**, with the before and after numbers for `on_hand_qty` and `reserved_qty`, and the same for the delete reversal.
- [ ] `grep -rn "materials_consumed" frontend/src` returns a non-zero count.
- [ ] PO lines carry `tax_pct` and the PO carries `expected_delivery_date`. The modal total and the stored total agree; show both for one PO.
- [ ] All five Part 4 fields sent by their forms. The two excluded groups untouched.
- [ ] Part 5: count of endpoints added, by verb. Every one enforces the same permissions as its create sibling.
- [ ] The five immutable resources untouched. Confirm `labour/muster-roll` has no new update endpoint.
- [ ] `python scripts/verification/check_route_reachability.py` still reports **0 unreachable**, and the new endpoints are reachable. The exemption file stays at 30 entries.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is 1129 passed, 4 skipped today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` clean and `npm run build` completes. **Run both. The last run skipped the build and reported success anyway.**
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13.
- [ ] **Commit and push to `origin/main`** at part boundaries.

## On reporting

The last two runs produced good code and inaccurate reports. Three endpoint paths were described wrongly, an "18% GST" feature was described that does not exist in the code, and five Definition of Done items were skipped while the run was reported complete.

**Describe only what you actually did, quote paths from the code rather than memory, and if you skipped a check, say so.** An honest gap costs one follow-up. A wrong report costs a full re-verification of everything.
