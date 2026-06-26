"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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

export default function DPRPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<DPRSummary>({
    activities_tracked: 0,
    total_workers_deployed: 0,
    avg_completion: 0.0,
    issues_flagged: 0
  });
  const [logs, setLogs] = useState<DPRLog[]>([]);

  // Form states
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [executedQty, setExecutedQty] = useState("");
  const [workersDeployed, setWorkersDeployed] = useState("");
  const [weather, setWeather] = useState("Clear");
  const [notes, setNotes] = useState("");
  const [issues, setIssues] = useState("");
  const [cementConsumed, setCementConsumed] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchTasks = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
        if (data.length > 0) {
          setSelectedTaskId(data[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDPRSummary = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/dpr/summary?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchDPRLogs = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/dpr?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTasks();
      fetchDPRSummary();
      fetchDPRLogs();
    }
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskId || !executedQty) {
      setMessage("Please fill in the required fields (Task & Completed Quantity)");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const materials = [];
    if (cementConsumed && parseFloat(cementConsumed) > 0) {
      materials.push({
        material_name: "Cement",
        quantity: parseFloat(cementConsumed),
        unit: "bags"
      });
    }

    try {
      const res = await fetch("http://localhost:8000/apis/v3/dpr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          task_id: selectedTaskId,
          reported_by: "Vikram Joshi",
          dpr_date: new Date().toISOString(),
          weather: weather,
          executed_qty: parseFloat(executedQty),
          workers_deployed: parseInt(workersDeployed || "0"),
          materials_consumed: materials,
          photos: [],
          notes: notes,
          issues: issues
        })
      });

      if (res.ok) {
        setMessage("✓ DPR entry submitted successfully!");
        setExecutedQty("");
        setWorkersDeployed("");
        setNotes("");
        setIssues("");
        setCementConsumed("");
        
        // Refresh summaries and logs
        fetchTasks();
        fetchDPRSummary();
        fetchDPRLogs();
      } else {
        const err = await res.text();
        setMessage(`Error: ${err}`);
      }
    } catch (e) {
      setMessage("Failed to connect to the backend API.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">← Dashboard</Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Progress Tracking</div>
          <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
            <span>👷</span> Daily Progress (DPR)
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Daily Progress Report</h1>
            <p className="text-[10px] text-zinc-500">Log site activities, weather, labour attendance, and material consumption</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              🌤 Weather: {weather}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Daily totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Activities Tracked", value: summary.activities_tracked, color: "text-white" },
              { label: "Total Workers Deployed", value: summary.total_workers_deployed, color: "text-primary" },
              { label: "Avg Completion", value: `${summary.avg_completion}%`, color: "text-emerald-400" },
              { label: "Issues Flagged", value: summary.issues_flagged, color: "text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 border border-white/5">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                <div className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Input Form */}
            <div className="lg:col-span-1 glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Log Progress</h2>
              
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">Select Task *</label>
                  <select
                    value={selectedTaskId}
                    onChange={e => setSelectedTaskId(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50"
                  >
                    <option value="" disabled>-- Select Task --</option>
                    {tasks.map(t => (
                      <option key={t.id} value={t.id} className="bg-[#0E0C15]">
                        {t.name} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase">Completed Qty *</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="E.g. 35.5"
                      value={executedQty}
                      onChange={e => setExecutedQty(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase">Labour Count</label>
                    <input
                      type="number"
                      placeholder="E.g. 12"
                      value={workersDeployed}
                      onChange={e => setWorkersDeployed(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase">Cement Used (bags)</label>
                    <input
                      type="number"
                      placeholder="E.g. 15"
                      value={cementConsumed}
                      onChange={e => setCementConsumed(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-400 uppercase">Weather</label>
                    <select
                      value={weather}
                      onChange={e => setWeather(e.target.value)}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                    >
                      {["Clear", "Cloudy", "Rainy", "Overcast", "Foggy"].map(w => (
                        <option key={w} value={w} className="bg-[#0E0C15]">{w}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">Remarks / Notes</label>
                  <input
                    type="text"
                    placeholder="Work description..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-400 uppercase">Issues / Delays</label>
                  <input
                    type="text"
                    placeholder="E.g. Crane breakdown (2 hrs)..."
                    value={issues}
                    onChange={e => setIssues(e.target.value)}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-primary/50"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] font-bold text-xs text-white hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Daily Progress →"}
                </button>

                {message && (
                  <p className="text-[10px] font-bold text-center mt-2 text-zinc-300 bg-white/5 py-1 px-2 rounded">
                    {message}
                  </p>
                )}
              </form>
            </div>

            {/* DPR Log Table */}
            <div className="lg:col-span-2 glass-panel rounded-2xl border border-white/5 overflow-hidden flex flex-col">
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Today's Activity Log</h2>
              </div>
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500">
                      <th className="text-left px-5 py-3 font-semibold">Date</th>
                      <th className="text-left px-4 py-3 font-semibold">Reported By</th>
                      <th className="text-center px-4 py-3 font-semibold">Weather</th>
                      <th className="text-center px-4 py-3 font-semibold">Completed Qty</th>
                      <th className="text-center px-4 py-3 font-semibold">Workers</th>
                      <th className="text-left px-4 py-3 font-semibold">Issues / Delays</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log, i) => (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                        <td className="px-5 py-3 text-zinc-400 font-mono">
                          {new Date(log.dpr_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-white font-medium">{log.reported_by}</td>
                        <td className="px-4 py-3 text-center text-zinc-300">{log.weather}</td>
                        <td className="px-4 py-3 text-center text-emerald-400 font-bold">{log.executed_qty}</td>
                        <td className="px-4 py-3 text-center text-zinc-300">{log.workers_deployed}</td>
                        <td className="px-4 py-3 text-red-400 font-semibold">{log.issues || "None"}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-10 text-zinc-600">
                          No DPR entries logged for today yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Site photos */}
          <div>
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Site Photo Documentation</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PHOTO_SLOTS.map((slot, i) => (
                <div key={i} className={`rounded-2xl border border-white/5 bg-gradient-to-br ${slot.color} aspect-video flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-white/10 transition-all`}>
                  <span className="text-3xl">{slot.emoji}</span>
                  <span className="text-[10px] text-zinc-400 font-semibold">{slot.label}</span>
                  <span className="text-[10px] text-zinc-600">Click to upload</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
