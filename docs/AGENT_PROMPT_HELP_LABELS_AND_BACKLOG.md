# AGENT PROMPT — Close the label gap, fix two content bugs, fix two code defects

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Context

The previous run closed the endpoint-fabrication hole properly. Verified independently against all 471 real `@router` decorators: **38 endpoint claims in `helpContent.tsx`, 0 nonexistent** (it was 14 of 29 before). All 45 `file:line` citations resolve to real files and real lines. That work is good and stays.

**But the validator never checks UI labels**, even though the prompt required it, so the other half of the fabrication problem survived untouched.

## Standing rules

**You do not stop between parts.** A blocker surviving two attempts → `docs/BACKLOG.md` as a `D-0xx`, skip, continue. Report every part with its number, including anything unfinished.

**You have no browser and no Sentry.** Running the backend locally and calling `localhost` is yours and is expected. Visual confirmation is handled separately.

**Do not generate content with a writer script.** The last two runs used `write_help_content.py` to emit the whole help file from a template. That is what produces fabrication. Edit entries individually, in place, each one immediately after reading the code it describes. Scripts for *checking* are required. Scripts for *authoring* are banned.

---

# PART 1 — Teach the validator to check labels, then fix what it catches

## 1.1 — The gap

`scripts/verification/verify_help_claims.py` validates endpoints and citation existence. It contains **no logic that checks whether a quoted UI label actually appears in the file it cites.**

Measured consequence: of the 20 `"+ X"` button labels quoted in `helpContent.tsx`, **7 do not exist anywhere in the frontend**:

```
+ Add Task          + Create Bill        + Create Quotation
+ Daily Muster Roll + Generate API Key   + New DPR
+ New RFQ
```

Others exist but are quoted in the wrong form, which is just as misleading to a user hunting for the control:

| Help says | Actual control | Where |
|---|---|---|
| `"+ New Lead"` | `New Lead +` — the plus is on the **right** | `d/crm/page.tsx:747` |
| `"+ Log Fuel"` | `Log Fuel Refill` | `d/equipment/page.tsx:792` |
| `"+ Add Employee"` | only a `{/* Add Employee modal stub */}` comment | `d/hr/page.tsx:1704` |

Note that last row. Investigate whether the Add Employee control is actually implemented or is a stub. If it is a stub, the honest help text says so, or the entry goes. Do not document a control that does not work.

## 1.2 — Extend the validator

Add label verification to `verify_help_claims.py`:

1. For each entry, extract every double-quoted string in the answer body that looks like a UI control or navigation target (button text, tab name, field label, page name).
2. For each, assert the string appears in **at least one** of that entry's cited `file:line` files. Not merely somewhere in the repo — in a file that entry actually cites. That is what makes the citation meaningful.
3. Report the entry, the label, and the cited files it was not found in.
4. Exit non-zero on any violation.

Ignore the obvious non-controls: the entry's own `q` text, endpoint strings, and prose in quotes. Bias toward flagging: a false positive costs you one manual check, a false negative ships another invented button.

**Self-test it before you trust it.** Insert a deliberately wrong label into one entry, confirm the validator fails, remove it, confirm it passes. Paste both outputs. A validator you have not tested against a known-positive is worth nothing — that lesson is already written into this project's history, and the endpoint half of this same script was only trustworthy because it was self-tested.

## 1.3 — Fix every violation

For each label the validator flags, open the cited file, read the real control text, and correct the help to match **verbatim**, including the position of any `+`. Where the control does not exist at all, either find the real one or remove the claim.

Then re-run and show it clean.

---

# PART 2 — Two marketing content bugs. Metadata only.

`frontend/src/content/help/**/*.json` remains **out of scope for body edits**. Their `body` fields are ~31KB of WordPress-exported HTML rendered via `dangerouslySetInnerHTML` and parsed by `annotateHeadingsForToc()` for the in-page table of contents; editing that markup can silently break the TOC or styling.

**You may edit `title`, `metaTitle`, `metaDescription` and `slug`. You may not edit `body`.** Both fixes below are metadata-only.

## 2.1 — An article's title does not match its content

`frontend/src/content/help/mobile-app/` contains an article titled **"Steps to Set Up and Manage To Do Items in SiteFlow"** whose body is entirely about **facial-recognition punch-in, face photo upload, and marking daily attendance**. The title is simply wrong for the content.

Read the body, then retitle the article to describe what it actually covers. Update `metaTitle` and `metaDescription` to match. Leave `body` untouched. If `slug` is used in URLs that may already be indexed, leave the slug alone and note that in your report rather than breaking a live URL.

## 2.2 — A duplicate title

The title **"Steps to Set Up and Manage To Do Items in SiteFlow"** appears on **two** articles. Once 2.1 is fixed, confirm the remaining one is the article that genuinely covers To-Do items. Verify no other duplicate titles exist across all 86 files and report the check.

## 2.3 — Leave the mobile-app articles alone

There are 6 articles describing a SiteFlow mobile app. There is no native Android or iOS project in this repo — only a PWA. **This is intentional and founder-approved: the native apps are planned, and the content stays.** Do not delete, rewrite or reframe those articles. Do not "correct" them to describe the PWA. The only mobile-app change you make is the retitle in 2.1.

---

# PART 3 — Two code fixes

Both are decided, small, and carry no regression risk. **Fix them in this run; do not file them.**

## 3.1 — The Labour Contractor empty state is a dead end

This is the defect that started the investigation, and it is the only thing wrong with that feature.

**What the feature is, so nobody "fixes" it into something else:** Attendance → Labour Contractor lists each labour contractor as a card (name, contact) with a button reading **"Log Daily Crew Size →"**. That opens a drawer titled "Log Subcontractor Crew Attendance" containing a **Crew Size Matrix** — Labor Role, Worker Count, Shift Multiplier, Overtime (Hrs), Allowance (₹), Deductions (₹), Notes — plus a site photo. It records who the labour contractor is and how many workers of each trade they put on site that day. That is exactly what it should do. **It works. Do not remove it, rename it, or restructure it.**

The single problem is the empty state at `frontend/src/app/c/[company_id]/d/attendance/page.tsx:813-816`, a bare centred string:

```
No subcontractors registered for this company yet.
```

No icon, no action, no route onward. The contractors it lists are registered on a different page — Procurement & Materials → **Subcontractors** — which posts to `/apis/v3/billing/subcontractors`, the same endpoint this tab reads at line 254. A first-time user has no way to discover that.

**Fix:** replace the bare string with the shared `EmptyState` component (`frontend/src/components/ui/EmptyState.tsx`, already used correctly on `/d/depreciation`). Icon, a title, one line saying labour contractors are registered as subcontractors, and a CTA linking to `/c/{companyId}/d/subcon`. Match the depreciation implementation's shape.

## 3.2 — The "Reserved" inventory column can only ever show zero

`WarehouseInventory.reserved_qty` is constructed as `0.0` in four places (`dpr.py:159`, `procurement.py:982`, `procurement.py:1230`, `production.py:254`) and **never incremented or decremented anywhere in the codebase.** Inventory reservation was scaffolded and never built.

It is nonetheless displayed to users in two places:

- `frontend/src/app/c/[company_id]/d/procurement/page.tsx:781` — a "Reserved" column in the inventory table.
- `frontend/src/app/c/[company_id]/d/production/page.tsx:472` — the line `{available} available · {reserved} reserved`.

So the product shows a stock figure that is structurally incapable of being anything but zero, implying a reservation feature that does not exist.

**Fix: remove those two displays only.** Delete the "Reserved" column and its header from the procurement inventory table, and drop the "· N reserved" clause from the production line.

**Leave the backend completely alone** — keep the `reserved_qty` column, keep it in the API responses, keep the delete guard as it is. Reservation is a real feature the founder may want later, and leaving the schema and API intact means it can be built without a migration or an API change. You are removing a misleading display, not deleting a capability.

Do not touch `CRMQuotationItem.billed_qty` / `unbilled_qty`. They are also unmaintained, but the frontend hardcodes them to `0` on create (`crm/page.tsx:584-585`) and never displays them, so they are inert. Changing them is churn with a regression risk and no user-visible benefit.

---

# PART 4 — One backlog record

Add exactly **one** row to `docs/BACKLOG.md`, in the existing table format, with a new `D-0xx` id. This is the only thing in this task you record instead of fixing.

**Subscription billing is documented but not built.** There is no payment processor anywhere in the backend — no Stripe, no Razorpay, no gateway of any kind. Meanwhile the marketing help ships "Pricing and Renewal in SiteFlow", "SiteFlow Subscription and Refund Policy Explained" and "TDS on SiteFlow Subscription Payment — Section 194J Guide", and Settings has a Subscription tab. Subscription collection is currently a manual, out-of-product process.

Mark it **founder-owned and deliberately deferred** — he will add a payment endpoint himself. Priority MEDIUM. **Do not build it and do not treat it as a defect.**

While you are in `docs/BACKLOG.md`, **close `D-021`**. It recorded that GitHub Actions was billing-blocked. The repository is now public, Actions run free, and recent workflow runs succeed. Mark it CLOSED with that reason. Do not remove the row.

## What was checked and found sound — do not "fix" these

Recorded so you do not mistake correct code for a defect:

- **The Labour Contractor feature itself**, per 3.1. Only its empty state changes.
- **The labour data model.** A deliberate three-layer design carrying finding id R2-507: `AttendanceLog` holds individual punches (one row per person), `SubcontractorAttendance` holds contractor crew counts (one row is N workers), and `MusterRoll` is the statutory register derived from both when its fields are left null. No double-counting path exists — `reports.py` has zero references to `SubcontractorAttendance` and reads only the derived register. `CompanyTeam.priority_type == "subcontractor"` covering every engaged firm is correct, since the same firm sends crew some days and bills a work order other months.
- **Muster roll figures are frozen at write time on purpose.** A statutory register is a point-in-time attestation, and R2-333 idempotency makes re-posting the same project + contractor + day + role update the row in place. Do not recompute on read and do not mutate stored register rows.
- **Bill payment maintenance is correct.** `paid_amount` increments on settlement and decrements on payment delete, status transitions both ways across Paid / Partially Paid / Unpaid, money comparisons use an epsilon, settlement rows are read before the cascade delete removes them, and the bank posting is reversed for non-cash methods (`finance.py:275-340`).

## Cross-cutting rules

- Content and validator changes only. No application refactors. Anything else you find goes to `docs/BACKLOG.md`.
- No em dashes in help copy; use a period or comma. No emoji.
- Update the `text` search blob on every console entry you touch or search stops finding it.
- Run `pytest -n 4` (from `backend/`, `PYTHONPATH=.`), `npx tsc --noEmit`, `npm run build`. Do not delete or skip tests.
- Delete `.next/` before any build you verify against.
- `pkill` does not kill the Windows `node.exe` holding a port. Use `Get-NetTCPConnection -LocalPort <port> -State Listen | Stop-Process`.
- Push to `origin/main`; verify with `git merge-base --is-ancestor HEAD origin/main` (mind the argument order).

## Definition of Done

- [ ] Validator checks quoted labels against each entry's own cited files, **self-tested against a known-positive**, both outputs pasted.
- [ ] All 7 nonexistent labels fixed; the wrong-form ones (`New Lead +`, `Log Fuel Refill`) corrected verbatim.
- [ ] The Add Employee control investigated: real, or the entry corrected/removed. State which.
- [ ] Validator passes clean; `test_help_claims_valid.py` green.
- [ ] Mistitled mobile-app article retitled; `body` untouched. Duplicate-title check across all 86 files reported.
- [ ] `git status` shows **no changes to any `body` field** under `frontend/src/content/help/`.
- [ ] The 6 mobile-app articles otherwise unchanged.
- [ ] Labour Contractor empty state uses `EmptyState` with a CTA to `/c/{companyId}/d/subcon`; the feature itself untouched.
- [ ] The two Reserved displays removed from the procurement inventory table and the production line; backend, API and DB column all untouched.
- [ ] `billed_qty`/`unbilled_qty` deliberately NOT changed.
- [ ] Exactly ONE new `D-0xx` row added, for subscription billing only; `D-021` marked CLOSED (repo is public, Actions run free).
- [ ] `pytest -n 4` green; `tsc --noEmit` clean; `npm run build` clean; pushed and ancestry-verified.

## Final report

The validator self-test output, before and after. Every label you changed, with the file:line you read it from. What you found about Add Employee. The duplicate-title check result. What you did for each of the two Part 3 fixes, the single new backlog id, and confirmation that D-021 is closed.

State plainly what you did not finish. Do not claim a number you did not measure.
