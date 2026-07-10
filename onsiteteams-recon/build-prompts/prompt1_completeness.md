# SiteFlow — Completeness gaps (from HAR-based competitive audit)

## Context
Deep audit of competitor's actual backend traffic (not just UI screenshots) revealed a few real capability gaps versus what SiteFlow currently has. Everything else the audit found (RFQ, GRN, Inspection, Production, Design/Drawings, Chat, generic Custom Fields) already exists in this codebase — confirmed by direct grep, don't rebuild those.

## 1. Enterprise-level multi-company grouping (real gap)
Competitor has an `enterprise-id` concept above "Company" — one login can belong to/manage multiple separate companies as a holding-company tier. SiteFlow currently only supports single-company accounts (one user → one company).

Audit first: check current `User`/`Company`/`CompanyTeam` relationship shape before designing. Build:
- `Enterprise` entity (name, owner) — company-scoped rows get an optional `enterprise_id` FK.
- A user can belong to multiple companies under one enterprise; company-switcher UI (already may exist in some form for the project switcher pattern — reuse that interaction style).
- Enterprise-level rollup: aggregate KPIs/reports across all companies under one enterprise (reuse existing company-level stats endpoints, sum across the enterprise's companies rather than building parallel logic).
- Scope this reasonably — don't gold-plate. A functioning "switch company, see rolled-up numbers" flow is the bar, not a full enterprise-admin console.

## 2. ZATCA (Saudi e-invoicing compliance)
Competitor's company-config schema has an `is_zatca_enable` flag, confirming Gulf/Saudi market support. User has confirmed: build this now, even though no other Gulf-specific work exists yet.

**This is real government compliance — research the actual spec before implementing, don't guess the format.** ZATCA (Zakat, Tax and Customs Authority) e-invoicing has two phases:
- Phase 1 (Generation): invoices must be issued in a structured format with a QR code (Base64 TLV-encoded: seller name, VAT number, timestamp, invoice total, VAT total).
- Phase 2 (Integration): real-time/near-real-time clearance or reporting to ZATCA's API, cryptographic invoice signing (CSR/certificate onboarding with ZATCA), UBL 2.1 XML invoice format.

Do NOT implement from memory/assumption — pull the actual current ZATCA technical specification (fatoora/ZATCA developer portal documentation) before writing code. Scope as an **optional, toggleable per-company feature** (`is_zatca_enabled`, matches the flag-per-company pattern already used everywhere in Settings) — most companies won't need it, only ones actually invoicing in Saudi Arabia. Wire into the existing Sales Invoice / Client Invoicing flow (CRM Quotation → Sales Invoice path already built) as an additional compliance layer, not a parallel invoicing system.

Flag clearly in your report: what you implemented vs what would need a real ZATCA sandbox/certificate to fully test (likely the live clearance API call) — don't claim full production-readiness on the parts that need real Saudi tax-authority credentials to verify.

## 3. Minor completeness items (small, do these first — quick wins before the two big items above)
- **Custom Fields entity-type list**: backend already supports arbitrary `entity_type` strings (no hardcoded enum — confirmed flexible). The Setting tab's Custom Fields UI dropdown currently only shows "Purchase Order" as an example. Expand the dropdown to include all entities that make sense for SiteFlow: Project, Party, Labour Party, Sales Invoice, Subcon Work Order, Party Earning/Payroll, CRM Lead, Quotation, Purchase Order — matching the breadth competitor exposes.
- **Wallet (per-owner stored balance)**: competitor has a per-party/per-company-user wallet concept (`GET /wallet?owner_id=`), distinct from a company-wide cash account. SiteFlow's current Party balance (Advance Paid/To Pay, ledger-computed from bills) is functionally similar but computed-on-read rather than a stored running balance. Audit whether this distinction matters in practice (a stored wallet balance is faster to read at scale but harder to keep consistent) — if the current ledger-computed approach is working fine, this is likely NOT worth building as a separate feature. Flag your recommendation rather than building it reflexively.

## Rules (unchanged)
- Audit existing code before building each item — confirm what's already there.
- No half-done pages, no fabricated compliance claims on ZATCA — be explicit about what's tested vs untestable without real Saudi credentials.
- Full file-touch disclosure. One item at a time (small items → Enterprise grouping → ZATCA), stop after each, report back for verification.
