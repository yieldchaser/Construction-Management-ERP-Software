"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

interface Tower {
  id: string;
  project_id: string;
  tower_name: string;
  tower_code: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  budget: number;
  created_at: string;
}

interface TowerPNL {
  tower_id: string;
  tower_name: string;
  tower_code: string;
  total_po_value: number;
  total_billed: number;
  total_wo_value: number;
  budget: number;
  variance: number;
}

export default function TowersPage() {
  const { company_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId || "d0000000-0000-0000-0000-000000000001";

  const [towers, setTowers] = useState<Tower[]>([]);
  const [pnl, setPnl] = useState<TowerPNL[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formStatus, setFormStatus] = useState("Ongoing");
  const [formBudget, setFormBudget] = useState(0);
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, pRes] = await Promise.all([
        fetch(`${getApiHost()}/apis/v3/towers/${projectId}`, { headers: authHeaders() }),
        fetch(`${getApiHost()}/apis/v3/towers/${projectId}/consolidated-pnl`, { headers: authHeaders() }),
      ]);
      if (tRes.ok) setTowers(await tRes.json());
      if (pRes.ok) setPnl(await pRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormName("");
    setFormCode("");
    setFormStatus("Ongoing");
    setFormBudget(0);
    setFormStart("");
    setFormEnd("");
  };

  const handleCreate = async () => {
    try {
      const body: any = { project_id: projectId, tower_name: formName, tower_code: formCode, status: formStatus, budget: formBudget };
      if (formStart) body.start_date = new Date(formStart).toISOString();
      if (formEnd) body.end_date = new Date(formEnd).toISOString();
      const res = await fetch(`${getApiHost()}/apis/v3/towers/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) { fetchData(); resetForm(); }
    } catch (e) { console.error(e); }
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    try {
      const body: any = {};
      if (formName) body.tower_name = formName;
      if (formCode) body.tower_code = formCode;
      if (formStatus) body.status = formStatus;
      if (formStart) body.start_date = new Date(formStart).toISOString();
      if (formEnd) body.end_date = new Date(formEnd).toISOString();
      body.budget = formBudget;
      const res = await fetch(`${getApiHost()}/apis/v3/towers/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) { fetchData(); resetForm(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tower? This will not affect underlying POs or bills.")) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/towers/${id}`, { method: "DELETE", headers: authHeaders() });
      if (res.ok) fetchData();
    } catch (e) { console.error(e); }
  };

  const startEdit = (t: Tower) => {
    setEditingId(t.id);
    setFormName(t.tower_name);
    setFormCode(t.tower_code);
    setFormStatus(t.status);
    setFormBudget(t.budget);
    setFormStart(t.start_date ? t.start_date.split("T")[0] : "");
    setFormEnd(t.end_date ? t.end_date.split("T")[0] : "");
    setShowForm(true);
  };

  const fmt = (v: number) => Number(v || 0).toLocaleString();

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />

        <div className="border-b border-border-custom bg-background px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-foreground uppercase tracking-wider">Tower & Phase Management</h1>
            <p className="text-[10px] text-muted">Multi-tower P&L tracking · Budget per tower/phase</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 rounded-md bg-primary text-xs font-bold text-white hover:opacity-90 cursor-pointer">+ New Tower</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10 space-y-6">
          {loading && <div className="flex items-center justify-center h-48 text-muted text-xs">Loading...</div>}

          {!loading && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {towers.map((t) => (
                  <div key={t.id} className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-extrabold text-foreground uppercase tracking-wider">{t.tower_name}</h3>
                        <p className="text-[10px] text-muted">Code: {t.tower_code} · {t.status}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(t)} className="px-2 py-1 rounded-lg border border-border-custom text-[10px] font-bold text-zinc-300 hover:text-foreground hover:bg-white/[0.05] cursor-pointer">Edit</button>
                        <button onClick={() => handleDelete(t.id)} className="px-2 py-1 rounded-lg border border-red-500/20 text-[10px] font-bold text-red-400 hover:bg-red-500/10 cursor-pointer">Delete</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-muted block">Budget</span><span className="text-foreground font-mono font-bold">₹{fmt(t.budget)}</span></div>
                      <div><span className="text-muted block">Start</span><span className="text-foreground font-mono">{t.start_date ? t.start_date.split("T")[0] : "-"}</span></div>
                      <div><span className="text-muted block">End</span><span className="text-foreground font-mono">{t.end_date ? t.end_date.split("T")[0] : "-"}</span></div>
                    </div>
                  </div>
                ))}
                {towers.length === 0 && (
                  <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg p-6 col-span-full text-center text-muted text-xs">No towers/phases created yet. Create one to track P&L per tower.</div>
                )}
              </div>

              <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-border-custom">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Consolidated P&L by Tower</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border-custom text-muted">
                        <th className="px-5 py-3 font-bold">Tower / Phase</th>
                        <th className="px-5 py-3 font-bold text-right">PO Value</th>
                        <th className="px-5 py-3 font-bold text-right">WO Value</th>
                        <th className="px-5 py-3 font-bold text-right">Billed</th>
                        <th className="px-5 py-3 font-bold text-right">Tower Budget</th>
                        <th className="px-5 py-3 font-bold text-right">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pnl.map((p) => (
                        <tr key={p.tower_id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 text-foreground font-semibold">{p.tower_name} <span className="text-muted">({p.tower_code})</span></td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">₹{fmt(p.total_po_value)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">₹{fmt(p.total_wo_value)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-primary">₹{fmt(p.total_billed)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">₹{fmt(p.budget)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-muted">₹{fmt(p.variance)}</td>
                        </tr>
                      ))}
                      {pnl.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-6 text-center text-muted">No P&L data yet. Add towers and link POs/WOs/bills.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-md shadow-2xl p-6 space-y-4 text-xs font-sans max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <h3 className="text-xs font-extrabold text-foreground">{editingId ? "Edit Tower / Phase" : "New Tower / Phase"}</h3>
              <button onClick={resetForm} className="text-muted hover:text-foreground">✕</button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted font-bold">Tower Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" placeholder="e.g. Tower A" />
              </div>
              <div className="space-y-1">
                <label className="text-muted font-bold">Tower Code</label>
                <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" placeholder="e.g. TA" />
              </div>
              <div className="space-y-1">
                <label className="text-muted font-bold">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground">
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Planned">Planned</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-muted font-bold">Tower Budget (INR)</label>
                <input type="number" value={formBudget} onChange={(e) => setFormBudget(parseFloat(e.target.value) || 0)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted font-bold">Start Date</label>
                  <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
                </div>
                <div className="space-y-1">
                  <label className="text-muted font-bold">End Date</label>
                  <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end border-t border-border-custom pt-4">
              <button onClick={resetForm} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md">Cancel</button>
              <button onClick={editingId ? handleUpdate : handleCreate} className="px-5 py-2.5 bg-primary text-white font-bold rounded-md">{editingId ? "Save Changes" : "Create Tower"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
