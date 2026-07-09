"use client";
import { getApiHost } from "@/lib/api";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";

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
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

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
  const [showBillShipModal, setShowBillShipModal] = useState(false);
  const [billShip, setBillShip] = useState({ billFrom: "", billTo: "", shipFrom: "", shipTo: "" });
  const [sameAsBillFrom, setSameAsBillFrom] = useState(false);
  const [sameAsBillTo, setSameAsBillTo] = useState(false);
  const [csvPreview, setCsvPreview] = useState<any[] | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

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
  const [cashAccount, setCashAccount] = useState<any>(null);
  const [cashRunning, setCashRunning] = useState(0);
  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [newBank, setNewBank] = useState({ name: "", holder: "", number: "", ifsc: "", upi: "", balance: "" });
  const [showAddCashModal, setShowAddCashModal] = useState(false);
  const [newCash, setNewCash] = useState({ name: "Cash Account", opening: "" });
  const [showAddRequestModal, setShowAddRequestModal] = useState(false);
  const [newRequest, setNewRequest] = useState({ partyId: "", amount: "", details: "", dueDate: "", requestType: "", extra: "" });
  const [prStep, setPrStep] = useState<"type" | "form">("type");
  const [prType, setPrType] = useState<any>(null);
  const [selectedPR, setSelectedPR] = useState<any>(null);
  const [showRecordPaymentModal, setShowRecordPaymentModal] = useState(false);
  const [prPayment, setPrPayment] = useState({ date: "", mode: "Cash", paidAmount: "", deduction: "0", tds: "0", remarks: "", referenceNo: "", attachmentName: "" });
  const [usersList, setUsersList] = useState<any[]>([]);

  const PR_TYPES = [
    { key: "Advance against PO", icon: "📄", label: "Advance against PO", extraLabel: "PO Reference", extraPlaceholder: "PO-204" },
    { key: "Advance against Subcon Work Order", icon: "📑", label: "Advance against Subcon Work Order", extraLabel: "Work Order Ref", extraPlaceholder: "WO-1001" },
    { key: "Advance against BOQ", icon: "📐", label: "Advance against BOQ", extraLabel: "BOQ Document Ref", extraPlaceholder: "BOQ-..." },
    { key: "Advance against Material Purchase", icon: "📦", label: "Advance against Material Purchase", extraLabel: "Material Purchase Ref", extraPlaceholder: "MP-..." },
    { key: "Advance against Subcon Expense", icon: "🧱", label: "Advance against Subcon Expense", extraLabel: "Subcon Expense Ref", extraPlaceholder: "SE-..." },
    { key: "Advance against Other Expense", icon: "🧾", label: "Advance against Other Expense", extraLabel: "Other Expense Ref", extraPlaceholder: "OE-..." },
    { key: "Advance for Labour", icon: "👷", label: "Advance for Labour", extraLabel: "Labour Ref", extraPlaceholder: "Labour / Workforce" },
    { key: "Petty Cash", icon: "💵", label: "Petty Cash", extraLabel: "", extraPlaceholder: "" },
    { key: "Other", icon: "📝", label: "Other", extraLabel: "", extraPlaceholder: "" },
  ];

  // Company-level Party sub-tab states
  const [companyParties, setCompanyParties] = useState<any[]>([]);
  const [showAddPartyModal, setShowAddPartyModal] = useState(false);
  const [partyTabStatus, setPartyTabStatus] = useState("Active");
  const [newParty, setNewParty] = useState({
    name: "", phone: "", email: "", party_type: "Supplier", address: "",
    party_id_custom: "", date_of_joining: "", aadhaar_number: "", pan_number: "",
    contractor_role: "", bank_account_id: "", opening_balance: "", opening_balance_type: "pay",
    create_wo: false, wo_title: "", wo_terms: "",
  });
  const [serviceTags, setServiceTags] = useState<string[]>([]);
  const [serviceTagInput, setServiceTagInput] = useState("");

  // Company-level Transaction sub-tab states
  const [txnSummary, setTxnSummary] = useState<any>({
    total_invoice: 0, unpaid_invoice: 0, total_expense: 0, unpaid_expense: 0,
    company_balance: 0, cash_balance: 0, in_total: 0, out_total: 0, transactions: [],
  });
  const [txnDateFilter, setTxnDateFilter] = useState("");

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

  // Party sub-tab states
  const [partySearchQuery, setPartySearchQuery] = useState("");

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
      // Fetch Cash Account (running balance)
      const cashRes = await fetch(`${getApiHost()}/apis/v3/finance/cash-account/${companyId}`);
      if (cashRes.ok) {
        const ca = await cashRes.json();
        setCashAccount(ca);
        setCashRunning(ca ? ca.running_balance : 0);
      }
      // Fetch Payment Requests
      const reqRes = await fetch(`${getApiHost()}/apis/v3/finance/payment-requests/${companyId}`);
      if (reqRes.ok) {
        setPaymentRequests(await reqRes.json());
      }
      // Fetch Company-level Parties (Finance tab: Party sub-tab)
      const partyRes = await fetch(`${getApiHost()}/apis/v3/finance/parties/${companyId}`);
      if (partyRes.ok) {
        setCompanyParties(await partyRes.json());
      }
      // Fetch Company-level Transactions & Summary (Finance tab: Transaction sub-tab)
      const txnRes = await fetch(`${getApiHost()}/apis/v3/finance/transactions/${companyId}`);
      if (txnRes.ok) {
        setTxnSummary(await txnRes.json());
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

  const handleUploadCSV = async (file: File) => {
    setSubmitting(true);
    const formData = new FormData();
    formData.append("company_id", companyId);
    formData.append("file", file);
    
    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/cashbook/upload`, {
        method: "POST",
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Payments imported successfully! Created ${data.created} transactions.`);
        setShowAddModal(false);
        setCsvPreview(null);
        setCsvFile(null);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        const err = await res.json();
        alert(`Failed to import: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error importing CSV file");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCsvSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length);
      if (lines.length < 2) { setCsvPreview([]); return; }
      const headers = lines[0].split(",").map(h => h.replace(/^"|"$/g, "").trim());
      const rows = lines.slice(1).map(line => {
        const cells = line.split(",").map(c => c.replace(/^"|"$/g, "").trim());
        const obj: any = {};
        headers.forEach((h, i) => { obj[h] = cells[i] || ""; });
        return obj;
      });
      setCsvPreview(rows);
    } catch (err) {
      alert("Could not parse CSV file");
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amtVal = parseFloat(amount);
    
    if (selectedTxnType === "Party to Party") {
      if (!amount || amtVal <= 0 || !paymentFromParty || !paymentToParty) {
        alert("Please select both parties and enter a valid amount");
        return;
      }
      setSubmitting(true);
      try {
        const apiHost = getApiHost();
        const res = await fetch(`${apiHost}/apis/v3/cashbook/p2p`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: companyId,
            sender_company_user_id: paymentFromParty,
            receiver_company_user_id: paymentToParty,
            amount: amtVal,
            payment_date: new Date().toISOString(),
            description: desc || "Party to Party Wallet Transfer"
          }),
        });
        
        if (res.ok) {
          const data = await res.json();
          const fromName = usersList.find((u: any) => u.id === paymentFromParty)?.name || "Sender";
          const toName = usersList.find((u: any) => u.id === paymentToParty)?.name || "Receiver";
          
          const newTxn1: Transaction = {
            id: data.sender_payment_id || `TXN-${Date.now()}-1`,
            date: new Date().toISOString().split("T")[0],
            type: "Party to Party",
            category: "P2P Debit",
            description: desc || `Transfer to ${toName}`,
            amount: amtVal,
            party: fromName,
            ref: refNum || "P2P-OUT",
            ledger: "Cashbook",
            status: "Approved",
            cost_code: costCode,
            settled_amount: amtVal,
            balance_due: 0
          };
          
          const newTxn2: Transaction = {
            id: data.receiver_payment_id || `TXN-${Date.now()}-2`,
            date: new Date().toISOString().split("T")[0],
            type: "Party to Party",
            category: "P2P Credit",
            description: desc || `Transfer from ${fromName}`,
            amount: amtVal,
            party: toName,
            ref: refNum || "P2P-IN",
            ledger: "Cashbook",
            status: "Approved",
            cost_code: costCode,
            settled_amount: amtVal,
            balance_due: 0
          };
          
          setTransactions([newTxn1, newTxn2, ...transactions]);
          alert("Party to Party transfer recorded successfully!");
        } else {
          const err = await res.json();
          alert(`Failed: ${err.detail || "Server error"}`);
        }
        setShowAddModal(false);
        setAmount("");
        setPaymentFromParty("");
        setPaymentToParty("");
        setRefNum("");
        setDesc("");
      } catch (err) {
        console.error("Failed to record P2P transfer", err);
        alert("Error sending request to server");
      } finally {
        setSubmitting(false);
      }
      return;
    }

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

  const handleCreateCashAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/finance/cash-account/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCash.name || "Cash Account",
          opening_balance: parseFloat(newCash.opening) || 0.0,
        }),
      });
      if (res.ok) {
        const ca = await res.json();
        setCashAccount(ca);
        setCashRunning(ca.running_balance);
        setNewCash({ name: "Cash Account", opening: "" });
        setShowAddCashModal(false);
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
          details: newRequest.extra ? `${newRequest.extra} — ${newRequest.details}` : newRequest.details,
          due_date: newRequest.dueDate ? new Date(newRequest.dueDate).toISOString() : null,
          request_type: newRequest.requestType,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setPaymentRequests([...paymentRequests, added]);
        setNewRequest({ partyId: "", amount: "", details: "", dueDate: "", requestType: "", extra: "" });
        setPrStep("type");
        setPrType(null);
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

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newParty.name.trim()) {
      alert("Party name is required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        company_id: companyId,
        name: newParty.name,
        phone: newParty.phone || null,
        email: newParty.email || null,
        party_type: newParty.party_type || null,
        address: newParty.address || null,
        party_id_custom: newParty.party_id_custom || null,
        date_of_joining: newParty.date_of_joining || null,
        aadhaar_number: newParty.aadhaar_number || null,
        pan_number: newParty.pan_number || null,
        contractor_role: newParty.party_type === "Contractor" || newParty.party_type === "Subcontractor" ? newParty.contractor_role : null,
        service_rate_categories: serviceTags.length ? JSON.stringify(serviceTags) : null,
        bank_account_id: newParty.bank_account_id || null,
        opening_balance: parseFloat(newParty.opening_balance) || 0,
        opening_balance_type: newParty.opening_balance ? newParty.opening_balance_type : null,
      };
      const res = await fetch(`${getApiHost()}/apis/v3/library/parties`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create party");
      }
      const created = await res.json();
      // Spin party directly into a Sub-Con Work Order if requested (requires an active project context)
      if (newParty.create_wo && newParty.wo_title.trim() && activeProjectId) {
        await fetch(`${getApiHost()}/apis/v3/billing/work-orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company_id: companyId,
            project_id: activeProjectId,
            subcontractor_id: created.id,
            wo_number: `WO-${Date.now().toString().slice(-6)}`,
            wo_date: new Date().toISOString(),
            items: [],
            terms: newParty.wo_terms,
          }),
        }).catch(() => null);
      }
      // Refresh party list
      const pr = await fetch(`${getApiHost()}/apis/v3/finance/parties/${companyId}`);
      if (pr.ok) setCompanyParties(await pr.json());
      setShowAddPartyModal(false);
      setNewParty({ name: "", phone: "", email: "", party_type: "Supplier", address: "", party_id_custom: "", date_of_joining: "", aadhaar_number: "", pan_number: "", contractor_role: "", bank_account_id: "", opening_balance: "", opening_balance_type: "pay", create_wo: false, wo_title: "", wo_terms: "" });
      setServiceTags([]);
      alert("Party created successfully" + (newParty.create_wo ? " with Work Order" : ""));
    } catch (err: any) {
      alert(err?.message || "Error creating party");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Finance sub-navigation (top tabs) ── */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        {[
          { key: "party", label: "Party", icon: "👥" },
          { key: "ledger", label: "Transaction", icon: "📒" },
          { key: "payment_requests", label: "Payment Requests", icon: "✉️" },
          { key: "accounts", label: "Accounts", icon: "🏦" },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key as any)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
            <span className="mr-1.5">{item.icon}</span>{item.label}
          </button>
        ))}
      </div>

      {/* ── Main content area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-border-custom bg-background px-6 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white">
              {tab === "ledger" ? "Dashboard" : tab === "party" ? "Party-wise Ledgers" : tab === "payment_requests" ? "Payment Requests Ledger" : tab === "accounts" ? "Company Cash & Bank Accounts" : tab === "cashbook" ? "Cash Book (Bank Ledger)" : tab === "pl" ? "Project P&L" : tab === "tally" ? "Tally Sync Gateway" : "Cost Variance Report"}
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

            <div className="relative">
              <button onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer">
                Create Transaction +
              </button>
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-card/95 backdrop-blur-md border border-border-custom rounded-lg shadow-2xl p-5 z-50 space-y-4 text-left max-h-[420px] overflow-y-auto">
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
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* ── TRANSACTION LEDGER TAB ── */}
          {/* ── TRANSACTION SUB-TAB (COMPANY-WIDE) ── */}
          {tab === "ledger" && (() => {
            const txns = txnSummary.transactions || [];
            const filtered = txns.filter((t: any) => {
              const q = searchQuery.toLowerCase();
              const matchQ = !q || (t.party || "").toLowerCase().includes(q) || (t.details || "").toLowerCase().includes(q) || (t.ref || "").toLowerCase().includes(q);
              const matchD = !txnDateFilter || (t.date || "").startsWith(txnDateFilter);
              return matchQ && matchD;
            });
            const unbilledCount = txns.filter((t: any) => /material/i.test(t.type || "") && t.status && t.status !== "Paid").length;
            const pendingCount = txns.filter((t: any) => t.status && t.status !== "Paid" && t.status !== "Approved").length;
            const statusClass = (s: string) => {
              if (s === "Paid" || s === "Approved") return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
              if (s === "Partially Paid") return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
              return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
            };
            return (
            <div className="space-y-4">
              {/* Three Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border-custom rounded-lg p-4">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Total Invoice</div>
                  <div className="text-xl font-extrabold text-foreground mt-1">₹{(txnSummary.total_invoice || 0).toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-rose-400 mt-1">Unpaid Invoice: ₹{(txnSummary.unpaid_invoice || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-card border border-border-custom rounded-lg p-4">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Total Expense</div>
                  <div className="text-xl font-extrabold text-foreground mt-1">₹{(txnSummary.total_expense || 0).toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-rose-400 mt-1">Unpaid Expense: ₹{(txnSummary.unpaid_expense || 0).toLocaleString("en-IN")}</div>
                </div>
                <div className="bg-card border border-border-custom rounded-lg p-4">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider flex items-center gap-1">
                    Company Balance <span title="Sum of Cash + all Bank Account balances" className="cursor-help">ⓘ</span>
                  </div>
                  <div className="text-xl font-extrabold text-foreground mt-1">₹{(txnSummary.company_balance || 0).toLocaleString("en-IN")}</div>
                  <div className="text-[10px] text-muted mt-1">In: ₹{(txnSummary.in_total || 0).toLocaleString("en-IN")} | Out: ₹{(txnSummary.out_total || 0).toLocaleString("en-IN")}</div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <button className="py-1 px-3 border border-border-custom hover:bg-elevated rounded text-[11px] font-medium text-foreground transition-all">⏳ Filter</button>
                <input type="date" value={txnDateFilter} onChange={(e) => setTxnDateFilter(e.target.value)} className="py-1 px-2 border border-border-custom bg-card hover:bg-elevated rounded text-[11px] text-foreground focus:outline-none" />
                <button className="py-1 px-3 border border-border-custom hover:bg-elevated rounded text-[11px] font-medium text-foreground transition-all flex items-center gap-1">
                  🛒 Unbilled Materials <span className="bg-primary/20 text-primary text-[9px] font-bold px-1.5 py-0.5 rounded-full">New {unbilledCount}</span>
                </button>
                <button className="py-1 px-3 border border-border-custom hover:bg-elevated rounded text-[11px] font-medium text-foreground transition-all flex items-center gap-1">
                  🕒 Pending Entries <span className="bg-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                </button>
                <div className="flex-1" />
                <input type="text" placeholder="Search party, voucher#..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="bg-input border border-border-custom rounded-md px-3 py-1.5 text-xs text-foreground placeholder-muted focus:outline-none focus:border-primary" />
              </div>

              {/* Table: Party | Details | Status */}
              <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-input/60 text-muted uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 font-semibold">Party</th>
                      <th className="p-3 font-semibold">Details</th>
                      <th className="p-3 font-semibold text-right">Amount (₹)</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/40">
                    {filtered.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-muted">No Data Transaction</td></tr>
                    )}
                    {filtered.map((t: any, i: number) => (
                      <tr key={i} className="hover:bg-elevated/40 transition-all cursor-pointer" onClick={() => setSelectedVoucher(t)}>
                        <td className="p-3">
                          <div className="font-bold text-foreground">{t.party}</div>
                          <div className="text-[10px] text-muted">{t.type}</div>
                        </td>
                        <td className="p-3 text-foreground">
                          {t.details}
                          {t.project_id ? <span className="text-[10px] text-muted block">Project: {String(t.project_id).slice(0, 8)}</span> : null}
                        </td>
                        <td className="p-3 text-right font-bold text-foreground">₹{(t.amount || 0).toLocaleString("en-IN")}</td>
                        <td className="p-3">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${statusClass(t.status)}`}>{t.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

          {/* ── PARTY SUB-TAB (COMPANY-WIDE) ── */}
          {tab === "party" && (() => {
            const partySums = companyParties.reduce(
              (acc, p) => {
                acc.advance_paid += p.advance_paid || 0;
                acc.to_pay += p.to_pay || 0;
                acc.to_receive += p.to_receive || 0;
                acc.advance_received += p.advance_received || 0;
                return acc;
              },
              { advance_paid: 0, to_pay: 0, to_receive: 0, advance_received: 0 }
            );
            const statusChip = (status: string) => {
              if (status === "Advance Paid" || status === "Advance Received")
                return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
              if (status === "To Pay" || status === "To Receive")
                return "bg-rose-500/10 text-rose-400 border border-rose-500/20";
              return "bg-zinc-500/10 text-muted border border-zinc-500/20";
            };
            const filteredParties = companyParties.filter(p => {
              const q = partySearchQuery.toLowerCase();
              const matchQ = !q || p.name.toLowerCase().includes(q) || (p.party_id_custom || "").toLowerCase().includes(q);
              const matchS = partyTabStatus === "All" || (partyTabStatus === "Active" ? p.status !== "Settled" : p.status === "Settled");
              return matchQ && matchS;
            });
            const exportCsv = () => {
              const rows = [["Party ID", "Name", "Type", "Balance", "Status"]];
              filteredParties.forEach(p => rows.push([p.party_id_custom || "", p.name, p.party_type || "", String(p.balance), p.status]));
              const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "parties.csv";
              a.click();
              URL.revokeObjectURL(url);
            };
            return (
            <div className="space-y-6 relative h-full flex flex-col">
              {/* Four Cards Metrics Summary Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block">Advance Paid</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹{partySums.advance_paid.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 z-10">↗</div>
                </div>
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block">To Pay</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹{partySums.to_pay.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 z-10">↑</div>
                </div>
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wider block">To Receive</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹{partySums.to_receive.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 z-10">↓</div>
                </div>
                <div className="bg-card border border-border-custom rounded-lg p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                  <div className="space-y-1 z-10">
                    <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wider block">Advance Received</span>
                    <strong className="text-xl font-extrabold text-foreground tracking-tight block">₹{partySums.advance_received.toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 z-10">↙</div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search parties..."
                    value={partySearchQuery}
                    onChange={(e) => setPartySearchQuery(e.target.value)}
                    className="w-full bg-input border border-border-custom rounded-md py-1.5 pl-8 pr-3 text-xs text-foreground placeholder-muted focus:outline-none focus:border-primary transition-all"
                  />
                  <span className="absolute left-2.5 top-2 text-muted text-xs">🔍</span>
                </div>
                <button className="py-1 px-3 border border-border-custom hover:bg-elevated rounded text-[11px] font-medium text-foreground transition-all flex items-center justify-center gap-1">
                  <span>⏳</span> Filter
                </button>
                <select
                  value={partyTabStatus}
                  onChange={(e) => setPartyTabStatus(e.target.value)}
                  className="py-1 px-2 border border-border-custom bg-card hover:bg-elevated rounded text-[11px] font-medium text-foreground focus:outline-none cursor-pointer"
                >
                  <option>Active</option>
                  <option>All</option>
                  <option>Inactive</option>
                </select>
                <button onClick={exportCsv} className="py-1 px-3 border border-border-custom hover:bg-elevated rounded text-[11px] font-medium text-foreground transition-all">
                  ⬇ Export
                </button>
                <button
                  onClick={() => { setShowAddPartyModal(true); }}
                  className="py-1.5 px-3 rounded bg-primary hover:bg-primary/90 text-white text-[11px] font-semibold transition-all"
                >
                  + New Party
                </button>
              </div>

              {/* Table */}
              <div className="flex-1 bg-card border border-border-custom rounded-lg overflow-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-input/60 text-muted uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3 font-semibold">Party Details</th>
                      <th className="p-3 font-semibold">Type</th>
                      <th className="p-3 font-semibold text-right">Balance (₹)</th>
                      <th className="p-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/40">
                    {filteredParties.length === 0 && (
                      <tr><td colSpan={4} className="p-6 text-center text-muted">No parties found</td></tr>
                    )}
                    {filteredParties.map(p => (
                      <tr key={String(p.id)} className="hover:bg-elevated/40 transition-all">
                        <td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-xs">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-foreground">{p.name}</h4>
                              <span className="text-[10px] text-muted">{p.party_id_custom || ""}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-foreground">{p.party_type || "—"}</td>
                        <td className="p-3 text-right font-bold text-foreground">₹{(p.balance || 0).toLocaleString("en-IN")}</td>
                        <td className="p-3">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${statusChip(p.status)}`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            );
          })()}

          {/* ── ADD PARTY MODAL ── */}
          {showAddPartyModal && (
            <>
              <div onClick={() => setShowAddPartyModal(false)} className="fixed inset-0 bg-black/60 z-40" />
              <div className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-card border-l border-border-custom shadow-2xl z-50 p-6 overflow-y-auto flex flex-col gap-5">
                <div className="flex justify-between items-center border-b border-border-custom pb-4">
                  <div>
                    <button onClick={() => setShowAddPartyModal(false)} className="text-muted hover:text-foreground text-sm font-semibold pr-2">✕</button>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-foreground inline ml-1">New Party</h3>
                  </div>
                  <button onClick={handleCreateParty} disabled={submitting} className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-semibold rounded disabled:opacity-50">
                    {submitting ? "Saving..." : "Save Party"}
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Name *</label>
                    <input value={newParty.name} onChange={(e) => setNewParty({ ...newParty, name: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Phone (w/ country code)</label>
                      <input value={newParty.phone} onChange={(e) => setNewParty({ ...newParty, phone: e.target.value })} placeholder="+91" className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Email</label>
                      <input value={newParty.email} onChange={(e) => setNewParty({ ...newParty, email: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Party Type</label>
                      <select value={newParty.party_type} onChange={(e) => setNewParty({ ...newParty, party_type: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary">
                        <option>Supplier</option>
                        <option>Subcontractor</option>
                        <option>Contractor</option>
                        <option>Client</option>
                        <option>Labour</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Party ID (auto)</label>
                      <input value={newParty.party_id_custom} onChange={(e) => setNewParty({ ...newParty, party_id_custom: e.target.value })} placeholder="PID-1" className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Address</label>
                    <textarea value={newParty.address} onChange={(e) => setNewParty({ ...newParty, address: e.target.value })} rows={2} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Date of Joining</label>
                      <input type="date" value={newParty.date_of_joining} onChange={(e) => setNewParty({ ...newParty, date_of_joining: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-muted uppercase tracking-wider">PAN</label>
                      <input value={newParty.pan_number} onChange={(e) => setNewParty({ ...newParty, pan_number: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Aadhaar Number</label>
                    <div className="flex gap-2">
                      <input value={newParty.aadhaar_number} onChange={(e) => setNewParty({ ...newParty, aadhaar_number: e.target.value })} className="flex-1 bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                      <button type="button" className="px-3 py-2 border border-border-custom rounded-md text-[10px] text-muted hover:bg-elevated">⬆ Aadhaar</button>
                      <button type="button" className="px-3 py-2 border border-border-custom rounded-md text-[10px] text-muted hover:bg-elevated">⬆ PAN</button>
                    </div>
                  </div>

                  {/* Contractor / Subcontractor extra fields */}
                  {(newParty.party_type === "Contractor" || newParty.party_type === "Subcontractor") && (
                    <div className="space-y-3 border border-border-custom rounded-lg p-3 bg-input/40">
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Contractor Role</label>
                        <select value={newParty.contractor_role} onChange={(e) => setNewParty({ ...newParty, contractor_role: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary">
                          <option value="">— Select —</option>
                          <option>Site Execution</option>
                          <option>Finishing</option>
                          <option>MEP</option>
                          <option>Survey</option>
                          <option>Other</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Service Rate Categories</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {serviceTags.map((t, i) => (
                            <span key={i} className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary flex items-center gap-1">
                              {t}
                              <button type="button" onClick={() => setServiceTags(serviceTags.filter((_, j) => j !== i))} className="text-primary/70">✕</button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={serviceTagInput}
                            onChange={(e) => setServiceTagInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && serviceTagInput.trim()) {
                                e.preventDefault();
                                setServiceTags([...serviceTags, serviceTagInput.trim()]);
                                setServiceTagInput("");
                              }
                            }}
                            placeholder="Add tag + Enter"
                            className="flex-1 bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                          <button type="button" onClick={() => { if (serviceTagInput.trim()) { setServiceTags([...serviceTags, serviceTagInput.trim()]); setServiceTagInput(""); } }} className="px-3 py-2 border border-border-custom rounded-md text-[10px] text-muted hover:bg-elevated">+ Tag</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Opening Balance (₹)</label>
                        <input type="number" value={newParty.opening_balance} onChange={(e) => setNewParty({ ...newParty, opening_balance: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                        {newParty.opening_balance && (
                          <div className="flex gap-3 mt-2">
                            <button type="button" onClick={() => setNewParty({ ...newParty, opening_balance_type: "pay" })} className={`flex-1 py-2 rounded border text-[10px] font-semibold ${newParty.opening_balance_type === "pay" ? "border-primary bg-primary/10 text-primary" : "border-border-custom text-muted"}`}>Party will pay (To Pay)</button>
                            <button type="button" onClick={() => setNewParty({ ...newParty, opening_balance_type: "receive" })} className={`flex-1 py-2 rounded border text-[10px] font-semibold ${newParty.opening_balance_type === "receive" ? "border-primary bg-primary/10 text-primary" : "border-border-custom text-muted"}`}>Party will receive (Advance Received)</button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Link Bank Account</label>
                        <select value={newParty.bank_account_id} onChange={(e) => setNewParty({ ...newParty, bank_account_id: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary">
                          <option value="">--NA--</option>
                          {bankAccounts.map((b: any) => (
                            <option key={String(b.id)} value={String(b.id)}>{b.bank_name} — {b.account_number}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Spin into Sub-Con Work Order */}
                  <div className="border border-border-custom rounded-lg p-3 bg-input/40 space-y-3">
                    <label className="flex items-center gap-2 text-[11px] font-semibold text-foreground cursor-pointer">
                      <input type="checkbox" checked={newParty.create_wo} onChange={(e) => setNewParty({ ...newParty, create_wo: e.target.checked })} />
                      Create Sub-Con Work Order for this party
                    </label>
                    {newParty.create_wo && (
                      <>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-wider">WO Title</label>
                          <input value={newParty.wo_title} onChange={(e) => setNewParty({ ...newParty, wo_title: e.target.value })} className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary" />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Terms &amp; Conditions</label>
                          <div className="flex gap-1 mb-1">
                            <button type="button" onClick={() => document.execCommand("bold")} className="px-2 py-1 border border-border-custom rounded text-[10px] font-bold">B</button>
                            <button type="button" onClick={() => document.execCommand("italic")} className="px-2 py-1 border border-border-custom rounded text-[10px] italic">I</button>
                            <button type="button" onClick={() => document.execCommand("underline")} className="px-2 py-1 border border-border-custom rounded text-[10px] underline">U</button>
                            <button type="button" onClick={() => document.execCommand("insertUnorderedList")} className="px-2 py-1 border border-border-custom rounded text-[10px]">• List</button>
                          </div>
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            onBlur={(e) => setNewParty({ ...newParty, wo_terms: e.currentTarget.innerHTML })}
                            className="w-full min-h-[80px] bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-muted uppercase tracking-wider">Attach Media</label>
                          <button type="button" className="w-full py-3 border border-dashed border-border-custom rounded-md text-[10px] text-muted hover:bg-elevated">⬆ Drop files or click to upload</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── BILL / SHIP ADDRESS MODAL (4 blocks) ── */}
          {showBillShipModal && (
            <>
              <div onClick={() => setShowBillShipModal(false)} className="fixed inset-0 bg-black/60 z-40" />
              <div className="fixed right-0 top-0 h-full w-[520px] max-w-full bg-card border-l border-border-custom shadow-2xl z-50 p-6 overflow-y-auto flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-border-custom pb-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Bill To / Ship To</h3>
                  <button onClick={() => setShowBillShipModal(false)} className="text-muted hover:text-foreground text-sm font-semibold">✕</button>
                </div>

                {(["billFrom", "billTo", "shipFrom", "shipTo"] as const).map((key) => {
                  const label = { billFrom: "Bill From", billTo: "Bill To", shipFrom: "Ship From", shipTo: "Ship To" }[key];
                  return (
                    <div key={key} className="border border-border-custom rounded-lg p-3 bg-input/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">{label}</span>
                        <select
                          value={billShip[key] === "" ? "" : "custom"}
                          onChange={(e) => {
                            if (e.target.value !== "custom") setBillShip({ ...billShip, [key]: e.target.value });
                          }}
                          className="text-[10px] bg-input border border-border-custom rounded px-2 py-1 text-foreground"
                        >
                          <option value="custom">Type / select address</option>
                          <option value="Company">Company</option>
                        </select>
                      </div>
                      <textarea
                        value={billShip[key]}
                        onChange={(e) => setBillShip({ ...billShip, [key]: e.target.value })}
                        rows={2}
                        placeholder={`${label} address`}
                        className="w-full bg-input border border-border-custom rounded-md p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                      />
                      {key === "shipFrom" && (
                        <label className="flex items-center gap-2 text-[10px] text-muted cursor-pointer">
                          <input type="checkbox" checked={sameAsBillFrom} onChange={(e) => { setSameAsBillFrom(e.target.checked); if (e.target.checked) setBillShip({ ...billShip, shipFrom: billShip.billFrom }); }} />
                          Same as Bill From Address
                        </label>
                      )}
                      {key === "shipTo" && (
                        <label className="flex items-center gap-2 text-[10px] text-muted cursor-pointer">
                          <input type="checkbox" checked={sameAsBillTo} onChange={(e) => { setSameAsBillTo(e.target.checked); if (e.target.checked) setBillShip({ ...billShip, shipTo: billShip.billTo }); }} />
                          Same as Bill To Address
                        </label>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => setShowBillShipModal(false)}
                  className="mt-2 py-2 rounded bg-primary hover:bg-primary/90 text-white text-xs font-semibold"
                >
                  Save Addresses
                </button>
              </div>
            </>
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
                  onClick={() => { setPrStep("type"); setPrType(null); setNewRequest({ partyId: "", amount: "", details: "", dueDate: "", requestType: "", extra: "" }); setShowAddRequestModal(true); }}
                  className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-md cursor-pointer"
                >
                  + Create Payment Request
                </button>
              </div>

              <div className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom bg-input overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead>
                      <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
                        <th className="px-5 py-3">Request No.</th>
                        <th className="px-5 py-3">Created At</th>
                        <th className="px-5 py-3">Party Name</th>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Requested Amount</th>
                        <th className="px-5 py-3">Particulars / Details</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Due Date</th>
                      </tr>
                  </thead>
                  <tbody>
                    {paymentRequests.length === 0 ? (
                      <tr>
                          <td colSpan={8} className="text-center p-8 text-muted">
                            No active payment requests found.
                          </td>
                      </tr>
                    ) : (
                      paymentRequests.map((req) => (
                        <tr key={req.id} onClick={() => setSelectedPR(req)} className="border-t border-border-custom hover:bg-white/[0.04] cursor-pointer transition-colors">
                          <td className="px-5 py-3 text-white font-mono font-bold">{req.request_no || "—"}</td>
                          <td className="px-5 py-3 text-muted font-mono">
                            {new Date(req.created_at).toLocaleDateString("en-IN")}
                          </td>
                          <td className="px-5 py-3 font-semibold text-white">{req.party_name}</td>
                          <td className="px-5 py-3 text-muted">{req.request_type || "—"}</td>
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
                <div className="flex justify-between items-center">
                  <p className="text-[10px] text-muted font-bold uppercase tracking-wider">Cash Account</p>
                  {!cashAccount && (
                    <button onClick={() => setShowAddCashModal(true)} className="bg-primary hover:bg-primary/95 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all">+ New Cash Account</button>
                  )}
                </div>
                {cashAccount ? (
                  <div className="bg-card border border-border-custom rounded-xl p-4 flex items-center justify-between hover:shadow-md transition-all">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 text-lg border border-green-500/20">
                        💵
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">{cashAccount.name}</h4>
                        <p className="text-[10px] text-muted mt-0.5">Opening: ₹{(cashAccount.opening_balance || 0).toLocaleString("en-IN")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[8px] text-muted uppercase tracking-wider">Running Balance</p>
                        <span className="text-base font-bold text-white">₹{cashRunning.toLocaleString("en-IN")}</span>
                      </div>
                      <button className="px-3 py-1.5 bg-sidebar hover:bg-elevated border border-border-custom rounded-lg text-[10px] font-bold text-muted hover:text-foreground transition-all flex items-center gap-1">
                        View Statement <span className="text-[9px]">↗</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-dashed border-border-custom rounded-xl p-8 text-center text-muted text-xs">
                    No cash account configured. Click "+ New Cash Account" to set an opening balance.
                  </div>
                )}
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
                            <span className="text-muted block uppercase font-medium text-[8px] tracking-wider">Running Balance</span>
                            <span className="text-white font-bold mt-0.5 block text-xs">₹{acc.balance.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-muted block uppercase font-medium text-[8px] tracking-wider">Opening Balance</span>
                            <span className="text-white font-semibold mt-0.5 block text-[10px]">₹{(acc.opening_balance ?? 0).toLocaleString("en-IN")}</span>
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
                        <strong className="text-white block">How to import Excel/CSV in SiteFlow:</strong>
                        <ol className="list-decimal pl-4 space-y-1 text-muted leading-relaxed">
                          <li>Remove any unnecessary header rows from the Excel file.</li>
                          <li>
                            Ensure the column structure aligns with the{" "}
                            <span onClick={() => {
                              const tpl = "Payment Type,Party Name,Amount,Project Name,Payment Date,Mode of Payment,Category,Payment Request ID,Remark\nout,Sample Vendor Pvt Ltd,12500,Sample Project,2026-07-09,Cash,Material,PR-1,June material advance\nin,Sample Client Ltd,80000,Sample Project,2026-07-09,Bank,Client,INV-1,July milestone";
                              const blob = new Blob([tpl], { type: "text/csv" });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url; a.download = "siteflow_payment_template.csv"; a.click();
                              URL.revokeObjectURL(url);
                            }} className="text-primary hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5">
                              SiteFlow Payment Request template 📥
                            </span>{" "}
                            (column names and order of columns need to match exactly with the sample file).
                          </li>
                          <li>Upload that file here.</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div 
                    onClick={() => document.getElementById("payments-csv-file-input")?.click()}
                    className="border-2 border-dashed border-border-custom hover:border-primary/50 transition-all rounded-xl p-8 flex flex-col items-center justify-center bg-background cursor-pointer text-center space-y-2"
                  >
                    <input 
                      type="file" 
                      id="payments-csv-file-input" 
                      accept=".csv" 
                      className="hidden" 
                      onChange={handleCsvSelect}
                    />
                    <span className="text-2xl text-primary">📤</span>
                    <strong className="text-white font-bold text-xs">Upload Csv</strong>
                    <span className="text-[9px] text-muted">Supports .csv formats up to 10MB</span>
                  </div>

                  {csvPreview && (
                    <div className="border border-border-custom rounded-xl p-3 bg-input/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Preview ({csvPreview.length} rows)</span>
                        <button type="button" onClick={() => { setCsvPreview(null); setCsvFile(null); }} className="text-[10px] text-muted hover:text-foreground">Clear</button>
                      </div>
                      <div className="max-h-48 overflow-auto">
                        <table className="w-full text-[9px] text-left">
                          <thead className="text-muted uppercase">
                            <tr>
                              {csvPreview[0] && Object.keys(csvPreview[0]).map(h => <th key={h} className="p-1">{h}</th>)}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-custom/40">
                            {csvPreview.slice(0, 50).map((r, i) => (
                              <tr key={i}>
                                {Object.values(r).map((v: any, j) => <td key={j} className="p-1 text-foreground">{v}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="button"
                        disabled={!csvFile || submitting}
                        onClick={() => csvFile && handleUploadCSV(csvFile)}
                        className="w-full py-2 rounded bg-primary hover:bg-primary/90 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        {submitting ? "Importing..." : "Save Import"}
                      </button>
                    </div>
                  )}
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

                  <div className="border border-border-custom rounded-xl p-3 bg-elevated/10 flex justify-between items-center text-xs cursor-pointer" onClick={() => setShowBillShipModal(true)}>
                    <div>
                      <span className="text-muted block text-[9px] uppercase font-bold">Bill To / Ship To</span>
                      <span className="text-white block font-semibold mt-0.5">
                        {billShip.billTo || billShip.billFrom ? "Configured" : "Not set"}
                      </span>
                    </div>
                    <span className="text-primary font-bold text-[10px]">+ Add</span>
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
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Payment From (Debit)*</label>
                    <select
                      value={paymentFromParty}
                      onChange={e => setPaymentFromParty(e.target.value)}
                      required
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="">Select party to debit...</option>
                      {usersList.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role || "Staff"})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Payment To (Credit)*</label>
                    <select
                      value={paymentToParty}
                      onChange={e => setPaymentToParty(e.target.value)}
                      required
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                    >
                      <option value="">Select party to credit...</option>
                      {usersList.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.name} ({u.role || "Staff"})</option>
                      ))}
                    </select>
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

      {/* ── Add Cash Account Modal ── */}
      {showAddCashModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4" onClick={() => setShowAddCashModal(false)}>
          <div className="bg-card w-full max-w-md border border-border-custom shadow-2xl rounded-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Cash Account</h3>
                <p className="text-[10px] text-muted mt-0.5">Set the opening cash balance for the company</p>
              </div>
              <button onClick={() => setShowAddCashModal(false)} className="text-muted hover:text-white text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateCashAccount} className="space-y-4 text-xs font-sans">
              <div>
                <label className="text-[10px] text-muted uppercase font-bold block mb-1">Account Name</label>
                <input
                  type="text"
                  value={newCash.name}
                  onChange={e => setNewCash({ ...newCash, name: e.target.value })}
                  placeholder="Cash Account"
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted uppercase font-bold block mb-1">Opening Balance (₹)*</label>
                <input
                  type="number"
                  value={newCash.opening}
                  onChange={e => setNewCash({ ...newCash, opening: e.target.value })}
                  required
                  placeholder="e.g. 50000"
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs font-mono"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
                >
                  Create Cash Account
                </button>
                <button onClick={() => setShowAddCashModal(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-white hover:border-white/20 text-xs">Cancel</button>
              </div>
            </form>
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
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">New Payment Request</h3>
                  <p className="text-[10px] text-muted font-mono mt-0.5">Voucher: PR-{paymentRequests.length + 1}</p>
                </div>
                <button onClick={() => setShowAddRequestModal(false)} className="text-muted hover:text-white text-lg cursor-pointer">✕</button>
              </div>

              {prStep === "type" ? (
                <div className="space-y-3">
                  <p className="text-[10px] text-muted uppercase font-bold tracking-wider">Select Request Type</p>
                  <div className="grid grid-cols-1 gap-2">
                    {PR_TYPES.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => { setPrType(t); setNewRequest({ ...newRequest, requestType: t.key }); setPrStep("form"); }}
                        className="flex items-center gap-3 w-full text-left bg-background border border-border-custom hover:border-primary/60 hover:bg-primary/5 rounded-lg px-4 py-3 transition-all"
                      >
                        <span className="text-lg">{t.icon}</span>
                        <span className="text-xs font-semibold text-white">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreatePaymentRequest} className="space-y-4 text-xs font-sans">
                  <button type="button" onClick={() => { setPrStep("type"); setPrType(null); }} className="text-[10px] text-primary hover:underline font-bold cursor-pointer">← Change type</button>
                  <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-[10px] font-bold text-primary">
                    <span>{prType?.icon}</span>{prType?.label}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Request No.*</label>
                      <input
                        type="text"
                        value={`PR-${paymentRequests.length + 1}`}
                        disabled
                        className="w-full bg-background/50 border border-border-custom rounded-lg px-3 py-2 text-muted focus:outline-none text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Date*</label>
                      <input
                        type="date"
                        value={new Date().toISOString().slice(0, 10)}
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
                      {usersList.length === 0 && (Array.from(new Set(txnSummary.transactions.map((t: any) => t.party))) as any[]).map((p: any, idx) => (
                        <option key={idx} value="00000000-0000-0000-0000-000000000000">{p}</option>
                      ))}
                    </select>
                  </div>

                  {prType?.extraLabel && (
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">{prType.extraLabel}</label>
                      <input
                        type="text"
                        value={newRequest.extra}
                        onChange={e => setNewRequest({ ...newRequest, extra: e.target.value })}
                        placeholder={prType.extraPlaceholder}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
                      />
                    </div>
                  )}

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

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Attachments</label>
                    <div className="border border-dashed border-border-custom hover:border-primary/50 transition-all rounded-lg p-5 flex flex-col items-center justify-center bg-background cursor-pointer">
                      <span className="text-base mb-1">📤</span>
                      <span className="text-[11px] text-muted font-medium">Upload Files</span>
                      <span className="text-[8px] text-muted/60 mt-0.5">PDF, images or doc receipts</span>
                    </div>
                  </div>
                </form>
              )}
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
              {prStep === "form" && (
                <button
                  onClick={handleCreatePaymentRequest}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
                >
                  Save Request
                </button>
              )}
              <button onClick={() => setShowAddRequestModal(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-white hover:border-white/20 text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment Request Detail Drawer ── */}
      {selectedPR && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end animate-fade-in" onClick={() => setSelectedPR(null)}>
          <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start border-b border-border-custom pb-4 mb-5">
              <div>
                <p className="text-[10px] text-muted font-mono">Voucher: {selectedPR.request_no || "—"}</p>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider mt-0.5">{selectedPR.request_type || "Payment Request"}</h3>
                <p className="text-xs text-white mt-1">{selectedPR.party_name}</p>
              </div>
              <button onClick={() => setSelectedPR(null)} className="text-muted hover:text-white text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background border border-border-custom rounded-lg p-3">
                  <p className="text-[9px] text-muted uppercase font-bold">Requested Amount</p>
                  <p className="text-white font-bold font-sans mt-1">₹{(selectedPR.amount || 0).toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-background border border-border-custom rounded-lg p-3">
                  <p className="text-[9px] text-muted uppercase font-bold">Status</p>
                  <p className="mt-1">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                      selectedPR.status === "Paid" || selectedPR.status === "Approved"
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        : selectedPR.status === "Rejected"
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    }`}>{selectedPR.status.toUpperCase()}</span>
                    <span className="ml-2 text-[8px] text-muted uppercase">Appr: {selectedPR.approval_status}</span>
                  </p>
                </div>
              </div>

              <div className="bg-background border border-border-custom rounded-lg p-3">
                <p className="text-[9px] text-muted uppercase font-bold mb-1">Particulars</p>
                <p className="text-muted">{selectedPR.details || "—"}</p>
                <p className="text-[9px] text-muted mt-2">Due: {selectedPR.due_date ? new Date(selectedPR.due_date).toLocaleDateString("en-IN") : "Immediate"}</p>
              </div>

              {selectedPR.payment && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-[9px] text-primary uppercase font-bold mb-1">Payment Recorded</p>
                  <p className="text-white font-sans">₹{selectedPR.payment.paid_amount.toLocaleString("en-IN")} via {selectedPR.payment.payment_mode} on {new Date(selectedPR.payment.payment_date).toLocaleDateString("en-IN")}</p>
                  <p className="text-[9px] text-muted mt-1">Deduction ₹{selectedPR.payment.deduction} · TDS ₹{selectedPR.payment.tds} · Balance Due ₹{selectedPR.payment.balance_due}</p>
                  {selectedPR.payment.reference_no && <p className="text-[9px] text-muted mt-1">Ref: {selectedPR.payment.reference_no}</p>}
                  {selectedPR.payment.remarks && <p className="text-[9px] text-muted mt-1">Remarks: {selectedPR.payment.remarks}</p>}
                </div>
              )}
            </div>

            <div className="mt-auto pt-5 space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const res = await fetch(`${getApiHost()}/apis/v3/finance/payment-requests/approve/${selectedPR.id}`, {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "Approved" }),
                    });
                    if (res.ok) { const u = await res.json(); setSelectedPR(u); setPaymentRequests(paymentRequests.map(p => p.id === u.id ? u : p)); }
                  }}
                  disabled={selectedPR.status === "Paid"}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all disabled:opacity-40"
                >Request Approval</button>
                <button
                  onClick={async () => {
                    const res = await fetch(`${getApiHost()}/apis/v3/finance/payment-requests/approve/${selectedPR.id}`, {
                      method: "PUT", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ status: "Paid" }),
                    });
                    if (res.ok) { const u = await res.json(); setSelectedPR(u); setPaymentRequests(paymentRequests.map(p => p.id === u.id ? u : p)); }
                  }}
                  disabled={selectedPR.status === "Paid"}
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-500 text-xs transition-all disabled:opacity-40"
                >Mark as Paid</button>
              </div>
              <button
                onClick={() => { setPrPayment({ date: new Date().toISOString().slice(0, 10), mode: "Cash", paidAmount: String(selectedPR.amount || ""), deduction: "0", tds: "0", remarks: "", referenceNo: "", attachmentName: "" }); setShowRecordPaymentModal(true); }}
                disabled={selectedPR.status === "Paid"}
                className="w-full py-2.5 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 text-xs transition-all disabled:opacity-40"
              >Record Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {showRecordPaymentModal && selectedPR && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center animate-fade-in p-4" onClick={() => setShowRecordPaymentModal(false)}>
          <div className="bg-card w-full max-w-md border border-border-custom shadow-2xl rounded-xl p-6 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-border-custom pb-4 mb-5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Record Payment</h3>
                <p className="text-[10px] text-muted font-mono mt-0.5">{selectedPR.request_no} · {selectedPR.party_name}</p>
              </div>
              <button onClick={() => setShowRecordPaymentModal(false)} className="text-muted hover:text-white text-lg cursor-pointer">✕</button>
            </div>

            <div className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Payment Date*</label>
                  <input type="date" value={prPayment.date}
                    onChange={e => setPrPayment({ ...prPayment, date: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs" />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Payment Mode*</label>
                  <select value={prPayment.mode}
                    onChange={e => setPrPayment({ ...prPayment, mode: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs">
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Paid Amount (₹)*</label>
                  <input type="number" value={prPayment.paidAmount}
                    onChange={e => setPrPayment({ ...prPayment, paidAmount: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Deduction (₹)</label>
                  <input type="number" value={prPayment.deduction}
                    onChange={e => setPrPayment({ ...prPayment, deduction: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">TDS (₹)</label>
                  <input type="number" value={prPayment.tds}
                    onChange={e => setPrPayment({ ...prPayment, tds: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs font-mono" />
                </div>
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Balance Due (₹)</label>
                  <input type="text" readOnly
                    value={Math.max(0, (selectedPR.amount || 0) - (parseFloat(prPayment.paidAmount) || 0) - (parseFloat(prPayment.deduction) || 0) - (parseFloat(prPayment.tds) || 0)).toLocaleString("en-IN")}
                    className="w-full bg-background/50 border border-border-custom rounded-lg px-3 py-2 text-muted focus:outline-none text-xs font-mono" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-bold block mb-1">Reference No.</label>
                <input type="text" value={prPayment.referenceNo}
                  onChange={e => setPrPayment({ ...prPayment, referenceNo: e.target.value })}
                  placeholder="e.g. TXN-1234 / Cheque no."
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs" />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-bold block mb-1">Remarks</label>
                <textarea value={prPayment.remarks}
                  onChange={e => setPrPayment({ ...prPayment, remarks: e.target.value })}
                  rows={2} placeholder="Optional remarks..."
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs resize-none" />
              </div>

              <div>
                <label className="text-[10px] text-muted uppercase font-bold block mb-1">Attach File(s)</label>
                <input type="file" onChange={e => setPrPayment({ ...prPayment, attachmentName: e.target.files?.[0]?.name || "" })}
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs file:mr-3 file:rounded file:border-0 file:bg-primary/20 file:px-3 file:py-1 file:text-primary" />
                {prPayment.attachmentName && <p className="text-[9px] text-muted mt-1">📎 {prPayment.attachmentName}</p>}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch(`${getApiHost()}/apis/v3/finance/payment-requests/pay/${selectedPR.id}`, {
                        method: "POST", headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          payment_date: prPayment.date ? new Date(prPayment.date).toISOString() : new Date().toISOString(),
                          payment_mode: prPayment.mode,
                          paid_amount: parseFloat(prPayment.paidAmount) || 0,
                          deduction: parseFloat(prPayment.deduction) || 0,
                          tds: parseFloat(prPayment.tds) || 0,
                          remarks: prPayment.remarks,
                          reference_no: prPayment.referenceNo,
                          attachment_name: prPayment.attachmentName,
                        }),
                      });
                      if (res.ok) {
                        const u = await res.json();
                        setSelectedPR(u);
                        setPaymentRequests(paymentRequests.map(p => p.id === u.id ? u : p));
                        setShowRecordPaymentModal(false);
                      }
                    } catch (err) { console.error(err); }
                  }}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
                >Save Payment</button>
                <button onClick={() => setShowRecordPaymentModal(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-white hover:border-white/20 text-xs">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
