"use client";

import React from "react";
import Link from "next/link";
import { type IconName } from "@/components/marketing/Icon";

export interface FaqItem {
  q: string;
  a: React.ReactNode;
  text: string;
  sources: string[];
}

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  items: FaqItem[];
}

export type FaqCategory = HelpCategory;

export interface ModuleLink {
  label: string;
  href: string;
}

export function HELP_MODULE_LINKS(companyId: string): ModuleLink[] {
  const p = (path: string) => `/c/${companyId}${path.startsWith("/") ? path : `/${path}`}`;
  return [
    { label: "Dashboard", href: p("/dashboard") },
    { label: "Projects", href: p("/projects") },
    { label: "Planning", href: p("/d/planning") },
    { label: "Drawings", href: p("/d/drawings") },
    { label: "DPR", href: p("/d/dpr") },
    { label: "Quality & NCR", href: p("/d/quality") },
    { label: "Safety", href: p("/d/safety") },
    { label: "Labour", href: p("/d/labour") },
    { label: "Attendance", href: p("/d/attendance") },
    { label: "Equipment", href: p("/d/equipment") },
    { label: "Production", href: p("/d/production") },
    { label: "Procurement", href: p("/d/procurement") },
    { label: "Three-Way Match", href: p("/d/three-way") },
    { label: "Materials & Stock", href: p("/materials") },
    { label: "Subcontractors", href: p("/d/subcon") },
    { label: "Cost Codes", href: p("/cost-codes") },
    { label: "Finance", href: p("/d/finance") },
    { label: "Billing", href: p("/d/billing") },
    { label: "Payroll", href: p("/d/payroll-attendance") },
    { label: "HR & Staff", href: p("/d/hr") },
    { label: "Budget", href: p("/d/budget") },
    { label: "CRM & Leads", href: p("/d/crm") },
    { label: "Library", href: p("/d/library") },
    { label: "Analytics", href: p("/analytics") },
    { label: "Reports", href: p("/reports") },
    { label: "Settings", href: p("/settings") },
  ];
}

function c(companyId: string, path: string): string {
  return `/c/${companyId}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getHelpCategories(companyId: string): HelpCategory[] {
  return [
    {
      id: "getting-started",
      title: "Getting Started",
      description: "Company setup, first project, user access, and role permissions.",
      icon: "rocket",
      items: [
        {
          q: "How do I create a company?",
          a: (
            <>
              <p>
                Preconditions: Sign up with a verified phone number or email.
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
                Save result: Submitting calls <code>POST /apis/v3/auth/onboarding/create-company</code>, creates the company record in the companies table, and assigns your account the Owner role.
              </p>
              <p className="mt-2">
                Next step: Create your first construction project from the Projects directory.
              </p>
            </>
          ),
          text: "create company onboarding owner sign up gstin legal name phone city segment builder contractor setup workspace",
          sources: [
            "frontend/src/app/onboarding/page.tsx:1",
            "POST /apis/v3/auth/onboarding/create-company",
          ],
        },
        {
          q: "How do I create a project?",
          a: (
            <>
              <p>
                Preconditions: You must hold the projects:manage or Owner role in the company.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/projects")}>
                  "Projects"
                </Link>
                , and click the "+ New Project" button in the header.
              </p>
              <p className="mt-2">
                Required fields: Project Name, Project Code, State (for GST place of supply), and Location (latitude,longitude coordinates). Optional fields: Client Name, Address, City, Planned Start Date, Planned End Date, and Estimated Value.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/projects/</code>, inserts the record in the projects table with status "Ongoing", and sets up the project workspace.
              </p>
              <p className="mt-2">
                Next step: Switch your active workspace project in the top bar to begin scheduling tasks and uploading drawings.
              </p>
            </>
          ),
          text: "create project new code location lat long state place of supply ongoing site start date",
          sources: [
            "frontend/src/components/Sidebar.tsx:105",
            "frontend/src/app/c/[company_id]/projects/page.tsx:1",
            "POST /apis/v3/projects/",
          ],
        },
        {
          q: "How do I add team members?",
          a: (
            <>
              <p>
                Preconditions: You must hold the team:manage permission or the Owner role.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/settings")}>
                  "Settings"
                </Link>
                , and choose the "Team Members" tab.
              </p>
              <p className="mt-2">
                Required fields: Full Name, Mobile Number or Email, and Assigned Role. Optional fields: Designation and Project Assignments.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/auth/team/invite</code>, creates a membership record in company_team, and dispatches an invitation link.
              </p>
              <p className="mt-2">
                Next step: The invited member signs in to access assigned projects under their granted permission scope.
              </p>
            </>
          ),
          text: "add team members invite user staff assign role permissions mobile email company team",
          sources: [
            "frontend/src/components/Sidebar.tsx:378",
            "frontend/src/app/c/[company_id]/settings/page.tsx:1",
            "POST /apis/v3/auth/team/invite",
          ],
        },
        {
          q: "How do roles and permissions work?",
          a: (
            <>
              <p>
                Preconditions: Owner or settings:manage role required to configure role definitions.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/settings")}>
                  "Settings"
                </Link>
                , and choose the "Roles & Permissions" tab.
              </p>
              <p className="mt-2">
                Required fields: Role Name. Optional fields: Description and Granular Permission Checkboxes across modules.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/settings/roles/{"{companyId}"}</code>, storing the role policy. Permission updates apply fail-closed enforcement across all API routes.
              </p>
              <p className="mt-2">
                Next step: Assign the configured role to team members under the Team Members tab.
              </p>
            </>
          ),
          text: "roles permissions rbac access control manage settings fail closed grant revoke custom roles",
          sources: [
            "frontend/src/components/Sidebar.tsx:378",
            "frontend/src/app/c/[company_id]/settings/page.tsx:1",
            "POST /apis/v3/settings/roles/{company_id}",
          ],
        },
      ],
    },
    {
      id: "planning-dpr",
      title: "Project Planning & DPR",
      description: "BOQ imports, task scheduling, Gantt milestones, and daily progress logs.",
      icon: "calendar",
      items: [
        {
          q: "How do I import a BOQ?",
          a: (
            <>
              <p>
                Preconditions: You must have an active project selected and hold the budgeting:edit permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/budget")}>
                  "Budget"
                </Link>
                , and click the "Import BOQ" button.
              </p>
              <p className="mt-2">
                Required fields: An Excel spreadsheet (.xlsx or .xlsm) with columns: Description/Item Name, Qty, Unit, and Rate (or Supply Rate and Installation Rate). Optional fields: Section Name and Cost Code.
              </p>
              <p className="mt-2">
                Save result: Uploading calls <code>POST /apis/v3/budgeting/boq/import</code>, parses all rows, validates cost code codes against your library, and creates line items in boq_items.
              </p>
              <p className="mt-2">
                Next step: Link BOQ items to tasks in the Planning Gantt chart or track physical execution against them.
              </p>
            </>
          ),
          text: "import boq bill of quantities excel xlsx rate qty unit supply installation cost code items upload",
          sources: [
            "frontend/src/components/Sidebar.tsx:308",
            "frontend/src/app/c/[company_id]/d/budget/page.tsx:1",
            "POST /apis/v3/budgeting/boq/import",
          ],
        },
        {
          q: "How do I set up a budget and cost codes?",
          a: (
            <>
              <p>
                Preconditions: Active project selected; finance:edit or budgeting:edit permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/budget")}>
                  "Budget"
                </Link>
                , and click the "Allocate Budget" button.
              </p>
              <p className="mt-2">
                Required fields: Project ID. Optional category budgets: Material Budget, Labour Budget, Subcontractor Budget, and Equipment Budget.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/budgeting/allocation</code>, saving head allocations to the project_budgets table.
              </p>
              <p className="mt-2">
                Next step: Track real-time committed versus actual variance on the Analytics and Cost Code Expense Analysis reports.
              </p>
            </>
          ),
          text: "budget cost codes allocate head material labour subcon equipment variance committed actual",
          sources: [
            "frontend/src/components/Sidebar.tsx:308",
            "frontend/src/app/c/[company_id]/d/budget/page.tsx:1",
            "POST /apis/v3/budgeting/allocation",
          ],
        },
        {
          q: "How do I plan tasks and view the Gantt chart?",
          a: (
            <>
              <p>
                Preconditions: Active project selected and planning:view permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Projects & Planning", and select{" "}
                <Link className="help-link" href={c(companyId, "/d/planning")}>
                  "Planning"
                </Link>
                .
              </p>
              <p className="mt-2">
                Required fields: Task Name, Start Date, and Duration (in days). Optional fields: Parent Task (for WBS hierarchy), Priority, Assigned To user, and BOQ Item link.
              </p>
              <p className="mt-2">
                Save result: Clicking "+ Add Task" calls <code>POST /apis/v3/planning/tasks</code>, inserting the schedule task and rendering its interactive bar on the Gantt timeline.
              </p>
              <p className="mt-2">
                Next step: Link dependencies between tasks to automatically compute the Critical Path (CPM) and total float.
              </p>
            </>
          ),
          text: "planning tasks gantt chart schedule duration start date wbs cpm critical path dependencies",
          sources: [
            "frontend/src/components/Sidebar.tsx:113",
            "frontend/src/app/c/[company_id]/d/planning/page.tsx:1",
            "POST /apis/v3/planning/tasks",
          ],
        },
        {
          q: "What are milestones, baseline and lookahead?",
          a: (
            <>
              <p>
                Preconditions: Planning schedule exists for the selected project.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/planning")}>
                  "Planning"
                </Link>
                , and choose the "Milestones" or "Lookahead" tab.
              </p>
              <p className="mt-2">
                Required fields: Milestone Name, Date, and Type (start, inspection, critical, payment, or handover).
              </p>
              <p className="mt-2">
                Save result: Adding a milestone calls <code>POST /apis/v3/planning/milestones</code>. Setting a baseline snapshots current planned start and end dates for slippage tracking.
              </p>
              <p className="mt-2">
                Next step: Use the 3-week Lookahead view for site supervisor weekly execution commitments.
              </p>
            </>
          ),
          text: "milestones baseline lookahead slippage schedule snapshot critical handover payment inspection",
          sources: [
            "frontend/src/components/Sidebar.tsx:113",
            "frontend/src/app/c/[company_id]/d/planning/page.tsx:1",
            "POST /apis/v3/planning/milestones",
          ],
        },
        {
          q: "How do I record a Daily Progress Report (DPR)?",
          a: (
            <>
              <p>
                Preconditions: Active project selected. Entry date must fall within the company back-dated entry limit.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Site Operations", and select{" "}
                <Link className="help-link" href={c(companyId, "/d/dpr")}>
                  "DPR (Daily Progress)"
                </Link>
                . Click "+ New DPR".
              </p>
              <p className="mt-2">
                Required fields: Report Date (dpr_date) and Executed Quantity (executed_qty). Optional fields: Associated Task, Weather condition, Workers Deployed, Materials Consumed array, Site Photos, Notes, and Issues.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/dpr</code>, saving the progress entry to the daily_progress_reports table and updating cumulative progress metrics.
              </p>
              <p className="mt-2">
                Next step: Review daily site logs on the DPR Today dashboard summary or export safe CSV logs for client reporting.
              </p>
            </>
          ),
          text: "dpr daily progress report site log weather workers executed qty materials consumed photos",
          sources: [
            "frontend/src/components/Sidebar.tsx:151",
            "frontend/src/app/c/[company_id]/d/dpr/page.tsx:1",
            "POST /apis/v3/dpr",
          ],
        },
      ],
    },
    {
      id: "procurement-materials",
      title: "Procurement & Materials",
      description: "Material indents, purchase orders, goods receipts, and 3-way matching.",
      icon: "trolley",
      items: [
        {
          q: "How does indent to PO to GRN to three-way match work?",
          a: (
            <>
              <p>
                Preconditions: Active vendor in Library, approved items, and procurement:view permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Procurement & Materials", and select{" "}
                <Link className="help-link" href={c(companyId, "/d/three-way")}>
                  "Three-Way Match"
                </Link>
                .
              </p>
              <p className="mt-2">
                Workflow chain: Site raises Indent -&gt; Manager approves -&gt; Purchasing issues PO -&gt; Vendor delivers -&gt; Site creates GRN -&gt; Accounting enters Bill -&gt; Three-Way Match compares PO rate, GRN accepted quantity, and Bill invoiced total.
              </p>
              <p className="mt-2">
                Save result: Fetching views calls <code>GET /apis/v3/three-way/pos/{"{companyId}"}</code>, highlighting discrepancies in red when quantity or price exceed set tolerance thresholds.
              </p>
              <p className="mt-2">
                Next step: Approve matched bills for payment processing or raise debit notes for quantity shortfalls.
              </p>
            </>
          ),
          text: "procurement workflow indent po grn three way match reconciliation goods receipt purchase order invoice",
          sources: [
            "frontend/src/components/Sidebar.tsx:237",
            "frontend/src/app/c/[company_id]/d/three-way/page.tsx:1",
            "GET /apis/v3/three-way/pos/{company_id}",
          ],
        },
        {
          q: "How do I create a purchase order?",
          a: (
            <>
              <p>
                Preconditions: The supplier must exist as a Vendor in the Library.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Procurement & Materials", select{" "}
                <Link className="help-link" href={c(companyId, "/d/procurement")}>
                  "Procurement"
                </Link>
                , choose the "Purchase Orders" tab, and click "+ Purchase Order".
              </p>
              <p className="mt-2">
                Required fields: Vendor, PO Number, PO Date, and at least one Line Item (Material Name, Quantity, Rate, Unit). Optional fields: GST Rate %, Delivery Address, Payment Terms, and Remarks.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/procurement/pos</code>, creating the order in Pending status. Approving it via the Approve button calls <code>POST /apis/v3/procurement/pos/{"{po_id}"}/approve</code> to unlock goods receipt.
              </p>
              <p className="mt-2">
                Next step: Receive delivered consignments under the GRN tab against this approved PO.
              </p>
            </>
          ),
          text: "create purchase order po vendor supplier rate items gst delivery terms approve procurement",
          sources: [
            "frontend/src/components/Sidebar.tsx:229",
            "frontend/src/app/c/[company_id]/d/procurement/page.tsx:1",
            "POST /apis/v3/procurement/pos",
            "POST /apis/v3/procurement/pos/{po_id}/approve",
          ],
        },
        {
          q: "How do I run a Request for Quotation (RFQ)?",
          a: (
            <>
              <p>
                Preconditions: Vendors registered in the Library with contact emails/phones.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/procurement")}>
                  "Procurement"
                </Link>
                , select the "RFQ" tab, and click "+ New RFQ".
              </p>
              <p className="mt-2">
                Required fields: RFQ Title, Due Date, Selected Vendors, and Line Items with requested quantities and specifications.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/procurement/rfq</code>, creating the RFQ package and generating comparative quotation entry sheets.
              </p>
              <p className="mt-2">
                Next step: Record vendor bid responses to generate a side-by-side Commercial Evaluation and convert the winning bid into a Purchase Order.
              </p>
            </>
          ),
          text: "rfq request for quotation vendor comparison bid evaluation commercial procurement tender",
          sources: [
            "frontend/src/components/Sidebar.tsx:229",
            "frontend/src/app/c/[company_id]/d/procurement/page.tsx:1",
            "POST /apis/v3/procurement/rfq",
          ],
        },
        {
          q: "How do I manage inventory and warehouse?",
          a: (
            <>
              <p>
                Preconditions: Warehouse locations created under project setup.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Procurement & Materials", and select{" "}
                <Link className="help-link" href={c(companyId, "/materials")}>
                  "Materials & Stock"
                </Link>
                .
              </p>
              <p className="mt-2">
                Required fields: Material, Source Warehouse/Project, Destination, and Quantity.
              </p>
              <p className="mt-2">
                Save result: Posting an issue, receipt, or transfer calls <code>POST /apis/v3/procurement/transactions</code>, adjusting stock balances in warehouse_inventories with negative-stock lock protection.
              </p>
              <p className="mt-2">
                Next step: Monitor minimum reorder thresholds and material consumption against DPR estimates.
              </p>
            </>
          ),
          text: "inventory warehouse stock material transfer issue receipt stock balance negative stock lock",
          sources: [
            "frontend/src/components/Sidebar.tsx:245",
            "frontend/src/app/c/[company_id]/materials/page.tsx:1",
            "POST /apis/v3/procurement/transactions",
          ],
        },
      ],
    },
    {
      id: "finance-billing",
      title: "Finance & Billing",
      description: "Vendor bills, subcontractor RA bills, payments, cashbook, and P&L.",
      icon: "currency_rupee",
      items: [
        {
          q: "How do I record a vendor bill?",
          a: (
            <>
              <p>
                Preconditions: Active project selected; vendor registered in Library.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Finance & Billing", select{" "}
                <Link className="help-link" href={c(companyId, "/d/billing")}>
                  "Billing & Invoices"
                </Link>
                , and click "+ Create Bill".
              </p>
              <p className="mt-2">
                Required fields: Vendor (party_company_user_id), Invoice Number, Invoice Date, Invoice Type ("material" or "subcon"), and Subtotal. Optional fields: GST %, Deductions (TDS, Retention), and Pre-tax deduction flag.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/billing/bills</code>, creating the invoice in Pending status and calculating statutory deductions.
              </p>
              <p className="mt-2">
                Next step: Perform Three-Way Match against PO and GRN before approving the bill for payout.
              </p>
            </>
          ),
          text: "record vendor bill invoice material subtotal gst tds retention statutory deductions",
          sources: [
            "frontend/src/components/Sidebar.tsx:283",
            "frontend/src/app/c/[company_id]/d/billing/page.tsx:1",
            "POST /apis/v3/billing/bills",
          ],
        },
        {
          q: "How do subcontractor work orders and RA bills work (TDS and retention)?",
          a: (
            <>
              <p>
                Preconditions: Subcontractor party registered; work order contract created.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Procurement & Materials", select{" "}
                <Link className="help-link" href={c(companyId, "/d/subcon")}>
                  "Subcontractors"
                </Link>
                , and choose the "RA Bills" tab. Click "+ Create RA Bill".
              </p>
              <p className="mt-2">
                Required fields: Subcontractor, Invoice Number, Invoice Date, Gross Certified Amount (Subtotal), and GST %. Deductions configured: Retention % (e.g., 5%) and TDS Section (e.g., 1% or 2%).
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/billing/bills</code> with invoice_type "subcon". Retention and TDS are computed on the GST-exclusive base per sequential policy.
              </p>
              <p className="mt-2">
                Next step: Track retained balances in the Retention Ledger for release upon defect liability completion.
              </p>
            </>
          ),
          text: "subcontractor ra bill running account work order tds retention defect liability certified amount",
          sources: [
            "frontend/src/components/Sidebar.tsx:253",
            "frontend/src/app/c/[company_id]/d/subcon/page.tsx:1",
            "POST /apis/v3/billing/bills",
          ],
        },
        {
          q: "How do I make a payment or raise a payment request?",
          a: (
            <>
              <p>
                Preconditions: Company Bank or Cash Account created; finance:edit permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/finance")}>
                  "Finance"
                </Link>
                , choose the "Payments" tab, and click "+ New Payment".
              </p>
              <p className="mt-2">
                Required fields: Party, Payment Type ("in" for customer receipts, "out" for vendor payouts), Amount, Payment Method (Bank Transfer, Cheque, UPI, Cash), and Payment Date.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/finance/payments</code>, recording the transaction in financial_transactions and adjusting account balances.
              </p>
              <p className="mt-2">
                Next step: Link the payment to open vendor bills or view updated party statement balances.
              </p>
            </>
          ),
          text: "make payment payment request voucher bank transfer cheque cashbook payout receipt ledger",
          sources: [
            "frontend/src/components/Sidebar.tsx:276",
            "frontend/src/app/c/[company_id]/d/finance/page.tsx:1",
            "POST /apis/v3/finance/payments",
          ],
        },
        {
          q: "What is the cashbook?",
          a: (
            <>
              <p>
                Preconditions: Company staff users assigned petty cash limits.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/finance")}>
                  "Finance"
                </Link>
                , and choose the "Cashbook" tab.
              </p>
              <p className="mt-2">
                Features: Peer-to-peer (P2P) transfers between team members, petty cash expenses, receipt uploads, and daily site cash reconciliation.
              </p>
              <p className="mt-2">
                Save result: Submitting a peer transfer calls <code>POST /apis/v3/finance/cashbook/p2p</code>, debiting the sender user wallet and crediting the recipient wallet.
              </p>
              <p className="mt-2">
                Next step: Settle site expenses against approved expense vouchers.
              </p>
            </>
          ),
          text: "cashbook petty cash p2p transfer site expenses cash wallet peer to peer finance",
          sources: [
            "frontend/src/components/Sidebar.tsx:276",
            "frontend/src/app/c/[company_id]/d/finance/page.tsx:1",
            "POST /apis/v3/finance/cashbook/p2p",
          ],
        },
        {
          q: "How do multi-level approvals work?",
          a: (
            <>
              <p>
                Preconditions: Owner role or settings:manage permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/settings")}>
                  "Settings"
                </Link>
                , and choose the "Approval Rules" tab. Click "+ Add Approval Rule".
              </p>
              <p className="mt-2">
                Required fields: Module (PO, Bill, Indent, Payment), Minimum Amount Threshold, and Approver Role sequence (Level 1, Level 2, Level 3).
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/settings/approval-rules/{"{companyId}"}</code>, enforcing sequential multi-tiered authorization on documents exceeding value limits.
              </p>
              <p className="mt-2">
                Note: The approval rules defined here are not automatically enforced on every arbitrary transaction type unless enabled in the system workflow settings.
              </p>
              <p className="mt-2">
                Next step: Documents trigger approval alerts to authorized approvers before advancing to execution.
              </p>
            </>
          ),
          text: "multi level approvals workflow rules hierarchy threshold po bill indent authorization",
          sources: [
            "frontend/src/components/Sidebar.tsx:378",
            "frontend/src/app/c/[company_id]/settings/page.tsx:1",
            "POST /apis/v3/settings/approval-rules/{company_id}",
          ],
        },
        {
          q: "How do I see a project profit and loss?",
          a: (
            <>
              <p>
                Preconditions: reports:view permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/analytics")}>
                  "Analytics"
                </Link>
                , and choose the "Financial" tab.
              </p>
              <p className="mt-2">
                Calculation: Revenue recognized from certified client bills minus direct costs (materials issued + labour paid + subcontractor certified + equipment hire) minus indirect allocations.
              </p>
              <p className="mt-2">
                Save result: Loading calls <code>GET /apis/v3/analytics/company/{"{companyId}"}</code>, rendering real-time gross margin %, cost breakdown charts, and budget variance summaries.
              </p>
              <p className="mt-2">
                Next step: Drill down into individual cost heads via the Cost Code Expense Analysis report under Reports.
              </p>
            </>
          ),
          text: "profit and loss pnl analytics revenue expenses direct costs gross margin financial reports",
          sources: [
            "frontend/src/components/Sidebar.tsx:82",
            "frontend/src/app/c/[company_id]/analytics/page.tsx:1",
            "GET /apis/v3/analytics/company/{company_id}",
          ],
        },
      ],
    },
    {
      id: "workforce-hr",
      title: "Workforce & HR",
      description: "Employee onboarding, site attendance, labour muster, payroll, and leave.",
      icon: "group",
      items: [
        {
          q: "How do I add employees?",
          a: (
            <>
              <p>
                Preconditions: payroll:edit permission or Owner role.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Finance & Billing", select{" "}
                <Link className="help-link" href={c(companyId, "/d/hr")}>
                  "HR & Staff"
                </Link>
                , and click "+ Add Employee".
              </p>
              <p className="mt-2">
                Required fields: Full Name, Monthly Salary, and Designation. Optional fields: Project Assignment, Phone, Email, UAN (for EPF), PAN, Bank Account Details, and Joining Date.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/hr/employees</code>, creating the employee profile in staff_employees with an auto-generated salary structure.
              </p>
              <p className="mt-2">
                Next step: Enroll employee biometric templates or configure geofenced mobile attendance punching.
              </p>
            </>
          ),
          text: "add employee staff hr onboarding salary designation uan pan bank details",
          sources: [
            "frontend/src/components/Sidebar.tsx:300",
            "frontend/src/app/c/[company_id]/d/hr/page.tsx:1",
            "POST /apis/v3/hr/employees",
          ],
        },
        {
          q: "How does site attendance and geofencing work?",
          a: (
            <>
              <p>
                Preconditions: Project GPS coordinates and radius (e.g. 500m) configured on the project profile.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Site Operations", and select{" "}
                <Link className="help-link" href={c(companyId, "/d/attendance")}>
                  "Attendance"
                </Link>
                .
              </p>
              <p className="mt-2">
                Punch validation: Mobile punch requests capture real-time GPS coordinates. The backend calculates Haversine distance against project coordinates; out-of-range punches are flagged.
              </p>
              <p className="mt-2">
                Save result: Punching calls <code>POST /apis/v3/hr/attendance/punch</code>, logging timestamp, punch type (IN/OUT), and location verification status.
              </p>
              <p className="mt-2">
                Next step: Verified punch records feed directly into the Monthly Payroll calculation engine.
              </p>
            </>
          ),
          text: "site attendance geofencing gps radius punch in punch out mobile face recognition haversine",
          sources: [
            "frontend/src/components/Sidebar.tsx:183",
            "frontend/src/app/c/[company_id]/d/attendance/page.tsx:1",
            "POST /apis/v3/hr/attendance/punch",
          ],
        },
        {
          q: "How do timesheets and labour records work?",
          a: (
            <>
              <p>
                Preconditions: Subcontractor party and daily labour headcounts active on site.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/labour")}>
                  "Labour Management"
                </Link>
                , and click "+ Daily Muster Roll".
              </p>
              <p className="mt-2">
                Required fields: Project, Date, Trade / Category (Mason, Carpenter, Helper), and Headcount. Optional fields: Overtime hours and Subcontractor allocation.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/labour/muster-roll</code>, recording labour shifts and generating BOCW compliance registers.
              </p>
              <p className="mt-2">
                Next step: Compare planned vs actual labour deployment against the DPR and BOQ productivity standards.
              </p>
            </>
          ),
          text: "labour management muster roll timesheet headcount trade mason carpenter bocw overtime",
          sources: [
            "frontend/src/components/Sidebar.tsx:175",
            "frontend/src/app/c/[company_id]/d/labour/page.tsx:1",
            "POST /apis/v3/labour/muster-roll",
          ],
        },
        {
          q: "How do I run payroll and export payslips?",
          a: (
            <>
              <p>
                Preconditions: Employees active; monthly attendance logged or full-month policy enabled.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/payroll-attendance")}>
                  "Payroll"
                </Link>
                , and click "Run Payroll".
              </p>
              <p className="mt-2">
                Required fields: Month (1-12) and Year (YYYY).
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/hr/payroll/run</code>, executing salary computation (Basic, HRA, Allowances minus EPF employee 12%, ESI, PT, and Unpaid Leave deductions) and locking the payroll run.
              </p>
              <p className="mt-2">
                Next step: Export bank transfer payout sheets and bulk PDF payslips via the Payslips tab.
              </p>
            </>
          ),
          text: "run payroll payslips salary epf esi pt deductions basic hra bank payout export",
          sources: [
            "frontend/src/components/Sidebar.tsx:292",
            "frontend/src/app/c/[company_id]/d/payroll-attendance/page.tsx:1",
            "POST /apis/v3/hr/payroll/run",
          ],
        },
        {
          q: "How do leave templates and per-employee balances work?",
          a: (
            <>
              <p>
                Preconditions: HR & Staff module enabled; payroll:edit permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/hr")}>
                  "HR & Staff"
                </Link>
                , and choose the "Leave Management" tab.
              </p>
              <p className="mt-2">
                Configuration: Create company-wide leave templates (Casual, Sick, Earned Leave) with annual quotas and carry-forward limits.
              </p>
              <p className="mt-2">
                Save result: Adding templates calls <code>POST /apis/v3/hr/leave-templates/{"{companyId}"}</code>, allocating opening leave balances to enrolled staff.
              </p>
              <p className="mt-2">
                Next step: Approve incoming leave applications; unapproved absences deduct from monthly payroll.
              </p>
            </>
          ),
          text: "leave management templates quota sick casual earned carry forward balance hr",
          sources: [
            "frontend/src/components/Sidebar.tsx:300",
            "frontend/src/app/c/[company_id]/d/hr/page.tsx:1",
            "POST /apis/v3/hr/leave-templates/{company_id}",
          ],
        },
      ],
    },
    {
      id: "plant-equipment",
      title: "Plant & Equipment",
      description: "Fleet tracking, site deployments, fuel logs, and production batches.",
      icon: "truck",
      items: [
        {
          q: "How do I register and track equipment?",
          a: (
            <>
              <p>
                Preconditions: Equipment module enabled; equipment:edit permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/equipment")}>
                  "Equipment"
                </Link>
                , and click "+ Add Equipment".
              </p>
              <p className="mt-2">
                Required fields: Equipment Name, Asset Code (code), Category (e.g. Earthmoving, Concreting, Crane), and Ownership Type ("Owned" or "Hired"). Optional fields: Registration Number, Hourly Rate, and Current Meter Reading.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/equipment</code>, creating the asset record in status "available".
              </p>
              <p className="mt-2">
                Next step: Deploy the registered equipment to an active construction site.
              </p>
            </>
          ),
          text: "register equipment asset fleet machinery owned hired excavator crane meter reading",
          sources: [
            "frontend/src/components/Sidebar.tsx:199",
            "frontend/src/app/c/[company_id]/d/equipment/page.tsx:1",
            "POST /apis/v3/equipment",
          ],
        },
        {
          q: "How do site deployments and log sheets work?",
          a: (
            <>
              <p>
                Preconditions: Equipment asset registered and currently in "available" status.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/equipment")}>
                  "Equipment"
                </Link>
                , select the asset, and click "Deploy to Project".
              </p>
              <p className="mt-2">
                Required fields: Target Project and Start Date. Optional fields: Operator Name and Initial Odometer Reading.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/equipment/{"{equipment_id}"}/deploy</code>, updating asset status to "deployed" and creating an active deployment log.
              </p>
              <p className="mt-2">
                Next step: Log daily running hours and fuel consumption; mark return upon project demobilization.
              </p>
            </>
          ),
          text: "equipment deployment deploy project site log sheet operator odometer return machinery",
          sources: [
            "frontend/src/components/Sidebar.tsx:199",
            "frontend/src/app/c/[company_id]/d/equipment/page.tsx:1",
            "POST /apis/v3/equipment/{equipment_id}/deploy",
          ],
        },
        {
          q: "How do I track fuel logs and efficiency?",
          a: (
            <>
              <p>
                Preconditions: Equipment currently deployed to an active project.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/equipment")}>
                  "Equipment"
                </Link>
                , select the asset, and click "+ Log Fuel".
              </p>
              <p className="mt-2">
                Required fields: Project, Log Date (logged_date), Liters Dispensed (liters), and Cost Per Liter (cost_per_liter). Optional fields: Meter/Odometer Reading and Fuel Slip Photo.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/equipment/{"{equipment_id}"}/fuel</code>, recording fuel cost against the project and calculating km/l or liters/hour efficiency.
              </p>
              <p className="mt-2">
                Next step: Review fuel expense rollups on the Equipment Profitability report.
              </p>
            </>
          ),
          text: "fuel log equipment diesel efficiency liters cost per liter odometer running hours",
          sources: [
            "frontend/src/components/Sidebar.tsx:199",
            "frontend/src/app/c/[company_id]/d/equipment/page.tsx:1",
            "POST /apis/v3/equipment/{equipment_id}/fuel",
          ],
        },
        {
          q: "How do I manage production batches and recipes?",
          a: (
            <>
              <p>
                Preconditions: Production module active on manufacturing / RMC plant project.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Site Operations", select{" "}
                <Link className="help-link" href={c(companyId, "/d/production")}>
                  "Production"
                </Link>
                , and click "+ New Recipe".
              </p>
              <p className="mt-2">
                Required fields: Recipe Code, Product Name, Mix Type (e.g. Concrete, Asphalt, Precast), Unit, and Raw Materials list with proportioned design quantities.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/production/recipes</code>. When batches run, completing a batch auto-deducts cement, aggregates, and admixtures from plant inventory.
              </p>
              <p className="mt-2">
                Next step: Generate batch dispatch delivery challans for site transit mixer tracking.
              </p>
            </>
          ),
          text: "production batch recipe concrete rmc design mix auto consumption dispatch plant",
          sources: [
            "frontend/src/components/Sidebar.tsx:207",
            "frontend/src/app/c/[company_id]/d/production/page.tsx:1",
            "POST /apis/v3/production/recipes",
          ],
        },
      ],
    },
    {
      id: "sales-crm",
      title: "Sales & CRM",
      description: "Lead capture, client quotations, pipeline stages, and rate card library.",
      icon: "sparkles",
      items: [
        {
          q: "How do I capture leads and manage the sales pipeline?",
          a: (
            <>
              <p>
                Preconditions: CRM module enabled; crm:view permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Sales & CRM", select{" "}
                <Link className="help-link" href={c(companyId, "/d/crm")}>
                  "CRM & Leads"
                </Link>
                , and click "+ New Lead".
              </p>
              <p className="mt-2">
                Required fields: Lead Title, Lead Type (e.g. Commercial, Residential, Infra), Contact Person (contact_name), and Phone Number (phone_no). Optional fields: Client Name, Estimated Value, Source, and Status stage.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/crm/leads</code>, creating the opportunity card on the sales pipeline Kanban board.
              </p>
              <p className="mt-2">
                Next step: Drag cards across stages (New Lead -&gt; Site Visit -&gt; Proposal -&gt; Won) and prepare Client Quotations.
              </p>
            </>
          ),
          text: "crm leads sales pipeline kanban opportunity contact client value commercial residential",
          sources: [
            "frontend/src/components/Sidebar.tsx:340",
            "frontend/src/app/c/[company_id]/d/crm/page.tsx:1",
            "POST /apis/v3/crm/leads",
          ],
        },
        {
          q: "How do I create client quotations and cost estimates?",
          a: (
            <>
              <p>
                Preconditions: Lead record exists; rate cards available in Library.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, select{" "}
                <Link className="help-link" href={c(companyId, "/d/crm")}>
                  "CRM & Leads"
                </Link>
                , open the Lead details modal, switch to the "Quotations" tab, and click "+ Create Quotation".
              </p>
              <p className="mt-2">
                Required fields: Quotation Subject, Quotation Number, and Line Items (Item Name, Quantity (qty), Unit Rate, Unit). Optional fields: GST %, Markup %, Terms & Conditions, and Discount.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/crm/leads/{"{lead_id}"}/quotations</code>, generating a branded quotation PDF.
              </p>
              <p className="mt-2">
                Next step: Once accepted, convert the quotation into an active Project and Client Sales Invoice with one click.
              </p>
            </>
          ),
          text: "create client quotation estimate proposal rate items markup discount convert invoice",
          sources: [
            "frontend/src/components/Sidebar.tsx:340",
            "frontend/src/app/c/[company_id]/d/crm/page.tsx:1",
            "POST /apis/v3/crm/leads/{lead_id}/quotations",
          ],
        },
        {
          q: "How does the Rate Card Library work?",
          a: (
            <>
              <p>
                Preconditions: library:edit permission or Owner role.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/d/library")}>
                  "Library"
                </Link>
                , and choose the "Rate Cards" tab. Click "+ Add Rate".
              </p>
              <p className="mt-2">
                Required fields: Item Name, Item Code, Unit of Measurement, Standard Cost Rate, and Selling Rate. Optional fields: Category and Description.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/library/rates</code>, registering the master price item.
              </p>
              <p className="mt-2">
                Next step: Pre-fill BOQ imports and quotation builders automatically from standard library rate presets.
              </p>
            </>
          ),
          text: "rate card library standard unit price cost rate selling rate master rates presets",
          sources: [
            "frontend/src/components/Sidebar.tsx:354",
            "frontend/src/app/c/[company_id]/d/library/page.tsx:1",
            "POST /apis/v3/library/rates",
          ],
        },
      ],
    },
    {
      id: "integrations",
      title: "Integrations & Backup",
      description: "Tally Prime XML sync, Zoho Books, Google Drive backup, and BI feeds.",
      icon: "settings",
      items: [
        {
          q: "How do I connect Tally Prime?",
          a: (
            <>
              <p>
                Preconditions: Owner role; Tally Prime installed on your accounting machine with Tally XML Server enabled (e.g. port 9000).
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/settings")}>
                  "Settings"
                </Link>
                , and choose the "Tally Integration" tab.
              </p>
              <p className="mt-2">
                Required fields: Tally Company Name, Host/Port or SiteFlow Tally Desktop Agent token.
              </p>
              <p className="mt-2">
                Save result: Configuring connection calls <code>POST /apis/v3/tally/connections</code>. Exporting pending vouchers generates Tally XML import payloads with unique voucher GUID deduplication.
              </p>
              <p className="mt-2">
                Next step: Sync ledgers, cost centres, and vendor bills directly into your Tally Prime ledger books.
              </p>
            </>
          ),
          text: "tally prime sync xml export accounting ledger cost centre voucher deduplication integration",
          sources: [
            "frontend/src/components/Sidebar.tsx:378",
            "frontend/src/app/c/[company_id]/settings/page.tsx:1",
            "POST /apis/v3/tally/connections",
          ],
        },
        {
          q: "How do I connect Zoho Books?",
          a: (
            <>
              <p>
                Preconditions: Active Zoho Books organization with admin API access credentials.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/settings")}>
                  "Settings"
                </Link>
                , and choose the "Zoho Books" tab. Click "Connect Zoho Books".
              </p>
              <p className="mt-2">
                OAuth flow: Redirects to Zoho OAuth login via <code>GET /apis/v3/integrations/zoho-books/authorize</code> and saves encrypted refresh tokens in company credentials.
              </p>
              <p className="mt-2">
                Save result: Automatically pushes approved vendor bills and customer invoices to Zoho Books with chart-of-accounts mapping.
              </p>
              <p className="mt-2">
                Next step: View real-time sync status badges on the Invoices and Bills dashboards.
              </p>
            </>
          ),
          text: "zoho books connect oauth sync invoices bills chart of accounts integration",
          sources: [
            "frontend/src/components/Sidebar.tsx:378",
            "frontend/src/app/c/[company_id]/settings/page.tsx:1",
            "GET /apis/v3/integrations/zoho-books/authorize",
          ],
        },
        {
          q: "How do Google Drive backup and Google Sheets export work?",
          a: (
            <>
              <p>
                Preconditions: Google Workspace / Google Account authorized by company administrator.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/settings")}>
                  "Settings"
                </Link>
                , and choose the "Cloud Integrations" tab.
              </p>
              <p className="mt-2">
                Features: Daily automated database & document backup to your Google Drive folder, plus direct one-click spreadsheet export of attendance and payroll runs.
              </p>
              <p className="mt-2">
                Save result: Authorizing via <code>GET /apis/v3/integrations/google-drive/authorize</code> links your designated Google Drive folder for encrypted automated file archives.
              </p>
              <p className="mt-2">
                Next step: Test a manual backup run to verify destination folder synchronization.
              </p>
            </>
          ),
          text: "google drive backup google sheets export cloud backup automated archive spreadsheets",
          sources: [
            "frontend/src/components/Sidebar.tsx:378",
            "frontend/src/app/c/[company_id]/settings/page.tsx:1",
            "GET /apis/v3/integrations/google-drive/authorize",
          ],
        },
        {
          q: "How do I access BI data feeds via API Key?",
          a: (
            <>
              <p>
                Preconditions: Enterprise subscription or BI Integration enabled; Owner role.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Setup & Config", select{" "}
                <Link className="help-link" href={c(companyId, "/settings")}>
                  "Settings"
                </Link>
                , and choose the "BI & API Feeds" tab. Click "+ Generate API Key".
              </p>
              <p className="mt-2">
                Required fields: Key Name and Expiration Period (30, 90, 365 days, or Never).
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/integrations/bi/companies/{"{companyId}"}/keys</code>, generating a secure bearer API token for Power BI, Tableau, or custom dashboards.
              </p>
              <p className="mt-2">
                Next step: Connect Power BI Web Connector to feeds like /apis/v3/integrations/bi/feed/{companyId}/budget-variance for automated reporting.
              </p>
            </>
          ),
          text: "bi data feed api key power bi tableau live data streaming analytics export integration",
          sources: [
            "frontend/src/components/Sidebar.tsx:378",
            "frontend/src/app/c/[company_id]/settings/page.tsx:1",
            "POST /apis/v3/integrations/bi/companies/{company_id}/keys",
          ],
        },
      ],
    },
    {
      id: "quality-safety",
      title: "Quality & Safety",
      description: "Inspection checklists, NCR resolution, incident logs, and site safety permits.",
      icon: "check_circle",
      items: [
        {
          q: "How do I perform quality inspections and manage NCRs?",
          a: (
            <>
              <p>
                Preconditions: Quality Checklist Template created in company setup; quality:edit permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Site Operations", select{" "}
                <Link className="help-link" href={c(companyId, "/d/quality")}>
                  "Quality & NCR"
                </Link>
                , and click "+ New Inspection".
              </p>
              <p className="mt-2">
                Required fields: Project, Checklist Template (checklist_id), Inspection Title, and Inspection Date. Optional fields: Tower / Location, Photos, and Item Remarks.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/quality/inspections</code>. Failed checklist items automatically generate a Non-Conformance Report (NCR) assigned to the responsible subcontractor.
              </p>
              <p className="mt-2">
                Next step: Track subcontractor corrective action responses and re-inspect items before closing the NCR.
              </p>
            </>
          ),
          text: "quality inspections ncr non conformance report checklist pre pour tolerance site safety",
          sources: [
            "frontend/src/components/Sidebar.tsx:159",
            "frontend/src/app/c/[company_id]/d/quality/page.tsx:1",
            "POST /apis/v3/quality/inspections",
          ],
        },
        {
          q: "How do I report safety incidents and issue work permits?",
          a: (
            <>
              <p>
                Preconditions: Active project selected; safety:edit permission.
              </p>
              <p className="mt-2">
                Navigation: Open the sidebar, navigate to "Site Operations", select{" "}
                <Link className="help-link" href={c(companyId, "/d/safety")}>
                  "Safety"
                </Link>
                , and click "+ Report Incident".
              </p>
              <p className="mt-2">
                Required fields: Incident Title, Incident Type (Near Miss, First Aid, Lost Time, Dangerous Occurrence), Severity (Low, Medium, High, Critical), Description, Reported By user, and Incident Date. Optional fields: Specific Site Location, Root Cause Analysis, and Photos.
              </p>
              <p className="mt-2">
                Save result: Submitting calls <code>POST /apis/v3/safety/incidents</code>, creating the safety log in Open status and dispatching high-severity alerts to safety officers.
              </p>
              <p className="mt-2">
                Next step: Record corrective actions and sign off the closeout review to resolve the incident.
              </p>
            </>
          ),
          text: "safety incidents work permit near miss hazard lost time severity root cause safety officer",
          sources: [
            "frontend/src/components/Sidebar.tsx:167",
            "frontend/src/app/c/[company_id]/d/safety/page.tsx:1",
            "POST /apis/v3/safety/incidents",
          ],
        },
      ],
    },
  ];
}

export const HELP_CATEGORIES = getHelpCategories;
