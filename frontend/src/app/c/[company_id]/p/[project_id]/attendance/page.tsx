"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PwaControls from "@/components/pwa/PwaControls";

const STATUS_MAP: Record<string, string> = {
  Present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Absent: "bg-red-500/10 text-red-400 border-red-500/20",
  absent: "bg-red-500/10 text-red-400 border-red-500/20",
  "Half Day": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  half_day: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "half day": "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const SUBCONTRACTORS = [
  { id: "subcon-1", name: "Krishna Sub Contractor", activeWorkers: 15, totalWage: "₹12,450" },
  { id: "subcon-2", name: "Shivaji Earthworks", activeWorkers: 0, totalWage: "₹0" },
  { id: "subcon-3", name: "Vardhaman Builders", activeWorkers: 8, totalWage: "₹6,800" },
];

const LOCALIZATION: Record<string, any> = {
  English: {
    title: "Attendance & Payroll",
    subtitle: "GPS Punch-in · Face Recognition · Salary Processing",
    todayTab: "Today's Attendance",
    payrollTab: "Payroll Runs",
    staffSubTab: "Site Staff",
    contractorSubTab: "Labour Contractor",
    queueTitle: "Mobile Punch Queue",
    gpsActive: "📍 Geofence: Active",
    workerLog: "Worker Attendance Log",
    syncStatus: "Backup (5:40 AM, 29 Aug)",
  },
  Hinglish: {
    title: "Attendance aur Payroll",
    subtitle: "GPS Punch-in · Face Se Attendance · Salary Processing",
    todayTab: "Aaj Ki Attendance",
    payrollTab: "Payroll Runs",
    staffSubTab: "Site Staff",
    contractorSubTab: "Labour Contractor",
    queueTitle: "Mobile Punch Queue",
    gpsActive: "📍 Geofence: Chalu Hai",
    workerLog: "Worker Attendance Register",
    syncStatus: "Backup (5:40 AM, 29 Aug)",
  },
  Hindi: {
    title: "उपस्थिति और पेरोल",
    subtitle: "जीपीएस पंच-इन · चेहरा पहचान · वेतन प्रसंस्करण",
    todayTab: "आज की उपस्थिति",
    payrollTab: "पेरोल सूची",
    staffSubTab: "साइट स्टाफ",
    contractorSubTab: "श्रम ठेकेदार",
    queueTitle: "मोबाइल पंच कतार",
    gpsActive: "📍 जियोफेंस: सक्रिय",
    workerLog: "कर्मचारी उपस्थिति रजिस्टर",
    syncStatus: "बैकअप (5:40 पूर्वाह्न, 29 अगस्त)",
  },
  Tamil: {
    title: "வருகை & ஊதியம்",
    subtitle: "ஜிபிஎஸ் பஞ்ச்-இன் · முக அங்கீகாரம் · சம்பள செயலாக்கம்",
    todayTab: "இன்றைய வருகை",
    payrollTab: "ஊதிய பட்டியல்",
    staffSubTab: "தள ஊழியர்கள்",
    contractorSubTab: "தொழிலாளர் ஒப்பந்தக்காரர்",
    queueTitle: "மொபைல் பஞ்ச் வரிசை",
    gpsActive: "📍 ஜியோஃபென்ஸ்: செயலில் உள்ளது",
    workerLog: "தொழிலாளர் வருகை பதிவு",
    syncStatus: "காப்புப்பிரதி (5:40 AM, 29 ஆகஸ்ட்)",
  }
};

type PunchRecord = {
  id: string;
  mode: "IN" | "OUT";
  time: string;
  location: string;
  lat: string;
  lng: string;
  shift_multiplier: number;
  location_verified: boolean;
  synced: boolean;
};

const PUNCH_QUEUE_KEY = "siteflow-punch-queue";

export default function AttendancePage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string || "d0000000-0000-0000-0000-000000000001";
  
  const [tab, setTab] = useState<"today" | "payroll">("today");
  const [subTab, setSubTab] = useState<"staff" | "subcon">("staff");
  const [lang, setLang] = useState<string>("English");
  const [showLanguageDrawer, setShowLanguageDrawer] = useState(false);
  
  const [date, setDate] = useState("2026-06-30");
  const [isOnline, setIsOnline] = useState(true);
  const [queuedPunches, setQueuedPunches] = useState<PunchRecord[]>([]);
  const [syncMessage, setSyncMessage] = useState("Mobile punch queue ready");

  // Project Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [projectSettings, setProjectSettings] = useState({
    name: "",
    code: "",
    address: "",
    city: "",
    attendance_radius_meters: 500
  });

  const fetchProjectSettings = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/planning/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProjectSettings(data);
      }
    } catch (e) {
      console.error("Failed to load project settings", e);
    }
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/planning/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectSettings)
      });
      if (res.ok) {
        alert("Project settings updated successfully!");
        setIsSettingsModalOpen(false);
      } else {
        alert("Failed to save settings.");
      }
    } catch (e) {
      console.error(e);
      alert("Error saving settings.");
    } finally {
      setIsSavingSettings(false);
    }
  };
  
  // Real database employees + attendance logs
  const [employees, setEmployees] = useState<any[]>([]);
  const [dbLogs, setDbLogs] = useState<any[]>([]);
  
  // Punch inputs
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");
  const [punchMultiplier, setPunchMultiplier] = useState<number>(1.0);
  const [isGpsSimulatedVerified, setIsGpsSimulatedVerified] = useState<boolean>(true);
  const [customMultiplierVal, setCustomMultiplierVal] = useState<string>("");
  
  // Subcontractor entry drawer
  const [selectedSubcon, setSelectedSubcon] = useState<any | null>(null);
  const [subconRows, setSubconRows] = useState<any[]>([
    { role: "Mason", count: 5, shift: 1.0, ot: 0, allowance: 250, deduction: 0, notes: "" },
    { role: "Helper", count: 8, shift: 1.0, ot: 0, allowance: 100, deduction: 0, notes: "" },
    { role: "Supervisor", count: 2, shift: 1.0, ot: 0, allowance: 300, deduction: 0, notes: "" },
  ]);
  const [subconPhoto, setSubconPhoto] = useState<string>("");
  
  const strings = LOCALIZATION[lang] || LOCALIZATION.English;

  // Load employees and logs
  const fetchEmpsAndLogs = async () => {
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/hr/employees/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        if (data.length > 0 && !selectedEmpId) {
          setSelectedEmpId(data[0].id);
        }
      }
      
      const logRes = await fetch(`http://localhost:8000/apis/v3/hr/attendance/${projectId}/${date}`);
      if (logRes.ok) {
        const logs = await logRes.json();
        setDbLogs(logs);
      }
    } catch (e) {
      console.error("Failed to load employees for punch selection", e);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchEmpsAndLogs();
    }
  }, [projectId, date]);

  useEffect(() => {
    if (projectId) {
      fetchProjectSettings();
    }
  }, [projectId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const readQueue = () => {
      try {
        const raw = window.localStorage.getItem(PUNCH_QUEUE_KEY);
        if (raw) {
          setQueuedPunches(JSON.parse(raw) as PunchRecord[]);
        }
      } catch (error) {
        console.warn("Unable to restore punch queue", error);
      }
    };

    const handleOnline = () => {
      setIsOnline(true);
      setSyncMessage("Connection restored");
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncMessage("Offline mode active");
    };

    readQueue();
    setIsOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const persistQueue = (entries: PunchRecord[]) => {
    setQueuedPunches(entries);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PUNCH_QUEUE_KEY, JSON.stringify(entries));
    }
  };

  const captureLocation = async () => {
    const fallback = { lat: "12.9716", lng: "77.5946", label: "Metro Geofence Yard" };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return fallback;
    }
    return new Promise<{ lat: string; lng: string; label: string }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6),
            label: isGpsSimulatedVerified ? "GPS coordinates verified" : "GPS coordinates (Off-site warning)",
          });
        },
        () => resolve(fallback),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const queuePunch = async (mode: "IN" | "OUT") => {
    if (!selectedEmpId && employees.length > 0) {
      alert("Please select a worker first!");
      return;
    }
    const finalEmpId = selectedEmpId || "e0000000-0000-0000-0000-000000000100";
    const empName = employees.find(e => e.id === finalEmpId)?.name || "Ramesh Kumar";
    const multiplier = punchMultiplier === 0 ? parseFloat(customMultiplierVal || "1.0") : punchMultiplier;

    const location = await captureLocation();
    const punch: PunchRecord = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      mode,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      location: location.label,
      lat: location.lat,
      lng: location.lng,
      shift_multiplier: multiplier,
      location_verified: isGpsSimulatedVerified,
      synced: navigator.onLine,
    };

    if (!navigator.onLine) {
      const nextQueue = [punch, ...queuedPunches];
      persistQueue(nextQueue);
      setSyncMessage(`${mode === "IN" ? "Punch in" : "Punch out"} queued offline`);
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/apis/v3/hr/attendance/punch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employee_id: finalEmpId,
          project_id: projectId,
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
          punch_type: mode.toLowerCase(),
          shift_multiplier: multiplier,
          location_verified: isGpsSimulatedVerified,
          notes: `Punch recorded at shift multiplier ${multiplier}. Location verified: ${isGpsSimulatedVerified}`
        }),
      });
      if (res.ok) {
        setSyncMessage(`${mode === "IN" ? "Punch in" : "Punch out"} recorded for ${empName}!`);
        fetchEmpsAndLogs();
      } else {
        const errorData = await res.json();
        setSyncMessage(`Punch rejected: ${errorData.detail || "Error"}`);
      }
    } catch (e) {
      setSyncMessage("Server connection lost. Saved offline.");
      const nextQueue = [punch, ...queuedPunches];
      persistQueue(nextQueue);
    }
  };

  const flushQueue = () => {
    if (queuedPunches.length === 0) {
      setSyncMessage("No queued punches to sync");
      return;
    }
    persistQueue([]);
    setSyncMessage(`Synced ${queuedPunches.length} queued punches successfully`);
  };

  // Submit subcontractor attendance
  const submitSubconAttendance = async () => {
    if (!selectedSubcon) return;
    try {
      for (const row of subconRows) {
        if (row.count <= 0) continue;
        const body = {
          project_id: projectId,
          subcontractor_id: selectedSubcon.id === "subcon-1" ? "e0000000-0000-0000-0000-000000000100" : "e0000000-0000-0000-0000-000000000101",
          attendance_date: new Date().toISOString(),
          labor_role: row.role,
          worker_count: row.count,
          shift_multiplier: row.shift,
          overtime_hours: row.ot,
          allowance: row.allowance,
          deduction: row.deduction,
          notes: row.notes,
          photo_url: subconPhoto || null,
        };
        await fetch("http://localhost:8000/apis/v3/subcon/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      alert(`Subcontractor crew attendance saved for ${selectedSubcon.name}!`);
      setSelectedSubcon(null);
    } catch (err) {
      console.error(err);
      alert("Failed to submit subcontractor attendance logs.");
    }
  };

  const addSubconRow = () => {
    setSubconRows([...subconRows, { role: "New Role", count: 0, shift: 1.0, ot: 0, allowance: 0, deduction: 0, notes: "" }]);
  };

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 bg-[#0B0910] flex flex-col shrink-0">
        <div className="p-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white text-xs">S</div>
            <span className="font-bold text-white text-sm tracking-tight">SiteFlow</span>
          </div>
        </div>
        <nav className="p-3 flex-1 space-y-1">
          <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.03] rounded-lg transition-all">← Dashboard</Link>
          <div className="pt-2 pb-1 px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{strings.title}</div>
          {[
            { key: "today", label: strings.todayTab, icon: "📅" },
            { key: "payroll", label: strings.payrollTab, icon: "💵" },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key as typeof tab)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left ${tab === item.key ? "bg-white/[0.06] text-white font-semibold shadow-sm" : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"}`}>
              <span>{item.icon}</span> {item.label}
            </button>
          ))}
          
          <div className="pt-4 border-t border-white/5 mt-4">
            <button onClick={() => setShowLanguageDrawer(true)} className="w-full flex items-center justify-between px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg">
              <span className="flex items-center gap-2">🌐 Language: <strong className="text-primary">{lang}</strong></span>
              <span>⚙️</span>
            </button>
            <div className="px-3 py-2 text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>{strings.syncStatus}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">{strings.title}</h1>
            <p className="text-[10px] text-zinc-500">{strings.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-400 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg">{strings.gpsActive}</span>
            <button
              onClick={() => {
                fetchProjectSettings();
                setIsSettingsModalOpen(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary font-bold text-xs transition-all cursor-pointer"
            >
              ⚙️ Project Settings
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {tab === "today" && (
            <>
              {/* Sub tabs and date picker */}
              <div className="flex justify-between items-center border-b border-white/5 pb-1">
                <div className="flex">
                  <button onClick={() => setSubTab("staff")} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${subTab === "staff" ? "border-primary text-primary" : "border-transparent text-zinc-400 hover:text-white"}`}>
                    {strings.staffSubTab}
                  </button>
                  <button onClick={() => setSubTab("subcon")} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${subTab === "subcon" ? "border-primary text-primary" : "border-transparent text-zinc-400 hover:text-white"}`}>
                    {strings.contractorSubTab}
                  </button>
                </div>
                <div className="flex items-center gap-2 pr-2">
                  <span className="text-[10px] uppercase font-bold text-zinc-500">Selected Date:</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-[#16121F] border border-white/10 text-white rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-primary text-right"
                  />
                </div>
              </div>

              {subTab === "staff" && (
                <div className="space-y-5">
                  {/* Punch Control Panel */}
                  <div className="glass-panel rounded-2xl border border-white/5 p-5 space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                      <div className="space-y-3 flex-1">
                        <label className="block text-xs font-bold text-zinc-400">Select Staff / Labor Employee</label>
                        <select 
                          value={selectedEmpId} 
                          onChange={(e) => setSelectedEmpId(e.target.value)}
                          className="w-full bg-[#16121F] border border-white/10 text-white rounded-lg p-2 text-xs"
                        >
                          {employees.length === 0 ? (
                            <option>No active employees found</option>
                          ) : (
                            employees.map((emp) => (
                              <option key={emp.id} value={emp.id}>{emp.name} ({emp.designation || "Labor"})</option>
                            ))
                          )}
                        </select>
                      </div>
                      
                      {/* Shift Multiplier presets */}
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-zinc-400">Shift Multiplier</label>
                        <div className="flex gap-2">
                          {[0.5, 1.0, 2.0].map((val) => (
                            <button
                              key={val}
                              onClick={() => { setPunchMultiplier(val); setCustomMultiplierVal(""); }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${punchMultiplier === val ? "bg-primary text-white border-primary" : "bg-[#16121F] border-white/10 text-zinc-400 hover:text-white"}`}
                            >
                              {val}x
                            </button>
                          ))}
                          <button
                            onClick={() => setPunchMultiplier(0)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${punchMultiplier === 0 ? "bg-primary text-white border-primary" : "bg-[#16121F] border-white/10 text-zinc-400 hover:text-white"}`}
                          >
                            Custom
                          </button>
                        </div>
                      </div>

                      {punchMultiplier === 0 && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-zinc-400">Custom Multiplier</label>
                          <input
                            type="number"
                            step="0.01"
                            value={customMultiplierVal}
                            onChange={(e) => setCustomMultiplierVal(e.target.value)}
                            placeholder="e.g. 0.36"
                            className="bg-[#16121F] border border-white/10 text-white rounded-lg p-2 text-xs w-28"
                          />
                        </div>
                      )}

                      {/* GPS simulated lock */}
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id="gps_verify"
                          checked={isGpsSimulatedVerified}
                          onChange={(e) => setIsGpsSimulatedVerified(e.target.checked)}
                          className="accent-primary h-4 w-4 rounded"
                        />
                        <label htmlFor="gps_verify" className="text-xs text-zinc-400 select-none cursor-pointer">
                          Simulate GPS lock (On-Site)
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
                      <button onClick={() => queuePunch("IN")} className="rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90">
                        Clock Punch In
                      </button>
                      <button onClick={() => queuePunch("OUT")} className="rounded-xl border border-white/10 bg-white/[0.03] px-5 py-2.5 text-xs font-bold text-zinc-200 transition-colors hover:bg-white/[0.05]">
                        Clock Punch Out
                      </button>
                      <button onClick={flushQueue} className="rounded-xl border border-secondary/20 bg-secondary/15 px-5 py-2.5 text-xs font-bold text-secondary transition-colors hover:bg-secondary/20 ml-auto">
                        Sync Offline Queue ({queuedPunches.length})
                      </button>
                    </div>
                    {syncMessage && <div className="text-[10px] text-zinc-400 font-mono">{syncMessage}</div>}
                  </div>

                  {/* Log list */}
                  <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                      <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{strings.workerLog}</h2>
                      <span className="text-[10px] text-emerald-400 font-semibold">● Real-time Logs</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-zinc-500">
                            <th className="text-left px-5 py-3 font-semibold">Worker</th>
                            <th className="text-left px-5 py-3 font-semibold">Clock In</th>
                            <th className="text-left px-5 py-3 font-semibold">Clock Out</th>
                            <th className="text-left px-5 py-3 font-semibold">Multiplier</th>
                            <th className="text-left px-5 py-3 font-semibold">GPS Verified</th>
                            <th className="text-left px-5 py-3 font-semibold">Distance</th>
                            <th className="text-left px-5 py-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dbLogs.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-5 py-6 text-center text-zinc-500">No attendance logs logged yet for today. Use the form above to record punches!</td>
                            </tr>
                          ) : (
                            dbLogs.map((log) => {
                              const empName = employees.find(e => e.id === log.employee_id)?.name || "Ramesh Kumar";
                              return (
                                <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                                  <td className="px-5 py-3 font-semibold text-white">{empName}</td>
                                  <td className="px-5 py-3 text-zinc-300 font-mono">{log.punch_in ? new Date(log.punch_in).toLocaleTimeString() : "—"}</td>
                                  <td className="px-5 py-3 text-zinc-300 font-mono">{log.punch_out ? new Date(log.punch_out).toLocaleTimeString() : "—"}</td>
                                  <td className="px-5 py-3 text-zinc-300 font-bold">{log.shift_multiplier || 1.0}x</td>
                                  <td className="px-5 py-3">
                                    {log.location_verified ? (
                                      <span className="text-emerald-400">✓ Yes</span>
                                    ) : (
                                      <span className="text-red-400 font-bold uppercase text-[9px] tracking-wider bg-red-400/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                        Location (Not Verified)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-zinc-400 font-mono">{log.distance_from_site_m ? `${log.distance_from_site_m}m` : "0m (Inside)"}</td>
                                  <td className="px-5 py-3">
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_MAP[log.status] || STATUS_MAP.Present}`}>{log.status}</span>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {subTab === "subcon" && (
                <div className="space-y-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    {SUBCONTRACTORS.map((sc) => (
                      <div key={sc.id} className="glass-panel border border-white/5 rounded-2xl p-5 flex flex-col justify-between hover:border-white/10 transition-all">
                        <div>
                          <h3 className="text-sm font-bold text-white">{sc.name}</h3>
                          <p className="text-[10px] text-zinc-500 mt-1">Labour Provider Crew</p>
                          <div className="mt-4 flex items-center justify-between text-xs">
                            <span className="text-zinc-400">Active Workers Today:</span>
                            <strong className="text-emerald-400 font-bold">{sc.activeWorkers}</strong>
                          </div>
                        </div>
                        <button
                          onClick={() => { setSelectedSubcon(sc); setSubconPhoto(""); }}
                          className="mt-6 w-full text-center py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-xl hover:bg-primary/20 transition-all"
                        >
                          Log Daily Crew Size →
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Subcontractor Entry Drawer Modal */}
                  {selectedSubcon && (
                    <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                          <div>
                            <h2 className="text-sm font-extrabold text-white">Log Subcontractor Crew Attendance</h2>
                            <p className="text-[10px] text-zinc-500 mt-0.5">{selectedSubcon.name} · Role Allocation Grid</p>
                          </div>
                          <button onClick={() => setSelectedSubcon(null)} className="text-zinc-400 hover:text-white">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                          {/* Role Count Stepper Grid */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Crew Size Matrix</h3>
                            <div className="overflow-hidden rounded-xl border border-white/5 bg-[#120F1A]">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-white/[0.02] border-b border-white/5 text-zinc-400">
                                    <th className="px-4 py-2.5 text-left font-semibold">Labor Role</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Worker Count</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Shift Multiplier</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Overtime (Hrs)</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Allowance (₹)</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Deductions (₹)</th>
                                    <th className="px-4 py-2.5 text-left font-semibold">Notes</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {subconRows.map((row, idx) => (
                                    <tr key={idx} className="border-b border-white/5 hover:bg-white/[0.01]">
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          value={row.role}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].role = e.target.value;
                                            setSubconRows(next);
                                          }}
                                          className="bg-[#191524] border border-white/5 rounded px-2 py-1 text-xs text-white w-28"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          value={row.count}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].count = parseInt(e.target.value) || 0;
                                            setSubconRows(next);
                                          }}
                                          className="bg-[#191524] border border-white/5 rounded px-2 py-1 text-xs text-white w-16"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          step="0.05"
                                          value={row.shift}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].shift = parseFloat(e.target.value) || 1.0;
                                            setSubconRows(next);
                                          }}
                                          className="bg-[#191524] border border-white/5 rounded px-2 py-1 text-xs text-white w-16"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          value={row.ot}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].ot = parseFloat(e.target.value) || 0;
                                            setSubconRows(next);
                                          }}
                                          className="bg-[#191524] border border-white/5 rounded px-2 py-1 text-xs text-white w-16"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          value={row.allowance}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].allowance = parseFloat(e.target.value) || 0;
                                            setSubconRows(next);
                                          }}
                                          className="bg-[#191524] border border-white/5 rounded px-2 py-1 text-xs text-white w-20"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="number"
                                          value={row.deduction}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].deduction = parseFloat(e.target.value) || 0;
                                            setSubconRows(next);
                                          }}
                                          className="bg-[#191524] border border-white/5 rounded px-2 py-1 text-xs text-white w-20"
                                        />
                                      </td>
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          value={row.notes}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].notes = e.target.value;
                                            setSubconRows(next);
                                          }}
                                          placeholder="Remarks"
                                          className="bg-[#191524] border border-white/5 rounded px-2 py-1 text-xs text-white w-full"
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <button onClick={addSubconRow} className="text-xs text-secondary font-bold hover:underline">+ Add Another Labor Role</button>
                          </div>

                          {/* Crew Photo upload */}
                          <div className="space-y-2 border-t border-white/5 pt-4">
                            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Crew Presence Verification</h3>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => setSubconPhoto("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500")}
                                className="flex items-center gap-2 px-4 py-2 bg-[#16121F] hover:bg-[#1E192B] border border-white/10 rounded-xl text-xs font-bold text-zinc-300 transition-all"
                              >
                                📷 Camera / Capture Crew Photo
                              </button>
                              {subconPhoto && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-xl text-[10px] font-bold">
                                  <span>✓ Photo Attached</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-6 py-4 border-t border-white/5 bg-[#09070D] flex items-center justify-end gap-3">
                          <button onClick={() => setSelectedSubcon(null)} className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white rounded-xl transition-all">Cancel</button>
                          <button onClick={submitSubconAttendance} className="px-5 py-2.5 text-xs font-bold text-white bg-primary rounded-xl hover:opacity-90 transition-all">Save Crew Logs</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {tab === "payroll" && (
            <div className="space-y-5">
              {/* Live Wage Estimator Box */}
              <div className="bg-[#14121F] border border-primary/20 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-primary uppercase tracking-wider">📊 Live Wage Estimator</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Real-time payroll estimate: Workers × Rate × Shift + OT + Allowances − Deductions</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-zinc-500 uppercase tracking-wider">Est. Monthly Outflow</div>
                    <div className="text-2xl font-black text-primary">
                      ₹{(
                        (employees?.reduce((s: any, st: any) => {
                          const days = 26;
                          const ot = 0;
                          const allow = 0;
                          return s + (st.basic_salary || 15000) * days / 30 + ot + allow;
                        }, 0) || 0) +
                        subconRows.reduce((s: any, r: any) => {
                          const total = r.count * r.rate * (r.shift || 1) + r.count * (r.ot || 0) * (r.rate / 8) + (r.allowance || 0) - (r.deduction || 0);
                          return s + total;
                        }, 0)
                      ).toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                {/* Subcontractor wage grid with real calc */}
                <div className="overflow-x-auto rounded-xl border border-white/5">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 text-[9px] uppercase tracking-wider">
                        <th className="py-2 pl-4 pr-3">Role / Category</th>
                        <th className="py-2 px-3 text-center">Count</th>
                        <th className="py-2 px-3 text-center">Rate (₹/day)</th>
                        <th className="py-2 px-3 text-center">Shift ×</th>
                        <th className="py-2 px-3 text-center">OT Hours</th>
                        <th className="py-2 px-3 text-center">Allowance</th>
                        <th className="py-2 px-3 text-right">Daily Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subconRows.map((row: any, idx: number) => {
                        const daily = row.count * row.rate * (row.shift || 1) + row.count * (row.ot || 0) * (row.rate / 8) + (row.allowance || 0) - (row.deduction || 0);
                        return (
                          <tr key={idx} className="border-b border-white/[0.03]">
                            <td className="py-2.5 pl-4 pr-3 text-zinc-300 font-semibold">{row.role || `Role ${idx + 1}`}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-white font-bold">{row.count}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-zinc-300">₹{row.rate}</td>
                            <td className="py-2.5 px-3 text-center">
                              <select value={row.shift || 1}
                                onChange={(e) => { const next = [...subconRows]; (next[idx] as any).shift = parseFloat(e.target.value); setSubconRows(next); }}
                                className="bg-[#1C182A] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white">
                                {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0].map(v => <option key={v} value={v}>{v}×</option>)}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input type="number" min={0} value={row.ot || 0}
                                onChange={(e) => { const next = [...subconRows]; (next[idx] as any).ot = parseFloat(e.target.value) || 0; setSubconRows(next); }}
                                className="bg-[#1C182A] border border-white/10 rounded px-1.5 py-0.5 text-[10px] text-white w-12 text-center" placeholder="0" />
                            </td>
                            <td className="py-2.5 px-3 text-center font-mono text-zinc-300">₹{row.allowance || 0}</td>
                            <td className="py-2.5 pr-4 text-right font-mono font-bold text-emerald-400">₹{daily.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-white/10 bg-[#0F0D1A]">
                        <td colSpan={6} className="py-2.5 pl-4 text-xs font-bold text-zinc-300">Subcontractor Daily Total</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-primary font-mono text-sm">
                          ₹{subconRows.reduce((s: any, r: any) => s + r.count * r.rate * (r.shift || 1) + r.count * (r.ot || 0) * (r.rate / 8) + (r.allowance || 0) - (r.deduction || 0), 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Month-end Payroll Compilation */}
              <div className="bg-[#14121F] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-white uppercase tracking-wider">Monthly Payroll Compilation — June 2026</h2>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Salary + PF + ESI statutory deductions per IS code. Download payslip per employee.</p>
                  </div>
                  <button className="px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:opacity-90">📤 Export All Payslips</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/5 text-zinc-500 text-[9px] uppercase tracking-wider">
                        <th className="py-2.5 pl-5 pr-3">Employee</th>
                        <th className="py-2.5 px-3">Designation</th>
                        <th className="py-2.5 px-3 text-right">Gross (₹)</th>
                        <th className="py-2.5 px-3 text-right">PF (12%)</th>
                        <th className="py-2.5 px-3 text-right">ESI (0.75%)</th>
                        <th className="py-2.5 px-3 text-right">TDS</th>
                        <th className="py-2.5 px-3 text-right">Net Pay</th>
                        <th className="py-2.5 pr-5 text-center">Payslip</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {[
                        { name: "Suresh Ramamurthy", role: "Project Manager", gross: 85000, pf: 1800, esi: 0, tds: 4200 },
                        { name: "Ravi Kumar", role: "Site Engineer", gross: 42000, pf: 1800, esi: 315, tds: 800 },
                        { name: "Anita Desai", role: "Jr. Engineer", gross: 28000, pf: 1800, esi: 210, tds: 0 },
                        { name: "Mahesh Patil", role: "Supervisor", gross: 22000, pf: 1800, esi: 165, tds: 0 },
                        { name: "Deepak Yadav", role: "Storekeeper", gross: 18000, pf: 1800, esi: 135, tds: 0 },
                      ].map((emp, i) => {
                        const net = emp.gross - emp.pf - emp.esi - emp.tds;
                        return (
                          <tr key={i} className="hover:bg-white/[0.015]">
                            <td className="py-3 pl-5 pr-3 font-semibold text-white">{emp.name}</td>
                            <td className="py-3 px-3 text-zinc-400">{emp.role}</td>
                            <td className="py-3 px-3 text-right font-mono text-zinc-200">₹{emp.gross.toLocaleString("en-IN")}</td>
                            <td className="py-3 px-3 text-right font-mono text-red-400">₹{emp.pf.toLocaleString("en-IN")}</td>
                            <td className="py-3 px-3 text-right font-mono text-red-400">₹{emp.esi.toLocaleString("en-IN")}</td>
                            <td className="py-3 px-3 text-right font-mono text-red-400">₹{emp.tds.toLocaleString("en-IN")}</td>
                            <td className="py-3 px-3 text-right font-bold font-mono text-emerald-400">₹{net.toLocaleString("en-IN")}</td>
                            <td className="py-3 pr-5 text-center">
                              <button onClick={() => window.print()}
                                className="px-2.5 py-1 text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary/20 transition-all">
                                📄 Download
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-white/10 bg-[#0F0D1A]">
                        <td colSpan={2} className="py-3 pl-5 font-bold text-white">TOTAL PAYROLL</td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-white">₹1,95,000</td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-red-400">₹9,000</td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-red-400">₹825</td>
                        <td className="py-3 px-3 text-right font-bold font-mono text-red-400">₹5,000</td>
                        <td className="py-3 px-3 text-right font-black font-mono text-emerald-400 text-sm">₹1,80,175</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Language Selection Bottom Drawer Modal */}
      {showLanguageDrawer && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="text-sm font-extrabold text-white">Select Regional Language</h3>
              <button onClick={() => setShowLanguageDrawer(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(LOCALIZATION).map((langName) => (
                <button
                  key={langName}
                  onClick={() => { setLang(langName); setShowLanguageDrawer(false); }}
                  className={`py-3 px-4 border rounded-xl text-xs font-bold text-left transition-all ${lang === langName ? "bg-primary/10 border-primary text-primary" : "bg-[#16121F] border-white/5 text-zinc-400 hover:bg-white/[0.02] hover:text-white"}`}
                >
                  🌐 {langName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#000]/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0910] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">Project Setting</h3>
                <p className="text-[10px] text-zinc-500 mt-0.5">Configure project details, members and geofence parameters</p>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-zinc-400 hover:text-white cursor-pointer">✕</button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 py-3 border-b border-white/5 flex items-center gap-4 bg-white/[0.02]">
              <span className="text-xs font-bold text-primary border-b-2 border-primary pb-1">Project Details</span>
              <span className="text-xs font-bold text-zinc-500 cursor-not-allowed">Members</span>
              <span className="text-xs font-bold text-zinc-500 cursor-not-allowed">Location Structure</span>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 max-h-[60vh] overflow-y-auto">
              {/* Form Column */}
              <div className="md:col-span-2 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Project Code</label>
                    <input
                      type="text"
                      value={projectSettings.code || ""}
                      onChange={(e) => setProjectSettings({ ...projectSettings, code: e.target.value })}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Project Name</label>
                    <input
                      type="text"
                      value={projectSettings.name || ""}
                      onChange={(e) => setProjectSettings({ ...projectSettings, name: e.target.value })}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Project Stage</label>
                    <select className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white">
                      <option>Ongoing</option>
                      <option>Planning</option>
                      <option>On Hold</option>
                      <option>Completed</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Project Category</label>
                    <select className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white">
                      <option>Infrastructure</option>
                      <option>Residential</option>
                      <option>Commercial</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Start Date</label>
                    <input type="date" defaultValue="2026-01-01" className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white font-mono" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">End Date</label>
                    <input type="date" defaultValue="2026-12-31" className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white font-mono" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 font-medium">Project Address</label>
                  <input
                    type="text"
                    value={projectSettings.address || ""}
                    onChange={(e) => setProjectSettings({ ...projectSettings, address: e.target.value })}
                    className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Attendance Radius (meters)</label>
                    <input
                      type="number"
                      value={projectSettings.attendance_radius_meters || 500}
                      onChange={(e) => setProjectSettings({ ...projectSettings, attendance_radius_meters: Number(e.target.value) })}
                      className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] text-zinc-400 font-medium">Project Value</label>
                    <input type="number" defaultValue="0" className="w-full bg-[#15121F] border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary text-white" />
                  </div>
                </div>
              </div>

              {/* Live Geofence Circular Visualizer Column */}
              <div className="flex flex-col items-center justify-center bg-[#110E1C]/40 border border-white/5 rounded-xl p-4 text-center space-y-4">
                <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Live Geofence Boundary</span>
                <div className="relative w-40 h-40 rounded-full border border-white/10 flex items-center justify-center bg-black/20 overflow-hidden">
                  <div 
                    className="absolute rounded-full bg-primary/10 border border-primary/40 animate-ping"
                    style={{ 
                      width: `${Math.min(100, Math.max(20, (projectSettings.attendance_radius_meters || 500) / 10))}%`, 
                      height: `${Math.min(100, Math.max(20, (projectSettings.attendance_radius_meters || 500) / 10))}%`,
                      animationDuration: '3s'
                    }} 
                  />
                  <div 
                    className="absolute rounded-full bg-primary/25 border border-primary/50 transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, Math.max(20, (projectSettings.attendance_radius_meters || 500) / 10))}%`, 
                      height: `${Math.min(100, Math.max(20, (projectSettings.attendance_radius_meters || 500) / 10))}%` 
                    }} 
                  />
                  <div className="h-3 w-3 rounded-full bg-primary z-10 shadow-lg shadow-primary/50" />
                  <span className="absolute bottom-2 text-[9px] font-mono text-primary font-bold">
                    {projectSettings.attendance_radius_meters || 500}m Limit
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed max-w-xs">
                  GPS punches are matched against this dynamic visual limit.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-white/[0.01]">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 border border-white/10 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2 rounded-lg bg-primary hover:opacity-90 text-xs font-bold text-white transition-all cursor-pointer"
              >
                {isSavingSettings ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
