"use client";

import React, { useState } from "react";
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
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tab, setTab] = useState<"checklists" | "inspections" | "ncr" | "labtests">("inspections");
  const [ncrs, setNcrs] = useState<NCR[]>(NCRS);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [showNCRForm, setShowNCRForm] = useState(false);
  const [inspectionResponses, setInspectionResponses] = useState<Record<string, "Pass" | "Fail" | "NA">>({});

  const openNCRs = ncrs.filter(n => n.status === "open");
  const reviewNCRs = ncrs.filter(n => n.status === "under_review");
  const closedNCRs = ncrs.filter(n => n.status === "closed");

  const moveNCR = (id: string, newStatus: "under_review" | "closed") => {
    setNcrs(prev => prev.map(n => n.id === id ? { ...n, status: newStatus, resolution: newStatus === "closed" ? "Resolved and verified on-site." : n.resolution } : n));
  };

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
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${tab === key ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"}`}>
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
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all">
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
                  { label: "Total Inspections", val: INSPECTIONS.length, color: "text-white" },
                  { label: "All Pass", val: INSPECTIONS.filter(i => i.status === "pass").length, color: "text-green-400" },
                  { label: "Partial", val: INSPECTIONS.filter(i => i.status === "partial").length, color: "text-yellow-400" },
                  { label: "Fail", val: INSPECTIONS.filter(i => i.status === "fail").length, color: "text-red-400" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-[#171520] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</p>
                    <p className={`text-2xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Inspection cards */}
              <div className="grid grid-cols-1 gap-3">
                {INSPECTIONS.map(insp => {
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
              {CHECKLISTS.map(cl => (
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
                    <button className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20">Use Template</button>
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
                      className="w-full text-[10px] py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 font-bold transition-all">
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
                      className="w-full text-[10px] py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 font-bold transition-all">
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
                  { label: "Total Tests", val: LAB_TESTS.length, color: "text-white" },
                  { label: "Passed", val: LAB_TESTS.filter(t => t.pass).length, color: "text-green-400" },
                  { label: "Failed", val: LAB_TESTS.filter(t => !t.pass).length, color: "text-red-400" },
                  { label: "Pass Rate", val: `${Math.round(LAB_TESTS.filter(t => t.pass).length / LAB_TESTS.length * 100)}%`, color: "text-primary" },
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
                  <button className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20">+ Log Test</button>
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
                    {LAB_TESTS.map(t => (
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
          <div className="bg-[#171520] border border-white/10 rounded-2xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-white">{selectedInspection.zone}</h2>
                <p className="text-xs text-zinc-500">{selectedInspection.checklist} · {selectedInspection.date}</p>
              </div>
              <button onClick={() => setSelectedInspection(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
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

            {badge(selectedInspection.status, statusColors[selectedInspection.status])}
          </div>
        </div>
      )}
    </div>
  );
}
