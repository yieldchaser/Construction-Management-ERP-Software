"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
interface BOQItem {
  id: string;
  section: string;
  costCode: string;
  item_name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
  actual_spent: number;
  revised_qty?: number;
  revised_rate?: number;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────
const SEED_BOQ: BOQItem[] = [
  { id: "B01", section: "1 — Civil Works", costCode: "1.1", item_name: "Earthwork Excavation (Hard Rock)", unit: "Cum", quantity: 1800, rate: 280, amount: 504000, actual_spent: 498000 },
  { id: "B02", section: "1 — Civil Works", costCode: "1.2", item_name: "PCC Bed — M10 Grade (100mm thick)", unit: "Cum", quantity: 220, rate: 4500, amount: 990000, actual_spent: 1050000 },
  { id: "B03", section: "1 — Civil Works", costCode: "1.3", item_name: "RCC Raft Foundation — M25 Grade", unit: "Cum", quantity: 580, rate: 7800, amount: 4524000, actual_spent: 4680000 },
  { id: "B04", section: "2 — Structural", costCode: "2.1", item_name: "RCC Columns — M30 Grade (Fe550)", unit: "Cum", quantity: 145, rate: 9200, amount: 1334000, actual_spent: 890000 },
  { id: "B05", section: "2 — Structural", costCode: "2.2", item_name: "RCC Slabs & Beams — M25 Grade", unit: "Cum", quantity: 320, rate: 8400, amount: 2688000, actual_spent: 1200000 },
  { id: "B06", section: "2 — Structural", costCode: "2.3", item_name: "Structural Steel (ISMB/ISMC members)", unit: "MT", quantity: 28, rate: 72000, amount: 2016000, actual_spent: 1860000 },
  { id: "B07", section: "3 — Masonry", costCode: "3.1", item_name: "Brick Masonry — 1:4 Cement Mortar (230mm)", unit: "Cum", quantity: 480, rate: 6200, amount: 2976000, actual_spent: 3180000 },
  { id: "B08", section: "3 — Masonry", costCode: "3.2", item_name: "AAC Block Masonry — 200mm thick", unit: "Sqm", quantity: 1200, rate: 780, amount: 936000, actual_spent: 720000 },
  { id: "B09", section: "4 — Finishes", costCode: "4.1", item_name: "Ceramic Floor Tiles — 600×600mm", unit: "Sqm", quantity: 2400, rate: 650, amount: 1560000, actual_spent: 480000 },
  { id: "B10", section: "4 — Finishes", costCode: "4.2", item_name: "Plaster — 12mm thick (1:4)", unit: "Sqm", quantity: 4800, rate: 180, amount: 864000, actual_spent: 320000 },
  { id: "B11", section: "4 — Finishes", costCode: "4.3", item_name: "Waterproofing — Crystalline coating (terraces)", unit: "Sqm", quantity: 600, rate: 450, amount: 270000, actual_spent: 90000 },
  { id: "B12", section: "5 — MEP", costCode: "5.1", item_name: "Electrical Conduit & Wiring (LT side)", unit: "LS", quantity: 1, rate: 1850000, amount: 1850000, actual_spent: 620000 },
  { id: "B13", section: "5 — MEP", costCode: "5.2", item_name: "Plumbing — CPVC/uPVC supply & drainage", unit: "LS", quantity: 1, rate: 1240000, amount: 1240000, actual_spent: 390000 },
  { id: "B14", section: "5 — MEP", costCode: "5.3", item_name: "HVAC Ducting & FCU units", unit: "LS", quantity: 1, rate: 2800000, amount: 2800000, actual_spent: 320000 },
  { id: "B15", section: "6 — Provisional / Contingency", costCode: "6.1", item_name: "Provisional Sum — unforeseen works", unit: "LS", quantity: 1, rate: 800000, amount: 800000, actual_spent: 285000 },
];

const SECTION_COLORS: Record<string, string> = {
  "1 — Civil Works": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "2 — Structural": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "3 — Masonry": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "4 — Finishes": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "5 — MEP": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "6 — Provisional / Contingency": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

function fmt(n: number) { return "₹" + n.toLocaleString("en-IN"); }
function fmtN(n: number) { return n.toLocaleString("en-IN", { maximumFractionDigits: 2 }); }

function varPct(budget: number, actual: number) {
  if (budget === 0) return 0;
  return ((actual - budget) / budget) * 100;
}

function varColor(pct: number) {
  if (pct > 10) return "text-red-400";
  if (pct > 0) return "text-amber-400";
  return "text-emerald-400";
}

function statusBadge(pct: number) {
  if (pct > 10) return { label: "OVERSPENT", cls: "bg-red-500/10 border-red-500/20 text-red-400" };
  if (pct > 0) return { label: "AT RISK", cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
  if (pct > -5) return { label: "ON TRACK", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" };
  return { label: "UNDER BUDGET", cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" };
}

export default function BOQPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tab, setTab] = useState<"boq" | "variance" | "revisions">("boq");
  const [boqItems, setBoqItems] = useState<BOQItem[]>(SEED_BOQ);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("All");

  // Revision history (mock)
  const [revisions] = useState([
    { id: "R1", version: "Original Contract BOQ", date: "2026-04-01", totalBudget: 21652000, note: "Approved by Director Apex. Signed contract." },
    { id: "R2", version: "Rev 1 — Scope Addition", date: "2026-05-15", totalBudget: 23152000, note: "+₹15L for HVAC upgrade per client CR-07." },
    { id: "R3", version: "Rev 2 — Current", date: "2026-06-10", totalBudget: 25552000, note: "+₹24L structural steel redesign + ₹10L provisional." },
  ]);

  const totalBudget = useMemo(() => boqItems.reduce((s, i) => s + i.amount, 0), [boqItems]);
  const totalActual = useMemo(() => boqItems.reduce((s, i) => s + i.actual_spent, 0), [boqItems]);
  const totalVariance = totalActual - totalBudget;
  const overallPct = varPct(totalBudget, totalActual);

  const sections = useMemo(() => [...new Set(boqItems.map(i => i.section))], [boqItems]);

  const filtered = useMemo(() => {
    let items = boqItems;
    if (filterSection !== "All") items = items.filter(i => i.section === filterSection);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(i => i.item_name.toLowerCase().includes(q) || i.costCode.includes(q) || i.section.toLowerCase().includes(q));
    }
    return items;
  }, [boqItems, filterSection, search]);

  const groupedFiltered = useMemo(() => {
    const map: Record<string, BOQItem[]> = {};
    filtered.forEach(i => {
      if (!map[i.section]) map[i.section] = [];
      map[i.section].push(i);
    });
    return map;
  }, [filtered]);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("file", file);
    try {
      const res = await fetch("http://localhost:8000/apis/v3/budgeting/boq/import", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportMsg("BOQ imported successfully!");
        setFile(null);
        // In production, re-fetch from API
      } else {
        setImportMsg(data.detail || "Import failed.");
      }
    } catch {
      setImportMsg("Backend not reachable — using demo data.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 border-r border-white/5 bg-[#0B0910] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] flex items-center justify-center text-xs font-black text-white">S</div>
          <span className="font-bold text-sm text-white">SiteFlow</span>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-white rounded-lg hover:bg-white/[0.02]">← Dashboard</Link>
          <div className="pt-3">
            <div className="px-3 mb-1.5 text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Budgeting</div>
            {[
              { key: "boq", label: "BOQ Line Items", icon: "📑" },
              { key: "variance", label: "Budget vs Actual", icon: "📊" },
              { key: "revisions", label: "Budget Revisions", icon: "📋" },
            ].map(m => (
              <button key={m.key} onClick={() => setTab(m.key as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left transition-all ${tab === m.key ? "bg-primary/10 text-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
          <div className="pt-3">
            <div className="px-3 mb-1.5 text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Related</div>
            <Link href={`/c/${companyId}/p/${projectId}/planning/gantt`} className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.02]">
              <span>📅</span> Gantt / WBS
            </Link>
            <Link href={`/c/${companyId}/p/${projectId}/finance`} className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.02]">
              <span>💰</span> Finance Ledger
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-white/5 bg-[#0B0910] px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white">
              {tab === "boq" ? "Bill of Quantities (BOQ)" : tab === "variance" ? "Budget vs Actual Variance" : "Budget Revisions"}
            </h1>
            <div className="text-[10px] text-zinc-500">Total Budget: {fmt(totalBudget)} · Spent: {fmt(totalActual)}</div>
          </div>
          <div className="flex items-center gap-3">
            {/* KPI pill */}
            <div className={`text-[10px] px-3 py-1 rounded-full border font-bold ${overallPct > 10 ? "bg-red-500/10 border-red-500/20 text-red-400" : overallPct > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
              {overallPct > 0 ? "+" : ""}{overallPct.toFixed(1)}% overall variance
            </div>
            {/* Import trigger */}
            <label className="px-3 py-1.5 bg-gradient-to-r from-primary to-[#FF3B6C] text-white text-xs font-bold rounded-lg hover:opacity-90 cursor-pointer transition-all">
              ↑ Import Excel
              <input type="file" accept=".xlsx,.xlsm" className="hidden" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); handleImport(new Event("submit") as any); } }} />
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">

          {/* ── BOQ TAB ── */}
          {tab === "boq" && (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Filters */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/5 shrink-0">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, code, section..." className="flex-1 bg-[#14121F] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600" />
                <div className="flex gap-1">
                  {["All", ...sections].map(s => (
                    <button key={s} onClick={() => setFilterSection(s)}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all ${filterSection === s ? "bg-primary text-white" : "bg-white/5 text-zinc-400 hover:text-white"}`}>
                      {s === "All" ? "All" : s.split("—")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-[#0E0C15]">
                    <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-3 pl-5 pr-3">Cost Code</th>
                      <th className="py-3 pr-4">Description</th>
                      <th className="py-3 px-3 text-center">Unit</th>
                      <th className="py-3 px-3 text-right">Qty</th>
                      <th className="py-3 px-3 text-right">Rate (₹)</th>
                      <th className="py-3 px-3 text-right">Budget Amt</th>
                      <th className="py-3 px-3 text-right">Actual Spent</th>
                      <th className="py-3 px-3 text-right">Variance</th>
                      <th className="py-3 pr-5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupedFiltered).map(([section, items]) => {
                      const secBudget = items.reduce((s, i) => s + i.amount, 0);
                      const secActual = items.reduce((s, i) => s + i.actual_spent, 0);
                      const sColor = SECTION_COLORS[section] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
                      return (
                        <React.Fragment key={section}>
                          {/* Section header */}
                          <tr className="border-b border-white/5">
                            <td colSpan={9} className="py-2 pl-5 bg-white/[0.01]">
                              <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${sColor}`}>{section}</span>
                                <span className="text-[10px] text-zinc-500">Budget: {fmt(secBudget)} · Actual: {fmt(secActual)}</span>
                              </div>
                            </td>
                          </tr>
                          {/* Items */}
                          {items.map(item => {
                            const vPct = varPct(item.amount, item.actual_spent);
                            const vAmt = item.actual_spent - item.amount;
                            const sb = statusBadge(vPct);
                            return (
                              <tr key={item.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors">
                                <td className="py-3 pl-5 pr-3 font-mono text-zinc-400">{item.costCode}</td>
                                <td className="py-3 pr-4 text-white font-medium">{item.item_name}</td>
                                <td className="py-3 px-3 text-center text-zinc-500">{item.unit}</td>
                                <td className="py-3 px-3 text-right font-mono text-zinc-300">{fmtN(item.quantity)}</td>
                                <td className="py-3 px-3 text-right font-mono text-zinc-300">{fmtN(item.rate)}</td>
                                <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-200">{fmt(item.amount)}</td>
                                <td className="py-3 px-3 text-right font-mono font-semibold text-zinc-200">{fmt(item.actual_spent)}</td>
                                <td className={`py-3 px-3 text-right font-mono font-bold ${varColor(vPct)}`}>
                                  {vAmt >= 0 ? "+" : ""}{fmt(vAmt)}
                                  <span className="text-[9px] ml-1 opacity-70">({vPct > 0 ? "+" : ""}{vPct.toFixed(1)}%)</span>
                                </td>
                                <td className="py-3 pr-5 text-center">
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${sb.cls}`}>{sb.label}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot className="border-t-2 border-white/10">
                    <tr className="bg-[#14121F]">
                      <td colSpan={5} className="py-3 pl-5 font-bold text-white text-xs">PROJECT TOTAL</td>
                      <td className="py-3 px-3 text-right font-bold text-white font-mono">{fmt(totalBudget)}</td>
                      <td className="py-3 px-3 text-right font-bold text-white font-mono">{fmt(totalActual)}</td>
                      <td className={`py-3 px-3 text-right font-bold font-mono ${varColor(overallPct)}`}>
                        {totalVariance >= 0 ? "+" : ""}{fmt(totalVariance)}
                        <span className="text-[9px] ml-1 opacity-70">({overallPct > 0 ? "+" : ""}{overallPct.toFixed(1)}%)</span>
                      </td>
                      <td className="py-3 pr-5 text-center">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${statusBadge(overallPct).cls}`}>{statusBadge(overallPct).label}</span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── VARIANCE TAB ── */}
          {tab === "variance" && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              {/* KPI strip */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Total Budget", value: fmt(totalBudget), sub: "Original contract value", color: "text-blue-400" },
                  { label: "Total Actual Spent", value: fmt(totalActual), sub: "As of today", color: "text-white" },
                  { label: "Variance (₹)", value: (totalVariance >= 0 ? "+" : "") + fmt(totalVariance), sub: totalVariance > 0 ? "Over budget" : "Under budget", color: varColor(overallPct) },
                  { label: "Variance (%)", value: (overallPct > 0 ? "+" : "") + overallPct.toFixed(1) + "%", sub: statusBadge(overallPct).label, color: varColor(overallPct) },
                ].map(k => (
                  <div key={k.label} className="bg-[#14121F] border border-white/5 rounded-xl p-4">
                    <div className="text-[9px] uppercase tracking-widest text-zinc-500">{k.label}</div>
                    <div className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Section summary bars */}
              <div className="bg-[#14121F] border border-white/5 rounded-xl p-5 space-y-4">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Section-wise Budget vs Actual</h3>
                {sections.map(section => {
                  const secItems = boqItems.filter(i => i.section === section);
                  const sBudget = secItems.reduce((s, i) => s + i.amount, 0);
                  const sActual = secItems.reduce((s, i) => s + i.actual_spent, 0);
                  const pct = (sActual / sBudget) * 100;
                  const vp = varPct(sBudget, sActual);
                  const sColor = SECTION_COLORS[section] ?? "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
                  return (
                    <div key={section} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${sColor}`}>{section}</span>
                        <div className="text-right">
                          <span className="text-zinc-300 font-mono">{fmt(sActual)}</span>
                          <span className="text-zinc-600 mx-1">/</span>
                          <span className="text-zinc-500 font-mono">{fmt(sBudget)}</span>
                          <span className={`ml-2 text-[10px] font-bold ${varColor(vp)}`}>({vp > 0 ? "+" : ""}{vp.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 110 ? "bg-red-500" : pct > 100 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Variance table by cost code */}
              <div className="bg-[#14121F] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 text-xs font-bold text-zinc-300">Cost Code Variance Detail</div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 text-[9px] uppercase tracking-wider">
                      <th className="py-2.5 pl-5 pr-3">Code</th>
                      <th className="py-2.5 pr-4">Description</th>
                      <th className="py-2.5 px-3 text-right">Budget</th>
                      <th className="py-2.5 px-3 text-right">Actual</th>
                      <th className="py-2.5 px-3 text-right">Variance</th>
                      <th className="py-2.5 pr-5 text-right">EAC*</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {boqItems.map(item => {
                      const vPct = varPct(item.amount, item.actual_spent);
                      const vAmt = item.actual_spent - item.amount;
                      // EAC using 60% assumed completion (replace with real % from Gantt)
                      const pctComplete = item.actual_spent > 0 ? Math.min((item.actual_spent / item.amount) * 0.6, 0.95) : 0;
                      const eac = pctComplete > 0 ? item.actual_spent / pctComplete : item.amount;
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.01]">
                          <td className="py-2.5 pl-5 pr-3 font-mono text-zinc-500">{item.costCode}</td>
                          <td className="py-2.5 pr-4 text-zinc-300 line-clamp-1">{item.item_name}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-400">{fmt(item.amount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-zinc-300">{fmt(item.actual_spent)}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${varColor(vPct)}`}>
                            {vAmt >= 0 ? "+" : ""}{fmt(vAmt)}
                          </td>
                          <td className={`py-2.5 pr-5 text-right font-mono text-[10px] ${eac > item.amount ? "text-red-400" : "text-zinc-400"}`}>
                            {fmt(Math.round(eac))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-2 border-t border-white/5 text-[9px] text-zinc-600">* EAC = Estimate at Completion (extrapolated from actual spend). Assumes proportional burn rate.</div>
              </div>
            </div>
          )}

          {/* ── REVISIONS TAB ── */}
          {tab === "revisions" && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              <div className="grid gap-3">
                {revisions.map((rev, idx) => (
                  <div key={rev.id} className={`bg-[#14121F] border rounded-xl p-5 ${idx === revisions.length - 1 ? "border-primary/30 ring-1 ring-primary/10" : "border-white/5"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${idx === revisions.length - 1 ? "bg-primary/10 border-primary/20 text-primary" : "bg-zinc-700/30 border-zinc-600/20 text-zinc-400"}`}>
                          {idx === revisions.length - 1 ? "CURRENT" : `REV ${idx}`}
                        </span>
                        <span className="text-sm font-bold text-white">{rev.version}</span>
                      </div>
                      <span className="text-[10px] text-zinc-500">{rev.date}</span>
                    </div>
                    <div className="text-xs text-zinc-400">{rev.note}</div>
                    <div className="mt-2 text-lg font-black text-primary">{fmt(rev.totalBudget)}</div>
                  </div>
                ))}
              </div>
              {/* Import trigger for BOQ */}
              <div className="bg-[#14121F] border border-dashed border-white/10 rounded-xl p-5 text-center space-y-2">
                <div className="text-xs font-bold text-zinc-400">Import New BOQ / Revised Budget</div>
                <div className="text-[10px] text-zinc-600">Upload an Excel (.xlsx) with columns: item_name, unit, qty, rate, cost_code</div>
                {importMsg && <div className="text-xs text-emerald-400">{importMsg}</div>}
                <form onSubmit={handleImport} className="flex justify-center gap-2">
                  <label className="px-4 py-2 bg-white/5 border border-white/10 text-zinc-300 text-xs rounded-lg cursor-pointer hover:bg-white/10">
                    {file ? file.name : "Select Excel File"}
                    <input type="file" accept=".xlsx,.xlsm" className="hidden" onChange={e => { if (e.target.files?.[0]) setFile(e.target.files[0]); }} />
                  </label>
                  <button type="submit" disabled={!file || importing}
                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:opacity-90">
                    {importing ? "Importing..." : "Import & Commit"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
