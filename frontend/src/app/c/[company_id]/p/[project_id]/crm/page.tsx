"use client";
import { getApiHost } from "@/lib/api";

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

const MOCK_LEADS: Lead[] = [
  { id: "lead-001", contact_name: "Arjun Skyline", lead_type: "Residential", phone_no: "+91 98110 45678", email: "arjun@gmail.com", client_company_name: "Skyline Builders", address: "Sector 62, Noida, UP", source: "Referral", category: "Civil", status: "Proposal Sent", priority: "high", budget: 4500000, description: "G+3 residential villa with basement parking", lead_date: "2026-06-01" },
  { id: "lead-002", contact_name: "Priya Apex", lead_type: "Commercial", phone_no: "+91 97700 12345", email: "priya@prestige.in", client_company_name: "Prestige Heights", address: "Whitefield, Bengaluru", source: "Tender", category: "Civil", status: "Negotiation", priority: "high", budget: 18000000, description: "5,000 sqft commercial showroom with mezzanine", lead_date: "2026-06-05" },
  { id: "lead-003", contact_name: "Rakesh Nair", lead_type: "Infrastructure", phone_no: "+91 88901 67890", email: "rakesh.nair@pwd.gov.in", client_company_name: "Kerala PWD", address: "Thiruvananthapuram, Kerala", source: "Tender", category: "Civil", status: "Initial Contact", priority: "medium", budget: 32000000, description: "Road widening project — 4.5 km stretch", lead_date: "2026-06-10" },
  { id: "lead-004", contact_name: "Deepika Reddy", lead_type: "Residential", phone_no: "+91 91234 56789", email: "deepika@gmail.com", client_company_name: "", address: "Jubilee Hills, Hyderabad", source: "Website", category: "Interior", status: "Site Visit Done", priority: "medium", budget: 2800000, description: "3BHK luxury flat renovation including modular kitchen", lead_date: "2026-06-15" },
  { id: "lead-005", contact_name: "Suresh Kapoor", lead_type: "Commercial", phone_no: "+91 99870 11223", email: "suresh@kapoorindustries.com", client_company_name: "Kapoor Industries", address: "Peenya Industrial Area, Bengaluru", source: "Referral", category: "Civil", status: "Won", priority: "low", budget: 7500000, description: "Warehouse and loading bay with RCC frame structure", lead_date: "2026-05-28" },
];

export default function CRMPage() {
  const params = useParams();
  const companyId = params?.company_id as string;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [tab, setTab] = useState<"pipeline" | "kanban" | "quotations">("pipeline");
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

  // Quotation states
  const [quotations, setQuotations] = useState<any[]>([]);
  const [showAddQuotModal, setShowAddQuotModal] = useState(false);
  const [newQuot, setNewQuot] = useState({
    subject: "",
    leadId: "",
    discount: "0",
    terms: "",
    items: [{ name: "", qty: "1", unit: "Nos", price: "0" }]
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchQuotationsForLeads = async (leadsList: Lead[]) => {
    try {
      let allQuots: any[] = [];
      for (const l of leadsList) {
        if (l.id.startsWith("lead-")) continue; // Skip mock leads
        const qRes = await fetch(`${getApiHost()}/apis/v3/crm/leads/${l.id}/quotations`);
        if (qRes.ok) {
          const qData = await qRes.json();
          allQuots = [...allQuots, ...qData.map((item: any) => ({ ...item, client_name: l.client_company_name || l.contact_name }))];
        }
      }
      setQuotations(allQuots);
    } catch (e) {
      console.error("Failed to load quotations", e);
    }
  };

  const fetchLeads = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/crm/leads?company_id=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setLeads(data.length > 0 ? data : MOCK_LEADS);
        if (data.length > 0) {
          fetchQuotationsForLeads(data);
        }
      } else {
        setLeads(MOCK_LEADS);
      }
    } catch (e) {
      console.error(e);
      setLeads(MOCK_LEADS);
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
      const res = await fetch(`${getApiHost()}/apis/v3/crm/leads`, {
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

  const handleCreateQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuot.subject || !newQuot.leadId) {
      setErrorMsg("Subject and Lead are required");
      return;
    }
    setSubmitting(true);
    setErrorMsg("");
    try {
      const formattedItems = newQuot.items.map(item => ({
        section_name: "Items",
        item_name: item.name,
        qty: parseFloat(item.qty),
        unit: item.unit,
        selling_price: parseFloat(item.price),
        cost_price: parseFloat(item.price),
        supply_rate: parseFloat(item.price),
        installation_rate: 0.0,
      }));

      const res = await fetch(`${getApiHost()}/apis/v3/crm/leads/${newQuot.leadId}/quotations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: newQuot.subject,
          discount: parseFloat(newQuot.discount),
          terms: newQuot.terms || null,
          items: formattedItems
        }),
      });

      if (res.ok) {
        setShowAddQuotModal(false);
        setNewQuot({
          subject: "",
          leadId: "",
          discount: "0",
          terms: "",
          items: [{ name: "", qty: "1", unit: "Nos", price: "0" }]
        });
        fetchLeads();
      } else {
        const err = await res.text();
        setErrorMsg(`Error: ${err}`);
      }
    } catch (e) {
      setErrorMsg("Failed to create quotation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    // Optimistic local update first (works even offline)
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    try {
      await fetch(`${getApiHost()}/apis/v3/crm/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (e) {
      console.error("Failed to sync status to server", e);
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
            { key: "quotations", label: "Quotation List", icon: "📑" },
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
            <h1 className="text-sm font-bold text-white">
              {tab === "quotations" ? "Pre-sales Quotation Registry" : "CRM & Lead Management"}
            </h1>
            <p className="text-[10px] text-zinc-500">Pipeline: ₹{(totalPipelineValue / 100000).toFixed(2)}L active value</p>
          </div>
          {tab === "quotations" ? (
            <button onClick={() => setShowAddQuotModal(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer">
              + Create Quotation
            </button>
          ) : (
            <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer">
              + Add Lead
            </button>
          )}
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

          {tab === "quotations" && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-500">View and print customer quotations, track status, and convert to projects.</div>
              <div className="glass-panel rounded-2xl border border-white/5 bg-[#14121F] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-5 py-3">Created At</th>
                      <th className="px-5 py-3">Lead Subject</th>
                      <th className="px-5 py-3">Client Company / Contact</th>
                      <th className="px-5 py-3 text-right">Discount</th>
                      <th className="px-5 py-3 text-right">Total Amount</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-zinc-500">
                          No quotations found. Click "+ Create Quotation" to add one.
                        </td>
                      </tr>
                    ) : (
                      quotations.map((q) => (
                        <tr key={q.id} className="border-t border-white/5 hover:bg-white/[0.015]">
                          <td className="px-5 py-3 text-zinc-500 font-mono">
                            {new Date(q.created_at).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-5 py-3 font-semibold text-white">{q.subject}</td>
                          <td className="px-5 py-3 text-zinc-300">{q.client_name}</td>
                          <td className="px-5 py-3 text-right text-zinc-400 font-mono">₹{q.discount.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3 text-right text-emerald-400 font-bold font-mono">₹{q.total_amount.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                              q.status === "Approved"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : q.status === "Declined"
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}>
                              {q.status.toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
      {/* Create Quotation Modal */}
      {showAddQuotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#0D0B14] border border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">Create Pre-sales Quotation</h3>
              <button onClick={() => setShowAddQuotModal(false)} className="text-zinc-500 hover:text-white cursor-pointer">✕</button>
            </div>

            {errorMsg && <p className="text-xs text-red-400 bg-red-500/10 p-2 rounded">{errorMsg}</p>}

            <form onSubmit={handleCreateQuotation} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">Quotation Subject *</label>
                  <input type="text" value={newQuot.subject} onChange={e => setNewQuot({ ...newQuot, subject: e.target.value })} placeholder="e.g. Structure Construction Quote" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">Link to CRM Lead *</label>
                  <select
                    value={newQuot.leadId}
                    onChange={e => setNewQuot({ ...newQuot, leadId: e.target.value })}
                    required
                    className="w-full bg-[#0E0C15] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="">Select CRM Lead</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.client_company_name || l.contact_name} ({l.lead_type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">Discount (INR)</label>
                  <input type="number" value={newQuot.discount} onChange={e => setNewQuot({ ...newQuot, discount: e.target.value })} className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-semibold">Terms & Conditions</label>
                  <input type="text" value={newQuot.terms} onChange={e => setNewQuot({ ...newQuot, terms: e.target.value })} placeholder="e.g. 50% advance, balance on slab layout" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none" />
                </div>
              </div>

              <div className="space-y-2 border-t border-white/5 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Line Items</span>
                  <button
                    type="button"
                    onClick={() => setNewQuot({ ...newQuot, items: [...newQuot.items, { name: "", qty: "1", unit: "Nos", price: "0" }] })}
                    className="text-[#7C5CFF] font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                {newQuot.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 items-end">
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500">Item Name</label>
                      <input type="text" value={item.name} onChange={e => {
                        const updated = [...newQuot.items];
                        updated[idx].name = e.target.value;
                        setNewQuot({ ...newQuot, items: updated });
                      }} placeholder="e.g. RCC M25 Concrete" className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500">Qty</label>
                      <input type="number" value={item.qty} onChange={e => {
                        const updated = [...newQuot.items];
                        updated[idx].qty = e.target.value;
                        setNewQuot({ ...newQuot, items: updated });
                      }} className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500">Unit</label>
                      <input type="text" value={item.unit} onChange={e => {
                        const updated = [...newQuot.items];
                        updated[idx].unit = e.target.value;
                        setNewQuot({ ...newQuot, items: updated });
                      }} className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none" required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-zinc-500">Price (₹)</label>
                      <input type="number" value={item.price} onChange={e => {
                        const updated = [...newQuot.items];
                        updated[idx].price = e.target.value;
                        setNewQuot({ ...newQuot, items: updated });
                      }} className="w-full bg-white/[0.02] border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none" required />
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                <button type="button" onClick={() => setShowAddQuotModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-primary to-[#FF3B6C] text-white font-bold rounded-xl hover:opacity-90">
                  Save Quotation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
