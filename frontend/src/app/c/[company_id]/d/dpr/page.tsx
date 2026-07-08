"use client";
import { getApiHost } from "@/lib/api";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";

interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
}

interface DPRSummary {
  activities_tracked: number;
  total_workers_deployed: number;
  avg_completion: number;
  issues_flagged: number;
}

interface DPRLog {
  id: string;
  dpr_date: string;
  reported_by: string;
  weather: string;
  executed_qty: number;
  workers_deployed: number;
  notes: string;
  issues: string;
}

const PHOTO_SLOTS = [
  { label: "Site Progress", emoji: "🏗️", color: "from-primary/20 to-primary/5" },
  { label: "Material Delivery", emoji: "🚛", color: "from-secondary/20 to-secondary/5" },
  { label: "Quality Check", emoji: "✅", color: "from-emerald-500/20 to-emerald-500/5" },
  { label: "Safety Observation", emoji: "⚠️", color: "from-amber-500/20 to-amber-500/5" },
];

const MOCK_TASKS: Task[] = [
  { id: "task-001", name: "RCC Terrace Slab — Grid A-D", status: "in_progress", priority: "high" },
  { id: "task-002", name: "Brick Masonry — 2nd Floor East Wing", status: "in_progress", priority: "medium" },
  { id: "task-003", name: "External Plastering — West Elevation", status: "pending", priority: "medium" },
  { id: "task-004", name: "Plumbing Rough-in — G+1 Toilets", status: "pending", priority: "low" },
];

const MOCK_SUMMARY: DPRSummary = {
  activities_tracked: 4,
  total_workers_deployed: 22,
  avg_completion: 58.5,
  issues_flagged: 2,
};

const MOCK_DPR_LOGS: DPRLog[] = [
  { id: "dpr-001", dpr_date: "2026-07-01T00:00:00Z", reported_by: "Er. Suresh R (PM)", weather: "Clear", executed_qty: 18.0, workers_deployed: 22, notes: "RCC terrace slab poured in Grid A-D. Cube samples taken — CB-2026-004.", issues: "" },
  { id: "dpr-002", dpr_date: "2026-06-30T00:00:00Z", reported_by: "Er. Ravi K (Site Eng)", weather: "Overcast", executed_qty: 6.5, workers_deployed: 15, notes: "Brick masonry progressed in 2nd floor east wing — 6.5 m³ completed.", issues: "Short supply of mortar sand. Reordered 12 m³ from Rajesh Aggregates." },
  { id: "dpr-003", dpr_date: "2026-06-28T00:00:00Z", reported_by: "Er. Suresh R (PM)", weather: "Clear", executed_qty: 12.2, workers_deployed: 18, notes: "Shuttering for parapet wall done. Concrete pour scheduled tomorrow.", issues: "" },
];

export default function DPRPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<DPRSummary>({
    activities_tracked: 4,
    total_workers_deployed: 15,
    avg_completion: 45.2,
    issues_flagged: 1
  });
  const [logs, setLogs] = useState<DPRLog[]>([]);

  // Modal open states
  const [isCreateDPROpen, setIsCreateDPROpen] = useState(false);
  const [showMBModal, setShowMBModal] = useState(false);

  // Form states
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [executedQty, setExecutedQty] = useState("");
  const [workersDeployed, setWorkersDeployed] = useState("");
  const [weather, setWeather] = useState("Clear");
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState("");
  const [cementConsumed, setCementConsumed] = useState("");
  
  // Measurement Book (M.B.) takeoff items state
  const [mbRows, setMbRows] = useState<any[]>([
    { description: "Main Floor 2 Slab section A", nos: 1, l: 15.0, w: 8.0, h: 0.15 },
    { description: "Beam drop grid B-C", nos: 3, l: 6.0, w: 0.3, h: 0.45 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/planning/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const taskList = data.length > 0 ? data : MOCK_TASKS;
        setTasks(taskList);
        if (taskList.length > 0) {
          setSelectedTaskId(taskList[0].id);
        }
      } else {
        setTasks(MOCK_TASKS);
        setSelectedTaskId(MOCK_TASKS[0].id);
      }
    } catch (e) {
      console.error(e);
      setTasks(MOCK_TASKS);
      setSelectedTaskId(MOCK_TASKS[0].id);
    }
  };

  const fetchDPRSummary = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/dpr/summary?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      } else {
        setSummary(MOCK_SUMMARY);
      }
    } catch (e) {
      console.error(e);
      setSummary(MOCK_SUMMARY);
    }
  };

  const fetchDPRLogs = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/dpr/summary?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.length > 0 ? data : MOCK_DPR_LOGS);
      } else {
        setLogs(MOCK_DPR_LOGS);
      }
    } catch (e) {
      console.error(e);
      setLogs(MOCK_DPR_LOGS);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
      fetchDPRSummary();
      fetchDPRLogs();
    }
  }, [projectId]);

  const handleSubmitDPR = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    try {
      const res = await fetch(`${getApiHost()}/apis/v3/dpr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          task_id: selectedTaskId,
          executed_qty: parseFloat(executedQty) || 0.0,
          workers_deployed: parseInt(workersDeployed) || 0,
          weather: weather,
          notes: notes,
          issues: issues,
          cement_consumed: parseFloat(cementConsumed) || 0.0
        })
      });

      if (res.ok) {
        setMessage("DPR submitted successfully!");
        setExecutedQty("");
        setWorkersDeployed("");
        setCementConsumed("");
        setNotes("");
        setIssues("");
        setIsCreateDPROpen(false);
        fetchDPRSummary();
        fetchDPRLogs();
      } else {
        setMessage("Failed to submit DPR.");
      }
    } catch (err) {
      setMessage("Server connection failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Main Container */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border-custom px-8 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Project Daily Progress Report (DPR)</h1>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-muted">SiteFlow daily feed</span>
          </div>
          <button
            onClick={() => setIsCreateDPROpen(true)}
            className="px-4 py-2 bg-primary rounded-md text-xs font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            Create DPR +
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 relative">
          
          {/* Dashboard Quick Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Site Staff Present", value: summary.total_workers_deployed || "—", desc: "Clocked via geofence", color: "border-primary/20 bg-primary/5 text-primary" },
              { label: "Equipment Used", value: logs.length > 0 ? `${logs.length} Reports` : "0 Active", desc: "DPR reports logged", color: "border-secondary/20 bg-secondary/5 text-secondary" },
              { label: "Subcon Updates", value: logs.filter((l: any) => l.subcon_name).length > 0 ? `${logs.filter((l: any) => l.subcon_name).length} Updates` : "0 Tasks updated", desc: "Logged by subcontractors", color: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400" },
              { label: "Material Received", value: logs.reduce((sum: number, l: any) => sum + (l.material_received || 0), 0) > 0 ? `${logs.reduce((sum: number, l: any) => sum + (l.material_received || 0), 0)} Units` : "No GRNs today", desc: "Material inward logged", color: "border-amber-500/20 bg-amber-500/5 text-amber-400" },
              { label: "Material Used Today", value: logs.reduce((sum: number, l: any) => sum + (l.material_used || 0), 0) > 0 ? `${logs.reduce((sum: number, l: any) => sum + (l.material_used || 0), 0)} Units` : "No consumption logged", desc: "On-site consumption", color: "border-purple-500/20 bg-purple-500/5 text-purple-400" }
            ].map((card, idx) => (
              <div key={idx} className={`p-4 rounded-lg border ${card.color} flex flex-col justify-between h-28 shadow-sm`}>
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">{card.label}</span>
                <div>
                  <h3 className="text-lg font-extrabold mt-1">{card.value}</h3>
                  <p className="text-[9px] opacity-60 mt-0.5">{card.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* DPR Log Timeline Feed */}
          <div className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom p-6 space-y-4">
            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Chronological DPR Activity Feed</h3>
            <div className="space-y-4">
              {logs.length === 0 ? (
                <p className="text-xs text-muted text-center py-10">No daily logs reported for this project yet. Click "Create DPR" to submit one!</p>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="p-4 rounded-md border border-border-custom bg-input space-y-2 text-xs">
                    <div className="flex justify-between items-center text-[10px] text-muted">
                      <span className="font-bold text-zinc-300">Reported By: {log.reported_by}</span>
                      <span>Weather: <strong className="text-muted">{log.weather}</strong> · {new Date(log.dpr_date).toLocaleDateString()}</span>
                    </div>
                    <div className="border-l-2 border-primary pl-3 my-2">
                      <p className="text-white text-xs font-semibold">Qty Executed: {log.executed_qty}</p>
                      {log.notes && <p className="text-muted mt-1">{log.notes}</p>}
                    </div>
                    {log.issues && (
                      <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px]">
                        ⚠️ <strong>Issue Flagged:</strong> {log.issues}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create DPR Modal Drawer */}
      {isCreateDPROpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">Create Daily Progress Report (DPR)</h3>
                <p className="text-[10px] text-muted">Log task physical status, workers, and consumption</p>
              </div>
              <button onClick={() => { setIsCreateDPROpen(false); setMessage(""); }} className="text-muted hover:text-foreground">✕</button>
            </div>

            <form onSubmit={handleSubmitDPR} className="p-6 overflow-y-auto space-y-4 text-xs">
              {message && (
                <div className={`p-3 rounded-lg text-xs font-semibold ${message.includes("success") ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" : "bg-red-500/15 text-red-400 border border-red-500/20"}`}>
                  {message}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-muted">Select WBS Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-input border border-border-custom rounded-lg p-2 text-white"
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.id}>{t.name} ({t.status})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-muted">Executed Qty</label>
                    <button
                      type="button"
                      onClick={() => setShowMBModal(true)}
                      className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                    >
                      📐 Open M.B. Sheet
                    </button>
                  </div>
                  <input type="number" step="0.01" value={executedQty} onChange={(e) => setExecutedQty(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-white" placeholder="e.g. 45" />
                </div>
                <div className="space-y-1">
                  <label className="text-muted">Workers Deployed</label>
                  <input type="number" value={workersDeployed} onChange={(e) => setWorkersDeployed(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-white" placeholder="e.g. 15" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted">Weather Condition</label>
                  <select value={weather} onChange={(e) => setWeather(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-white">
                    <option value="Clear">Clear</option>
                    <option value="Rainy">Rainy</option>
                    <option value="Overcast">Overcast</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-muted">Cement Consumed (Bags)</label>
                  <input type="number" value={cementConsumed} onChange={(e) => setCementConsumed(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-white" placeholder="e.g. 45" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-muted">General Notes</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-white resize-none" placeholder="Cast grid concrete..." />
              </div>

              <div className="space-y-1">
                <label className="text-muted">Site Issues / Blockers</label>
                <input type="text" value={issues} onChange={(e) => setIssues(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-white" placeholder="Water logging, shortage of steel..." />
              </div>

              {/* Photo uploading slots simulator */}
              <div className="space-y-2 pt-2 border-t border-border-custom">
                <span className="text-muted font-bold block">Attach Progress Records</span>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  {PHOTO_SLOTS.map((slot, i) => (
                    <div key={i} className={`p-2.5 rounded-md border border-border-custom bg-gradient-to-tr ${slot.color} flex flex-col items-center justify-center cursor-pointer hover:border-border-custom`}>
                      <span className="text-lg">{slot.emoji}</span>
                      <span className="mt-1 text-muted font-bold">{slot.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-border-custom pt-4">
                <button type="button" onClick={() => setIsCreateDPROpen(false)} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-primary text-white font-bold rounded-md hover:opacity-90">
                  {submitting ? "Saving..." : "Submit Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Measurement Book (M.B.) Takeoff Sheet Modal */}
      {showMBModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white">📐 Measurement Book (M.B.) Takeoff Sheet</h3>
                <p className="text-[10px] text-muted">Calculate quantities by structural dimensions (N × L × W × H)</p>
              </div>
              <button onClick={() => setShowMBModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted bg-elevated">
                    <th className="px-4 py-2 font-semibold">Description</th>
                    <th className="px-4 py-2 font-semibold">No. (Multiplier)</th>
                    <th className="px-4 py-2 font-semibold">Length (m)</th>
                    <th className="px-4 py-2 font-semibold">Width (m)</th>
                    <th className="px-4 py-2 font-semibold">Height / Depth (m)</th>
                    <th className="px-4 py-2 font-semibold text-right">Quantity (m³)</th>
                    <th className="px-4 py-2 font-semibold text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mbRows.map((row, idx) => {
                    const rowQty = row.nos * row.l * row.w * row.h;
                    return (
                      <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.01]">
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={row.description}
                            onChange={(e) => {
                              const next = [...mbRows];
                              next[idx].description = e.target.value;
                              setMbRows(next);
                            }}
                            placeholder="e.g. Column C1"
                            className="bg-input border border-border-custom rounded px-2 py-1 text-white w-full"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={row.nos}
                            onChange={(e) => {
                              const next = [...mbRows];
                              next[idx].nos = parseFloat(e.target.value) || 0;
                              setMbRows(next);
                            }}
                            className="bg-input border border-border-custom rounded px-2 py-1 text-white w-16"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={row.l}
                            onChange={(e) => {
                              const next = [...mbRows];
                              next[idx].l = parseFloat(e.target.value) || 0;
                              setMbRows(next);
                            }}
                            className="bg-input border border-border-custom rounded px-2 py-1 text-white w-16"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={row.w}
                            onChange={(e) => {
                              const next = [...mbRows];
                              next[idx].w = parseFloat(e.target.value) || 0;
                              setMbRows(next);
                            }}
                            className="bg-input border border-border-custom rounded px-2 py-1 text-white w-16"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={row.h}
                            onChange={(e) => {
                              const next = [...mbRows];
                              next[idx].h = parseFloat(e.target.value) || 0;
                              setMbRows(next);
                            }}
                            className="bg-input border border-border-custom rounded px-2 py-1 text-white w-16"
                          />
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-zinc-300">
                          {rowQty.toFixed(3)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setMbRows(mbRows.filter((_, i) => i !== idx));
                            }}
                            className="text-red-500 hover:text-red-400 font-bold cursor-pointer"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => setMbRows([...mbRows, { description: "", nos: 1, l: 0, w: 0, h: 0 }])}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-white font-bold cursor-pointer"
                >
                  + Add Dimension Row
                </button>
                <div className="text-right text-xs">
                  <span className="text-muted block uppercase text-[9px] tracking-wider">Total Takeoff Sum</span>
                  <strong className="text-lg font-black text-success font-mono">
                    {mbRows.reduce((acc, r) => acc + (r.nos * r.l * r.w * r.h), 0).toFixed(3)} m³
                  </strong>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border-custom bg-background flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowMBModal(false)}
                className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const total = mbRows.reduce((acc, r) => acc + (r.nos * r.l * r.w * r.h), 0);
                  setExecutedQty(total.toFixed(3));
                  setShowMBModal(false);
                }}
                className="px-5 py-2.5 bg-primary text-white font-bold rounded-md hover:opacity-90 cursor-pointer"
              >
                Apply to Executed Qty ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
