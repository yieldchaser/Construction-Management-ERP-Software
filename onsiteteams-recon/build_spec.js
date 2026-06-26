const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, LevelFormat, TabStopType, TabStopPosition,
  UnderlineType
} = require('docx');
const fs = require('fs');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const BLUE  = "1F4E79";
const LBLUE = "2E75B6";
const CYAN  = "1F7BA6";
const GOLD  = "C55A11";
const GREEN = "375623";
const GRAY  = "595959";
const LGRAY = "F2F2F2";
const WHITE = "FFFFFF";

const border = (color = "CCCCCC") => ({ style: BorderStyle.SINGLE, size: 1, color });
const borders = (c) => { const b = border(c); return { top: b, bottom: b, left: b, right: b }; };
const noBorder = () => { const nb = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }; return { top: nb, bottom: nb, left: nb, right: nb }; };
const cellMarg = { top: 80, bottom: 80, left: 120, right: 120 };

function h(text, level, color = BLUE) {
  const sizes = { 1: 40, 2: 32, 3: 26, 4: 22 };
  return new Paragraph({
    heading: level === 1 ? HeadingLevel.HEADING_1 : level === 2 ? HeadingLevel.HEADING_2 : level === 3 ? HeadingLevel.HEADING_3 : HeadingLevel.HEADING_4,
    spacing: { before: level <= 2 ? 360 : 240, after: 120 },
    children: [new TextRun({ text, bold: true, color, size: sizes[level] || 22, font: "Arial" })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 80, after: 80 },
    children: [new TextRun({ text, size: opts.size || 20, font: "Arial", color: opts.color || "000000", bold: opts.bold || false, italics: opts.italic || false })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 20, font: "Arial" })],
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: "numbers", level },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 20, font: "Arial" })],
  });
}

function pageBreak() {
  return new Paragraph({ children: [new PageBreak()] });
}

function divider(color = LBLUE) {
  return new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 1 } },
    spacing: { before: 120, after: 120 },
    children: [],
  });
}

function headerCell(text, w, bgColor = LBLUE) {
  return new TableCell({
    borders: borders("AAAAAA"),
    width: { size: w, type: WidthType.DXA },
    shading: { fill: bgColor, type: ShadingType.CLEAR },
    margins: cellMarg,
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, color: WHITE, size: 18, font: "Arial" })] })],
  });
}

function dataCell(text, w, bgColor = null) {
  return new TableCell({
    borders: borders("CCCCCC"),
    width: { size: w, type: WidthType.DXA },
    shading: bgColor ? { fill: bgColor, type: ShadingType.CLEAR } : { fill: "FFFFFF", type: ShadingType.CLEAR },
    margins: cellMarg,
    children: [new Paragraph({ children: [new TextRun({ text, size: 18, font: "Arial" })] })],
  });
}

function simpleTable(headers, rows, widths) {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const tblRows = [
    new TableRow({ children: headers.map((h, i) => headerCell(h, widths[i])) }),
    ...rows.map((row, ri) => new TableRow({
      children: row.map((cell, ci) => dataCell(cell, widths[ci], ri % 2 === 1 ? "F8F9FA" : null))
    }))
  ];
  return new Table({ width: { size: totalW, type: WidthType.DXA }, columnWidths: widths, rows: tblRows });
}

// ─── Document Content ────────────────────────────────────────────────────────

// COVER PAGE
const coverPage = [
  new Paragraph({ spacing: { before: 2000, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "SITEPRO ERP", bold: true, size: 80, color: BLUE, font: "Arial" })] }),
  new Paragraph({ spacing: { before: 0, after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Complete Construction ERP — Product Specification", size: 36, color: LBLUE, font: "Arial" })] }),
  divider(LBLUE),
  new Paragraph({ spacing: { before: 200, after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Outputs A through E: Product Spec · Database Schema · API Design · Tech Stack · Build Priority", size: 22, color: GRAY, italic: true, font: "Arial" })] }),
  new Paragraph({ spacing: { before: 100, after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Based on deep competitive analysis of OnsiteTeams.com", size: 22, color: GRAY, font: "Arial" })] }),
  new Paragraph({ spacing: { before: 100, after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "June 2026  |  Confidential", size: 22, color: GRAY, font: "Arial" })] }),
  pageBreak(),
];

// TABLE OF CONTENTS (manual)
const tocSection = [
  h("Table of Contents", 1),
  ...[
    ["OUTPUT A", "Product Specification", "3"],
    ["  Module 1", "Projects & Dashboard", "3"],
    ["  Module 2", "CRM — Leads & Quotations", "5"],
    ["  Module 3", "BOQ / Estimate", "6"],
    ["  Module 4", "Finance & Transactions", "7"],
    ["  Module 5", "Materials & Procurement", "10"],
    ["  Module 6", "Subcontractor Management", "13"],
    ["  Module 7", "Payroll & Attendance", "15"],
    ["  Module 8", "Task Management & Progress", "17"],
    ["  Module 9", "Reports & Analytics", "19"],
    ["  Module 10", "Settings & Configuration", "21"],
    ["  Module 11", "MOM, Chat & Collaboration", "23"],
    ["  Module 12", "Equipment & Assets", "24"],
    ["  Module 13", "Design Files", "25"],
    ["OUTPUT B", "PostgreSQL Database Schema", "26"],
    ["OUTPUT C", "REST API Design", "33"],
    ["OUTPUT D", "Tech Stack Recommendation", "36"],
    ["OUTPUT E", "Build Priority Order", "37"],
  ].map(([num, title, pg]) =>
    new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: 9000, leader: TabStopType.DOT }],
      spacing: { before: 40, after: 40 },
      children: [
        new TextRun({ text: `${num}  ${title}`, size: 20, color: num.startsWith("OUTPUT") ? BLUE : "000000", bold: num.startsWith("OUTPUT"), font: "Arial" }),
        new TextRun({ text: `\t${pg}`, size: 20, font: "Arial" }),
      ]
    })
  ),
  pageBreak(),
];

// ─── OUTPUT A ─────────────────────────────────────────────────────────────────
const outputA_header = [
  h("OUTPUT A — Product Specification", 1, BLUE),
  p("This section specifies every module, screen, field, and workflow for SitePro ERP. It is based on exhaustive analysis of 290 help-doc pages, 150+ live API responses, compiled JS bundles, and the complete feature surface of the reference product. Coding agents should treat this as a comprehensive blueprint.", { italic: true }),
  divider(),
  pageBreak(),
];

// MODULE 1 — PROJECTS & DASHBOARD
const module1 = [
  h("Module 1 — Projects & Dashboard", 2, LBLUE),

  h("1.1 Company Dashboard", 3),
  p("The company dashboard is the top-level overview screen, visible upon login. It aggregates data across ALL projects for the logged-in company."),
  p("Metric Cards (top row):"),
  bullet("Active Projects — count of projects with status 'Ongoing'"),
  bullet("Total Revenue — sum of all sales invoices across all projects"),
  bullet("Total Expenses — sum of all expense transactions"),
  bullet("Outstanding — unpaid invoice total minus advance received"),
  bullet("Workers On Site Today — real-time attendance count for current day"),
  bullet("Pending Approvals — count of items awaiting approval across all projects"),
  p("Charts:"),
  bullet("Revenue vs Expense (bar chart, monthly, last 12 months)"),
  bullet("Project-wise expense breakdown (pie chart)"),
  bullet("Cash flow waterfall (monthly in vs out)"),
  bullet("Top 5 parties by outstanding balance (horizontal bar)"),
  p("Project Cards List:"),
  bullet("Each project shown as a card: name, progress %, last activity, finance summary"),
  bullet("Color-coded by stage (Ongoing = blue, On Hold = amber, Completed = green)"),
  bullet("Click-through to project dashboard"),
  bullet("Pin/unpin projects to top of list"),
  bullet("Filter by: stage, category, date range"),
  bullet("Search by project name"),

  h("1.2 Project Creation", 3),
  p("Fields:"),
  simpleTable(
    ["Field", "Type", "Required", "Notes"],
    [
      ["Project Name", "Text", "Yes", "Max 100 chars"],
      ["Project Code", "Text", "Auto / Manual", "Auto-increments e.g. PRJ-001"],
      ["Client", "Party lookup", "No", "Links to CRM party"],
      ["Contractor (PM)", "CompanyUser lookup", "Yes", "Project owner/manager"],
      ["Status", "Enum", "Yes", "Upcoming, Ongoing, On Hold, Completed"],
      ["Stage / Category", "Subcategory", "No", "Custom user-defined categories"],
      ["Phase", "Subcategory", "No", "Project phase for multi-phase builds"],
      ["Start Date", "Date", "No", "Planned start"],
      ["End Date", "Date", "No", "Planned completion"],
      ["Estimated Cost", "Decimal(18,2)", "No", "Budget figure"],
      ["Address / City / State", "Text", "No", "Site location"],
      ["GPS Location", "GeoPoint", "No", "Used for geo-fenced attendance"],
      ["Attendance Radius", "Integer", "No", "Metres for GPS attendance (default 500m)"],
      ["Background Image", "File", "No", "Project card thumbnail"],
      ["Scope of Work", "Text[]", "No", "Free-text scope items"],
      ["Custom Fields", "JSON", "No", "Company-defined extra fields"],
      ["Key Personnel", "CompanyUser[]", "No", "Featured contacts for the project"],
      ["Dimension / Orientation", "Text", "No", "E.g. '2000 sqft', 'North-facing'"],
    ],
    [2500, 1800, 1400, 3200]
  ),
  p(""),
  p("Document Prefix Configuration (per-project overrides):"),
  bullet("GRN prefix (default GRN-)"),
  bullet("Material Request prefix (default MR-)"),
  bullet("Each prefix has a running sequence number"),

  h("1.3 Project Dashboard", 3),
  p("After opening a project, the project dashboard shows:"),
  bullet("Progress Bar — overall completion % (calculated from task completion)"),
  bullet("Finance Summary — Sales (billed, collected), Expenses (committed, actual)"),
  bullet("Materials — pending MRs, pending GRNs, unbilled materials"),
  bullet("Labour — workers present today, attendance trend chart (last 7 days)"),
  bullet("Tasks — overdue tasks count, tasks due this week, completion % this month"),
  bullet("Subcon — active work orders, billed vs contracted"),
  bullet("Pending Approvals — count by category with quick-action list"),
  bullet("Recent Activity Feed — last 20 actions (material received, attendance marked, invoice raised, etc.)"),
  bullet("Photo Gallery — last 5 site photos with upload button"),
  bullet("Todo count — open to-dos assigned to logged-in user on this project"),

  h("1.4 Project Settings", 3),
  bullet("Enable/disable modules: Materials, Finance, Subcon, Equipment, BOQ, Design"),
  bullet("Approval pipeline assignment per document type"),
  bullet("Back-dated entry controls (lock period)"),
  bullet("Two-shift attendance toggle"),
  bullet("Material settings: restrict usage to received stock, require MR before GRN, require PO before GRN"),
  bullet("Alert configuration: who gets notified for each event"),
  bullet("Custom fields for this project"),
  bullet("Document prefix overrides"),

  h("1.5 Project Team", 3),
  bullet("Add member: search by mobile number or name from company users"),
  bullet("Assign role to this project (same role system as company level)"),
  bullet("Remove member (soft-delete, keeps transaction history)"),
  bullet("View member's permissions at a glance"),
  bullet("Key personnel flag — marked members shown in project header"),
  bullet("Hidden members — can be hidden from regular team view"),

  h("1.6 Project Photos (Album)", 3),
  bullet("Upload from mobile or web — supports JPEG, PNG, PDF"),
  bullet("Each photo: title, date, tags, uploader"),
  bullet("Filter by date, tag, uploader"),
  bullet("Bulk download as ZIP"),
  bullet("Photos can be linked to tasks (as task evidence)"),
  bullet("Approval flow available: uploaded photos require manager approval before visible"),

  pageBreak(),
];

// MODULE 2 — CRM
const module2 = [
  h("Module 2 — CRM — Leads & Quotations", 2, LBLUE),

  h("2.1 Lead Management", 3),
  p("Kanban or list view of all leads with pipeline status."),
  p("Lead Fields:"),
  simpleTable(
    ["Field", "Type", "Notes"],
    [
      ["Lead Assignee", "CompanyUser", "Team member handling this lead"],
      ["Date", "Date", "Lead creation date"],
      ["Lead Type", "Subcategory", "Type of project / enquiry"],
      ["Contact Name", "Text", "Client contact"],
      ["Phone Number", "Phone", "With country code"],
      ["Email", "Email", ""],
      ["Company Name", "Text", "Client's company"],
      ["Address", "Text", "Site / office address"],
      ["Source", "Subcategory", "Instagram, Google, Referral, WhatsApp, etc. + custom"],
      ["Category", "Subcategory", "Residential, Commercial, Infrastructure + custom"],
      ["Lead Status", "Enum", "New Lead, Follow-up, Interested, Proposed, No Response, Lost"],
      ["Priority", "Enum", "High, Medium, Low"],
      ["Last Contacted Date", "Date", ""],
      ["Follow Up Date", "Date", "Scheduled next call/visit"],
      ["Expected Closure Date", "Date", "Target win date"],
      ["Budget", "Decimal", "Client's project budget estimate"],
      ["Description", "Text", "Notes, site requirements"],
      ["Custom Fields", "JSON", "Company-configured extras"],
    ],
    [2500, 1800, 5100]
  ),
  p(""),
  p("Lead Status Pipeline: New Lead → Follow-up → Interested → Proposed → (Won / Lost)"),
  p("Lead Detail Tabs:"),
  bullet("Overview — all fields, edit mode"),
  bullet("Comments — chronological activity log (calls, meetings, WhatsApp notes)"),
  bullet("Quotations — linked quotations, create new quotation from here"),
  p("Filters: Assignee, Date, Priority, Status, Source, Category"),
  p("Export to CSV/Excel for pipeline reporting"),

  h("2.2 Quotation Management", 3),
  bullet("Quotation linked to Lead OR standalone"),
  bullet("Quotation Fields: Subject, Client (party), BOQ Subject, Date, Validity Date, Terms"),
  bullet("Add line items: item name, qty, unit, unit rate (client rate), GST %, discount per item"),
  bullet("Add sections to group items (e.g. Civil, MEP, Finishing)"),
  bullet("Import items from Rate Library"),
  bullet("Discount: line-level or global"),
  bullet("Tax: item-level or bill-level"),
  bullet("Quotation Status: Draft, Sent, In Discussion, On Hold, Client Confirmed, Rejected"),
  bullet("Generate PDF with company letterhead, logo, terms, bank details"),
  bullet("Share via WhatsApp or Email directly from app"),
  bullet("Convert confirmed quotation to Project + BOQ with one click"),
  bullet("Version history — track revisions to a quotation"),

  pageBreak(),
];

// MODULE 3 — BOQ
const module3 = [
  h("Module 3 — BOQ / Estimate", 2, LBLUE),

  h("3.1 BOQ Structure", 3),
  p("A project can have multiple BOQs (e.g., Civil, Electrical, Plumbing as separate estimates). Each BOQ has:"),
  bullet("BOQ Subject (name/title)"),
  bullet("Client (party lookup)"),
  bullet("Bank Account (for invoice printing)"),
  bullet("Discount (global amount or %)"),
  bullet("Terms and Conditions text"),
  bullet("Items organised into Sections"),

  h("3.2 BOQ Line Items", 3),
  p("Each line item fields:"),
  simpleTable(
    ["Field", "Type", "Notes"],
    [
      ["Item Name", "Text", "Description of work/supply"],
      ["Estimated Qty", "Decimal", "Total planned quantity"],
      ["Unit", "Text", "sqft, RMT, nos, kg, MT, cft, litre, etc."],
      ["Client Rate (Revenue)", "Decimal", "Price charged to client per unit"],
      ["Supply Rate", "Decimal", "If split S+I billing, supply component"],
      ["Installation Rate", "Decimal", "Labour installation component"],
      ["GST %", "Decimal", "Tax on this item"],
      ["Cost Code", "Subcategory", "Links to budget category"],
      ["Item Code", "Text", "Internal reference"],
      ["Linked Task", "Task", "Auto-updates progress from task entries"],
      ["Labour Costs", "Array", "Labour type + cost/unit"],
      ["Material Costs", "Array", "Material library item + qty/unit + rate"],
      ["Fee Costs", "Array", "Equipment hire, scaffolding, misc fees + cost/unit"],
    ],
    [2500, 1800, 5100]
  ),
  p(""),
  p("Item Import Options: From Rate Library, From Quotation, From Another BOQ, CSV Upload"),
  p("Sections: Group items under named sections for organised billing"),

  h("3.3 BOQ Budget Tab", 3),
  bullet("Estimated Cost (sum of all labour + material + fee costs)"),
  bullet("Client Revenue (sum of all client rates × quantities)"),
  bullet("Gross Margin = Revenue - Cost"),
  bullet("Invoiced to Date (from linked sales invoices)"),
  bullet("Remaining to Invoice"),
  bullet("Cost vs Budget trend chart"),

  h("3.4 BOQ Milestones", 3),
  p("Define payment milestones tied to project progress:"),
  bullet("Milestone Name, Percentage (% of total BOQ value), Rs Amount (auto-calculated), Due Date, Dependencies"),
  bullet("Mark milestone as reached — triggers invoice generation prompt"),
  bullet("Milestone status: Pending, Reached, Invoiced"),

  h("3.5 BOQ to Sales Invoice", 3),
  bullet("Generate invoice directly from BOQ — items pre-populate"),
  bullet("RA Bill style (Running Account) — invoice against progress %"),
  bullet("Select which items and quantities to invoice this cycle"),
  bullet("Apply retention, deductions (TDS, Security Deposit) at invoice level"),

  pageBreak(),
];

// MODULE 4 — FINANCE
const module4 = [
  h("Module 4 — Finance & Transactions", 2, LBLUE),

  h("4.1 Overview", 3),
  p("Finance operates at two levels: Company Level (all projects combined) and Project Level (single project). The Company Finance tab shows a unified view; each project has its own Transaction tab."),

  h("4.2 Party Ledger", 3),
  p("Every person or entity that the company transacts with is a 'Party' (also called CompanyUser)."),
  p("Party Types:"),
  bullet("Customer / Client (for sales invoicing)"),
  bullet("Material Supplier (for purchase transactions)"),
  bullet("Labour Contractor (for payroll and payments)"),
  bullet("Subcontractor (for subcon work orders and bills)"),
  bullet("Vendor (for equipment/service purchases)"),
  bullet("Staff / Employee (for salary and advances)"),
  bullet("Others (general)"),
  p("Party Fields:"),
  simpleTable(
    ["Field", "Notes"],
    [
      ["Name", "Display name"],
      ["Mobile", "Phone — also the login credential if app access given"],
      ["Email", ""],
      ["GSTIN", "GST number for invoicing"],
      ["PAN", "India: PAN card"],
      ["Legal Business Name", "For GST invoicing"],
      ["Trade Name", ""],
      ["State of Supply", "GST state code"],
      ["Billing Address", ""],
      ["Bank Accounts", "Array — IFSC, account number, bank name, IBAN for UAE"],
      ["UPI IDs", "For digital payments"],
      ["Opening Balance", "One-time setup: To Pay or To Receive"],
      ["Documents", "ID proofs, contracts, GST certificates"],
      ["Custom Fields", "Per party type"],
      ["Priority Type", "customer, material_supplier, labour_contractor, subcontractor, vendor"],
      ["Aadhar / ESI / UAN", "India labour compliance fields"],
    ],
    [2800, 6700]
  ),
  p(""),
  p("Party Ledger View:"),
  bullet("Complete transaction history for the party across all projects"),
  bullet("Balance summary: Advance Paid, To Pay, To Receive, Advance Received"),
  bullet("Filter by project, date, transaction type"),
  bullet("Download PDF statement"),
  bullet("Quick actions: Payment In, Payment Out"),

  h("4.3 Transaction Types", 3),
  simpleTable(
    ["Transaction Type", "Code", "Direction", "Description"],
    [
      ["Payment In", "PAY_IN", "Credit", "Money received from a party (client payment, advance)"],
      ["Payment Out", "PAY_OUT", "Debit", "Money paid to a party (vendor, contractor)"],
      ["Sales Invoice", "INV", "Credit", "Invoice raised to client for work done"],
      ["Debit Note", "DN", "Debit", "Reduction in amount owed to party"],
      ["Credit Note", "CN", "Credit", "Reduction in amount client owes us"],
      ["Party to Party Payment", "P2P", "Both", "Transfer between two parties (e.g. advance to subcon)"],
      ["Internal Transfer", "INT", "Both", "Between company bank accounts"],
      ["Material Purchase", "MAT_PUR", "Debit", "Material expense linked to GRN"],
      ["Material Sales", "MAT_SALE", "Credit", "Material sold out"],
      ["Material Return", "MAT_RET", "Debit/Credit", "Return of purchased material"],
      ["Material Transfer", "MAT_TRF", "Internal", "Inter-project/warehouse transfer"],
      ["Sub Con Bill", "SUBCON_BILL", "Debit", "Subcontractor RA bill"],
      ["Other Expense", "EXP", "Debit", "Overhead: rent, EMI, interest, admin"],
      ["Equipment Expense", "EQP_EXP", "Debit", "Equipment hire/maintenance"],
      ["Salary Expense", "SAL_EXP", "Debit", "Auto-generated from attendance"],
      ["Petty Cash", "PETTY", "Both", "Small cash transactions"],
    ],
    [2500, 1200, 1200, 4500]
  ),
  p(""),

  h("4.4 Transaction Fields", 3),
  p("All transactions share common fields:"),
  bullet("transaction_type — enum as above"),
  bullet("transaction_date — date of transaction"),
  bullet("party_id — the counterparty"),
  bullet("amount — base amount (pre-tax)"),
  bullet("gst_amount — tax"),
  bullet("total_amount — amount + gst"),
  bullet("reference_number — cheque/UTR/invoice number"),
  bullet("notes — remarks"),
  bullet("photos — receipts, supporting docs"),
  bullet("project_id — which project (nullable for company-level)"),
  bullet("bank_account_id — which account (Cash, Bank A, Bank B)"),
  bullet("approval_flag — auto_approved, pending, approved, rejected"),
  bullet("cost_code — budget category"),
  bullet("deductions — array: {type, amount, %} (TDS, retention, security deposit)"),
  bullet("category_id / sub_category_id — expense category"),

  h("4.5 Accounts (Cash + Bank)", 3),
  bullet("Each company has a default Cash Account (wallet)"),
  bullet("Add multiple Bank Accounts: name, account number, IFSC, bank name"),
  bullet("UAE/International: IBAN, SWIFT/BIC"),
  bullet("All Payment In/Out entries debit/credit the selected account"),
  bullet("Bank Statement report per account"),

  h("4.6 Payment Requests (PRs)", 3),
  p("A payment request is raised by a site team member or contractor requesting funds disbursement."),
  bullet("Raised by: any user with payment_request permission"),
  bullet("PR Fields: Party, Amount, Purpose, Project, Date, Notes, Photos"),
  bullet("Approval flow: set up in multi-level approval settings"),
  bullet("PR Status: Draft, Pending Approval, Approved, Paid, Rejected"),
  bullet("Once approved, admin converts to actual Payment Out transaction"),
  bullet("PR list shows across all projects at company level with filter by status"),

  h("4.7 Deductions Library", 3),
  bullet("Pre-defined deduction types: TDS (India), Retention, Security Deposit, Labour Cess"),
  bullet("Each deduction: name, default %, or fixed amount"),
  bullet("Applied at invoice or payment level"),
  bullet("Retention tracking: amount deducted per invoice, running retention balance, release on conditions"),

  h("4.8 Finance Settings", 3),
  bullet("Enable/disable finance module for the company"),
  bullet("Set default tax rate (GST 5%, 12%, 18%, 28% for India; VAT 5% for UAE)"),
  bullet("Multi-GSTIN support: different branches with different GSTINs"),
  bullet("Opening balance entry period"),
  bullet("Decimal precision settings (2 or 3 decimal places)"),
  bullet("Back-dated entry lock: prevent entries before a specific date"),
  bullet("Invoice terms and quotation terms (default text)"),
  bullet("Invoice PDF template customisation: logo, letterhead colour, footer text"),

  pageBreak(),
];

// MODULE 5 — MATERIALS
const module5 = [
  h("Module 5 — Materials & Procurement", 2, LBLUE),

  h("5.1 Material Library", 3),
  p("Company-level master list of all materials used across projects."),
  bullet("Fields: Name, Unit, Category, HSN Code (for India GST), Standard Rate, Description"),
  bullet("Import via CSV"),
  bullet("Bulk edit"),
  bullet("Used as lookup across all material operations"),

  h("5.2 Material Lifecycle (9 States)", 3),
  simpleTable(
    ["Step", "Action", "Who", "Creates"],
    [
      ["0", "Add material to project", "PM / Procurement", "Project material record (opening stock, estimated qty, budget rate)"],
      ["1", "Material Request (MR)", "Site Engineer / Supervisor", "MR document, status = Pending"],
      ["2", "RFQ to Suppliers", "Purchase Manager", "RFQ with multiple suppliers, quote comparison"],
      ["3", "Purchase Order (PO)", "Purchase Manager / Admin", "PO document sent to vendor"],
      ["4", "Goods Received Note (GRN)", "Site / Warehouse", "GRN confirms delivery, adds to stock"],
      ["5", "Material Purchase Booking", "Accountant / PM", "Finance transaction (Material Purchase)"],
      ["6", "Material Transfer", "PM / Warehouse", "Moves stock between projects or warehouses"],
      ["7", "Material Issue", "PM", "Issues material from stock to a subcontractor (tracked)"],
      ["8", "Material Used", "Site Engineer", "Records consumption against a task"],
      ["9", "Material Return", "Site / Warehouse", "Returns unused material, adjusts stock"],
    ],
    [600, 2200, 2200, 4400]
  ),
  p(""),

  h("5.3 Material Request (MR)", 3),
  p("Fields:"),
  bullet("Auto-generated MR number (prefix MR-, sequence per project)"),
  bullet("Project"),
  bullet("Items: Material (from library), Qty, Specifications, Notes"),
  bullet("Photos / attachments"),
  bullet("MR Status: Pending, Approved, Rejected, Ordered (PO raised)"),
  p("Approval settings (from Multi-Level Approval): MR can require one or more approver roles"),
  p("When PO is raised from an MR, the MR status auto-updates to 'Ordered'"),
  p("Material Request Restrictions (settings):"),
  bullet("material_request_restriction = 1: site cannot receive materials without an MR"),
  bullet("po_material_restriction = 1: cannot receive without PO"),

  h("5.4 RFQ (Request for Quotation)", 3),
  bullet("Fields: Project, Bidding Start Date, Bidding End Date, Bill To / Ship To, Tax Type"),
  bullet("Import items from MR or add manually"),
  bullet("Add multiple suppliers — each gets their own quote column"),
  bullet("Publish: sends RFQ to suppliers via email or WhatsApp"),
  bullet("Supplier quote entry: qty, price, tax, total"),
  bullet("Punch Quotation: manually enter a quote received by phone/email"),
  bullet("Side-by-side quote comparison table"),
  bullet("Convert selected supplier quote to PO in one click"),
  bullet("RFQ Status: Draft, Published, Quotes Received, Converted"),

  h("5.5 Purchase Order (PO)", 3),
  bullet("Fields: Vendor (party), Project, Bill To, Ship To"),
  bullet("Items: linked from MR or manual, with Unit Rate, Tax %, Discount per item"),
  bullet("PO Number: auto-generated (prefix PO-)"),
  bullet("PO Status: Draft, Published (sent to vendor), Partially Received, Fully Received, Closed"),
  bullet("Save as Draft (vendor not notified) or Save and Publish (sends PDF to vendor)"),
  bullet("Multiple tax support: item-level or bill-level tax"),
  bullet("Terms and Conditions"),
  bullet("Generate PDF — shareable"),
  bullet("When GRN is created against PO, PO line quantities update to 'received'"),

  h("5.6 GRN (Goods Received Note)", 3),
  bullet("Created from PO or standalone"),
  bullet("Fields: Supplier, PO reference (optional), Project, Date"),
  bullet("Each item: Qty Ordered, Qty Received, Unit Rate (can differ from PO if price changed), Notes"),
  bullet("Partial deliveries: receive part of a PO, remaining stays 'pending delivery'"),
  bullet("Inspection toggle: mark each item as Accepted / Rejected / Partially Accepted"),
  bullet("Photos: photo of delivered goods"),
  bullet("GRN Number: prefix GRN-"),
  bullet("On save: stock for each material is incremented in project/warehouse inventory"),
  bullet("Material Purchase transaction auto-created in Finance tab"),

  h("5.7 Material Stock", 3),
  bullet("Per-project and per-warehouse running stock"),
  bullet("Opening Stock: set during project setup"),
  bullet("Stock fields: Material, Qty In (received), Qty Out (used/issued), Current Balance"),
  bullet("Low-stock alerts (threshold per material)"),
  bullet("Stock movements report: complete audit trail of every in/out"),

  h("5.8 Material Transfer", 3),
  bullet("Move materials between two projects or from project to warehouse"),
  bullet("Transfer document: From Project/Warehouse, To Project/Warehouse, Items + Qty, Date, Notes"),
  bullet("Transfer number: prefix DC- (Delivery Challan)"),
  bullet("Approval flow available"),
  bullet("Stock decrements at source, increments at destination"),

  h("5.9 Material Issue to Subcontractor", 3),
  bullet("Issue materials from project stock to a specific subcontractor Work Order"),
  bullet("Tracks material value issued (deducted from subcon bill or tracked separately)"),
  bullet("Issue record: Subcon WO, Materials + Qty, Date, Notes"),
  bullet("Issued materials visible in Subcon WO 'Materials' tab"),
  bullet("Stock decrements on issue"),

  h("5.10 Material Used (Consumption)", 3),
  bullet("Records actual material consumption on site"),
  bullet("Linked to a specific Task (optional but recommended)"),
  bullet("Fields: Material, Qty, Task, Date, Notes"),
  bullet("Feeds into Task Resources > Material > Actual Qty"),
  bullet("Stock decrements on save"),
  bullet("Restriction setting: cannot record usage if insufficient stock"),

  h("5.11 Material Return", 3),
  bullet("Return unused material to stock or to supplier"),
  bullet("Return to Stock: increments project stock"),
  bullet("Return to Supplier: creates Material Return finance transaction"),
  bullet("Document: prefix MAT-RET-"),

  h("5.12 Warehouse", 3),
  bullet("A Warehouse is a company-level storage location (not tied to a project)"),
  bullet("Holds stock that can be transferred to/from projects"),
  bullet("Warehouse Fields: Name, Location, Manager"),
  bullet("Same GRN/Issue/Transfer operations available from warehouse"),
  bullet("Useful for centralised procurement: buy in bulk to warehouse, distribute to projects"),

  pageBreak(),
];

// MODULE 6 — SUBCONTRACTOR
const module6 = [
  h("Module 6 — Subcontractor Management", 2, LBLUE),

  h("6.1 Overview", 3),
  p("Subcontractor Management covers the full lifecycle: Work Order → Progress → Bills → Payments."),

  h("6.2 Work Order (WO)", 3),
  p("A Work Order defines the contractual scope of work for a subcontractor on a project."),
  p("Work Order Fields:"),
  bullet("Subcontractor party"),
  bullet("Work Order Title"),
  bullet("Work Order Date"),
  bullet("WO Number: prefix WO-, auto-sequence"),
  bullet("Status: Draft, Active, Completed, Closed"),
  p("Work Order has 4 tabs: Items, Milestones, Bills, Materials"),

  h("6.3 WO Items", 3),
  bullet("Each item: Item Name, Unit, Estimated Qty, Unit Price, GST %, Discount"),
  bullet("Measurement mode: N × L × W × H dimensional entry"),
  bullet("Add Supply and Installation rates (split billing)"),
  bullet("Cost Code link"),
  bullet("Item Code"),
  bullet("Link to Task: physical progress auto-updates from task progress entries"),
  bullet("Sections: group items (Civil Work, MEP, Finishing) for cleaner bills"),
  bullet("Import from: Rate Library, BOQ, Another WO"),
  p("WO Header computed fields:"),
  bullet("Order Value (sum of all items)"),
  bullet("Work Done % (from linked tasks)"),
  bullet("Billed (total RA bills raised)"),

  h("6.4 WO Milestones", 3),
  bullet("Milestone Name, % of Order Value, Rs Amount (auto-calc), Due Date, Dependencies"),
  bullet("Status: Pending, Completed, Invoiced"),
  bullet("Dependency chain: milestone B triggers only after milestone A is complete"),
  bullet("Files/attachments per milestone (approval evidence)"),

  h("6.5 Subcon Bills (RA Bills)", 3),
  p("Running Account (RA) Bills are raised by subcontractors or on their behalf."),
  bullet("Bill Number: prefix BILL-, auto-sequence"),
  bullet("Bill Date"),
  bullet("Bill against which WO"),
  bullet("Billing Activities: for each item, enter the quantity completed this cycle"),
  bullet("Sections and items mirror WO structure"),
  bullet("Net bill = qty × unit price - deductions - materials issued"),
  p("Deductions on Bill:"),
  bullet("TDS: % or fixed amount"),
  bullet("Retention: % held back (released at project completion)"),
  bullet("Material Recovery: deduct materials issued from payment"),
  bullet("Security Deposit: advance deduction"),
  bullet("Other deductions (custom)"),
  bullet("Net Payable = Gross Bill - All Deductions"),
  p("Bill Status: Draft, Pending Approval, Approved, Partially Paid, Paid"),
  p("Billing Activity History:"),
  bullet("View all previous RA bills for this WO"),
  bullet("Cumulative billed to date"),
  bullet("Balance remaining on WO"),

  h("6.6 Subcon Payments", 3),
  bullet("Payment Out transactions linked to specific WO and Bill"),
  bullet("Payment Requests from subcontractor viewable by the company"),
  bullet("Retention tracking: amount withheld per bill, total retention held, release schedule"),

  pageBreak(),
];

// MODULE 7 — PAYROLL
const module7 = [
  h("Module 7 — Payroll & Attendance", 2, LBLUE),

  h("7.1 Staff Types", 3),
  simpleTable(
    ["Type", "Attendance Tracked At", "Salary Expense Created In"],
    [
      ["Office Staff", "Company Level", "Company-level Finance"],
      ["Site Staff", "Project Level", "Project Transaction tab"],
      ["Labour Contractor workforce", "Project Level", "Project Transaction tab (per contractor)"],
    ],
    [2500, 3000, 3900]
  ),
  p(""),

  h("7.2 Salary Templates", 3),
  p("Reusable salary structure definitions:"),
  bullet("Template Name, Description"),
  bullet("Monthly CTC amount"),
  bullet("Frequency: Monthly or Daily"),
  bullet("Week Off days (Sunday / Saturday+Sunday / custom)"),
  p("Salary Components:"),
  bullet("Basic Salary: % of CTC or Fixed Amount"),
  bullet("Allowances: HRA (% of Basic or % of CTC or Fixed), Food, Travel, Medical, Special, etc."),
  bullet("Fixed Allowance: auto-fills gap to reach CTC (must be > 0)"),
  bullet("Deductions: PF Employee (₹1800 standard), Employer PF, TDS (% or Fixed), Custom"),
  bullet("Net Amount = Gross - Total Deductions"),
  bullet("Templates can be duplicated, deactivated"),
  bullet("Editing template affects future payroll only; past salary expenses unchanged"),

  h("7.3 Adding Staff to Payroll", 3),
  bullet("Name, Mobile (login credential), Designation, Cost Code, Face Photo"),
  bullet("Salary: amount + breakup from template or manual"),
  bullet("Shift Hours, Overtime rules"),
  bullet("Site Staff: assign to one or more projects"),

  h("7.4 Attendance Marking", 3),
  p("Office Staff (Company Level):"),
  bullet("Calendar grid: staff × days of month"),
  bullet("Status per day: Present, Absent, Week Off, Not Marked"),
  bullet("Detail per day: Shift (0.25/0.5/0.75/1/Custom), Overtime hours, Punch In/Out times, Daily Allowance"),
  bullet("Live salary calculation per day"),
  p("Site Staff (Project Level):"),
  bullet("Same grid view but within each project"),
  bullet("Task assignment per attendance day"),
  p("Labour Contractor (Project Level):"),
  bullet("Contractor row shows headcount present each day"),
  bullet("Individual worker rows expand below contractor"),
  bullet("Cash Labour: unnamed daily workers by count only"),
  bullet("Task assignment: number of workers + hours per task"),
  bullet("Validation: task hours cannot exceed total workforce hours"),
  p("Punch In/Out (Mobile):"),
  bullet("GPS-tagged punch in/out"),
  bullet("Face recognition via camera (requires face photo in Payroll)"),
  bullet("Self-punch (worker punches own attendance)"),
  bullet("Geofence enforcement: within attendance_radius of project GPS"),
  bullet("Bulk punch: supervisor uses camera to punch multiple workers sequentially"),

  h("7.5 Salary Expense Generation", 3),
  bullet("Salary expenses auto-generate monthly from attendance records"),
  bullet("One salary expense per person per project per month"),
  bullet("One salary expense at company level for office staff"),
  bullet("Appears in Transaction tab / Finance tab automatically"),
  bullet("Party ledger shows all salary entries with Unpaid / Partially Paid / Paid status"),

  h("7.6 Leave Management", 3),
  p("Leave Templates:"),
  bullet("Leave type name (CL, PL, SL, LWP)"),
  bullet("Days per year, carry-forward rules"),
  bullet("Applicable to which staff type"),
  p("Team Leaves:"),
  bullet("Company-wide leave calendar"),
  bullet("Apply leave for a team member: type, dates, notes"),
  bullet("Leave balance shown per member"),
  p("My Leaves (self-service):"),
  bullet("Staff can apply for leave from mobile app"),
  bullet("Approval workflow"),
  bullet("Leave status: Pending, Approved, Rejected"),
  p("Holidays:"),
  bullet("Company holidays list (national + custom)"),
  bullet("Holiday days not counted as absent or week off"),

  h("7.7 Team Schedule & Timesheet", 3),
  p("Team Schedule:"),
  bullet("Gantt-style view of team member assignments across projects"),
  bullet("Assign a team member to a project for a date range"),
  bullet("Visibility into who is deployed where"),
  p("Timesheet:"),
  bullet("Individual time logs: Person, Project, Date, Hours, Notes, Task"),
  bullet("Different from attendance: manual professional time tracking"),
  bullet("Useful for project managers, consultants, engineers"),
  bullet("Filter: by project, person, date range"),
  bullet("Download Excel/CSV"),

  pageBreak(),
];

// MODULE 8 — TASKS
const module8 = [
  h("Module 8 — Task Management & Progress Tracking", 2, LBLUE),

  h("8.1 Task Hierarchy", 3),
  bullet("Parent Task → Sub-tasks (multi-level nesting)"),
  bullet("Tasks organised by project"),
  bullet("Optional phases (project phase grouping)"),

  h("8.2 Task Fields", 3),
  simpleTable(
    ["Field", "Type", "Notes"],
    [
      ["Task Name", "Text", "Description of work item"],
      ["Duration (days)", "Integer", "Planned duration"],
      ["Start Date", "Date", "Planned start"],
      ["End Date", "Date", "Planned end (auto-calc from start + duration)"],
      ["Unit", "Text", "sqft, RMT, nos, m3, etc."],
      ["Estimated Quantity", "Decimal", "Total planned qty for this task"],
      ["Tags", "Text[]", "Civil, Electrical, MEP, Plumbing, etc."],
      ["Assigned To", "CompanyUser", "Responsible person"],
      ["Status", "Enum", "Not Started, In Progress, On Hold, Completed, Cancelled"],
      ["Priority", "Enum", "Low, Medium, High, Critical"],
      ["Linked BOQ Item", "BOQItem", "BOQ item this task maps to"],
      ["Dependencies", "Task[]", "Tasks that must finish before this starts"],
      ["Location", "Text", "Floor, Zone, Room from project location structure"],
      ["Inspection Form", "InspectionForm", "Quality checklist attached"],
      ["Custom Fields", "JSON", ""],
    ],
    [2500, 1800, 5100]
  ),
  p(""),

  h("8.3 Task Import", 3),
  bullet("From BOQ: pulls BOQ items as tasks with qty pre-filled"),
  bullet("From Another Project: copy task structure"),
  bullet("CSV Upload: bulk import with template download"),

  h("8.4 Progress Updates", 3),
  p("Each progress entry:"),
  bullet("Date"),
  bullet("Dimensions: Number, Length, Width (for area-based tasks)"),
  bullet("Progress Quantity = N × L × W (auto-calculated)"),
  bullet("Or direct quantity entry for count-based tasks"),
  bullet("Location (from project location hierarchy)"),
  bullet("Notes"),
  bullet("Photos (evidence of work done)"),
  bullet("Approval: optional approval flow before progress is accepted"),
  p("Progress is cumulative — each entry adds to total."),
  p("Task % Complete = Cumulative Progress Qty / Estimated Qty × 100"),

  h("8.5 Task Resources", 3),
  p("Per-task resource planning and actual consumption:"),
  p("Materials Sub-tab:"),
  bullet("Budget Qty: planned material for this task"),
  bullet("Planned Qty: scaled to current progress %"),
  bullet("Actual Qty: from Material Used entries tagged to this task"),
  bullet("Exceeded: red flag when Actual > Planned"),
  p("Labour Sub-tab:"),
  bullet("Budget Qty: planned man-hours"),
  bullet("Actual Qty: from Attendance entries with task assignment"),
  bullet("Exceeded: flag"),
  p("Equipment Sub-tab:"),
  bullet("Budget: planned equipment hours"),
  bullet("Actual: from Equipment Used entries"),

  h("8.6 Views", 3),
  bullet("List View: flat task list with inline editing"),
  bullet("Gantt View: timeline chart with dependencies and critical path"),
  bullet("Resources View: resource allocation matrix across tasks"),
  p("Refresh Dates: planned progress targets per date — overlaid on S-curve"),

  h("8.7 S-Curve & Charts", 3),
  bullet("S-Curve: Planned progress vs Actual progress over time"),
  bullet("Month-on-Month progress chart"),
  bullet("Task completion rate bar chart"),

  h("8.8 DPR (Daily Progress Report)", 3),
  bullet("Generated from task progress + attendance entries for a given date"),
  bullet("Sections: Site Photos, Work Summary (tasks updated, qty, %)", ),
  bullet("Labour Report: workforce type, count, shifts"),
  bullet("Material Consumed: by category"),
  bullet("Equipment On Site"),
  bullet("Issues / Notes"),
  bullet("PDF download with company logo"),
  bullet("WhatsApp/email share from app"),

  h("8.9 Inspection Forms", 3),
  bullet("Company-level inspection form templates (admin creates)"),
  bullet("Fields: text, checkbox, number, photo, dropdown"),
  bullet("Attach form to a task: Before Completion (must complete form before marking task done)"),
  bullet("Site engineer fills form on mobile"),
  bullet("Approval flow: manager reviews form response"),
  bullet("Form response history per task"),
  bullet("Prefix: INSP-"),

  h("8.10 To-Do (Snag List)", 3),
  bullet("Lightweight issue/snag/punch list"),
  bullet("Todo Fields: Title, Description, Type (from library), Assigned To, Due Date, Priority, Photos"),
  bullet("Status: Open, In Progress, Resolved, Closed"),
  bullet("Comments thread per todo"),
  bullet("Can be at company level or project level"),
  bullet("Filter by: assignee, status, type, project"),
  bullet("Mobile-first — site team raises snags on phone"),

  pageBreak(),
];

// MODULE 9 — REPORTS
const module9 = [
  h("Module 9 — Reports & Analytics", 2, LBLUE),

  h("9.1 Sales Reports", 3),
  bullet("Company Sales Report: all invoices across all projects, filter by project/party/date"),
  bullet("Item-Wise Sales Report: invoice line items — most billed items, quantities, revenue"),
  bullet("Sales Deduction/Retention Report: TDS deducted, retention withheld per invoice"),
  bullet("Unpaid Invoice Report: invoices with outstanding balance"),

  h("9.2 Payment Reports", 3),
  bullet("Company Payments: all Payment In and Payment Out entries"),
  bullet("Bank Statement: per bank account — running balance"),
  bullet("Project-Wise Payment Summary: payments grouped by project"),

  h("9.3 Purchase & Expense Reports", 3),
  bullet("Purchase Register: all material purchases, by supplier, date, project"),
  bullet("PO Report: purchase orders by status (pending, received, closed)"),
  bullet("Expense Category Report: grouped by cost code"),
  bullet("Project P&L: Revenue - All Costs per project"),
  bullet("Overhead Report: company-level non-project expenses"),

  h("9.4 Material & Inventory Reports", 3),
  bullet("Material Stock Report: current stock per project/warehouse"),
  bullet("Material Consumption Report: usage by task, date, material"),
  bullet("Material Movement Report: full audit trail (received, used, transferred, returned)"),
  bullet("Material Wastage Report: variance between estimated and actual consumption"),
  bullet("Unbilled Materials Report: materials received but not yet financially booked"),
  bullet("Pending GRN Report: POs where delivery is pending"),

  h("9.5 Attendance & Salary Reports", 3),
  bullet("Attendance Register: per project/company, by month — present/absent/WO grid"),
  bullet("Salary Report: staff-wise salary for a month (gross, deductions, net)"),
  bullet("Labour Productivity Report: man-hours vs progress qty"),
  bullet("Contractor Payroll: monthly summary per labour contractor"),
  bullet("Leave Report: leave taken per staff per period"),

  h("9.6 Progress & Task Reports", 3),
  bullet("Task Report: tasks by status, completion %, overdue count"),
  bullet("Task Measurement Book: cumulative progress entries per task (like a site register)"),
  bullet("Daily Progress Report (DPR): as described in Module 8"),
  bullet("S-Curve Report: planned vs actual progress over project timeline"),
  bullet("Subcon Progress Report: work done % per work order"),

  h("9.7 Party Balance Reports", 3),
  bullet("Party Balance Summary: all parties with outstanding balance"),
  bullet("Party Ledger: full transaction history per party"),
  bullet("Advance Report: advances paid out and outstanding"),
  bullet("Ageing Report: overdue outstanding grouped by 0-30, 31-60, 61-90, 90+ days"),

  h("9.8 Equipment Reports", 3),
  bullet("Equipment Expense Summary: expenses by equipment, project, date"),
  bullet("Equipment Utilisation: days on site, idle days per equipment"),

  h("9.9 Report Formats & Export", 3),
  bullet("PDF: all reports downloadable as PDF with company branding"),
  bullet("Excel/CSV: tabular data for further analysis"),
  bullet("Share via WhatsApp/email from mobile"),
  bullet("Date range filter on all reports"),
  bullet("Project filter on all reports"),

  pageBreak(),
];

// MODULE 10 — SETTINGS
const module10 = [
  h("Module 10 — Settings & Configuration", 2, LBLUE),

  h("10.1 Company Settings", 3),
  bullet("Company Name, Logo, Address, City, State"),
  bullet("GSTIN(s), PAN"),
  bullet("Multiple branch addresses with separate GSTINs"),
  bullet("Document prefix configuration (all document types)"),
  bullet("Terms and Conditions (default invoice and quotation text)"),
  bullet("Feature flags: enable/disable modules per subscription plan"),
  bullet("Decimal settings: 2 or 3 decimal places"),
  bullet("Currency and timezone (per country)"),

  h("10.2 User Management", 3),
  bullet("Invite new users by mobile number (OTP sent to their phone)"),
  bullet("Set company-level role"),
  bullet("View all active users"),
  bullet("Deactivate (soft-delete) users"),
  bullet("User prefix/ID configuration (PID- prefix for employee IDs)"),

  h("10.3 Roles & Permissions", 3),
  p("17 built-in roles plus unlimited custom roles:"),
  simpleTable(
    ["Role", "Financial Access", "Operational", "Settings"],
    [
      ["Admin", "Full", "Full", "Full"],
      ["Senior Manager", "Full", "Full", "None"],
      ["Manager", "Partial (no invoices, no party balances)", "Full", "None"],
      ["Accountant", "Full", "Limited (no tasks)", "None"],
      ["Sales Manager", "CRM + Invoices", "Partial", "None"],
      ["Purchase Manager", "Procurement only", "Procurement + Materials", "None"],
      ["Warehouse Manager", "None", "Materials + Inventory", "None"],
      ["Site Engineer", "Petty cash", "Full site ops", "None"],
      ["Supervisor", "Petty cash", "Attendance + Tasks", "None"],
      ["Associate HR", "Payroll + Attendance", "Attendance", "None"],
      ["Design Engineer", "None", "Design files", "None"],
      ["Data Entry Operator", "Partial", "Partial", "None"],
      ["Project Partner", "View only", "View only", "None"],
      ["Sub Contractor", "Own WO only", "Own WO only", "None"],
      ["Operator", "None", "Equipment", "None"],
      ["Client", "View invoices only", "View only", "None"],
      ["Viewer", "View only", "View only", "None"],
    ],
    [2500, 2500, 2200, 1700]
  ),
  p(""),
  p("Custom roles: create any combination of ~382 granular permissions"),
  p("Each permission controls: view, add, edit, delete, approve, download for a feature"),

  h("10.4 Approval Pipelines", 3),
  p("21 document types can have multi-level approval rules:"),
  bullet("Purchase Order, Payment Request, Payment Entries, Sales Invoice, Sales Invoice Retention"),
  bullet("Subcon Bill, Subcon Retention, Subcon Workorder, RFQ"),
  bullet("GRN Material, Material Purchase, Material Transfer, Material Issue, Material Used"),
  bullet("Other Expense, Site Expense, Salary Expense, Equipment Expense"),
  bullet("Asset Transfer, Task Progress, Design Version, Inspection Form Response"),
  p("Each rule: Min Amount, Max Amount, Approver Roles (multi-level sequential)"),
  p("Multiple rules per document type (different amount ranges → different levels)"),
  p("Rules must be Published to be active"),

  h("10.5 Salary Templates", 3),
  p("(Described in Module 7.2)"),

  h("10.6 Leave Templates", 3),
  p("Define leave types and annual entitlements for the company"),

  h("10.7 Bank Accounts", 3),
  bullet("Add company bank accounts: Name, Account Number, IFSC, Bank Name"),
  bullet("UAE/International: IBAN, SWIFT/BIC, Bank Address"),
  bullet("Mark one as default"),
  bullet("Used in invoices, payment transactions, salary payments"),

  h("10.8 Custom Fields", 3),
  p("Add extra fields to any entity:"),
  bullet("Entity types: Attendance, BOQ Work Order, Invoice, Labour Party, Material, PO, Project, Staff Party, Subcon Party, Task, Vendor Party"),
  bullet("Field types: Text, Number, Date, Dropdown, Checkbox"),
  bullet("Mark as Required or Optional"),
  bullet("Fields appear in forms and are filterable in reports"),

  h("10.9 Alert Settings", 3),
  bullet("Configure which roles/users get notified for each event"),
  bullet("Events: New MR, MR Approved, PO Created, GRN Received, Invoice Raised, Payment Due, Task Overdue, Attendance Not Marked, etc."),
  bullet("Notification channels: In-app, Push Notification (mobile), WhatsApp"),

  h("10.10 Integrations", 3),
  bullet("Tally Prime: export vouchers to Tally XML; configurable account heads"),
  bullet("Zoho Books: two-way sync for invoices and payments"),
  bullet("ZATCA (Saudi Arabia e-invoicing compliance)"),
  bullet("Google Sheets: automated export of transactions, attendance"),
  bullet("Razorpay: payment link generation for client invoices"),
  bullet("WhatsApp Business API: share documents, receive confirmations"),

  h("10.11 Back-dated Entry Control", 3),
  bullet("Lock entries before a cutoff date (prevents editing closed periods)"),
  bullet("Admin can override the lock for corrections"),
  bullet("Per-module lock settings"),

  pageBreak(),
];

// MODULE 11 — COLLABORATION
const module11 = [
  h("Module 11 — MOM, Chat & Collaboration", 2, LBLUE),

  h("11.1 Minutes of Meeting (MOM)", 3),
  bullet("MOM can be created at Company Level or Project Level"),
  bullet("Fields: Title, Date, Venue, Attendees (from team), Agenda Items, Action Points, Next Meeting Date"),
  bullet("Action Points: each has assignee, due date, status"),
  bullet("PDF generation: formatted MOM document with company header"),
  bullet("Share via WhatsApp/email"),
  bullet("Status tracking: Open, In Progress, Closed"),

  h("11.2 Chat Groups", 3),
  bullet("Create chat groups: name, project association, members"),
  bullet("Real-time messaging (WebSocket)"),
  bullet("Message types: text, image, document, audio"),
  bullet("Announcement Group: company-wide announcements (admin only posts)"),
  bullet("Subcontractor group: automatically created per WO for communication with subcon"),
  bullet("Message read receipts"),
  bullet("@mentions"),
  bullet("AI Chatbot integration (optional premium feature)"),

  h("11.3 MCP Chatbot (AI Assistant)", 3),
  bullet("Premium feature: AI assistant embedded in chat"),
  bullet("Answers questions about project status, finance, materials"),
  bullet("Generates summaries from data"),
  bullet("Available in chat groups"),

  pageBreak(),
];

// MODULE 12 — EQUIPMENT
const module12 = [
  h("Module 12 — Equipment & Assets", 2, LBLUE),

  h("12.1 Equipment Management", 3),
  bullet("Equipment Library: company-wide catalog (Name, Type, Manufacturer, Model, Serial No)"),
  bullet("Add equipment to a project: Equipment, Supplier (party), Hire Rate, Unit"),
  bullet("Equipment Expense: record expense (hire, fuel, maintenance, repair) against equipment"),
  bullet("Equipment Used Entry: record hours/days used per task"),
  bullet("Equipment movement: track which project equipment is deployed on"),
  bullet("Equipment Expense types: Hire Charges, Fuel, Maintenance, Repair, Insurance, Others"),

  h("12.2 Asset Management", 3),
  bullet("Assets are company-owned equipment/tools (different from hired equipment)"),
  bullet("Asset Library: item type, category"),
  bullet("Asset record: prefix AS-, Name, Category, Purchase Date, Purchase Value, Current Location"),
  bullet("Asset allocation: assign asset to project/employee"),
  bullet("Asset transfer: move between locations with approval"),
  bullet("Asset depreciation tracking"),

  pageBreak(),
];

// MODULE 13 — DESIGN
const module13 = [
  h("Module 13 — Design Files", 2, LBLUE),

  h("13.1 Design File Management", 3),
  bullet("Project-level document management for architectural/engineering drawings"),
  bullet("Folder structure: Root folder → sub-folders (user-created)"),
  bullet("Supported files: DWG, PDF, images, DXF, etc."),
  bullet("Upload new version of a file (version control)"),
  bullet("Version history per file: date, uploader, version number, comments"),
  bullet("File approval workflow: upload → review → approved/rejected"),
  bullet("Prefix PROD- for production drawings"),

  h("13.2 Design Viewer", 3),
  bullet("In-app PDF/image viewer"),
  bullet("Annotation tools (markup drawings)"),
  bullet("Comment threads on specific files"),
  bullet("Download latest version"),
  bullet("Share file link with external parties"),

  pageBreak(),
];

// ─── OUTPUT B — DATABASE SCHEMA ───────────────────────────────────────────────
const outputB = [
  h("OUTPUT B — PostgreSQL Database Schema", 1, BLUE),
  p("Complete relational schema for SitePro ERP. All tables use UUID primary keys. Soft-delete via deleted_at timestamptz. All monetary amounts stored as NUMERIC(18,4). Timestamps use timestamptz. Row-Level Security (RLS) enforced at company_id level.", { italic: true }),
  divider(),

  h("Core Tenancy & Auth", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["users", "id UUID PK, mobile VARCHAR(20) UNIQUE, country_code VARCHAR(5), name TEXT, email TEXT, profile_pic TEXT, mobile_verified BOOLEAN, created_at TIMESTAMPTZ"],
      ["companies", "id UUID PK, name TEXT, logo TEXT, gstin TEXT[], pan TEXT, address TEXT, city TEXT, state TEXT, country_code VARCHAR(5), subscription_plan ENUM('free','business','business_plus','enterprise'), subscription_start TIMESTAMPTZ, subscription_end TIMESTAMPTZ, feature_flags JSONB, document_prefixes JSONB, settings JSONB, created_at TIMESTAMPTZ"],
      ["company_users", "id UUID PK, company_id UUID FK→companies, user_id UUID FK→users, role_id UUID FK→company_roles, type ENUM('employee','partner','client','subcontractor'), name TEXT, mobile VARCHAR(20), email TEXT, gstin TEXT, pan TEXT, esi_number TEXT, uan TEXT, opening_balance NUMERIC(18,4), opening_balance_type ENUM('to_pay','to_receive'), custom_fields JSONB, hidden BOOLEAN, deleted_at TIMESTAMPTZ"],
      ["company_roles", "id UUID PK, company_id UUID, name TEXT, description TEXT, policy_ids TEXT[], is_system BOOLEAN, created_at TIMESTAMPTZ"],
      ["company_addresses", "id UUID PK, company_id UUID, owner_id UUID, address_type TEXT, address_line_1 TEXT, city TEXT, state TEXT, postal_code TEXT, country_code TEXT, gstin TEXT, location GEOMETRY(Point,4326), primary BOOLEAN"],
      ["company_bank_accounts", "id UUID PK, company_id UUID, account_holder_id UUID, account_name TEXT, account_number TEXT, ifsc_code TEXT, iban_number TEXT, bank_name TEXT, bank_address TEXT, upi_ids TEXT[], is_default BOOLEAN"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Projects", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["projects", "id UUID PK, company_id UUID FK, name TEXT, code VARCHAR(20), type VARCHAR(10), status ENUM('upcoming','ongoing','on_hold','completed'), contractor_cu_id UUID FK→company_users, customer_party_id UUID FK→company_users, start_date DATE, end_date DATE, estimated_cost NUMERIC(18,4), progress NUMERIC(5,2), location GEOMETRY(Point,4326), attendance_radius INTEGER DEFAULT 500, feature_flags JSONB, document_prefixes JSONB, custom_fields JSONB, scope_of_work TEXT[], created_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ"],
      ["project_team", "id UUID PK, project_id UUID FK, company_user_id UUID FK, role_id UUID FK, is_key_personnel BOOLEAN, hidden BOOLEAN, joined_at TIMESTAMPTZ"],
      ["project_locations", "id UUID PK, project_id UUID FK, parent_id UUID SELF-REF, name TEXT, level INTEGER, description TEXT"],
      ["project_phases", "id UUID PK, project_id UUID FK, name TEXT, start_date DATE, end_date DATE, status TEXT"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Finance & Transactions", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["transactions", "id UUID PK, company_id UUID, project_id UUID NULLABLE, transaction_type ENUM(14 types), party_cu_id UUID FK, amount NUMERIC(18,4), gst_amount NUMERIC(18,4), total_amount NUMERIC(18,4), reference_number TEXT, transaction_date DATE, bank_account_id UUID, cost_code_id UUID, category_id UUID, sub_category_id UUID, notes TEXT, photos TEXT[], approval_flag ENUM('auto_approved','pending','approved','rejected'), approved_by UUID, feature_id UUID, feature_type TEXT, sequence INTEGER, created_by UUID, created_at TIMESTAMPTZ, deleted_at TIMESTAMPTZ"],
      ["transaction_deductions", "id UUID PK, transaction_id UUID FK, deduction_type TEXT, amount NUMERIC(18,4), percentage NUMERIC(5,2), notes TEXT"],
      ["wallets", "id UUID PK, company_id UUID, owner_id UUID, owner_type ENUM('company','project'), balance NUMERIC(18,4), in_amount NUMERIC(18,4), out_amount NUMERIC(18,4), bank_account_id UUID, updated_at TIMESTAMPTZ"],
      ["invoices (sales_invoices)", "id UUID PK, company_id UUID, project_id UUID, party_cu_id UUID, invoice_number TEXT, invoice_date DATE, due_date DATE, boq_id UUID, status ENUM('draft','sent','partially_paid','paid','cancelled'), subtotal NUMERIC(18,4), tax_amount NUMERIC(18,4), discount NUMERIC(18,4), retention NUMERIC(18,4), total NUMERIC(18,4), terms TEXT, bank_account_id UUID, approval_flag TEXT, custom_fields JSONB"],
      ["invoice_items", "id UUID PK, invoice_id UUID FK, boq_item_id UUID NULLABLE, description TEXT, quantity NUMERIC(12,4), unit TEXT, unit_rate NUMERIC(18,4), gst_percentage NUMERIC(5,2), amount NUMERIC(18,4)"],
      ["payment_requests", "id UUID PK, company_id UUID, project_id UUID, party_cu_id UUID, amount NUMERIC(18,4), purpose TEXT, notes TEXT, photos TEXT[], status ENUM('draft','pending','approved','paid','rejected'), approval_flag TEXT, created_by UUID, created_at TIMESTAMPTZ"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("CRM", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["crm_leads", "id UUID PK, company_id UUID, assigned_to UUID FK, date DATE, lead_type_id UUID, contact_name TEXT, phone TEXT, email TEXT, company_name TEXT, source_id UUID, category_id UUID, status ENUM('new','follow_up','interested','proposed','no_response','lost','won'), priority ENUM('low','medium','high'), follow_up_date DATE, expected_closure DATE, budget NUMERIC(18,4), description TEXT, custom_fields JSONB, created_at TIMESTAMPTZ"],
      ["crm_lead_comments", "id UUID PK, lead_id UUID FK, author_cu_id UUID, content TEXT, created_at TIMESTAMPTZ"],
      ["quotations", "id UUID PK, company_id UUID, lead_id UUID NULLABLE, party_cu_id UUID, subject TEXT, date DATE, valid_until DATE, status ENUM('draft','sent','in_discussion','on_hold','confirmed','rejected'), terms TEXT, discount NUMERIC(18,4), total NUMERIC(18,4)"],
      ["quotation_items", "id UUID PK, quotation_id UUID FK, section_id UUID NULLABLE, name TEXT, qty NUMERIC(12,4), unit TEXT, unit_rate NUMERIC(18,4), gst_pct NUMERIC(5,2), amount NUMERIC(18,4)"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("BOQ / Estimate", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["boqs", "id UUID PK, company_id UUID, project_id UUID, subject TEXT, party_cu_id UUID, bank_account_id UUID, discount NUMERIC(18,4), total_estimated_cost NUMERIC(18,4), total_client_rate NUMERIC(18,4), terms TEXT, status ENUM('draft','active','closed'), created_by UUID, created_at TIMESTAMPTZ"],
      ["boq_sections", "id UUID PK, boq_id UUID FK, name TEXT, sort_order INTEGER"],
      ["boq_items", "id UUID PK, boq_id UUID FK, section_id UUID NULLABLE, name TEXT, item_code TEXT, est_quantity NUMERIC(12,4), unit TEXT, client_rate NUMERIC(18,4), supply_rate NUMERIC(18,4), install_rate NUMERIC(18,4), gst_pct NUMERIC(5,2), cost_code_id UUID, linked_task_id UUID, sort_order INTEGER"],
      ["boq_item_costs", "id UUID PK, boq_item_id UUID FK, cost_type ENUM('labour','material','fee'), name TEXT, ref_id UUID NULLABLE, quantity_per_unit NUMERIC(12,4), unit_rate NUMERIC(18,4), unit TEXT"],
      ["boq_milestones", "id UUID PK, boq_id UUID FK, name TEXT, percentage NUMERIC(5,2), amount NUMERIC(18,4), due_date DATE, status ENUM('pending','reached','invoiced'), dependency_ids UUID[], files TEXT[]"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Materials & Procurement", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["material_items", "id UUID PK, company_id UUID, name TEXT, unit TEXT, category_id UUID, hsn_code TEXT, standard_rate NUMERIC(18,4), description TEXT, deleted_at TIMESTAMPTZ"],
      ["project_materials", "id UUID PK, project_id UUID FK, material_item_id UUID FK, opening_stock NUMERIC(12,4), estimated_qty NUMERIC(12,4), budgeted_unit_rate NUMERIC(18,4)"],
      ["material_requests", "id UUID PK, company_id UUID, project_id UUID, mr_number TEXT, date DATE, items JSONB, status ENUM('pending','approved','rejected','ordered'), approval_flag TEXT, created_by UUID"],
      ["purchase_orders", "id UUID PK, company_id UUID, project_id UUID, vendor_cu_id UUID, po_number TEXT, date DATE, bill_to_id UUID, ship_to_id UUID, status ENUM('draft','published','partial','received','closed'), total NUMERIC(18,4), rfq_id UUID NULLABLE, approval_flag TEXT"],
      ["po_items", "id UUID PK, po_id UUID FK, material_item_id UUID FK, mr_item_id UUID NULLABLE, qty NUMERIC(12,4), unit_rate NUMERIC(18,4), gst_pct NUMERIC(5,2), discount NUMERIC(5,2), received_qty NUMERIC(12,4)"],
      ["rfqs", "id UUID PK, company_id UUID, project_id UUID, rfq_number TEXT, bidding_start DATE, bidding_end DATE, status ENUM('draft','published','received','converted'), items JSONB, supplier_ids UUID[]"],
      ["rfq_quotes", "id UUID PK, rfq_id UUID FK, supplier_cu_id UUID, quoted_at TIMESTAMPTZ, items JSONB, total NUMERIC(18,4), status ENUM('pending','submitted','selected')"],
      ["grns", "id UUID PK, company_id UUID, project_id UUID NULLABLE, warehouse_id UUID NULLABLE, supplier_cu_id UUID, po_id UUID NULLABLE, grn_number TEXT, date DATE, status ENUM('draft','confirmed'), items JSONB, approval_flag TEXT, transaction_id UUID"],
      ["material_stocks", "id UUID PK, company_id UUID, project_id UUID NULLABLE, warehouse_id UUID NULLABLE, material_item_id UUID FK, qty_in NUMERIC(12,4), qty_out NUMERIC(12,4), balance NUMERIC(12,4), updated_at TIMESTAMPTZ"],
      ["material_movements", "id UUID PK, company_id UUID, source_id UUID, source_type TEXT, dest_id UUID, dest_type TEXT, material_item_id UUID, quantity NUMERIC(12,4), movement_type ENUM('received','used','transferred','issued','returned'), ref_id UUID, ref_type TEXT, transaction_date DATE, notes TEXT, created_by UUID"],
      ["warehouses", "id UUID PK, company_id UUID, name TEXT, location TEXT, manager_cu_id UUID, deleted_at TIMESTAMPTZ"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Subcontractor Management", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["work_orders", "id UUID PK, company_id UUID, project_id UUID, subcon_cu_id UUID, title TEXT, wo_number TEXT, date DATE, status ENUM('draft','active','completed','closed'), total_value NUMERIC(18,4), billed_amount NUMERIC(18,4), work_done_pct NUMERIC(5,2), terms TEXT, approval_flag TEXT, created_at TIMESTAMPTZ"],
      ["wo_sections", "id UUID PK, wo_id UUID FK, name TEXT, sort_order INTEGER"],
      ["wo_items", "id UUID PK, wo_id UUID FK, section_id UUID NULLABLE, name TEXT, unit TEXT, est_qty NUMERIC(12,4), unit_price NUMERIC(18,4), supply_rate NUMERIC(18,4), install_rate NUMERIC(18,4), gst_pct NUMERIC(5,2), cost_code_id UUID, linked_task_id UUID, progress_qty NUMERIC(12,4), sort_order INTEGER"],
      ["wo_milestones", "id UUID PK, wo_id UUID FK, name TEXT, percentage NUMERIC(5,2), amount NUMERIC(18,4), due_date DATE, status ENUM('pending','completed','invoiced'), dependency_ids UUID[], files TEXT[]"],
      ["subcon_bills", "id UUID PK, company_id UUID, project_id UUID, wo_id UUID FK, bill_number TEXT, date DATE, gross_amount NUMERIC(18,4), deductions JSONB, net_payable NUMERIC(18,4), status ENUM('draft','pending','approved','partial','paid'), approval_flag TEXT, transaction_id UUID"],
      ["billing_activities", "id UUID PK, bill_id UUID FK, wo_item_id UUID FK, qty_this_cycle NUMERIC(12,4), amount NUMERIC(18,4), cumulative_qty NUMERIC(12,4)"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Payroll & Attendance", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["salary_templates", "id UUID PK, company_id UUID, name TEXT, description TEXT, ctc NUMERIC(18,4), frequency ENUM('monthly','daily'), week_off_days INTEGER[], components JSONB, allowances JSONB, deductions JSONB, active BOOLEAN"],
      ["payroll_staff", "id UUID PK, company_id UUID, company_user_id UUID FK, staff_type ENUM('office','site'), designation TEXT, salary_amount NUMERIC(18,4), salary_template_id UUID, shift_hours NUMERIC(4,2), face_photos TEXT[], project_ids UUID[], cost_code_id UUID, deleted_at TIMESTAMPTZ"],
      ["attendance_records", "id UUID PK, company_id UUID, staff_id UUID FK, project_id UUID NULLABLE, date DATE, status ENUM('present','absent','week_off','not_marked'), shift NUMERIC(4,2), overtime_hours NUMERIC(4,2), punch_in TIMESTAMPTZ, punch_out TIMESTAMPTZ, punch_in_location GEOMETRY, punch_out_location GEOMETRY, daily_allowances JSONB, created_at TIMESTAMPTZ"],
      ["attendance_task_links", "id UUID PK, attendance_id UUID FK, task_id UUID FK, worker_count INTEGER, work_hours NUMERIC(5,2)"],
      ["labour_contractors", "id UUID PK, project_id UUID FK, party_cu_id UUID FK, workforce_ids UUID[]"],
      ["workforce", "id UUID PK, company_id UUID, labour_contractor_id UUID FK, name TEXT, daily_rate NUMERIC(18,4), workforce_type_id UUID, face_photo TEXT, is_cash BOOLEAN"],
      ["labour_attendance", "id UUID PK, project_id UUID FK, labour_contractor_id UUID FK, date DATE, headcount INTEGER, task_links JSONB"],
      ["salary_expenses", "id UUID PK, company_id UUID, staff_id UUID FK, project_id UUID NULLABLE, month DATE, gross NUMERIC(18,4), deductions NUMERIC(18,4), net NUMERIC(18,4), transaction_id UUID"],
      ["leaves", "id UUID PK, company_id UUID, staff_id UUID FK, leave_type_id UUID, from_date DATE, to_date DATE, days NUMERIC(4,2), status ENUM('pending','approved','rejected'), notes TEXT"],
      ["leave_templates", "id UUID PK, company_id UUID, name TEXT, annual_days NUMERIC(4,2), carry_forward BOOLEAN, applicable_to ENUM('office','site','all')"],
      ["company_holidays", "id UUID PK, company_id UUID, name TEXT, date DATE, recurring BOOLEAN"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Tasks & Progress", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["tasks", "id UUID PK, company_id UUID, project_id UUID FK, parent_id UUID SELF-REF, name TEXT, duration_days INTEGER, start_date DATE, end_date DATE, unit TEXT, est_qty NUMERIC(12,4), progress_qty NUMERIC(12,4), completion_pct NUMERIC(5,2), status ENUM('not_started','in_progress','on_hold','completed','cancelled'), priority ENUM('low','medium','high','critical'), assigned_to UUID, tags TEXT[], boq_item_id UUID, cost_code_id UUID, location_id UUID, custom_fields JSONB, sort_order INTEGER, deleted_at TIMESTAMPTZ"],
      ["task_dependencies", "id UUID PK, task_id UUID FK, depends_on_id UUID FK, dependency_type ENUM('finish_to_start','start_to_start')"],
      ["task_progress", "id UUID PK, task_id UUID FK, project_id UUID, date DATE, quantity NUMERIC(12,4), dimensions JSONB, location_id UUID, notes TEXT, photos TEXT[], approval_flag TEXT, created_by UUID, created_at TIMESTAMPTZ"],
      ["task_resources", "id UUID PK, task_id UUID FK, resource_type ENUM('material','labour','equipment'), ref_id UUID, budget_qty NUMERIC(12,4), unit TEXT"],
      ["task_refresh_dates", "id UUID PK, task_id UUID FK, target_date DATE, planned_qty NUMERIC(12,4)"],
      ["inspection_forms", "id UUID PK, company_id UUID, name TEXT, fields JSONB, trigger ENUM('before_completion','anytime'), active BOOLEAN"],
      ["inspection_responses", "id UUID PK, form_id UUID FK, task_id UUID FK, project_id UUID, responses JSONB, status ENUM('pending','submitted','approved','rejected'), prefix TEXT, sequence INTEGER, submitted_by UUID, created_at TIMESTAMPTZ"],
      ["todos", "id UUID PK, company_id UUID, project_id UUID NULLABLE, title TEXT, description TEXT, type_id UUID, assigned_to UUID, due_date DATE, priority ENUM('low','medium','high','critical'), status ENUM('open','in_progress','resolved','closed'), photos TEXT[], comments JSONB, created_by UUID, created_at TIMESTAMPTZ"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Equipment & Assets", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["equipment_library", "id UUID PK, company_id UUID, name TEXT, type_id UUID, manufacturer TEXT, model TEXT, serial_number TEXT"],
      ["project_equipment", "id UUID PK, project_id UUID FK, equipment_lib_id UUID FK, supplier_cu_id UUID, hire_rate NUMERIC(18,4), rate_unit TEXT, start_date DATE, end_date DATE"],
      ["equipment_expenses", "id UUID PK, company_id UUID, project_id UUID, equipment_id UUID FK, expense_type TEXT, amount NUMERIC(18,4), date DATE, notes TEXT, approval_flag TEXT, transaction_id UUID"],
      ["assets", "id UUID PK, company_id UUID, asset_number TEXT, name TEXT, category_id UUID, purchase_date DATE, purchase_value NUMERIC(18,4), current_location TEXT, current_holder_id UUID, status ENUM('available','allocated','maintenance','disposed')"],
      ["asset_allocations", "id UUID PK, asset_id UUID FK, allocated_to UUID, project_id UUID NULLABLE, allocated_at TIMESTAMPTZ, returned_at TIMESTAMPTZ, approval_flag TEXT"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Library & Reference Tables", 2, LBLUE),
  simpleTable(
    ["Table", "Purpose"],
    [
      ["subcategories", "id, company_id, type (material|task|expense|progress|attendance|etc), parent_id, name_en, name_hi, color_hex, sort_order"],
      ["service_rates (Rate Library)", "id, company_id, name, unit, rate, category_id — pre-built rates for BOQ and WO items"],
      ["deduction_items", "id, company_id, name, default_percentage, calculation_type — reusable deductions"],
      ["retention_items", "id, company_id, name, percentage, release_conditions — retention rules"],
      ["workforce_types", "id, company_id, name, default_daily_rate, unit — Mason, Carpenter, Electrician, etc."],
      ["cost_codes", "id, company_id, name, code, parent_id — budget category hierarchy"],
      ["custom_fields_config", "id, company_id, entity_type, field_name, field_type, required, options JSONB"],
      ["approval_pipeline_templates", "id, company_id, feature_type TEXT, rules JSONB — multi-level approval configs"],
      ["document_sequences", "id, company_id, project_id NULLABLE, prefix TEXT, entity_type TEXT, current_sequence INTEGER"],
    ],
    [3000, 6400]
  ),
  p(""),

  h("Collaboration", 2, LBLUE),
  simpleTable(
    ["Table", "Key Columns"],
    [
      ["moms", "id UUID PK, company_id UUID, project_id UUID NULLABLE, title TEXT, date DATE, venue TEXT, attendee_ids UUID[], agenda JSONB, action_points JSONB, next_meeting_date DATE, pdf_url TEXT, created_by UUID"],
      ["chat_groups", "id UUID PK, company_id UUID, project_id UUID NULLABLE, name TEXT, member_ids UUID[], type ENUM('group','announcement','subcon'), created_by UUID"],
      ["chat_messages", "id UUID PK, group_id UUID FK, sender_cu_id UUID, content TEXT, message_type ENUM('text','image','document','audio'), media_url TEXT, read_by JSONB, created_at TIMESTAMPTZ"],
      ["designs", "id UUID PK, project_id UUID FK, folder_id UUID FK, name TEXT, current_version INTEGER, status ENUM('pending','approved','rejected'), created_by UUID"],
      ["design_versions", "id UUID PK, design_id UUID FK, version INTEGER, file_url TEXT, uploaded_by UUID, comments TEXT, approval_flag TEXT, created_at TIMESTAMPTZ"],
    ],
    [2800, 6600]
  ),
  p(""),

  h("Key Indexes", 2, LBLUE),
  bullet("All FK columns indexed"),
  bullet("transactions: (company_id, transaction_date), (company_id, transaction_type), (party_cu_id, company_id)"),
  bullet("projects: (company_id, status), (company_id, deleted_at)"),
  bullet("attendance_records: (staff_id, date), (project_id, date)"),
  bullet("material_stocks: (company_id, project_id, material_item_id) UNIQUE"),
  bullet("tasks: (project_id, status), (assigned_to, status), (project_id, parent_id)"),
  bullet("company_users: (company_id, user_id) UNIQUE, (company_id, mobile)"),
  bullet("Full-text search: GIN index on company name, project name, party name, task name"),

  pageBreak(),
];

// ─── OUTPUT C — API DESIGN ────────────────────────────────────────────────────
const outputC = [
  h("OUTPUT C — REST API Design", 1, BLUE),
  p("Clean, versioned REST API with strict company-level isolation, JWT authentication, and rate limiting.", { italic: true }),
  divider(),

  h("Base URL & Versioning", 2, LBLUE),
  bullet("Base URL: https://api.sitepro.io/v1"),
  bullet("Versioning in URL path (not header) — explicit and cacheable"),
  bullet("All responses: { data, meta, errors } envelope"),

  h("Authentication", 2, LBLUE),
  bullet("OTP Login: POST /auth/otp/send → POST /auth/otp/verify → returns {access_token, refresh_token}"),
  bullet("JWT (RS256), 1-hour access token, 30-day refresh token"),
  bullet("All API requests: Authorization: Bearer <token>"),
  bullet("Multi-company: X-Company-Id header (validated against token's allowed companies)"),
  bullet("Project context: X-Project-Id header (validated against company membership)"),
  bullet("Rate limiting: 200 req/min per token, 1000 req/min per company, 5 OTP sends/hour per phone"),

  h("Security Improvements Over Competitor", 2, LBLUE),
  bullet("NO global user list endpoint — /users only returns company-scoped users"),
  bullet("Every endpoint verifies company_id from JWT, never just from URL parameter"),
  bullet("Project access checked against project_team membership on every project endpoint"),
  bullet("All IDs are UUIDs — no sequential IDs that can be enumerated"),
  bullet("Rate limiting on all endpoints"),
  bullet("Audit log for all mutations"),

  h("Core Resource Endpoints", 2, LBLUE),
  p("Following REST conventions. All list endpoints support: ?page=1&per_page=50&sort=created_at:desc&filter[status]=active"),
  simpleTable(
    ["Method", "Endpoint", "Description"],
    [
      ["GET", "/v1/projects", "List projects (company-scoped)"],
      ["POST", "/v1/projects", "Create project"],
      ["GET", "/v1/projects/:id", "Get project detail"],
      ["PATCH", "/v1/projects/:id", "Update project"],
      ["DELETE", "/v1/projects/:id", "Soft-delete project"],
      ["GET", "/v1/projects/:id/dashboard", "Project dashboard aggregates"],
      ["GET", "/v1/projects/:id/team", "Project team members"],
      ["POST", "/v1/projects/:id/team", "Add team member"],
      ["GET", "/v1/company/dashboard", "Company-level dashboard"],
      ["GET", "/v1/company/finance/summary", "Company finance summary"],
      ["GET", "/v1/parties", "List parties (company users with financial context)"],
      ["POST", "/v1/parties", "Create party"],
      ["GET", "/v1/parties/:id/ledger", "Party ledger with pagination"],
      ["GET", "/v1/transactions", "List transactions (filterable by project, type, date)"],
      ["POST", "/v1/transactions", "Create transaction"],
      ["GET", "/v1/transactions/:id", "Transaction detail"],
      ["PATCH", "/v1/transactions/:id", "Update transaction (if not locked)"],
      ["POST", "/v1/transactions/:id/approve", "Approve transaction"],
      ["POST", "/v1/transactions/:id/reject", "Reject transaction"],
      ["GET", "/v1/invoices", "List sales invoices"],
      ["POST", "/v1/invoices", "Create sales invoice"],
      ["POST", "/v1/invoices/:id/send", "Send invoice to client"],
      ["GET", "/v1/boqs", "List BOQs for a project"],
      ["POST", "/v1/boqs", "Create BOQ"],
      ["GET", "/v1/boqs/:id/budget", "BOQ budget summary"],
      ["GET", "/v1/materials/library", "Material library"],
      ["GET", "/v1/projects/:id/materials", "Project material list with stock"],
      ["POST", "/v1/material-requests", "Raise MR"],
      ["GET", "/v1/material-requests", "List MRs"],
      ["POST", "/v1/rfqs", "Create RFQ"],
      ["POST", "/v1/rfqs/:id/publish", "Publish RFQ to suppliers"],
      ["POST", "/v1/rfqs/:id/convert-to-po", "Convert quote to PO"],
      ["GET", "/v1/purchase-orders", "List POs"],
      ["POST", "/v1/purchase-orders", "Create PO"],
      ["POST", "/v1/grns", "Create GRN"],
      ["POST", "/v1/material-transfers", "Transfer materials"],
      ["POST", "/v1/material-used", "Record material consumption"],
      ["GET", "/v1/material-stocks", "Current stock levels"],
      ["GET", "/v1/work-orders", "List subcon work orders"],
      ["POST", "/v1/work-orders", "Create work order"],
      ["POST", "/v1/work-orders/:id/bills", "Raise RA bill"],
      ["GET", "/v1/work-orders/:id/bills", "List bills for WO"],
      ["GET", "/v1/tasks", "List tasks (filterable by project, status, assignee)"],
      ["POST", "/v1/tasks", "Create task"],
      ["POST", "/v1/tasks/:id/progress", "Add progress entry"],
      ["GET", "/v1/tasks/:id/resources", "Task resource breakdown"],
      ["GET", "/v1/attendance", "List attendance records"],
      ["POST", "/v1/attendance", "Mark attendance"],
      ["POST", "/v1/attendance/punch-in", "GPS/Face punch in"],
      ["POST", "/v1/attendance/punch-out", "GPS/Face punch out"],
      ["GET", "/v1/payroll/staff", "List payroll staff"],
      ["POST", "/v1/payroll/staff", "Add staff to payroll"],
      ["GET", "/v1/crm/leads", "List CRM leads"],
      ["POST", "/v1/crm/leads", "Create lead"],
      ["GET", "/v1/crm/quotations", "List quotations"],
      ["POST", "/v1/crm/quotations", "Create quotation"],
      ["GET", "/v1/reports/:type", "Generate report (returns URL or stream PDF/Excel)"],
      ["GET", "/v1/settings/roles", "List company roles"],
      ["POST", "/v1/settings/roles", "Create custom role"],
      ["GET", "/v1/settings/approval-pipelines", "Get approval rules"],
      ["PUT", "/v1/settings/approval-pipelines/:feature_type", "Update approval rules"],
    ],
    [700, 3500, 5200]
  ),
  p(""),

  h("Pagination Standard", 2, LBLUE),
  bullet("Cursor-based pagination for large lists: ?cursor=<opaque_token>&per_page=50"),
  bullet("Response meta: { total_count, next_cursor, prev_cursor, has_more }"),
  bullet("Offset pagination for reports: ?page=1&per_page=100"),

  h("Inline Joins (Replacing monkey_patch)", 2, LBLUE),
  p("Use sparse fieldsets to control response size, and named includes for related data:"),
  bullet("?include=party,project,creator — include related objects inline"),
  bullet("?fields=id,amount,transaction_date,party.name — sparse fields"),
  bullet("This is cleaner than the competitor's monkey_patch_ prefix convention"),
  bullet("All joins resolved server-side in a single DB query using SQL JOINs"),

  h("Webhooks", 2, LBLUE),
  bullet("Subscribe to events: invoice.created, payment.received, material.requested, approval.pending, etc."),
  bullet("POST to registered webhook URL with signed payload (HMAC-SHA256)"),
  bullet("Retry with exponential backoff on failure"),

  pageBreak(),
];

// ─── OUTPUT D — TECH STACK ────────────────────────────────────────────────────
const outputD = [
  h("OUTPUT D — Tech Stack Recommendation", 1, BLUE),
  divider(),

  h("Frontend Web App", 2, LBLUE),
  bullet("Framework: React 18 with TypeScript"),
  bullet("State management: Zustand + React Query (TanStack Query) — Zustand for UI state, RQ for server state"),
  bullet("UI components: Radix UI primitives + custom design system (Tailwind CSS)"),
  bullet("Build: Vite"),
  bullet("Charts: Recharts / Observable Plot"),
  bullet("Tables: TanStack Table"),
  bullet("PDF generation: react-pdf or server-side"),
  bullet("Real-time: native WebSocket with reconnection logic"),
  bullet("Offline support: Service Worker + IndexedDB (Dexie.js) for field data"),
  bullet("Reason: React ecosystem is larger than Angular for hiring; TypeScript ensures safety; Vite is much faster than Angular CLI"),

  h("Mobile App", 2, LBLUE),
  bullet("Framework: React Native (Expo managed workflow)"),
  bullet("Navigation: React Navigation v6"),
  bullet("State: Same Zustand + React Query as web"),
  bullet("Camera: Expo Camera (attendance punch, photo evidence)"),
  bullet("GPS: Expo Location (geofenced attendance)"),
  bullet("Face recognition: AWS Rekognition API or Google Vision API (server-side)"),
  bullet("Offline sync: WatermelonDB (SQLite-backed, real sync protocol)"),
  bullet("Push notifications: Firebase Cloud Messaging (FCM)"),
  bullet("WhatsApp OTP: Gupshup or MSG91 APIs (India); Twilio for international"),
  bullet("Reason: One codebase for iOS + Android; Expo simplifies build pipeline"),

  h("Backend API", 2, LBLUE),
  bullet("Language: Go 1.22 — maintains the competitor's choice, excellent performance"),
  bullet("Framework: Fiber (faster than Gin, echo for high-concurrency site APIs) OR keep Gin"),
  bullet("ORM: sqlc (type-safe SQL codegen) — no magic, predictable queries"),
  bullet("Authentication: JWT (RS256), OTP via MSG91/Gupshup/Twilio"),
  bullet("Real-time: gorilla/websocket for chat and live attendance feeds"),
  bullet("Background jobs: River (Go-native Postgres job queue) or Asynq"),
  bullet("File storage: Cloudflare R2 (cheaper S3-compatible, better latency from India/UAE)"),
  bullet("PDF generation: Go-based: wkhtmltopdf wrapper or Chromium headless"),

  h("Database", 2, LBLUE),
  bullet("Primary DB: PostgreSQL 16 on Supabase (managed) or self-hosted on DO/AWS"),
  bullet("PostGIS extension for GPS/geofencing queries"),
  bullet("pgvector for future AI search"),
  bullet("Connection pooling: PgBouncer"),
  bullet("Read replicas for reporting queries"),
  bullet("Analytics: ClickHouse for heavy aggregation reports (optional, start with PG)"),
  bullet("Caching: Redis 7 — session store, rate limiting, real-time pub/sub"),
  bullet("Search: Typesense (fast, easy to operate, India-friendly pricing) for party/material/task search"),

  h("Infrastructure", 2, LBLUE),
  bullet("Cloud: AWS (ap-south-1 Mumbai primary, me-south-1 Bahrain for Middle East, ap-southeast-2 Sydney for Australia)"),
  bullet("Containers: Docker + Kubernetes (EKS) or fly.io for simpler ops initially"),
  bullet("CDN: Cloudflare (edge caching, DDoS protection, Indian PoPs)"),
  bullet("CI/CD: GitHub Actions → ECR → EKS"),
  bullet("Monitoring: Grafana + Prometheus + Loki (logs)"),
  bullet("Error tracking: Sentry"),
  bullet("APM: Datadog or OpenTelemetry → Jaeger"),

  h("Integrations", 2, LBLUE),
  bullet("Tally: XML-based Tally Prime API (same as competitor)"),
  bullet("Zoho Books: REST API"),
  bullet("WhatsApp Business: Meta Cloud API (document sharing, payment notifications)"),
  bullet("SMS/OTP: MSG91 (India primary), Twilio (international)"),
  bullet("Payments: Razorpay (India), Stripe (international)"),
  bullet("ZATCA (Saudi): Use ZATCA SDK for e-invoicing compliance"),
  bullet("Email: AWS SES or Postmark"),

  pageBreak(),
];

// ─── OUTPUT E — BUILD PRIORITY ────────────────────────────────────────────────
const outputE = [
  h("OUTPUT E — Build Priority Order", 1, BLUE),
  p("Opinionated sprint-by-sprint build order to reach first paying customer in 3 months.", { italic: true }),
  divider(),

  h("Phase 1 — MVP Core (Weeks 1–6)", 2, LBLUE),
  p("Goal: A construction PM can track a project, its tasks, and basic cash flow."),
  simpleTable(
    ["Priority", "Module", "Why First"],
    [
      ["P1.1", "Auth + Company Onboarding", "Nothing works without this. OTP login, company setup, invite team"],
      ["P1.2", "Projects CRUD", "Core entity. Every other module hangs off a project"],
      ["P1.3", "Party / Contact Management", "Vendors, clients, subcons — needed for finance and materials"],
      ["P1.4", "Task Management (basic)", "The #1 daily-use feature. Create tasks, update progress, view Gantt"],
      ["P1.5", "Basic Finance — Transactions", "Payment In/Out, Expenses. This is what makes people pay for software"],
      ["P1.6", "Sales Invoice", "Clients pay after receiving invoice. Critical for cash flow visibility"],
      ["P1.7", "Roles & Permissions", "Needed before any customer goes live — security is non-negotiable"],
      ["P1.8", "Mobile App (React Native)", "Site teams only use mobile. If mobile doesn't work, product doesn't sell"],
      ["P1.9", "GPS Attendance (basic)", "The #1 demo hook for Indian market — replaces physical register immediately"],
    ],
    [1200, 2500, 5700]
  ),
  p(""),

  h("Phase 2 — Materials & Payroll (Weeks 7–10)", 2, LBLUE),
  p("Goal: Materials tracking and labour payroll — the two biggest pain points after finance."),
  simpleTable(
    ["Priority", "Module", "Why Here"],
    [
      ["P2.1", "Material Library + Project Materials", "Foundation for MR, GRN, stock"],
      ["P2.2", "Material Request (MR)", "Daily site usage — site team raises MR on mobile"],
      ["P2.3", "Purchase Order", "Procurement formalisation — first step to replacing Excel"],
      ["P2.4", "GRN (Material Received)", "Completes the procurement loop + auto-updates stock"],
      ["P2.5", "Payroll — Add Staff + Salary Templates", "Large teams need payroll before attendance makes sense"],
      ["P2.6", "Attendance Marking (Grid + Mobile)", "Mark present/absent, shifts, overtime. Generates salary expense automatically"],
      ["P2.7", "Salary Expense Auto-generation", "The automation that saves 10 hours/month in accounting"],
      ["P2.8", "BOQ / Estimate", "Pre-construction estimating + milestone invoicing unlocks larger contracts"],
    ],
    [1200, 2500, 5700]
  ),
  p(""),

  h("Phase 3 — Subcon, Reports, Procurement Full (Weeks 11–14)", 2, LBLUE),
  p("Goal: Mid-market construction companies with subcon-heavy operations can go fully live."),
  simpleTable(
    ["Priority", "Module", "Why Here"],
    [
      ["P3.1", "Subcontractor Work Orders + RA Bills", "Largest pain point for mid-size contractors — replaces Excel completely"],
      ["P3.2", "Reports (Sales, Payments, Materials, Attendance)", "Reports are the hook for the accountant/owner signing the cheque"],
      ["P3.3", "RFQ", "Formalise vendor quote comparison — saves money on large material purchases"],
      ["P3.4", "Multi-Level Approval", "Enterprise feature request #1 — CFOs won't approve without it"],
      ["P3.5", "Warehouse Management", "For companies with central procurement + multi-site distribution"],
      ["P3.6", "CRM — Leads & Quotations", "Pre-sales pipeline management — converts to project creation"],
      ["P3.7", "Tally Integration", "India's accountants demand Tally. Non-negotiable for accountant buy-in"],
    ],
    [1200, 2500, 5700]
  ),
  p(""),

  h("Phase 4 — Advanced Features (Weeks 15–20)", 2, LBLUE),
  simpleTable(
    ["Priority", "Module", "When to Build"],
    [
      ["P4.1", "Equipment Management", "When customers ask — 30% of market needs this"],
      ["P4.2", "Asset Management", "Small % of market — property developers + EPC companies"],
      ["P4.3", "Design Files", "Unlocks architects and interior designers as a segment"],
      ["P4.4", "Inspection Forms", "Quality management — required for ISO-compliant companies"],
      ["P4.5", "MOM (Minutes of Meeting)", "Collaboration feature — nice to have, not a sales blocker"],
      ["P4.6", "Chat Groups", "Replaces WhatsApp for project comms — high engagement, medium revenue impact"],
      ["P4.7", "Face Recognition Attendance", "Premium hardware-free option — big in India for large sites"],
      ["P4.8", "ZATCA e-invoicing", "Saudi Arabia market entry requirement — legal compliance"],
      ["P4.9", "Zoho Books Integration", "For customers already on Zoho ecosystem"],
      ["P4.10", "AI Assistant / Chatbot", "Differentiation once core product is stable"],
    ],
    [1200, 2500, 5700]
  ),
  p(""),

  h("Freemium Pricing Strategy", 2, LBLUE),
  p("Designed to undercut the reference product by 20-30% while capturing the same value:"),
  simpleTable(
    ["Plan", "Price", "Users", "Key Limits"],
    [
      ["Free", "₹0 forever", "1", "1 active project, no finance module, no mobile app, 500MB storage"],
      ["Starter", "₹999/user/month (₹9,999/year)", "2-3", "5 projects, basic finance, mobile app, all core modules, 5GB"],
      ["Growth", "₹1,499/user/month (₹14,999/year)", "Unlimited", "20 projects, all modules incl. BOQ + Subcon, 20GB, email support"],
      ["Pro", "₹2,499/user/month (₹24,999/year)", "Unlimited", "Unlimited projects, approval workflows, Tally, GPS attendance, 100GB"],
      ["Enterprise", "Custom (from ₹8L/year)", "Unlimited", "White-label, SAP/ERP integration, dedicated CSM, SLA, custom dev"],
    ],
    [1500, 2200, 1500, 4200]
  ),
  p(""),
  p("Add-Ons:"),
  bullet("GPS + Face Recognition: ₹15,000/year (vs competitor's ₹20,000)"),
  bullet("Additional Company Entity: ₹15,000/year"),
  bullet("Tally Integration: ₹15,000/year (vs ₹20,000)"),
  bullet("Zoho Books Integration: ₹12,000/year"),
  bullet("WhatsApp Business Messaging: usage-based (₹0.50/conversation)"),

  h("Go-to-Market Strategy", 2, LBLUE),
  bullet("Month 1-2: India first — target Tier 2 cities (Pune, Surat, Coimbatore, Ahmedabad) where competition is lower but construction is booming"),
  bullet("Hook: 'Replace your WhatsApp groups and Excel' — resonate with the exact pain point"),
  bullet("Channel: Channel partner program (CA firms, construction consultants get 20% recurring commission)"),
  bullet("Content: Build SEO content targeting 'construction management software India', 'building contractor app', regional terms"),
  bullet("Month 3-6: Middle East (UAE + Saudi) — construction ERP market 3x larger per company than India"),
  bullet("Month 6-12: Australia (English market, similar workflow to India, strong migration of Indian contractors)"),

  pageBreak(),
];

// ─── CODING AGENT PROMPTS APPENDIX ───────────────────────────────────────────
const appendix = [
  h("Appendix — Coding Agent Prompt Templates", 1, BLUE),
  divider(),

  h("How to Use These Prompts", 2, LBLUE),
  p("Each prompt below is designed to be given to a coding agent (Claude Code, Cursor, etc.) to build a specific part of the system. They include schema references, acceptance criteria, and test cases."),

  h("Agent Prompt 1 — Backend Foundation", 3, CYAN),
  new Paragraph({
    shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: LBLUE, space: 2 } },
    spacing: { before: 120, after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: `You are building SitePro ERP — a SaaS construction management platform.\n\nTask: Set up the Go backend API foundation.\n\nRequirements:\n1. Go 1.22, Fiber framework, sqlc for database access\n2. PostgreSQL 16 connection with PgBouncer\n3. JWT authentication with RS256 keys\n4. OTP login via MSG91 API\n5. Multi-tenant: every handler must validate company_id from JWT\n6. Redis for rate limiting (200 req/min per token)\n7. Request/response middleware: logging, error handling, CORS\n8. Endpoint: POST /v1/auth/otp/send and POST /v1/auth/otp/verify\n9. Endpoint: GET /v1/me (returns current user + company memberships)\n10. All endpoints return { data, meta, errors } envelope\n\nSchema files are in /schema/*.sql\nDo NOT expose any global user list endpoint.\nAll company_id checks must come from JWT claims, not URL params.`, size: 18, font: "Courier New" })],
  }),

  h("Agent Prompt 2 — Projects Module", 3, CYAN),
  new Paragraph({
    shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: LBLUE, space: 2 } },
    spacing: { before: 120, after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: `Task: Build the Projects module (CRUD + Dashboard).\n\nDatabase tables needed: projects, project_team, project_locations, project_phases\n\nEndpoints to implement:\n- GET /v1/projects (list, paginated, filterable by status/category)\n- POST /v1/projects (create with all fields from spec)\n- GET /v1/projects/:id (detail with monkey_patch style includes)\n- PATCH /v1/projects/:id (partial update)\n- DELETE /v1/projects/:id (soft delete via deleted_at)\n- GET /v1/projects/:id/dashboard (aggregated stats)\n- POST /v1/projects/:id/team (add member with role)\n- DELETE /v1/projects/:id/team/:cu_id (remove member)\n\nBusiness rules:\n- User can only see projects they are in project_team for\n- Admin role bypasses project_team filter but still scoped to company_id\n- Project deletion requires zero active transactions (return 409 if exists)\n- GPS coordinates stored as PostGIS Point(lng, lat, 4326)\n\nWrite integration tests for each endpoint.`, size: 18, font: "Courier New" })],
  }),

  h("Agent Prompt 3 — Finance Module", 3, CYAN),
  new Paragraph({
    shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: LBLUE, space: 2 } },
    spacing: { before: 120, after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: `Task: Build the Finance Transactions module.\n\nAll 14 transaction types must be handled.\nImplement ledger accounting: each transaction affects wallet balances.\n\nEndpoints:\n- GET /v1/transactions (filterable by company/project/type/date/party)\n- POST /v1/transactions (with transaction_type routing to sub-handlers)\n- GET /v1/transactions/:id\n- PATCH /v1/transactions/:id (only if not locked by back-date control)\n- POST /v1/transactions/:id/approve\n- POST /v1/transactions/:id/reject\n- GET /v1/parties/:id/ledger (paginated, with running balance per entry)\n- GET /v1/company/finance/summary (aggregate stats for company dashboard)\n\nBusiness rules:\n- Back-dated entry: check against company settings.lock_date\n- Approval flow: check against approval_pipeline_templates before saving\n- On Payment In/Out: update wallet balance atomically in same DB transaction\n- Salary Expenses auto-generated monthly — implement as a cron job\n- Deductions stored in transaction_deductions table, affect net_payable\n\nData integrity: all wallet updates must be in a DB transaction (ACID).`, size: 18, font: "Courier New" })],
  }),

  h("Agent Prompt 4 — Materials Module", 3, CYAN),
  new Paragraph({
    shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: LBLUE, space: 2 } },
    spacing: { before: 120, after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: `Task: Build the complete material lifecycle — all 9 steps.\n\nTables: material_items, project_materials, material_requests, purchase_orders, po_items, rfqs, rfq_quotes, grns, material_stocks, material_movements\n\nCore rule: material_stocks must ALWAYS be consistent with material_movements.\nNever update stocks directly — only through movement records (event sourcing pattern).\n\nEndpoints:\n- Full CRUD for material_items (company library)\n- POST /v1/material-requests (raises MR, notifies if approval needed)\n- PUT /v1/material-requests/:id/approve|reject\n- POST /v1/purchase-orders (can be from RFQ or manual)\n- POST /v1/purchase-orders/:id/publish (sends PO to vendor)\n- POST /v1/grns (creates GRN, auto-creates material_movements, increments stock)\n- POST /v1/material-transfers (decrements source, increments dest)\n- POST /v1/material-used (decrements stock, requires balance check)\n- GET /v1/material-stocks?project_id=X (current stock snapshot)\n- GET /v1/material-movements (audit trail)\n\nRestriction checks (from company settings):\n- material_request_restriction: cannot receive without MR\n- po_material_restriction: cannot create GRN without PO\n- material_use: cannot use more than stock balance`, size: 18, font: "Courier New" })],
  }),

  h("Agent Prompt 5 — React Native Mobile App", 3, CYAN),
  new Paragraph({
    shading: { fill: "F0F4F8", type: ShadingType.CLEAR },
    border: { left: { style: BorderStyle.SINGLE, size: 6, color: LBLUE, space: 2 } },
    spacing: { before: 120, after: 120 },
    indent: { left: 360 },
    children: [new TextRun({ text: `Task: Build the React Native (Expo) mobile app — core screens.\n\nScreens to build first (Phase 1 MVP):\n1. OTP Login (mobile number entry → OTP verification)\n2. Company selector (if user belongs to multiple companies)\n3. Project List (card view, progress %, filter by status, search)\n4. Project Dashboard (finance summary, pending items, quick actions)\n5. Task List (by project, filterable, create task)\n6. Task Detail (progress entry, resources, photos)\n7. Attendance Grid (mark present/absent, date navigation)\n8. GPS Punch In/Out (camera + location capture)\n9. Material Request (quick form, select materials from library)\n10. Payment In/Out (quick transaction entry)\n\nTech:\n- Expo SDK 51, React Native 0.74\n- React Navigation 6 with bottom tabs + stack navigators\n- Zustand + React Query for state\n- Expo Camera for punch-in and photo evidence\n- Expo Location for GPS\n- Offline-first: cache last-known project data in AsyncStorage\n- WatermelonDB for attendance offline sync\n\nUX requirements:\n- Works on 4G and 3G connections (compress photos before upload)\n- Hindi language support (react-i18next)\n- Large tap targets (workers use apps with dirty hands)\n- Dark mode support`, size: 18, font: "Courier New" })],
  }),

  new Paragraph({ spacing: { before: 400, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "— END OF SPECIFICATION —", bold: true, size: 24, color: GRAY, font: "Arial" })] }),
  new Paragraph({ spacing: { before: 100, after: 100 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "SitePro ERP | Confidential Product Specification | June 2026", size: 18, color: GRAY, italic: true, font: "Arial" })] }),
];

// ─── Assemble Document ────────────────────────────────────────────────────────
const allContent = [
  ...coverPage,
  ...tocSection,
  ...outputA_header,
  ...module1,
  ...module2,
  ...module3,
  ...module4,
  ...module5,
  ...module6,
  ...module7,
  ...module8,
  ...module9,
  ...module10,
  ...module11,
  ...module12,
  ...module13,
  ...outputB,
  ...outputC,
  ...outputD,
  ...outputE,
  ...appendix,
];

const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022",
          style: { paragraph: { indent: { left: 440, hanging: 220 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6",
          style: { paragraph: { indent: { left: 880, hanging: 220 } } } },
      ]},
      { reference: "numbers", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          style: { paragraph: { indent: { left: 440, hanging: 220 } } } },
      ]},
    ]
  },
  styles: {
    default: {
      document: { run: { font: "Arial", size: 20 } }
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 40, bold: true, font: "Arial", color: BLUE },
        paragraph: { spacing: { before: 480, after: 240 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: LBLUE },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: CYAN },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 2 } },
      { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Arial", color: GRAY },
        paragraph: { spacing: { before: 180, after: 100 }, outlineLevel: 3 } },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 }
      }
    },
    headers: {
      default: {
        children: [
          new Paragraph({
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: LBLUE, space: 1 } },
            spacing: { before: 0, after: 100 },
            children: [
              new TextRun({ text: "SitePro ERP — Product Specification  ", size: 18, color: GRAY, font: "Arial" }),
              new TextRun({ text: "CONFIDENTIAL", bold: true, size: 18, color: GOLD, font: "Arial" }),
            ]
          })
        ]
      }
    },
    footers: {
      default: {
        children: [
          new Paragraph({
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: LBLUE, space: 1 } },
            spacing: { before: 100, after: 0 },
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", size: 18, color: GRAY, font: "Arial" }),
              new PageNumber(),
              new TextRun({ text: "  |  June 2026", size: 18, color: GRAY, font: "Arial" }),
            ]
          })
        ]
      }
    },
    children: allContent,
  }]
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync('/mnt/user-data/outputs/SitePro-ERP-Complete-Specification.docx', buf);
  console.log('Done! Written to /mnt/user-data/outputs/SitePro-ERP-Complete-Specification.docx');
  console.log('Size:', buf.length, 'bytes');
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
