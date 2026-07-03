"use client";
import { getApiHost } from "@/lib/api";
import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

interface Schedule {
  id: string;
  asset_id: string;
  method: string;
  useful_life_years: number;
  salvage_value: number;
  depreciation_pct: number;
  start_date: string;
  is_active: boolean;
}

interface Entry {
  id: string;
  asset_id: string;
  entry_date: string;
  depreciation_amount: number;
  accumulated_depreciation: number;
  book_value: number;
  notes?: string;
}

export default function DepreciationPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [activeTab, setActiveTab] = useState<"schedules" | "entries">("schedules");
  const [showSchedModal, setShowSchedModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [message, setMessage] = useState("");

  const [schedForm, setSchedForm] = useState({
    asset_id: "",
    method: "straight_line",
    useful_life_years: 10,
    salvage_value: 0,
    depreciation_pct: 10,
    start_date: "",
  });

  const [entryForm, setEntryForm] = useState({
    schedule_id: "",
    asset_id: "",
    project_id: projectId || "",
    entry_date: "",
    depreciation_amount: 0,
    accumulated_depreciation: 0,
    book_value: 0,
    notes: "",
  });

  const fetchSchedules = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/assets/schedules/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setSchedules(data);
      }
    } catch (e) {
      console.error("Failed to load schedules", e);
    }
  };

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/assets/entries/${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } catch (e) {
      console.error("Failed to load entries", e);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if (activeTab === "schedules") fetchSchedules();
      else fetchEntries();
    }, 0);
    return () => clearTimeout(id);
  }, [activeTab, companyId]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/assets/schedules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...schedForm, company_id: companyId }),
      });
      if (res.ok) {
        setMessage("Schedule created successfully");
        setShowSchedModal(false);
        fetchSchedules();
      } else {
        const err = await res.json();
        setMessage(err.detail || "Failed to create schedule");
      }
    } catch (_e) {
      void _e;
      setMessage("Error creating schedule");
    }
  };

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/assets/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...entryForm, company_id: companyId }),
      });
      if (res.ok) {
        setMessage("Entry recorded successfully");
        setShowEntryModal(false);
        fetchEntries();
      } else {
        const err = await res.json();
        setMessage(err.detail || "Failed to create entry");
      }
    } catch (_e) {
      void _e;
      setMessage("Error creating entry");
    }
  };

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Asset Depreciation</h1>
            <p className="text-zinc-400 mt-1">Track asset value decline and maintain depreciation schedules</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowSchedModal(true); setMessage(""); }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold transition-all"
            >
              New Schedule
            </button>
            <button
              onClick={() => { setShowEntryModal(true); setMessage(""); }}
              className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold transition-all"
            >
              Record Entry
            </button>
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl ${message.includes("success") ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
            {message}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          {(["schedules", "entries"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {tab === "schedules" ? "Depreciation Schedules" : "Depreciation Entries"}
            </button>
          ))}
        </div>

        {activeTab === "schedules" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Method</th>
                  <th className="px-6 py-4 font-medium">Life (Yrs)</th>
                  <th className="px-6 py-4 font-medium">Salvage Value</th>
                  <th className="px-6 py-4 font-medium">Depreciation %</th>
                  <th className="px-6 py-4 font-medium">Start Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {schedules.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No schedules found</td></tr>
                ) : (
                  schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 capitalize">{s.method.replace("_", " ")}</td>
                      <td className="px-6 py-4">{s.useful_life_years}</td>
                      <td className="px-6 py-4">₹{Number(s.salvage_value).toLocaleString()}</td>
                      <td className="px-6 py-4">{s.depreciation_pct}%</td>
                      <td className="px-6 py-4">{new Date(s.start_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${s.is_active ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                          {s.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "entries" && (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-zinc-400">
                <tr>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Depreciation</th>
                  <th className="px-6 py-4 font-medium">Accumulated</th>
                  <th className="px-6 py-4 font-medium">Book Value</th>
                  <th className="px-6 py-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No entries found</td></tr>
                ) : (
                  entries.map((e) => (
                    <tr key={e.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">{new Date(e.entry_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">₹{Number(e.depreciation_amount).toLocaleString()}</td>
                      <td className="px-6 py-4">₹{Number(e.accumulated_depreciation).toLocaleString()}</td>
                      <td className="px-6 py-4">₹{Number(e.book_value).toLocaleString()}</td>
                      <td className="px-6 py-4 text-zinc-400">{e.notes || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showSchedModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1726] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">New Depreciation Schedule</h2>
            <form onSubmit={handleCreateSchedule} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Asset ID</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={schedForm.asset_id} onChange={(e) => setSchedForm({...schedForm, asset_id: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Method</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={schedForm.method} onChange={(e) => setSchedForm({...schedForm, method: e.target.value})}>
                    <option value="straight_line">Straight Line</option>
                    <option value="reducing_balance">Reducing Balance</option>
                    <option value="written_down_value">Written Down Value</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Useful Life (Years)</label>
                  <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={schedForm.useful_life_years} onChange={(e) => setSchedForm({...schedForm, useful_life_years: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Salvage Value (₹)</label>
                  <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={schedForm.salvage_value} onChange={(e) => setSchedForm({...schedForm, salvage_value: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Depreciation %</label>
                  <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={schedForm.depreciation_pct} onChange={(e) => setSchedForm({...schedForm, depreciation_pct: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Start Date</label>
                <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={schedForm.start_date} onChange={(e) => setSchedForm({...schedForm, start_date: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold">Create Schedule</button>
                <button type="button" onClick={() => { setShowSchedModal(false); setMessage(""); }} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEntryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1A1726] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-white mb-4">New Depreciation Entry</h2>
            <form onSubmit={handleCreateEntry} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Schedule ID</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={entryForm.schedule_id} onChange={(e) => setEntryForm({...entryForm, schedule_id: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Asset ID</label>
                <input type="text" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={entryForm.asset_id} onChange={(e) => setEntryForm({...entryForm, asset_id: e.target.value})} />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Entry Date</label>
                <input type="date" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={entryForm.entry_date} onChange={(e) => setEntryForm({...entryForm, entry_date: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Depreciation (₹)</label>
                  <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={entryForm.depreciation_amount} onChange={(e) => setEntryForm({...entryForm, depreciation_amount: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Accumulated (₹)</label>
                  <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={entryForm.accumulated_depreciation} onChange={(e) => setEntryForm({...entryForm, accumulated_depreciation: parseFloat(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Book Value (₹)</label>
                  <input type="number" required className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={entryForm.book_value} onChange={(e) => setEntryForm({...entryForm, book_value: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Notes</label>
                <textarea className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" value={entryForm.notes} onChange={(e) => setEntryForm({...entryForm, notes: e.target.value})} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold">Record Entry</button>
                <button type="button" onClick={() => { setShowEntryModal(false); setMessage(""); }} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
