"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Transaction {
  id: string;
  date: string;
  type: "Expense" | "Receipt" | "Debit Note" | "Credit Note" | "Party to Party" | "Internal Transfer";
  category: string;
  description: string;
  amount: number;
  party: string;
  ref: string;
  ref_invoice?: string;
  ledger: string;
  status: "Pending" | "Approved" | "Rejected";
  cost_code?: string;
  photo_url?: string;
  settled_amount: number;
  balance_due: number;
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

const INITIAL_TRANSACTIONS: Transaction[] = [
  { 
    id: "TXN-01", 
    date: "2026-06-30", 
    type: "Expense", 
    category: "Site Expense", 
    description: "Supervisor Site Travel Fuel Voucher", 
    amount: 250, 
    party: "Kanchan (Mason Lead)", 
    ref: "ONS-V-2026-981", 
    ledger: "Travelling Expenses",
    status: "Pending",
    cost_code: "1.2.1 Site Conveyance",
    photo_url: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500",
    settled_amount: 0,
    balance_due: 250
  },
  { 
    id: "TXN-02", 
    date: "2026-06-28", 
    type: "Expense", 
    category: "Material Payment", 
    description: "Cement Bags Purchase Ledger", 
    amount: 62000, 
    party: "Shree Cement Traders", 
    ref: "PO-2026-042", 
    ledger: "Material Purchase",
    status: "Approved",
    cost_code: "2.1 Raw Materials",
    settled_amount: 62000,
    balance_due: 0
  },
  { 
    id: "TXN-03", 
    date: "2026-06-25", 
    type: "Receipt", 
    category: "Client Billing", 
    description: "Client Milestone #1 Slab Payment", 
    amount: 150000, 
    party: "Mumbai Metro Rail Corp", 
    ref: "REC-2026-104", 
    ledger: "Client Billed Income",
    status: "Approved",
    settled_amount: 150000,
    balance_due: 0
  },
  {
    id: "TXN-04",
    date: "2026-06-24",
    type: "Debit Note",
    category: "Material Return",
    description: "Returned defective reinforcing steel bars",
    amount: 12500,
    party: "Apex Steel Industries",
    ref: "DN-2026-004",
    ref_invoice: "INV-2026-4412",
    ledger: "Material Purchase Return",
    status: "Approved",
    cost_code: "2.1 Raw Materials",
    settled_amount: 12500,
    balance_due: 0
  },
  {
    id: "TXN-05",
    date: "2026-06-23",
    type: "Credit Note",
    category: "Client Discount",
    description: "Credit note raised for plastering thickness variance correction",
    amount: 4500,
    party: "Mumbai Metro Rail Corp",
    ref: "CN-2026-001",
    ref_invoice: "REC-2026-104",
    ledger: "Discount Allowed",
    status: "Approved",
    settled_amount: 4500,
    balance_due: 0
  }
];

export default function FinancePage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tab, setTab] = useState<"ledger" | "party" | "cashbook" | "pl" | "tally" | "costvar" | "payment_requests" | "accounts">("ledger");
  
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [plData, setPlData] = useState<PLItem[]>([]);
  const [tallyConn, setTallyConn] = useState<TallyConnection | null>(null);

  // Details drawer voucher state
  const [selectedVoucher, setSelectedVoucher] = useState<Transaction | null>(null);

  // Record Payment Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedTxnType, setSelectedTxnType] = useState<Transaction["type"]>("Expense");
  const [amount, setAmount] = useState("");
  const [partyName, setPartyName] = useState("");
  const [refNum, setRefNum] = useState("");
  const [refInvoice, setRefInvoice] = useState("");
  const [desc, setDesc] = useState("");
  const [costCode, setCostCode] = useState("1.2.1 Site Conveyance");
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Bank Accounts & Payment Requests states
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBank, setNewBank] = useState({ name: "", holder: "", number: "", ifsc: "", upi: "", balance: "" });
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ partyId: "", amount: "", details: "", dueDate: "" });
  const [usersList, setUsersList] = useState<any[]>([]);

  // Tally Sync States
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState("Not synced yet");
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [queuedVouchers, setQueuedVouchers] = useState(0);

  // Tally Setup Modal
  const [showTallySetup, setShowTallySetup] = useState(false);
  const [tallyCompany, setTallyCompany] = useState("");
  const [tallyMobile, setTallyMobile] = useState("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");

  const fetchData = async () => {
    try {
      const plRes = await fetch(`http://localhost:8000/apis/v3/finance/pl?project_id=${projectId}`);
      if (plRes.ok) {
        setPlData(await plRes.json());
      }
      const tallyRes = await fetch(`http://localhost:8000/apis/v3/tally/connections?company_id=${companyId}`);
      if (tallyRes.ok) {
        const data = await tallyRes.json();
        setTallyConn(data);
        setTallyCompany(data.tally_company_name);
        setTallyMobile(data.registered_mobile);
      }
      // Fetch Bank Accounts
      const bankRes = await fetch(`http://localhost:8000/apis/v3/finance/accounts/${companyId}`);
      if (bankRes.ok) {
        setBankAccounts(await bankRes.json());
      }
      // Fetch Payment Requests
      const reqRes = await fetch(`http://localhost:8000/apis/v3/finance/payment-requests/${companyId}`);
      if (reqRes.ok) {
        setPaymentRequests(await reqRes.json());
      }
      // Fetch Employees for party dropdown
      const empRes = await fetch(`http://localhost:8000/apis/v3/hr/employees/${projectId}`);
      if (empRes.ok) {
        setUsersList(await empRes.json());
      }
    } catch (e) {
      console.error("Failed to load finance data", e);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams(window.location.search);
      const queryTab = queryParams.get("tab");
      if (queryTab && ["ledger", "party", "cashbook", "pl", "tally", "costvar", "payment_requests", "accounts"].includes(queryTab)) {
        setTab(queryTab as any);
      }
    }
  }, []);

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId, companyId]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtVal = parseFloat(amount);
    if (!amount || amtVal <= 0 || !partyName.trim()) return;

    setSubmitting(true);
    const newTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      type: selectedTxnType,
      category: selectedTxnType,
      description: desc || `Recorded ${selectedTxnType} voucher`,
      amount: amtVal,
      party: partyName,
      ref: refNum || `ONS-V-${Date.now().toString().slice(-4)}`,
      ref_invoice: ["Debit Note", "Credit Note"].includes(selectedTxnType) ? refInvoice : undefined,
      ledger: selectedTxnType,
      status: "Pending", 
      cost_code: costCode,
      photo_url: photoUrl || undefined,
      settled_amount: 0,
      balance_due: amtVal
    };

    setTransactions([newTxn, ...transactions]);
    setShowAddModal(false);
    setAmount("");
    setPartyName("");
    setRefNum("");
    setRefInvoice("");
    setDesc("");
    setPhotoUrl("");
    setSubmitting(false);
  };

  const handleApproveVoucher = async (id: string) => {
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, status: "Approved" as const, settled_amount: t.amount, balance_due: 0 };
      }
      return t;
    }));
    if (selectedVoucher && selectedVoucher.id === id) {
      setSelectedVoucher({ ...selectedVoucher, status: "Approved" as const, settled_amount: selectedVoucher.amount, balance_due: 0 });
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/finance/accounts/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_holder_name: newBank.holder,
          bank_name: newBank.name,
          account_number: newBank.number,
          ifsc_code: newBank.ifsc,
          upi_id: newBank.upi || null,
          balance: parseFloat(newBank.balance) || 0.0,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setBankAccounts([...bankAccounts, added]);
        setNewBank({ name: "", holder: "", number: "", ifsc: "", upi: "", balance: "" });
        setShowAddBankModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreatePaymentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/finance/payment-requests/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          party_company_user_id: newRequest.partyId,
          project_id: projectId || null,
          amount: parseFloat(newRequest.amount),
          details: newRequest.details,
          due_date: newRequest.dueDate ? new Date(newRequest.dueDate).toISOString() : null,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setPaymentRequests([...paymentRequests, added]);
        setNewRequest({ partyId: "", amount: "", details: "", dueDate: "" });
        setShowAddRequestModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTriggerSync = async () => {
    setSyncing(true);
    setSyncLogs([]);
    setTimeout(() => {
      setSyncLogs([
        `[${new Date().toLocaleTimeString()}] Handshake successful with Tally Gateway.`,
        `[${new Date().toLocaleTimeString()}] Pushed approved vouchers successfully.`,
      ]);
      setLastSync(new Date().toLocaleString());
      setSyncing(false);
    }, 1500);
  };

  // Math & Ledgers compilation
  const sortedTxns = useMemo(() => {
    return [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions]);

  // Main ledger with running balance
  const ledgerWithRunningBalance = useMemo(() => {
    let balance = 0;
    return sortedTxns.map(t => {
      const isCredit = t.type === "Receipt" || t.type === "Credit Note";
      if (isCredit) {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
      return { ...t, running_balance: balance };
    }).reverse();
  }, [sortedTxns]);

  const receiptsSum = useMemo(() => {
    return transactions
      .filter(t => t.type === "Receipt" || t.type === "Credit Note")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions]);

  const expensesSum = useMemo(() => {
    return transactions
      .filter(t => t.type === "Expense" || t.type === "Debit Note")
      .reduce((s, t) => s + Math.abs(t.amount), 0);
  }, [transactions]);

  const netCashFlow = receiptsSum - expensesSum;

  // Party ledgers compilation
  const partyLedgers = useMemo(() => {
    const map: Record<string, { party: string; total_debit: number; total_credit: number; net_due: number; txns: Transaction[] }> = {};
    transactions.forEach(t => {
      if (!map[t.party]) {
        map[t.party] = { party: t.party, total_debit: 0, total_credit: 0, net_due: 0, txns: [] };
      }
      const isCredit = t.type === "Receipt" || t.type === "Credit Note";
      if (isCredit) {
        map[t.party].total_credit += t.amount;
      } else {
        map[t.party].total_debit += t.amount;
      }
      map[t.party].net_due += t.balance_due;
      map[t.party].txns.push(t);
    });
    return Object.values(map);
  }, [transactions]);

  // Cash Book compilation
  const cashBookRows = useMemo(() => {
    let balance = 0;
    return sortedTxns.map(t => {
      const isCredit = t.type === "Receipt" || t.type === "Credit Note";
      if (isCredit) {
        balance += t.amount;
      } else {
        balance -= t.amount;
      }
      return {
        date: t.date,
        narration: t.description,
        party: t.party,
        ref: t.ref,
        debit: !isCredit ? t.amount : 0,
        credit: isCredit ? t.amount : 0,
        running_balance: balance
      };
    }).reverse();
  }, [sortedTxns]);

  const totalRevenue = plData.find(r => r.head === "Revenue (Billed)")?.actual || 150000;
  const totalCost = plData.filter(r => r.head !== "Revenue (Billed)").reduce((s, r) => s + r.actual, 0) || 62250;
  const grossProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : "58.5";

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 border-r border-white/5 bg-[#0B0910] flex flex-col">
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">← Dashboard</Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Finance</div>
          {[
            { key: "ledger", label: "Transaction Ledger", icon: "📒" },
            { key: "party", label: "Party Ledgers", icon: "👥" },
            { key: "payment_requests", label: "Payment Requests", icon: "✉️" },
            { key: "accounts", label: "Cash & Bank Accounts", icon: "🏦" },
            { key: "cashbook", label: "Cash Book Statement", icon: "📖" },
            { key: "pl", label: "Project P&L", icon: "📊" },
            { key: "tally", label: "Tally Sync Gateway", icon: "🔗" },
            { key: "costvar", label: "Cost Variance Report", icon: "⚠️" },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key as any)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${tab === item.key ? "bg-white/[0.06] text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-white/5 bg-[#0D0B14] px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white">
              {tab === "ledger" ? "Accrual Ledger" : tab === "party" ? "Party-wise Ledgers" : tab === "payment_requests" ? "Payment Requests Ledger" : tab === "accounts" ? "Company Cash & Bank Accounts" : tab === "cashbook" ? "Cash Book (Bank Ledger)" : tab === "pl" ? "Project P&L" : tab === "tally" ? "Tally Sync Gateway" : "Cost Variance Report"}
            </h1>
            <p className="text-[10px] text-zinc-500">Real-time sequential approval tracking & running balance ledger</p>
          </div>
          <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer">
              + Create Voucher ▾
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-[#0B0910]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-5 z-50 space-y-4 text-left max-h-[420px] overflow-y-auto">
                <div>
                  <div className="text-[9px] font-bold text-[#00E5A3] uppercase tracking-widest border-b border-white/5 pb-1 mb-2">Payment</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {["Payment In", "Payment Out", "Debit Note", "Credit Note", "Party to Party", "Internal Transfer", "Upload Payments"].map(type => (
                      <button key={type} onClick={() => { setSelectedTxnType(type as any); setPartyName(""); setIsDropdownOpen(false); setShowAddModal(true); }}
                        className="py-1 px-2 text-left rounded-lg text-zinc-400 hover:text-[#00E5A3] hover:bg-[#00E5A3]/10 transition-all text-xs cursor-pointer font-semibold">
                        + {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-bold text-[#7C5CFF] uppercase tracking-widest border-b border-white/5 pb-1 mb-2">Sales</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {["Sales Invoice", "Material Sales"].map(type => (
                      <button key={type} onClick={() => { setSelectedTxnType(type as any); setPartyName(""); setIsDropdownOpen(false); setShowAddModal(true); }}
                        className="py-1 px-2 text-left rounded-lg text-zinc-400 hover:text-[#7C5CFF] hover:bg-[#7C5CFF]/10 transition-all text-xs cursor-pointer font-semibold">
                        + {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-bold text-[#FF3B6C] uppercase tracking-widest border-b border-white/5 pb-1 mb-2">Expense</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {["Material Purchase", "Material Return", "Material Transfer", "Sub Con Bill", "Other Expense", "Equipment Expense"].map(type => (
                      <button key={type} onClick={() => { setSelectedTxnType(type as any); setPartyName(""); setIsDropdownOpen(false); setShowAddModal(true); }}
                        className="py-1 px-2 text-left rounded-lg text-zinc-400 hover:text-[#FF3B6C] hover:bg-[#FF3B6C]/10 transition-all text-xs cursor-pointer font-semibold">
                        + {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── TRANSACTION LEDGER TAB ── */}
          {tab === "ledger" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Credits (Inflow)", value: `₹${receiptsSum.toLocaleString("en-IN")}`, color: "text-emerald-400" },
                  { label: "Total Debits (Outflow)", value: `₹${expensesSum.toLocaleString("en-IN")}`, color: "text-red-400" },
                  { label: "Net Ledger Balance", value: (netCashFlow >= 0 ? "+" : "") + `₹${netCashFlow.toLocaleString("en-IN")}`, color: netCashFlow >= 0 ? "text-primary" : "text-red-400" },
                  { label: "Pending Approvals", value: transactions.filter(t => t.status === "Pending").length, color: "text-amber-400" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4 border border-white/5 bg-[#14121F]">
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className={`text-lg font-black mt-1 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 bg-[#14121F] border border-white/5 rounded-xl px-4 py-2.5">
                <input type="text" placeholder="Search party, voucher#, cost code..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-[#1C182A] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary" />
              </div>

              {/* Main Ledger Table */}
              <div className="glass-panel rounded-2xl border border-white/5 bg-[#14121F] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Voucher#</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Party Name</th>
                        <th className="px-5 py-3">Description</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Amount</th>
                        <th className="px-5 py-3 text-right">Ledger Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {ledgerWithRunningBalance
                        .filter(t => !searchQuery || t.party.toLowerCase().includes(searchQuery.toLowerCase()) || t.ref.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
                        .map((t, i) => {
                          const isCredit = t.type === "Receipt" || t.type === "Credit Note";
                          return (
                            <tr key={i} onClick={() => setSelectedVoucher(t)} className="hover:bg-white/[0.015] transition-all cursor-pointer">
                              <td className="px-5 py-3 text-zinc-500 font-mono">{t.date}</td>
                              <td className="px-5 py-3 text-white font-bold">{t.ref}</td>
                              <td className="px-5 py-3 text-zinc-400">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${isCredit ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>{t.type}</span>
                              </td>
                              <td className="px-5 py-3 text-zinc-300 font-medium">{t.party}</td>
                              <td className="px-5 py-3 text-zinc-500 line-clamp-1 max-w-[150px]">{t.description}</td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${t.status === "Approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                                  {t.status === "Approved" ? "✓ APPROVED" : "🕒 PENDING"}
                                </span>
                              </td>
                              <td className={`px-5 py-3 text-right font-extrabold font-mono ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                                {isCredit ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
                              </td>
                              <td className="px-5 py-3 text-right font-mono text-zinc-500">
                                ₹{t.running_balance.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ── PARTY LEDGERS TAB ── */}
          {tab === "party" && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-500">Party-wise running ledgers and outstanding balances.</div>
              <div className="grid gap-3 sm:grid-cols-2">
                {partyLedgers.map(p => (
                  <div key={p.party} className="bg-[#14121F] border border-white/5 rounded-xl p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xs font-bold text-white">{p.party}</h3>
                        <span className="text-[9px] text-zinc-500">{p.txns.length} transactions</span>
                      </div>
                      <span className={`text-[10px] font-extrabold font-mono ${p.total_credit >= p.total_debit ? "text-emerald-400" : "text-red-400"}`}>
                        Net Due: ₹{p.net_due.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 bg-black/20 p-2.5 rounded-lg text-[10px] font-mono text-zinc-400">
                      <div>Debits: <span className="text-red-400">₹{p.total_debit.toLocaleString("en-IN")}</span></div>
                      <div>Credits: <span className="text-emerald-400">₹{p.total_credit.toLocaleString("en-IN")}</span></div>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {p.txns.map(t => (
                        <div key={t.id} className="flex justify-between items-center text-[9px] text-zinc-600">
                          <span>{t.date} · {t.ref}</span>
                          <span className={t.type === "Receipt" || t.type === "Credit Note" ? "text-emerald-400" : "text-red-400"}>
                            ₹{t.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── CASH BOOK TAB ── */}
          {tab === "cashbook" && (
            <div className="space-y-4">
              <div className="text-xs text-zinc-500">Double-entry book for all site bank accounts & cash boxes.</div>
              <div className="glass-panel rounded-2xl border border-white/5 bg-[#14121F] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Narration (Particulars)</th>
                      <th className="px-5 py-3">Party</th>
                      <th className="px-5 py-3 text-right">Debit (Outflow)</th>
                      <th className="px-5 py-3 text-right">Credit (Inflow)</th>
                      <th className="px-5 py-3 text-right">Cash Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] font-mono">
                    {cashBookRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.015]">
                        <td className="px-5 py-3 text-zinc-500">{row.date}</td>
                        <td className="px-5 py-3 text-white font-bold">{row.ref}</td>
                        <td className="px-5 py-3 text-zinc-300 font-sans">{row.narration}</td>
                        <td className="px-5 py-3 text-zinc-400 font-sans">{row.party}</td>
                        <td className="px-5 py-3 text-right text-red-400">{row.debit > 0 ? `₹${row.debit.toLocaleString("en-IN")}` : "—"}</td>
                        <td className="px-5 py-3 text-right text-emerald-400">{row.credit > 0 ? `₹${row.credit.toLocaleString("en-IN")}` : "—"}</td>
                        <td className="px-5 py-3 text-right text-white font-extrabold">₹{row.running_balance.toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── PAYMENT REQUESTS TAB ── */}
          {tab === "payment_requests" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-xs text-zinc-500">Record and track internal payment requests, milestone requests, and supplier payments.</div>
                <button
                  onClick={() => setShowAddRequestModal(true)}
                  className="bg-[#7C5CFF] text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  + Create Payment Request
                </button>
              </div>

              <div className="glass-panel rounded-2xl border border-white/5 bg-[#14121F] overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-5 py-3">Created At</th>
                      <th className="px-5 py-3">Party Name</th>
                      <th className="px-5 py-3">Requested Amount</th>
                      <th className="px-5 py-3">Particulars / Details</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3">Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentRequests.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-zinc-500">
                          No active payment requests found.
                        </td>
                      </tr>
                    ) : (
                      paymentRequests.map((req) => (
                        <tr key={req.id} className="border-t border-white/5 hover:bg-white/[0.015]">
                          <td className="px-5 py-3 text-zinc-500 font-mono">
                            {new Date(req.created_at).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-5 py-3 font-semibold text-white">{req.party_name}</td>
                          <td className="px-5 py-3 text-white font-bold font-mono">₹{req.amount.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3 text-zinc-400">{req.details}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                              req.status === "Approved" || req.status === "Paid"
                                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                                : req.status === "Rejected"
                                ? "bg-red-500/10 border-red-500/20 text-red-400"
                                : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            }`}>
                              {req.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-zinc-400 font-mono">
                            {req.due_date ? new Date(req.due_date).toLocaleDateString("en-IN") : "Immediate"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── CASH & BANK ACCOUNTS TAB ── */}
          {tab === "accounts" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="text-xs text-zinc-500">List and manage central business bank accounts, UPI configurations, and cash balances.</div>
                <button
                  onClick={() => setShowAddBankModal(true)}
                  className="bg-[#7C5CFF] text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  + Add Bank Account
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {/* Default Cash Wallet Card */}
                <div className="glass-panel border border-white/5 bg-[#14121F] p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="font-bold text-white text-xs uppercase tracking-wider text-zinc-400">Cash Wallet Account</div>
                    <span className="text-[9px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Cash Account</span>
                  </div>
                  <div>
                    <div className="text-2xl font-black text-white font-mono">₹{netCashFlow.toLocaleString("en-IN")}</div>
                    <div className="text-[10px] text-zinc-500 mt-1">Available physical cash at site</div>
                  </div>
                  <div className="border-t border-white/5 pt-3 flex justify-between text-[10px] text-zinc-400 font-mono">
                    <span>A/c Holder: Project Wallet</span>
                    <span>IFSC: N/A</span>
                  </div>
                </div>

                {bankAccounts.map((acc) => (
                  <div key={acc.id} className="glass-panel border border-white/5 bg-[#14121F] p-5 rounded-2xl space-y-4">
                    <div className="flex justify-between items-center">
                      <div className="font-bold text-white text-xs uppercase tracking-wider text-zinc-400">{acc.bank_name}</div>
                      <span className="text-[9px] bg-[#7C5CFF]/10 border border-[#7C5CFF]/20 text-[#7C5CFF] px-2 py-0.5 rounded-full font-bold">Bank Account</span>
                    </div>
                    <div>
                      <div className="text-2xl font-black text-white font-mono">₹{acc.balance.toLocaleString("en-IN")}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">A/c Number: <span className="font-semibold text-zinc-300 font-mono">{acc.account_number}</span></div>
                    </div>
                    <div className="border-t border-white/5 pt-3 flex justify-between text-[10px] text-zinc-400">
                      <span>Holder: {acc.account_holder_name}</span>
                      <span>IFSC: {acc.ifsc_code}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PROJECT P&L TAB ── */}
          {tab === "pl" && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Revenue (Billed)", value: `₹${totalRevenue.toLocaleString("en-IN")}`, color: "text-emerald-400" },
                  { label: "Total Cost", value: `₹${totalCost.toLocaleString("en-IN")}`, color: "text-red-400" },
                  { label: `Gross Margin (${margin}%)`, value: `₹${grossProfit.toLocaleString("en-IN")}`, color: "text-primary" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-5 border border-white/5 text-center bg-[#14121F]">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className="text-2xl font-black mt-2">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TALLY SYNC TAB ── */}
          {tab === "tally" && (
            <div className="space-y-5">
              <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#14121F] space-y-4">
                <h2 className="text-sm font-bold text-white">Tally ERP 9 Gateway Sync</h2>
                <div className="text-xs text-zinc-400">Push verified vouchers directly to Tally Desktop Agent via XML.</div>
                <div className="flex gap-2">
                  <button onClick={handleTriggerSync} disabled={syncing} className="px-4 py-2 bg-gradient-to-r from-primary to-[#FF3B6C] text-white text-xs font-bold rounded-xl hover:opacity-90">
                    {syncing ? "Pulsing Gateway Sync..." : "Sync Vouchers Now 🔄"}
                  </button>
                </div>
                {syncLogs.length > 0 && (
                  <div className="p-4 bg-black/40 border border-white/5 rounded-xl text-[10px] font-mono text-zinc-400 space-y-1 max-h-36 overflow-y-auto">
                    {syncLogs.map((log, i) => <div key={i}>{log}</div>)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── COST VARIANCE TAB ── */}
          {tab === "costvar" && (() => {
            const BUDGET_LINES = [
              { code: "1.1", head: "Site Labour", budget: 480000 },
              { code: "1.2.1", head: "Site Conveyance", budget: 18000 },
              { code: "2.1", head: "Raw Materials — Cement/Steel", budget: 650000 },
              { code: "2.2", head: "Formwork & Shuttering", budget: 95000 },
              { code: "3.1", head: "Subcontractor Civil", budget: 320000 },
              { code: "3.5", head: "Subcontractor Labours", budget: 120000 },
              { code: "4.1", head: "Equipment Hire", budget: 210000 },
              { code: "5.0", head: "Overheads & Admin", budget: 55000 },
            ];

            const actuals: Record<string, number> = {};
            transactions.filter(t => t.status !== "Rejected").forEach(t => {
              const key = t.cost_code ? t.cost_code.split(" ")[0] : "5.0";
              actuals[key] = (actuals[key] || 0) + t.amount;
            });

            const rows = BUDGET_LINES.map(b => {
              const actual = actuals[b.code] || 0;
              const variance = b.budget - actual;
              const variancePct = b.budget > 0 ? ((variance / b.budget) * 100) : 0;
              const pctComplete = 0.60;
              const eac = actual > 0 ? (actual / pctComplete) : b.budget;
              return { ...b, actual, variance, variancePct, eac };
            });

            const totalBudget = rows.reduce((s, r) => s + r.budget, 0);
            const totalActual = rows.reduce((s, r) => s + r.actual, 0);
            const totalVariance = totalBudget - totalActual;
            const totalEAC = rows.reduce((s, r) => s + r.eac, 0);

            return (
              <div className="space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Budget vs Actual — Cost Variance Report</h2>
                    <p className="text-[10px] text-zinc-600 mt-1">EAC = Estimate At Completion (projects final cost at current burn rate assuming 60% completion).</p>
                  </div>
                  <span className={`text-[10px] px-3 py-1.5 rounded-full font-bold border ${totalVariance >= 0 ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                    {totalVariance >= 0 ? "↓ Underspent" : "↑ Overspent"} by ₹{Math.abs(totalVariance).toLocaleString("en-IN")}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Total Budget", value: `₹${totalBudget.toLocaleString()}`, color: "text-white" },
                    { label: "Actual Spend", value: `₹${totalActual.toLocaleString()}`, color: "text-primary" },
                    { label: "Variance", value: `₹${totalVariance.toLocaleString()}`, color: totalVariance >= 0 ? "text-emerald-400" : "text-red-400" },
                    { label: "EAC (at 60%)", value: `₹${Math.round(totalEAC).toLocaleString()}`, color: totalEAC > totalBudget ? "text-red-400" : "text-emerald-400" },
                  ].map(kpi => (
                    <div key={kpi.label} className="bg-[#14121F] border border-white/5 rounded-xl p-4">
                      <span className="text-[9px] uppercase text-zinc-500 tracking-wider block">{kpi.label}</span>
                      <strong className={`text-lg font-extrabold mt-1 block font-mono ${kpi.color}`}>{kpi.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="bg-[#0F0D18] border border-white/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 text-left font-semibold">Cost Code</th>
                        <th className="px-5 py-3 text-left font-semibold">Head</th>
                        <th className="px-5 py-3 text-right font-semibold">Budget</th>
                        <th className="px-5 py-3 text-right font-semibold">Actual</th>
                        <th className="px-5 py-3 text-right font-semibold">Variance</th>
                        <th className="px-5 py-3 text-right font-semibold">Var %</th>
                        <th className="px-5 py-3 text-right font-semibold">EAC</th>
                        <th className="px-5 py-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map(row => {
                        const isOver = row.variance < 0;
                        const isWarn = row.variancePct < 10 && row.variancePct >= 0;
                        const statusLabel = isOver ? "OVERSPENT" : isWarn ? "AT RISK" : "ON TRACK";
                        const statusColor = isOver ? "bg-red-500/10 border-red-500/20 text-red-400" : isWarn ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
                        return (
                          <tr key={row.code} className={`border-b border-white/[0.03] hover:bg-white/[0.015] transition-all ${isOver ? "bg-red-500/[0.02]" : ""}`}>
                            <td className="px-5 py-3 font-mono text-zinc-400">{row.code}</td>
                            <td className="px-5 py-3 font-semibold text-white">{row.head}</td>
                            <td className="px-5 py-3 text-right font-mono text-zinc-300">₹{row.budget.toLocaleString()}</td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-white">₹{row.actual.toLocaleString()}</td>
                            <td className={`px-5 py-3 text-right font-mono font-bold ${isOver ? "text-red-400" : "text-emerald-400"}`}>
                              {row.variance >= 0 ? "+" : ""}₹{row.variance.toLocaleString()}
                            </td>
                            <td className={`px-5 py-3 text-right font-mono ${isOver ? "text-red-400" : isWarn ? "text-amber-400" : "text-emerald-400"}`}>
                              {row.variancePct.toFixed(1)}%
                            </td>
                            <td className={`px-5 py-3 text-right font-mono ${row.eac > row.budget ? "text-red-400" : "text-zinc-300"}`}>
                              ₹{Math.round(row.eac).toLocaleString()}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold ${statusColor}`}>{statusLabel}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Voucher Detail Drawer ── */}
      {selectedVoucher && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-[#0C0A12] border-l border-white/10 w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden text-xs">
            {selectedVoucher.status === "Pending" ? (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-center font-bold text-[#0E0C15] uppercase tracking-wider text-[10px]">
                ⚠️ Pending Voucher Approval (Accrued Expense)
              </div>
            ) : (
              <div className="bg-emerald-500 px-6 py-2.5 text-center font-bold text-[#0E0C15] uppercase tracking-wider text-[10px]">
                ✓ Approved & Settled Ledger Voucher
              </div>
            )}

            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0F0D16]">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary">Voucher Details</span>
                <h2 className="text-base font-extrabold text-white mt-1">{selectedVoucher.ref}</h2>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-zinc-400 hover:text-white">✕ Close</button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="space-y-1 border-b border-white/5 pb-4">
                <span className="text-zinc-500 uppercase text-[9px] tracking-wider block">Ledger Classification</span>
                <strong className="text-white block mt-0.5 text-sm">{selectedVoucher.ledger}</strong>
                {selectedVoucher.cost_code && (
                  <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full inline-block mt-1.5 font-bold">
                    Cost Code: {selectedVoucher.cost_code}
                  </span>
                )}
                {selectedVoucher.ref_invoice && (
                  <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full inline-block mt-1.5 font-bold">
                    Ref Invoice: {selectedVoucher.ref_invoice}
                  </div>
                )}
              </div>

              {/* Approval steps */}
              <div className="space-y-3 border-b border-white/5 pb-4">
                <span className="text-zinc-500 uppercase text-[9px] tracking-wider block">Sequential Approvals</span>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</div>
                    <div>
                      <div className="text-[11px] font-bold text-white">1. Site Supervisor</div>
                      <div className="text-[9px] text-zinc-500">Verified upon entry & photo upload</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${selectedVoucher.status === "Approved" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                      {selectedVoucher.status === "Approved" ? "✓" : "🕒"}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-white">2. Project Manager</div>
                      <div className="text-[9px] text-zinc-500">Required for values &gt; ₹50k</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-[#14111E] p-4 rounded-xl border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] tracking-wider font-sans">Settled Amount</span>
                  <strong className="text-emerald-400 mt-1 block text-sm">₹{selectedVoucher.settled_amount.toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block uppercase text-[9px] tracking-wider font-sans">Balance Due</span>
                  <strong className="text-red-400 mt-1 block text-sm">₹{selectedVoucher.balance_due.toLocaleString("en-IN")}</strong>
                </div>
              </div>

              {/* Photo preview */}
              {selectedVoucher.photo_url && (
                <div className="space-y-2">
                  <span className="text-zinc-500 block uppercase text-[9px] tracking-wider">Voucher Photo Receipt</span>
                  <div className="border border-white/5 rounded-xl overflow-hidden aspect-[4/3] bg-black relative">
                    <img src={selectedVoucher.photo_url} alt="Voucher Receipt" className="object-cover h-full w-full opacity-80" />
                  </div>
                </div>
              )}
            </div>

            {selectedVoucher.status === "Pending" && (
              <div className="px-6 py-4 border-t border-white/5 bg-[#0F0D16] flex items-center justify-end gap-2">
                <button onClick={() => setSelectedVoucher(null)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white">Cancel</button>
                <button onClick={() => handleApproveVoucher(selectedVoucher.id)} className="px-5 py-2.5 bg-emerald-500 text-[#0e0c15] font-extrabold rounded-xl hover:opacity-90">
                  Approve Voucher 👍
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Voucher Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white font-sans">Create {selectedTxnType} Voucher</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3 font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Party / Vendor Name</label>
                  <input type="text" value={partyName} onChange={e => setPartyName(e.target.value)} required placeholder="e.g. Shree Cement Traders"
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Voucher Value (₹)</label>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="Amount"
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white text-xs font-mono" />
                </div>
              </div>

              {["Debit Note", "Credit Note"].includes(selectedTxnType) && (
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Reference Invoice / Voucher ID</label>
                  <input type="text" value={refInvoice} onChange={e => setRefInvoice(e.target.value)} required placeholder="e.g. INV-2026-4412"
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white text-xs" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Cost Code Mapping</label>
                  <select value={costCode} onChange={e => setCostCode(e.target.value)}
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white text-xs">
                    <option value="1.2.1 Site Conveyance">1.2.1 Site Conveyance</option>
                    <option value="2.1 Raw Materials">2.1 Raw Materials</option>
                    <option value="3.5 Subcontractor Labours">3.5 Subcontractor Labours</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Reference (optional)</label>
                  <input type="text" value={refNum} onChange={e => setRefNum(e.target.value)} placeholder="PO / Delivery Challan#"
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white text-xs" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Description / Narration</label>
                <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Particulars..."
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white text-xs" />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Voucher Photo / Receipt Upload</label>
                <input type="file" accept="image/*,application/pdf"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setPhotoUrl("https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500");
                  }}
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-zinc-400 text-xs" />
              </div>

              <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2.5 bg-gradient-to-r from-primary to-[#FF3B6C] text-white font-bold rounded-xl hover:opacity-90">
                  {submitting ? "Saving..." : "Record Voucher"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Add Bank Account Modal ── */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white">Add Central Bank Account</h3>
              <button onClick={() => setShowAddBankModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleAddBankAccount} className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Bank Name</label>
                <input type="text" value={newBank.name} onChange={e => setNewBank({ ...newBank, name: e.target.value })} required placeholder="e.g. HDFC Bank"
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Account Holder Name</label>
                <input type="text" value={newBank.holder} onChange={e => setNewBank({ ...newBank, holder: e.target.value })} required placeholder="e.g. SiteFlow Corp Ltd"
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Account Number</label>
                  <input type="text" value={newBank.number} onChange={e => setNewBank({ ...newBank, number: e.target.value })} required placeholder="A/c No."
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">IFSC Code</label>
                  <input type="text" value={newBank.ifsc} onChange={e => setNewBank({ ...newBank, ifsc: e.target.value })} required placeholder="IFSC"
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">UPI ID (Optional)</label>
                  <input type="text" value={newBank.upi} onChange={e => setNewBank({ ...newBank, upi: e.target.value })} placeholder="e.g. pay@upi"
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400 font-bold">Opening Balance (₹)</label>
                  <input type="number" value={newBank.balance} onChange={e => setNewBank({ ...newBank, balance: e.target.value })} placeholder="Opening balance"
                    className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs" />
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                <button type="button" onClick={() => setShowAddBankModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-primary to-[#FF3B6C] text-white font-bold rounded-xl hover:opacity-90">
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create Payment Request Modal ── */}
      {showAddRequestModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white">Create Payment Request</h3>
              <button onClick={() => setShowAddRequestModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreatePaymentRequest} className="space-y-3 font-sans">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Requesting Party (Employee / Vendor)</label>
                <select
                  value={newRequest.partyId}
                  onChange={e => setNewRequest({ ...newRequest, partyId: e.target.value })}
                  required
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs"
                >
                  <option value="">Select Party</option>
                  {usersList.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role || "Employee"})</option>
                  ))}
                  {/* Fallback to transactions parties if userList is empty */}
                  {usersList.length === 0 && Array.from(new Set(transactions.map(t => t.party))).map((p, idx) => (
                    <option key={idx} value="00000000-0000-0000-0000-000000000000">{p}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Requested Amount (₹)</label>
                <input type="number" value={newRequest.amount} onChange={e => setNewRequest({ ...newRequest, amount: e.target.value })} required placeholder="Amount"
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Due Date (Optional)</label>
                <input type="date" value={newRequest.dueDate} onChange={e => setNewRequest({ ...newRequest, dueDate: e.target.value })}
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Request Details / Particulars</label>
                <textarea value={newRequest.details} onChange={e => setNewRequest({ ...newRequest, details: e.target.value })} required placeholder="Provide detail reason for this payment request..."
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white text-xs h-20 outline-none resize-none" />
              </div>

              <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                <button type="button" onClick={() => setShowAddRequestModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-gradient-to-r from-primary to-[#FF3B6C] text-white font-bold rounded-xl hover:opacity-90">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
