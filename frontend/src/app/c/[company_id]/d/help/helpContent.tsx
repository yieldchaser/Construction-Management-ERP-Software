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
  { label: "Procurement", href: c(companyId, "/d/procurement") },
  { label: "Three Way Match", href: c(companyId, "/d/three-way") },
  { label: "Billing", href: c(companyId, "/d/billing") },
  { label: "Subcon", href: c(companyId, "/d/subcon") },
  { label: "HR", href: c(companyId, "/d/hr") },
  { label: "Attendance", href: c(companyId, "/d/attendance") },
  { label: "Face Recognition", href: c(companyId, "/d/face-recognition") },
  { label: "Labour", href: c(companyId, "/d/labour") },
  { label: "DPR", href: c(companyId, "/d/dpr") },
  { label: "Quality", href: c(companyId, "/d/quality") },
  { label: "Safety", href: c(companyId, "/d/safety") },
  { label: "Equipment", href: c(companyId, "/d/equipment") },
  { label: "Production", href: c(companyId, "/d/production") },
  { label: "Cost Codes", href: c(companyId, "/cost-codes") },
  { label: "Analytics", href: c(companyId, "/analytics") },
  { label: "Budget", href: c(companyId, "/d/budget") },
  { label: "Custom Fields", href: c(companyId, "/d/custom-fields") },
  { label: "Depreciation", href: c(companyId, "/d/depreciation") },
  { label: "Drawings", href: c(companyId, "/d/drawings") },
  { label: "Statutory", href: c(companyId, "/d/statutory") },
  { label: "Towers", href: c(companyId, "/d/towers") },
  { label: "Wastage", href: c(companyId, "/d/wastage") },
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
              A brand-new account that belongs to no company is sent to the
              create-company screen after login. Enter your company name, legal
              business name, GSTIN, city, billing address and phone. The session is
              then re-issued and scoped to that company, and you become its Owner.
            </p>
            <p className="mt-2">
              Open it from{" "}
              <Link className="help-link" href="/onboarding">
                /onboarding
              </Link>
              .
            </p>
          </>
        ),
        text: "create company onboarding owner sign up gstin legal name",
      },
      {
        q: "How do I create a project?",
        a: (
          <>
            <p>
              Go to the Projects module and choose New Project. Fill in the project
              name, code, client, location and dates. The project then appears in the
              Pinned Projects list on the sidebar, where you can switch your active
              project.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/projects")}>
                Projects
              </Link>
              .
            </p>
          </>
        ),
        text: "create project new project pinned projects client location",
      },
      {
        q: "How do I add team members?",
        a: (
          <>
            <p>
              Open Settings and go to the Team tab. Add a member by email or phone,
              choose the project they belong to, and assign a role. They receive an
              invite and appear in the team list once they accept.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/settings")}>
                Settings
              </Link>{" "}
              then Team.
            </p>
          </>
        ),
        text: "add team member invite email phone role settings team",
      },
      {
        q: "How do roles and permissions work?",
        a: (
          <>
            <p>
              SiteFlow uses flat module:action permissions (for example{" "}
              <code>finance:view</code>, <code>projects:manage</code>,{" "}
              <code>settings:manage</code>). Standard roles include Owner, Admin,
              Manager, Member and Viewer, and you can create custom roles. A member
              only sees a module once they hold its view permission.
            </p>
            <p className="mt-2">
              Manage them under Settings, Roles &amp; Access, then Edit Permissions
              on a role.
            </p>
          </>
        ),
        text: "roles permissions module action owner admin manager viewer custom role rbac",
      },
    ],
  },
  {
    id: "projects",
    title: "Projects",
    icon: "site",
    items: [
      {
        q: "How do I import a BOQ?",
        a: (
          <>
            <p>
              Open a project and go to the BOQ module. Upload your Bill of Quantities
              as Excel or CSV, map the columns (description, unit, quantity, rate),
              and import. The BOQ becomes the base layer that budgets and billing
              link to.
            </p>
            <p className="mt-2">
              Path: open a project, then BOQ (project-level BOQ page).
            </p>
          </>
        ),
        text: "boq import bill of quantities excel csv budget",
      },
      {
        q: "How do I set up a budget and cost codes?",
        a: (
          <>
            <p>
              Cost codes are managed at company level. Budgets are set per project and
              can be BOQ-linked: enter your estimated amount for each cost code so
              that site activity updates budget and billing in real time.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/cost-codes")}>
                Cost Codes
              </Link>{" "}
              (company) and the project Budget / Budgeting BOQ pages.
            </p>
          </>
        ),
        text: "budget cost codes estimate boq linked project finance",
      },
      {
        q: "How do I plan tasks and view the Gantt chart?",
        a: (
          <>
            <p>
              Use the Planning module to create tasks, set dependencies and schedule
              them. The Gantt view shows the timeline and lets you drag tasks to
              reschedule. Planning exists at both company and project level.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/planning")}>
                Planning
              </Link>{" "}
              and{" "}
              <Link className="help-link" href={c(companyId, "/d/planning/gantt")}>
                Planning Gantt
              </Link>
              .
            </p>
          </>
        ),
        text: "planning tasks gantt schedule dependencies timeline",
      },
      {
        q: "What are milestones, baseline and lookahead?",
        a: (
          <>
            <p>
              Milestones mark key dates on the schedule. You can set a baseline of
              your approved plan to compare planned versus actual progress. The Team
              Schedule (lookahead) view shows upcoming work across the team.
            </p>
            <p className="mt-2">
              Paths: Planning, and{" "}
              <Link className="help-link" href={c(companyId, "/d/team-action")}>
                Team Schedule
              </Link>
              .
            </p>
          </>
        ),
        text: "milestone baseline lookahead team schedule planned actual",
      },
      {
        q: "How do I record a Daily Progress Report (DPR)?",
        a: (
          <>
            <p>
              Open the DPR module for the project. Capture task progress, site photos,
              material requests and the attendance summary, then submit or download
              the report for the day.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/dpr")}>
                DPR
              </Link>{" "}
              (company) and the project-level DPR page.
            </p>
          </>
        ),
        text: "dpr daily progress report site photos task progress attendance",
      },
    ],
  },
  {
    id: "procurement",
    title: "Procurement & Inventory",
    icon: "package",
    items: [
      {
        q: "How does indent to PO to GRN to three-way match work?",
        a: (
          <>
            <p>
              Raise a material indent, convert it into a Purchase Order (PO) to a
              vendor, record Goods Receipt Notes (GRN) when materials arrive, then run
              a three-way match between PO, GRN and the vendor bill to confirm what
              was ordered, received and billed.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/procurement")}>
                Procurement
              </Link>{" "}
              and{" "}
              <Link className="help-link" href={c(companyId, "/d/three-way")}>
                Three Way Match
              </Link>{" "}
              (also available at project level).
            </p>
          </>
        ),
        text: "indent po purchase order grn goods receipt three way match vendor bill",
      },
      {
        q: "How do I create a purchase order?",
        a: (
          <>
            <p>
              In Procurement, choose New PO. Select the vendor, add line items with
              quantities and rates, set payment and delivery terms, and issue the PO.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/d/procurement")}>
                Procurement
              </Link>
              .
            </p>
          </>
        ),
        text: "purchase order po vendor items rates terms procurement",
      },
      {
        q: "How do I run a Request for Quotation (RFQ)?",
        a: (
          <>
            <p>
              Use the RFQ screen in Procurement to send a request for quotation to one
              or more vendors and compare their responses before raising a PO.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/d/procurement/rfq")}>
                Procurement RFQ
              </Link>
              .
            </p>
          </>
        ),
        text: "rfq request for quotation vendor compare procurement",
      },
      {
        q: "How do I manage inventory and warehouse?",
        a: (
          <>
            <p>
              Track materials received into the warehouse, move stock between sites
              with material transfers, and handle returns and debit notes. Inventory
              is visible at both company and project level.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/materials")}>
                Materials
              </Link>{" "}
              and the project Material page.
            </p>
          </>
        ),
        text: "inventory warehouse material transfer return debit note stock",
      },
    ],
  },
  {
    id: "billing-finance",
    title: "Billing & Finance",
    icon: "trending_up",
    items: [
      {
        q: "How do I record a vendor bill?",
        a: (
          <>
            <p>
              In Billing (or Finance), add a vendor bill, link it to the matching PO
              and GRN where applicable, and post it. The bill then flows into your
              payables and reports.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/billing")}>
                Billing
              </Link>{" "}
              and{" "}
              <Link className="help-link" href={c(companyId, "/d/finance")}>
                Finance
              </Link>
              .
            </p>
          </>
        ),
        text: "vendor bill payable billing finance po grn",
      },
      {
        q: "How do subcontractor work orders and RA bills work (TDS and retention)?",
        a: (
          <>
            <p>
              Create a subcontractor work order, then raise Running Account (RA) bills
              against measured work. SiteFlow handles Tax Deducted at Source (TDS)
              deduction and holds back retention as configured, and supports work
              order amendments.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/subcon/work-orders")}>
                Subcon Work Orders
              </Link>{" "}
              and the project Subcon page.
            </p>
          </>
        ),
        text: "subcontractor work order ra bill running account tds retention amendment",
      },
      {
        q: "How do I make a payment or raise a payment request?",
        a: (
          <>
            <p>
              Record payments from Finance, or raise a payment request that routes
              through your approval chain before it is released.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/finance")}>
                Finance
              </Link>{" "}
              and{" "}
              <Link className="help-link" href={c(companyId, "/d/payment-approval")}>
                Payment Approval
              </Link>
              .
            </p>
          </>
        ),
        text: "payment request payment approval finance release",
      },
      {
        q: "What is the cashbook?",
        a: (
          <>
            <p>
              The cashbook shows your cash and bank account balances and the
              transactions against them, so you can see company liquidity at a glance.
            </p>
            <p className="mt-2">
              Path: Finance, Cashbook section.
            </p>
          </>
        ),
        text: "cashbook cash bank balance transactions finance",
      },
      {
        q: "How do multi-level approvals work?",
        a: (
          <>
            <p>
              In Settings, Multi Level Approval, define approval rule blocks per
              category (for example payments or purchases) as a flat chain or
              amount-range blocks. Note: approval rules defined here are not
              enforced on transactions; do not rely on them as an approval
              control.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/settings")}>
                Settings
              </Link>{" "}
              then Multi Level Approval.
            </p>
          </>
        ),
        text: "multi level approval rules chain amount range settings",
      },
      {
        q: "How do I see a project profit and loss?",
        a: (
          <>
            <p>
              Open Reports and pick the project P&amp;L / financial reports to see
              income, cost and margin for a project.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/reports")}>
                Reports
              </Link>{" "}
              and the project Reports page.
            </p>
          </>
        ),
        text: "profit loss project pnl reports finance margin",
      },
    ],
  },
  {
    id: "hr-payroll",
    title: "HR & Payroll",
    icon: "calendar",
    items: [
      {
        q: "How do I add employees?",
        a: (
          <>
            <p>
              Use the HR module to add employees, assign them to projects and capture
              their salary and bank details. HR is available at company and project
              level.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/hr")}>
                HR
              </Link>{" "}
              and the project HR page.
            </p>
          </>
        ),
        text: "employee hr salary bank details project",
      },
      {
        q: "How does site attendance and geofencing work?",
        a: (
          <>
            <p>
              Mark site attendance for workers and staff. Attendance can be captured
              with location (geofence) checks and optional face recognition. The
              attendance module is available at company and project level.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/attendance")}>
                Attendance
              </Link>
              ,{" "}
              <Link className="help-link" href={c(companyId, "/d/face-recognition")}>
                Face Recognition
              </Link>{" "}
              and the project Attendance page.
            </p>
          </>
        ),
        text: "attendance geofence face recognition site workers staff location",
      },
      {
        q: "How do timesheets and labour records work?",
        a: (
          <>
            <p>
              Record labour deployment and timesheets per role and shift. This feeds
              productivity and payroll calculations.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/labour")}>
                Labour
              </Link>{" "}
              and the project Labour page.
            </p>
          </>
        ),
        text: "timesheet labour role shift productivity payroll",
      },
      {
        q: "How do I run payroll and export payslips?",
        a: (
          <>
            <p>
              In Payroll &amp; Attendance, set up a salary template, run the payroll
              for a period, generate payslips and export them as CSV. The run uses
              attendance, overtime, allowances and deductions captured earlier.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link
                className="help-link"
                href={c(companyId, "/d/payroll-attendance")}
              >
                Payroll &amp; Attendance
              </Link>
              .
            </p>
          </>
        ),
        text: "payroll run salary template payslip csv export attendance overtime allowance",
      },
      {
        q: "How do leave templates and per-employee balances work?",
        a: (
          <>
            <p>
              In HR, define leave templates (leave types and entitlements) and track
              each employee's leave balance and usage.
            </p>
            <p className="mt-2">
              Path: HR module, leave section.
            </p>
          </>
        ),
        text: "leave template balance employee hr entitlement",
      },
    ],
  },
  {
    id: "subcontractors",
    title: "Subcontractors",
    icon: "worker",
    items: [
      {
        q: "How do I register a subcontractor?",
        a: (
          <>
            <p>
              In the Subcon module, add a subcontractor as a party with their contact
              and bank details, then associate them with projects.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/d/subcon")}>
                Subcon
              </Link>
              .
            </p>
          </>
        ),
        text: "register subcontractor party bank details subcon",
      },
      {
        q: "How do I create work orders and track subcontractor attendance?",
        a: (
          <>
            <p>
              Raise a subcontractor work order, amend it as needed, and capture
              subcontractor attendance against the project. Attendance feeds
              measurement and RA billing.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/subcon/work-orders")}>
                Subcon Work Orders
              </Link>{" "}
              and the project Subcon / Attendance pages.
            </p>
          </>
        ),
        text: "subcontractor work order amend attendance measurement ra billing",
      },
      {
        q: "How do subcontractor scorecards work?",
        a: (
          <>
            <p>
              Use Scorecards to rate and track subcontractor performance (quality,
              timeliness, compliance) so you can compare vendors over time.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link
                className="help-link"
                href={c(companyId, "/d/subcon/scorecards")}
              >
                Subcon Scorecards
              </Link>
              .
            </p>
          </>
        ),
        text: "subcontractor scorecard performance quality vendor rating",
      },
    ],
  },
  {
    id: "integrations",
    title: "Integrations",
    icon: "plug",
    items: [
      {
        q: "How do I connect Tally?",
        a: (
          <>
            <p>
              Export voucher XML from SiteFlow Finance and import it into Tally Prime
              to post your books without re-keying entries. A step-by-step guide is
              available.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href="/integrations/tally">
                Integrations Tally
              </Link>
              .
            </p>
          </>
        ),
        text: "tally voucher xml export import tally prime finance books",
      },
      {
        q: "How do I connect Zoho Books?",
        a: (
          <>
            <p>
              Connect your Zoho Books organisation and push vendor bills and other
              transactions from SiteFlow so your accounting stays in sync.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href="/integrations">
                Integrations
              </Link>
              .
            </p>
          </>
        ),
        text: "zoho books connect push bill sync accounting",
      },
      {
        q: "How do Google Drive backup and Google Sheets payroll export work?",
        a: (
          <>
            <p>
              Configure Google Drive backup to store documents and exports, and use
              the Google Sheets payroll export to push payslip and payroll data into a
              sheet.
            </p>
            <p className="mt-2">
              Configure under Settings / Integrations.
            </p>
          </>
        ),
        text: "google drive backup google sheets payroll export payslip",
      },
      {
        q: "How do I pull BI feeds (CSV / JSON) with an API key?",
        a: (
          <>
            <p>
              Generate an API key and use the BI feeds to pull your data as CSV or
              JSON for your own dashboards and warehouses.
            </p>
            <p className="mt-2">
              Manage the API key under Settings / Integrations.
            </p>
          </>
        ),
        text: "bi feed csv json api key dashboard warehouse",
      },
    ],
  },
  {
    id: "operations",
    title: "Quality, Safety, Equipment & Production",
    icon: "hammer_wrench",
    items: [
      {
        q: "How do I log quality checks?",
        a: (
          <>
            <p>
              Use the Quality module to record inspections, snags and checklists so
              defects are tracked to closure. Available at company and project level.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/d/quality")}>
                Quality
              </Link>
              .
            </p>
          </>
        ),
        text: "quality inspection snag checklist defect",
      },
      {
        q: "How do I manage safety?",
        a: (
          <>
            <p>
              The Safety module lets you log incidents, observations and permits so
              site safety is documented and actionable.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/d/safety")}>
                Safety
              </Link>
              .
            </p>
          </>
        ),
        text: "safety incident observation permit",
      },
      {
        q: "How do I track equipment?",
        a: (
          <>
            <p>
              Use the Equipment module to record assets, allocation and
              running/idle hours, and handle depreciation.
            </p>
            <p className="mt-2">
              Path:{" "}
              <Link className="help-link" href={c(companyId, "/d/equipment")}>
                Equipment
              </Link>
              .
            </p>
          </>
        ),
        text: "equipment asset allocation depreciation hours",
      },
      {
        q: "How do I manage production and services?",
        a: (
          <>
            <p>
              The Production module tracks production/output, and Services tracks
              service-delivery workflows, both linked to the project.
            </p>
            <p className="mt-2">
              Paths:{" "}
              <Link className="help-link" href={c(companyId, "/d/production")}>
                Production
              </Link>{" "}
              and{" "}
              <Link className="help-link" href={c(companyId, "/d/services")}>
                Services
              </Link>
              .
            </p>
          </>
        ),
        text: "production services output workflow",
      },
    ],
  },
];
