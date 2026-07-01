"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// Types
interface IndentItem {
  name: string;
  qty: number;
  unit: string;
  specOverride?: string;
  photoUrl?: string;
}

interface Indent {
  id: string;
  indentNumber: string;
  items: IndentItem[];
  status: "pending" | "approved" | "ordered" | "rejected";
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

interface GRNItem {
  name: string;
  qty: number;
  unit: string;
  rate: number;
}

interface GRN {
  id: string;
  grnNumber: string;
  poNumber: string;
  vendor: string;
  receivedDate: string;
  receivedBy: string;
  items: GRNItem[];
  isBilled: boolean;
  gatePhotoUrl?: string;
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

const INITIAL_INDENTS: Indent[] = [
  {
    id: "IND-01",
    indentNumber: "IND-2026-001",
    items: [
      { name: "UltraTech Cement", qty: 150, unit: "bags", specOverride: "Grade 53 OPC Cement", photoUrl: "https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500" },
      { name: "TMT Steel 16mm", qty: 5.5, unit: "tons", specOverride: "Fe 550D TMT Steel Rebar" }
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

const INITIAL_GRNS: GRN[] = [
  {
    id: "GRN-01",
    grnNumber: "GRN-2026-004",
    poNumber: "PO-2026-041",
    vendor: "National Steel Suppliers",
    receivedDate: "2026-06-18",
    receivedBy: "Amit K (Site Engineer)",
    items: [
      { name: "TMT Steel 16mm", qty: 4.0, unit: "tons", rate: 62000 }
    ],
    isBilled: true
  },
  {
    id: "GRN-02",
    grnNumber: "GRN-2026-005",
    poNumber: "PO-2026-041",
    vendor: "National Steel Suppliers",
    receivedDate: "2026-06-23",
    receivedBy: "Amit K (Site Engineer)",
    items: [
      { name: "TMT Steel 16mm", qty: 1.5, unit: "tons", rate: 62000 }
    ],
    isBilled: false
  },
  {
    id: "GRN-03",
    grnNumber: "GRN-2026-006",
    poNumber: "PO-2026-042",
    vendor: "Shree Cement Traders",
    receivedDate: "2026-06-26",
    receivedBy: "Suresh R (Project PM)",
    items: [
      { name: "UltraTech Cement", qty: 80, unit: "bags", rate: 410 }
    ],
    isBilled: false
  }
];

const INITIAL_INVENTORY: InventoryItem[] = [
  { name: "TMT Steel 16mm", onHand: 12.5, reserved: 4.0, unit: "tons", minAlertThreshold: 5.0 },
  { name: "UltraTech Cement", onHand: 85.0, reserved: 50.0, unit: "bags", minAlertThreshold: 100.0 }, 
  { name: "Traditional Clay Bricks", onHand: 14000, reserved: 3000, unit: "nos", minAlertThreshold: 5000 },
  { name: "Fine River Sand", onHand: 8.5, reserved: 0.0, unit: "m³", minAlertThreshold: 10.0 }
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

const RFQ_DATA = {
  "UltraTech Cement": [
    { vendor: "Shree Cement Traders", rate: 410, delivery: 2, terms: "30 Days Credit", isL1: true },
    { vendor: "National Cement & Co", rate: 425, delivery: 1, terms: "Cash on Delivery", isL1: false },
    { vendor: "Ultratech Direct Dist", rate: 430, delivery: 3, terms: "45 Days Credit", isL1: false },
  ],
  "TMT Steel 16mm": [
    { vendor: "National Steel Suppliers", rate: 62000, delivery: 3, terms: "45 Days Credit", isL1: true },
    { vendor: "Apex Steel Industries", rate: 63500, delivery: 2, terms: "30 Days Credit", isL1: false },
    { vendor: "Tata Astrum Dealer", rate: 65000, delivery: 1, terms: "Cash on Delivery", isL1: false },
  ]
};

export default function ProcurementPage() {
  const { company_id, project_id } = useParams();
  const companyId = company_id || "demo-company";
  const projectId = project_id || "d0000000-0000-0000-0000-000000000001";

  const [tab, setTab] = useState<"po" | "indent" | "inventory" | "ledger" | "unbilled">("po");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const queryParams = new URLSearchParams(window.location.search);
      const queryTab = queryParams.get("tab");
      if (queryTab && ["po", "indent", "inventory", "ledger", "unbilled"].includes(queryTab)) {
        setTab(queryTab as any);
      }
    }
  }, []);

  // State managers
  const [indents, setIndents] = useState<Indent[]>(INITIAL_INDENTS);
  const [pos, setPos] = useState<PO[]>(INITIAL_POS);
  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [grns, setGrns] = useState<GRN[]>(INITIAL_GRNS);

  // Modal and drawer control states
  const [showIndentModal, setShowIndentModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showRFQDrawer, setShowRFQDrawer] = useState(false);
  const [selectedRFQItem, setSelectedRFQItem] = useState<"UltraTech Cement" | "TMT Steel 16mm">("UltraTech Cement");
  // New Indent form state
  const [newIndentNum, setNewIndentNum] = useState("IND-2026-003");
  const [newIndentMaterial, setNewIndentMaterial] = useState("UltraTech Cement");
  const [newIndentQty, setNewIndentQty] = useState(50);
  const [newIndentUnit, setNewIndentUnit] = useState("bags");
  const [newIndentSpec, setNewIndentSpec] = useState("");
  const [newIndentPhoto, setNewIndentPhoto] = useState("");

  // New PO form state (Multi-item support)
  const [newPONum, setNewPONum] = useState("PO-2026-043");
  const [newPOVendor, setNewPOVendor] = useState("Shree Cement Traders");
  const [poFormItems, setPoFormItems] = useState<POItem[]>([
    { name: "UltraTech Cement", qty: 100, unit: "bags", rate: 410 }
  ]);

  // GRN form state
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PO | null>(null);
  const [grnNum, setGrnNum] = useState("GRN-2026-010");
  const [grnItemsChecked, setGrnItemsChecked] = useState<Record<string, boolean>>({});
  const [grnReceivedQtys, setGrnReceivedQtys] = useState<Record<string, string>>({});
  const [grnGatePhoto, setGrnGatePhoto] = useState("");
  // Material usage form state
  const [useMaterialName, setUseMaterialName] = useState("UltraTech Cement");
  const [useQty, setUseQty] = useState(10);
  const [useSourceRef, setUseSourceRef] = useState("DPR Column C-1 concrete pour");

  // Add Material Indent Submission
  const handleCreateIndent = () => {
    const newIndent: Indent = {
      id: `IND-${Date.now()}`,
      indentNumber: newIndentNum,
      items: [{ 
        name: newIndentMaterial, 
        qty: newIndentQty, 
        unit: newIndentUnit, 
        specOverride: newIndentSpec || undefined,
        photoUrl: newIndentPhoto || undefined 
      }],
      status: "pending",
      requestedBy: "Amit K (Site Engineer)",
      date: new Date().toISOString().split("T")[0]
    };
    setIndents([newIndent, ...indents]);
    setShowIndentModal(false);
    setNewIndentSpec("");
    setNewIndentPhoto("");
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

  // Add Purchase Order Submission (Multi-item support)
  const handleCreatePO = () => {
    let gross = 0;
    poFormItems.forEach(item => {
      gross += item.qty * item.rate;
    });
    const tax = gross * 0.18;
    const total = gross + tax;

    const newPO: PO = {
      id: `PO-${Date.now()}`,
      poNumber: newPONum,
      vendor: newPOVendor,
      items: poFormItems,
      grossAmount: gross,
      taxAmount: tax,
      totalAmount: total,
      status: "draft",
      approvalFlag: "pending",
      date: new Date().toISOString().split("T")[0]
    };
    setPos([newPO, ...pos]);
    setShowPOModal(false);
    setPoFormItems([{ name: "UltraTech Cement", qty: 100, unit: "bags", rate: 410 }]);
    setNewPONum(`PO-2026-0${pos.length + 43}`);
  };

  // Approve PO
  const handleApprovePO = (id: string) => {
    setPos(prev => prev.map(po => {
      if (po.id === id) {
        return { ...po, approvalFlag: "approved", status: "sent" };
      }
      return po;
    }));
  };

  // Initialize GRN items
  const handleOpenGRNModal = (po: PO) => {
    setSelectedPOForGRN(po);
    const checks: Record<string, boolean> = {};
    const qtys: Record<string, string> = {};
    po.items.forEach((item, idx) => {
      checks[idx.toString()] = true;
      qtys[idx.toString()] = item.qty.toString();
    });
    setGrnItemsChecked(checks);
    setGrnReceivedQtys(qtys);
    setGrnGatePhoto("");
    setShowGRNModal(true);
  };

  // GRN submission
  const handleCreateGRN = () => {
    if (!selectedPOForGRN) return;
    
    const receivedItems = selectedPOForGRN.items
      .filter((_, idx) => grnItemsChecked[idx.toString()])
      .map((item, idx) => ({
        name: item.name,
        qty: parseFloat(grnReceivedQtys[idx.toString()] || "0"),
        unit: item.unit,
        rate: item.rate
      }));

    if (receivedItems.length === 0) return;

    // Create GRN record
    const newGRN: GRN = {
      id: `GRN-${Date.now()}`,
      grnNumber: grnNum,
      poNumber: selectedPOForGRN.poNumber,
      vendor: selectedPOForGRN.vendor,
      receivedDate: new Date().toISOString().split("T")[0],
      receivedBy: "Amit K (Site Engineer)",
      items: receivedItems,
      isBilled: false,
      gatePhotoUrl: grnGatePhoto || undefined
    };

    // Create GRN transactions
    const newTxns = receivedItems.map((item, idx) => ({
      id: `TXN-${Date.now()}-${idx}`,
      materialName: item.name,
      qty: item.qty,
      unit: item.unit,
      type: "received" as const,
      sourceRef: grnNum,
      date: new Date().toISOString().split("T")[0]
    }));

    // Update inventory
    setInventory(prev => prev.map(inv => {
      const match = receivedItems.find(i => i.name === inv.name);
      if (match) {
        return { ...inv, onHand: inv.onHand + match.qty };
      }
      return inv;
    }));

    setGrns([newGRN, ...grns]);
    setTransactions([...newTxns, ...transactions]);
    
    // Update PO Status
    setPos(prev => prev.map(po => {
      if (po.id === selectedPOForGRN.id) {
        return { ...po, status: "received" as const };
      }
      return po;
    }));

    setShowGRNModal(false);
    setSelectedPOForGRN(null);
  };

  // Record material usage
  const handleRecordUsage = () => {
    const qty = parseFloat(useQty as any) || 0;
    if (qty <= 0) return;

    // Save transaction
    const newTxn: Transaction = {
      id: `TXN-${Date.now()}`,
      materialName: useMaterialName,
      qty,
      unit: useMaterialName.includes("Cement") ? "bags" : "tons",
      type: "used",
      sourceRef: useSourceRef,
      date: new Date().toISOString().split("T")[0]
    };

    // Update inventory
    setInventory(prev => prev.map(inv => {
      if (inv.name === useMaterialName) {
        return { ...inv, onHand: inv.onHand - qty };
      }
      return inv;
    }));

    setTransactions([newTxn, ...transactions]);
    setShowUseModal(false);
  };

  // Mark GRN as billed (Unbilled Materials tracker action)
  const handleMarkAsBilled = (grnId: string) => {
    setGrns(prev => prev.map(g => g.id === grnId ? { ...g, isBilled: true } : g));
  };

  // 3-way matching check helper
  const getThreeWayMatchStatus = (grn: GRN) => {
    const matchingPO = pos.find(p => p.poNumber === grn.poNumber);
    if (!matchingPO) return { match: false, text: "No PO Found" };
    
    let match = true;
    let reason = "";

    grn.items.forEach(gItem => {
      const poItem = matchingPO.items.find(p => p.name === gItem.name);
      if (!poItem) {
        match = false;
        reason = "Item mismatch";
      } else {
        if (poItem.rate !== gItem.rate) {
          match = false;
          reason = "Rate mismatch";
        }
        if (gItem.qty > poItem.qty) {
          match = false;
          reason = "Qty excess";
        }
      }
    });

    return { match, text: match ? "3-Way Match Verified" : `Mismatch: ${reason}` };
  };
  // Compute unbilled GRNs grouped by vendor
  const unbilledGRNs = grns.filter(g => !g.isBilled);
  const unbilledByVendor = unbilledGRNs.reduce<Record<string, { vendor: string; grns: GRN[]; totalValue: number }>>((acc, g) => {
    if (!acc[g.vendor]) acc[g.vendor] = { vendor: g.vendor, grns: [], totalValue: 0 };
    acc[g.vendor].grns.push(g);
    acc[g.vendor].totalValue += g.items.reduce((s, i) => s + i.qty * i.rate, 0);
    return acc;
  }, {});

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0910] flex flex-col justify-between h-full shrink-0">
        <div className="flex flex-col overflow-y-auto flex-1">
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white">S</div>
            <span className="font-bold text-white tracking-tight">SiteFlow Console</span>
          </div>

          <nav className="p-4 space-y-2">
            <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg">
              <span>←</span> Back to Dashboard
            </Link>
            <div className="pt-4">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">Procurement Ledger</span>
              <ul className="space-y-1">
                {["po", "indent", "inventory", "ledger"].map(tId => (
                  <li key={tId}>
                    <button onClick={() => setTab(tId as any)} className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left ${tab === tId ? "bg-white/[0.06] text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
                      <span>{tId === "po" ? "📄" : tId === "indent" ? "📥" : tId === "inventory" ? "📦" : "🧾"}</span> {tId.toUpperCase()}
                    </button>
                  </li>
                ))}
                <li>
                  <button onClick={() => setTab("unbilled")} className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg text-left ${tab === "unbilled" ? "bg-white/[0.06] text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
                    <span className="flex items-center gap-2.5"><span>⚠️</span> UNBILLED MATERIALS</span>
                    {unbilledGRNs.length > 0 && <span className="text-[9px] px-1.5 py-0.5 bg-amber-500 text-black rounded-full font-bold">{unbilledGRNs.length}</span>}
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Framework */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0B0910] shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Site Material Procurement</h1>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-zinc-400">Onsite.so-inspired drawer workflows</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedRFQItem("UltraTech Cement"); setShowRFQDrawer(true); }} className="px-4 py-2 border border-[#7C5CFF]/30 hover:bg-[#7C5CFF]/10 rounded-xl text-xs font-bold text-primary transition-all">
              ⚡ Compare RFQs
            </button>
            <button onClick={() => setShowIndentModal(true)} className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-white transition-all">
              + Material Indent
            </button>
            <button onClick={() => setShowPOModal(true)} className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-white transition-all">
              + Purchase Order
            </button>
            <button onClick={() => setShowUseModal(true)} className="px-4 py-2 bg-gradient-to-r from-primary to-[#FF3B6C] rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all shadow-lg">
              Log Usage -
            </button>
          </div>
        </header>

        {/* Content Workspace */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* TAB 1: INDENTS / REQUISITIONS */}
          {tab === "indent" && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Indent & Requisitions (Stock Contextual)</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {indents.map((ind) => (
                  <div key={ind.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#14121F] space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-white font-extrabold">{ind.indentNumber}</strong>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        ind.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>{ind.status}</span>
                    </div>

                    <div className="space-y-2 border-t border-white/5 pt-3">
                      {ind.items.map((item, i) => {
                        // Find current warehouse stock context directly on indent card (Screen 5720)
                        const stock = inventory.find(inv => inv.name === item.name);
                        return (
                          <div key={i} className="text-xs flex justify-between items-center">
                            <div>
                              <span className="text-zinc-300 block font-bold">{item.name} (Req Qty: {item.qty} {item.unit})</span>
                              {item.specOverride && <span className="text-[10px] text-zinc-500 block">Spec: {item.specOverride}</span>}
                              {item.photoUrl && (
                                <button onClick={() => alert("Preview item photo proof")} className="text-[9px] text-primary underline mt-1 block">
                                  🖼️ View item photo proof
                                </button>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase text-zinc-500 block">Warehouse Stock</span>
                              <strong className={`font-mono font-bold ${stock && stock.onHand < stock.minAlertThreshold ? "text-red-400" : "text-emerald-400"}`}>
                                {stock ? `${stock.onHand} ${stock.unit}` : "No stock logs"}
                              </strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {ind.status === "pending" && (
                      <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
                        <button onClick={() => handleApproveIndent(ind.id)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold">
                          👍 Approve Indent
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PURCHASE ORDERS */}
          {tab === "po" && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Purchase Orders</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {pos.map((po) => (
                  <div key={po.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#14121F] space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <div>
                        <strong className="text-white font-extrabold">{po.poNumber}</strong>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Vendor: {po.vendor}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        po.status === "received" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"
                      }`}>{po.status}</span>
                    </div>

                    <div className="border-t border-white/5 pt-3 text-xs space-y-1">
                      {po.items.map((item, i) => (
                        <div key={i} className="flex justify-between text-zinc-300">
                          <span>{item.name}</span>
                          <span>{item.qty} {item.unit} @ ₹{item.rate}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between items-end border-t border-white/5 pt-3">
                      <div>
                        <span className="text-[9px] uppercase text-zinc-500 block">Total Amount</span>
                        <strong className="text-sm text-white font-extrabold">₹{po.totalAmount.toLocaleString()}</strong>
                      </div>
                      
                      <div className="flex gap-2">
                        {po.approvalFlag === "pending" && (
                          <button onClick={() => handleApprovePO(po.id)} className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[10px] font-bold">
                            Approve PO
                          </button>
                        )}
                        {po.status === "sent" && po.approvalFlag === "approved" && (
                          <button onClick={() => handleOpenGRNModal(po)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold">
                            🚚 Record GRN (Checklist)
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY */}
          {tab === "inventory" && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Real-time Warehouse Stock Balance</h2>
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/[0.02] text-zinc-500 border-b border-white/5">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Material Item</th>
                      <th className="px-5 py-3 font-semibold">Physical Stock</th>
                      <th className="px-5 py-3 font-semibold">Reserved Stock</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((inv, idx) => (
                      <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                        <td className="px-5 py-3 font-bold text-white">{inv.name}</td>
                        <td className={`px-5 py-3 font-mono font-bold ${inv.onHand < 0 ? "text-red-400 font-extrabold" : "text-zinc-200"}`}>
                          {inv.onHand} {inv.unit}
                        </td>
                        <td className="px-5 py-3 text-zinc-500 font-mono">{inv.reserved} {inv.unit}</td>
                        <td className="px-5 py-3">
                          {inv.onHand < 0 ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold uppercase text-[9px]">Negative stock context</span>
                          ) : inv.onHand < inv.minAlertThreshold ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold uppercase text-[9px]">Reorder Alert</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold uppercase text-[9px]">Healthy</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: LEDGER */}
          {tab === "ledger" && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Inventory Transactions</h2>
              <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/[0.02] text-zinc-500 border-b border-white/5">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Material</th>
                      <th className="px-5 py-3 font-semibold">Transaction Qty</th>
                      <th className="px-5 py-3 font-semibold">Type</th>
                      <th className="px-5 py-3 font-semibold">Reference</th>
                      <th className="px-5 py-3 font-semibold">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((txn, idx) => (
                      <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                        <td className="px-5 py-3 font-bold text-white">{txn.materialName}</td>
                        <td className={`px-5 py-3 font-mono font-bold ${txn.type === "used" ? "text-amber-400" : "text-emerald-400"}`}>
                          {txn.type === "used" ? "-" : "+"}{txn.qty} {txn.unit}
                        </td>
                        <td className="px-5 py-3 capitalize">{txn.type}</td>
                        <td className="px-5 py-3 text-zinc-400 font-mono">{txn.sourceRef}</td>
                        <td className="px-5 py-3 text-zinc-500">{txn.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: UNBILLED MATERIALS TRACKER */}
          {tab === "unbilled" && (
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Unbilled Materials Tracker</h2>
                  <p className="text-[10px] text-zinc-600 mt-1 max-w-lg">GRNs received from vendors but not yet linked to a Material Purchase invoice. Review and mark as billed to reconcile Accounts Payable. Unmatched GRNs inflate stock figures without a corresponding payable.</p>
                </div>
                {unbilledGRNs.length === 0 && (
                  <span className="text-[10px] px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold">✓ All GRNs Reconciled</span>
                )}
              </div>

              {/* Summary Strip */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#14121F] border border-white/5 rounded-xl p-4">
                  <span className="text-[9px] uppercase text-zinc-500 tracking-wider block">Unbilled GRN Count</span>
                  <strong className={`text-xl font-extrabold mt-1 block ${unbilledGRNs.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>{unbilledGRNs.length}</strong>
                </div>
                <div className="bg-[#14121F] border border-white/5 rounded-xl p-4">
                  <span className="text-[9px] uppercase text-zinc-500 tracking-wider block">Unbilled Value (est.)</span>
                  <strong className={`text-xl font-extrabold mt-1 block font-mono ${unbilledGRNs.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    ₹{unbilledGRNs.reduce((s, g) => s + g.items.reduce((a, i) => a + i.qty * i.rate, 0), 0).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-[#14121F] border border-white/5 rounded-xl p-4">
                  <span className="text-[9px] uppercase text-zinc-500 tracking-wider block">Vendors Pending</span>
                  <strong className="text-xl font-extrabold mt-1 block text-zinc-200">{Object.keys(unbilledByVendor).length}</strong>
                </div>
              </div>

              {/* Vendor-grouped GRN cards */}
              {Object.values(unbilledByVendor).length === 0 ? (
                <div className="text-center py-14 text-zinc-600 text-xs">No unbilled GRNs. All received goods have matching invoices.</div>
              ) : (
                Object.values(unbilledByVendor).map(group => (
                  <div key={group.vendor} className="bg-[#0F0D18] border border-white/5 rounded-2xl overflow-hidden">
                    {/* Vendor header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-amber-500/5 border-b border-amber-500/10">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-500">⚠ Unbilled</span>
                        <span className="text-xs font-bold text-white">{group.vendor}</span>
                        <span className="text-[9px] text-zinc-500">{group.grns.length} GRN{group.grns.length > 1 ? "s" : ""} pending</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-zinc-500 block">Est. Unbilled Value</span>
                        <strong className="text-sm font-extrabold text-amber-400 font-mono">₹{group.totalValue.toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Individual GRN rows */}
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[9px]">
                          <th className="px-5 py-2.5 font-semibold">GRN No.</th>
                          <th className="px-5 py-2.5 font-semibold">Received Date</th>
                          <th className="px-5 py-2.5 font-semibold">Items</th>
                          <th className="px-5 py-2.5 text-center font-semibold">3-Way Match Check</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Value</th>
                          <th className="px-5 py-2.5 text-right font-semibold">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.grns.map(grn => {
                          const grnValue = grn.items.reduce((s, i) => s + i.qty * i.rate, 0);
                          const threeWay = getThreeWayMatchStatus(grn);
                          return (
                            <tr key={grn.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                              <td className="px-5 py-3">
                                <span className="font-mono font-bold text-white">{grn.grnNumber}</span>
                                <span className="block text-[9px] text-zinc-600 mt-0.5">PO: {grn.poNumber}</span>
                              </td>
                              <td className="px-5 py-3 text-zinc-400">{grn.receivedDate}</td>
                              <td className="px-5 py-3">
                                {grn.items.map((item, i) => (
                                  <div key={i} className="text-zinc-300">
                                    {item.name}: <span className="font-mono font-bold">{item.qty} {item.unit}</span> @ ₹{item.rate.toLocaleString()}
                                  </div>
                                ))}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${threeWay.match ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                                  {threeWay.match ? "✓" : "⚠️"} {threeWay.text}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-amber-400">₹{grnValue.toLocaleString("en-IN")}</td>
                              <td className="px-5 py-3 text-right">
                                <button
                                  onClick={() => handleMarkAsBilled(grn.id)}
                                  className="px-3 py-1.5 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-all"
                                >
                                  ✓ Mark as Billed
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))
              )}

              {/* Already-billed GRNs reference section */}
              {grns.filter(g => g.isBilled).length > 0 && (
                <div className="mt-6">
                  <h3 className="text-[10px] uppercase font-bold text-zinc-600 tracking-wider mb-3">✓ Reconciled GRNs (Billed)</h3>
                  <div className="bg-[#0F0D18] border border-white/5 rounded-2xl overflow-hidden opacity-60">
                    <table className="w-full text-xs">
                      <tbody>
                        {grns.filter(g => g.isBilled).map(grn => (
                          <tr key={grn.id} className="border-b border-white/[0.03]">
                            <td className="px-5 py-3 font-mono font-bold text-zinc-400">{grn.grnNumber}</td>
                            <td className="px-5 py-3 text-zinc-500">{grn.vendor}</td>
                            <td className="px-5 py-3 text-zinc-600">{grn.receivedDate}</td>
                            <td className="px-5 py-3 text-right">
                              <span className="text-[9px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-full font-bold">BILLED</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Add Indent Modal Drawer (Specs & Photo proof overrides per item) */}
      {showIndentModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">Create Material Indent (Requisition)</h3>
              <button onClick={() => setShowIndentModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-zinc-400">Indent Number</label>
                <input type="text" value={newIndentNum} onChange={(e) => setNewIndentNum(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
              </div>
              
              <div className="space-y-1">
                <label className="text-zinc-400">Material Item</label>
                <select value={newIndentMaterial} onChange={(e) => setNewIndentMaterial(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white">
                  <option value="UltraTech Cement">UltraTech Cement</option>
                  <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                  <option value="Traditional Clay Bricks">Traditional Clay Bricks</option>
                  <option value="Fine River Sand">Fine River Sand</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400">Required Quantity</label>
                  <input type="number" value={newIndentQty} onChange={(e) => setNewIndentQty(parseFloat(e.target.value) || 0)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400">Unit</label>
                  <input type="text" value={newIndentUnit} onChange={(e) => setNewIndentUnit(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
                </div>
              </div>

              {/* Item-level Spec & Photo override (Screen 5761-5762) */}
              <div className="space-y-1">
                <label className="text-zinc-400">Line-Item Custom Specification Override</label>
                <input type="text" value={newIndentSpec} onChange={(e) => setNewIndentSpec(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="Grade 53 OPC Cement, Fe 550D Rebars..." />
              </div>

              <div className="space-y-2 border-t border-white/5 pt-3">
                <span className="text-zinc-500 font-bold block">Attach Item Photo proof</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setNewIndentPhoto("https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500")} className="px-3 py-1.5 bg-[#1C182A] border border-white/10 rounded-lg text-zinc-400 hover:text-white">
                    📷 Take Item Photo
                  </button>
                  {newIndentPhoto && <span className="text-emerald-400 font-bold">✓ Captured</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={() => setShowIndentModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
              <button onClick={handleCreateIndent} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl">Submit Indent</button>
            </div>
          </div>
        </div>
      )}

      {/* Log GRN PO Checklist Modal (Screen 5767-5768) */}
      {showGRNModal && selectedPOForGRN && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <h3 className="text-xs font-extrabold text-white">Record Goods Receipt Note (GRN)</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">PO: {selectedPOForGRN.poNumber} · Vendor: {selectedPOForGRN.vendor}</p>
              </div>
              <button onClick={() => { setShowGRNModal(false); setSelectedPOForGRN(null); }} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-zinc-400">GRN Serial Number</label>
                <input type="text" value={grnNum} onChange={(e) => setGrnNum(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
              </div>

              {/* Checklist list of PO items (Screen 5768) */}
              <div className="space-y-2">
                <span className="text-zinc-400 font-bold block uppercase tracking-wider text-[10px]">Select Delivered PO Items</span>
                {selectedPOForGRN.items.map((item, idx) => {
                  const idxStr = idx.toString();
                  return (
                    <div key={idx} className="p-3 bg-[#120F1A] border border-white/5 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={grnItemsChecked[idxStr] || false}
                          onChange={(e) => setGrnItemsChecked({ ...grnItemsChecked, [idxStr]: e.target.checked })}
                          className="accent-primary h-4 w-4 rounded cursor-pointer"
                        />
                        <span className="text-white font-bold">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500">Rec Qty:</span>
                        <input
                          type="number"
                          value={grnReceivedQtys[idxStr] || "0"}
                          onChange={(e) => setGrnReceivedQtys({ ...grnReceivedQtys, [idxStr]: e.target.value })}
                          disabled={!grnItemsChecked[idxStr]}
                          className="bg-[#1C182A] border border-white/10 rounded px-2 py-1 text-white w-20 text-center font-bold disabled:opacity-50"
                        />
                        <span className="text-zinc-400">{item.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gate Entry Photo Upload */}
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold block">GRN Gate Entry / Challan Photo</label>
                <input type="file" accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setGrnGatePhoto("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500");
                  }}
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-zinc-400 text-xs" />
                {grnGatePhoto && <span className="text-emerald-400 font-bold mt-1 block">✓ Photo Attached</span>}
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={() => { setShowGRNModal(false); setSelectedPOForGRN(null); }} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
              <button onClick={handleCreateGRN} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl">Record GRN Items</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Material Usage Drawer */}
      {showUseModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">Log Site Material Usage</h3>
              <button onClick={() => setShowUseModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-zinc-400">Select Material Item</label>
                <select value={useMaterialName} onChange={(e) => setUseMaterialName(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white">
                  <option value="UltraTech Cement">UltraTech Cement</option>
                  <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                  <option value="Traditional Clay Bricks">Traditional Clay Bricks</option>
                  <option value="Fine River Sand">Fine River Sand</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Usage Quantity</label>
                <input type="number" value={useQty} onChange={(e) => setUseQty(parseFloat(e.target.value) || 0)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Consumption Reference (Location / Lorry No.)</label>
                <input type="text" value={useSourceRef} onChange={(e) => setUseSourceRef(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={() => setShowUseModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
              <button onClick={handleRecordUsage} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl">Record Usage</button>
            </div>
          </div>
        </div>
      )}

      {/* PO Creation modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4 text-xs font-sans max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">Create Purchase Order (PO)</h3>
              <button onClick={() => setShowPOModal(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">PO Number</label>
                <input type="text" value={newPONum} onChange={(e) => setNewPONum(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400 font-bold">Supplier Vendor</label>
                <select value={newPOVendor} onChange={(e) => setNewPOVendor(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white">
                  {VENDORS.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Multi-item list form */}
              <div className="space-y-2 border-t border-white/5 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider text-[9px]">PO Line Items</span>
                  <button type="button" onClick={() => setPoFormItems([...poFormItems, { name: "TMT Steel 16mm", qty: 10, unit: "tons", rate: 62000 }])}
                    className="text-[9px] text-primary font-bold hover:underline">+ Add Item Line</button>
                </div>
                {poFormItems.map((item, idx) => (
                  <div key={idx} className="bg-black/25 p-3 rounded-lg border border-white/5 space-y-2 relative">
                    <button type="button" onClick={() => setPoFormItems(poFormItems.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-zinc-500 hover:text-red-400">✕</button>
                    <div className="space-y-1">
                      <label className="text-zinc-500 text-[9px]">Item Name</label>
                      <select value={item.name}
                        onChange={e => {
                          const next = [...poFormItems];
                          next[idx].name = e.target.value;
                          next[idx].unit = e.target.value.includes("Cement") ? "bags" : "tons";
                          setPoFormItems(next);
                        }}
                        className="w-full bg-[#16121F] border border-white/10 rounded p-1 text-white text-[11px]">
                        <option value="UltraTech Cement">UltraTech Cement</option>
                        <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-zinc-500 text-[9px]">Quantity ({item.unit})</label>
                        <input type="number" value={item.qty}
                          onChange={e => { const next = [...poFormItems]; next[idx].qty = parseFloat(e.target.value) || 0; setPoFormItems(next); }}
                          className="w-full bg-[#16121F] border border-white/10 rounded p-1 text-white text-[11px]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-zinc-500 text-[9px]">Rate (₹)</label>
                        <input type="number" value={item.rate}
                          onChange={e => { const next = [...poFormItems]; next[idx].rate = parseFloat(e.target.value) || 0; setPoFormItems(next); }}
                          className="w-full bg-[#16121F] border border-white/10 rounded p-1 text-white text-[11px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={() => setShowPOModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
              <button onClick={handleCreatePO} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl">Save PO Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* RFQ Comparison Drawer */}
      {showRFQDrawer && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-[#0C0A12] border-l border-white/10 w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-[#0F0D16]">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary">RFQ Analysis Center</span>
                <h2 className="text-base font-extrabold text-white mt-1">Vendor Quote Comparisons</h2>
              </div>
              <button onClick={() => setShowRFQDrawer(false)} className="text-zinc-400 hover:text-white">✕ Close</button>
            </div>

            <div className="p-6 border-b border-white/5 bg-[#14121F] flex items-center gap-2">
              <span className="text-zinc-400 font-bold">Select Material Item:</span>
              {["UltraTech Cement", "TMT Steel 16mm"].map((item) => (
                <button key={item} onClick={() => setSelectedRFQItem(item as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedRFQItem === item ? "bg-primary text-white" : "bg-white/5 text-zinc-400 hover:text-white"}`}>
                  {item}
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {(RFQ_DATA[selectedRFQItem] || []).map((quote, idx) => (
                  <div key={idx} className={`border rounded-2xl p-4 space-y-4 relative flex flex-col justify-between ${quote.isL1 ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-white/5 bg-white/[0.01]"}`}>
                    {quote.isL1 && (
                      <span className="absolute -top-2.5 left-4 bg-emerald-500 text-black text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">L1 Preferred</span>
                    )}
                    <div className="space-y-1">
                      <h4 className="font-bold text-white text-xs">{quote.vendor}</h4>
                      <span className="text-[9px] text-zinc-500">Commercial terms</span>
                    </div>

                    <div className="space-y-2 font-mono text-[10px]">
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-zinc-500">Rate:</span>
                        <strong className={quote.isL1 ? "text-emerald-400" : "text-white"}>₹{quote.rate.toLocaleString()}/unit</strong>
                      </div>
                      <div className="flex justify-between border-b border-white/5 pb-1">
                        <span className="text-zinc-500">Delivery:</span>
                        <strong className="text-white">{quote.delivery} days</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Payment:</span>
                        <strong className="text-white">{quote.terms}</strong>
                      </div>
                    </div>

                    <button onClick={() => { setNewPOVendor(quote.vendor); setPoFormItems([{ name: selectedRFQItem, qty: 100, unit: selectedRFQItem.includes("Cement") ? "bags" : "tons", rate: quote.rate }]); setShowRFQDrawer(false); setShowPOModal(true); }}
                      className={`w-full py-1.5 rounded-xl font-bold text-[9px] uppercase tracking-wider transition-all ${quote.isL1 ? "bg-emerald-500 text-black font-extrabold" : "bg-[#1C182A] border border-white/10 text-zinc-400 hover:text-white"}`}>
                      Select Vendor
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
