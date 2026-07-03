"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

interface BudgetCommitted {
  project_id: string;
  material_budget: number;
  labour_budget: number;
  subcon_budget: number;
  equipment_budget: number;
  material_committed: number;
  material_actual: number;
  labour_committed: number;
  labour_actual: number;
  subcon_committed: number;
  subcon_actual: number;
  equipment_committed: number;
  equipment_actual: number;
  total_budget: number;
  total_committed: number;
  total_actual: number;
  total_variance: number;
}

interface TowerBudget {
  tower_id: string | null;
  tower_name: string;
  budget: number;
  committed: number;
  actual: number;
  variance: number;
}

export default function BudgetPage() {
  const { company_id, project_id } = useParams();
  const companyId = company_id || "demo-company";
  const projectId = project_id || "d0000000-0000-0000-0000-000000000001";

  const [budget, setBudget] = useState<BudgetCommitted | null>(null);
  const [towers, setTowers] = useState<TowerBudget[]>([]);
  const [selectedTower, setSelectedTower] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [budRes, towerRes] = await Promise.all([
        fetch(`${getApiHost()}/apis/v3/budget/committed/${projectId}`),
        fetch(`${getApiHost()}/apis/v3/towers/${projectId}`),
      ]);
      if (budRes.ok) setBudget(await budRes.json());
      if (towerRes.ok) setTowers(await towerRes.json());
    } catch (e) {
      setError("Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fmt = (v: number) => Number(v || 0).toLocaleString();
  const pct = (used: number, total: number) => total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden font-sans">
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto space-y-1">
          <Link href={`/c/${companyId}/p/${projectId}`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">
            ← Dashboard
          </Link>
          {[
            { href: `/c/${companyId}/p/${projectId}/budget`, label: "Budget" },
            { href: `/c/${companyId}/p/${projectId}/billing`, label: "Billing" },
            { href: `/c/${companyId}/p/${projectId}/procurement/rfq`, label: "RFQ" },
            { href: `/c/${companyId}/p/${projectId}/labour`, label: "Labour" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">{item.label}</Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-[0.02] blur-[120px] pointer-events-none" />

        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Budget & Committed Costs</h1>
            <p className="text-[10px] text-zinc-500">Committed vs Actuals · POs and WOs vs Bills</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Refresh</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10 space-y-6">
          {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

          {loading && <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">Loading...</div>}

          {budget && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Budget", value: `₹${fmt(budget.total_budget)}`, color: "text-white" },
                  { label: "Total Committed", value: `₹${fmt(budget.total_committed)}`, color: "text-amber-400" },
                  { label: "Total Actual", value: `₹${fmt(budget.total_actual)}`, color: "text-primary" },
                  { label: "Variance", value: `₹${fmt(budget.total_variance)}`, color: budget.total_variance >= 0 ? "text-green-400" : "text-red-400" },
                ].map((s, idx) => (
                  <div key={idx} className="glass-panel p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">{s.label}</span>
                    <span className={`text-2xl font-extrabold mt-1 block ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Committed vs Actuals</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">Category</th>
                        <th className="px-5 py-3 font-bold text-right">Budget</th>
                        <th className="px-5 py-3 font-bold text-right">Committed</th>
                        <th className="px-5 py-3 font-bold text-right">Actual Billed</th>
                        <th className="px-5 py-3 font-bold text-right">Variance</th>
                        <th className="px-5 py-3 font-bold text-center">Utilization</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Material", b: budget.material_budget, c: budget.material_committed, a: budget.material_actual },
                        { label: "Labour", b: budget.labour_budget, c: budget.labour_committed, a: budget.labour_actual },
                        { label: "Subcontractor", b: budget.subcon_budget, c: budget.subcon_committed, a: budget.subcon_actual },
                        { label: "Equipment", b: budget.equipment_budget, c: budget.equipment_committed, a: budget.equipment_actual },
                      ].map((row) => (
                        <tr key={row.label} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 text-white font-semibold">{row.label}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">₹{fmt(row.b)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-amber-400">₹{fmt(row.c)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-primary">₹{fmt(row.a)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-400">₹{fmt(row.b - row.a)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(Number(pct(row.a, row.b)), 100)}%` }} />
                              </div>
                              <span className="text-[10px] text-zinc-400 w-10 text-right">{pct(row.a, row.b)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
