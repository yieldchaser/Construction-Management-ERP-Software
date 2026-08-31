"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import {  getApiHost , readErrorDetail } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

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
  const { company_id, wo_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;
  const woId = typeof wo_id === "string" ? wo_id : params.wo_id;

  const [amendments, setAmendments] = useState<Amendment[]>([]);
  const [wo, setWO] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");
  const [fieldsJson, setFieldsJson] = useState('{"rate": 1200.0, "quantity": 500.0}');
  const [amendedBy, setAmendedBy] = useState("—");
  const [error, setError] = useState<string | null>(null);

  const fetchAmendments = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/work-orders/${woId}/amendments`, { headers: authHeaders() });
      if (res.ok) setAmendments(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchWO = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/work-orders?project_id=${projectId}`, { headers: authHeaders() });
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
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ amended_by: amendedBy || null, amended_fields: parsed, reason: reason || null }),
      });
      if (res.ok) {
        fetchAmendments();
        setShowModal(false);
        setReason("");
      } else {
        const err = await readErrorDetail(res);
        setError(err || 'Action failed');
      }
    } catch (e) {
      setError("Invalid JSON format");
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <PageHeader
          title="WO Amendment Version Control"
          subtitle={wo ? `${wo.wo_number} · ${wo.subcontractor_name}` : (woId as string)}
        >
          <button onClick={() => setShowModal(true)} className="px-3.5 py-1.5 rounded-md bg-primary text-xs font-bold text-white hover:opacity-90 cursor-pointer">+ New Amendment</button>
        </PageHeader>

        <div className="flex-1 overflow-y-auto z-10">
          <PageShell width="wide">
            {error && <div className="p-4 rounded-md bg-danger/10 border border-danger/20 text-xs text-danger mb-4">{error}</div>}

          <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border-custom">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Amendment History</h2>
            </div>
            <div className="divide-y divide-white/[0.02]">
              {amendments.map((am) => (
                <div key={am.id} className="px-5 py-4 hover:bg-elevated transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-secondary">Amendment #{am.amendment_number}</span>
                      <span className="text-[10px] text-muted ml-2">{am.amended_at?.split("T")[0]}</span>
                    </div>
                    <span className="text-[10px] text-muted">{am.amended_by || "—"}</span>
                  </div>
                  {am.reason && <p className="text-xs text-muted mt-1 italic">Reason: {am.reason}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(am.amended_fields).map(([key, val]) => (
                      <span key={key} className="bg-white/5 border border-border-custom text-[10px] px-2 py-1 rounded-lg text-muted">
                        {key}: <span className="font-sans font-bold text-foreground">{String(val)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {amendments.length === 0 && (
                <EmptyState
                  title="No amendments recorded yet"
                  description="Record changes to rates, quantities, or scope on this work order."
                  action={{ label: "New Amendment", onClick: () => setShowModal(true) }}
                />
              )}
            </div>
          </div>
          </PageShell>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-md border border-border-custom rounded-md p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">New Amendment</h3>
              <p className="text-xs text-muted mt-1">Record changes to the work order.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Amended By</label>
                <input type="text" value={amendedBy} onChange={(e) => setAmendedBy(e.target.value)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Amended Fields (JSON)</label>
                <textarea value={fieldsJson} onChange={(e) => setFieldsJson(e.target.value)} rows={3} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none font-sans" />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Reason</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-elevated cursor-pointer">Cancel</button>
              <button onClick={handleCreateAmendment} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-md text-xs font-bold cursor-pointer">Save Amendment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}