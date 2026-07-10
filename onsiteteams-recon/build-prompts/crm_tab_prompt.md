# SiteFlow — CRM Tab (company-level)

## Context
Next after Payroll (signed off). CRM is a top-level company nav item.

**Audit first — this one's already substantially built.** `backend/app/routers/crm.py` has `POST/GET /leads`, `PUT /leads/{id}`, `POST/GET /leads/{id}/quotations`. Models: `CRMLead`, `CRMQuotation`, `CRMQuotationItem` — plus a separate `Quotation` class at `models.py:1110` that may or may not be related/duplicate; check what it's used for (could be an older/different quotation entity, e.g. procurement quotations vs CRM quotations — reconcile, don't assume it's dead code without checking references). Frontend: `frontend/src/app/c/[company_id]/d/crm/page.tsx` already exists at 635 lines. Read all of this first, map against the spec below, extend gaps only.

Also delete stray `backend/payroll_check.db` (leftover throwaway test DB from last round).

## A. Sub-tabs: Leads | Quotation

## B. Leads sub-tab
Toolbar: search icon, **Assignee** dropdown, **Date Filter**, **Priority** dropdown, **Status** dropdown, **Source** dropdown, **Category** dropdown, **New Lead +** button (top right).
"Showing N of M leads" counter.

Table columns (customizable — a **"+"** icon at the far right of the header opens a column-visibility checklist): S.No | Lead Type | Contact Name | Last Updated | Contact Number | Status | Source, plus **toggleable extra columns**: Lead Name, Country Code, Lead Category, Lead Assignee, Priority, Email, Company Name, Address, Budget, Creation Date, Next Follow Up, Expected Closure, Last Contacted. All checked by default except "Lead Name" (which is unchecked/hidden by default, oddly — verify against your build's data model, but match this default state).

**New Lead form** (side drawer):
- LEAD ASSIGNEE (dropdown, company team member)
- DATE (defaults today)
- LEAD TYPE* (required, has inline validation icon)
- CONTACT NAME*
- Phone: country-code selector (+91 flag dropdown) + PHONE NO.*
- EMAIL
- COMPANY NAME
- ADDRESS
- SOURCE — dropdown with a **creatable, editable list** (gear icon to manage): Website, Facebook, Instagram, Google, Whatsapp, Referral, Cold Call, Email Campaign, + "New Source"
- CATEGORY — dropdown (similar creatable pattern, not fully captured — build as creatable like Source)
- LEAD STATUS — dropdown, creatable list: New Lead, Follow-Up, Proposal Stage, Converted, Lost, No Response, Irrelevant Lead, + "New Status"
- PRIORITY — dropdown: High / Medium / Low (default Medium)
- LAST CONTACTED DATE (date picker)
- EXPECTED CLOSURE DATE (date picker)
- BUDGET (numeric)
- DESCRIPTION (textarea)

Check `CRMLead` model against all these fields — add any missing columns (Source/Category/Status as creatable lookups likely need small lookup tables, same pattern as Payroll's Designation — company-scoped, creatable, not hardcoded enums).

## C. Quotation sub-tab
Toolbar: Search Quotation, Date Filter, status dropdown ("All"), **+ New Quotation** button.
Table: S.No | Date | Subject | Client | Est. Amount | Status. Empty state: "No Data Quotation".

**Quotation detail/edit page** (full page, not modal — opened by clicking a quotation or creating new):
- Header: Client name (e.g. bound from the lead) + "Quote" label (edit pencil icon), **QT. NO.** (auto e.g. "#QT-1"), **QT. Date**, **Status** dropdown ("Select Status")
- Action bar: **+ Section** (group line items), **+ Add Item ▾** (split button), **Save Quotation**, close (X)
- Line-item table columns: S.No | Item | N x L x W x H (dimension calc field — construction-specific quantity formula, likely Qty = N × L × W × H) | Cost Price | Selling Price | QTY | Tax(%) | Amount
- Left column below items: **+ Bank Details** (expandable — bank account picker, reuse Finance's `BankAccount` entity), **Terms and Conditions** (pre-filled boilerplate textarea, editable), **+ Add Note**, **Attach Media** (upload dropzone)
- Right column (computed summary):
  - Item Sub Total
  - CGST / SGST (split GST, India-specific — computed from item tax%)
  - Additional Discount (input)
  - Additional Charges (input)
  - **Total Amount** (computed = Sub Total + CGST + SGST + Additional Charges − Additional Discount)
  - Round Off (checkbox)
- Bottom sticky bar: **Cost Price: ₹X** | **Markup: ₹X** (= Total Amount − Cost Price, i.e. profit margin) | **Total Amount: ₹X**

This N×L×W×H dimension field and the Cost-Price-vs-Selling-Price-vs-Markup pattern is construction-quotation-specific (e.g. quoting a fabrication/civil job by volume) — check if `CRMQuotationItem` has fields for this or needs extending.

## Rules (unchanged)
- Audit crm.py + models + existing 635-line page first — this is mostly extend-not-rebuild.
- Reconcile the `Quotation` (models.py:1110) vs `CRMQuotation` naming collision before adding anything — figure out if they're the same concept accidentally duplicated, or genuinely different (e.g. procurement vs CRM), and say which.
- Source/Category/Status should be creatable company-scoped lookups, not hardcoded enums (same pattern as Payroll's Designation/Leave Template).
- No half-done pages, full file-touch disclosure every round.
- One sub-tab at a time: Leads → Quotation. Stop after each, report back for verification.
