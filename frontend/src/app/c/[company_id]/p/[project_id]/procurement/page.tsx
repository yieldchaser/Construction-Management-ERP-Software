"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Types
interface IndentItem {
  name: string;
  qty: number;
  unit: string;
}

interface Indent {
  id: string;
  indentNumber: string;
  items: IndentItem[];
  status: "pending" | "approved" | "ordered";
  requestedBy: string;
  date: string;
}

interface POItem {
  name: string;
  qty: number;
  unit: string;
  rate: number;
}

interface PO {
  id: string;
  poNumber: string;
  vendor: string;
  items: POItem[];
  grossAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: "draft" | "approved" | "sent" | "partial" | "received" | "closed";
  approvalFlag: "pending" | "approved" | "rejected";
  date: string;
}

interface GRN {
  id: string;
  grnNumber: string;
  poNumber: string;
  receivedDate: string;
  receivedBy: string;
  items: { name: string; qty: number; unit: string }[];
}

interface InventoryItem {
  name: string;
  onHand: number;
  reserved: number;
  unit: string;
  minAlertThreshold: number;
}

interface Transaction {
  id: string;
  materialName: string;
  qty: number;
  unit: string;
  type: "received" | "used" | "transferred" | "returned";
  sourceRef: string;
  date: string;
}

// Initial Data
const INITIAL_INDENTS: Indent[] = [
  {
    id: "IND-01",
    indentNumber: "IND-2026-001",
    items: [
      { name: "UltraTech Cement", qty: 150, unit: "bags" },
      { name: "TMT Steel 16mm", qty: 5.5, unit: "tons" }
    ],
    status: "approved",
    requestedBy: "Suresh R (Project Manager)",
    date: "2026-06-20"
  },
  {
    id: "IND-02",
    indentNumber: "IND-2026-002",
    items: [
      { name: "Traditional Clay Bricks", qty: 8000, unit: "nos" },
      { name: "Fine River Sand", qty: 12, unit: "m³" }
    ],
    status: "pending",
    requestedBy: "Amit K (Site Engineer)",
    date: "2026-06-25"
  }
];

const INITIAL_POS: PO[] = [
  {
    id: "PO-01",
    poNumber: "PO-2026-041",
    vendor: "National Steel Suppliers",
    items: [
      { name: "TMT Steel 16mm", qty: 4, unit: "tons", rate: 62000 }
    ],
    grossAmount: 248000,
    taxAmount: 44640,
    totalAmount: 292640,
    status: "sent",
    approvalFlag: "approved",
    date: "2026-06-22"
  },
  {
    id: "PO-02",
    poNumber: "PO-2026-042",
    vendor: "Shree Cement Traders",
    items: [
      { name: "UltraTech Cement", qty: 100, unit: "bags", rate: 410 }
    ],
    grossAmount: 41000,
    taxAmount: 7380,
    totalAmount: 48380,
    status: "draft",
    approvalFlag: "pending",
    date: "2026-06-24"
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { name: "TMT Steel 16mm", onHand: 12.5, reserved: 4.0, unit: "tons", minAlertThreshold: 5.0 },
  { name: "UltraTech Cement", onHand: 85.0, reserved: 50.0, unit: "bags", minAlertThreshold: 100.0 }, // Under threshold -> trigger alert!
  { name: "Traditional Clay Bricks", onHand: 14000, reserved: 3000, unit: "nos", minAlertThreshold: 5000 },
  { name: "Fine River Sand", onHand: 8.5, reserved: 0.0, unit: "m³", minAlertThreshold: 10.0 } // Under threshold
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "TXN-01", materialName: "UltraTech Cement", qty: 120, unit: "bags", type: "received", sourceRef: "GRN-2026-004", date: "2026-06-18" },
  { id: "TXN-02", materialName: "UltraTech Cement", qty: 35, unit: "bags", type: "used", sourceRef: "DPR Floor 5 Slab", date: "2026-06-22" },
  { id: "TXN-03", materialName: "TMT Steel 16mm", qty: 8.0, unit: "tons", type: "received", sourceRef: "GRN-2026-005", date: "2026-06-23" }
];

const VENDORS = [
  { id: "V001", name: "Shree Cement Traders", category: "Cement & Aggregate", rating: 4.8, city: "Delhi", status: "Active" },
  { id: "V002", name: "National Steel Suppliers", category: "TMT & Steel", rating: 4.5, city: "Mumbai", status: "Active" },
  { id: "V003", name: "RajBuild Hardware", category: "Hardware & Fittings", rating: 4.2, city: "Pune", status: "Active" },
  { id: "V004", name: "Indus Paint House", category: "Paints & Chemicals", rating: 3.9, city: "Chennai", status: "On Hold" }
];

export default function ProcurementPage() {
  const { company_id, project_id } = useParams();
  const companyId = company_id || "demo-company";
  const projectId = project_id || "d0000000-0000-0000-0000-000000000001";

  const [tab, setTab] = useState<"po" | "indent" | "inventory" | "ledger" | "vendors">("po");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams(window.location.search);
      const queryTab = queryParams.get("tab");
      if (queryTab && ["po", "indent", "inventory", "ledger", "vendors"].includes(queryTab)) {
        setTab(queryTab as "po" | "indent" | "inventory" | "ledger" | "vendors");
      }
    }
  }, []);

  // State managers
  const [indents, setIndents] = useState<Indent[]>(INITIAL_INDENTS);
  const [pos, setPos] = useState<PO[]>(INITIAL_POS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);

  // Modal control states
  const [showIndentModal, setShowIndentModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);

  // New Indent form state
  const [newIndentNum, setNewIndentNum] = useState("IND-2026-003");
  const [newIndentMaterial, setNewIndentMaterial] = useState("UltraTech Cement");
  const [newIndentQty, setNewIndentQty] = useState(50);
  const [newIndentUnit, setNewIndentUnit] = useState("bags");

  // New PO form state
  const [newPONum, setNewPONum] = useState("PO-2026-043");
  const [newPOVendor, setNewPOVendor] = useState("Shree Cement Traders");
  const [newPOMaterial, setNewPOMaterial] = useState("UltraTech Cement");
  const [newPOQty, setNewPOQty] = useState(100);
  const [newPORate, setNewPORate] = useState(410);

  // GRN form state
  const [activePOForGRN, setActivePOForGRN] = useState<PO | null>(null);
  const [grnNum, setGrnNum] = useState("GRN-2026-010");
  const [receivedQty, setReceivedQty] = useState<number>(0);

  // Material usage form state
  const [useMaterialName, setUseMaterialName] = useState("UltraTech Cement");
  const [useQty, setUseQty] = useState(10);
  const [useSourceRef, setUseSourceRef] = useState("DPR Column C-1 concrete pour");

  // Add Material Indent Submission
  const handleCreateIndent = () => {
    const newIndent: Indent = {
      id: `IND-${Date.now()}`,
      indentNumber: newIndentNum,
      items: [{ name: newIndentMaterial, qty: newIndentQty, unit: newIndentUnit }],
      status: "pending",
      requestedBy: "Amit K (Site Engineer)",
      date: new Date().toISOString().split("T")[0]
    };
    setIndents([newIndent, ...indents]);
    setShowIndentModal(false);
    // Auto increment default serial
    setNewIndentNum(`IND-2026-0${indents.length + 4}`);
  };

  // Approve Indent
  const handleApproveIndent = (id: string) => {
    setIndents(prev => prev.map(ind => {
      if (ind.id === id) {
        return { ...ind, status: "approved" };
      }
      return ind;
    }));
  };

  // Add Purchase Order Submission
  const handleCreatePO = () => {
    const gross = newPOQty * newPORate;
    const tax = gross * 0.18;
    const total = gross + tax;

    const newPO: PO = {
      id: `PO-${Date.now()}`,
      poNumber: newPONum,
      vendor: newPOVendor,
      items: [{ name: newPOMaterial, qty: newPOQty, unit: newPOMaterial.includes("Cement") ? "bags" : "tons", rate: newPORate }],
      grossAmount: gross,
      taxAmount: tax,
      totalAmount: total,
      status: "draft",
      approvalFlag: "pending",
      date: new Date().toISOString().split("T")[0]
    };
    setPos([newPO, ...pos]);
    setShowPOModal(false);
    setNewPONum(`PO-2026-0${pos.length + 43}`);
  };

  // Approve PO
  const handleApprovePO = (id: string) => {
    setPos(prev => prev.map(po => {
      if (po.id === id) {
        return { ...po, status: "sent", approvalFlag: "approved" };
      }
      return po;
    }));
  };

  // Trigger GRN (Receipt of goods) -> Updates inventory and transactions
  const handleCreateGRN = () => {
    if (!activePOForGRN) return;
    const poItem = activePOForGRN.items[0];

    // 1. Update PO Status
    setPos(prev => prev.map(p => {
      if (p.id === activePOForGRN.id) {
        return { ...p, status: "received" };
      }
      return p;
    }));

    // 2. Increment Warehouse Inventory (on_hand_qty)
    setInventory(prev => {
      const exists = prev.some(i => i.name === poItem.name);
      if (exists) {
        return prev.map(i => {
          if (i.name === poItem.name) {
            return { ...i, onHand: i.onHand + receivedQty };
          }
          return i;
        });
      } else {
        return [...prev, { name: poItem.name, onHand: receivedQty, reserved: 0, unit: poItem.unit, minAlertThreshold: 50 }];
      }
    });

    // 3. Log Material Transaction
    const newTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      materialName: poItem.name,
      qty: receivedQty,
      unit: poItem.unit,
      type: "received",
      sourceRef: grnNum,
      date: new Date().toISOString().split("T")[0]
    };
    setTransactions([newTxn, ...transactions]);

    setShowGRNModal(false);
    setActivePOForGRN(null);
    setGrnNum(`GRN-2026-0${transactions.length + 11}`);
  };

  // Log Material Usage (Used on Site) -> Deducts inventory and logs transaction
  const handleLogUsage = () => {
    if (useQty <= 0) return;

    // 1. Decrement Inventory onHand levels
    setInventory(prev => prev.map(i => {
      if (i.name === useMaterialName) {
        const remaining = Math.max(0, i.onHand - useQty);
        return { ...i, onHand: remaining };
      }
      return i;
    }));

    // 2. Log Transaction
    const newTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      materialName: useMaterialName,
      qty: useQty,
      unit: useMaterialName.includes("Cement") ? "bags" : useMaterialName.includes("Bricks") ? "nos" : "tons",
      type: "used",
      sourceRef: useSourceRef,
      date: new Date().toISOString().split("T")[0]
    };
    setTransactions([newTxn, ...transactions]);
    setShowUseModal(false);
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
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Procurement</div>
          {[
            { key: "po", label: "Purchase Orders", icon: "📋" },
            { key: "indent", label: "Material Indents", icon: "📑" },
            { key: "inventory", label: "Warehouse Inventory", icon: "📦" },
            { key: "ledger", label: "Transaction Ledger", icon: "⚖️" },
            { key: "vendors", label: "Vendor Directory", icon: "🏭" },
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
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-[0.02] blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-[0.02] blur-[120px] pointer-events-none" />

        {/* Topbar */}
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3.5 flex items-center justify-between z-10">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Procurement & Warehouse</h1>
            <p className="text-[10px] text-zinc-500">IND-to-PO Workflows & Stateful Inventory Stock Logs</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowUseModal(true)}
              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold hover:bg-white/[0.05] transition-all cursor-pointer"
            >
              - Log Stock Usage
            </button>
            <button
              onClick={() => {
                if (tab === "indent") setShowIndentModal(true);
                else setShowPOModal(true);
              }}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all cursor-pointer shadow-lg shadow-primary/10"
            >
              {tab === "indent" ? "+ Create Indent" : "+ New Purchase Order"}
            </button>
          </div>
        </div>

        {/* Workspace body */}
        <div className="flex-1 overflow-y-auto p-6 z-10">

          {/* TAB: Purchase Orders */}
          {tab === "po" && (
            <div className="space-y-6">
              {/* Stats overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total PO Value", value: "₹3.41L", sub: "Approved spend", color: "text-white" },
                  { label: "Pending Approvals", value: "1 Draft", sub: "PO-2026-042", color: "text-amber-400" },
                  { label: "Materials Ordered", value: "2 categories", sub: "Steel & Cement", color: "text-blue-400" },
                  { label: "Spent Month-to-date", value: "₹2.92L", sub: "Remaining Budget: ₹1.2L", color: "text-primary" }
                ].map((s, idx) => (
                  <div key={idx} className="glass-panel p-4 rounded-xl border border-white/5">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">{s.label}</span>
                    <span className={`text-2xl font-extrabold mt-1 block ${s.color}`}>{s.value}</span>
                    <span className="text-[10px] text-zinc-600 block mt-0.5">{s.sub}</span>
                  </div>
                ))}
              </div>

              {/* PO List */}
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Project Purchase Orders</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">PO Number</th>
                        <th className="px-5 py-3 font-bold">Vendor</th>
                        <th className="px-5 py-3 font-bold">Material Item</th>
                        <th className="px-5 py-3 font-bold">Total Amount</th>
                        <th className="px-5 py-3 font-bold">Approval</th>
                        <th className="px-5 py-3 font-bold">Delivery Status</th>
                        <th className="px-5 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pos.map((po) => (
                        <tr key={po.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 font-mono text-primary font-bold">{po.poNumber}</td>
                          <td className="px-5 py-3.5 text-white font-semibold">{po.vendor}</td>
                          <td className="px-5 py-3.5 text-zinc-400">
                            {po.items.map((i, idx) => (
                              <span key={idx}>{i.name} — {i.qty} {i.unit}</span>
                            ))}
                          </td>
                          <td className="px-5 py-3.5 font-bold text-white">₹{po.totalAmount.toLocaleString()}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              po.approvalFlag === "approved"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {po.approvalFlag}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-zinc-400 font-semibold">{po.status.toUpperCase()}</span>
                          </td>
                          <td className="px-5 py-3.5 text-right space-x-2">
                            {po.approvalFlag === "pending" && (
                              <button
                                onClick={() => handleApprovePO(po.id)}
                                className="bg-green-600 hover:bg-green-500 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                ✓ Approve PO
                              </button>
                            )}
                            {po.approvalFlag === "approved" && po.status === "sent" && (
                              <button
                                onClick={() => {
                                  setActivePOForGRN(po);
                                  setReceivedQty(po.items[0].qty);
                                  setShowGRNModal(true);
                                }}
                                className="bg-secondary hover:bg-[#8B73FF] text-white rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                📥 Log GRN Receipt
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

          {/* TAB: Material Indents */}
          {tab === "indent" && (
            <div className="space-y-6">
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Material Request Indents</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">Indent ID</th>
                        <th className="px-5 py-3 font-bold">Requested By</th>
                        <th className="px-5 py-3 font-bold">Requested Material</th>
                        <th className="px-5 py-3 font-bold">Date</th>
                        <th className="px-5 py-3 font-bold">Status</th>
                        <th className="px-5 py-3 font-bold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indents.map((ind) => (
                        <tr key={ind.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 font-mono text-secondary font-bold">{ind.indentNumber}</td>
                          <td className="px-5 py-3.5 text-white font-semibold">{ind.requestedBy}</td>
                          <td className="px-5 py-3.5 text-zinc-400">
                            {ind.items.map((i, idx) => (
                              <span key={idx}>{i.name} — {i.qty} {i.unit}</span>
                            ))}
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500">{ind.date}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              ind.status === "approved"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : ind.status === "ordered"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {ind.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            {ind.status === "pending" && (
                              <button
                                onClick={() => handleApproveIndent(ind.id)}
                                className="bg-primary hover:opacity-90 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Approve Request
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

          {/* TAB: Warehouse Inventory */}
          {tab === "inventory" && (
            <div className="space-y-6">
              
              {/* Alert notification panels for low stock */}
              <div className="space-y-2">
                {inventory.map((item, idx) => {
                  const isLow = item.onHand < item.minAlertThreshold;
                  if (!isLow) return null;
                  return (
                    <div key={idx} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">⚠️</span>
                        <div className="text-xs">
                          <span className="font-extrabold text-amber-400">Low Stock Alert: </span>
                          <span>{item.name} is currently at <strong>{item.onHand} {item.unit}</strong> (Threshold: {item.minAlertThreshold} {item.unit}). Create a material indent immediately.</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setNewIndentMaterial(item.name);
                          setNewIndentQty(item.minAlertThreshold * 2);
                          setNewIndentUnit(item.unit);
                          setShowIndentModal(true);
                        }}
                        className="bg-amber-500 text-black px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-amber-400 transition-all cursor-pointer"
                      >
                        Reorder Stock
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Inventory Table */}
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Warehouse Inventory On Hand</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">Material Name</th>
                        <th className="px-5 py-3 font-bold">Quantity On Hand</th>
                        <th className="px-5 py-3 font-bold">Quantity Reserved</th>
                        <th className="px-5 py-3 font-bold">Unit Type</th>
                        <th className="px-5 py-3 font-bold">Minimum Threshold</th>
                        <th className="px-5 py-3 font-bold">Status Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventory.map((item, idx) => {
                        const isLow = item.onHand < item.minAlertThreshold;
                        return (
                          <tr key={idx} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                            <td className="px-5 py-3.5 text-white font-extrabold">{item.name}</td>
                            <td className={`px-5 py-3.5 font-mono font-extrabold ${isLow ? "text-amber-400" : "text-white"}`}>
                              {item.onHand.toLocaleString()}
                            </td>
                            <td className="px-5 py-3.5 font-mono text-zinc-400">{item.reserved.toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-zinc-500 font-semibold">{item.unit}</td>
                            <td className="px-5 py-3.5 font-mono text-zinc-600">{item.minAlertThreshold.toLocaleString()}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isLow
                                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  : "bg-green-500/10 text-green-400 border border-green-500/20"
                              }`}>
                                {isLow ? "Low Stock" : "Sufficient"}
                              </span>
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

          {/* TAB: Transactions Ledger */}
          {tab === "ledger" && (
            <div className="space-y-6">
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Material Transaction logs</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="px-5 py-3 font-bold">Transaction ID</th>
                        <th className="px-5 py-3 font-bold">Material Name</th>
                        <th className="px-5 py-3 font-bold">Quantity</th>
                        <th className="px-5 py-3 font-bold">Unit Type</th>
                        <th className="px-5 py-3 font-bold">Movement Type</th>
                        <th className="px-5 py-3 font-bold">Source Reference</th>
                        <th className="px-5 py-3 font-bold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="border-b border-white/[0.02] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3.5 font-mono text-zinc-500">{txn.id}</td>
                          <td className="px-5 py-3.5 text-white font-semibold">{txn.materialName}</td>
                          <td className={`px-5 py-3.5 font-mono font-bold ${txn.type === "received" ? "text-green-400" : "text-red-400"}`}>
                            {txn.type === "received" ? "+" : "-"}{txn.qty}
                          </td>
                          <td className="px-5 py-3.5 text-zinc-500">{txn.unit}</td>
                          <td className="px-5 py-3.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              txn.type === "received"
                                ? "bg-green-500/10 text-green-400 border border-green-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            }`}>
                              {txn.type}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400 font-medium">{txn.sourceRef}</td>
                          <td className="px-5 py-3.5 text-zinc-500">{txn.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Vendor Directory */}
          {tab === "vendors" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {VENDORS.map((v) => (
                <div key={v.id} className="glass-panel p-5 border border-white/5 rounded-2xl space-y-3 hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-sm font-bold text-white">{v.name}</h3>
                      <span className="text-[10px] text-zinc-500">{v.category} · {v.city}</span>
                    </div>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                      {v.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs border-t border-white/5 pt-3 mt-3">
                    <span className="text-zinc-500">Rating: <strong className="text-amber-400">★ {v.rating}</strong></span>
                    <button className="text-primary font-bold hover:underline">View Ledger →</button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>

      {/* Modal: Create Material Indent */}
      {showIndentModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Create Material Indent</h3>
              <p className="text-xs text-zinc-400 mt-1">Submit a site request for raw construction materials.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Indent Serial Number</label>
                <input
                  type="text"
                  value={newIndentNum}
                  onChange={(e) => setNewIndentNum(e.target.value)}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Material</label>
                  <select
                    value={newIndentMaterial}
                    onChange={(e) => setNewIndentMaterial(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  >
                    <option value="UltraTech Cement">UltraTech Cement</option>
                    <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                    <option value="Traditional Clay Bricks">Traditional Clay Bricks</option>
                    <option value="Fine River Sand">Fine River Sand</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newIndentQty}
                    onChange={(e) => setNewIndentQty(parseInt(e.target.value))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowIndentModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateIndent} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Place Request</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Purchase Order */}
      {showPOModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Create Purchase Order (PO)</h3>
              <p className="text-xs text-zinc-400 mt-1">Issue a formal purchase order to a registered vendor.</p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">PO Number</label>
                  <input
                    type="text"
                    value={newPONum}
                    onChange={(e) => setNewPONum(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Vendor</label>
                  <select
                    value={newPOVendor}
                    onChange={(e) => setNewPOVendor(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-semibold"
                  >
                    <option value="Shree Cement Traders">Shree Cement Traders</option>
                    <option value="National Steel Suppliers">National Steel Suppliers</option>
                    <option value="RajBuild Hardware">RajBuild Hardware</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Material Name</label>
                  <select
                    value={newPOMaterial}
                    onChange={(e) => setNewPOMaterial(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  >
                    <option value="UltraTech Cement">UltraTech Cement</option>
                    <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Quantity</label>
                  <input
                    type="number"
                    value={newPOQty}
                    onChange={(e) => setNewPOQty(parseInt(e.target.value))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Negotiated Rate (₹)</label>
                <input
                  type="number"
                  value={newPORate}
                  onChange={(e) => setNewPORate(parseInt(e.target.value))}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowPOModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreatePO} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Submit PO</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Goods Receipt Note (GRN) */}
      {showGRNModal && activePOForGRN && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Log Goods Receipt (GRN)</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Record incoming materials delivery for <strong>{activePOForGRN.poNumber}</strong>.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">GRN Serial ID</label>
                <input
                  type="text"
                  value={grnNum}
                  onChange={(e) => setGrnNum(e.target.value)}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Received Quantity ({activePOForGRN.items[0].name})
                </label>
                <input
                  type="number"
                  value={receivedQty}
                  onChange={(e) => setReceivedQty(parseFloat(e.target.value))}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-bold font-mono"
                />
                <span className="text-[10px] text-zinc-500 mt-1 block">PO Ordered Qty: {activePOForGRN.items[0].qty} {activePOForGRN.items[0].name.includes("Cement") ? "bags" : "tons"}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setShowGRNModal(false); setActivePOForGRN(null); }} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateGRN} className="bg-secondary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Submit Receipt</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Stock Usage */}
      {showUseModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Log Material Usage (Deduction)</h3>
              <p className="text-xs text-zinc-400 mt-1">Deduct stock from store for construction activities.</p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Material</label>
                  <select
                    value={useMaterialName}
                    onChange={(e) => setUseMaterialName(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  >
                    <option value="UltraTech Cement">UltraTech Cement</option>
                    <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                    <option value="Traditional Clay Bricks">Traditional Clay Bricks</option>
                    <option value="Fine River Sand">Fine River Sand</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Quantity to Use</label>
                  <input
                    type="number"
                    value={useQty}
                    onChange={(e) => setUseQty(parseFloat(e.target.value))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Usage Reference (DPR / Location)</label>
                <input
                  type="text"
                  value={useSourceRef}
                  onChange={(e) => setUseSourceRef(e.target.value)}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowUseModal(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleLogUsage} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Deduct Stock</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
