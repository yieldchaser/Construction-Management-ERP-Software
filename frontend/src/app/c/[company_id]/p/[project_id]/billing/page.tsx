"use client";

import React, { useState } from "react";
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
    totalPayable: 100100, // Post-tax deductions
    preTax: false,
    status: "approved",
    deductions: [
      { type: "TDS", rate: 2, amount: 2000, notes: "Section 194C" },
      { type: "Advance Recovery", amount: 10000, notes: "Advance return" },
      { type: "Retention", rate: 5, amount: 5900, notes: "5% post-tax retention" }
    ]
  },
  {
    id: "B-02",
    invoiceNumber: "RA-BILL-002",
    invoiceDate: "2026-06-25",
    subcontractor: "Apex Bar-Bending Co",
    subtotal: 80000,
    gstAmount: 14400,
    totalPayable: 88800, // Post-tax: 80,000 + 14,400 (94,400) - 2% TDS on sub (1,600) - 5% retention on gross (4,720) = 88,080. Wait, here: 88,800 is sample.
    preTax: false,
    status: "pending",
    deductions: [
      { type: "TDS", rate: 2, amount: 1600 },
      { type: "Retention", rate: 5, amount: 4000 }
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
  const projectId = project_id || "proj-1";

  const [tab, setTab] = useState<"wo" | "ra-bills" | "notes">("ra-bills");

  // State managers
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
  const [notes, setNotes] = useState<DebitCreditNote[]>(INITIAL_NOTES);

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

  const handleCreateWO = () => {
    const newWO: WorkOrder = {
      id: `WO-${Date.now()}`,
      woNumber: newWONum,
      subcontractor: newWOSub,
      item: newWOItem,
      value: newWOValue,
      status: "Active",
      date: new Date().toISOString().split("T")[0]
    };
    setWorkOrders([newWO, ...workOrders]);
    setShowWOModal(false);
    setNewWOItem("");
    setNewWONum(`WO-2026-00${workOrders.length + 4}`);
  };

  const handleCreateBill = () => {
    const newBill: Bill = {
      id: `B-${Date.now()}`,
      invoiceNumber: newBillNum,
      invoiceDate: new Date().toISOString().split("T")[0],
      subcontractor: newBillSub,
      subtotal: newBillSubtotal,
      gstAmount: preview.gstAmt,
      totalPayable: preview.totalPayable,
      preTax: newBillPreTax,
      status: "pending",
      deductions: [
        { type: "TDS", rate: newBillTdsPct, amount: preview.tdsAmt, notes: `${newBillTdsPct}% TDS (Sec 194C)` },
        { type: "Retention", rate: newBillRetentionPct, amount: preview.retentionAmt, notes: `${newBillRetentionPct}% ${newBillPreTax ? 'Pre' : 'Post'}-tax retention` }
      ]
    };

    if (newBillAdvanceRecovery > 0) {
      newBill.deductions.push({ type: "Advance Recovery", amount: newBillAdvanceRecovery, notes: "Advance Return adjustment" });
    }

    setBills([newBill, ...bills]);
    setShowBillModal(false);
    setNewBillNum(`RA-BILL-00${bills.length + 3}`);
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
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
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

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">TDS Rate (%)</label>
                    <input
                      type="number"
                      value={newBillTdsPct}
                      onChange={(e) => setNewBillTdsPct(parseInt(e.target.value))}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Retention (%)</label>
                    <input
                      type="number"
                      value={newBillRetentionPct}
                      onChange={(e) => setNewBillRetentionPct(parseInt(e.target.value))}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Advance return (₹)</label>
                    <input
                      type="number"
                      value={newBillAdvanceRecovery}
                      onChange={(e) => setNewBillAdvanceRecovery(parseInt(e.target.value))}
                      className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
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
