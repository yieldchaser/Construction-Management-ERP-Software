"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

interface ReliabilityScore {
  id: string;
  contractor_id: string;
  contractor_name: string;
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

interface BOCWRecord {
  id: string;
  contractor_name: string;
  month_year: string;
  workers_count: number;
  wages_paid: number;
  contribution_amount: number;
  acknowledgement_number: string | null;
  created_at: string;
}

interface MusterRollEntry {
  id: string;
  contractor_id: string | null;
  date: string;
  labor_role: string;
  workers_present: number;
  workers_absent: number;
  hours_worked: number;
  overtime_hours: number;
  notes: string | null;
}

export default function LabourPage() {
  const { company_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId || "d0000000-0000-0000-0000-000000000001";

  const [activeTab, setActiveTab] = useState<"reliability" | "bocw" | "muster">("reliability");
  const [reliability, setReliability] = useState<ReliabilityScore[]>([]);
  const [bocw, setBocw] = useState<BOCWRecord[]>([]);
  const [muster, setMuster] = useState<MusterRollEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [showMusterModal, setShowMusterModal] = useState(false);
  const [musterDate, setMusterDate] = useState(new Date().toISOString().split("T")[0]);
  const [musterRole, setMusterRole] = useState("Mason");
  const [musterPresent, setMusterPresent] = useState(20);
  const [musterAbsent, setMusterAbsent] = useState(2);
  const [musterHours, setMusterHours] = useState(8);
  const [musterOT, setMusterOT] = useState(0);
  const [musterNotes, setMusterNotes] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [relRes, bocwRes, mRes] = await Promise.all([
        fetch(`${getApiHost()}/apis/v3/labour/reliability/${projectId}`),
        fetch(`${getApiHost()}/apis/v3/labour/bocw/${projectId}`),
        fetch(`${getApiHost()}/apis/v3/labour/muster-roll/${projectId}`),
      ]);
      if (relRes.ok) setReliability(await relRes.json());
      if (bocwRes.ok) setBocw(await bocwRes.json());
      if (mRes.ok) setMuster(await mRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const handleMusterSubmit = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/labour/muster-roll`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          date: new Date(musterDate).toISOString(),
          labor_role: musterRole,
          workers_present: musterPresent,
          workers_absent: musterAbsent,
          hours_worked: musterHours,
          overtime_hours: musterOT,
          notes: musterNotes || null,
        }),
      });
      if (res.ok) { fetchData(); setShowMusterModal(false); }
    } catch (e) { console.error(e); }
  };

  const handleBOCWExport = async () => {
    window.open(`${getApiHost()}/apis/v3/labour/bocw/${projectId}/export`, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">            <div className="flex items-center gap-1 px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        {[
          { key: "reliability", label: "Reliability Scores" },
          { key: "bocw", label: "BOCW Records" },
          { key: "muster", label: "Muster Roll" },
        ].map((item) => (
          <button key={item.key} onClick={() => setActiveTab(item.key as any)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${activeTab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
            {item.label}
          </button>
        ))}
      </div>
      

      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="border-b border-border-custom bg-background px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Labour Management</h1>
            <p className="text-[10px] text-muted">Contractor reliability · BOCW compliance · Muster rolls</p>
          </div>
          {activeTab === "muster" && <button onClick={() => setShowMusterModal(true)} className="px-4 py-2 rounded-md bg-primary text-xs font-bold text-white hover:opacity-90 cursor-pointer">+ Add Muster</button>}
          {activeTab === "bocw" && <button onClick={handleBOCWExport} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Export CSV</button>}
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10">
          {loading && <div className="text-xs text-muted">Loading...</div>}

          {activeTab === "reliability" && (
            <div className="space-y-4">
              {reliability.map((r) => {
                const reliabilityScore = ((r.on_time_pct + r.billing_accuracy_pct + r.quality_score) / 3).toFixed(1);
                const scoreColor = Number(reliabilityScore) >= 80 ? "text-green-400" : Number(reliabilityScore) >= 60 ? "text-amber-400" : "text-red-400";
                return (
                  <div key={r.id} className="bg-card border border-border-custom rounded-lg p-5 rounded-lg border border-border-custom">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-white">{r.contractor_name}</h3>
                        <p className="text-[10px] text-muted">{r.period_start?.split("T")[0]} – {r.period_end?.split("T")[0]}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-3xl font-extrabold ${scoreColor}`}>{reliabilityScore}%</span>
                        <p className="text-[10px] text-muted">Reliability</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      <div className="bg-elevated rounded-md p-3 text-center">
                        <span className="text-[10px] text-muted block">On-Time</span>
                        <span className="text-sm font-bold text-green-400">{r.on_time_pct.toFixed(1)}%</span>
                      </div>
                      <div className="bg-elevated rounded-md p-3 text-center">
                        <span className="text-[10px] text-muted block">Billing Accuracy</span>
                        <span className="text-sm font-bold text-blue-400">{r.billing_accuracy_pct.toFixed(1)}%</span>
                      </div>
                      <div className="bg-elevated rounded-md p-3 text-center">
                        <span className="text-[10px] text-muted block">Quality</span>
                        <span className="text-sm font-bold text-secondary">{r.quality_score.toFixed(1)}%</span>
                      </div>
                      <div className="bg-elevated rounded-md p-3 text-center">
                        <span className="text-[10px] text-muted block">Disputes</span>
                        <span className="text-sm font-bold text-amber-400">{r.disputes_count}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {reliability.length === 0 && <div className="bg-card border border-border-custom rounded-lg p-8 rounded-lg border border-border-custom text-center text-muted text-xs">No reliability data yet.</div>}
            </div>
          )}

          {activeTab === "bocw" && (
            <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border-custom">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">BOCW Records</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead><tr className="border-b border-border-custom text-muted"><th className="px-5 py-3 font-bold">Contractor</th><th className="px-5 py-3 font-bold">Month</th><th className="px-5 py-3 font-bold text-right">Workers</th><th className="px-5 py-3 font-bold text-right">Wages Paid</th><th className="px-5 py-3 font-bold text-right">Contribution</th><th className="px-5 py-3 font-bold">Ack. No.</th></tr></thead>
                  <tbody>
                    {bocw.map((r) => (
                      <tr key={r.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                        <td className="px-5 py-3.5 text-white font-semibold">{r.contractor_name}</td>
                        <td className="px-5 py-3.5 text-muted">{r.month_year}</td>
                        <td className="px-5 py-3.5 text-right font-mono">{r.workers_count}</td>
                        <td className="px-5 py-3.5 text-right font-mono">₹{r.wages_paid.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-right font-mono">₹{r.contribution_amount.toLocaleString()}</td>
                        <td className="px-5 py-3.5 text-muted">{r.acknowledgement_number || "—"}</td>
                      </tr>
                    ))}
                    {bocw.length === 0 && <tr><td colSpan={6} className="px-5 py-8 text-center text-muted">No BOCW records yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "muster" && (
            <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border-custom">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Muster Roll</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead><tr className="border-b border-border-custom text-muted"><th className="px-5 py-3 font-bold">Date</th><th className="px-5 py-3 font-bold">Role</th><th className="px-5 py-3 font-bold text-right">Present</th><th className="px-5 py-3 font-bold text-right">Absent</th><th className="px-5 py-3 font-bold text-right">Hours</th><th className="px-5 py-3 font-bold text-right">OT</th><th className="px-5 py-3 font-bold">Notes</th></tr></thead>
                  <tbody>
                    {muster.map((m) => (
                      <tr key={m.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                        <td className="px-5 py-3.5 text-zinc-300">{m.date}</td>
                        <td className="px-5 py-3.5 text-white font-semibold">{m.labor_role}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-green-400">{m.workers_present}</td>
                        <td className="px-5 py-3.5 text-right font-mono text-red-400">{m.workers_absent}</td>
                        <td className="px-5 py-3.5 text-right font-mono">{m.hours_worked}h</td>
                        <td className="px-5 py-3.5 text-right font-mono text-amber-400">{m.overtime_hours}h</td>
                        <td className="px-5 py-3.5 text-muted">{m.notes || "—"}</td>
                      </tr>
                    ))}
                    {muster.length === 0 && <tr><td colSpan={7} className="px-5 py-8 text-center text-muted">No muster roll entries yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showMusterModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-md border border-border-custom rounded-md p-6 space-y-4">
            <div><h3 className="text-sm font-extrabold text-white">Add Muster Roll Entry</h3></div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Date</label>
                  <input type="date" value={musterDate} onChange={(e) => setMusterDate(e.target.value)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Labor Role</label>
                  <select value={musterRole} onChange={(e) => setMusterRole(e.target.value)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none"><option>Mason</option><option>Helper</option><option>Supervisor</option><option>Steel Fixer</option><option>Electrician</option></select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Present</label>
                  <input type="number" value={musterPresent} onChange={(e) => setMusterPresent(parseInt(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Absent</label>
                  <input type="number" value={musterAbsent} onChange={(e) => setMusterAbsent(parseInt(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Hours Worked</label>
                  <input type="number" step="0.5" value={musterHours} onChange={(e) => setMusterHours(parseFloat(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Overtime</label>
                  <input type="number" step="0.5" value={musterOT} onChange={(e) => setMusterOT(parseFloat(e.target.value) || 0)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Notes</label>
                <textarea value={musterNotes} onChange={(e) => setMusterNotes(e.target.value)} rows={2} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowMusterModal(false)} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleMusterSubmit} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-md text-xs font-bold cursor-pointer">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
