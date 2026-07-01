"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  sequence: number;
  description: string;
  criteria: string;
  mandatory: boolean;
}

interface Checklist {
  id: string;
  title: string;
  category: string;
  isCode: string;
  items: ChecklistItem[];
}

interface InspectionResponse {
  itemId: string;
  result: "Pass" | "Fail" | "NA";
  remarks: string;
}

interface Inspection {
  id: string;
  zone: string;
  checklist: string;
  date: string;
  status: "pending" | "pass" | "fail" | "partial";
  passCount: number;
  failCount: number;
  naCount: number;
  inspector: string;
}

interface NCR {
  id: string;
  number: string;
  title: string;
  severity: "Minor" | "Major" | "Critical";
  status: "open" | "under_review" | "closed";
  zone: string;
  raisedBy: string;
  date: string;
  dueDate: string;
  resolution?: string;
}

interface LabTest {
  id: string;
  type: string;
  material: string;
  sampleRef: string;
  date: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  pass: boolean;
  zone: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const CHECKLISTS: Checklist[] = [
  {
    id: "CL-01", title: "IS 456 Concrete Pre-Pour", category: "Concrete", isCode: "IS 456:2000",
    items: [
      { id: "I-01", sequence: 1, description: "Reinforcement cover", criteria: "Cover ≥ 40mm", mandatory: true },
      { id: "I-02", sequence: 2, description: "Shuttering alignment", criteria: "Plumb within 5mm", mandatory: true },
      { id: "I-03", sequence: 3, description: "Cube mould cleanliness", criteria: "No old concrete", mandatory: false },
      { id: "I-04", sequence: 4, description: "Water-cement ratio", criteria: "W/C ≤ 0.45", mandatory: true },
      { id: "I-05", sequence: 5, description: "Vibrator availability", criteria: "Min 2 vibrators on-site", mandatory: true },
    ]
  },
  {
    id: "CL-02", title: "IS 1786 Rebar Acceptance", category: "Steel", isCode: "IS 1786:2008",
    items: [
      { id: "I-06", sequence: 1, description: "Bar marking (Fe500D)", criteria: "Visible marking", mandatory: true },
      { id: "I-07", sequence: 2, description: "Mill test certificate", criteria: "TC available", mandatory: true },
      { id: "I-08", sequence: 3, description: "Rust & scale check", criteria: "Max mill scale only", mandatory: true },
    ]
  },
];

const INSPECTIONS: Inspection[] = [
  { id: "INS-01", zone: "Floor 3 — Grid C-D", checklist: "IS 456 Concrete Pre-Pour", date: "2026-06-26", status: "partial", passCount: 3, failCount: 1, naCount: 0, inspector: "Ramesh Kumar" },
  { id: "INS-02", zone: "Foundation — Block A", checklist: "IS 1786 Rebar Acceptance", date: "2026-06-25", status: "pass", passCount: 3, failCount: 0, naCount: 0, inspector: "Meera Nair" },
  { id: "INS-03", zone: "Basement — Retaining Wall", checklist: "IS 456 Concrete Pre-Pour", date: "2026-06-24", status: "fail", passCount: 2, failCount: 3, naCount: 0, inspector: "Ramesh Kumar" },
];

const NCRS: NCR[] = [
  { id: "NCR-01", number: "NCR-2026-001", title: "Shuttering misalignment >10mm at Floor 3 Grid C-D", severity: "Critical", status: "open", zone: "Floor 3 Grid C-D", raisedBy: "Ramesh Kumar", date: "2026-06-26", dueDate: "2026-06-27" },
  { id: "NCR-02", number: "NCR-2026-002", title: "Rebar cover <30mm found in basement wall", severity: "Major", status: "under_review", zone: "Basement Wall B2", raisedBy: "Meera Nair", date: "2026-06-24", dueDate: "2026-06-28" },
  { id: "NCR-03", number: "NCR-2026-003", title: "Vibrator not available during pour", severity: "Minor", status: "closed", zone: "Floor 1 Slab", raisedBy: "Ramesh Kumar", date: "2026-06-20", dueDate: "2026-06-21", resolution: "Additional vibrator arranged from site stores." },
];

const LAB_TESTS: LabTest[] = [
  { id: "T-01", type: "Cube Test", material: "Concrete M25", sampleRef: "CB-2026-001", date: "2026-06-26", value: 28.4, unit: "MPa", min: 25, max: 50, pass: true, zone: "Floor 3 Col C3" },
  { id: "T-02", type: "Slump Test", material: "Concrete M25", sampleRef: "SL-2026-001", date: "2026-06-26", value: 145, unit: "mm", min: 25, max: 100, pass: false, zone: "Floor 3 Slab" },
  { id: "T-03", type: "Cube Test", material: "Concrete M30", sampleRef: "CB-2026-002", date: "2026-06-24", value: 33.1, unit: "MPa", min: 30, max: 60, pass: true, zone: "Basement Slab" },
  { id: "T-04", type: "Compaction Test", material: "Backfill Soil", sampleRef: "CP-2026-001", date: "2026-06-23", value: 97.2, unit: "%", min: 95, max: 100, pass: true, zone: "Perimeter Fill" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const severityColors: Record<string, string> = {
  Critical: "bg-red-500/15 text-red-400 border-red-500/25",
  Major: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  Minor: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
};

const statusColors: Record<string, string> = {
  open: "bg-red-500/10 text-red-400 border-red-500/20",
  under_review: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  closed: "bg-green-500/10 text-green-400 border-green-500/20",
  pass: "bg-green-500/10 text-green-400 border-green-500/20",
  fail: "bg-red-500/10 text-red-400 border-red-500/20",
  partial: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  pending: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const badge = (label: string, cls: string) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
    {label}
  </span>
);

const passRate = (p: number, f: number) => {
  const total = p + f;
  if (total === 0) return 0;
  return Math.round((p / total) * 100);
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function QualityPage() {
  const params = useParams();
  const companyId = (params?.company_id as string) || "e0000000-0000-0000-0000-000000000000";
  const projectId = (params?.project_id as string) || "d0000000-0000-0000-0000-000000000001";

  const [tab, setTab] = useState<"checklists" | "inspections" | "ncr" | "labtests">("inspections");
  
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [ncrs, setNcrs] = useState<NCR[]>([]);
  const [labTests, setLabTests] = useState<LabTest[]>([]);

  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [activeInspectionItems, setActiveInspectionItems] = useState<ChecklistItem[]>([]);
  const [inspectionResponses, setInspectionResponses] = useState<Record<string, "Pass" | "Fail" | "NA">>({});

  const [showNCRForm, setShowNCRForm] = useState(false);
  const [ncrForm, setNcrForm] = useState({
    title: "",
    description: "",
    severity: "Major" as "Minor" | "Major" | "Critical",
    zone: "",
    dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0]
  });

  const [showTestForm, setShowTestForm] = useState(false);
  const [testForm, setTestForm] = useState({
    type: "Cube Test",
    material: "Concrete M25",
    sampleRef: "",
    value: "28.0",
    unit: "MPa",
    min: "25.0",
    max: "50.0",
    zone: ""
  });

  const [showInspForm, setShowInspForm] = useState(false);
  const [inspForm, setInspForm] = useState({
    checklistId: "",
    zone: "",
    overallRemarks: ""
  });

  const loadAll = async () => {
    let currentChecklists: Checklist[] = [];
    try {
      const clRes = await fetch(`http://localhost:8000/apis/v3/quality/checklists/${companyId}`);
      if (clRes.ok) {
        const clData = await clRes.json();
        currentChecklists = await Promise.all(clData.map(async (cl: any) => {
          const itemsRes = await fetch(`http://localhost:8000/apis/v3/quality/checklists/${cl.id}/items`);
          let items: ChecklistItem[] = [];
          if (itemsRes.ok) {
            const itemsData = await itemsRes.json();
            items = itemsData.map((item: any) => ({
              id: item.id,
              sequence: item.sequence,
              description: item.description,
              criteria: item.acceptable_criteria || "",
              mandatory: item.is_mandatory
            }));
          }
          return {
            id: cl.id,
            title: cl.title,
            category: cl.category || "Concrete",
            isCode: cl.is_code_reference || "IS 456:2000",
            items
          };
        }));
        setChecklists(currentChecklists);
      }
    } catch (e) {
      console.error("Failed to fetch checklists", e);
    }

    try {
      const inspRes = await fetch(`http://localhost:8000/apis/v3/quality/inspections/${projectId}`);
      if (inspRes.ok) {
        const inspData = await inspRes.json();
        const mapped = inspData.map((insp: any) => {
          const foundCl = currentChecklists.find(c => c.id === insp.checklist_id);
          return {
            id: insp.id,
            checklistId: insp.checklist_id,
            zone: insp.zone || "General Site",
            checklist: foundCl ? foundCl.title : "IS 456 Concrete Pre-Pour",
            date: insp.inspection_date ? insp.inspection_date.split("T")[0] : "",
            status: insp.status,
            passCount: insp.pass_count,
            failCount: insp.fail_count,
            naCount: insp.na_count,
            inspector: "Meera Nair"
          };
        });
        setInspections(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch inspections", e);
    }
  };

  const fetchNcrs = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/quality/ncr/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((n: any) => ({
          id: n.id,
          number: n.ncr_number,
          title: n.title,
          severity: n.severity,
          status: n.status,
          zone: "Site Zone",
          raisedBy: "Inspector",
          date: n.created_at ? n.created_at.split("T")[0] : "",
          dueDate: n.due_date ? n.due_date.split("T")[0] : "",
          resolution: n.resolution_notes || undefined
        }));
        setNcrs(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch NCRs", e);
    }
  };

  const fetchLabTests = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/quality/material-tests/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((t: any) => ({
          id: t.id,
          type: t.test_type,
          material: t.material || "Concrete",
          sampleRef: t.sample_ref || "",
          date: t.test_date ? t.test_date.split("T")[0] : "",
          value: t.result_value,
          unit: t.unit || "",
          min: t.min_acceptable || 0,
          max: t.max_acceptable || 100,
          pass: t.is_pass,
          zone: t.zone || "General Site"
        }));
        setLabTests(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch lab tests", e);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadAll();
      fetchNcrs();
      fetchLabTests();
    }
  }, [projectId]);

  useEffect(() => {
    if (selectedInspection) {
      const cl = checklists.find(c => c.id === (selectedInspection as any).checklistId);
      if (cl) {
        setActiveInspectionItems(cl.items);
      } else {
        setActiveInspectionItems([]);
      }
      setInspectionResponses({});
    }
  }, [selectedInspection, checklists]);

  const moveNCR = async (id: string, newStatus: "under_review" | "closed") => {
    try {
      const action = newStatus === "under_review" ? "review" : "close";
      const body = newStatus === "closed" ? JSON.stringify({ resolution_notes: "Resolved and verified on-site." }) : undefined;
      const res = await fetch(`http://localhost:8000/apis/v3/quality/ncr/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body
      });
      if (res.ok) {
        fetchNcrs();
      }
    } catch (e) {
      console.error("Failed to transition NCR status", e);
    }
  };

  const handleCreateNCR = async () => {
    try {
      const res = await fetch("http://localhost:8000/apis/v3/quality/ncr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          ncr_number: `NCR-2026-${Math.floor(100 + Math.random() * 900)}`,
          title: ncrForm.title,
          description: ncrForm.description,
          severity: ncrForm.severity,
          due_date: new Date(ncrForm.dueDate).toISOString()
        })
      });
      if (res.ok) {
        fetchNcrs();
        setShowNCRForm(false);
        setNcrForm({
          title: "",
          description: "",
          severity: "Major",
          zone: "",
          dueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0]
        });
      }
    } catch (e) {
      console.error("Failed to create NCR", e);
    }
  };

  const handleCreateTest = async () => {
    try {
      const res = await fetch("http://localhost:8000/apis/v3/quality/material-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          test_type: testForm.type,
          material: testForm.material,
          sample_ref: testForm.sampleRef || `REF-${Math.floor(1000 + Math.random() * 9000)}`,
          test_date: new Date().toISOString(),
          result_value: parseFloat(testForm.value),
          unit: testForm.unit,
          min_acceptable: parseFloat(testForm.min),
          max_acceptable: parseFloat(testForm.max),
          zone: testForm.zone
        })
      });
      if (res.ok) {
        fetchLabTests();
        setShowTestForm(false);
        setTestForm({
          type: "Cube Test",
          material: "Concrete M25",
          sampleRef: "",
          value: "28.0",
          unit: "MPa",
          min: "25.0",
          max: "50.0",
          zone: ""
        });
      }
    } catch (e) {
      console.error("Failed to log material test", e);
    }
  };

  const handleCreateInspection = async () => {
    if (!inspForm.checklistId) return;
    try {
      const res = await fetch("http://localhost:8000/apis/v3/quality/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          checklist_id: inspForm.checklistId,
          zone: inspForm.zone,
          inspection_date: new Date().toISOString(),
          overall_remarks: inspForm.overallRemarks
        })
      });
      if (res.ok) {
        loadAll();
        setShowInspForm(false);
        setInspForm({
          checklistId: "",
          zone: "",
          overallRemarks: ""
        });
      }
    } catch (e) {
      console.error("Failed to start site inspection", e);
    }
  };

  const handleSubmitAuditResponses = async () => {
    if (!selectedInspection) return;
    const responses = Object.entries(inspectionResponses).map(([itemId, result]) => ({
      checklist_item_id: itemId,
      result,
      remarks: "Checked on site"
    }));

    try {
      const res = await fetch(`http://localhost:8000/apis/v3/quality/inspections/${selectedInspection.id}/respond`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses })
      });
      if (res.ok) {
        loadAll();
        setSelectedInspection(null);
      }
    } catch (e) {
      console.error("Failed to submit audit responses", e);
    }
  };

  const openNCRs = ncrs.filter(n => n.status === "open");
  const reviewNCRs = ncrs.filter(n => n.status === "under_review");
  const closedNCRs = ncrs.filter(n => n.status === "closed");

  const tabBtn = (key: typeof tab, label: string) => (
    <button onClick={() => setTab(key)}
      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${tab === key ? "bg-primary/15 text-primary border border-primary/30" : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"}`}>
      {label}
    </button>
  );

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-5 border-b border-white/5 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] flex items-center justify-center font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm">Quality Control</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {([
            ["inspections", "🔍", "Inspections"],
            ["checklists", "📋", "Checklists"],
            ["ncr", "🚨", "NCR Tracker"],
            ["labtests", "🧪", "Lab Tests"],
          ] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${tab === key ? "bg-white/[0.06] text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"}`}>
              <span>{icon}</span> {label}
            </button>
          ))}
          <div className="pt-4 border-t border-white/5 mt-4">
            <Link href={`/c/${companyId}/dashboard`}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-white/[0.03]">
              ← Dashboard
            </Link>
          </div>
        </nav>

        {/* Quick stats */}
        <div className="p-3 border-t border-white/5 space-y-2">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-red-400 font-bold">Open NCRs</span>
            <span className="text-sm font-bold text-red-400">{openNCRs.length}</span>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-yellow-400 font-bold">Under Review</span>
            <span className="text-sm font-bold text-yellow-400">{reviewNCRs.length}</span>
          </div>
          <div className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 font-bold">Failed Tests</span>
            <span className="text-sm font-bold text-primary">{LAB_TESTS.filter(t => !t.pass).length}</span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#0B0910] shrink-0">
          <h1 className="text-sm font-bold text-white uppercase tracking-widest">
            {tab === "inspections" && "Site Inspections"}
            {tab === "checklists" && "IS-Code Checklist Library"}
            {tab === "ncr" && "Non-Conformance Reports (NCR)"}
            {tab === "labtests" && "Material Lab Tests"}
          </h1>
          <div>
            {tab === "ncr" && (
              <button onClick={() => setShowNCRForm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all">
                + Raise NCR
              </button>
            )}
            {tab === "inspections" && (
              <button onClick={() => setShowInspForm(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer">
                + New Inspection
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ── INSPECTIONS ─────────────────────────────────────────────────── */}
          {tab === "inspections" && (
            <div className="space-y-4">
              {/* KPI row */}
              <div className="grid grid-cols-4 gap-4 mb-4">
                {[
                  { label: "Total Inspections", val: inspections.length, color: "text-white" },
                  { label: "All Pass", val: inspections.filter(i => i.status === "pass").length, color: "text-green-400" },
                  { label: "Partial", val: inspections.filter(i => i.status === "partial").length, color: "text-yellow-400" },
                  { label: "Fail", val: inspections.filter(i => i.status === "fail").length, color: "text-red-400" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-[#171520] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Inspection cards */}
              <div className="grid grid-cols-1 gap-3">
                {inspections.map(insp => {
                  const rate = passRate(insp.passCount, insp.failCount);
                  return (
                    <div key={insp.id} onClick={() => setSelectedInspection(insp)}
                      className="bg-[#171520] border border-white/5 rounded-xl p-5 cursor-pointer hover:border-primary/20 hover:bg-white/[0.01] transition-all">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-white text-sm">{insp.zone}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{insp.checklist}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {badge(insp.status.replace("_", " "), statusColors[insp.status])}
                          <span className="text-[10px] text-zinc-500">{insp.date}</span>
                        </div>
                      </div>
                      {/* Pass rate bar */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all"
                            style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs font-bold text-zinc-300">{rate}% pass</span>
                        <span className="text-xs text-green-400">✓ {insp.passCount}</span>
                        <span className="text-xs text-red-400">✗ {insp.failCount}</span>
                        <span className="text-[10px] text-zinc-500">by {insp.inspector}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── CHECKLISTS ──────────────────────────────────────────────────── */}
          {tab === "checklists" && (
            <div className="space-y-4">
              {checklists.map(cl => (
                <div key={cl.id} className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{cl.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-bold">{cl.category}</span>
                        <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-full font-bold">{cl.isCode}</span>
                        <span className="text-[10px] text-zinc-500">{cl.items.length} items</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setInspForm(prev => ({ ...prev, checklistId: cl.id }));
                        setShowInspForm(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20 cursor-pointer"
                    >
                      Use Template
                    </button>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="bg-white/[0.02] border-b border-white/5">
                      <tr>
                        {["#", "Checkpoint", "Acceptable Criteria", "Mandatory"].map(h => (
                          <th key={h} className="text-left px-4 py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {cl.items.map(item => (
                        <tr key={item.id} className="hover:bg-white/[0.01]">
                          <td className="px-4 py-2.5 text-zinc-500 font-mono">{item.sequence}</td>
                          <td className="px-4 py-2.5 text-zinc-200">{item.description}</td>
                          <td className="px-4 py-2.5 text-zinc-400">{item.criteria}</td>
                          <td className="px-4 py-2.5">
                            {item.mandatory
                              ? <span className="text-red-400 font-bold text-[10px]">MANDATORY</span>
                              : <span className="text-zinc-600 text-[10px]">Optional</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* ── NCR KANBAN ──────────────────────────────────────────────────── */}
          {tab === "ncr" && (
            <div className="grid grid-cols-3 gap-4">
              {/* Open */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-red-400" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Open</span>
                  <span className="ml-auto text-xs text-zinc-500">{openNCRs.length}</span>
                </div>
                {openNCRs.map(ncr => (
                  <div key={ncr.id} className="bg-[#171520] border border-red-500/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      {badge(ncr.severity, severityColors[ncr.severity])}
                      <span className="text-[10px] text-zinc-500 font-mono">{ncr.number}</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-snug">{ncr.title}</p>
                    <p className="text-[10px] text-zinc-500">{ncr.zone} · Due {ncr.dueDate}</p>
                    <button onClick={() => moveNCR(ncr.id, "under_review")}
                      className="w-full text-[10px] py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-bold transition-all cursor-pointer">
                      → Move to Review
                    </button>
                  </div>
                ))}
              </div>

              {/* Under Review */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-blue-400" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Under Review</span>
                  <span className="ml-auto text-xs text-zinc-500">{reviewNCRs.length}</span>
                </div>
                {reviewNCRs.map(ncr => (
                  <div key={ncr.id} className="bg-[#171520] border border-blue-500/10 rounded-xl p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      {badge(ncr.severity, severityColors[ncr.severity])}
                      <span className="text-[10px] text-zinc-500 font-mono">{ncr.number}</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-snug">{ncr.title}</p>
                    <p className="text-[10px] text-zinc-500">{ncr.zone} · Due {ncr.dueDate}</p>
                    <button onClick={() => moveNCR(ncr.id, "closed")}
                      className="w-full text-[10px] py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 font-bold transition-all cursor-pointer">
                      ✓ Close NCR
                    </button>
                  </div>
                ))}
              </div>

              {/* Closed */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">Closed</span>
                  <span className="ml-auto text-xs text-zinc-500">{closedNCRs.length}</span>
                </div>
                {closedNCRs.map(ncr => (
                  <div key={ncr.id} className="bg-[#171520] border border-green-500/10 rounded-xl p-4 space-y-2 opacity-70">
                    <div className="flex items-center justify-between">
                      {badge(ncr.severity, severityColors[ncr.severity])}
                      <span className="text-[10px] text-zinc-500 font-mono">{ncr.number}</span>
                    </div>
                    <p className="text-xs font-semibold text-white leading-snug">{ncr.title}</p>
                    <p className="text-[10px] text-zinc-400 italic">{ncr.resolution}</p>
                    {badge("Closed", statusColors["closed"])}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LAB TESTS ───────────────────────────────────────────────────── */}
          {tab === "labtests" && (
            <div className="space-y-4">
              {/* Summary row */}
              <div className="grid grid-cols-4 gap-4 mb-2">
                {[
                  { label: "Total Tests", val: labTests.length, color: "text-white" },
                  { label: "Passed", val: labTests.filter(t => t.pass).length, color: "text-green-400" },
                  { label: "Failed", val: labTests.filter(t => !t.pass).length, color: "text-red-400" },
                  { label: "Pass Rate", val: labTests.length ? `${Math.round(labTests.filter(t => t.pass).length / labTests.length * 100)}%` : "0%", color: "text-primary" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-[#171520] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Test Results Log</span>
                  <button onClick={() => setShowTestForm(true)} className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20 cursor-pointer">+ Log Test</button>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      {["Test Type", "Material", "Sample Ref", "Date", "Result", "Range", "Zone", "Status"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {labTests.map(t => (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{t.type}</td>
                        <td className="px-4 py-3 text-zinc-300">{t.material}</td>
                        <td className="px-4 py-3 font-mono text-zinc-400 text-[10px]">{t.sampleRef}</td>
                        <td className="px-4 py-3 text-zinc-400">{t.date}</td>
                        <td className="px-4 py-3">
                          <span className={`font-bold text-sm ${t.pass ? "text-green-400" : "text-red-400"}`}>
                            {t.value} {t.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-500">{t.min}–{t.max} {t.unit}</td>
                        <td className="px-4 py-3 text-zinc-400">{t.zone}</td>
                        <td className="px-4 py-3">
                          {t.pass
                            ? <span className="flex items-center gap-1 text-green-400 font-bold text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-green-400" />PASS</span>
                            : <span className="flex items-center gap-1 text-red-400 font-bold text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-red-400" />FAIL</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Inspection Detail Modal */}
      {selectedInspection && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedInspection(null)}>
          <div className="bg-[#171520] border border-white/10 rounded-2xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-white">{selectedInspection.zone}</h2>
                <p className="text-xs text-zinc-500">{selectedInspection.checklist} · {selectedInspection.date}</p>
              </div>
              <button onClick={() => setSelectedInspection(null)} className="text-zinc-500 hover:text-white text-xl cursor-pointer">✕</button>
            </div>

            <div className="flex items-center gap-4 mb-5">
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  style={{ width: `${passRate(selectedInspection.passCount, selectedInspection.failCount)}%` }} />
              </div>
              <span className="text-sm font-bold text-white">{passRate(selectedInspection.passCount, selectedInspection.failCount)}%</span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Pass", val: selectedInspection.passCount, color: "text-green-400 bg-green-500/10 border-green-500/20" },
                { label: "Fail", val: selectedInspection.failCount, color: "text-red-400 bg-red-500/10 border-red-500/20" },
                { label: "N/A", val: selectedInspection.naCount, color: "text-zinc-400 bg-white/5 border-white/10" },
              ].map(({ label, val, color }) => (
                <div key={label} className={`rounded-xl border p-3 text-center ${color}`}>
                  <p className="text-xl font-bold">{val}</p>
                  <p className="text-[10px] font-bold uppercase">{label}</p>
                </div>
              ))}
            </div>

            <div className="mb-4">
              {badge(selectedInspection.status, statusColors[selectedInspection.status])}
            </div>

            {/* Checklist Checkpoints Audit Form */}
            {activeInspectionItems.length > 0 && (
              <div className="space-y-4 border-t border-white/5 pt-4 mt-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Verify Checkpoints</h3>
                <div className="space-y-3">
                  {activeInspectionItems.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                      <div className="text-left">
                        <p className="text-xs text-white font-semibold">{item.sequence}. {item.description}</p>
                        <p className="text-[10px] text-zinc-500 mt-0.5">Criteria: {item.criteria}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {["Pass", "Fail", "NA"].map((res) => {
                          const isSelected = inspectionResponses[item.id] === res;
                          return (
                            <button
                              key={res}
                              onClick={() => setInspectionResponses(prev => ({ ...prev, [item.id]: res as any }))}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded border transition-all cursor-pointer ${
                                isSelected
                                  ? res === "Pass"
                                    ? "bg-green-500/20 border-green-500 text-green-400"
                                    : res === "Fail"
                                    ? "bg-red-500/20 border-red-500 text-red-400"
                                    : "bg-zinc-500/20 border-zinc-500 text-zinc-400"
                                  : "bg-white/5 border-white/10 text-zinc-400 hover:text-white"
                              }`}
                            >
                              {res}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleSubmitAuditResponses}
                  className="w-full bg-primary hover:bg-primary/95 text-white py-2 rounded-xl text-xs font-bold transition-all mt-4 cursor-pointer"
                >
                  Submit Audit Responses
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Start Site Inspection */}
      {showInspForm && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4 text-left">
            <div>
              <h3 className="text-sm font-extrabold text-white">Start Site Inspection</h3>
              <p className="text-xs text-zinc-400 mt-1">Initiate a quality control verification event.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Checklist Template</label>
                <select
                  value={inspForm.checklistId}
                  onChange={(e) => setInspForm(prev => ({ ...prev, checklistId: e.target.value }))}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-semibold"
                >
                  <option value="">-- Choose Template --</option>
                  {checklists.map(cl => (
                    <option key={cl.id} value={cl.id} className="bg-[#171520] text-white">{cl.title} ({cl.isCode})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Location Zone</label>
                <input
                  type="text"
                  placeholder="Floor 3 Grid C-D"
                  value={inspForm.zone}
                  onChange={(e) => setInspForm(prev => ({ ...prev, zone: e.target.value }))}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Remarks</label>
                <textarea
                  placeholder="Additional inspection instructions..."
                  value={inspForm.overallRemarks}
                  onChange={(e) => setInspForm(prev => ({ ...prev, overallRemarks: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowInspForm(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateInspection} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Start Inspection</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Raise NCR */}
      {showNCRForm && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4 text-left">
            <div>
              <h3 className="text-sm font-extrabold text-white">Raise Non-Conformance Report (NCR)</h3>
              <p className="text-xs text-zinc-400 mt-1">Issue a formal quality deviation report.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Deviation Title</label>
                <input
                  type="text"
                  placeholder="Shuttering misalignment >10mm"
                  value={ncrForm.title}
                  onChange={(e) => setNcrForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Description / Snags details</label>
                <textarea
                  placeholder="Describe the exact quality issue..."
                  value={ncrForm.description}
                  onChange={(e) => setNcrForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Severity</label>
                  <select
                    value={ncrForm.severity}
                    onChange={(e) => setNcrForm(prev => ({ ...prev, severity: e.target.value as any }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-semibold"
                  >
                    <option value="Minor" className="bg-[#171520] text-white">Minor</option>
                    <option value="Major" className="bg-[#171520] text-white">Major</option>
                    <option value="Critical" className="bg-[#171520] text-white">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={ncrForm.dueDate}
                    onChange={(e) => setNcrForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowNCRForm(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateNCR} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Raise NCR</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Log Material Test */}
      {showTestForm && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4 text-left">
            <div>
              <h3 className="text-sm font-extrabold text-white">Log Material Lab Test</h3>
              <p className="text-xs text-zinc-400 mt-1">Record on-site / lab compressive, slump, or soil test results.</p>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Test Type</label>
                  <input
                    type="text"
                    placeholder="Cube Test"
                    value={testForm.type}
                    onChange={(e) => setTestForm(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Material Name</label>
                  <input
                    type="text"
                    placeholder="Concrete M25"
                    value={testForm.material}
                    onChange={(e) => setTestForm(prev => ({ ...prev, material: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary font-semibold"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Result Value</label>
                  <input
                    type="number"
                    step="0.1"
                    value={testForm.value}
                    onChange={(e) => setTestForm(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Unit</label>
                  <input
                    type="text"
                    placeholder="MPa"
                    value={testForm.unit}
                    onChange={(e) => setTestForm(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Sample Ref</label>
                  <input
                    type="text"
                    placeholder="CB-001"
                    value={testForm.sampleRef}
                    onChange={(e) => setTestForm(prev => ({ ...prev, sampleRef: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Min Acceptable</label>
                  <input
                    type="number"
                    step="0.1"
                    value={testForm.min}
                    onChange={(e) => setTestForm(prev => ({ ...prev, min: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Max Acceptable</label>
                  <input
                    type="number"
                    step="0.1"
                    value={testForm.max}
                    onChange={(e) => setTestForm(prev => ({ ...prev, max: e.target.value }))}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Zone / Area Used</label>
                <input
                  type="text"
                  placeholder="Floor 3 Column C3"
                  value={testForm.zone}
                  onChange={(e) => setTestForm(prev => ({ ...prev, zone: e.target.value }))}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setShowTestForm(false)} className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] cursor-pointer">Cancel</button>
              <button onClick={handleCreateTest} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer">Log Test</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
