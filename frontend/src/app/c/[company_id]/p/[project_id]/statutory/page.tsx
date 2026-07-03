"use client";
import { getApiHost } from "@/lib/api";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Report {
  id: string;
  report_type: string;
  return_period: string;
  total_employees: number;
  total_wages: number;
  pf_employee_contribution: number;
  pf_employer_contribution: number;
  esi_employee_contribution: number;
  esi_employer_contribution: number;
  bocw_cess: number;
  tds_deducted: number;
  filed_at?: string;
  filed_by?: string;
  acknowledgment_number?: string;
  status: string;
  due_date?: string;
  days_overdue: number;
  penalty_estimate: number;
  created_at: string;
}

interface PenaltyEstimate {
  report_type: string;
  return_period: string;
  total_wages: number;
  due_date?: string;
  estimated_penalty: number;
}

export default function StatutoryPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [reports, setReports] = useState<Report[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [message, setMessage] = useState("");
  const [showPenalty, setShowPenalty] = useState(false);
  const [penaltyData, setPenaltyData] = useState<PenaltyEstimate | null>(null);

  const [form, setForm] = useState({
    report_type: "pf",
    return_period: "",
    total_employees: 0,
    total_wages: 0,
    pf_employee_contribution: 0,
    pf_employer_contribution: 0,
    esi_employee_contribution: 0,
    esi_employer_contribution: 0,
    bocw_cess: 0,
    tds_deducted: 0,
    filed_by: "",
  });

  const fetchReports = async () => {
    try {
      const url = `${getApiHost()}/apis/v3/statutory/${companyId}${filterType ? `?report_type=${filterType}` : ""}`;
      const res = await fetch(url);
      if (res.ok) setReports(await res.json());
    } catch (e) { console.error("Failed to load reports", e); }
  };

  useEffect(() => {
    const id = setTimeout(() => fetchReports(), 0);
    return () => clearTimeout(id);
  }, [companyId, filterType]);

  const handleAutoPopulate = async () => {
    const reportType = form.report_type;
    const returnPeriod = form.return_period;
    if (!returnPeriod) { setMessage("Please enter return period first"); return; }
    try {
      const url = `${getApiHost()}/apis/v3/statutory/${companyId}/auto-populate?report_type=${reportType}&return_period=${returnPeriod}${projectId ? `&project_id=${projectId}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setForm({
          report_type: data.report_type,
          return_period: data.return_period,
          total_employees: data.total_employees,
          total_wages: Number(data.total_wages),
          pf_employee_contribution: Number(data.pf_employee_contribution),
          pf_employer_contribution: Number(data.pf_employer_contribution),
          esi_employee_contribution: Number(data.esi_employee_contribution),
          esi_employer_contribution: Number(data.esi_employer_contribution),
          bocw_cess: Number(data.bocw_cess),
          tds_deducted: Number(data.tds_deducted),
          filed_by: "",
        });
        setMessage("Auto-populated from employee data");
      }
    } catch (_e) { void _e; setMessage("Error auto-populating"); }
  };

  const handleEstimatePenalty = async () => {
    const returnPeriod = form.return_period;
    if (!returnPeriod) { setMessage("Please enter return period first"); return; }
    try {
      const url = `${getApiHost()}/apis/v3/statutory/${companyId}/penalty?report_type=${form.report_type}&return_period=${returnPeriod}&total_wages=${form.total_wages}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPenaltyData(data);
        setShowPenalty(true);
      }
    } catch (_e2) { void _e2; setMessage("Error estimating penalty"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const body = { ...form, company_id: companyId, project_id: projectId || null, status: "draft" };
      const res = await fetch(`${getApiHost()}/apis/v3/statutory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setMessage("Report created successfully");
        setShowModal(false);
        setForm({
          report_type: "pf",
          return_period: "",
          total_employees: 0,
          total_wages: 0,
          pf_employee_contribution: 0,
          pf_employer_contribution: 0,
          esi_employee_contribution: 0,
          esi_employer_contribution: 0,
          bocw_cess: 0,
          tds_deducted: 0,
          filed_by: "",
        });
        fetchReports();
      } else {
        const err = await res.json();
        setMessage(err.detail || "Failed");
      }
    } catch (_e) { void _e; setMessage("Error"); }
  };

  const handleFile = async (reportId: string) => {
    const ack = prompt("Enter acknowledgment number:");
    const by = prompt("Enter filed by name:");
    if (!ack || !by) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/statutory/${reportId}/file?acknowledgment_number=${ack}&filed_by=${by}`, { method: "PATCH" });
      if (res.ok) {
        setMessage("Report filed successfully");
        fetchReports();
      } else {
        setMessage("Failed to file report");
      }
    } catch (_e) { void _e; setMessage("Error"); }
  };

  const typeLabels: Record<string, string> = {
    pf: "Provident Fund",
    esi: "ESI",
    bocw: "BOCW Cess",
    tds: "TDS",
    pt: "Professional Tax",
    it: "Income Tax",
  };

  const statusColors: Record<string, string> = {
    draft: "bg-zinc-500/10 text-zinc-400",
    filed: "bg-emerald-500/10 text-emerald-400",
    overdue: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Statutory Reports</h1>
            <p className="text-zinc-400 mt-1">PF, ESI, BOCW, TDS and other compliance filings</p>
          </div>
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white text-sm"
            >
              <option value="">All Types</option>
              <option value="pf">PF</option>
              <option value="esi">ESI</option>
              <option value="bocw">BOCW</option>
              <option value="tds">TDS</option>
            </select>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all"
            >
              New Report
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes("success") || message.includes("filed") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Period</th>
                <th className="px-6 py-4 font-medium">Employees</th>
                <th className="px-6 py-4 font-medium">Total Wages</th>
                <th className="px-6 py-4 font-medium">PF (E+ER)</th>
                <th className="px-6 py-4 font-medium">ESI (E+ER)</th>
                <th className="px-6 py-4 font-medium">BOCW</th>
                <th className="px-6 py-4 font-medium">TDS</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {reports.length === 0 ? (
                <tr><td colSpan={10} className="px-6 py-8 text-center text-zinc-500">No reports found</td></tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium">{typeLabels[r.report_type] || r.report_type}</td>
                    <td className="px-6 py-4">{r.return_period}</td>
                    <td className="px-6 py-4">{r.total_employees}</td>
                    <td className="px-6 py-4">₹{Number(r.total_wages).toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs">₹{Number(r.pf_employee_contribution).toLocaleString()} / ₹{Number(r.pf_employer_contribution).toLocaleString()}</td>
                    <td className="px-6 py-4 text-xs">₹{Number(r.esi_employee_contribution).toLocaleString()} / ₹{Number(r.esi_employer_contribution).toLocaleString()}</td>
                    <td className="px-6 py-4">₹{Number(r.bocw_cess).toLocaleString()}</td>
                    <td className="px-6 py-4">₹{Number(r.tds_deducted).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[r.status]}`}>{r.status}</span>
                        {r.days_overdue > 0 && (
                          <span className="ml-2 text-[10px] text-red-400">{r.days_overdue}d overdue</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 flex gap-2">
                      {r.status === "draft" && (
                        <button onClick={() => handleFile(r.id)} className="px-3 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-all">File</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {showPenalty && penaltyData && (
          <div className="mt-6 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4">Penalty Estimate</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-zinc-400">Report Type:</span> <span className="text-white">{penaltyData.report_type}</span></div>
              <div><span className="text-zinc-400">Period:</span> <span className="text-white">{penaltyData.return_period}</span></div>
              <div><span className="text-zinc-400">Total Wages:</span> <span className="text-white">₹{Number(penaltyData.total_wages).toLocaleString()}</span></div>
              <div><span className="text-zinc-400">Due Date:</span> <span className="text-white">{penaltyData.due_date ? new Date(penaltyData.due_date as string).toLocaleDateString() : "-"}</span></div>
              <div><span className="text-zinc-400">Estimated Penalty:</span> <span className="text-red-400 font-medium">₹{Number(penaltyData.estimated_penalty).toLocaleString()}</span></div>
            </div>
            <button onClick={() => setShowPenalty(false)} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold">Close</button>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#1A1726] border border-white/10 rounded-2xl p-6 w-full max-w-2xl">
              <h2 className="text-xl font-bold text-white mb-4">New Statutory Report</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Report Type</label>
                    <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.report_type} onChange={(e) => setForm({...form, report_type: e.target.value})}>
                      <option value="pf">Provident Fund</option>
                      <option value="esi">ESI</option>
                      <option value="bocw">BOCW Cess</option>
                      <option value="tds">TDS</option>
                      <option value="pt">Professional Tax</option>
                      <option value="it">Income Tax</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Return Period (YYYY-MM)</label>
                    <input type="text" required placeholder="2026-06" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.return_period} onChange={(e) => setForm({...form, return_period: e.target.value})} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={handleAutoPopulate} className="px-4 py-2 bg-zinc-500/10 text-zinc-300 rounded-xl text-xs font-medium hover:bg-zinc-500/20 transition-all">Auto-fill from Employees</button>
                  <button type="button" onClick={handleEstimatePenalty} className="px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-xs font-medium hover:bg-amber-500/20 transition-all">Estimate Penalty</button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Total Employees</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.total_employees} onChange={(e) => setForm({...form, total_employees: parseInt(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Total Wages (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.total_wages} onChange={(e) => setForm({...form, total_wages: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">PF Employee (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.pf_employee_contribution} onChange={(e) => setForm({...form, pf_employee_contribution: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">PF Employer (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.pf_employer_contribution} onChange={(e) => setForm({...form, pf_employer_contribution: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">ESI Employee (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.esi_employee_contribution} onChange={(e) => setForm({...form, esi_employee_contribution: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">ESI Employer (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.esi_employer_contribution} onChange={(e) => setForm({...form, esi_employer_contribution: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">BOCW Cess (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.bocw_cess} onChange={(e) => setForm({...form, bocw_cess: parseFloat(e.target.value)})} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">TDS Deducted (₹)</label>
                    <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={form.tds_deducted} onChange={(e) => setForm({...form, tds_deducted: parseFloat(e.target.value)})} />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold">Create Report</button>
                  <button type="button" onClick={() => { setShowModal(false); setMessage(""); }} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold">Cancel</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
