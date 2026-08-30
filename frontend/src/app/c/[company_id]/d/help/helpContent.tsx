import React from "react";
import Link from "next/link";
import { type IconName } from "@/components/marketing/Icon";

export interface FaqItem {
  q: string;
  a: React.ReactNode;
  // Plain-text copy used only for search matching.
  text: string;
}

export interface FaqCategory {
  id: string;
  title: string;
  icon: IconName;
  items: FaqItem[];
}

// Company-scoped path helper keeps links accurate for the signed-in company.
const c = (companyId: string, path: string) => `/c/${companyId}${path}`;

export const HELP_MODULE_LINKS: (companyId: string) => {
  label: string;
  href: string;
}[] = (companyId) => [
  { label: "Planning &amp; Gantt", href: c(companyId, "/d/planning") },
  { label: "DPR &amp; Progress", href: c(companyId, "/d/dpr") },
  { label: "Drawings", href: c(companyId, "/d/drawings") },
  { label: "Procurement", href: c(companyId, "/d/procurement") },
  { label: "Three Way Match", href: c(companyId, "/d/three-way") },
  { label: "Billing &amp; Finance", href: c(companyId, "/d/finance") },
  { label: "Attendance", href: c(companyId, "/d/attendance") },
  { label: "Payroll", href: c(companyId, "/d/payroll-attendance") },
  { label: "Quality", href: c(companyId, "/d/quality") },
  { label: "Safety", href: c(companyId, "/d/safety") },
  { label: "Equipment", href: c(companyId, "/d/equipment") },
  { label: "Production", href: c(companyId, "/d/production") },
  { label: "CRM Pipeline", href: c(companyId, "/d/crm") },
  { label: "Reports Hub", href: c(companyId, "/reports") },
  { label: "Calculators", href: c(companyId, "/d/reports/calculators") },
  { label: "Settings", href: c(companyId, "/settings") },
];

export const HELP_CATEGORIES: (companyId: string) => FaqCategory[] = (
  companyId
) => [
  {
    id: "getting-started",
    title: "Getting Started",
    icon: "rocket",
    items: [
      {
        q: "How do I create a company?",
        a: (
          <>
            <p>
              Preconditions: Sign up for a new account with a verified mobile number or email.
            </p>
            <p className="mt-2">
              Navigation: When you sign in without an active company, you are directed to the onboarding screen at{" "}
              <Link className="help-link" href="/onboarding">
                /onboarding
              </Link>
              .
            </p>
            <p className="mt-2">
              Required fields: Company Name, Phone, City, and Segment (Builder, Contractor, or Project Management). Optional fields: Legal Entity Name, GSTIN, Billing Address, and Logo.
            </p>
            <p className="mt-2">
              Save result: Submitting calls <code>POST /apis/v3/companies/</code>, creates your company record, and assigns your user the Owner role.
            </p>
            <p className="mt-2">
              Next step: Create your first construction project from the Projects directory.
            </p>
          </>
        ),
        text: "create company onboarding owner sign up gstin legal name phone city segment builder contractor",
      },
      {
        q: "How do I create a project?",
        a: (
          <>
            <p>
              Preconditions: You must hold the <code>projects:manage</code> or Owner role in the company.
            </p>
            <p className="mt-2">
              Navigation: Open the sidebar, select{" "}
              <Link className="help-link" href={c(companyId, "/projects")}>
                "Projects"
              </Link>
              , and click the "+ New Project" button in the top toolbar.
            </p>
            <p className="mt-2">
              Required fields: Project Name, Project Code (e.g. SKY-01), Client Name, Location, and Planned Start Date. Optional fields: Planned End Date, Estimated Project Value in INR, Description, and Tower Structure.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/projects/</code>, saves the project record in Active status, and pins it to your sidebar switcher.
            </p>
            <p className="mt-2">
              Next step: Import your BOQ or create schedule tasks in the Planning module.
            </p>
          </>
        ),
        text: "create project new project code client location start date value pinned switcher",
      },
      {
        q: "How do I add team members?",
        a: (
          <>
            <p>
              Preconditions: You must have access to company Settings with <code>settings:manage</code> permissions.
            </p>
            <p className="mt-2">
              Navigation: Click{" "}
              <Link className="help-link" href={c(companyId, "/settings")}>
                "Settings"
              </Link>{" "}
              in the bottom sidebar, choose the "Team" tab, and click "+ Add Member".
            </p>
            <p className="mt-2">
              Required fields: Member Name, Mobile Number or Email, and Priority Role (e.g. Owner, Partner, Staff). Optional fields: Assigned Projects and Custom Role Permissions.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/company-team/</code> and links the user to your company tenant.
            </p>
            <p className="mt-2">
              Next step: Assign the new team member to specific site tasks or approval hierarchies.
            </p>
          </>
        ),
        text: "add team member invite user phone email priority role staff partner settings",
      },
      {
        q: "How do roles and permissions work?",
        a: (
          <>
            <p>
              Preconditions: Role management requires Owner or Admin access.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/settings")}>
                "Settings"
              </Link>
              , navigate to "Roles &amp; Access", and select "Edit Permissions" on any role.
            </p>
            <p className="mt-2">
              Required fields: Role Title and module-level permission checkboxes (e.g. <code>finance:view</code>, <code>finance:bills:manage</code>, <code>procurement:orders:manage</code>).
            </p>
            <p className="mt-2">
              Save result: Calls <code>PUT /apis/v3/roles/{'{id}'}</code>, updating access tokens and sidebar visibility immediately.
            </p>
            <p className="mt-2">
              Next step: Assign updated roles to your staff under the Team tab.
            </p>
          </>
        ),
        text: "roles permissions access control rbac owner admin manager viewer module action",
      },
    ],
  },
  {
    id: "planning-progress",
    title: "Planning &amp; Progress",
    icon: "site",
    items: [
      {
        q: "How do I import a BOQ?",
        a: (
          <>
            <p>
              Preconditions: An active project must exist. Prepare an Excel or CSV file containing your Bill of Quantities.
            </p>
            <p className="mt-2">
              Navigation: Open the project, click{" "}
              <Link className="help-link" href={c(companyId, "/d/boq")}>
                "BOQ &amp; Cost Codes"
              </Link>
              , and click "Import BOQ".
            </p>
            <p className="mt-2">
              Required fields: Map column headers for Item Description, Unit of Measurement, Estimated Quantity, and Unit Rate. Optional fields: Cost Code, Section / Group, and Specification Notes.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/boq/import</code>, creating validated <code>BOQItem</code> records and calculating total estimated contract value.
            </p>
            <p className="mt-2">
              Next step: Link BOQ line items to subcontractor work orders or client sale invoices.
            </p>
          </>
        ),
        text: "boq import bill of quantities excel csv rate unit quantity cost code estimated amount",
      },
      {
        q: "How do I set up a budget and cost codes?",
        a: (
          <>
            <p>
              Preconditions: Cost codes defined in Company Library; project selected.
            </p>
            <p className="mt-2">
              Navigation: Go to{" "}
              <Link className="help-link" href={c(companyId, "/d/library")}>
                "Library"
              </Link>{" "}
              to define master cost codes, then open{" "}
              <Link className="help-link" href={c(companyId, "/d/budget")}>
                "Budgets &amp; Cost Centers"
              </Link>{" "}
              under Financial Control to assign project budgets.
            </p>
            <p className="mt-2">
              Required fields: Cost Code Identifier (e.g. CIVIL-01), Cost Code Name, and Allocated Budget Amount in INR. Optional fields: Sub-Cost Code and Notes.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/library/cost-codes</code> and <code>POST /apis/v3/budget/</code>, setting the baseline against which material purchases and vendor bills are tracked.
            </p>
            <p className="mt-2">
              Next step: Monitor cost variance in the Budget vs Actual Cost Code standard report.
            </p>
          </>
        ),
        text: "budget cost code allocation library variance actual expense baseline civil electrical",
      },
      {
        q: "How do I plan tasks and view the Gantt chart?",
        a: (
          <>
            <p>
              Preconditions: Project created and opened in workspace.
            </p>
            <p className="mt-2">
              Navigation: In the sidebar, open "Planning &amp; Progress" and click{" "}
              <Link className="help-link" href={c(companyId, "/d/planning")}>
                "Tasks &amp; Gantt"
              </Link>
              .
            </p>
            <p className="mt-2">
              Required fields: Task Title, Start Date, and Duration in Days (or End Date). Optional fields: Predecessor Dependencies, Assigned Team Member, and Planned Cost Code.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/planning/tasks</code>, inserting the task on the schedule timeline and rendering interactive bars on the Gantt canvas.
            </p>
            <p className="mt-2">
              Next step: Track daily execution progress against tasks through DPR submissions.
            </p>
          </>
        ),
        text: "planning tasks gantt schedule dependencies duration timeline wbs critical path",
      },
      {
        q: "What are milestones, baseline and lookahead?",
        a: (
          <>
            <p>
              Preconditions: Scheduled task list in Planning module.
            </p>
            <p className="mt-2">
              Navigation: In{" "}
              <Link className="help-link" href={c(companyId, "/d/planning")}>
                "Tasks &amp; Gantt"
              </Link>
              , toggle between "Timeline", "Gantt", and "Lookahead" view tabs.
            </p>
            <p className="mt-2">
              Required fields: Select target tasks and toggle the "Milestone" flag or click "Save Schedule Baseline" to snapshot approved dates.
            </p>
            <p className="mt-2">
              Save result: Stores baseline dates on task records, enabling delay variance calculations.
            </p>
            <p className="mt-2">
              Next step: Review upcoming 2-week and 4-week lookahead windows to prevent material stockouts.
            </p>
          </>
        ),
        text: "milestone baseline lookahead schedule variance delay planned vs actual timeline",
      },
      {
        q: "How do I record a Daily Progress Report (DPR)?",
        a: (
          <>
            <p>
              Preconditions: Project selected with active tasks on the schedule.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Planning &amp; Progress" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/dpr")}>
                "DPR &amp; Site Progress"
              </Link>{" "}
              &rarr; Click "+ New DPR".
            </p>
            <p className="mt-2">
              Required fields: Report Date, Task Progress line items (executed quantity and unit), Workers Deployed count, and Weather Condition (Clear, Rain, Overcast). Optional fields: Site Photos, Materials Consumed, and Site Obstacles.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/dpr/</code>, saving the progress record and incrementing cumulative task completion.
            </p>
            <p className="mt-2">
              Next step: Export the signed PDF DPR for client submission or consultant sign-off.
            </p>
          </>
        ),
        text: "dpr daily progress report site photos workers deployed weather executed quantity",
      },
    ],
  },
  {
    id: "procurement-materials",
    title: "Procurement &amp; Materials",
    icon: "package",
    items: [
      {
        q: "How does indent to PO to GRN to three-way match work?",
        a: (
          <>
            <p>
              Preconditions: Project selected, vendor directory populated in Library.
            </p>
            <p className="mt-2">
              Navigation: Follow the complete cycle via{" "}
              <Link className="help-link" href={c(companyId, "/d/procurement")}>
                "Procurement &amp; Materials"
              </Link>{" "}
              &rarr; "Indents" &rarr; "Purchase Orders" &rarr; "GRN &amp; Deliveries" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/three-way")}>
                "Three Way Match"
              </Link>
              .
            </p>
            <p className="mt-2">
              Workflow steps: 1) Site engineer raises Indent. 2) Purchase team converts Indent into Purchase Order to vendor. 3) Storekeeper enters GRN on delivery. 4) System compares PO, GRN, and Vendor Bill for quantity and rate discrepancies.
            </p>
            <p className="mt-2">
              Save result: Complete audit trail linking requisition, delivery, and accounting voucher.
            </p>
            <p className="mt-2">
              Next step: Approved matching releases the vendor bill for payment in Financial Control.
            </p>
          </>
        ),
        text: "procurement indent purchase order po grn goods receipt three way match audit",
      },
      {
        q: "How do I create a purchase order?",
        a: (
          <>
            <p>
              Preconditions: Approved material indent or direct purchase requirement, active vendor in Library.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/d/procurement")}>
                "Procurement &amp; Materials"
              </Link>
              , select the "Purchase Orders" tab, and click "+ New Purchase Order".
            </p>
            <p className="mt-2">
              Required fields: Vendor Name, Project, PO Date, and Line Items (Material Name, Quantity, Unit Rate, and GST %). Optional fields: Delivery Address, Payment Terms, Freight Charges, and Indent Reference.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/procurement/orders</code>, assigns a unique PO number (e.g. PO-2026-001), and updates committed project costs.
            </p>
            <p className="mt-2">
              Next step: Download the official PDF PO and dispatch it to your supplier.
            </p>
          </>
        ),
        text: "create purchase order po vendor items rate gst payment terms committed cost",
      },
      {
        q: "How do I run a Request for Quotation (RFQ)?",
        a: (
          <>
            <p>
              Preconditions: Material requirements identified, registered suppliers in Library.
            </p>
            <p className="mt-2">
              Navigation: Go to{" "}
              <Link className="help-link" href={c(companyId, "/d/procurement/rfq")}>
                "Vendors &amp; RFQs"
              </Link>{" "}
              in Procurement and click "+ Create RFQ".
            </p>
            <p className="mt-2">
              Required fields: RFQ Title, Project, Submission Deadline, Material Line Items (Specifications and Quantities), and Invited Vendors.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/rfq/</code>, generating RFQ documents for selected vendors.
            </p>
            <p className="mt-2">
              Next step: Enter incoming vendor quotes to generate an automated side-by-side rate comparison matrix.
            </p>
          </>
        ),
        text: "rfq request for quotation vendor compare bids comparison matrix procurement",
      },
      {
        q: "How do I manage inventory and warehouse?",
        a: (
          <>
            <p>
              Preconditions: Project site warehouse location established.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Procurement &amp; Materials" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/materials")}>
                "Inventory &amp; Warehouse"
              </Link>
              .
            </p>
            <p className="mt-2">
              Required fields for transfers: Source Project, Destination Project, Material Name, Transfer Quantity (must not exceed available stock), and Transfer Date.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/materials/transfer</code>, logging transfer notes and adjusting real-time stock levels.
            </p>
            <p className="mt-2">
              Next step: Check the Warehouse Stock Movement standard report for inventory audits.
            </p>
          </>
        ),
        text: "inventory warehouse stock transfer balance material movement audit",
      },
    ],
  },
  {
    id: "financial-control",
    title: "Financial Control &amp; Billing",
    icon: "trending_up",
    items: [
      {
        q: "How do I record a vendor bill?",
        a: (
          <>
            <p>
              Preconditions: Delivered materials with GRN or verified contractor measurement sheet.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Financial Control" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/finance")}>
                "Vendor Bills &amp; Payables"
              </Link>{" "}
              &rarr; Click "+ Add Vendor Bill".
            </p>
            <p className="mt-2">
              Required fields: Vendor Party, Project, Vendor Invoice Number, Invoice Date, Subtotal Amount, and GST Amount. Optional fields: Linked PO Number, Linked GRN Number, TDS Section (e.g. 194C), TDS Amount, and Retention Amount.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/finance/bills</code> with <code>invoice_type="material"</code> or <code>"subcon"</code>, creating an accounts payable voucher in Pending status.
            </p>
            <p className="mt-2">
              Next step: Release payment through Payments &amp; Bank Accounts or schedule a Payment Request.
            </p>
          </>
        ),
        text: "vendor bill invoice payables gst subtotal tds retention grn po finance",
      },
      {
        q: "How do subcontractor work orders and RA bills work (TDS and retention)?",
        a: (
          <>
            <p>
              Preconditions: Subcontractor party registered in Library; active project selected.
            </p>
            <p className="mt-2">
              Navigation: In Financial Control or Subcon, open Work Orders and click "+ New Work Order". To bill, click "+ Create RA Bill".
            </p>
            <p className="mt-2">
              Required fields: Subcontractor Name, Work Order Number, Scope Line Items, Cumulative Measured Quantity, Unit Rate, TDS % (e.g. 1% or 2%), and Retention % (e.g. 5%).
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/finance/bills</code> with <code>invoice_type="subcon"</code>, deducting TDS and retention from gross payable and posting net liabilities.
            </p>
            <p className="mt-2">
              Next step: Track held retention balances in the Subcon Deduction Retention standard report.
            </p>
          </>
        ),
        text: "subcontractor work order ra bill running account tds retention cumulative measurement",
      },
      {
        q: "How do I make a payment or raise a payment request?",
        a: (
          <>
            <p>
              Preconditions: Company Bank Account configured in settings; pending bill or advance requirement.
            </p>
            <p className="mt-2">
              Navigation: Direct payment:{" "}
              <Link className="help-link" href={c(companyId, "/d/finance")}>
                "Payments &amp; Bank Accounts"
              </Link>{" "}
              &rarr; "+ Record Payment". Approval workflow:{" "}
              <Link className="help-link" href={c(companyId, "/d/payment-approval")}>
                "Payment Approval"
              </Link>{" "}
              &rarr; "+ Request Payment".
            </p>
            <p className="mt-2">
              Required fields: Payment Type (Payment Out / In), Party Name, Amount in INR, Payment Method (Bank Transfer, Cheque, Cash, UPI), and Payment Date. Optional fields: Linked Bill Allocations, UTR Reference, and Cost Code.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/finance/payments</code>, updating party balance, bank account balance, and settling linked bills.
            </p>
            <p className="mt-2">
              Next step: Verify transaction entry in Cashbook and Bank Statement report.
            </p>
          </>
        ),
        text: "payment payment request approval bank transfer cheque cash upi settlement voucher",
      },
      {
        q: "What is the cashbook?",
        a: (
          <>
            <p>
              Preconditions: Company bank accounts and transactions recorded.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Financial Control" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/finance")}>
                "Payments &amp; Bank Accounts"
              </Link>{" "}
              &rarr; Select the "Cashbook" sub-tab.
            </p>
            <p className="mt-2">
              Functionality: Displays real-time ledger of all cash in hand and bank balances across all company accounts, showing deposits, withdrawals, vendor disbursements, and client receipts.
            </p>
            <p className="mt-2">
              Save result: Updates dynamically with every payment or bill settlement voucher.
            </p>
            <p className="mt-2">
              Next step: Reconcile opening and closing balances against your physical bank statements.
            </p>
          </>
        ),
        text: "cashbook cash bank balance ledger liquidity transactions reconciliation",
      },
      {
        q: "How do multi-level approvals work?",
        a: (
          <>
            <p>
              Preconditions: Owner or Admin permissions in company Settings.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/settings")}>
                "Settings"
              </Link>{" "}
              and click the "Multi Level Approval" tab.
            </p>
            <p className="mt-2">
              Required fields: Category (Payments, Purchases, Bills), Value Range Thresholds (e.g. Above 50,000 INR), and Approver Role Sequence.
            </p>
            <p className="mt-2">
              Note: approval rules defined here are not enforced on transactions; do not rely on them as an approval control. Transaction authorization routes through the Payment Approval module.
            </p>
            <p className="mt-2">
              Next step: Authorize pending vouchers in Payment Approval before issuing bank disbursements.
            </p>
          </>
        ),
        text: "multi level approval rules threshold escalation authorization workflow settings",
      },
      {
        q: "How do I see a project profit and loss?",
        a: (
          <>
            <p>
              Preconditions: Billed revenue and site expenses logged for the project.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/reports")}>
                "Reports &amp; Analytics"
              </Link>{" "}
              and select "Monthly P&L" or "Project Financial Summary".
            </p>
            <p className="mt-2">
              Required fields: Select Project from the dropdown filter and choose the Date Range.
            </p>
            <p className="mt-2">
              Save result: Aggregates client sale revenue against material purchases, subcontractor costs, labor payroll, and equipment fuel to compute Gross Profit, Net P&L in INR, and Profit Margin %.
            </p>
            <p className="mt-2">
              Next step: Export financial summary as CSV, PDF, or HTML for board reporting.
            </p>
          </>
        ),
        text: "profit and loss pnl financial summary margin revenue expense net margin",
      },
    ],
  },
  {
    id: "workforce-safety",
    title: "Workforce &amp; Safety",
    icon: "worker",
    items: [
      {
        q: "How do I add employees?",
        a: (
          <>
            <p>
              Preconditions: Company HR or Manager permissions.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Workforce &amp; Safety" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/hr")}>
                "Staff &amp; Employees"
              </Link>{" "}
              &rarr; Click "+ Add Employee".
            </p>
            <p className="mt-2">
              Required fields: Employee Full Name, Employee Code (e.g. EMP-001), Designation, Department (Engineering, Operations, Safety, Accounts), and Monthly Basic Salary. Optional fields: HRA, Allowances, Monthly TDS, Bank Details, and Assigned Project.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/hr/employees</code>, registering the staff record in the master employee directory.
            </p>
            <p className="mt-2">
              Next step: Capture daily attendance or enroll face biometric profile for site check-in.
            </p>
          </>
        ),
        text: "add employee staff hr salary basic hra allowances designation department onboarding",
      },
      {
        q: "How does site attendance and geofencing work?",
        a: (
          <>
            <p>
              Preconditions: Employees enrolled; project GPS location configured in project settings.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/d/attendance")}>
                "Attendance &amp; Muster Roll"
              </Link>{" "}
              or{" "}
              <Link className="help-link" href={c(companyId, "/d/face-recognition")}>
                "Face Recognition"
              </Link>
              .
            </p>
            <p className="mt-2">
              Required fields: Employee Selection, Attendance Date, Status (Present, Half Day, Absent, Leave), and GPS Coordinates (automatically captured on mobile/tablet).
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/attendance/punch</code>, verifying if the punch location falls within the allowed project geofence boundary.
            </p>
            <p className="mt-2">
              Next step: Review the Staff Punch Report to verify geofence pass/fail status and daily work hours.
            </p>
          </>
        ),
        text: "attendance geofence face recognition punch in punch out gps location coordinates muster roll",
      },
      {
        q: "How do timesheets and labour records work?",
        a: (
          <>
            <p>
              Preconditions: Active labor contractor or daily wage workers deployed on site.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Workforce &amp; Safety" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/labour")}>
                "Labour Management &amp; Compliance"
              </Link>
              .
            </p>
            <p className="mt-2">
              Required fields: Labor Role (Mason, Carpenter, Helper, Electrician), Date, Workers Present Count, Shift Type, and Hours Worked.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/labour/muster-roll</code>, updating the BOCW and statutory daily deployment records.
            </p>
            <p className="mt-2">
              Next step: Cross-reference labor counts against DPR worker deployment for accurate cost tracking.
            </p>
          </>
        ),
        text: "labour timesheet muster roll contractor daily wage shift bocw compliance",
      },
      {
        q: "How do I run payroll and export payslips?",
        a: (
          <>
            <p>
              Preconditions: Approved monthly attendance records for the target calendar month.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Workforce &amp; Safety" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/payroll-attendance")}>
                "Payroll &amp; Salary Advances"
              </Link>{" "}
              &rarr; Click "Run Payroll".
            </p>
            <p className="mt-2">
              Required fields: Payroll Month (YYYY-MM). Optional fields: Performance Bonus, Overtime Adjustments, Advance Salary Recoveries, and Tax Deductions.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/payroll/run</code>, computing gross pay, PF/ESI contributions, TDS, and net payable salary for all active staff.
            </p>
            <p className="mt-2">
              Next step: Download the bank disbursement CSV file and export individual PDF payslips for distribution.
            </p>
          </>
        ),
        text: "run payroll payslip salary gross net pf esi tds disbursement bank csv export",
      },
      {
        q: "How do leave templates and per-employee balances work?",
        a: (
          <>
            <p>
              Preconditions: Employee directory established.
            </p>
            <p className="mt-2">
              Navigation: In{" "}
              <Link className="help-link" href={c(companyId, "/d/hr")}>
                "Staff &amp; Employees"
              </Link>
              , navigate to the "Leave Management" section.
            </p>
            <p className="mt-2">
              Required fields: Leave Type (Paid Leave, Casual Leave, Sick Leave), Annual Entitlement Days, and Carry-Forward Limit.
            </p>
            <p className="mt-2">
              Save result: Sets up organizational leave policies and automatically tracks employee balances upon leave approval.
            </p>
            <p className="mt-2">
              Next step: View remaining employee leave balances during monthly payroll reconciliation.
            </p>
          </>
        ),
        text: "leave policy casual leave sick leave paid leave entitlement balance hr",
      },
    ],
  },
  {
    id: "plant-equipment",
    title: "Plant &amp; Equipment",
    icon: "hammer_wrench",
    items: [
      {
        q: "How do I register and track equipment?",
        a: (
          <>
            <p>
              Preconditions: Equipment management permissions.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Plant &amp; Equipment" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/equipment")}>
                "Equipment Inventory"
              </Link>{" "}
              &rarr; Click "+ Add Equipment".
            </p>
            <p className="mt-2">
              Required fields: Equipment Name (e.g. Tower Crane 50T), Asset Code, Category (Heavy Machinery, Lifting, Earthmoving, Concrete), and Ownership Type (Owned, Rented, Leased). Optional fields: Hourly Rental Rate, Purchase Cost, and Insurance Validity.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/equipment/</code>, saving the asset in Available status.
            </p>
            <p className="mt-2">
              Next step: Deploy the machinery to an active construction site.
            </p>
          </>
        ),
        text: "equipment asset code machinery crane excavator owned rented leased inventory",
      },
      {
        q: "How do site deployments and log sheets work?",
        a: (
          <>
            <p>
              Preconditions: Equipment asset available in inventory; target project active.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/d/equipment")}>
                "Deployments &amp; Log Sheets"
              </Link>{" "}
              and click "Deploy Equipment".
            </p>
            <p className="mt-2">
              Required fields: Equipment Asset, Destination Project, Deployment Start Date, and Initial Meter Reading. Optional fields: Assigned Operator and Remarks.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/equipment/{'{id}'}/deploy</code>, updating asset status to Deployed and opening a project log sheet.
            </p>
            <p className="mt-2">
              Next step: Log daily running hours to track utilization and hourly operating costs.
            </p>
          </>
        ),
        text: "equipment deployment log sheet running hours operator meter reading site mobilization",
      },
      {
        q: "How do I track fuel logs and efficiency?",
        a: (
          <>
            <p>
              Preconditions: Equipment deployed on site.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Plant &amp; Equipment" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/equipment")}>
                "Fuel Logs &amp; Efficiency"
              </Link>{" "}
              &rarr; Click "+ Log Fuel".
            </p>
            <p className="mt-2">
              Required fields: Equipment Asset, Project, Fuel Liters Dispensed, Cost per Liter in INR, and Log Date. Optional fields: Hour Meter Reading and Vendor Dispenser Slip.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/equipment/fuel</code>, computing machine efficiency (liters per hour) and booking fuel expense into project ledger.
            </p>
            <p className="mt-2">
              Next step: Analyze fuel consumption metrics in the Fuel Efficiency standard report.
            </p>
          </>
        ),
        text: "fuel log diesel consumption liters cost per liter efficiency hour meter expense",
      },
      {
        q: "How do I manage production batches and recipes?",
        a: (
          <>
            <p>
              Preconditions: Materials catalog populated in Library; batching or precast operations active.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Plant &amp; Equipment" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/production")}>
                "Production &amp; Batching"
              </Link>
              .
            </p>
            <p className="mt-2">
              Required fields: Recipe Code, Mix Type (e.g. Concrete M30), Target Output Volume, and Component Materials (Cement, Sand, Aggregates, Admixtures) with planned quantities.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/production/recipes</code> and <code>POST /apis/v3/production/batches</code>, deducting consumed materials from inventory and crediting finished batch output.
            </p>
            <p className="mt-2">
              Next step: Check the Production Material report for actual vs planned mix variance.
            </p>
          </>
        ),
        text: "production batching recipe mix concrete batch actual planned consumption precast",
      },
    ],
  },
  {
    id: "crm-business-dev",
    title: "CRM &amp; Business Development",
    icon: "megaphone",
    items: [
      {
        q: "How do I capture leads and manage the sales pipeline?",
        a: (
          <>
            <p>
              Preconditions: CRM module access.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "CRM &amp; Business Development" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/crm")}>
                "Leads &amp; Pipeline"
              </Link>{" "}
              &rarr; Click "+ New Lead".
            </p>
            <p className="mt-2">
              Required fields: Lead Name, Contact Person, Phone Number, and Lead Stage (New Lead, Follow-Up, Proposal Stage, Converted, Won, Lost). Optional fields: Client Company, Email, Estimated Budget, Source, and Address.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/crm/leads</code>, creating the lead record on the interactive visual pipeline board.
            </p>
            <p className="mt-2">
              Next step: Prepare an estimate and create a quotation for the prospect.
            </p>
          </>
        ),
        text: "crm lead sales pipeline contact phone stage won lost proposal follow up estimation",
      },
      {
        q: "How do I create client quotations and cost estimates?",
        a: (
          <>
            <p>
              Preconditions: Existing Lead record in CRM.
            </p>
            <p className="mt-2">
              Navigation: In{" "}
              <Link className="help-link" href={c(companyId, "/d/crm")}>
                "CRM"
              </Link>
              , choose the "Quotations" tab and click "+ Create Quotation".
            </p>
            <p className="mt-2">
              Required fields: Lead Selection, Quotation Subject, Line Items (Item Description, Quantity, Unit, Cost Price, and Selling Price). Optional fields: Quotation Number, Tax %, Discount, and Payment Milestones.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/crm/quotations</code>, calculating gross margins and saving the proposal in Sent status.
            </p>
            <p className="mt-2">
              Next step: When the client accepts, convert the quotation into an active Project or Sale Invoice.
            </p>
          </>
        ),
        text: "quotation estimate proposal client pricing cost price selling price markup crm",
      },
      {
        q: "How does the Rate Card Library work?",
        a: (
          <>
            <p>
              Preconditions: Master library access.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/d/library")}>
                "Library"
              </Link>{" "}
              and select the "Rate Cards" tab.
            </p>
            <p className="mt-2">
              Required fields: Item Name (e.g. RCC M25 Casting), Item Code, Unit of Measurement, Base Unit Cost, Markup % (or Flat Markup), and Selling Price. Optional fields: HSN / SAC Code and Cost Code Link.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/library/rates</code>, creating standardized pricing presets used across quotations and work orders.
            </p>
            <p className="mt-2">
              Next step: Quickly pull rate card presets into your CRM proposals with one click.
            </p>
          </>
        ),
        text: "rate card library standard unit cost selling price markup hsn sac pricing preset",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations &amp; API",
    icon: "plug",
    items: [
      {
        q: "How do I connect Tally Prime?",
        a: (
          <>
            <p>
              Preconditions: Tally Prime installation on your accounting machine; completed financial transactions in SiteFlow.
            </p>
            <p className="mt-2">
              Navigation: Go to{" "}
              <Link className="help-link" href="/integrations/tally">
                "/integrations/tally"
              </Link>{" "}
              or export XML vouchers directly from Financial Control.
            </p>
            <p className="mt-2">
              Configuration: Map your SiteFlow party ledger names and cost centers to match your Tally chart of accounts, then export the date-range XML stream.
            </p>
            <p className="mt-2">
              Save result: Generates standard Tally-compliant XML vouchers for Purchases, Sales, and Payments ready for Import Data in Tally Prime.
            </p>
            <p className="mt-2">
              Next step: Verify imported vouchers in your Tally Daybook without manual double entry.
            </p>
          </>
        ),
        text: "tally prime integration xml voucher export import accounting daybook chart of accounts",
      },
      {
        q: "How do I connect Zoho Books?",
        a: (
          <>
            <p>
              Preconditions: Active Zoho Books account with Organization ID and API credentials.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href="/integrations">
                "/integrations"
              </Link>{" "}
              and select "Zoho Books".
            </p>
            <p className="mt-2">
              Configuration: Enter your Zoho Organization ID and authenticate via OAuth 2.0 to link company accounts.
            </p>
            <p className="mt-2">
              Save result: Synchronizes approved vendor bills, sale invoices, and payment receipts directly to Zoho Books.
            </p>
            <p className="mt-2">
              Next step: View real-time synchronization logs in the integration status dashboard.
            </p>
          </>
        ),
        text: "zoho books integration oauth api sync bills invoices accounting sync",
      },
      {
        q: "How do Google Drive backup and Google Sheets export work?",
        a: (
          <>
            <p>
              Preconditions: Google Workspace or Google account with Drive API access.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href="/integrations">
                "/integrations"
              </Link>{" "}
              and connect Google Drive or Google Sheets.
            </p>
            <p className="mt-2">
              Configuration: Authorize access to store PDF backups of bills, purchase orders, and monthly payroll spreadsheets automatically.
            </p>
            <p className="mt-2">
              Save result: Automatically archives document copies to your designated Google Drive folder upon generation.
            </p>
            <p className="mt-2">
              Next step: Access archived document links directly from your cloud storage.
            </p>
          </>
        ),
        text: "google drive sheets backup export cloud archive storage pdf sync",
      },
      {
        q: "How do I access BI data feeds via API Key?",
        a: (
          <>
            <p>
              Preconditions: Company Admin or Owner permissions.
            </p>
            <p className="mt-2">
              Navigation: Open{" "}
              <Link className="help-link" href={c(companyId, "/settings")}>
                "Settings"
              </Link>{" "}
              and navigate to the "API &amp; Webhooks" tab.
            </p>
            <p className="mt-2">
              Configuration: Click "Generate New API Key" and copy the token. Include it as a Bearer token in your HTTP Authorization header.
            </p>
            <p className="mt-2">
              Save result: Grants secure read access to REST endpoints and live CSV / JSON data feeds for Power BI, Tableau, or custom dashboards.
            </p>
            <p className="mt-2">
              Next step: Connect your Business Intelligence tool to our live reporting endpoints.
            </p>
          </>
        ),
        text: "bi feed api key token rest power bi tableau json csv bearer authorization analytics",
      },
    ],
  },
  {
    id: "quality-safety",
    title: "Quality &amp; Safety Audits",
    icon: "shield",
    items: [
      {
        q: "How do I perform quality inspections and manage NCRs?",
        a: (
          <>
            <p>
              Preconditions: Quality checklist templates configured; active project selected.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Workforce &amp; Safety" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/quality")}>
                "Quality Inspections &amp; NCRs"
              </Link>{" "}
              &rarr; Click "+ New Inspection".
            </p>
            <p className="mt-2">
              Required fields: Checklist Template, Project, Inspection Date, and Pass/Fail markings per checkpoint item. Optional fields: Photo Evidence, Non-Conformance Report (NCR) Description, Root Cause, and Target Rectification Date.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/quality/inspections</code>, creating the inspection audit and automatically raising an NCR issue for failed checkpoints.
            </p>
            <p className="mt-2">
              Next step: Assign rectification actions to the contractor and track NCR resolution.
            </p>
          </>
        ),
        text: "quality inspection checklist pass fail ncr non conformance defect snag rectification audit",
      },
      {
        q: "How do I report safety incidents and issue work permits?",
        a: (
          <>
            <p>
              Preconditions: Active construction site; safety manager credentials.
            </p>
            <p className="mt-2">
              Navigation: Sidebar &rarr; "Workforce &amp; Safety" &rarr;{" "}
              <Link className="help-link" href={c(companyId, "/d/safety")}>
                "Safety Audits &amp; Incidents"
              </Link>{" "}
              &rarr; Click "+ Report Incident" or "+ Issue Permit".
            </p>
            <p className="mt-2">
              Required fields: Incident Title, Severity Level (Near Miss, Minor, Major, Critical), Incident Date &amp; Time, and Site Location. Optional fields: Injured Personnel, Root Cause Analysis, and Corrective Action Plan.
            </p>
            <p className="mt-2">
              Save result: Calls <code>POST /apis/v3/safety/incidents</code>, alerting site safety leadership and updating safe work hours metrics.
            </p>
            <p className="mt-2">
              Next step: Conduct safety toolbox talks and close out incident action items.
            </p>
          </>
        ),
        text: "safety incident observation permit to work near miss hazard severity root cause audit",
      },
    ],
  },
];
