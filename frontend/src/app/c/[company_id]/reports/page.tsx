"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";
import { getApiHost } from "@/lib/api";

interface ReportItem {
  name: string;
  hasView: boolean;
  hasDownload: boolean;
  viewSlug?: string;
}

interface ReportCategory {
  title: string;
  icon: string;
  reports: ReportItem[];
}

export default function ReportsDashboard() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  
  // Modal state fields
  const [selectedMonth, setSelectedMonth] = useState("Jul 2026");
  const [partyNameFilter, setPartyNameFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const months = ["Jan 2026", "Feb 2026", "Mar 2026", "Apr 2026", "May 2026", "Jun 2026", "Jul 2026", "Aug 2026", "Sep 2026", "Oct 2026", "Nov 2026", "Dec 2026"];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const shiftMonth = (dir: "prev" | "next") => {
    const idx = months.indexOf(selectedMonth);
    if (dir === "prev" && idx > 0) {
      setSelectedMonth(months[idx - 1]);
    } else if (dir === "next" && idx < months.length - 1) {
      setSelectedMonth(months[idx + 1]);
    }
  };

  // Report structure based on Onsite Teams
  const categories: ReportCategory[] = [
    {
      title: "Sales",
      icon: "📈",
      reports: [
        { name: "Company Sales Report", hasView: true, hasDownload: true, viewSlug: "company-sales" },
        { name: "Item Wise Sales Report", hasView: true, hasDownload: false, viewSlug: "item-wise-sales" },
        { name: "Sales Deduction / Retention Report", hasView: true, hasDownload: false, viewSlug: "sales-deduction-retention" },
        { name: "CRM Lead Detail Report", hasView: true, hasDownload: false, viewSlug: "crm-lead-detail" },
        { name: "Lead Status Funnel Report", hasView: true, hasDownload: false, viewSlug: "lead-status-funnel" },
        { name: "Project Wise Sales Summary", hasView: true, hasDownload: false, viewSlug: "project-wise-sales-summary" }
      ]
    },
    {
      title: "Payments",
      icon: "💳",
      reports: [
        { name: "Company Payments", hasView: true, hasDownload: true, viewSlug: "company-payments" },
        { name: "Bank Statement", hasView: true, hasDownload: false, viewSlug: "bank-statement" },
        { name: "Project Wise Payment Summary", hasView: true, hasDownload: false, viewSlug: "project-wise-payment-summary" },
        { name: "Project Payment Report", hasView: true, hasDownload: false, viewSlug: "project-payment" },
        { name: "Payment Request Report", hasView: true, hasDownload: false, viewSlug: "payment-request" }
      ]
    },
    {
      title: "Progress & task",
      icon: "📋",
      reports: [
        { name: "Daily Progress Report", hasView: true, hasDownload: false, viewSlug: "dpr" },
        { name: "Task Report", hasView: true, hasDownload: false, viewSlug: "task-report" },
        { name: "Task Measurement Book", hasView: true, hasDownload: false, viewSlug: "task-measurement-book" },
        { name: "Task Material Report", hasView: true, hasDownload: false, viewSlug: "task-material" },
        { name: "To Do Report", hasView: true, hasDownload: false, viewSlug: "todo-report" },
        { name: "Task Resource Budget Vs Actual Report", hasView: true, hasDownload: false, viewSlug: "task-resource-budget-vs-actual" },
        { name: "Site Inspection Report", hasView: true, hasDownload: false, viewSlug: "site-inspection" },
        { name: "Task Revenue & Expense Report", hasView: true, hasDownload: false, viewSlug: "task-revenue-expense" },
        { name: "Task BOQ Billed & Unbilled Qty Report", hasView: true, hasDownload: false, viewSlug: "task-boq-billed-unbilled" },
        { name: "Task Attendance Report", hasView: true, hasDownload: false, viewSlug: "task-attendance" }
      ]
    },
    {
      title: "Purchase & Expense",
      icon: "💸",
      reports: [
        { name: "Company Expense Report", hasView: true, hasDownload: true, viewSlug: "company-expense" },
        { name: "Cost Code Expense Analysis", hasView: true, hasDownload: false, viewSlug: "cost-code-expense-analysis" },
        { name: "Project Wise Expense Summary", hasView: true, hasDownload: false, viewSlug: "project-wise-expense-summary" },
        { name: "All Expense Deduction / Retention Report", hasView: true, hasDownload: false, viewSlug: "all-expense-deduction-retention" }
      ]
    },
    {
      title: "Party Balances",
      icon: "👥",
      reports: [
        { name: "Party Ledger", hasView: true, hasDownload: false, viewSlug: "party-ledger" },
        { name: "All Party Balances", hasView: true, hasDownload: false, viewSlug: "all-party-balances" },
        { name: "Project level Party Balance Report", hasView: true, hasDownload: false, viewSlug: "project-level-party-balance" }
      ]
    },
    {
      title: "Materials & Inventory",
      icon: "📦",
      reports: [
        { name: "Material Request Item Report", hasView: true, hasDownload: false, viewSlug: "material-request-item" },
        { name: "Material Received & Used Report", hasView: true, hasDownload: false, viewSlug: "material-received-used" },
        { name: "Material Stock Report", hasView: true, hasDownload: false, viewSlug: "material-stock" },
        { name: "Unbilled Item Report", hasView: true, hasDownload: false, viewSlug: "unbilled-item" },
        { name: "PO Summary Report", hasView: true, hasDownload: false, viewSlug: "po-summary" },
        { name: "Material Received without PO", hasView: true, hasDownload: false, viewSlug: "material-received-without-po" },
        { name: "Purchase Order Item Report", hasView: true, hasDownload: false, viewSlug: "purchase-order-item" },
        { name: "Production Material Report", hasView: true, hasDownload: false, viewSlug: "production-material" },
        { name: "Material Purchase Item Report", hasView: true, hasDownload: false, viewSlug: "material-purchase-item" },
        { name: "Material Stock Movement Report", hasView: true, hasDownload: false, viewSlug: "material-stock-movement" }
      ]
    },
    {
      title: "Attendance & Salary",
      icon: "🧑‍💻",
      reports: [
        { name: "Attendance & Salary Report", hasView: true, hasDownload: false, viewSlug: "attendance-salary" },
        { name: "OT & Shift Report", hasView: true, hasDownload: false, viewSlug: "ot-shift" },
        { name: "Company Attendance", hasView: false, hasDownload: true, viewSlug: "company-attendance" },
        { name: "Staff Monthly Salary Slip", hasView: false, hasDownload: true, viewSlug: "staff-monthly-salary-slip" },
        { name: "Staff Salary Report", hasView: true, hasDownload: false, viewSlug: "staff-salary" },
        { name: "Staff Punch Report", hasView: false, hasDownload: true, viewSlug: "staff-punch-report" },
        { name: "Staff Muster Roll", hasView: false, hasDownload: true, viewSlug: "staff-muster-roll" }
      ]
    },
    {
      title: "Equipments",
      icon: "🚜",
      reports: [
        { name: "Equipment Usage Detail Report", hasView: true, hasDownload: false, viewSlug: "equipment-usage-detail" },
        { name: "Fuel Efficiency Report", hasView: true, hasDownload: false, viewSlug: "fuel-efficiency" },
        { name: "Daily based Equipment Used Report", hasView: true, hasDownload: false, viewSlug: "daily-based-equipment-used" },
        { name: "Equipment Expense Summary", hasView: true, hasDownload: false, viewSlug: "equipment-expense-summary" },
        { name: "Equipment Trip Report", hasView: true, hasDownload: false, viewSlug: "equipment-trip" }
      ]
    },
    {
      title: "Tax",
      icon: "🧾",
      reports: [
        { name: "Sales (GSTR-1)", hasView: true, hasDownload: true, viewSlug: "gstr1-sales" },
        { name: "Purchase (GSTR-2)", hasView: true, hasDownload: false, viewSlug: "gstr2-purchase" }
      ]
    },
    {
      title: "Warehouse",
      icon: "🏪",
      reports: [
        { name: "Warehouse Stock Movement Report", hasView: true, hasDownload: false, viewSlug: "warehouse-stock-movement" },
        { name: "Warehouse Transaction Report", hasView: true, hasDownload: false, viewSlug: "warehouse-transaction" },
        { name: "Warehouse Current Stock Report", hasView: true, hasDownload: false, viewSlug: "warehouse-current-stock" }
      ]
    },
    {
      title: "Sub Con.",
      icon: "🏗️",
      reports: [
        { name: "Subcon Workorder Summary Report", hasView: true, hasDownload: false, viewSlug: "subcon-workorder-summary" },
        { name: "Subcon Measurement Book", hasView: true, hasDownload: false, viewSlug: "subcon-measurement-book" },
        { name: "Subcon Deduction / Retention Report", hasView: true, hasDownload: false, viewSlug: "subcon-deduction-retention" },
        { name: "Subcon Material Issue Summary", hasView: true, hasDownload: false, viewSlug: "subcon-material-issue" }
      ]
    },
    {
      title: "Misc.",
      icon: "🔮",
      reports: [
        { name: "Project Financial Summary", hasView: true, hasDownload: true, viewSlug: "project-financial-summary" },
        { name: "Project Operational Summary", hasView: true, hasDownload: false, viewSlug: "project-operational-summary" },
        { name: "Company Transactions Report", hasView: true, hasDownload: false, viewSlug: "company-transactions" },
        { name: "Monthly P&L Report", hasView: true, hasDownload: false, viewSlug: "monthly-pl" },
        { name: "Project Activity Leaderboard", hasView: true, hasDownload: false, viewSlug: "project-activity-leaderboard" },
        { name: "Company User Activity Leaderboard", hasView: true, hasDownload: false, viewSlug: "company-user-activity-leaderboard" }
      ]
    },
    {
      title: "Library",
      icon: "📚",
      reports: [
        { name: "Party Library", hasView: true, hasDownload: false, viewSlug: "party-library" },
        { name: "Cost Code Library", hasView: true, hasDownload: false, viewSlug: "cost-code-library" },
        { name: "Material Library", hasView: true, hasDownload: false, viewSlug: "material-library" },
        { name: "Rate Card Library", hasView: true, hasDownload: false, viewSlug: "rate-card-library" },
        { name: "Payroll Library", hasView: true, hasDownload: false, viewSlug: "payroll-library" },
        { name: "Equipment Library", hasView: true, hasDownload: false, viewSlug: "equipment-library" }
      ]
    },
    {
      title: "BOQ",
      icon: "📐",
      reports: [
        { name: "BOQ Workorder Summary Report", hasView: true, hasDownload: false, viewSlug: "boq-workorder-summary" },
        { name: "BOQ Item Report", hasView: true, hasDownload: false, viewSlug: "boq-item" },
        { name: "Quotation Report", hasView: true, hasDownload: false, viewSlug: "quotation" },
        { name: "Quotation Item Report", hasView: true, hasDownload: false, viewSlug: "quotation-item" },
        { name: "BOQ Measurement Book", hasView: true, hasDownload: false, viewSlug: "boq-measurement-book" }
      ]
    },
    {
      title: "Budget",
      icon: "📊",
      reports: [
        { name: "BOQ BOM Report", hasView: true, hasDownload: false, viewSlug: "boq-bom" },
        { name: "Budget vs Actual (Material Cost)", hasView: true, hasDownload: false, viewSlug: "budget-vs-actual-material-cost" },
        { name: "Budget vs Actual (Material Qty)", hasView: true, hasDownload: false, viewSlug: "budget-vs-actual-material-qty" },
        { name: "Budget vs Actual (Cost Code)", hasView: true, hasDownload: false, viewSlug: "budget-vs-actual-cost-code" }
      ]
    },
    {
      title: "Asset",
      icon: "🏠",
      reports: [
        { name: "Asset Allocation Report", hasView: true, hasDownload: false, viewSlug: "asset-allocation" },
        { name: "Asset Status Report", hasView: true, hasDownload: false, viewSlug: "asset-status" }
      ]
    }
  ];

  // Specific Columns mapped from the actual Onsite Teams reconstructed spreadsheets and UI screens
  const exportSchemas: Record<string, string[]> = {
    "Company Sales Report": ['Invoice Date', 'Party Name', 'Invoice Number', 'Invoice Value', 'Total Deduction', 'Net Amount', 'Balance Due', 'Due Date', 'Creator', 'Project'],
    "Item Wise Sales Report": ['Sales Type', 'Project Name', 'Client Name', 'Invoice Number', 'Invoice Date', 'Item Name', 'Unit', 'Quantity', 'Item Rate', 'Tax %', 'Tax Amount', 'Gross Amount', 'Total Amount', 'Invoice Created'],
    "Sales Deduction / Retention Report": ['Item Name', 'Amount', 'Project Name', 'Party Name', 'Invoice Number', 'Creator Name', 'Type', 'Entry Creation Date', 'Due Date'],
    "CRM Lead Detail Report": ['Lead Date', 'Lead Name', 'Contact Name', 'Contact No.', 'Lead Status', 'Lead Priority', 'Lead Source', 'Lead Category', 'Lead Company', 'Email', 'Budget', 'Last Contacted Date', 'Followup Date', 'Expected Closure Date', 'Remark', 'Assignees'],
    "Lead Status Funnel Report": ['(No tabular columns - rendered as a funnel/visual chart, not a data table)'],
    "Project Wise Sales Summary": ['Project Name', 'No. of Invoices', 'Total Sales', 'Retention Amount', 'Post Tax Deduction', 'Net Amount', 'Payment Received', 'Balance Due'],
    "Company Payments": ['Date', 'Project', 'Sender', 'Receiver', 'Amount', 'Creator', 'Category', 'Trade', 'Payment Mode', 'Description'],
    "Bank Statement": ['Account Name', 'Account Number', 'Bank Name', 'Project Name', 'Party Name', 'Payment Date', 'Credit', 'Debit', 'Balance', 'Remarks'],
    "Project Wise Payment Summary": ['Project Name (single grouping column visible', 'no data rows loaded in screenshot)'],
    "Project Payment Report": ['Payment Date', 'Project Name', 'Creator Name', 'Party Name', 'Amount', 'Remark', 'Reference No.', 'Payment Type', 'Payment Mode', 'Account Name', 'Category', 'Cost Code', 'Sub Cost Code', 'Created Date'],
    "Payment Request Report": ['Payment Request ID', 'Payment Request No.', 'Project Name', 'Party Name', 'Amount', 'Payment Date', 'Due Date', 'Creator Name', 'Request Type', 'Order/Bill No.', 'Approval Status', 'Payment Status', 'Remark', 'Account Name'],
    "Daily Progress Report (DPR)": ['(Multi-section dashboard combining Task Progress, Site Attendance & Material Inventory - includes embedded sub-tables such as \'To Do For DPR\' and \'Material Request for DPR\' rather than a single flat table)'],
    "Task Report": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Assigned To', 'Start Date', 'End Date', 'Progress % (additional columns likely exist beyond captured scroll range)'],
    "Task Measurement Book": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Progress Date', 'Unit', 'Estimated Quantity', 'Opening Quantity', 'Number', 'Length', 'Width', 'Height', 'Progress Quantity', 'Closing Quantity', 'Progress Notes'],
    "Task Material Report": ['Project Name', 'Material Name', 'Main Task Name', 'Group Task Name', 'Avg Unit Rate', 'Avg Cost (likely truncated - only 1 screenshot captured)'],
    "To Do Report": ['Activity Name', 'Project Name', 'Status', 'Creation Date', 'Due Date', 'Last Updated Date', 'Assigned To', 'Type', 'Related Task', 'Creator Name', 'Closed Date'],
    "Task Resource Budget Vs Actual Report": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Task Unit', 'Task Qty', 'Task Progress Qty', 'Resource Name', 'Resource Type', 'Budgeted Rate', 'Avg Unit Cost', 'Unit', 'Qty per Unit', 'Budgeted Qty', 'Pro Rata Budgeted Qty', 'Actual Used Qty', 'Budgeted Amount', 'Pro Rata Budgeted Amount', 'Actual Amount', 'Exceeded Qty', 'Exceeded Amount'],
    "Site Inspection Report": ['Project Name', 'Inspection Date', 'Inspection Name', 'Inspection Status', 'Inspection Items', 'Inspection Notes', 'Created Date', 'Approval Status'],
    "Task Revenue & Expense Report": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Progress', 'Unit (truncated - only 1 screenshot captured)'],
    "Task BOQ Billed & Unbilled Qty Report": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Unit', 'Estimated Qty', 'Progress Qty', '% Complete', 'Task Status', 'Linked BOQ Detail', 'Billed Qty', 'Unbilled Qty'],
    "Task Attendance Report": ['Party Name', 'Workforce Name', 'Project Name', 'Attendance Date', 'Attendance Status', 'Main Task Name', 'Group Task Name', 'Task Name', 'Workers on Task', 'Work Hours', 'Total Hours', 'Task Labour Cost'],
    "Company Expense Report": ['S.NO.', 'Expense Date', 'Expense Type', 'Project Name', 'Party Name', 'Notes', 'Cost Code', 'Expense Status', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Due Date', 'Approval Status'],
    "Cost Code Expense Analysis": ['(No flat table captured - appears to be a chart/analysis view with a date-range dropdown, e.g. \'This Month\')'],
    "Project Wise Expense Summary": ['Project Name (truncated - only 1 screenshot captured, table appears empty/collapsed)'],
    "All Expense Deduction / Retention Report": ['Entry Creation Date', 'Type', 'Item Name', 'Amount', 'Bill Number', 'Expense Type', 'Project Name', 'Party Name', 'Creator Name', 'Due Date'],
    "Party Ledger": ['Party Name', 'Party Type', 'Project Name', 'Creator Name', 'Description', 'Cost Code', 'Transaction Type', 'Transaction Date', 'Party Debit', 'Party Credit', 'Balance'],
    "All Party Balances": ['Party Name', 'Party Type', 'Balance Amount', 'Balance Type', 'Petty Cash Balance', 'Salary Balance (truncated - only 1 screenshot captured)'],
    "Project level Party Balance Report": ['Party Name', 'Party Type', 'Project Name', 'Salary', 'Material Purchase', 'Other Expense', 'Subcon Amount', 'Site Expense', 'Equipment Expense', 'Debit Note', 'Sales Invoice', 'Net Retention', 'Credit Note', 'Material Sale', 'Material Return', 'Party Received', 'Party Paid', 'Net Balance', 'Balance Type'],
    "Material Request Item Report": ['Request Date', 'Request No.', 'Project Name', 'Material Name', 'Specifications', 'Unit', 'Request Quantity', 'Ordered Quantity', 'Pending Quantity', 'PO No.', 'Requested by', 'Status', 'Approved/Rejected By', 'Request Notes'],
    "Material Received & Used Report": ['Material', 'Project Name', 'Party Name', 'Created By', 'GRN No.', 'Challan Number', 'Entry Type', 'Transfer Project', 'Purchase Done', 'Receiving Date', 'Unit', 'Quantity', 'Unit Price with Tax', 'Total Amount', 'Remark', 'Vehicle Number', 'PO Number', 'PO Quantity', 'PO Date', 'Main Task Name', 'Group Task Name', 'Task Name', 'Equipment Name', 'Equipment No.'],
    "Material Stock Report": ['Project Name', 'Material Category', 'Material Name', 'Unit (truncated - only 1 screenshot captured', 'page title reads \'Material Stock Summary\')'],
    "Unbilled Item Report": ['Project Name', 'Party Name', 'Material', 'Unit', 'Quantity', 'Receiving Date'],
    "PO Summary Report": ['Project Name', 'Creator Name', 'PO Creation Date', 'PO Date', 'Vendor Name', 'PO Number', 'Material', 'Amount', 'Discount', 'Other Charges', 'Tax Amount', 'Total Amount', 'Approval Status', 'Approved or Rejected By'],
    "Material Received without PO": ['Project Name', 'Party Name', 'Created By', 'Receiving Date', 'Unit', 'Quantity'],
    "Purchase Order Item Report": ['PO Date', 'PO Number', 'Project Name', 'Vendor Name', 'Material Category', 'Material Name', 'Unit', 'Unit Price', 'PO Qty', 'PO Received Qty', 'PO Pending Qty', 'Item Status', 'Approval Status', 'MR No.', 'Challan Number', 'GRN No.'],
    "Production Material Report": ['Project Name', 'Production Material', 'Unit', 'Quantity', 'Production Date', 'Raw Material Consumed', 'Notes'],
    "Material Purchase Item Report": ['Party Name', 'Party GST', 'Purchase Date', 'Receiving Date', 'Project Name', 'Material', 'Specification', 'Unit', 'Unit Price', 'Quantity', 'Basic Amount', 'Tax', 'Discount', 'Total Amount', 'Material Category', 'PO Number', 'PO Quantity', 'PO Item Rate', 'PO Date', 'PO Total Amount', 'GRN No.', 'Challan Number', 'Reference No.', 'Remark', 'Created By', 'Vehicle Number', 'Expense Status', 'Due Date', 'Expense Amount', 'Expense Paid Amount', 'Unpaid Expense Amount'],
    "Material Stock Movement Report": ['Project Name', 'Material Name', 'UOM', 'Date', 'Opening Qty', 'Stock In', 'Stock Out', 'Closing Qty'],
    "Attendance & Salary Report": ['Party Name', 'Project Name', 'Designation (truncated - only 1 screenshot captured)'],
    "OT & Shift Report": ['Project Name', 'Party Name', 'Designation (remaining columns not captured - screenshots 6212/6213 show an embedded Zoho Analytics popup window rather than the table)'],
    "Company Attendance": ['Labor / Subcontractor', 'Workforce Type', 'Project Name', '01-Jul-26', '02-Jul-26', '03-Jul-26', '04-Jul-26', '05-Jul-26'],
    "Staff Monthly Salary Slip": ['Employee Code', 'Employee Name', 'Designation', 'Salary Month', 'Basic Salary', 'Allowances', 'Deductions', 'Net Payable', 'Payment Status'],
    "Staff Salary Report": ['Party Name', 'Designation', 'Phone No.', 'Bank Name', 'IFSC Code', 'Account No.', 'Shift', 'OT Hrs', 'Basic/Payable', 'Allowance Amount', 'Late Fine Deduction (additional columns not captured - several screenshots show an embedded Zoho \'salary_payment_report\' popup)'],
    "Staff Punch Report": ['S.NO.', 'PARTY NAME', 'DESIGNATION', 'PUNCH DATE', 'PUNCH IN TIME', 'PUNCH IN LOCATION', 'PUNCH OUT TIME', 'PUNCH OUT LOCATION', 'DURATION', 'PUNCH IN PHOTO VERIFIED', 'PUNCH OUT PHOTO VERIFIED', 'PUNCH IN LOCATION VERIFIED', 'PUNCH OUT LOCATION VERIFIED'],
    "Staff Muster Roll": ['S.NO.', 'Party Code', 'Employee Name', 'Designation', 'Phone No.', 'Bank Account No.', 'Bank Name', 'Salary Type', 'Gross Salary', 'Work Days', 'PL', 'WO', 'Payable Days', 'OT(Hours)', 'Earnings', 'Deductions', 'Net Salary', 'CTC'],
    "Equipment Usage Detail Report": ['Project Name', 'Equipment Name', 'Vehicle No.', 'Ownership Type', 'Party Name', 'Used Date', 'Entry Type', 'Unit', 'Qty', 'Start at', 'Stop at', 'Notes', 'Creator Name'],
    "Fuel Efficiency Report": ['Project Name', 'Equipment Name', 'Vehicle No.', 'Party Name', 'Mileage', 'Eqp Unit', 'Active Days Used', 'Fuel Added', 'Fuel Consumed (Actual)', 'Fuel Consumed (Expected)', 'Fuel Variance'],
    "Daily based Equipment Used Report": ['Project Name', 'Equipment Name', 'Vehicle No.', 'Ownership Type', 'Party Name', 'Measurement Type', 'Usage Unit', 'Date', 'Equipment Used', 'Fuel Added', 'Fuel Adjusted', 'Equipment Reading', 'Remarks', 'Total Trips', 'Total Distance', 'Total Load Carried'],
    "Equipment Expense Summary": ['Equipment Name', 'Vehicle No. (truncated - only 1 screenshot captured, table appeared empty)'],
    "Equipment Trip Report": ['Trip Name', 'Trip Distance', 'Trip Count', 'Load Per Trip', 'Load Unit', 'Total Load', 'Total Distance', 'Created Date'],
    "Asset Allocation Report": ['Asset Code', 'Asset Name', 'Asset Type', 'Assigned To', 'Allocation Type', 'Created by', 'Project Name', 'Assigned Time', 'Assigned Qty', 'Remaining Qty'],
    "Asset Status Report": ['Asset Code', 'Asset Name', 'Asset Type', 'Total Qty', 'Available Qty', 'Assigned Qty', 'In Repair Qty', 'Damaged Qty', 'Asset Value', 'Created by', 'Creation Date', 'Last Assigned To', 'Last Assigned Time'],
    "Sales (GSTR-1)": ['Party Name', 'Party GST', 'Project Name', 'Invoice Type', 'Invoice Date', 'Invoice Number', 'Invoice Amount', 'Tax Amount', 'CGST', 'SGST', 'IGST', 'UTGST', 'Company GST'],
    "Purchase (GSTR-2)": ['Party Name', 'Party Tax No.', 'Project Name', 'Bill Number', 'Expense Type', 'Expense Date', 'Expense Amount', 'Tax Amount', 'CGST', 'SGST', 'IGST', 'UTGST', 'Company Tax No.'],
    "Warehouse Stock Movement Report": ['Material Name', 'Material Category', 'Transaction Date', 'Transaction Type', 'Direction', 'Reference ID', 'Unit', 'Opening Qty', 'Stock Movement', 'Closing Qty', 'Stock Value', 'Avg Purchase Price'],
    "Warehouse Transaction Report": ['Transaction Date', 'Transaction Type', 'Party Name', 'Bill Subtotal', 'Bill GST', 'Bill Discount', 'Bill Additional Charges', 'Total Amount', 'Material Name', 'Description'],
    "Warehouse Current Stock Report": ['Material Name', 'Material Category', 'Unit', 'Opening Stock', 'Total In Quantity', 'Total Out Quantity', 'Current Stock', 'Avg Purchase Price', 'Current Stock Value'],
    "Subcon Workorder Summary Report": ['Project Name', 'Workorder Name', 'Workorder Date', 'Workorder No.', 'Subcontractor Name', 'Estimated Amount', '% Order Complete', 'Work Done Amount', 'Billed Amount', 'Pending Billed', 'Creator Name', 'Created Date'],
    "Subcon Measurement Book": ['Project Name', 'Workorder No.', 'Group', 'Section', 'Item Name', 'Progress Date', 'Unit', 'Estimated Quantity', 'Opening Quantity', 'Number', 'Length', 'Width', 'Height', 'Progress Quantity', 'Closing Quantity', 'Progress Notes'],
    "Subcon Deduction / Retention Report": ['Item Name', 'Amount', 'Project Name', 'Party Name', 'Invoice Number', 'Creator Name', 'Type', 'Entry Creation Date', 'Due Date'],
    "Subcon Material Issue Summary": ['Project Name', 'Subcon Name', 'Material Name', 'Avg Unit Price (truncated - only 1 screenshot captured)'],
    "Project Financial Summary": ['Project Name', 'Project Status', 'Project Health', 'Project Budget', 'Total Expense', 'Budget Remaining', 'Total Sales', 'Project Margin', 'Payment In', 'Payment Out', 'Cash Balance'],
    "Project Operational Summary": ['Project Name', 'Project Category', 'Project Stage', 'Key Personnel', 'Project Status', 'Project Health', 'Start Date', 'End Date', 'Progress', 'Customer Name'],
    "Company Transactions Report": ['Txn Date', 'Txn Type', 'Created Date', 'Creator Name', 'Party Name', 'Cost Code', 'Sub Cost Code', 'Project Name', 'Transaction Category', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Reference No.', 'Notes/Remarks', 'Description', 'Due Date', 'Payment Mode', 'Approval Status'],
    "Monthly P&L Report": ['(No tabular header captured - likely a chart/summary style report)'],
    "Project Activity Leaderboard": ['Project Name', 'Progress Count', 'To Do Count', 'Activity Count (leaderboard-style', 'exact labels partly OCR-garbled)'],
    "Company User Activity Leaderboard": ['Creator Name', 'Role', 'Activity Count', 'Progress Count', 'To Do Count (leaderboard-style', 'exact labels partly OCR-garbled)'],
    "Party Library": ['Party Id', 'Party Name', 'Party Type', 'Bank Name', 'Account Name', 'Account Number', 'IFSC Code', 'Tax No.', 'Billing Address', 'Aadhar Card Number', 'PAN Card Number', 'ESI Number', 'PF Number', 'Father Name', 'Passport No.', 'Passport Expiry Date', 'Joining Date', 'Created Date', 'Creator Name'],
    "Cost Code Library": ['Cost Code', 'Sub Cost Code', 'Created Date (single screenshot, low OCR confidence, likely incomplete)'],
    "Material Library": ['Item Code', 'Material Name', 'Specifications', 'Unit', 'Material Category', 'Created Date', 'Creator Name'],
    "Rate Card Library": ['Description', 'Item Code', 'Cost Code', 'Unit', 'Components', 'Unit Cost Price', 'Markup Amount', 'Markup %', 'Selling Price', 'Created Date', 'Component Count', 'HSN/SAC'],
    "Payroll Library": ['Name', 'Designation', 'Payroll Type', 'CTC', 'Gross Salary', 'Net Salary', 'Shift Hours', 'Salary Breakup', 'Created Date'],
    "Equipment Library": ['Equipment Name', 'Make/Brand', 'Equipment No.', 'Model No.', 'Measurement Type', 'Unit', 'Created Date', 'Ownership Type', 'Expected Mileage', 'Purchase Amount', 'Insurance Policy No.', 'Insurance Provider Name', 'Insurance Start Date', 'Insurance Expiry Date', 'Service Reference No.', 'Last Service Date', 'Next Service Date', 'Fitness Certificate Ref No.', 'Fitness Certificate Status', 'Fitness Certificate Issue Date', 'Fitness Certificate Expiry Date', 'PUCC Reference No.', 'PUCC Start Date', 'PUCC Expiry Date', 'Permit Reference No.', 'Permit Start Date', 'Permit Expiry Date', 'Tax No.', 'Tax Start Date', 'Tax Expiry Date', 'Registration No.', 'Registration Start Date', 'Registration Expiry Date'],
    "BOQ Workorder Summary Report": ['Project Name', 'Workorder Name', 'Workorder No.', 'Client Name', 'Estimated Amount', '% Order Complete', 'Work Done Amount', 'Billed Amount', 'Pending Billed', 'Workorder Date', 'Creator Name', 'Created Date'],
    "BOQ Item Report": ['Project Name', 'BOQ Name', 'BOQ No.', 'Client Name', 'BOQ Date', 'Group', 'Section', 'Item Name', 'Unit', 'Quantity', 'Progress Quantity', 'Billed Qty', 'Unbilled Qty', 'Unit Cost Price', 'Unit Sales Price', 'GST %', 'Amount w/o Tax', 'Total Amount', 'Cost Code'],
    "Quotation Report": ['Quotation Name', 'Quotation Number', 'Client Name', 'Quotation Date', 'Item Count', 'Item Sub Total', 'Discount', 'Additional Charges', 'Tax', 'Total Amount', 'Quotation Status', 'Created Date'],
    "Quotation Item Report": ['Client Name', 'Quotation Name', 'Quotation Status', 'Quotation Date', 'Group', 'Section', 'Item Name', 'Unit', 'Estimated Qty', 'Unit Cost Price', 'Markup', 'Sales Unit Price', 'Total Sales Amount', 'Tax %', 'Total with Tax'],
    "BOQ Measurement Book": ['Project Name', 'Workorder No.', 'Group', 'Section', 'Item Name', 'Progress Date', 'Unit', 'Estimated Quantity', 'Opening Quantity', 'Number', 'Length', 'Width', 'Height', 'Progress Quantity', 'Closing Quantity', 'Progress Notes'],
    "BOQ BOM Report": ['Project Name', 'BOQ Name', 'Item Name', 'Material Name', 'Unit', 'Unit Price', 'Quantity', 'Total Cost Price', 'Creation Date'],
    "Budget vs Actual (Material Cost)": ['Project', 'Material', 'Unit (truncated - only 1 screenshot captured)'],
    "Budget vs Actual (Material Qty)": ['Project', 'Material', 'Unit (truncated - only 1 screenshot captured)'],
    "Budget vs Actual (Cost Code)": ['(Low OCR confidence - page title reads \'Cost Code Budget vs Actual\'', 'likely Budget Amount, Actual Amount, Variance columns but text was too garbled to confirm reliably)'],
    "Payment Upload Template": ['Payment Date', 'Payment Type', 'Party Name', 'Project Name', 'Amount', 'Remark', 'Mode of Payment', 'Company Bank Account Number', 'Category', 'Payment Request ID'],
    "Payroll Upload Template": ['Name', 'Staff Type', 'Shift Hours', 'Day Off', 'Overtime Rate (Per Hour)', 'Designation', 'Cost Code', 'Salary Basis', 'Salary Type', 'CTC', 'Basic', 'Allowance Name (A1)', 'A1 Relation Type', '% of A1 Relation', 'A1 Amount', 'Allowance Name (A2)', 'A2 Relation Type', '% of A2 Relation', 'A2 Amount', 'Allowance Name (A3)', 'A3 Relation Type', '% of A3 Relation', 'A3 Amount', 'Fixed Allowance', 'Gross Salary', 'Deduction Name (D1)', 'D1 Relation Type', '% of D1 Relation', 'D1 Amount', 'Deduction Name (D2)', 'D2 Relation Type', '% of D2 Relation', 'D2 Amount', 'Net Amount', 'Projects'],
    "Daily Progress Report": ['Project Name', 'DPR Date', 'Main Task Name', 'Group Task Name', 'Task Name', 'Unit', 'Progress Qty', 'Estimated Qty', 'Workers Count', 'Material Used', 'Equipment Used']
  };;;

  const handleReportClick = (report: ReportItem) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const triggerDownload = async () => {
    if (!selectedReport) return;
    const slug = selectedReport.viewSlug;
    if (!slug) return;
    setIsExporting(true);

    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${getApiHost()}/apis/v3/reports/data/${slug}?company_id=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const rows: Record<string, any>[] = data.rows || [];
      const headers = exportSchemas[selectedReport.name] || (rows[0] ? Object.keys(rows[0]) : ["S.No.", "Date", "Project Name", "Details", "Amount (INR)", "Status"]);

      const csvContent = [
        headers.join(","),
        ...rows.map(r => headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const cleanFileName = selectedReport.name.toLowerCase().replace(/[^a-z0-9]/g, "_") + ".csv";
      link.setAttribute("download", cleanFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`Exported ${selectedReport.name} successfully!`);
    } catch {
      showToast("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setShowModal(false);
    }
  };


  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <PageHeader title="Company Reports Hub" />

        <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-elevated/20">
          
          {/* Filter & Search Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border-custom">
            <div>
              <p className="text-xs text-muted">Generate, filter, and export tabular company reports in Microsoft Excel or PDF format.</p>
            </div>
            <div className="relative w-full md:w-80 shrink-0">
              <input
                type="text"
                placeholder="Search report names..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-sidebar border border-border-custom rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary transition-all"
              />
              <span className="absolute left-3 top-2.5 text-muted text-sm">🔍</span>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => {
              const filteredReports = category.reports.filter(r =>
                r.name.toLowerCase().includes(searchQuery.toLowerCase())
              );

              if (filteredReports.length === 0) return null;

              return (
                <div key={category.title} className="bg-card border border-border-custom rounded-xl p-5 flex flex-col justify-between transition-all hover:border-border-custom/80 hover:shadow-md">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-base">{category.icon}</span>
                      <h3 className="text-sm font-bold text-foreground">{category.title}</h3>
                    </div>

                    <div className="space-y-1.5">
                      {filteredReports.map((report) => {
                        const handleClick = () => {
                          if (report.hasView && report.viewSlug) {
                            router.push(`/c/${companyId}/reports/${report.viewSlug}`);
                          } else if (report.hasDownload) {
                            setSelectedReport(report);
                            setShowModal(true);
                          }
                        };

                        return (
                          <div
                            key={report.name}
                            onClick={handleClick}
                            className="group flex items-center justify-between p-2 rounded-lg hover:bg-elevated cursor-pointer transition-all"
                          >
                            <span className="text-xs text-muted group-hover:text-foreground transition-colors truncate max-w-[70%]">
                              {report.name}
                            </span>
                            <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                              {/* Download icon — only if hasDownload */}
                              {report.hasDownload && (
                                <button
                                  onClick={() => { setSelectedReport(report); setShowModal(true); }}
                                  className="text-muted hover:text-[#FF8A00] transition-colors text-sm"
                                  title="Download Report"
                                >
                                  ⬇️
                                </button>
                              )}
                              {/* Eye/View icon — only if hasView */}
                              {report.hasView && report.viewSlug && (
                                <Link
                                  href={`/c/${companyId}/reports/${report.viewSlug}`}
                                  className="text-muted hover:text-primary transition-colors text-sm"
                                  title="View Report"
                                >
                                  👁️
                                </Link>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Download Modal */}
        {showModal && selectedReport && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <div className="bg-card border border-border-custom rounded-xl w-full max-w-md p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              
              <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-muted hover:text-foreground text-lg">✕</button>

              <div className="flex flex-col items-center text-center mt-2">
                <span className="text-muted text-[10px] font-bold uppercase tracking-wider mb-1">Company Level Report</span>
                <h3 className="text-sm font-bold text-foreground mb-4">{selectedReport.name}</h3>
              </div>

              <div className="space-y-4 my-5">
                
                {/* PDF Special Input Fields */}
                {selectedReport.name === "Staff Monthly Salary Slip" || selectedReport.name === "Staff Salary Report" ? (
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search employee by name..."
                        value={partyNameFilter}
                        onChange={e => setPartyNameFilter(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                      />
                      <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
                    </div>
                  </div>
                ) : null}

                {/* Date Slider Selector */}
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Report Period</label>
                  <div className="flex items-center justify-between bg-background border border-border-custom rounded-lg p-1">
                    <button
                      onClick={() => shiftMonth("prev")}
                      className="px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-elevated rounded-md transition-all"
                    >
                      ◀
                    </button>
                    <span className="text-xs font-semibold text-white">{selectedMonth}</span>
                    <button
                      onClick={() => shiftMonth("next")}
                      className="px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-elevated rounded-md transition-all"
                    >
                      ▶
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={triggerDownload}
                  disabled={isExporting}
                  className={`w-full py-2.5 rounded-lg text-white text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                    isExporting
                      ? "bg-muted cursor-not-allowed"
                      : selectedReport.name === "Staff Monthly Salary Slip" || selectedReport.name === "Staff Salary Report"
                      ? "bg-primary hover:bg-primary/90"
                      : "bg-[#FF8A00] hover:bg-[#E07A00]"
                  }`}
                >
                  {isExporting ? (
                    <>
                      <span className="animate-spin text-sm">⏳</span> Exporting file...
                    </>
                  ) : selectedReport.name === "Staff Monthly Salary Slip" || selectedReport.name === "Staff Salary Report" ? (
                    "Download PDF 📄"
                  ) : (
                    "Download Excel 📥"
                  )}
                </button>
                <button onClick={() => setShowModal(false)} className="w-full py-2 text-xs text-muted hover:text-foreground transition-all">Cancel</button>
              </div>

              {/* Decorative background blur */}
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-gradient-to-tr from-primary/10 to-transparent rounded-full blur-xl pointer-events-none"></div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
