"use client";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import React, { useState, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";

interface Wastage {
  id: string;
  material_name: string;
  wastage_type: string;
  quantity: number;
  unit: string;
  estimated_value: number;
  reason?: string;
  reported_by?: string;
  photo_urls?: string[];
  status: string;
  created_at: string;
}

export default function WastagePage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [records, setRecords] = useState<Wastage[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    material_name: "",
    wastage_type: "scrap",
    quantity: 0,
    unit: "kg",
    estimated_value: 0,
    reason: "",
    photo_urls: [] as string[],
    task_id: "",
  });

  const fetchRecords = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/wastage/${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      }
    } catch (e) {
      console.error("Failed to load wastage", e);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => fetchRecords(), 0);
    return () => clearTimeout(id);
  }, [projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/wastage`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ ...form, company_id: companyId, project_id: projectId, estimated_value_override: form.estimated_value > 0 }),
      });
      if (res.ok) {
        setMessage("Wastage recorded successfully");
        setShowModal(false);
        setForm({ material_name: "", wastage_type: "scrap", quantity: 0, unit: "kg", estimated_value: 0, reason: "", photo_urls: [], task_id: "" });
        fetchRecords();
      } else {
        const err = await res.json();
        setMessage(err.detail || "Failed to record wastage");
      }
    } catch (_e) {
      void _e;
      setMessage("Error recording wastage");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/wastage/${id}/status?status=${status}`, { method: "PATCH", headers: authHeaders() });
      if (res.ok) {
        fetchRecords();
      }
    } catch (e) {
      console.error("Failed to update status", e);
    }
  };

  const statusColors: Record<string, string> = {
    reported: "bg-amber-500/10 text-amber-400",
    reviewed: "bg-blue-500/10 text-blue-400",
    approved: "bg-emerald-500/10 text-emerald-400",
    disposed: "bg-zinc-500/10 text-muted",
  };

  const typeLabels: Record<string, string> = {
    scrap: "Scrap",
    offcut: "Offcut",
    damaged: "Damaged",
    expired: "Expired",
    theft: "Theft",
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Material Wastage</h1>
            <p className="text-muted mt-1">Track scrap, offcuts, damage and theft on site</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setMessage(""); }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold transition-all"
          >
            Record Wastage
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md ${message.includes("success") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {records.length === 0 ? (
            <div className="col-span-full text-center text-muted py-12">No wastage records found</div>
          ) : (
            records.map((r) => (
              <div key={r.id} className="bg-white/5 border border-border-custom rounded-lg p-6 hover:bg-white/10 transition-all">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-foreground font-semibold">{r.material_name}</h3>
                    <p className="text-muted text-xs mt-1">{typeLabels[r.wastage_type] || r.wastage_type} • {r.unit}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted">Quantity</span>
                    <span className="text-foreground font-medium">{Number(r.quantity).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Est. Value</span>
                    <span className="text-foreground font-medium">₹{Number(r.estimated_value).toLocaleString()}</span>
                  </div>
                  {r.reason && (
                    <div>
                      <span className="text-muted text-xs">Reason</span>
                      <p className="text-zinc-300 text-xs mt-1">{r.reason}</p>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t border-border-custom flex gap-2">
                  {r.photo_urls && r.photo_urls.length > 0 && (
                    <div className="flex gap-2 mb-3">
                      {r.photo_urls.map((url, i) => (
                        <img key={i} src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border-custom" />
                      ))}
                    </div>
                  )}
                  {r.status === "reported" && (
                    <button onClick={() => updateStatus(r.id, "reviewed")} className="flex-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-all">Review</button>
                  )}
                  {r.status === "reviewed" && (
                    <button onClick={() => updateStatus(r.id, "approved")} className="flex-1 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/20 transition-all">Approve</button>
                  )}
                  {r.status === "approved" && (
                    <button onClick={() => updateStatus(r.id, "disposed")} className="flex-1 px-3 py-1.5 bg-zinc-500/10 text-muted rounded-lg text-xs font-medium hover:bg-zinc-500/20 transition-all">Dispose</button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-elevated border border-border-custom rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold text-foreground mb-4">Record Material Wastage</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Material Name</label>
                  <input type="text" required className="w-full bg-white/5 border border-border-custom rounded-md px-4 py-2 text-foreground" value={form.material_name} onChange={(e) => setForm({...form, material_name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Type</label>
                    <select className="w-full bg-white/5 border border-border-custom rounded-md px-4 py-2 text-foreground" value={form.wastage_type} onChange={(e) => setForm({...form, wastage_type: e.target.value})}>
                      <option value="scrap">Scrap</option>
                      <option value="offcut">Offcut</option>
                      <option value="damaged">Damaged</option>
                      <option value="expired">Expired</option>
                      <option value="theft">Theft</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Quantity</label>
                    <input type="number" required className="w-full bg-white/5 border border-border-custom rounded-md px-4 py-2 text-foreground" value={form.quantity} onChange={(e) => setForm({...form, quantity: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Unit</label>
                    <input type="text" required className="w-full bg-white/5 border border-border-custom rounded-md px-4 py-2 text-foreground" value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Est. Value (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-border-custom rounded-md px-4 py-2 text-foreground" value={form.estimated_value} onChange={(e) => setForm({...form, estimated_value: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Reason</label>
                  <textarea className="w-full bg-white/5 border border-border-custom rounded-md px-4 py-2 text-foreground" value={form.reason} onChange={(e) => setForm({...form, reason: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md text-sm font-semibold">Record Wastage</button>
                  <button type="button" onClick={() => { setShowModal(false); setMessage(""); }} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-foreground rounded-md text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
