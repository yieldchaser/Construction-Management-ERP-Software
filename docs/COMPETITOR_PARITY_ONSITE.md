# Onsite (competitor) parity — gap analysis

**Source:** App Store "Version History" screenshots supplied by the founder 2026-08-28, versions
14.8.7 → 14.9.4. The raw capture is preserved unchanged in
[`COMPETITOR_PARITY_ONSITE_BACKLOG.md`](./COMPETITOR_PARITY_ONSITE_BACKLOG.md); this file is the
gap-check against SiteFlow, run 2026-08-29 after the R3 verification completed.

## How to read this

| Verdict | Meaning |
|---|---|
| **HAVE** | Shipped in SiteFlow and verified in this pass by reading the code. |
| **PARTIAL** | The data model or backend supports it; a surface, a field, or the UI is missing. Usually cheap. |
| **MISSING** | No model, no endpoint, no UI. A real build. |

**Method and its limits.** Each row was checked by grepping the models, routers and console for the
feature's mechanism, and by reading the hits. Two guards were applied after an earlier mistake in this
audit: every alternation uses proper `-E` syntax (a `\|` inside `grep -E` matches a literal pipe and
silently returns zero), and each sweep was self-tested against a known-present and a known-absent token
before its output was believed. Verdicts are nonetheless **evidence of absence in the codebase**, not
proof a feature is unreachable — a MISSING row means nothing in the repo implements it.

**What this is not.** Onsite's changelog is marketing copy. It says a feature exists, not how deep it
goes. Do not treat "MISSING" as "we are behind" without a product judgement about whether the feature
is worth having. Several of these are genuinely small; a few are strategic.

---

## Summary

| | Count |
|---|---|
| HAVE | 9 |
| PARTIAL | 12 |
| MISSING | 20 |
| Not applicable (their bug fixes, UI polish, iOS-specific) | 4 |

**Three of these gaps are already open defects in our own register**, found independently by the
audit. They are the highest-value items here because they are both a competitor gap *and* a live bug:

- **Subcontractor work-order billed value** (14.9.4 #1) = our **R2-762**, filed this round.
- **Bill To / Ship To auto-fill on party select** (14.9.2) = the area of our **R2-763**, where one
  "Ship To" input currently feeds four different fields.
- **Expense/sales tagging** (14.8.8) = our cost-code library, where **R2-764** found three of four
  write paths ungated.

---

## 14.9.4 — most recent

| # | Onsite feature | Verdict | Evidence / note |
|---|---|---|---|
| 1 | Subcontractor WO shows billed value at a glance | **MISSING** | `WOResponse` (`billing.py:65-77`) has no `billed_amount`; the console prints a hardcoded ₹0. **This is our R2-762** — fixing that finding delivers this feature. `Bill.wo_id` exists (`models.py:677`) so the data is one SUM away. |
| 2 | Unread message counts on the task list | **MISSING** | Zero occurrences of `unread` in models or routers. Needs a per-user read-watermark per chat group. |
| 3 | Download equipment expense bills as PDF | **MISSING** | No PDF endpoint in `equipment.py`. The generator machinery exists (`resolve_supplier_tax_details`, used by 4 documents) so this is a new endpoint on proven rails, not new infrastructure. |
| 4 | Downloaded files keep their original file name | **PARTIAL** | `downloadWithAuth` exists and is shared across three surfaces (our R2-454 fix); confirm it sets the anchor `download` attribute from the server's `Content-Disposition` rather than a synthetic name. |
| 5 | "Rented equipment" field at stock level | **MISSING** | No `rented`/`rental` anywhere in models. Owned-vs-rented is a real distinction for plant costing — it changes whether depreciation or hire charge applies. |
| 6 | Search + pagination on party document lists | **MISSING** | No pagination anywhere in the backend (`offset`/`skip` absent from models and list endpoints). This is a **systemic** gap, not a party-list one: every list endpoint returns everything. Worth treating as a platform item. |
| 7 | Filters on company-level payment requests | **PARTIAL** | The company-level endpoint exists (`finance.py`, `/finance/payment-requests/{cid}`); filters are not implemented. |
| 8 | Project name shown on settled/unsettled bills | **PARTIAL** | `Bill.project_id` exists; the settle view does not resolve and show the name. Cheap. |
| 9 | Expense due dates visible while settling | **PARTIAL** | `Bill.due_date` exists and is used by the subcontractor on-time metric (`analytics.py`); not surfaced in the settle UI. Cheap. |
| 10 | Search for units | **MISSING** | No unit master exists — units are free-text strings on materials. Related to our R2-297 (unit change locked while stock exists) and R2-488 (per-unit stock breakdown): both would be sturdier with a unit master. |
| 11 | OT rate editable at the attendance level | **PARTIAL** | `overtime_rate` exists as a column (`models.py:1629`) but is set at the profile level, not per attendance row. |
| 12 | Subcontractor rate library | **MISSING** | No `SubcontractorRate` model. We have `LibraryParty` and a cost-code library; this is a rate card per subcontractor per item. |
| 13 | Liveliness check + delay on attendance punch | **MISSING** | `face_recognition.py` exists but has no liveness detection. Anti-spoofing for attendance is the point of the feature — without it, face punch is a photo of a photo away from being defeated. Consider its weight before building: it is the one item here with a fraud dimension. |
| 14 | Full task hierarchy visible when tagging attendance | **PARTIAL** | Tasks and predecessor links exist (`planning.py`); the attendance tagger does not render the hierarchy. |
| 15 | Quotations linkable directly to leads | **HAVE** | `CRMQuotation.lead_id` is non-nullable (`models.py:1188`) — quotations already hang off leads. |
| 16 | Bug fixes (image crash, equipment category) | **n/a** | Their defects. |

## 14.9.3

Published as "fixes and improvements" with no detail. Nothing to gap-check.

## 14.9.2

| Onsite feature | Verdict | Evidence / note |
|---|---|---|
| Auto-fill Bill From/To and Ship From/To on party select, across Purchases, Sales, Subcon Bills, Equipment Expense | **MISSING** | No auto-fill; and the current state is worse than absent — **R2-763** found ONE "Ship To" input posting into `ship_to`, `notes` and `details` across three document types. Fix R2-763 and build this together; they touch the same modal. |
| Equipment shift marking (mark, delete) | **MISSING** | `EquipmentDeployment` records hours (our R2-357) but has no shift concept. |
| Auto-generated bill numbers (purchases, subcon, expenses, credit/debit notes, material returns) | **PARTIAL** | Numbering settings exist (`grn_numbering`, validated per our R2-546) and `next_party_id_custom` proves the sequence pattern (our R2-440). Not extended to bills. Note **R2-745's invoice-number clash 409** already exists on the conversion path — an auto-numberer must respect it. |
| Vendor tagging at party creation (Equipment Supplier / Subcontractor / Material Supplier) | **PARTIAL** | `LibraryParty.party_type` exists (`models.py:2031`, "Supplier, Subcontractor, Client") but is free text with no enforced vocabulary — the same shape as the `priority` gap in **R2-759**. Constrain it when you build the filter. |
| Project-wise filters on pending approvals and material requests | **PARTIAL** | Both collections exist; filters do not. |
| Revamped Payment Detail page | **n/a** | UI polish, no functional claim. |
| Payment Request page at company level (mobile) | **HAVE** | `/finance/payment-requests/{cid}` is company-level and permission-gated. |
| Task chat: unread per user, status-change logs with comments | **PARTIAL** | Chat and task comments exist (`chat.py`, `planning.py:735-752`, with server-stamped authorship per our R2-455). Unread counts are missing (see 14.9.4 #2); status-change logging is missing. |

## 14.9.1

| Onsite feature | Verdict | Evidence / note |
|---|---|---|
| Company Branch selection in Projects | **HAVE** | Branch model plus branch masthead precedence in 5 routers, verified under our R2-403/R2-607. |
| Location tracking for Task Progress & Inspections | **MISSING** | Geofencing exists for attendance only (`is_within_geofence` on two models). Blocked in practice by **R2-750** — the project API cannot store site coordinates at all, so *any* geofence feature is inert until that lands. **Fix R2-750 first.** |
| Material Request warnings and restriction controls | **HAVE** | `po_restriction` (our R2-478) and `negative_stock_lock` (our R2-254) both enforced. |
| Created & Approval timestamps in Approval History | **HAVE** | `ApprovalAction` carries `level`, `action`, `approver_user_id`, `approver_label`, `comment`, `created_at` (`models.py:1522-1534`). |
| DPR AI Insights downloadable | **MISSING** | No AI insight generation anywhere. A genuine product decision, not a gap to close reflexively. |
| Party Type filter in Party Library | **PARTIAL** | Column exists, filter does not. Pair with the vendor-tagging vocabulary above. |
| Material Request & Receipt timestamps | **HAVE** | Indents and GRNs carry timestamps. |
| Custom Fields for Leads and Other Expenses | **PARTIAL — cheap and specific** | The backend **already supports six entity types**: `CUSTOM_FIELD_ENTITY_TYPES = ("project", "task", "bill", "invoice", "lead", "vendor")` (`custom_fields.py:14`), with a model map at `:19`. The console builder was deliberately cut to project/invoice by our **R2-156** fix, because those were the wired types. Re-widening the select to `lead` and `vendor` is most of this feature — **but verify each added type renders end to end before offering it**, or you re-create the false affordance R2-156 removed. |
| Material Unit management with Dual Unit support | **MISSING** | No unit master, no secondary unit. See 14.9.4 #10. |
| Add Fuel entries directly from Petrol Pumps | **MISSING** | `FuelLog` exists with odometer and date guards (our R2-570) but no vendor/pump linkage. |
| Duplicate entry validation for invoices, bills, challans, transfers, E-Way Bills | **PARTIAL** | Invoice-number clash 409 exists (`crm.py`), three-way PO/GRN uniqueness exists with a DB constraint (our R2-594). No challan or E-Way concept at all. |
| Assign Inspections directly to Tasks | **MISSING** | `Inspection` has no `task_id`. |
| GST editable in Material Sales items | **PARTIAL** | `gst_rate` exists on library items; editability at the sales line needs checking per surface. |
| Item Code, Lead Time, Unit Cost on Material Items | **HAVE** | `item_code`, `lead_time`, `unit_cost` all present on `LibraryMaterial` (`library.py`). |

### 14.9.1 improvements (their platform work)
Improved inspection workflows, iOS 26 / UIScene migration, Google Maps + deep links + push
verification, PDF zoom and image crash fixes, Flutter radio-button updates. **n/a** — mobile-native
concerns. One is worth noting: they verify **push notifications** as working. Ours are not delivered at
all (our R2-199 removed the false "Enable Push" claim; actual delivery is the parked Firebase Blaze
item). If push is competitively required, that parked item becomes a real backlog entry.

## 14.9.0 / 14.8.7 — bug fixes only. **n/a**

## 14.8.8

| Onsite feature | Verdict | Evidence / note |
|---|---|---|
| Add Trips directly in Equipment Form | **MISSING** | No trip concept. Relevant for hired vehicles billed per trip rather than per hour — our equipment costing is hours × rate plus fuel (our R2-357). |
| Leave Management System | **HAVE** | `LeaveRequest` (`models.py:1485`) and `LeaveTemplate` (`:1554`, company-scoped annual policy), with list / create / approve endpoints (`hr.py:1082-1109`) and templates (`:1352-1357`). Approved leave already feeds payroll `days_present`. **Note:** our **R2-754** found the *Holiday Calendar* — a different thing — feeding nothing into payroll. Leave works; holidays do not. |
| Expense and sales tagging | **PARTIAL** | Cost codes are the tagging mechanism, and **R2-764** found the library gate applied to payments only — quotation items, payroll profiles and library materials still accept invented codes that roll up nowhere. Fix R2-764 and this becomes real. |

---

## Recommended sequencing

**Tier 1 — ships as a by-product of fixing our own defects.** No new design work; these are already
in the remediation plan.

1. Subcon WO billed value (**R2-762**)
2. Bill To / Ship To field separation (**R2-763**) — then add the auto-fill on top
3. Cost-code tagging integrity (**R2-764**)
4. Project site coordinates (**R2-750**) — unblocks *any* location feature

**Tier 2 — cheap, backend already supports it.** Roughly a day each.

5. Custom fields for `lead` and `vendor` (re-widen the R2-156 select, verifying each type renders)
6. Project name on settled/unsettled bills; expense due dates in the settle view
7. Party-type filter, with the vocabulary constrained on the way in (avoid the R2-759 shape)
8. Filters on company-level payment requests and pending approvals
9. Equipment expense bill PDF (reuse the four-document generator)

**Tier 3 — platform work, worth doing once and properly.**

10. **Pagination and search across list endpoints.** Onsite lists this for party documents; we have it
    nowhere. Every list endpoint currently returns the full set. This is the single most structural
    item on the page and it gets worse with every tenant added.
11. Unit master with dual-unit support — strengthens R2-297 and R2-488
12. Auto-generated document numbers across bills, notes and returns
13. Unread message counts and task status-change logs

**Tier 4 — genuine new features, decide on merit.**

14. Subcontractor rate library
15. Equipment shifts and trips; petrol-pump fuel entry; rented-equipment flag
16. Inspections assigned to tasks; location tracking on task progress and inspections (after #4)
17. Liveness detection on face punch — *the only item here with a fraud dimension; weigh it above its
    position in this list if face attendance is used for payroll*
18. DPR AI insights; challans and E-Way Bills

## What NOT to copy

Onsite ships a feature list; we are shipping an ERP that has just been through a 599-finding audit.
Two cautions:

- **Every new surface added is a surface that must obey the rules the audit established** — server-
  computed identity, permission gates, honest empty states, no fabricated values, validated
  vocabularies. A feature added carelessly re-opens the classes this audit spent months closing.
- **Do not add features on top of the 23 partial fixes** listed in the remediation plan. Several of
  these parity items touch exactly the code that is still half-fixed. Order matters, which is why the
  sequencing above puts our own defects first.
