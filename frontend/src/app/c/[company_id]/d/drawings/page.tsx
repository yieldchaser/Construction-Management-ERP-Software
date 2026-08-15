"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import Icon, { type IconName } from "@/components/marketing/Icon";

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

const REV_META: Record<RevStatus, { label: string; badge: string; dot: string; icon?: string; iconName?: IconName }> = {
  current:    { label: "Current",    badge: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", dot: "bg-emerald-500", icon: "●" },
  superseded: { label: "Superseded", badge: "bg-zinc-700/30 border-zinc-600/20 text-muted",         dot: "bg-zinc-600",   icon: "◌" },
  locked:     { label: "Locked",     badge: "bg-amber-500/10 border-amber-500/30 text-amber-400",       dot: "bg-amber-500",  iconName: "lock" },
};

export default function DrawingsPage() {
  const { company_id } = useParams();
  const companyId = (company_id as string) || "demo";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [tab, setTab] = useState<"drawings" | "files">("drawings");
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [activeDrawingId, setActiveDrawingId] = useState<string>("");
  const [activeRevId, setActiveRevId] = useState<string>("");
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState<string>("All");
  const [imgLoaded, setImgLoaded] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

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
  const [newDrawingName, setNewDrawingName] = useState("");
  const [newDrawingCategory, setNewDrawingCategory] = useState("2D Layout");

  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchDrawings = async () => {
    if (!projectId) return;
    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/drawings?project_id=${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped: Drawing[] = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          createdAt: d.created_at ? d.created_at.split("T")[0] : "",
          revisions: (d.revisions || []).map((r: any) => ({
            id: r.id,
            version: r.version_code,
            fileUrl: r.file_url,
            status: r.approval_status === "approved" ? "current" : (r.approval_status === "rejected" ? "locked" : "superseded"),
            comments: r.comments || "",
            date: r.created_at ? r.created_at.split("T")[0] : "",
            uploadedBy: "Auto-synced",
            pins: (r.pins || []).map((p: any) => ({
              id: p.id,
              seq: 0,
              x: p.x_coordinate,
              y: p.y_coordinate,
              category: "Observation",
              comment: p.comment,
              photoAttached: false,
              user: "System",
              date: p.created_at ? p.created_at.split("T")[0] : "",
              resolved: false,
            })),
            approvedBy: r.approved_by ? "Approver" : undefined,
          })).sort((a: Revision, b: Revision) => {
            const numA = parseInt(a.version.replace(/\D/g, "")) || 0;
            const numB = parseInt(b.version.replace(/\D/g, "")) || 0;
            return numB - numA;
          }),
        }));
        setDrawings(mapped);
        if (mapped.length > 0 && !activeDrawingId) {
          const first = mapped[0];
          setActiveDrawingId(first.id);
          const cur = first.revisions.find((r: Revision) => r.status === "current") ?? first.revisions[0];
          setActiveRevId(cur.id);
        }
        setIsOffline(false);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err) {
      console.error("Failed to fetch drawings from server", err);
      setIsOffline(true);
    }
  };

  useEffect(() => {
    fetchDrawings();
  }, [projectId]);

  const activeDrawing = drawings.find(d => d.id === activeDrawingId);
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

  const handleAddPin = async () => {
    if (!newPinComment.trim() || !activeRev) return;
    const nextSeq = (activeRev.pins.reduce((m, p) => Math.max(m, p.seq), 0)) + 1;
    const pinData = {
      id: `pin-${Date.now()}`, seq: nextSeq,
      x: tempXY.x, y: tempXY.y,
      category: newPinCat, comment: newPinComment,
      photoAttached: newPinPhoto,
      user: "Current User", date: new Date().toLocaleDateString("en-IN"),
      resolved: false,
    };

    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/drawings/revisions/${activeRev.id}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          x_coordinate: tempXY.x,
          y_coordinate: tempXY.y,
          comment: newPinComment,
          created_by: "current-user",
        }),
      });
      if (!res.ok) throw new Error("Failed to save pin");
      const saved = await res.json();
      pinData.id = saved.id;
    } catch (err) {
      console.error("Pin save error, using local only:", err);
    }

    setDrawings(prev => prev.map(d => d.id !== activeDrawingId ? d : {
      ...d,
      revisions: d.revisions.map(r => r.id !== activeRevId ? r : { ...r, pins: [...r.pins, pinData] })
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

  const handlePublishRevision = async () => {
    if (!newRevCode.trim()) return;
    let targetDrawingId = activeDrawingId;
    let newDrawing: Drawing | null = null;
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

    try {
      const apiHost = getApiHost();
      if (!targetDrawingId) {
        const dRes = await fetch(`${apiHost}/apis/v3/drawings`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({
            project_id: projectId,
            name: newDrawingName.trim(),
            category: newDrawingCategory,
            file_url: "",
          }),
        });
        if (!dRes.ok) {
          const err = await dRes.json().catch(() => ({}));
          alert(`Failed to create drawing: ${err.detail || "Failed to publish revision"}`);
          return;
        }
        const savedD = await dRes.json();
        targetDrawingId = savedD.id;
        newDrawing = {
          id: targetDrawingId,
          name: newDrawingName.trim(),
          category: newDrawingCategory,
          createdAt: new Date().toISOString().split("T")[0],
          revisions: [],
        };
      }
      const res = await fetch(`${apiHost}/apis/v3/drawings/${targetDrawingId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          version_code: newRevCode.toUpperCase(),
          file_url: newRev.fileUrl,
          comments: newRev.comments,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to publish revision: ${err.detail || "Failed to publish revision"}`);
        return;
      }
      const saved = await res.json();
      newRev.id = saved.id;
    } catch (e) {
      console.error("Failed to publish revision", e);
      alert("Failed to publish revision. Your change was not saved.");
      return;
    }

    setDrawings(prev => {
      if (newDrawing) {
        return [{ ...newDrawing, revisions: [newRev] }, ...prev];
      }
      return prev.map(d => d.id !== targetDrawingId ? d : {
        ...d,
        revisions: [newRev, ...d.revisions.map(r =>
          r.status === "current" ? { ...r, status: "superseded" as RevStatus } : r
        )]
      });
    });
    setActiveDrawingId(targetDrawingId);
    setActiveRevId(newRev.id);
    setImgLoaded(false);
    setShowRevModal(false);
    setNewRevCode(""); setNewRevComment("");
  };

  const handleToggleLock = async (revId: string) => {
    const newStatus = activeRev?.status === "locked" ? "superseded" : "locked";
    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/drawings/revisions/${revId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          approval_status: newStatus === "locked" ? "approved" : "rejected",
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = typeof errData.detail === "string" ? errData.detail : `HTTP ${res.status}`;
        alert(`Approval failed: ${msg}`);
        return;
      }
    } catch (err) {
      console.error("Lock toggle error:", err);
      alert("Failed to update revision approval status.");
      return;
    }
    setDrawings(prev => prev.map(d => d.id !== activeDrawingId ? d : {
      ...d,
      revisions: d.revisions.map(r => {
        if (r.id !== revId) return r;
        if (r.status === "locked") return { ...r, status: "superseded" as RevStatus };
        if (r.status === "superseded") return { ...r, status: "locked" as RevStatus };
        return { ...r, status: "locked" as RevStatus };
      })
    }));
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">            <div className="flex items-center gap-1 px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        {[
          { key: "drawings", label: "Blueprints & RFI" },
          { key: "files", label: "Project Files" },
        ].map((item) => (
          <button key={item.key} onClick={() => setTab(item.key as any)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
            {item.label}
          </button>
        ))}
      </div>
      {isOffline && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg text-xs max-w-md">
          Could not load drawings from the server. Retry once the connection is restored.
        </div>
      )}
      {/* ── Sidebar ── */}
      

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border-custom bg-card px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-foreground">
              {tab === "drawings" ? "Blueprint & RFI System" : "Project Files Directory"}
            </h1>
            <span className="text-[10px] text-muted">
              {tab === "drawings" ? "Versioned drawings · Revision locking · RFI pin overlay" : "Document storage"}
            </span>
          </div>
          {tab === "drawings" && (
            <button onClick={() => { setNewRevCode(getNextRevCode()); setNewRevComment(""); setShowRevModal(true); }}
              className="px-4 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all shadow-lg">
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
                <div className="flex items-center justify-between bg-input border border-border-custom rounded-md px-4 py-2.5 text-xs shrink-0">
                  <div>
                    <div className="font-bold text-foreground text-sm">{activeDrawing.name}</div>
                    <div className="text-[10px] text-muted mt-0.5">{activeDrawing.category} · Active: {currentRev?.version} · {currentRev?.date}</div>
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
                          className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${filterCat === cat ? "bg-primary text-white" : "bg-white/5 text-muted hover:text-foreground"}`}>
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Canvas */}
                <div ref={canvasRef} onClick={handleCanvasClick}
                  className={`flex-1 relative rounded-md border border-border-custom bg-black overflow-hidden min-h-0 ${isEditable ? "cursor-crosshair" : "cursor-default"}`}>
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
                      <div className={`text-5xl font-black uppercase tracking-[0.5em] rotate-[-28deg] ${activeRev.status === "locked" ? "text-amber-400/20" : "text-muted/15"}`}>
                        {activeRev.status === "locked" ? "LOCKED" : "SUPERSEDED"}
                      </div>
                    </div>
                  )}


                  {/* Hint */}
                  {isEditable && visiblePins.length === 0 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full pointer-events-none whitespace-nowrap">
                      Click on drawing to drop an RFI / Clash / Observation pin
                    </div>
                  )}
                  {!isEditable && (
                    <div className="absolute top-3 left-3 text-[10px] text-muted bg-black/60 px-2.5 py-1 rounded-full pointer-events-none">
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
                    <div className="shrink-0 bg-input border border-border-custom rounded-md p-4 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${m.bg} ${m.text}`}>{pin.category} #{pin.seq}</span>
                          {pin.resolved && <span className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">✓ Resolved</span>}
                          {pin.photoAttached && <span className="text-[9px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded inline-flex items-center gap-1"><Icon name="camera" className="w-3 h-3" /> Photo</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleToggleResolved(pin.id)}
                            className={`text-[10px] px-2.5 py-1 font-bold rounded-lg border transition-all ${pin.resolved ? "bg-zinc-700/30 border-zinc-600/20 text-muted hover:border-zinc-500" : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"}`}>
                            {pin.resolved ? "Re-open" : "✓ Mark Resolved"}
                          </button>
                          <button onClick={() => setSelectedPinId(null)} className="text-muted hover:text-foreground text-lg leading-none">×</button>
                        </div>
                      </div>
                      <p className="text-zinc-200 leading-relaxed">{pin.comment}</p>
                      <div className="text-[10px] text-muted">Logged by {pin.user} · {pin.date}</div>
                    </div>
                  );
                })()}
              </div>

              {/* ── Revision History Panel ── */}
              <div className="w-72 shrink-0 border-l border-border-custom bg-card flex flex-col overflow-hidden">
                <div className="px-4 py-3 border-b border-border-custom">
                  <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Revision History</div>
                  <div className="text-[9px] text-muted mt-0.5">{activeDrawing.revisions.length} revisions · Click to compare</div>
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
                        <div className={`absolute left-1.5 top-3.5 h-3 w-3 rounded-full border-2 transition-all ${isActive ? "bg-primary border-primary" : `${m.dot} border-border-custom`}`} />
                        <div className={`mb-2 rounded-md p-3 border transition-all ${isActive ? "bg-primary/10 border-primary/20" : "border-transparent hover:bg-elevated"}`}>
                          <button onClick={() => { setActiveRevId(rev.id); setSelectedPinId(null); setImgLoaded(false); }} className="w-full text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-extrabold text-foreground">{rev.version}</span>
                              <span className={`text-[8px] px-1.5 py-0.5 rounded border font-bold inline-flex items-center gap-1 ${m.badge}`}>
                                {m.iconName ? <Icon name={m.iconName} className="w-2.5 h-2.5" /> : m.icon} {m.label}
                              </span>
                            </div>
                            <div className="text-[10px] text-muted line-clamp-2">{rev.comments}</div>
                            <div className="text-[9px] text-muted mt-1">{rev.date} · {rev.uploadedBy}</div>
                            {rev.pins.length > 0 && (
                              <div className="flex items-center gap-2 mt-1 text-[9px]">
                                <span className="text-muted">{rev.pins.length} pins</span>
                                {revOpenPins > 0 && <span className="text-amber-400 font-bold">{revOpenPins} open</span>}
                              </div>
                            )}
                            {rev.approvedBy && <div className="text-[9px] text-emerald-400 mt-0.5">Approved by {rev.approvedBy}</div>}
                          </button>
                          {/* Lock / Unlock for non-current revisions */}
                          {rev.status !== "current" && (
                            <button onClick={() => handleToggleLock(rev.id)}
                              className={`mt-2 w-full text-[9px] font-bold px-2 py-1 rounded border text-left transition-all ${rev.status === "locked" ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20" : "bg-zinc-700/20 border-zinc-600/20 text-muted hover:text-amber-400 hover:border-amber-500/30"}`}>
                              {rev.status === "locked" ? (
                                <span className="inline-flex items-center gap-1"><Icon name="unlock" className="w-3 h-3" /> Unlock Revision</span>
                              ) : (
                                <span className="inline-flex items-center gap-1"><Icon name="lock" className="w-3 h-3" /> Lock Revision</span>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Open items quick list */}
                {activeRev && activeRev.pins.filter(p => !p.resolved).length > 0 && (
                  <div className="border-t border-border-custom p-3">
                    <div className="text-[9px] font-bold text-muted uppercase tracking-wider mb-2">Open Items</div>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {activeRev.pins.filter(p => !p.resolved).map(pin => {
                        const m = PIN_META[pin.category];
                        return (
                          <button key={pin.id} onClick={() => setSelectedPinId(pin.id)}
                            className="w-full text-left p-2 rounded-lg bg-input hover:bg-white/5 border border-border-custom transition-all">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${m.bg} ${m.text}`}>{pin.category} #{pin.seq}</span>
                            </div>
                            <p className="text-[10px] text-muted line-clamp-1">{pin.comment}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "drawings" && !activeDrawing && (
            <div className="flex-1 flex items-center justify-center p-8 text-center text-muted">
              No drawings found for this project. Use &ldquo;Upload New Revision&rdquo; to add the first one.
            </div>
          )}

          {/* ── FILES TAB ── */}
          {tab === "files" && (
            <div className="h-full overflow-y-auto p-5 space-y-6">
              {/* Site photos */}
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Site Photos Reel</div>
                <div className="flex gap-3 overflow-x-auto pb-1">
                  <div className="shrink-0 h-32 w-40 border border-dashed border-border-custom rounded-md flex items-center justify-center cursor-pointer hover:bg-elevated transition-all">
                    <span className="text-xs text-muted font-bold inline-flex items-center gap-1"><Icon name="camera" className="w-4 h-4" /> Snap Photo</span>
                  </div>
                  {SITE_PHOTOS.map(p => (
                    <div key={p.id} className="shrink-0 relative h-32 w-44 rounded-md overflow-hidden border border-border-custom bg-black group">
                      <img src={p.url} alt={p.label} className="h-full w-full object-cover opacity-75 group-hover:scale-105 transition-all" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-[10px] text-zinc-300 font-bold">{p.label}</div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Folders */}
              <div>
                <div className="text-xs font-bold text-muted uppercase tracking-wider mb-3">Project Storage Directory</div>
                <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                  {FOLDERS.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-4 bg-input border border-border-custom rounded-md hover:border-primary/20 cursor-pointer transition-all">
                      <div className="flex items-center gap-3">
                        <Icon name="folder" className="w-6 h-6 text-muted" />
                        <div>
                          <div className="text-xs font-semibold text-foreground">{f.name}</div>
                          <div className="text-[10px] text-muted">{f.count} files</div>
                        </div>
                      </div>
                      <span className="text-muted text-sm">›</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-center p-4 border border-dashed border-border-custom rounded-md cursor-pointer hover:bg-elevated transition-all text-xs text-muted font-bold">
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
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-sm shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-border-custom pb-3">
              <div>
                <div className="text-sm font-extrabold text-foreground">Drop Pin on Drawing</div>
                <div className="text-[10px] text-muted mt-0.5">Position: {tempXY.x.toFixed(1)}% × {tempXY.y.toFixed(1)}%</div>
              </div>
              <button onClick={() => setShowPinModal(false)} className="text-muted hover:text-foreground text-lg leading-none">×</button>
            </div>
            <div>
              <div className="text-muted mb-1.5">Pin Category</div>
              <div className="grid grid-cols-2 gap-1.5">
                {(["RFI", "Clash", "Observation", "Approval"] as PinCategory[]).map(cat => {
                  const m = PIN_META[cat];
                  return (
                    <button key={cat} onClick={() => setNewPinCat(cat)}
                      className={`py-2 px-3 rounded-lg font-bold text-[10px] border transition-all ${newPinCat === cat ? `${m.bg} ${m.text} border-white/20` : "bg-white/5 text-muted border-border-custom hover:text-foreground"}`}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <div className="text-muted mb-1">Description / Query</div>
              <textarea rows={3} autoFocus value={newPinComment} onChange={e => setNewPinComment(e.target.value)}
                className="w-full bg-input border border-border-custom rounded-lg p-2.5 text-foreground resize-none text-xs"
                placeholder="Describe the issue, clash, or observation clearly..." />
            </div>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={newPinPhoto} onChange={e => setNewPinPhoto(e.target.checked)} className="accent-primary" />
              <span className="text-muted">Attach site photo proof</span>
            </label>
            <div className="flex gap-2 justify-end border-t border-border-custom pt-3">
              <button onClick={() => setShowPinModal(false)} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md text-xs">Cancel</button>
              <button onClick={handleAddPin} disabled={!newPinComment.trim()}
                className="px-5 py-2 bg-primary text-white font-bold rounded-md text-xs hover:opacity-90 disabled:opacity-40 transition-all">
                Place Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upload Revision Modal ── */}
      {showRevModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-md shadow-2xl p-5 space-y-4 text-xs">
            <div className="flex justify-between items-start border-b border-border-custom pb-3">
              <div>
                <div className="text-sm font-extrabold text-foreground">Upload New Revision</div>
                <div className="text-[10px] text-muted mt-0.5">{activeDrawing ? "Current revision will be automatically archived as Superseded" : "Creates the first drawing for this project"}</div>
              </div>
              <button onClick={() => setShowRevModal(false)} className="text-muted hover:text-foreground text-lg leading-none">×</button>
            </div>
            {/* State transition preview */}
            {activeDrawing && (
            <div className="bg-input border border-border-custom rounded-md p-3 space-y-1.5">
              <div className="text-[9px] uppercase tracking-wider text-muted mb-2">What will happen</div>
              {activeDrawing?.revisions.slice(0, 3).map(r => (
                <div key={r.id} className="flex items-center gap-2 text-[10px]">
                  <span className="text-zinc-300 font-bold w-6 shrink-0">{r.version}</span>
                  <span className="text-muted">→</span>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${r.status === "current" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" : REV_META[r.status].badge}`}>
                    {r.status === "current" ? "Becomes Superseded" : REV_META[r.status].label}
                  </span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-[10px] border-t border-border-custom pt-1.5">
                <span className="text-foreground font-bold w-6 shrink-0">{newRevCode}</span>
                <span className="text-muted">→</span>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-400">New Current</span>
              </div>
            </div>
            )}
            {!activeDrawing && (
              <div className="space-y-3">
                <div>
                  <div className="text-muted mb-1">Drawing Name</div>
                  <input type="text" value={newDrawingName} onChange={e => setNewDrawingName(e.target.value)}
                    className="w-full bg-input border border-border-custom rounded-lg p-2.5 text-foreground font-sans font-bold" />
                </div>
                <div>
                  <div className="text-muted mb-1">Category</div>
                  <select value={newDrawingCategory} onChange={e => setNewDrawingCategory(e.target.value)}
                    className="w-full bg-input border border-border-custom rounded-lg p-2.5 text-foreground font-sans">
                    {["2D Layout", "3D Layout", "Production File"].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
            <div>
              <div className="text-muted mb-1">Version Code</div>
              <input type="text" value={newRevCode} onChange={e => setNewRevCode(e.target.value)}
                className="w-full bg-input border border-border-custom rounded-lg p-2.5 text-foreground font-sans font-bold" />
            </div>
            <div>
              <div className="text-muted mb-1">Release Notes</div>
              <textarea rows={3} value={newRevComment} onChange={e => setNewRevComment(e.target.value)}
                className="w-full bg-input border border-border-custom rounded-lg p-2.5 text-foreground resize-none"
                placeholder="Incorporated RFI comments, updated column grid..." />
            </div>
            <div className="flex gap-2 justify-end border-t border-border-custom pt-3">
              <button onClick={() => setShowRevModal(false)} className="px-4 py-2 bg-zinc-800 text-muted hover:text-foreground rounded-md">Cancel</button>
              <button onClick={handlePublishRevision} disabled={!newRevCode.trim() || (!activeDrawing && !newDrawingName.trim())}
                className="px-5 py-2 bg-primary text-white font-bold rounded-md hover:opacity-90 disabled:opacity-40 transition-all">
                Publish {newRevCode}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}