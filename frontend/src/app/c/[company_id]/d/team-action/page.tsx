"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

interface Project {
  id: string;
  name: string;
}

interface TimesheetEntry {
  id: string;
  entry_date: string;
  hours: number;
  activity_description: string;
  employee_name: string;
  project_name: string;
  start_time?: string;
  end_time?: string;
  duration?: number;
}

export default function TeamActionPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const [activeTab, setActiveTab] = useState<"schedule" | "timesheet">("schedule");
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheetEntries, setTimesheetEntries] = useState<TimesheetEntry[]>([]);

  // Gantt / Schedule Filters
  const [scheduleProject, setScheduleProject] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState("All");

  // Timesheet date filter state
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // New Timesheet drawer state
  const [isNewTimesheetOpen, setIsNewTimesheetOpen] = useState(false);
  const [tsEmployeeName, setTsEmployeeName] = useState("Ramesh Kumar");
  const [tsProjectId, setTsProjectId] = useState("");
  const [tsDate, setTsDate] = useState(new Date().toISOString().split("T")[0]);
  const [tsStartTime, setTsStartTime] = useState("09:00");
  const [tsEndTime, setTsEndTime] = useState("17:00");
  const [tsActivity, setTsActivity] = useState("");
  const [tsHours, setTsHours] = useState(8);

  const apiHost = getApiHost();

  // Auto compute hours based on start/end times
  useEffect(() => {
    if (tsStartTime && tsEndTime) {
      const [sh, sm] = tsStartTime.split(":").map(Number);
      const [eh, em] = tsEndTime.split(":").map(Number);
      let diff = (eh * 60 + em) - (sh * 60 + sm);
      if (diff < 0) diff += 24 * 60; // handle wrap around
      setTsHours(Number((diff / 60).toFixed(2)));
    }
  }, [tsStartTime, tsEndTime]);

  const fetchData = async () => {
    if (!companyId || !accessToken) return;
    try {
      // Fetch projects for dropdown
      const projRes = await fetch(`${apiHost}/apis/v3/planning/projects?company_id=${companyId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (projRes.ok) {
        const data = await projRes.json();
        setProjects(data);
        if (data.length > 0 && !tsProjectId) {
          setTsProjectId(data[0].id);
        }
      }

      // Fetch timesheet entries
      const tsRes = await fetch(`${apiHost}/apis/v3/hr/timesheets/company/${companyId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (tsRes.ok) {
        const data = await tsRes.json();
        setTimesheetEntries(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, accessToken]);

  const handleCreateTimesheet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tsProjectId || !tsEmployeeName.trim()) return;

    try {
      // 1. Ensure a staff employee exists or auto-create one
      const empRes = await fetch(`${apiHost}/apis/v3/hr/employees/${companyId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      let employeeId = "";
      if (empRes.ok) {
        const emps = await empRes.json();
        const existing = emps.find((em: any) => em.name === tsEmployeeName);
        if (existing) {
          employeeId = existing.id;
        } else {
          // create a dummy employee
          const createEmpRes = await fetch(`${apiHost}/apis/v3/hr/employees/${companyId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              name: tsEmployeeName,
              mobile: `98000${Math.floor(10000 + Math.random() * 90000)}`,
              designation: "Site Labor",
              salary_type: "daily_wage",
              base_rate: 600.0,
              pf_enabled: false,
              esi_enabled: false
            })
          });
          if (createEmpRes.ok) {
            const newEmp = await createEmpRes.json();
            employeeId = newEmp.id;
          }
        }
      }

      if (!employeeId) return;

      // 2. Create Timesheet Header
      const tsHeaderRes = await fetch(`${apiHost}/apis/v3/hr/timesheets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          employee_id: employeeId,
          project_id: tsProjectId,
          week_start: `${tsDate}T00:00:00Z`,
          week_end: `${tsDate}T23:59:59Z`,
          notes: tsActivity
        })
      });

      if (!tsHeaderRes.ok) return;
      const tsHeader = await tsHeaderRes.json();

      // 3. Create Entry
      const entryRes = await fetch(`${apiHost}/apis/v3/hr/timesheets/${tsHeader.id}/entries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          entry_date: `${tsDate}T00:00:00Z`,
          hours: tsHours,
          activity_description: tsActivity,
          start_time: `${tsDate}T${tsStartTime}:00Z`,
          end_time: `${tsDate}T${tsEndTime}:00Z`,
          duration: Math.round(tsHours * 60)
        })
      });

      if (entryRes.ok) {
        setIsNewTimesheetOpen(false);
        setTsActivity("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredTimesheetEntries = timesheetEntries.filter((ts) => {
    if (selectedDateFilter === "All") return true;
    const entryDate = new Date(ts.entry_date);
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (selectedDateFilter === "Today") {
      const d = new Date(entryDate);
      d.setHours(0,0,0,0);
      return d.getTime() === today.getTime();
    }
    if (selectedDateFilter === "Yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const d = new Date(entryDate);
      d.setHours(0,0,0,0);
      return d.getTime() === yesterday.getTime();
    }
    if (selectedDateFilter === "Custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      start.setHours(0,0,0,0);
      const end = new Date(customEndDate);
      end.setHours(23,59,59,999);
      return entryDate >= start && entryDate <= end;
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6 space-y-6 relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h1 className="text-base font-semibold text-foreground">Team Schedule</h1>
          <p className="text-xs text-muted mt-1">Plan site activities, allocate laborers, and approve logs.</p>
        </div>

        {/* Tab selector */}
        <div className="flex bg-elevated border border-border-custom rounded-md p-1 shrink-0">
          <button
            onClick={() => setActiveTab("schedule")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "schedule" ? "bg-primary text-white shadow-sm font-medium" : "text-muted hover:text-foreground font-medium"
            }`}
          >
            Schedule Gantt
          </button>
          <button
            onClick={() => setActiveTab("timesheet")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "timesheet" ? "bg-primary text-white shadow-sm font-medium" : "text-muted hover:text-foreground font-medium"
            }`}
          >
            Timesheet Ledger
          </button>
        </div>
      </div>

      {/* Schedule Gantt Tab */}
      {activeTab === "schedule" && (
        <div className="flex-1 flex flex-col min-h-0 bg-card border border-border-custom rounded-lg overflow-hidden">
          {/* Gantt Filters */}
          <div className="p-4 border-b border-border-custom bg-background/50 flex flex-wrap items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <select
                value={scheduleProject}
                onChange={(e) => setScheduleProject(e.target.value)}
                className="input-field px-3 py-1.5 text-xs font-semibold focus:outline-none"
              >
                <option value="">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              
              <select
                value={scheduleStatus}
                onChange={(e) => setScheduleStatus(e.target.value)}
                className="input-field px-3 py-1.5 text-xs font-semibold focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Planned">Planned</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-semibold uppercase tracking-wider bg-elevated px-2.5 py-1 rounded-md border border-border-custom">
                July 2026
              </span>
            </div>
          </div>

          {/* Simulated Gantt Grid */}
          <div className="flex-1 overflow-auto">
            <div className="min-w-[800px] h-full flex flex-col">
              {/* Grid Header Days */}
              <div className="flex border-b border-border-custom text-[10px] font-bold text-muted uppercase tracking-wider shrink-0 bg-background/50">
                <div className="w-48 p-4 border-r border-border-custom shrink-0">Team Member</div>
                {Array.from({ length: 15 }).map((_, idx) => (
                  <div key={idx} className="flex-1 p-4 text-center border-r border-border-custom">
                    {idx + 1} Jul
                  </div>
                ))}
              </div>

              {/* Grid Rows */}
              <div className="flex-1 divide-y divide-border-custom">
                {[
                  { name: "Ramesh Kumar", role: "Mason Lead", task: "Concrete Column Pouring", start: 2, end: 7, color: "bg-primary" },
                  { name: "Suresh Patil", role: "Site Supervisor", task: "Excavation Inspection", start: 0, end: 4, color: "bg-primary" },
                  { name: "Mohammad Salim", role: "MEP Engineer", task: "Conduit Routing & Fixes", start: 5, end: 12, color: "from-success to-emerald-400" },
                  { name: "Vikas Sharma", role: "QC Inspector", task: "Steel Rebar Check", start: 3, end: 5, color: "from-warning to-amber-400" }
                ].map((row, idx) => (
                  <div key={idx} className="flex items-stretch min-h-[72px]">
                    {/* Employee Profile */}
                    <div className="w-48 p-4 border-r border-border-custom flex flex-col justify-center shrink-0 bg-background/25">
                      <span className="font-semibold text-foreground text-xs">{row.name}</span>
                      <span className="text-[10px] text-muted mt-0.5">{row.role}</span>
                    </div>

                    {/* Gantt cells */}
                    <div className="flex-1 flex relative items-center">
                      {/* Grid background lines */}
                      {Array.from({ length: 15 }).map((_, cIdx) => (
                        <div key={cIdx} className="absolute inset-y-0 border-r border-border-custom" style={{ left: `${(cIdx / 15) * 100}%`, width: "1px" }} />
                      ))}

                      {/* Floating Gantt Bar */}
                      <div
                        className={`absolute h-8 rounded-lg bg-gradient-to-r ${row.color} p-2 flex items-center justify-between text-[9px] font-bold text-black shadow-lg overflow-hidden transition-all duration-300 hover:scale-[1.02]`}
                        style={{
                          left: `${(row.start / 15) * 100}%`,
                          width: `${((row.end - row.start + 1) / 15) * 100}%`
                        }}
                      >
                        <span className="truncate">{row.task}</span>
                        <span>{row.end - row.start + 1}d</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timesheet Tab */}
      {activeTab === "timesheet" && (
        <div className="flex-1 flex flex-col min-h-0 bg-card border border-border-custom rounded-lg overflow-hidden">
          {/* Action Bar */}
          <div className="p-4 border-b border-border-custom bg-white/[0.01] flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsDateFilterOpen(true)}
                className="px-3 py-1.5 bg-card border border-border-custom rounded-md text-xs font-medium hover:bg-elevated text-foreground flex items-center gap-2 cursor-pointer"
              >
                <span>📅 Filter: {selectedDateFilter}</span>
              </button>
            </div>

            <button
              onClick={() => setIsNewTimesheetOpen(true)}
              className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              + New Timesheet
            </button>
          </div>

          {/* Timesheet List Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Employee/Labor</th>
                  <th className="px-5 py-3">Project</th>
                  <th className="px-5 py-3">Tasks</th>
                  <th className="px-6 py-4 text-right">Hours Logged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredTimesheetEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted font-semibold">
                      No timesheet logs found matching date criteria. Click "+ New Timesheet" to create a log.
                    </td>
                  </tr>
                ) : (
                  filteredTimesheetEntries.map((ts) => (
                    <tr key={ts.id} className="hover:bg-background/25 transition-all">
                      <td className="px-6 py-4 text-foreground">
                        {new Date(ts.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-bold text-white">
                        {ts.employee_name}
                      </td>
                      <td className="px-6 py-4 text-muted font-medium">
                        {ts.project_name}
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {ts.activity_description || "Site Operations"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-success text-sm">
                        {ts.hours} hrs
                        {ts.start_time && (
                          <span className="block text-[9px] text-muted mt-0.5">
                            {ts.start_time.split("T")[1].slice(0,5)} - {ts.end_time?.split("T")[1].slice(0,5)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Date Filter Modal */}
      {isDateFilterOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-sm bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border-custom flex justify-between items-center">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Select Date Range</h3>
              <button onClick={() => setIsDateFilterOpen(false)} className="text-muted hover:text-foreground font-bold">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {["All", "Today", "Yesterday", "Custom"].map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setSelectedDateFilter(f);
                      if (f !== "Custom") setIsDateFilterOpen(false);
                    }}
                    className={`py-2 px-3 rounded-lg border text-xs font-bold text-center transition-all cursor-pointer ${
                      selectedDateFilter === f
                        ? "bg-primary border-primary text-white"
                        : "bg-elevated border-border-custom text-muted hover:text-foreground"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {selectedDateFilter === "Custom" && (
                <div className="space-y-3 pt-2 border-t border-border-custom">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Start Date</label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">End Date</label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => setIsDateFilterOpen(false)}
                    className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-md shadow-sm transition-all mt-2 cursor-pointer"
                  >
                    Apply Range
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Timesheet Drawer Modal */}
      {isNewTimesheetOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border-custom flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Log Work Timesheet</h3>
              <button onClick={() => setIsNewTimesheetOpen(false)} className="text-muted hover:text-foreground font-bold">×</button>
            </div>

            <form onSubmit={handleCreateTimesheet} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Employee / Labor Name *</label>
                <input
                  type="text"
                  required
                  value={tsEmployeeName}
                  onChange={(e) => setTsEmployeeName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Select Project *</label>
                <select
                  value={tsProjectId}
                  onChange={(e) => setTsProjectId(e.target.value)}
                  required
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                >
                  <option value="" disabled>Select project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Date</label>
                <input
                  type="date"
                  value={tsDate}
                  onChange={(e) => setTsDate(e.target.value)}
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Start Time</label>
                  <input
                    type="time"
                    value={tsStartTime}
                    onChange={(e) => setTsStartTime(e.target.value)}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">End Time</label>
                  <input
                    type="time"
                    value={tsEndTime}
                    onChange={(e) => setTsEndTime(e.target.value)}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-medium text-muted uppercase tracking-wider">
                  <span>Computed Duration</span>
                  <span className="text-success font-semibold">{tsHours} hours</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Remarks / Description</label>
                <textarea
                  value={tsActivity}
                  onChange={(e) => setTsActivity(e.target.value)}
                  placeholder="e.g. Mason work on second floor brick masonry."
                  rows={2}
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border-custom">
                <button
                  type="button"
                  onClick={() => alert("Photo upload integration ready! (Camera API mock)")}
                  className="w-full py-2 border border-border-custom hover:bg-white/5 rounded-md text-muted font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  📷 Attach Photo / File
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium text-sm rounded-md shadow-sm transition-all mt-2 cursor-pointer"
              >
                Log Entry
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
