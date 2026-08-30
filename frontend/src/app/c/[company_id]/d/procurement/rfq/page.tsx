"use client";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

interface RFQ {
  id: string;
  project_id: string;
  rfq_number: string;
  status: string;
  valid_until: string | null;
  notes: string | null;
  items: RFQItem[];
  created_at: string;
}

interface RFQItem {
  id: string;
  rfq_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  specifications: string | null;
}

interface ComparisonRow {
  item_id: string;
  material_name: string;
  quantity: number;
  unit: string;
  vendors: RFQQuote[];
}

interface RFQQuote {
  id: string;
  rfq_id: string;
  vendor_name: string;
  item_id: string;
  quoted_rate: number;
  delivery_days: number | null;
  terms: string | null;
  validity_days: number;
  submitted_at: string;
}

export default function RFQPage() {
  const { company_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [rfqs, setRFQs] = useState<RFQ[]>([]);
  const [comparison, setComparison] = useState<ComparisonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewRfqId, setViewRfqId] = useState<string | null>(null);

  const [newRfqNum, setNewRfqNum] = useState("");

  const fetchRFQs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/procurement/rfq/${projectId}`, { headers: authHeaders() });
      if (res.ok) setRFQs(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchComparison = async (rfqId: string) => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/procurement/rfq/${rfqId}/comparison`, { headers: authHeaders() });
      if (res.ok) setComparison(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { if (projectId) fetchRFQs(); }, [projectId]);

  const handleCreateRFQ = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/procurement/rfq`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          rfq_number: newRfqNum,
          items: [],
          valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
      if (res.ok) { fetchRFQs(); setShowCreate(false); }
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="border-b border-border-custom bg-background px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">RFQ Management</h1>
            <p className="text-[10px] text-muted">Request for Quotations · Multi-vendor comparison</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 rounded-md bg-primary text-xs font-bold text-white hover:opacity-90 cursor-pointer">+ Create RFQ</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10 space-y-6">
          <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-border-custom">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">RFQ List</h2>
            </div>
            <div className="divide-y divide-white/[0.02]">
              {rfqs.map((rfq) => (
                <div key={rfq.id} className="px-5 py-3 flex items-center justify-between hover:bg-white/[0.015] transition-all">
                  <div>
                    <span className="text-xs font-bold text-secondary font-sans">{rfq.rfq_number}</span>
                    <span className="text-[10px] text-muted ml-2">{rfq.items?.length || 0} items</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      rfq.status === "draft" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-green-500/10 text-green-400 border border-green-500/20"
                    }`}>{rfq.status}</span>
                    <button onClick={() => { setViewRfqId(rfq.id); fetchComparison(rfq.id); }} className="px-3 py-1 rounded-lg border border-border-custom text-[10px] font-bold hover:bg-white/[0.05] cursor-pointer">Compare Quotes</button>
                  </div>
                </div>
              ))}
              {rfqs.length === 0 && <div className="px-5 py-8 text-center text-muted text-xs">No RFQs created yet.</div>}
            </div>
          </div>

          {viewRfqId && comparison.length > 0 && (
            <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-border-custom">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Side-by-Side Vendor Comparison</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted">
                      <th className="px-5 py-3 font-bold">Material</th>
                      <th className="px-5 py-3 font-bold">Qty</th>
                      {Array.from(new Set(comparison.flatMap(r => r.vendors.map(v => v.vendor_name)))).map(v => (
                        <th key={v} className="px-4 py-3 font-bold text-right min-w-[140px]">{v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.map((row) => (
                      <tr key={row.item_id} className="border-b border-white/[0.02]">
                        <td className="px-5 py-3 text-white font-semibold">{row.material_name}</td>
                        <td className="px-5 py-3 text-muted">{row.quantity} {row.unit}</td>
                        {Array.from(new Set(comparison.flatMap(r => r.vendors.map(v => v.vendor_name)))).map(vendorName => {
                          const quote = row.vendors.find(q => q.vendor_name === vendorName);
                          if (!quote) return <td key={vendorName} className="px-4 py-3 text-right text-muted">—</td>;
                          return (
                            <td key={vendorName} className="px-4 py-3 text-right">
                              <span className="font-sans font-bold text-white block">₹{quote.quoted_rate.toLocaleString()}</span>
                              {quote.delivery_days && <span className="text-[9px] text-muted">{quote.delivery_days} days</span>}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-md border border-border-custom rounded-md p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Create RFQ</h3>
              <p className="text-xs text-muted mt-1">Issue a request for quotation.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">RFQ Number</label>
                <input type="text" value={newRfqNum} onChange={(e) => setNewRfqNum(e.target.value)} className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none font-sans" />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateRFQ} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-md text-xs font-bold cursor-pointer">Create RFQ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}