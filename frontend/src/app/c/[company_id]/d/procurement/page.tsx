"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

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
  const { company_id } = useParams();
  const companyId = company_id || "demo-company";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId || "d0000000-0000-0000-0000-000000000001";

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
  const [indents, setIndents] = useState<Indent[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [grns, setGrns] = useState<GRN[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const fetchProcurementData = async () => {
    try {
      const apiHost = getApiHost();
      const [indentsRes, posRes, grnsRes, invRes] = await Promise.all([
        fetch(`${apiHost}/apis/v3/procurement/indents?project_id=${projectId}`, { headers: authHeaders() }),
        fetch(`${apiHost}/apis/v3/procurement/pos?project_id=${projectId}`, { headers: authHeaders() }),
        fetch(`${apiHost}/apis/v3/procurement/grns?project_id=${projectId}`, { headers: authHeaders() }),
        fetch(`${apiHost}/apis/v3/procurement/inventory?project_id=${projectId}`, { headers: authHeaders() }),
      ]);

      if (indentsRes.ok) {
        const data = await indentsRes.json();
        const mapped = data.map((ind: any) => ({
          id: ind.id,
          indentNumber: ind.indent_number,
          items: (ind.items || []).map((item: any) => ({ name: item.material_name, qty: item.quantity, unit: item.unit })),
          status: ind.status,
          requestedBy: "Auto-synced",
          date: ind.created_at ? ind.created_at.split("T")[0] : "",
        }));
        setIndents(mapped);
      }
      if (posRes.ok) {
        const data = await posRes.json();
        const mapped = data.map((po: any) => ({
          id: po.id,
          poNumber: po.po_number,
          vendor: "Vendor",
          items: (po.items || []).map((item: any) => ({ name: item.material_name, qty: item.quantity, unit: item.unit, rate: item.rate })),
          grossAmount: po.gross_amount,
          taxAmount: po.tax_amount,
          totalAmount: po.total_amount,
          status: po.status,
          approvalFlag: po.approval_flag,
          date: po.po_date ? po.po_date.split("T")[0] : "",
        }));
        setPos(mapped);
      }
      if (grnsRes.ok) {
        const data = await grnsRes.json();
        const mapped = data.map((grn: any) => ({
          id: grn.id,
          grnNumber: grn.grn_number,
          poNumber: "",
          vendor: "",
          receivedDate: grn.received_date ? grn.received_date.split("T")[0] : "",
          receivedBy: "Auto-synced",
          items: (grn.items || []).map((item: any) => ({ name: "", qty: item.received_qty, unit: "", rate: 0 })),
          isBilled: false,
        }));
        setGrns(mapped);
      }
      if (invRes.ok) {
        const data = await invRes.json();
        const mapped = data.map((inv: any) => ({
          name: inv.material_name,
          onHand: inv.on_hand_qty,
          reserved: inv.reserved_qty,
          unit: inv.unit,
          minAlertThreshold: 0,
        }));
        setInventory(mapped);
      }
      setIsOffline(false);
    } catch (err) {
      console.error("Procurement API unavailable, using demo data", err);
      setIsOffline(true);
      setIndents(INITIAL_INDENTS);
      setPos(INITIAL_POS);
      setGrns(INITIAL_GRNS);
      setInventory(INITIAL_INVENTORY);
    }
  };

  useEffect(() => {
    fetchProcurementData();
  }, [projectId]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${getApiHost()}/apis/v3/settings/company-terms/${companyId}`, { headers: authHeaders() });
        if (r.ok) {
          const d = await r.json();
          setPoDefaultTerms(d.purchase_order_terms || "");
        }
      } catch {
        /* ignore: terms are optional */
      }
    })();
  }, [companyId]);

  // Modal and drawer control states
  const [showIndentModal, setShowIndentModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [showGRNModal, setShowGRNModal] = useState(false);
  const [showUseModal, setShowUseModal] = useState(false);
  const [showRFQDrawer, setShowRFQDrawer] = useState(false);
  const [selectedRFQItem, setSelectedRFQItem] = useState<"UltraTech Cement" | "TMT Steel 16mm">("UltraTech Cement");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
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
  const [newPOTerms, setNewPOTerms] = useState("");
  const [poDefaultTerms, setPoDefaultTerms] = useState("");

  useEffect(() => {
    if (showPOModal && !newPOTerms) setNewPOTerms(poDefaultTerms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPOModal]);

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
  const handleCreateIndent = async () => {
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

    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/procurement/indents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          indent_number: newIndentNum,
          items: [{ material_name: newIndentMaterial, quantity: newIndentQty, unit: newIndentUnit }],
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        newIndent.id = saved.id;
      }
    } catch (err) {
      console.error("Indent create error, using local only:", err);
    }

    setIndents([newIndent, ...indents]);
    setShowIndentModal(false);
    setNewIndentSpec("");
    setNewIndentPhoto("");
    setNewIndentNum(`IND-2026-0${indents.length + 4}`);
  };

  // Approve Indent
  const handleApproveIndent = async (id: string) => {
    try {
      const apiHost = getApiHost();
      await fetch(`${apiHost}/apis/v3/procurement/indents/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) }
      });
    } catch (err) {
      console.error("Indent approve error:", err);
    }
    setIndents(prev => prev.map(ind => {
      if (ind.id === id) {
        return { ...ind, status: "approved" };
      }
      return ind;
    }));
  };

  // Add Purchase Order Submission (Multi-item support)
  const handleCreatePO = async () => {
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

    try {
      const apiHost = getApiHost();
      const dupRes = await fetch(`${apiHost}/apis/v3/procurement/duplicate-po-check?company_id=${companyId}&po_number=${encodeURIComponent(newPONum)}`, { headers: authHeaders() });
      if (dupRes.ok) {
        const dupData = await dupRes.json();
        if (dupData.is_duplicate) {
          alert(`Duplicate PO number: ${dupData.message}`);
          return;
        }
      }

      const res = await fetch(`${apiHost}/apis/v3/procurement/pos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          po_number: newPONum,
          po_date: new Date().toISOString().split("T")[0],
          items: poFormItems.map(item => ({ material_name: item.name, quantity: item.qty, unit: item.unit, rate: item.rate })),
          terms: newPOTerms || null,
        }),
      });
      if (res.ok) {
        const saved = await res.json();
        newPO.id = saved.id;
      }
    } catch (err) {
      console.error("PO create error, using local only:", err);
    }

    setPos([newPO, ...pos]);
    setShowPOModal(false);
    setPoFormItems([{ name: "UltraTech Cement", qty: 100, unit: "bags", rate: 410 }]);
    setNewPOTerms("");
    setNewPONum(`PO-2026-0${pos.length + 43}`);
  };

  // Approve PO
  const handleApprovePO = async (id: string) => {
    try {
      const apiHost = getApiHost();
      await fetch(`${apiHost}/apis/v3/procurement/pos/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) }
      });
    } catch (err) {
      console.error("PO approve error:", err);
    }
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
  const handleCreateGRN = async () => {
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

    const newTxns = receivedItems.map((item, idx) => ({
      id: `TXN-${Date.now()}-${idx}`,
      materialName: item.name,
      qty: item.qty,
      unit: item.unit,
      type: "received" as const,
      sourceRef: grnNum,
      date: new Date().toISOString().split("T")[0]
    }));

    try {
      const apiHost = getApiHost();
      await fetch(`${apiHost}/apis/v3/procurement/grns`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          po_id: selectedPOForGRN.id,
          grn_number: grnNum,
          received_date: new Date().toISOString().split("T")[0],
          items: receivedItems.map((item, idx) => ({ po_item_id: `placeholder-${idx}`, received_qty: item.qty })),
        }),
      });
    } catch (err) {
      console.error("GRN create error, using local only:", err);
    }

    setInventory(prev => prev.map(inv => {
      const match = receivedItems.find(i => i.name === inv.name);
      if (match) {
        return { ...inv, onHand: inv.onHand + match.qty };
      }
      return inv;
    }));

    setGrns([newGRN, ...grns]);
    setTransactions([...newTxns, ...transactions]);
    
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Procurement sub-navigation (top tabs) ── */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        {[
          { key: "po", label: "PO", icon: "📄" },
          { key: "indent", label: "Indent", icon: "📥" },
          { key: "inventory", label: "Inventory", icon: "📦" },
          { key: "ledger", label: "Ledger", icon: "🧾" },
          { key: "unbilled", label: "Unbilled", icon: "⚠️" },
        ].map(item => (
          <button key={item.key} onClick={() => setTab(item.key as any)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
            <span className="mr-1.5">{item.icon}</span>{item.label}
          </button>
        ))}
        <Link href={`/c/${companyId}/d/procurement/vendor-performance`} className="whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-all text-muted hover:text-foreground hover:bg-elevated">
          <span className="mr-1.5">📊</span>Vendor Performance
        </Link>
      </div>

      {/* Main Framework */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {isOffline && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-xs">
            Using demo procurement data — backend connection unavailable
          </div>
        )}
        <header className="h-16 border-b border-border-custom px-8 flex items-center justify-between bg-card shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-foreground uppercase tracking-wider">Site Material Procurement</h1>
            <span className="h-4 w-px bg-elevated" />
            <span className="text-xs font-medium text-muted">SiteFlow workflows</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setSelectedRFQItem("UltraTech Cement"); setShowRFQDrawer(true); }} className="px-4 py-2 border border-primary/20 hover:bg-primary/10 rounded-md text-xs font-bold text-primary transition-all">
              ⚡ Compare RFQs
            </button>
            <button onClick={() => setShowIndentModal(true)} className="px-4 py-2 border border-border-custom hover:bg-elevated rounded-md text-xs font-bold text-foreground transition-all">
              + Material Indent
            </button>
            <button onClick={() => setShowPOModal(true)} className="px-4 py-2 border border-border-custom hover:bg-elevated rounded-md text-xs font-bold text-foreground transition-all">
              + Purchase Order
            </button>
            <button onClick={() => setShowUseModal(true)} className="px-4 py-2 bg-primary rounded-md text-xs font-bold text-white hover:opacity-90 transition-all shadow-lg">
              Log Usage -
            </button>
          </div>
        </header>

        {/* Content Workspace */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          
          {/* TAB 1: INDENTS / REQUISITIONS */}
          {tab === "indent" && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Indent & Requisitions (Stock Contextual)</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {indents.map((ind) => (
                  <div key={ind.id} className="bg-card border border-border-custom rounded-lg p-5 space-y-4">
                    <div className="flex justify-between items-center text-xs">
                      <strong className="text-foreground font-extrabold">{ind.indentNumber}</strong>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        ind.status === "approved" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>{ind.status}</span>
                    </div>

                    <div className="space-y-2 border-t border-border-custom pt-3">
                      {ind.items.map((item, i) => {
                        // Find current warehouse stock context directly on indent card (Screen 5720)
                        const stock = inventory.find(inv => inv.name === item.name);
                        return (
                          <div key={i} className="text-xs flex justify-between items-center">
                            <div>
                              <span className="text-zinc-300 block font-bold">{item.name} (Req Qty: {item.qty} {item.unit})</span>
                              {item.specOverride && <span className="text-[10px] text-muted block">Spec: {item.specOverride}</span>}
                              {item.photoUrl && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setPreviewUrl(item.photoUrl!)}
                                    className="text-[9px] text-primary underline mt-1 block"
                                  >
                                    🖼️ View item photo proof
                                  </button>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) setPreviewUrl(URL.createObjectURL(file));
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-[9px] uppercase text-muted block">Warehouse Stock</span>
                              <strong className={`font-mono font-bold ${stock && stock.onHand < stock.minAlertThreshold ? "text-red-400" : "text-emerald-400"}`}>
                                {stock ? `${stock.onHand} ${stock.unit}` : "No stock logs"}
                              </strong>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {ind.status === "pending" && (
                      <div className="flex gap-2 justify-end border-t border-border-custom pt-3">
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
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Purchase Orders</h2>
              <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-elevated text-muted border-b border-border-custom">
                      <tr>
                        <th className="px-5 py-3 font-semibold">PO No.</th>
                        <th className="px-5 py-3 font-semibold">Vendor</th>
                        <th className="px-5 py-3 font-semibold">Item Line(s)</th>
                        <th className="px-5 py-3 font-semibold">Approval</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold text-right">Total Amount</th>
                        <th className="px-5 py-3 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pos.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-5 py-10 text-center text-muted">No purchase orders available.</td>
                        </tr>
                      ) : (
                        pos.map((po) => (
                          <tr key={po.id} className="border-b border-border-custom hover:bg-elevated transition-all align-top">
                            <td className="px-5 py-3 font-mono font-bold text-foreground whitespace-nowrap">{po.poNumber}</td>
                            <td className="px-5 py-3 text-zinc-200 whitespace-nowrap">{po.vendor}</td>
                            <td className="px-5 py-3 space-y-1">
                              {po.items.map((item, i) => (
                                <div key={i} className="text-zinc-300">
                                  <span className="font-semibold text-zinc-100">{item.name}</span>{" "}
                                  <span className="text-muted">{item.qty} {item.unit} @ ₹{item.rate.toLocaleString("en-IN")}</span>
                                </div>
                              ))}
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                po.approvalFlag === "approved" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                po.approvalFlag === "rejected" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}>{po.approvalFlag}</span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                po.status === "received" || po.status === "closed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"
                              }`}>{po.status}</span>
                            </td>
                            <td className="px-5 py-3 text-right font-mono font-bold text-foreground whitespace-nowrap">₹{po.totalAmount.toLocaleString("en-IN")}</td>
                            <td className="px-5 py-3 text-right whitespace-nowrap">
                              <div className="flex gap-2 justify-end">
                                <a
                                  href={`${getApiHost()}/apis/v3/procurement/pos/${po.id}/pdf`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-3 py-1.5 bg-elevated hover:bg-elevated border border-border-custom text-zinc-300 rounded-lg text-[10px] font-bold"
                                >
                                  PDF
                                </a>
                                {po.approvalFlag === "pending" && (
                                  <button onClick={() => handleApprovePO(po.id)} className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg text-[10px] font-bold">
                                    Approve PO
                                  </button>
                                )}
                                {po.status === "sent" && po.approvalFlag === "approved" && (
                                  <button onClick={() => handleOpenGRNModal(po)} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold">
                                    🚚 Record GRN
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: INVENTORY */}
          {tab === "inventory" && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Real-time Warehouse Stock Balance</h2>
              <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-elevated text-muted border-b border-border-custom">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Material Item</th>
                      <th className="px-5 py-3 font-semibold">Unit</th>
                      <th className="px-5 py-3 font-semibold">Current Stock</th>
                      <th className="px-5 py-3 font-semibold">Reserved Stock</th>
                      <th className="px-5 py-3 font-semibold">Reorder Level</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((inv, idx) => (
                      <tr key={idx} className="border-b border-border-custom hover:bg-elevated transition-all">
                        <td className="px-5 py-3 font-bold text-foreground">{inv.name}</td>
                        <td className="px-5 py-3 text-muted font-mono uppercase">{inv.unit}</td>
                        <td className={`px-5 py-3 font-mono font-bold ${inv.onHand < 0 ? "text-red-400 font-extrabold" : "text-zinc-200"}`}>
                          {inv.onHand} {inv.unit}
                        </td>
                        <td className="px-5 py-3 text-muted font-mono">{inv.reserved} {inv.unit}</td>
                        <td className="px-5 py-3 text-muted font-mono">{inv.minAlertThreshold} {inv.unit}</td>
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
              <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Inventory Transactions</h2>
              <div className="bg-card border border-border-custom rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-elevated text-muted border-b border-border-custom">
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
                      <tr key={idx} className="border-b border-border-custom hover:bg-elevated transition-all">
                        <td className="px-5 py-3 font-bold text-foreground">{txn.materialName}</td>
                        <td className={`px-5 py-3 font-mono font-bold ${txn.type === "used" ? "text-amber-400" : "text-emerald-400"}`}>
                          {txn.type === "used" ? "-" : "+"}{txn.qty} {txn.unit}
                        </td>
                        <td className="px-5 py-3 capitalize">{txn.type}</td>
                        <td className="px-5 py-3 text-muted font-mono">{txn.sourceRef}</td>
                        <td className="px-5 py-3 text-muted">{txn.date}</td>
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
                  <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Unbilled Materials Tracker</h2>
                  <p className="text-[10px] text-muted mt-1 max-w-lg">GRNs received from vendors but not yet linked to a Material Purchase invoice. Review and mark as billed to reconcile Accounts Payable. Unmatched GRNs inflate stock figures without a corresponding payable.</p>
                </div>
                {unbilledGRNs.length === 0 && (
                  <span className="text-[10px] px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold">✓ All GRNs Reconciled</span>
                )}
              </div>

              {/* Summary Strip */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-input border border-border-custom rounded-md p-4">
                  <span className="text-[9px] uppercase text-muted tracking-wider block">Unbilled GRN Count</span>
                  <strong className={`text-xl font-extrabold mt-1 block ${unbilledGRNs.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>{unbilledGRNs.length}</strong>
                </div>
                <div className="bg-input border border-border-custom rounded-md p-4">
                  <span className="text-[9px] uppercase text-muted tracking-wider block">Unbilled Value (est.)</span>
                  <strong className={`text-xl font-extrabold mt-1 block font-mono ${unbilledGRNs.length > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    ₹{unbilledGRNs.reduce((s, g) => s + g.items.reduce((a, i) => a + i.qty * i.rate, 0), 0).toLocaleString()}
                  </strong>
                </div>
                <div className="bg-input border border-border-custom rounded-md p-4">
                  <span className="text-[9px] uppercase text-muted tracking-wider block">Vendors Pending</span>
                  <strong className="text-xl font-extrabold mt-1 block text-zinc-200">{Object.keys(unbilledByVendor).length}</strong>
                </div>
              </div>

              {/* Vendor-grouped GRN cards */}
              {Object.values(unbilledByVendor).length === 0 ? (
                <div className="text-center py-14 text-muted text-xs">No unbilled GRNs. All received goods have matching invoices.</div>
              ) : (
                Object.values(unbilledByVendor).map(group => (
                  <div key={group.vendor} className="bg-background border border-border-custom rounded-lg overflow-hidden">
                    {/* Vendor header */}
                    <div className="flex items-center justify-between px-5 py-3 bg-amber-500/5 border-b border-amber-500/10">
                      <div className="flex items-center gap-3">
                        <span className="text-[9px] font-extrabold uppercase tracking-widest text-amber-500">⚠ Unbilled</span>
                        <span className="text-xs font-bold text-foreground">{group.vendor}</span>
                        <span className="text-[9px] text-muted">{group.grns.length} GRN{group.grns.length > 1 ? "s" : ""} pending</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] text-muted block">Est. Unbilled Value</span>
                        <strong className="text-sm font-extrabold text-amber-400 font-mono">₹{group.totalValue.toLocaleString()}</strong>
                      </div>
                    </div>

                    {/* Individual GRN rows */}
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
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
                            <tr key={grn.id} className="border-b border-border-custom hover:bg-elevated transition-all">
                              <td className="px-5 py-3">
                                <span className="font-mono font-bold text-foreground">{grn.grnNumber}</span>
                                <span className="block text-[9px] text-muted mt-0.5">PO: {grn.poNumber}</span>
                              </td>
                              <td className="px-5 py-3 text-muted">{grn.receivedDate}</td>
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
                  <h3 className="text-[10px] uppercase font-bold text-muted tracking-wider mb-3">✓ Reconciled GRNs (Billed)</h3>
                  <div className="bg-background border border-border-custom rounded-lg overflow-hidden opacity-60">
                    <table className="w-full text-xs">
                      <tbody>
                        {grns.filter(g => g.isBilled).map(grn => (
                          <tr key={grn.id} className="border-b border-border-custom">
                            <td className="px-5 py-3 font-mono font-bold text-muted">{grn.grnNumber}</td>
                            <td className="px-5 py-3 text-muted">{grn.vendor}</td>
                            <td className="px-5 py-3 text-muted">{grn.receivedDate}</td>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <h3 className="text-xs font-extrabold text-foreground">Create Material Indent (Requisition)</h3>
              <button onClick={() => setShowIndentModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted">Indent Number</label>
                <input type="text" value={newIndentNum} onChange={(e) => setNewIndentNum(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
              </div>
              
              <div className="space-y-1">
                <label className="text-muted">Material Item</label>
                <select value={newIndentMaterial} onChange={(e) => setNewIndentMaterial(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground">
                  <option value="UltraTech Cement">UltraTech Cement</option>
                  <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                  <option value="Traditional Clay Bricks">Traditional Clay Bricks</option>
                  <option value="Fine River Sand">Fine River Sand</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-muted">Required Quantity</label>
                  <input type="number" value={newIndentQty} onChange={(e) => setNewIndentQty(parseFloat(e.target.value) || 0)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
                </div>
                <div className="space-y-1">
                  <label className="text-muted">Unit</label>
                  <input type="text" value={newIndentUnit} onChange={(e) => setNewIndentUnit(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
                </div>
              </div>

              {/* Item-level Spec & Photo override (Screen 5761-5762) */}
              <div className="space-y-1">
                <label className="text-muted">Line-Item Custom Specification Override</label>
                <input type="text" value={newIndentSpec} onChange={(e) => setNewIndentSpec(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" placeholder="Grade 53 OPC Cement, Fe 550D Rebars..." />
              </div>

              <div className="space-y-2 border-t border-border-custom pt-3">
                <span className="text-muted font-bold block">Attach Item Photo proof</span>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setNewIndentPhoto("https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=500")} className="px-3 py-1.5 bg-elevated border border-border-custom rounded-lg text-muted hover:text-foreground">
                    📷 Take Item Photo
                  </button>
                  {newIndentPhoto && <span className="text-emerald-400 font-bold">✓ Captured</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-border-custom pt-4">
              <button onClick={() => setShowIndentModal(false)} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md">Cancel</button>
              <button onClick={handleCreateIndent} className="px-5 py-2.5 bg-primary text-white font-bold rounded-md">Submit Indent</button>
            </div>
          </div>
        </div>
      )}

      {/* Log GRN PO Checklist Modal (Screen 5767-5768) */}
      {showGRNModal && selectedPOForGRN && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-lg shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <div>
                <h3 className="text-xs font-extrabold text-foreground">Record Goods Receipt Note (GRN)</h3>
                <p className="text-[10px] text-muted mt-0.5">PO: {selectedPOForGRN.poNumber} · Vendor: {selectedPOForGRN.vendor}</p>
              </div>
              <button onClick={() => { setShowGRNModal(false); setSelectedPOForGRN(null); }} className="text-muted hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted">GRN Serial Number</label>
                <input type="text" value={grnNum} onChange={(e) => setGrnNum(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
              </div>

              {/* Checklist list of PO items (Screen 5768) */}
              <div className="space-y-2">
                <span className="text-muted font-bold block uppercase tracking-wider text-[10px]">Select Delivered PO Items</span>
                {selectedPOForGRN.items.map((item, idx) => {
                  const idxStr = idx.toString();
                  return (
                    <div key={idx} className="p-3 bg-input border border-border-custom rounded-md flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={grnItemsChecked[idxStr] || false}
                          onChange={(e) => setGrnItemsChecked({ ...grnItemsChecked, [idxStr]: e.target.checked })}
                          className="accent-primary h-4 w-4 rounded cursor-pointer"
                        />
                        <span className="text-foreground font-bold">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted">Rec Qty:</span>
                        <input
                          type="number"
                          value={grnReceivedQtys[idxStr] || "0"}
                          onChange={(e) => setGrnReceivedQtys({ ...grnReceivedQtys, [idxStr]: e.target.value })}
                          disabled={!grnItemsChecked[idxStr]}
                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-foreground w-20 text-center font-bold disabled:opacity-50"
                        />
                        <span className="text-muted">{item.unit}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gate Entry Photo Upload */}
              <div className="space-y-1">
                <label className="text-muted font-bold block">GRN Gate Entry / Challan Photo</label>
                <input type="file" accept="image/*"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setGrnGatePhoto("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500");
                  }}
                  className="w-full bg-input border border-border-custom rounded-lg p-2 text-muted text-xs" />
                {grnGatePhoto && <span className="text-emerald-400 font-bold mt-1 block">✓ Photo Attached</span>}
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-border-custom pt-4">
              <button onClick={() => { setShowGRNModal(false); setSelectedPOForGRN(null); }} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md">Cancel</button>
              <button onClick={handleCreateGRN} className="px-5 py-2.5 bg-primary text-white font-bold rounded-md">Record GRN Items</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Material Usage Drawer */}
      {showUseModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-md shadow-2xl p-6 space-y-4 text-xs">
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <h3 className="text-xs font-extrabold text-foreground">Log Site Material Usage</h3>
              <button onClick={() => setShowUseModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted">Select Material Item</label>
                <select value={useMaterialName} onChange={(e) => setUseMaterialName(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground">
                  <option value="UltraTech Cement">UltraTech Cement</option>
                  <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                  <option value="Traditional Clay Bricks">Traditional Clay Bricks</option>
                  <option value="Fine River Sand">Fine River Sand</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-muted">Usage Quantity</label>
                <input type="number" value={useQty} onChange={(e) => setUseQty(parseFloat(e.target.value) || 0)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
              </div>

              <div className="space-y-1">
                <label className="text-muted">Consumption Reference (Location / Lorry No.)</label>
                <input type="text" value={useSourceRef} onChange={(e) => setUseSourceRef(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-border-custom pt-4">
              <button onClick={() => setShowUseModal(false)} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md">Cancel</button>
              <button onClick={handleRecordUsage} className="px-5 py-2.5 bg-primary text-white font-bold rounded-md">Record Usage</button>
            </div>
          </div>
        </div>
      )}

      {/* PO Creation modal */}
      {showPOModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-md shadow-2xl p-6 space-y-4 text-xs font-sans max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border-custom pb-2">
              <h3 className="text-xs font-extrabold text-foreground">Create Purchase Order (PO)</h3>
              <button onClick={() => setShowPOModal(false)} className="text-muted hover:text-foreground">✕</button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-muted font-bold">PO Number</label>
                <input type="text" value={newPONum} onChange={(e) => setNewPONum(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
              </div>

              <div className="space-y-1">
                <label className="text-muted font-bold">Supplier Vendor</label>
                <select value={newPOVendor} onChange={(e) => setNewPOVendor(e.target.value)} className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground">
                  {VENDORS.map(v => (
                    <option key={v.id} value={v.name}>{v.name}</option>
                  ))}
                </select>
              </div>

              {/* Multi-item list form */}
              <div className="space-y-2 border-t border-border-custom pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted font-bold uppercase tracking-wider text-[9px]">PO Line Items</span>
                  <button type="button" onClick={() => setPoFormItems([...poFormItems, { name: "TMT Steel 16mm", qty: 10, unit: "tons", rate: 62000 }])}
                    className="text-[9px] text-primary font-bold hover:underline">+ Add Item Line</button>
                </div>
                {poFormItems.map((item, idx) => (
                  <div key={idx} className="bg-elevated p-3 rounded-lg border border-border-custom space-y-2 relative">
                    <button type="button" onClick={() => setPoFormItems(poFormItems.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 text-muted hover:text-red-400">✕</button>
                    <div className="space-y-1">
                      <label className="text-muted text-[9px]">Item Name</label>
                      <select value={item.name}
                        onChange={e => {
                          const next = [...poFormItems];
                          next[idx].name = e.target.value;
                          next[idx].unit = e.target.value.includes("Cement") ? "bags" : "tons";
                          setPoFormItems(next);
                        }}
                        className="w-full bg-input border border-border-custom rounded p-1 text-foreground text-[11px]">
                        <option value="UltraTech Cement">UltraTech Cement</option>
                        <option value="TMT Steel 16mm">TMT Steel 16mm</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-muted text-[9px]">Quantity ({item.unit})</label>
                        <input type="number" value={item.qty}
                          onChange={e => { const next = [...poFormItems]; next[idx].qty = parseFloat(e.target.value) || 0; setPoFormItems(next); }}
                          className="w-full bg-input border border-border-custom rounded p-1 text-foreground text-[11px]" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-muted text-[9px]">Rate (₹)</label>
                        <input type="number" value={item.rate}
                          onChange={e => { const next = [...poFormItems]; next[idx].rate = parseFloat(e.target.value) || 0; setPoFormItems(next); }}
                          className="w-full bg-input border border-border-custom rounded p-1 text-foreground text-[11px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t border-border-custom pt-3">
                <label className="text-muted font-bold">Terms &amp; Conditions</label>
                <textarea value={newPOTerms} onChange={(e) => setNewPOTerms(e.target.value)}
                  placeholder="Pre-filled from company Purchase Order Terms; edit as needed" rows={3}
                  className="w-full bg-input border border-border-custom rounded-lg p-2 text-foreground" />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-border-custom pt-4">
              <button onClick={() => setShowPOModal(false)} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md">Cancel</button>
              <button onClick={handleCreatePO} className="px-5 py-2.5 bg-primary text-white font-bold rounded-md">Save PO Draft</button>
            </div>
          </div>
        </div>
      )}

      {/* RFQ Comparison Drawer */}
      {showRFQDrawer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end">
          <div className="bg-background border-l border-border-custom w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden text-xs">
            <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between bg-background">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary">RFQ Analysis Center</span>
                <h2 className="text-base font-extrabold text-foreground mt-1">Vendor Quote Comparisons</h2>
              </div>
              <button onClick={() => setShowRFQDrawer(false)} className="text-muted hover:text-foreground">✕ Close</button>
            </div>

            <div className="p-6 border-b border-border-custom bg-input flex items-center gap-2">
              <span className="text-muted font-bold">Select Material Item:</span>
              {["UltraTech Cement", "TMT Steel 16mm"].map((item) => (
                <button key={item} onClick={() => setSelectedRFQItem(item as any)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${selectedRFQItem === item ? "bg-primary text-white" : "bg-elevated text-muted hover:text-foreground"}`}>
                  {item}
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {(RFQ_DATA[selectedRFQItem] || []).map((quote, idx) => (
                  <div key={idx} className={`border rounded-lg p-4 space-y-4 relative flex flex-col justify-between ${quote.isL1 ? "border-emerald-500/30 bg-emerald-500/[0.02]" : "border-border-custom bg-elevated"}`}>
                    {quote.isL1 && (
                      <span className="absolute -top-2.5 left-4 bg-emerald-500 text-black text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">L1 Preferred</span>
                    )}
                    <div className="space-y-1">
                      <h4 className="font-bold text-foreground text-xs">{quote.vendor}</h4>
                      <span className="text-[9px] text-muted">Commercial terms</span>
                    </div>

                    <div className="space-y-2 font-mono text-[10px]">
                      <div className="flex justify-between border-b border-border-custom pb-1">
                        <span className="text-muted">Rate:</span>
                        <strong className={quote.isL1 ? "text-emerald-400" : "text-foreground"}>₹{quote.rate.toLocaleString()}/unit</strong>
                      </div>
                      <div className="flex justify-between border-b border-border-custom pb-1">
                        <span className="text-muted">Delivery:</span>
                        <strong className="text-foreground">{quote.delivery} days</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Payment:</span>
                        <strong className="text-foreground">{quote.terms}</strong>
                      </div>
                    </div>

                    <button onClick={() => { setNewPOVendor(quote.vendor); setPoFormItems([{ name: selectedRFQItem, qty: 100, unit: selectedRFQItem.includes("Cement") ? "bags" : "tons", rate: quote.rate }]); setShowRFQDrawer(false); setShowPOModal(true); }}
                      className={`w-full py-1.5 rounded-md font-bold text-[9px] uppercase tracking-wider transition-all ${quote.isL1 ? "bg-emerald-500 text-black font-extrabold" : "bg-elevated border border-border-custom text-muted hover:text-foreground"}`}>
                      Select Vendor
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-card border border-border-custom rounded-lg p-4 max-w-3xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end mb-2">
              <button onClick={() => setPreviewUrl(null)} className="text-muted hover:text-foreground font-bold text-lg leading-none">×</button>
            </div>
            <img src={previewUrl} className="max-h-[70vh] rounded-lg mx-auto" alt="Item photo proof" />
          </div>
        </div>
      )}
    </div>
  );
}
