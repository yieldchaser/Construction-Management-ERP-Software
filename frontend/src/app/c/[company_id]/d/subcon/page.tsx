"use client";
import Badge, { type BadgeTone } from "@/components/ui/Badge";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import { getApiHost, readErrorDetail } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";
import Icon from "@/components/marketing/Icon";
import { isMissingOrDemoTenant, redirectToLogin } from "@/lib/company-guard";
import PageShell from "@/components/layout/PageShell";
import PageHeader from "@/components/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { TableSkeleton } from "@/components/ui/Skeleton";
import FieldHint from "@/components/ui/FieldHint";
import SegmentedTabs from "@/components/ui/Tabs";

interface WorkOrder {
  id: string;
  sNo: number;
  subContractor: string;
  progress: string;
  progressPct?: number | null;
  woValue: number;
  billedValue: number;
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected";
}

interface Subcontractor {
  id: string;
  name: string;
  gstin?: string | null;
  phone?: string | null;
}

interface AttendanceLog {
  id: string;
  project_id: string;
  subcontractor_id: string;
  attendance_date: string;
  labor_role: string;
  worker_count: number;
  shift_multiplier: number;
  overtime_hours: number;
  allowance: number;
  deduction: number;
  notes?: string | null;
  created_at: string;
}

interface Scorecard {
  id: string;
  company_id: string;
  project_id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  period_start: string;
  period_end: string;
  on_time_pct: number;
  billing_accuracy_pct: number;
  quality_score: number;
  tasks_completed: number;
  tasks_delayed: number;
  total_billed: number;
  disputes_count: number;
}

export default function SubconPage() {
  const params = useParams();
  const router = useRouter();
  const { activeProjectId } = useProject();
  const companyId = params?.company_id as string;

  useEffect(() => {
    if (isMissingOrDemoTenant(companyId)) {
      redirectToLogin();
    }
  }, [companyId]);
  const projectId = activeProjectId;

  const [activeTab, setActiveTab] = useState<"work_orders" | "attendance" | "performance">("work_orders");

  // Real backend-backed data
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(false);

  // Attendance state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split("T")[0]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [attendanceForm, setAttendanceForm] = useState({
    subcontractor_id: "",
    labor_role: "Mason",
    worker_count: 1,
    shift_multiplier: 1.0,
    overtime_hours: 0,
    allowance: 0,
    deduction: 0,
    notes: "",
  });

  // Performance state
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [scorecardsLoading, setScorecardsLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Modals & Drawers
  const [showWOModal, setShowWOModal] = useState(false);
  const [showAddPartyDrawer, setShowAddPartyDrawer] = useState(false);

  // Form states
  const [woForm, setWoForm] = useState({
    partyId: "",
    date: new Date().toISOString().split("T")[0]
  });

  const [partyForm, setPartyForm] = useState({
    name: "",
    phone: "",
    email: "",
    gstin: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    address: ""
  });

  const fetchSubconData = async () => {
    if (!projectId || isMissingOrDemoTenant(companyId)) return;
    setLoading(true);
    try {
      const [woRes, subRes] = await Promise.all([
        fetch(`${getApiHost()}/apis/v3/billing/work-orders?project_id=${projectId}`, { headers: authHeaders() }),
        fetch(`${getApiHost()}/apis/v3/billing/subcontractors?company_id=${companyId}`, { headers: authHeaders() }),
      ]);
      if (woRes.ok) {
        const data = await woRes.json();
        setWorkOrders(
          (data as any[]).map((wo: any, i: number) => ({
            id: wo.wo_number || wo.id,
            sNo: i + 1,
            subContractor: wo.subcontractor_name || "Unknown",
            progress: wo.progress_pct !== null && wo.progress_pct !== undefined ? `${Math.min(100, Math.max(0, wo.progress_pct))}%` : "—",
            progressPct: wo.progress_pct !== null && wo.progress_pct !== undefined ? Number(wo.progress_pct) : null,
            woValue: Number(wo.estimated_work_amount) || 0,
            billedValue: Number(wo.billed_amount) || 0,
            status: wo.status || "—",
          }))
        );
      }
      if (subRes.ok) {
        const data = await subRes.json();
        setSubcontractors(
          (data as any[]).map((t: any) => ({
            id: String(t.company_team_id),
            name: t.name,
            gstin: t.gstin ?? null,
            phone: t.phone ?? null,
          }))
        );
      }
    } catch (e) {
      console.error("Failed to load subcon data", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendance = async (dateStr?: string) => {
    if (!projectId) return;
    const d = dateStr || attendanceDate;
    setAttendanceLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/attendance/${projectId}/${d}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setAttendanceLogs(Array.isArray(data) ? data : []);
      } else {
        setAttendanceLogs([]);
      }
    } catch (e) {
      console.error("Failed to load attendance", e);
      setAttendanceLogs([]);
    } finally {
      setAttendanceLoading(false);
    }
  };

  const handleDeleteAttendance = async (attId: string) => {
    if (!confirm("Are you sure you want to delete this attendance log?")) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/attendance/${attId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        showToast("Attendance log deleted successfully");
        fetchAttendance(attendanceDate);
      } else {
        const err = await readErrorDetail(res);
        alert(err || "Failed to delete attendance log");
      }
    } catch (e) {
      console.error("Delete attendance error", e);
      alert("Failed to delete attendance log. Check your connection.");
    }
  };

  const handleCreateAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !attendanceForm.subcontractor_id) {
      alert("Please select a subcontractor!");
      return;
    }
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          project_id: projectId,
          subcontractor_id: attendanceForm.subcontractor_id,
          attendance_date: new Date(attendanceDate).toISOString(),
          labor_role: attendanceForm.labor_role,
          worker_count: Number(attendanceForm.worker_count) || 1,
          shift_multiplier: Number(attendanceForm.shift_multiplier) || 1.0,
          overtime_hours: Number(attendanceForm.overtime_hours) || 0,
          allowance: Number(attendanceForm.allowance) || 0,
          deduction: Number(attendanceForm.deduction) || 0,
          notes: attendanceForm.notes || null,
        }),
      });
      if (res.ok) {
        setShowAttendanceModal(false);
        setAttendanceForm({
          subcontractor_id: "",
          labor_role: "Mason",
          worker_count: 1,
          shift_multiplier: 1.0,
          overtime_hours: 0,
          allowance: 0,
          deduction: 0,
          notes: "",
        });
        showToast("Attendance recorded successfully");
        fetchAttendance(attendanceDate);
      } else {
        const err = await readErrorDetail(res);
        alert(err || "Failed to record attendance");
      }
    } catch (err) {
      console.error(err);
      alert("Network error recording attendance");
    }
  };

  const fetchScorecards = async () => {
    if (!projectId) return;
    setScorecardsLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/scorecards/${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setScorecards(Array.isArray(data) ? data : []);
      } else {
        setScorecards([]);
      }
    } catch (e) {
      console.error("Failed to load scorecards", e);
      setScorecards([]);
    } finally {
      setScorecardsLoading(false);
    }
  };

  const handleDeletePerformance = async (recordId: string) => {
    if (!confirm("Are you sure you want to delete this performance scorecard?")) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/subcon/performance/${recordId}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (res.ok) {
        showToast("Performance scorecard deleted successfully");
        fetchScorecards();
      } else {
        const err = await readErrorDetail(res);
        alert(err || "Failed to delete scorecard");
      }
    } catch (e) {
      console.error("Delete scorecard error", e);
      alert("Failed to delete scorecard. Check your connection.");
    }
  };

  useEffect(() => {
    fetchSubconData();
    if (activeTab === "attendance") {
      fetchAttendance(attendanceDate);
    } else if (activeTab === "performance") {
      fetchScorecards();
    }
  }, [projectId, companyId, activeTab]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleCreateWorkorder = async () => {
    if (!woForm.partyId) {
      alert("Please select a subcontractor!");
      return;
    }
    if (!projectId) {
      alert("No active project selected.");
      return;
    }
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/work-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          subcontractor_id: woForm.partyId,
          wo_number: `WO-${Date.now().toString().slice(-6)}`,
          wo_date: new Date(woForm.date).toISOString(),
          terms: "",
          items: [],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create work order");
      }
      await fetchSubconData();
      setShowWOModal(false);
      showToast("Subcontractor Workorder created successfully!");
    } catch (err: any) {
      alert(err?.message || "Error creating work order");
    }
  };

  const handleSaveParty = async () => {
    if (!partyForm.name) {
      alert("Please specify the subcontractor name!");
      return;
    }
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/subcontractors`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          name: partyForm.name,
          phone: partyForm.phone || null,
          email: partyForm.email || null,
          tax_no: partyForm.gstin || null,
          bank_name: partyForm.bank_name || null,
          account_number: partyForm.account_number || null,
          ifsc_code: partyForm.ifsc_code || null,
          address: partyForm.address || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to create subcontractor");
      }
      await fetchSubconData();
      setShowAddPartyDrawer(false);
      showToast(`Subcontractor ${partyForm.name} created successfully!`);
      setPartyForm({
        name: "",
        phone: "",
        email: "",
        gstin: "",
        bank_name: "",
        account_number: "",
        ifsc_code: "",
        address: ""
      });
    } catch (err: any) {
      alert(err?.message || "Error creating subcontractor");
    }
  };

  const filteredWO = workOrders.filter(wo =>
    wo.subContractor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-sans">
      <PageHeader
        title="Subcontractor Management"
        subtitle="Work orders, daily roll call attendance, and subcontractor performance scorecards"
      >
        <div className="flex items-center gap-2">
          {activeTab === "work_orders" && (
            <button
              onClick={() => setShowWOModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer"
            >
              + Sub Con Work Order
            </button>
          )}
          {activeTab === "attendance" && (
            <button
              onClick={() => setShowAttendanceModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/95 transition-all cursor-pointer"
            >
              + Record Attendance
            </button>
          )}
        </div>
      </PageHeader>

      <div className="px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        <SegmentedTabs
          tabs={[
            { id: "work_orders", label: "Work Orders", icon: <Icon name="briefcase" className="w-3.5 h-3.5" /> },
            { id: "attendance", label: "Daily Attendance", icon: <Icon name="calendar" className="w-3.5 h-3.5" /> },
            { id: "performance", label: "Performance Scorecards", icon: <Icon name="star" className="w-3.5 h-3.5" /> },
          ]}
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as any)}
        />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">

        {/* ── WORK ORDERS TAB ── */}
        {activeTab === "work_orders" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Top actions bar */}
            <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="Search Sub Contractor..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-card border border-border-custom rounded-lg pl-9 pr-4 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary"
                />
                <span className="absolute left-3 top-2.5 text-muted text-sm inline-flex"><Icon name="search" className="w-3.5 h-3.5" /></span>
              </div>
            </div>

            {/* Main table view matching Screenshot 1/2 */}
            <div className="flex-1 overflow-y-auto p-6 bg-elevated/10">
              <div className="bg-card border border-border-custom rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-elevated border-b border-border-custom text-muted text-[10px] uppercase font-bold tracking-wider">
                    <tr>
                      <th className="px-4 py-3">S.No.</th>
                      <th className="px-4 py-3">Work Order</th>
                      <th className="px-4 py-3">Sub Contractor</th>
                      <th className="px-4 py-3">Physical Progress</th>
                      <th className="px-4 py-3">Work Order Value</th>
                      <th className="px-4 py-3">Billed Value</th>
                      <th className="px-4 py-3">Approval Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/40">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="p-4">
                          <TableSkeleton rows={5} cols={7} />
                        </td>
                      </tr>
                    ) : filteredWO.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8">
                          <EmptyState
                            title="No subcontractor work orders found"
                            description={searchQuery ? "No work orders match your search query." : "Create subcontractor work orders to track billed value and approvals."}
                            action={!searchQuery ? { label: "Add Subcontractor", onClick: () => setShowAddPartyDrawer(true) } : undefined}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredWO.map(wo => (
                        <tr key={wo.id} className="hover:bg-elevated/40 transition-colors">
                          <td className="px-4 py-3 text-muted">{wo.sNo}</td>
                          <td className="px-4 py-3 font-sans text-muted">{wo.id}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{wo.subContractor}</td>
                          <td className="px-4 py-3 text-muted">
                            {wo.progressPct !== null && wo.progressPct !== undefined ? (
                              <div className="flex items-center gap-2">
                                <div className="w-20 bg-background h-1.5 rounded-full overflow-hidden border border-border-custom">
                                  <div className="bg-primary h-full" style={{ width: `${Math.min(100, Math.max(0, wo.progressPct))}%` }}></div>
                                </div>
                                <span>{wo.progress}</span>
                              </div>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-bold text-foreground">{fmt(wo.woValue)}</td>
                          <td className="px-4 py-3 text-muted">{fmt(wo.billedValue)}</td>
                          <td className="px-4 py-3">
                            <Badge tone={wo.status === "Approved" ? "success" : wo.status === "Pending Approval" ? "warning" : "neutral"} className="font-bold">{wo.status}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Subcontractor Directory — company subcontractors (userless team + party) */}
              <div className="mt-6 bg-card border border-border-custom rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-border-custom text-[10px] uppercase font-bold tracking-wider text-muted">Subcontractor Directory</div>
                {loading ? (
                  <div className="px-4 py-8 text-center text-muted text-xs">Loading subcontractors...</div>
                ) : subcontractors.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="No subcontractors yet"
                      description="Subcontractors added during work order creation will appear in this company directory."
                      action={{
                        label: "+ New Work Order",
                        onClick: () => setShowWOModal(true),
                      }}
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-border-custom/40">
                    {subcontractors.map(p => (
                      <li key={p.id} className="px-4 py-3 flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{p.name}</span>
                        <span className="text-muted">{p.gstin ? `GSTIN ${p.gstin}` : (p.phone || "—")}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── DAILY ATTENDANCE TAB ── */}
        {activeTab === "attendance" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 bg-card border border-border-custom rounded-xl p-4">
              <div className="flex items-center gap-3">
                <label className="text-xs font-bold text-foreground uppercase tracking-wider">Attendance Date:</label>
                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) => {
                    const newD = e.target.value;
                    setAttendanceDate(newD);
                    fetchAttendance(newD);
                  }}
                  className="bg-background border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => fetchAttendance(attendanceDate)}
                  className="px-3 py-1.5 bg-elevated hover:bg-card border border-border-custom text-foreground rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <Icon name="refresh" className="w-3.5 h-3.5" /> Refresh
                </button>
              </div>
              <div className="text-xs text-muted">
                Showing logs for: <strong className="text-foreground">{attendanceDate}</strong> ({attendanceLogs.length} entries)
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-card border border-border-custom rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-elevated border-b border-border-custom text-muted text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">S.No.</th>
                    <th className="px-4 py-3">Subcontractor</th>
                    <th className="px-4 py-3">Labor Role</th>
                    <th className="px-4 py-3 text-right">Workers</th>
                    <th className="px-4 py-3 text-right">OT Hours</th>
                    <th className="px-4 py-3 text-right">Allowance</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/40">
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted">
                        Loading daily attendance logs...
                      </td>
                    </tr>
                  ) : attendanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8">
                        <EmptyState
                          title={`No attendance logged for ${attendanceDate}`}
                          description="Use the '+ Record Attendance' button to log crew counts and overtime."
                          action={{
                            label: "+ Record Attendance",
                            onClick: () => setShowAttendanceModal(true),
                          }}
                        />
                      </td>
                    </tr>
                  ) : (
                    attendanceLogs.map((log, idx) => {
                      const subName = subcontractors.find(s => s.id === log.subcontractor_id)?.name || "Subcontractor";
                      return (
                        <tr key={log.id} className="hover:bg-elevated/40 transition-colors">
                          <td className="px-4 py-3 text-muted">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-foreground">{subName}</td>
                          <td className="px-4 py-3">
                            <span className="bg-elevated px-2 py-0.5 rounded text-[10px] font-bold text-foreground">{log.labor_role}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-foreground font-sans">{log.worker_count}</td>
                          <td className="px-4 py-3 text-right font-sans text-muted">{log.overtime_hours > 0 ? `${log.overtime_hours} hrs` : "—"}</td>
                          <td className="px-4 py-3 text-right font-sans text-muted">{log.allowance > 0 ? `₹${log.allowance}` : "—"}</td>
                          <td className="px-4 py-3 text-muted">{log.notes || "—"}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteAttendance(log.id)}
                              className="px-2 py-1 bg-elevated hover:bg-danger/10 border border-border-custom text-muted hover:text-danger rounded text-[10px] font-semibold cursor-pointer"
                              title="Delete attendance entry"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PERFORMANCE SCORECARDS TAB ── */}
        {activeTab === "performance" && (
          <div className="flex-1 flex flex-col h-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 bg-card border border-border-custom rounded-xl p-4">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Subcontractor Performance Evaluations</h3>
                <p className="text-[10px] text-muted">Quality scores, on-time task delivery ratios, and billing accuracy evaluations</p>
              </div>
              <button
                type="button"
                onClick={fetchScorecards}
                className="px-3 py-1.5 bg-elevated hover:bg-card border border-border-custom text-foreground rounded text-xs font-semibold cursor-pointer inline-flex items-center gap-1"
              >
                <Icon name="refresh" className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-card border border-border-custom rounded-xl overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-elevated border-b border-border-custom text-muted text-[10px] uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Subcontractor</th>
                    <th className="px-4 py-3">Evaluation Period</th>
                    <th className="px-4 py-3 text-right">Quality Score</th>
                    <th className="px-4 py-3 text-right">On-Time %</th>
                    <th className="px-4 py-3 text-right">Billing Accuracy</th>
                    <th className="px-4 py-3 text-right">Tasks (Done/Delayed)</th>
                    <th className="px-4 py-3 text-right">Total Billed</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/40">
                  {scorecardsLoading ? (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted">
                        Loading performance scorecards...
                      </td>
                    </tr>
                  ) : scorecards.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8">
                        <EmptyState
                          title="No performance scorecards generated"
                          description="Scorecards will be automatically computed and evaluated against project task delivery."
                        />
                      </td>
                    </tr>
                  ) : (
                    scorecards.map((sc) => (
                      <tr key={sc.id} className="hover:bg-elevated/40 transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{sc.subcontractor_name || "Subcontractor"}</td>
                        <td className="px-4 py-3 text-muted">
                          {sc.period_start ? sc.period_start.split("T")[0] : ""} → {sc.period_end ? sc.period_end.split("T")[0] : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-sans font-bold text-foreground">
                          <span className="bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded">
                            {sc.quality_score.toFixed(1)} / 5.0
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-sans font-bold text-success">
                          {Math.round(sc.on_time_pct)}%
                        </td>
                        <td className="px-4 py-3 text-right font-sans font-bold text-foreground">
                          {Math.round(sc.billing_accuracy_pct)}%
                        </td>
                        <td className="px-4 py-3 text-right font-sans text-muted">
                          {sc.tasks_completed} done / {sc.tasks_delayed} delayed
                        </td>
                        <td className="px-4 py-3 text-right font-sans font-bold text-foreground">
                          {fmt(sc.total_billed)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeletePerformance(sc.id)}
                            className="px-2 py-1 bg-elevated hover:bg-danger/10 border border-border-custom text-muted hover:text-danger rounded text-[10px] font-semibold cursor-pointer"
                            title="Delete scorecard"
                          >
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
        )}

        {/* ── Record Attendance Modal ── */}
        {showAttendanceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAttendanceModal(false)}>
            <div className="bg-card border border-border-custom rounded-xl w-full max-w-md p-6 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start pb-3 border-b border-border-custom">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Record Subcontractor Attendance</h3>
                  <p className="text-[10px] text-muted mt-0.5">Date: {attendanceDate}</p>
                </div>
                <button onClick={() => setShowAttendanceModal(false)} className="text-muted hover:text-foreground cursor-pointer"><Icon name="close" className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCreateAttendance} className="space-y-3 my-4 text-xs">
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Subcontractor*</label>
                  <select
                    value={attendanceForm.subcontractor_id}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, subcontractor_id: e.target.value })}
                    required
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Select subcontractor...</option>
                    {subcontractors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Labor Role*</label>
                    <input
                      type="text"
                      value={attendanceForm.labor_role}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, labor_role: e.target.value })}
                      required
                      placeholder="e.g. Mason, Helper, Carpenter"
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Worker Count*</label>
                    <input
                      type="number"
                      min={1}
                      value={attendanceForm.worker_count}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, worker_count: parseInt(e.target.value) || 1 })}
                      required
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary font-sans"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Shift Multiplier</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="3.0"
                      value={attendanceForm.shift_multiplier}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, shift_multiplier: parseFloat(e.target.value) || 1.0 })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">OT Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={attendanceForm.overtime_hours}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, overtime_hours: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary font-sans"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Allowance (₹)</label>
                    <input
                      type="number"
                      min="0"
                      value={attendanceForm.allowance}
                      onChange={(e) => setAttendanceForm({ ...attendanceForm, allowance: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Notes</label>
                  <textarea
                    value={attendanceForm.notes}
                    onChange={(e) => setAttendanceForm({ ...attendanceForm, notes: e.target.value })}
                    placeholder="Work location, section, or notes..."
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary resize-none h-16"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAttendanceModal(false)}
                    className="px-4 py-2 rounded-lg border border-border-custom text-muted hover:text-foreground text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary text-white font-bold rounded-lg text-xs hover:bg-primary/95 transition-all"
                  >
                    Save Attendance
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sub-Con Workorder Modal (Screenshot 3) */}
        {showWOModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowWOModal(false)}>
            <div className="bg-card border border-border-custom rounded-xl w-full max-w-sm p-5 relative overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Sub-Con Workorder</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px] text-muted font-sans">WO number: pending</span>
                  </div>
                </div>
                <button onClick={() => setShowWOModal(false)} className="text-muted hover:text-foreground cursor-pointer"><Icon name="close" className="w-5 h-5" /></button>
              </div>

              <div className="space-y-4 my-4 text-xs">
                <div>
                  <label className="text-[9px] text-muted uppercase font-bold block mb-1">Date</label>
                  <input type="date" value={woForm.date} onChange={e => setWoForm({ ...woForm, date: e.target.value })} className="w-full bg-background border border-border-custom rounded-lg px-2.5 py-1.5 text-foreground text-xs focus:outline-none focus:border-primary" />
                </div>

                <div>
                  <label className="text-[9px] text-muted uppercase font-bold block mb-1">Subcontractor</label>
                  <select
                    value={woForm.partyId}
                    onChange={e => setWoForm({ ...woForm, partyId: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                  >
                    <option value="">Select subcontractor…</option>
                    {subcontractors.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {subcontractors.length === 0 && (
                    <FieldHint text="No subcontractors yet." onAction={() => setShowAddPartyDrawer(true)} actionLabel="Add a subcontractor" />
                  )}

                  <button
                    type="button"
                    onClick={() => setShowAddPartyDrawer(true)}
                    className="w-full mt-2.5 py-3 border border-dashed border-primary/50 text-primary hover:bg-primary/5 font-bold rounded-lg text-xs flex items-center justify-center gap-1 transition-all cursor-pointer"
                  >
                    <span>+ Create Subcontractor</span>
                  </button>
                </div>


              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  onClick={handleCreateWorkorder}
                  className="w-full py-2 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Create Workorder
                </button>
                <button onClick={() => setShowWOModal(false)} className="text-[11px] text-muted hover:text-foreground font-medium self-center mt-1 cursor-pointer">close</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Party Drawer (Screenshot 4) */}
        {showAddPartyDrawer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowAddPartyDrawer(false)}>
            <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Create Subcontractor</h2>
                  <button onClick={() => setShowAddPartyDrawer(false)} className="text-muted hover:text-foreground cursor-pointer"><Icon name="close" className="w-5 h-5" /></button>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Subcontractor Name*</label>
                    <input
                      type="text"
                      placeholder="e.g. Yash Earthworks"
                      value={partyForm.name}
                      onChange={e => setPartyForm({ ...partyForm, name: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Phone Number</label>
                    <input
                      type="tel"
                      placeholder="Phone number"
                      value={partyForm.phone}
                      onChange={e => setPartyForm({ ...partyForm, phone: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Email ID</label>
                    <input
                      type="email"
                      placeholder="email@domain.com"
                      value={partyForm.email}
                      onChange={e => setPartyForm({ ...partyForm, email: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">GSTIN</label>
                    <input
                      type="text"
                      placeholder="e.g. 27AAAAA0000A1Z5"
                      value={partyForm.gstin}
                      onChange={e => setPartyForm({ ...partyForm, gstin: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. SBI"
                        value={partyForm.bank_name}
                        onChange={e => setPartyForm({ ...partyForm, bank_name: e.target.value })}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted uppercase font-bold block mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={partyForm.ifsc_code}
                        onChange={e => setPartyForm({ ...partyForm, ifsc_code: e.target.value })}
                        className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="Bank account number"
                      value={partyForm.account_number}
                      onChange={e => setPartyForm({ ...partyForm, account_number: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted uppercase font-bold block mb-1">Address</label>
                    <textarea
                      placeholder="Corporate address"
                      value={partyForm.address}
                      onChange={e => setPartyForm({ ...partyForm, address: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                      rows={2}
                    />
                  </div>

                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
                <button
                  onClick={handleSaveParty}
                  className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
                >
                  Create Subcontractor
                </button>
                <button onClick={() => setShowAddPartyDrawer(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-foreground hover:border-white/20 text-xs">Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span className="inline-flex"><Icon name="bolt" className="w-3.5 h-3.5" /></span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}