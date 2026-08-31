# AGENT PROMPT: build every orphan capability in the product

## What this run is

I mapped all **472 backend routes** against every frontend file. **83 cannot be reached from any screen.** Ten of those are legitimately headless. The other **73 are working, tested backend capability that no user can reach.**

The founder's decision is: **everything gets built.** There is no triage in this run, no "defer to post-launch", and no removing a feature instead of surfacing it. If a route is in the build list below, it gets a real UI.

This is a large run. It is organised into 13 parts by area. **Work them in order.** If you run out of room, stop at a part boundary with everything committed and pushed, and say exactly which parts are done and which are not. **Do not report a part complete unless its endpoints are actually reachable.** Every previous run in this project has over-reported at least once; this prompt is built so that cannot pass.

## The pattern behind all of it

Features here were built backend-first and the UI stopped at the happy path. Create works nearly everywhere. Approve usually works. **Reject, cancel, close, delete, and the second half of every multi-step flow is where it dies.** Keep that in mind: when you build one of these, check whether its siblings exist too.

---

# Rules that apply to every part

**Reuse what exists. Do not invent new patterns.**

- Primary page action goes in the `PageHeader` action slot (`components/PageHeader.tsx`, `action` prop). `d/wastage/page.tsx` is the reference. On a tabbed page the action follows the active tab.
- Status pills are `<Badge tone="...">` from `components/ui/Badge.tsx`. Never hand-roll a pill. Never use a solid fill with white text.
- Empty lists use `<EmptyState>` with a CTA when the list can be filled, and no CTA when it is derived or an audit trail.
- An empty required dropdown gets a `FieldHint` under it pointing at where that record is created.
- Icons come from the closed 120-name union in `components/marketing/Icon.tsx`. **A name outside the union fails `tsc`.** If no icon fits, use text.
- **Every write surfaces its error**: branch on `res.ok`, use `readErrorDetail` from `lib/api.ts`, and show the message through the mechanism that page already uses. A `catch` alone is not enough, because `fetch` resolves normally on a 4xx.
- Semantic tokens only. No raw Tailwind palette classes, no gradients, no hex, no `hover:bg-white/N`.
- No unicode glyphs as controls. No emoji.
- Shadows only on genuinely floating elements.
- Plain language in everything a user reads. **No endpoint paths, table names, column names or permission keys in UI copy.** No em dashes.

**Do not write a script that authors or rewrites files.** Every fabrication in this repository's history came from one. Checking scripts are required and welcome; authoring scripts are banned. Edit in place.

**Do not change backend behaviour** unless a part below explicitly says to. These endpoints work and are covered by 1115 passing tests. You are building the UI that reaches them. If an endpoint genuinely cannot be used as written, say so in your report rather than rewriting it.

---

# PART 0: build the reachability gate first

Before building anything, create `scripts/verification/check_route_reachability.py`. Every later part is measured with it, and it becomes a permanent gate against new orphans.

It must:

1. Parse every `@router.<method>("<path>")` in `backend/app/routers/*.py`, prefixing each with its `APIRouter(prefix=...)`.
2. Search all of `frontend/src/**/*.{ts,tsx}` for each route, treating `{param}` as a wildcard segment.
3. **Tolerate interpolated segments.** A call written `` `/hr/timesheets/${tsId}/${action}` `` reaches `/hr/timesheets/{ts_id}/approve`. Without this the script produces false positives; it cost me a wrong finding when I first wrote it.
4. Read its exemption list from a file, `scripts/verification/reachability_exemptions.txt`, one route per line with a reason. Seed it with the ten exemptions in Part 13.
5. **Self-test before reporting**, the way `verify_help_claims.py` does: assert a known-unreachable route is flagged and a known-reachable route is not. Print `[self-test]` lines. Exit non-zero if either fails, and never print a result from an unverified tool.
6. Print the total route count, the reachable count, the unreachable count, and every unreachable route with its method, path and file.

Report its output **before** you start Part 1. That is your baseline and it must read 472 routes with 83 unreachable, or you must explain the difference.

---

# PART 1: RFQ is a shell. Make it a feature.

This is the founder's own example and the clearest case in the product.

**What exists:** 7 backend endpoints, a clean `draft → sent → closed` state machine, and a comparison endpoint that already computes lowest rate, highest rate, price spread and a recommended vendor per line item.

**What the UI does:** lists RFQs, creates one, and renders a comparison table.

**Why it is a shell:** the create form has **exactly one input, the RFQ number**, and posts `items: []` hardcoded (`rfq/page.tsx:93`). So an RFQ has no line items. The comparison endpoint loops over `RFQItem` rows, so with no items it always returns an empty list and the comparison table never renders. And `POST /rfq/{id}/quotes` is unreachable, so **no vendor quote can ever be entered.** The thing being compared cannot be created.

## Build

**1.1 Line items in the create form.** `RFQItemCreate` is `{material_name, quantity (>=0), unit, specifications?}`. Give the create drawer a repeatable item row exactly like the PO modal's "Add Item Line" at `d/procurement/page.tsx`. Material comes from the same materials source the PO modal uses, so apply the `FieldHint` rule when it is empty. Stop sending `items: []`. Also expose `notes` and let the user set `valid_until` instead of silently defaulting to seven days from now.

**1.2 Quote entry.** `POST /rfq/{rfq_id}/quotes` takes `{vendor_id?, vendor_name, item_id, quoted_rate (>=0), delivery_days?, terms?, validity_days (default 30)}`. Add an "Enter Quote" action on an RFQ, opening a drawer that lists the RFQ's line items and lets the user record one vendor's rate per item. Vendors come from the same source as the PO vendor dropdown, with `vendor_name` kept for vendors not in the register.

**1.3 Send and close.** `POST /rfq/{id}/send` moves `draft → sent` and 409s otherwise. `POST /rfq/{id}/close` moves `sent → closed` and 409s otherwise. Show each action only in the state where it is legal, so the user never sees a button that will 409.

**1.4 Delete.** `DELETE /rfq/{rfq_id}` exists and is unreachable. Add it with a confirmation.

**1.5 Surface the comparison properly.** The table currently renders only when `comparison.length > 0`. Once items exist but no quotes have arrived, show an `EmptyState` explaining that quotes have not been entered yet, with the Enter Quote action. Show `lowest_rate`, `highest_rate`, `price_spread` and mark `recommended_vendor_name`. The backend computes all four and the UI ignores them today.

---

# PART 2: the statutory returns nobody can reach

Three complete return generators, roughly 90 lines each, with no UI. For an Indian construction company these are the filings the business actually has to produce.

| Route | Query parameters |
|---|---|
| `GET /statutory/{company_id}/gstr1` | `month` (1-12), `year` (>=2020) |
| `GET /statutory/{company_id}/pf-ecr` | `month` (1-12), `year` (>=2020) |
| `GET /statutory/{company_id}/tds-26q` | `quarter` (Q1-Q4), `year` (>=2020) |

Each returns a JSON object. `d/statutory/page.tsx` exists and calls only the generic report list and file endpoints.

Add a section to that page with a period selector (month and year for the first two, quarter and year for TDS) and a generate action per return. Render the returned data as a readable table, and offer a CSV download built client-side from the same data so a filing clerk can hand it to their accountant. **Read each endpoint's actual response shape before designing its table. Do not guess at column names.**

Note the access rule already in the code: a payroll clerk must not read the GST return, and finance must. Respect the permissions the endpoints already enforce; do not weaken them, and hide an action the current user cannot perform rather than letting it 403.

---

# PART 3: a purchase order can be approved but never rejected, cancelled or closed

```
POST /procurement/pos/{po_id}/reject
POST /procurement/pos/{po_id}/cancel
POST /procurement/pos/{po_id}/close
```

All three exist, all three are unreachable. The approve path is wired. This is the "second half of the flow is missing" pattern in its purest form.

Add the three actions to the PO row and detail view in `d/procurement/page.tsx`, next to the existing approve action. Read each endpoint's guards first: cancel and close are terminal, reject 409s on an already cancelled or closed PO, 400s on one already fully approved or already rejected, and 403s when the caller is not a configured approver. **Show each action only where it is legal**, and surface the endpoint's own message when it refuses.

Cancelling a PO is destructive and irreversible. Use a confirmation dialog naming the PO number, in the style of the indent cancel confirmation already on that page.

---

# PART 4: seven library sub-registers with no screen

Full CRUD exists for seven registers and none has a UI. `d/library/page.tsx` only touches materials, parties and rates, and carries a comment naming these as intended.

| Register | Create shape |
|---|---|
| Asset types | `{name}` |
| Deductions | `{name}` |
| Progresses | `{name}` |
| Retentions | `{name}` |
| Todos | `{name}` |
| Material categories | `{name, parent_id?}` |
| Party balances | read-only, `GET /library/parties/{company_id}/balances` |

Five of these are an identical `{name}` register. **Build one reusable component** for a simple named register (list, add, delete, empty state) and use it for all five. Do not write five near-identical blocks. Material categories needs the same component plus a parent selector, since it is hierarchical. Party balances is a read-only table.

Also wire the unreachable `GET` and `DELETE` for **rates**, which is partially wired today: the page reads rates but cannot delete one.

Add these as tabs or sections on the existing Library page. **Do not create new routes or new pages.**

---

# PART 5: planning

```
GET    /planning/tasks/hierarchy/{project_id}
PUT    /planning/milestones/{milestone_id}
DELETE /planning/milestones/{milestone_id}
POST   /planning/tasks/{task_id}/set-baseline
```

Milestones can be created and never edited or deleted. Add edit and delete to the milestone list in `d/planning/gantt/page.tsx`, with a confirmation on delete.

`set-baseline` and the task hierarchy endpoint are also unreachable. The Gantt already has a baseline concept, so wire set-baseline to the task row. Use the hierarchy endpoint where the page currently derives structure itself, if it does; if the page has no use for it, say so in your report rather than forcing it in.

---

# PART 6: finance

```
GET    /finance/ledger?project_id=...
DELETE /finance/payments/{payment_id}
```

The ledger endpoint merges payments and bills into one chronological transaction view and nothing reaches it. Add it as a tab or section on the finance page.

Payment delete is unreachable. Note that the backend already reverses the bank posting and decrements `paid_amount` on delete, so the accounting is handled; you are adding the control, not the logic. Confirmation dialog naming the amount and party, since this moves money in the books.

---

# PART 7: the missing deletes

Each of these can be created and never removed:

```
DELETE /production/recipes/{recipe_id}
DELETE /projects/{project_id}/members/{member_id}
DELETE /subcon/attendance/{att_id}
DELETE /subcon/performance/{record_id}
GET    /subcon/attendance/{project_id}/{date_str}
```

Add a delete control to each corresponding list, with a confirmation dialog. The subcon attendance GET is a by-date lookup; wire it to a date filter on the subcontractor attendance view.

**Be careful with attendance.** Deleting an attendance record alters a statutory-adjacent record. The confirmation must say plainly what is being removed and for which date.

---

# PART 8: quality

```
GET /quality/inspections/{insp_id}/responses
```

An inspection's checklist responses cannot be viewed. Surface them in the inspection detail view on `d/quality/page.tsx` and the project-scoped twin at `p/[project_id]/quality/page.tsx`. **Both pages must be updated; they are near-duplicates and have drifted before.**

---

# PART 9: vendor performance refresh

```
POST /procurement/vendors/performance/{project_id}/refresh
```

Vendor scorecards are computed by this endpoint and nothing triggers it, so the scorecards a user sees are only ever as fresh as whatever last wrote them. Add a refresh action to the vendor performance view with a busy state, and re-read the scorecards on success.

---

# PART 10: Tally integration is half-wired

```
POST /tally/agents
GET  /tally/agents
POST /tally/mappings/bank
GET  /tally/mappings/bank
POST /tally/unmark-synced
```

The finance page already uses several Tally endpoints and the dashboard shows a Tally agent key with a copy control, so the integration is real and partially surfaced. These five are not reachable: an agent cannot be registered or listed, bank ledger mappings cannot be configured, and a mis-synced voucher cannot be unmarked for re-sync.

Add a Tally section to Settings covering agent registration and listing, and bank account to Tally ledger mapping. Put unmark-synced on the Tally sync log in finance, where a user looking at a bad sync would go, with a confirmation.

---

# PART 11: company-wide views

```
GET /procurement/indents/company/{company_id}
GET /hr/timesheets/company/{company_id}
```

Both are company-wide rollups of data currently only viewable per project. Add a company-wide view for each: indents on the procurement page, timesheets on the HR page. A user with several projects has no way to see everything at once today, which is the whole point of these endpoints existing.

---

# PART 12: Google Drive backup

```
POST /integrations/google-drive/companies/{company_id}/backup-file/{file_id}
```

Backing up a single file to Drive is implemented and unreachable. Add the action where files are listed, visible only when a Drive connection exists. Confirm the target before sending, since this pushes company data to an external service.

---

# PART 13: the calculators, and what stays headless

## 13.1 The calculator duplication, decided

There are 13 backend calculator endpoints (`steel`, `concrete`, `rmc`, `brick`, `brickwork`, `paint`, `tile`, `flooring`, `plaster`, `plastering`, `waterproofing`, `billing`, `split-rate`). **The frontend calls none of them.** `components/resources/CalculatorTools.tsx` does all the arithmetic client-side, in 76 separate calculations.

So the same formulas exist twice and can drift silently.

**Do not wire the UI to the backend.** These calculators run on site, the product ships as a PWA, and a site engineer with no signal must still be able to compute a steel weight. Client-side is the correct behaviour and moving it to the server would break it.

**Instead, stop the drift with a parity test.** Add `backend/tests/coverage/test_calculator_parity.py` that, for each of the 13 calculators, feeds a fixed set of inputs to the backend endpoint and asserts the result equals the value the client formula produces for the same inputs. Transcribe the client formula into the test as the expected value, with a comment citing the line in `CalculatorTools.tsx` it came from. If a calculator has no client equivalent, record that in your report instead of inventing one.

**If a formula genuinely disagrees between the two implementations, do not "fix" either one. Stop, report the discrepancy with both formulas and the inputs that separate them, and leave the code alone.** A wrong quantity on a construction site is a real cost and that is the founder's call, not yours.

## 13.2 Exemptions: these stay unreachable, and that is correct

Seed `reachability_exemptions.txt` with these ten and the reason for each:

```
GET  /auth/google/callback                    OAuth redirect target, browser navigates here
GET  /integrations/google-drive/callback      OAuth redirect target
GET  /integrations/google-sheets/callback     OAuth redirect target
GET  /integrations/zoho-books/callback        OAuth redirect target
POST /admin/migrations/backfill-files-to-storage        one-off operator endpoint
POST /admin/migrations/backfill-rbac                    one-off operator endpoint
POST /admin/migrations/backfill-company-team-party-links one-off operator endpoint
POST /admin/migrations/backfill-role-permissions        one-off operator endpoint
GET  /admin/migrations/rbac-fail-closed/{company_id}    one-off operator endpoint
PUT  /admin/migrations/rbac-fail-closed/{company_id}    one-off operator endpoint
```

Also exempt the two BI feed routes (`/integrations/bi/feed/{company_id}/budget-variance` and `/labour-productivity`): they are consumed by external BI tools using an API key issued in Settings, so having no in-app caller is their design. And exempt the 13 calculator endpoints under 13.1, with the parity test named as the reason they are not dead code.

**Do not add anything else to the exemption file.** It exists to record deliberate decisions, not to make the number go down.

---

# Verification and Definition of Done

Report a measured number with the command that produced it for every line. A count without its command will not be accepted.

- [ ] `scripts/verification/check_route_reachability.py` exists, self-tests in both directions, and is run before and after. Report both outputs in full.
- [ ] **Unreachable routes: 83 down to the exemption count.** Any route still unreachable and not exempt must be named with the reason it was not built.
- [ ] Per part, a line saying which endpoints are now reachable and from which screen.
- [ ] RFQ: an RFQ can be created with line items, sent, quoted by more than one vendor, compared with a recommended vendor shown, closed, and deleted. Walk that whole path and report it step by step.
- [ ] Every new write surfaces `readErrorDetail` on failure. Report the count of new write handlers and confirm each has a failure branch.
- [ ] Every new status pill is `<Badge>`. No hand-rolled pills added. Hand-rolled pill count is unchanged from its current value.
- [ ] No new raw palette classes, gradients, hex colours, `hover:bg-white/N`, control glyphs, emoji, or inline shadows. Report each count before and after; all must be unchanged.
- [ ] Calculator parity test added and passing, or discrepancies reported and nothing changed.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. Report the count; it is 1115 passed, 4 skipped today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` clean.
- [ ] `cd frontend && npm run build` completes.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels. Several of these files are cited by line number; if a count drops, fix the citation, never the validator.
- [ ] **Commit and push to `origin/main`.** Commit at part boundaries as you go, so partial progress survives.

## If you cannot finish

Stop at a part boundary. Commit and push what is done. Then state plainly which parts are complete, which are untouched, and the exact reachability number. **Do not describe a part as complete when its endpoints are still unreachable.** A short honest report is worth more than a long one that has to be re-verified line by line, and it will be re-verified.
