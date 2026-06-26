"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface ClientReport {
  id: string;
  project_id: string;
  report_name: string;
  report_date: string;
  summary_markdown: string;
  pdf_url: string;
  is_approved: boolean;
  created_at: string;
}

export default function ClientReportsPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [reports, setReports] = useState<ClientReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<ClientReport | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [reportName, setReportName] = useState("");
  const [summaryMarkdown, setSummaryMarkdown] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/apis/v3/reports/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchReports();
    }
  }, [projectId]);

  const handleGenerateReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportName.trim()) {
      setError("Report name is required");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`http://localhost:8000/apis/v3/reports/generate/${projectId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_name: reportName,
          summary_markdown: summaryMarkdown,
        }),
      });
      if (res.ok) {
        const newReport = await res.json();
        setReports([newReport, ...reports]);
        setSelectedReport(newReport);
        setIsOpen(false);
        setReportName("");
        setSummaryMarkdown("");
      } else {
        const errText = await res.text();
        setError(`Failed to generate: ${errText}`);
      }
    } catch (err) {
      setError("Connection to backend failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/reports/${reportId}/approve`, {
        method: "PATCH",
      });
      if (res.ok) {
        const updated = await res.json();
        setReports(reports.map(r => r.id === reportId ? updated : r));
        if (selectedReport?.id === reportId) {
          setSelectedReport(updated);
        }
      }
    } catch (err) {
      console.error("Error approving report:", err);
    }
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center gap-2.5 border-b border-white/5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">
            S
          </div>
          <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <Link
            href={`/c/${companyId}/dashboard`}
            className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all"
          >
            ← Dashboard
          </Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
            Client Portal
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
            <span>📊</span> Progress Reports
          </div>
        </nav>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Client Progress Reports</h1>
            <p className="text-[10px] text-zinc-500">
              Compile WBS milestones, subcontractor billing audits, and quality control indicators.
            </p>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20"
          >
            + Generate Progress Report
          </button>
        </div>

        {/* Workspace Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Report Gallery */}
          <div className="w-80 border-r border-white/5 bg-[#0B0910]/50 p-4 overflow-y-auto space-y-3">
            <h2 className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider px-1">
              Report Logs
            </h2>

            {loading ? (
              <div className="text-xs text-zinc-500 text-center py-10">Loading reports...</div>
            ) : reports.length === 0 ? (
              <div className="text-xs text-zinc-500 text-center py-10">No reports generated yet</div>
            ) : (
              reports.map((report) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedReport?.id === report.id
                      ? "bg-primary/5 border-primary/30 shadow-md shadow-primary/5"
                      : "bg-white/[0.01] border-white/5 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-white line-clamp-2">
                      {report.report_name}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full shrink-0 font-bold ${
                        report.is_approved
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {report.is_approved ? "Approved" : "Draft"}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-2">
                    {new Date(report.report_date).toLocaleDateString(undefined, {
                      dateStyle: "medium",
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Panel: Report Details & Interactive PDF Frame */}
          <div className="flex-1 bg-[#0E0C15] p-6 overflow-y-auto flex flex-col space-y-4">
            {selectedReport ? (
              <>
                {/* Details Header */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#14121F] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-white">{selectedReport.report_name}</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5">
                      Created: {new Date(selectedReport.report_date).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {!selectedReport.is_approved && (
                      <button
                        onClick={() => handleApproveReport(selectedReport.id)}
                        className="rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-4 py-2 text-xs font-bold transition-all"
                      >
                        ✓ Approve for Client Portal
                      </button>
                    )}
                    <a
                      href={`http://localhost:8000/apis/v3/reports/${selectedReport.id}/download`}
                      download
                      className="rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2 text-xs font-bold transition-all text-center"
                    >
                      Download PDF
                    </a>
                  </div>
                </div>

                {/* Summary remarks */}
                {selectedReport.summary_markdown && (
                  <div className="glass-panel p-4 rounded-xl border border-white/5 bg-white/[0.01]">
                    <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Executive Summary Notes
                    </h3>
                    <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                      {selectedReport.summary_markdown}
                    </p>
                  </div>
                )}

                {/* Embedded PDF Viewer */}
                <div className="flex-1 glass-panel rounded-2xl border border-white/5 overflow-hidden bg-zinc-950 flex flex-col min-h-[400px]">
                  <iframe
                    src={`http://localhost:8000/apis/v3/reports/${selectedReport.id}/download#toolbar=0`}
                    className="w-full h-full border-0"
                    title={selectedReport.report_name}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-white/[0.01] rounded-2xl border border-white/5">
                <span className="text-3xl mb-3">📊</span>
                <h2 className="text-sm font-bold text-white">No Report Selected</h2>
                <p className="text-xs text-zinc-500 max-w-xs mt-1">
                  Choose an existing progress report from the side log panel or click the generate button to compile a new one.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Generate Report Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#12101A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Compile Progress Report
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleGenerateReport} className="p-5 space-y-4">
              {error && (
                <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Report Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Progress Report - June 2026"
                  value={reportName}
                  onChange={(e) => setReportName(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                  Executive Remarks
                </label>
                <textarea
                  placeholder="Summarize engineering achievements, site issues, and milestone updates for the client."
                  value={summaryMarkdown}
                  onChange={(e) => setSummaryMarkdown(e.target.value)}
                  rows={4}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] text-xs font-bold text-white hover:opacity-90 transition-all"
                >
                  {submitting ? "Compiling PDF..." : "Generate & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
