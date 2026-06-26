"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Pin {
  id: string;
  x: number;
  y: number;
  comment: string;
  user: string;
  date: string;
}

interface Revision {
  id: string;
  version: string;
  fileUrl: string;
  status: string;
  comments: string;
  date: string;
  pins: Pin[];
  approvedBy?: string;
}

interface Drawing {
  id: string;
  name: string;
  category: string;
  createdAt: string;
  createdBy: string;
  revisions: Revision[];
}

// Hardcoded initial data representing structural/architectural layouts
const INITIAL_DRAWINGS: Drawing[] = [
  {
    id: "drw-001",
    name: "Architectural Ground Floor Plan",
    category: "2D Layout",
    createdAt: "2026-06-15",
    createdBy: "Ar. Rohan Apex",
    revisions: [
      {
        id: "rev-001-v1",
        version: "V1",
        fileUrl: "/images/drawings/ground_floor_v1.pdf",
        status: "approved",
        comments: "Initial release approved for site markup.",
        date: "2026-06-15",
        pins: [
          { id: "pin-01", x: 35.5, y: 40.2, comment: "Column C-4 misalignment detected on site. Needs +50mm offset.", user: "Suresh R (Project Manager)", date: "Jun 16" },
          { id: "pin-02", x: 72.1, y: 65.4, comment: "Relocate electrical main conduit away from wet zone.", user: "Amit K (MEP Eng)", date: "Jun 17" }
        ]
      },
      {
        id: "rev-001-v2",
        version: "V2",
        fileUrl: "/images/drawings/ground_floor_v2.pdf",
        status: "pending",
        comments: "Incorporated column C-4 changes and relocated conduits.",
        date: "2026-06-25",
        pins: [
          { id: "pin-03", x: 35.5, y: 40.2, comment: "Verified columns offset matches structural slab load calculations.", user: "Dharmesh S (Structural Auditor)", date: "Jun 26" },
          { id: "pin-04", x: 50.0, y: 30.0, comment: "Check lintel beam reinforcement details here.", user: "Ramesh Kumar (Mason Lead)", date: "Jun 26" }
        ]
      }
    ]
  },
  {
    id: "drw-002",
    name: "Column Reinforcement Details & BBS",
    category: "Production File",
    createdAt: "2026-06-18",
    createdBy: "Eng. Neha Skyline",
    revisions: [
      {
        id: "rev-002-v1",
        version: "V1",
        fileUrl: "/images/drawings/column_bbs_v1.pdf",
        status: "approved",
        comments: "BBS list matching IS 456 standards.",
        date: "2026-06-18",
        pins: []
      }
    ]
  },
  {
    id: "drw-003",
    name: "HVAC Duct Layout & Plenums",
    category: "3D Layout",
    createdAt: "2026-06-20",
    createdBy: "Eng. Rahul Verma",
    revisions: [
      {
        id: "rev-003-v1",
        version: "V1",
        fileUrl: "/images/drawings/hvac_3d_v1.pdf",
        status: "rejected",
        comments: "Clashes detected with structural beams on floor 3.",
        date: "2026-06-20",
        pins: [
          { id: "pin-05", x: 45.0, y: 55.0, comment: "Duct width clashes with structural lintel. Redraw with 350mm depth.", user: "Neha S (Structural Eng)", date: "Jun 21" }
        ]
      }
    ]
  }
];

const CATEGORIES = ["All", "2D Layout", "3D Layout", "Production File"];

export default function DrawingsPage() {
  const { company_id, project_id } = useParams();
  const companyId = company_id || "demo-company";
  const projectId = project_id || "d0000000-0000-0000-0000-000000000001";

  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeDrawingId, setActiveDrawingId] = useState<string>("");
  const [activeRevIndex, setActiveRevIndex] = useState(0);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  // New Pin Modal State
  const [showAddPinModal, setShowAddPinModal] = useState(false);
  const [tempCoords, setTempCoords] = useState({ x: 0, y: 0 });
  const [newPinComment, setNewPinComment] = useState("");
  const [newPinUser, setNewPinUser] = useState("Suresh R (Project Manager)");

  // New Revision Modal State
  const [showAddRevModal, setShowAddRevModal] = useState(false);
  const [newRevCode, setNewRevCode] = useState("V2");
  const [newRevComment, setNewRevComment] = useState("");

  const canvasRef = useRef<HTMLDivElement>(null);

  const fetchDrawings = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/drawings?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((d: any) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          createdAt: d.created_at ? d.created_at.split("T")[0] : "",
          createdBy: "Admin / Designer",
          revisions: d.revisions.map((r: any) => ({
            id: r.id,
            version: r.version_code,
            fileUrl: r.file_url,
            status: r.approval_status,
            comments: r.comments || "",
            date: r.created_at ? r.created_at.split("T")[0] : "",
            approvedBy: r.approved_by ? "Dharmesh S (Auditor)" : undefined,
            pins: r.pins.map((p: any) => ({
              id: p.id,
              x: p.x_coordinate,
              y: p.y_coordinate,
              comment: p.comment,
              user: "Engineer",
              date: p.created_at ? new Date(p.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : "Today"
            }))
          }))
        }));
        setDrawings(mapped);
        if (mapped.length > 0) {
          setActiveDrawingId((prev) => {
            if (mapped.some((item: any) => item.id === prev)) {
              return prev;
            }
            return mapped[0].id;
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch drawings", e);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchDrawings();
    }
  }, [projectId]);

  const activeDrawing = drawings.find((d) => d.id === activeDrawingId) || drawings[0] || {
    id: "",
    name: "No drawings selected",
    category: "",
    createdAt: "",
    createdBy: "",
    revisions: [{ id: "", version: "", fileUrl: "", status: "pending", comments: "Select or upload a blueprint sheet.", date: "", pins: [] }]
  };

  // Ensure active revision index is safe
  const activeRev = activeDrawing.revisions[activeRevIndex] || activeDrawing.revisions[activeDrawing.revisions.length - 1] || { id: "", version: "", pins: [], status: "pending", comments: "", date: "" };

  const filteredDrawings = selectedCategory === "All"
    ? drawings
    : drawings.filter((d) => d.category === selectedCategory);

  // Handle clicking on the canvas to place a pin
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !activeDrawing.id) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    // Open modal to configure pin
    setTempCoords({ x, y });
    setNewPinComment("");
    setShowAddPinModal(true);
  };

  const submitNewPin = async () => {
    if (!newPinComment.trim() || !activeRev.id) return;

    try {
      const res = await fetch(`http://localhost:8000/apis/v3/drawings/revisions/${activeRev.id}/pins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          x_coordinate: parseFloat(tempCoords.x.toFixed(1)),
          y_coordinate: parseFloat(tempCoords.y.toFixed(1)),
          comment: newPinComment,
          tagged_user_id: null,
          created_by: null
        })
      });
      if (res.ok) {
        const pinData = await res.json();
        await fetchDrawings();
        setSelectedPinId(pinData.id);
        setShowAddPinModal(false);
      }
    } catch (e) {
      console.error("Failed to place pin", e);
    }
  };

  const submitNewRevision = async () => {
    if (!newRevComment.trim() || !activeDrawing.id) return;

    try {
      const res = await fetch(`http://localhost:8000/apis/v3/drawings/${activeDrawing.id}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_code: newRevCode,
          file_url: `/images/drawings/floor_${newRevCode.toLowerCase()}.pdf`,
          comments: newRevComment
        })
      });
      if (res.ok) {
        await fetchDrawings();
        setShowAddRevModal(false);
        setNewRevComment("");
        // Select newest revision
        setActiveRevIndex(activeDrawing.revisions.length);
      }
    } catch (e) {
      console.error("Failed to submit revision", e);
    }
  };

  const approveCurrentRevision = async (status: "approved" | "rejected") => {
    if (!activeRev.id) return;

    try {
      const res = await fetch(`http://localhost:8000/apis/v3/drawings/revisions/${activeRev.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          approval_status: status,
          approved_by: null,
          comments: "Audited on site"
        })
      });
      if (res.ok) {
        await fetchDrawings();
      }
    } catch (e) {
      console.error("Failed to audit revision", e);
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed] pb-20 relative font-sans">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/c/${companyId}/dashboard`} className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-md">
            S
          </Link>
          <div>
            <span className="text-xs text-zinc-500 block font-semibold">PROJECT DRAWINGS</span>
            <span className="text-sm font-extrabold text-white">Drawings, Revisions & Pin Markup</span>
          </div>
        </div>

        <Link
          href={`/c/${companyId}/dashboard`}
          className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold hover:bg-white/[0.05] transition-all"
        >
          ← Operations Dashboard
        </Link>
      </header>

      {/* Main Workspace Layout */}
      <div className="max-w-[1600px] mx-auto px-6 mt-6 grid grid-cols-12 gap-6">
        
        {/* Left Column: Drawings List */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="glass-panel p-4 border border-white/5 rounded-2xl">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">Categories</h2>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-secondary text-white"
                      : "bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-panel p-4 border border-white/5 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Drawings List</h2>
              <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-zinc-400">{filteredDrawings.length} total</span>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredDrawings.map((d) => {
                const isActive = d.id === activeDrawingId;
                const latestRev = d.revisions[d.revisions.length - 1];
                return (
                  <div
                    key={d.id}
                    onClick={() => {
                      setActiveDrawingId(d.id);
                      setActiveRevIndex(d.revisions.length - 1);
                      setSelectedPinId(null);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "bg-secondary/15 border-secondary text-white"
                        : "bg-white/[0.02] border-white/5 text-zinc-300 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase">{d.category}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                        latestRev.status === "approved"
                          ? "bg-green-500/10 text-green-400 border border-green-500/20"
                          : latestRev.status === "rejected"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}>
                        {latestRev.version} {latestRev.status}
                      </span>
                    </div>
                    <h3 className="text-xs font-extrabold line-clamp-1">{d.name}</h3>
                    <div className="flex justify-between items-center mt-2 text-[10px] text-zinc-500">
                      <span>{d.createdBy}</span>
                      <span>{latestRev.date}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Middle Column: Interactive Blueprint Canvas */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          <div className="glass-panel border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-[620px] relative overflow-hidden">
            
            {/* Blueprint Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3 z-10">
              <div>
                <h2 className="text-sm font-extrabold text-white">{activeDrawing.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] bg-white/5 px-2.5 py-0.5 rounded-full text-zinc-400">
                    Category: {activeDrawing.category}
                  </span>
                  <span className="text-[10px] text-zinc-500">
                    Uploaded by {activeDrawing.createdBy}
                  </span>
                </div>
              </div>

              {/* Version Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400 font-bold">Revision:</span>
                <select
                  value={activeDrawing.revisions.indexOf(activeRev)}
                  onChange={(e) => {
                    setActiveRevIndex(parseInt(e.target.value));
                    setSelectedPinId(null);
                  }}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white outline-none cursor-pointer hover:border-white/20 transition-all font-bold"
                >
                  {activeDrawing.revisions.map((rev, index) => (
                    <option key={rev.id} value={index} className="bg-[#171520] text-white">
                      {rev.version} ({rev.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Canvas Area */}
            <div 
              ref={canvasRef}
              onClick={handleCanvasClick}
              className="flex-1 rounded-xl bg-[#090b14] border border-white/5 relative overflow-hidden cursor-crosshair group flex items-center justify-center select-none"
              style={{
                backgroundImage: "radial-gradient(#172242 1px, transparent 1px)",
                backgroundSize: "20px 20px"
              }}
            >
              {/* stylized vector/CSS layout outlines represent blueprint architecture */}
              <div className="absolute inset-4 border-2 border-[#162754] opacity-50 flex items-center justify-center">
                <div className="w-[80%] h-[75%] border border-[#162754] flex grid grid-cols-3 grid-rows-3 relative">
                  {/* Grid rooms layout */}
                  <div className="border-r border-b border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold">ROOM 101</div>
                  <div className="border-r border-b border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold font-mono">CORRIDOR A</div>
                  <div className="border-b border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold">ROOM 102</div>
                  <div className="border-r border-b border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold">LOBBY</div>
                  <div className="border-r border-b border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold relative">
                    <div className="absolute inset-4 rounded-full border border-dashed border-[#1c3c8c]" />
                    SHAFT
                  </div>
                  <div className="border-b border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold">ROOM 103</div>
                  <div className="border-r border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold">MEP ROOM</div>
                  <div className="border-r border-[#162754] flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold">STAIRS</div>
                  <div className="flex items-center justify-center text-[10px] text-[#1c3c8c] font-bold">OFFICE</div>
                </div>
              </div>

              {/* Instructions overlay */}
              <div className="absolute top-3 left-3 bg-[#171520]/85 backdrop-blur border border-white/5 rounded-lg px-2.5 py-1.5 text-[10px] text-zinc-400 pointer-events-none">
                💡 Click anywhere on the drawing layout to place a comment markup pin.
              </div>

              {/* Render existing pins */}
              {activeRev.pins.map((pin) => {
                const isSelected = pin.id === selectedPinId;
                return (
                  <button
                    key={pin.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPinId(pin.id);
                    }}
                    style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 group z-20"
                  >
                    {/* Pin marker */}
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center shadow-lg border transition-all ${
                      isSelected
                        ? "bg-primary border-white scale-125"
                        : "bg-secondary border-secondary/50 hover:bg-primary hover:border-white hover:scale-110"
                    }`}>
                      <span className="text-[10px] font-bold text-white">📍</span>
                    </div>

                    {/* Quick hover comment bubble */}
                    <div className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden group-hover:block bg-[#171520] border border-white/10 rounded-lg p-2.5 shadow-xl w-48 text-[10px] leading-tight text-white text-left z-30 pointer-events-none">
                      <span className="font-extrabold block text-secondary mb-1">{pin.user}</span>
                      {pin.comment}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Blueprint Footer Details */}
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 border-t border-white/5 pt-3">
              <span>Layout scale: 1:100 (A1 size)</span>
              <span>Total markups: {activeRev.pins.length} active pins</span>
            </div>
          </div>
        </div>

        {/* Right Column: Revision Control & Active Pin Details */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          
          {/* Active Revision Auditing Control */}
          <div className="glass-panel p-4 border border-white/5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Revision Audit Control</h2>

            <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-white">Version: {activeRev.version}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  activeRev.status === "approved"
                    ? "bg-green-500/10 text-green-400"
                    : activeRev.status === "rejected"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-amber-500/10 text-amber-400"
                }`}>
                  {activeRev.status}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed italic">
                &ldquo;{activeRev.comments || "No comments uploaded with revision."}&rdquo;
              </p>
              <div className="text-[10px] text-zinc-500 flex justify-between pt-1">
                <span>Created: {activeRev.date}</span>
                {activeRev.approvedBy && <span>Audited: {activeRev.approvedBy}</span>}
              </div>
            </div>

            {/* Auditor Action Panel */}
            {activeRev.status === "pending" && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => approveCurrentRevision("approved")}
                  className="bg-green-600 hover:bg-green-500 text-white rounded-xl py-2 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer text-center"
                >
                  ✓ Approve
                </button>
                <button
                  onClick={() => approveCurrentRevision("rejected")}
                  className="bg-red-600/30 hover:bg-red-600/50 text-red-200 border border-red-500/20 rounded-xl py-2 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer text-center"
                >
                  ✗ Reject Revision
                </button>
              </div>
            )}

            <button
              onClick={() => setShowAddRevModal(true)}
              className="w-full bg-gradient-to-r from-secondary to-[#8B73FF] text-white rounded-xl py-2.5 text-xs font-bold active:scale-[0.98] transition-all cursor-pointer text-center"
            >
              + Upload New Revision
            </button>
          </div>

          {/* Pin Log & Details */}
          <div className="glass-panel p-4 border border-white/5 rounded-2xl space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Markup Log</h2>

            {selectedPinId ? (
              // Selected Pin Details
              (() => {
                const pinObj = activeRev.pins.find((p) => p.id === selectedPinId);
                if (!pinObj) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-secondary/10 border border-secondary/20 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] bg-secondary text-white px-2 py-0.5 rounded-full font-bold">📍 Pin Details</span>
                      <button
                        onClick={() => setSelectedPinId(null)}
                        className="text-zinc-500 hover:text-white text-xs font-bold"
                      >
                        ✕ Close
                      </button>
                    </div>
                    <div className="text-xs text-white font-semibold leading-relaxed">
                      {pinObj.comment}
                    </div>
                    <div className="text-[10px] text-zinc-400 flex items-center justify-between border-t border-white/5 pt-2 mt-2">
                      <span>By: {pinObj.user}</span>
                      <span>Coords: {pinObj.x}%, {pinObj.y}%</span>
                    </div>
                  </div>
                );
              })()
            ) : (
              // Empty State or Summary list of pins
              <div className="space-y-2">
                {activeRev.pins.length === 0 ? (
                  <div className="text-center py-6 text-zinc-500 text-xs">
                    No active pins placed on this revision.
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                    {activeRev.pins.map((pin) => (
                      <div
                        key={pin.id}
                        onClick={() => setSelectedPinId(pin.id)}
                        className="p-2.5 rounded-lg bg-white/[0.01] border border-white/5 hover:border-white/10 hover:bg-white/[0.03] transition-all cursor-pointer flex gap-2 items-start"
                      >
                        <span className="text-xs">📍</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-zinc-300 line-clamp-1 leading-snug font-semibold">{pin.comment}</p>
                          <span className="text-[9px] text-zinc-500">{pin.user} • {pin.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Modal: Add Pin */}
      {showAddPinModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Create Markup Pin</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Dropping pin at coordinate: X: {tempCoords.x.toFixed(1)}%, Y: {tempCoords.y.toFixed(1)}%
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                  Comments / Site Issue description
                </label>
                <textarea
                  value={newPinComment}
                  onChange={(e) => setNewPinComment(e.target.value)}
                  placeholder="Describe the issue, mismatch, or conduit details clearly..."
                  rows={3}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                  Reporter / Engineer Name
                </label>
                <input
                  type="text"
                  value={newPinUser}
                  onChange={(e) => setNewPinUser(e.target.value)}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary transition-all font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowAddPinModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitNewPin}
                className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-primary/10 transition-all cursor-pointer"
              >
                Place Pin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Revision */}
      {showAddRevModal && (
        <div className="fixed inset-0 bg-[#0E0C15]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-panel w-full max-w-md border border-white/10 rounded-3xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-white">Upload Drawing Revision</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Upload a new revision file to replace the current blueprint sheet.
              </p>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                    Version Code
                  </label>
                  <input
                    type="text"
                    value={newRevCode}
                    onChange={(e) => setNewRevCode(e.target.value)}
                    className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary transition-all font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value="2026-06-26"
                    disabled
                    className="w-full bg-[#171520]/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-500 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                  Revision Notes / Changes Summary
                </label>
                <textarea
                  value={newRevComment}
                  onChange={(e) => setNewRevComment(e.target.value)}
                  placeholder="List all changes made in this layout sheet version..."
                  rows={3}
                  className="w-full bg-[#171520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-secondary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">
                  Select Sheet File (PDF / CAD / Image)
                </label>
                <div className="border border-dashed border-white/10 hover:border-white/20 rounded-xl p-4 text-center cursor-pointer transition-all bg-white/[0.01]">
                  <span className="text-[10px] text-zinc-400 block font-semibold">📁 ground_floor_v3_draft.pdf</span>
                  <span className="text-[9px] text-zinc-600 block mt-1">Click to browse or drag file here</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => setShowAddRevModal(false)}
                className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold hover:bg-white/[0.05] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={submitNewRevision}
                className="bg-secondary hover:opacity-90 text-white px-5 py-2 rounded-xl text-xs font-bold shadow-lg shadow-secondary/10 transition-all cursor-pointer"
              >
                Submit Revision
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
