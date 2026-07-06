"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

interface Project {
  id: string;
  name: string;
  code: string;
  status: string;
  city: string;
  progress?: number;
  cashflow_in?: number;
  cashflow_out?: number;
}

interface PaymentRequest {
  id: string;
  amount: number;
  status: string;
}

interface Indent {
  id: string;
  indent_number: string;
  status: string;
  project_id: string;
  created_at: string;
  items: Array<{ material_name: string; quantity: number; unit: string }>;
}

interface Leave {
  id: string;
  employee_name: string;
  leave_type: string;
  days_count: number;
  status: string;
  start_date: string;
  end_date: string;
}

export default function ProjectsHomePage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const [projects, setProjects] = useState<Project[]>([]);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [indents, setIndents] = useState<Indent[]>([]);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [todoCount, setTodoCount] = useState(3);
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // States for drawers & popups
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [isMaterialDrawerOpen, setIsMaterialDrawerOpen] = useState(false);

  // New Project Form state
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectCode, setNewProjectCode] = useState("");
  const [newProjectCity, setNewProjectCity] = useState("Bangalore");

  // Material requests drawer tab and filter states
  const [mrTab, setMrTab] = useState<"pending" | "approved" | "ordered" | "rejected">("pending");
  const [mrProjectFilter, setMrProjectFilter] = useState("");
  const [mrSearchFilter, setMrSearchFilter] = useState("");

  // Projects filter and search states
  const [stageFilter, setStageFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const apiHost = getApiHost();

  const fetchData = async () => {
    if (!companyId) return;
    try {
      // 1. Projects
      const projectsRes = await fetch(`${apiHost}/apis/v3/company/${companyId}/projects`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data);
      }

      // 2. Payments / Approvals
      const paymentsRes = await fetch(`${apiHost}/apis/v3/company/${companyId}/payment-requests`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPaymentRequests(data);
      }

      // 3. Indents
      const indentsRes = await fetch(`${apiHost}/apis/v3/procurement/indents?company_id=${companyId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (indentsRes.ok) {
        const data = await indentsRes.json();
        setIndents(data);
      }

      // 4. Leaves
      const leavesRes = await fetch(`${apiHost}/apis/v3/company/${companyId}/leaves`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (leavesRes.ok) {
        const data = await leavesRes.json();
        setLeaves(data);
      }
    } catch (err) {
      console.error("Error fetching projects dashboard data:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [companyId, accessToken]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiHost}/apis/v3/company/${companyId}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          name: newProjectName,
          code: newProjectCode || `PROJ-${Math.floor(100 + Math.random() * 900)}`,
          city: newProjectCity,
          status: "Ongoing"
        })
      });
      if (res.ok) {
        showToast("Project created successfully!");
        setNewProjectName("");
        setNewProjectCode("");
        setIsNewProjectOpen(false);
        fetchData();
      } else {
        const errData = await res.json();
        showToast(`Failed: ${errData.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      showToast("Error creating project.");
    }
  };

  const handleCreateDemoLeave = async () => {
    try {
      const res = await fetch(`${apiHost}/apis/v3/company/${companyId}/leaves`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          employee_name: "Yash Desai",
          leave_type: "Privilege Leave",
          days_count: 3,
          start_date: "2026-07-10",
          end_date: "2026-07-13",
          status: "Pending"
        })
      });
      if (res.ok) {
        fetchData();
        showToast("Demo leave request generated!");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveLeave = async (leaveId: string, targetStatus: "Approved" | "Rejected") => {
    try {
      const res = await fetch(`${apiHost}/apis/v3/company/${companyId}/leaves/${leaveId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.ok) {
        fetchData();
        showToast(`Leave request ${targetStatus.toLowerCase()}!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Computations
  const pendingApprovalsCount = paymentRequests.filter((p) => p.status.toLowerCase() === "pending").length;
  const pendingMaterialsCount = indents.filter((i) => i.status.toLowerCase() === "pending").length;
  const pendingLeavesCount = leaves.filter((l) => l.status.toLowerCase() === "pending").length;

  const filteredProjects = projects.filter((p) => {
    // Stage Filter
    if (stageFilter !== "All" && p.status !== stageFilter) return false;
    // Search Query
    if (searchQuery) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const filteredIndents = indents.filter((ind) => {
    if (ind.status.toLowerCase() !== mrTab) return false;
    if (mrProjectFilter && ind.project_id !== mrProjectFilter) return false;
    if (mrSearchFilter) {
      const matchesMat = ind.items.some((item) => item.material_name.toLowerCase().includes(mrSearchFilter.toLowerCase()));
      const matchesNum = ind.indent_number.toLowerCase().includes(mrSearchFilter.toLowerCase());
      return matchesMat || matchesNum;
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
      {/* Leave Management Banner */}
      <div className="rounded-lg bg-card border border-border-custom p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold uppercase tracking-wider">Leave Management</span>
            {pendingLeavesCount > 0 && (
              <span className="text-xs bg-success/10 text-success px-2 py-0.5 rounded font-semibold">{pendingLeavesCount} Pending</span>
            )}
          </div>
          <h2 className="text-base font-semibold text-foreground">Approve Leave Requests of your site team</h2>
          <p className="text-xs text-muted max-w-2xl">
            Enable auto attendance logs computation, leave balance updates & payroll line reconciliation directly inside SiteFlow.
          </p>
        </div>
        <button
          onClick={() => setIsLeaveModalOpen(true)}
          className="shrink-0 px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-xs font-medium text-white shadow-sm transition-all cursor-pointer"
        >
          Open Leave Manager
        </button>
      </div>

      {/* KPI Cards Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Approvals */}
        <Link
          href={`/c/${companyId}/d/payment-approval`}
          className="rounded-lg bg-card border border-border-custom p-5 hover:border-primary/35 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div className="text-muted text-xs font-medium uppercase tracking-wider">Approval (Pending)</div>
            <span className="text-lg shrink-0">💵</span>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-2xl font-semibold text-foreground">{pendingApprovalsCount}</span>
            <span className="text-xs text-muted font-normal">requests</span>
          </div>
        </Link>

        {/* Material Request */}
        <div
          onClick={() => setIsMaterialDrawerOpen(true)}
          className="rounded-lg bg-card border border-border-custom p-5 hover:border-primary/35 hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div className="text-muted text-xs font-medium uppercase tracking-wider">Material (Pending)</div>
            <span className="text-lg shrink-0">📦</span>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-2xl font-semibold text-foreground">{pendingMaterialsCount}</span>
            <span className="text-xs text-muted font-normal">indents</span>
          </div>
        </div>

        {/* To Do */}
        <Link
          href={`/c/${companyId}/d/todo`}
          className="rounded-lg bg-card border border-border-custom p-5 hover:border-primary/35 hover:shadow-sm transition-all flex flex-col justify-between"
        >
          <div className="flex justify-between items-start">
            <div className="text-muted text-xs font-medium uppercase tracking-wider">To Do (Pending)</div>
            <span className="text-lg shrink-0">✅</span>
          </div>
          <div className="flex items-baseline gap-2 mt-4">
            <span className="text-2xl font-semibold text-foreground">{todoCount}</span>
            <span className="text-xs text-muted font-normal">items</span>
          </div>
        </Link>
      </div>

      {/* Filter and Table Section */}
      <div className="space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
          {/* Left Side Active Info */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">All Projects</span>
            <span className="px-2 py-0.5 bg-elevated border border-border-custom rounded text-xs text-muted font-medium">
              {filteredProjects.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stage filter dropdown */}
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="input-field"
            >
              <option value="All">All Stages</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search project name..."
              className="input-field placeholder-muted"
            />

            <button
              onClick={() => showToast("Exporting project ledger report to CSV...")}
              className="px-3 py-2 bg-card border border-border-custom rounded-md text-xs font-medium hover:bg-elevated transition-all cursor-pointer"
            >
              Export
            </button>

            <button
              onClick={() => setIsNewProjectOpen(true)}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-md text-xs font-medium shadow-sm transition-all cursor-pointer"
            >
              + New Project
            </button>
          </div>
        </div>

        {/* Projects Table */}
        <div className="rounded-lg border border-border-custom bg-card overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Progress</th>
                <th className="px-6 py-3.5 text-right">In / Out</th>
                <th className="px-6 py-3.5 text-center">To Do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-custom">
              {filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted font-medium">
                    No active projects. Click "+ New Project" to create one.
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => (
                  <tr key={p.id} className="hover:bg-elevated/20 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/c/${companyId}/p/${p.id}/planning/gantt`} className="text-foreground hover:text-primary font-medium transition-colors text-sm">
                        {p.name}
                      </Link>
                      <span className="block text-xs text-muted mt-1 uppercase tracking-wider font-normal">
                        {p.code} • {p.city}
                      </span>
                    </td>
                    <td className="px-6 py-4 w-1/4">
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 bg-elevated rounded-full flex-1 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${p.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-muted">{p.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="text-success font-semibold text-sm">₹{(p.cashflow_in || 0).toLocaleString()}</div>
                      <div className="text-danger font-medium text-xs mt-0.5">₹{(p.cashflow_out || 0).toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/c/${companyId}/d/todo`}
                          className="px-2.5 py-1 bg-elevated border border-border-custom text-foreground rounded text-xs hover:bg-elevated/80 font-medium transition-all"
                        >
                          View Tasks
                        </Link>
                        <button
                          onClick={() => {
                            setTodoCount((c) => c + 1);
                            showToast("Task quick-added to WBS backlog!");
                          }}
                          className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold hover:bg-primary/20 transition-all cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leave Management Modal */}
      {isLeaveModalOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-border-custom flex justify-between items-center bg-card">
              <div>
                <h3 className="text-base font-semibold text-foreground">Leave Requests Manager</h3>
                <p className="text-xs text-muted mt-1">Review pending leave applications from your active site crew.</p>
              </div>
              <button
                onClick={() => setIsLeaveModalOpen(false)}
                className="text-muted hover:text-foreground font-semibold text-xl cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* List */}
            <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
              {leaves.length === 0 ? (
                <div className="text-center py-12 space-y-4">
                  <p className="text-xs text-muted">No leave requests found in database.</p>
                  <button
                    onClick={handleCreateDemoLeave}
                    className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-medium rounded-md shadow-sm transition-all cursor-pointer"
                  >
                    + Create Demo Leave Request
                  </button>
                </div>
              ) : (
                leaves.map((l) => (
                  <div key={l.id} className="p-4 bg-elevated/20 border border-border-custom rounded-lg flex justify-between items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{l.employee_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider ${
                          l.status === "Approved" ? "bg-success/10 text-success" : l.status === "Rejected" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                        }`}>{l.status}</span>
                      </div>
                      <p className="text-xs text-muted">
                        Type: <span className="text-foreground font-medium">{l.leave_type}</span> • Duration: <span className="text-foreground font-medium">{l.days_count} Days</span>
                      </p>
                    </div>

                    {l.status === "Pending" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveLeave(l.id, "Rejected")}
                          className="px-3 py-1.5 border border-border-custom text-foreground text-xs font-medium rounded-md hover:bg-elevated transition-all cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleApproveLeave(l.id, "Approved")}
                          className="px-3 py-1.5 bg-success hover:bg-success/90 text-white text-xs font-medium rounded-md transition-all cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Project Drawer Modal */}
      {isNewProjectOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-border-custom flex justify-between items-center bg-card">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Add New Project</h3>
              <button onClick={() => setIsNewProjectOpen(false)} className="text-muted hover:text-foreground font-semibold text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleCreateProject} className="p-5 space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Project Name *</label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="e.g. Skyline Residency"
                  className="input-field w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Project Code</label>
                <input
                  type="text"
                  value={newProjectCode}
                  onChange={(e) => setNewProjectCode(e.target.value)}
                  placeholder="e.g. SKY-01"
                  className="input-field w-full"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">City</label>
                <input
                  type="text"
                  value={newProjectCity}
                  onChange={(e) => setNewProjectCity(e.target.value)}
                  placeholder="e.g. Bangalore"
                  className="input-field w-full"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-md text-sm shadow-sm transition-all mt-4 cursor-pointer"
              >
                Create Project
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Material requests drawer panel */}
      {isMaterialDrawerOpen && (
        <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-card border-l border-border-custom shadow-lg z-50 flex flex-col justify-between animate-in slide-in-from-right duration-200">
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border-custom flex justify-between items-center bg-sidebar">
              <div>
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Material Requests</h3>
                <p className="text-xs text-muted mt-0.5">Approve, order, and track status of project raw material indent requests.</p>
              </div>
              <button
                onClick={() => setIsMaterialDrawerOpen(false)}
                className="text-muted hover:text-foreground font-semibold text-lg cursor-pointer"
              >
                ×
              </button>
            </div>

            {/* Inner Subtabs */}
            <div className="flex border-b border-border-custom bg-sidebar px-5 py-2 gap-4">
              {(["pending", "approved", "ordered", "rejected"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMrTab(tab)}
                  className={`text-xs font-semibold uppercase tracking-wider py-1 border-b-2 cursor-pointer transition-all ${
                    mrTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted hover:text-foreground"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Filters */}
            <div className="p-5 bg-elevated/20 border-b border-border-custom grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Filter by Project</label>
                <select
                  value={mrProjectFilter}
                  onChange={(e) => setMrProjectFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider">Search Material / Indent</label>
                <input
                  type="text"
                  value={mrSearchFilter}
                  onChange={(e) => setMrSearchFilter(e.target.value)}
                  placeholder="e.g. Cement, Steel"
                  className="input-field placeholder-muted"
                />
              </div>
            </div>

            {/* Indent List */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {filteredIndents.length === 0 ? (
                <div className="text-center py-12 text-xs text-muted font-medium">
                  No material indents found matching tab "{mrTab}".
                </div>
              ) : (
                filteredIndents.map((ind) => (
                  <div key={ind.id} className="p-4 rounded-lg bg-card border border-border-custom space-y-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xs font-semibold text-foreground">{ind.indent_number}</span>
                        <span className="text-xs text-muted ml-2 uppercase">
                          {projects.find((p) => p.id === ind.project_id)?.name || "Unknown Project"}
                        </span>
                      </div>
                      <span className="text-xs text-muted">
                        {new Date(ind.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="space-y-1 border-t border-border-custom pt-2">
                      {ind.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span className="text-foreground font-medium">{item.material_name}</span>
                          <span className="text-muted font-medium">
                            {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>

                    {ind.status === "pending" && (
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch(`${apiHost}/apis/v3/procurement/indents/${ind.id}/approve`, {
                                method: "POST",
                                headers: { "Authorization": `Bearer ${accessToken}` }
                              });
                              if (res.ok) {
                                fetchData();
                                showToast("Material indent approved!");
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="px-3 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-md transition-all cursor-pointer"
                        >
                          Approve Indent
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Global Toast Message in layout - but local backup in case layout not wrapped */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg z-50 animate-bounce">
          <span>⚡ </span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
