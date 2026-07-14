"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

interface VendorPerf {
  id: string;
  vendor_id: string;
  vendor_name: string;
  total_pos: number;
  total_grns: number;
  on_time_deliveries: number;
  quality_issues: number;
  avg_delay_days: number;
  last_updated: string;
}

export default function VendorPerformancePage() {
  const { company_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [vendors, setVendors] = useState<VendorPerf[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/procurement/vendors/performance/${projectId}`, { headers: authHeaders() });
      if (res.ok) setVendors(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const onTimePct = (v: VendorPerf) => v.total_grns > 0 ? ((v.on_time_deliveries / v.total_grns) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-[0.02] blur-[120px] pointer-events-none" />

        <div className="border-b border-border-custom bg-background px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-foreground uppercase tracking-wider">Vendor Performance</h1>
            <p className="text-[10px] text-muted">On-time delivery · GRN history · Quality issues</p>
          </div>
          <button onClick={fetchData} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-elevated cursor-pointer">Refresh</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 z-10">
          {loading && <div className="flex items-center justify-center h-48 text-muted text-xs">Loading...</div>}

          {!loading && vendors.length === 0 && (
            <div className="flex items-center justify-center h-48 text-muted text-xs">No vendor performance data yet. Data is auto-calculated from PO and GRN history.</div>
          )}

          {!loading && vendors.length > 0 && (
            <div className="bg-card border border-border-custom rounded-lg border border-border-custom rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted">
                      <th className="px-5 py-3 font-bold">Vendor</th>
                      <th className="px-5 py-3 font-bold text-right">POs</th>
                      <th className="px-5 py-3 font-bold text-right">GRNs</th>
                      <th className="px-5 py-3 font-bold text-right">On-Time %</th>
                      <th className="px-5 py-3 font-bold text-right">Avg Delay (days)</th>
                      <th className="px-5 py-3 font-bold text-right">Quality Issues</th>
                      <th className="px-5 py-3 font-bold text-center">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendors.map((v) => {
                      const otp = parseFloat(onTimePct(v));
                      const rating = otp >= 90 ? "text-green-400" : otp >= 70 ? "text-amber-400" : "text-red-400";
                      return (
                        <tr key={v.id} className="border-b border-border-custom hover:bg-elevated transition-all">
                          <td className="px-5 py-3.5 text-foreground font-semibold">{v.vendor_name}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">{v.total_pos}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-zinc-300">{v.total_grns}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-primary">{otp}%</td>
                          <td className="px-5 py-3.5 text-right font-mono text-muted">{v.avg_delay_days.toFixed(1)}</td>
                          <td className="px-5 py-3.5 text-right font-mono text-red-400">{v.quality_issues}</td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${rating} border-current/20`}>
                              {otp >= 90 ? "A" : otp >= 70 ? "B" : "C"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
