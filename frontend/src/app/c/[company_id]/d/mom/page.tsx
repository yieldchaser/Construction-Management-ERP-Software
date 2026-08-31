"use client";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MoM {
  id: string;
  company_id: string;
  project_id: string | null;
  type: "Regular" | "Review" | "Client Meeting" | "Internal";
  status: "Open" | "Closed" | "Action Pending" | "Draft";
  attendees: string[];
  notes: string | null;
  created_by: string | null;
  created_at: string | null;
}

interface ProjectOption {
  id: string;
  name: string;
}

const MOM_TYPES = ["Regular", "Review", "Client Meeting", "Internal"] as const;
const MOM_STATUSES = ["Open", "Closed", "Action Pending", "Draft"] as const;

const statusColors: Record<string, string> = {
  Open: "bg-danger/10 text-danger border-danger/20",
  "Action Pending": "bg-warning/10 text-warning border-warning/20",
  Closed: "bg-success/10 text-success border-success/20",
  Draft: "bg-elevated text-muted border-border-custom",
};

const badge = (label: string, cls: string) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
    {label}
  </span>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function MoMPage() {
  const params = useParams();
  const companyId = (params?.company_id as string) || "";
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  useEffect(() => {
    if (!companyId || companyId === "e0000000-0000-0000-0000-000000000000") {
      if (typeof window !== "undefined") window.location.replace("/login");
    }
  }, [companyId]);

  const [moms, setMoms] = useState<MoM[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isOffline, setIsOffline] = useState(false);

  const [filterDate, setFilterDate] = useState("");
  const [filterAttendee, setFilterAttendee] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

  const [showForm, setShowForm] = useState(false);
  const [selectedMom, setSelectedMom] = useState<MoM | null>(null);

  const [form, setForm] = useState({
    project_id: projectId,
    type: "Regular" as typeof MOM_TYPES[number],
    status: "Open" as typeof MOM_STATUSES[number],
    attendees: "",
    notes: "",
  });

  const loadProjects = async () => {
    if (!companyId || companyId === "e0000000-0000-0000-0000-000000000000") return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/planning/projects?company_id=${companyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.map((p: any) => ({ id: p.id, name: p.name })));
      }
    } catch (e) {
      console.error("Failed to fetch projects", e);
    }
  };

  const loadMoms = async () => {
    if (!companyId || companyId === "e0000000-0000-0000-0000-000000000000") return;
    const params2 = new URLSearchParams();
    if (filterProject !== "all") params2.set("project_id", filterProject);
    if (filterStatus !== "all") params2.set("status", filterStatus);
    if (filterType !== "all") params2.set("type", filterType);
    if (filterAttendee.trim()) params2.set("attendee", filterAttendee.trim());
    if (filterDate) params2.set("date", filterDate);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/mom/${companyId}?${params2.toString()}`, { headers: authHeaders() });
      if (res.ok) {
        setMoms(await res.json());
        setIsOffline(false);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e) {
      console.error("Failed to fetch MOMs", e);
      setIsOffline(true);
    }
  };


  useEffect(() => {
    loadProjects();
  }, [companyId]);

  useEffect(() => {
    loadMoms();
  }, [companyId, filterProject, filterStatus, filterType, filterAttendee, filterDate]);

  const projectName = (id: string | null) => {
    if (!id) return "—";
    const p = projects.find((x) => x.id === id);
    return p ? p.name : id.slice(0, 8);
  };

  const resetForm = () => {
    setForm({
      project_id: projectId,
      type: "Regular",
      status: "Open",
      attendees: "",
      notes: "",
    });
  };

  const openCreate = () => {
    resetForm();
    setSelectedMom(null);
    setShowForm(true);
  };

  const openEdit = (m: MoM) => {
    setSelectedMom(m);
    setForm({
      project_id: m.project_id || projectId,
      type: m.type,
      status: m.status,
      attendees: (m.attendees || []).join(", "),
      notes: m.notes || "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    const attendeesList = form.attendees
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    const body = {
      project_id: form.project_id,
      type: form.type,
      status: form.status,
      attendees: attendeesList,
      notes: form.notes || null,
    };
    try {
      const url = selectedMom
        ? `${getApiHost()}/apis/v3/mom/${companyId}/${selectedMom.id}`
        : `${getApiHost()}/apis/v3/mom/${companyId}`;
      const res = await fetch(url, {
        method: selectedMom ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setShowForm(false);
        setSelectedMom(null);
        loadMoms();
      }
    } catch (e) {
      console.error("Failed to save MOM", e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this MOM record?")) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/mom/${companyId}/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) loadMoms();
    } catch (e) {
      console.error("Failed to delete MOM", e);
    }
  };

  const inputCls = "w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-foreground outline-none focus:border-secondary font-semibold";

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sidebar */}
      

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title="Minutes of Meeting"
          subtitle="Corporate MOM register, action item logs and attendee records"
        >
          <button onClick={openCreate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer">
            + New MOM
          </button>
        </PageHeader>

        {isOffline && (
          <div className="px-6 py-2.5 bg-warning/10 border-b border-warning/20 text-warning text-xs">
            Backend connection unavailable — MOM list could not be loaded.
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          <PageShell width="wide">
            {/* Filters */}
          <div className="rounded-md border border-border-custom bg-card p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-3">
              <div>
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider">MOM Register</h3>
                <p className="text-[10px] text-muted mt-1">Filter minutes of meeting records by date, attendee, or project.</p>
              </div>
              <div className="text-[10px] text-muted font-medium">{moms.length} record{moms.length === 1 ? "" : "s"} shown</div>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Date</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Attendee</label>
                <input value={filterAttendee} onChange={(e) => setFilterAttendee(e.target.value)}
                  placeholder="Attendee name..."
                  className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Project</label>
                <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}
                  className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground">
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted tracking-wider">Status</label>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground">
                  <option value="all">All Statuses</option>
                  {MOM_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border-custom rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-elevated border-b border-border-custom">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Attendee(s)</th>
                    <th className="px-5 py-3 font-semibold">Project</th>
                    <th className="px-5 py-3 font-semibold">Type</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 font-semibold">Notes</th>
                    <th className="px-5 py-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {moms.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8">
                        <EmptyState
                          title="No MOM records found"
                          description="Record Minutes of Meeting with attendees, discussion points, and project action items."
                          action={{
                            label: "+ New MOM",
                            onClick: () => openCreate(),
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    moms.map((m) => (
                      <tr key={m.id} className="border-b border-border-custom hover:bg-elevated transition-all">
                        <td className="px-5 py-3 font-bold text-foreground">{(m.attendees || []).join(", ") || "—"}</td>
                        <td className="px-5 py-3 text-foreground">{projectName(m.project_id)}</td>
                        <td className="px-5 py-3 text-muted">{m.type}</td>
                        <td className="px-5 py-3">{badge(m.status, statusColors[m.status])}</td>
                        <td className="px-5 py-3 text-muted max-w-xs truncate">{m.notes || "—"}</td>
                        <td className="px-5 py-3 text-right space-x-2">
                          <button onClick={() => openEdit(m)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[10px] font-bold border border-primary/20 hover:bg-primary/20 cursor-pointer">
                            Edit
                          </button>
                          <button onClick={() => handleDelete(m.id)}
                            className="px-3 py-1.5 rounded-lg bg-danger/10 text-danger text-[10px] font-bold border border-danger/20 hover:bg-danger/10 cursor-pointer">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </PageShell>
        </div>
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-md rounded-md p-6 space-y-4 text-left">
            <div>
              <h3 className="text-sm font-extrabold text-foreground">{selectedMom ? "Edit MOM" : "New Minutes of Meeting"}</h3>
              <p className="text-xs text-muted mt-1">Capture attendees, notes, and meeting status.</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Attendees</label>
                <input type="text" placeholder="Comma-separated names"
                  value={form.attendees} onChange={(e) => setForm(prev => ({ ...prev, attendees: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Project</label>
                <select value={form.project_id} onChange={(e) => setForm(prev => ({ ...prev, project_id: e.target.value }))}
                  className={inputCls}>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="bg-card text-foreground">{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm(prev => ({ ...prev, type: e.target.value as any }))}
                    className={inputCls}>
                    {MOM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-muted block mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className={inputCls}>
                    {MOM_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-muted block mb-1">Notes</label>
                <textarea placeholder="Meeting notes and action items..."
                  value={form.notes} onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={4} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setShowForm(false); setSelectedMom(null); }} className="px-4 py-2 rounded-md border border-border-custom text-xs font-bold hover:bg-elevated cursor-pointer">Cancel</button>
              <button onClick={handleSave} className="bg-primary hover:opacity-90 text-white px-5 py-2 rounded-md text-xs font-bold cursor-pointer">Save MOM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
