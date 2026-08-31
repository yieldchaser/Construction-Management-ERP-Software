# AGENT PROMPT: two gaps from the last run

Short run, two items. Both were required by the last prompt and both were missed. The rest of that run verified clean, so nothing else in it needs revisiting.

Report as before: for each item, the command, its exit code, and one sentence. No pasted output. "Not run" is an acceptable answer.

---

# PART 1: Aadhaar numbers leave the product unmasked in two exports

The last run masked `aadhaar_number` correctly in the parties table, with a permission gated and logged reveal. **Both export paths were missed**, and an export is the case that matters most, because a file that leaves the product cannot be recalled.

There are exactly two leak points. A sweep of every report and every router confirms there are no others.

## 1.1 The Party Library report, server side

`backend/app/routers/reports.py:1573`, inside `_rep_party_library`:

```python
"Aadhar Card Number": p.aadhaar_number or "",
```

This report is viewable and downloadable like any other, so the number leaves the server in full.

**Mask it server side**, in this function, to the last four digits in the shape `XXXX XXXX 1234`. Masking here covers both the on-screen view and every download format at once, and means the unmasked value never leaves the server through this path regardless of which client asks.

Add a small helper for the masking rather than writing the slice inline, and put it where other report helpers in that file live.

## 1.2 The parties CSV export, client side

`frontend/src/app/c/[company_id]/d/library/page.tsx:619`, in the CSV row builder:

```js
item.aadhaar_number,
```

The file already has the right helper at line 87, `maskAadhaar`, which the table uses. **Use it here.** One-line change.

**The CSV gets no reveal.** The permission gated reveal on the table is correct and stays; an export does not get one, because once the file exists the control is gone.

## 1.3 What stays unmasked, deliberately

The same report and the same CSV also carry `Account Number`, `PAN Card Number`, `Passport No.` and bank details. **Leave those as they are.** A business genuinely needs bank details to pay a vendor and PAN to deduct TDS, and a party master export without them is useless. Aadhaar is the one carrying a specific restriction on storage and disclosure, and it is the one being masked.

Do not widen this to other fields, and do not narrow it either.

---

# PART 2: goods receipt cancellation has no button

`POST /apis/v3/procurement/grns/{grn_id}/cancel` exists at `procurement.py:1134` and **nothing in the frontend calls it.** The reachability gate reports exactly one unreachable route and this is it.

The backend half is complete and correct. It already:

- requires `procurement:edit`,
- returns 404 when the GRN is missing and 409 when it is already cancelled,
- subtracts each item's `received_qty` back out of `on_hand_qty`,
- writes a reversing `MaterialTransaction`,
- and recalculates the linked purchase order's status when that PO is not already cancelled or closed.

So this is a wiring job, not a stock-accounting job. **Do not modify the endpoint.**

## Build

Add a cancel action to the GRN rows in `frontend/src/app/c/[company_id]/d/procurement/page.tsx`. The GRN lists are at roughly line 1202 and line 1249; put the action on both if they are separate surfaces.

- Confirmation dialog before sending, naming the GRN and stating plainly that the received quantities will be taken back out of stock. This reverses an inventory movement, so the user must know that before confirming.
- Hide or disable the action on a GRN that is already cancelled, so the 409 is not the way a user discovers the state.
- Surface the endpoint's own message on failure through `readErrorDetail`.
- Refresh the procurement data on success so the stock figures on screen reflect the reversal.

---

# Rules

- **No authoring scripts.** Two files and one wiring change do not need one.
- Every write branches on `res.ok` and surfaces `readErrorDetail`.
- `Badge`, `Icon` from the closed 120-name union, semantic tokens only. No raw palette, gradients, hex, `hover:bg-white/N`, control glyphs, emoji, inline shadows.
- Plain language in UI copy. No endpoint paths, table names or permission keys. No em dashes.
- Do not change the GRN cancel endpoint or any other backend behaviour. Part 1's only backend change is the masking inside `_rep_party_library`.

---

# Definition of done

Command, exit code, one sentence.

- [ ] `_rep_party_library` masks the Aadhaar number server side. State what the report now shows for a party whose stored number is twelve digits.
- [ ] The parties CSV export uses `maskAadhaar`. `grep -n "item.aadhaar_number" frontend/src/app/c/\[company_id\]/d/library/page.tsx` no longer shows an unmasked value in the row builder.
- [ ] Account number, PAN and passport are unchanged in both the report and the CSV.
- [ ] The table reveal still works and is still logged to `KYCAccessLog`.
- [ ] GRN cancel is reachable from the UI, confirmed before sending, hidden on an already cancelled GRN.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable** and the exemption file is still 30 entries.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1146 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `cd frontend && npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13.
- [ ] **Commit and push to `origin/main`.**

Run every box. The last run did good work and then left five of these unreported, which meant re-verifying the whole thing to find the two gaps above. Running them takes minutes; not running them costs a full review.
