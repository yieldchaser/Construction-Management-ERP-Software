"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

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
  const { company_id, project_id } = useParams();
  const companyId = company_id || "demo-company";
  const projectId = project_id || "d0000000-0000-0000-0000-000000000001";

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
        fetch(`${getApiHost()}/apis/v3/towers/${projectId}`),
        fetch(`${getApiHost()}/apis/v3/towers/${projectId}/consolidated-pnl`),
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) { fetchData(); resetForm(); }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this tower? This will not affect underlying POs or bills.")) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/towers/${id}`, { method: "DELETE" });
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
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden font-sans">
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto space-y-1">
          <Link href={`/c/${companyId}/p/${projectId}`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">
            ← Dashboard
          </Link>
          {[
            { href: `/c/${companyId}/p/${projectId}/billing`, label: "Billing & WOs" },
            { href: `/c/${companyId}/p/${projectId}/budget`, label: "Budget & Costs" },
            { href: `/c/${companyId}/p/${projectId}/towers`, label: "Towers & Phases" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block px-3 py-2 text-xs font-semibold rounded-lg text-left bg-white/[0.06] text-white shadow-sm">
              {item.label}
            </Link>
          ))}
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Finance</div>
          {[
            { href: `/c/${companyId}/p/${projectId}/finance`, label: "Payments & Ledger" },
            { href: `/c/${companyId}/p/${projectId}/reports`, label: "Reports" },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="block px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">{item.label}</Link>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-[0.02] blur-[120px] pointer-events-none" />

        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Tower & Phase Management</h1>
            <p className="text-[10px] text-zinc-500">Multi-tower P&L tracking · Budget per tower/phase</p>
          </div>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] text-xs font-bold text-white hover:opacity-90 cursor-pointer">+ New Tower</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10 space-y-6">
          {loading && <div className="flex items-center justify-center h-48 text-zinc-400 text-xs">Loading...</div>}

          {!loading && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {towers.map((t) => (
                  <div key={t.id} className="glass-panel border border-white/5 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">{t.tower_name}</h3>
                        <p className="text-[10px] text-zinc-500">Code: {t.tower_code} · {t.status}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(t)} className="px-2 py-1 rounded-lg border border-white/10 text-[10px] font-bold text-zinc-300 hover:text-white hover:bg-white/[0.05] cursor-pointer">Edit</button>
                        <button onClick={() => handleDelete(t.id)} className="px-2 py-1 rounded-lg border border-red-500/20 text-[10px] font-bold text-red-400 hover:bg-red-500/10 cursor-pointer">Delete</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div><span className="text-zinc-500 block">Budget</span><span className="text-white font-mono font-bold">₹{fmt(t.budget)}</span></div>
                      <div><span className="text-zinc-500 block">Start</span><span className="text-white font-mono">{t.start_date ? t.start_date.split("T")[0] : "-"}</span></div>
                      <div><span className="text-zinc-500 block">End</span><span className="text-white font-mono">{t.end_date ? t.end_date.split("T")[0] : "-"}</span></div>
                    </div>
                  </div>
                ))}
                {towers.length === 0 && (
                  <div className="glass-panel border border-white/5 rounded-2xl p-6 col-span-full text-center text-zinc-600 text-xs">No towers/phases created yet. Create one to track P&L per tower.</div>
                )}
              </div>

              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Consolidated P&L by Tower</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
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
                          <td className="px-5 py-3.5 text-white font-semibold">{p.tower_name} <span className="text-zinc-500">({p.tower_code})</span></td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">₹{fmt(p.total_po_value)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">₹{fmt(p.total_wo_value)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-primary">₹{fmt(p.total_billed)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">₹{fmt(p.budget)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-400">₹{fmt(p.variance)}</td>
                        </tr>
                      ))}
                      {pnl.length === 0 && (
                        <tr><td colSpan={6} className="px-5 py-6 text-center text-zinc-600">No P&L data yet. Add towers and link POs/WOs/bills.</td></tr>
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
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs font-sans max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">{editingId ? "Edit Tower / Phase" : "New Tower / Phase"}</h3>
              <button onClick={resetForm} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Tower Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="e.g. Tower A" />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Tower Code</label>
                <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="e.g. TA" />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white">
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Planned">Planned</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Tower Budget (INR)</label>
                <input type="number" value={formBudget} onChange={(e) => setFormBudget(parseFloat(e.target.value) || 0)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white font-mono" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Start Date</label>
                  <input type="date" value={formStart} onChange={(e) => setFormStart(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">End Date</label>
                  <input type="date" value={formEnd} onChange={(e) => setFormEnd(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
                </div>
              </div>
            </div>
            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={resetForm} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
              <button onClick={editingId ? handleUpdate : handleCreate} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl">{editingId ? "Save Changes" : "Create Tower"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
