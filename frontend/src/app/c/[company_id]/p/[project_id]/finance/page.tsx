"use client";
import { getApiHost } from "@/lib/api";

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
    id: "TXN-00", 
    date: "2026-07-02", 
    type: "Receipt", 
    category: "Salary Advance", 
    description: "Opening Balance Advance Paid", 
    amount: 8000, 
    party: "Yash Desai", 
    ref: "OP-BAL-001", 
    ledger: "Loans & Advances",
    status: "Approved",
    cost_code: "6.1 Staff Salary",
    settled_amount: 8000,
    balance_due: 8000
  },
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
  const [selectedTxnType, setSelectedTxnType] = useState<any>("Expense");
  const [amount, setAmount] = useState("");
  const [partyName, setPartyName] = useState("");
  const [refNum, setRefNum] = useState("");
  const [refInvoice, setRefInvoice] = useState("");
  const [desc, setDesc] = useState("");
  const [costCode, setCostCode] = useState("1.2.1 Site Conveyance");
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");

  // Dynamic Transaction Options matching competitor UI
  const [addQtyRate, setAddQtyRate] = useState(false);
  const [qty, setQty] = useState(1);
  const [rate, setRate] = useState(0);
  const [enableGst, setEnableGst] = useState(true);
  const [gstPercent, setGstPercent] = useState("18");
  const [items, setItems] = useState<{ id: string; name: string; qty: number; unit: string; rate: number }[]>([]);
  const [discount, setDiscount] = useState(0);
  const [addCharges, setAddCharges] = useState(0);
  const [roundOff, setRoundOff] = useState(false);
  const [billToShipTo, setBillToShipTo] = useState("Pune Site Office Address");

  // Transfer & Sub-form state variables
  const [transferType, setTransferType] = useState<"Bank To Bank" | "Cash Deposit" | "Cash Withdraw">("Bank To Bank");
  const [fromBank, setFromBank] = useState("Main Savings Account");
  const [toBank, setToBank] = useState("Petty Cash Account");
  const [paymentFromParty, setPaymentFromParty] = useState("");
  const [paymentToParty, setPaymentToParty] = useState("");
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQty, setNewItemQty] = useState("50");
  const [newItemUnit, setNewItemUnit] = useState("Bags");
  const [newItemRate, setNewItemRate] = useState("420");
  const [newItemGst, setNewItemGst] = useState("18");

  // Equipment & Material Transfer fields
  const [paidAmount, setPaidAmount] = useState("0");
  const [deduction, setDeduction] = useState("0");
  const [ewayBill, setEwayBill] = useState("");
  const [vehicleNo, setVehicleNo] = useState("");
  const [transferOutNo, setTransferOutNo] = useState("0");

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

  // Party Master-Detail & Side-drawer States
  const [selectedParty, setSelectedParty] = useState<string>("Yash Desai");
  const [showOpeningBalanceDrawer, setShowOpeningBalanceDrawer] = useState(false);
  const [openingBalanceType, setOpeningBalanceType] = useState<"pay" | "receive">("pay");
  const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({ "Yash Desai": 8000 });
  const [tempAmt, setTempAmt] = useState("8000");
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [partyFilter, setPartyFilter] = useState("Active");

  const fetchData = async () => {
    try {
      const plRes = await fetch(`${getApiHost()}/apis/v3/finance/pl?project_id=${projectId}`);
      if (plRes.ok) {
        setPlData(await plRes.json());
      }
      const tallyRes = await fetch(`${getApiHost()}/apis/v3/tally/connections?company_id=${companyId}`);
      if (tallyRes.ok) {
        const data = await tallyRes.json();
        setTallyConn(data);
        setTallyCompany(data.tally_company_name);
        setTallyMobile(data.registered_mobile);
      }
      // Fetch Bank Accounts
      const bankRes = await fetch(`${getApiHost()}/apis/v3/finance/accounts/${companyId}`);
      if (bankRes.ok) {
        setBankAccounts(await bankRes.json());
      }
      // Fetch Payment Requests
      const reqRes = await fetch(`${getApiHost()}/apis/v3/finance/payment-requests/${companyId}`);
      if (reqRes.ok) {
        setPaymentRequests(await reqRes.json());
      }
      // Fetch Employees for party dropdown
      const empRes = await fetch(`${getApiHost()}/apis/v3/hr/employees/${projectId}`);
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
    const paymentType = selectedTxnType === "Receipt" ? "in" : "out";

    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/finance/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          payment_type: paymentType,
          amount: amtVal,
          payment_method: "Cash",
          reference_number: refNum || `ONS-V-${Date.now().toString().slice(-4)}`,
          description: desc || `Recorded ${selectedTxnType} voucher`,
          payment_date: new Date().toISOString()
        }),
      });

      const newTxn: Transaction = {
        id: res.ok ? `TXN-${Date.now()}` : `TXN-${Date.now()}-local`,
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
    } catch (err) {
      console.error("Failed to record payment", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveVoucher = async (id: string) => {
    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/finance/approve/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(prev => prev.map(t => {
          if (t.id === id) {
            return { ...t, status: "Approved" as const, settled_amount: t.amount, balance_due: 0 };
          }
          return t;
        }));
        if (selectedVoucher?.id === id) {
          setSelectedVoucher({ ...selectedVoucher, status: "Approved" as const, settled_amount: selectedVoucher.amount, balance_due: 0 });
        }
      } else {
        console.error("Approval failed:", res.status);
      }
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/finance/accounts/${companyId}`, {
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
      const res = await fetch(`${getApiHost()}/apis/v3/finance/payment-requests/${companyId}`, {
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
    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/tally/sync?company_id=${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      if (res.ok) {
        const data = await res.json();
        setSyncLogs([
          `[${new Date().toLocaleTimeString()}] Handshake successful with Tally Gateway.`,
          `[${new Date().toLocaleTimeString()}] ${data.message || "Pushed approved vouchers successfully."}`,
        ]);
      } else {
        setSyncLogs([
          `[${new Date().toLocaleTimeString()}] Sync failed: HTTP ${res.status}`,
        ]);
      }
    } catch (err) {
      setSyncLogs([
        `[${new Date().toLocaleTimeString()}] Sync error: Network unavailable`,
      ]);
    } finally {
      setLastSync(new Date().toLocaleString());
      setSyncing(false);
    }
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
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 border-r border-border-custom bg-card flex flex-col">
        <div className="px-5 py-4 flex items-center gap-2.5 border-b border-border-custom">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr bg-primary font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 space-y-1 overflow-y-auto">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-muted hover:text-foreground hover:bg-white/[0.03] rounded-lg transition-all">← Dashboard</Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-muted uppercase tracking-wider">Finance</div>
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
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${tab === item.key ? "bg-primary/10 text-white font-semibold shadow-sm" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border-custom bg-background px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white">
              {tab === "ledger" ? "Accrual Ledger" : tab === "party" ? "Party-wise Ledgers" : tab === "payment_requests" ? "Payment Requests Ledger" : tab === "accounts" ? "Company Cash & Bank Accounts" : tab === "cashbook" ? "Cash Book (Bank Ledger)" : tab === "pl" ? "Project P&L" : tab === "tally" ? "Tally Sync Gateway" : "Cost Variance Report"}
            </h1>
            <p className="text-[10px] text-muted">Real-time sequential approval tracking & running balance ledger</p>
          </div>
          <div className="flex items-center gap-4 relative">
            {/* Unbilled Materials Badge */}
            <div className="hidden sm:flex items-center gap-1.5 cursor-pointer hover:bg-elevated/40 px-2.5 py-1.5 rounded-lg border border-border-custom/50">
              <span className="text-xs">🛒</span>
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Unbilled Materials</span>
              <span className="bg-primary/20 text-primary border border-primary/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">0</span>
            </div>

            {/* Pending Entries Badge */}
            <div className="hidden sm:flex items-center gap-1.5 cursor-pointer hover:bg-elevated/40 px-2.5 py-1.5 rounded-lg border border-border-custom/50">
              <span className="text-xs">🕒</span>
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider">Pending Entries</span>
              <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] font-bold px-1.5 py-0.5 rounded-full">0</span>
            </div>

            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer">
              Create Transaction +
            </button>
            {isDropdownOpen && (
              <div className="absolute right-0 mt-14 w-80 bg-card/95 backdrop-blur-md border border-border-custom rounded-lg shadow-2xl p-5 z-50 space-y-4 text-left max-h-[420px] overflow-y-auto">
                <div>
                  <div className="text-[9px] font-bold text-success uppercase tracking-widest border-b border-border-custom pb-1 mb-2">Payment</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {["Payment In", "Payment Out", "Debit Note", "Credit Note", "Party to Party", "Internal Transfer", "Upload Payments"].map(type => (
                      <button key={type} onClick={() => { setSelectedTxnType(type as any); setPartyName(""); setIsDropdownOpen(false); setShowAddModal(true); }}
                        className="py-1 px-2 text-left rounded-lg text-muted hover:text-success hover:bg-success/10 transition-all text-xs cursor-pointer font-semibold">
                        + {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-bold text-primary uppercase tracking-widest border-b border-border-custom pb-1 mb-2">Sales</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {["Sales Invoice", "Material Sales"].map(type => (
                      <button key={type} onClick={() => { setSelectedTxnType(type as any); setPartyName(""); setIsDropdownOpen(false); setShowAddModal(true); }}
                        className="py-1 px-2 text-left rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-all text-xs cursor-pointer font-semibold">
                        + {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="text-[9px] font-bold text-primary uppercase tracking-widest border-b border-border-custom pb-1 mb-2">Expense</div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    {["Material Purchase", "Material Return", "Material Transfer", "Sub Con Bill", "Other Expense", "Equipment Expense"].map(type => (
                      <button key={type} onClick={() => { setSelectedTxnType(type as any); setPartyName(""); setIsDropdownOpen(false); setShowAddModal(true); }}
                        className="py-1 px-2 text-left rounded-lg text-muted hover:text-primary hover:bg-primary/10 transition-all text-xs cursor-pointer font-semibold">
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
                  <div key={i} className="bg-card border border-border-custom rounded-lg rounded-md p-4 border border-border-custom bg-input">
                    <div className="text-[9px] text-muted uppercase tracking-wider">{s.label}</div>
                    <div className={`text-lg font-black mt-1 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Filters */}
              <div className="flex items-center gap-3 bg-input border border-border-custom rounded-md px-4 py-2.5">
                <input type="text" placeholder="Search party, voucher#, cost code..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="flex-1 bg-elevated border border-border-custom rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary" />
              </div>

              {/* Main Ledger Table */}
              <div className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom bg-input overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
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
                              <td className="px-5 py-3 text-muted font-mono">{t.date}</td>
                              <td className="px-5 py-3 text-white font-bold">{t.ref}</td>
                              <td className="px-5 py-3 text-muted">
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${isCredit ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>{t.type}</span>
                              </td>
                              <td className="px-5 py-3 text-zinc-300 font-medium">{t.party}</td>
                              <td className="px-5 py-3 text-muted line-clamp-1 max-w-[150px]">{t.description}</td>
                              <td className="px-5 py-3">
                                <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${t.status === "Approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"}`}>
                                  {t.status === "Approved" ? "✓ APPROVED" : "🕒 PENDING"}
                                </span>
                              </td>
                              <td className={`px-5 py-3 text-right font-extrabold font-sans ${isCredit ? "text-emerald-400" : "text-red-400"}`}>
                                {isCredit ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
                              </td>
                              <td className="px-5 py-3 text-right font-sans text-muted">
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

          {/* ── PARTY LEDGERS TAB (MASTER-DETAIL SPLIT LAYOUT) ── */}
          {tab === "party" && (
            <div className="space-y-6 relative h-full flex flex-col">
              {/* Four Cards Metrics Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Advance Paid */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block">Advance Paid</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">
                      ₹{Object.values(openingBalances).reduce((s, v) => s + v, 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 z-10">
                    ↗
                  </div>
                </div>

                {/* To Pay */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block">To Pay</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">
                      ₹{(openingBalanceType === "receive" ? Object.values(openingBalances).reduce((s, v) => s + v, 0) : 0).toLocaleString("en-IN")}
                    </strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 z-10">
                    ↑
                  </div>
                </div>

                {/* To Receive */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block">To Receive</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹0</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 z-10">
                    ↓
                  </div>
                </div>

                {/* Advance Received */}
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block">Advance Received</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹0</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 z-10">
                    ↙
                  </div>
                </div>
              </div>

              {/* Master-Detail Split Screen Container */}
              <div className="flex flex-1 gap-6 min-h-[500px]">
                {/* Master Panel: Left Party List (1/3 Width) */}
                <div className="w-full lg:w-1/3 bg-card border border-border-custom rounded-lg flex flex-col overflow-hidden">
                  {/* Search and Filters Header */}
                  <div className="p-4 border-b border-border-custom space-y-3">
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search parties..."
                        value={partySearchQuery}
                        onChange={(e) => setPartySearchQuery(e.target.value)}
                        className="w-full bg-input border border-border-custom rounded-md py-1.5 pl-8 pr-3 text-xs text-foreground placeholder-muted focus:outline-none focus:border-primary transition-all"
                      />
                      <span className="absolute left-2.5 top-2 text-muted text-xs">🔍</span>
                    </div>

                    <div className="flex gap-2">
                      <button className="flex-1 py-1 px-3 border border-border-custom hover:bg-elevated rounded text-[11px] font-medium text-foreground transition-all flex items-center justify-center gap-1">
                        <span>⏳</span> Filter
                      </button>
                      <select
                        value={partyFilter}
                        onChange={(e) => setPartyFilter(e.target.value)}
                        className="flex-1 py-1 px-2 border border-border-custom bg-card hover:bg-elevated rounded text-[11px] font-medium text-foreground focus:outline-none cursor-pointer"
                      >
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                  </div>

                  {/* Party List */}
                  <div className="flex-1 overflow-y-auto divide-y divide-border-custom/40">
                    {partyLedgers
                      .filter(p => p.party.toLowerCase().includes(partySearchQuery.toLowerCase()))
                      .map(p => {
                        const isSelected = selectedParty === p.party;
                        const displayBal = openingBalances[p.party] !== undefined ? openingBalances[p.party] : p.net_due;
                        
                        return (
                          <div
                            key={p.party}
                            onClick={() => setSelectedParty(p.party)}
                            className={`p-4 flex items-center justify-between cursor-pointer transition-all ${
                              isSelected ? "bg-primary/5 border-l-2 border-primary" : "hover:bg-elevated/40"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                                {p.party.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-foreground">{p.party}</h4>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium mt-1 inline-block">
                                  {p.party === "Yash Desai" ? "Staff" : "Vendor"}
                                </span>
                              </div>
                            </div>
                            <div className="text-right space-y-1">
                              <div className="text-xs font-bold text-foreground">
                                ₹{displayBal.toLocaleString("en-IN")}
                              </div>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider block ${
                                displayBal > 0 
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-zinc-500/10 text-muted"
                              }`}>
                                {displayBal > 0 ? "I have Advance" : "No Due"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Detail Panel: Right Details (2/3 Width) */}
                <div className="flex-1 bg-card border border-border-custom rounded-lg flex flex-col overflow-hidden relative p-6">
                  {(() => {
                    const activeP = partyLedgers.find(p => p.party === selectedParty) || partyLedgers[0];
                    if (!activeP) return <div className="text-xs text-muted">No Party Selected</div>;
                    
                    const netDueVal = openingBalances[activeP.party] !== undefined ? openingBalances[activeP.party] : activeP.net_due;
                    const isYash = activeP.party === "Yash Desai";
                    
                    return (
                      <div className="flex flex-col h-full justify-between">
                        {/* Upper Section */}
                        <div className="space-y-6">
                          {/* Header */}
                          <div className="flex justify-between items-start border-b border-border-custom/50 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                                {activeP.party.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h2 className="text-sm font-bold text-foreground">{activeP.party}</h2>
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium mt-1 inline-block">
                                  {isYash ? "Staff" : "Vendor"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <span className="text-[10px] text-muted block">Balance</span>
                                <strong className="text-sm font-bold text-foreground">
                                  ₹{netDueVal.toLocaleString("en-IN")}
                                </strong>
                              </div>
                              <button className="p-1.5 border border-border-custom rounded hover:bg-elevated text-xs">
                                📥
                              </button>
                            </div>
                          </div>

                          {/* Inner Metric Header Strip */}
                          <div className="grid grid-cols-3 gap-4 border-b border-border-custom/50 pb-5">
                            <div>
                              <span className="text-[10px] text-muted block">Opening</span>
                              <strong className="text-xs font-semibold text-foreground">
                                ₹{netDueVal.toLocaleString("en-IN")}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted block">Petty Cash Balance</span>
                              <strong className="text-xs font-semibold text-foreground">
                                ₹{isYash ? "8,000" : "0"}
                              </strong>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted block">Salary Balance</span>
                              <strong className="text-xs font-semibold text-foreground">₹0</strong>
                            </div>
                          </div>

                          {/* Party Detail Options Lists */}
                          <div className="space-y-3">
                            {/* Option 1: Profile */}
                            <div className="p-4 border border-border-custom rounded-lg bg-input/50 flex justify-between items-center hover:bg-elevated/20 transition-all cursor-pointer">
                              <div className="flex items-center gap-3">
                                <span className="text-sm">👤</span>
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground">Party Profile</h5>
                                  <span className="text-[10px] text-muted">{activeP.party}</span>
                                </div>
                              </div>
                              <span className="text-xs text-muted">➔</span>
                            </div>

                            {/* Option 2: Opening Balance Trigger */}
                            <div
                              onClick={() => {
                                setTempAmt(String(netDueVal));
                                setShowOpeningBalanceDrawer(true);
                              }}
                              className="p-4 border border-border-custom rounded-lg bg-input/50 flex justify-between items-center hover:bg-elevated/20 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm">💵</span>
                                <div>
                                  <h5 className="text-xs font-semibold text-foreground">Opening Balance</h5>
                                  <span className="text-[10px] text-muted">₹{netDueVal.toLocaleString("en-IN")}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-primary font-bold">
                                  {openingBalanceType === "pay" ? "Party Will Pay" : "Party Will Get"}
                                </span>
                                <span className="text-xs text-muted">➔</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Actions bar at bottom */}
                        <div className="flex gap-4 border-t border-border-custom/50 pt-4 mt-8">
                          <button className="flex-1 py-3 px-4 rounded bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-sm transition-all text-center">
                            + Payment In
                          </button>
                          <button className="flex-1 py-3 px-4 rounded bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold shadow-sm transition-all text-center">
                            - Payment Out
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Sliding Right-side Drawer for Opening Balance */}
              {showOpeningBalanceDrawer && (
                <>
                  {/* Backdrop */}
                  <div
                    onClick={() => setShowOpeningBalanceDrawer(false)}
                    className="fixed inset-0 bg-black/60 z-40 transition-opacity"
                  />
                  {/* Drawer Content */}
                  <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border-custom shadow-2xl z-50 p-6 flex flex-col justify-between animate-in slide-in-from-right duration-300">
                    <div className="space-y-6">
                      {/* Header */}
                      <div className="flex justify-between items-center border-b border-border-custom pb-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowOpeningBalanceDrawer(false)}
                            className="text-muted hover:text-foreground text-sm font-semibold pr-2"
                          >
                            ✕
                          </button>
                          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Opening Balance</h3>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => setShowOpeningBalanceDrawer(false)}
                            className="text-xs font-medium text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => {
                              setOpeningBalances(prev => ({ ...prev, [selectedParty]: parseInt(tempAmt) || 0 }));
                              setShowOpeningBalanceDrawer(false);
                            }}
                            className="px-3 py-1 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      {/* Pay/Receive Selection Option Buttons */}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setOpeningBalanceType("pay")}
                          className={`flex-1 py-3 px-4 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            openingBalanceType === "pay"
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border-custom hover:bg-elevated text-foreground"
                          }`}
                        >
                          <span className="h-4 w-4 rounded-full border-2 border-primary flex items-center justify-center p-0.5">
                            {openingBalanceType === "pay" && <span className="h-full w-full bg-primary rounded-full" />}
                          </span>
                          Party will pay
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpeningBalanceType("receive")}
                          className={`flex-1 py-3 px-4 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                            openingBalanceType === "receive"
                              ? "border-primary bg-primary/10 text-primary shadow-sm"
                              : "border-border-custom hover:bg-elevated text-foreground"
                          }`}
                        >
                          <span className="h-4 w-4 rounded-full border border-muted flex items-center justify-center p-0.5">
                            {openingBalanceType === "receive" && <span className="h-full w-full bg-primary rounded-full" />}
                          </span>
                          Party will receive
                        </button>
                      </div>

                      {/* Input Value */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          value={tempAmt}
                          onChange={(e) => setTempAmt(e.target.value)}
                          className="w-full bg-input border border-border-custom rounded-md p-3 text-sm font-semibold text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── CASH BOOK TAB ── */}
          {tab === "cashbook" && (
            <div className="space-y-4">
              <div className="text-xs text-muted">Double-entry book for all site bank accounts & cash boxes.</div>
              <div className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom bg-input overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Reference</th>
                      <th className="px-5 py-3">Narration (Particulars)</th>
                      <th className="px-5 py-3">Party</th>
                      <th className="px-5 py-3 text-right">Debit (Outflow)</th>
                      <th className="px-5 py-3 text-right">Credit (Inflow)</th>
                      <th className="px-5 py-3 text-right">Cash Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] font-sans">
                    {cashBookRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.015]">
                        <td className="px-5 py-3 text-muted">{row.date}</td>
                        <td className="px-5 py-3 text-white font-bold">{row.ref}</td>
                        <td className="px-5 py-3 text-zinc-300 font-sans">{row.narration}</td>
                        <td className="px-5 py-3 text-muted font-sans">{row.party}</td>
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
                <div className="text-xs text-muted">Record and track internal payment requests, milestone requests, and supplier payments.</div>
                <button
                  onClick={() => setShowAddRequestModal(true)}
                  className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-md cursor-pointer"
                >
                  + Create Payment Request
                </button>
              </div>

              <div className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom bg-input overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
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
                        <td colSpan={6} className="text-center p-8 text-muted">
                          No active payment requests found.
                        </td>
                      </tr>
                    ) : (
                      paymentRequests.map((req) => (
                        <tr key={req.id} className="border-t border-border-custom hover:bg-white/[0.015]">
                          <td className="px-5 py-3 text-muted font-mono">
                            {new Date(req.created_at).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-5 py-3 font-semibold text-white">{req.party_name}</td>
                          <td className="px-5 py-3 text-white font-bold font-sans">₹{req.amount.toLocaleString("en-IN")}</td>
                          <td className="px-5 py-3 text-muted">{req.details}</td>
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
                          <td className="px-5 py-3 text-muted font-mono">
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
                <div className="text-xs text-muted">List and manage central business bank accounts, UPI configurations, and cash balances.</div>
                <button
                  onClick={() => setShowAddBankModal(true)}
                  className="bg-primary hover:bg-primary/95 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all"
                >
                  + New Bank Account
                </button>
              </div>

              {/* Cash Account Section */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Cash Account</p>
                <div className="bg-card border border-border-custom rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-lg border border-green-500/20">
                      💵
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Cash Account</h4>
                      <p className="text-[10px] text-muted mt-0.5">Physical vault cash at site</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-base font-bold text-white">₹{netCashFlow.toLocaleString("en-IN")}</span>
                    <button className="px-3 py-1.5 bg-sidebar hover:bg-elevated border border-border-custom rounded-lg text-[10px] font-bold text-muted hover:text-foreground transition-all flex items-center gap-1">
                      View Statement <span className="text-[9px]">↗</span>
                    </button>
                    <span className="text-muted cursor-pointer hover:text-white">⋮</span>
                  </div>
                </div>
              </div>

              {/* Bank Accounts Section */}
              <div className="space-y-3">
                <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Bank Accounts</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {bankAccounts.length === 0 ? (
                    <div className="bg-card border border-border-custom rounded-xl p-8 text-center text-muted col-span-2 text-xs">
                      No bank accounts added yet. Click "+ New Bank Account" to configure one.
                    </div>
                  ) : (
                    bankAccounts.map((acc) => (
                      <div key={acc.id} className="bg-card border border-border-custom rounded-xl p-5 space-y-4 hover:shadow-md transition-all relative">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                              🏦
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                {acc.bank_name}
                                <span className="text-[8px] bg-primary/15 text-primary border border-primary/25 px-1.5 py-0.5 rounded-full font-bold">PRIMARY</span>
                              </div>
                              <div className="text-[10px] text-muted mt-0.5">A/C: {acc.account_number}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button className="px-3 py-1.5 bg-sidebar hover:bg-elevated border border-border-custom rounded-lg text-[10px] font-bold text-muted hover:text-foreground transition-all flex items-center gap-1">
                              View Statement <span className="text-[9px]">↗</span>
                            </button>
                            <span className="text-muted cursor-pointer hover:text-white font-bold p-1">⋮</span>
                          </div>
                        </div>

                        {/* Account Details Sub Grid */}
                        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-custom/50 text-[10px]">
                          <div>
                            <span className="text-muted block uppercase font-medium text-[8px] tracking-wider">AC Holder</span>
                            <span className="text-white font-semibold mt-0.5 block">{acc.account_holder_name || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted block uppercase font-medium text-[8px] tracking-wider">IFSC Code</span>
                            <span className="text-white font-semibold mt-0.5 block font-mono">{acc.ifsc_code || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted block uppercase font-medium text-[8px] tracking-wider">UPI</span>
                            <span className="text-white font-semibold mt-0.5 block">{acc.upi_id || "—"}</span>
                          </div>
                          <div>
                            <span className="text-muted block uppercase font-medium text-[8px] tracking-wider">IBAN No</span>
                            <span className="text-white font-semibold mt-0.5 block font-mono">Not provided</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted block uppercase font-medium text-[8px] tracking-wider">Opening Balance</span>
                            <span className="text-white font-bold mt-0.5 block text-xs">₹{acc.balance.toLocaleString("en-IN")}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                  <div key={i} className="bg-card border border-border-custom rounded-lg rounded-md p-5 border border-border-custom text-center bg-input">
                    <div className="text-[10px] text-muted uppercase tracking-wider">{s.label}</div>
                    <div className="text-2xl font-black mt-2">{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TALLY SYNC TAB ── */}
          {tab === "tally" && (
            <div className="space-y-5">
              <div className="bg-card border border-border-custom rounded-lg p-5 rounded-lg border border-border-custom bg-input space-y-4">
                <h2 className="text-sm font-bold text-white">Tally ERP 9 Gateway Sync</h2>
                <div className="text-xs text-muted">Push verified vouchers directly to Tally Desktop Agent via XML.</div>
                <div className="flex gap-2">
                  <button onClick={handleTriggerSync} disabled={syncing} className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-md hover:opacity-90">
                    {syncing ? "Pulsing Gateway Sync..." : "Sync Vouchers Now 🔄"}
                  </button>
                </div>
                {syncLogs.length > 0 && (
                  <div className="p-4 bg-black/40 border border-border-custom rounded-md text-[10px] font-sans text-muted space-y-1 max-h-36 overflow-y-auto">
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
                    <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Budget vs Actual — Cost Variance Report</h2>
                    <p className="text-[10px] text-muted mt-1">EAC = Estimate At Completion (projects final cost at current burn rate assuming 60% completion).</p>
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
                    <div key={kpi.label} className="bg-input border border-border-custom rounded-md p-4">
                      <span className="text-[9px] uppercase text-muted tracking-wider block">{kpi.label}</span>
                      <strong className={`text-lg font-extrabold mt-1 block font-mono ${kpi.color}`}>{kpi.value}</strong>
                    </div>
                  ))}
                </div>

                <div className="bg-background border border-border-custom rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border-custom text-muted">
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
                            <td className="px-5 py-3 font-sans text-muted">{row.code}</td>
                            <td className="px-5 py-3 font-semibold text-white">{row.head}</td>
                            <td className="px-5 py-3 text-right font-sans text-zinc-300">₹{row.budget.toLocaleString()}</td>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-background border-l border-border-custom w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden text-xs">
            {selectedVoucher.status === "Pending" ? (
              <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-2.5 text-center font-bold text-black uppercase tracking-wider text-[10px]">
                ⚠️ Pending Voucher Approval (Accrued Expense)
              </div>
            ) : (
              <div className="bg-emerald-500 px-6 py-2.5 text-center font-bold text-black uppercase tracking-wider text-[10px]">
                ✓ Approved & Settled Ledger Voucher
              </div>
            )}

            <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between bg-background">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary">Voucher Details</span>
                <h2 className="text-base font-extrabold text-white mt-1">{selectedVoucher.ref}</h2>
              </div>
              <button onClick={() => setSelectedVoucher(null)} className="text-muted hover:text-foreground">✕ Close</button>
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="space-y-1 border-b border-border-custom pb-4">
                <span className="text-muted uppercase text-[9px] tracking-wider block">Ledger Classification</span>
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
              <div className="space-y-3 border-b border-border-custom pb-4">
                <span className="text-muted uppercase text-[9px] tracking-wider block">Sequential Approvals</span>
                <div className="space-y-3 mt-2">
                  <div className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-[10px]">✓</div>
                    <div>
                      <div className="text-[11px] font-bold text-white">1. Site Supervisor</div>
                      <div className="text-[9px] text-muted">Verified upon entry & photo upload</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`h-5 w-5 rounded-full flex items-center justify-center font-bold text-[10px] ${selectedVoucher.status === "Approved" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-amber-500/10 border-amber-500/30 text-amber-400"}`}>
                      {selectedVoucher.status === "Approved" ? "✓" : "🕒"}
                    </div>
                    <div>
                      <div className="text-[11px] font-bold text-white">2. Project Manager</div>
                      <div className="text-[9px] text-muted">Required for values &gt; ₹50k</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-input p-4 rounded-md border border-border-custom text-xs font-mono">
                <div>
                  <span className="text-muted block uppercase text-[9px] tracking-wider font-sans">Settled Amount</span>
                  <strong className="text-emerald-400 mt-1 block text-sm">₹{selectedVoucher.settled_amount.toLocaleString("en-IN")}</strong>
                </div>
                <div>
                  <span className="text-muted block uppercase text-[9px] tracking-wider font-sans">Balance Due</span>
                  <strong className="text-red-400 mt-1 block text-sm">₹{selectedVoucher.balance_due.toLocaleString("en-IN")}</strong>
                </div>
              </div>

              {/* Photo preview */}
              {selectedVoucher.photo_url && (
                <div className="space-y-2">
                  <span className="text-muted block uppercase text-[9px] tracking-wider">Voucher Photo Receipt</span>
                  <div className="border border-border-custom rounded-md overflow-hidden aspect-[4/3] bg-black relative">
                    <img src={selectedVoucher.photo_url} alt="Voucher Receipt" className="object-cover h-full w-full opacity-80" />
                  </div>
                </div>
              )}
            </div>

            {selectedVoucher.status === "Pending" && (
              <div className="px-6 py-4 border-t border-border-custom bg-background flex items-center justify-end gap-2">
                <button onClick={() => setSelectedVoucher(null)} className="px-4 py-2 text-xs font-bold text-muted hover:text-foreground">Cancel</button>
                <button onClick={() => handleApproveVoucher(selectedVoucher.id)} className="px-5 py-2.5 bg-emerald-500 text-black font-extrabold rounded-md hover:opacity-90">
                  Approve Voucher 👍
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Voucher Drawer ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end animate-fade-in" onClick={() => setShowAddModal(false)}>
          <div className="bg-card w-full max-w-lg h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              {/* Dynamic Header */}
              <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedTxnType === "Upload Payments"
                      ? "ADD PAYMENT"
                      : selectedTxnType === "Equipment Expense"
                      ? "ADD EQUIPMENT EXPENSE"
                      : selectedTxnType === "Other Expense"
                      ? "ADD EXPENSE"
                      : selectedTxnType === "Material Transfer"
                      ? "MATERIAL TRANSFER"
                      : selectedTxnType === "Material Purchase"
                      ? "MATERIAL PURCHASE"
                      : selectedTxnType === "Material Sales"
                      ? "MATERIAL SALES"
                      : selectedTxnType}
                  </h3>
                  <p className="text-[10px] text-muted font-mono mt-0.5">PRESTIGE DEVELOPERS</p>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowAddModal(false)} className="text-xs text-muted hover:text-white transition-colors cursor-pointer">Cancel</button>
                  <button onClick={handleRecordPayment} className="bg-primary hover:bg-primary/90 text-white font-bold text-xs px-4 py-1.5 rounded-lg shadow transition-all cursor-pointer">Save</button>
                  {selectedTxnType === "Upload Payments" && (
                    <button type="button" className="bg-elevated border border-border-custom hover:bg-elevated/80 text-foreground font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all">Preview</button>
                  )}
                </div>
              </div>

              {/* Dynamic Form Content */}
              {selectedTxnType === "Upload Payments" ? (
                /* UPLOAD PAYMENTS SCREEN (Screenshot 2) */
                <div className="space-y-6 text-xs">
                  <div className="bg-elevated/45 border border-border-custom p-4 rounded-xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <span className="text-sm">ℹ️</span>
                      <div className="space-y-1">
                        <strong className="text-white block">How to import Excel/CSV in Onsite:</strong>
                        <ol className="list-decimal pl-4 space-y-1 text-muted leading-relaxed">
                          <li>Remove any unnecessary header rows from the Excel file.</li>
                          <li>
                            Ensure the column structure aligns with the{" "}
                            <span className="text-primary hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5">
                              Onsite Payment Request template 📥
                            </span>{" "}
                            (column names and order of columns need to match exactly with the sample file).
                          </li>
                          <li>Upload that file here.</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="border-2 border-dashed border-border-custom hover:border-primary/50 transition-all rounded-xl p-8 flex flex-col items-center justify-center bg-background cursor-pointer text-center space-y-2">
                    <span className="text-2xl text-primary">📤</span>
                    <strong className="text-white font-bold text-xs">Upload Csv</strong>
                    <span className="text-[9px] text-muted">Supports .csv, .xls, .xlsx formats up to 10MB</span>
                  </div>
                </div>
              ) : selectedTxnType === "Other Expense" ? (
                /* OTHER EXPENSES SCREEN (Screenshot 1) */
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <div>
                      <span className="text-muted text-[10px] font-bold uppercase block">Other Expenses</span>
                      <span className="text-white font-semibold font-mono">05 Jul 2026 #OE-1</span>
                    </div>
                    <span className="text-muted cursor-pointer hover:text-white">✏️</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={partyName}
                        onChange={e => setPartyName(e.target.value)}
                        placeholder="Search or select party..."
                        className="w-full bg-background border border-border-custom rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                      <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="addQtyRate"
                      checked={addQtyRate}
                      onChange={e => setAddQtyRate(e.target.checked)}
                      className="accent-primary h-3.5 w-3.5"
                    />
                    <label htmlFor="addQtyRate" className="text-muted font-bold select-none cursor-pointer">Add Quantity and Unit Rate</label>
                  </div>

                  {addQtyRate && (
                    <div className="grid grid-cols-2 gap-3 bg-background/25 border border-border-custom/50 rounded-lg p-3">
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1">Quantity</label>
                        <input
                          type="number"
                          value={qty}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setQty(val);
                            setAmount((val * rate).toString());
                          }}
                          className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] text-muted uppercase font-bold block mb-1">Unit Rate (₹)</label>
                        <input
                          type="number"
                          value={rate}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setRate(val);
                            setAmount((qty * val).toString());
                          }}
                          className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-white text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Tag Task</span>
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Tag Equipment</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Sub Total</label>
                    <input
                      type="number"
                      value={amount || "0"}
                      onChange={e => setAmount(e.target.value)}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="flex gap-4">
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Add Discount</span>
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Add Additional Charges</span>
                  </div>

                  <div className="space-y-2 border-t border-border-custom/50 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-muted font-bold select-none">
                        <input
                          type="checkbox"
                          checked={enableGst}
                          onChange={e => setEnableGst(e.target.checked)}
                          className="accent-primary h-3.5 w-3.5"
                        />
                        <span>Enable GST Percent</span>
                      </label>
                      {enableGst && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted">GST %</span>
                          <select
                            value={gstPercent}
                            onChange={e => setGstPercent(e.target.value)}
                            className="bg-background border border-border-custom rounded px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {enableGst && (
                      <div className="flex justify-between items-center bg-background/30 px-3 py-2 rounded-lg border border-border-custom/50">
                        <span className="text-[10px] text-muted uppercase font-bold">GST Amount (₹)</span>
                        <span className="font-mono text-white font-bold">
                          {(Number(amount || 0) * (Number(gstPercent) / 100)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-b border-border-custom/50 py-3 flex justify-between items-center cursor-pointer hover:bg-elevated/20 px-2 rounded-lg transition-colors">
                    <div>
                      <span className="text-muted block text-[9px] uppercase font-bold">Add Cost Code</span>
                      <span className="text-white font-semibold block text-xs mt-0.5">{costCode}</span>
                    </div>
                    <span className="text-muted text-xs">▶</span>
                  </div>

                  <div className="bg-elevated/20 border border-border-custom p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-muted uppercase font-bold block">Total Amount</span>
                      <strong className="text-white text-base font-mono block mt-0.5">
                        ₹{(Number(amount || 0) + (enableGst ? Number(amount || 0) * (Number(gstPercent) / 100) : 0)).toLocaleString("en-IN")}
                      </strong>
                    </div>
                    <span className="text-emerald-400 font-extrabold text-[10px] bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-500/20">AUTO CALCULATED</span>
                  </div>
                </div>
              ) : selectedTxnType === "Equipment Expense" ? (
                /* EQUIPMENT EXPENSE SCREEN (Screenshot 1 & 3) */
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <div>
                      <span className="text-muted text-[10px] font-bold uppercase block">Equipment Expense</span>
                      <span className="text-white font-semibold font-mono">05 Jul 2026 #EE-1</span>
                    </div>
                    <span className="text-muted cursor-pointer hover:text-white">✏️</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={partyName}
                        onChange={e => setPartyName(e.target.value)}
                        placeholder="Search or select party..."
                        className="w-full bg-background border border-border-custom rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                      <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Date Range</label>
                    <div className="bg-background border border-border-custom rounded-lg px-3 py-2 text-white flex justify-between items-center cursor-pointer hover:bg-elevated/20">
                      <span>05/07/2026 - 05/07/2026</span>
                      <span className="text-muted text-[10px]">▼</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="w-full py-2.5 border border-dashed border-primary/50 text-primary hover:bg-primary/5 font-bold rounded-lg text-xs transition-all"
                  >
                    + Add Equipment
                  </button>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Sub Total</label>
                      <input
                        type="number"
                        value={amount || "0"}
                        onChange={e => setAmount(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Add Discount</label>
                      <input
                        type="number"
                        value={discount || "0"}
                        onChange={e => setDiscount(Number(e.target.value))}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-border-custom/50 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer text-muted font-bold select-none">
                        <input
                          type="checkbox"
                          checked={enableGst}
                          onChange={e => setEnableGst(e.target.checked)}
                          className="accent-primary h-3.5 w-3.5"
                        />
                        <span>Enable GST Percent</span>
                      </label>
                      {enableGst && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted">GST %</span>
                          <select
                            value={gstPercent}
                            onChange={e => setGstPercent(e.target.value)}
                            className="bg-background border border-border-custom rounded px-2 py-1 text-xs text-white focus:outline-none"
                          >
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>
                      )}
                    </div>
                    {enableGst && (
                      <div className="flex justify-between items-center bg-background/30 px-3 py-2 rounded-lg border border-border-custom/50">
                        <span className="text-[10px] text-muted uppercase font-bold">GST Amount (₹)</span>
                        <span className="font-mono text-white font-bold">
                          {(Number(amount || 0) * (Number(gstPercent) / 100)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Total Amount</label>
                      <input
                        type="number"
                        readOnly
                        value={(Number(amount || 0) - discount + (enableGst ? Number(amount || 0) * (Number(gstPercent) / 100) : 0)).toFixed(0)}
                        className="w-full bg-background/50 border border-border-custom rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">+ Deduction</label>
                      <input
                        type="number"
                        value={deduction}
                        onChange={e => setDeduction(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Net Amount</label>
                      <div className="relative">
                        <input
                          type="number"
                          readOnly
                          value={(Number(amount || 0) - discount + (enableGst ? Number(amount || 0) * (Number(gstPercent) / 100) : 0) - Number(deduction)).toFixed(0)}
                          className="w-full bg-background/50 border border-border-custom rounded-lg px-3 py-2 text-white font-mono"
                        />
                        <div className="absolute right-2 top-2 flex items-center gap-1">
                          <input type="checkbox" id="roundOffCheck" checked={roundOff} onChange={e => setRoundOff(e.target.checked)} className="accent-primary" />
                          <label htmlFor="roundOffCheck" className="text-[8px] text-muted cursor-pointer font-bold">Round Off</label>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Paid Amount</label>
                      <input
                        type="number"
                        value={paidAmount}
                        onChange={e => setPaidAmount(e.target.value)}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Balance Due</label>
                    <input
                      type="number"
                      readOnly
                      value={Math.max(0, Number(amount || 0) - discount + (enableGst ? Number(amount || 0) * (Number(gstPercent) / 100) : 0) - Number(deduction) - Number(paidAmount)).toFixed(0)}
                      className="w-full bg-background/30 border border-border-custom rounded-lg px-3 py-2 text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Reference No.</label>
                    <input
                      type="text"
                      value={refNum}
                      onChange={e => setRefNum(e.target.value)}
                      placeholder="e.g. REF-EE-001"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div className="border border-border-custom rounded-xl p-3 bg-elevated/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-muted block text-[9px] uppercase font-bold">Add Cost Code</span>
                      <span className="text-white block font-semibold mt-0.5">{costCode}</span>
                    </div>
                    <span className="text-muted text-[10px]">▶</span>
                  </div>

                  <div className="border border-border-custom rounded-xl p-3 bg-elevated/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-muted block text-[9px] uppercase font-bold">Bill To/Ship To</span>
                      <span className="text-white block font-semibold mt-0.5">{billToShipTo}</span>
                    </div>
                    <span className="text-primary font-bold text-[10px] cursor-pointer" onClick={() => setBillToShipTo("Custom Site Address")}>+ Add</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Note (Optional)</label>
                    <textarea
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      rows={3}
                      placeholder="Add narration note..."
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs resize-none"
                    />
                  </div>

                  {/* Upload zone */}
                  <div className="border border-dashed border-border-custom hover:border-primary/50 transition-all rounded-lg p-5 flex flex-col items-center justify-center bg-background cursor-pointer">
                    <span className="text-base mb-1">📤</span>
                    <span className="text-[11px] text-muted font-medium">Upload Files</span>
                  </div>
                </div>
              ) : ["Material Sales", "Sales Invoice", "Material Purchase", "Material Return"].includes(selectedTxnType) ? (
                /* MATERIAL SALES / PURCHASES SCREEN (Screenshot 2) */
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <div>
                      <span className="text-muted text-[10px] font-bold uppercase block">
                        {["Material Sales", "Sales Invoice"].includes(selectedTxnType) ? "Client Party" : "Vendor Party"}
                      </span>
                      <span className="text-white font-semibold font-mono">05 Jul 2026 #MS-0</span>
                    </div>
                    <span className="text-muted cursor-pointer hover:text-white">✏️</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">
                      {["Material Sales", "Sales Invoice"].includes(selectedTxnType) ? "Client Name" : "Vendor Name"}
                    </label>
                    <input
                      type="text"
                      value={partyName}
                      onChange={e => setPartyName(e.target.value)}
                      placeholder="e.g. Skyline Towers PM, Sai Traders"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setNewItemName("");
                      setShowAddItemForm(true);
                    }}
                    className="w-full py-2.5 border border-dashed border-primary/50 text-primary hover:bg-primary/5 font-bold rounded-lg text-xs transition-all"
                  >
                    + Add Item
                  </button>

                  {items.length > 0 && (
                    <div className="border border-border-custom rounded-lg overflow-hidden bg-background/40">
                      <div className="bg-background/80 border-b border-border-custom px-3 py-1.5 flex justify-between text-[9px] uppercase font-bold text-muted">
                        <span>Item Name</span>
                        <span>Total (₹)</span>
                      </div>
                      <div className="divide-y divide-border-custom">
                        {items.map(item => (
                          <div key={item.id} className="p-3 flex justify-between items-center text-xs">
                            <div>
                              <span className="font-semibold text-white block">{item.name}</span>
                              <span className="text-[10px] text-muted">{item.qty} {item.unit} × ₹{item.rate}</span>
                            </div>
                            <span className="font-mono text-white font-bold">₹{(item.qty * item.rate).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 border-t border-border-custom/50 pt-3 font-sans">
                    <div className="flex justify-between">
                      <span className="text-muted">Item Subtotal</span>
                      <span className="font-mono text-white">₹{Number(amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Tax (GST {gstPercent}%)</span>
                      <span className="font-mono text-white">₹{(Number(amount || 0) * (Number(gstPercent) / 100)).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Discount</span>
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Additional Charges</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border-custom/40 pt-2">
                    <span className="text-xs font-bold text-white uppercase">Total Amount</span>
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer text-muted select-none">
                        <input
                          type="checkbox"
                          checked={roundOff}
                          onChange={e => setRoundOff(e.target.checked)}
                          className="accent-primary"
                        />
                        <span className="text-[10px]">Round Off</span>
                      </label>
                      <strong className="text-white text-base font-mono">
                        ₹{(Number(amount || 0) * (1 + Number(gstPercent) / 100)).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </strong>
                    </div>
                  </div>

                  <div className="border border-border-custom rounded-xl p-3 bg-elevated/10 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-muted block text-[9px] uppercase font-bold">Bill To / Ship To</span>
                      <span className="text-white block font-semibold mt-0.5">{billToShipTo}</span>
                    </div>
                    <button type="button" className="text-primary hover:underline font-bold text-[10px]">View</button>
                  </div>

                  {/* Upload zone */}
                  <div className="border border-dashed border-border-custom hover:border-primary/50 transition-all rounded-lg p-5 flex flex-col items-center justify-center bg-background cursor-pointer">
                    <span className="text-base mb-1">📤</span>
                    <span className="text-[11px] text-muted font-medium">Upload Files</span>
                  </div>
                </div>
              ) : selectedTxnType === "Material Transfer" ? (
                /* MATERIAL TRANSFER SCREEN (Screenshot 2) */
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <div>
                      <span className="text-muted text-[10px] font-bold uppercase block">Transfer Out No</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-white font-semibold font-mono">{transferOutNo}</span>
                        <span className="text-muted cursor-pointer hover:text-white" onClick={() => {
                          const val = prompt("Enter Transfer Out No:", transferOutNo);
                          if (val !== null) setTransferOutNo(val);
                        }}>✏️</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-muted text-[10px] font-bold uppercase block">Transfer Date</span>
                      <span className="text-white font-semibold font-mono">05 Jul 2026</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">From</label>
                    <input
                      type="text"
                      readOnly
                      value="Prestige Developers"
                      className="w-full bg-background/50 border border-border-custom rounded-lg px-3 py-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">To</label>
                    <select
                      value={paymentToParty}
                      onChange={e => setPaymentToParty(e.target.value)}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="">Select Project</option>
                      <option value="Skyline Premium Towers">Skyline Premium Towers</option>
                      <option value="Grand Orchard Villas">Grand Orchard Villas</option>
                    </select>
                  </div>

                  <div className="flex gap-4">
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Add Material</span>
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Additional Charges</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Total Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Reference no.</label>
                    <input
                      type="text"
                      value={refNum}
                      onChange={e => setRefNum(e.target.value)}
                      placeholder="e.g. TRF-REF-902"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">E Way Bill No.</label>
                    <input
                      type="text"
                      value={ewayBill}
                      onChange={e => setEwayBill(e.target.value)}
                      placeholder="e.g. 192837461928"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Vehicle No.</label>
                    <input
                      type="text"
                      value={vehicleNo}
                      onChange={e => setVehicleNo(e.target.value)}
                      placeholder="e.g. MH-12-PQ-1928"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Note (Optional)</label>
                    <textarea
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      rows={3}
                      placeholder="Transfer narration details..."
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs resize-none"
                    />
                  </div>
                </div>
              ) : selectedTxnType === "Internal Transfer" ? (
                /* INTERNAL TRANSFER LAYOUT (Screenshot 1) */
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <span className="text-muted text-[10px] font-bold uppercase">Transfer Date</span>
                    <span className="text-white font-semibold font-mono">2026-07-05</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Transfer Type</label>
                    <div className="flex gap-2">
                      {["Bank To Bank", "Cash Deposit", "Cash Withdraw"].map((t) => (
                        <label key={t} className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border cursor-pointer select-none transition-all ${transferType === t ? "border-primary bg-primary/10 text-primary font-bold animate-pulse" : "border-border-custom bg-background hover:bg-elevated/40 text-muted"}`}>
                          <input
                            type="radio"
                            name="transferType"
                            checked={transferType === t}
                            onChange={() => setTransferType(t as any)}
                            className="accent-primary"
                          />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {transferType === "Bank To Bank" && (
                    <>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">From Bank Account</label>
                        <select
                          value={fromBank}
                          onChange={e => setFromBank(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                        >
                          <option value="Main Savings Account">Main Savings Account (HDFC)</option>
                          <option value="Escrow Account">Escrow Account (SBI)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">To Bank Account</label>
                        <select
                          value={toBank}
                          onChange={e => setToBank(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                        >
                          <option value="Petty Cash Account">Petty Cash Account (HDFC)</option>
                          <option value="Escrow Account">Escrow Account (SBI)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {transferType === "Cash Deposit" && (
                    <>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">From</label>
                        <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg px-3 py-2.5">
                          <span className="text-white font-medium text-xs">Cash Account (Company Wallet)</span>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">₹ 0</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">To Bank Account</label>
                        <select
                          value={toBank}
                          onChange={e => setToBank(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                        >
                          <option value="Main Savings Account">Main Savings Account (HDFC)</option>
                          <option value="Escrow Account">Escrow Account (SBI)</option>
                        </select>
                      </div>
                    </>
                  )}

                  {transferType === "Cash Withdraw" && (
                    <>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">From Bank Account</label>
                        <select
                          value={fromBank}
                          onChange={e => setFromBank(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                        >
                          <option value="Main Savings Account">Main Savings Account (HDFC)</option>
                          <option value="Escrow Account">Escrow Account (SBI)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">To</label>
                        <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg px-3 py-2.5">
                          <span className="text-white font-medium text-xs">Cash Account (Company Wallet)</span>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold px-2 py-0.5 rounded-full font-mono">₹ 0</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Reference No</label>
                    <input
                      type="text"
                      value={refNum}
                      onChange={e => setRefNum(e.target.value)}
                      placeholder="e.g. TXN-1904"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Notes</label>
                    <textarea
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      rows={3}
                      placeholder="Narration notes..."
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs resize-none"
                    />
                  </div>

                  {/* Upload zone */}
                  <div className="border border-dashed border-border-custom hover:border-primary/50 transition-all rounded-lg p-5 flex flex-col items-center justify-center bg-background cursor-pointer">
                    <span className="text-base mb-1">📤</span>
                    <span className="text-[11px] text-muted font-medium">Upload Files</span>
                  </div>
                </div>
              ) : ["Debit Note", "Credit Note"].includes(selectedTxnType) ? (
                /* DEBIT / CREDIT NOTE (Screenshot 3) */
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <div>
                      <span className="text-muted text-[10px] font-bold uppercase block">Invoice No</span>
                      <span className="text-white font-semibold font-mono">{selectedTxnType === "Credit Note" ? "CN-1" : "DN-1"}</span>
                    </div>
                    <span className="text-muted cursor-pointer hover:text-white">✏️</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={partyName}
                        onChange={e => setPartyName(e.target.value)}
                        placeholder="Search or select party..."
                        className="w-full bg-background border border-border-custom rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                      <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
                    </div>
                  </div>

                  <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer block">+ New Item</span>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs font-mono font-bold"
                    />
                  </div>

                  <div className="bg-elevated/20 border border-border-custom p-4 rounded-xl flex justify-between items-center">
                    <span className="text-[10px] text-muted uppercase font-bold">Total Amount</span>
                    <strong className="text-white text-base font-mono">₹{Number(amount || 0).toLocaleString()}</strong>
                  </div>

                  <div className="flex gap-4">
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Tag Sales</span>
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Reference No</span>
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Notes</span>
                  </div>

                  {/* Upload zone */}
                  <div className="border border-dashed border-border-custom hover:border-primary/50 transition-all rounded-lg p-5 flex flex-col items-center justify-center bg-background cursor-pointer">
                    <span className="text-base mb-1">📤</span>
                    <span className="text-[11px] text-muted font-medium">Upload Files</span>
                  </div>
                </div>
              ) : selectedTxnType === "Party to Party" ? (
                /* PARTY TO PARTY PAYMENT (Screenshot 4) */
                <div className="space-y-4 text-xs">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <span className="text-muted text-[10px] font-bold uppercase">Date</span>
                    <span className="text-white font-semibold font-mono">2026-07-05</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Payment From</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={paymentFromParty}
                        onChange={e => setPaymentFromParty(e.target.value)}
                        placeholder="Search or select party to debit..."
                        className="w-full bg-background border border-border-custom rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                      <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Payment To</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={paymentToParty}
                        onChange={e => setPaymentToParty(e.target.value)}
                        placeholder="Search or select party to credit..."
                        className="w-full bg-background border border-border-custom rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                      <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Amount</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Description</label>
                    <textarea
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      rows={3}
                      placeholder="Describe transfer reason..."
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Add Cost Code</label>
                    <select
                      value={costCode}
                      onChange={e => setCostCode(e.target.value)}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="1.2.1 Site Conveyance">Select Cost Code</option>
                      <option value="1.2.1 Site Conveyance">1.2.1 Site Conveyance</option>
                      <option value="2.1 Raw Materials">2.1 Raw Materials</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Reference No.</label>
                    <input
                      type="text"
                      value={refNum}
                      onChange={e => setRefNum(e.target.value)}
                      placeholder="e.g. Reference transaction ID"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white text-xs"
                    />
                  </div>

                  <span className="text-[10px] text-muted hover:text-white cursor-pointer block">More Details (Optional) ▽</span>
                </div>
              ) : (
                /* DEFAULT PAYMENTS / STANDARD VOUCHER DRAWER */
                <form onSubmit={handleRecordPayment} className="space-y-4 text-xs font-sans">
                  <div className="flex justify-between items-center bg-background/50 border border-border-custom rounded-lg p-2.5">
                    <span className="text-muted text-[10px] font-bold uppercase">Payment Date</span>
                    <span className="text-white font-semibold font-mono">2026-07-05</span>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party Name*</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={partyName}
                        onChange={e => setPartyName(e.target.value)}
                        required
                        placeholder="Search or specify vendor party..."
                        className="w-full bg-background border border-border-custom rounded-lg pl-9 pr-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                      <span className="absolute left-3 top-2.5 text-muted text-xs">🔍</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Amount*</label>
                    <input
                      type="number"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      required
                      placeholder="0"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs font-mono text-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1.5">Payment Method</label>
                    <div className="flex gap-4">
                      {["Cash", "Bank Transfer", "Cheque"].map((m) => (
                        <label key={m} className="flex items-center gap-2 text-muted hover:text-white cursor-pointer select-none">
                          <input
                            type="radio"
                            name="paymentMethod"
                            defaultChecked={m === "Cash"}
                            className="accent-primary"
                          />
                          <span>{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Add Cost Code</label>
                    <select
                      value={costCode}
                      onChange={e => setCostCode(e.target.value)}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="1.2.1 Site Conveyance">Select Cost Code</option>
                      <option value="1.2.1 Site Conveyance">1.2.1 Site Conveyance (Conveyance)</option>
                      <option value="2.1 Raw Materials">2.1 Raw Materials (Cement/Steel)</option>
                      <option value="3.5 Subcontractor Labours">3.5 Subcontractor Labours</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Reference No.</label>
                    <input
                      type="text"
                      value={refNum}
                      onChange={e => setRefNum(e.target.value)}
                      placeholder="e.g. PO number, cheque details"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    />
                  </div>

                  {["Debit Note", "Credit Note"].includes(selectedTxnType) && (
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Reference Invoice ID*</label>
                      <input
                        type="text"
                        value={refInvoice}
                        onChange={e => setRefInvoice(e.target.value)}
                        required
                        placeholder="e.g. INV-2026-4412"
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer block mb-2">More Details (Optional) ▽</span>
                    <input
                      type="text"
                      value={desc}
                      onChange={e => setDesc(e.target.value)}
                      placeholder="Narration details..."
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Attachments</label>
                    <div className="border border-dashed border-border-custom hover:border-primary/50 transition-all rounded-lg p-5 flex flex-col items-center justify-center bg-background cursor-pointer">
                      <span className="text-base mb-1">📤</span>
                      <span className="text-[11px] text-muted font-medium">Upload Files</span>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Add Item Overlay (Screenshot 2) */}
            {showAddItemForm && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                <div className="bg-card border border-border-custom rounded-xl p-5 w-full max-w-sm space-y-4 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border-custom">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Add Item</h4>
                    <button type="button" onClick={() => setShowAddItemForm(false)} className="text-muted hover:text-white text-lg">✕</button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Item Name</label>
                      <input
                        type="text"
                        value={newItemName}
                        onChange={e => setNewItemName(e.target.value)}
                        placeholder="e.g. Cement Bags (Grade 53)"
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">Estimate Quantity</label>
                        <input
                          type="number"
                          value={newItemQty}
                          onChange={e => setNewItemQty(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">Unit</label>
                        <select
                          value={newItemUnit}
                          onChange={e => setNewItemUnit(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-2 py-2 text-white focus:outline-none"
                        >
                          <option value="Bags">Bags</option>
                          <option value="CFT">CFT</option>
                          <option value="MT">MT</option>
                          <option value="%">%</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">Rate Per Unit</label>
                        <input
                          type="number"
                          value={newItemRate}
                          onChange={e => setNewItemRate(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted uppercase font-bold block mb-1">GST %</label>
                        <select
                          value={newItemGst}
                          onChange={e => setNewItemGst(e.target.value)}
                          className="w-full bg-background border border-border-custom rounded-lg px-2 py-2 text-white focus:outline-none"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="12">12%</option>
                          <option value="18">18%</option>
                          <option value="28">28%</option>
                        </select>
                      </div>
                    </div>

                    <div className="border-t border-b border-border-custom/50 py-2 flex justify-between items-center cursor-pointer hover:bg-elevated/20 px-2 rounded">
                      <span className="text-[10px] text-muted uppercase font-bold">Add Cost Code</span>
                      <span className="text-muted text-[10px]">▶</span>
                    </div>

                    <div className="flex gap-4 pt-1">
                      <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ HSN/SAC</span>
                      <span className="text-[10px] text-primary hover:underline font-bold cursor-pointer">+ Description</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-border-custom">
                    <button
                      type="button"
                      onClick={() => setShowAddItemForm(false)}
                      className="px-3 py-1.5 bg-zinc-800 text-muted hover:text-white rounded-lg text-xs"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newItemName) return;
                        setItems([...items, {
                          id: `item-${Date.now()}`,
                          name: newItemName,
                          qty: Number(newItemQty),
                          unit: newItemUnit,
                          rate: Number(newItemRate)
                        }]);
                        setAmount((Number(newItemQty) * Number(newItemRate)).toString());
                        setShowAddItemForm(false);
                      }}
                      className="px-4 py-1.5 bg-primary text-white font-bold rounded-lg text-xs hover:opacity-90"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── Add Bank Account Modal ── */}
      {showAddBankModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end animate-fade-in" onClick={() => setShowAddBankModal(false)}>
          <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-5">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Add New Account</h3>
                <button onClick={() => setShowAddBankModal(false)} className="text-muted hover:text-white text-lg cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleAddBankAccount} className="space-y-4 text-xs font-sans">
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Account Holder Name*</label>
                  <input
                    type="text"
                    value={newBank.holder}
                    onChange={e => setNewBank({ ...newBank, holder: e.target.value })}
                    required
                    placeholder="e.g. YASH DESAI"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Account Number*</label>
                  <input
                    type="text"
                    value={newBank.number}
                    onChange={e => setNewBank({ ...newBank, number: e.target.value })}
                    required
                    placeholder="e.g. ICIC000239181289"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">IFSC Code*</label>
                  <input
                    type="text"
                    value={newBank.ifsc}
                    onChange={e => setNewBank({ ...newBank, ifsc: e.target.value })}
                    required
                    placeholder="e.g. ICIC000"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Bank Name*</label>
                  <input
                    type="text"
                    value={newBank.name}
                    onChange={e => setNewBank({ ...newBank, name: e.target.value })}
                    required
                    placeholder="e.g. ICICI BANK"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Bank Address</label>
                  <input
                    type="text"
                    value={newBank.upi} // Map temporary local fields safely
                    onChange={e => setNewBank({ ...newBank, upi: e.target.value })}
                    placeholder="Bank Branch Address"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">IBAN Number</label>
                  <input
                    type="text"
                    placeholder="Not provided"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">UPI Number (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. pay@upi"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div className="pt-2">
                  <p className="text-[10px] text-muted uppercase font-bold mb-1">Opening Balance:</p>
                  <div>
                    <label className="text-[10px] text-muted block mb-1">Amount</label>
                    <input
                      type="number"
                      value={newBank.balance}
                      onChange={e => setNewBank({ ...newBank, balance: e.target.value })}
                      placeholder="Opening balance"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
              <button
                onClick={handleAddBankAccount}
                className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
              >
                Save
              </button>
              <button onClick={() => setShowAddBankModal(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-white hover:border-white/20 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Payment Request Drawer ── */}
      {showAddRequestModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end animate-fade-in" onClick={() => setShowAddRequestModal(false)}>
          <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-5">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">Payment Requests</h3>
                  <p className="text-[10px] text-muted font-mono mt-0.5">Voucher: PR-1</p>
                </div>
                <button onClick={() => setShowAddRequestModal(false)} className="text-muted hover:text-white text-lg cursor-pointer">✕</button>
              </div>

              <form onSubmit={handleCreatePaymentRequest} className="space-y-4 text-xs font-sans">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Request No.*</label>
                    <input
                      type="text"
                      defaultValue="PR-1"
                      disabled
                      className="w-full bg-background/50 border border-border-custom rounded-lg px-3 py-2 text-muted focus:outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Date*</label>
                    <input
                      type="date"
                      defaultValue="2026-07-05"
                      disabled
                      className="w-full bg-background/50 border border-border-custom rounded-lg px-3 py-2 text-muted focus:outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Party Name*</label>
                  <select
                    value={newRequest.partyId}
                    onChange={e => setNewRequest({ ...newRequest, partyId: e.target.value })}
                    required
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Search or select party...</option>
                    {usersList.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role || "Employee"})</option>
                    ))}
                    {usersList.length === 0 && Array.from(new Set(transactions.map(t => t.party))).map((p, idx) => (
                      <option key={idx} value="00000000-0000-0000-0000-000000000000">{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Request Type*</label>
                  <select
                    defaultValue="Advance against PO"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="Advance against PO">Advance against PO</option>
                    <option value="Advance against Subcon Work Order">Advance against Subcon Work Order</option>
                    <option value="Advance against BOQ">Advance against BOQ</option>
                    <option value="Advance against Material Purchase">Advance against Material Purchase</option>
                    <option value="Advance against Subcon Expense">Advance against Subcon Expense</option>
                    <option value="Advance against Other Expense">Advance against Other Expense</option>
                    <option value="Advance for Labour">Advance for Labour</option>
                    <option value="Petty Cash">Petty Cash</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Requested Amount (₹)*</label>
                  <input
                    type="number"
                    value={newRequest.amount}
                    onChange={e => setNewRequest({ ...newRequest, amount: e.target.value })}
                    required
                    placeholder="e.g. 15000"
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newRequest.dueDate}
                    onChange={e => setNewRequest({ ...newRequest, dueDate: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Request Details / Particulars</label>
                  <textarea
                    value={newRequest.details}
                    onChange={e => setNewRequest({ ...newRequest, details: e.target.value })}
                    placeholder="Provide details for this payment request..."
                    rows={3}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs resize-none"
                  />
                </div>

                {/* Upload zone */}
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Attachments</label>
                  <div className="border border-dashed border-border-custom hover:border-primary/50 transition-all rounded-lg p-5 flex flex-col items-center justify-center bg-background cursor-pointer">
                    <span className="text-base mb-1">📤</span>
                    <span className="text-[11px] text-muted font-medium">Upload Files</span>
                    <span className="text-[8px] text-muted/60 mt-0.5">PDF, images or doc receipts</span>
                  </div>
                </div>
              </form>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
              <button
                onClick={handleCreatePaymentRequest}
                className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
              >
                Save
              </button>
              <button onClick={() => setShowAddRequestModal(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-white hover:border-white/20 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
