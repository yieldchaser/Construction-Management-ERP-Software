"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import Icon from "@/components/marketing/Icon";
import { isMissingOrDemoTenant, redirectToLogin } from "@/lib/company-guard";

interface WorkOrder {
  id: string;
  sNo: number;
  subContractor: string;
  progress: string;
  woValue: number;
  billedValue: number;
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected";
}

interface Subcontractor {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
}

export default function SubconPage() {
  const params = useParams();
  const router = useRouter();
  const { activeProjectId } = useProject();
  const companyId = params?.company_id as string;

  useEffect(() => {
    if (isMissingOrDemoTenant(companyId)) {
      redirectToLogin();
    }
  }, [companyId]);
  const projectId = activeProjectId;

  // Real backend-backed data
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Modals & Drawers
  const [showWOModal, setShowWOModal] = useState(false);
  const [showAddPartyDrawer, setShowAddPartyDrawer] = useState(false);

  // Form states
  const [woForm, setWoForm] = useState({
    partyId: "",
    date: new Date().toISOString().split("T")[0]
  });

  const [partyForm, setPartyForm] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    address: ""
  });

  const fetchSubconData = async () => {
    if (!projectId || isMissingOrDemoTenant(companyId)) return;
    setLoading(true);
    try {
      const [woRes, subRes] = await Promise.all([
        fetch(`${getApiHost()}/apis/v3/billing/work-orders?project_id=${projectId}`, { headers: authHeaders() }),
        fetch(`${getApiHost()}/apis/v3/billing/subcontractors?company_id=${companyId}`, { headers: authHeaders() }),
      ]);
      if (woRes.ok) {
        const data = await woRes.json();
        setWorkOrders(
          (data as any[]).map((wo: any, i: number) => ({
            id: wo.wo_number || wo.id,
            sNo: i + 1,
            subContractor: wo.subcontractor_name || "Unknown",
            progress: "0%",
            woValue: Number(wo.estimated_work_amount) || 0,
            billedValue: 0,
            status: wo.status || "Draft",
          }))
        );
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubcontractors(
          (data as any[]).map((t: any) => ({
            id: String(t.company_team_id),
            name: t.name,
            gstin: t.gstin ?? null,
            phone: t.phone ?? null,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load subcon data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubconData();
  }, [projectId, companyId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleCreateWorkorder = async () => {
    if (!woForm.partyId) {
      alert("Please select a subcontractor!");
      return;
    }
    if (!projectId) {
      alert("No active project selected.");
      return;
    }
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/work-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          subcontractor_id: woForm.partyId,
          wo_number: `WO-${Date.now().toString().slice(-6)}`,
          wo_date: new Date(woForm.date).toISOString(),
          terms: "",
          items: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create work order");
      }
      await fetchSubconData();
      setShowWOModal(false);
      showToast("Subcontractor Workorder created successfully!");
    } catch (err: any) {
      alert(err?.message || "Error creating work order");
    }
  };

  const handleSaveParty = async () => {
    if (!partyForm.name) {
      alert("Please specify the subcontractor name!");
      return;
    }
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/subcontractors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          name: partyForm.name,
          phone: partyForm.phone || null,
          email: partyForm.email || null,
          tax_no: partyForm.gstin || null,
          bank_name: partyForm.bank_name || null,
          account_number: partyForm.account_number || null,
          ifsc_code: partyForm.ifsc_code || null,
          address: partyForm.address || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create subcontractor");
      }
      await fetchSubconData();
      setShowAddPartyDrawer(false);
      showToast(`Subcontractor ${partyForm.name} created successfully!`);
      setPartyForm({
        name: "",
        phone: "",
        email: "",
        gstin: "",
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        address: ""
      });
    } catch (err: any) {
      alert(err?.message || "Error creating subcontractor");
    }
  };

  const filteredWO = workOrders.filter(wo =>
    wo.subContractor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* Top actions bar */}
        <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search Sub Contractor..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border-custom rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
            />
            <span className="absolute left-3 top-2.5 text-muted text-sm inline-flex"><Icon name="search" className="w-3.5 h-3.5" /></span>
          </div>

          <button
            onClick={() => setShowWOModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all"
          >
            + Sub Con Work Order
          </button>
        </div>

        {/* Main table view matching Screenshot 1/2 */}
        <div className="flex-1 overflow-y-auto p-6 bg-elevated/10">
          <div className="bg-card border border-border-custom rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-elevated border-b border-border-custom text-muted text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-3">S.No.</th>
                  <th className="px-4 py-3">Work Order</th>
                  <th className="px-4 py-3">Sub Contractor</th>
                  <th className="px-4 py-3">Physical Progress</th>
                  <th className="px-4 py-3">Work Order Value</th>
                  <th className="px-4 py-3">Billed Value</th>
                  <th className="px-4 py-3">Approval Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom/40">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">Loading subcontractor work orders...</td>
                  </tr>
                ) : filteredWO.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">No subcontractor workorders found.</td>
                  </tr>
                ) : (
                  filteredWO.map(wo => (
                    <tr key={wo.id} className="hover:bg-elevated/40 transition-colors">
                      <td className="px-4 py-3 text-muted">{wo.sNo}</td>
                      <td className="px-4 py-3 font-sans text-zinc-300">{wo.id}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{wo.subContractor}</td>
                      <td className="px-4 py-3 text-muted">
                        <div className="flex items-center gap-2">
                          <div className="w-20 bg-background h-1.5 rounded-full overflow-hidden border border-border-custom">
                            <div className="bg-primary h-full" style={{ width: wo.progress }}></div>
                          </div>
                          <span>{wo.progress}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-foreground">{fmt(wo.woValue)}</td>
                      <td className="px-4 py-3 text-zinc-300">{fmt(wo.billedValue)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          wo.status === "Approved" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          wo.status === "Pending Approval" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                          "bg-zinc-500/10 text-muted border border-zinc-500/20"
                        }`}>{wo.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Subcontractor Directory — company subcontractors (userless team + party) */}
          <div className="mt-6 bg-card border border-border-custom rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border-custom text-[10px] uppercase font-bold tracking-wider text-muted">Subcontractor Directory</div>
            {loading ? (
              <div className="px-4 py-8 text-center text-muted text-xs">Loading subcontractors...</div>
            ) : subcontractors.length === 0 ? (
              <div className="px-4 py-8 text-center text-muted text-xs">No subcontractors yet. Create one from the Work Order form.</div>
            ) : (
              <ul className="divide-y divide-border-custom/40">
                {subcontractors.map(p => (
                  <li key={p.id} className="px-4 py-3 flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{p.name}</span>
                    <span className="text-muted">{p.gstin ? `GSTIN ${p.gstin}` : (p.phone || "Subcontractor")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sub-Con Workorder Modal (Screenshot 3) */}
        {showWOModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWOModal(false)}>
            <div className="bg-card border border-border-custom rounded-xl w-full max-w-sm p-5 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Sub-Con Workorder</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] text-muted font-sans">WO number: pending</span>
                  </div>
                </div>
                <button onClick={() => setShowWOModal(false)} className="text-muted hover:text-foreground text-base">✕</button>
              </div>

              <div className="space-y-4 my-4 text-xs">
                <div>
                  <label className="text-[9px] text-muted uppercase font-bold block mb-1">Date</label>
                  <input type="date" value={woForm.date} onChange={e => setWoForm({ ...woForm, date: e.target.value })} className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-foreground text-xs focus:outline-none focus:border-primary" />
                </div>

                <div>
                  <label className="text-[9px] text-muted uppercase font-bold block mb-1">Subcontractor</label>
                  <select
                    value={woForm.partyId}
                    onChange={e => setWoForm({ ...woForm, partyId: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Select subcontractor…</option>
                    {subcontractors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setShowAddPartyDrawer(true)}
                    className="w-full mt-2.5 py-3 border border-dashed border-primary/50 text-primary hover:bg-primary/5 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
                  >
                    <span>+ Create Subcontractor</span>
                  </button>
                </div>

              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleCreateWorkorder}
                  className="w-full py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-all shadow-md"
                >
                  Create Workorder
                </button>
                <button onClick={() => setShowWOModal(false)} className="text-[11px] text-muted hover:text-foreground font-medium self-center mt-1">close</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Party Drawer (Screenshot 4) */}
        {showAddPartyDrawer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowAddPartyDrawer(false)}>
            <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Create Subcontractor</h2>
                  <button onClick={() => setShowAddPartyDrawer(false)} className="text-muted hover:text-foreground text-lg">✕</button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Subcontractor Name*</label>
                    <input
                      type="text"
                      placeholder="e.g. Yash Earthworks"
                      value={partyForm.name}
                      onChange={e => setPartyForm({ ...partyForm, name: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={partyForm.phone}
                      onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Email ID</label>
                    <input
                      type="email"
                      placeholder="email@domain.com"
                      value={partyForm.email}
                      onChange={e => setPartyForm({ ...partyForm, email: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={partyForm.gstin}
                      onChange={e => setPartyForm({ ...partyForm, gstin: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. SBI"
                        value={partyForm.bank_name}
                        onChange={e => setPartyForm({ ...partyForm, bank_name: e.target.value })}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={partyForm.ifsc_code}
                        onChange={e => setPartyForm({ ...partyForm, ifsc_code: e.target.value })}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="Bank account number"
                      value={partyForm.account_number}
                      onChange={e => setPartyForm({ ...partyForm, account_number: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Address</label>
                    <textarea
                      placeholder="Corporate address"
                      value={partyForm.address}
                      onChange={e => setPartyForm({ ...partyForm, address: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      rows={2}
                    />
                  </div>

                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
                <button
                  onClick={handleSaveParty}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
                >
                  Create Subcontractor
                </button>
                <button onClick={() => setShowAddPartyDrawer(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-foreground hover:border-white/20 text-xs">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span className="inline-flex"><Icon name="bolt" className="w-3.5 h-3.5" /></span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}