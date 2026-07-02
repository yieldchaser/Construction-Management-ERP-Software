"use client";
import { getApiHost } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Types
interface Deduction {
  type: "TDS" | "Retention" | "Advance Recovery" | "Material Recovery" | "Security Deposit";
  rate?: number; // percentage
  amount: number;
  notes?: string;
}

interface Bill {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  subcontractor: string;
  subtotal: number;
  gstAmount: number;
  totalPayable: number;
  deductions: Deduction[];
  preTax: boolean;
  status: "approved" | "pending" | "rejected";
}

interface WorkOrder {
  id: string;
  woNumber: string;
  subcontractor: string;
  item: string;
  value: number;
  status: "Active" | "Completed" | "Draft";
  date: string;
}

interface DebitCreditNote {
  id: string;
  type: "debit" | "credit";
  subcontractor: string;
  amount: number;
  notes: string;
  date: string;
  status: "approved" | "pending";
}

// Initial Mock Data
const INITIAL_WORK_ORDERS: WorkOrder[] = [
  { id: "WO-01", woNumber: "WO-2026-001", subcontractor: "Karan Masonry Works", item: "Brickwork & plastering Floor 3-6", value: 1240000, status: "Active", date: "2026-06-12" },
  { id: "WO-02", woNumber: "WO-2026-002", subcontractor: "Apex Bar-Bending Co", item: "Foundation and columns steel reinforcement", value: 580000, status: "Completed", date: "2026-06-14" },
  { id: "WO-03", woNumber: "WO-2026-003", subcontractor: "Metro Plumbing Services", item: "Internal plumbing & duct fit-outs Floor 1-4", value: 340000, status: "Active", date: "2026-06-18" }
];

const INITIAL_BILLS: Bill[] = [
  {
    id: "B-01",
    invoiceNumber: "RA-BILL-001",
    invoiceDate: "2026-06-20",
    subcontractor: "Karan Masonry Works",
    subtotal: 100000,
    gstAmount: 18000,
    totalPayable: 100100, // Gross 118,000 − TDS 2% (2,000) − Advance (10,000) − Retention 5% on gross (5,900) = 100,100
    preTax: false,
    status: "approved",
    deductions: [
      { type: "TDS", rate: 2, amount: 2000, notes: "Section 194C" },
      { type: "Advance Recovery", amount: 10000, notes: "Advance return" },
      { type: "Retention", rate: 5, amount: 5900, notes: "5% of gross (post-GST) retention" }
    ]
  },
  {
    id: "B-02",
    invoiceNumber: "RA-BILL-002",
    invoiceDate: "2026-06-25",
    subcontractor: "Apex Bar-Bending Co",
    subtotal: 80000,
    gstAmount: 14400,
    totalPayable: 88080, // Gross 94,400 − TDS 2% on sub (1,600) − Retention 5% on gross (4,720) = 88,080
    preTax: false,
    status: "pending",
    deductions: [
      { type: "TDS", rate: 2, amount: 1600, notes: "Section 194C" },
      { type: "Retention", rate: 5, amount: 4720, notes: "5% of gross (post-GST) retention" }
    ]
  }
];

const INITIAL_NOTES: DebitCreditNote[] = [
  { id: "DN-01", type: "debit", subcontractor: "Karan Masonry Works", amount: 15000, notes: "Material recovery for cement bags used from client stores", date: "2026-06-18", status: "approved" },
  { id: "CN-01", type: "credit", subcontractor: "Apex Bar-Bending Co", amount: 8000, notes: "Additional cutting waste scrap adjustments approved", date: "2026-06-22", status: "pending" }
];

export default function SubcontractorBillingPage() {
  const { company_id, project_id } = useParams();
  const companyId = company_id || "demo-company";
  const projectId = project_id || "d0000000-0000-0000-0000-000000000001";

  const [tab, setTab] = useState<"wo" | "ra-bills" | "notes">("ra-bills");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams(window.location.search);
      const queryTab = queryParams.get("tab");
      if (queryTab && ["wo", "ra-bills", "notes"].includes(queryTab)) {
        setTab(queryTab as "wo" | "ra-bills" | "notes");
      }
    }
  }, []);

  // State managers
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [notes, setNotes] = useState<DebitCreditNote[]>([]);

  // Subcontractor mapping for UUIDs
  const SUBCON_MAP: Record<string, string> = {
    "Karan Masonry Works": "e0000000-0000-0000-0000-000000000201",
    "Apex Bar-Bending Co": "e0000000-0000-0000-0000-000000000202",
    "Metro Plumbing Services": "e0000000-0000-0000-0000-000000000203",
  };

  const SUBCON_IDS: Record<string, string> = {
    "e0000000-0000-0000-0000-000000000201": "Karan Masonry Works",
    "e0000000-0000-0000-0000-000000000202": "Apex Bar-Bending Co",
    "e0000000-0000-0000-0000-000000000203": "Metro Plumbing Services",
  };

  const fetchWorkOrders = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/work-orders?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((wo: any) => ({
          id: wo.id,
          woNumber: wo.wo_number,
          subcontractor: SUBCON_IDS[wo.subcontractor_id] || "Karan Masonry Works",
          item: wo.items && wo.items.length > 0 ? wo.items[0].description || wo.terms : wo.terms || "Subcontractor Works",
          value: wo.estimated_work_amount,
          status: wo.status === "active" ? "Active" : wo.status,
          date: wo.wo_date ? wo.wo_date.split("T")[0] : "",
        }));
        setWorkOrders(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch work orders", e);
    }
  };

  const fetchBills = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/bills?project_id=${projectId}&invoice_type=subcon`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((bill: any) => ({
          id: bill.id,
          invoiceNumber: bill.invoice_number,
          invoiceDate: bill.invoice_date ? bill.invoice_date.split("T")[0] : "",
          subcontractor: SUBCON_IDS[bill.party_company_user_id] || "Karan Masonry Works",
          subtotal: bill.subtotal,
          gstAmount: bill.gst_amount,
          totalPayable: bill.total_payable,
          preTax: bill.is_milestone_fixed_amount,
          status: bill.status === "Unpaid" ? "pending" : (bill.status === "Paid" ? "approved" : "rejected"),
          deductions: bill.deductions.map((d: any) => ({
            type: d.deduction_type,
            amount: d.amount,
            rate: d.percentage,
            notes: d.notes
          }))
        }));
        setBills(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch bills", e);
    }
  };

  const fetchNotes = async () => {
    try {
      const dnRes = await fetch(`${getApiHost()}/apis/v3/billing/debit-notes?project_id=${projectId}`);
      const cnRes = await fetch(`${getApiHost()}/apis/v3/billing/credit-notes?project_id=${projectId}`);
      let allNotes: DebitCreditNote[] = [];
      if (dnRes.ok) {
        const dnData = await dnRes.json();
        allNotes = allNotes.concat(dnData.map((n: any) => ({
          id: n.id,
          type: "debit",
          subcontractor: SUBCON_IDS[n.party_company_user_id] || "Karan Masonry Works",
          amount: n.total_amount,
          notes: n.notes || "",
          date: n.created_at ? n.created_at.split("T")[0] : "",
          status: n.approval_flag === "auto_approved" ? "approved" : "pending"
        })));
      }
      if (cnRes.ok) {
        const cnData = await cnRes.json();
        allNotes = allNotes.concat(cnData.map((n: any) => ({
          id: n.id,
          type: "credit",
          subcontractor: SUBCON_IDS[n.party_company_user_id] || "Karan Masonry Works",
          amount: n.total_amount,
          notes: n.notes || "",
          date: n.created_at ? n.created_at.split("T")[0] : "",
          status: n.approval_flag === "approved" ? "approved" : "pending"
        })));
      }
      setNotes(allNotes);
    } catch (e) {
      console.error("Failed to fetch debit/credit notes", e);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchWorkOrders();
      fetchBills();
      fetchNotes();
    }
  }, [projectId]);

  // New Work Order Modal & Forms
  const [showWOModal, setShowWOModal] = useState(false);
  const [newWONum, setNewWONum] = useState("WO-2026-004");
  const [newWOSub, setNewWOSub] = useState("Karan Masonry Works");
  const [newWOItem, setNewWOItem] = useState("");
  const [newWOValue, setNewWOValue] = useState(150000);

  // New Bill Modal & Forms
  const [showBillModal, setShowBillModal] = useState(false);
  const [newBillNum, setNewBillNum] = useState("RA-BILL-003");
  const [newBillSub, setNewBillSub] = useState("Karan Masonry Works");
  const [newBillSubtotal, setNewBillSubtotal] = useState(100000);
  const [newBillGstPct, setNewBillGstPct] = useState(18);
  const [newBillTdsPct, setNewBillTdsPct] = useState(2);
  const [newBillRetentionPct, setNewBillRetentionPct] = useState(5);
  const [newBillAdvanceRecovery, setNewBillAdvanceRecovery] = useState(0);
  const [newBillPreTax, setNewBillPreTax] = useState(false);

  // Live Bill Calculation Preview
  const calculateBillPreview = (
    subtotal: number,
    gstPct: number,
    tdsPct: number,
    retentionPct: number,
    advRecovery: number,
    preTax: boolean
  ) => {
    let tdsAmt = 0;
    let retentionAmt = 0;
    let gstAmt = 0;
    let totalPayable = 0;

    tdsAmt = subtotal * (tdsPct / 100);

    if (preTax) {
      // Pre-Tax Deduction Order
      retentionAmt = subtotal * (retentionPct / 100);
      const taxable = subtotal - tdsAmt - retentionAmt - advRecovery;
      gstAmt = taxable * (gstPct / 100);
      totalPayable = taxable + gstAmt;
    } else {
      // Post-Tax Deduction Order (Default)
      gstAmt = subtotal * (gstPct / 100);
      const gross = subtotal + gstAmt;
      retentionAmt = gross * (retentionPct / 100);
      totalPayable = gross - tdsAmt - retentionAmt - advRecovery;
    }

    return {
      gstAmt: Math.round(gstAmt),
      tdsAmt: Math.round(tdsAmt),
      retentionAmt: Math.round(retentionAmt),
      totalPayable: Math.round(totalPayable)
    };
  };

  const preview = calculateBillPreview(
    newBillSubtotal,
    newBillGstPct,
    newBillTdsPct,
    newBillRetentionPct,
    newBillAdvanceRecovery,
    newBillPreTax
  );

  const handleCreateWO = async () => {
    const subconId = SUBCON_MAP[newWOSub] || "e0000000-0000-0000-0000-000000000201";
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/work-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          subcontractor_id: subconId,
          wo_number: newWONum,
          wo_date: new Date().toISOString(),
          items: [
            {
              boq_item_id: null,
              task_id: null,
              quantity: 1,
              rate: newWOValue
            }
          ],
          terms: newWOItem
        })
      });
      if (res.ok) {
        fetchWorkOrders();
        setShowWOModal(false);
        setNewWOItem("");
        setNewWONum(`WO-2026-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } catch (e) {
      console.error("Failed to create work order", e);
    }
  };

  const handleCreateBill = async () => {
    const subconId = SUBCON_MAP[newBillSub] || "e0000000-0000-0000-0000-000000000201";
    const deductions: Array<{ deduction_type: string; amount: number; percentage: number | null; notes: string }> = [
      { deduction_type: "TDS", amount: preview.tdsAmt, percentage: newBillTdsPct, notes: `${newBillTdsPct}% TDS (Sec 194C)` },
      { deduction_type: "Retention", amount: preview.retentionAmt, percentage: newBillRetentionPct, notes: `${newBillRetentionPct}% ${newBillPreTax ? 'Pre' : 'Post'}-tax retention` }
    ];

    if (newBillAdvanceRecovery > 0) {
      deductions.push({ deduction_type: "Advance Recovery", amount: newBillAdvanceRecovery, percentage: null, notes: "Advance Return adjustment" });
    }

    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/bills`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          party_company_user_id: subconId,
          invoice_number: newBillNum,
          invoice_date: new Date().toISOString(),
          invoice_type: "subcon",
          subtotal: newBillSubtotal,
          gst_pct: newBillGstPct,
          deductions: deductions,
          pre_tax_deductions: newBillPreTax
        })
      });
      if (res.ok) {
        fetchBills();
        setShowBillModal(false);
        setNewBillNum(`RA-BILL-${Math.floor(1000 + Math.random() * 9000)}`);
      }
    } catch (e) {
      console.error("Failed to create bill", e);
    }
  };

  const handleApproveBill = (id: string) => {
    setBills(prev => prev.map(b => {
      if (b.id === id) {
        return { ...b, status: "approved" };
      }
      return b;
    }));
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden font-sans">
      
      {/* Sidebar Navigation */}
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 overflow-y-auto space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">
            ← Dashboard
          </Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Subcontractors</div>
          {[
            { key: "ra-bills", label: "RA Bills (Subcon)", icon: "💵" },
            { key: "wo", label: "Work Orders", icon: "📐" },
            { key: "notes", label: "Debit/Credit Notes", icon: "⚖️" }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as typeof tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left cursor-pointer ${
                tab === item.key
                  ? "bg-white/[0.06] text-white font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden relative font-sans">
        
        {/* Background Glowing Rings */}
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-[0.02] blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Subcontractor Billing & WOs</h1>
            <p className="text-[10px] text-zinc-500">RA Billing Engine · Post-tax & Pre-tax Retentions · TDS Auditor Logs</p>
          </div>
          <button
            onClick={() => {
              if (tab === "wo") setShowWOModal(true);
              else setShowBillModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/10"
          >
            {tab === "wo" ? "+ Create Work Order" : "+ Submit RA Bill"}
          </button>
        </div>

        {/* Workspace Body */}
        <div className="flex-1 overflow-y-auto p-6 z-10">

          {/* TAB: RA Bills */}
          {tab === "ra-bills" && (
            <div className="space-y-6">
              
              {/* Quick stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total RA Billing MTD", value: "₹1.80L", sub: "Subtotal billed", color: "text-white" },
                  { label: "Pending Audit Approval", value: "₹88.8K", sub: "1 Bill pending", color: "text-amber-400" },
                  { label: "Total Retentions Held", value: "₹9.9K", sub: "Post-tax contract buffer", color: "text-blue-400" },
                  { label: "Net Payable Settled", value: "₹1.00L", sub: "B-01 fully paid", color: "text-primary" }
                ].map((s, idx) => (
                  <div key={idx} className="glass-panel p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">{s.label}</span>
                    <span className={`text-2xl font-extrabold mt-1 block ${s.color}`}>{s.value}</span>
                    <span className="text-[10px] text-zinc-600 block mt-0.5">{s.sub}</span>
                  </div>
                ))}
              </div>

              {/* Bills List Table */}
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Subcontractor RA Bills</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">Bill Number</th>
                        <th className="px-5 py-3 font-bold">Subcontractor</th>
                        <th className="px-5 py-3 font-bold">Billed Subtotal</th>
                        <th className="px-5 py-3 font-bold">GST Amount</th>
                        <th className="px-5 py-3 font-bold">Deductions (TDS/Retention)</th>
                        <th className="px-5 py-3 font-bold">Deduction Tax Mode</th>
                        <th className="px-5 py-3 font-bold">Net Payable</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                        <th className="px-5 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bills.map((bill) => (
                        <tr key={bill.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 font-mono text-primary font-bold">{bill.invoiceNumber}</td>
                          <td className="px-5 py-3.5 text-white font-semibold">{bill.subcontractor}</td>
                          <td className="px-5 py-3.5 font-bold text-zinc-300">₹{bill.subtotal.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-zinc-400">₹{bill.gstAmount.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-zinc-400 max-w-[200px]">
                            <div className="flex flex-wrap gap-1">
                              {bill.deductions.map((d, idx) => (
                                <span key={idx} className="bg-white/5 border border-white/10 text-[9px] px-1.5 py-0.5 rounded text-zinc-400">
                                  {d.type}: ₹{d.amount.toLocaleString()}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-zinc-500 font-bold uppercase text-[10px]">{bill.preTax ? "Pre-Tax" : "Post-Tax"}</span>
                          </td>
                          <td className="px-5 py-3.5 font-extrabold text-white">₹{bill.totalPayable.toLocaleString()}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              bill.status === "approved"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {bill.status === "pending" && (
                              <button
                                onClick={() => handleApproveBill(bill.id)}
                                className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                ✓ Auditor Approve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: Work Orders */}
          {tab === "wo" && (
            <div className="space-y-6">
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Active Work Orders</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">WO Number</th>
                        <th className="px-5 py-3 font-bold">Subcontractor</th>
                        <th className="px-5 py-3 font-bold">Work Scope / Details</th>
                        <th className="px-5 py-3 font-bold">Estimated WO Amount</th>
                        <th className="px-5 py-3 font-bold">Date Issued</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workOrders.map((wo) => (
                        <tr key={wo.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 font-mono text-secondary font-bold">{wo.woNumber}</td>
                          <td className="px-5 py-3.5 text-white font-semibold">{wo.subcontractor}</td>
                          <td className="px-5 py-3.5 text-zinc-400">{wo.item}</td>
                          <td className="px-5 py-3.5 font-bold text-white">₹{wo.value.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-zinc-500">{wo.date}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              wo.status === "Completed"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            }`}>
                              {wo.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Debit/Credit Notes */}
          {tab === "notes" && (
            <div className="space-y-6">
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Debit & Credit Notes Ledger</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">Note ID</th>
                        <th className="px-5 py-3 font-bold">Subcontractor</th>
                        <th className="px-5 py-3 font-bold">Amount Adjustment</th>
                        <th className="px-5 py-3 font-bold">Description Notes</th>
                        <th className="px-5 py-3 font-bold">Movement Type</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                        <th className="px-5 py-3 font-bold">Date Logged</th>
                      </tr>
                    </thead>
                    <tbody>
                      {notes.map((note) => (
                        <tr key={note.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 font-mono text-zinc-500">{note.id}</td>
                          <td className="px-5 py-3.5 text-white font-semibold">{note.subcontractor}</td>
                          <td className={`px-5 py-3.5 font-mono font-bold ${note.type === "credit" ? "text-green-400" : "text-red-400"}`}>
                            {note.type === "credit" ? "+" : "-"}${(note.amount).toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400">{note.notes}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              note.type === "credit"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {note.type.toUpperCase() + " NOTE"}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400 font-semibold">{note.status.toUpperCase()}</td>
                          <td className="px-5 py-3.5 text-zinc-500">{note.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modal: Create Work Order */}
      {showWOModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Create Work Order (WO)</h3>
              <p className="text-xs text-zinc-400 mt-1">Issue a formal contract scope for labor works.</p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">WO Serial Code</label>
                  <input
                    type="text"
                    value={newWONum}
                    onChange={(e) => setNewWONum(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Subcontractor</label>
                  <select
                    value={newWOSub}
                    onChange={(e) => setNewWOSub(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-semibold"
                  >
                    <option value="Karan Masonry Works">Karan Masonry Works</option>
                    <option value="Apex Bar-Bending Co">Apex Bar-Bending Co</option>
                    <option value="Metro Plumbing Services">Metro Plumbing Services</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Work Description / Scope</label>
                <textarea
                  value={newWOItem}
                  onChange={(e) => setNewWOItem(e.target.value)}
                  placeholder="Bricklaying, plastering, or BBS detailing..."
                  rows={2}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Total Estimated Value (₹)</label>
                <input
                  type="number"
                  value={newWOValue}
                  onChange={(e) => setNewWOValue(parseInt(e.target.value))}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowWOModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateWO} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Submit WO</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create RA Bill (with interactive math engine preview) */}
      {showBillModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-panel w-full max-w-2xl border border-white/10 rounded-3xl p-6 grid grid-cols-12 gap-6 my-10">
            
            {/* Form Column */}
            <div className="col-span-12 md:col-span-7 space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-white font-sans">Submit Subcontractor RA Bill</h3>
                <p className="text-xs text-zinc-400 mt-1">Submit subcontractor bills with real-time deduction auditing.</p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Bill Serial ID</label>
                    <input
                      type="text"
                      value={newBillNum}
                      onChange={(e) => setNewBillNum(e.target.value)}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Subcontractor</label>
                    <select
                      value={newBillSub}
                      onChange={(e) => setNewBillSub(e.target.value)}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-semibold"
                    >
                      <option value="Karan Masonry Works">Karan Masonry Works</option>
                      <option value="Apex Bar-Bending Co">Apex Bar-Bending Co</option>
                      <option value="Metro Plumbing Services">Metro Plumbing Services</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Billed Subtotal (₹)</label>
                    <input
                      type="number"
                      value={newBillSubtotal}
                      onChange={(e) => setNewBillSubtotal(parseInt(e.target.value))}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">GST Percentage (%)</label>
                    <input
                      type="number"
                      value={newBillGstPct}
                      onChange={(e) => setNewBillGstPct(parseInt(e.target.value))}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">TDS Rate Preset</label>
                    <div className="flex gap-1 mb-1.5">
                      <button
                        type="button"
                        onClick={() => setNewBillTdsPct(1)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer ${
                          newBillTdsPct === 1
                            ? "bg-primary border-primary text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        1% (194C Indiv)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewBillTdsPct(2)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer ${
                          newBillTdsPct === 2
                            ? "bg-primary border-primary text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        2% (194C Corp)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewBillTdsPct(0.1)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer ${
                          newBillTdsPct === 0.1
                            ? "bg-primary border-primary text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        0.1% (194Q)
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        value={newBillTdsPct}
                        onChange={(e) => setNewBillTdsPct(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">GST Rate Preset</label>
                    <div className="flex gap-1 mb-1.5">
                      <button
                        type="button"
                        onClick={() => setNewBillGstPct(18)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer ${
                          newBillGstPct === 18
                            ? "bg-secondary border-secondary text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        18% (Works Contract)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewBillGstPct(12)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer ${
                          newBillGstPct === 12
                            ? "bg-secondary border-secondary text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        12% (Infra)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewBillGstPct(5)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition-all cursor-pointer ${
                          newBillGstPct === 5
                            ? "bg-secondary border-secondary text-white"
                            : "bg-white/[0.02] border-white/5 text-zinc-400 hover:text-white"
                        }`}
                      >
                        5% (Housing)
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type="number"
                        value={newBillGstPct}
                        onChange={(e) => setNewBillGstPct(parseInt(e.target.value) || 0)}
                        className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-mono"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-[10px]">%</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Retention (%)</label>
                    <input
                      type="number"
                      value={newBillRetentionPct}
                      onChange={(e) => setNewBillRetentionPct(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Advance Return (₹)</label>
                    <input
                      type="number"
                      value={newBillAdvanceRecovery}
                      onChange={(e) => setNewBillAdvanceRecovery(parseInt(e.target.value) || 0)}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Pre-tax toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-xs font-bold text-white block">Pre-Tax Deductions Order</span>
                    <span className="text-[9px] text-zinc-500">Calculate retentions and TDS before applying GST.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={newBillPreTax}
                    onChange={(e) => setNewBillPreTax(e.target.checked)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowBillModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
                <button onClick={handleCreateBill} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Submit RA Bill</button>
              </div>
            </div>

            {/* Billing Engine Calculator Preview Column */}
            <div className="col-span-12 md:col-span-5 bg-white/[0.02] border border-white/5 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">Billing Engine Preview</h4>
                <p className="text-[9px] text-zinc-500 mt-1 leading-snug">Calculated live according to IS-456 standards and audited pre/post tax priorities.</p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono font-bold text-white">₹{newBillSubtotal.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between text-zinc-400">
                  <span>TDS ({newBillTdsPct}%):</span>
                  <span className="font-mono text-red-400">-₹{preview.tdsAmt.toLocaleString()}</span>
                </div>

                <div className="flex justify-between text-zinc-400">
                  <span>Retention ({newBillRetentionPct}%):</span>
                  <span className="font-mono text-red-400">-₹{preview.retentionAmt.toLocaleString()}</span>
                </div>

                {newBillAdvanceRecovery > 0 && (
                  <div className="flex justify-between text-zinc-400">
                    <span>Advance Recovery:</span>
                    <span className="font-mono text-red-400">-₹{newBillAdvanceRecovery.toLocaleString()}</span>
                  </div>
                )}

                <div className="flex justify-between text-zinc-400 border-t border-white/5 pt-2">
                  <span>GST ({newBillGstPct}%):</span>
                  <span className="font-mono text-green-400">+₹{preview.gstAmt.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center text-white border-t border-white/10 pt-3 mt-1 font-extrabold text-sm">
                  <span>Net Payable:</span>
                  <span className="font-mono text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-lg">
                    ₹{preview.totalPayable.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Information alert details */}
              <div className="p-3 bg-secondary/10 border border-secondary/20 rounded-xl text-[9px] text-zinc-400 leading-normal">
                {newBillPreTax ? (
                  <span><strong>Pre-tax Mode ON:</strong> Deductions are subtracted from the subtotal first. GST is applied on the remaining taxable amount.</span>
                ) : (
                  <span><strong>Post-tax Mode ON (Default):</strong> GST is applied on the subtotal first. TDS is computed on the subtotal, while Retention is computed on the GST-inclusive total.</span>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
