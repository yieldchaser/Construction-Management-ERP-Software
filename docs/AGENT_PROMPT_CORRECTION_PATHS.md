# AGENT PROMPT: notes that reference nothing, and records that cannot be corrected

Re-running the sweeps after the last run shows real progress. Hardcoded structural payloads are **0**. Schema fields the UI never sends are down from 22 to **17**. Resources with no update or delete are down from 65 to **33**.

This run closes what is left and is worth doing, and names what is deliberately staying as it is.

---

# PART 0: how to report this run

The last run produced good code and a report that could not be used as evidence. Five specific things in it were invented: a helper name, three test filenames, a pasted test failure from a file path that has never existed, two transaction types that appear nowhere in the backend, and a set of inventory numbers that did not match the test that was actually written.

So the evidence protocol changes, in your favour:

**Do not paste command output. Do not reconstruct terminal transcripts from memory.**

For every item in the Definition of Done, give exactly three things:

1. The command, verbatim, that proves it.
2. Its exit code.
3. One sentence saying what it showed.

Everything will be re-run independently anyway. Inventing a transcript costs you nothing and costs the review a full re-verification, so there is no reason to do it. **If you skipped a check, write "not run".** That is an acceptable answer. A fabricated one is not.

The same applies to names: quote file paths, helper names and field names **from the code in front of you**, never from memory.

---

# PART 1: debit and credit notes reference nothing and cannot be voided

`DebitNoteCreateRequest` and `CreditNoteCreateRequest` both accept `bill_id`, and the debit note also accepts `work_amount`. The backend stores `bill_id` and returns it. **No form sends either field.**

Consequences:

- A credit note cannot be traced to the invoice it offsets. In an audit, a note that adjusts an invoice without naming it is not a usable record.
- `work_amount` defaults to `0.0`, so the note loses its split between the taxable work value and GST, while `total_amount` and `gst_amount` are captured. The stored numbers do not add up.

Neither note type has an update or a delete, so a note issued for the wrong amount is permanent.

## Build

**1.1** Add a bill selector to the debit note and credit note forms, listing that party's non-cancelled bills, and send `bill_id`. Allow it to be left blank, since the field is `Optional` and a standalone note is legitimate, but make linking the obvious path.

**1.2** Collect `work_amount` on the debit note form and show the arithmetic, so the user sees work value plus GST equals the total. If the form currently derives the total some other way, make the three figures agree before sending.

**1.3** Add a cancel or void action for both note types. **Read the models first.** If either carries a status or cancelled marker, use it exactly as `bills` does. If neither does, add `POST /billing/debit-notes/{note_id}/cancel` and the credit note equivalent, following the guard pattern in `cancel_bill`. **Do not add a hard `DELETE` to a financial document.**

---

# PART 2: operational records with no correction path

Each of these can be created and never fixed or removed. All are records of something that happened on site or in the office, where the common failure is a wrong date, a wrong quantity, or a duplicate entry.

| Resource | File | Add |
|---|---|---|
| `procurement/grns` | `procurement.py` | cancel, not delete. A goods receipt moves stock, so reverse it the way the stock paths already do rather than erasing it |
| `drawings` | `drawings.py` | update and delete |
| `safety/toolbox-talks` | `safety.py` | update and delete |
| `safety/ppe-checks` | `safety.py` | update and delete |
| `quality/material-tests` | `quality.py` | update and delete |
| `settings/company-file` | `settings.py` | delete |
| `team-schedule/timesheets` | `team_schedule.py` | update (delete already exists) |
| `custom-fields/values` | `custom_fields.py` | update, unless the create path already upserts. **Check first and say which you found** |
| `hr/leaves` | `hr.py` | withdraw. `PUT /leaves/approve/{leave_id}` sets status and is an approver action; an employee who applied for the wrong dates has no way to withdraw their own request |

**GRN deserves care.** It is the receipt half of the stock ledger. Cancelling one must reverse the inventory movement it caused, and the existing reservation and transaction helpers are the place to do that. If the reversal cannot be done safely without changing backend behaviour beyond adding the endpoint, **stop and report it** rather than writing a partial reversal.

Every new endpoint carries the same permission and tenant checks as its sibling create handler in the same file. Copy that pattern; do not invent one.

---

# PART 3: Tally postings fall to defaults

`LedgerMappingCreateRequest` and its update twin accept `freight_ledger` and `surcharge_ledger`. `ConnectionCreateRequest` and its update twin accept `round_off_ledger`. **None of the four is sent by any form**, so freight, surcharge and round-off postings go to whatever the backend defaults to rather than the ledger the accountant nominated.

Add the three fields to the Tally integration screens built in the earlier run, beside the mappings already exposed there. These are accountant-facing configuration, so label them in the words a Tally user would recognise and leave them optional.

---

# PART 4: two remaining single fields

- **`project_avatar`** on `ProjectUpdate`. Projects can be given an image the settings form never collects. Add it wherever project settings are edited, matching how any other image in the product is handled. If no image upload pattern exists yet, **say so and skip it** rather than inventing one.
- **`source_ref_id`** on `TransactionCreateRequest`. **Check whether the server sets this on the paths that matter before touching it.** DPR consumption already sets `source_ref_id` to the DPR id server-side. If every path that needs it sets it server-side, this is correct as it is: report that and change nothing.

---

# PART 5: statutory payroll settings cannot be saved at all

This was previously deferred as needing the founder's input. Investigation showed it needs none: the defaults are already chosen in the model and both are the conservative ones. What it actually contains is a live bug.

## 5.1 The bug

`update_payroll_settings` at `settings.py:729` refuses any change unless the request carries `confirm_changes: true`:

```python
if changes and not payload.confirm_changes:
    raise HTTPException(status_code=400, detail="confirm_changes must be true to modify statutory payroll settings")
```

`savePayroll` in `settings/page.tsx:932` posts `pDraft` and nothing else. **So every attempt to save statutory payroll settings returns 400 and always has.** The handler sets `setPayrollStatus("error")` and shows no message, so the user sees a failure with no reason.

Fix it as the deliberate confirmation gate it is, not by removing the check. Show a confirmation dialog that names which settings are changing and states that they affect statutory deductions, then send `confirm_changes: true` on confirm. Surface the API message on failure through `readErrorDetail` instead of a bare error state.

## 5.2 The two fields, with their defaults already decided in code

Expose both on the statutory payroll settings form. **Neither needs a new default invented; the model already carries the right one.**

- **`pf_wage_ceiling`**, `models.py:105` and `:279`, already defaults to `15000.0`. That is the EPF statutory wage ceiling, and `_compute_payslip` caps the PF wage base at it per CD-4. Expose it as an editable amount so a company that contributes on full wages can raise it. Show the current value; do not silently reset it.
- **`assume_full_month_when_no_attendance`**, `models.py:103`, already defaults to `False`, and `hr.py:964` carries a comment saying it defaults off deliberately. Expose it as a toggle whose copy says plainly that turning it on pays a full month to staff with no attendance recorded. Leave the default off.

---

# PART 5B: party KYC documents

Also previously deferred. The two questions it was deferred on both have answers in the codebase.

**Where the files live is already solved.** `supabase_storage.py` provides `is_storage_configured`, `upload_bytes`, `create_signed_url(expires_in)` and `delete_object`, and `ensure_buckets` already creates its buckets with `public=False`. `files.py:268` is the working reference: check `is_storage_configured()`, upload, store the path. `aadhaar_file` and `pan_file` on `PartyCreate` are `Optional[str]` holding that path, not blobs.

**Who may read them follows the existing permission.** Gate upload and read behind the same permission that governs editing a party, exactly as the sibling handler does.

## Build

**5B.1** Add PAN and Aadhaar document upload to the party forms in `d/library/page.tsx` and the finance party modal, following the `files.py` upload pattern. Store the returned path in `pan_file` and `aadhaar_file`.

**5B.2** Serve them back only through `create_signed_url` with a **short expiry, 15 minutes**. Never make the bucket public, never render a raw storage path into the page, and never put the path in a link that survives being copied.

**5B.3** When a party is deleted, delete its stored objects with `delete_object`. An identity document that outlives the record it belonged to is the worst version of this feature.

## 5B.4 Mask the Aadhaar number, which is a defect that exists today

`aadhaar_number` is already collected in both party forms and stored. It is currently rendered in full in the parties table at `d/library/page.tsx:682` and written in full into the CSV export at `:502`.

**Mask it to the last four digits everywhere it is displayed or exported**, in the shape `XXXX XXXX 1234`. Keep the stored value intact. This is independent of the upload work and should be done even if the upload is not.

**One thing stays with the founder, and it is a legal question rather than an engineering one.** Storing images of Aadhaar cards by a private entity in India is restricted, and the usual guidance is to hold masked Aadhaar only. The number is already being stored today, so this is an increase in exposure rather than a new one. Build the upload as specified, and **write a short note in your report flagging that the Aadhaar document feature should be reviewed by an advisor before launch.** Do not make that call yourself and do not skip the build over it.

---

# PART 6: still correct as they are, and still not to be touched

Restated because the sweep will keep flagging them:

- **`labour/muster-roll`** is frozen at write time by design (R2-333). Re-posting the same project, contractor, day and role updates it in place. **No update endpoint. Ever.**
- **`procurement/transactions`** is an append-only stock ledger. Corrections are reversing entries.
- **`assets/entries`** are derived from a depreciation schedule.
- **`public/leads`** are records of what a member of the public submitted.
- **`chat/messages`.** Leave as is in this run.
- **`billing/bills`, `procurement/pos`, `procurement/indents`, `billing/work-orders`** already have cancel or amend paths. Do not add a raw delete to any financial or procurement document.

---

# Rules

- **No authoring scripts.** This has now been ignored twice, most recently to patch four frontend pages. The output happened to be clean, but that mechanism is behind every fabrication in this repository's history. Edit in place.
- Every write branches on `res.ok` and surfaces `readErrorDetail`. A `catch` alone is not error handling.
- New endpoints match their sibling create handler's permission and tenant checks exactly.
- `PageHeader` action slot, `Badge`, `EmptyState`, `FieldHint`, `Icon` from the closed 120-name union.
- Semantic tokens only. No raw palette, gradients, hex, `hover:bg-white/N`, control glyphs, emoji, inline shadows.
- Plain language in UI copy. No endpoint paths, table names or permission keys. No em dashes.

---

# Definition of done

Command, exit code, one sentence. Nothing pasted.

- [ ] Debit and credit notes send `bill_id`; the debit note sends `work_amount` and its three figures agree.
- [ ] Both note types have a cancel path. No hard delete was added to either.
- [ ] The nine Part 2 resources have their correction paths. GRN cancel reverses the stock movement, or is reported as unsafe and left alone.
- [ ] The four Tally ledger fields are sent by the integration screens.
- [ ] `project_avatar` handled or explicitly skipped with a reason. `source_ref_id` investigated and reported, changed only if genuinely needed.
- [ ] Statutory payroll settings can be saved. The confirmation dialog names what is changing and the request carries `confirm_changes: true`. The 400 message is surfaced on failure.
- [ ] `pf_wage_ceiling` and `assume_full_month_when_no_attendance` exposed, defaults unchanged at 15000.0 and false.
- [ ] PAN and Aadhaar upload work, stored via the `files.py` pattern, read only through a 15 minute signed URL, deleted with the party.
- [ ] `aadhaar_number` masked to the last four digits in the parties table and the CSV export.
- [ ] A note in the report flagging the Aadhaar document legal review.
- [ ] Part 6 untouched. Confirm `labour/muster-roll` still has no update endpoint.
- [ ] `python scripts/verification/check_route_reachability.py` reports **0 unreachable** and the exemption file is still 30 entries.
- [ ] `cd backend && PYTHONPATH=. pytest tests/coverage -n 4` passes. It is **1140 passed, 4 skipped** today and must only go up.
- [ ] `cd frontend && npx tsc --noEmit` and `cd frontend && npm run build` both run and both clean.
- [ ] `python scripts/verification/verify_help_claims.py` still `[PASS]` at 37 entries, 38 endpoint citations, 73 file:line citations, 116 UI labels.
- [ ] Design counts unchanged: raw palette 0, gradients 0, `hover:bg-white/N` 0, inline shadows 0, hand-rolled pills 13.
- [ ] **Commit and push to `origin/main`** at part boundaries.
