"use client";
import { getApiHost } from "@/lib/api";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Match {
  id: string;
  po_id: string;
  grn_id: string;
  invoice_id?: string;
  match_status: string;
  po_amount: number;
  grn_qty: number;
  invoiced_amount: number;
  variance_amount: number;
  variance_reason?: string;
  created_at: string;
}

export default function ThreeWayPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [matches, setMatches] = useState<Match[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    po_id: "",
    grn_id: "",
    invoice_id: "",
    invoiced_amount: 0,
    variance_reason: "",
  });

  const fetchMatches = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/three-way/${companyId}?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setMatches(data);
      }
    } catch (e) {
      console.error("Failed to load matches", e);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => fetchMatches(), 0);
    return () => clearTimeout(id);
  }, [companyId, projectId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const body: Record<string, unknown> = {
        po_id: form.po_id,
        grn_id: form.grn_id,
        company_id: companyId,
        project_id: projectId,
      };
      if (form.invoice_id) body.invoice_id = form.invoice_id;
      const res = await fetch(`${getApiHost()}/apis/v3/three-way`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage("Match created successfully");
        setShowModal(false);
        setForm({ po_id: "", grn_id: "", invoice_id: "", invoiced_amount: 0, variance_reason: "" });
        fetchMatches();
      } else {
        const err = await res.json();
        setMessage(err.detail || "Failed to create match");
      }
    } catch (_e) {
      void _e;
      setMessage("Error creating match");
    }
  };

  const statusColors: Record<string, string> = {
    matched: "bg-emerald-500/10 text-emerald-400",
    mismatch: "bg-red-500/10 text-red-400",
    pending: "bg-amber-500/10 text-amber-400",
    approved: "bg-blue-500/10 text-blue-400",
  };

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">3-Way Matching</h1>
            <p className="text-zinc-400 mt-1">Reconcile PO ↔ GRN ↔ Invoice automatically</p>
          </div>
          <button
            onClick={() => { setShowModal(true); setMessage(""); }}
            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all"
          >
            New Match
          </button>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes("success") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">PO Amount</th>
                <th className="px-6 py-4 font-medium">GRN Qty</th>
                <th className="px-6 py-4 font-medium">Invoiced</th>
                <th className="px-6 py-4 font-medium">Variance</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {matches.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No matches found</td></tr>
              ) : (
                matches.map((m) => (
                  <tr key={m.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">₹{Number(m.po_amount).toLocaleString()}</td>
                    <td className="px-6 py-4">{Number(m.grn_qty).toLocaleString()}</td>
                    <td className="px-6 py-4">₹{Number(m.invoiced_amount).toLocaleString()}</td>
                    <td className={`px-6 py-4 font-medium ${Number(m.variance_amount) < 0 ? "text-red-400" : Number(m.variance_amount) > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                      ₹{Number(m.variance_amount).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[m.match_status] || "bg-zinc-500/10 text-zinc-400"}`}>
                        {m.match_status}
                      </span>
                    </td>
                    <td className="px-6 py-4">{new Date(m.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1726] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold text-white mb-4">New 3-Way Match</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">PO ID</label>
                  <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.po_id} onChange={(e) => setForm({...form, po_id: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">GRN ID</label>
                  <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.grn_id} onChange={(e) => setForm({...form, grn_id: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Invoice ID (optional)</label>
                  <input type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.invoice_id} onChange={(e) => setForm({...form, invoice_id: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Invoiced Amount (₹)</label>
                  <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.invoiced_amount} onChange={(e) => setForm({...form, invoiced_amount: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Variance Reason (if any)</label>
                  <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.variance_reason} onChange={(e) => setForm({...form, variance_reason: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold">Create Match</button>
                  <button type="button" onClick={() => { setShowModal(false); setMessage(""); }} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
