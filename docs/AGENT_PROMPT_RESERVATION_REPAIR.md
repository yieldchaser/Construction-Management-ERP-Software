# Repair inventory reservation, and finish the empty-state sweep

The reservation feature shipped in `71b7084` is **bookkeeping that gates nothing and never releases**. Both defects below were reproduced live against that exact commit. Fix them, plus four empty states the last run missed.

Work continuously. Do not stop between parts. Do not file anything to `docs/BACKLOG.md`.

---

## PART 1 — Reservations can never be released once approved

### Reproduced

Approve an indent for 40 bags, then reject it:

```
REJECT-AFTER-APPROVE: 400 {"detail":"Only pending indents can be rejected (current status: approved)"}
RESERVED STILL HELD: 40.0
```

`reject_indent` (`procurement.py:448`) requires `status == "pending"`. Reservation is only ever written by `approve_indent`. So the release block added inside `reject_indent` is **unreachable dead code** — `item.reserved_qty` is always `0` when it runs.

There are exactly three indent endpoints (create, approve, reject) and three status writes: `approved` (397), `rejected` (450), `ordered` (676). None of them can release. An approved indent whose material is never consumed holds that stock **forever**, and `available` drifts down monotonically with no way back.

### Fix

**Keep `reject_indent` strictly pending-only.** Rejecting something already approved would falsify the approval audit trail, and its release block is correct. It just needs a caller.

Add a new endpoint `POST /apis/v3/procurement/indents/{indent_id}/cancel`:

- permission `procurement:approve`, same membership and company checks as reject
- allowed when `indent.status` is `approved` or `ordered`; any other status returns 400 naming the current status
- sets `indent.status = "cancelled"`
- releases exactly as reject does: per item, decrement the matching `WarehouseInventory.reserved_qty` by the stored `item.reserved_qty`, floor at `0`, then zero `item.reserved_qty`
- returns the same `IndentResponse` shape

Surface it in the procurement UI wherever approve and reject already appear, enabled only for approved and ordered indents, labelled **Cancel Indent**, with a confirmation saying the reserved stock will be released.

### The test that must exist

`test_release_on_indent_reject` is **vacuous**. It rejects a *pending* indent and asserts `reserved_qty == 0.0`, which was `0.0` before the reservation feature existed. It passes against the unfixed tree, so it proves nothing.

Replace it with a test that **approves first**, asserts `reserved_qty == 40.0`, then cancels, then asserts both the warehouse and the item are back to `0.0`. Before committing, comment out the release block in your cancel handler and confirm the new test **fails**. Report that result.

---

## PART 2 — Reservations do not protect any stock

### Reproduced

With `restrict_material_transfer` enabled, 100 MT on hand, 90 MT reserved by an approved indent (10 available), a transfer of 80 MT was issued:

```
ISSUE OVER AVAILABLE: 201
on_hand: 20.0  reserved: 90.0  available: -70.0
```

The guard accepted it, and inventory now shows **negative available stock** to the storekeeper.

**2a. `enforce_stock_availability` ignores reservations.** `workflow_controls.py:145` reads:

```python
available = float(inv.on_hand_qty) if inv else 0.0
```

Change it to `on_hand_qty - reserved_qty`, floored at `0`, and extend the error detail to name the held quantity, e.g. `(on hand 100.0, reserved 90.0, available 10.0, requested 80.0)`. This is the whole point of the feature: reservation exists so two sites cannot both count on the same stock. Today it is a number on a screen.

The guard is opt-in per company (`negative_stock_lock`, `restrict_material_transfer`, `restrict_subcon_material_issue`, restrict production material), so the blast radius is bounded to companies that switched it on. Do not change when the guard is called, only what it computes.

**2b. Non-DPR stock-out paths never release.** `POST /apis/v3/procurement/transactions` decrements `on_hand_qty` for `used`, `transferred` and subcontractor-issue types (`delta = -req.qty`) without touching `reserved_qty`. DPR consumption releases; these do not. That is what drove reserved above on-hand in the trace above.

Apply the same release there that `dpr.py:150` already performs, for outgoing types only. Leave `RECEIVED_TYPES` alone. For signed `ADJUSTMENT_TYPES`, branch on the sign: a negative write-off releases, a positive restatement does not.

---

## PART 3 — `item.reserved_qty` drifts out of sync with the warehouse

On consumption, `dpr.py` decrements `WarehouseInventory.reserved_qty` but **never** decrements the `MaterialIndentItem.reserved_qty` that caused it. After an indent reserves 40 and a DPR consumes all 40, the warehouse reads `0` while the item still claims `40`.

Today that is latent. The moment Part 1 lands it becomes a live double-release: cancelling that indent would subtract 40 from a warehouse that no longer holds it, wrongly freeing stock reserved by *other* indents.

### Fix

Extract one helper, used by DPR consumption, DPR reversal and the transaction path, so the three cannot drift apart:

```python
def _release_reservation(db, project_id, material_name, qty) -> float:
    """Release up to `qty` of held stock for (project, material).
    Decrements WarehouseInventory.reserved_qty and draws down the
    MaterialIndentItem rows that hold it, oldest approved indent first.
    Returns the amount actually released."""
```

Return the released amount so DPR keeps storing it in `reserved_released` for its reversal. On reversal, re-reserve against the same items in reverse order, capped at `on_hand_qty`.

---

## PART 4 — Invariant tests that actually bite

The suite claims `reserved_qty <= on_hand_qty` as an invariant but tests no path that can break it. Add tests, each of which must fail against `71b7084`:

- issue via `POST /transactions` (`transferred`) more than available with the guard **on** → rejected 400
- the same with the guard **off** → accepted, and `reserved_qty <= on_hand_qty` still holds, because the issue released
- cancel an approved indent → warehouse and item both return to `0`
- approve, consume the whole quantity via DPR, then cancel the indent → warehouse `reserved_qty` is `0`, not negative, and no other indent reservation moved
- negative write-off adjustment releases; positive restatement does not

Keep the existing safety test. **With no approved indents, `reserved_qty` stays `0` everywhere and every stock figure is byte-identical to today** must still hold after all of the above.

Make the display honest too: wherever **Available Stock** is shown, it must never render below zero. Clamp at `0` and show on-hand and reserved beside it.

---

## PART 5 — Four empty states the last run missed

The previous report claimed all 44 bare strings were converted and gave a 67-row table. Four genuine bare table and list empty states remain, and the whole `payroll-attendance` page is absent from that table despite being in the original sweep.

| File | String | Verdict |
|---|---|---|
| `d/payroll-attendance/page.tsx:1503` | `No leave requests yet.` | CTA — open the leave request drawer on that page |
| `d/payroll-attendance/page.tsx:1574` | `No holidays added yet.` | CTA — link to the holiday calendar in `settings` |
| `d/library/page.tsx:701` | `No materials registered.` | CTA — open the add-material drawer on that page |
| `components/rbac/TeamSection.tsx:129` | `No team members found.` | CTA — open the invite-member flow |

`No team members found` was named explicitly in the previous specification and still shipped bare. Convert all four to the shared `EmptyState` component, matching `/d/depreciation`.

**Leave these alone. They are correct, not defects.** Each is an inline `<option>` placeholder inside a `<select>`, or a short inline hint beside a control, where an `EmptyState` block would be wrong: `d/finance/page.tsx:3962`, `d/attendance/page.tsx:692`, `p/[project_id]/attendance/page.tsx`, `settings/page.tsx:2278`, `d/planning/gantt/page.tsx:691`, `components/CustomFieldsSection.tsx:251`. The three marketing search results (`BlogIndexClient`, `HelpSearchClient`, `IntegrationsGridClient`) are filtered-search states and stay as they are.

---

## PART 6 — Backlog id

The subscription-billing row landed as `R2-336` in the findings table. It belongs with the other founder-owned items, alongside the closed `D-021`, with a `D-0xx` id. Move it, keep the text, do not duplicate it.

---

## PART 7 — The help answers read like API documentation

All 37 console help answers use one rigid template: `Preconditions:` / `Navigation:` / `Required fields:` / `Optional fields:` / `Save result:` / `Next step:`. Counted in `helpContent.tsx`: 37, 37, 30, 19, 37, 37. Every answer, no exceptions.

The reader is a site manager or an office admin, not an engineer. Today the Payment answer tells them their click "calls `POST /apis/v3/finance/payments`, recording the transaction in financial_transactions". That is a sentence about our database, in a document meant to help someone raise a payment.

**The information is right. The voice is wrong.** Do not change what any answer claims. Change how it reads.

### What comes out

1. **The six labelled prefixes.** Delete the labels. Keep the running order, because that order is the shape of the task: what you need first, where to click, what to fill in, what happens when you save, where to go next.
2. **Every `<code>METHOD /path</code>` in an answer body.** All 37 have one. The endpoint stays in that entry's `sources` array, where the validator already checks it independently of the body, so removing it from the prose loses no enforcement.
3. **Raw database table names.** Five leak today: `warehouse_inventories`, `staff_employees`, `financial_transactions`, `company_team`, `boq_items`. Say what the user sees instead, e.g. "updates that account's balance".
4. **Raw permission keys.** `finance:edit permission` becomes "permission to edit finance".
5. **Em dashes.** House rule. Use a period or a comma.

### The model

Before:

> Preconditions: Company Bank or Cash Account created; finance:edit permission.
> Navigation: Open the sidebar, select "Finance", choose the "Payment Requests" tab, and click "+ Create Payment Request".
> Required fields: Party, Payment Type ("in" for customer receipts, "out" for vendor payouts), Amount, Payment Method (Bank Transfer, Cheque, UPI, Cash), and Payment Date.
> Save result: Submitting calls `POST /apis/v3/finance/payments`, recording the transaction in financial_transactions and adjusting account balances.
> Next step: Link the payment to open vendor bills or view updated party statement balances.

After:

> You will need a bank or cash account set up first, and permission to edit finance.
>
> Go to "Finance" in the sidebar, open the "Payment Requests" tab, and click "+ Create Payment Request".
>
> Fill in the party, whether the money is coming in or going out, the amount, how it is being paid (bank transfer, cheque, UPI or cash), and the date.
>
> Saving it records the payment against that party and updates the account balance.
>
> From there you can link it to an open vendor bill, or check the party's statement to see the new balance.

Same five beats, same facts, no labels, nothing about our stack.

### Two things that must not change

**Keep every UI label in double quotes.** The validator extracts labels with `re.findall(r'"([^"\n]+)"', a_clean)`. It only sees double-quoted strings. Switch a label to `<strong>` or backticks and that label silently stops being verified, while the run still prints `[PASS]`. If you want bold, you must first extend the extractor to read `<strong>` content as well **and** add a self-test case proving the extension catches a fabricated bold label. Otherwise quotes stay. They also help the reader, since they mark exactly what to look for on screen.

**Verification coverage must not fall.** The validator reports `[PASS]` today without ever saying how much it checked, so a rewrite that quietly drops labels would still read as green. Make it print the totals it verified: entries, endpoint citations, file:line citations and UI labels. Record those four numbers **before** you start rewriting, and assert at the end that none of them decreased. Paste both sets in your report.

### How to do the rewrite

**One entry at a time, by hand.** Do not write a script that regenerates answers from a template. Every fabrication in this project's history came from a generator emitting whole files from a template, and that is exactly what produced the voice being fixed here.

You are rewording, not researching. If a rewrite makes you want to state something the old answer did not say, either drop it or open the cited file, confirm it, and add the citation to `sources`. A claim without a citation is a fabrication.

---

## Definition of done

1. `POST /indents/{id}/cancel` exists, releases, and is reachable from the procurement UI.
2. `enforce_stock_availability` computes `on_hand - reserved`.
3. Every path that decrements `on_hand_qty` releases reservation through the one shared helper.
4. `MaterialIndentItem.reserved_qty` and `WarehouseInventory.reserved_qty` can never disagree.
5. Every new test in Part 4 was **run against the unfixed tree and observed to fail** before the fix. Report each result. A test you did not watch fail is not a closure.
6. Four empty states converted; the six listed exclusions untouched.
7. All 37 help answers rewritten in plain language, one at a time. Zero occurrences of `Preconditions:`, `Navigation:`, `Required fields:`, `Optional fields:`, `Save result:`, `Next step:` remain in `helpContent.tsx`. Zero `<code>METHOD /path</code>` in any answer body, and every one of those endpoints still present in that entry's `sources`.
8. `verify_help_claims.py` passes, self-test included, and prints four coverage totals that are all greater than or equal to the pre-rewrite numbers. Paste before and after.
9. `pytest tests/coverage`, `npx tsc --noEmit`, and a clean `npm run build` after `rm -rf .next` all pass. Paste the real counts.

No migration is needed. `reserved_qty` already exists on both tables.
