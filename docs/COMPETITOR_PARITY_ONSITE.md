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
| 1 | Subcontractor WO shows billed value at a glance | **HAVE** | Shipped in R2-762. `WOResponse` has `billed_amount` computed from active bills. |
| 2 | Unread message counts on the task list | **HAVE** | Shipped in Tier 3 Item 13: `POST /chat/groups/{group_id}/read` and `unread_count` on `ChatGroupResponse`. |
| 3 | Download equipment expense bills as PDF | **HAVE** | Shipped in Tier 2 Item 9 via `GET /equipment/expenses/{bill_id}/pdf`. |
| 4 | Downloaded files keep their original file name | **PARTIAL** | `downloadWithAuth` exists and is shared across three surfaces (our R2-454 fix); confirm it sets the anchor `download` attribute from the server's `Content-Disposition` rather than a synthetic name. |
| 5 | "Rented equipment" field at stock level | **MISSING** | No `rented`/`rental` anywhere in models. Owned-vs-rented is a real distinction for plant costing — it changes whether depreciation or hire charge applies. |
| 6 | Search + pagination on party document lists | **HAVE** | Shipped in Tier 3 Item 10: pagination and search with `X-Total-Count` headers across Parties, Bills, Transactions, and Materials. |
| 7 | Filters on company-level payment requests | **HAVE** | Shipped in Tier 2 Item 8 with `project_id` and `status` query filters on `GET /finance/payment-requests/{company_id}`. |
| 8 | Project name shown on settled/unsettled bills | **HAVE** | Shipped in Tier 2 Item 6 (`project_name` included on bills and transaction rows, surfaced in settlement view). |
| 9 | Expense due dates visible while settling | **HAVE** | Shipped in Tier 2 Item 6 (`due_date` included on transaction rows and surfaced in settlement view). |
| 10 | Search for units | **HAVE** | Shipped in Tier 3 Item 11: `GET /library/units` master search endpoint and dual-unit support on `LibraryMaterial`. |
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
| Auto-generated bill numbers (purchases, subcon, expenses, credit/debit notes, material returns) | **HAVE** | Shipped in Tier 3 Item 12: `next_document_number` sequence generator, `GET /billing/next-number/{company_id}`, and auto-generation on create. |
| Vendor tagging at party creation (Equipment Supplier / Subcontractor / Material Supplier) | **HAVE** | Shipped with constrained vocabulary in Party Library creation and filtering (Tier 2 Item 7). |
| Project-wise filters on pending approvals and material requests | **HAVE** | Shipped in Tier 2 Item 8 (`GET /procurement/indents/company/{company_id}?project_id=...&status=...`). |
| Revamped Payment Detail page | **n/a** | UI polish, no functional claim. |
| Payment Request page at company level (mobile) | **HAVE** | `/finance/payment-requests/{cid}` is company-level and permission-gated, now with `project_id` and `status` filtering (Tier 2 Item 8). |
| Task chat: unread per user, status-change logs with comments | **HAVE** | Shipped in Tier 3 Item 13: Task status changes auto-logged to `TaskComment` with authenticated author; chat unread counts and read-watermark endpoint shipped. |

## 14.9.1

| Onsite feature | Verdict | Evidence / note |
|---|---|---|
| Company Branch selection in Projects | **HAVE** | Branch model plus branch masthead precedence in 5 routers, verified under our R2-403/R2-607. |
| Location tracking for Task Progress & Inspections | **MISSING** | Geofencing exists for attendance only (`is_within_geofence` on two models). Site coordinates now supported on Projects via R2-750. |
| Material Request warnings and restriction controls | **HAVE** | `po_restriction` (our R2-478) and `negative_stock_lock` (our R2-254) both enforced. |
| Created & Approval timestamps in Approval History | **HAVE** | `ApprovalAction` carries `level`, `action`, `approver_user_id`, `approver_label`, `comment`, `created_at` (`models.py:1522-1534`). |
| DPR AI Insights downloadable | **MISSING** | No AI insight generation anywhere. A genuine product decision, not a gap to close reflexively. |
| Party Type filter in Party Library | **HAVE** | Shipped in Tier 2 Item 7 (backend query parameter `party_type` + UI dropdown selector). |
| Material Request & Receipt timestamps | **HAVE** | Indents and GRNs carry timestamps. |
| Custom Fields for Leads and Other Expenses | **HAVE** | Shipped in Tier 2 Item 5: builder re-widened to `lead` and `vendor`, validated end-to-end. |
| Material Unit management with Dual Unit support | **HAVE** | Shipped in Tier 3 Item 11: `unit` and `alternate_unit` validation, storage, and unit master search. |
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

**Tier 1 — ships as a by-product of fixing our own defects.** [COMPLETED & SHIPPED in Batches 1 & 2]
1. Subcon WO billed value (**R2-762**) — SHIPPED
2. Bill To / Ship To field separation (**R2-763**) — SHIPPED
3. Cost-code tagging integrity (**R2-764**) — SHIPPED
4. Project site coordinates (**R2-750**) — SHIPPED

**Tier 2 — cheap, backend already supports it.** [COMPLETED & SHIPPED in Batch 4]
5. Custom fields for `lead` and `vendor` — SHIPPED (`fffb5ed`)
6. Project name on settled/unsettled bills; expense due dates in the settle view — SHIPPED (`d22da01`)
7. Party-type filter, with the vocabulary constrained on the way in — SHIPPED (`b62f212`)
8. Filters on company-level payment requests and indents — SHIPPED (`eb2498b`)
9. Equipment expense bill PDF — SHIPPED (`be4a9c7`)

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
