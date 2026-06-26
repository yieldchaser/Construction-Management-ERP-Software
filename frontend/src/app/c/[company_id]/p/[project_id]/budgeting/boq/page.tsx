"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface BOQItem {
  id?: string;
  section_name?: string;
  item_name: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export default function BOQImportPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [boqItems, setBoqItems] = useState<BOQItem[]>([]);
  const [totalEstimated, setTotalEstimated] = useState(0);

  // Load existing items
  useEffect(() => {
    if (projectId) {
      fetchExistingBOQ();
    }
  }, [projectId]);

  const fetchExistingBOQ = async () => {
    try {
      const response = await fetch(`http://localhost:8000/apis/v3/budgeting/boq?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setBoqItems(data);
        const sum = data.reduce((acc: number, item: BOQItem) => acc + item.amount, 0);
        setTotalEstimated(sum);
      }
    } catch (err) {
      console.error("Failed to fetch existing BOQ items", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
      setSuccess(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Please select an Excel sheet (.xlsx) file first.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:8000/apis/v3/budgeting/boq/import", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccess(true);
        setFile(null);
        fetchExistingBOQ();
      } else {
        setError(data.detail || "Failed to parse BOQ file. Make sure columns match.");
      }
    } catch (err) {
      setError("Connection to budgeting service failed. Check if backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0910] flex flex-col justify-between h-full shrink-0">
        <div className="flex flex-col overflow-y-auto flex-1">
          {/* Header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white">
              S
            </div>
            <span className="font-bold text-white tracking-tight">SiteFlow Console</span>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-2">
            <Link
              href={`/c/${companyId}/dashboard`}
              className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02]"
            >
              <span>←</span> Back to Dashboard
            </Link>
            
            <div className="pt-4">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">
                Budgeting Module
              </span>
              <ul className="space-y-1">
                <li>
                  <Link
                    href="#"
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-l-2 border-primary"
                  >
                    <span>📑</span> BOQ Upload Panel
                  </Link>
                </li>
                <li>
                  <Link
                    href={`/c/${companyId}/p/${projectId}/planning/gantt`}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.02]"
                  >
                    <span>📅</span> Gantt Scheduler
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        {/* Top Header */}
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0B0910] shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white uppercase tracking-wider">
              BOQ Spreadsheets Import
            </h1>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-zinc-400">
              Project ID: {projectId.slice(0, 8)}...
            </span>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Uploader Card */}
            <div className="rounded-2xl glass-panel p-6 space-y-6">
              <div className="space-y-2">
                <h3 className="font-bold text-sm uppercase tracking-wider text-white">Upload BOQ Excel</h3>
                <p className="text-zinc-500 text-xs leading-relaxed">
                  Upload your contract BOQ. Columns should contain headers like: <code className="text-secondary font-mono">Description</code>, <code className="text-secondary font-mono">Qty</code>, <code className="text-secondary font-mono">Unit</code>, and <code className="text-secondary font-mono">Rate</code>.
                </p>
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-success/20 bg-success/10 p-3 text-xs text-success">
                  BOQ spreadsheet parsed and items imported successfully!
                </div>
              )}

              <form onSubmit={handleUpload} className="space-y-4">
                <div className="border border-dashed border-white/10 rounded-xl p-8 flex flex-col items-center justify-center bg-white/[0.01] hover:bg-white/[0.02] transition-colors relative">
                  <input
                    type="file"
                    accept=".xlsx, .xlsm"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span className="text-3xl">📁</span>
                  <span className="text-xs font-semibold text-zinc-300 mt-2">
                    {file ? file.name : "Select Excel Spreadsheet"}
                  </span>
                  <span className="text-[10px] text-zinc-500 mt-1">.xlsx or .xlsm file up to 10MB</span>
                </div>

                <button
                  type="submit"
                  disabled={loading || !file}
                  className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl text-white font-semibold text-xs bg-gradient-to-r from-primary to-[#FF3B6C] shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-5 text-white" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Parsing Sheet...
                    </span>
                  ) : (
                    "Process & Commit BOQ"
                  )}
                </button>
              </form>

              {/* Sample Template helper */}
              <div className="rounded-xl bg-white/[0.02] p-4 text-[10px] text-zinc-500 space-y-2 border border-white/5">
                <span className="font-semibold text-zinc-400 block uppercase tracking-wider">💡 Developer Hint:</span>
                <p>
                  Create an Excel workbook with a header row: <code className="text-secondary font-mono">item_name</code> | <code className="text-secondary font-mono">qty</code> | <code className="text-secondary font-mono">unit</code> | <code className="text-secondary font-mono">rate</code>. Populate with test rows and upload.
                </p>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-2 rounded-2xl glass-panel p-6 space-y-6 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wider text-white">BOQ Estimate Preview</h3>
                  <p className="text-[10px] text-zinc-500">Live items committed to database WBS ledger</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-500 block">Total Est. Cost</span>
                  <span className="text-lg font-bold text-gradient-accent">
                    Rs. {totalEstimated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="flex-1 overflow-auto">
                {boqItems.length === 0 ? (
                  <div className="h-full flex flex-col justify-center items-center py-12 text-zinc-500 space-y-2">
                    <span className="text-3xl">📄</span>
                    <span className="text-xs">No BOQ items imported yet. Upload a sheet to get started.</span>
                  </div>
                ) : (
                  <table className="w-full text-xs text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 pr-4">Description</th>
                        <th className="py-2.5 px-4 text-center">Unit</th>
                        <th className="py-2.5 px-4 text-right">Qty</th>
                        <th className="py-2.5 px-4 text-right">Rate</th>
                        <th className="py-2.5 pl-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {boqItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="py-3 pr-4 text-white font-medium">{item.item_name}</td>
                          <td className="py-3 px-4 text-center text-zinc-400">{item.unit}</td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-300">
                            {item.quantity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-zinc-300">
                            {item.rate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 pl-4 text-right font-mono font-semibold text-primary">
                            {item.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
