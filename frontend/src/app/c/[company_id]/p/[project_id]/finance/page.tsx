"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const TRANSACTIONS = [
  { id: "TXN-2026-0841", date: "Jun 26", type: "Expense", category: "Material Purchase", description: "Steel TMT 12mm — 8MT", amount: -584000, party: "National Steel Suppliers", ref: "PO-2026-0412", ledger: "Material Cost" },
  { id: "TXN-2026-0840", date: "Jun 25", type: "Receipt", category: "Client Payment", description: "Stage 3 Milestone Payment", amount: 2800000, party: "Metro Infra Corp Ltd", ref: "INV-2026-0211", ledger: "Revenue" },
  { id: "TXN-2026-0839", date: "Jun 25", type: "Expense", category: "Labour Wages", description: "Daily wages — 48 workers", amount: -41600, party: "Site Labour Pool", ref: "ATT-JUN-25", ledger: "Labour Cost" },
  { id: "TXN-2026-0838", date: "Jun 24", type: "Expense", category: "Equipment Hire", description: "Tower Crane hourly — 8hrs", amount: -24000, party: "Bharat Cranes Pvt Ltd", ref: "PO-2026-0406", ledger: "Plant & Machinery" },
  { id: "TXN-2026-0837", date: "Jun 23", type: "Expense", category: "Subcontractor", description: "RA Bill #4 — Flooring work", amount: -480000, party: "Shree Tile Works", ref: "RA-004", ledger: "Subcon Cost" },
  { id: "TXN-2026-0836", date: "Jun 22", type: "Receipt", category: "Debit Note", description: "Material quality defect recovery", amount: 18000, party: "Indus Paint House", ref: "DN-2026-012", ledger: "Recoveries" },
  { id: "TXN-2026-0835", date: "Jun 21", type: "Expense", category: "Overhead", description: "Site office electricity + water", amount: -8400, party: "Utility Charges", ref: "UTIL-JUN", ledger: "Overhead" },
];

const PL_DATA = [
  { head: "Revenue (Billed)", budget: 18500000, actual: 14200000, variance: -4300000 },
  { head: "Material Cost", budget: 7200000, actual: 6840000, variance: 360000 },
  { head: "Labour Cost", budget: 2800000, actual: 3120000, variance: -320000 },
  { head: "Subcontractor Cost", budget: 3600000, actual: 3980000, variance: -380000 },
  { head: "Plant & Machinery", budget: 800000, actual: 720000, variance: 80000 },
  { head: "Overhead", budget: 600000, actual: 680000, variance: -80000 },
];

export default function FinancePage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const [tab, setTab] = useState<"ledger" | "pl" | "tally">("ledger");
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("Jun 26, 2026 — 09:14 AM");

  const totalRevenue = PL_DATA.find(r => r.head === "Revenue (Billed)")?.actual || 0;
  const totalCost = PL_DATA.filter(r => r.head !== "Revenue (Billed)").reduce((s, r) => s + r.actual, 0);
  const grossProfit = totalRevenue - totalCost;
  const margin = ((grossProfit / totalRevenue) * 100).toFixed(1);

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">← Dashboard</Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Finance</div>
          {[
            { key: "ledger", label: "Transaction Ledger", icon: "📒" },
            { key: "pl", label: "Project P&L", icon: "📊" },
            { key: "tally", label: "Tally Sync", icon: "🔗" },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key as typeof tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${tab === item.key ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Finance & Transactions</h1>
            <p className="text-[10px] text-zinc-500">Expense Ledger · Project P&L · Tally ERP Sync</p>
          </div>
          <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all">
            + Record Expense
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "ledger" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Receipts (Jun)", value: "₹28.18L", color: "text-emerald-400" },
                  { label: "Total Expenses (Jun)", value: "₹11.38L", color: "text-red-400" },
                  { label: "Net Cash Flow", value: "₹16.80L", color: "text-primary" },
                  { label: "Pending Approvals", value: "3", color: "text-amber-400" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className={`text-2xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Transaction Ledger — Jun 2026</h2>
                  <button className="text-xs text-primary hover:underline">Export to Tally</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="text-left px-5 py-3 font-semibold">Date</th>
                        <th className="text-left px-5 py-3 font-semibold">Description</th>
                        <th className="text-left px-5 py-3 font-semibold">Party</th>
                        <th className="text-left px-5 py-3 font-semibold">Ledger Head</th>
                        <th className="text-left px-5 py-3 font-semibold">Ref</th>
                        <th className="text-right px-5 py-3 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {TRANSACTIONS.map((t, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3 text-zinc-500">{t.date}</td>
                          <td className="px-5 py-3 text-white max-w-[180px] truncate">{t.description}</td>
                          <td className="px-5 py-3 text-zinc-400 max-w-[150px] truncate">{t.party}</td>
                          <td className="px-5 py-3 text-zinc-500">{t.ledger}</td>
                          <td className="px-5 py-3 text-zinc-600 font-mono text-[10px]">{t.ref}</td>
                          <td className={`px-5 py-3 text-right font-extrabold ${t.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {t.amount > 0 ? "+" : ""}₹{Math.abs(t.amount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "pl" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Revenue (Billed)", value: `₹${(totalRevenue / 100000).toFixed(1)}L`, color: "text-emerald-400" },
                  { label: "Total Cost", value: `₹${(totalCost / 100000).toFixed(1)}L`, color: "text-red-400" },
                  { label: `Gross Margin (${margin}%)`, value: `₹${(grossProfit / 100000).toFixed(1)}L`, color: "text-primary" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-5 border border-white/5 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className={`text-3xl font-extrabold mt-2 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Budget vs Actual — Metro Terminal Ph2</h2>
                </div>
                <div className="p-5 space-y-4">
                  {PL_DATA.map((row, i) => {
                    const pct = Math.min((row.actual / row.budget) * 100, 120);
                    const over = row.actual > row.budget;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 font-semibold">{row.head}</span>
                          <div className="flex items-center gap-4 text-zinc-500">
                            <span>Budget: <strong className="text-white">₹{(row.budget / 100000).toFixed(1)}L</strong></span>
                            <span>Actual: <strong className={over && row.head !== "Revenue (Billed)" ? "text-red-400" : "text-emerald-400"}>₹{(row.actual / 100000).toFixed(1)}L</strong></span>
                            <span className={`font-bold ${row.variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                              {row.variance >= 0 ? "▲" : "▼"} ₹{Math.abs(row.variance / 100000).toFixed(1)}L
                            </span>
                          </div>
                        </div>
                        <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${over && row.head !== "Revenue (Billed)" ? "bg-red-500" : "bg-gradient-to-r from-primary to-secondary"}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "tally" && (
            <div className="space-y-5 max-w-2xl">
              <div className="glass-panel-glow rounded-2xl border border-white/5 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">Tally ERP Sync</h2>
                    <p className="text-xs text-zinc-500 mt-1">Last synced: {lastSync}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-400 font-semibold">Connected</span>
                  </div>
                </div>

                {[
                  { label: "Company", value: "Metro Infra Corp Ltd (Tally Prime)" },
                  { label: "Ledger Mapping", value: "38 heads configured" },
                  { label: "Cost Centre", value: "Metro Terminal Ph2 → MC-TMP2" },
                  { label: "Pending Vouchers", value: "7 transactions queued" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-white/5 pb-3">
                    <span className="text-xs text-zinc-500">{r.label}</span>
                    <span className="text-xs text-white font-semibold">{r.value}</span>
                  </div>
                ))}

                <button
                  disabled={syncing}
                  onClick={() => { setSyncing(true); setTimeout(() => { setSyncing(false); setLastSync("Jun 26, 2026 — " + new Date().toLocaleTimeString()); }, 2500); }}
                  className="w-full rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] py-3 text-sm font-bold text-white hover:opacity-90 transition-all disabled:opacity-60"
                >
                  {syncing ? "⟳ Syncing to Tally..." : "Push 7 Vouchers to Tally →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
