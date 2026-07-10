"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

interface Scorecard {
  id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  period_start: string;
  period_end: string;
  on_time_pct: number;
  billing_accuracy_pct: number;
  quality_score: number;
  tasks_completed: number;
  tasks_delayed: number;
  total_billed: number;
  disputes_count: number;
}

interface ComparativeRow {
  subcontractor_id: string;
  subcontractor_name: string;
  scorecard_count: number;
  avg_on_time_pct: number;
  avg_billing_accuracy_pct: number;
  avg_quality_score: number;
  total_tasks_completed: number;
  total_tasks_delayed: number;
  total_billed: number;
  total_disputes: number;
}

export default function SubconScorecardsPage() {
  const { company_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId || "d0000000-0000-0000-0000-000000000001";

  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [comparative, setComparative] = useState<ComparativeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [scRes, compRes] = await Promise.all([
        fetch(`${getApiHost()}/apis/v3/subcon/scorecards/${projectId}`, { headers: authHeaders() }),
        fetch(`${getApiHost()}/apis/v3/subcon/scorecards/${projectId}/comparative`, { headers: authHeaders() }),
      ]);
      if (scRes.ok) setScorecards(await scRes.json());
      if (compRes.ok) setComparative(await compRes.json());
    } catch (e) {
      setError("Failed to load scorecard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fmt = (v: number) => v.toFixed(1) + "%";
  const fmtMoney = (v: number) => "₹" + Number(v).toLocaleString();

  if (loading) return <div className="flex-1 flex items-center justify-center text-muted text-xs">Loading scorecards...</div>;

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />

        <div className="border-b border-border-custom bg-background px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Subcontractor Performance</h1>
            <p className="text-[10px] text-muted">Performance scorecards · On-time % · Billing accuracy · Quality</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Refresh</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10 space-y-6">
          {error && <div className="p-4 rounded-md bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}

          {/* Comparative Analysis */}
          <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border-custom">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Comparative Analysis</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted">
                    <th className="px-5 py-3 font-bold">Subcontractor</th>
                    <th className="px-5 py-3 font-bold">Periods</th>
                    <th className="px-5 py-3 font-bold text-right">On-Time %</th>
                    <th className="px-5 py-3 font-bold text-right">Billing Accuracy %</th>
                    <th className="px-5 py-3 font-bold text-right">Quality Score</th>
                    <th className="px-5 py-3 font-bold text-right">Tasks Done</th>
                    <th className="px-5 py-3 font-bold text-right">Tasks Delayed</th>
                    <th className="px-5 py-3 font-bold text-right">Total Billed</th>
                    <th className="px-5 py-3 font-bold text-right">Disputes</th>
                  </tr>
                </thead>
                <tbody>
                  {comparative.map((row) => (
                    <tr key={row.subcontractor_id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                      <td className="px-5 py-3.5 text-white font-semibold">{row.subcontractor_name}</td>
                      <td className="px-5 py-3.5 text-muted">{row.scorecard_count}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-green-400">{fmt(row.avg_on_time_pct)}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-400">{fmt(row.avg_billing_accuracy_pct)}</td>
                      <td className="px-5 py-3.5 text-right font-mono font-bold text-secondary">{fmt(row.avg_quality_score)}</td>
                      <td className="px-5 py-3.5 text-right font-mono">{row.total_tasks_completed}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-red-400">{row.total_tasks_delayed}</td>
                      <td className="px-5 py-3.5 text-right font-mono">{fmtMoney(row.total_billed)}</td>
                      <td className="px-5 py-3.5 text-right font-mono text-amber-400">{row.total_disputes}</td>
                    </tr>
                  ))}
                  {comparative.length === 0 && (
                    <tr><td colSpan={9} className="px-5 py-8 text-center text-muted">No performance data yet. Data will be auto-calculated from billing and task completion.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Scorecards List */}
          <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border-custom">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">All Scorecards</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted">
                    <th className="px-5 py-3 font-bold">Subcontractor</th>
                    <th className="px-5 py-3 font-bold">Period</th>
                    <th className="px-5 py-3 font-bold text-right">On-Time %</th>
                    <th className="px-5 py-3 font-bold text-right">Billing Accuracy %</th>
                    <th className="px-5 py-3 font-bold text-right">Quality</th>
                    <th className="px-5 py-3 font-bold text-right">Billed</th>
                    <th className="px-5 py-3 font-bold text-right">Disputes</th>
                  </tr>
                </thead>
                <tbody>
                  {scorecards.map((sc) => {
                    return (
                      <tr key={sc.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                        <td className="px-5 py-3.5 text-white font-semibold">{sc.subcontractor_name}</td>
                        <td className="px-5 py-3.5 text-muted">{sc.period_start?.split("T")[0]} – {sc.period_end?.split("T")[0]}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-green-400">{fmt(sc.on_time_pct)}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-blue-400">{fmt(sc.billing_accuracy_pct)}</td>
                        <td className="px-5 py-3.5 text-right font-mono font-bold text-secondary">{fmt(sc.quality_score)}</td>
                        <td className="px-5 py-3.5 text-right font-mono">{fmtMoney(sc.total_billed)}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-amber-400">{sc.disputes_count}</td>
                      </tr>
                    );
                  })}
                  {scorecards.length === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">No scorecards recorded yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
