"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const VENDORS = [
  { id: "V001", name: "Shree Cement Traders", category: "Cement & Aggregate", rating: 4.8, city: "Delhi", lastPO: "₹4.2L", status: "Active" },
  { id: "V002", name: "National Steel Suppliers", category: "TMT & Steel", rating: 4.5, city: "Mumbai", lastPO: "₹12.8L", status: "Active" },
  { id: "V003", name: "RajBuild Hardware", category: "Hardware & Fittings", rating: 4.2, city: "Pune", lastPO: "₹1.1L", status: "Active" },
  { id: "V004", name: "Indus Paint House", category: "Paints & Chemicals", rating: 3.9, city: "Chennai", lastPO: "₹2.3L", status: "On Hold" },
  { id: "V005", name: "Pioneer Pipes & Valves", category: "MEP Materials", rating: 4.6, city: "Delhi", lastPO: "₹6.7L", status: "Active" },
];

const PURCHASE_ORDERS = [
  { id: "PO-2026-0412", vendor: "National Steel Suppliers", item: "TMT Bars Fe500D (12mm) — 8MT", amount: "₹5,84,000", status: "GRN Pending", date: "Jun 22, 2026", project: "Metro Terminal Ph2" },
  { id: "PO-2026-0411", vendor: "Shree Cement Traders", item: "OPC 53 Grade Cement — 200 Bags", amount: "₹1,04,000", status: "Delivered", date: "Jun 20, 2026", project: "Alpha Premium" },
  { id: "PO-2026-0410", vendor: "Pioneer Pipes & Valves", item: "CPVC Pipes & Fittings — Assorted", amount: "₹2,36,000", status: "In Transit", date: "Jun 18, 2026", project: "Bypass Flyover" },
  { id: "PO-2026-0409", vendor: "RajBuild Hardware", item: "Anchor Bolts + Expansion Fasteners", amount: "₹48,000", status: "Approved", date: "Jun 17, 2026", project: "Metro Terminal Ph2" },
  { id: "PO-2026-0408", vendor: "Indus Paint House", item: "Exterior Weather Coat — White 20L x 40", amount: "₹88,000", status: "Draft", date: "Jun 15, 2026", project: "Alpha Premium" },
];

const RFQ_RESPONSES = [
  { vendor: "National Steel Suppliers", unitRate: "₹73,000/MT", totalAmount: "₹5,84,000", delivery: "3 days", validity: "Jun 30", score: 92, recommended: true },
  { vendor: "JSW Steel Distributors", unitRate: "₹74,500/MT", totalAmount: "₹5,96,000", delivery: "5 days", validity: "Jun 28", score: 85, recommended: false },
  { vendor: "TATA Steel Traders", unitRate: "₹76,000/MT", totalAmount: "₹6,08,000", delivery: "2 days", validity: "Jul 5", score: 88, recommended: false },
];

const STATUS_COLORS: Record<string, string> = {
  "Delivered": "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "GRN Pending": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "In Transit": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  "Approved": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "Draft": "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

export default function ProcurementPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;
  const [tab, setTab] = useState<"po" | "rfq" | "vendors">("po");
  const [showRFQ, setShowRFQ] = useState(false);

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">
            ← Dashboard
          </Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Procurement</div>
          {[
            { key: "po", label: "Purchase Orders", icon: "📋" },
            { key: "rfq", label: "RFQ Comparison", icon: "⚖️" },
            { key: "vendors", label: "Vendor Directory", icon: "🏭" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as typeof tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${
                tab === item.key
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Procurement & Warehouse</h1>
            <p className="text-[10px] text-zinc-500">Purchase Orders · RFQ Matrix · Vendor Management</p>
          </div>
          <button
            onClick={() => { setTab("rfq"); setShowRFQ(true); }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all"
          >
            + Create RFQ
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* Purchase Orders Tab */}
          {tab === "po" && (
            <div className="space-y-5">
              {/* Stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total POs (MTD)", value: "23", sub: "+4 this week", color: "text-white" },
                  { label: "Pending GRN", value: "6", sub: "₹18.4L value", color: "text-amber-400" },
                  { label: "In Transit", value: "3", sub: "Expected today: 1", color: "text-blue-400" },
                  { label: "Spend MTD", value: "₹48.2L", sub: "Budget: ₹55L", color: "text-primary" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-zinc-600 mt-0.5">{s.sub}</div>
                  </div>
                ))}
              </div>

              {/* PO Table */}
              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Purchase Orders</h2>
                  <button className="text-xs text-primary hover:underline">Export CSV</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="text-left px-5 py-3 font-semibold">PO Number</th>
                        <th className="text-left px-5 py-3 font-semibold">Vendor</th>
                        <th className="text-left px-5 py-3 font-semibold">Item Description</th>
                        <th className="text-left px-5 py-3 font-semibold">Project</th>
                        <th className="text-right px-5 py-3 font-semibold">Amount</th>
                        <th className="text-left px-5 py-3 font-semibold">Status</th>
                        <th className="text-left px-5 py-3 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PURCHASE_ORDERS.map((po, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3 font-mono text-primary">{po.id}</td>
                          <td className="px-5 py-3 text-white font-medium">{po.vendor}</td>
                          <td className="px-5 py-3 text-zinc-400 max-w-[200px] truncate">{po.item}</td>
                          <td className="px-5 py-3 text-zinc-500">{po.project}</td>
                          <td className="px-5 py-3 text-right text-white font-bold">{po.amount}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_COLORS[po.status]}`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-zinc-500">{po.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* RFQ Comparison Tab */}
          {tab === "rfq" && (
            <div className="space-y-5">
              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 space-y-1">
                  <h2 className="text-sm font-bold text-white">RFQ Comparison Matrix</h2>
                  <p className="text-xs text-zinc-500">TMT Bars Fe500D (12mm) — 8 Metric Tonnes · Metro Terminal Ph2</p>
                </div>
                <div className="p-5 space-y-4">
                  {RFQ_RESPONSES.map((r, i) => (
                    <div key={i} className={`rounded-xl p-5 border transition-all ${r.recommended ? "border-primary/30 bg-primary/5" : "border-white/5 bg-white/[0.01]"}`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{r.vendor}</span>
                            {r.recommended && (
                              <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/30">
                                ✓ Recommended
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-zinc-400">
                            <span>Rate: <strong className="text-white">{r.unitRate}</strong></span>
                            <span>Delivery: <strong className="text-white">{r.delivery}</strong></span>
                            <span>Valid till: <strong className="text-white">{r.validity}</strong></span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-lg font-extrabold text-white">{r.totalAmount}</div>
                            <div className="text-[10px] text-zinc-500">Total Order Value</div>
                          </div>
                          <div className="text-center">
                            <div className={`text-lg font-extrabold ${r.score >= 90 ? "text-emerald-400" : r.score >= 85 ? "text-amber-400" : "text-zinc-400"}`}>
                              {r.score}
                            </div>
                            <div className="text-[10px] text-zinc-500">Score</div>
                          </div>
                          <button className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${r.recommended ? "bg-primary text-white hover:opacity-90" : "bg-white/5 border border-white/10 text-white hover:bg-white/10"}`}>
                            {r.recommended ? "Place Order" : "Select"}
                          </button>
                        </div>
                      </div>
                      {/* Score bar */}
                      <div className="mt-3 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${r.score >= 90 ? "bg-emerald-500" : r.score >= 85 ? "bg-amber-500" : "bg-zinc-500"}`}
                            style={{ width: `${r.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-zinc-500">{r.score}/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Vendor Directory Tab */}
          {tab === "vendors" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {VENDORS.map((v, i) => (
                  <div key={i} className="glass-panel rounded-xl p-5 border border-white/5 space-y-3 hover:border-white/10 transition-all">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-sm font-bold text-white">{v.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{v.category} · {v.city}</div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${v.status === "Active" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>
                        {v.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3">
                      <div>
                        <div className="text-zinc-500">Last PO</div>
                        <div className="font-bold text-white mt-0.5">{v.lastPO}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-zinc-500">Rating</div>
                        <div className="font-bold text-amber-400 mt-0.5">★ {v.rating}</div>
                      </div>
                      <button className="text-xs text-primary hover:underline">View →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
