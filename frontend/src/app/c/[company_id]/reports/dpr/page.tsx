"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

export default function DPRReportPage() {
  const params = useParams();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  const [selectedProject, setSelectedProject] = useState("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState("This Week");
  const [toastMessage, setToastMessage] = useState("");
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/reports/data/dpr?company_id=${companyId}`, {
        headers: { ...(authHeaders() || {}) }
      });
      const data = await res.json();
      setRows(data.rows || []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  const handleExportDpr = async () => {
    try {
      const q = new URLSearchParams();
      q.set("company_id", companyId);
      const now = new Date();
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      if (selectedDateFilter === "Today") {
        q.set("from_date", fmt(now));
        q.set("to_date", fmt(now));
      } else if (selectedDateFilter === "Yesterday") {
        const y = new Date(now);
        y.setDate(now.getDate() - 1);
        q.set("from_date", fmt(y));
        q.set("to_date", fmt(y));
      } else if (selectedDateFilter === "This Week") {
        const mon = new Date(now);
        const day = (now.getDay() + 6) % 7; // Monday = 0
        mon.setDate(now.getDate() - day);
        q.set("from_date", fmt(mon));
        q.set("to_date", fmt(now));
      }
      const res = await fetch(`${getApiHost()}/apis/v3/dpr/export?${q.toString()}`, {
        headers: authHeaders() || {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dpr-company-${fmt(now)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("DPR CSV downloaded");
    } catch (e: any) {
      showToast(e?.message || "Export failed");
    }
  };

  useEffect(() => {
    fetchReport();
  }, [companyId]);

  const cell = (row: Record<string, any>, key: string) => row[key] ?? "";
  const projectMatch = (row: Record<string, any>) =>
    selectedProject === "All" || (row["Project Name"] ?? "").toString().includes(selectedProject);

  const todoRows = rows.filter(r => projectMatch(r));
  const matReqRows = rows.filter(r => projectMatch(r));
  const taskRows = rows.filter(r => projectMatch(r));
  const attendanceRows = rows.filter(r => projectMatch(r));
  const materialRows = rows.filter(r => projectMatch(r));
  const equipmentRows = rows.filter(r => projectMatch(r));

  const statusBadge = (status: string) => {
    const s = status.toString();
    if (s === "Completed" || s === "Fulfilled") {
      return "bg-green-500/10 text-green-400 border border-green-500/20";
    }
    if (s === "Ongoing" || s === "Partially Fulfilled") {
      return "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
    }
    return "bg-zinc-500/10 text-muted border border-zinc-500/20";
  };

  const emptyRow = (colSpan: number) => (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-muted">No data available for this report yet.</td>
    </tr>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">

        {/* Action Header bar */}
        <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            
            {/* Project Select */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Project Name:</span>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="All">All Projects</option>
                <option value="Metro Terminal">Metro Terminal (Phase 2)</option>
                <option value="Bypass Highway">Bypass Highway Flyover</option>
                <option value="Alpha Premium">Alpha Premium Residences</option>
              </select>
            </div>

            {/* Date Select */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Date:</span>
              <select
                value={selectedDateFilter}
                onChange={e => setSelectedDateFilter(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="Custom">Custom Range</option>
              </select>
            </div>

            {/* Date Range Picker */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Date Range:</span>
              <input
                type="date"
                defaultValue="2026-07-04"
                className="bg-card border border-border-custom rounded-lg px-3 py-1 text-xs text-foreground focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => fetchReport()} className="p-2 bg-card hover:bg-elevated border border-border-custom rounded-lg text-xs" title="Refresh">
              🔄
            </button>
            <button onClick={handleExportDpr} className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg flex items-center gap-1.5 hover:bg-primary/90 transition-all">
              <span>📤</span> Export CSV
            </button>
          </div>
        </div>

        {/* Content Lists */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-elevated/10">

          {loading && (
            <div className="text-center text-muted text-sm py-4">Loading…</div>
          )}

          {/* Row 1: To Do & Material Request split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* To Do Table */}
            <div className="bg-card border border-border-custom rounded-xl p-4">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center justify-between">
                <span>To Do For DPR</span>
                <span className="text-[10px] text-muted font-normal">{todoRows.length} items</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                      <th className="pb-2">Project Name</th>
                      <th className="pb-2">Activity Name</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todoRows.length === 0 ? (
                      emptyRow(4)
                    ) : (
                      todoRows.map((row, i) => (
                        <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                          <td className="py-2.5 font-medium text-foreground">{cell(row, "Project Name")}</td>
                          <td className="py-2.5 text-muted">{cell(row, "Activity Name")}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBadge(cell(row, "Status"))}`}>{cell(row, "Status")}</span>
                          </td>
                          <td className="py-2.5 text-muted">{cell(row, "Type")}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Material Request Table */}
            <div className="bg-card border border-border-custom rounded-xl p-4">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center justify-between">
                <span>Material Request for DPR</span>
                <span className="text-[10px] text-muted font-normal">{matReqRows.length} items</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                      <th className="pb-2">Project Name</th>
                      <th className="pb-2">Material Name</th>
                      <th className="pb-2">Request Qty</th>
                      <th className="pb-2">Unsettled Qty</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matReqRows.length === 0 ? (
                      emptyRow(5)
                    ) : (
                      matReqRows.map((row, i) => (
                        <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                          <td className="py-2.5 font-medium text-foreground">{cell(row, "Project Name")}</td>
                          <td className="py-2.5 text-muted">{cell(row, "Material Name")}</td>
                          <td className="py-2.5 text-foreground">{cell(row, "Request Qty")}</td>
                          <td className="py-2.5 text-muted">{cell(row, "Unsettled Qty")}</td>
                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${statusBadge(cell(row, "Status"))}`}>{cell(row, "Status")}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Row 2: Task Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">Task Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project Name</th>
                    <th className="pb-2">Main Task Name</th>
                    <th className="pb-2">Group Task Name</th>
                    <th className="pb-2">Task Name</th>
                    <th className="pb-2">Start Date</th>
                    <th className="pb-2">End Date</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Estimated Qty</th>
                    <th className="pb-2">Opening Qty</th>
                    <th className="pb-2">Progress Qty</th>
                    <th className="pb-2">Max % Complete</th>
                    <th className="pb-2">Closing Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {taskRows.length === 0 ? (
                    emptyRow(12)
                  ) : (
                    taskRows.map((row, i) => (
                      <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                        <td className="py-2.5 font-medium text-foreground">{cell(row, "Project Name")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Main Task Name")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Group Task Name")}</td>
                        <td className="py-2.5 text-foreground">{cell(row, "Task Name")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Start Date")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "End Date")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Unit")}</td>
                        <td className="py-2.5 text-foreground">{cell(row, "Estimated Qty")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Opening Qty")}</td>
                        <td className="py-2.5 text-success font-semibold">+{cell(row, "Progress Qty")}</td>
                        <td className="py-2.5 font-bold text-foreground">{cell(row, "Max % Complete")}</td>
                        <td className="py-2.5 text-foreground">{cell(row, "Closing Qty")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 3: Attendance Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">Attendance Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project name</th>
                    <th className="pb-2">Party name</th>
                    <th className="pb-2">Workforce name</th>
                    <th className="pb-2">No of Workers</th>
                    <th className="pb-2">Total Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.length === 0 ? (
                    emptyRow(5)
                  ) : (
                    attendanceRows.map((row, i) => (
                      <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                        <td className="py-2.5 font-medium text-foreground">{cell(row, "Project Name")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Party Name")}</td>
                        <td className="py-2.5 text-foreground">{cell(row, "Workforce Name")}</td>
                        <td className="py-2.5 font-semibold text-foreground">{cell(row, "No of Workers")}</td>
                        <td className="py-2.5 text-foreground">{cell(row, "Total Shift")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 4: Material Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">Material Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project Name</th>
                    <th className="pb-2">Material</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Received Qty</th>
                    <th className="pb-2">Used Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {materialRows.length === 0 ? (
                    emptyRow(5)
                  ) : (
                    materialRows.map((row, i) => (
                      <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                        <td className="py-2.5 font-medium text-foreground">{cell(row, "Project Name")}</td>
                        <td className="py-2.5 text-foreground">{cell(row, "Material")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Unit")}</td>
                        <td className="py-2.5 text-success font-semibold">{cell(row, "Received Qty")}</td>
                        <td className="py-2.5 text-orange-400 font-semibold">{cell(row, "Used Qty")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 5: Equipment Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">Equipment Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project Name</th>
                    <th className="pb-2">Equipment Name</th>
                    <th className="pb-2">Vehicle No</th>
                    <th className="pb-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {equipmentRows.length === 0 ? (
                    emptyRow(4)
                  ) : (
                    equipmentRows.map((row, i) => (
                      <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                        <td className="py-2.5 font-medium text-foreground">{cell(row, "Project Name")}</td>
                        <td className="py-2.5 text-foreground">{cell(row, "Equipment Name")}</td>
                        <td className="py-2.5 text-muted">{cell(row, "Vehicle No")}</td>
                        <td className="py-2.5 font-semibold text-foreground">{cell(row, "Unit")}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
    </div>
  );
}
