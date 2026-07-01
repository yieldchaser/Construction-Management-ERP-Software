"use client";

import React, { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type PinCategory = "RFI" | "Clash" | "Observation" | "Approval";
type RevStatus = "current" | "superseded" | "locked";

interface RFIPin {
  id: string;
  seq: number;
  x: number;
  y: number;
  category: PinCategory;
  comment: string;
  photoAttached: boolean;
  user: string;
  date: string;
  resolved: boolean;
}

interface Revision {
  id: string;
  version: string;
  fileUrl: string;
  status: RevStatus;
  comments: string;
  date: string;
  uploadedBy: string;
  pins: RFIPin[];
  approvedBy?: string;
}

interface Drawing {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  revisions: Revision[];
}

const DEMO: Drawing[] = [
  {
    id: "D001", name: "Ground Floor Layout Plan", category: "Architectural", createdAt: "2026-05-01",
    revisions: [
      {
        id: "R003", version: "V3", status: "current",
        fileUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&auto=format",
        comments: "Final IFC revision — lobby width updated per client CR-14.",
        date: "2026-06-20", uploadedBy: "Ar. Priya Shah",
        pins: [
          { id: "p1", seq: 1, x: 28, y: 42, category: "RFI", comment: "Column C3 grid offset by 150mm from structural drawing. Clarification needed from structural engineer before casting.", photoAttached: true, user: "Suresh R (PM)", date: "2026-06-22", resolved: false },
          { id: "p2", seq: 2, x: 65, y: 25, category: "Clash", comment: "MEP duct conflicts with beam B7 at elevation +3200mm. Coordinate with services consultant immediately.", photoAttached: false, user: "Ravi K (Site Eng)", date: "2026-06-23", resolved: false },
          { id: "p3", seq: 3, x: 47, y: 68, category: "Observation", comment: "Staircase landing dimension confirmed matches approved drawing. OK to proceed.", photoAttached: false, user: "Suresh R (PM)", date: "2026-06-24", resolved: true },
          { id: "p4", seq: 4, x: 80, y: 55, category: "Approval", comment: "Column grid lines approved by consulting architect. No change required.", photoAttached: false, user: "Director Apex", date: "2026-06-25", resolved: true },
        ]
      },
      {
        id: "R002", version: "V2", status: "superseded",
        fileUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&auto=format",
        comments: "Revised to incorporate RFI column grid correction and updated door schedule.",
        date: "2026-06-01", uploadedBy: "Ar. Priya Shah", pins: [],
      },
      {
        id: "R001", version: "V1", status: "locked",
        fileUrl: "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&auto=format",
        comments: "Initial schematic design release for consultant review.",
        date: "2026-05-01", uploadedBy: "Ar. Priya Shah", pins: [], approvedBy: "Director Apex"
      },
    ]
  },
  {
    id: "D002", name: "Foundation Raft Detail", category: "Structural", createdAt: "2026-05-10",
    revisions: [
      {
        id: "R101", version: "V1", status: "current",
        fileUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&auto=format",
        comments: "Structural raft foundation drawing for IS 2950 review.",
        date: "2026-05-10", uploadedBy: "Er. Anand T",
        pins: [
          { id: "p5", seq: 1, x: 50, y: 55, category: "Approval", comment: "Raft thickness 600mm confirmed per IS 2950. Approved.", photoAttached: false, user: "Suresh R (PM)", date: "2026-05-15", resolved: true },
        ]
      }
    ]
  },
  {
    id: "D003", name: "Plumbing & Drainage — Ground Floor", category: "MEP", createdAt: "2026-05-20",
    revisions: [
      {
        id: "R201", version: "V1", status: "current",
        fileUrl: "https://images.unsplash.com/photo-1416453072034-c8dbfa2856b2?w=1200&auto=format",
        comments: "MEP plumbing risers and drainage lines. Coordinate with civil for chasing.",
        date: "2026-05-20", uploadedBy: "MEP Consultants Ltd", pins: []
      }
    ]
  },
];

const SITE_PHOTOS = [
  { id: "sp1", url: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500", label: "Excavation Ground Lock" },
  { id: "sp2", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=500", label: "Column Casting Complete" },
  { id: "sp3", url: "https://images.unsplash.com/photo-1590069261209-f8e9b8642343?w=500", label: "Material Cement Yard" },
];

const FOLDERS = [
  { id: "f1", name: "Quotation from Vendors", count: 6 },
  { id: "f2", name: "Updated Drawings", count: 14 },
  { id: "f3", name: "Indent Book Vouchers", count: 9 },
  { id: "f4", name: "NOC Documents (Local Auth)", count: 3 },
  { id: "f5", name: "Material Photo Proofs", count: 15 },
];

const PIN_META: Record<PinCategory, { bg: string; text: string; ring: string; label: string }> = {
  RFI:         { bg: "bg-amber-500",   text: "text-black",  ring: "ring-amber-400/40",   label: "RFI" },
  Clash:       { bg: "bg-red-500",     text: "text-white",  ring: "ring-red-400/40",     label: "Clash" },
  Observation: { bg: "bg-blue-500",    text: "text-white",  ring: "ring-blue-400/40",    label: "Obs" },
  Approval:    { bg: "bg-emerald-500", text: "text-white",  ring: "ring-emerald-400/40", label: "Appr" },
};

const REV_META: Record<RevStatus, { label: string; badge: string; dot: string; icon: string }> = {
  current:    { label: "Current",    badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-500", icon: "●" },
  superseded: { label: "Superseded", badge: "bg-zinc-700/30 border-zinc-600/20 text-zinc-500",         dot: "bg-zinc-600",   icon: "◌" },
  locked:     { label: "Locked",     badge: "bg-amber-500/10 border-amber-500/30 text-amber-400",       dot: "bg-amber-500",  icon: "🔒" },
};

export default function DrawingsPage() {
  const { company_id } = useParams();
  const companyId = (company_id as string) || "demo";

  const [tab, setTab] = useState<"drawings" | "files">("drawings");
  const [drawings, setDrawings] = useState<Drawing[]>(DEMO);
  const [activeDrawingId, setActiveDrawingId] = useState(DEMO[0].id);
  const [activeRevId, setActiveRevId] = useState(DEMO[0].revisions[0].id);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("All");
  const [imgLoaded, setImgLoaded] = useState(false);

  // Add pin modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [tempXY, setTempXY] = useState({ x: 0, y: 0 });
  const [newPinComment, setNewPinComment] = useState("");
  const [newPinCat, setNewPinCat] = useState<PinCategory>("RFI");
  const [newPinPhoto, setNewPinPhoto] = useState(false);

  // Add revision modal
  const [showRevModal, setShowRevModal] = useState(false);
  const [newRevCode, setNewRevCode] = useState("");
  const [newRevComment, setNewRevComment] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  const activeDrawing = drawings.find(d => d.id === activeDrawingId)!;
  const activeRev = activeDrawing?.revisions.find(r => r.id === activeRevId);
  const currentRev = activeDrawing?.revisions.find(r => r.status === "current");
  const isEditable = activeRev?.status === "current";

  const visiblePins = (activeRev?.pins ?? []).filter(p => filterCat === "All" || p.category === filterCat);
  const openCount = (activeRev?.pins ?? []).filter(p => !p.resolved).length;

  const getNextRevCode = useCallback(() => {
    if (!activeDrawing) return "V1";
    const latest = activeDrawing.revisions[0]?.version ?? "V0";
    const num = parseInt(latest.replace(/\D/g, "")) || 0;
    return `V${num + 1}`;
  }, [activeDrawing]);

  const handleSelectDrawing = (id: string) => {
    const d = drawings.find(x => x.id === id);
    if (!d) return;
    setActiveDrawingId(id);
    const cur = d.revisions.find(r => r.status === "current") ?? d.revisions[0];
    setActiveRevId(cur.id);
    setSelectedPinId(null);
    setImgLoaded(false);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !isEditable) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTempXY({ x, y });
    setNewPinComment("");
    setNewPinCat("RFI");
    setNewPinPhoto(false);
    setShowPinModal(true);
  };

  const handleAddPin = () => {
    if (!newPinComment.trim() || !activeRev) return;
    const nextSeq = (activeRev.pins.reduce((m, p) => Math.max(m, p.seq), 0)) + 1;
    const pin: RFIPin = {
      id: `pin-${Date.now()}`, seq: nextSeq,
      x: tempXY.x, y: tempXY.y,
      category: newPinCat, comment: newPinComment,
      photoAttached: newPinPhoto,
      user: "Current User", date: new Date().toLocaleDateString("en-IN"),
      resolved: false,
    };
    setDrawings(prev => prev.map(d => d.id !== activeDrawingId ? d : {
      ...d,
      revisions: d.revisions.map(r => r.id !== activeRevId ? r : { ...r, pins: [...r.pins, pin] })
    }));
    setShowPinModal(false);
  };

  const handleToggleResolved = (pinId: string) => {
    setDrawings(prev => prev.map(d => d.id !== activeDrawingId ? d : {
      ...d,
      revisions: d.revisions.map(r => r.id !== activeRevId ? r : {
        ...r, pins: r.pins.map(p => p.id === pinId ? { ...p, resolved: !p.resolved } : p)
      })
    }));
  };

  const handlePublishRevision = () => {
    if (!newRevCode.trim()) return;
    const newRev: Revision = {
      id: `rev-${Date.now()}`,
      version: newRevCode.toUpperCase(),
      fileUrl: activeDrawing?.revisions[0]?.fileUrl ?? "",
      status: "current",
      comments: newRevComment || "New revision issued for construction.",
      date: new Date().toISOString().split("T")[0],
      uploadedBy: "Current User",
      pins: [],
    };
    // Auto-supersede the previous current revision
    setDrawings(prev => prev.map(d => d.id !== activeDrawingId ? d : {
      ...d,
      revisions: [newRev, ...d.revisions.map(r =>
        r.status === "current" ? { ...r, status: "superseded" as RevStatus } : r
      )]
    }));
    setActiveRevId(newRev.id);
    setImgLoaded(false);
    setShowRevModal(false);
    setNewRevCode(""); setNewRevComment("");
  };

  const handleToggleLock = (revId: string) => {
    setDrawings(prev => prev.map(d => d.id !== activeDrawingId ? d : {
      ...d,
      revisions: d.revisions.map(r => {
        if (r.id !== revId) return r;
        if (r.status === "locked") return { ...r, status: "superseded" as RevStatus };
        if (r.status === "superseded") return { ...r, status: "locked" as RevStatus };
        return r; // current stays current
      })
    }));
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-60 shrink-0 border-r border-white/5 bg-[#0B0910] flex flex-col overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] flex items-center justify-center text-xs font-black text-white">S</div>
          <span className="font-bold text-sm text-white">SiteFlow</span>
        </div>
        <nav className="flex-1 p-3 overflow-y-auto space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-white rounded-lg hover:bg-white/[0.02]">← Dashboard</Link>
          <div className="pt-3">
            <div className="px-3 mb-1.5 text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Modules</div>
            {[
              { key: "drawings", label: "Blueprints & RFI", icon: "📐" },
              { key: "files", label: "Project Files", icon: "📁" },
            ].map(m => (
              <button key={m.key} onClick={() => setTab(m.key as any)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-lg text-left transition-all ${tab === m.key ? "bg-primary/10 text-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
                <span>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
          {tab === "drawings" && (
            <div className="pt-4">
              <div className="px-3 mb-1.5 text-[9px] uppercase tracking-widest text-zinc-600 font-bold">Drawings</div>
              {drawings.map(d => {
                const allOpenPins = d.revisions.flatMap(r => r.pins).filter(p => !p.resolved).length;
                const cur = d.revisions.find(r => r.status === "current");
                return (
                  <button key={d.id} onClick={() => handleSelectDrawing(d.id)}
                    className={`w-full flex items-start justify-between gap-1 px-3 py-2 text-xs rounded-lg text-left transition-all ${d.id === activeDrawingId ? "bg-primary/10 text-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold line-clamp-1">{d.name}</div>
                      <div className="text-[9px] mt-0.5 text-zinc-600">{d.category} · {cur?.version}</div>
                    </div>
                    {allOpenPins > 0 && <span className="shrink-0 text-[9px] px-1.5 py-0.5 bg-amber-500 text-black rounded-full font-bold mt-0.5">{allOpenPins}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </nav>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-white/5 bg-[#0B0910] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-white">
              {tab === "drawings" ? "Blueprint & RFI System" : "Project Files Directory"}
            </h1>
            <span className="text-[10px] text-zinc-500">
              {tab === "drawings" ? "Versioned drawings · Revision locking · RFI pin overlay" : "Document storage"}
            </span>
          </div>
          {tab === "drawings" && (
            <button onClick={() => { setNewRevCode(getNextRevCode()); setNewRevComment(""); setShowRevModal(true); }}
              className="px-4 py-1.5 bg-gradient-to-r from-primary to-[#FF3B6C] text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all shadow-lg">
              ↑ Upload New Revision
            </button>
          )}
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* ── DRAWINGS TAB ── */}
          {tab === "drawings" && activeDrawing && (
            <div className="flex h-full">
              {/* Canvas column */}
              <div className="flex-1 flex flex-col p-4 gap-3 min-w-0 overflow-hidden">
                {/* Drawing header bar */}
                <div className="flex items-center justify-between bg-[#14121F] border border-white/5 rounded-xl px-4 py-2.5 text-xs shrink-0">
                  <div>
                    <div className="font-bold text-white text-sm">{activeDrawing.name}</div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">{activeDrawing.category} · Active: {currentRev?.version} · {currentRev?.date}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {openCount > 0 && (
                      <span className="text-[10px] px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full font-bold">
                        {openCount} Open {openCount === 1 ? "Item" : "Items"}
                      </span>
                    )}
                    {/* Filter pills */}
                    <div className="flex gap-1">
                      {["All", "RFI", "Clash", "Observation", "Approval"].map(cat => (
                        <button key={cat} onClick={() => setFilterCat(cat)}
                          className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${filterCat === cat ? "bg-primary text-white" : "bg-white/5 text-zinc-400 hover:text-white"}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Canvas */}
                <div ref={canvasRef} onClick={handleCanvasClick}
                  className={`flex-1 relative rounded-xl border border-white/10 bg-black overflow-hidden min-h-0 ${isEditable ? "cursor-crosshair" : "cursor-default"}`}>
                  {/* Drawing image */}
                  {activeRev?.fileUrl && (
                    <img key={activeRev.id} src={activeRev.fileUrl} alt={activeDrawing.name}
                      onLoad={() => setImgLoaded(true)}
                      className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? "opacity-60" : "opacity-0"}`}
                      draggable={false} />
                  )}

                  {/* Blueprint grid overlay */}
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ backgroundImage: "linear-gradient(rgba(124,92,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,92,255,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

                  {/* SUPERSEDED / LOCKED watermark */}
                  {activeRev && activeRev.status !== "current" && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                      <div className={`text-5xl font-black uppercase tracking-[0.5em] rotate-[-28deg] ${activeRev.status === "locked" ? "text-amber-400/20" : "text-zinc-400/15"}`}>
                        {activeRev.status === "locked" ? "LOCKED" : "SUPERSEDED"}
                      </div>
                    </div>
                  )}

                  {/* Hint */}
                  {isEditable && visiblePins.length === 0 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-zinc-500 bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
                      Click on drawing to drop an RFI / Clash / Observation pin
                    </div>
                  )}
                  {!isEditable && (
                    <div className="absolute top-3 left-3 text-[10px] text-zinc-500 bg-black/60 px-2.5 py-1 rounded-full pointer-events-none">
                      Viewing {activeRev?.version} ({activeRev?.status}) — switch to Current revision to add pins
                    </div>
                  )}

                  {/* RFI Pins */}
                  {visiblePins.map(pin => {
                    const m = PIN_META[pin.category];
                    const isActive = selectedPinId === pin.id;
                    return (
                      <button key={pin.id}
                        onClick={e => { e.stopPropagation(); setSelectedPinId(isActive ? null : pin.id); }}
                        title={`${pin.category} #${pin.seq}: ${pin.comment}`}
                        className={`absolute z-10 flex items-center justify-center font-extrabold text-[11px] rounded-full border-2 border-white shadow-xl transition-all transform -translate-x-1/2 -translate-y-1/2 ${m.bg} ${m.text} ${isActive ? `w-10 h-10 ring-4 ${m.ring} scale-110` : "w-6 h-6"} ${pin.resolved ? "opacity-30" : ""}`}
                        style={{ left: `${pin.x}%`, top: `${pin.y}%` }}>
                        {pin.seq}
                      </button>
                    );
                  })}
                </div>

                {/* Selected pin detail */}
                {selectedPinId && (() => {
                  const pin = activeRev?.pins.find(p => p.id === selectedPinId);
                  if (!pin) return null;
                  const m = PIN_META[pin.category];
                  return (
                    <div className="shrink-0 bg-[#14121F] border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.text}`}>{pin.category} #{pin.seq}</span>
                          {pin.resolved && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">✓ Resolved</span>}
                          {pin.photoAttached && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">📷 Photo</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleResolved(pin.id)}
                            className={`text-[10px] px-2.5 py-1 font-bold rounded-lg border transition-all ${pin.resolved ? "bg-zinc-700/30 border-zinc-600/20 text-zinc-400 hover:border-zinc-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"}`}>
                            {pin.resolved ? "Re-open" : "✓ Mark Resolved"}
                          </button>
                          <button onClick={() => setSelectedPinId(null)} className="text-zinc-500 hover:text-white text-lg leading-none">×</button>
                        </div>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{pin.comment}</p>
                      <div className="text-[10px] text-zinc-600">Logged by {pin.user} · {pin.date}</div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Revision History Panel ── */}
              <div className="w-72 shrink-0 border-l border-white/5 bg-[#0B0910] flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Revision History</div>
                  <div className="text-[9px] text-zinc-600 mt-0.5">{activeDrawing.revisions.length} revisions · Click to compare</div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-0">
                  {activeDrawing.revisions.map((rev, idx) => {
                    const m = REV_META[rev.status];
                    const isActive = rev.id === activeRevId;
                    const revOpenPins = rev.pins.filter(p => !p.resolved).length;
                    return (
                      <div key={rev.id} className="relative pl-6">
                        {idx < activeDrawing.revisions.length - 1 && (
                          <div className="absolute left-[9px] top-5 bottom-0 w-px bg-white/5" />
                        )}
                        <div className={`absolute left-1.5 top-3.5 h-3 w-3 rounded-full border-2 transition-all ${isActive ? "bg-primary border-primary" : `${m.dot} border-white/10`}`} />
                        <div className={`mb-2 rounded-xl p-3 border transition-all ${isActive ? "bg-primary/10 border-primary/20" : "border-transparent hover:bg-white/[0.02]"}`}>
                          <button onClick={() => { setActiveRevId(rev.id); setSelectedPinId(null); setImgLoaded(false); }} className="w-full text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-extrabold text-white">{rev.version}</span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold ${m.badge}`}>{m.icon} {m.label}</span>
                            </div>
                            <div className="text-[10px] text-zinc-400 line-clamp-2">{rev.comments}</div>
                            <div className="text-[9px] text-zinc-600 mt-1">{rev.date} · {rev.uploadedBy}</div>
                            {rev.pins.length > 0 && (
                              <div className="flex items-center gap-2 mt-1 text-[9px]">
                                <span className="text-zinc-500">{rev.pins.length} pins</span>
                                {revOpenPins > 0 && <span className="text-amber-400 font-bold">{revOpenPins} open</span>}
                              </div>
                            )}
                            {rev.approvedBy && <div className="text-[9px] text-emerald-400 mt-0.5">Approved by {rev.approvedBy}</div>}
                          </button>
                          {/* Lock / Unlock for non-current revisions */}
                          {rev.status !== "current" && (
                            <button onClick={() => handleToggleLock(rev.id)}
                              className={`mt-2 w-full text-[9px] font-bold px-2 py-1 rounded border text-left transition-all ${rev.status === "locked" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" : "bg-zinc-700/20 border-zinc-600/20 text-zinc-500 hover:text-amber-400 hover:border-amber-500/30"}`}>
                              {rev.status === "locked" ? "🔓 Unlock Revision" : "🔒 Lock Revision"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Open items quick list */}
                {activeRev && activeRev.pins.filter(p => !p.resolved).length > 0 && (
                  <div className="border-t border-white/5 p-3">
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Open Items</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {activeRev.pins.filter(p => !p.resolved).map(pin => {
                        const m = PIN_META[pin.category];
                        return (
                          <button key={pin.id} onClick={() => setSelectedPinId(pin.id)}
                            className="w-full text-left p-2 rounded-lg bg-[#14121F] hover:bg-white/5 border border-white/5 transition-all">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${m.bg} ${m.text}`}>{pin.category} #{pin.seq}</span>
                            </div>
                            <p className="text-[10px] text-zinc-400 line-clamp-1">{pin.comment}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── FILES TAB ── */}
          {tab === "files" && (
            <div className="h-full overflow-y-auto p-5 space-y-6">
              {/* Site photos */}
              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Site Photos Reel</div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  <div className="shrink-0 h-32 w-40 border border-dashed border-white/10 rounded-xl flex items-center justify-center cursor-pointer hover:bg-white/[0.02] transition-all">
                    <span className="text-xs text-zinc-500 font-bold">📷 Snap Photo</span>
                  </div>
                  {SITE_PHOTOS.map(p => (
                    <div key={p.id} className="shrink-0 relative h-32 w-44 rounded-xl overflow-hidden border border-white/5 bg-black group">
                      <img src={p.url} alt={p.label} className="h-full w-full object-cover opacity-75 group-hover:scale-105 transition-all" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-zinc-300 font-bold">{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Folders */}
              <div>
                <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Project Storage Directory</div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {FOLDERS.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-[#14121F] border border-white/5 rounded-xl hover:border-primary/20 cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📁</span>
                        <div>
                          <div className="text-xs font-semibold text-white">{f.name}</div>
                          <div className="text-[10px] text-zinc-500">{f.count} files</div>
                        </div>
                      </div>
                      <span className="text-zinc-500 text-sm">›</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-center p-4 border border-dashed border-white/10 rounded-xl cursor-pointer hover:bg-white/[0.02] transition-all text-xs text-zinc-500 font-bold">
                    + Create Folder
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Add RFI Pin Modal ── */}
      {showPinModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <div className="text-sm font-extrabold text-white">Drop Pin on Drawing</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Position: {tempXY.x.toFixed(1)}% × {tempXY.y.toFixed(1)}%</div>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-zinc-500 hover:text-white text-lg leading-none">×</button>
            </div>
            <div>
              <div className="text-zinc-400 mb-1.5">Pin Category</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(["RFI", "Clash", "Observation", "Approval"] as PinCategory[]).map(cat => {
                  const m = PIN_META[cat];
                  return (
                    <button key={cat} onClick={() => setNewPinCat(cat)}
                      className={`py-2 px-3 rounded-lg font-bold text-[10px] border transition-all ${newPinCat === cat ? `${m.bg} ${m.text} border-white/20` : "bg-white/5 text-zinc-400 border-white/5 hover:text-white"}`}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-zinc-400 mb-1">Description / Query</div>
              <textarea rows={3} autoFocus value={newPinComment} onChange={e => setNewPinComment(e.target.value)}
                className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white resize-none text-xs"
                placeholder="Describe the issue, clash, or observation clearly..." />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={newPinPhoto} onChange={e => setNewPinPhoto(e.target.checked)} className="accent-primary" />
              <span className="text-zinc-400">Attach site photo proof</span>
            </label>
            <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
              <button onClick={() => setShowPinModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs">Cancel</button>
              <button onClick={handleAddPin} disabled={!newPinComment.trim()}
                className="px-5 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:opacity-90 disabled:opacity-40 transition-all">
                Place Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Revision Modal ── */}
      {showRevModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-white/5 pb-3">
              <div>
                <div className="text-sm font-extrabold text-white">Upload New Revision</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">Current revision will be automatically archived as Superseded</div>
              </div>
              <button onClick={() => setShowRevModal(false)} className="text-zinc-500 hover:text-white text-lg leading-none">×</button>
            </div>
            {/* State transition preview */}
            <div className="bg-[#14121F] border border-white/5 rounded-xl p-3 space-y-1.5">
              <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-2">What will happen</div>
              {activeDrawing?.revisions.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center gap-2 text-[10px]">
                  <span className="text-zinc-300 font-bold w-6 shrink-0">{r.version}</span>
                  <span className="text-zinc-600">→</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${r.status === "current" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : REV_META[r.status].badge}`}>
                    {r.status === "current" ? "Becomes Superseded" : REV_META[r.status].label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-[10px] border-t border-white/5 pt-1.5">
                <span className="text-white font-bold w-6 shrink-0">{newRevCode}</span>
                <span className="text-zinc-600">→</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">New Current</span>
              </div>
            </div>
            <div>
              <div className="text-zinc-400 mb-1">Version Code</div>
              <input type="text" value={newRevCode} onChange={e => setNewRevCode(e.target.value)}
                className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white font-mono font-bold" />
            </div>
            <div>
              <div className="text-zinc-400 mb-1">Release Notes</div>
              <textarea rows={3} value={newRevComment} onChange={e => setNewRevComment(e.target.value)}
                className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2.5 text-white resize-none"
                placeholder="Incorporated RFI comments, updated column grid..." />
            </div>
            <div className="flex gap-2 justify-end border-t border-white/5 pt-3">
              <button onClick={() => setShowRevModal(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl">Cancel</button>
              <button onClick={handlePublishRevision} disabled={!newRevCode.trim()}
                className="px-5 py-2 bg-primary text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all">
                Publish {newRevCode}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
