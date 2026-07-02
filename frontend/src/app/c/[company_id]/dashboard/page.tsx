"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DashboardPage() {
  const params = useParams();
  const companyId = params?.company_id as string;

  const [activeProject, setActiveProject] = useState("d0000000-0000-0000-0000-000000000001");
  const [tallySyncStatus, setTallySyncStatus] = useState("Connected");
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [overviewTab, setOverviewTab] = useState<"operational" | "financial">("operational");
  const [operationalData, setOperationalData] = useState<any>(null);
  const [financialData, setFinancialData] = useState<any>({
    advance_paid: 0.0,
    to_pay: 0.0,
    to_receive: 0.0,
    advance_received: 0.0,
    chart_months: ["Jun 2026"],
    sales_series: [0.0],
    expense_series: [-1000.0],
    margin_series: [1000.0],
    expense_by_type: [
      { name: "Debit Note", value: -1000.0 }
    ],
    party_balances: [],
    project_summaries: [
      {
        project_name: "MP SITE",
        project_status: "Ongoing",
        project_health: "-",
        project_budget: 0,
        total_expense: -1000,
        budget_remaining: 1000,
        total_sales: 0,
        project_margin: 1000,
        payment_in: 0,
        payment_out: 0,
        cash_balance: 0
      }
    ]
  });
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    setIsLightTheme(document.documentElement.classList.contains("light-theme"));
  }, []);

  const toggleTheme = () => {
    const nextVal = !isLightTheme;
    setIsLightTheme(nextVal);
    if (nextVal) {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  };

  useEffect(() => {
    if (companyId) {
      fetch(`http://localhost:8000/apis/v3/analytics/company/${companyId}/operational`)
        .then((res) => res.json())
        .then((data) => setOperationalData(data))
        .catch((err) => console.error("Failed to fetch operational stats", err));

      fetch(`http://localhost:8000/apis/v3/analytics/company/${companyId}/financial`)
        .then((res) => res.json())
        .then((data) => setFinancialData(data))
        .catch((err) => console.error("Failed to fetch financial stats", err));
    }
  }, [companyId]);

  // Project setup wizard state
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    attendance_radius_meters: 500,
    teamMember: ""
  });

  const [projects, setProjects] = useState([
    { id: "d0000000-0000-0000-0000-000000000001", name: "Metro Terminal (Phase 2)", code: "MET-02", city: "Mumbai", address: "Andheri East Metro Line", attendance_radius_meters: 500, status: "Ongoing", health: "Healthy", startDate: "2026-01-01", endDate: "2026-12-31" },
    { id: "d0000000-0000-0000-0000-000000000002", name: "Bypass Highway Flyover", code: "HWY-FLY", city: "Pune", address: "NH-4 Bypass Crossing", attendance_radius_meters: 300, status: "Ongoing", health: "Warning", startDate: "2026-02-15", endDate: "2027-01-10" },
    { id: "d0000000-0000-0000-0000-000000000003", name: "Alpha Premium Residences", code: "ALF-RES", city: "Delhi", address: "Sector 62, Dwarka", attendance_radius_meters: 500, status: "Ongoing", health: "Critical", startDate: "2025-10-01", endDate: "2026-09-30" },
  ]);

  // Steel calculator states
  const [diameter, setDiameter] = useState(12);
  const [barCount, setBarCount] = useState(10);
  const [barLength, setBarLength] = useState(3);
  const [wastagePercent, setWastagePercent] = useState(5);

  // ── Chart type switcher ────────────────────────────────────────────────────
  const [openPicker, setOpenPicker] = useState<string | null>(null);
  const [ctHealth, setCtHealth] = useState("bar");
  const [ctAttendance, setCtAttendance] = useState("bar");
  const [ctMaterial, setCtMaterial] = useState("bar");

  // Close picker when clicking outside
  useEffect(() => {
    if (!openPicker) return;
    const close = () => setOpenPicker(null);
    // Use mousedown (not click) so it's consistent with picker button onMouseDown handlers
    const t = setTimeout(() => document.addEventListener("mousedown", close), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", close); };
  }, [openPicker]);

  // Mini SVG icons for each chart type in the picker grid
  const chartTypeIcon = (id: string, active: boolean) => {
    const c = active ? "#7C5CFF" : "#6b7280";
    switch (id) {
      case "pie": return <svg viewBox="0 0 18 18" width="16" height="16"><path d="M9,9L9,2A7,7,0,0,1,16,9Z" fill={c}/><path d="M9,9L16,9A7,7,0,0,1,4.5,14.6Z" fill={c} opacity="0.6"/><path d="M9,9L4.5,14.6A7,7,0,1,1,9,2Z" fill={c} opacity="0.3"/></svg>;
      case "donut": return <svg viewBox="0 0 18 18" width="16" height="16"><path d="M9,2A7,7,0,0,1,16,9" stroke={c} fill="none" strokeWidth="3.5"/><path d="M16,9A7,7,0,0,1,4.5,14.6" stroke={c} fill="none" strokeWidth="3.5" opacity="0.6"/><path d="M4.5,14.6A7,7,0,1,1,9,2" stroke={c} fill="none" strokeWidth="3.5" opacity="0.3"/></svg>;
      case "funnel": case "funnel2": case "funnel_ring": return <svg viewBox="0 0 18 18" width="16" height="16"><polygon points="2,2 16,2 11,10 11,16 7,16 7,10" fill={c} opacity="0.7"/></svg>;
      case "bar": case "bar_col": case "grouped_col": return <svg viewBox="0 0 18 18" width="16" height="16"><rect x="1" y="10" width="4" height="7" rx="0.5" fill={c}/><rect x="7" y="6" width="4" height="11" rx="0.5" fill={c} opacity="0.8"/><rect x="13" y="3" width="4" height="14" rx="0.5" fill={c} opacity="0.6"/></svg>;
      case "stacked": case "stacked_bar": return <svg viewBox="0 0 18 18" width="16" height="16"><rect x="1" y="12" width="4" height="5" rx="0.5" fill={c}/><rect x="1" y="8" width="4" height="4" rx="0.5" fill={c} opacity="0.5"/><rect x="7" y="9" width="4" height="8" rx="0.5" fill={c} opacity="0.9"/><rect x="7" y="5" width="4" height="4" rx="0.5" fill={c} opacity="0.45"/><rect x="13" y="6" width="4" height="11" rx="0.5" fill={c} opacity="0.8"/><rect x="13" y="2" width="4" height="4" rx="0.5" fill={c} opacity="0.4"/></svg>;
      case "grouped": return <svg viewBox="0 0 18 18" width="16" height="16"><rect x="1" y="9" width="2.5" height="8" rx="0.5" fill={c}/><rect x="4" y="5" width="2.5" height="12" rx="0.5" fill={c} opacity="0.5"/><rect x="8" y="6" width="2.5" height="11" rx="0.5" fill={c}/><rect x="11" y="3" width="2.5" height="14" rx="0.5" fill={c} opacity="0.5"/></svg>;
      case "scatter": case "scatter2": case "scatter3": case "scatter_ring": case "scatter_group": return <svg viewBox="0 0 18 18" width="16" height="16"><circle cx="3" cy="14" r="2" fill={c}/><circle cx="7" cy="9" r="2" fill={c} opacity="0.7"/><circle cx="12" cy="12" r="2" fill={c} opacity="0.9"/><circle cx="15" cy="5" r="2" fill={c} opacity="0.5"/><circle cx="5" cy="5" r="2" fill={c} opacity="0.8"/></svg>;
      case "line": case "cross": return <svg viewBox="0 0 18 18" width="16" height="16"><polyline points="1,14 5,8 9,11 13,4 17,7" stroke={c} fill="none" strokeWidth="2"/><line x1="1" y1="17" x2="17" y2="17" stroke={c} strokeWidth="1" opacity="0.3"/></svg>;
      case "smooth": return <svg viewBox="0 0 18 18" width="16" height="16"><path d="M1,14 C4,14 4,6 8,9 C12,12 12,3 17,6" stroke={c} fill="none" strokeWidth="2"/><line x1="1" y1="17" x2="17" y2="17" stroke={c} strokeWidth="1" opacity="0.3"/></svg>;
      case "line_pt": return <svg viewBox="0 0 18 18" width="16" height="16"><polyline points="1,14 5,8 9,11 13,4 17,7" stroke={c} fill="none" strokeWidth="1.5"/><circle cx="1" cy="14" r="1.5" fill={c}/><circle cx="5" cy="8" r="1.5" fill={c}/><circle cx="9" cy="11" r="1.5" fill={c}/><circle cx="13" cy="4" r="1.5" fill={c}/><circle cx="17" cy="7" r="1.5" fill={c}/></svg>;
      case "smooth_pt": return <svg viewBox="0 0 18 18" width="16" height="16"><path d="M1,14 C4,14 4,6 8,9 C12,12 12,3 17,6" stroke={c} fill="none" strokeWidth="1.5"/><circle cx="1" cy="14" r="1.5" fill={c}/><circle cx="8" cy="9" r="1.5" fill={c}/><circle cx="17" cy="6" r="1.5" fill={c}/></svg>;
      case "area": case "area_pt": return <svg viewBox="0 0 18 18" width="16" height="16"><polygon points="1,17 1,14 5,8 9,11 13,4 17,7 17,17" fill={c} opacity="0.25"/><polyline points="1,14 5,8 9,11 13,4 17,7" stroke={c} fill="none" strokeWidth="1.5"/></svg>;
      case "smooth_area": case "smooth_area_pt": return <svg viewBox="0 0 18 18" width="16" height="16"><path d="M1,14 C4,14 4,6 8,9 C12,12 12,3 17,6" stroke={c} fill="none" strokeWidth="1.5"/><path d="M1,17 L1,14 C4,14 4,6 8,9 C12,12 12,3 17,6 L17,17 Z" fill={c} opacity="0.25"/></svg>;
      case "sunburst": case "rose": return <svg viewBox="0 0 18 18" width="16" height="16"><circle cx="9" cy="9" r="2.5" fill={c}/><path d="M9,2 L9,5.5 M14.2,4.8 L11.4,6.6 M14.2,13.2 L11.4,11.4 M9,16 L9,12.5 M3.8,13.2 L6.6,11.4 M3.8,4.8 L6.6,6.6" stroke={c} strokeWidth="1.5" strokeLinecap="round"/></svg>;
      case "filter": case "heatmap": case "grid": return <svg viewBox="0 0 18 18" width="16" height="16"><rect x="1" y="1" width="7" height="7" rx="1" fill={c} opacity="0.8"/><rect x="10" y="1" width="7" height="7" rx="1" fill={c} opacity="0.3"/><rect x="1" y="10" width="7" height="7" rx="1" fill={c} opacity="0.4"/><rect x="10" y="10" width="7" height="7" rx="1" fill={c} opacity="0.9"/></svg>;
      case "table": return <svg viewBox="0 0 18 18" width="16" height="16"><rect x="1" y="1" width="16" height="16" rx="1.5" stroke={c} fill="none" strokeWidth="1.2"/><line x1="1" y1="5.5" x2="17" y2="5.5" stroke={c} strokeWidth="1.2"/><line x1="1" y1="10" x2="17" y2="10" stroke={c} strokeWidth="1.2"/><line x1="1" y1="14.5" x2="17" y2="14.5" stroke={c} strokeWidth="1.2"/><line x1="6" y1="5.5" x2="6" y2="17" stroke={c} strokeWidth="1.2"/><line x1="12" y1="5.5" x2="12" y2="17" stroke={c} strokeWidth="1.2"/></svg>;
      default: return <svg viewBox="0 0 18 18" width="16" height="16"><rect x="2" y="2" width="14" height="14" rx="2" fill="none" stroke={c} strokeWidth="1.2" opacity="0.5"/></svg>;
    }
  };

  // Chart picker popup (5×5 grid matching reference app)
  const renderChartPicker = (pickerId: string, activeType: string, setType: (t: string) => void) => {
    if (openPicker !== pickerId) return null;
    const ALL = [
      "pie","donut","funnel","funnel2","bar",
      "stacked","grouped","scatter","line","smooth",
      "line_pt","smooth_pt","area","smooth_area","area_pt",
      "smooth_area_pt","filter","grouped_col","sunburst","rose",
      "scatter2","scatter3","cross","heatmap","table"
    ];
    return (
      // Positioned relative to the OUTER buttons row (not the tiny trigger div)
      // right-0 = flush with right edge of buttons row; top-full = just below it
      <div
        style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 9999, width: 264 }}
        className="bg-[#1A1726] border border-white/10 rounded-xl p-3 shadow-2xl"
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="grid grid-cols-5 gap-1.5">
          {ALL.map(ct => (
            <button
              key={ct}
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setType(ct); setOpenPicker(null); }}
              title={ct.replace(/_/g," ")}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all hover:bg-white/10 border ${
                activeType === ct ? "bg-primary/20 border-primary/40" : "border-transparent hover:border-white/10"
              }`}
            >
              {chartTypeIcon(ct, activeType === ct)}
            </button>
          ))}
        </div>
      </div>
    );
  };

  // Reusable chart header with type switcher icon buttons
  // The picker is rendered INSIDE the outer buttons-row div (which has relative)
  // so the popup is anchored to that div, not the tiny individual button.
  const renderChartHeader = (title: string, pickerId: string, activeType: string, setType: (t: string) => void) => (
    <div className="w-full flex justify-between items-center border-b border-white/5 pb-3">
      <span className="text-xs font-bold text-white uppercase tracking-wider">{title}</span>
      {/* relative here is the positioning context for the picker popup */}
      <div className="flex items-center gap-0.5 relative">
        <button className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-all" title="Sort">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1 3h11M3 6.5h7M5 10h3"/></svg>
        </button>
        {/* Chart type toggle button — no inner relative wrapper needed any more */}
        <button
          onMouseDown={e => { e.stopPropagation(); e.preventDefault(); setOpenPicker(openPicker === pickerId ? null : pickerId); }}
          className={`p-1.5 rounded transition-all ${
            openPicker === pickerId ? "bg-primary/20 text-primary" : "text-zinc-600 hover:text-zinc-400 hover:bg-white/5"
          }`}
          title="Change chart type"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="currentColor">
            <rect x="1" y="8" width="3" height="4" rx="0.5"/><rect x="5" y="5" width="3" height="7" rx="0.5"/><rect x="9" y="2" width="3" height="10" rx="0.5"/>
          </svg>
        </button>
        <button className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-all" title="Fullscreen">
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4.5V2h2.5M8.5 2H11v2.5M11 8.5V11H8.5M4.5 11H2V8.5"/></svg>
        </button>
        <button className="p-1.5 rounded text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-all font-bold leading-none" title="More options">⋮</button>
        {/* Picker popup — anchored here, wide enough for 5 columns */}
        {renderChartPicker(pickerId, activeType, setType)}
      </div>
    </div>
  );

  const standardUnitWeight = (diameter * diameter) / 162.0; // kg/m — IS 800 standard: D²/162
  const totalBarLength = barCount * barLength; // meters
  const totalWeightNoWastage = totalBarLength * standardUnitWeight; // kg
  const reinforcementWeight = totalWeightNoWastage * (1 + wastagePercent / 100); // kg

  const activeProjDetails = projects.find(p => p.id === activeProject) || projects[0];


  const handleSyncTally = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setTallySyncStatus("Synced Just Now");
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-border-custom bg-sidebar flex flex-col justify-between h-full shrink-0">
        <div className="flex flex-col overflow-y-auto flex-1">
          {/* Header */}
          <div className="p-6 flex items-center gap-3 border-b border-border-custom">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white">
              S
            </div>
            <span className="font-bold text-foreground tracking-tight">SiteFlow Console</span>
          </div>

          {/* Project Switcher */}
          <div className="p-4 border-b border-border-custom bg-foreground/[0.01]">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1.5">
              Active Project Context
            </label>
            <select
              value={activeProject}
              onChange={(e) => setActiveProject(e.target.value)}
              suppressHydrationWarning={true}
              className="w-full bg-elevated border border-border-custom rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setWizardData({ name: "", code: "", address: "", city: "", attendance_radius_meters: 500, teamMember: "" });
                setWizardStep(1);
                setIsWizardOpen(true);
              }}
              className="w-full mt-2 flex items-center justify-center gap-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg py-1.5 text-[11px] font-semibold text-primary transition-all cursor-pointer"
            >
              ➕ New Project
            </button>
          </div>

          {/* Module Links */}
          <nav className="p-4 space-y-6">
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Pre-Construction
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="#"
                    onClick={() => setActiveTab("overview")}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "overview"
                        ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>📊</span> Operational Overview
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    onClick={() => setActiveTab("scheduler")}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "scheduler"
                        ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>📅</span> Gantt Scheduler
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/budgeting/boq`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📑</span> BOQ Spreadsheet
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/crm`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🤝</span> CRM & Leads
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Project Execution
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/dpr`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>👷</span> Daily Progress (DPR)
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/procurement`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🛒</span> Procurement & RFQ
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/production`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🏭</span> Production Management
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/attendance`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📍</span> Attendance & Payroll
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/drawings`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📐</span> Drawings & Revisions
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/hr`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>👷</span> HR & Payroll
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/quality`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🛡️</span> Quality &amp; NCR
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Client Portal
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/reports`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📊</span> Progress Reports
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/reports/calculators`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🔩</span> Construction Calculators
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Asset Management
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/equipment`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🚜</span> Equipment Tracking
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Safety
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/safety`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🦺</span> HSE / Incidents
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Executive Intelligence
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/analytics`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📊</span> Analytics Dashboard
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Finance & Ledgers
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/finance`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>💵</span> Finance & Ledger
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${activeProject}/billing`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🧾</span> Work Orders & RA Bills
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    onClick={() => setActiveTab("tally")}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
                      activeTab === "tally"
                        ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>🔌</span> Tally ERP Integrator
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Company
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href={`/c/${companyId}/settings`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>⚙️</span> Company Settings
                  </Link>
                </li>
                <li>
                  <Link
                    href="/integrations"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🔗</span> Integrations Hub
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center font-bold text-xs text-white">
              DM
            </div>
            <div>
              <div className="text-xs font-semibold text-white">Demo Manager</div>
              <div className="text-[10px] text-zinc-500">Active Tenant</div>
            </div>
          </div>
          <Link
            href="/login"
            className="text-xs text-zinc-500 hover:text-primary transition-colors"
          >
            Exit
          </Link>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Top Header */}
        <header className="h-16 border-b border-border-custom px-8 flex items-center justify-between bg-sidebar shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">
              {activeProjDetails.name}
            </h1>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-zinc-400">
              📍 {activeProjDetails.city} Area
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.04] border border-border-custom text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {isLightTheme ? "🌙" : "☀️"}
            </button>

            {/* Tally Connection status dot */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-border-custom text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span>Tally Agent: {tallySyncStatus}</span>
            </div>

            <button
              onClick={handleSyncTally}
              disabled={isSyncing}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 border border-secondary/20 px-3.5 py-1.5 text-xs font-semibold text-secondary transition-all cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Syncing Ledgers...
                </>
              ) : (
                "Trigger Sync"
              )}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {activeTab === "overview" && (
            <>
              {/* Tab Selector */}
              <div className="flex border-b border-white/5 pb-2 gap-4 shrink-0">
                <button
                  onClick={() => setOverviewTab("operational")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    overviewTab === "operational"
                      ? "bg-primary/15 text-primary border border-primary/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  📊 Operational Dashboard
                </button>
                <button
                  onClick={() => setOverviewTab("financial")}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                    overviewTab === "financial"
                      ? "bg-secondary/15 text-secondary border border-secondary/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  💵 Financial Summary
                </button>
              </div>

              {overviewTab === "operational" && (
                <>
                  {/* Operational Summary Counters */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="rounded-xl border border-white/5 bg-[#0B0910] p-5 flex flex-col justify-center items-center text-center">
                      <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider block mb-1">Not Started Projects</span>
                      <span className="text-3xl font-black text-white">
                        {operationalData?.status_counts?.["Not Started"] ?? 0}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-[#0B0910] p-5 flex flex-col justify-center items-center text-center border-b-2 border-b-success">
                      <span className="text-[11px] font-bold text-success uppercase tracking-wider block mb-1">Ongoing Projects</span>
                      <span className="text-3xl font-black text-white">
                        {operationalData?.status_counts?.["Ongoing"] ?? projects.length}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-[#0B0910] p-5 flex flex-col justify-center items-center text-center">
                      <span className="text-[11px] font-bold text-yellow-500 uppercase tracking-wider block mb-1">Onhold Projects</span>
                      <span className="text-3xl font-black text-white">
                        {operationalData?.status_counts?.["Onhold"] ?? 0}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/5 bg-[#0B0910] p-5 flex flex-col justify-center items-center text-center">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">Completed Projects</span>
                      <span className="text-3xl font-black text-white">
                        {operationalData?.status_counts?.["Completed"] ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Project Health & Operational Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Project Health Chart — chart type switchable */}
                    <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-4 relative">
                      {renderChartHeader("Project Health", "health", ctHealth, setCtHealth)}
                      {(() => {
                        const hc = operationalData?.health_counts ?? { Healthy: 0, Warning: 0, Critical: 0 };
                        const segments = [
                          { label: "Healthy", value: hc.Healthy ?? 0, color: "#00E5A3" },
                          { label: "Warning", value: hc.Warning ?? 0, color: "#EAB308" },
                          { label: "Critical", value: hc.Critical ?? 0, color: "#E8184C" },
                        ];
                        const total = segments.reduce((s, d) => s + d.value, 0) || 1;
                        const maxV = Math.max(...segments.map(s => s.value), 1);

                        if (ctHealth === "table") return (
                          <div className="space-y-2 pt-2">
                            {segments.map(s => (
                              <div key={s.label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5">
                                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full" style={{background:s.color}}/><span className="text-xs text-zinc-300">{s.label}</span></div>
                                <span className="font-bold text-white font-mono text-sm">{s.value}</span>
                              </div>
                            ))}
                            <div className="flex justify-between px-3 py-1 text-[10px] text-zinc-500"><span>Total Projects</span><span className="font-bold text-white">{total}</span></div>
                          </div>
                        );

                        if (ctHealth === "pie" || ctHealth === "donut") {
                          let cumAngle = -90;
                          const ro = ctHealth === "donut" ? 36 : 42, ri = 22;
                          const paths = segments.map(s => {
                            const angle = (s.value / total) * 360 || 0;
                            const r1 = cumAngle * Math.PI / 180, r2 = (cumAngle + angle) * Math.PI / 180;
                            const cx = 50, cy = 50;
                            const x1 = cx + ro * Math.cos(r1), y1 = cy + ro * Math.sin(r1);
                            const x2 = cx + ro * Math.cos(r2), y2 = cy + ro * Math.sin(r2);
                            const laf = angle > 180 ? 1 : 0;
                            const d = ctHealth === "donut"
                              ? `M${x1.toFixed(1)},${y1.toFixed(1)} A${ro},${ro} 0 ${laf},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${(cx+ri*Math.cos(r2)).toFixed(1)},${(cy+ri*Math.sin(r2)).toFixed(1)} A${ri},${ri} 0 ${laf},0 ${(cx+ri*Math.cos(r1)).toFixed(1)},${(cy+ri*Math.sin(r1)).toFixed(1)} Z`
                              : `M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${ro},${ro} 0 ${laf},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
                            cumAngle += angle;
                            return { d, color: s.color, label: s.label, value: s.value };
                          });
                          return (
                            <div className="flex items-center gap-4 pt-2">
                              <div className="relative flex-shrink-0">
                                <svg viewBox="0 0 100 100" className="w-28 h-28">{paths.map((p,i) => <path key={i} d={p.d} fill={p.color} opacity="0.85"/>)}</svg>
                                {ctHealth === "donut" && <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-zinc-500">Total</span><span className="text-xl font-black text-white">{total}</span></div>}
                              </div>
                              <div className="space-y-2">{segments.map(s => (<div key={s.label} className="flex items-center gap-2 text-xs"><div className="h-2 w-2 rounded-full flex-shrink-0" style={{background:s.color}}/><span className="text-zinc-400">{s.label}</span><span className="font-bold text-white ml-auto pl-3">{s.value}</span></div>))}</div>
                            </div>
                          );
                        }

                        if (ctHealth === "scatter" || ctHealth === "scatter2" || ctHealth === "scatter3") {
                          const W=200, H=80;
                          const pts = segments.map((s,i) => ({ x: 30+i*70, y: H-5-((s.value/maxV)*(H-15)) }));
                          return (
                            <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                              <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                              {pts.map((p,i) => <circle key={i} cx={p.x} cy={p.y} r="6" fill={segments[i].color} opacity="0.8"/>)}
                              {segments.map((s,i) => <text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="7" textAnchor="middle">{s.label}</text>)}
                            </svg>
                          );
                        }

                        if (ctHealth === "line" || ctHealth === "smooth" || ctHealth === "line_pt" || ctHealth === "smooth_pt") {
                          const W=200, H=80;
                          const pts = segments.map((s,i) => ({ x: 30+i*70, y: H-5-((s.value/maxV)*(H-15)) }));
                          const polyPts = pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                          return (
                            <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                              <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                              <polyline points={polyPts} fill="none" stroke="#7C5CFF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                              {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="4" fill={segments[i].color} stroke="#0B0910" strokeWidth="1.5"/>)}
                              {segments.map((s,i)=><text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="7" textAnchor="middle">{s.label}</text>)}
                            </svg>
                          );
                        }

                        if (ctHealth === "area" || ctHealth === "smooth_area" || ctHealth === "area_pt" || ctHealth === "smooth_area_pt") {
                          const W=200, H=80;
                          const pts = segments.map((s,i) => ({ x: 30+i*70, y: H-5-((s.value/maxV)*(H-15)) }));
                          const polyPts = pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                          const areaPts = [`10,${H}`,...pts.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`),`${W-10},${H}`].join(" ");
                          return (
                            <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                              <defs><linearGradient id="hAreaG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.4"/><stop offset="100%" stopColor="#7C5CFF" stopOpacity="0.02"/></linearGradient></defs>
                              <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                              <polygon points={areaPts} fill="url(#hAreaG)"/>
                              <polyline points={polyPts} fill="none" stroke="#7C5CFF" strokeWidth="2" strokeLinejoin="round"/>
                              {pts.map((p,i)=><circle key={i} cx={p.x} cy={p.y} r="3.5" fill={segments[i].color}/>)}
                              {segments.map((s,i)=><text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="7" textAnchor="middle">{s.label}</text>)}
                            </svg>
                          );
                        }

                        // Default: horizontal bar chart per health category
                        return (
                          <div className="space-y-3 pt-2">
                            <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold">Project Health Count</div>
                            {segments.map(s => (
                              <div key={s.label} className="space-y-1">
                                <div className="flex justify-between text-xs"><span className="text-zinc-400">{s.label}</span><span className="font-bold font-mono" style={{color:s.color}}>{s.value}</span></div>
                                <div className="h-5 bg-white/[0.02] rounded overflow-hidden"><div className="h-full rounded transition-all" style={{width:`${(s.value/maxV)*100}%`,background:s.color,opacity:0.75}}/></div>
                              </div>
                            ))}
                            <div className="text-[9px] text-zinc-500 text-center pt-1">Project Health</div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Project Operational Summary */}
                    <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-4">
                      <div className="flex flex-wrap justify-between items-center gap-2 border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">📊 Project Operational Summary</h4>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold font-mono">Real-time Stats</span>
                        </div>
                      </div>

                      <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                              <th className="py-2 px-3">Project Health</th>
                              <th className="py-2 px-3">Project Name</th>
                              <th className="py-2 px-3">Start Date</th>
                              <th className="py-2 px-3">End Date</th>
                              <th className="py-2 px-3">Progress</th>
                              <th className="py-2 px-3">Customer</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {(operationalData?.projects ?? projects).map((p: any) => {
                              const prog = p.progress ?? 0;
                              return (
                                <tr key={p.project_id ?? p.id} className="hover:bg-white/[0.01] transition-colors">
                                  <td className="py-2.5 px-3">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                      (p.health ?? "Healthy") === "Healthy" ? "bg-success/10 text-success border-success/20" :
                                      (p.health ?? "Healthy") === "Warning" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                                      "bg-primary/10 text-primary border-primary/20"
                                    }`}>
                                      {p.health ?? "Healthy"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-white">{p.project_name ?? p.name}</td>
                                  <td className="py-2.5 px-3 text-zinc-400 font-mono">{p.start_date || "—"}</td>
                                  <td className="py-2.5 px-3 text-zinc-400 font-mono">{p.end_date || "—"}</td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                        <div className="bg-primary h-full rounded-full" style={{ width: `${prog}%` }} />
                                      </div>
                                      <span className="font-mono text-[10px] text-zinc-400">{prog}%</span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-white">{p.customer_name ?? "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Sparklines Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Last 7 Days Attendance — chart type switchable */}
                    <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-3">
                      {renderChartHeader("\uD83D\uDC77 Last 7 Days Attendance", "attendance", ctAttendance, setCtAttendance)}
                      {(() => {
                        const attData = operationalData?.attendance_series ?? [
                          { date: "06-26", present: 8, absent: 1 }, { date: "06-27", present: 9, absent: 0 },
                          { date: "06-28", present: 6, absent: 3 }, { date: "06-29", present: 8, absent: 1 },
                          { date: "06-30", present: 7, absent: 2 }, { date: "07-01", present: 9, absent: 0 },
                          { date: "07-02", present: 8, absent: 1 },
                        ];
                        const maxVal = Math.max(...attData.map((d: any) => (d.present??0)+(d.absent??0)), 1);
                        const H=90, W=200;
                        const pts = attData.map((d: any, i: number) => ({ x: 10+(i/Math.max(attData.length-1,1))*(W-20), y: H-5-((d.present??0)/maxVal*(H-15)) }));
                        const polyPts = pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                        const areaPts = [`10,${H}`,...pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),`${W-10},${H}`].join(" ");

                        if (ctAttendance === "table") return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs"><thead><tr className="border-b border-white/5 text-zinc-500 font-bold uppercase text-[9px]">
                              <th className="py-1.5 px-2 text-left">Date</th><th className="py-1.5 px-2 text-right text-success">Present</th><th className="py-1.5 px-2 text-right text-red-400">Absent</th>
                            </tr></thead><tbody className="divide-y divide-white/[0.03]">
                              {attData.map((d: any, i: number) => (<tr key={i} className="hover:bg-white/[0.01]"><td className="py-1.5 px-2 font-mono text-zinc-400">{d.date}</td><td className="py-1.5 px-2 text-right font-bold text-success">{d.present??0}</td><td className="py-1.5 px-2 text-right font-bold text-red-400">{d.absent??0}</td></tr>))}
                            </tbody></table>
                          </div>
                        );

                        if (ctAttendance === "line" || ctAttendance === "smooth" || ctAttendance === "line_pt" || ctAttendance === "smooth_pt") return (
                          <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                            <defs><linearGradient id="attLG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#00E5A3"/><stop offset="100%" stopColor="#7C5CFF"/></linearGradient></defs>
                            <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                            <polyline points={polyPts} fill="none" stroke="url(#attLG)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                            {pts.map((p: any, i: number) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#00E5A3" stroke="#0B0910" strokeWidth="1.5"/>)}
                            {attData.map((d: any, i: number) => <text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="6" textAnchor="middle">{d.date.slice(-5)}</text>)}
                          </svg>
                        );

                        if (ctAttendance === "area" || ctAttendance === "smooth_area" || ctAttendance === "area_pt" || ctAttendance === "smooth_area_pt") return (
                          <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                            <defs><linearGradient id="attAG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#00E5A3" stopOpacity="0.4"/><stop offset="100%" stopColor="#00E5A3" stopOpacity="0.02"/></linearGradient></defs>
                            <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                            <polygon points={areaPts} fill="url(#attAG)"/>
                            <polyline points={polyPts} fill="none" stroke="#00E5A3" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                            {pts.map((p: any, i: number) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#00E5A3"/>)}
                            {attData.map((d: any, i: number) => <text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="6" textAnchor="middle">{d.date.slice(-5)}</text>)}
                          </svg>
                        );

                        if (ctAttendance === "scatter" || ctAttendance === "scatter2" || ctAttendance === "scatter3") return (
                          <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                            <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                            {pts.map((p: any, i: number) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#00E5A3" opacity="0.8"/>)}
                            {attData.map((d: any, i: number) => <text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="6" textAnchor="middle">{d.date.slice(-5)}</text>)}
                          </svg>
                        );

                        if (ctAttendance === "pie" || ctAttendance === "donut") {
                          const totP = attData.reduce((s: number, d: any)=>s+(d.present??0),0);
                          const totA = attData.reduce((s: number, d: any)=>s+(d.absent??0),0);
                          const grand = totP+totA||1;
                          const ro = ctAttendance==="donut"?35:42, ri=22;
                          const angP=(totP/grand)*360;
                          const r1=-90*Math.PI/180, r2=(-90+angP)*Math.PI/180;
                          const cx=50,cy=50;
                          const x1o=cx+ro*Math.cos(r1),y1o=cy+ro*Math.sin(r1);
                          const x2o=cx+ro*Math.cos(r2),y2o=cy+ro*Math.sin(r2);
                          const laf=angP>180?1:0;
                          const r3=(-90+360)*Math.PI/180;
                          const x3o=cx+ro*Math.cos(r3),y3o=cy+ro*Math.sin(r3);
                          const pathP=ctAttendance==="donut"
                            ?`M${x1o.toFixed(1)},${y1o.toFixed(1)} A${ro},${ro} 0 ${laf},1 ${x2o.toFixed(1)},${y2o.toFixed(1)} L${(cx+ri*Math.cos(r2)).toFixed(1)},${(cy+ri*Math.sin(r2)).toFixed(1)} A${ri},${ri} 0 ${laf},0 ${(cx+ri*Math.cos(r1)).toFixed(1)},${(cy+ri*Math.sin(r1)).toFixed(1)} Z`
                            :`M${cx},${cy} L${x1o.toFixed(1)},${y1o.toFixed(1)} A${ro},${ro} 0 ${laf},1 ${x2o.toFixed(1)},${y2o.toFixed(1)} Z`;
                          const pathA=ctAttendance==="donut"
                            ?`M${x2o.toFixed(1)},${y2o.toFixed(1)} A${ro},${ro} 0 ${1-laf},1 ${x3o.toFixed(1)},${y3o.toFixed(1)} L${(cx+ri*Math.cos(r3)).toFixed(1)},${(cy+ri*Math.sin(r3)).toFixed(1)} A${ri},${ri} 0 ${1-laf},0 ${(cx+ri*Math.cos(r2)).toFixed(1)},${(cy+ri*Math.sin(r2)).toFixed(1)} Z`
                            :`M${cx},${cy} L${x2o.toFixed(1)},${y2o.toFixed(1)} A${ro},${ro} 0 ${1-laf},1 ${x3o.toFixed(1)},${y3o.toFixed(1)} Z`;
                          return (
                            <div className="flex items-center gap-4 pt-1">
                              <div className="relative flex-shrink-0">
                                <svg viewBox="0 0 100 100" className="w-24 h-24"><path d={pathP} fill="#00E5A3" opacity="0.85"/><path d={pathA} fill="#E8184C" opacity="0.6"/></svg>
                                {ctAttendance==="donut"&&<div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-zinc-500">Present</span><span className="font-black text-white text-base">{totP}</span></div>}
                              </div>
                              <div className="space-y-2 text-xs">
                                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-success"/><span className="text-zinc-400">Present</span><span className="font-bold text-success ml-auto pl-3">{totP}</span></div>
                                <div className="flex items-center gap-2"><div className="h-2 w-2 rounded-full bg-red-400"/><span className="text-zinc-400">Absent</span><span className="font-bold text-red-400 ml-auto pl-3">{totA}</span></div>
                              </div>
                            </div>
                          );
                        }

                        if (ctAttendance === "stacked" || ctAttendance === "stacked_bar") return (
                          <div className="flex items-end justify-between gap-1.5" style={{height:"9rem"}}>
                            {attData.map((d: any, idx: number) => {
                              const p=d.present??0, a=d.absent??0;
                              return (<div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex flex-col-reverse overflow-hidden rounded" style={{height:"7rem",background:"rgba(255,255,255,0.02)"}}>
                                  <div style={{height:`${(p/maxVal)*100}%`,background:"#00E5A3",opacity:0.75}}/>
                                  <div style={{height:`${(a/maxVal)*100}%`,background:"#E8184C",opacity:0.55}}/>
                                </div>
                                <span className="text-[8px] text-zinc-500 font-mono">{d.date.slice(-5)}</span>
                              </div>);
                            })}
                          </div>
                        );

                        // Default: bar
                        return (
                          <div className="flex items-end justify-between gap-1.5" style={{height:"9rem"}}>
                            {attData.map((d: any, idx: number) => {
                              const presHeight=((d.present??0)/maxVal)*100;
                              return (<div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full bg-white/[0.02] rounded flex items-end" style={{height:"7rem"}}>
                                  <div className="bg-success/60 w-full rounded-b" style={{height:`${presHeight}%`}}/>
                                </div>
                                <span className="text-[8px] text-zinc-500 font-mono">{d.date.slice(-5)}</span>
                              </div>);
                            })}
                          </div>
                        );
                      })()}
                    </div>

                    {/* Last 7 Days Material Received — chart type switchable */}
                    <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-3">
                      {renderChartHeader("\uD83D\uDCE6 Last 7 Days Material Received (GRNs)", "material", ctMaterial, setCtMaterial)}
                      {(() => {
                        const matData = operationalData?.material_series ?? [
                          { date: "06-26", count: 2 }, { date: "06-27", count: 4 },
                          { date: "06-28", count: 1 }, { date: "06-29", count: 3 },
                          { date: "06-30", count: 0 }, { date: "07-01", count: 5 },
                          { date: "07-02", count: 2 },
                        ];
                        const maxVal = Math.max(...matData.map((d: any) => d.count??0), 1);
                        const H=90, W=200;
                        const pts = matData.map((d: any, i: number) => ({ x: 10+(i/Math.max(matData.length-1,1))*(W-20), y: H-5-((d.count??0)/maxVal*(H-15)) }));
                        const polyPts = pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
                        const areaPts = [`10,${H}`,...pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`),`${W-10},${H}`].join(" ");

                        if (ctMaterial === "table") return (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs"><thead><tr className="border-b border-white/5 text-zinc-500 font-bold uppercase text-[9px]">
                              <th className="py-1.5 px-2 text-left">Date</th><th className="py-1.5 px-2 text-right text-primary">GRNs Received</th>
                            </tr></thead><tbody className="divide-y divide-white/[0.03]">
                              {matData.map((d: any, i: number) => (<tr key={i} className="hover:bg-white/[0.01]"><td className="py-1.5 px-2 font-mono text-zinc-400">{d.date}</td><td className="py-1.5 px-2 text-right font-bold text-primary">{d.count??0}</td></tr>))}
                            </tbody></table>
                          </div>
                        );

                        if (ctMaterial === "line" || ctMaterial === "smooth" || ctMaterial === "line_pt" || ctMaterial === "smooth_pt") return (
                          <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                            <defs><linearGradient id="matLG" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#7C5CFF"/><stop offset="100%" stopColor="#E8184C"/></linearGradient></defs>
                            <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                            <polyline points={polyPts} fill="none" stroke="url(#matLG)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                            {pts.map((p: any, i: number) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#7C5CFF" stroke="#0B0910" strokeWidth="1.5"/>)}
                            {matData.map((d: any, i: number) => <text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="6" textAnchor="middle">{d.date.slice(-5)}</text>)}
                          </svg>
                        );

                        if (ctMaterial === "area" || ctMaterial === "smooth_area" || ctMaterial === "area_pt" || ctMaterial === "smooth_area_pt") return (
                          <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                            <defs><linearGradient id="matAG" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.4"/><stop offset="100%" stopColor="#7C5CFF" stopOpacity="0.02"/></linearGradient></defs>
                            <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                            <polygon points={areaPts} fill="url(#matAG)"/>
                            <polyline points={polyPts} fill="none" stroke="#7C5CFF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
                            {pts.map((p: any, i: number) => <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#7C5CFF"/>)}
                            {matData.map((d: any, i: number) => <text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="6" textAnchor="middle">{d.date.slice(-5)}</text>)}
                          </svg>
                        );

                        if (ctMaterial === "scatter" || ctMaterial === "scatter2" || ctMaterial === "scatter3") return (
                          <svg viewBox={`0 0 ${W} ${H+12}`} className="w-full" style={{height:"9rem"}}>
                            <line x1="10" y1={H} x2={W-10} y2={H} stroke="#ffffff10" strokeWidth="1"/>
                            {pts.map((p: any, i: number) => <circle key={i} cx={p.x} cy={p.y} r="5" fill="#7C5CFF" opacity="0.8"/>)}
                            {matData.map((d: any, i: number) => <text key={i} x={pts[i].x} y={H+11} fill="#6b7280" fontSize="6" textAnchor="middle">{d.date.slice(-5)}</text>)}
                          </svg>
                        );

                        if (ctMaterial === "pie" || ctMaterial === "donut") {
                          const total = matData.reduce((s: number, d: any) => s + (d.count??0), 0) || 1;
                          const COLORS = ["#7C5CFF","#E8184C","#00E5A3","#EAB308","#3B82F6","#F97316","#EC4899"];
                          let cumAngle = -90;
                          const ro = ctMaterial==="donut"?35:42, ri=22;
                          const arcs = matData.map((d: any, i: number) => {
                            const angle = ((d.count??0)/total)*360||0;
                            const r1=cumAngle*Math.PI/180, r2=(cumAngle+angle)*Math.PI/180;
                            const cx=50,cy=50;
                            const x1=cx+ro*Math.cos(r1),y1=cy+ro*Math.sin(r1);
                            const x2=cx+ro*Math.cos(r2),y2=cy+ro*Math.sin(r2);
                            const laf=angle>180?1:0;
                            const path=ctMaterial==="donut"
                              ?`M${x1.toFixed(1)},${y1.toFixed(1)} A${ro},${ro} 0 ${laf},1 ${x2.toFixed(1)},${y2.toFixed(1)} L${(cx+ri*Math.cos(r2)).toFixed(1)},${(cy+ri*Math.sin(r2)).toFixed(1)} A${ri},${ri} 0 ${laf},0 ${(cx+ri*Math.cos(r1)).toFixed(1)},${(cy+ri*Math.sin(r1)).toFixed(1)} Z`
                              :`M${cx},${cy} L${x1.toFixed(1)},${y1.toFixed(1)} A${ro},${ro} 0 ${laf},1 ${x2.toFixed(1)},${y2.toFixed(1)} Z`;
                            cumAngle+=angle;
                            return { path, color: COLORS[i%COLORS.length], label: d.date, value: d.count??0 };
                          });
                          return (
                            <div className="flex items-center gap-3 pt-1">
                              <div className="relative flex-shrink-0">
                                <svg viewBox="0 0 100 100" className="w-24 h-24">{arcs.map((a: any, i: number)=><path key={i} d={a.path} fill={a.color} opacity="0.85"/>)}</svg>
                                {ctMaterial==="donut"&&<div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[9px] text-zinc-500">GRNs</span><span className="font-black text-white text-base">{total}</span></div>}
                              </div>
                              <div className="space-y-1 text-[10px]">{arcs.map((a: any)=><div key={a.label} className="flex items-center gap-1.5"><div className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{background:a.color}}/><span className="text-zinc-400 font-mono">{a.label}</span><span className="font-bold text-white ml-auto pl-2">{a.value}</span></div>)}</div>
                            </div>
                          );
                        }

                        // Default: bar
                        return (
                          <div className="flex items-end justify-between gap-1.5" style={{height:"9rem"}}>
                            {matData.map((d: any, idx: number) => {
                              const countHeight=((d.count??0)/maxVal)*100;
                              return (<div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full bg-white/[0.02] rounded flex items-end" style={{height:"7rem"}}>
                                  <div className="bg-primary/60 w-full rounded-b" style={{height:`${countHeight}%`}}/>
                                </div>
                                <span className="text-[8px] text-zinc-500 font-mono">{d.date.slice(-5)}</span>
                              </div>);
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </>
              )}

              {overviewTab === "financial" && (
                <div className="space-y-6 font-sans">
                  {/* Filters Bar */}
                  <div className="glass-panel rounded-2xl p-4 border border-white/5 flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center">
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">Project Name</label>
                        <select className="bg-[#12101A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none min-w-[150px]">
                          <option>All</option>
                          {financialData?.project_summaries?.map((p: any, idx: number) => (
                            <option key={idx}>{p.project_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-zinc-500 uppercase tracking-wider font-bold block">Txn Date</label>
                        <div className="flex items-center gap-2 bg-[#12101A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-zinc-400">
                          <span className="text-zinc-500">📅</span>
                          <span>01 Jan 2026 to 31 Jul 2026</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Advance Paid */}
                    <div className="bg-[#102022] border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block text-center">Advance Paid</span>
                      <strong className="text-lg font-extrabold text-emerald-400 mt-2 block text-center">
                        {financialData?.advance_paid > 0 ? `₹${financialData.advance_paid.toLocaleString()}` : "-"}
                      </strong>
                    </div>

                    {/* To Pay */}
                    <div className="bg-[#221015] border border-red-500/10 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block text-center">To Pay</span>
                      <strong className="text-lg font-extrabold text-red-400 mt-2 block text-center">
                        {financialData?.to_pay > 0 ? `₹${financialData.to_pay.toLocaleString()}` : "-"}
                      </strong>
                    </div>

                    {/* To Receive */}
                    <div className="bg-[#221015] border border-red-500/10 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block text-center">To Receive</span>
                      <strong className="text-lg font-extrabold text-red-400 mt-2 block text-center">
                        {financialData?.to_receive > 0 ? `₹${financialData.to_receive.toLocaleString()}` : "-"}
                      </strong>
                    </div>

                    {/* Advance Received */}
                    <div className="bg-[#102022] border border-emerald-500/10 rounded-2xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block text-center">Advance Received</span>
                      <strong className="text-lg font-extrabold text-emerald-400 mt-2 block text-center">
                        {financialData?.advance_received > 0 ? `₹${financialData.advance_received.toLocaleString()}` : "-"}
                      </strong>
                    </div>
                  </div>

                  {/* Charts Grid - First Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Sales */}
                    <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sales</h4>
                      <div className="h-40 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/10">
                        <span className="text-red-500 text-xs font-semibold">No Data Available</span>
                      </div>
                      <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Total Sales</span>
                        <span className="font-bold text-zinc-400">-</span>
                      </div>
                    </div>

                    {/* Expense */}
                    <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Expense</h4>
                      <div className="h-40 flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/10 relative">
                        {/* Custom SVG Bar Chart */}
                        <svg className="w-full h-full p-4" viewBox="0 0 200 100">
                          {/* Y-Axis Line */}
                          <line x1="40" y1="10" x2="40" y2="80" stroke="#ffffff10" strokeWidth="1" />
                          <line x1="40" y1="50" x2="180" y2="50" stroke="#ffffff20" strokeWidth="1" />
                          {/* Grid Lines */}
                          <line x1="40" y1="20" x2="180" y2="20" stroke="#ffffff05" strokeWidth="1" strokeDasharray="2" />
                          <line x1="40" y1="80" x2="180" y2="80" stroke="#ffffff05" strokeWidth="1" strokeDasharray="2" />
                          {/* Axis labels */}
                          <text x="35" y="24" fill="#6b7280" fontSize="8" textAnchor="end">0</text>
                          <text x="35" y="84" fill="#6b7280" fontSize="8" textAnchor="end">-1.0K</text>
                          {/* Bars */}
                          <rect x="70" y="50" width="30" height="30" fill="#FF3B6C" rx="2" opacity="0.8" />
                          <text x="85" y="93" fill="#6b7280" fontSize="8" textAnchor="middle">Jun 2026</text>
                          {/* Value label */}
                          <text x="85" y="45" fill="#FF3B6C" fontSize="8" textAnchor="middle" fontWeight="bold">-1.00K</text>
                        </svg>
                      </div>
                      <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Total Expense</span>
                        <span className="font-bold text-red-400">-1.00K</span>
                      </div>
                    </div>

                    {/* Margin */}
                    <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Margin</h4>
                      <div className="h-40 flex items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/10 relative">
                        {/* Custom SVG Bar Chart */}
                        <svg className="w-full h-full p-4" viewBox="0 0 200 100">
                          <line x1="40" y1="10" x2="40" y2="80" stroke="#ffffff10" strokeWidth="1" />
                          <line x1="40" y1="80" x2="180" y2="80" stroke="#ffffff20" strokeWidth="1" />
                          <line x1="40" y1="35" x2="180" y2="35" stroke="#ffffff05" strokeWidth="1" strokeDasharray="2" />
                          {/* Axis labels */}
                          <text x="35" y="84" fill="#6b7280" fontSize="8" textAnchor="end">0</text>
                          <text x="35" y="39" fill="#6b7280" fontSize="8" textAnchor="end">1.0K</text>
                          {/* Bars */}
                          <rect x="70" y="35" width="30" height="45" fill="#10B981" rx="2" opacity="0.8" />
                          <text x="85" y="93" fill="#6b7280" fontSize="8" textAnchor="middle">Jun 2026</text>
                          <text x="85" y="30" fill="#10B981" fontSize="8" textAnchor="middle" fontWeight="bold">1.00K</text>
                        </svg>
                      </div>
                      <div className="border-t border-white/5 pt-3 flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Total Margin</span>
                        <span className="font-bold text-emerald-400">1.00K</span>
                      </div>
                    </div>
                  </div>

                  {/* Charts Grid - Second Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Payments */}
                    <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payments</h4>
                      <div className="h-48 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/10">
                        <span className="text-red-500 text-xs font-semibold">No Data Available</span>
                      </div>
                    </div>

                    {/* Expense Type */}
                    <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Expense Type</h4>
                      <div className="h-48 flex items-center justify-between border border-dashed border-white/5 rounded-xl bg-black/10 p-4">
                        {/* Doughnut Chart */}
                        <div className="relative w-32 h-32">
                          <svg className="w-full h-full" viewBox="0 0 36 36">
                            <path
                              className="text-zinc-800"
                              strokeWidth="3.5"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                            <path
                              className="text-blue-500"
                              strokeWidth="3.5"
                              strokeDasharray="100, 100"
                              strokeLinecap="round"
                              stroke="currentColor"
                              fill="none"
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span className="text-[8px] text-zinc-500 uppercase">Total</span>
                            <span className="text-xs font-extrabold text-white">-1.00K</span>
                            <span className="text-[8px] text-zinc-400 font-semibold mt-0.5">100%</span>
                          </div>
                        </div>

                        {/* Legend */}
                        <div className="space-y-2 text-xs">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked readOnly className="accent-blue-500 rounded cursor-pointer" />
                            <span className="text-zinc-300">Debit Note</span>
                            <span className="font-bold text-white font-mono ml-4">₹-1,000.00</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Party Balance */}
                  <div className="glass-panel border border-white/5 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Company Party Balance (All Projects)</h4>
                    <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/5 rounded-xl bg-black/10">
                      <span className="text-red-500 text-xs font-semibold">No Data Available</span>
                    </div>
                  </div>

                  {/* Project Financial Summary Table */}
                  <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Project Financial Summary - Dashboard</h4>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[9px] bg-white/[0.01]">
                            <th className="px-5 py-3 text-center">#</th>
                            <th className="px-5 py-3">Project Name</th>
                            <th className="px-5 py-3">Project Status</th>
                            <th className="px-5 py-3 text-center">Project Health</th>
                            <th className="px-5 py-3 text-right">Project Budget</th>
                            <th className="px-5 py-3 text-right">Total Expense</th>
                            <th className="px-5 py-3 text-right">Budget Remaining</th>
                            <th className="px-5 py-3 text-right">Total Sales</th>
                            <th className="px-5 py-3 text-right">Project Margin</th>
                            <th className="px-5 py-3 text-right">Payment In</th>
                            <th className="px-5 py-3 text-right">Payment Out</th>
                            <th className="px-5 py-3 text-right font-bold">Cash Balance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {financialData?.project_summaries?.length === 0 ? (
                            <tr>
                              <td colSpan={12} className="text-center p-8 text-zinc-500">
                                No financial data found.
                              </td>
                            </tr>
                          ) : (
                            financialData.project_summaries.map((p: any, idx: number) => (
                              <tr key={idx} className="border-t border-white/5 hover:bg-white/[0.01] transition-all">
                                <td className="px-5 py-3.5 text-center text-zinc-500 font-mono">{idx + 1}</td>
                                <td className="px-5 py-3.5 font-bold text-white">{p.project_name}</td>
                                <td className="px-5 py-3.5 text-zinc-300">{p.project_status}</td>
                                <td className="px-5 py-3.5 text-center">
                                  {p.project_health === "-" ? (
                                    <span className="text-zinc-600 font-bold font-mono">-</span>
                                  ) : (
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                                      p.project_health === "Healthy"
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                        : p.project_health === "Warning"
                                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                                        : "bg-red-500/10 border-red-500/20 text-red-400"
                                    }`}>
                                      {p.project_health}
                                    </span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-zinc-300">
                                  {p.project_budget ? `₹${p.project_budget.toLocaleString("en-IN")}` : "0"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-red-400">
                                  {p.total_expense ? `₹${p.total_expense.toLocaleString("en-IN")}` : "0"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-zinc-300">
                                  {p.budget_remaining ? `₹${p.budget_remaining.toLocaleString("en-IN")}` : "0"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-zinc-300">
                                  {p.total_sales ? `₹${p.total_sales.toLocaleString("en-IN")}` : "0"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-emerald-400 font-bold">
                                  {p.project_margin ? `₹${p.project_margin.toLocaleString("en-IN")}` : "0"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-zinc-300">
                                  {p.payment_in ? `₹${p.payment_in.toLocaleString("en-IN")}` : "0"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-zinc-300">
                                  {p.payment_out ? `₹${p.payment_out.toLocaleString("en-IN")}` : "0"}
                                </td>
                                <td className="px-5 py-3.5 text-right font-mono text-white font-extrabold">
                                  {p.cash_balance ? `₹${p.cash_balance.toLocaleString("en-IN")}` : "0"}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Estimation & Geofence Tools (Auxiliary Panel) */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 border-t border-white/5 pt-6">
                    {/* Steel calculator widget */}
                    <div className="lg:col-span-2 rounded-2xl glass-panel p-6 space-y-6">
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-white">IS-456 Steel weight calculator</h3>
                        <span className="text-xs text-zinc-500">Live API Verification</span>
                      </div>

                      <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400">Diameter (D in mm)</label>
                          <select
                            value={diameter}
                            onChange={(e) => setDiameter(Number(e.target.value))}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          >
                            <option value={8}>8 mm</option>
                            <option value={10}>10 mm</option>
                            <option value={12}>12 mm</option>
                            <option value={16}>16 mm</option>
                            <option value={20}>20 mm</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400">Main Bar Count</label>
                          <input
                            type="number"
                            value={barCount}
                            onChange={(e) => setBarCount(Number(e.target.value))}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400">Length/Height (meters)</label>
                          <input
                            type="number"
                            value={barLength}
                            onChange={(e) => setBarLength(Number(e.target.value))}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs text-zinc-400">Structural Wastage %</label>
                          <input
                            type="number"
                            value={wastagePercent}
                            onChange={(e) => setWastagePercent(Number(e.target.value))}
                            className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                          />
                        </div>
                      </form>

                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap gap-6 items-center justify-between text-xs">
                        <div>
                          <span className="text-zinc-500 block uppercase font-medium">Standard Unit Weight</span>
                          <span className="font-bold text-white text-base">{standardUnitWeight.toFixed(3)} kg/m</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase font-medium">Total Bar length</span>
                          <span className="font-bold text-white text-base">{totalBarLength.toFixed(1)} meters</span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block uppercase font-medium">Reinforcement weight</span>
                          <span className="font-bold text-primary text-base">{reinforcementWeight.toFixed(2)} kg</span>
                        </div>
                      </div>
                    </div>

                    {/* Geofencing monitoring panel */}
                    <div className="rounded-2xl glass-panel p-6 space-y-6 flex flex-col">
                      <div className="flex justify-between items-center border-b border-white/5 pb-4 shrink-0">
                        <h3 className="font-bold text-sm uppercase tracking-wider text-white">Geofence Guard</h3>
                        <span className="h-2 w-2 rounded-full bg-success" />
                      </div>

                      <div className="flex-1 flex flex-col justify-center items-center py-6 space-y-4">
                        <div className="relative h-32 w-32 rounded-full border border-success/30 flex items-center justify-center bg-success/5">
                          <div className="absolute inset-2 rounded-full border border-dashed border-success/40 animate-pulse" />
                          <div className="absolute h-1.5 w-1.5 bg-success rounded-full" />
                          <span className="absolute top-8 left-10 h-2 w-2 bg-success rounded-full shadow-[0_0_10px_#00E5A3] animate-ping" />
                          <span className="absolute bottom-6 right-8 h-2 w-2 bg-success rounded-full" />
                          <span className="absolute top-12 right-6 h-2 w-2 bg-red-500 rounded-full" />
                        </div>

                        <div className="text-center space-y-1">
                          <span className="text-xs font-semibold text-white">Attendance coordinates matched</span>
                          <p className="text-[10px] text-zinc-500 max-w-[200px]">
                            Project Center geofence limits set to 500m radius.
                          </p>
                        </div>
                      </div>

                      <div className="text-xs border-t border-white/5 pt-4 flex justify-between text-zinc-400 shrink-0">
                        <span>1 Alert: Out-of-bounds punch-in</span>
                        <button className="text-primary font-bold hover:underline">Review</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === "scheduler" && (
            <div className="rounded-2xl glass-panel p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">✨ Interactive Gantt Timeline Scheduler</h3>
                <span className="text-xs text-zinc-500">Module 1: Planning</span>
              </div>

              {/* Gantt Simulation */}
              <div className="w-full bg-[#12101A] border border-white/5 rounded-xl overflow-hidden p-6 space-y-4">
                <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-zinc-500 border-b border-white/5 pb-2 uppercase tracking-wider">
                  <div className="col-span-3">Task Name</div>
                  <div className="col-span-1 text-center">Days</div>
                  <div className="col-span-8 flex justify-between px-4">
                    <span>Jun 01</span>
                    <span>Jun 08</span>
                    <span>Jun 15</span>
                    <span>Jun 22</span>
                    <span>Jun 29</span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {/* Task 1 */}
                  <div className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-3 font-semibold text-white">Shoring Wall Piling</div>
                    <div className="col-span-1 text-center text-zinc-400">14</div>
                    <div className="col-span-8 relative h-6 bg-white/[0.02] rounded-lg">
                      <div className="absolute left-[5%] w-[45%] h-full bg-gradient-to-r from-primary to-[#FF3B6C] rounded-lg flex items-center px-2 text-[10px] font-bold text-white shadow-lg">
                        100%
                      </div>
                    </div>
                  </div>

                  {/* Task 2 */}
                  <div className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-3 font-semibold text-white">Raft Foundation Rebar</div>
                    <div className="col-span-1 text-center text-zinc-400">10</div>
                    <div className="col-span-8 relative h-6 bg-white/[0.02] rounded-lg">
                      <div className="absolute left-[48%] w-[32%] h-full bg-gradient-to-r from-secondary to-[#9C85FF] rounded-lg flex items-center px-2 text-[10px] font-bold text-white shadow-lg animate-shimmer">
                        75% (In Progress)
                      </div>
                    </div>
                  </div>

                  {/* Task 3 */}
                  <div className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-3 font-semibold text-white">Base slab Concrete Pouring</div>
                    <div className="col-span-1 text-center text-zinc-400">5</div>
                    <div className="col-span-8 relative h-6 bg-white/[0.02] rounded-lg">
                      <div className="absolute left-[78%] w-[18%] h-full bg-zinc-800 rounded-lg flex items-center px-2 text-[10px] font-medium text-zinc-400">
                        Planned
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "finance" && (
            <div className="rounded-2xl glass-panel p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">📊 Waterfall Cashflow Chart</h3>
                <span className="text-xs text-zinc-500">Module 13: Project P&L</span>
              </div>

              <div className="w-full bg-[#12101A] border border-white/5 rounded-xl p-8 flex flex-col md:flex-row items-center justify-between gap-8">
                {/* SVG Waterfall Chart */}
                <div className="w-full md:w-2/3 h-64 relative flex items-end justify-between px-6 border-b border-l border-white/10 pb-2">
                  <div className="h-full absolute left-4 bottom-2 flex flex-col justify-between text-[10px] text-zinc-500 pointer-events-none">
                    <span>Rs 20 L</span>
                    <span>Rs 15 L</span>
                    <span>Rs 10 L</span>
                    <span>Rs 5 L</span>
                    <span>Rs 0</span>
                  </div>

                  {/* Bar 1: Invoiced */}
                  <div className="flex flex-col items-center gap-2 w-16">
                    <span className="text-[10px] font-semibold text-success">Rs 18.5 L</span>
                    <div className="w-full bg-success/80 rounded-t-md h-48 shadow-[0_0_15px_rgba(0,229,163,0.1)]" />
                    <span className="text-[10px] text-zinc-500">Claim Invoiced</span>
                  </div>

                  {/* Bar 2: Materials */}
                  <div className="flex flex-col items-center gap-2 w-16">
                    <span className="text-[10px] font-semibold text-primary">-Rs 6.2 L</span>
                    <div className="w-full bg-primary/80 rounded-t-md h-16 shadow-[0_0_15px_rgba(232,24,76,0.1)]" />
                    <span className="text-[10px] text-zinc-500">Material POs</span>
                  </div>

                  {/* Bar 3: Labour */}
                  <div className="flex flex-col items-center gap-2 w-16">
                    <span className="text-[10px] font-semibold text-primary">-Rs 3.1 L</span>
                    <div className="w-full bg-primary/80 rounded-t-md h-8" />
                    <span className="text-[10px] text-zinc-500">Labour Pay</span>
                  </div>

                  {/* Bar 4: Net P&L */}
                  <div className="flex flex-col items-center gap-2 w-16">
                    <span className="text-[10px] font-semibold text-gradient-accent">Rs 9.2 L</span>
                    <div className="w-full bg-gradient-to-t from-secondary to-primary rounded-t-md h-24 shadow-[0_0_20px_rgba(124,92,255,0.15)] animate-pulse" />
                    <span className="text-[10px] text-zinc-300 font-medium">Net Profit</span>
                  </div>
                </div>

                <div className="w-full md:w-1/3 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-zinc-400">Cashflow Analytics</h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Client billing cleared:</span>
                      <span className="font-semibold text-white">Rs 18,50,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Total project spend:</span>
                      <span className="font-semibold text-white">Rs 9,30,000</span>
                    </div>
                    <hr className="border-white/5" />
                    <div className="flex justify-between">
                      <span className="text-zinc-500 font-semibold text-primary">Pre-Tax Deduct Section 194C:</span>
                      <span className="font-semibold text-[#E8184C]">-Rs 37,000</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "tally" && (
            <div className="rounded-2xl glass-panel p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">🔌 Onsite Tally Integration Control</h3>
                <span className="text-xs text-zinc-500">Module 16: Ledgers Synchronization</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">XML Agent Authentication</div>
                  <div className="p-3 bg-[#15121F] rounded-lg border border-white/10 flex items-center justify-between text-xs">
                    <code className="text-secondary font-mono font-bold">SF-TALLY-1082-MUM</code>
                    <button className="text-[10px] text-zinc-500 hover:text-white uppercase font-bold">Copy Key</button>
                  </div>
                  <p className="text-[10px] text-zinc-500">Enter this key into your desktop Tally.ERP agent configuration panel.</p>
                </div>

                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-3">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Sync Mode Settings</div>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-primary" />
                      <span>Post item-wise instead of Lumpsum</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="accent-primary" />
                      <span>Auto-create missing party ledgers</span>
                    </label>
                  </div>
                </div>

                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-3 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Voucher sync logs</div>
                    <div className="text-xs text-zinc-400 mt-2">
                      Last sync window: <span className="text-white font-medium">Today, 18:42</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Vouchers sent: <span className="text-[#00E5A3] font-medium">18 Purchases, 2 Payments</span>
                    </div>
                  </div>
                  <button
                    onClick={handleSyncTally}
                    className="w-full flex justify-center items-center py-2 px-4 rounded-lg bg-secondary text-white font-semibold text-xs hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Resync Voucher Window
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 2-Step Project Setup Wizard Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="bg-[#0B0910] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Creating Project</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Set up your project workspace in 2 steps</p>
              </div>
              <button
                onClick={() => setIsWizardOpen(false)}
                className="text-zinc-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Step Indicators */}
            <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${wizardStep === 1 ? "bg-primary text-white" : "bg-success text-white"}`}>
                  {wizardStep > 1 ? "✓" : "1"}
                </span>
                <span className={`text-xs font-semibold ${wizardStep === 1 ? "text-white" : "text-zinc-400"}`}>Project Details</span>
              </div>
              <div className="h-px w-12 bg-white/10" />
              <div className="flex items-center gap-2">
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${wizardStep === 2 ? "bg-primary text-white" : "bg-white/5 text-zinc-500"}`}>
                  2
                </span>
                <span className={`text-xs font-semibold ${wizardStep === 2 ? "text-white" : "text-zinc-500"}`}>Add Team Member</span>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {wizardStep === 1 ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400 font-medium">Project Name</label>
                      <input
                        type="text"
                        placeholder="e.g. MP SITE"
                        value={wizardData.name}
                        onChange={(e) => setWizardData({ ...wizardData, name: e.target.value })}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400 font-medium">Project Code</label>
                      <input
                        type="text"
                        placeholder="e.g. MP-01"
                        value={wizardData.code}
                        onChange={(e) => setWizardData({ ...wizardData, code: e.target.value })}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Project Address</label>
                    <input
                      type="text"
                      placeholder="e.g. MP ,SATNA"
                      value={wizardData.address}
                      onChange={(e) => setWizardData({ ...wizardData, address: e.target.value })}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400 font-medium">City</label>
                      <input
                        type="text"
                        placeholder="e.g. Satna"
                        value={wizardData.city}
                        onChange={(e) => setWizardData({ ...wizardData, city: e.target.value })}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-zinc-400 font-medium">Attendance Radius (meters)</label>
                      <input
                        type="number"
                        placeholder="500"
                        value={wizardData.attendance_radius_meters}
                        onChange={(e) => setWizardData({ ...wizardData, attendance_radius_meters: Number(e.target.value) })}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Team Member Name</label>
                    <input
                      type="text"
                      placeholder="e.g. PrateekUpadhyay"
                      value={wizardData.teamMember}
                      onChange={(e) => setWizardData({ ...wizardData, teamMember: e.target.value })}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500 italic">
                    Assigned members can punch attendance and log reports from their mobile app.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex items-center justify-between bg-white/[0.01]">
              <button
                onClick={() => {
                  if (wizardStep === 2) {
                    setWizardStep(1);
                  } else {
                    setIsWizardOpen(false);
                  }
                }}
                className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
              >
                {wizardStep === 2 ? "Back" : "Cancel"}
              </button>

              <button
                onClick={async () => {
                  if (wizardStep === 1) {
                    if (!wizardData.name) return alert("Project name is required!");
                    setWizardStep(2);
                  } else {
                    const newProjId = "p-" + Math.random().toString(36).substr(2, 9);
                    const newProj = {
                      id: newProjId,
                      name: wizardData.name,
                      code: wizardData.code || "PRJ-NEW",
                      city: wizardData.city || "Mumbai",
                      address: wizardData.address,
                      attendance_radius_meters: wizardData.attendance_radius_meters || 500,
                      status: "Ongoing",
                      health: "Healthy",
                      startDate: new Date().toISOString().split('T')[0],
                      endDate: "2027-12-31"
                    };
                    
                    try {
                      await fetch(`http://127.0.0.1:8000/apis/v3/planning/projects`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          company_id: companyId,
                          name: newProj.name,
                          code: newProj.code,
                          address: newProj.address,
                          city: newProj.city,
                          attendance_radius_meters: newProj.attendance_radius_meters
                        })
                      });
                    } catch (e) {
                      console.log("fallback save", e);
                    }

                    setProjects([...projects, newProj]);
                    setActiveProject(newProjId);
                    setIsWizardOpen(false);
                  }
                }}
                className="px-5 py-2 rounded-lg bg-primary hover:opacity-90 text-xs font-bold text-white transition-all cursor-pointer"
              >
                {wizardStep === 1 ? "Continue" : "Complete & Launch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
