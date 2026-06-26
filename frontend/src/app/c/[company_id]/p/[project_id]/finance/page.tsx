"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  party: string;
  ref: string;
  ledger: string;
}

interface PLItem {
  head: string;
  budget: number;
  actual: number;
  variance: number;
}

interface TallyConnection {
  tally_company_name: string;
  registered_mobile: string;
  sync_window_start_date: string;
}

export default function FinancePage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tab, setTab] = useState<"ledger" | "pl" | "tally">("ledger");
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [plData, setPlData] = useState<PLItem[]>([]);
  const [tallyConn, setTallyConn] = useState<TallyConnection | null>(null);

  // Record Payment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [paymentType, setPaymentType] = useState("out"); // "in" (receipt), "out" (expense)
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [refNum, setRefNum] = useState("");
  const [desc, setDesc] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Tally Sync States
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("Not synced yet");
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [queuedVouchers, setQueuedVouchers] = useState(0);

  // Tally Setup Modal
  const [showTallySetup, setShowTallySetup] = useState(false);
  const [tallyCompany, setTallyCompany] = useState("");
  const [tallyMobile, setTallyMobile] = useState("");

  const fetchData = async () => {
    try {
      // 1. Fetch Ledger
      const ledgerRes = await fetch(`http://localhost:8000/apis/v3/finance/ledger?project_id=${projectId}`);
      if (ledgerRes.ok) {
        const data = await ledgerRes.json();
        setTransactions(data);
      }

      // 2. Fetch P&L
      const plRes = await fetch(`http://localhost:8000/apis/v3/finance/pl?project_id=${projectId}`);
      if (plRes.ok) {
        const data = await plRes.json();
        setPlData(data);
      }

      // 3. Fetch Tally connection
      const tallyRes = await fetch(`http://localhost:8000/apis/v3/tally/connections?company_id=${companyId}`);
      if (tallyRes.ok) {
        const data = await tallyRes.json();
        setTallyConn(data);
        setTallyCompany(data.tally_company_name);
        setTallyMobile(data.registered_mobile);
      }
    } catch (e) {
      console.error("Failed to load finance data", e);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, companyId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;

    setSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/apis/v3/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          payment_type: paymentType,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          reference_number: refNum || null,
          description: desc || null,
          payment_date: new Date().toISOString()
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        setAmount("");
        setRefNum("");
        setDesc("");
        fetchData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfigureTally = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tallyCompany || !tallyMobile) return;

    try {
      const res = await fetch("http://localhost:8000/apis/v3/tally/connections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          tally_company_name: tallyCompany,
          registered_mobile: tallyMobile,
          sync_window_start_date: new Date("2026-04-01").toISOString()
        })
      });
      if (res.ok) {
        const data = await res.json();
        setTallyConn(data);
        setShowTallySetup(false);
        fetchData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTallySync = async () => {
    setSyncing(true);
    setSyncLogs(["Initializing Tally Prime Desktop sync agent connection...", "Verifying company XML namespace..."]);
    
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/tally/sync?company_id=${companyId}`, {
        method: "POST"
      });
      if (res.ok) {
        const data = await res.json();
        setTimeout(() => {
          setSyncLogs(prev => [
            ...prev,
            `Connected successfully to Tally Company: "${data.tally_company}"`,
            `Pushing batch of ${data.vouchers_queued} XML ledger vouchers...`,
            ...data.sync_logs,
            `✓ Sync execution complete. Total ${data.vouchers_synced} vouchers pushed successfully.`
          ]);
          setLastSync(new Date().toLocaleDateString() + " — " + new Date().toLocaleTimeString());
          setSyncing(false);
        }, 1500);
      } else {
        const err = await res.text();
        setSyncLogs(prev => [...prev, `CRITICAL ERROR: ${err}`]);
        setSyncing(false);
      }
    } catch (e) {
      setSyncLogs(prev => [...prev, "CRITICAL ERROR: Failed to establish local Tally Prime sync pipeline."]);
      setSyncing(false);
    }
  };

  // Math variables
  const receiptsSum = transactions.filter(t => t.type === "Receipt").reduce((s, t) => s + Math.abs(t.amount), 0);
  const expensesSum = transactions.filter(t => t.type === "Expense").reduce((s, t) => s + Math.abs(t.amount), 0);
  const netCashFlow = receiptsSum - expensesSum;

  const totalRevenue = plData.find(r => r.head === "Revenue (Billed)")?.actual || 0;
  const totalCost = plData.filter(r => r.head !== "Revenue (Billed)").reduce((s, r) => s + r.actual, 0);
  const grossProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "0.0";

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
            <p className="text-[10px] text-zinc-500">Accrual-based general ledger, real-time cost analysis, and sync manager</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all">
            + Record Payment / Expense
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "ledger" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Receipts (Actual)", value: `₹${receiptsSum.toLocaleString("en-IN")}`, color: "text-emerald-400" },
                  { label: "Total Expenses (Actual)", value: `₹${expensesSum.toLocaleString("en-IN")}`, color: "text-red-400" },
                  { label: "Net Cash Flow", value: `₹${netCashFlow.toLocaleString("en-IN")}`, color: netCashFlow >= 0 ? "text-primary" : "text-red-400" },
                  { label: "General Ledger Heads", value: "6 heads", color: "text-amber-400" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className={`text-xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Transaction Ledger</h2>
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
                      {transactions.map((t, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3 text-zinc-500 font-mono">{t.date}</td>
                          <td className="px-5 py-3 text-white font-medium max-w-[180px] truncate">{t.description}</td>
                          <td className="px-5 py-3 text-zinc-400 max-w-[150px] truncate">{t.party}</td>
                          <td className="px-5 py-3 text-zinc-500">{t.ledger}</td>
                          <td className="px-5 py-3 text-zinc-600 font-mono text-[10px]">{t.ref}</td>
                          <td className={`px-5 py-3 text-right font-extrabold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {t.amount >= 0 ? "+" : "-"}₹{Math.abs(t.amount).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-zinc-600">No transactions recorded yet for this project.</td>
                        </tr>
                      )}
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
                  { label: "Revenue (Billed)", value: `₹${totalRevenue.toLocaleString("en-IN")}`, color: "text-emerald-400" },
                  { label: "Total Cost", value: `₹${totalCost.toLocaleString("en-IN")}`, color: "text-red-400" },
                  { label: `Gross Margin (${margin}%)`, value: `₹${grossProfit.toLocaleString("en-IN")}`, color: "text-primary" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-5 border border-white/5 text-center">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className={`text-3xl font-extrabold mt-2 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Budget vs Actual</h2>
                </div>
                <div className="p-5 space-y-4">
                  {plData.map((row, i) => {
                    const budgetVal = row.budget || 1;
                    const pct = Math.min((row.actual / budgetVal) * 100, 100);
                    const over = row.actual > row.budget && row.budget > 0;
                    return (
                      <div key={i} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 font-semibold">{row.head}</span>
                          <div className="flex items-center gap-4 text-zinc-500">
                            {row.budget > 0 && (
                              <span>Budget: <strong className="text-white">₹{row.budget.toLocaleString("en-IN")}</strong></span>
                            )}
                            <span>Actual: <strong className={over && row.head !== "Revenue (Billed)" ? "text-red-400" : "text-emerald-400"}>₹{row.actual.toLocaleString("en-IN")}</strong></span>
                            {row.budget > 0 && (
                              <span className={`font-bold ${row.variance >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {row.variance >= 0 ? "▲ Under" : "▼ Over"} ₹{Math.abs(row.variance).toLocaleString("en-IN")}
                              </span>
                            )}
                          </div>
                        </div>
                        {row.budget > 0 && (
                          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${over && row.head !== "Revenue (Billed)" ? "bg-red-500" : "bg-gradient-to-r from-primary to-secondary"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === "tally" && (
            <div className="space-y-5 max-w-3xl">
              <div className="glass-panel-glow rounded-2xl border border-white/5 p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">Tally ERP desktop integration</h2>
                    <p className="text-xs text-zinc-500 mt-1">Last synced: {lastSync}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {tallyConn ? (
                      <>
                        <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-xs text-emerald-400 font-semibold">Configured</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-amber-400" />
                        <span className="text-xs text-amber-400 font-semibold">Not Configured</span>
                      </>
                    )}
                  </div>
                </div>

                {tallyConn && (
                  <div className="space-y-3">
                    {[
                      { label: "Connected Company", value: tallyConn.tally_company_name },
                      { label: "Sync Start Window", value: new Date(tallyConn.sync_window_start_date).toLocaleDateString() },
                      { label: "Sync Method", value: "Local XML Sync Server" },
                    ].map((r, i) => (
                      <div key={i} className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-xs text-zinc-500">{r.label}</span>
                        <span className="text-xs text-white font-semibold">{r.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    disabled={syncing || !tallyConn}
                    onClick={handleTallySync}
                    className="flex-1 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] py-3 text-xs font-bold text-white hover:opacity-90 transition-all disabled:opacity-30"
                  >
                    {syncing ? "⟳ Syncing Ledger..." : "Trigger Tally Sync →"}
                  </button>
                  <button
                    onClick={() => setShowTallySetup(true)}
                    className="rounded-xl border border-white/10 px-4 py-3 text-xs font-bold text-zinc-300 hover:bg-white/[0.02]"
                  >
                    {tallyConn ? "Update Connection" : "Setup Connection"}
                  </button>
                </div>
              </div>

              {/* Sync execution log */}
              {syncLogs.length > 0 && (
                <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-3">
                  <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Sync Execution Logs</h3>
                  <div className="bg-[#0B0910] border border-white/5 rounded-xl p-4 font-mono text-[10px] text-emerald-400 space-y-1.5 h-44 overflow-y-auto">
                    {syncLogs.map((log, i) => (
                      <div key={i}>{log}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0D0B14] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">Record Project Payment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Payment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPaymentType("out")} className={`py-2 rounded-xl text-xs font-semibold border ${paymentType === "out" ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-transparent text-zinc-500 border-white/5 hover:border-white/10"}`}>Expense (OUT)</button>
                  <button type="button" onClick={() => setPaymentType("in")} className={`py-2 rounded-xl text-xs font-semibold border ${paymentType === "in" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-transparent text-zinc-500 border-white/5 hover:border-white/10"}`}>Receipt (IN)</button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Amount (INR) *</label>
                <input type="number" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="E.g. 25000" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Payment Method</label>
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-[#0E0C15] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none">
                  {["Bank Transfer", "Cash", "Cheque"].map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Reference Number</label>
                <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)} placeholder="UTR-8422 or Cheque number" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Description / Notes</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="E.g. Cement bill settlement" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] font-bold text-xs text-white hover:opacity-90 disabled:opacity-50 transition-all">
                {submitting ? "Saving..." : "Record Payment →"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tally Setup Modal */}
      {showTallySetup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-[#0D0B14] border border-white/10 rounded-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-white">Setup Tally Connection</h3>
              <button onClick={() => setShowTallySetup(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleConfigureTally} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Tally Company Name *</label>
                <input type="text" required value={tallyCompany} onChange={e => setTallyCompany(e.target.value)} placeholder="E.g. Metro Infra Corp Ltd" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase">Registered Mobile *</label>
                <input type="text" required value={tallyMobile} onChange={e => setTallyMobile(e.target.value)} placeholder="9999912345" className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary/50" />
              </div>

              <button type="submit" className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] font-bold text-xs text-white hover:opacity-90 transition-all">
                Save & Connect →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
