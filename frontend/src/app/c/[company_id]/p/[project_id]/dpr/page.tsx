"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const DPR_ENTRIES = [
  { activity: "RCC Slab — Floor 7 (Grid A-D)", unit: "m³", planned: 45, completed: 38, cumulative: 312, workersDeployed: 22, remarks: "Poured 38m³, shuttering in progress for remaining" },
  { activity: "Brick Masonry — Block C", unit: "m²", planned: 120, completed: 115, cumulative: 840, workersDeployed: 18, remarks: "Completed. Curing started." },
  { activity: "Plumbing Rough-in — Floor 6", unit: "Points", planned: 40, completed: 40, cumulative: 240, workersDeployed: 8, remarks: "All CPVC lines installed. Pressure test pending." },
  { activity: "TMT Reinforcement — Floor 8 Columns", unit: "MT", planned: 8, completed: 5.4, cumulative: 48.6, workersDeployed: 12, remarks: "Rebar work 67.5% complete. Balance tomorrow." },
  { activity: "Electrical Conduit — Floor 5 & 6", unit: "Running m", planned: 200, completed: 180, cumulative: 960, workersDeployed: 6, remarks: "90% complete. Junction boxes pending." },
];

const PHOTO_SLOTS = [
  { label: "Site Progress", emoji: "🏗️", color: "from-primary/20 to-primary/5" },
  { label: "Material Delivery", emoji: "🚛", color: "from-secondary/20 to-secondary/5" },
  { label: "Quality Check", emoji: "✅", color: "from-emerald-500/20 to-emerald-500/5" },
  { label: "Safety Observation", emoji: "⚠️", color: "from-amber-500/20 to-amber-500/5" },
];

export default function DPRPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const [submitted, setSubmitted] = useState(false);
  const [weather, setWeather] = useState("Clear");
  const [issues, setIssues] = useState("");

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
            <p className="text-[10px] text-zinc-500">Metro Terminal (Phase 2) · Jun 26, 2026 · Site Engineer: Vikram Joshi</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">
              🌤 Weather: {weather}
            </span>
            {submitted ? (
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">✓ DPR Submitted</span>
            ) : (
              <button onClick={() => setSubmitted(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all">
                Submit DPR →
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Daily totals */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Activities Tracked", value: DPR_ENTRIES.length, color: "text-white" },
              { label: "Total Workers Deployed", value: DPR_ENTRIES.reduce((s, e) => s + e.workersDeployed, 0), color: "text-primary" },
              { label: "Avg Completion", value: `${Math.round(DPR_ENTRIES.reduce((s, e) => s + (e.completed / e.planned) * 100, 0) / DPR_ENTRIES.length)}%`, color: "text-emerald-400" },
              { label: "Issues Flagged", value: "1", color: "text-amber-400" },
            ].map((s, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 border border-white/5">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                <div className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Activity progress table */}
          <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 py-3 border-b border-white/5">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Activity Progress — Today</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 text-zinc-500">
                    <th className="text-left px-5 py-3 font-semibold">Activity</th>
                    <th className="text-center px-4 py-3 font-semibold">Unit</th>
                    <th className="text-center px-4 py-3 font-semibold">Planned</th>
                    <th className="text-center px-4 py-3 font-semibold">Completed</th>
                    <th className="text-center px-4 py-3 font-semibold">Progress</th>
                    <th className="text-center px-4 py-3 font-semibold">Cumulative</th>
                    <th className="text-center px-4 py-3 font-semibold">Workers</th>
                    <th className="text-left px-4 py-3 font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {DPR_ENTRIES.map((e, i) => {
                    const pct = Math.round((e.completed / e.planned) * 100);
                    return (
                      <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                        <td className="px-5 py-3 text-white font-medium max-w-[200px]">{e.activity}</td>
                        <td className="px-4 py-3 text-center text-zinc-400">{e.unit}</td>
                        <td className="px-4 py-3 text-center text-zinc-300">{e.planned}</td>
                        <td className="px-4 py-3 text-center font-bold text-white">{e.completed}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 100 ? "bg-emerald-500" : pct >= 70 ? "bg-primary" : "bg-amber-500"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                            </div>
                            <span className={`text-[10px] font-bold ${pct >= 100 ? "text-emerald-400" : pct >= 70 ? "text-primary" : "text-amber-400"}`}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-400">{e.cumulative} {e.unit}</td>
                        <td className="px-4 py-3 text-center text-white font-semibold">{e.workersDeployed}</td>
                        <td className="px-4 py-3 text-zinc-500 text-[10px] max-w-[200px]">{e.remarks}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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

          {/* Issues & Notes */}
          <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-3">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Issues, Delays & Safety Observations</h2>
            <textarea
              rows={3}
              value={issues}
              onChange={e => setIssues(e.target.value)}
              placeholder="E.g. TMT delivery delayed by 1 day — vendor confirmed tomorrow morning. Crane wire rope showing wear — flagged for maintenance..."
              className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all resize-none"
            />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <select value={weather} onChange={e => setWeather(e.target.value)} className="bg-white/[0.03] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none">
                  {["Clear", "Partly Cloudy", "Overcast", "Light Rain", "Heavy Rain", "Fog"].map(w => <option key={w}>{w}</option>)}
                </select>
                <span className="text-[10px] text-zinc-600">Weather condition today</span>
              </div>
              {!submitted && (
                <button onClick={() => setSubmitted(true)} className="rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-5 py-2 text-xs font-bold text-white hover:opacity-90 transition-all">
                  Submit & Send WhatsApp Alert →
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
