"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/context/ProjectContext";
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
  total_committed_variance: number;
  total_variance: number;
}

export default function BudgetPage() {
  const { company_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId || "d0000000-0000-0000-0000-000000000001";

  const [budget, setBudget] = useState<BudgetCommitted | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const budRes = await fetch(`${getApiHost()}/apis/v3/budget/committed/${projectId}`);
      if (budRes.ok) setBudget(await budRes.json());
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
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      

      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />

        <div className="border-b border-border-custom bg-background px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Budget & Committed Costs</h1>
            <p className="text-[10px] text-muted">Committed vs Actuals · POs and WOs vs Bills</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Refresh</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10 space-y-6">
          {error && <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

          {loading && <div className="flex items-center justify-center h-48 text-muted text-xs">Loading...</div>}

          {budget && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Budget", value: `₹${fmt(budget.total_budget)}`, color: "text-white" },
                  { label: "Total Committed", value: `₹${fmt(budget.total_committed)}`, color: "text-amber-400" },
                  { label: "Total Actual", value: `₹${fmt(budget.total_actual)}`, color: "text-primary" },
                  { label: "Committed Variance", value: `₹${fmt(budget.total_committed_variance)}`, color: budget.total_committed_variance >= 0 ? "text-green-400" : "text-red-400" },
                ].map((s, idx) => (
                  <div key={idx} className="bg-card border border-border-custom rounded-lg p-4 rounded-md border border-border-custom">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">{s.label}</span>
                    <span className={`text-2xl font-extrabold mt-1 block ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border-custom">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Committed vs Actuals</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border-custom text-muted">
                        <th className="px-5 py-3 font-bold">Category</th>
                        <th className="px-5 py-3 font-bold text-right">Budget</th>
                        <th className="px-5 py-3 font-bold text-right">Committed</th>
                        <th className="px-5 py-3 font-bold text-right">Actual Billed</th>
                        <th className="px-5 py-3 font-bold text-right">Committed Var.</th>
                        <th className="px-5 py-3 font-bold text-right">Actual Var.</th>
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
                          <td className="px-5 py-3.5 text-right font-mono text-muted">₹{fmt(row.b - row.c)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-muted">₹{fmt(row.b - row.a)}</td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 bg-white/5 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(Number(pct(row.a, row.b)), 100)}%` }} />
                              </div>
                              <span className="text-[10px] text-muted w-10 text-right">{pct(row.a, row.b)}%</span>
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
