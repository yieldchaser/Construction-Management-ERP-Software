"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Lead {
  id: string;
  contact_name: string;
  lead_type: string;
  phone_no: string;
  email?: string;
  client_company_name?: string;
  address?: string;
  source?: string;
  category?: string;
  status: string;
  priority: string;
  budget: number;
  description?: string;
  lead_date: string;
}

const STAGES = ["New Lead", "Initial Contact", "Site Visit Done", "Proposal Sent", "Negotiation", "Won", "Lost"];

const STAGE_COLORS: Record<string, string> = {
  "New Lead": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
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

  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<"pipeline" | "kanban">("pipeline");
  const [selectedStage, setSelectedStage] = useState("All");

  // Lead modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [contactName, setContactName] = useState("");
  const [phoneNo, setPhoneNo] = useState("");
  const [email, setEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [leadType, setLeadType] = useState("Residential");
  const [budget, setBudget] = useState("");
  const [source, setSource] = useState("Website");
  const [category, setCategory] = useState("Civil");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchLeads = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/crm/leads?company_id=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (companyId) {
      fetchLeads();
    }
  }, [companyId]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !phoneNo) {
      setErrorMsg("Please fill in Contact Name and Phone Number");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("http://localhost:8000/apis/v3/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          contact_name: contactName,
          phone_no: phoneNo,
          email: email || null,
          client_company_name: clientCompany || null,
          lead_type: leadType,
          budget: parseFloat(budget || "0"),
          source: source,
          category: category,
          description: description || null,
          status: "New Lead",
          priority: "medium"
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setContactName("");
        setPhoneNo("");
        setEmail("");
        setClientCompany("");
        setBudget("");
        setDescription("");
        fetchLeads();
      } else {
        const err = await res.text();
        setErrorMsg(`Error: ${err}`);
      }
    } catch (e) {
      setErrorMsg("Failed to connect to the backend API.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/crm/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        fetchLeads();
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const filteredLeads = selectedStage === "All" ? leads : leads.filter(l => l.status === selectedStage);
  const totalPipelineValue = leads.filter(l => l.status !== "Lost").reduce((s, l) => s + l.budget, 0);

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
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${tab === item.key ? "bg-white/[0.06] text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">CRM & Lead Management</h1>
            <p className="text-[10px] text-zinc-500">Pipeline: ₹{(totalPipelineValue / 100000).toFixed(2)}L active value</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all">
            + Add Lead
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Total Leads", value: leads.length, color: "text-white" },
              { label: "Active", value: leads.filter(l => !["Won", "Lost"].includes(l.status)).length, color: "text-primary" },
              { label: "Won (Jun)", value: leads.filter(l => l.status === "Won").length, color: "text-emerald-400" },
              { label: "Lost (Jun)", value: leads.filter(l => l.status === "Lost").length, color: "text-red-400" },
              { label: "Pipeline Value", value: `₹${(totalPipelineValue / 100000).toFixed(2)}L`, color: "text-secondary" },
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
                        <th className="text-right px-5 py-3 font-semibold">Budget</th>
                        <th className="text-left px-5 py-3 font-semibold">Stage</th>
                        <th className="text-left px-5 py-3 font-semibold">Source / Type</th>
                        <th className="text-left px-5 py-3 font-semibold">Lead Date</th>
                        <th className="text-left px-5 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLeads.map((lead, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3">
                            <div className="font-bold text-white">{lead.client_company_name || "Direct Customer"}</div>
                            <div className="text-[10px] text-zinc-600 font-mono">{lead.id.substring(0, 8)}</div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="text-zinc-300">{lead.contact_name}</div>
                            <div className="text-[10px] text-zinc-600">{lead.phone_no}</div>
                          </td>
                          <td className="px-5 py-3 text-right font-extrabold text-white">₹{lead.budget.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3">
                            <select
                              value={lead.status}
                              onChange={e => handleUpdateStatus(lead.id, e.target.value)}
                              className={`px-2 py-1 rounded-full text-[10px] font-semibold border bg-transparent focus:outline-none ${STAGE_COLORS[lead.status]}`}
                            >
                              {STAGES.map(st => (
                                <option key={st} value={st} className="bg-[#0E0C15] text-zinc-300">{st}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-5 py-3 text-zinc-500">
                            <div>{lead.source}</div>
                            <div className="text-[10px] text-zinc-600">{lead.lead_type}</div>
                          </td>
                          <td className="px-5 py-3 text-zinc-500">
                            {new Date(lead.lead_date).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs text-secondary cursor-pointer hover:underline">Convert</span>
                          </td>
                        </tr>
                      ))}
                      {filteredLeads.length === 0 && (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-zinc-600">No leads found in this pipeline stage.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "kanban" && (
            <div className="flex gap-4 overflow-x-auto pb-2">
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.status === stage);
                return (
                  <div key={stage} className="flex-shrink-0 w-56 space-y-3 bg-[#0B0910]/40 p-3 rounded-2xl border border-white/[0.02]">
                    <div className="flex items-center justify-between pb-1 border-b border-white/5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${STAGE_COLORS[stage]}`}>{stage}</span>
                      <span className="text-[10px] text-zinc-600 font-bold">{stageLeads.length}</span>
                    </div>
                    {stageLeads.map((lead, i) => (
                      <div key={i} className="glass-panel rounded-xl p-3 border border-white/5 space-y-2 hover:border-white/10 transition-all cursor-pointer">
                        <div className="text-xs font-bold text-white line-clamp-2">{lead.client_company_name || lead.contact_name}</div>
                        <div className="text-[10px] text-zinc-500">{lead.phone_no}</div>
                        <div className="flex items-center justify-between pt-1 border-t border-white/5">
                          <span className="text-xs font-extrabold text-primary">₹{lead.budget.toLocaleString("en-IN")}</span>
                          <span className="text-[10px] text-zinc-600">{lead.lead_type}</span>
                        </div>
                      </div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="rounded-xl border border-dashed border-white/5 p-4 text-center text-[10px] text-zinc-700">No leads</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0D0B14] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">Add New CRM Lead</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            
            {errorMsg && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{errorMsg}</p>}

            <form onSubmit={handleCreateLead} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Contact Name *</label>
                  <input type="text" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Mr. Arjun Skyline" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Phone Number *</label>
                  <input type="text" value={phoneNo} onChange={e => setPhoneNo(e.target.value)} placeholder="+91 98110..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="arjun@gmail.com" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Client Company</label>
                  <input type="text" value={clientCompany} onChange={e => setClientCompany(e.target.value)} placeholder="Prestige Heights" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Lead Type</label>
                  <select value={leadType} onChange={e => setLeadType(e.target.value)} className="w-full bg-[#0E0C15] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none">
                    {["Residential", "Commercial", "Infrastructure"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Project Budget (INR)</label>
                  <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="E.g. 4500000" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Lead Source</label>
                  <select value={source} onChange={e => setSource(e.target.value)} className="w-full bg-[#0E0C15] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none">
                    {["Website", "Referral", "Tender", "Exhibition", "Cold Call"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase">Project Category</label>
                  <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-[#0E0C15] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none">
                    {["Civil", "Electrical", "Plumbing", "Interior"].map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Notes / Description</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Additional information..." className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none" />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] font-bold text-xs text-white hover:opacity-90 disabled:opacity-50 transition-all">
                {submitting ? "Adding..." : "Add Lead →"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
