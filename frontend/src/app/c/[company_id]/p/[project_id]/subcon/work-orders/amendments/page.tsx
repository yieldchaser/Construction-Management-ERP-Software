"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

interface Amendment {
  id: string;
  amendment_number: number;
  amended_fields: Record<string, any>;
  amended_by: string | null;
  amended_at: string;
  reason: string | null;
}

interface WorkOrder {
  id: string;
  wo_number: string;
  subcontractor: string;
  subcontractor_name: string;
  status: string;
  estimated_work_amount: number;
}

export default function WOAmendmentsPage({ params }: { params: { wo_id: string } }) {
  const { company_id, project_id, wo_id } = useParams();
  const companyId = company_id || "demo-company";
  const projectId = project_id || "d0000000-0000-0000-0000-000000000001";
  const woId = typeof wo_id === "string" ? wo_id : params.wo_id;

  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [wo, setWO] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldsJson, setFieldsJson] = useState('{"rate": 1200.0, "quantity": 500.0}');
  const [amendedBy, setAmendedBy] = useState("Project Manager");
  const [error, setError] = useState<string | null>(null);

  const fetchAmendments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/work-orders/${woId}/amendments`);
      if (res.ok) setAmendments(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchWO = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/work-orders?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.find((w: any) => w.id === woId);
        if (found) setWO(found);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (woId) { fetchAmendments(); fetchWO(); } }, [woId]);

  const handleCreateAmendment = async () => {
    try {
      const parsed = JSON.parse(fieldsJson);
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/work-orders/${woId}/amendments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amended_by: amendedBy || null, amended_fields: parsed, reason: reason || null }),
      });
      if (res.ok) {
        fetchAmendments();
        setShowModal(false);
        setReason("");
      }
    } catch (e) {
      setError("Invalid JSON format");
    }
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden font-sans">
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto space-y-1">
          <Link href={`/c/${companyId}/p/${projectId}/billing`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">
            ← Billing & WOs
          </Link>
          <Link href={`/c/${companyId}/p/${projectId}/subcon/scorecards`} className="block px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">
            Scorecards
          </Link>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">WO Amendment Version Control</h1>
            <p className="text-[10px] text-zinc-500">{wo ? `${wo.wo_number} · ${wo.subcontractor_name}` : woId}</p>
          </div>
          <button onClick={() => setShowModal(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] text-xs font-bold text-white hover:opacity-90 cursor-pointer">+ New Amendment</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10">
          {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 mb-4">{error}</div>}

          <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Amendment History</h2>
            </div>
            <div className="divide-y divide-white/[0.02]">
              {amendments.map((am) => (
                <div key={am.id} className="px-5 py-4 hover:bg-white/[0.015] transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-secondary">Amendment #{am.amendment_number}</span>
                      <span className="text-[10px] text-zinc-500 ml-2">{am.amended_at?.split("T")[0]}</span>
                    </div>
                    <span className="text-[10px] text-zinc-500">{am.amended_by || "System"}</span>
                  </div>
                  {am.reason && <p className="text-xs text-zinc-400 mt-1 italic">Reason: {am.reason}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(am.amended_fields).map(([key, val]) => (
                      <span key={key} className="bg-white/5 border border-white/10 text-[10px] px-2 py-1 rounded-lg text-zinc-300">
                        {key}: <span className="font-mono font-bold text-white">{String(val)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {amendments.length === 0 && (
                <div className="px-5 py-8 text-center text-zinc-600 text-xs">No amendments recorded yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">New Amendment</h3>
              <p className="text-xs text-zinc-400 mt-1">Record changes to the work order.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Amended By</label>
                <input type="text" value={amendedBy} onChange={(e) => setAmendedBy(e.target.value)} className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Amended Fields (JSON)</label>
                <textarea value={fieldsJson} onChange={(e) => setFieldsJson(e.target.value)} rows={3} className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Reason</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateAmendment} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Save Amendment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
