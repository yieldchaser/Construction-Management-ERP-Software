"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

// Comprehensive metadata configurations for all 70+ reports
interface FilterConfig {
  label: string;
  type: "select" | "date";
  options?: string[];
}

interface ReportMeta {
  title: string;
  hasDownload: boolean;
  filters: FilterConfig[];
  columns: string[];
}

const REPORT_METADATA: Record<string, ReportMeta> = {
  "company-sales": {
    title: "Company Sales Report",
    hasDownload: true,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover", "Alpha Residences"] },
      { label: "Client Name", type: "select", options: ["All", "L&T Construction", "Public Works Dept", "Alpha Builders Ltd"] },
      { label: "Invoice Date", type: "date" },
      { label: "Sale Type", type: "select", options: ["All", "Tax Invoice", "Retail Invoice", "Proforma Invoice"] },
      { label: "Creator Name", type: "select", options: ["All", "Yash Desai", "Anand T"] }
    ],
    columns: ['Invoice Date', 'Sale Type', 'Client Name', 'Project Name', 'Invoice Number', 'Total Amount', 'Retention Amount', 'Post Tax Deduction', 'Net Amount', 'Due Date', 'Payment Received', 'Balance Due', 'Payment Status', 'Notes/Remarks', 'Creator Name', 'Payment Dates', 'Reference Numbers']
  },
  "sales-deduction-retention": {
    title: "Sales Deduction / Retention Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Party Name", type: "select", options: ["All", "L&T Civil", "National Highway Authority"] }
    ],
    columns: ['Name', 'Amount', 'Project Name', 'Party Name', 'Invoice Number', 'Creator Name', 'Type', 'Entry Creation Date', 'Due Date']
  },
  "crm-lead-detail": {
    title: "CRM Lead Detail Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Lead Status", type: "select", options: ["All", "Negotiation", "New Lead", "Followup", "Closed"] },
      { label: "Date Range", type: "date" }
    ],
    columns: ['Lead Date', 'Lead Name', 'Contact Name', 'Contact No.', 'Email', 'Lead Company Name', 'Budget', 'Lead Status', 'Lead Priority', 'Lead Source', 'Lead Category', 'Follow Up Date', 'Last Contacted Date', 'Expected Closure Date', 'Remark', 'Assignees']
  },
  "lead-status-funnel": {
    title: "Lead Status Funnel Report",
    hasDownload: false,
    filters: [
      { label: "Date Range", type: "date" }
    ],
    columns: ['Lead Status', 'Lead Count', 'Conversion Rate %']
  },
  "project-wise-sales-summary": {
    title: "Project Wise Sales Summary",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Date Range", type: "date" }
    ],
    columns: ['Project Name', 'No of Invoices', 'Gross Amount', 'Retention Deduction', 'Post Tax Net Amount', 'Payment Received', 'Balance Due']
  },
  "company-payments": {
    title: "Company Payments",
    hasDownload: true,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Party Name", type: "select", options: ["All", "Yash Desai", "Anil Steels", "Sanjay Yadav"] },
      { label: "Transaction Date", type: "date" },
      { label: "Payment Mode", type: "select", options: ["All", "Bank Transfer", "Cash", "Cheque"] }
    ],
    columns: ['Txn Date', 'Project Name', 'Paid By', 'Party Name', 'Amount', 'TDS Amount', 'Net Amount', 'Payment Type', 'Notes', 'Direction', 'Payment Mode', 'Account Name', 'Cost Code', 'Sub Cost Code', 'Expense Type', 'Created Date', 'Reference No']
  },
  "bank-statement": {
    title: "Bank Statement",
    hasDownload: false,
    filters: [
      { label: "Account Name", type: "select", options: ["All", "HDFC-Main", "Site Cash Account", "SBI-Petty"] },
      { label: "Date Range", type: "date" }
    ],
    columns: ['Account Name', 'Account Number', 'Bank Name', 'Project Name', 'Party Name', 'Payment Date', 'Credit', 'Debit', 'Balance', 'Remarks']
  },
  "project-wise-payment-summary": {
    title: "Project Wise Payment Summary",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Salary', 'Net Purchase', 'Other Expense', 'Site Expense', 'SubCon Expense', 'Total Sales Invoice', 'Total expense', 'Total Out', 'Total IN', 'Balance', 'Margin', 'Net Transfer']
  },
  "project-payment": {
    title: "Project Payment Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Payment Date', 'Project Name', 'Creator Name', 'Party Name', 'Amount', 'Unsettled Amount', 'Net Amount', 'Remark', 'Reference No.', 'Payment Type', 'Payment Mode', 'Account Name', 'Category', 'Cost Code', 'Sub Cost Code', 'Created Date', 'Approval Status']
  },
  "payment-request": {
    title: "Payment Request Report",
    hasDownload: false,
    filters: [
      { label: "Party Name", type: "select", options: ["All", "Yash Desai", "New party"] },
      { label: "Project Name", type: "select", options: ["All", "Prestige Developers", "Nerul"] },
      { label: "Approval Status", type: "select", options: ["All", "Approved", "Pending", "Rejected"] },
      { label: "Payment Status", type: "select", options: ["All", "Paid", "Unpaid", "Partially Paid"] },
      { label: "Payment Date", type: "date" }
    ],
    columns: ['Payment Request No', 'Project Name', 'Party Name', 'Amount', 'Payment Date', 'Due Date', 'Creator Name', 'Request Type', 'Order/Bill No', 'Approval Status', 'Payment Status', 'Remark', 'Account Name']
  },
  "task-report": {
    title: "Task Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Main Task Name", type: "select", options: ["All", "Superstructure", "Substructure"] },
      { label: "Date Range", type: "date" }
    ],
    columns: ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Assigned To', 'Task Status', 'Delay Status', 'Start Date', 'End Date', 'Unit', 'Tag']
  },
  "task-measurement-book": {
    title: "Task Measurement Book",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Main Task Name", type: "select", options: ["All", "Superstructure", "Substructure"] }
    ],
    columns: ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Progress Date', 'Unit', 'Estimated Quantity', 'Opening Quantity', 'Number', 'Length', 'Width', 'Height', 'Progress Quantity', 'Closing Quantity', 'Progress Notes']
  },
  "task-material": {
    title: "Task Material Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Main Task Name", type: "select", options: ["All", "Superstructure", "Substructure"] }
    ],
    columns: ['Project Name', 'Material name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Qty Used', 'Avg Unit Rate', 'Avg Cost']
  },
  "todo-report": {
    title: "To Do Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Assignee", type: "select", options: ["All", "Yash Desai", "Anand T"] },
      { label: "Status", type: "select", options: ["All", "Pending", "Completed"] }
    ],
    columns: ['Creation Date', 'Due Date', 'Last Updated Date', 'Assigned To', 'Type', 'Related Task', 'Creator Name', 'Closed Date']
  },
  "task-resource-budget-vs-actual": {
    title: "Task Resource Budget Vs Actual Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Main Task Name", type: "select", options: ["All", "Superstructure", "Substructure"] }
    ],
    columns: ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Resource Type', 'Resource Name', 'Budget Qty', 'Actual Qty', 'Qty Variance', 'Budget Amount', 'Actual Amount', 'Amount Variance', 'Budget Rate', 'Actual Rate']
  },
  "site-inspection": {
    title: "Site Inspection Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Date Range", type: "date" }
    ],
    columns: ['Project Name', 'Inspection Date', 'Inspection Name', 'Inspection Status', 'Inspection Items', 'Inspection Notes', 'Created Date']
  },
  "task-revenue-expense": {
    title: "Task Revenue & Expense Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Main Task Name", type: "select", options: ["All", "Superstructure", "Substructure"] }
    ],
    columns: ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Task Progress Unit', 'Revenue per task', 'Expense per task']
  },
  "task-boq-billed-unbilled": {
    title: "Task BOQ Billed & Unbilled Qty Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Unit', 'Estimated Qty', 'Progress Qty', '% Complete', 'Task Status', 'Linked BOQ Detail', 'Billed Qty', 'Unbilled Qty']
  },
  "task-attendance": {
    title: "Task Attendance Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal (Phase 2)", "Bypass Highway Flyover", "Alpha Premium Residences"] },
      { label: "Attendance Date", type: "date" },
      { label: "Main Task Name", type: "select", options: ["All", "Superstructure", "Foundation"] },
      { label: "Group Task Name", type: "select", options: ["All", "Columns & Beams", "Excavation"] },
      { label: "Task Name", type: "select", options: ["All", "L1 Column Shuttering", "Pile Cap Reinforcement"] }
    ],
    columns: ['Project Name', 'Party Name', 'Workforce Name', 'Attendance Date', 'Attendance Status', 'Main Task Name', 'Group Task Name', 'Task Name', 'Workers on Task', 'Work Hours', 'Total Hours', 'Task Labour Cost']
  },
  "company-expense": {
    title: "Company Expense Report",
    hasDownload: true,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Txn Date", type: "date" },
      { label: "Party Name", type: "select", options: ["All", "Anil Steels", "Sanjay Yadav"] },
      { label: "Txn Type", type: "select", options: ["All", "Material Purchase", "Labour Payroll", "Other Expense"] },
      { label: "Cost Code", type: "select", options: ["All", "C-102", "C-405"] }
    ],
    columns: ['Txn Date', 'Txn Type', 'Project Name', 'Description', 'Party Name', 'Txn Status', 'Base Amount', 'Tax Amount', 'Bill Discount', 'Additional Charges', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Due Date', 'Settlement By', 'Payment Mode', 'Cost Code', 'Sub Cost Code', 'Notes/Remarks', 'Reference No.', 'Creator Name', 'Approval Status', 'Created Date']
  },
  "cost-code-expense-analysis": {
    title: "Cost Code Expense Analysis",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Date Range", type: "date" }
    ],
    columns: ['Cost Code', 'Total Expense Amount', 'Total BOQ Amount', 'Total Budget Amount']
  },
  "project-wise-expense-summary": {
    title: "Project Wise Expense Summary",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Material Purchase Total Amount', 'Material Purchase Net Amount', 'Subcon Expense Total Amount', 'Subcon Expense Net Amount', 'Salary Expense Total Amount', 'Salary Expense Net Amount', 'Other Expense Total Amount', 'Other Expense Net Amount', 'Site Expense Total Amount', 'Site Expense Net Amount', 'Debit Note Total Amount', 'Debit Note Net Amount', 'Material Return Total Amount', 'Material Return Net Amount', 'Material Transfer In Total Amount', 'Material Transfer In Net Amount', 'Material Transfer Out Total Amount', 'Material Transfer Out Net Amount', 'Equipment Expense Total Amount', 'Equipment Expense Net Amount', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount']
  },
  "all-expense-deduction-retention": {
    title: "All Expense Deduction / Retention Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Party Name", type: "select", options: ["All", "Anil Steels", "Sanjay Yadav"] }
    ],
    columns: ['Date', 'Type', 'Item Name', 'Amount', 'Bill No', 'Expense Type', 'Project Name', 'Party Name', 'Creator Name', 'Due Date']
  },
  "party-ledger": {
    title: "Party Ledger",
    hasDownload: false,
    filters: [
      { label: "Party Name", type: "select", options: ["All", "Anil Steels", "Sanjay Yadav"] },
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Party Name', 'Party Type', 'Project Name', 'Creator Name', 'Description', 'Cost Code', 'Transaction Type', 'Date', 'Debit', 'Credit', 'Balance']
  },
  "all-party-balances": {
    title: "All Party Balances",
    hasDownload: false,
    filters: [
      { label: "Party Type", type: "select", options: ["All", "Supplier", "Labour Contractor", "Subcontractor"] }
    ],
    columns: ['Party Name', 'Party Type', 'Debit', 'Direction', 'Advance In', 'Advance Out']
  },
  "project-level-party-balance": {
    title: "Project level Party Balance Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Party Name', 'Party Type', 'Project Name', 'Salary', 'Material Purchase', 'Other Expense', 'Subcon Amount', 'Site Expense', 'Equipment Expense', 'Debit Note', 'Sales Invoice', 'Net Retention', 'Credit Note', 'Material Sale', 'Material Return', 'Party Received', 'Party Paid', 'Net Balance', 'Balance Type']
  },
  "material-request-item": {
    title: "Material Request Item Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Status", type: "select", options: ["All", "Approved", "Pending", "Rejected"] }
    ],
    columns: ['Date', 'Request No', 'Project Name', 'Material Name', 'Grade/Spec', 'Unit', 'Requested Qty', 'Approved Qty', 'Remaining Qty', 'PO Reference', 'Requested By', 'Status', 'Approved By', 'Remarks']
  },
  "material-received-used": {
    title: "Material Received & Used Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Entry Type", type: "select", options: ["All", "Received", "Used", "Transfer"] }
    ],
    columns: ['Material Category', 'Material', 'Project Name', 'Party Name', 'Created By', 'GRN No.', 'Challan Number', 'Entry Type', 'Transfer Project', 'Purchase Done', 'Receiving Date', 'Unit', 'Quantity', 'Unit Price with Tax', 'Total Amount', 'Remark', 'Vehicle Number', 'PO Number', 'PO Quantity', 'PO date', 'Main Task Name', 'Group Task Name', 'Task Name', 'Equipment Name', 'Equipment No']
  },
  "material-stock": {
    title: "Material Stock Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Material Category', 'Material Name', 'Unit', 'Material Request Pending Qty', 'Material Request Pending Cost', 'Estimated Qty', 'Estimated Cost', 'Received Qty', 'Received Cost', 'Used Qty', 'Used Cost', 'Current Stock Qty', 'Current Stock Cost']
  },
  "unbilled-item": {
    title: "Unbilled Item Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Party Name', 'Material', 'Unit', 'Quantity', 'Receiving Date']
  },
  "po-summary": {
    title: "PO Summary Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Approval Status", type: "select", options: ["All", "Approved", "Pending", "Rejected"] }
    ],
    columns: ['Project Name', 'Creator Name', 'PO Creation Date', 'PO Date', 'Vendor Name', 'PO Number', 'Material Amount', 'Discount', 'Other Charges', 'Tax Amount', 'Total Amount', 'Approval Status', 'Approved or Rejected By']
  },
  "material-received-without-po": {
    title: "Material Received without PO",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Material', 'Project Name', 'Party Name', 'Created By', 'Receiving Date', 'Unit', 'Quantity']
  },
  "purchase-order-item": {
    title: "Purchase Order Item Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['PO Date', 'PO Number', 'Project Name', 'Vendor Name', 'Material Category', 'Material Name', 'Unit', 'Unit Price', 'PO Qty', 'PO Received Qty', 'PO Pending Qty', 'Item Status', 'Approval Status', 'MR No.', 'Challan Number', 'GRN No.']
  },
  "production-material": {
    title: "Production Material Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Production Material Name', 'Unit', 'Quantity', 'Production Date', 'Raw Material Consumed', 'Notes']
  },
  "material-purchase-item": {
    title: "Material Purchase Item Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Party Name', 'Party GST', 'Purchase Date', 'Receiving Date', 'Project Name', 'Material', 'Specification', 'Unit', 'Unit Price', 'Quantity', 'Basic Amount', 'TAX', 'Discount', 'Total Amount', 'Material Category', 'PO Number', 'PO Quantity', 'PO Item Rate', 'PO date', 'PO Total Amount', 'GRN No.', 'Challan Number', 'Reference No.', 'Remark', 'Created By', 'Vehicle Number', 'Expense Status', 'Due_date', 'Expense Amount', 'Expense Paid Amount', 'Unpaid Expense Amount']
  },
  "material-stock-movement": {
    title: "Material Stock Movement Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Material Name', 'UOM', 'Date', 'Opening Qty', 'Stock In', 'Stock Out', 'Closing Qty']
  },
  "attendance-salary": {
    title: "Attendance & Salary Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Month", type: "select", options: ["All", "Jul 2026", "Jun 2026"] },
      { label: "Payroll Type", type: "select", options: ["All", "Monthly", "Daily"] },
      { label: "Workforce Name", type: "select", options: ["All", "Yash Desai", "Ramesh Kumar"] }
    ],
    columns: ['Employee Name', 'Designation', 'Project Name', 'Payroll Type', 'Days Present', 'Days Absent', 'OT Hours', 'Total Shift', 'Basic', 'HRA', 'Allowances', 'Gross Salary', 'Deductions', 'Net Salary']
  },
  "ot-shift": {
    title: "OT & Shift Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Party Name", type: "select", options: ["All", "Yash Desai", "Ramesh Kumar"] },
      { label: "Attendance Date", type: "date" }
    ],
    columns: ['Project Name', 'Party Name', 'Employee Name', 'Date', 'Normal Shifts', 'Actual Shifts', 'OT Hours']
  },
  "staff-salary": {
    title: "Staff Salary Report",
    hasDownload: false,
    filters: [
      { label: "Employee Name", type: "select", options: ["All", "Yash Desai", "Ramesh Kumar"] },
      { label: "Month", type: "select", options: ["All", "Jul 2026", "Jun 2026"] }
    ],
    columns: ['Party Name', 'Designation', 'Phone No.', 'Bank Name', 'IFSC Code', 'Account No.', 'Shift', 'OT Hrs', 'Basic Payable', 'Allowance', 'OT Amount', 'Late Fine', 'Deductions', 'Total Salary Payable']
  },
  "equipment-usage-detail": {
    title: "Equipment Usage Detail Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] },
      { label: "Equipment Name", type: "select", options: ["All", "Excavator JCB-3DX", "Transit Mixer TM-10"] }
    ],
    columns: ['Project Name', 'Equipment Name', 'Vehicle No', 'Party Name', 'Exp Mileage', 'Equipment Unit', 'Equipment Used', 'Exp Fuel Consumed', 'Fuel Added']
  },
  "fuel-efficiency": {
    title: "Fuel Efficiency Report",
    hasDownload: false,
    filters: [
      { label: "Equipment Name", type: "select", options: ["All", "Excavator JCB-3DX", "Transit Mixer TM-10"] }
    ],
    columns: ['Equipment Name', 'Vehicle No', 'Total Fuel Consumed', 'Total Hours Used', 'Fuel Efficiency (L/hr)']
  },
  "daily-based-equipment-used": {
    title: "Daily based Equipment Used Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Equipment Name', 'Vehicle No', 'Party Name', 'Exp Mileage', 'Equipment Unit', 'Equipment Used', 'Exp Fuel Consumed', 'Fuel Added', 'Fuel Adjusted']
  },
  "equipment-expense-summary": {
    title: "Equipment Expense Summary",
    hasDownload: false,
    filters: [
      { label: "Equipment Name", type: "select", options: ["All", "Excavator JCB-3DX", "Transit Mixer TM-10"] }
    ],
    columns: ['Equipment Name', 'Vehicle No', 'Rental Expense', 'Fuel Expense', 'Other Expense', 'Total Expense']
  },
  "equipment-trip": {
    title: "Equipment Trip Report",
    hasDownload: false,
    filters: [
      { label: "Equipment Name", type: "select", options: ["All", "Excavator JCB-3DX", "Transit Mixer TM-10"] }
    ],
    columns: ['Equipment Name', 'Vehicle No', 'Trip Date', 'Start Reading', 'End Reading', 'Total Distance/Hours']
  },
  "gstr1-sales": {
    title: "Sales (GSTR-1)",
    hasDownload: true,
    filters: [
      { label: "Date Range", type: "date" }
    ],
    columns: ['GSTIN', 'Client Name', 'Place of Supply', 'Invoice Number', 'Invoice Value', 'Invoice Date', 'Taxable Value', 'Tax Rate', 'CGST', 'SGST', 'IGST', 'Total Tax']
  },
  "gstr2-purchase": {
    title: "Purchase (GSTR-2)",
    hasDownload: false,
    filters: [
      { label: "Date Range", type: "date" }
    ],
    columns: ['Party GSTIN', 'Party Name', 'Place of Supply', 'Invoice Number', 'Invoice Value', 'Invoice Date', 'Taxable Amt', 'Tax Rate', 'CGST Amt', 'SGST Amt', 'IGST Amt', 'Total Tax Amt']
  },
  "warehouse-stock-movement": {
    title: "Warehouse Stock Movement Report",
    hasDownload: false,
    filters: [
      { label: "Warehouse Name", type: "select", options: ["All", "Main Warehouse", "Site Storage A"] }
    ],
    columns: ['Warehouse Name', 'Material Name', 'Date', 'Stock In', 'Stock Out', 'Balance Stock']
  },
  "warehouse-transaction": {
    title: "Warehouse Transaction Report",
    hasDownload: false,
    filters: [
      { label: "Warehouse Name", type: "select", options: ["All", "Main Warehouse", "Site Storage A"] }
    ],
    columns: ['Warehouse Name', 'Transaction Type', 'Material Name', 'Quantity', 'Creator Name', 'Date']
  },
  "warehouse-current-stock": {
    title: "Warehouse Current Stock Report",
    hasDownload: false,
    filters: [
      { label: "Warehouse Name", type: "select", options: ["All", "Main Warehouse", "Site Storage A"] }
    ],
    columns: ['Warehouse Name', 'Material Name', 'Category', 'Current Stock', 'Average Cost']
  },
  "subcon-workorder-summary": {
    title: "Subcon Workorder Summary Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Subcontractor Name', 'Workorder Name', 'Workorder No.', 'Estimated Amount', 'Work Done Amount', 'Invoice Amount', '% Complete']
  },
  "subcon-measurement-book": {
    title: "Subcon Measurement Book",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['WO No', 'WO Name', 'Section', 'Description', 'Date', 'Unit', 'Length', 'Width', 'Height', 'No.', 'Depth', 'Factor', 'Measurement Qty', 'Total Qty']
  },
  "subcon-deduction-retention": {
    title: "Subcon Deduction / Retention Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Amount', 'Project Name', 'Party Name', 'Invoice No', 'Creator Name', 'Type', 'Date']
  },
  "subcon-material-issue": {
    title: "Subcon Material Issue Summary",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Subcontractor Name', 'Material Name', 'Qty', 'Rate', 'Amount']
  },
  "project-financial-summary": {
    title: "Project Financial Summary",
    hasDownload: true,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Project Status', 'Project Health', 'Project Budget', 'Total Expense', 'Budget Remaining', 'Total Sales', 'Project Margin', 'Payment In', 'Payment Out', 'Cash Balance']
  },
  "project-operational-summary": {
    title: "Project Operational Summary",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Project Category', 'Key Personnel', 'Project Status', 'Project Health', 'Start Date', 'End Date', 'Progress']
  },
  "company-transactions": {
    title: "Company Transactions Report",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Transaction Type', 'Transaction Category', 'Created Date', 'Creator Name', 'Party Name', 'Cost Code', 'Sub Cost Code', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Reference No.', 'Notes/Remarks', 'Description', 'Due Date', 'Payment Mode', 'Approval Status']
  },
  "monthly-pl": {
    title: "Monthly P&L Report",
    hasDownload: false,
    filters: [
      { label: "Date Range", type: "date" }
    ],
    columns: ['Month', 'Total Sales', 'Material Expense', 'Labor Expense', 'Equipment Expense', 'Other Expense', 'Net Profit']
  },
  "project-activity-leaderboard": {
    title: "Project Activity Leaderboard",
    hasDownload: false,
    filters: [
      { label: "Project Name", type: "select", options: ["All", "Metro Terminal", "Bypass Flyover"] }
    ],
    columns: ['Project Name', 'Progress Count', 'ToDo Count', 'Activity Count']
  },
  "company-user-activity-leaderboard": {
    title: "Company User Activity Leaderboard",
    hasDownload: false,
    filters: [
      { label: "Creator Name", type: "select", options: ["All", "Yash Desai", "Anand T"] }
    ],
    columns: ['Creator Name', 'Role', 'Activity Count', 'Progress Count', 'ToDo Count']
  },
  "party-library": {
    title: "Party Library",
    hasDownload: false,
    filters: [
      { label: "Party Type", type: "select", options: ["All", "Supplier", "Labour Contractor", "Subcontractor"] }
    ],
    columns: ['Party Id', 'Party Name', 'Party Type', 'Bank Name', 'Account Name', 'Account Number', 'IFSC Code', 'Tax No.', 'Billing Address', 'Aadhar Card Number', 'PAN Card Number', 'ESI Number', 'PF Number', 'Father Name', 'Passport No.', 'Passport Expiry Date', 'Joining Date', 'Created Date', 'Creator Name']
  },
  "cost-code-library": {
    title: "Cost Code Library",
    hasDownload: false,
    filters: [],
    columns: ['Cost Code', 'Sub Cost Code', 'Created Date']
  },
  "material-library": {
    title: "Material Library",
    hasDownload: false,
    filters: [],
    columns: ['Item Code', 'Material Name', 'Material Category', 'Specifications', 'Unit', 'Created Date', 'Creator Name']
  },
  "rate-card-library": {
    title: "Rate Card Library",
    hasDownload: false,
    filters: [],
    columns: ['Item Code', 'Item Name', 'Description', 'Cost Code', 'Unit', 'Components', 'Unit Cost Price', 'Markup Amount', 'Markup %', 'Selling Price', 'Created Date', 'Component Count', 'HSN/SAC']
  },
  "payroll-library": {
    title: "Payroll Library",
    hasDownload: false,
    filters: [],
    columns: ['Name', 'Designation', 'Type', 'Payroll Type', 'CTC', 'Gross Salary', 'Net Salary', 'Shift Hours', 'Salary Breakup', 'Created Date']
  },
  "equipment-library": {
    title: "Equipment Library",
    hasDownload: false,
    filters: [],
    columns: ['Equipment Name', 'Make/Brand', 'Equipment No', 'Model No.', 'Measurement Type', 'Unit', 'Created Date', 'Ownership Type', 'Exp Mileage', 'Purchase Amount', 'Insurance Policy Num', 'Insurance Provider Name', 'Insurance Start Date', 'Insurance Expiry Date', 'Service Reference No.', 'Last Service Date', 'Next Service Date', 'Fitness Certificate Reference No', 'Fitness Certificate Start Date', 'Fitness Certificate Insurance No', 'Fitness Certificate Expiry Date', 'PUCC Reference No.', 'PUCC Start Date', 'PUCC Expiry Date', 'Permit Reference No', 'Permit Start Date', 'Permit Expiry Date', 'Tax No.', 'Tax Start Date', 'Tax Expiry Date', 'Registration No.', 'Registration Start Date', 'Registration Expiry Date']
  },
  "boq-workorder-summary": {
    title: "BOQ Workorder Summary Report",
    hasDownload: false,
    filters: [],
    columns: ['Project Name', 'Client Name', 'Workorder Name', 'Workorder No.', 'WO Start Date', 'WO Amount', 'Work Done Amount', 'Invoice Amount', '% Complete']
  },
  "boq-item": {
    title: "BOQ Item Report",
    hasDownload: false,
    filters: [],
    columns: ['Project Name', 'BOQ Name', 'Workorder No', 'Client Name', 'WO Start Date', 'Item Name', 'Unit', 'Est. Qty', 'Billed Qty', 'Remaining Qty']
  },
  "quotation": {
    title: "Quotation Report",
    hasDownload: false,
    filters: [],
    columns: ['Quotation Date', 'Quotation Name', 'Quotation Number', 'Client Name', 'Item Count', 'Item Sub Total', 'Discount', 'Additional Charges', 'Tax', 'Total Amount', 'Quotation Status', 'Created Date']
  },
  "quotation-item": {
    title: "Quotation Item Report",
    hasDownload: false,
    filters: [],
    columns: ['Client Name', 'Quotation Name', 'Quotation Status', 'Quotation Date', 'Group', 'Section', 'Item Name', 'Unit', 'Estimated Qty', 'Unit Cost Price', 'Markup', 'Sales Unit Price', 'Total Sales Amount', 'Tax %', 'Total with Tax']
  },
  "boq-measurement-book": {
    title: "BOQ Measurement Book",
    hasDownload: false,
    filters: [],
    columns: ['BOQ Name', 'Item Name', 'Material Name', 'Unit', 'Unit Price', 'Quantity', 'Total Cost Price', 'Creation Date']
  },
  "boq-bom": {
    title: "BOQ BOM Report",
    hasDownload: false,
    filters: [],
    columns: ['Project Name', 'BOQ Name', 'Item Name', 'Material Name', 'Unit', 'Unit Price', 'Quantity', 'Total Cost Price', 'Creation Date']
  },
  "budget-vs-actual-material-cost": {
    title: "Budget vs Actual (Material Cost)",
    hasDownload: false,
    filters: [],
    columns: ['Project', 'Material', 'Unit', 'Budget Cost', 'Actual Cost', 'Variance']
  },
  "budget-vs-actual-material-qty": {
    title: "Budget vs Actual (Material Qty)",
    hasDownload: false,
    filters: [],
    columns: ['Project', 'Material', 'Unit', 'Budget Qty', 'Actual Qty', 'Variance']
  },
  "budget-vs-actual-cost-code": {
    title: "Budget vs Actual (Cost Code)",
    hasDownload: false,
    filters: [],
    columns: ['Cost Code.', 'BOQ Estimated Amount', 'Budget Amount', 'Actual Expense', 'Budget Variance']
  },
  "asset-allocation": {
    title: "Asset Allocation Report",
    hasDownload: false,
    filters: [],
    columns: ['Asset Name', 'Asset Type', 'Assigned To', 'Allocation Type', 'Created by', 'Project Name', 'Assigned Time', 'Assigned Qty', 'Remaining Qty']
  },
  "asset-status": {
    title: "Asset Status Report",
    hasDownload: false,
    filters: [],
    columns: ['Asset Name', 'Asset Type', 'Total Qty', 'Available Qty', 'Assigned Qty', 'In Repair Qty', 'Damaged Qty', 'Asset Value', 'Created by', 'Creation Date', 'Last Assigned To', 'Last Assigned Time']
  }
};

// Seed realistic field-based mock value generators
function getMockValueForColumn(colName: string, rowIndex: number): string {
  const norm = colName.toLowerCase();
  if (norm.includes("date")) {
    return rowIndex === 0 ? "02-Jul-2026" : rowIndex === 1 ? "05-Jul-2026" : "07-Jul-2026";
  }
  if (norm.includes("project")) {
    return rowIndex % 2 === 0 ? "Metro Terminal (Phase 2)" : "Bypass Highway Flyover";
  }
  if (norm.includes("client")) {
    return "L&T Construction";
  }
  if (norm.includes("party") || norm.includes("vendor") || norm.includes("employee") || norm.includes("name") || norm.includes("assigned to")) {
    if (norm.includes("material") || norm.includes("equipment")) {
      return rowIndex % 2 === 0 ? "Cement 53 Grade" : "Excavator JCB-3DX";
    }
    return rowIndex === 0 ? "Yash Desai" : rowIndex === 1 ? "Anil Steels" : "Sanjay Yadav";
  }
  if (norm.includes("status")) {
    return rowIndex % 2 === 0 ? "Approved" : "Pending";
  }
  if (norm.includes("mode") || norm.includes("payment mode")) {
    return "Bank Transfer";
  }
  if (norm.includes("account")) {
    return "HDFC-Main";
  }
  if (norm.includes("cost code")) {
    return "C-102";
  }
  if (norm.includes("amount") || norm.includes("cost") || norm.includes("price") || norm.includes("budget") || norm.includes("sales") || norm.includes("deduction") || norm.includes("retention") || norm.includes("tax") || norm.includes("ctc") || norm.includes("earning") || norm.includes("deductions") || norm.includes("salary")) {
    return rowIndex === 0 ? "45,000" : rowIndex === 1 ? "12,500" : "5,000";
  }
  if (norm.includes("number") || norm.includes("no") || norm.includes("code") || norm.includes("id")) {
    return `INV-2026-${100 + rowIndex}`;
  }
  if (norm.includes("qty") || norm.includes("quantity") || norm.includes("hours") || norm.includes("days") || norm.includes("shift") || norm.includes("count")) {
    return "120";
  }
  if (norm.includes("unit") || norm.includes("uom")) {
    return "Bags";
  }
  if (norm.includes("type")) {
    return "Material";
  }
  if (norm.includes("remark") || norm.includes("notes") || norm.includes("description")) {
    return "High-fidelity automatic simulation row data";
  }
  return "Standard Value";
}

export default function DynamicReportViewPage() {
  const params = useParams();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";
  const slug = params?.slug as string;

  const [toastMessage, setToastMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  // Load report meta configuration
  const meta = REPORT_METADATA[slug];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  if (!meta) {
    return (
      <div className="flex h-screen bg-background text-foreground items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-bold">Report configuration not found for slug "{slug}"</p>
          <Link href={`/c/${companyId}/reports`} className="text-xs text-primary underline">Back to Reports Hub</Link>
        </div>
      </div>
    );
  }

  // Set up filters state dynamically based on meta filter configuration
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    meta.filters.forEach(f => {
      initial[f.label] = f.type === "select" ? "All" : "";
    });
    return initial;
  });

  const handleFilterChange = (label: string, val: string) => {
    setFilterValues(prev => ({ ...prev, [label]: val }));
  };

  // Generate 3 realistic mock rows dynamically based on the report columns
  const mockData = [0, 1, 2].map(idx => {
    const row: Record<string, string> = {};
    meta.columns.forEach(col => {
      row[col] = getMockValueForColumn(col, idx);
    });
    return row;
  });

  // Filter rows based on search and filters
  const filteredData = mockData.filter(row => {
    // 1. Match search query across all cells
    if (searchQuery !== "") {
      const rowString = JSON.stringify(row).toLowerCase();
      if (!rowString.includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    // 2. Match active select dropdown filters
    for (const filterLabel in filterValues) {
      const val = filterValues[filterLabel];
      if (val !== "All" && val !== "") {
        // Find if a column name matches the filter label
        const matchedCol = meta.columns.find(c => c.toLowerCase().includes(filterLabel.toLowerCase()));
        if (matchedCol && row[matchedCol] && !row[matchedCol].toLowerCase().includes(val.toLowerCase())) {
          return false;
        }
      }
    }
    return true;
  });

  // Handle format export selection
  const handleExportSelect = (format: string) => {
    setShowExportDropdown(false);
    
    const headers = ["#", ...meta.columns];
    const csvRows = filteredData.map((row, i) => [
      String(i + 1),
      ...meta.columns.map(col => row[col] || "")
    ]);

    const csvContent = [
      headers.join(","),
      ...csvRows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const cleanFileName = meta.title.toLowerCase().replace(/[^a-z0-9]/g, "_") + `_export.${format.toLowerCase()}`;
    link.setAttribute("download", cleanFileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Report exported successfully as ${format.toUpperCase()}!`);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar onShowToast={showToast} />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <PageHeader title={meta.title} />

        {/* Filters + Action Header bar */}
        <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col gap-4 shrink-0">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            
            {/* LEFT: Dynamic filters list */}
            {meta.filters.length > 0 ? (
              <div className="flex flex-wrap items-end gap-3 text-xs">
                {meta.filters.map(filter => (
                  <div key={filter.label} className="flex flex-col gap-1">
                    <span className="text-[10px] text-muted uppercase font-bold">{filter.label}:</span>
                    {filter.type === "select" ? (
                      <select
                        value={filterValues[filter.label] || "All"}
                        onChange={e => handleFilterChange(filter.label, e.target.value)}
                        className="bg-card border border-border-custom rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary min-w-[120px]"
                      >
                        {filter.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="date"
                        value={filterValues[filter.label] || ""}
                        onChange={e => handleFilterChange(filter.label, e.target.value)}
                        className="bg-card border border-border-custom rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-primary"
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted">Library schema viewer (no filter parameters)</div>
            )}

            {/* RIGHT: Export toolbar + Search bar */}
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => showToast("Refreshed data.")} className="text-muted hover:text-foreground text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all">🔄 Refresh</button>
              <button onClick={() => showToast("Filters applied.")} className="text-muted hover:text-foreground text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all">Filter</button>
              <button onClick={() => showToast("Sorted columns.")} className="text-muted hover:text-foreground text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all">Sort</button>
              
              {/* Dynamic 4-option export dropdown button */}
              <div className="relative">
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="text-muted hover:text-primary text-xs border border-border-custom rounded-lg px-3 py-1.5 transition-all flex items-center gap-1"
                  title="Export Options"
                >
                  ⬆️ Export
                </button>
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-40 bg-card border border-border-custom rounded-lg shadow-xl py-1 z-50">
                    <button onClick={() => handleExportSelect("csv")} className="w-full text-left px-4 py-2 text-xs text-muted hover:bg-elevated hover:text-white transition-colors">Export as CSV</button>
                    <button onClick={() => handleExportSelect("xlsx")} className="w-full text-left px-4 py-2 text-xs text-muted hover:bg-elevated hover:text-white transition-colors">Export as Excel</button>
                    <button onClick={() => handleExportSelect("pdf")} className="w-full text-left px-4 py-2 text-xs text-muted hover:bg-elevated hover:text-white transition-colors">Export as PDF</button>
                    <button onClick={() => handleExportSelect("html")} className="w-full text-left px-4 py-2 text-xs text-muted hover:bg-elevated hover:text-white transition-colors">Export as HTML</button>
                  </div>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  placeholder="Search Data..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-card border border-border-custom rounded-lg pl-7 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary w-40 transition-all focus:w-48"
                />
                <span className="absolute left-2.5 top-2 text-muted text-xs">🔍</span>
              </div>
            </div>

          </div>
        </div>

        {/* Dynamic Data Table */}
        <div className="flex-1 overflow-auto p-6">
          <div className="min-w-full overflow-x-auto rounded-xl border border-border-custom bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gradient-to-r from-[#6366f1] to-[#7c3aed] text-white">
                  <th className="px-3 py-2.5 text-left font-semibold whitespace-nowrap w-12">#</th>
                  {meta.columns.map(col => (
                    <th key={col} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={meta.columns.length + 1} className="text-center py-16 text-[#ef4444] font-semibold text-sm">
                      No Data
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row, i) => (
                    <tr key={i} className="border-t border-border-custom hover:bg-elevated/40 transition-colors">
                      <td className="px-3 py-2.5 text-muted">{i + 1}</td>
                      {meta.columns.map(col => (
                        <td key={col} className="px-3 py-2.5 text-foreground whitespace-nowrap">
                          {row[col]}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Back Navigation Bar */}
        <div className="px-6 py-3 border-t border-border-custom bg-sidebar shrink-0">
          <Link href={`/c/${companyId}/reports`} className="text-xs text-muted hover:text-primary transition-colors flex items-center gap-1 w-fit">
            <span>←</span> Back to Reports Hub
          </Link>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
