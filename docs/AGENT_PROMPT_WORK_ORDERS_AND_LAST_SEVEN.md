# AGENT PROMPT: work orders are a shell, and the last seven endpoints

Two things in one run. Part 1 is the more serious and goes first.

The previous run built 30 orphan endpoints and left 10 unreachable, describing seven of them as "backend helpers". They are not helpers, they are features, and they are built below. While verifying that run I also found that **work orders have the same defect RFQ had**, which is what Part 1 is about.

---

# PART 1: every work order in the system has no scope and zero value

## The defect

`POST /apis/v3/billing/work-orders` takes `items: List[WOItemSchema]`, where each item is `{boq_item_id?, task_id?, quantity (>=0), rate (>=0)}`. That is how a subcontract is expressed: specific BOQ lines or tasks, at agreed quantities and rates.

**All three places the UI creates a work order post `items: []` hardcoded:**

```
frontend/src/app/c/[company_id]/d/subcon/page.tsx:335
frontend/src/app/c/[company_id]/p/[project_id]/subcon/page.tsx:138
frontend/src/app/c/[company_id]/d/finance/page.tsx:1150
```

The create form collects **only a date and a subcontractor**. And in `create_work_order` at `billing.py:404`:

```python
estimated_amount = sum(item.quantity * item.rate for item in req.items)
```

With no items that sum is **zero**. So every work order ever created through this product has `estimated_work_amount = 0`, no line items, and therefore a meaningless billed amount and no computable physical progress. The Subcontractor Management table renders Work Order Value, Billed Value and Physical Progress columns that are structurally incapable of showing anything.

**There is no repair path.** The router has `GET`, `POST` and `cancel` only. No `PUT`, no `PATCH`. Items can be set at creation and never afterwards.

This is the same defect as the RFQ shell, one layer down, and it matters more: a work order is the contract with a subcontractor and the basis for every running account bill against them.

## Build

**1.1 Line items in the work order form.** Give the create drawer a repeatable item row, matching the PO modal's "Add Item Line" pattern at `d/procurement/page.tsx`. Each row needs a **BOQ item or task selector**, a quantity and a rate, with a running total showing what `estimated_work_amount` will be. Both `boq_item_id` and `task_id` are optional individually, but a line referencing neither is meaningless, so require one of the two. Apply the `FieldHint` rule when the BOQ or task list is empty.

Do this on **both** subcon pages. `d/subcon` and `p/[project_id]/subcon` are near-duplicates and have drifted before.

**1.2 Terms.** Both subcon forms post `terms: ""`. The backend has `get_default_terms(db, company_id, ...)` and the PO modal already pre-fills from company defaults. Pre-fill work order terms the same way and let the user edit.

**1.3 The finance side door.** `d/finance/page.tsx:1150` silently creates a work order when a party is added with `create_wo` ticked. A work order created there gets no items either. **Do not add an item editor to the party modal.** Instead, after the party is created, open the work order drawer pre-filled with that party so the user completes it deliberately. If they dismiss it, no work order is created. A silently created, valueless contract is worse than none.

**1.4 Cancel.** `POST /billing/work-orders/{wo_id}/cancel` is one of the seven unreachable endpoints and belongs here. Add it to the work order row with a confirmation naming the WO number. Read its guards first and show it only where it is legal.

**1.5 Existing rows.** Work orders already created are permanently valueless and cannot be edited, so once cancel exists the only remedy is to cancel and recreate. **State this in your report with a count of how many work orders currently have `estimated_work_amount = 0`.** Do not write a data migration and do not add a `PUT` endpoint; whether work orders should be editable at all is a product decision for the founder, and I want it raised, not silently made.

---

# PART 2: the bill lifecycle

## 2.1 Retention release

```
POST /billing/bills/{bill_id}/deductions/{deduction_id}/release
body: {released_amount?: float > 0}   # omit for a full release
```

The endpoint's own docstring explains the feature: retention is withheld from a subcontractor and released back later, typically half at practical completion and half after the defect liability period, which is why partial release is supported. Only Retention deductions on non-cancelled bills may be released; TDS and other deductions are remitted to authorities and must never be releasable.

**Today there is no way to release retention at all.** Money is withheld with no control to give it back.

Add a release action on retention deductions in the bill detail view. Offer full release by default and allow a partial amount. Show how much of the retention is still outstanding, so a user releasing the second half can see what remains. Never show the action on a non-retention deduction or a cancelled bill.

## 2.2 Bill cancel

```
POST /billing/bills/{bill_id}/cancel
```

Unreachable. Add it to the bill row and detail view with a confirmation naming the invoice number and amount. Read the guards and show it only where legal. This is money, so the confirmation must be explicit about what is being cancelled.

## 2.3 Invoice numbers are typed by hand

```
GET /billing/next-number/{company_id}?invoice_type=purchase
returns {"invoice_number": "..."}
```

Built for form pre-fill and never called, so users invent invoice numbers themselves and the sequence the backend maintains goes unused.

Call it to pre-fill the invoice number whenever a bill form opens, passing the correct `invoice_type` for the form in question. Leave the field editable, because a user entering a supplier's own invoice number must be able to override it.

---

# PART 3: a quotation cannot become an invoice

```
POST /crm/quotations/{quotation_id}/convert-to-invoice
body: {project_id, party_company_user_id, invoice_number?}
returns {bill_id, invoice_number, quotation_id, subtotal, ...}
```

Finding R2-360 built this so a won quotation becomes a sale invoice instead of being re-keyed by hand in Billing. It carries the quotation's own arithmetic across, including the full CGST plus SGST plus IGST split, because an inter-state quotation stores the whole tax in `igst_amount` and zeroes the other two. The itemised lines survive into the bill.

Nothing calls it. So today a user who wins a quotation retypes the whole thing into Billing, and any typo silently changes the tax.

Add a "Convert to Invoice" action on a quotation in `d/crm/page.tsx`. It needs a project and a party, so collect both in a small dialog rather than guessing. Leave `invoice_number` empty so the backend generates it, or pre-fill from `next-number` per Part 2.3. On success, tell the user the invoice number that was created and offer to open it in Billing.

---

# PART 4: two smaller ones

**4.1 Tower committed budget.** `GET /budget/committed/{project_id}/towers` returns a `TowerBudgetBreakdown` per tower, falling back to the project budget totals when a project has no towers. Surface it on the budget view as a per-tower breakdown. Handle the no-towers case as the endpoint itself does rather than showing an empty table.

**4.2 Equipment expense PDF.** `GET /equipment/expenses/{bill_id}/pdf` renders an equipment expense bill and nothing reaches it. Add a download action on the equipment expense row, matching how other document downloads on that page behave.

---

# PART 5: the three that stay unreachable

Add these to `scripts/verification/reachability_exemptions.txt` with their reasons, so the gate reads clean and the decision is recorded rather than hidden:

```
POST /face/punch                              biometric kiosk device endpoint, called by terminal hardware
GET  /face/employees/{company_id}             biometric kiosk enrolment list, called by terminal hardware
GET  /admin/pos-would-change/{company_id}     operator dry-run, same class as the admin migration endpoints
```

**Nothing else goes in that file.** After this run the gate must report zero unreachable routes outside the exemption list.

---

# Rules

All standing rules from `AGENT_PROMPT_ORPHAN_FEATURES.md` still apply and are not repeated in full. The ones that matter most here:

- `PageHeader` action slot, `Badge`, `EmptyState`, `FieldHint`, `Icon` from the closed 120-name union.
- Every write branches on `res.ok` and surfaces `readErrorDetail`. A `catch` alone is not error handling, because `fetch` resolves normally on a 4xx.
- Semantic tokens only. No raw palette classes, gradients, hex, `hover:bg-white/N`, control glyphs, emoji, or inline shadows.
- Plain language. No endpoint paths, table names or permission keys in UI copy. No em dashes.
- **No authoring scripts.** Edit in place.
- **Do not change backend behaviour.** Every endpoint here works and is covered by the suite. If one genuinely cannot be used as written, report it rather than rewriting it.

---

# Definition of done

Report a measured number with the command that produced it for every line.

- [ ] All three work order creation paths send real line items. `grep -rn "items: \[\]" frontend/src/app/c` returns 0.
- [ ] A work order created through the UI has a non-zero `estimated_work_amount`. Show the value you created and the total the form displayed.
- [ ] Count of existing work orders with `estimated_work_amount = 0`, reported, with no migration written.
- [ ] Work order terms pre-fill from company defaults.
- [ ] The finance party modal no longer creates a work order silently.
- [ ] Retention release works for a full and a partial release, and is not offered on TDS deductions or cancelled bills. Say which cases you checked.
- [ ] Bill cancel and work order cancel reachable, guarded, confirmed.
- [ ] Invoice number pre-fills from `next-number` and stays editable.
- [ ] Quotation converts to an invoice, and the resulting bill carries the quotation's subtotal and full tax split. Report the numbers from one conversion you performed.
- [ ] Tower committed budget and equipment expense PDF reachable.
- [ ] `python scripts/verification/check_route_reachability.py` reports **zero unreachable outside the exemption list**, with the exemption file at 30 entries.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is 1129 passed, 4 skipped today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` clean, `npm run build` completes.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13.
- [ ] **Commit and push to `origin/main`**, committing at part boundaries.

If a part cannot be finished, stop at a boundary, push what is done, and say plainly which endpoints are still unreachable. **Do not describe a feature as built when its endpoint is still unreachable, and do not reclassify a feature as a helper to close a part.** That happened last run and it is the one thing this prompt exists to prevent.
