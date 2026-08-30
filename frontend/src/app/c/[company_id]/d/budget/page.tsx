"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import PageShell from "@/components/layout/PageShell";
import { PageSkeleton } from "@/components/ui/Skeleton";

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
  const projectId = activeProjectId;

  const [budget, setBudget] = useState<BudgetCommitted | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [matBudget, setMatBudget] = useState(0);
  const [labBudget, setLabBudget] = useState(0);
  const [subBudget, setSubBudget] = useState(0);
  const [equipBudget, setEquipBudget] = useState(0);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetMsg, setBudgetMsg] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const budRes = await fetch(`${getApiHost()}/apis/v3/budget/committed/${projectId}`, { headers: authHeaders() });
      if (budRes.ok) setBudget(await budRes.json());
    } catch (e) {
      setError("Failed to load budget data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const handleSetBudget = async () => {
    if (!projectId) return;
    setSavingBudget(true);
    setBudgetMsg("");
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/budgeting/allocation`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          project_id: projectId,
          material_budget: Number(matBudget) || 0,
          labour_budget: Number(labBudget) || 0,
          subcon_budget: Number(subBudget) || 0,
          equipment_budget: Number(equipBudget) || 0,
        }),
      });
      if (res.ok) {
        setBudgetMsg("Budget allocated.");
        setShowBudgetModal(false);
        await fetchData();
      } else {
        const data = await res.json().catch(() => ({} as any));
        setBudgetMsg(typeof data.detail === "string" ? data.detail : "Failed to allocate budget.");
      }
    } catch {
      setBudgetMsg("Backend not reachable.");
    } finally {
      setSavingBudget(false);
    }
  };

  const fmt = (v: number) => Number(v || 0).toLocaleString();
  const pct = (used: number, total: number) => total > 0 ? ((used / total) * 100).toFixed(1) : "0.0";

  const noBudget = budget ? (budget.total_budget || 0) <= 0 : false;

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      

      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />

        <div className="border-b border-border-custom bg-background px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-foreground uppercase tracking-wider">Budget & Committed Costs</h1>
            <p className="text-[10px] text-muted">Committed vs Actuals · POs and WOs vs Bills</p>
          </div>
          <button onClick={() => setShowBudgetModal(true)} className="px-4 py-2 rounded-md bg-primary text-xs font-bold text-white hover:opacity-90 cursor-pointer">Set Budget</button>
          <button onClick={fetchData} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-elevated cursor-pointer">Refresh</button>
        </div>

        <div className="flex-1 overflow-y-auto z-10">
          <PageShell width="wide">
          {error && <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

          {loading && <PageSkeleton />}

          {budget && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Budget", value: `₹${fmt(budget.total_budget)}`, color: "text-foreground" },
                  { label: "Total Committed", value: `₹${fmt(budget.total_committed)}`, color: "text-amber-400" },
                  { label: "Total Actual", value: `₹${fmt(budget.total_actual)}`, color: "text-primary" },
                  { label: "Committed Variance", value: noBudget ? "—" : `₹${fmt(budget.total_committed_variance)}`, color: noBudget ? "text-muted" : (budget.total_committed_variance >= 0 ? "text-green-400" : "text-red-400") },
                ].map((s, idx) => (
                  <div key={idx} className="bg-card border border-border-custom rounded-lg p-4">
                    <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">{s.label}</span>
                    <span className={`text-2xl font-extrabold mt-1 block ${s.color}`}>{s.value}</span>
                  </div>
                ))}
              </div>

              {noBudget && (
                <div className="p-4 rounded-md bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                  No budget has been set for this project — set one to see committed variance and utilization.
                </div>
              )}

              <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
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
                      ].map((row) => {
                        const noRowBudget = row.b <= 0;
                        return (
                        <tr key={row.label} className="border-b border-border-custom hover:bg-elevated transition-all">
                          <td className="px-5 py-3.5 text-foreground font-semibold">{row.label}</td>
                          <td className="px-5 py-3.5 text-right font-sans text-muted">₹{fmt(row.b)}</td>
                          <td className="px-5 py-3.5 text-right font-sans text-amber-400">₹{fmt(row.c)}</td>
                          <td className="px-5 py-3.5 text-right font-sans text-primary">₹{fmt(row.a)}</td>
                          <td className="px-5 py-3.5 text-right font-sans text-muted">{noRowBudget ? "—" : `₹${fmt(row.b - row.c)}`}</td>
                          <td className="px-5 py-3.5 text-right font-sans text-muted">{noRowBudget ? "—" : `₹${fmt(row.b - row.a)}`}</td>
                          <td className="px-5 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-24 bg-elevated rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-primary rounded-full" style={{ width: `${noRowBudget ? 0 : Math.min(Number(pct(row.a, row.b)), 100)}%` }} />
                              </div>
                              <span className="text-[10px] text-muted w-10 text-right">{noRowBudget ? "—" : `${pct(row.a, row.b)}%`}</span>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
          </PageShell>
        </div>
      </div>

      {showBudgetModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-md p-6 space-y-4">
            <div><h3 className="text-sm font-extrabold text-foreground">Set Project Budget</h3></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Material</label>
                <input type="number" min="0" value={matBudget} onChange={(e) => setMatBudget(parseFloat(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Labour</label>
                <input type="number" min="0" value={labBudget} onChange={(e) => setLabBudget(parseFloat(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Subcontractor</label>
                <input type="number" min="0" value={subBudget} onChange={(e) => setSubBudget(parseFloat(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Equipment</label>
                <input type="number" min="0" value={equipBudget} onChange={(e) => setEquipBudget(parseFloat(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none" />
              </div>
            </div>
            {budgetMsg && <div className="text-[10px] text-emerald-400">{budgetMsg}</div>}
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowBudgetModal(false)} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-elevated cursor-pointer">Cancel</button>
              <button onClick={handleSetBudget} disabled={savingBudget} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-md text-xs font-bold cursor-pointer">Save Budget</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}