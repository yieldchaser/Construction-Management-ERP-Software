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

  // Specific Columns mapped from the actual Onsite Teams reconstructed spreadsheets
  const exportSchemas: Record<string, string[]> = {
    "Company Expense Report": ['S.NO.', 'Expense Date', 'Expense Type', 'Project Name', 'Party Name', 'Notes', 'Cost Code', 'Expense Status', 'Total Amount', 'Net Amount', 'Paid Amount', 'Unpaid Amount', 'Due Date', 'Approval Status'],
    "Staff Muster Roll": ['Labor / Subcontractor', 'Workforce Type', 'Project Name', '01-Jul-26', '02-Jul-26', '03-Jul-26', '04-Jul-26'],
    "Company Payments": ['Date', 'Project', 'Sender', 'Receiver', 'Amount', 'Creator', 'Category', 'Trade', 'Payment Mode', 'Description'],
    "Project Wise Payment Summary": ['Project Name', 'Salary', 'Net Purchase', 'Other Expense', 'Site Expense', 'SubCon Expense', 'Total Sales Invoice', 'Total expense', 'Total Out', 'Total IN', 'Balance', 'Margin', 'Net Transfer'],
    "Sales (GSTR-1)": ['Party GSTIN', 'Party Name', 'Place of Supply', 'Invoice Number', 'Invoice Value', 'Invoice Date', 'Taxable Amt', 'Tax Rate', 'CGST Amt', 'SGST Amt', 'IGST Amt', 'Total Tax Amt']
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
          ["Yash Desai", "Staff", "Metro Terminal", "P", "P", "P", "P"],
          ["Ramesh Kumar", "Mason", "Metro Terminal", "P", "P", "A", "P"]
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
