"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/context/ProjectContext";

interface WorkOrder {
  id: string;
  sNo: number;
  subContractor: string;
  progress: string;
  woValue: number;
  billedValue: number;
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected";
}

interface Party {
  id: string;
  name: string;
  phone: string;
  email: string;
  type: string;
  partyId: string;
  joinedDate: string;
}

export default function SubconPage() {
  const params = useParams();
  const router = useRouter();
  const { activeProjectId } = useProject();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";
  const projectId = activeProjectId;

  // Mock datasets matching Onsite Teams screenshots
  const [parties, setParties] = useState<Party[]>([
    { id: "P-01", name: "Yash Desai", phone: "9876543210", email: "yash@siteflow.in", type: "Contractor", partyId: "PID-1", joinedDate: "2026-07-04" },
    { id: "P-02", name: "Ramesh Sharma", phone: "8765432109", email: "ramesh@siteflow.in", type: "Sub Contractor", partyId: "PID-2", joinedDate: "2026-06-15" }
  ]);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([
    { id: "WO-01", sNo: 1, subContractor: "Ramesh Sharma", progress: "45%", woValue: 250000, billedValue: 112500, status: "Approved" },
    { id: "WO-02", sNo: 2, subContractor: "Yash Desai", progress: "10%", woValue: 800000, billedValue: 80000, status: "Pending Approval" }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Modals & Drawers
  const [showWOModal, setShowWOModal] = useState(false);
  const [showAddPartyDrawer, setShowAddPartyDrawer] = useState(false);

  // Form states
  const [woForm, setWoForm] = useState({
    partyName: "",
    title: "Subcon Workorder #WO--1",
    date: new Date().toISOString().split("T")[0]
  });

  const [partyForm, setPartyForm] = useState({
    name: "",
    phone: "",
    email: "",
    type: "Contractor",
    partyId: "PID-" + (parties.length + 1),
    joinedDate: new Date().toISOString().split("T")[0]
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleCreateWorkorder = () => {
    if (!woForm.partyName) {
      alert("Please select or add a subcontractor party!");
      return;
    }
    const newWO: WorkOrder = {
      id: "WO-" + Date.now(),
      sNo: workOrders.length + 1,
      subContractor: woForm.partyName,
      progress: "0%",
      woValue: 150000,
      billedValue: 0,
      status: "Draft"
    };
    setWorkOrders([...workOrders, newWO]);
    setShowWOModal(false);
    showToast("Subcontractor Workorder created successfully!");
  };

  const handleSaveParty = () => {
    if (!partyForm.name) {
      alert("Please specify the party name!");
      return;
    }
    const newParty: Party = {
      id: "P-" + Date.now(),
      name: partyForm.name,
      phone: partyForm.phone,
      email: partyForm.email,
      type: partyForm.type,
      partyId: partyForm.partyId,
      joinedDate: partyForm.joinedDate
    };
    setParties([...parties, newParty]);
    setWoForm({ ...woForm, partyName: partyForm.name }); // Autofill selected party
    setShowAddPartyDrawer(false);
    showToast(`Party ${partyForm.name} saved successfully!`);
    
    // Reset form
    setPartyForm({
      name: "",
      phone: "",
      email: "",
      type: "Contractor",
      partyId: "PID-" + (parties.length + 2),
      joinedDate: new Date().toISOString().split("T")[0]
    });
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
            <span className="absolute left-3 top-2.5 text-muted text-sm">🔍</span>
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
                {filteredWO.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted">No subcontractor workorders found.</td>
                  </tr>
                ) : (
                  filteredWO.map(wo => (
                    <tr key={wo.id} className="hover:bg-elevated/40 transition-colors">
                      <td className="px-4 py-3 text-muted">{wo.sNo}</td>
                      <td className="px-4 py-3 font-mono text-zinc-300">{wo.id}</td>
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
        </div>

        {/* Sub-Con Workorder Modal (Screenshot 3) */}
        {showWOModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWOModal(false)}>
            <div className="bg-card border border-border-custom rounded-xl w-full max-w-sm p-5 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Sub-Con Workorder</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] text-muted font-mono">#WO--1</span>
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
                  <label className="text-[9px] text-muted uppercase font-bold block mb-1">Party Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search or select party..."
                      value={woForm.partyName}
                      onChange={e => setWoForm({ ...woForm, partyName: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg pl-3 pr-8 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                    />
                    {woForm.partyName && (
                      <button type="button" onClick={() => setWoForm({ ...woForm, partyName: "" })} className="absolute right-2.5 top-2.5 text-muted hover:text-foreground">✕</button>
                    )}
                  </div>

                  {!woForm.partyName && (
                    <button
                      type="button"
                      onClick={() => setShowAddPartyDrawer(true)}
                      className="w-full mt-2.5 py-3 border border-dashed border-primary/50 text-primary hover:bg-primary/5 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all"
                    >
                      <span>+ Create Party</span>
                    </button>
                  )}
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
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Add Party</h2>
                  <button onClick={() => setShowAddPartyDrawer(false)} className="text-muted hover:text-foreground text-lg">✕</button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party Name*</label>
                    <input
                      type="text"
                      placeholder="e.g. Yash"
                      value={partyForm.name}
                      onChange={e => setPartyForm({ ...partyForm, name: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Phone Number</label>
                    <div className="flex gap-2">
                      <select className="bg-background border border-border-custom rounded-lg px-2 text-foreground focus:outline-none">
                        <option>+91 (IN)</option>
                        <option>+1 (US)</option>
                        <option>+44 (UK)</option>
                      </select>
                      <input
                        type="tel"
                        placeholder="Phone number"
                        value={partyForm.phone}
                        onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
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
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Select Party Type</label>
                    <div className="border border-border-custom bg-background/50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                      {[
                        "Client",
                        "Staff",
                        "Investor",
                        "Worker",
                        "Vendor",
                        "Labour Contractor",
                        "Material Supplier",
                        "Equipment Supplier",
                        "Other Vendor",
                        "Contractor"
                      ].map((type) => (
                        <label key={type} className="flex items-center justify-between py-1 cursor-pointer hover:bg-elevated/20 px-2 rounded transition-colors select-none text-[11px]">
                          <span className={partyForm.type === type ? "text-primary font-semibold" : "text-foreground"}>{type}</span>
                          <input
                            type="radio"
                            name="partyTypeRadio"
                            checked={partyForm.type === type}
                            onChange={() => setPartyForm({ ...partyForm, type })}
                            className="accent-primary h-3.5 w-3.5"
                          />
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Tag Service Rate Category</span>
                  </div>

                  <div className="border border-border-custom rounded-lg divide-y divide-border-custom bg-background/50">
                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-elevated/20">
                      <div>
                        <span className="font-semibold text-foreground block">Opening Balance</span>
                        <span className="text-[10px] text-muted">₹0.00 (Outstanding)</span>
                      </div>
                      <span className="text-muted">▶</span>
                    </div>
                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-elevated/20">
                      <div>
                        <span className="font-semibold text-foreground block">Bank Account</span>
                        <span className="text-[10px] text-muted">Add banking info</span>
                      </div>
                      <span className="text-muted">▶</span>
                    </div>
                    <div className="p-3 flex justify-between items-center cursor-pointer hover:bg-elevated/20">
                      <div>
                        <span className="font-semibold text-foreground block">Address details</span>
                        <span className="text-[10px] text-muted">Add corporate address</span>
                      </div>
                      <span className="text-muted">▶</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party ID</label>
                      <input
                        type="text"
                        value={partyForm.partyId}
                        onChange={e => setPartyForm({ ...partyForm, partyId: e.target.value })}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Date of Joining</label>
                      <input
                        type="date"
                        value={partyForm.joinedDate}
                        onChange={e => setPartyForm({ ...partyForm, joinedDate: e.target.value })}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
                <button
                  onClick={handleSaveParty}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
                >
                  Save
                </button>
                <button onClick={() => setShowAddPartyDrawer(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-foreground hover:border-white/20 text-xs">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
