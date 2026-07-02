"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  hoursWorked: number;
  overtime: number;
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_EMPLOYEES: Employee[] = [
  { id: "E-01", name: "Ramesh Kumar", code: "EMP-001", designation: "Site Engineer", department: "Civil", mobile: "9876543210", basic: 20000, hra: 4000, allowances: 2000, grossMonthly: 26000, pfPct: 12, esiApplicable: false, tdsMonthly: 0, status: "active", joined: "2025-01-15" },
  { id: "E-02", name: "Priya Shah", code: "EMP-002", designation: "Project Manager", department: "Management", mobile: "9123456789", basic: 60000, hra: 15000, allowances: 10000, grossMonthly: 85000, pfPct: 12, esiApplicable: false, tdsMonthly: 2000, status: "active", joined: "2024-04-01" },
  { id: "E-03", name: "Sanjay Yadav", code: "EMP-003", designation: "Foreman", department: "Labour", mobile: "9012345678", basic: 15000, hra: 3000, allowances: 1500, grossMonthly: 19500, pfPct: 12, esiApplicable: true, tdsMonthly: 0, status: "active", joined: "2025-06-01" },
  { id: "E-04", name: "Meera Nair", code: "EMP-004", designation: "Safety Officer", department: "HSE", mobile: "9988776655", basic: 25000, hra: 6000, allowances: 3000, grossMonthly: 34000, pfPct: 12, esiApplicable: false, tdsMonthly: 500, status: "active", joined: "2025-03-10" },
];

const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { id: "A-01", employeeId: "E-01", employeeName: "Ramesh Kumar", date: "2026-06-26", punchIn: "08:02", punchOut: "17:15", hoursWorked: 9.22, overtime: 1.22, withinGeofence: true, status: "Present", distanceFromSite: 42 },
  { id: "A-02", employeeId: "E-02", employeeName: "Priya Shah", date: "2026-06-26", punchIn: "09:00", punchOut: "18:30", hoursWorked: 9.5, overtime: 1.5, withinGeofence: true, status: "Present", distanceFromSite: 18 },
  { id: "A-03", employeeId: "E-03", employeeName: "Sanjay Yadav", date: "2026-06-26", punchIn: "07:45", punchOut: "17:00", hoursWorked: 9.25, overtime: 1.25, withinGeofence: false, status: "Present (Off-Site)", distanceFromSite: 632 },
  { id: "A-04", employeeId: "E-04", employeeName: "Meera Nair", date: "2026-06-26", punchIn: "08:30", punchOut: "", hoursWorked: 0, overtime: 0, withinGeofence: true, status: "Present", distanceFromSite: 5 },
];

const computePayslips = (employees: Employee[], daysPresent: Record<string, number>, daysInMonth: number): PayslipLine[] => {
  return employees.map(emp => {
    const days = daysPresent[emp.id] ?? daysInMonth;
    const ratio = days / daysInMonth;
    const gross = Math.round(emp.grossMonthly * ratio * 100) / 100;
    const basicPro = Math.round(emp.basic * ratio * 100) / 100;
    // Cap PF at ₹1,800 monthly contribution limit
    const pfEmp = Math.min(1800, Math.round(basicPro * emp.pfPct / 100 * 100) / 100);
    const pfEr  = Math.min(1800, Math.round(basicPro * emp.pfPct / 100 * 100) / 100);
    const esiEmp = emp.esiApplicable ? Math.round(gross * 0.75 / 100 * 100) / 100 : 0;
    const esiEr  = emp.esiApplicable ? Math.round(gross * 3.25 / 100 * 100) / 100 : 0;
    const tds = emp.tdsMonthly;
    const totalDed = Math.round((pfEmp + esiEmp + tds) * 100) / 100;
    const net = Math.round((gross - totalDed) * 100) / 100;
    return {
      employeeId: emp.id, employeeName: emp.name, designation: emp.designation,
      daysPresent: days, daysInMonth, gross, basic: basicPro,
      hra: Math.round(emp.hra * ratio * 100) / 100,
      allowances: Math.round(emp.allowances * ratio * 100) / 100,
      pfEmployee: pfEmp, pfEmployer: pfEr, esiEmployee: esiEmp, esiEmployer: esiEr,
      tds, totalDeductions: totalDed, netPayable: net,
    };
  });
};

const fmt = (n: number) => "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Component ────────────────────────────────────────────────────────────────

export default function HRPayrollPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [tab, setTab] = useState<"employees" | "attendance" | "timesheets" | "payroll" | "leaves">("employees");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  
  // Leave Management states
  const [leaves, setLeaves] = useState<any[]>([
    { id: "LV-01", employeeId: "E-01", employeeName: "Ramesh Kumar", leaveType: "Casual", startDate: "2026-07-02", endDate: "2026-07-03", days: 2, reason: "Personal work at hometown", status: "Pending" },
    { id: "LV-02", employeeId: "E-03", employeeName: "Sanjay Yadav", leaveType: "Sick", startDate: "2026-06-20", endDate: "2026-06-21", days: 2, reason: "Viral Fever", status: "Approved" },
  ]);
  const [showApplyLeaveModal, setShowApplyLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: "E-01",
    leaveType: "Casual",
    startDate: "",
    endDate: "",
    reason: ""
  });
  const [timesheets, setTimesheets] = useState<Timesheet[]>([
    { id: "TS-01", employeeId: "E-01", employeeName: "Ramesh Kumar", weekStart: "2026-06-16", weekEnd: "2026-06-22", totalHours: 47.5, status: "approved" },
    { id: "TS-02", employeeId: "E-02", employeeName: "Priya Shah", weekStart: "2026-06-16", weekEnd: "2026-06-22", totalHours: 44.0, status: "submitted" },
    { id: "TS-03", employeeId: "E-03", employeeName: "Sanjay Yadav", weekStart: "2026-06-23", weekEnd: "2026-06-29", totalHours: 18.5, status: "draft" },
  ]);
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
      const res = await fetch(`http://localhost:8000/apis/v3/hr/timesheets/project/${projectId}`);
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
      const res = await fetch(`http://localhost:8000/apis/v3/planning/tasks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectTasks(data);
      }
    } catch (e) {
      console.error("Failed to fetch project tasks", e);
    }
  };
  const [selectedDate, setSelectedDate] = useState("2026-06-26");
  const [payrollMonth, setPayrollMonth] = useState("2026-06");
  const [daysInMonth, setDaysInMonth] = useState(26);
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipLine | null>(null);
  const [loading, setLoading] = useState(false);

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
      const res = await fetch(`http://localhost:8000/apis/v3/hr/employees/${projectId}`);
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
          esiApplicable: emp.is_esi_applicable,
          tdsMonthly: emp.tds_monthly,
          status: emp.status === "active" ? "active" : "inactive",
          joined: emp.date_of_joining ? emp.date_of_joining.split("T")[0] : "",
        }));
        setEmployees(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch employees", e);
      // Seed robust mock fallbacks when API is offline to prevent empty tables
      setEmployees([
        { id: "E-01", name: "Ramesh Kumar", code: "EMP-001", designation: "Project Manager", department: "Operations", mobile: "9876543210", basic: 30000, hra: 12000, allowances: 6000, grossMonthly: 48000, pfPct: 12.0, esiApplicable: false, tdsMonthly: 1500, status: "active", joined: "2024-01-15" },
        { id: "E-02", name: "Priya Shah", code: "EMP-002", designation: "Billing Engineer", department: "Finance", mobile: "9876543211", basic: 20000, hra: 8000, allowances: 4000, grossMonthly: 32000, pfPct: 12.0, esiApplicable: false, tdsMonthly: 500, status: "active", joined: "2024-06-10" },
        { id: "E-03", name: "Sanjay Yadav", code: "EMP-003", designation: "Site Supervisor", department: "Civil", mobile: "9876543212", basic: 15000, hra: 6000, allowances: 3000, grossMonthly: 24000, pfPct: 12.0, esiApplicable: true, tdsMonthly: 0, status: "active", joined: "2025-02-01" },
        { id: "E-04", name: "Amit Patel", code: "EMP-004", designation: "Safety Officer", department: "HSE", mobile: "9876543213", basic: 18000, hra: 7200, allowances: 3600, grossMonthly: 28800, pfPct: 12.0, esiApplicable: false, tdsMonthly: 200, status: "active", joined: "2025-03-12" },
      ]);
    }
  };

  const fetchAttendance = async () => {
    if (!projectId) return;
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/hr/attendance/${projectId}/${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((att: any) => ({
          id: att.id,
          employeeId: att.employee_id,
          employeeName: "", // Dynamic lookup in render
          date: att.attendance_date.split("T")[0],
          punchIn: att.punch_in ? new Date(att.punch_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "",
          punchOut: att.punch_out ? new Date(att.punch_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : "",
          hoursWorked: att.hours_worked || 0,
          overtime: att.overtime_hours || 0,
          withinGeofence: att.is_within_geofence,
          status: att.status,
          distanceFromSite: att.distance_from_site_m ? Math.round(att.distance_from_site_m) : null,
        }));
        setAttendance(mapped);
      }
    } catch (e) {
      console.error("Failed to fetch attendance", e);
      setAttendance([
        { id: "A-01", employeeId: "E-01", employeeName: "Ramesh Kumar", date: "2026-06-26", punchIn: "09:00", punchOut: "18:00", hoursWorked: 9, overtime: 1, withinGeofence: true, status: "Present", distanceFromSite: 12 },
        { id: "A-02", employeeId: "E-02", employeeName: "Priya Shah", date: "2026-06-26", punchIn: "08:55", punchOut: "17:45", hoursWorked: 8.8, overtime: 0.8, withinGeofence: true, status: "Present", distanceFromSite: 5 },
        { id: "A-03", employeeId: "E-03", employeeName: "Sanjay Yadav", date: "2026-06-26", punchIn: "09:15", punchOut: "18:30", hoursWorked: 9.25, overtime: 1.25, withinGeofence: false, status: "Present", distanceFromSite: 620 },
        { id: "A-04", employeeId: "E-04", employeeName: "Amit Patel", date: "2026-06-26", punchIn: "", punchOut: "", hoursWorked: 0, overtime: 0, withinGeofence: true, status: "Absent", distanceFromSite: null },
      ]);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchEmployees();
    }
  }, [projectId]);

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
    try {
      const res = await fetch("http://localhost:8000/apis/v3/hr/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          is_esi_applicable: parseFloat(empForm.basic) < 21000,
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

  const handleTimesheetAction = async (tsId: string, action: "submit" | "approve") => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/hr/timesheets/${tsId}/${action}`, {
        method: "PATCH"
      });
      if (res.ok) {
        setTimesheets(prev => prev.map(ts => ts.id === tsId ? { ...ts, status: action === "submit" ? "submitted" : "approved" } : ts));
      }
    } catch (e) {
      console.error("Failed to update timesheet", e);
      setTimesheets(prev => prev.map(ts => ts.id === tsId ? { ...ts, status: action === "submit" ? "submitted" : "approved" } : ts));
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
      const tsHeaderRes = await fetch("http://localhost:8000/apis/v3/hr/timesheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        // Fallback default
        tsId = "d0000000-0000-0000-0000-000000000001";
      }
      
      const startDateTime = new Date(`${timesheetForm.date}T${timesheetForm.startTime}:00Z`).toISOString();
      const endDateTime = new Date(`${timesheetForm.date}T${timesheetForm.endTime}:00Z`).toISOString();
      const { hours } = calculateHoursAndDuration(timesheetForm.startTime, timesheetForm.endTime);
      
      const res = await fetch(`http://localhost:8000/apis/v3/hr/timesheets/${tsId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      }
    } catch (e) {
      console.error("Failed to save timesheet entry", e);
    }
  };

  const handleRunPayroll = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/apis/v3/hr/payroll/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          designation: p.designation || "Staff",
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

  const tabClass = (t: string) =>
    `px-4 py-2 text-xs font-bold rounded-lg transition-all ${
      tab === t
        ? "bg-primary/15 text-primary border border-primary/30"
        : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
    }`;

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      Present: "bg-green-500/15 text-green-400 border-green-500/20",
      "Present (Off-Site)": "bg-yellow-500/15 text-yellow-400 border-yellow-500/20",
      Absent: "bg-red-500/15 text-red-400 border-red-500/20",
      "Half-Day": "bg-orange-500/15 text-orange-400 border-orange-500/20",
      Leave: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      draft: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20",
      submitted: "bg-blue-500/15 text-blue-400 border-blue-500/20",
      approved: "bg-green-500/15 text-green-400 border-green-500/20",
      rejected: "bg-red-500/15 text-red-400 border-red-500/20",
      finalized: "bg-purple-500/15 text-purple-400 border-purple-500/20",
      paid: "bg-green-500/15 text-green-400 border-green-500/20",
    };
    return `inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${map[s] ?? "bg-zinc-700/30 text-zinc-400 border-zinc-700"}`;
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-border-custom bg-sidebar flex flex-col shrink-0">
        <div className="p-5 border-b border-border-custom flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] flex items-center justify-center font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm">SiteFlow HR</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {([
            ["employees", "👷", "Employees"],
            ["attendance", "📍", "Attendance"],
            ["timesheets", "📋", "Timesheets"],
            ["payroll", "💰", "Payroll Runs"],
            ["leaves", "📅", "Leaves"],
          ] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${tab === key ? "bg-white/[0.06] text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"}`}>
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
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-14 border-b border-border-custom px-6 flex items-center justify-between bg-sidebar shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-white uppercase tracking-widest">
              {tab === "employees" && "Staff Directory"}
              {tab === "attendance" && `Daily Attendance — ${selectedDate}`}
              {tab === "timesheets" && "Weekly Timesheets"}
              {tab === "payroll" && "Payroll Engine"}
              {tab === "leaves" && "Leave Management"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-white/[0.04] border border-border-custom text-zinc-400 hover:text-white transition-all cursor-pointer"
              title="Toggle Theme"
            >
              {isLightTheme ? "🌙" : "☀️"}
            </button>

            {tab === "employees" && (
              <button onClick={() => setShowAddEmp(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer">
                + Add Employee
              </button>
            )}
            {tab === "leaves" && (
              <button onClick={() => setShowApplyLeaveModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer">
                + Apply Leave
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
                  { label: "Total Monthly CTC", val: fmt(employees.reduce((a, e) => a + e.grossMonthly + e.basic * 0.24, 0)), color: "text-primary" },
                  { label: "Departments", val: new Set(employees.map(e => e.department)).size, color: "text-secondary" },
                  { label: "PF Enrolled", val: employees.length, color: "text-blue-400" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-[#171520] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      {["Code", "Name", "Designation", "Department", "Basic", "HRA", "Allowances", "Gross/mo", "PF%", "ESI", "TDS/mo", "Status"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {employees.map(emp => (
                      <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-2.5 font-mono text-zinc-400">{emp.code}</td>
                        <td className="px-3 py-2.5 font-semibold text-white">{emp.name}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{emp.designation}</td>
                        <td className="px-3 py-2.5 text-zinc-400">{emp.department}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{fmt(emp.basic)}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{fmt(emp.hra)}</td>
                        <td className="px-3 py-2.5 text-zinc-300">{fmt(emp.allowances)}</td>
                        <td className="px-3 py-2.5 font-bold text-green-400">{fmt(emp.grossMonthly)}</td>
                        <td className="px-3 py-2.5 text-zinc-400">{emp.pfPct}%</td>
                        <td className="px-3 py-2.5">
                          <span className={emp.esiApplicable ? "text-green-400" : "text-zinc-600"}>
                            {emp.esiApplicable ? "Yes" : "N/A"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-zinc-400">{emp.tdsMonthly > 0 ? fmt(emp.tdsMonthly) : "—"}</td>
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
                  { label: "Overtime Hours", val: attendance.reduce((a, r) => a + r.overtime, 0).toFixed(1) + " hrs", color: "text-primary" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-[#171520] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">{label}</p>
                    <p className={`text-xl font-bold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {/* Attendance table */}
              <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      {["Employee", "Punch In", "Punch Out", "Hours", "OT", "Distance", "Geofence", "Status"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {attendance.map(rec => {
                      const emp = employees.find(e => e.id === rec.employeeId);
                      const empName = emp ? emp.name : "Staff Member";
                      return (
                        <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-3 py-3 font-semibold text-white">{empName}</td>
                          <td className="px-3 py-3 font-mono text-green-400">{rec.punchIn || "—"}</td>
                          <td className="px-3 py-3 font-mono text-zinc-400">{rec.punchOut || <span className="text-yellow-500 animate-pulse">Active</span>}</td>
                          <td className="px-3 py-3 text-white font-bold">{rec.hoursWorked > 0 ? `${rec.hoursWorked}h` : "—"}</td>
                          <td className="px-3 py-3 text-orange-400">{rec.overtime > 0 ? `+${rec.overtime.toFixed(2)}h` : "—"}</td>
                          <td className="px-3 py-3 text-zinc-400">
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
              <div className="bg-[#171520] border border-white/5 rounded-xl p-6 text-center">
                <div className="relative mx-auto w-64 h-64 rounded-full bg-[#0E0C15] border-2 border-white/5 flex items-center justify-center">
                  {/* Geofence circle */}
                  <div className="absolute w-40 h-40 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-primary animate-ping absolute" />
                    <div className="w-3 h-3 rounded-full bg-primary absolute" />
                  </div>
                  {/* Employee dots */}
                  <div className="absolute top-12 left-16 w-2 h-2 rounded-full bg-green-400" title="Ramesh — inside" />
                  <div className="absolute top-16 left-24 w-2 h-2 rounded-full bg-green-400" title="Priya — inside" />
                  <div className="absolute top-5 left-8 w-2 h-2 rounded-full bg-yellow-400" title="Sanjay — outside" />
                  <div className="absolute top-20 left-28 w-2 h-2 rounded-full bg-green-400" title="Meera — inside" />
                </div>
                <p className="text-xs text-zinc-500 mt-4">Live Geofence Map (PostGIS-powered in production)</p>
                <p className="text-[10px] text-zinc-600 mt-1">Radius: 500m  •  Site: Metro Terminal Phase 2, Mumbai</p>
              </div>
            </div>
          )}

          {/* ── TIMESHEETS ── */}
          {tab === "timesheets" && (
            <div className="space-y-8">
              {/* Weekly Summary */}
              <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">Weekly Timesheet Approvals</span>
                  <button
                    onClick={() => {
                      if (employees.length > 0) {
                        setTimesheetForm(prev => ({ ...prev, employeeId: employees[0].id }));
                      }
                      setShowNewTimesheetDrawer(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-all"
                  >
                    ⚡ Log Daily Activity
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      {["Employee", "Week Range", "Total Hours", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {timesheets.map(ts => (
                      <tr key={ts.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">{ts.employeeName}</td>
                        <td className="px-4 py-3 text-zinc-400">{ts.weekStart} → {ts.weekEnd}</td>
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
                            <button className="text-[10px] px-2 py-1 rounded bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10">View</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Daily Log Entries */}
              <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">👷 Daily Activity & Timesheet Logs</span>
                </div>
                {timesheetLogs.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-xs">
                    No daily timesheet entries logged yet. Click "Log Daily Activity" to start.
                  </div>
                ) : (
                  <table className="w-full text-xs">
                    <thead className="bg-white/[0.02] border-b border-white/5">
                      <tr>
                        {["Date", "Employee", "Start Time", "End Time", "Duration", "Hours", "Activity / Task", "Remarks"].map(h => (
                          <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {timesheetLogs.map((log: any) => {
                        const taskName = projectTasks.find(t => t.id === log.task_id)?.name || "General Work";
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
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3 font-mono text-zinc-400">{formattedDate}</td>
                            <td className="px-4 py-3 font-semibold text-white">{log.employee_name || "Staff"}</td>
                            <td className="px-4 py-3 font-mono text-green-400">{fmtTime(log.start_time)}</td>
                            <td className="px-4 py-3 font-mono text-zinc-400">{fmtTime(log.end_time)}</td>
                            <td className="px-4 py-3 text-white font-semibold font-mono">{durationStr}</td>
                            <td className="px-4 py-3 font-bold text-blue-400 font-mono">{log.hours}h</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5 text-[10px] text-zinc-300">
                                {taskName}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-zinc-400 max-w-[200px] truncate" title={log.activity_description}>
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
                  <div className="w-full max-w-md h-full bg-[#0E0C15] border-l border-white/10 p-6 flex flex-col justify-between overflow-y-auto">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center border-b border-white/5 pb-4">
                        <div>
                          <h3 className="text-sm font-bold text-white">Log Timesheet Entry</h3>
                          <p className="text-[10px] text-zinc-500">Record daily hour logs & activity details</p>
                        </div>
                        <button
                          onClick={() => setShowNewTimesheetDrawer(false)}
                          className="text-zinc-500 hover:text-white text-lg font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Employee / Party Name</label>
                          <select
                            value={timesheetForm.employeeId}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, employeeId: e.target.value }))}
                            className="w-full bg-[#171520] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                          >
                            <option value="">Select Employee</option>
                            {employees.map(e => (
                              <option key={e.id} value={e.id}>{e.name} ({e.designation})</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Date</label>
                          <input
                            type="date"
                            value={timesheetForm.date}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full bg-[#171520] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase block">Start Time</label>
                            <input
                              type="time"
                              value={timesheetForm.startTime}
                              onChange={(e) => setTimesheetForm(prev => ({ ...prev, startTime: e.target.value }))}
                              className="w-full bg-[#171520] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] text-zinc-500 font-bold uppercase block">Stop Time</label>
                            <input
                              type="time"
                              value={timesheetForm.endTime}
                              onChange={(e) => setTimesheetForm(prev => ({ ...prev, endTime: e.target.value }))}
                              className="w-full bg-[#171520] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                            />
                          </div>
                        </div>

                        {/* Calculated Duration display */}
                        <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Calculated Duration</span>
                            <span className="text-white font-extrabold font-mono text-sm">
                              {calculateHoursAndDuration(timesheetForm.startTime, timesheetForm.endTime).durationStr}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] text-zinc-500 uppercase block font-bold text-right">Hours Logged</span>
                            <span className="text-primary font-black font-mono text-sm block text-right">
                              {calculateHoursAndDuration(timesheetForm.startTime, timesheetForm.endTime).hours}h
                            </span>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Project Task / Activity</label>
                          <select
                            value={timesheetForm.taskId}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, taskId: e.target.value }))}
                            className="w-full bg-[#171520] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary"
                          >
                            <option value="">Select Project Task (Optional)</option>
                            {projectTasks.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Remarks / Notes</label>
                          <textarea
                            value={timesheetForm.remarks}
                            onChange={(e) => setTimesheetForm(prev => ({ ...prev, remarks: e.target.value }))}
                            rows={3}
                            placeholder="Enter remarks or details of work done..."
                            className="w-full bg-[#171520] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-primary resize-none"
                          />
                        </div>

                        {/* File Upload Attachment Placeholder */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-zinc-500 font-bold uppercase block">Attachments</label>
                          <div className="border border-dashed border-white/10 rounded-lg p-4 text-center cursor-pointer hover:bg-white/[0.01] transition-all">
                            <span className="text-xl">📎</span>
                            <span className="text-[10px] text-zinc-500 block mt-1">Upload files, logs or PDF proof</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 border-t border-white/5 pt-4 mt-6">
                      <button
                        onClick={() => setShowNewTimesheetDrawer(false)}
                        className="flex-1 px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveTimesheetEntry}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-primary to-[#FF3B6C] rounded-lg text-xs font-bold text-white shadow-lg shadow-primary/20 transition-all hover:brightness-110"
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
              <div className="bg-[#171520] border border-white/5 rounded-xl p-5">
                <h2 className="text-sm font-bold text-white mb-4">🚀 Run Monthly Payroll</h2>
                <div className="flex items-end gap-4">
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1.5">Payroll Month</label>
                    <input type="month" value={payrollMonth} onChange={e => setPayrollMonth(e.target.value)}
                      className="bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 font-bold uppercase block mb-1.5">Working Days</label>
                    <input type="number" min={1} max={31} value={daysInMonth} onChange={e => setDaysInMonth(Number(e.target.value))}
                      className="w-24 bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary" />
                  </div>
                  <button onClick={handleRunPayroll}
                    className="px-5 py-2 bg-primary rounded-lg text-white text-sm font-bold hover:bg-primary/90 transition-all">
                    Compute Payroll
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
                      <div key={label} className="bg-[#171520] border border-white/5 rounded-xl p-5">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{label}</p>
                        <p className={`text-2xl font-bold ${color}`}>{val}</p>
                        <p className="text-[10px] text-zinc-600 mt-1">{payrollRun.month} payroll</p>
                      </div>
                    ))}
                  </div>

                  {/* Payslips table */}
                  <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Employee Payslips — {payrollRun.month}</span>
                      <span className={statusBadge("finalized")}>{payrollRun.status}</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead className="bg-white/[0.02] border-b border-white/5">
                        <tr>
                          {["Employee", "Days", "Gross", "PF (Emp)", "PF (Er)", "ESI", "TDS", "Deductions", "Net Pay", ""].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {payrollRun.payslips.map(p => (
                          <tr key={p.employeeId} className="hover:bg-white/[0.02] transition-colors cursor-pointer" onClick={() => setSelectedPayslip(p)}>
                            <td className="px-3 py-3">
                              <div className="font-semibold text-white">{p.employeeName}</div>
                              <div className="text-[10px] text-zinc-500">{p.designation}</div>
                            </td>
                            <td className="px-3 py-3 text-zinc-300">{p.daysPresent}/{p.daysInMonth}</td>
                            <td className="px-3 py-3 font-bold text-green-400">{fmt(p.gross)}</td>
                            <td className="px-3 py-3 text-zinc-400">{fmt(p.pfEmployee)}</td>
                            <td className="px-3 py-3 text-zinc-500">{fmt(p.pfEmployer)}</td>
                            <td className="px-3 py-3 text-zinc-400">{p.esiEmployee > 0 ? fmt(p.esiEmployee) : <span className="text-zinc-600">N/A</span>}</td>
                            <td className="px-3 py-3 text-zinc-400">{p.tds > 0 ? fmt(p.tds) : "—"}</td>
                            <td className="px-3 py-3 text-red-400 font-bold">{fmt(p.totalDeductions)}</td>
                            <td className="px-3 py-3 font-bold text-primary text-sm">{fmt(p.netPayable)}</td>
                            <td className="px-3 py-3">
                              <button className="text-[10px] px-2 py-1 rounded bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10">Payslip</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {!payrollRun && (
                <div className="bg-[#171520] border border-white/5 rounded-xl p-16 text-center">
                  <p className="text-4xl mb-3">💰</p>
                  <p className="text-sm text-zinc-400 font-semibold">No payroll run yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Select a month and click "Compute Payroll" to generate payslips</p>
                </div>
              )}
            </div>
          )}

          {/* ── LEAVES ── */}
          {tab === "leaves" && (
            <div className="space-y-4 font-sans">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Employee Leave Requests & Balances</h2>
                  <p className="text-[10px] text-zinc-600 mt-0.5">Submit, review and approve casual/sick/earned leave requests for the site personnel.</p>
                </div>
              </div>

              {/* Leave Balances Grid */}
              <div className="grid grid-cols-4 gap-4">
                {[
                  { title: "Ramesh Kumar", casual: 8, sick: 4, earned: 12 },
                  { title: "Priya Shah", casual: 10, sick: 5, earned: 14 },
                  { title: "Sanjay Yadav", casual: 6, sick: 3, earned: 8 },
                  { title: "Meera Nair", casual: 8, sick: 4, earned: 12 },
                ].map((bal, idx) => (
                  <div key={idx} className="bg-[#171520] border border-white/5 rounded-xl p-4 space-y-2">
                    <span className="text-xs font-bold text-white block">{bal.title}</span>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                      <div className="bg-black/30 p-1.5 rounded">
                        <span className="text-zinc-500 block">Casual</span>
                        <strong className="text-primary font-bold">{bal.casual}</strong>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded">
                        <span className="text-zinc-500 block">Sick</span>
                        <strong className="text-amber-400 font-bold">{bal.sick}</strong>
                      </div>
                      <div className="bg-black/30 p-1.5 rounded">
                        <span className="text-zinc-500 block">Earned</span>
                        <strong className="text-emerald-400 font-bold">{bal.earned}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Leave Requests Listing */}
              <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden mt-6">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Leave Application Logs</span>
                </div>
                <table className="w-full text-xs text-left">
                  <thead className="bg-white/[0.02] border-b border-white/5 text-zinc-500 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Employee</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-4 py-3 font-semibold">Duration</th>
                      <th className="px-4 py-3 font-semibold">Reason</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-zinc-300">
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-white/[0.01] transition-all">
                        <td className="px-4 py-3 font-bold text-white">{leave.employeeName}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            leave.leaveType === "Sick" ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" : "bg-primary/10 border border-primary/20 text-primary"
                          }`}>{leave.leaveType}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold">{leave.startDate} to {leave.endDate}</span>
                          <span className="block text-[10px] text-zinc-500 mt-0.5">({leave.days} day{leave.days > 1 ? "s" : ""})</span>
                        </td>
                        <td className="px-4 py-3 text-zinc-400 max-w-xs truncate">{leave.reason}</td>
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
                              <button onClick={() => setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, status: "Approved" } : l))}
                                className="px-2.5 py-1 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded text-[10px] font-bold transition-all">
                                Approve
                              </button>
                              <button onClick={() => setLeaves(prev => prev.map(l => l.id === leave.id ? { ...l, status: "Rejected" } : l))}
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
        </div>
      </main>

      {/* Payslip modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPayslip(null)}>
          <div className="bg-[#171520] border border-white/10 rounded-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-white">Payslip — {selectedPayslip.employeeName}</h2>
                <p className="text-xs text-zinc-500">{selectedPayslip.designation} · {payrollMonth}</p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="px-3 py-1 bg-primary/20 hover:bg-primary/35 text-primary border border-primary/30 rounded text-[10px] font-bold transition-all">
                  🖨️ Download PDF
                </button>
                <button onClick={() => setSelectedPayslip(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
              </div>
            </div>

            {/* Earnings */}
            <div className="space-y-1 mb-4">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Earnings</p>
              {[
                ["Basic Salary", selectedPayslip.basic],
                ["HRA", selectedPayslip.hra],
                ["Other Allowances", selectedPayslip.allowances],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-xs">
                  <span className="text-zinc-400">{label}</span>
                  <span className="text-white font-semibold">{fmt(val as number)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-zinc-300 font-bold">Gross ({selectedPayslip.daysPresent}/{selectedPayslip.daysInMonth} days)</span>
                <span className="text-green-400 font-bold">{fmt(selectedPayslip.gross)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="space-y-1 mb-4">
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Deductions</p>
              {[
                ["PF (Employee 12%)", selectedPayslip.pfEmployee],
                ["PF (Employer 12%)", selectedPayslip.pfEmployer],
                ["ESI (Employee 0.75%)", selectedPayslip.esiEmployee],
                ["ESI (Employer 3.25%)", selectedPayslip.esiEmployer],
                ["TDS", selectedPayslip.tds],
              ].map(([label, val]) => (
                <div key={label as string} className="flex justify-between text-xs">
                  <span className="text-zinc-400">{label}</span>
                  <span className={(val as number) > 0 ? "text-red-400" : "text-zinc-600"}>
                    {(val as number) > 0 ? fmt(val as number) : "N/A"}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-2 border-t border-white/5">
                <span className="text-zinc-300 font-bold">Total Deductions</span>
                <span className="text-red-400 font-bold">{fmt(selectedPayslip.totalDeductions)}</span>
              </div>
            </div>

            {/* Net */}
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
              <span className="text-sm font-bold text-white">Net Payable</span>
              <span className="text-2xl font-bold text-primary">{fmt(selectedPayslip.netPayable)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Employee modal stub */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddEmp(false)}>
          <div className="bg-[#171520] border border-white/10 rounded-2xl w-full max-w-xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Add New Employee</h2>
              <button onClick={() => setShowAddEmp(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
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
                  <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={(empForm as any)[key]}
                    onChange={(e) => setEmpForm({ ...empForm, [key]: e.target.value })}
                    className="w-full bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs"
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
              <button onClick={() => setShowAddEmp(false)} className="px-4 py-2 rounded-lg border border-white/10 text-zinc-400 text-sm hover:text-white hover:border-white/20">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Apply Leave Modal */}
      {showApplyLeaveModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowApplyLeaveModal(false)}>
          <div className="bg-[#171520] border border-white/10 rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-bold text-white">Apply for Leave</h2>
              <button onClick={() => setShowApplyLeaveModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold block">Select Employee</label>
                <select
                  value={leaveForm.employeeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })}
                  className="w-full bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                >
                  <option value="E-01">Ramesh Kumar (EMP-001)</option>
                  <option value="E-02">Priya Shah (EMP-002)</option>
                  <option value="E-03">Sanjay Yadav (EMP-003)</option>
                  <option value="E-04">Meera Nair (EMP-004)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold block">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                >
                  <option value="Casual">Casual Leave</option>
                  <option value="Sick">Sick Leave</option>
                  <option value="Earned">Earned Leave</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold block">Start Date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-zinc-500 uppercase font-bold block">End Date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-zinc-500 uppercase font-bold block">Reason / Description</label>
                <textarea
                  placeholder="Reason for requesting leave..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  rows={3}
                  className="w-full bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  const emp = employees.find(e => e.id === leaveForm.employeeId) || { name: leaveForm.employeeId === "E-01" ? "Ramesh Kumar" : leaveForm.employeeId === "E-02" ? "Priya Shah" : leaveForm.employeeId === "E-03" ? "Sanjay Yadav" : "Meera Nair" };
                  const d1 = new Date(leaveForm.startDate);
                  const d2 = new Date(leaveForm.endDate);
                  const diff = Math.ceil(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                  const newLv = {
                    id: `LV-${Date.now()}`,
                    employeeId: leaveForm.employeeId,
                    employeeName: emp.name,
                    leaveType: leaveForm.leaveType,
                    startDate: leaveForm.startDate,
                    endDate: leaveForm.endDate,
                    days: isNaN(diff) ? 1 : diff,
                    reason: leaveForm.reason,
                    status: "Pending"
                  };
                  setLeaves([newLv, ...leaves]);
                  setShowApplyLeaveModal(false);
                  setLeaveForm({ employeeId: "E-01", leaveType: "Casual", startDate: "", endDate: "", reason: "" });
                }}
                className="flex-1 py-2 bg-primary rounded-lg text-white text-sm font-bold hover:bg-primary/90 transition-all"
              >
                Submit Application
              </button>
              <button onClick={() => setShowApplyLeaveModal(false)} className="px-4 py-2 rounded-lg border border-white/10 text-zinc-400 text-sm hover:text-white hover:border-white/20">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
