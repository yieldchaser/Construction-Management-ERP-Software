"use client";
import { getApiHost } from "@/lib/api";
import { getApi, authHeaders, resolveCompanyId } from "@/lib/siteflow";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import Icon, { type IconName } from "@/components/marketing/Icon";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  code: string;
  designation: string;
  department: string;
  mobile: string;
  basic: number;
  hra: number;
  allowances: number;
  grossMonthly: number;
  pfPct: number;
  pfEmployerPct: number;
  esiApplicable: boolean;
  tdsMonthly: number;
  status: "active" | "inactive";
  joined: string;
}

interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  punchIn: string;
  punchOut: string;
  hoursWorked: number | null;
  overtime: number | null;
  withinGeofence: boolean;
  status: "Present" | "Absent" | "Half-Day" | "Leave" | "Present (Off-Site)";
  distanceFromSite: number | null;
}

interface Timesheet {
  id: string;
  employeeId: string;
  employeeName: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  status: "draft" | "submitted" | "approved" | "rejected";
}

interface PayslipLine {
  employeeId: string;
  employeeName: string;
  designation: string;
  daysPresent: number;
  daysInMonth: number;
  gross: number;
  basic: number;
  hra: number;
  allowances: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  tds: number;
  totalDeductions: number;
  netPayable: number;
}

interface PayrollRun {
  id: string;
  month: string;
  status: "draft" | "finalized" | "paid";
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  payslips: PayslipLine[];
}

interface LeaveTypeBalance {
  entitled: number;
  used: number;
  balance: number;
}

interface LeaveBalanceRow {
  employee_id: string;
  employee_name: string;
  designation: string;
  template_source: "assigned" | "company_default" | "none";
  casual: LeaveTypeBalance;
  sick: LeaveTypeBalance;
  earned: LeaveTypeBalance;
}

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Component ────────────────────────────────────────────────────────────────

export default function HRPayrollPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [tab, setTab] = useState<"employees" | "attendance" | "timesheets" | "payroll" | "leaves" | "holidays">("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  // Holidays & Calendar states
  const [holidays, setHolidays] = useState<any[]>([]);
  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });
  
  // Workforce Configuration Drawers
  const [showWorkforceDrawer, setShowWorkforceDrawer] = useState(false);
  const [showLibraryDrawer, setShowLibraryDrawer] = useState(false);
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [selectedEmpDetail, setSelectedEmpDetail] = useState<any>(null);
  const [detailsForm, setDetailsForm] = useState({ salaryAmount: "", shiftHours: "", otRate: "", designation: "" });

  useEffect(() => {
    if (selectedEmpDetail) {
      setDetailsForm({
        salaryAmount: selectedEmpDetail.grossMonthly != null ? String(selectedEmpDetail.grossMonthly) : "",
        shiftHours: selectedEmpDetail.shiftHours != null ? String(selectedEmpDetail.shiftHours) : "8",
        otRate: selectedEmpDetail.otRate != null ? String(selectedEmpDetail.otRate) : "150",
        designation: selectedEmpDetail.designation || "",
      });
    }
  }, [showDetailsDrawer]);
  
  const [workforceForm, setWorkforceForm] = useState({
    workerType: "",
    rateType: "Daily",
    salaryPerShift: "600",
    shiftHours: "8",
    costCode: ""
  });
  const [costCodes, setCostCodes] = useState<Array<{ id: string; code: string; name: string }>>([]);
  
  const [toastMsg, setToastMsg] = useState("");

  const triggerLocalToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Leave Management states
  const [leaves, setLeaves] = useState<any[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceRow[]>([]);
  const [leaveBalInfo, setLeaveBalInfo] = useState<{ as_of: string; leave_year: string; company_has_templates: boolean }>({ as_of: "", leave_year: "", company_has_templates: false });
  const [leaveBalLoading, setLeaveBalLoading] = useState(false);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "",
    leaveType: "Casual",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [timesheetLogs, setTimesheetLogs] = useState<any[]>([]);
  const [projectTasks, setProjectTasks] = useState<any[]>([]);
  const [showNewTimesheetDrawer, setShowNewTimesheetDrawer] = useState(false);
  const [timesheetForm, setTimesheetForm] = useState({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    taskId: "",
    remarks: ""
  });
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    setIsLightTheme(document.documentElement.classList.contains("light-theme"));
  }, []);

  const toggleTheme = () => {
    const nextVal = !isLightTheme;
    setIsLightTheme(nextVal);
    if (nextVal) {
      document.documentElement.classList.add("light-theme");
    } else {
      document.documentElement.classList.remove("light-theme");
    }
  };

  const fetchTimesheetLogs = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/timesheets/project/${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTimesheetLogs(data);
      }
    } catch (e) {
      console.error("Failed to fetch timesheet logs", e);
    }
  };

  const fetchProjectTasks = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/planning/tasks?project_id=${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setProjectTasks(data);
      }
    } catch (e) {
      console.error("Failed to fetch project tasks", e);
    }
  };
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [payrollMonth, setPayrollMonth] = useState(new Date().toISOString().slice(0, 7));
  const [daysInMonth, setDaysInMonth] = useState(26);
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipLine | null>(null);
  const [loading, setLoading] = useState(false);

  // Google Sheets integration (payroll export proof-of-concept)
  const [gsConnected, setGsConnected] = useState(false);
  const [gsExporting, setGsExporting] = useState(false);

  // New employee form state
  const [empForm, setEmpForm] = useState({
    name: "",
    code: "",
    designation: "",
    department: "",
    mobile: "",
    basic: "18000",
    hra: "3600",
    allowances: "1800",
    tds: "0",
    joined: new Date().toISOString().split("T")[0]
  });

  const fetchEmployees = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/employees/${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((emp: any) => ({
          id: emp.id,
          name: emp.name,
          code: emp.employee_code || "",
          designation: emp.designation || "",
          department: emp.department || "",
          mobile: emp.mobile || "",
          basic: emp.basic_salary,
          hra: emp.hra,
          allowances: emp.other_allowances,
          grossMonthly: emp.basic_salary + emp.hra + emp.other_allowances,
          pfPct: emp.pf_employee_pct,
          pfEmployerPct: emp.pf_employer_pct,
          esiApplicable: emp.is_esi_applicable,
          tdsMonthly: emp.tds_monthly,
          status: emp.status === "active" ? "active" : "inactive",
          joined: emp.date_of_joining ? emp.date_of_joining.split("T")[0] : "",
        }));
        setEmployees(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch employees", e);
    }
  };

  const fetchHolidays = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/holidays/${companyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setHolidays(data.map((h: any) => ({
          id: h.id,
          holidayName: h.name,
          date: h.date ? h.date.split("T")[0] : "",
          day: h.date ? new Date(h.date).toLocaleDateString("en-US", { weekday: "long" }) : "",
        })));
      }
    } catch (e) {
      console.error("Failed to fetch holidays", e);
    }
  };

  const fetchCostCodes = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/library/cost-codes/${companyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setCostCodes(data.map((c: any) => ({ id: c.id, code: c.code, name: c.name })));
      }
    } catch (e) {
      console.error("Failed to fetch cost codes", e);
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/holidays/${holidayId}`, {
        method: "DELETE",
        headers: authHeaders() || {},
      });
      if (res.ok) {
        setHolidays((prev) => prev.filter((x) => x.id !== holidayId));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete holiday: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      console.error("Failed to delete holiday", e);
      alert("Failed to delete holiday: server unreachable");
    }
  };

  const fetchAttendance = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/attendance/${projectId}/${selectedDate}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((att: any) => ({
          id: att.id,
          employeeId: att.employee_id,
          employeeName: "", // Dynamic lookup in render
          date: att.attendance_date.split("T")[0],
          punchIn: att.punch_in ? new Date(att.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "",
          punchOut: att.punch_out ? new Date(att.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "",
          hoursWorked: att.hours_worked ?? null,
          overtime: att.overtime_hours ?? null,
          withinGeofence: att.is_within_geofence,
          status: att.status,
          distanceFromSite: att.distance_from_site_m ? Math.round(att.distance_from_site_m) : null,
        }));
        setAttendance(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch attendance", e);
    }
  };

  const fetchLeaves = async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/leaves/${companyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((l: any) => ({
          id: l.id,
          employeeId: l.employee_id || "",
          employeeName: l.employee_name,
          leaveType: l.leave_type,
          startDate: l.start_date.split("T")[0],
          endDate: l.end_date.split("T")[0],
          days: l.days_count,
          reason: "Request submitted via Central HRPortal",
          status: l.status
        }));
        setLeaves(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch leaves", e);
    }
  };

  const fetchLeaveBalances = async () => {
    if (!companyId) return;
    setLeaveBalLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/leave-balances/${companyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setLeaveBalances(data.employees || []);
        setLeaveBalInfo({
          as_of: data.as_of || "",
          leave_year: data.leave_year || "",
          company_has_templates: Boolean(data.company_has_templates),
        });
      }
    } catch (e) {
      console.error("Failed to fetch leave balances", e);
    } finally {
      setLeaveBalLoading(false);
    }
  };

  const handleUpdateLeaveStatus = async (leaveId: string, nextStatus: string) => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/leaves/approve/${leaveId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ status: nextStatus })
      });
      if (res.ok) {
        fetchLeaves();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (companyId && tab === "leaves") {
      fetchLeaves();
      fetchLeaveBalances();
    }
  }, [companyId, tab]);

  useEffect(() => {
    if (projectId) {
      fetchEmployees();
    }
  }, [projectId]);

  useEffect(() => {
    if (companyId) {
      fetchHolidays();
      fetchCostCodes();
    }
  }, [companyId]);

  useEffect(() => {
    if (projectId && selectedDate) {
      fetchAttendance();
    }
  }, [projectId, selectedDate, employees.length]);

  useEffect(() => {
    if (projectId && tab === "timesheets") {
      fetchTimesheetLogs();
      fetchProjectTasks();
    }
  }, [projectId, tab]);

  const handleSaveEmployee = async () => {
    const dup = employees.find((e) => e.name.trim().toLowerCase() === empForm.name.trim().toLowerCase());
    if (dup) {
      const ok = window.confirm(`An employee named "${empForm.name}" already exists. Create another anyway?`);
      if (!ok) return;
    }
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          name: empForm.name,
          employee_code: empForm.code,
          designation: empForm.designation,
          department: empForm.department,
          mobile: empForm.mobile,
          basic_salary: parseFloat(empForm.basic) || 0,
          hra: parseFloat(empForm.hra) || 0,
          other_allowances: parseFloat(empForm.allowances) || 0,
          pf_employee_pct: 12.0,
          pf_employer_pct: 12.0,
          esi_employee_pct: 0.75,
          esi_employer_pct: 3.25,
          tds_monthly: parseFloat(empForm.tds) || 0,
          is_esi_applicable:
            (parseFloat(empForm.basic) || 0) + (parseFloat(empForm.hra) || 0) + (parseFloat(empForm.allowances) || 0) <=
            21000,
          date_of_joining: empForm.joined ? new Date(empForm.joined).toISOString() : null,
        }),
      });
      if (res.ok) {
        setShowAddEmp(false);
        fetchEmployees();
        setEmpForm({
          name: "",
          code: "",
          designation: "",
          department: "",
          mobile: "",
          basic: "18000",
          hra: "3600",
          allowances: "1800",
          tds: "0",
          joined: new Date().toISOString().split("T")[0]
        });
      }
    } catch (e) {
      console.error("Failed to save employee", e);
    }
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/holidays/${companyId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ name: holidayForm.name, date: new Date(holidayForm.date).toISOString() }),
      });
      if (res.ok) {
        const h = await res.json();
        const d = new Date(h.date);
        setHolidays((prev) => [...prev, { id: h.id, holidayName: h.name, date: h.date.split("T")[0], day: d.toLocaleDateString("en-US", { weekday: "long" }) }]);
        setShowAddHolidayModal(false);
        setHolidayForm({ name: "", date: "" });
        triggerLocalToast("Holiday added successfully");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to add holiday: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      console.error("Failed to add holiday", e);
      alert("Failed to add holiday: server unreachable");
    }
  };

  const handleSaveWorkforce = async () => {
    if (!workforceForm.workerType) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/library/workforces`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ company_id: companyId, name: workforceForm.workerType }),
      });
      if (res.ok) {
        setShowWorkforceDrawer(false);
        triggerLocalToast("Workforce added successfully");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to add workforce: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      console.error("Failed to add workforce", e);
      alert("Failed to add workforce: server unreachable");
    }
  };

  const handleSaveEmployeeDetails = async () => {
    if (!selectedEmpDetail) return;
    try {
      const [profRes, empRes] = await Promise.all([
        fetch(`${getApiHost()}/apis/v3/hr/payroll-profiles/${selectedEmpDetail.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({
            salary_amount: parseFloat(detailsForm.salaryAmount) || 0,
            shift_hours: parseFloat(detailsForm.shiftHours) || 8,
            overtime_rate: parseFloat(detailsForm.otRate) || 0,
          }),
        }),
        fetch(`${getApiHost()}/apis/v3/hr/employees/${selectedEmpDetail.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({ designation: detailsForm.designation || null }),
        }),
      ]);
      if (profRes.ok && empRes.ok) {
        setShowDetailsDrawer(false);
        fetchEmployees();
        triggerLocalToast("Details updated successfully");
      } else {
        const err = await profRes.json().catch(() => ({}));
        alert(`Failed to save details: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      console.error("Failed to save employee details", e);
      alert("Failed to save details: server unreachable");
    }
  };

  const handleTimesheetAction = async (tsId: string, action: "submit" | "approve") => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/timesheets/${tsId}/${action}`, {
        method: "PATCH",
        headers: authHeaders()
      });
      if (res.ok) {
        setTimesheets(prev => prev.map(ts => ts.id === tsId ? { ...ts, status: action === "submit" ? "submitted" : "approved" } : ts));
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to ${action} timesheet: ${typeof err.detail === "string" ? err.detail : "Server error"}`);
      }
    } catch (e) {
      console.error("Failed to update timesheet", e);
      alert(`Failed to ${action} timesheet. Please check your connection and try again.`);
    }
  };

  const calculateHoursAndDuration = (start: string, end: string) => {
    if (!start || !end) return { hours: 0, durationStr: "0 Hr 0 Min" };
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let diffMinutes = (eh * 60 + em) - (sh * 60 + sm);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    
    const hrs = Math.round((diffMinutes / 60) * 100) / 100;
    const h = Math.floor(diffMinutes / 60);
    const m = diffMinutes % 60;
    
    return {
      hours: hrs,
      durationStr: `${h} Hr ${m} Min`
    };
  };

  const handleSaveTimesheetEntry = async () => {
    try {
      if (!timesheetForm.employeeId) return;
      
      const dateObj = new Date(timesheetForm.date);
      const day = dateObj.getDay();
      const diffToMonday = dateObj.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(dateObj.setDate(diffToMonday));
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      
      const weekStartStr = monday.toISOString().split("T")[0] + "T00:00:00Z";
      const weekEndStr = sunday.toISOString().split("T")[0] + "T23:59:59Z";
      
      // Post Timesheet Header
      const tsHeaderRes = await fetch(`${getApiHost()}/apis/v3/hr/timesheets`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          employee_id: timesheetForm.employeeId,
          project_id: projectId,
          week_start: weekStartStr,
          week_end: weekEndStr,
          notes: "Daily Activity Log"
        })
      });
      
      let tsId = "";
      if (tsHeaderRes.ok) {
        const tsData = await tsHeaderRes.json();
        tsId = tsData.id;
      } else {
        // R2-564: no fabricated fallback id. Surface the server detail and
        // keep the drawer (and the user's typed hours) intact.
        const tsErr = await tsHeaderRes.json().catch(() => ({}));
        alert(`Failed to create timesheet: ${typeof tsErr.detail === "string" ? tsErr.detail : "Server error"}`);
        return;
      }
      
      const startDateTime = new Date(`${timesheetForm.date}T${timesheetForm.startTime}:00Z`).toISOString();
      const endDateTime = new Date(`${timesheetForm.date}T${timesheetForm.endTime}:00Z`).toISOString();
      const { hours } = calculateHoursAndDuration(timesheetForm.startTime, timesheetForm.endTime);
      
      const res = await fetch(`${getApiHost()}/apis/v3/hr/timesheets/${tsId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          task_id: timesheetForm.taskId ? timesheetForm.taskId : null,
          entry_date: new Date(timesheetForm.date).toISOString(),
          hours: hours,
          activity_description: timesheetForm.remarks,
          start_time: startDateTime,
          end_time: endDateTime
        })
      });
      
      if (res.ok) {
        setShowNewTimesheetDrawer(false);
        fetchTimesheetLogs();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save timesheet entry: ${typeof err.detail === "string" ? err.detail : "Server error"}`);
      }
    } catch (e) {
      console.error("Failed to save timesheet entry", e);
      alert("Failed to save timesheet entry: server unreachable");
    }
  };

  const handleUploadPayrollCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append("company_id", companyId);
    formData.append("project_id", projectId);
    formData.append("file", file);
    
    try {
      const apiHost = getApiHost();
      const res = await fetch(`${apiHost}/apis/v3/hr/payroll/upload`, {
        method: "POST",
        headers: authHeaders(),
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Payroll data uploaded successfully! Created/updated ${data.created} staff employees.`);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      } else {
        const err = await res.json();
        alert(`Failed to upload payroll CSV: ${err.detail || "Unknown error"}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading payroll CSV file");
    } finally {
      setLoading(false);
    }
  };

  const handleRunPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/payroll/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          project_id: projectId,
          payroll_month: payrollMonth,
          days_in_month: daysInMonth
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const mappedPayslips = data.payslips.map((p: any) => ({
          employeeId: p.employee_id,
          employeeName: p.employee_name,
          designation: p.designation || "—",
          daysPresent: p.days_present,
          daysInMonth: p.days_in_month,
          gross: p.gross_salary,
          basic: p.basic,
          hra: p.hra,
          allowances: p.other_allowances,
          pfEmployee: p.pf_employee,
          pfEmployer: p.pf_employer,
          esiEmployee: p.esi_employee,
          esiEmployer: p.esi_employer,
          tds: p.tds,
          totalDeductions: p.total_deductions,
          netPayable: p.net_payable
        }));
        setPayrollRun({
          id: data.id,
          month: data.payroll_month,
          status: data.status,
          totalGross: data.total_gross,
          totalDeductions: data.total_deductions,
          totalNet: data.total_net,
          payslips: mappedPayslips
        });
      }
    } catch (e) {
      console.error("Failed to run payroll", e);
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sheets: check connection status once we know the company ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!companyId) return;
      try {
        const cid = await resolveCompanyId(companyId);
        const res = await fetch(getApi(`/integrations/google-sheets/status/${cid}`), {
          headers: authHeaders(),
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setGsConnected(Boolean(data.connected));
        }
      } catch {
        /* leave as not connected */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const handleConnectGoogleSheets = async () => {
    const cid = await resolveCompanyId(companyId);
    // Authenticated fetch: the access token travels in the Authorization header
    // like every other API call in this app, never in a URL. The backend returns
    // the Google consent URL as JSON, and only then do we navigate the browser
    // directly to accounts.google.com (which carries no SiteFlow token).
    const res = await fetch(
      getApi(`/integrations/google-sheets/authorize?company_id=${cid}`),
      { headers: authHeaders() }
    );
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        alert("Please sign in again to connect Google Sheets");
      } else {
        const detail = await res.text();
        alert("Could not start Google Sheets connect: " + detail);
      }
      return;
    }
    const data = await res.json();
    if (data.consent_url) {
      window.location.href = data.consent_url;
    } else {
      alert("Could not start Google Sheets connect: missing consent URL");
    }
  };

  const handleExportPayrollToSheets = async () => {
    if (!payrollRun) return;
    setGsExporting(true);
    try {
      const res = await fetch(
        getApi(`/integrations/google-sheets/payroll-runs/${payrollRun.id}/export`),
        { method: "POST", headers: authHeaders() }
      );
      if (!res.ok) {
        const detail = await res.text();
        alert("Export failed: " + detail);
        return;
      }
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      alert("Export failed: " + (e?.message || "unknown error"));
    } finally {
      setGsExporting(false);
    }
  };

  const tabClass = (t: string) =>
    `px-4 py-2 text-xs font-bold rounded-lg transition-all ${
      tab === t
        ? "bg-primary/15 text-primary border border-border-custom"
        : "text-muted hover:text-foreground hover:bg-elevated"
    }`;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      Present: "bg-green-500/15 text-green-400 border-green-500/20",
      "Present (Off-Site)": "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
      Absent: "bg-red-500/15 text-red-400 border-red-500/20",
      "Half-Day": "bg-orange-500/15 text-orange-400 border-orange-500/20",
      Leave: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      draft: "bg-zinc-500/15 text-muted border-zinc-500/20",
      submitted: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      approved: "bg-green-500/15 text-green-400 border-green-500/20",
      rejected: "bg-red-500/15 text-red-400 border-red-500/20",
      finalized: "bg-sky-500/15 text-sky-400 border-sky-500/20",
      paid: "bg-green-500/15 text-green-400 border-green-500/20",
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[s] ?? "bg-zinc-700/30 text-muted border-zinc-700"}`;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── HR sub-navigation (top tabs) ── */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        {([
          { key: "employees", label: "Employees", icon: "worker" },
          { key: "attendance", label: "Attendance", icon: "location_pin" },
          { key: "timesheets", label: "Timesheets", icon: "clipboard" },
          { key: "payroll", label: "Payroll Runs", icon: "money_bag" },
          { key: "leaves", label: "Leaves", icon: "calendar" },
          { key: "holidays", label: "Holidays", icon: "sun" },
        ] as { key: string; label: string; icon: IconName }[]).map(item => (
          <button key={item.key} onClick={() => setTab(item.key as any)}
            className={`whitespace-nowrap inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${tab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
            <Icon name={item.icon} className="w-4 h-4 mr-1.5" />{item.label}
          </button>
        ))}
      </div>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border-custom px-6 flex items-center justify-between bg-sidebar shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-foreground uppercase tracking-widest">
              {tab === "employees" && "Staff Directory"}
              {tab === "attendance" && `Daily Attendance — ${selectedDate}`}
              {tab === "timesheets" && "Weekly Timesheets"}
              {tab === "payroll" && "Payroll Engine"}
              {tab === "leaves" && "Leave Management"}
              {tab === "holidays" && "Holiday Calendar"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-elevated border border-border-custom text-muted hover:text-foreground transition-all cursor-pointer"
              title="Toggle Theme"
            >
              <Icon name={isLightTheme ? "moon" : "sun"} className="w-4 h-4" />
            </button>

            {tab === "employees" && (
              <>
                <button onClick={() => setShowLibraryDrawer(true)}
                  className="px-3 py-1.5 rounded-lg border border-border-custom text-muted text-xs font-bold hover:text-foreground hover:bg-elevated transition-all cursor-pointer">
                  Workforce Library
                </button>
                <button onClick={() => setShowWorkforceDrawer(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer">
                  + Add Workforce
                </button>
                <button onClick={() => setShowAddEmp(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 text-primary border border-primary/20 text-xs font-bold hover:bg-primary/30 transition-all cursor-pointer">
                  + Add Staff
                </button>
              </>
            )}
            {tab === "leaves" && (
              <button onClick={() => setShowApplyLeaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer">
                + Apply Leave
              </button>
            )}
            {tab === "holidays" && (
              <button onClick={() => setShowAddHolidayModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer">
                + Add Holiday
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ── EMPLOYEES ── */}
          {tab === "employees" && (
            <div className="space-y-4">
              {/* Summary cards */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: "Total Active", val: employees.filter(e => e.status === "active").length, color: "text-green-400" },
                  { label: "Total Monthly CTC", val: fmt(employees.reduce((a, e) => a + e.grossMonthly + e.basic * (e.pfEmployerPct ?? 12) / 100, 0)), color: "text-primary" },
                  { label: "Departments", val: new Set(employees.map(e => e.department)).size, color: "text-secondary" },
                  { label: "PF Enrolled", val: employees.length, color: "text-blue-400" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-card border border-border-custom rounded-md p-4">
                    <p className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-card border border-border-custom rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-elevated border-b border-border-custom">
                    <tr>
                      {["Code", "Name", "Designation", "Department", "Basic", "HRA", "Allowances", "Gross/mo", "PF%", "ESI", "TDS/mo", "Status"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-elevated transition-colors cursor-pointer" onClick={() => { setSelectedEmpDetail(emp); setShowDetailsDrawer(true); }}>
                        <td className="px-3 py-2.5 font-sans text-muted">{emp.code}</td>
                        <td className="px-3 py-2.5 font-semibold text-foreground">{emp.name}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{emp.designation}</td>
                        <td className="px-3 py-2.5 text-muted">{emp.department}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{fmt(emp.basic)}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{fmt(emp.hra)}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{fmt(emp.allowances)}</td>
                        <td className="px-3 py-2.5 font-bold text-green-400">{fmt(emp.grossMonthly)}</td>
                        <td className="px-3 py-2.5 text-muted">{emp.pfPct}%</td>
                        <td className="px-3 py-2.5">
                          <span className={emp.esiApplicable ? "text-green-400" : "text-muted"}>
                            {emp.esiApplicable ? "Yes" : "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-muted">{emp.tdsMonthly > 0 ? fmt(emp.tdsMonthly) : "—"}</td>
                        <td className="px-3 py-2.5">
                          <span className={statusBadge(emp.status)}>{emp.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── ATTENDANCE ── */}
          {tab === "attendance" && (
            <div className="space-y-4">
              {/* Geofence overview */}
              <div className="grid grid-cols-4 gap-4 mb-2">
                {[
                  { label: "Present Today", val: attendance.filter(a => a.status.startsWith("Present")).length, color: "text-green-400" },
                  { label: "Within Geofence", val: attendance.filter(a => a.withinGeofence).length, color: "text-blue-400" },
                  { label: "Off-Site", val: attendance.filter(a => !a.withinGeofence).length, color: "text-yellow-400" },
                  { label: "Overtime Hours", val: attendance.reduce((a, r) => a + (r.overtime ?? 0), 0).toFixed(1) + " hrs", color: "text-primary" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-card border border-border-custom rounded-md p-4">
                    <p className="text-[10px] text-muted uppercase font-bold tracking-wider mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Attendance table */}
              <div className="bg-card border border-border-custom rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-elevated border-b border-border-custom">
                    <tr>
                      {["Employee", "Punch In", "Punch Out", "Hours", "OT", "Distance", "Geofence", "Status"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {attendance.map(rec => {
                      const emp = employees.find(e => e.id === rec.employeeId);
                      const empName = emp ? emp.name : "Staff Member";
                      return (
                        <tr key={rec.id} className="hover:bg-elevated transition-colors">
                          <td className="px-3 py-3 font-semibold text-foreground">{empName}</td>
                          <td className="px-3 py-3 font-sans text-green-400">{rec.punchIn || "—"}</td>
                          <td className="px-3 py-3 font-sans text-muted">{rec.punchOut || <span className="text-yellow-500 animate-pulse">Active</span>}</td>
                          <td className="px-3 py-3 text-foreground font-bold">{rec.hoursWorked != null && rec.hoursWorked > 0 ? `${rec.hoursWorked}h` : "—"}</td>
                          <td className="px-3 py-3 text-orange-400">{rec.overtime != null && rec.overtime > 0 ? `+${rec.overtime.toFixed(2)}h` : "—"}</td>
                          <td className="px-3 py-3 text-muted">
                            {rec.distanceFromSite != null ? `${rec.distanceFromSite}m` : "—"}
                          </td>
                          <td className="px-3 py-3">
                            {rec.withinGeofence
                              ? <span className="flex items-center gap-1 text-green-400 font-bold"><span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />Inside</span>
                              : <span className="flex items-center gap-1 text-yellow-400 font-bold"><span className="h-1.5 w-1.5 rounded-full bg-yellow-400 inline-block" />Outside</span>}
                          </td>
                          <td className="px-3 py-3"><span className={statusBadge(rec.status)}>{rec.status}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Geofence map placeholder */}
              <div className="bg-card border border-border-custom rounded-md p-6 text-center">
                <div className="relative mx-auto w-64 h-64 rounded-full bg-background border-2 border-border-custom flex items-center justify-center">
                  {/* Geofence circle */}
                  <div className="absolute w-40 h-40 rounded-full border-2 border-dashed border-border-custom flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary animate-ping absolute" />
                    <div className="w-3 h-3 rounded-full bg-primary absolute" />
                  </div>
                </div>
                <p className="text-xs text-muted mt-4">Geofence map not available</p>
              </div>
            </div>
          )}

          {/* ── TIMESHEETS ── */}
          {tab === "timesheets" && (
            <div className="space-y-8">
              {/* Weekly Summary */}
              <div className="bg-card border border-border-custom rounded-md overflow-hidden">
                <div className="px-4 py-3 border-b border-border-custom flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">Weekly Timesheet Approvals</span>
                  <button
                    onClick={() => {
                      if (employees.length > 0) {
                        setTimesheetForm(prev => ({ ...prev, employeeId: employees[0].id }));
                      }
                      setShowNewTimesheetDrawer(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-all"
                  >
                    <Icon name="bolt" className="w-3.5 h-3.5" /> Log Daily Activity
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-elevated border-b border-border-custom">
                    <tr>
                      {["Employee", "Week Range", "Total Hours", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom">
                    {timesheets.map(ts => (
                      <tr key={ts.id} className="hover:bg-elevated transition-colors">
                        <td className="px-4 py-3 font-semibold text-foreground">{ts.employeeName}</td>
                        <td className="px-4 py-3 text-muted">{ts.weekStart} → {ts.weekEnd}</td>
                        <td className="px-4 py-3 font-bold text-blue-400">{ts.totalHours}h</td>
                        <td className="px-4 py-3"><span className={statusBadge(ts.status)}>{ts.status}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            {ts.status === "draft" && (
                              <button
                                onClick={() => handleTimesheetAction(ts.id, "submit")}
                                className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
                              >
                                Submit
                              </button>
                            )}
                            {ts.status === "submitted" && (
                              <button
                                onClick={() => handleTimesheetAction(ts.id, "approve")}
                                className="text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                              >
                                Approve
                              </button>
                            )}
                            <button className="text-[10px] px-2 py-1 rounded bg-elevated text-muted border border-border-custom hover:bg-elevated">View</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Daily Log Entries */}
              <div className="bg-card border border-border-custom rounded-md overflow-hidden">
                <div className="px-4 py-3 border-b border-border-custom">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground uppercase tracking-wider"><Icon name="worker" className="w-4 h-4" /> Daily Activity & Timesheet Logs</span>
                </div>
                {timesheetLogs.length === 0 ? (
                  <div className="p-8 text-center text-muted text-xs">
                    No daily timesheet entries logged yet. Click "Log Daily Activity" to start.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-elevated border-b border-border-custom">
                      <tr>
                        {["Date", "Employee", "Start Time", "End Time", "Duration", "Hours", "Activity / Task", "Remarks"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {timesheetLogs.map((log: any) => {
                        const taskName = projectTasks.find(t => t.id === log.task_id)?.name || "—";
                        const formattedDate = new Date(log.entry_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
                        
                        let durationStr = "—";
                        if (log.duration) {
                          const h = Math.floor(log.duration / 60);
                          const m = log.duration % 60;
                          durationStr = `${h} Hr ${m} Min`;
                        }
                        
                        const fmtTime = (iso: string) => {
                          if (!iso) return "—";
                          return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        };

                        return (
                          <tr key={log.id} className="hover:bg-elevated transition-colors">
                            <td className="px-4 py-3 font-sans text-muted">{formattedDate}</td>
                            <td className="px-4 py-3 font-semibold text-foreground">{log.employee_name || "—"}</td>
                            <td className="px-4 py-3 font-sans text-green-400">{fmtTime(log.start_time)}</td>
                            <td className="px-4 py-3 font-sans text-muted">{fmtTime(log.end_time)}</td>
                            <td className="px-4 py-3 text-foreground font-semibold font-sans">{durationStr}</td>
                            <td className="px-4 py-3 font-bold text-blue-400 font-sans">{log.hours}h</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-elevated border border-border-custom text-[10px] text-zinc-300">
                                {taskName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-muted max-w-[200px] truncate" title={log.activity_description}>
                              {log.activity_description || "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* sliding New Timesheet Drawer */}
              {showNewTimesheetDrawer && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm">
                  <div className="w-full max-w-md h-full bg-background border-l border-border-custom p-6 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-border-custom pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Log Timesheet Entry</h3>
                          <p className="text-[10px] text-muted">Record daily hour logs & activity details</p>
                        </div>
                        <button
                          onClick={() => setShowNewTimesheetDrawer(false)}
                          className="text-muted hover:text-foreground text-lg font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted font-bold uppercase block">Employee / Party Name</label>
                          <select
                            value={timesheetForm.employeeId}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, employeeId: e.target.value }))}
                            className="w-full bg-card border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="">Select Employee</option>
                            {employees.map(e => (
                              <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted font-bold uppercase block">Date</label>
                          <input
                            type="date"
                            value={timesheetForm.date}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full bg-card border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted font-bold uppercase block">Start Time</label>
                            <input
                              type="time"
                              value={timesheetForm.startTime}
                              onChange={(e) => setTimesheetForm(prev => ({ ...prev, startTime: e.target.value }))}
                              className="w-full bg-card border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-muted font-bold uppercase block">Stop Time</label>
                            <input
                              type="time"
                              value={timesheetForm.endTime}
                              onChange={(e) => setTimesheetForm(prev => ({ ...prev, endTime: e.target.value }))}
                              className="w-full bg-card border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        {/* Calculated Duration display */}
                        <div className="p-3.5 rounded-lg bg-elevated border border-border-custom flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] text-muted uppercase block font-bold">Calculated Duration</span>
                            <span className="text-foreground font-extrabold font-sans text-sm">
                              {calculateHoursAndDuration(timesheetForm.startTime, timesheetForm.endTime).durationStr}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-muted uppercase block font-bold text-right">Hours Logged</span>
                            <span className="text-primary font-black font-sans text-sm block text-right">
                              {calculateHoursAndDuration(timesheetForm.startTime, timesheetForm.endTime).hours}h
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted font-bold uppercase block">Project Task / Activity</label>
                          <select
                            value={timesheetForm.taskId}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, taskId: e.target.value }))}
                            className="w-full bg-card border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                          >
                            <option value="">Select Project Task (Optional)</option>
                            {projectTasks.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted font-bold uppercase block">Remarks / Notes</label>
                          <textarea
                            value={timesheetForm.remarks}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, remarks: e.target.value }))}
                            rows={3}
                            placeholder="Enter remarks or details of work done..."
                            className="w-full bg-card border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                          />
                        </div>

                        {/* File Upload Attachment Placeholder */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-muted font-bold uppercase block">Attachments</label>
                          <div className="border border-dashed border-border-custom rounded-lg p-4 text-center cursor-pointer hover:bg-elevated transition-all">
                            <Icon name="paperclip" className="w-5 h-5 mx-auto" />
                            <span className="text-[10px] text-muted block mt-1">Upload files, logs or PDF proof</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 border-t border-border-custom pt-4 mt-6">
                      <button
                        onClick={() => setShowNewTimesheetDrawer(false)}
                        className="flex-1 px-4 py-2 border border-border-custom rounded-lg text-xs font-bold text-muted hover:text-foreground transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTimesheetEntry}
                        className="flex-1 px-4 py-2 bg-primary rounded-lg text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110"
                      >
                        Save Entry
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PAYROLL ── */}
          {tab === "payroll" && (
            <div className="space-y-6">
              {/* Controls */}
              <div className="bg-card border border-border-custom rounded-md p-5">
                <h2 className="inline-flex items-center gap-2 text-sm font-bold text-foreground mb-4"><Icon name="rocket" className="w-5 h-5" /> Run Monthly Payroll</h2>
                <div className="flex items-end gap-4">
                  <div>
                    <label className="text-[10px] text-muted font-bold uppercase block mb-1.5">Payroll Month</label>
                    <input type="month" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                      className="bg-background border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted font-bold uppercase block mb-1.5">Working Days</label>
                    <input type="number" min={1} max={31} value={daysInMonth} onChange={e => setDaysInMonth(Number(e.target.value))}
                      className="w-24 bg-background border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary" />
                  </div>
                  <button onClick={handleRunPayroll}
                    className="px-5 py-2 bg-primary rounded-lg text-white text-sm font-bold hover:bg-primary/90 transition-all">
                    Compute Payroll
                  </button>
                  <button
                    onClick={() => document.getElementById("payroll-csv-file-input")?.click()}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-elevated border border-border-custom hover:bg-elevated/80 rounded-lg text-foreground text-sm font-bold transition-all"
                  >
                    <input
                      type="file"
                      id="payroll-csv-file-input"
                      accept=".csv"
                      className="hidden"
                      onChange={handleUploadPayrollCSV}
                    />
                    <Icon name="inbox" className="w-4 h-4" /> Import Payroll CSV
                  </button>
                </div>
              </div>

              {payrollRun && (
                <>
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Total Gross", val: fmt(payrollRun.totalGross), color: "text-green-400" },
                      { label: "Total Deductions", val: fmt(payrollRun.totalDeductions), color: "text-red-400" },
                      { label: "Net Payable", val: fmt(payrollRun.totalNet), color: "text-primary" },
                    ].map(({ label, val, color }) => (
                      <div key={label} className="bg-card border border-border-custom rounded-md p-5">
                        <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-2xl font-bold ${color}`}>{val}</p>
                        <p className="text-[10px] text-muted mt-1">{payrollRun.month} payroll</p>
                      </div>
                    ))}
                  </div>

                  {/* Payslips table */}
                  <div className="bg-card border border-border-custom rounded-md overflow-hidden">
                    <div className="px-4 py-3 border-b border-border-custom flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Employee Payslips — {payrollRun.month}</span>
                      <div className="flex items-center gap-2">
                        {gsConnected ? (
                          <button
                            onClick={handleExportPayrollToSheets}
                            disabled={gsExporting}
                            className="text-[10px] px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 border border-green-500/20 font-bold hover:bg-green-500/25 transition-all disabled:opacity-60"
                          >
                            {gsExporting ? "Exporting..." : "Export to Google Sheets"}
                          </button>
                        ) : (
                          <button
                            onClick={handleConnectGoogleSheets}
                            className="text-[10px] px-3 py-1.5 rounded-lg bg-elevated text-muted border border-border-custom font-bold hover:bg-elevated transition-all"
                          >
                            Connect Google Sheets
                          </button>
                        )}
                        <span className={statusBadge("finalized")}>{payrollRun.status}</span>
                      </div>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-elevated border-b border-border-custom">
                        <tr>
                          {["Employee", "Days", "Gross", "PF (Emp)", "PF (Er)", "ESI", "TDS", "Deductions", "Net Pay", ""].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-muted uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-custom">
                        {payrollRun.payslips.map(p => (
                          <tr key={p.employeeId} className="hover:bg-elevated transition-colors cursor-pointer" onClick={() => setSelectedPayslip(p)}>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-foreground">{p.employeeName}</div>
                              <div className="text-[10px] text-muted">{p.designation}</div>
                            </td>
                            <td className="px-3 py-3 text-zinc-300">{p.daysPresent}/{p.daysInMonth}</td>
                            <td className="px-3 py-3 font-bold text-green-400">{fmt(p.gross)}</td>
                            <td className="px-3 py-3 text-muted">{fmt(p.pfEmployee)}</td>
                            <td className="px-3 py-3 text-muted">{fmt(p.pfEmployer)}</td>
                            <td className="px-3 py-3 text-muted">{p.esiEmployee > 0 ? fmt(p.esiEmployee) : <span className="text-muted">N/A</span>}</td>
                            <td className="px-3 py-3 text-muted">{p.tds > 0 ? fmt(p.tds) : "—"}</td>
                            <td className="px-3 py-3 text-red-400 font-bold">{fmt(p.totalDeductions)}</td>
                            <td className="px-3 py-3 font-bold text-primary text-sm">{fmt(p.netPayable)}</td>
                            <td className="px-3 py-3">
                              <button className="text-[10px] px-2 py-1 rounded bg-elevated text-muted border border-border-custom hover:bg-elevated">Payslip</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!payrollRun && (
                <div className="bg-card border border-border-custom rounded-md p-16 text-center">
                  <Icon name="money_bag" className="w-10 h-10 mx-auto mb-3 text-muted" />
                  <p className="text-sm text-muted font-semibold">No payroll run yet</p>
                  <p className="text-xs text-muted mt-1">Select a month and click "Compute Payroll" to generate payslips</p>
                </div>
              )}
            </div>
          )}

          {/* ── LEAVES ── */}
          {tab === "leaves" && (
            <div className="space-y-4 font-sans">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Employee Leave Requests & Balances</h2>
                  <p className="text-[10px] text-muted mt-0.5">Submit, review and approve casual/sick/earned leave requests for the site personnel.</p>
                </div>
              </div>

              {/* Leave Balances Grid */}
              {leaveBalLoading ? (
                <div className="bg-card border border-border-custom rounded-md p-8 text-center text-muted text-xs">
                  Loading leave balances...
                </div>
              ) : leaveBalances.length === 0 ? (
                <div className="bg-card border border-border-custom rounded-md p-8 text-center text-muted text-xs">
                  No active employees found for this company. Add staff from the Employees tab to see per-employee leave balances.
                </div>
              ) : !leaveBalInfo.company_has_templates ? (
                <div className="bg-card border border-border-custom rounded-md p-8 text-center text-xs">
                  <p className="text-muted">No leave templates are configured for this company, so entitlements cannot be computed yet.</p>
                  <p className="text-primary font-bold mt-2">Set up a leave template (HR settings) to assign Casual / Sick / Earned entitlements per employee.</p>
                </div>
              ) : (
                <div className="bg-card border border-border-custom rounded-md overflow-hidden">
                  <div className="px-4 py-3 border-b border-border-custom flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Per-Employee Leave Balances</span>
                    <span className="text-[10px] text-muted">Leave year {leaveBalInfo.leave_year} · as of {leaveBalInfo.as_of}</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-elevated border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Employee</th>
                        <th className="px-4 py-3 font-semibold">Designation</th>
                        <th className="px-4 py-3 font-semibold text-center">Casual (Ent / Used / Bal)</th>
                        <th className="px-4 py-3 font-semibold text-center">Sick (Ent / Used / Bal)</th>
                        <th className="px-4 py-3 font-semibold text-center">Earned (Ent / Used / Bal)</th>
                        <th className="px-4 py-3 font-semibold text-center">Template</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom text-zinc-300">
                      {leaveBalances.map((row) => {
                        const cell = (b: LeaveTypeBalance) => (
                          <span className="font-sans">
                            <span className="text-muted">{b.entitled}</span>
                            <span className="text-muted"> / </span>
                            <span className="text-amber-400">{b.used}</span>
                            <span className="text-muted"> / </span>
                            <span className={b.balance < 0 ? "text-red-400 font-bold" : "text-green-400 font-bold"}>{b.balance}</span>
                          </span>
                        );
                        return (
                          <tr key={row.employee_id} className="hover:bg-elevated transition-all">
                            <td className="px-4 py-3 font-bold text-foreground">{row.employee_name}</td>
                            <td className="px-4 py-3 text-muted">{row.designation || "—"}</td>
                            <td className="px-4 py-3 text-center">{cell(row.casual)}</td>
                            <td className="px-4 py-3 text-center">{cell(row.sick)}</td>
                            <td className="px-4 py-3 text-center">{cell(row.earned)}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                row.template_source === "assigned" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                                row.template_source === "company_default" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                "bg-zinc-500/10 border-zinc-500/20 text-muted"
                              }`}>
                                {row.template_source === "assigned" ? "Assigned" : row.template_source === "company_default" ? "Company default" : "None"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Leave Requests Listing */}
              <div className="bg-card border border-border-custom rounded-md overflow-hidden mt-6">
                <div className="px-4 py-3 border-b border-border-custom flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Leave Application Logs</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-elevated border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Employee</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Duration</th>
                      <th className="px-4 py-3 font-semibold">Reason</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom text-zinc-300">
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-elevated transition-all">
                        <td className="px-4 py-3 font-bold text-foreground">{leave.employeeName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            leave.leaveType === "Sick" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-primary/10 border border-primary/20 text-primary"
                          }`}>{leave.leaveType}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold">{leave.startDate} to {leave.endDate}</span>
                          <span className="block text-[10px] text-muted mt-0.5">({leave.days} day{leave.days > 1 ? "s" : ""})</span>
                        </td>
                        <td className="px-4 py-3 text-muted max-w-xs truncate">{leave.reason}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            leave.status === "Approved" ? "bg-green-500/10 border-green-500/20 text-green-400" :
                            leave.status === "Rejected" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                            "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          }`}>{leave.status}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {leave.status === "Pending" && (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleUpdateLeaveStatus(leave.id, "Approved")}
                                className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded text-[10px] font-bold transition-all">
                                Approve
                              </button>
                              <button onClick={() => handleUpdateLeaveStatus(leave.id, "Rejected")}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded text-[10px] font-bold transition-all">
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── HOLIDAYS ── */}
          {tab === "holidays" && (
            <div className="space-y-4">
              <div className="bg-card border border-border-custom rounded-xl p-6">
                <p className="text-xs text-muted mb-4">Create and manage your official company holiday calendar. Employees will be auto-credited present on these dates.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                        <th className="pb-2">Holiday Name</th>
                        <th className="pb-2">Date</th>
                        <th className="pb-2">Day</th>
                        <th className="pb-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-custom">
                      {holidays.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted">No holidays added yet.</td>
                        </tr>
                      ) : (
                        holidays.map((h) => (
                          <tr key={h.id} className="hover:bg-elevated transition-all">
                            <td className="py-3 font-semibold text-foreground">{h.holidayName}</td>
                            <td className="py-3 text-muted">{h.date}</td>
                            <td className="py-3 text-muted">{h.day}</td>
                            <td className="py-3 text-right">
                              <button onClick={() => handleDeleteHoliday(h.id)} className="text-red-400 hover:text-red-300 text-[10px] font-bold">Delete</button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Payslip modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPayslip(null)}>
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-foreground">Payslip — {selectedPayslip.employeeName}</h2>
                <p className="text-xs text-muted">{selectedPayslip.designation} · {payrollMonth}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="inline-flex items-center gap-1 px-3 py-1 bg-primary/20 hover:bg-primary/35 text-primary border border-border-custom rounded text-[10px] font-bold transition-all">
                  <Icon name="printer" className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="text-muted hover:text-foreground text-xl">✕</button>
              </div>
            </div>

            {/* Earnings */}
            <div className="space-y-1 mb-4">
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Earnings</p>
              {[
                ["Basic Salary", selectedPayslip.basic],
                ["HRA", selectedPayslip.hra],
                ["Other Allowances", selectedPayslip.allowances],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="text-foreground font-semibold">{fmt(val as number)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-2 border-t border-border-custom">
                <span className="text-zinc-300 font-bold">Gross ({selectedPayslip.daysPresent}/{selectedPayslip.daysInMonth} days)</span>
                <span className="text-green-400 font-bold">{fmt(selectedPayslip.gross)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-1 mb-4">
              <p className="text-[10px] text-muted font-bold uppercase tracking-wider mb-2">Deductions</p>
              {[
                ["PF (Employee 12%)", selectedPayslip.pfEmployee],
                ["PF (Employer 12%)", selectedPayslip.pfEmployer],
                ["ESI (Employee 0.75%)", selectedPayslip.esiEmployee],
                ["ESI (Employer 3.25%)", selectedPayslip.esiEmployer],
                ["TDS", selectedPayslip.tds],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-xs">
                  <span className="text-muted">{label}</span>
                  <span className={(val as number) > 0 ? "text-red-400" : "text-muted"}>
                    {(val as number) > 0 ? fmt(val as number) : "N/A"}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-2 border-t border-border-custom">
                <span className="text-zinc-300 font-bold">Total Deductions</span>
                <span className="text-red-400 font-bold">{fmt(selectedPayslip.totalDeductions)}</span>
              </div>
            </div>

            {/* Net */}
            <div className="bg-primary/10 border border-primary/20 rounded-md p-4 flex justify-between items-center">
              <span className="text-sm font-bold text-foreground">Net Payable</span>
              <span className="text-2xl font-bold text-primary">{fmt(selectedPayslip.netPayable)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee modal stub */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddEmp(false)}>
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Add New Employee</h2>
              <button onClick={() => setShowAddEmp(false)} className="text-muted hover:text-foreground text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label: "Full Name", type: "text", key: "name", placeholder: "Ramesh Kumar" },
                { label: "Employee Code", type: "text", key: "code", placeholder: "EMP-005" },
                { label: "Designation", type: "text", key: "designation", placeholder: "Site Supervisor" },
                { label: "Department", type: "text", key: "department", placeholder: "Civil" },
                { label: "Mobile", type: "tel", key: "mobile", placeholder: "9876543210" },
                { label: "Basic Salary (₹)", type: "number", key: "basic", placeholder: "18000" },
                { label: "HRA (₹)", type: "number", key: "hra", placeholder: "3600" },
                { label: "Other Allowances (₹)", type: "number", key: "allowances", placeholder: "1800" },
                { label: "TDS/Month (₹)", type: "number", key: "tds", placeholder: "0" },
                { label: "Date of Joining", type: "date", key: "joined", placeholder: "" },
              ].map(({ label, type, key, placeholder }) => (
                <div key={label}>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(empForm as any)[key]}
                    onChange={(e) => setEmpForm({ ...empForm, [key]: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSaveEmployee}
                className="flex-1 py-2 bg-primary rounded-lg text-white text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Save Employee
              </button>
              <button onClick={() => setShowAddEmp(false)} className="px-4 py-2 rounded-lg border border-border-custom text-muted text-sm hover:text-foreground hover:border-border-custom">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Apply Leave Modal */}
      {showApplyLeaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowApplyLeaveModal(false)}>
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Apply for Leave</h2>
              <button onClick={() => setShowApplyLeaveModal(false)} className="text-muted hover:text-foreground text-xl">✕</button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-muted uppercase font-bold block">Select Employee</label>
                <select
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
                >
                  <option value="">Select employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted uppercase font-bold block">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Earned">Earned Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted uppercase font-bold block">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted uppercase font-bold block">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-muted uppercase font-bold block">Reason / Description</label>
                <textarea
                  placeholder="Reason for requesting leave..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  rows={3}
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={async () => {
                  const emp = employees.find(e => e.id === leaveForm.employeeId) || { name: "Unknown" };
                  if (!leaveForm.employeeId) {
                    alert("Select an employee before applying for leave.");
                    return;
                  }
                  const d1 = new Date(leaveForm.startDate);
                  const d2 = new Date(leaveForm.endDate);
                  const diff = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  try {
                    const res = await fetch(`${getApiHost()}/apis/v3/hr/leaves/${companyId}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
                      body: JSON.stringify({
                        project_id: projectId || null,
                        employee_name: emp.name,
                        leave_type: leaveForm.leaveType,
                        start_date: new Date(leaveForm.startDate).toISOString(),
                        end_date: new Date(leaveForm.endDate).toISOString(),
                        days_count: isNaN(diff) ? 1.0 : parseFloat(diff.toString())
                      })
                    });
                    if (res.ok) {
                      fetchLeaves();
                      setShowApplyLeaveModal(false);
                      setLeaveForm({ employeeId: "", leaveType: "Casual", startDate: "", endDate: "", reason: "" });
                    }
                  } catch (e) {
                    console.error("Failed to apply leave", e);
                  }
                }}
                className="flex-1 py-2 bg-primary rounded-lg text-white text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Submit Application
              </button>
              <button onClick={() => setShowApplyLeaveModal(false)} className="px-4 py-2 rounded-lg border border-border-custom text-muted text-sm hover:text-foreground hover:border-border-custom">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Add Holiday Modal */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddHolidayModal(false)}>
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-foreground">Add Company Holiday</h2>
              <button onClick={() => setShowAddHolidayModal(false)} className="text-muted hover:text-foreground text-xl">✕</button>
            </div>
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-muted uppercase font-bold block">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Independence Day"
                  value={holidayForm.name}
                  onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted uppercase font-bold block">Holiday Date</label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground text-xs focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveHoliday}
                className="flex-1 py-2 bg-primary rounded-lg text-white text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Save Holiday
              </button>
              <button onClick={() => setShowAddHolidayModal(false)} className="px-4 py-2 rounded-lg border border-border-custom text-muted text-sm hover:text-foreground hover:border-border-custom">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Workforce Drawer */}
      {showWorkforceDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in" onClick={() => setShowWorkforceDrawer(false)}>
          <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Add Workforce</h2>
                <button onClick={() => setShowWorkforceDrawer(false)} className="text-muted hover:text-foreground text-lg">✕</button>
              </div>
              
              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Worker Type (e.g. Mason, Electrician)*</label>
                  <input
                    type="text"
                    placeholder="e.g. Mason"
                    value={workforceForm.workerType}
                    onChange={e => setWorkforceForm({ ...workforceForm, workerType: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1.5">Salary Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Daily", "Hourly"].map(t => (
                      <button
                        key={t}
                        onClick={() => setWorkforceForm({ ...workforceForm, rateType: t })}
                        className={`py-2 rounded-lg font-bold border text-xs transition-all ${
                          workforceForm.rateType === t
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-background border-border-custom text-muted hover:text-foreground"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Salary Per Shift (₹)*</label>
                  <input
                    type="number"
                    placeholder="600"
                    value={workforceForm.salaryPerShift}
                    onChange={e => setWorkforceForm({ ...workforceForm, salaryPerShift: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Shift Hours*</label>
                  <input
                    type="number"
                    placeholder="8"
                    value={workforceForm.shiftHours}
                    onChange={e => setWorkforceForm({ ...workforceForm, shiftHours: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Cost Code</label>
                  <select
                    value={workforceForm.costCode}
                    onChange={e => setWorkforceForm({ ...workforceForm, costCode: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  >
                    <option value="">Select Cost Code</option>
                    {costCodes.map((cc) => (
                      <option key={cc.id} value={cc.id}>{cc.code} ({cc.name})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
              <button
                onClick={handleSaveWorkforce}
                className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
              >
                Save
              </button>
              <button onClick={() => setShowWorkforceDrawer(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-foreground hover:border-border-custom text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Workforce Library Drawer */}
      {showLibraryDrawer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowLibraryDrawer(false)}>
          <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">Workforce Library</h2>
                <button onClick={() => setShowLibraryDrawer(false)} className="text-muted hover:text-foreground text-lg">✕</button>
              </div>

              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search Workforce..."
                  className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <button
                onClick={() => {
                  setShowLibraryDrawer(false);
                  setShowWorkforceDrawer(true);
                }}
                className="w-full py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-bold rounded-lg text-xs transition-all mb-4"
              >
                + Add New Workforce
              </button>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-background border border-border-custom rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Mason</p>
                    <p className="text-[10px] text-muted">Daily Rate · ₹750/shift</p>
                  </div>
                  <span className="text-xs text-primary font-bold cursor-pointer hover:underline" onClick={() => { setShowLibraryDrawer(false); triggerLocalToast("Mason selected from Library"); }}>Select</span>
                </div>
                <div className="p-3 bg-background border border-border-custom rounded-lg flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground">Electrician</p>
                    <p className="text-[10px] text-muted">Hourly Rate · ₹120/hr</p>
                  </div>
                  <span className="text-xs text-primary font-bold cursor-pointer hover:underline" onClick={() => { setShowLibraryDrawer(false); triggerLocalToast("Electrician selected from Library"); }}>Select</span>
                </div>
              </div>
            </div>

            <button onClick={() => setShowLibraryDrawer(false)} className="w-full py-2.5 rounded-lg border border-border-custom text-muted hover:text-foreground text-xs mt-6">Close</button>
          </div>
        </div>
      )}

      {/* Payroll Details Drawer */}
      {showDetailsDrawer && selectedEmpDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end" onClick={() => setShowDetailsDrawer(false)}>
          <div className="bg-card w-full max-w-md h-full border-l border-border-custom shadow-2xl p-6 flex flex-col justify-between overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-border-custom mb-5">
                <div>
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wider">{selectedEmpDetail.name}</h2>
                  <p className="text-[10px] text-muted font-sans">{selectedEmpDetail.code}</p>
                </div>
                <button onClick={() => setShowDetailsDrawer(false)} className="text-muted hover:text-foreground text-lg">✕</button>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Salary Amount (₹)*</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={detailsForm.salaryAmount}
                      onChange={(e) => setDetailsForm({ ...detailsForm, salaryAmount: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted shrink-0">per month</span>
                  </div>
                  <span className="text-[10px] text-primary cursor-pointer hover:underline mt-1 block">Add Salary Breakup</span>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Shift Timing</label>
                  <select className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary">
                    <option>09:00 AM - 05:00 PM</option>
                    <option>08:00 AM - 04:00 PM</option>
                    <option>10:00 AM - 06:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Shift Hours</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={detailsForm.shiftHours}
                      onChange={(e) => setDetailsForm({ ...detailsForm, shiftHours: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted shrink-0">per shift</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Overtime (₹)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={detailsForm.otRate}
                      onChange={(e) => setDetailsForm({ ...detailsForm, otRate: e.target.value })}
                      className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                    />
                    <span className="text-xs text-muted shrink-0">per hour</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Designation</label>
                  <input
                    type="text"
                    value={detailsForm.designation}
                    onChange={(e) => setDetailsForm({ ...detailsForm, designation: e.target.value })}
                    className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Leave Template</label>
                  <select className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary">
                    <option>Standard leave template</option>
                    <option>Executive leave template</option>
                    <option>Labour leave template</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-muted uppercase font-bold block mb-1">Cost Code</label>
                  <select className="w-full bg-background border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary">
                    <option>Select Cost Code</option>
                    {costCodes.map((cc) => (
                      <option key={cc.id}>{cc.code} ({cc.name})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-border-custom">
              <button
                onClick={handleSaveEmployeeDetails}
                className="flex-1 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/95 text-xs transition-all"
              >
                Save
              </button>
              <button onClick={() => setShowDetailsDrawer(false)} className="px-4 py-2.5 rounded-lg border border-border-custom text-muted hover:text-foreground hover:border-border-custom text-xs">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Local Toast popup */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
          <Icon name="bolt" className="w-3.5 h-3.5" />
          <span className="font-semibold">{toastMsg}</span>
        </div>
      )}
    </div>
  );
}