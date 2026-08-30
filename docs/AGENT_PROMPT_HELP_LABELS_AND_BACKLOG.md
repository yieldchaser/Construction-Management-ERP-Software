# AGENT PROMPT — Help labels, 67 empty states, and build inventory reservation

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

# PART 3 — Empty states that dead-end the user

## 3.1 — What the defect is

Attendance → Labour Contractor shows one bare sentence when the list is empty:

```
No subcontractors registered for this company yet.
```

No icon, no action, no route onward. The contractors it lists are registered on a **different page** — Procurement & Materials → Subcontractors — which posts to `/apis/v3/billing/subcontractors`, the same endpoint this tab reads at `attendance/page.tsx:254`. A first-time user cannot discover that, which is exactly how this was found.

**The feature itself is correct and must not be touched.** Each contractor renders as a card with a **"Log Daily Crew Size →"** button opening a **Crew Size Matrix** — Labor Role, Worker Count, Shift Multiplier, Overtime (Hrs), Allowance (₹), Deductions (₹), Notes, plus a site photo. It records who the labour contractor is and how many workers of each trade they put on site that day. Do not remove, rename or restructure it.

## 3.2 — It is not one instance. It is 67.

A sweep found:

- **44 bare empty-state strings** that never adopted the shared `EmptyState` component, across attendance, billing, budgeting, chat, custom-fields, equipment, finance, hr, labour, library (6 of them), payroll-attendance, planning, procurement, safety, subcon, projects, reports and settings.
- **23 uses of `EmptyState` that pass no `action`**, including "No parties found", "No team members found", "No leave templates configured", "No material indents found", "No projects found", "No members found".

An earlier round reported "0 bare empty states". That measurement only matched the phrase `No <x> found`; it missed every variant ending in *yet*, *registered*, *configured* or *available*, which is most of them.

## 3.3 — What to do

Convert all 44 bare strings to the shared `EmptyState` component (`frontend/src/components/ui/EmptyState.tsx`; `/d/depreciation` is the reference implementation).

Then apply this rule to all 67, and **state your verdict per item in the report**:

- **If the empty list can be filled by creating something, give it a CTA to where that is done.** Same page → open the drawer or modal. Different page → link there, and say so in the description, exactly as the Labour Contractor case needs a link to `/c/{companyId}/d/subcon`.
- **If the list is derived, filtered, or an audit trail, give it no CTA.** Delete logs, activity records, face-recognition logs derived from punches, and report views filtered to a date range have nothing for a user to create. A CTA there is noise.

Do not guess which bucket an item is in. Read the surrounding code to find what populates the list, and let that decide. Where the source is genuinely another page, link to that route.

---

# PART 4 — Build inventory reservation

This is a **founder-approved feature**, not a bug fix. The schema was scaffolded for it and never wired: `WarehouseInventory.reserved_qty` is constructed as `0.0` in four places and never changed anywhere, yet it is already displayed to users at `procurement/page.tsx:781` (a "Reserved" column) and `production/page.tsx:472` (`X available · Y reserved`). Today those figures can only ever read zero. **Once this feature ships they become real, so leave both displays in place.**

## 4.1 — The semantics

Reservation exists so two sites cannot both count on the same stock. The lifecycle is: a site raises a **Material Indent**, it is **approved**, stock is held for it, and the hold is released when the material is actually consumed or the indent is cancelled.

`WarehouseInventory` is keyed by `(project_id, material_name)` and carries `on_hand_qty`, `reserved_qty`, `unit`. The derived quantity users care about is:

```
available = on_hand_qty - reserved_qty
```

## 4.2 — Where to hook in

| Event | Handler | Behaviour |
|---|---|---|
| Indent approved | `approve_indent`, `procurement.py:387` | For each `MaterialIndentItem`, reserve against the matching `WarehouseInventory` row for `(indent.project_id, item.material_name)`. |
| Indent rejected | `reject_indent`, `procurement.py` | Release everything that indent reserved. |
| Material consumed | `dpr.py:150` (DPR `materials_consumed` decrements `on_hand_qty`) | Release reservation as the stock actually leaves, so `available` does not go negative. |
| Consumption reversed | `dpr.py:360` (increments `on_hand_qty` back) | Re-reserve the same amount, mirroring the release. |

Leave GRN receipt (`procurement.py:976`) and manual adjustment (`procurement.py:1221`) alone — they move `on_hand_qty` only.

## 4.3 — Reserve exactly, release exactly

Releasing correctly requires knowing what each indent item actually reserved, which may be less than it asked for. Add a `reserved_qty` column to `MaterialIndentItem`, defaulting to `0`, and store the amount reserved for that item.

Write the migration as `ALTER TABLE material_indent_items ADD COLUMN IF NOT EXISTS reserved_qty NUMERIC(18,4) NOT NULL DEFAULT 0;` in `supabase/migrations/`, following the existing file-naming convention. This is additive and idempotent, matching every other migration in that directory. **GitHub Actions now runs free — the repository is public — so the migration workflow will apply it on push.**

On approve, per item:

```
inv = WarehouseInventory for (indent.project_id, item.material_name)
if inv is None:          # nothing in stock yet; the PO will bring it
    item.reserved_qty = 0
    continue
available = on_hand_qty - reserved_qty
to_reserve = min(item.quantity, max(0, available))
inv.reserved_qty += to_reserve
item.reserved_qty = to_reserve
```

**Do not block approval when stock is short.** A site's indent must not be held hostage by warehouse levels; it reserves what exists and the rest is covered by procurement. Reserve partially and record what was reserved.

On release, decrement `inv.reserved_qty` by the stored `item.reserved_qty`, floor at `0`, and zero the item.

## 4.4 — Invariants, enforced by tests

- `reserved_qty >= 0` always. Never let a release drive it negative.
- `reserved_qty <= on_hand_qty` always.
- Approving the same indent twice must not double-reserve. `approve_indent` already rejects any indent whose status is not `pending`, which gives you idempotency for free — do not weaken that check.
- Consuming stock releases at most what was reserved.

## 4.5 — The safety property that makes this non-breaking

**With no approved indents, `reserved_qty` stays `0` everywhere and every existing stock figure is byte-identical to today.** The feature is purely additive: it only ever moves a number that is currently frozen at zero.

Prove it. Write a test that runs the existing stock flows — GRN receipt, manual adjustment, DPR consumption and its reversal — with no indent approved, and asserts every `on_hand_qty` outcome matches current behaviour exactly.

Then write tests for the feature itself: reserve on approve, partial reserve when short, release on reject, release on consumption, re-reserve on reversal, and each invariant in 4.4.

## 4.6 — Surface it

`available` is the number a storekeeper actually needs. Wherever the procurement inventory table and the production line already show on-hand and reserved, make sure available is derived and shown as `on_hand_qty - reserved_qty` rather than being confused with on-hand. Do not add new screens.

---

# PART 5 — Backlog

Add exactly **one** new row to `docs/BACKLOG.md`, in the existing table format, with a new `D-0xx` id.

**Subscription billing is documented but not built.** There is no payment processor anywhere in the backend — no Stripe, no Razorpay, no gateway of any kind. Meanwhile the marketing help ships "Pricing and Renewal in SiteFlow", "SiteFlow Subscription and Refund Policy Explained" and "TDS on SiteFlow Subscription Payment — Section 194J Guide", and Settings has a Subscription tab. Collection is currently a manual, out-of-product process. Mark it **founder-owned and deliberately deferred** — he will add a payment endpoint himself. Priority MEDIUM. **Do not build it and do not treat it as a defect.**

Also **close `D-021`**. It recorded that GitHub Actions was billing-blocked. The repository is now public, Actions run free, and recent runs succeed. Mark it CLOSED with that reason; do not delete the row.

## What was checked and found sound — do not "fix" these

- **The Labour Contractor feature**, per 3.1. Only its empty state changes.
- **The labour data model.** A deliberate three-layer design carrying finding id R2-507: `AttendanceLog` holds individual punches (one row per person), `SubcontractorAttendance` holds contractor crew counts (one row is N workers), and `MusterRoll` is the statutory register derived from both when its fields are left null. No double-counting path exists — `reports.py` has zero references to `SubcontractorAttendance` and reads only the derived register.
- **Muster roll figures are frozen at write time on purpose.** A statutory register is a point-in-time attestation, and R2-333 idempotency makes re-posting the same project + contractor + day + role update the row in place. Do not recompute on read and do not mutate stored register rows.
- **Bill payment maintenance is correct.** `paid_amount` increments on settlement and decrements on payment delete, status transitions both ways, money comparisons use an epsilon, settlement rows are read before the cascade delete, and the bank posting is reversed for non-cash methods (`finance.py:275-340`).
- **`CRMQuotationItem.billed_qty` / `unbilled_qty`.** Unmaintained, but the frontend hardcodes them to `0` on create and never displays them, so they are inert. Leave them alone.

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
- [ ] All 44 bare empty-state strings converted to `EmptyState`.
- [ ] All 67 empty states triaged CTA / no-CTA by reading what populates each list, with a per-item verdict in the report.
- [ ] Labour Contractor empty state links to `/c/{companyId}/d/subcon`; the feature itself untouched.
- [ ] `MaterialIndentItem.reserved_qty` column added via an additive `IF NOT EXISTS` migration.
- [ ] Reservation wired on indent approve, reject, DPR consumption and DPR reversal.
- [ ] All four invariants in 4.4 covered by tests.
- [ ] **Safety test passes: with no approved indent, every existing stock outcome is identical to today.**
- [ ] The two Reserved displays left in place; `available` shown as `on_hand_qty - reserved_qty`.
- [ ] Exactly ONE new `D-0xx` row added for subscription billing; `D-021` marked CLOSED.

## Final report

The validator self-test output before and after. Every label you changed with its file:line. What you found about Add Employee. The duplicate-title check. The per-item CTA verdicts for all 67 empty states. The reservation tests, including the safety test. The new backlog id and confirmation D-021 is closed.

State plainly what you did not finish. Do not claim a number you did not measure.

State plainly what you did not finish. Do not claim a number you did not measure.
