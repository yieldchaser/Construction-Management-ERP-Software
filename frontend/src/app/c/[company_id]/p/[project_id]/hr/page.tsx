"use client";

import React, { useState } from "react";
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
    const pfEmp = Math.round(basicPro * emp.pfPct / 100 * 100) / 100;
    const pfEr  = Math.round(basicPro * emp.pfPct / 100 * 100) / 100;
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

  const [tab, setTab] = useState<"employees" | "attendance" | "timesheets" | "payroll">("employees");
  const [employees] = useState<Employee[]>(MOCK_EMPLOYEES);
  const [attendance] = useState<AttendanceRecord[]>(MOCK_ATTENDANCE);
  const [selectedDate] = useState("2026-06-26");
  const [payrollMonth, setPayrollMonth] = useState("2026-06");
  const [daysInMonth, setDaysInMonth] = useState(26);
  const [payrollRun, setPayrollRun] = useState<PayrollRun | null>(null);
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipLine | null>(null);

  // Timesheets mock
  const timesheets: Timesheet[] = [
    { id: "TS-01", employeeId: "E-01", employeeName: "Ramesh Kumar", weekStart: "2026-06-16", weekEnd: "2026-06-22", totalHours: 47.5, status: "approved" },
    { id: "TS-02", employeeId: "E-02", employeeName: "Priya Shah", weekStart: "2026-06-16", weekEnd: "2026-06-22", totalHours: 44.0, status: "submitted" },
    { id: "TS-03", employeeId: "E-03", employeeName: "Sanjay Yadav", weekStart: "2026-06-23", weekEnd: "2026-06-29", totalHours: 18.5, status: "draft" },
  ];

  const handleRunPayroll = () => {
    // Days present = attendance count (mock: all 4 employees present today → assume monthly)
    const daysPresent: Record<string, number> = { "E-01": 25, "E-02": 26, "E-03": 24, "E-04": 23 };
    const payslips = computePayslips(employees, daysPresent, daysInMonth);
    const totalGross = payslips.reduce((a, p) => a + p.gross, 0);
    const totalDeductions = payslips.reduce((a, p) => a + p.totalDeductions, 0);
    const totalNet = payslips.reduce((a, p) => a + p.netPayable, 0);
    setPayrollRun({
      id: "PR-01", month: payrollMonth, status: "finalized",
      totalGross: Math.round(totalGross * 100) / 100,
      totalDeductions: Math.round(totalDeductions * 100) / 100,
      totalNet: Math.round(totalNet * 100) / 100,
      payslips,
    });
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
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-5 border-b border-white/5 flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] flex items-center justify-center font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm">SiteFlow HR</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          {([
            ["employees", "👷", "Employees"],
            ["attendance", "📍", "Attendance"],
            ["timesheets", "📋", "Timesheets"],
            ["payroll", "💰", "Payroll Runs"],
          ] as const).map(([key, icon, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${tab === key ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.03]"}`}>
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
        <header className="h-14 border-b border-white/5 px-6 flex items-center justify-between bg-[#0B0910] shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-bold text-white uppercase tracking-widest">
              {tab === "employees" && "Staff Directory"}
              {tab === "attendance" && `Daily Attendance — ${selectedDate}`}
              {tab === "timesheets" && "Weekly Timesheets"}
              {tab === "payroll" && "Payroll Engine"}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {tab === "employees" && (
              <button onClick={() => setShowAddEmp(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all">
                + Add Employee
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
                    {attendance.map(rec => (
                      <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-3 py-3 font-semibold text-white">{rec.employeeName}</td>
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
                    ))}
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
            <div className="space-y-4">
              <div className="bg-[#171520] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">Weekly Timesheets</span>
                  <button className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold border border-primary/20 hover:bg-primary/20 transition-all">
                    + New Timesheet
                  </button>
                </div>
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.02] border-b border-white/5">
                    <tr>
                      {["Employee", "Week", "Total Hours", "Status", "Actions"].map(h => (
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
                              <button className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20">Submit</button>
                            )}
                            {ts.status === "submitted" && (
                              <button className="text-[10px] px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20">Approve</button>
                            )}
                            <button className="text-[10px] px-2 py-1 rounded bg-white/5 text-zinc-400 border border-white/10 hover:bg-white/10">View</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
              <button onClick={() => setSelectedPayslip(null)} className="text-zinc-500 hover:text-white text-xl">✕</button>
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
                ["Full Name", "text", "Ramesh Kumar"],
                ["Employee Code", "text", "EMP-005"],
                ["Designation", "text", "Site Supervisor"],
                ["Department", "text", "Civil"],
                ["Mobile", "tel", "9876543210"],
                ["Basic Salary (₹)", "number", "18000"],
                ["HRA (₹)", "number", "3600"],
                ["Other Allowances (₹)", "number", "1800"],
                ["TDS/Month (₹)", "number", "0"],
                ["Date of Joining", "date", ""],
              ].map(([label, type, placeholder]) => (
                <div key={label}>
                  <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-1">{label}</label>
                  <input type={type} placeholder={placeholder}
                    className="w-full bg-[#0E0C15] border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-xs" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-5">
              <button className="flex-1 py-2 bg-primary rounded-lg text-white text-sm font-bold hover:bg-primary/90 transition-all">Save Employee</button>
              <button onClick={() => setShowAddEmp(false)} className="px-4 py-2 rounded-lg border border-white/10 text-zinc-400 text-sm hover:text-white hover:border-white/20">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
