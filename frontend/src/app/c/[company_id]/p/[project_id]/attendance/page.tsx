"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const WORKERS = [
  { id: "W001", name: "Ramesh Kumar", role: "Mason", in: "07:52 AM", out: "06:10 PM", hours: 10.3, status: "Present", wage: "₹850", gps: "✓ On-site" },
  { id: "W002", name: "Suresh Patel", role: "Carpenter", in: "08:05 AM", out: "05:45 PM", hours: 9.7, status: "Present", wage: "₹750", gps: "✓ On-site" },
  { id: "W003", name: "Mohan Verma", role: "Helper", in: "08:30 AM", out: "—", hours: 0, status: "Present", wage: "₹550", gps: "✓ On-site" },
  { id: "W004", name: "Dinesh Yadav", role: "Electrician", in: "—", out: "—", hours: 0, status: "Absent", wage: "₹0", gps: "✗ Off-site" },
  { id: "W005", name: "Arjun Singh", role: "Plumber", in: "09:10 AM", out: "05:00 PM", hours: 7.8, status: "Half Day", wage: "₹425", gps: "✓ On-site" },
  { id: "W006", name: "Ravi Tiwari", role: "Mason", in: "07:45 AM", out: "06:30 PM", hours: 10.75, status: "Present", wage: "₹850", gps: "✓ On-site" },
  { id: "W007", name: "Santosh Rawat", role: "Helper", in: "08:00 AM", out: "06:00 PM", hours: 10.0, status: "Present", wage: "₹550", gps: "✓ On-site" },
  { id: "W008", name: "Vikram Joshi", role: "Site Engineer", in: "08:15 AM", out: "07:00 PM", hours: 10.75, status: "Present", wage: "₹1,800", gps: "✓ On-site" },
];

const PAYROLL_SUMMARY = [
  { month: "Jun 2026", workers: 48, totalDays: 1104, grossWage: "₹8,24,600", deductions: "₹41,230", netPayable: "₹7,83,370", status: "Processing" },
  { month: "May 2026", workers: 51, totalDays: 1173, grossWage: "₹8,76,450", deductions: "₹43,820", netPayable: "₹8,32,630", status: "Paid" },
  { month: "Apr 2026", workers: 44, totalDays: 968, grossWage: "₹7,41,200", deductions: "₹37,060", netPayable: "₹7,04,140", status: "Paid" },
];

const STATUS_MAP: Record<string, string> = {
  Present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Absent: "bg-red-500/10 text-red-400 border-red-500/20",
  "Half Day": "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function AttendancePage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const [tab, setTab] = useState<"today" | "payroll">("today");
  const [date] = useState("Jun 26, 2026");

  const present = WORKERS.filter(w => w.status === "Present").length;
  const absent = WORKERS.filter(w => w.status === "Absent").length;
  const halfDay = WORKERS.filter(w => w.status === "Half Day").length;

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">← Dashboard</Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">Attendance & Payroll</div>
          {[
            { key: "today", label: "Today's Attendance", icon: "📅" },
            { key: "payroll", label: "Payroll Runs", icon: "💵" },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key as typeof tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${tab === item.key ? "bg-primary/10 text-primary border-l-2 border-primary" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Attendance & Payroll</h1>
            <p className="text-[10px] text-zinc-500">GPS Punch-in · Face Recognition · Salary Processing</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">📍 Geofence: Active</span>
            <button className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all">
              + Manual Entry
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "today" && (
            <>
              {/* Date + Stats */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500">Attendance Register</div>
                  <div className="text-base font-bold text-white">{date} — Metro Terminal (Phase 2)</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Total Workforce", value: WORKERS.length, color: "text-white" },
                  { label: "Present Today", value: present, color: "text-emerald-400" },
                  { label: "Absent", value: absent, color: "text-red-400" },
                  { label: "Half Day", value: halfDay, color: "text-amber-400" },
                ].map((s, i) => (
                  <div key={i} className="glass-panel rounded-xl p-4 border border-white/5">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">{s.label}</div>
                    <div className={`text-3xl font-extrabold mt-1 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Workers Table */}
              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Worker Attendance Log</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-emerald-400 font-semibold">● GPS Verified</span>
                    <button className="text-xs text-primary hover:underline ml-3">Export</button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="text-left px-5 py-3 font-semibold">Worker</th>
                        <th className="text-left px-5 py-3 font-semibold">Role</th>
                        <th className="text-left px-5 py-3 font-semibold">Clock In</th>
                        <th className="text-left px-5 py-3 font-semibold">Clock Out</th>
                        <th className="text-left px-5 py-3 font-semibold">Hours</th>
                        <th className="text-left px-5 py-3 font-semibold">GPS</th>
                        <th className="text-left px-5 py-3 font-semibold">Status</th>
                        <th className="text-right px-5 py-3 font-semibold">Day Wage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {WORKERS.map((w, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3 font-semibold text-white">{w.name}</td>
                          <td className="px-5 py-3 text-zinc-400">{w.role}</td>
                          <td className="px-5 py-3 text-zinc-300 font-mono">{w.in}</td>
                          <td className="px-5 py-3 text-zinc-300 font-mono">{w.out}</td>
                          <td className="px-5 py-3 text-white font-bold">{w.hours > 0 ? `${w.hours}h` : "—"}</td>
                          <td className="px-5 py-3 text-xs">{w.gps.startsWith("✓") ? <span className="text-emerald-400">{w.gps}</span> : <span className="text-red-400">{w.gps}</span>}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_MAP[w.status]}`}>{w.status}</span>
                          </td>
                          <td className="px-5 py-3 text-right font-bold text-white">{w.wage}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10 bg-white/[0.01]">
                        <td colSpan={7} className="px-5 py-3 text-xs text-zinc-400 font-bold">Day Total (8 workers shown)</td>
                        <td className="px-5 py-3 text-right text-sm font-extrabold text-primary">₹5,775</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}

          {tab === "payroll" && (
            <div className="space-y-5">
              <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5">
                  <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Payroll Run History</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500">
                        <th className="text-left px-5 py-3 font-semibold">Month</th>
                        <th className="text-left px-5 py-3 font-semibold">Workers</th>
                        <th className="text-left px-5 py-3 font-semibold">Work-Days</th>
                        <th className="text-right px-5 py-3 font-semibold">Gross Wage</th>
                        <th className="text-right px-5 py-3 font-semibold">Deductions</th>
                        <th className="text-right px-5 py-3 font-semibold">Net Payable</th>
                        <th className="text-left px-5 py-3 font-semibold">Status</th>
                        <th className="text-left px-5 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {PAYROLL_SUMMARY.map((p, i) => (
                        <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                          <td className="px-5 py-3 font-bold text-white">{p.month}</td>
                          <td className="px-5 py-3 text-zinc-300">{p.workers}</td>
                          <td className="px-5 py-3 text-zinc-300">{p.totalDays}</td>
                          <td className="px-5 py-3 text-right text-white">{p.grossWage}</td>
                          <td className="px-5 py-3 text-right text-red-400">{p.deductions}</td>
                          <td className="px-5 py-3 text-right font-extrabold text-primary">{p.netPayable}</td>
                          <td className="px-5 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${p.status === "Paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"}`}>{p.status}</span>
                          </td>
                          <td className="px-5 py-3">
                            <button className="text-xs text-secondary hover:underline">{p.status === "Processing" ? "Process →" : "View"}</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
