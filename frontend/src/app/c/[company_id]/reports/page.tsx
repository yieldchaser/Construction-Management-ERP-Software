"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

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

  const triggerDownload = () => {
    if (!selectedReport) return;
    setIsExporting(true);

    setTimeout(() => {
      const reportName = selectedReport.name;
      const headers = exportSchemas[reportName] || ["S.No.", "Date", "Project Name", "Details", "Amount (INR)", "Status"];
      
      // Seed high-fidelity sample records based on report headers
      let mockRows: string[][] = [];
      if (reportName === "Company Expense Report") {
        mockRows = [
          ["1", "01-Jul-2026", "Material Purchase", "Metro Terminal", "Anil Steels", "Purchase of Grade-A rebars", "C-102", "Paid", "53100", "53100", "53100", "0", "10-Jul-2026", "Approved"],
          ["2", "03-Jul-2026", "Labour Payroll", "Metro Terminal", "Sanjay Yadav", "Supervisor allowance", "C-405", "Unpaid", "8000", "8000", "0", "8000", "15-Jul-2026", "Pending Review"]
        ];
      } else if (reportName === "Company Sales Report") {
        mockRows = [
          ["02-Jul-2026", "L&T Construction", "INV-2026-081", "118000", "18000", "100000", "0", "15-Aug-2026", "Yash Desai", "Metro Terminal"],
          ["05-Jul-2026", "National Highways", "INV-2026-082", "500000", "50000", "450000", "450000", "31-Aug-2026", "Anand T", "Bypass Highway"]
        ];
      } else if (reportName === "Sales (GSTR-1)") {
        mockRows = [
          ["27AAAAA1111A1Z1", "L&T Construction", "Maharashtra", "INV-2026-081", "118000", "2026-07-02", "100000", "18%", "9000", "9000", "0", "18000"]
        ];
      } else if (reportName === "Sales Deduction / Retention Report") {
        mockRows = [
          ["Retention Fee", "50000", "Metro Terminal", "L&T Civil", "INV-2026-081", "Yash Desai", "Retention", "02-Jul-2026", "15-Aug-2026"],
          ["TDS Deduction", "10000", "Bypass Highway Flyover", "National Highway Authority", "INV-2026-082", "Anand T", "Deduction", "05-Jul-2026", "31-Aug-2026"]
        ];
      } else if (reportName === "Company Payments") {
        mockRows = [
          ["01-Jul-2026", "Metro Terminal", "Yash Desai", "Sanjay Yadav", "8000", "Yash Desai", "Salary", "Supervisor Shift", "Cash", "Advance for supervisor"],
          ["05-Jul-2026", "Metro Terminal", "Yash Desai", "Anil Steels", "53100", "Yash Desai", "Material", "Steel Supplier", "Bank Transfer", "Steel settlement"]
        ];
      } else if (reportName === "Project Wise Payment Summary") {
        mockRows = [
          ["Metro Terminal (Phase 2)", "120000", "450000", "32000", "18000", "250000", "1200000", "870000", "870000", "1200000", "330000", "27.5%", "330000"],
          ["Bypass Highway Flyover", "85000", "120000", "15000", "9000", "0", "500000", "229000", "229000", "500000", "271000", "54.2%", "271000"]
        ];
      } else if (reportName === "Staff Muster Roll") {
        mockRows = [
          ["1", "PRT-101", "Yash Desai", "Engineer", "9876543210", "12345678901", "SBI", "Monthly", "60000", "26", "2", "4", "30", "5", "60000", "3000", "57000", "60000"],
          ["2", "PRT-102", "Ramesh Kumar", "Mason", "9876543211", "98765432101", "HDFC", "Daily", "22000", "22", "1", "4", "27", "12", "22000", "1500", "20500", "22000"]
        ];
      } else if (reportName === "Staff Punch Report") {
        mockRows = [
          ["1", "Yash Desai", "Engineer", "2026-07-01", "09:00:00", "Metro Terminal Entrance", "18:00:00", "Metro Terminal Exit", "9h 0m", "Yes", "Yes", "Yes", "Yes"],
          ["2", "Ramesh Kumar", "Mason", "2026-07-01", "08:45:00", "Metro Terminal Gate 2", "17:45:00", "Metro Terminal Gate 2", "9h 0m", "Yes", "Yes", "Yes", "Yes"]
        ];
      } else if (reportName === "Company Attendance") {
        mockRows = [
          ["Yash Desai", "Staff", "Metro Terminal", "P", "P", "P", "P", "P"],
          ["Ramesh Kumar", "Mason", "Metro Terminal", "P", "P", "A", "P", "P"]
        ];
      } else if (reportName === "Staff Monthly Salary Slip") {
        mockRows = [
          ["EMP-001", "Yash Desai", "Engineer", "Jul-2026", "40000", "20000", "3000", "57000", "Paid"],
          ["EMP-002", "Ramesh Kumar", "Mason", "Jul-2026", "15000", "7000", "1500", "20500", "Paid"]
        ];
      } else if (reportName === "BOQ Workorder Summary Report") {
        mockRows = [
          ["Metro Terminal Phase 2", "L&T Civil Division", "Excavation and Superstructure", "WO-001", "15-Jun-2026", "1200000", "780000", "900000", "65%"],
          ["Flyover Bypass", "National Highway Authority", "Bridge Deck Construction", "WO-002", "28-Jun-2026", "2500000", "1000000", "1100000", "40%"]
        ];
      } else if (reportName === "BOQ Item Report") {
        mockRows = [
          ["Metro Terminal", "Excavation and Raft", "WO-ARCH-001", "L&T Civil", "15-May-2026", "Raft Slab Concrete", "m³", "500", "320", "180"],
          ["Metro Terminal", "Pillar Reinforcement", "WO-ARCH-002", "L&T Civil", "20-May-2026", "Column Casting", "m³", "200", "120", "80"]
        ];
      } else if (reportName === "Equipment Usage Detail Report") {
        mockRows = [
          ["Metro Terminal", "Excavator JCB-3DX", "MH-14-EX-4512", "Anil Steels", "150", "Hours", "12", "45", "50"],
          ["Metro Terminal", "Transit Mixer TM-10", "MH-14-MX-8891", "Yash Desai", "80", "Hours", "8", "30", "30"]
        ];
      } else if (reportName === "CRM Lead Detail Report") {
        mockRows = [
          ["05-Jul-2026", "Anujuman Infrastructure", "Ravi Kumar", "0882816316", "ravi@anujuman.com", "Anujuman Builders", "5000000", "Negotiation", "High", "Facebook", "Commercial", "15-Jul-2026", "05-Jul-2026", "31-Aug-2026", "Interested in Phase 2", "Yash Desai"],
          ["05-Jul-2026", "Highway Project Lead", "Priya Sharma", "7628371919", "priya@highway.in", "National Roads Corp", "12000000", "New Lead", "Medium", "Reference", "Infrastructure", "20-Jul-2026", "05-Jul-2026", "30-Sep-2026", "Initial inquiry", "Anand T"]
        ];
      } else if (reportName === "Material Request Item Report") {
        mockRows = [
          ["2026-07-04", "REQ-001", "Metro Terminal", "Cement OPC 53", "Grade A", "bags", "500", "500", "0", "PO-0091", "Yash Desai", "Approved", "Yash Desai", "Urgent - required before 10th"],
          ["2026-07-05", "REQ-002", "Metro Terminal", "Fine Sand", "High density", "m³", "100", "80", "20", "", "Ramesh Kumar", "Pending", "", "For plastering work"]
        ];
      } else if (reportName === "Project Operational Summary") {
        mockRows = [
          ["Metro Terminal", "Commercial Complex", "Suresh R (PM)", "Ongoing", "Healthy", "2026-01-10", "2026-12-31", "65%"],
          ["Bypass Highway Flyover", "Infrastructure", "Anand T (PE)", "Ongoing", "Healthy", "2026-03-01", "2027-06-30", "42%"]
        ];
      } else if (reportName === "Daily based Equipment Used Report") {
        mockRows = [
          ["Metro Terminal", "Excavator JCB-3DX", "MH-14-EX-4512", "Anil Steels", "12", "Hours", "12", "45", "50", "5"],
          ["Metro Terminal", "Transit Mixer TM-10", "MH-14-MX-8891", "Yash Desai", "8", "Hours", "8", "30", "30", "0"]
        ];
      } else if (reportName === "OT & Shift Report") {
        mockRows = [
          ["Metro Terminal", "L&T Civil Division", "Yash Desai", "2026-07-01", "25", "25", "10"],
          ["Metro Terminal", "Sanjay Yadav Subcontractor", "Ramesh Kumar", "2026-07-02", "18", "18", "5"]
        ];
      } else if (reportName === "Payment Upload Template") {
        mockRows = [
          ["19-Jan-2026", "Out", "Abhijit", "Project-Vikroli", "5000", "For dec month salary", "Cash", "", "Salary", "1c050f4e-5f4a-4d47-ac53-0efefd921dc2"],
          ["19-Jan-2026", "Out", "Akash Panwar", "July_2025 Project Test", "4000", "For dec month salary", "Cheque", "54909090", "Salary", "8df95ec3-59a9-4c80-a2e7-1890eb743fa3"],
          ["19-Jan-2026", "In", "Aishwarya", "July_2025 Project Test", "8000", "Bill", "Bank Transfer", "54909090", "Material", ""]
        ];
      } else if (reportName === "Payroll Upload Template") {
        mockRows = [
          ["Payrole-05", "Office", "8", "Sat,Sun", "100", "Engineer", "C-102", "Punch", "Monthly", "60000", "40000", "Allowance 1", "fixed", "100", "5000", "Allowance 2", "fixed", "100", "5000", "Allowance 3", "fixed", "100", "5000", "5000", "60000", "Deduction 1", "fixed", "100", "1500", "Deduction 2", "fixed", "100", "1500", "57000", "Metro Terminal"],
          ["Payrole-06", "Site", "7", "Sun", "600", "Mason", "C-405", "shift", "Daily", "22000", "15000", "", "", "", "", "", "", "", "", "", "", "", "", "", "22000", "", "", "", "", "", "", "", "", "22000", "Metro Terminal"]
        ];
      } else if (reportName === "Purchase (GSTR-2)") {
        mockRows = [
          ["27BBBBB2222B2Z2", "Anil Steels", "Maharashtra", "BILL-2026-905", "53100", "2026-07-01", "45000", "18%", "4050", "4050", "0", "8100"]
        ];
      } else if (reportName === "All Expense Deduction / Retention Report") {
        mockRows = [
          ["2026-07-01", "Deduction", "Safety Helmet", "12000", "EXP-091", "Consumables", "Metro Terminal", "Anil Steels", "Yash Desai", "2026-07-15"],
          ["2026-07-02", "Retention", "Site Stationery", "1500", "EXP-092", "Office Expense", "Metro Terminal", "Anil Steels", "Yash Desai", "2026-07-20"]
        ];
      } else if (reportName === "Party Ledger") {
        mockRows = [
          ["Anil Steels", "Supplier", "Metro Terminal", "Yash Desai", "Material Supply Rebar", "C-102", "Purchase", "2026-07-01", "0", "45000", "45000"],
          ["Anil Steels", "Supplier", "Metro Terminal", "Yash Desai", "UPI Payment Settlement", "C-102", "Payment", "2026-07-05", "45000", "0", "0"]
        ];
      } else if (reportName === "All Party Balances") {
        mockRows = [
          ["Anil Steels", "Supplier", "45000", "Debit", "0", "0"],
          ["Sanjay Yadav", "Labour Contractor", "12000", "Credit", "0", "5000"]
        ];
      } else if (reportName === "Project level Party Balance Report") {
        mockRows = [
          ["Anil Steels", "Supplier", "Metro Terminal", "0", "53100", "1200", "0", "500", "0", "0", "0", "0", "0", "0", "0", "53100", "53100", "0", "Settled"],
          ["Sanjay Yadav", "Labour Contractor", "Metro Terminal", "8000", "0", "0", "25000", "0", "0", "0", "0", "5000", "0", "0", "0", "28000", "28000", "5000", "Credit"]
        ];
      } else if (reportName === "Subcon Workorder Summary Report") {
        mockRows = [
          ["Metro Terminal", "Sanjay Yadav Contractor", "Excavation Work", "WO-SUB-001", "500000", "175000", "150000", "35%"],
          ["Metro Terminal", "Super Plumbing Corp", "Plumbing Installation", "WO-SUB-002", "350000", "35000", "30000", "10%"]
        ];
      } else if (reportName === "Subcon Measurement Book") {
        mockRows = [
          ["WO-PLUMB-01", "Plumbing", "Section B", "Drain pipe laying", "2026-07-02", "m", "150", "0", "5", "6", "1", "1", "30", "120"]
        ];
      } else if (reportName === "Subcon Deduction / Retention Report") {
        mockRows = [
          ["5000", "Metro Terminal", "Sanjay Yadav", "INV-WO-012", "Yash Desai", "Retention", "2026-07-01"]
        ];
      } else if (reportName === "Subcon Material Issue Summary") {
        mockRows = [
          ["Metro Terminal", "Sanjay Yadav", "TMT Rebars 12mm", "65", "1200", "78000"]
        ];
      } else if (reportName === "Project Financial Summary") {
        mockRows = [
          ["Metro Terminal", "Ongoing", "Healthy", "12000000", "8700000", "3300000", "15000000", "42%", "11000000", "8700000", "2300000"]
        ];
      } else if (reportName === "Company Transactions Report") {
        mockRows = [
          ["Metro Terminal", "Expense", "Material Purchase", "2026-07-01", "Yash Desai", "Anil Steels", "C-102", "M-SUB-01", "45000", "45000", "45000", "0", "TXN-00192", "Grade A rebars", "Rebars batch 1", "2026-07-10", "Bank Transfer", "Approved"]
        ];
      } else if (reportName === "Project Activity Leaderboard") {
        mockRows = [
          ["Metro Terminal", "65", "12", "120"],
          ["Bypass Highway Flyover", "42", "28", "95"]
        ];
      } else if (reportName === "Company User Activity Leaderboard") {
        mockRows = [
          ["Yash Desai", "Project Manager", "320", "145", "42"],
          ["Anand T", "Project Engineer", "210", "98", "19"]
        ];
      } else if (reportName === "Party Library") {
        mockRows = [
          ["PRT-091", "Anil Steels", "Supplier", "SBI", "Anil Steel Corp", "9090909090", "SBIN0001234", "27AAAAA1111A1Z1", "Mumbai Rebar Yard 5", "aadhaar-none", "PAN-ANIL-99", "ESI-none", "PF-none", "N/A", "N/A", "N/A", "2026-01-01", "2026-01-01", "Yash Desai"]
        ];
      } else if (reportName === "Cost Code Library") {
        mockRows = [
          ["C-102", "Material Purchase - Concrete & Steel", "2026-01-01"],
          ["C-405", "Labour Payroll - Site Supervisor", "2026-01-01"]
        ];
      } else if (reportName === "Material Library") {
        mockRows = [
          ["M-SUB-01", "OPC Cement 53 Grade", "Cement", "Standard specifications", "bags", "2026-01-01", "Yash Desai"]
        ];
      } else if (reportName === "Rate Card Library") {
        mockRows = [
          ["RC-012", "Raft Slab Concrete Work", "Standard rafting task", "C-102", "m³", "Cement, Sand, Labour", "3500", "500", "14%", "4000", "2026-01-10", "3", "9905-Civil"]
        ];
      } else if (reportName === "Payroll Library") {
        mockRows = [
          ["Ramesh Kumar", "Mason", "Wages", "Monthly", "18000", "16800", "16800", "8", "Basic: 12000, Allowances: 4800", "2026-06-15"],
          ["Suresh Ram", "Labourer", "Wages", "Daily", "15000", "13375", "13375", "8", "Basic: 10000, Allowances: 3375", "2026-06-15"]
        ];
      } else if (reportName === "Task Resource Budget Vs Actual Report") {
        mockRows = [
          ["Metro Terminal", "Excavation & Raft", "Substructure", "Raft Slab Concrete", "m³", "500", "320", "OPC Cement 53", "Material", "400", "420", "bags", "3", "1500", "960", "1000", "600000", "384000", "420000", "40", "16000"]
        ];
      } else if (reportName === "Site Inspection Report") {
        mockRows = [
          ["Metro Terminal", "2026-07-02", "Foundation QC Check", "Passed", "5 Checked", "All structural parameters compliant", "2026-07-02"]
        ];
      } else if (reportName === "Task BOQ Billed & Unbilled Qty Report") {
        mockRows = [
          ["Metro Terminal", "Excavation & Raft", "Substructure", "Raft Concrete", "m³", "500", "320", "64%", "Active", "BOQ-SEC-1", "300", "20"]
        ];
      } else if (reportName === "Task Report") {
        mockRows = [
          ["Metro Terminal", "Excavation & Raft", "Substructure", "Raft Slab Concrete", "Yash Desai", "In Progress", "On Track", "01-Feb-2026", "28-Feb-2026", "m³", "Foundation"],
          ["Metro Terminal", "Superstructure", "Column Work", "Ground Floor Columns", "Ramesh Kumar", "Not Started", "Delayed", "04-Feb-2026", "04-Feb-2026", "%", "-"]
        ];
      } else if (reportName === "Task Material Report") {
        mockRows = [
          ["Metro Terminal", "OPC Cement 53", "Excavation & Raft", "Substructure", "Raft Slab Concrete", "500", "380", "152000"],
          ["Metro Terminal", "TMT Rebars 12mm", "Superstructure", "Column Work", "Ground Floor Columns", "1200", "65", "78000"]
        ];
      } else if (reportName === "To Do Report") {
        mockRows = [
          ["05-Jul-2026", "10-Jul-2026", "05-Jul-2026", "Yash Desai", "Task", "Raft Slab Concrete", "Yash Desai", ""],
          ["04-Jul-2026", "08-Jul-2026", "05-Jul-2026", "Ramesh Kumar", "General", "", "Yash Desai", ""]
        ];
      } else if (reportName === "Project Payment Report") {
        mockRows = [
          ["01-Jul-2026", "Metro Terminal", "Yash Desai", "Anil Steels", "53100", "0", "53100", "Material bill settlement", "PMT-002", "Out", "Bank Transfer", "HDFC-Main", "Material", "C-102", "M-SUB-01", "01-Jul-2026", "Approved"],
          ["05-Jul-2026", "Metro Terminal", "Yash Desai", "Sanjay Yadav", "8000", "0", "8000", "Salary advance July", "PMT-001", "Out", "Cash", "Site Cash", "Salary", "C-405", "", "05-Jul-2026", "Approved"]
        ];
      } else if (reportName === "Payment Request Report") {
        mockRows = [
          ["c79160e2-2457-4fb7-8564-1ad1d5b27f47", "PR-1", "Prestige Developers", "Yash Desai", "234534", "05-Jul-2026", "31-Jul-2026", "Yash Desai", "Subcon Expense", "", "Auto Approved", "Unpaid", "", "HDFC-Main"],
          ["c79160e2-2457-4fb7-8564-1ad1d5b27f48", "PR-2", "Metro Terminal", "Sanjay Yadav", "50000", "06-Jul-2026", "15-Jul-2026", "Yash Desai", "Labour Payroll", "WO-SUB-001", "Pending", "Unpaid", "Salary Advance", ""]
        ];
      } else if (reportName === "Cost Code Expense Analysis") {
        mockRows = [
          ["Civil - Concrete Work", "450000", "500000", "480000"],
          ["Finishing - Plastering", "120000", "150000", "150000"],
          ["Electrical - Wiring", "85000", "100000", "90000"]
        ];
      } else if (reportName === "Project Wise Expense Summary") {
        mockRows = [
          ["Metro Terminal", "500000", "480000", "250000", "240000", "120000", "120000", "30000", "30000", "18000", "18000", "0", "0", "-5000", "-5000", "10000", "10000", "0", "0", "50000", "50000", "973000", "943000", "900000", "43000"],
          ["Bypass Highway Flyover", "350000", "340000", "180000", "175000", "85000", "85000", "15000", "15000", "9000", "9000", "0", "0", "0", "0", "0", "0", "0", "0", "30000", "30000", "669000", "654000", "600000", "54000"]
        ];
      } else if (reportName === "Material Received & Used Report") {
        mockRows = [
          ["Cement", "Cement OPC 53", "Metro Terminal", "Anil Steels", "Yash Desai", "GRN-098", "CH-4521", "Direct Purchase", "", "Yes", "2026-07-01", "bags", "500", "380", "190000", "Delivered in full", "MH-14-EX-4512", "PO-0091", "500", "2026-06-30", "Excavation & Raft", "Substructure", "Raft Slab Concrete", "", ""],
          ["Steel", "TMT Rebars 12mm", "Metro Terminal", "Anil Steels", "Yash Desai", "GRN-099", "CH-4522", "Direct Purchase", "", "Yes", "2026-07-02", "tons", "15", "65000", "975000", "", "MH-14-EX-4512", "PO-0092", "15", "2026-06-30", "Superstructure", "Column Work", "Ground Floor Columns", "", ""]
        ];
      } else if (reportName === "Material Stock Report") {
        mockRows = [
          ["Metro Terminal", "Cement", "Cement OPC 53", "bags", "100", "38000", "1000", "380000", "500", "190000", "300", "114000", "200", "76000"],
          ["Metro Terminal", "Steel", "TMT Rebars 12mm", "tons", "0", "0", "50", "3250000", "15", "975000", "10", "650000", "5", "325000"]
        ];
      } else if (reportName === "Unbilled Item Report") {
        mockRows = [
          ["Metro Terminal", "Anil Steels", "Cement OPC 53", "bags", "500", "2026-07-01"],
          ["Metro Terminal", "Sanjay Yadav", "Fine Sand", "m³", "100", "2026-07-02"]
        ];
      } else if (reportName === "PO Summary Report") {
        mockRows = [
          ["Metro Terminal", "Yash Desai", "2026-06-30", "2026-07-01", "Anil Steels", "PO-0091", "190000", "5000", "1200", "34200", "220400", "Approved", "Yash Desai"],
          ["Metro Terminal", "Yash Desai", "2026-06-30", "2026-07-02", "Anil Steels", "PO-0092", "975000", "25000", "5000", "171000", "1126000", "Approved", "Yash Desai"]
        ];
      } else if (reportName === "Material Received without PO") {
        mockRows = [
          ["Cement OPC 53", "Metro Terminal", "Anil Steels", "Yash Desai", "2026-07-01", "bags", "500"],
          ["Fine Sand", "Metro Terminal", "Sanjay Yadav", "Yash Desai", "2026-07-02", "m³", "100"]
        ];
      } else if (reportName === "Purchase Order Item Report") {
        mockRows = [
          ["2026-07-01", "PO-0091", "Metro Terminal", "Anil Steels", "Cement", "Cement OPC 53", "bags", "380", "500", "500", "0", "Closed", "Approved", "REQ-001", "CH-4521", "GRN-098"],
          ["2026-07-02", "PO-0092", "Metro Terminal", "Anil Steels", "Steel", "TMT Rebars 12mm", "tons", "65000", "15", "15", "0", "Closed", "Approved", "REQ-002", "CH-4522", "GRN-099"]
        ];
      } else if (reportName === "Production Material Report") {
        mockRows = [
          ["Metro Terminal", "Concrete M25", "m³", "50", "2026-07-04", "Cement: 150 bags, Fine Sand: 30 m³, Coarse Aggregate: 60 m³", "Batching completed for raft"],
          ["Metro Terminal", "Concrete M20", "m³", "20", "2026-07-05", "Cement: 55 bags, Fine Sand: 12 m³, Coarse Aggregate: 24 m³", "Batching for columns"]
        ];
      } else if (reportName === "Material Purchase Item Report") {
        mockRows = [
          ["Anil Steels", "27AAAAA1111A1Z1", "2026-07-04", "2026-07-01", "Metro Terminal", "Cement OPC 53", "Grade A", "bags", "380", "500", "190000", "34200", "5000", "219200", "Cement", "PO-0091", "500", "380", "2026-06-30", "220400", "GRN-098", "CH-4521", "REF-4521", "Delivered in full", "Yash Desai", "MH-14-EX-4512", "Paid", "2026-08-04", "219200", "219200", "0"],
          ["Anil Steels", "27AAAAA1111A1Z1", "2026-07-05", "2026-07-02", "Metro Terminal", "TMT Rebars 12mm", "", "tons", "65000", "15", "975000", "171000", "25000", "1121000", "Steel", "PO-0092", "15", "65000", "2026-06-30", "1126000", "GRN-099", "CH-4522", "REF-4522", "", "Yash Desai", "MH-14-EX-4512", "Partially Paid", "2026-08-05", "1121000", "500000", "621000"]
        ];
      } else if (reportName === "Material Stock Movement Report") {
        mockRows = [
          ["Metro Terminal", "Cement OPC 53", "bags", "2026-07-04", "0", "500", "300", "200"],
          ["Metro Terminal", "TMT Rebars 12mm", "tons", "2026-07-05", "0", "15", "10", "5"]
        ];
      } else if (reportName === "Attendance & Salary Report" || reportName === "Staff Salary Report") {
        mockRows = [
          ["Ramesh Kumar", "Mason", "9876543210", "State Bank of India", "SBIN0001234", "12345678901", "26", "10", "15600", "500", "900", "0", "200", "16800"],
          ["Suresh Ram", "Labourer", "9876543211", "HDFC Bank", "HDFC0000123", "98765432101", "24", "15", "12000", "300", "1125", "50", "0", "13375"]
        ];
      } else if (reportName === "Equipment Library") {
        mockRows = [
          [
            "JCB Excavator 3DX", "JCB", "EQ-001", "3DX", "Hours", "hr", "2026-06-15", "Owned", 
            "12", "3500000", "INS-9921", "ICICI Lombard", "2026-06-15", "2027-06-14", "SRV-8821", "2026-06-15", 
            "2026-12-15", "FC-4521", "2026-06-15", "FINS-4521", "2027-06-14", "PUCC-7712", "2026-06-15", 
            "2026-12-14", "PRM-6612", "2026-06-15", "2027-06-14", "TAX-5512", "2026-06-15", "2027-06-14", 
            "MH-14-EX-4512", "2026-06-15", "2031-06-14"
          ]
        ];
      } else if (reportName === "Quotation Report") {
        mockRows = [
          ["2026-07-01", "Villa Construction", "QTN-001", "Prestige Developers", "12", "1200000", "50000", "12000", "207000", "1369000", "Approved", "2026-07-01"],
          ["2026-07-03", "Office Fitout", "QTN-002", "Metro Terminal", "8", "450000", "15000", "5000", "79200", "519200", "Pending", "2026-07-03"]
        ];
      } else if (reportName === "Quotation Item Report") {
        mockRows = [
          ["Prestige Developers", "Villa Construction", "Approved", "2026-07-01", "Substructure", "Excavation", "Soil Excavation", "m³", "500", "200", "50", "250", "125000", "18", "147500"],
          ["Prestige Developers", "Villa Construction", "Approved", "2026-07-01", "Substructure", "Concrete", "Raft Slab Concrete", "m³", "120", "4500", "500", "5000", "600000", "18", "708000"]
        ];
      } else if (reportName === "BOQ Measurement Book") {
        mockRows = [
          ["Metro Terminal", "WO-001", "Substructure", "Excavation", "Soil Excavation", "2026-07-01", "m³", "500", "0", "1", "50", "10", "1", "500", "500", "Initial excavation done"],
          ["Metro Terminal", "WO-001", "Substructure", "Concrete", "Raft Slab Concrete", "2026-07-04", "m³", "120", "0", "1", "30", "4", "1", "120", "120", "Raft concrete poured"]
        ];
      } else if (reportName === "BOQ BOM Report") {
        mockRows = [
          ["Metro Terminal", "Villa BOQ", "Raft Slab Concrete", "OPC Cement 53", "bags", "380", "500", "190000", "2026-06-15"],
          ["Metro Terminal", "Villa BOQ", "Raft Slab Concrete", "TMT Rebars 12mm", "tons", "65000", "15", "975000", "2026-06-15"]
        ];
      } else if (reportName === "Budget vs Actual (Material Cost)") {
        mockRows = [
          ["Metro Terminal", "Cement OPC 53", "bags", "600000", "420000", "180000"],
          ["Metro Terminal", "TMT Rebars 12mm", "tons", "975000", "1121000", "-146000"]
        ];
      } else if (reportName === "Budget vs Actual (Material Qty)") {
        mockRows = [
          ["Metro Terminal", "Cement OPC 53", "bags", "1500", "1000", "500"],
          ["Metro Terminal", "TMT Rebars 12mm", "tons", "15", "17", "-2"]
        ];
      } else if (reportName === "Budget vs Actual (Cost Code)") {
        mockRows = [
          ["Civil - Concrete Work", "500000", "450000", "480000", "-30000"],
          ["Finishing - Plastering", "150000", "120000", "120000", "0"]
        ];
      } else if (reportName === "Task Revenue & Expense Report") {
        mockRows = [
          ["Metro Terminal", "Excavation & Raft", "Substructure", "Raft Slab Concrete", "64% m³", "250000", "180000"],
          ["Metro Terminal", "Superstructure", "Column Work", "Ground Floor Columns", "0% %", "0", "0"]
        ];
      } else if (reportName === "Asset Allocation Report") {
        mockRows = [
          ["JCB Excavator 3DX", "Heavy Machinery", "Sanjay Yadav", "Project Allocation", "Yash Desai", "Metro Terminal", "2026-07-01 09:00", "1", "0"],
          ["Concrete Mixer 200L", "Equipment", "Ramesh Kumar", "Temporary Use", "Yash Desai", "Metro Terminal", "2026-07-02 10:30", "1", "1"]
        ];
      } else if (reportName === "Asset Status Report") {
        mockRows = [
          ["JCB Excavator 3DX", "Heavy Machinery", "2", "1", "1", "0", "0", "3500000", "Yash Desai", "2026-06-15", "Sanjay Yadav", "2026-07-01 09:00"],
          ["Concrete Mixer 200L", "Equipment", "5", "3", "1", "1", "0", "85000", "Yash Desai", "2026-06-18", "Ramesh Kumar", "2026-07-02 10:30"]
        ];
      } else {
        mockRows = [
          ["1", "2026-07-04", "Metro Terminal", `Sample transaction for ${reportName}`, "15000", "Active"]
        ];
      }

      // Compose CSV tabular text
      const csvContent = [
        headers.join(","),
        ...mockRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
      ].join("
");

      // Generate Blob and trigger virtual download element
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      const cleanFileName = reportName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + selectedMonth.toLowerCase().replace(" ", "_") + ".csv";
      link.setAttribute("download", cleanFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      setShowModal(false);
      showToast(`Exported ${reportName} for ${selectedMonth} successfully!`);
    }, 1200);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar onShowToast={showToast} />

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
