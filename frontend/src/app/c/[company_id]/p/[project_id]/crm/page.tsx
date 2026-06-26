"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const LEADS = [
  { id: "LD-0041", name: "Prestige Urban Heights", contact: "Mr. Arjun Skyline", phone: "+91 98110 55432", value: "₹4.2Cr", stage: "Proposal Sent", source: "Referral", city: "Bangalore", lastAction: "2 days ago", probability: 65 },
  { id: "LD-0040", name: "GreenField Villas Phase 2", contact: "Mrs. Kavitha Reddy", phone: "+91 97334 21100", value: "₹8.7Cr", stage: "Site Visit Done", source: "Website", city: "Hyderabad", lastAction: "5 days ago", probability: 45 },
  { id: "LD-0039", name: "NH-44 Bypass Service Road", contact: "Er. Deepak Jha (NHAI)", phone: "+91 98765 44321", value: "₹22.5Cr", stage: "Negotiation", source: "Tender", city: "Delhi", lastAction: "1 day ago", probability: 80 },
  { id: "LD-0038", name: "Alpha Mall Fit-Out", contact: "Mr. Site Manager Bansal", phone: "+91 99001 12345", value: "₹1.8Cr", stage: "Won", source: "Exhibition", city: "Noida", lastAction: "Closed Jun 18", probability: 100 },
  { id: "LD-0037", name: "Sea View Apartments", contact: "Mr. Prashant Nair", phone: "+91 95432 10987", value: "₹6.1Cr", stage: "Initial Contact", source: "Cold Call", city: "Mumbai", lastAction: "Today", probability: 20 },
  { id: "LD-0036", name: "Industrial Warehouse Complex", contact: "Mr. Sunil Agarwal", phone: "+91 98223 87654", value: "₹3.4Cr", stage: "Lost", source: "Referral", city: "Pune", lastAction: "Jun 10", probability: 0 },
];

const STAGES = ["Initial Contact", "Site Visit Done", "Proposal Sent", "Negotiation", "Won", "Lost"];
const STAGE_COLORS: Record<string, string> = {
  "Initial Contact": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Site Visit Done": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Proposal Sent": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "Negotiation": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "Won": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "Lost": "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function CRMPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const [tab, setTab] = useState<"pipeline" | "kanban">("pipeline");
  const [selectedStage, setSelectedStage] = useState("All");

  const filtered = selectedStage === "All" ? LEADS : LEADS.filter(l => l.stage === selectedStage);
  const totalPipelineValue = LEADS.filter(l => l.stage !== "Lost").reduce((s, l) => {
    const num = parseFloat(l.value.replace(/[₹Cr]/g, "")) * 10000000;
    return s + num;
  }, 0);

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">← Dashboard</Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">CRM & Sales</div>
          {[
            { key: "pipeline", label: "Lead Pipeline", icon: "🤝" },
            { key: "kanban", label: "Kanban Board", icon: "🗂️" },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key as typeof tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${tab === item.key ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">CRM & Lead Management</h1>
            <p className="text-[10px] text-zinc-500">Pipeline: ₹{(totalPipelineValue / 10000000).toFixed(1)}Cr active value</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all">
            + Add Lead
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total Leads", value: LEADS.length, color: "text-white" },
              { label: "Active", value: LEADS.filter(l => !["Won", "Lost"].includes(l.stage)).length, color: "text-primary" },
              { label: "Won (Jun)", value: LEADS.filter(l => l.stage === "Won").length, color: "text-emerald-400" },
              { label: "Lost (Jun)", value: LEADS.filter(l => l.stage === "Lost").length, color: "text-red-400" },
              { label: "Pipeline Value", value: `₹${(totalPipelineValue / 10000000).toFixed(1)}Cr`, color: "text-secondary" },
            ].map((s, i) => (
              <div key={i} className="glass-panel rounded-xl p-4 border border-white/5">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                <div className={`text-xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          {tab === "pipeline" && (
            <div className="space-y-4">
              {/* Stage filter */}
              <div className="flex items-center gap-2 flex-wrap">
                {["All", ...STAGES].map(s => (
                  <button key={s} onClick={() => setSelectedStage(s)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-all ${selectedStage === s ? "bg-primary/20 text-primary border-primary/30" : "bg-white/[0.02] text-zinc-400 border-white/10 hover:border-white/20"}`}>
                    {s}
                  </button>
                ))}
              </div>

              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="text-left px-5 py-3 font-semibold">Lead</th>
                        <th className="text-left px-5 py-3 font-semibold">Contact</th>
                        <th className="text-left px-5 py-3 font-semibold">City</th>
                        <th className="text-right px-5 py-3 font-semibold">Value</th>
                        <th className="text-left px-5 py-3 font-semibold">Stage</th>
                        <th className="text-left px-5 py-3 font-semibold">Win %</th>
                        <th className="text-left px-5 py-3 font-semibold">Source</th>
                        <th className="text-left px-5 py-3 font-semibold">Last Activity</th>
                        <th className="text-left px-5 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((lead, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3">
                            <div className="font-bold text-white">{lead.name}</div>
                            <div className="text-[10px] text-zinc-600 font-mono">{lead.id}</div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-zinc-300">{lead.contact}</div>
                            <div className="text-[10px] text-zinc-600">{lead.phone}</div>
                          </td>
                          <td className="px-5 py-3 text-zinc-400">{lead.city}</td>
                          <td className="px-5 py-3 text-right font-extrabold text-white">{lead.value}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STAGE_COLORS[lead.stage]}`}>{lead.stage}</span>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: `${lead.probability}%` }} />
                              </div>
                              <span className="text-[10px] text-zinc-400">{lead.probability}%</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-zinc-500">{lead.source}</td>
                          <td className="px-5 py-3 text-zinc-500">{lead.lastAction}</td>
                          <td className="px-5 py-3">
                            <button className="text-xs text-secondary hover:underline">View →</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "kanban" && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {STAGES.slice(0, 5).map(stage => {
                const stageLeads = LEADS.filter(l => l.stage === stage);
                return (
                  <div key={stage} className="flex-shrink-0 w-56 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STAGE_COLORS[stage]}`}>{stage}</span>
                      <span className="text-[10px] text-zinc-600">{stageLeads.length}</span>
                    </div>
                    {stageLeads.map((lead, i) => (
                      <div key={i} className="glass-panel rounded-xl p-3 border border-white/5 space-y-2 hover:border-white/10 transition-all">
                        <div className="text-xs font-bold text-white line-clamp-2">{lead.name}</div>
                        <div className="text-[10px] text-zinc-500">{lead.contact}</div>
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-xs font-extrabold text-primary">{lead.value}</span>
                          <span className="text-[10px] text-zinc-600">{lead.city}</span>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[10px] text-zinc-700">No leads</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
