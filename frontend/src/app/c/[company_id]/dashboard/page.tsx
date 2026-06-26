"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function DashboardPage() {
  const params = useParams();
  const companyId = params?.company_id as string;

  const [activeProject, setActiveProject] = useState("proj-1");
  const [tallySyncStatus, setTallySyncStatus] = useState("Connected");
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Projects list
  const projects = [
    { id: "proj-1", name: "Metro Terminal (Phase 2)", code: "MET-02", city: "Mumbai" },
    { id: "proj-2", name: "Bypass Highway Flyover", code: "HWY-FLY", city: "Pune" },
    { id: "proj-3", name: "Alpha Premium Residences", code: "ALF-RES", city: "Delhi" },
  ];

  const activeProjDetails = projects.find(p => p.id === activeProject) || projects[0];

  const handleSyncTally = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setTallySyncStatus("Synced Just Now");
    }, 2000);
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0910] flex flex-col justify-between h-full shrink-0">
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
              className="w-full bg-[#15121F] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
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
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
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
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
                        : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                    }`}
                  >
                    <span>📅</span> Gantt Scheduler
                  </Link>
                </li>
                <li>
                  <Link
                    href="#"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] opacity-60"
                  >
                    <span>📑</span> BOQ Spreadsheet
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/proj-1/crm`}
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
                    href={`/c/${companyId}/p/proj-1/dpr`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>👷</span> Daily Progress (DPR)
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/proj-1/procurement`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>🛒</span> Procurement & RFQ
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/proj-1/attendance`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📍</span> Attendance & Payroll
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/proj-1/drawings`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📐</span> Drawings & Revisions
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/proj-1/hr`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>👷</span> HR & Payroll
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/proj-1/quality`}
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
                    href={`/c/${companyId}/p/proj-1/reports`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>📊</span> Progress Reports
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
                    href={`/c/${companyId}/p/proj-1/finance`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02] transition-all"
                  >
                    <span>💵</span> Finance & Ledger
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/proj-1/billing`}
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
                        ? "bg-primary/10 text-primary border-l-2 border-primary"
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
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0B0910] shrink-0">
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
            {/* Tally Connection status dot */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.02] border border-white/5 text-xs text-zinc-400">
              <span className="h-2 w-2 rounded-full bg-success" />
              <span>Tally Agent: {tallySyncStatus}</span>
            </div>

            <button
              onClick={handleSyncTally}
              disabled={isSyncing}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 border border-secondary/20 px-3.5 py-1.5 text-xs font-semibold text-secondary transition-all"
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
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="rounded-xl glass-panel p-6 space-y-2">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Attendance Roster</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">42</span>
                    <span className="text-xs text-success font-medium">● 38 In Geofence</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">Live head count inside 500m radius</div>
                </div>

                <div className="rounded-xl glass-panel p-6 space-y-2">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Concrete poured</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">2.8 m³</span>
                    <span className="text-xs text-zinc-400 font-medium">M20 Nominal</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">Dry volume: 4.31 m³ (Wastage: 5%)</div>
                </div>

                <div className="rounded-xl glass-panel p-6 space-y-2">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">TDS Deduct (Pre-tax)</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-white">1% / 2%</span>
                    <span className="text-xs text-primary font-medium">Sec 194C</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">Net claim auto-deduct retention enabled</div>
                </div>

                <div className="rounded-xl glass-panel p-6 space-y-2">
                  <div className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Project Margin</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-extrabold text-gradient-accent">22.4%</span>
                    <span className="text-xs text-success font-medium">↑ Healthy</span>
                  </div>
                  <div className="text-[10px] text-zinc-500">Limit alarm set to 18%</div>
                </div>
              </div>

              {/* Main Content Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Steel calculator / DPR validation widget */}
                <div className="lg:col-span-2 rounded-2xl glass-panel p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-white">IS-456 Steel weight calculator</h3>
                    <span className="text-xs text-zinc-500">Live API Verification</span>
                  </div>

                  <form className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Diameter (D in mm)</label>
                      <select className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary">
                        <option>8 mm</option>
                        <option>10 mm</option>
                        <option selected>12 mm</option>
                        <option>16 mm</option>
                        <option>20 mm</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Main Bar Count</label>
                      <input
                        type="number"
                        defaultValue={10}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Length/Height (meters)</label>
                      <input
                        type="number"
                        defaultValue={3}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-zinc-400">Structural Wastage %</label>
                      <input
                        type="number"
                        defaultValue={5}
                        className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      />
                    </div>
                  </form>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-wrap gap-6 items-center justify-between text-xs">
                    <div>
                      <span className="text-zinc-500 block uppercase font-medium">Standard Unit Weight</span>
                      <span className="font-bold text-white text-base">0.884 kg/m</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase font-medium">Total Bar length</span>
                      <span className="font-bold text-white text-base">37.5 meters</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block uppercase font-medium">Reinforcement weight</span>
                      <span className="font-bold text-primary text-base">34.81 kg</span>
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
                      {/* Active points */}
                      <span className="absolute top-8 left-10 h-2 w-2 bg-success rounded-full shadow-[0_0_10px_#00E5A3] animate-ping" />
                      <span className="absolute bottom-6 right-8 h-2 w-2 bg-success rounded-full" />
                      <span className="absolute top-12 right-6 h-2 w-2 bg-red-500 rounded-full" /> {/* worker out of fence */}
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
    </div>
  );
}
