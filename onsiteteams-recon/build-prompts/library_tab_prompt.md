# SiteFlow — Library Tab (company-level) — mostly done, small gap-fill

## Context
Next after Setting (done, 8 rounds, all verified). Library is a top-level company nav item. **This one's nearly complete already** — audit first, this should be a fast round.

`backend/app/routers/library.py` (31 endpoints) already has full CRUD for: Party, Asset Type, Cost Code, Deduction, Progress, Workforce, Material, Rate, **and Retention (`/retentions`) and Material Category (`/material-categories`) — backend already exists for these two, just not exposed in the frontend nav**. `frontend/src/app/c/[company_id]/d/library/page.tsx` (1368 lines) already has working UI for 8 of the 11 recon sub-libraries: Party, Asset Type, Cost Code, Deduction, Progress, Workforce, Material, Rate.

## Gap 1 — wire up 2 already-built backends to the frontend nav
Add **Retention Library** and **Material Category Library** as sub-nav tabs (same pattern as the existing simple-list libraries like Asset Type/Deduction/Progress). Backend is done — `GET/POST/DELETE /library/retentions/{company_id}` and `/library/material-categories/{company_id}` — just needs list UI + create form + delete wired in, following the exact visual/interaction pattern already used for the other simple libraries in this same file.

## Gap 2 — Todo Library (genuinely missing, build from scratch)
Recon: single column "To Do" (name only), search "Search To Do", "+ Add To Do" button — same minimal pattern as Progress Library (single-field, name-only, add/edit/delete). No `LibraryTodo` model exists. Build:
- `LibraryTodo` model: id, company_id, name, created_at — same shape as `LibraryDeduction`/`LibraryProgress` (check those for the exact pattern, copy it).
- `GET/POST/DELETE /library/todos/{company_id}` in `library.py`.
- Frontend tab, same simple-list pattern as the existing ones.

Note: this is a **preset/canned label list** (like Progress Library's "Half Done" style entries), unrelated to the `todos` table/router already built for the Team Schedule/Project Tab "To Do" tab (that's actual task items with due dates/assignees — a different entity). Don't confuse or merge them.

## Sanity check before building
Quickly confirm the 8 already-built sub-libraries actually match the recon field-for-field (column headers, form fields) — you likely built these correctly during earlier rounds since they were driven by the same recon, but a fast confirmation pass is cheap insurance given this tab hasn't been through a dedicated verification round yet. Specifically check:
- **Material Library** "New Material" form: Material Name, Unit of Measurement + "+Alternate UOM", GST%, Category, Lead Time (Days), Item Code, HSN, Specifications — full unit dropdown list (Barrel/Brass/Bundle/CKM/... — the same master unit list used elsewhere in the app already, reuse it, don't re-type it).
- **Rate Library** "New Item" form: Item Name*, Item Code, Unit*+GST%*, Category, Unit Cost Price*, Mark Up (₹/% toggle), Unit Sale Price, Note. Table columns: S.No | Item Name | Cost Code | Unit | GST | Cost Price | Selling Price.
- **Party Library** list: Name/Mobile/Type/Rating columns (Rating = star display, check if any rating data actually exists anywhere or if it's cosmetic-only — flag if unenforced/unpopulated rather than faking stars).
- **Workforce Library** "Add Workforce": Worker Type + Hourly/Daily toggle, Salary Per Shift*, Shift Hours (default 8), Cost Code picker — this should already match the Payroll tab's identical Add Workforce flow (same `LibraryWorkforce` model) — confirm no drift between the two entry points.

If anything's off, fix it as part of this round; if everything checks out, just confirm in your report rather than re-building.

## Rules (unchanged)
- Audit first — most of this is done, don't rebuild working code.
- Reuse the existing simple-list pattern for Retention/Material Category/Todo — don't invent a new UI pattern for what's structurally identical to Asset Type/Deduction/Progress.
- No invented taxonomies, verbatim labels from recon.
- Full file-touch disclosure, one gap at a time if needed, report back for verification.
