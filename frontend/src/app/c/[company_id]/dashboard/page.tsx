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
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white">
              S
            </div>
            <span className="font-bold text-white tracking-tight">SiteFlow Console</span>
          </div>

          {/* Project Switcher */}
          <div className="p-4 border-b border-white/5 bg-white/[0.01]">
            <label className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block mb-1.5">
              Active Project Context
            </label>
            <select
              value={activeProject}
              onChange={(e) => setActiveProject(e.target.value)}
              suppressHydrationWarning={true}
              className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
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
                    {/* Gauge widget */}
                    <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 flex flex-col justify-between items-center text-center">
                      <div className="w-full flex justify-between items-center border-b border-white/5 pb-3">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Project Health Index</span>
                        <span className="h-2 w-2 rounded-full bg-success shadow-[0_0_8px_#00E5A3]" />
                      </div>
                      
                      <div className="relative flex items-center justify-center h-40 w-full mt-4">
                        {/* Semi-circular gauge chart SVG */}
                        <svg className="w-48 h-24 overflow-visible" viewBox="0 0 100 50">
                          <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" strokeLinecap="round" />
                          <path d="M 10,50 A 40,40 0 0,1 90,50" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" strokeDasharray="125" strokeDashoffset="0" />
                          <defs>
                            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#7C5CFF" />
                              <stop offset="100%" stopColor="#E8184C" />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute bottom-2 flex flex-col items-center">
                          <span className="text-2xl font-black text-white">100%</span>
                          <span className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Optimal Operation</span>
                        </div>
                      </div>
                      
                      <div className="text-[10px] text-zinc-400 mt-2">
                        All {projects.length} sites are running within planned tolerances.
                      </div>
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
                    {/* Last 7 Days Attendance */}
                    <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-4">
                      <div className="border-b border-white/5 pb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">👷 Last 7 Days Attendance</h4>
                      </div>
                      <div className="flex h-36 items-end justify-between gap-2 pt-4">
                        {(operationalData?.attendance_series ?? [
                          { date: "06-26", present: 8, absent: 1 },
                          { date: "06-27", present: 9, absent: 0 },
                          { date: "06-28", present: 6, absent: 3 },
                          { date: "06-29", present: 8, absent: 1 },
                          { date: "06-30", present: 7, absent: 2 },
                          { date: "07-01", present: 9, absent: 0 },
                          { date: "07-02", present: 8, absent: 1 },
                        ]).map((day: any, idx: number) => {
                          const total = (day.present ?? 0) + (day.absent ?? 0);
                          const presHeight = total > 0 ? ((day.present ?? 0) / 10) * 100 : 0;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                              <div className="w-full bg-white/[0.02] rounded h-24 relative flex items-end">
                                <div className="bg-success/60 w-full rounded-b" style={{ height: `${presHeight}%` }} />
                              </div>
                              <span className="text-[9px] text-zinc-500 font-mono">{day.date.slice(-5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Last 7 Days Material Received */}
                    <div className="rounded-2xl border border-white/5 bg-[#0B0910] p-6 space-y-4">
                      <div className="border-b border-white/5 pb-3">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">📦 Last 7 Days Material Received (GRNs)</h4>
                      </div>
                      <div className="flex h-36 items-end justify-between gap-2 pt-4">
                        {(operationalData?.material_series ?? [
                          { date: "06-26", count: 2 },
                          { date: "06-27", count: 4 },
                          { date: "06-28", count: 1 },
                          { date: "06-29", count: 3 },
                          { date: "06-30", count: 0 },
                          { date: "07-01", count: 5 },
                          { date: "07-02", count: 2 },
                        ]).map((day: any, idx: number) => {
                          const countHeight = ((day.count ?? 0) / 6) * 100;
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                              <div className="w-full bg-white/[0.02] rounded h-24 relative flex items-end">
                                <div className="bg-primary/60 w-full rounded-b" style={{ height: `${countHeight}%` }} />
                              </div>
                              <span className="text-[9px] text-zinc-500 font-mono">{day.date.slice(-5)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {overviewTab === "financial" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                          className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
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
                          className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400">Length/Height (meters)</label>
                        <input
                          type="number"
                          value={barLength}
                          onChange={(e) => setBarLength(Number(e.target.value))}
                          className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400">Structural Wastage %</label>
                        <input
                          type="number"
                          value={wastagePercent}
                          onChange={(e) => setWastagePercent(Number(e.target.value))}
                          className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
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
                      {/* Simulated Geofence radar visualizer */}
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
