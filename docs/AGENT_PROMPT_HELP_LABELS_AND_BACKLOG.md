# AGENT PROMPT — Close the label gap, fix two content bugs, fix four code defects

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

# PART 3 — Fix these. Do not file them.

Everything below is implementable and decided. **Fix it in this run.** Do not add any of it to `docs/BACKLOG.md` — the backlog is reserved for work the founder does himself, and converting a fix you could make into a record just throws away the investigation that found it.

There is exactly **one** backlog item in this task, in Part 4.

## 3.1 — The Labour Contractor empty state is a dead end

This is the defect that started the investigation. The founder opened Attendance → Labour Contractor, saw an empty list, and could not tell how to add a contractor.

`frontend/src/app/c/[company_id]/d/attendance/page.tsx:813-816` renders a bare centred string:

```
No subcontractors registered for this company yet.
```

No icon, no action, no route to the thing that fixes it. The contractors it lists are created on a different page entirely — Procurement & Materials → **Subcontractors** — which posts to `/apis/v3/billing/subcontractors`, the same endpoint this tab reads at line 254.

**Fix:** replace that bare string with the shared `EmptyState` component (`frontend/src/components/ui/EmptyState.tsx`, already used correctly on `/d/depreciation`). Give it an icon, a title, one line explaining that labour contractors are registered as subcontractors, and a **CTA linking to `/c/{companyId}/d/subcon`**. Match the depreciation implementation's shape.

Do not rename the tab. "Labour Contractor" is domain-correct for what it does — it records daily crew counts per labour role. The problem was never the name; it was that the empty state told the user nothing.

## 3.2 — Muster roll has no staleness signal

`MusterRoll` derives its figures from `AttendanceLog` and `SubcontractorAttendance` at the moment the row is created (`labour.py`, `_derive_day_figures`). `get_muster_roll` then returns the stored row with no recompute, so crew rows entered later that day never reach an already-written register. Nothing tells anyone the register has drifted from its sources.

**Fix:** in `GET /apis/v3/labour/muster-roll/{project_id}`, recompute the derived figures for each row's day and compare them to the stored values. Add a boolean to `MusterRollResponse` — `sources_changed` — set true when they differ. Surface it in the UI as a quiet note on that row, offering the existing re-post as the way to refresh it.

**Do not recompute on read into the response, and do not mutate stored register rows.** Freezing is correct for a statutory register: it is a point-in-time attestation, and R2-333 idempotency already makes re-posting the same project + contractor + day + role update the row in place. You are adding a signal, not changing the document.

## 3.3 — Two scaffolded fields are exposed but never maintained

Found by sweeping all 114 stored aggregate columns in `models.py` for a maintenance path. Neither produces a wrong number today; both invite someone to trust a figure nothing maintains.

### `CRMQuotationItem.billed_qty` / `unbilled_qty`

Accepted as **user input** on quotation-item creation (`crm.py:237-238`) and returned in three response shapes (`crm.py:710, 794, 857`), but no billing flow ever updates them — even though `Bill.quotation_id` links bills to quotations. Whatever someone types at quotation time stays there forever. Nothing downstream reads them: `reports.py` has zero references, and `_rep_unbilled_item` works off GRN items.

**Fix:** stop accepting them as user input. Remove both from the create schema, and derive them on read — `billed_qty` from bills linked to that quotation via `quotation_id`, and `unbilled_qty` as `qty - billed_qty`, floored at zero. Keep the response fields so nothing downstream breaks; they simply become computed rather than typed.

If the bill-to-quotation-item linkage is not granular enough to attribute a billed quantity per item, do **not** invent an attribution rule. Instead return `billed_qty` as 0 and `unbilled_qty` as `qty`, remove them from the create schema anyway so they can no longer be typed, and say so plainly in your report.

### `WarehouseInventory.reserved_qty`

Always constructed as `0.0` (`dpr.py:159`, `procurement.py:982, 1230`, `production.py:254`), never incremented or decremented anywhere, yet surfaced in three API responses (`procurement.py:1156, 1277`, `production.py:529`) and used in a delete guard at `procurement.py:1266` that can therefore never trip on it. Inventory reservation was scaffolded and never built.

**Fix:** stop surfacing it. Remove `reserved_qty` from those three response shapes and drop the `reserved_qty` term from the delete guard, leaving the `on_hand_qty` check intact. **Keep the database column** — dropping it needs a migration, and CI-applied migrations are currently blocked, so leave the schema alone and change only what the API exposes.

Check the frontend for anything rendering a "Reserved" figure from those responses and remove that display too, or the UI will show `undefined`.

---

# PART 4 — One backlog record

Add exactly **one** row to `docs/BACKLOG.md`, in the existing table format, with a new `D-0xx` id. This is the only thing in this task you record instead of fixing.

**Subscription billing is documented but not built.** There is no payment processor anywhere in the backend — no Stripe, no Razorpay, no gateway of any kind. Meanwhile the marketing help ships "Pricing and Renewal in SiteFlow", "SiteFlow Subscription and Refund Policy Explained" and "TDS on SiteFlow Subscription Payment — Section 194J Guide", and Settings has a Subscription tab. Subscription collection is currently a manual, out-of-product process.

Note in the row that this is **founder-owned and deliberately deferred** — he will add a payment endpoint himself when needed. Priority MEDIUM. **Do not build it, and do not treat it as a defect.**

## What was checked and found sound — do not "fix" these

Recorded so you do not mistake correct code for a defect:

- **Bill payment maintenance is correct.** `paid_amount` increments on settlement and decrements on payment delete, status transitions both ways across Paid / Partially Paid / Unpaid, money comparisons use an epsilon, settlement rows are read before the cascade delete removes them, and the bank posting is reversed for non-cash methods (`finance.py:275-340`).
- **The labour model is correct.** It is a deliberate three-layer design carrying finding id R2-507: `AttendanceLog` holds individual punches (one row per person), `SubcontractorAttendance` holds subcontractor crew counts (one row is N workers), and `MusterRoll` is the statutory register derived from both when its fields are left null. There is no double-counting path — `reports.py` has zero references to `SubcontractorAttendance` and reads only the derived register. `CompanyTeam.priority_type == "subcontractor"` covering every engaged firm is likewise correct, since the same firm sends crew some days and bills a work order other months.

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
- [ ] Labour Contractor empty state uses `EmptyState` with a CTA to `/c/{companyId}/d/subcon`.
- [ ] `MusterRollResponse` carries `sources_changed`; stored rows unmutated.
- [ ] `billed_qty`/`unbilled_qty` removed from the create schema and derived on read (or returned 0/qty with the reason stated).
- [ ] `reserved_qty` removed from the three responses and the delete guard; DB column left in place; frontend display removed.
- [ ] Exactly ONE `D-0xx` row added, for subscription billing only.
- [ ] `pytest -n 4` green; `tsc --noEmit` clean; `npm run build` clean; pushed and ancestry-verified.

## Final report

The validator self-test output, before and after. Every label you changed, with the file:line you read it from. What you found about Add Employee. The duplicate-title check result. What you did for each of the four Part 3 fixes, and the single backlog id.

State plainly what you did not finish. Do not claim a number you did not measure.
