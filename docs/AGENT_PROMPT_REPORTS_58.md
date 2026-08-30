# AGENT PROMPT — Wire the 58 unimplemented reports

Paste this whole file as the task. Do not stop until the Definition of Done is met.

---

## Standing rules for this task

**You do not stop between batches.** There are 58 reports. You will work through all 58 in one continuous run. Do not ask "shall I continue?", do not summarise and wait, do not propose a plan and pause for approval. After each report is verified, immediately start the next one. The only acceptable reasons to stop early are: (a) all 58 are done and verified, or (b) you hit a genuine blocker you cannot resolve after two independent attempts, in which case you record it in `docs/BACKLOG.md` as a new `D-0xx` row, skip that one report, and **continue with the rest**.

**No regressions.** The 24 reports that already work must still work when you finish. You will prove this, not assume it.

**No fake completions.** A report is done when it returns real rows from real tables for a tenant that has data. A handler that returns `[]` because you never checked whether the query is correct is not done. A handler that hardcodes sample data is unacceptable on this project.

---

## Background — read this before touching anything

The reports catalogue at `frontend/src/app/c/[company_id]/reports/page.tsx` lists **82** reports. The backend at `backend/app/routers/reports.py` implements **24** of them in the `_REPORT_HANDLERS` dict. The other **58** are badged "Coming soon" in the UI by the `IMPLEMENTED_REPORT_SLUGS` allowlist in that same frontend file.

That badge is currently **honest and correct** — it was verified that the frontend allowlist and the backend handler dict contain exactly the same 24 slugs, with zero mismatch in either direction. Nothing regressed. Those 58 reports never had a backend.

**The column specifications already exist and are authoritative. Do not invent columns.** `frontend/src/app/c/[company_id]/reports/[slug]/page.tsx` contains `REPORT_METADATA`, a record of **76** entries. Each entry has:

```ts
"slug-name": {
  title: string,            // exact display title
  hasDownload: boolean,     // whether a CSV/Excel export is offered
  filters: [{ label: string, type: "select" | "date", options?: string[] }],
  columns: string[]         // the EXACT ordered column list, mapped from the competitor
}
```

These column lists were hand-mapped by the founder against the competitor product (Onsite). **They are the spec. Match them exactly — same columns, same order, same labels.** If you believe a column is impossible to source from the schema, you do not silently drop it; see "When a column has no source" below.

## The work

### Group A — 54 reports that have a full column spec and need only a backend handler

Each already has a `REPORT_METADATA` entry with title, filters and columns. Build the backend handler to match.

```
 1. all-expense-deduction-retention   - All Expense Deduction / Retention Report
 2. asset-allocation                  - Asset Allocation Report
 3. asset-status                      - Asset Status Report
 4. boq-bom                           - BOQ BOM Report
 5. boq-item                          - BOQ Item Report
 6. boq-measurement-book              - BOQ Measurement Book
 7. boq-workorder-summary             - BOQ Workorder Summary Report
 8. budget-vs-actual-cost-code        - Budget vs Actual (Cost Code)
 9. budget-vs-actual-material-cost    - Budget vs Actual (Material Cost)
10. budget-vs-actual-material-qty     - Budget vs Actual (Material Qty)
11. company-expense                   - Company Expense Report
12. company-transactions              - Company Transactions Report
13. company-user-activity-leaderboard - Company User Activity Leaderboard
14. cost-code-expense-analysis        - Cost Code Expense Analysis
15. cost-code-library                 - Cost Code Library
16. daily-based-equipment-used        - Daily Based Equipment Used Report
17. equipment-expense-summary         - Equipment Expense Summary
18. equipment-library                 - Equipment Library
19. equipment-trip                    - Equipment Trip Report
20. equipment-usage-detail            - Equipment Usage Detail Report
21. fuel-efficiency                   - Fuel Efficiency Report
22. lead-status-funnel                - Lead Status Funnel Report
23. material-library                  - Material Library
24. material-purchase-item            - Material Purchase Item Report
25. material-received-without-po      - Material Received without PO
26. material-request-item             - Material Request Item Report
27. monthly-pl                        - Monthly P&L
28. ot-shift                          - OT / Shift Report
29. party-library                     - Party Library
30. payroll-library                   - Payroll Library
31. project-activity-leaderboard      - Project Activity Leaderboard
32. project-financial-summary         - Project Financial Summary
33. project-level-party-balance       - Project level Party Balance Report
34. project-operational-summary       - Project Operational Summary
35. project-wise-expense-summary      - Project Wise Expense Summary
36. project-wise-sales-summary        - Project Wise Sales Summary
37. quotation                         - Quotation Report
38. quotation-item                    - Quotation Item Report
39. rate-card-library                 - Rate Card Library
40. site-inspection                   - Site Inspection Report
41. staff-salary                      - Staff Salary Report
42. subcon-deduction-retention        - Subcon Deduction / Retention Report
43. subcon-material-issue             - Subcon Material Issue Report
44. subcon-measurement-book           - Subcon Measurement Book
45. subcon-workorder-summary          - Subcon Workorder Summary Report
46. task-boq-billed-unbilled          - Task BOQ Billed & Unbilled Qty Report
47. task-material                     - Task Material Report
48. task-resource-budget-vs-actual    - Task Resource Budget Vs Actual Report
49. task-revenue-expense              - Task Revenue & Expense Report
50. todo-report                       - To Do Report
51. unbilled-item                     - Unbilled Item Report
52. warehouse-current-stock           - Warehouse Current Stock Report
53. warehouse-stock-movement          - Warehouse Stock Movement Report
54. warehouse-transaction             - Warehouse Transaction Report
```

Note `lead-status-funnel` (#22) has `columns: ['(No tabular columns - rendered as a funnel/visual chart, not a data table)']`. It is a **visual funnel**, not a table. Give it a handler returning stage/count aggregates and render it as a funnel in the slug page. Do not force it into the generic table renderer.

### Group B — 4 reports needing BOTH a `REPORT_METADATA` entry and a backend handler

These appear in the catalogue (`viewSlug`) but have no `REPORT_METADATA` entry at all:

1. `company-attendance` — Company Attendance Report
2. `staff-monthly-salary-slip` — Staff Monthly Salary Slip
3. `staff-muster-roll` — Staff Muster Roll
4. `staff-punch-report` — Staff Punch Report

For these, derive the column list from the underlying tables plus how the equivalent screen already presents the same data (`frontend/src/app/c/[company_id]/d/attendance/page.tsx`, `.../d/hr/page.tsx`, `.../d/payroll-attendance/page.tsx`), write the `REPORT_METADATA` entry, then build the handler.

`staff-monthly-salary-slip` is a **PDF/document** report, not a table — check how the modal in `reports/page.tsx` already special-cases `"Staff Monthly Salary Slip"` and `"Staff Salary Report"` (it swaps the button to "Download PDF" and shows a Party Name field) before deciding its shape.

## How to implement each report

### 1. Find the data

Use the knowledge graph tools first (`semantic_search_nodes`, `query_graph`) rather than grepping blind — this project has a code graph and it is faster and cheaper than file scanning.

Models live in `backend/app/models/`. The schema is 139 tables / 1458 columns and has been fully verified, so the columns you need almost certainly already exist.

**Do not add migrations to make a report easier.** If you genuinely believe a column is missing, record it in `docs/BACKLOG.md` rather than adding one. Schema changes here go through a separate reviewed path, and CI-applied migrations are currently blocked by a billing issue (D-021, founder-owned) — so a migration you write will not actually reach production, and you will have shipped a report that works locally and returns errors live.

### 2. Write the handler

Read three or four existing handlers first — `_rep_dpr`, `_rep_company_payments`, `_rep_party_ledger`, `_rep_material_stock_movement` — and match their structure, signature, error handling and return shape. Invariants you must preserve:

- Returned row dict keys must be **exactly** the `columns` strings from `REPORT_METADATA`. The frontend renders columns by key and the CSV export derives headers from `Object.keys(rows[0])` (R2-077). A key mismatch renders a blank column with no error anywhere — it fails silently, which is the worst failure mode.
- On failure return `_REPORT_FAILED`. Do not raise, and do not return `[]` — `[]` means "no data", which is a different and legitimate answer.
- Register in `_REPORT_HANDLERS` under the exact slug.

### 3. Enforce tenant scoping — not optional

Every query must be scoped to the caller's company; every project-scoped report must additionally be scoped to a project the caller can access.

This codebase's RLS is correct but **inert by design** — the application layer is the only thing enforcing tenant isolation. A missing `company_id` filter is a live cross-tenant data leak, not a style issue. Reports are the highest-risk surface for this because they aggregate across a whole tenant by definition.

Copy the scoping approach from the existing handlers exactly: resolve the owning company from the loaded row or the validated request parameter, and run the same membership check the working handlers run, **before** returning any rows.

### 4. Wire the filters

Each `REPORT_METADATA` entry declares typed filters. The `type: "select"` filters carrying `options: ["All"]` are placeholders — populate them with real distinct values for that tenant. Filters must actually filter. A dropdown that renders but does nothing is worse than no dropdown, because it silently misrepresents the result set.

### 5. Move the slug out of "Coming soon"

Add the slug to `IMPLEMENTED_REPORT_SLUGS` in `frontend/src/app/c/[company_id]/reports/page.tsx` **only after** the handler is verified working.

The invariant: that Set must always equal the key set of `_REPORT_HANDLERS`. A coverage test already exists at `tests/coverage/test_c4_reports_catalogue_honesty.py` — read it, keep it passing, and extend it if it does not already assert set equality in **both** directions.

### When a column has no source

1. Do not drop it silently.
2. Do not fabricate it.
3. Emit the column with an explicit empty value so the shape still matches the spec.
4. Record it in `docs/BACKLOG.md` with the report slug, the column name, and why.

Report every such case in your final summary. The founder needs to know which columns are structurally unavailable versus merely unimplemented.

## Verification — per report, not deferred to the end

After each report, before moving to the next:

1. Call the endpoint for a tenant that has data. Confirm **real non-empty rows** where data exists.
2. Confirm returned keys match `REPORT_METADATA.columns` exactly — same set, same order.
3. Confirm a tenant with no such records gets an empty result, not an error.
4. If `hasDownload` is true, confirm the export path works and that `frontend/src/lib/csv.ts` still neutralises a leading `= + - @` (R2-755). A report cell containing user-typed text must never execute as a formula when the CSV opens in Excel or Sheets. Do not regress this.

Batch the test suite rather than running it 58 times. Use `pytest -n 4` (pytest-xdist is in `backend/requirements-dev.txt`) — takes the suite from ~214s to ~65s. **Do not delete or skip tests to go faster.**

## Definition of Done — all must hold

- [ ] All 58 slugs have a working handler, or are recorded in `docs/BACKLOG.md` with a specific reason.
- [ ] `IMPLEMENTED_REPORT_SLUGS` and `_REPORT_HANDLERS` contain the **identical** slug set, verified by a test rather than by eye.
- [ ] The 4 Group B reports have `REPORT_METADATA` entries.
- [ ] Every handler is tenant-scoped, and you can point at the line that does it for each one.
- [ ] Every report's returned keys match its spec'd `columns` exactly.
- [ ] Filters populate from real values and actually filter.
- [ ] Full suite passes: `pytest -n 4`, zero failures.
- [ ] **The 24 previously-working reports return the same rows they did before you started.** Capture their output before you begin, diff it at the end. "I didn't touch them" is not proof.
- [ ] `npm run build` in `frontend/` succeeds with no new type errors.
- [ ] Everything committed and **pushed to `origin/main`**. Verify with `git merge-base --is-ancestor HEAD origin/main` — mind the argument order; the reverse gives a false positive and has already left 48 commits unpushed on this project once.

## Final report

State: how many of the 58 are live; which were skipped and exactly why; which columns had no data source; the before/after regression diff for the original 24; and the test result with the command that produced it.

Do not claim a number you did not measure.
