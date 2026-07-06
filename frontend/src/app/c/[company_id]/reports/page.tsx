"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

interface ReportItem {
  name: string;
  type: "excel" | "pdf" | "view";
  downloadable: boolean;
  endpoint?: string;
  fields?: string[];
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
        { name: "Company Sales Report", type: "excel", downloadable: true },
        { name: "Item Wise Sales Report", type: "view", downloadable: false, endpoint: "/item-wise-sales" },
        { name: "Sales Deduction / Retention Report", type: "excel", downloadable: true },
        { name: "CRM Lead Detail Report", type: "excel", downloadable: true },
        { name: "Lead Status Funnel Report", type: "excel", downloadable: true },
        { name: "Project Wise Sales Summary", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Payments",
      icon: "💳",
      reports: [
        { name: "Company Payments", type: "excel", downloadable: true },
        { name: "Bank Statement", type: "excel", downloadable: true },
        { name: "Project Wise Payment Summary", type: "excel", downloadable: true },
        { name: "Project Payment Report", type: "excel", downloadable: true },
        { name: "Payment Request Report", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Progress & task",
      icon: "📋",
      reports: [
        { name: "Daily Progress Report", type: "view", downloadable: false, endpoint: "/dpr" },
        { name: "Task Report", type: "excel", downloadable: true },
        { name: "Task Measurement Book", type: "excel", downloadable: true },
        { name: "Task Material Report", type: "excel", downloadable: true },
        { name: "To Do Report", type: "excel", downloadable: true },
        { name: "Task Resource Budget Vs Actual Report", type: "excel", downloadable: true },
        { name: "Site Inspection Report", type: "excel", downloadable: true },
        { name: "Task Revenue & Expense Report", type: "excel", downloadable: true },
        { name: "Task BOQ Billed & Unbilled Qty Report", type: "excel", downloadable: true },
        { name: "Task Attendance Report", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Purchase & Expense",
      icon: "💸",
      reports: [
        { name: "Company Expense Report", type: "excel", downloadable: true },
        { name: "Cost Code Expense Analysis", type: "excel", downloadable: true },
        { name: "Project Wise Expense Summary", type: "excel", downloadable: true },
        { name: "All Expense Deduction / Retention Report", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Party Balances",
      icon: "👥",
      reports: [
        { name: "Party Ledger", type: "excel", downloadable: true },
        { name: "All Party Balances", type: "excel", downloadable: true },
        { name: "Project level Party Balance Report", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Materials & Inventory",
      icon: "📦",
      reports: [
        { name: "Material Request Item Report", type: "excel", downloadable: true },
        { name: "Material Received & Used Report", type: "excel", downloadable: true },
        { name: "Material Stock Report", type: "excel", downloadable: true },
        { name: "Unbilled Item Report", type: "excel", downloadable: true },
        { name: "PO Summary Report", type: "excel", downloadable: true },
        { name: "Material Received without PO", type: "excel", downloadable: true },
        { name: "Purchase Order Item Report", type: "excel", downloadable: true },
        { name: "Production Material Report", type: "excel", downloadable: true },
        { name: "Material Purchase Item Report", type: "excel", downloadable: true },
        { name: "Material Stock Movement Report", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Attendance & Salary",
      icon: "🧑‍💻",
      reports: [
        { name: "Attendance & Salary Report", type: "excel", downloadable: true },
        { name: "OT & Shift Report", type: "excel", downloadable: true },
        { name: "Company Attendance", type: "excel", downloadable: true },
        { name: "Staff Monthly Salary Slip", type: "excel", downloadable: true },
        { name: "Staff Salary Report", type: "excel", downloadable: true },
        { name: "Staff Punch Report", type: "excel", downloadable: true },
        { name: "Staff Muster Roll", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Equipments",
      icon: "🚜",
      reports: [
        { name: "Equipment Usage Detail Report", type: "excel", downloadable: true },
        { name: "Fuel Efficiency Report", type: "excel", downloadable: true },
        { name: "Daily based Equipment Used Report", type: "excel", downloadable: true },
        { name: "Equipment Expense Summary", type: "excel", downloadable: true },
        { name: "Equipment Trip Report", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Tax",
      icon: "🧾",
      reports: [
        { name: "Sales (GSTR-1)", type: "excel", downloadable: true },
        { name: "Purchase (GSTR-2)", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Warehouse",
      icon: "🏪",
      reports: [
        { name: "Warehouse Stock Movement Report", type: "excel", downloadable: true },
        { name: "Warehouse Transaction Report", type: "excel", downloadable: true },
        { name: "Warehouse Current Stock Report", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Sub Con.",
      icon: "🏗️",
      reports: [
        { name: "Subcon Workorder Summary Report", type: "excel", downloadable: true },
        { name: "Subcon Measurement Book", type: "excel", downloadable: true },
        { name: "Subcon Deduction / Retention Report", type: "excel", downloadable: true },
        { name: "Subcon Material Issue Summary", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Misc.",
      icon: "🔮",
      reports: [
        { name: "Project Financial Summary", type: "excel", downloadable: true },
        { name: "Project Operational Summary", type: "excel", downloadable: true },
        { name: "Company Transactions Report", type: "excel", downloadable: true },
        { name: "Monthly P&L Report", type: "excel", downloadable: true },
        { name: "Project Activity Leaderboard", type: "excel", downloadable: true },
        { name: "Company User Activity Leaderboard", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Library",
      icon: "📚",
      reports: [
        { name: "Party Library", type: "excel", downloadable: true },
        { name: "Cost Code Library", type: "excel", downloadable: true },
        { name: "Material Library", type: "excel", downloadable: true },
        { name: "Rate Card Library", type: "excel", downloadable: true },
        { name: "Payroll Library", type: "excel", downloadable: true },
        { name: "Equipment Library", type: "excel", downloadable: true }
      ]
    },
    {
      title: "BOQ",
      icon: "📐",
      reports: [
        { name: "BOQ Workorder Summary Report", type: "excel", downloadable: true },
        { name: "BOQ Item Report", type: "excel", downloadable: true },
        { name: "Quotation Report", type: "excel", downloadable: true },
        { name: "Quotation Item Report", type: "excel", downloadable: true },
        { name: "BOQ Measurement Book", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Budget",
      icon: "📊",
      reports: [
        { name: "BOQ BOM Report", type: "excel", downloadable: true },
        { name: "Budget vs Actual (Material Cost)", type: "excel", downloadable: true },
        { name: "Budget vs Actual (Material Qty)", type: "excel", downloadable: true },
        { name: "Budget vs Actual (Cost Code)", type: "excel", downloadable: true }
      ]
    },
    {
      title: "Asset",
      icon: "🏠",
      reports: [
        { name: "Asset Allocation Report", type: "excel", downloadable: true },
        { name: "Asset Status Report", type: "excel", downloadable: true }
      ]
    }
  ];

  // Specific Columns mapped from the actual Onsite Teams reconstructed spreadsheets and UI screens
  const exportSchemas: Record<string, string[]> = {
    "Company Expense Report": ['S.NO.', 'Expense Date', 'Expense Type', 'Project Name', 'Party Name', 'Notes', 'Cost Code', 'Expense Status', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Due Date', 'Approval Status'],
    "Staff Muster Roll": ['S.NO.', 'Party Code', 'Employee Name', 'Designation', 'Phone No.', 'Bank Account No.', 'Bank Name', 'Salary Type', 'Gross Salary', 'Work Days', 'PL', 'WO', 'Payable Days', 'OT(Hours)', 'Earnings Basic', 'Earnings HRA', 'Earnings Allowance', 'Deductions', 'Net Salary', 'CTC'],
    "Staff Punch Report": ['S.NO.', 'PARTY NAME', 'DESIGNATION', 'PUNCH DATE', 'PUNCH IN TIME', 'PUNCH IN LOCATION', 'PUNCH OUT TIME', 'PUNCH OUT LOCATION', 'DURATION', 'PUNCH IN PHOTO VERIFIED', 'PUNCH OUT PHOTO VERIFIED', 'PUNCH IN LOCATION VERIFIED', 'PUNCH OUT LOCATION VERIFIED'],
    "Company Attendance": ['Labor / Subcontractor', 'Workforce Type', 'Project Name', '01-Jul-26', '02-Jul-26', '03-Jul-26', '04-Jul-26', '05-Jul-26'],
    "Company Payments": ['Date', 'Project', 'Sender', 'Receiver', 'Amount', 'Creator', 'Category', 'Trade', 'Payment Mode', 'Description'],
    "Project Wise Payment Summary": ['Project Name', 'Salary', 'Net Purchase', 'Other Expense', 'Site Expense', 'SubCon Expense', 'Total Sales Invoice', 'Total expense', 'Total Out', 'Total IN', 'Balance', 'Margin', 'Net Transfer'],
    "Sales (GSTR-1)": ['Party GSTIN', 'Party Name', 'Place of Supply', 'Invoice Number', 'Invoice Value', 'Invoice Date', 'Taxable Amt', 'Tax Rate', 'CGST Amt', 'SGST Amt', 'IGST Amt', 'Total Tax Amt'],
    "Purchase (GSTR-2)": ['Party GSTIN', 'Party Name', 'Place of Supply', 'Invoice Number', 'Invoice Value', 'Invoice Date', 'Taxable Amt', 'Tax Rate', 'CGST Amt', 'SGST Amt', 'IGST Amt', 'Total Tax Amt'],
    "BOQ Workorder Summary Report": ['Project Name', 'Client Name', 'Workorder Date'],
    "BOQ Item Report": ['Project Name', 'Workorder Name', 'Workorder No', 'Client Name', 'BOQ Date'],
    "Equipment Usage Detail Report": ['ProjectName', 'EquipmentName', 'Vehicle No', 'PartyName', 'Exp Mileage'],
    "Payment Upload Template": ['Payment Date', 'Payment Type', 'Party Name', 'Project Name', 'Amount', 'Remark', 'Mode of Payment', 'Company Bank Account Number', 'Category', 'Payment Request ID'],
    "Payroll Upload Template": ['Name', 'Staff Type', 'Shift Hours', 'Day Off', 'Overtime Rate (Per Hour)', 'Designation', 'Cost Code', 'Salary Basis', 'Salary Type', 'CTC', 'Basic', 'Allowance Name (A1)', 'A1 Relation Type', '% of A1 Relation', 'A1 Amount'],
    "Material Request Item Report": ['RequestNo', 'ProjectName', 'Material Name', 'Specifications', 'Unit', 'RequestQuantity', 'Ordered Quantity', 'Pending Quantity'],
    "Project Operational Summary": ['ProjectName', 'ProjectCategory', 'ProjectStage', 'Key Personnel', 'ProjectStatus', 'ProjectHealth', 'Start Date', 'End Date', 'Progress'],
    "Daily based Equipment Used Report": ['ProjectName', 'EquipmentName', 'Vehicle No', 'PartyName', 'ExpMileage', 'Eqp Unit', 'Equipment Used', 'Exp Fuel Consumed', 'Fuel Added', 'Fuel Adjusted'],
    "OT & Shift Report": ['ProjectName', 'PartyName', 'WorkforceName', 'AttendanceDate', 'No of Workers'],
    "All Expense Deduction / Retention Report": ['Item Name', 'Amount', 'Bill Number', 'Expense Type', 'Project Name', 'Party Name', 'Creator Name', 'Due Date'],
    "Party Ledger": ['Party Name', 'Party Type', 'Project Name', 'Creator Name', 'Description', 'Cost Code', 'Transaction Type', 'Transaction Date', 'Party Debit', 'Party Credit', 'Balance'],
    "All Party Balances": ['Party Name', 'Party Type', 'Balance Amount', 'Balance Type', 'Petty Cash Balance', 'Salary Balance'],
    "Project level Party Balance Report": ['Party Name', 'Party Type', 'Project Name', 'Salary', 'Material Purchase', 'Other Expense', 'Subcon Amount', 'Site Expense', 'Equipment Expense'],
    "Subcon Workorder Summary Report": ['Subcontractor', 'Estimated Amount', '% Order Complete', 'WorkDone Amount', 'Billed Amount', 'Paid Amount', 'Creator Name', 'Created Date'],
    "Subcon Measurement Book": ['Workorder No', 'Group', 'Section', 'Item Name', 'Progress Date', 'Unit', 'Estimated Quantity', 'Opening Quantity', 'Number', 'Length', 'Width', 'Height', 'Progress Quantity', 'Closing Quantity'],
    "Subcon Deduction / Retention Report": ['Amount', 'Project Name', 'Party Name', 'Invoice Number', 'Creator Name', 'Type', 'Entry Creation Date'],
    "Subcon Material Issue Summary": ['Project Name', 'Subcon Name', 'Material Name', 'Avg Unit Price', 'Total Quantity Issued', 'Total Amount'],
    "Project Financial Summary": ['Project Name', 'Project Status', 'Project Health', 'Project Budget', 'Total Expense', 'Budget Remaining', 'Total Sales', 'Project Margin', 'Payment In', 'Payment Out', 'Cash Balance'],
    "Company Transactions Report": ['Project Name', 'Transaction Type', 'Transaction Category', 'Created Date', 'Creator Name', 'Party Name', 'Cost Code', 'Sub Cost Code', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Reference No.', 'Notes/Remarks', 'Description', 'Due Date', 'Payment Mode', 'Approval Status'],
    "Project Activity Leaderboard": ['Project Name', 'Progress Count', 'ToDo Count', 'Activity Count'],
    "Company User Activity Leaderboard": ['Creator Name', 'Role', 'Activity Count', 'Progress Count', 'ToDo Count'],
    "Party Library": ['Party Id', 'Party Name', 'Party Type', 'Bank Name', 'Account Name', 'Account Number', 'IFSC Code', 'Tax No.', 'Billing Address', 'Aadhar Card Number', 'PAN Card Number', 'ESI Number', 'PF Number', 'Father Name', 'Passport No.', 'Passport Expiry Date', 'Joining Date', 'Created Date', 'Creator Name'],
    "Cost Code Library": ['Cost Code', 'Sub Cost Code', 'Created Date'],
    "Material Library": ['Item Code', 'Material Name', 'Material Category', 'Specifications', 'Unit', 'Created Date', 'Creator Name'],
    "Rate Card Library": ['Item Code', 'Item Name', 'Description', 'Cost Code', 'Unit', 'Components', 'Unit Cost Price', 'Markup Amount', 'Markup %', 'Selling Price', 'Created Date', 'Component Count', 'HSN/SAC'],
    "Payroll Library": ['Employee Name', 'Designation', 'Designation Type', 'Payroll Type', 'CTC', 'Gross Salary', 'Net Salary', 'Shift Hours', 'Salary Breakup', 'Created Date'],
    "Task Resource Budget Vs Actual Report": ['Main Task Name', 'Group Task Name', 'Task Name', 'Task Unit', 'Task Qty', 'Task Progress Qty', 'Resource Name', 'Resource Type', 'Budgeted Rate', 'Avg Unit Cost', 'Budgeted Qty', 'Qty Actual Used', 'Budgeted Amount', 'Actual Amount', 'Exceeded Qty', 'Exceeded Amount'],
    "Site Inspection Report": ['Project Name', 'Inspection Date', 'Inspection Name', 'Inspection Status', 'Inspection Items', 'Inspection Notes', 'Created Date'],
    "Task BOQ Billed & Unbilled Qty Report": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Unit', 'Estimated Qty', 'Progress Qty', '% Complete', 'Task Status', 'Linked BOQ Detail', 'Billed Qty', 'Unbilled Qty'],
    "CRM Lead Detail Report": ['Lead Date', 'Lead Name', 'Contact Name', 'Contact No.', 'Lead Status', 'Lead Priority', 'Lead Source', 'Lead Category'],
    "Item Wise Sales Report": ['Sales Type', 'Project Name', 'Client Name', 'Invoice Number', 'Invoice Date', 'Item Name', 'Unit', 'Quantity', 'Item Rate', 'Tax %', 'Tax Amount', 'Gross Amount', 'Total Amount', 'Invoice Created'],
    "Sales Deduction / Retention Report": ['Name', 'Amount', 'Project Name', 'Party Name', 'Invoice Number', 'Creator Name', 'Type', 'Entry Creation Date', 'Due Date'],
    "Lead Status Funnel Report": ['Lead Status', 'Lead Count', 'Conversion Rate %'],
    "Bank Statement": ['Account Name', 'Account Number', 'Bank Name', 'Project Name', 'Party Name', 'Payment Date', 'Credit', 'Debit', 'Balance', 'Remarks'],
    "Project Payment Report": ['Project Name', 'Creator Name', 'Party Name', 'Amount', 'Remark', 'Reference No.', 'Payment Type', 'Payment Mode', 'Account Name', 'Category', 'Cost Code', 'Sub Cost Code', 'Created Date'],
    "Payment Request Report": ['Payment Request No', 'Project Name', 'Party Name', 'Amount', 'Payment Date', 'Due Date', 'Creator Name', 'Request Type', 'Order/Bill No', 'Approval Status', 'Payment Status', 'Remark', 'Account Name'],
    "Daily Progress Report": ['Project Name', 'DPR Date', 'Main Task Name', 'Group Task Name', 'Task Name', 'Unit', 'Progress Qty', 'Estimated Qty', 'Workers Count', 'Material Used', 'Equipment Used'],
    "Task Report": ['Main Task Name', 'Group Task Name', 'Task Name', 'Assigned To', 'Status', 'Delay Status', 'Start Date', 'End Date', 'Estimated Qty', '% Complete', 'Last Progress'],
    "Task Measurement Book": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Progress Date', 'Unit', 'Estimated Quantity', 'Opening Quantity', 'Number', 'Length', 'Width', 'Height', 'Progress Quantity', 'Closing Quantity', 'Progress Notes'],
    "Task Material Report": ['Project Name', 'Material Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Quantity', 'Unit', 'Used Date'],
    "To Do Report": ['Project Name', 'Activity Name', 'Status', 'Creator Name', 'Created Date'],
    "Task Revenue & Expense Report": ['Project Name', 'Main Task Name', 'Group Task Name', 'Task Name', 'Task Progress', 'Unit', 'Revenue per task', 'Expense per task'],
    "Task Attendance Report": ['Party Name', 'Workforce Name', 'Project Name', 'Attendance Date', 'Attendance Status', 'Main Task Name', 'Group Task Name', 'Task Name', 'Workers on Task', 'Work Hours', 'Total Hours', 'Task Labour Cost'],
    "Cost Code Expense Analysis": ['Cost Code', 'Amount', 'Budget Amount', 'Actual Expense', 'Budget Variance'],
    "Project Wise Expense Summary": ['Project Name', 'Total Expense', 'Cost Code Expense', 'Other Expense'],
    "Material Received & Used Report": ['Project Name', 'Material Name', 'Opening Quantity', 'Received Quantity', 'Used Quantity', 'Closing Quantity'],
    "Material Stock Report": ['Material Name', 'Category', 'Current Stock', 'Unit', 'Average Unit Cost', 'Total Stock Value'],
    "Unbilled Item Report": ['Project Name', 'Vendor Name', 'Item Name', 'Unbilled Quantity', 'Unit', 'Avg Cost', 'Unbilled Amount'],
    "PO Summary Report": ['PO Number', 'Material', 'Amount', 'Discount', 'Other Charges', 'Tax Amount', 'Total Amount', 'Approval Status', 'Approved or Rejected By', 'PO Quantity', 'PO Date', 'Main Task Name', 'Group Task Name', 'Task Name', 'Equipment Name', 'Equipment No'],
    "Material Received without PO": ['Project Name', 'Material Name', 'Quantity', 'Unit', 'Vendor Name', 'Challan Number', 'Received Date'],
    "Purchase Order Item Report": ['PO Number', 'Item Name', 'Specifications', 'Quantity', 'Unit', 'Rate', 'Tax Pct', 'Total Amount'],
    "Production Material Report": ['Project Name', 'Material Name', 'Production Qty', 'Used Qty', 'Production Date'],
    "Material Purchase Item Report": ['Invoice Date', 'Vendor Name', 'Item Name', 'Quantity', 'Unit', 'Rate', 'Tax Pct', 'Total Amount'],
    "Material Stock Movement Report": ['Project Name', 'Material Name', 'UOM', 'Date', 'Opening Qty', 'Stock In', 'Stock Out', 'Closing Qty'],
    "Attendance & Salary Report": ['Employee Name', 'Project Name', 'Attendance Date', 'Attendance Status', 'Shift Hours', 'Payable Amount'],
    "Staff Monthly Salary Slip": ['Employee Name', 'Designation', 'Salary Month', 'Gross Salary', 'Deductions', 'Net Salary Paid'],
    "Staff Salary Report": ['Employee Name', 'Designation', 'Bank Account No.', 'Bank Name', 'Net Salary'],
    "Fuel Efficiency Report": ['Equipment Name', 'Vehicle No', 'Total Fuel Consumed', 'Total Hours Used', 'Fuel Efficiency (L/hr)'],
    "Equipment Expense Summary": ['Equipment Name', 'Vehicle No', 'Rental Expense', 'Fuel Expense', 'Other Expense', 'Total Expense'],
    "Equipment Trip Report": ['Equipment Name', 'Vehicle No', 'Trip Date', 'Start Reading', 'End Reading', 'Total Distance/Hours'],
    "Warehouse Stock Movement Report": ['Warehouse Name', 'Material Name', 'Date', 'Stock In', 'Stock Out', 'Balance Stock'],
    "Warehouse Transaction Report": ['Warehouse Name', 'Transaction Type', 'Material Name', 'Quantity', 'Creator Name', 'Date'],
    "Warehouse Current Stock Report": ['Warehouse Name', 'Material Name', 'Category', 'Current Stock', 'Average Cost'],
    "Monthly P&L Report": ['Month', 'Total Sales', 'Material Expense', 'Labor Expense', 'Equipment Expense', 'Other Expense', 'Net Profit'],
    "Equipment Library": ['Equipment Name', 'Vehicle No', 'Equipment Type', 'Vendor Name', 'Rental Rate', 'UOM'],
    "Quotation Report": ['Quotation Number', 'Project Name', 'Client Name', 'Quotation Date', 'Estimated Amount', 'Status'],
    "Quotation Item Report": ['Quotation Number', 'Item Name', 'Description', 'Cost Code', 'Unit', 'Cost Price', 'Markup', 'Selling Price'],
    "BOQ Measurement Book": ['Project Name', 'BOQ Code', 'Item Name', 'Length', 'Width', 'Height', 'Quantity', 'Unit'],
    "BOQ BOM Report": ['BOQ Item Name', 'Material Name', 'Specifications', 'Budget Qty', 'Unit', 'Budget Rate', 'Budget Amount'],
    "Budget vs Actual (Material Cost)": ['Project Name', 'Material Name', 'Budget Cost', 'Actual Cost', 'Variance'],
    "Budget vs Actual (Material Qty)": ['Project Name', 'Material Name', 'Budget Qty', 'Actual Qty', 'Variance'],
    "Budget vs Actual (Cost Code)": ['Project Name', 'Cost Code', 'Budget Amount', 'Actual Amount', 'Variance'],
    "Asset Allocation Report": ['Asset Name', 'Allocated To', 'Project Name', 'Allocation Date', 'Return Date', 'Status'],
    "Asset Status Report": ['Asset Name', 'Serial Number', 'Category', 'Purchase Date', 'Cost', 'Status']
  };

  const handleReportClick = (report: ReportItem) => {
    if (report.type === "view" && report.endpoint) {
      router.push(`/c/${companyId}/reports${report.endpoint}`);
    } else {
      setSelectedReport(report);
      setShowModal(true);
    }
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
          ["1", "2026-07-01", "Material Purchase", "Metro Terminal", "Anil Steels", "Purchase of Grade-A rebars", "C-102", "Paid", "45000", "45000", "45000", "0", "2026-07-10", "Auto Approved"],
          ["2", "2026-07-03", "Labour Payroll", "Metro Terminal", "Sanjay Yadav", "Shift allowance supervisor", "C-405", "Approved", "8000", "8000", "0", "8000", "2026-07-15", "Pending Review"]
        ];
      } else if (reportName === "Sales (GSTR-1)") {
        mockRows = [
          ["27AAAAA1111A1Z1", "L&T Construction", "Maharashtra", "INV-2026-081", "118000", "2026-07-02", "100000", "18%", "9000", "9000", "0", "18000"]
        ];
      } else if (reportName === "Company Payments") {
        mockRows = [
          ["2026-07-01", "Metro Terminal", "Site Cash Account", "Yash Desai", "8000", "Demo Engineer", "Salary Advance", "Staff", "UPI", "Advance paid for salary ledger opening"]
        ];
      } else if (reportName === "Project Wise Payment Summary") {
        mockRows = [
          ["Metro Terminal (Phase 2)", "120000", "450000", "32000", "18000", "250000", "1200000", "870000", "870000", "1200000", "330000", "27.5%", "330000"],
          ["Bypass Highway Flyover", "85000", "120000", "15000", "9000", "0", "500000", "229000", "229000", "500000", "271000", "54.2%", "271000"]
        ];
      } else if (reportName === "Staff Muster Roll") {
        mockRows = [
          ["1", "EMP-001", "Yash Desai", "Engineer", "9876543210", "1234567890", "SBI", "Monthly", "60000", "26", "2", "4", "30", "5", "40000", "15000", "5000", "3000", "57000", "60000"],
          ["2", "EMP-002", "Ramesh Kumar", "Mason", "9876543211", "1234567891", "HDFC", "Daily", "22000", "22", "1", "4", "27", "12", "15000", "5000", "2000", "1500", "20500", "22000"]
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
      } else if (reportName === "BOQ Workorder Summary Report") {
        mockRows = [
          ["Metro Terminal Phase 2", "L&T Civil Division", "2026-06-15"],
          ["Flyover Bypass", "National Highway Authority", "2026-06-28"]
        ];
      } else if (reportName === "BOQ Item Report") {
        mockRows = [
          ["Metro Terminal", "Excavation and Raft", "WO-ARCH-001", "L&T Civil", "2026-05-15"],
          ["Metro Terminal", "Pillar Reinforcement", "WO-ARCH-002", "L&T Civil", "2026-05-20"]
        ];
      } else if (reportName === "Equipment Usage Detail Report") {
        mockRows = [
          ["Metro Terminal", "Excavator JCB-3DX", "MH-14-EX-4512", "Anil Steels", "150"],
          ["Metro Terminal", "Transit Mixer TM-10", "MH-14-MX-8891", "Yash Desai", "80"]
        ];
      } else if (reportName === "CRM Lead Detail Report") {
        mockRows = [
          ["05-Jul-2026", "Own", "Anujuman", "0882816316", "", "medium", "Facebook", ""],
          ["05-Jul-2026", "Own", "Yash", "7628371919", "New Lead", "medium", "", ""]
        ];
      } else if (reportName === "Material Request Item Report") {
        mockRows = [
          ["REQ-001", "Metro Terminal", "Cement OPC 53", "Grade A", "bags", "500", "500", "0"],
          ["REQ-002", "Metro Terminal", "Fine Sand", "High density", "m³", "100", "80", "20"]
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
          ["Metro Terminal", "L&T Civil Division", "Yash Desai", "2026-07-01", "25"],
          ["Metro Terminal", "Sanjay Yadav Subcontractor", "Ramesh Kumar", "2026-07-02", "18"]
        ];
      } else if (reportName === "Payment Upload Template") {
        mockRows = [
          ["19-Jan-2026", "Out", "Abhijit", "Project-Vikroli", "5000", "For dec month salary", "Cash", "", "Salary", "1c050f4e-5f4a-4d47-ac53-0efefd921dc2"],
          ["19-Jan-2026", "Out", "Akash Panwar", "July_2025 Project Test", "4000", "For dec month salary", "Cheque", "54909090", "Salary", "8df95ec3-59a9-4c80-a2e7-1890eb743fa3"],
          ["19-Jan-2026", "In", "Aishwarya", "July_2025 Project Test", "8000", "Bill", "Bank Transfer", "54909090", "Material", ""]
        ];
      } else if (reportName === "Payroll Upload Template") {
        mockRows = [
          ["Payrole-05", "Office", "8", "Sat,Sun, tuesday", "100", "plumbing", "bth-03", "Punch", "Monthly", "10000", "5000", "allowance 6", "basic", "50", "2500"],
          ["Payrole-06", "Site", "7", "Sun", "600", "plumbing", "bth-03", "shift", "Monthly", "0", "", "", "", "", ""]
        ];
      } else if (reportName === "Purchase (GSTR-2)") {
        mockRows = [
          ["27BBBBB2222B2Z2", "Anil Steels", "Maharashtra", "BILL-2026-905", "53100", "2026-07-01", "45000", "18%", "4050", "4050", "0", "8100"]
        ];
      } else if (reportName === "All Expense Deduction / Retention Report") {
        mockRows = [
          ["Safety Helmet", "12000", "EXP-091", "Consumables", "Metro Terminal", "Anil Steels", "Yash Desai", "2026-07-15"],
          ["Site Stationery", "1500", "EXP-092", "Office Expense", "Metro Terminal", "Anil Steels", "Yash Desai", "2026-07-20"]
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
          ["Anil Steels", "Supplier", "Metro Terminal", "0", "45000", "1200", "0", "500", "0"],
          ["Sanjay Yadav", "Labour Contractor", "Metro Terminal", "8000", "0", "0", "25000", "0", "0"]
        ];
      } else if (reportName === "Subcon Workorder Summary Report") {
        mockRows = [
          ["Sanjay Yadav Contractor", "500000", "35%", "175000", "150000", "120000", "Yash Desai", "2026-06-10"],
          ["Super Plumbing Corp", "350000", "10%", "35000", "30000", "20000", "Yash Desai", "2026-06-12"]
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
          ["Yash Desai", "Engineer", "Office Staff", "Monthly", "60000", "55000", "52000", "8", "Basic: 40k, HRA: 15k", "2026-01-01"]
        ];
      } else if (reportName === "Task Resource Budget Vs Actual Report") {
        mockRows = [
          ["Excavation & Raft", "Substructure", "Raft Slab Concrete", "m³", "500", "320", "OPC Cement", "Material", "400", "420", "1500", "1000", "600000", "420000", "0", "0"]
        ];
      } else if (reportName === "Site Inspection Report") {
        mockRows = [
          ["Metro Terminal", "2026-07-02", "Foundation QC Check", "Passed", "5 Checked", "All structural parameters compliant", "2026-07-02"]
        ];
      } else if (reportName === "Task BOQ Billed & Unbilled Qty Report") {
        mockRows = [
          ["Metro Terminal", "Excavation & Raft", "Substructure", "Raft Concrete", "m³", "500", "320", "64%", "Active", "BOQ-SEC-1", "300", "20"]
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
      ].join("\n");

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
                      {filteredReports.map((report) => (
                        <div
                          key={report.name}
                          onClick={() => handleReportClick(report)}
                          className="group flex items-center justify-between p-2 rounded-lg hover:bg-elevated cursor-pointer transition-all"
                        >
                          <span className="text-xs text-muted group-hover:text-foreground transition-colors truncate max-w-[80%]">
                            {report.name}
                          </span>
                          <div className="flex items-center gap-2">
                            {report.type === "view" ? (
                              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-semibold">VIEW</span>
                            ) : (
                              <span className="text-muted group-hover:text-primary transition-colors text-sm">
                                {report.type === "excel" ? "📥" : "📄"}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
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
