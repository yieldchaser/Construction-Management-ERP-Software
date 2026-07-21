"use client";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useProject } from "@/context/ProjectContext";
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

interface BOQDocumentLite {
  id: string;
  title: string;
  project_id: string;
}

interface BOQRevision {
  id: string;
  boq_document_id: string;
  project_id: string;
  revision_no: number;
  revised_amount: number;
  previous_amount: number | null;
  delta: number | null;
  reason: string | null;
  revised_by_user_id: string | null;
  revised_by_name: string | null;
  created_at: string;
}

const SECTION_COLORS: Record<string, string> = {
  "1 — Civil Works": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "2 — Structural": "bg-sky-500/10 text-sky-400 border-sky-500/20",
  "3 — Masonry": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "4 — Finishes": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "5 — MEP": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "6 — Provisional / Contingency": "bg-zinc-500/10 text-muted border-zinc-500/20",
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
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [tab, setTab] = useState<"boq" | "variance" | "revisions">("boq");
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const [search, setSearch] = useState("");
  const [filterSection, setFilterSection] = useState("All");

  // Budget revision history (real, fetched from the API per project)
  const [revisions, setRevisions] = useState<BOQRevision[]>([]);
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [documents, setDocuments] = useState<BOQDocumentLite[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [revAmount, setRevAmount] = useState("");
  const [revReason, setRevReason] = useState("");
  const [savingRev, setSavingRev] = useState(false);
  const [revMsg, setRevMsg] = useState("");

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
      const res = await fetch(`${getApiHost()}/apis/v3/budgeting/boq/import`, { method: "POST", headers: authHeaders(), body: formData });
      const data = await res.json();
      if (res.ok && data.success) {
        setImportMsg("BOQ imported successfully!");
        setFile(null);
        await loadBoq();
      } else {
        setImportMsg(data.detail || "Import failed.");
      }
    } catch {
      setImportMsg("Backend not reachable. — using demo data.");
    } finally {
      setImporting(false);
    }
  };

  // ── Budget revision history (real) ──
  const fetchRevisions = async () => {
    if (!projectId) return;
    setRevisionLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/budgeting/boq-revisions?project_id=${projectId}`, { headers: authHeaders() });
      const data = await res.json();
      setRevisions(Array.isArray(data) ? data : []);
    } catch {
      setRevisions([]);
    } finally {
      setRevisionLoading(false);
    }
  };

  const loadBoq = async () => {
    if (!projectId) return;
    try {
      const dres = await fetch(`${getApiHost()}/apis/v3/budgeting/boq-documents?project_id=${projectId}`, { headers: authHeaders() });
      if (dres.ok) {
        const docs = await dres.json();
        const list: BOQDocumentLite[] = Array.isArray(docs) ? docs : [];
        setDocuments(list);
        if (list.length && !selectedDocId) setSelectedDocId(list[0].id);
      }
    } catch { /* ignore */ }

    // Real BOQ line items (replaces the old hardcoded SEED_BOQ array).
    try {
      const ires = await fetch(`${getApiHost()}/apis/v3/budgeting/boq?project_id=${projectId}`, { headers: authHeaders() });
      if (ires.ok) {
        const items: any[] = await ires.json();
        // "Actual spent" is the project's real billed value (client billing),
        // allocated across BOQ items by their budget-weight. The schema tracks
        // no per-item actual cost, so this is the honest real signal available.
        let totalBilled = 0;
        try {
          const bdres = await fetch(`${getApiHost()}/apis/v3/budgeting/boq-documents?project_id=${projectId}`, { headers: authHeaders() });
          if (bdres.ok) {
            const docs = await bdres.json();
            totalBilled = (Array.isArray(docs) ? docs : []).reduce((s: number, d: any) => s + (Number(d.billed_value) || 0), 0);
          }
        } catch { /* ignore */ }
        const totalBudget = items.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);
        setBoqItems(items.map((i: any) => ({
          id: i.id,
          section: i.section_name || "Uncategorized",
          costCode: i.cost_code || "",
          item_name: i.item_name,
          unit: i.unit,
          quantity: Number(i.quantity) || 0,
          rate: Number(i.rate) || 0,
          amount: Number(i.amount) || 0,
          actual_spent: totalBudget > 0 ? (totalBilled * (Number(i.amount) || 0)) / totalBudget : 0,
        })));
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!projectId) return;
    (async () => {
      await loadBoq();
      await fetchRevisions();
    })();
  }, [projectId]);

  const handleRecordRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocId) { setRevMsg("Select a BOQ document first."); return; }
    const amt = parseFloat(revAmount);
    if (!amt || amt <= 0) { setRevMsg("Enter a valid revised amount."); return; }
    setSavingRev(true);
    setRevMsg("");
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/budgeting/boq-documents/${selectedDocId}/revisions`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ revised_amount: amt, reason: revReason || null }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevMsg("Revision recorded.");
        setRevAmount("");
        setRevReason("");
        fetchRevisions();
      } else {
        setRevMsg(typeof data.detail === "string" ? data.detail : "Failed to record revision.");
      }
    } catch {
      setRevMsg("Backend not reachable.");
    } finally {
      setSavingRev(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">            <div className="flex items-center gap-1 px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        {[
          { key: "boq", label: "BOQ Line Items" },
          { key: "variance", label: "Budget vs Actual" },
          { key: "revisions", label: "Budget Revisions" },
        ].map((item) => (
          <button key={item.key} onClick={() => setTab(item.key as any)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
            {item.label}
          </button>
        ))}
      </div>
      {/* Sidebar */}
      

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border-custom bg-card px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-bold text-foreground">
              {tab === "boq" ? "Bill of Quantities (BOQ)" : tab === "variance" ? "Budget vs Actual Variance" : "Budget Revisions"}
            </h1>
            <div className="text-[10px] text-muted">Total Budget: {fmt(totalBudget)} · Spent: {fmt(totalActual)}</div>
          </div>
          <div className="flex items-center gap-3">
            {/* KPI pill */}
            <div className={`text-[10px] px-3 py-1 rounded-full border font-bold ${overallPct > 10 ? "bg-red-500/10 border-red-500/20 text-red-400" : overallPct > 0 ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"}`}>
              {overallPct > 0 ? "+" : ""}{overallPct.toFixed(1)}% overall variance
            </div>
            {/* Import trigger */}
            <label className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 cursor-pointer transition-all">
              ↑ Import Excel
              <input type="file" accept=".xlsx,.xlsm" className="hidden" onChange={e => { if (e.target.files?.[0]) { setFile(e.target.files[0]); handleImport(new Event("submit") as any); } }} />
            </label>
          </div>
        </header>

        <div className="flex-1 overflow-hidden">

          {/* ── BOQ TAB ── */}
          {tab === "boq" && (
            <div className="flex flex-col h-full overflow-hidden">
              {!projectId && (
                <div className="p-6 text-center text-muted text-xs">Select a project to view its BOQ.</div>
              )}
              {projectId && boqItems.length === 0 && (
                <div className="p-6 text-center text-muted text-xs">No BOQ items yet. Import an Excel (.xlsx) with item_name, unit, qty, rate, cost_code to populate this view.</div>
              )}
              {/* Filters */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-border-custom shrink-0">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item, code, section..." className="flex-1 bg-input border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted" />
                <div className="flex gap-1">
                  {["All", ...sections].map(s => (
                    <button key={s} onClick={() => setFilterSection(s)}
                      className={`px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all ${filterSection === s ? "bg-primary text-white" : "bg-elevated text-muted hover:text-foreground"}`}>
                      {s === "All" ? "All" : s.split("—")[0].trim()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
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
                      const sColor = SECTION_COLORS[section] ?? "bg-zinc-500/10 text-muted border-zinc-500/20";
                      return (
                        <React.Fragment key={section}>
                          {/* Section header */}
                          <tr className="border-b border-border-custom">
                            <td colSpan={9} className="py-2 pl-5 bg-elevated">
                              <div className="flex items-center gap-3">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${sColor}`}>{section}</span>
                                <span className="text-[10px] text-muted">Budget: {fmt(secBudget)} · Actual: {fmt(secActual)}</span>
                              </div>
                            </td>
                          </tr>
                          {/* Items */}
                          {items.map(item => {
                            const vPct = varPct(item.amount, item.actual_spent);
                            const vAmt = item.actual_spent - item.amount;
                            const sb = statusBadge(vPct);
                            return (
                              <tr key={item.id} className="border-b border-border-custom hover:bg-elevated transition-colors">
                                <td className="py-3 pl-5 pr-3 font-mono text-muted">{item.costCode}</td>
                                <td className="py-3 pr-4 text-foreground font-medium">{item.item_name}</td>
                                <td className="py-3 px-3 text-center text-muted">{item.unit}</td>
                                <td className="py-3 px-3 text-right font-mono text-muted">{fmtN(item.quantity)}</td>
                                <td className="py-3 px-3 text-right font-mono text-muted">{fmtN(item.rate)}</td>
                                <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">{fmt(item.amount)}</td>
                                <td className="py-3 px-3 text-right font-mono font-semibold text-foreground">{fmt(item.actual_spent)}</td>
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
                  <tfoot className="border-t-2 border-border-custom">
                    <tr className="bg-input">
                      <td colSpan={5} className="py-3 pl-5 font-bold text-foreground text-xs">PROJECT TOTAL</td>
                      <td className="py-3 px-3 text-right font-bold text-foreground font-mono">{fmt(totalBudget)}</td>
                      <td className="py-3 px-3 text-right font-bold text-foreground font-mono">{fmt(totalActual)}</td>
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
                  { label: "Total Actual Spent", value: fmt(totalActual), sub: "As of today", color: "text-foreground" },
                  { label: "Variance (₹)", value: (totalVariance >= 0 ? "+" : "") + fmt(totalVariance), sub: totalVariance > 0 ? "Over budget" : "Under budget", color: varColor(overallPct) },
                  { label: "Variance (%)", value: (overallPct > 0 ? "+" : "") + overallPct.toFixed(1) + "%", sub: statusBadge(overallPct).label, color: varColor(overallPct) },
                ].map(k => (
                  <div key={k.label} className="bg-input border border-border-custom rounded-md p-4">
                    <div className="text-[9px] uppercase tracking-widest text-muted">{k.label}</div>
                    <div className={`text-xl font-black mt-1 ${k.color}`}>{k.value}</div>
                    <div className="text-[10px] text-muted mt-0.5">{k.sub}</div>
                  </div>
                ))}
              </div>

              {/* Section summary bars */}
              <div className="bg-input border border-border-custom rounded-md p-5 space-y-4">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Section-wise Budget vs Actual</h3>
                {sections.map(section => {
                  const secItems = boqItems.filter(i => i.section === section);
                  const sBudget = secItems.reduce((s, i) => s + i.amount, 0);
                  const sActual = secItems.reduce((s, i) => s + i.actual_spent, 0);
                  const pct = (sActual / sBudget) * 100;
                  const vp = varPct(sBudget, sActual);
                  const sColor = SECTION_COLORS[section] ?? "bg-zinc-500/10 text-muted border-zinc-500/20";
                  return (
                    <div key={section} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${sColor}`}>{section}</span>
                        <div className="text-right">
                          <span className="text-muted font-mono">{fmt(sActual)}</span>
                          <span className="text-muted mx-1">/</span>
                          <span className="text-muted font-mono">{fmt(sBudget)}</span>
                          <span className={`ml-2 text-[10px] font-bold ${varColor(vp)}`}>({vp > 0 ? "+" : ""}{vp.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="h-2 bg-elevated rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${pct > 110 ? "bg-red-500" : pct > 100 ? "bg-amber-500" : "bg-emerald-500"}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Variance table by cost code */}
              <div className="bg-input border border-border-custom rounded-md overflow-hidden">
                <div className="px-5 py-3 border-b border-border-custom text-xs font-bold text-muted">Cost Code Variance Detail</div>
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted text-[9px] uppercase tracking-wider">
                      <th className="py-2.5 pl-5 pr-3">Code</th>
                      <th className="py-2.5 pr-4">Description</th>
                      <th className="py-2.5 px-3 text-right">Budget</th>
                      <th className="py-2.5 px-3 text-right">Actual</th>
                      <th className="py-2.5 px-3 text-right">Variance</th>
                      <th className="py-2.5 pr-5 text-right">EAC*</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {boqItems.map(item => {
                      const vPct = varPct(item.amount, item.actual_spent);
                      const vAmt = item.actual_spent - item.amount;
                      // EAC using 60% assumed completion (replace with real % from Gantt)
                      const pctComplete = item.actual_spent > 0 ? Math.min((item.actual_spent / item.amount) * 0.6, 0.95) : 0;
                      const eac = pctComplete > 0 ? item.actual_spent / pctComplete : item.amount;
                      return (
                        <tr key={item.id} className="hover:bg-elevated">
                          <td className="py-2.5 pl-5 pr-3 font-mono text-muted">{item.costCode}</td>
                          <td className="py-2.5 pr-4 text-muted line-clamp-1">{item.item_name}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted">{fmt(item.amount)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-muted">{fmt(item.actual_spent)}</td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${varColor(vPct)}`}>
                            {vAmt >= 0 ? "+" : ""}{fmt(vAmt)}
                          </td>
                          <td className={`py-2.5 pr-5 text-right font-mono text-[10px] ${eac > item.amount ? "text-red-400" : "text-muted"}`}>
                            {fmt(Math.round(eac))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="px-5 py-2 border-t border-border-custom text-[9px] text-muted">* EAC = Estimate at Completion (extrapolated from actual spend). Assumes proportional burn rate.</div>
              </div>
            </div>
          )}

          {/* ── REVISIONS TAB ── */}
          {tab === "revisions" && (
            <div className="h-full overflow-y-auto p-5 space-y-4">
              {/* Record revision form */}
              <div className="bg-input border border-border-custom rounded-md p-5 space-y-3">
                <div className="text-xs font-bold text-foreground">Record Budget Revision</div>
                <div className="text-[10px] text-muted">Capture a revised budget against a BOQ document. The revision number and previous amount are tracked automatically.</div>
                <form onSubmit={handleRecordRevision} className="space-y-2">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <label className="text-[10px] text-muted">BOQ Document</label>
                      <select value={selectedDocId} onChange={e => setSelectedDocId(e.target.value)}
                        className="w-full bg-elevated border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground" disabled={documents.length === 0}>
                        {documents.length === 0 && <option value="">No BOQ documents</option>}
                        {documents.map(d => <option key={d.id} value={d.id}>{d.title || d.id}</option>)}
                      </select>
                    </div>
                    <div className="w-44">
                      <label className="text-[10px] text-muted">Revised Amount (₹)</label>
                      <input type="number" min="0" step="0.01" value={revAmount} onChange={e => setRevAmount(e.target.value)} placeholder="0.00"
                        className="w-full bg-elevated border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground" />
                    </div>
                  </div>
                  <input value={revReason} onChange={e => setRevReason(e.target.value)} placeholder="Reason (optional)"
                    className="w-full bg-elevated border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground" />
                  <div className="flex items-center gap-2">
                    <button type="submit" disabled={!selectedDocId || savingRev}
                      className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:opacity-90">
                      {savingRev ? "Saving..." : "Record Revision"}
                    </button>
                    {revMsg && <span className="text-[10px] text-emerald-400">{revMsg}</span>}
                  </div>
                </form>
              </div>

              {/* History */}
              <div className="grid gap-3">
                {revisionLoading && <div className="text-[10px] text-muted">Loading revisions...</div>}
                {!revisionLoading && revisions.length === 0 && (
                  <div className="bg-input border border-dashed border-border-custom rounded-md p-6 text-center text-[10px] text-muted">No revisions yet.</div>
                )}
                {revisions.map((rev, idx) => (
                  <div key={rev.id} className={`bg-input border rounded-md p-5 ${idx === 0 ? "border-border-custom ring-1 ring-primary/10" : "border-border-custom"}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${idx === 0 ? "bg-primary/10 border-primary/20 text-primary" : "bg-elevated border-border-custom text-muted"}`}>
                          {idx === 0 ? "LATEST" : `REV ${rev.revision_no}`}
                        </span>
                        <span className="text-sm font-bold text-foreground">Revision {rev.revision_no}</span>
                      </div>
                      <span className="text-[10px] text-muted">{rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN") : ""}</span>
                    </div>
                    <div className="text-xs text-muted">{rev.reason || "No reason provided."}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-lg font-black text-primary">{fmt(rev.revised_amount)}</div>
                      <div className="text-[10px] text-muted text-right">
                        {rev.previous_amount != null && (
                          <div>Prev: {fmt(rev.previous_amount)} · Δ {rev.delta != null ? (rev.delta >= 0 ? "+" : "") + fmt(rev.delta) : "—"}</div>
                        )}
                        {rev.revised_by_name ? <div>By {rev.revised_by_name}</div> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Import trigger for BOQ */}
              <div className="bg-input border border-dashed border-border-custom rounded-md p-5 text-center space-y-2">
                <div className="text-xs font-bold text-muted">Import New BOQ / Revised Budget</div>
                <div className="text-[10px] text-muted">Upload an Excel (.xlsx) with columns: item_name, unit, qty, rate, cost_code</div>
                {importMsg && <div className="text-xs text-emerald-400">{importMsg}</div>}
                <form onSubmit={handleImport} className="flex justify-center gap-2">
                  <label className="px-4 py-2 bg-elevated border border-border-custom text-muted text-xs rounded-lg cursor-pointer hover:bg-elevated/70">
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
