# SiteFlow — Finance Tab (company-level)

## Context
Next after Team Schedule (done). Finance is a **top-level company nav item** (Dashboard, Report, Project, Team Schedule, **Finance**, Payroll, CRM, Library, Setting...) — company-wide aggregate, not scoped to one project.

**IMPORTANT — audit before building.** This repo already has substantial finance infrastructure: `backend/app/models.py` has a `BankAccount` model; `backend/app/routers/finance.py` already has `/payments`, `/ledger`, `/pl`, `/accounts/{company_id}` (GET+POST), `/payment-requests/{company_id}` (GET+POST+approve), `/cashbook/p2p`, and an `upload_payments` bulk-import endpoint. There's also an existing **2957-line** `frontend/src/app/c/[company_id]/d/finance/page.tsx`. A lot of this tab may already be built. Read both files fully first, map every spec item below to existing code (reuse/extend) vs genuinely missing (build), and report the gap map before writing new code.

Also — this is the **company-level** version of Party/Transaction work already built per-project (Project Tab build, now signed off). Reuse that exact backend logic (bills/debit_notes/credit_notes/library_parties/project_parties tables, the transaction-type taxonomy, Deduction/Retention/Cost Code sub-entities) with the project_id filter dropped for company-wide aggregation — same pattern as the Team Schedule Gantt reused Task data across projects. **Do not duplicate the transaction-type system.**

## A. Finance sub-tabs (top of page): Party | Transaction | Payment Requests | Accounts

## B. Party sub-tab
**4 summary cards** (note: company-level has 4, project-level Party tab had 2 — Advance Paid/To Pay):
- Advance Paid (green) — sum
- To Pay (red) — sum
- To Receive (red/pink) — sum — **new metric not in project-level Party tab**
- Advance Received (green) — sum — **new metric not in project-level Party tab**

Toolbar: search, Filter (icon), status dropdown ("Active"), Export, "+ New Party"
Table: Party Details | Type | Balance (₹) | Status
Status chip values observed: "Advance Paid" (green), "To Receive" (blue/purple), "I have Advance" (green), implied "To Pay" (red)

This is company-wide across ALL projects — same `library_parties` + roll-up logic already built (`_party_settlement` in `projects.py`), just remove the project_id scope and aggregate across every project the party is linked to. Reuse, don't rebuild.

**Add Party form** — same fields as before (Name, Phone w/ country code, Email, Party Type, Address, Party ID auto-gen editable, DOJ, Aadhaar+upload, PAN+upload) PLUS additional fields seen when party type = Contractor/Subcontractor:
- Contractor (role flag/dropdown)
- Service Rate Categories — "+ Tag Service Rate Category" (creatable tags)
- Opening Balance (₹, chevron detail)
- Bank Account link ("--NA--" default, chevron to link one of the company's Bank Accounts from section D)

Party creation can spin directly into a **Sub-Con Work Order** creation without leaving the flow (WO Title, party, Terms & Conditions rich-text editor with Bold/Italic/Underline/lists, Attach Media) — same Work Order entity as Project Tab's Subcon module, reuse it.

## C. Transaction sub-tab
**3 summary cards:**
- Total Invoice ₹ / sub "Unpaid Invoice: ₹X"
- Total Expense ₹ / sub "Unpaid Expense: ₹X"
- Company Balance ₹ (info tooltip) / sub "In: ₹X | Out: ₹Y" — sum of Cash + all Bank Account balances

Toolbar: Filter, Date Filter, "Unbilled Materials" button (badge "New" + count), "Pending Entries" button (+ count), "Create Transaction +"
Table: Party | Details | Status. Empty state: "No Data Transaction"

**Transaction types — same taxonomy as Project Tab's Transaction tab** (Payment In/Out, Debit Note, Credit Note, Party-to-Party, Sales Invoice, Material Sales/Purchase/Return/Transfer, Other Expense, Equipment Expense, Subcon Bill) — reuse those forms/endpoints entirely, just company-scoped (party dropdown spans all parties, not project-filtered; each transaction still records which project it belongs to as a column).

**Genuinely new at this level (not in project Transaction tab):**

1. **Internal Transfer** — new transaction type, 3 sub-modes via radio/tab selector:
   - Bank To Bank: From Bank Account dropdown, To Bank Account dropdown, Amount, Reference No., Notes
   - Cash Deposit: From = read-only "Cash Account (Company Wallet)" row showing current balance, To Bank Account dropdown, Amount, Reference No., Notes
   - Cash Withdraw: From Bank Account dropdown, To = read-only "Cash Account (Company Wallet)" row, Amount, Reference No., Notes
   - All three: Upload Files

2. **Bulk Payment Import** — CSV/Excel upload modal: instructional panel (3 numbered steps), downloadable template link, "Upload Csv" dropzone, **Preview** button (extra step before Save — show parsed rows before committing). Check if `upload_payments` in `finance.py` already backs this — wire the UI to it if so, don't rebuild the endpoint.

3. **Additional Details / Bill-Ship addressing modal** (opens from any transaction form's "Bill To/Ship To" link): 4 independent address blocks — Bill From, Bill To, Ship From, Ship To, each with an address-type dropdown (e.g. "Company") and "Remove Address" action, plus **"Same as Bill From Address"** and **"Same as Bill To Address"** checkboxes to copy values across blocks. This refines/replaces whatever simpler Bill-Ship version exists from the Project Tab Transaction build — extend it to this fuller pattern here, and backport to the project-level Transaction tab if it's simpler there (flag it, don't silently change project-level without confirming).

4. **Balance Due** field pattern confirmed on expense-type forms: `Balance Due = Net Amount − Paid Amount` (read-only, computed) — same formula as project-level, confirm it's wired here too.

## D. Payment Requests sub-tab
Distinct list from Transaction. Table: Party Name | Project Name | Amount (with status chip "Unpaid"/paid, date badge, request-type subtitle e.g. "Payment Request #PR-1", "Against Subcon Expense")

**Detail drawer** (click a row): ID, Amount + editable status dropdown, Due Date, Party, "Against" (linked expense type), metadata (Entry by / Project / Date), Approval status badge (green checkmark "APPROVED"), **"Record Payment"** button → opens Payment Out form pre-filled with the request's party+amount.

**Create form** (already scaffolded per Project Tab spec — confirm it matches): Request No. (auto, editable), Date, Party Name (editable), **Type** dropdown — exact 9 options: Advance against PO / Advance against Subcon Work Order / Advance against BOQ / Advance against Material Purchase / Advance against Subcon Expense / Advance against Other Expense / Advance for Labour / Petty Cash / Other. Upload Files. Required-field validation (red asterisk + red outline on invalid).

**Record Payment (Payment Out) flow**: Date, Party (prefilled), Amount Given (prefilled from request), Description, Reference No., Payment Method radio (Cash/Bank Transfer/Cheque) — Bank Transfer reveals Bank Account dropdown with a rich account-card preview (Bank name, Account holder, AC number, Bank/IFSC code, UPI, "Primary Account" badge, "+ New Account" quick-add); Cheque reveals Bank Account + Due Date. Cost Code, "More Details (Optional)" collapsible, Upload Files.

## E. Accounts sub-tab — likely the biggest gap
Page title: "Company Cash & Bank Accounts". "+ New Bank Account" button.

**Cash Account section**: single card — name "Cash Account", balance ₹, "View Statement" action, overflow menu. Check if a Cash Account concept exists in the model at all (vs just `BankAccount`) — if not, this is net-new (a singleton company-level cash ledger, separate from bank accounts, fed by Cash Deposit/Withdraw transactions).

**Bank Accounts section**: one card per account — bank icon, bank name, "PRIMARY" badge on one, A/C number, balance, View Statement, overflow menu. Expanded detail row: Account Holder, IFSC Code, UPI, IBAN, Opening Balance, Bank Address.

**"+ New Bank Account" form**: Account Holder Name, Account Number, IFSC Code, Bank Name, Bank Address, IBAN Number, UPI Number, Opening Balance, Overdraft Limit. Check field parity against existing `BankAccount` model — add any missing columns (IBAN, UPI, Overdraft Limit, Bank Address look likely missing based on a typical minimal model).

**Formula**: Account balance = Opening Balance + Σ(all transactions crediting/debiting this account, including Internal Transfers) — running ledger, not static.

## Out of scope (flag, don't build)
- Salary Breakup modal (seen in one stray screenshot) — that's Payroll module, not Finance. Skip, will be covered when Payroll tab comes up.

## Rules (unchanged)
- Audit first, report the gap map (extend vs net-new) before writing code — this repo has a lot already, don't blind-rebuild.
- Reuse Project Tab's transaction taxonomy/entities — this is the company-wide view of the same data.
- No half-done pages, no fabricated formulas, no missing columns, full file-touch disclosure.
- One sub-tab at a time: Party → Transaction → Payment Requests → Accounts. Stop after each, report back for verification.
- If backporting the fuller Bill-Ship modal to project-level Transaction, flag it explicitly — don't change already-signed-off work silently.
