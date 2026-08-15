"use client";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { useProject } from "@/context/ProjectContext";
import PwaControls from "@/components/pwa/PwaControls";
import Icon, { type IconName } from "@/components/marketing/Icon";

const STATUS_MAP: Record<string, string> = {
  Present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  present: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Absent: "bg-red-500/10 text-red-400 border-red-500/20",
  absent: "bg-red-500/10 text-red-400 border-red-500/20",
  "Half Day": "bg-amber-500/10 text-amber-400 border-amber-500/20",
  half_day: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  "half day": "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const formatPayrollMonth = (ym: string | null | undefined): string => {
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return "";
  const [y, m] = ym.split("-").map(Number);
  const month = MONTHS[m - 1] || "";
  return month ? ` — ${month} ${y}` : "";
};

const LOCALIZATION: Record<string, any> = {
  English: {
    title: "Attendance & Payroll",
    subtitle: "GPS Punch-in · Face Recognition · Salary Processing",
    todayTab: "Today's Attendance",
    payrollTab: "Payroll Runs",
    staffSubTab: "Site Staff",
    contractorSubTab: "Labour Contractor",
    queueTitle: "Mobile Punch Queue",
    gpsActive: "Geofence: Active",
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
    gpsActive: "Geofence: Chalu Hai",
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
    gpsActive: "जियोफेंस: सक्रिय",
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
    gpsActive: "ஜியோஃபென்ஸ்: செயலில் உள்ளது",
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
  employee_id: string;
  project_id: string;
};

const PUNCH_QUEUE_KEY = "siteflow-punch-queue";

export default function AttendancePage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;
  
  const [tab, setTab] = useState<"today" | "payroll">("today");
  const [subTab, setSubTab] = useState<"staff" | "subcon">("staff");
  const [lang, setLang] = useState<string>("English");
  const [showLanguageDrawer, setShowLanguageDrawer] = useState(false);

  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const showExportMsg = (msg: string) => {
    setExportMsg(msg);
    setTimeout(() => setExportMsg(null), 3500);
  };

  const handleExportPayslips = async () => {
    try {
      const latestRes = await fetch(`${getApiHost()}/apis/v3/hr/payroll/latest/${companyId}`, {
        headers: authHeaders() || {},
      });
      if (!latestRes.ok) {
        showExportMsg("Could not load payroll runs.");
        return;
      }
      const latest = await latestRes.json();
      if (!latest.run_id) {
        showExportMsg("No payroll run to export yet");
        return;
      }
      const res = await fetch(`${getApiHost()}/apis/v3/hr/payroll/${latest.run_id}/payslips/export`, {
        headers: authHeaders() || {},
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showExportMsg(err.detail || "Export failed");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `payslips-${latest.payroll_month || latest.run_id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showExportMsg("Payslips CSV downloaded");
    } catch (e: any) {
      showExportMsg(e?.message || "Export failed");
    }
  };

  const [date, setDate] = useState("2026-06-30");
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener("online", updateOnline);
    window.addEventListener("offline", updateOnline);
    return () => {
      window.removeEventListener("online", updateOnline);
      window.removeEventListener("offline", updateOnline);
    };
  }, []);
  const [queuedPunches, setQueuedPunches] = useState<PunchRecord[]>([]);
  const [syncMessage, setSyncMessage] = useState("Mobile punch queue ready");
  const [isSyncing, setIsSyncing] = useState(false);

  // Project Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"details" | "members" | "location">("details");
  const [projectSettings, setProjectSettings] = useState({
    name: "",
    code: "",
    address: "Pune, Pune",
    city: "Pune",
    attendance_radius_meters: 500,
    stage: "Ongoing",
    category: "Residential",
    start_date: "2026-01-01",
    end_date: "2026-12-31",
    company_branch: "Select Company Address",
    value: 0,
    orientation: "North-Facing",
    dimension: "50x120"
  });

  const fetchProjectSettings = async () => {
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/planning/projects/${projectId}`, { headers: authHeaders() });
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
      const res = await fetch(`${getApiHost()}/apis/v3/planning/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
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

  // Real subcontractor + payroll + team-member data (no hardcoded demo rows)
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [payrollRun, setPayrollRun] = useState<{ run_id: string | null; payroll_month: string | null }>({ run_id: null, payroll_month: null });
  const [payslips, setPayslips] = useState<any[]>([]);
  const [payrollLoading, setPayrollLoading] = useState(false);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);

  const fetchSubcontractors = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/billing/subcontractors?company_id=${companyId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSubcontractors(Array.isArray(data) ? data : []);
      } else {
        setSubcontractors([]);
      }
    } catch (e) {
      console.error("Failed to load subcontractors", e);
      setSubcontractors([]);
    }
  }, [companyId]);

  const fetchPayrollCompilation = useCallback(async () => {
    if (!companyId) return;
    setPayrollLoading(true);
    try {
      const latestRes = await fetch(`${getApiHost()}/apis/v3/hr/payroll/latest/${companyId}`, { headers: authHeaders() || {} });
      if (!latestRes.ok) {
        setPayslips([]);
        setPayrollRun({ run_id: null, payroll_month: null });
        return;
      }
      const latest = await latestRes.json();
      setPayrollRun({ run_id: latest.run_id || null, payroll_month: latest.payroll_month || null });
      if (!latest.run_id) {
        setPayslips([]);
        return;
      }
      const paysRes = await fetch(`${getApiHost()}/apis/v3/hr/payroll/${latest.run_id}/payslips`, { headers: authHeaders() || {} });
      if (paysRes.ok) {
        const data = await paysRes.json();
        setPayslips(Array.isArray(data) ? data : []);
      } else {
        setPayslips([]);
      }
    } catch (e) {
      console.error("Failed to load payroll compilation", e);
      setPayslips([]);
    } finally {
      setPayrollLoading(false);
    }
  }, [companyId]);

  const fetchTeamMembers = useCallback(async () => {
    if (!companyId) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/settings/team/${companyId}`, { headers: authHeaders() || {} });
      if (res.ok) {
        const data = await res.json();
        setTeamMembers(Array.isArray(data) ? data : []);
      } else {
        setTeamMembers([]);
      }
    } catch (e) {
      console.error("Failed to load team members", e);
      setTeamMembers([]);
    }
  }, [companyId]);
  
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
      const res = await fetch(`${getApiHost()}/apis/v3/hr/employees/${projectId}`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        if (data.length > 0 && !selectedEmpId) {
          setSelectedEmpId(data[0].id);
        }
      }
      
      const logRes = await fetch(`${getApiHost()}/apis/v3/hr/attendance/${projectId}/${date}`, { headers: authHeaders() });
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
    if (companyId) {
      fetchSubcontractors();
      fetchPayrollCompilation();
    }
  }, [companyId, fetchSubcontractors, fetchPayrollCompilation]);

  useEffect(() => {
    if (isSettingsModalOpen && settingsTab === "members" && companyId) {
      fetchTeamMembers();
    }
  }, [isSettingsModalOpen, settingsTab, companyId, fetchTeamMembers]);

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
    const empName = employees.find(e => e.id === finalEmpId)?.name || "Unknown";
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
      employee_id: finalEmpId,
      project_id: projectId,
      synced: navigator.onLine,
    };

    if (!navigator.onLine) {
      const nextQueue = [punch, ...queuedPunches];
      persistQueue(nextQueue);
      setSyncMessage(`${mode === "IN" ? "Punch in" : "Punch out"} queued offline`);
      return;
    }

    try {
      const res = await fetch(`${getApiHost()}/apis/v3/hr/attendance/punch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
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

  const flushQueue = async () => {
    if (queuedPunches.length === 0) {
      setSyncMessage("No queued punches to sync");
      return;
    }
    if (isSyncing) return;
    setIsSyncing(true);
    let synced = 0;
    let failed = 0;
    const remaining: PunchRecord[] = [];
    for (const punch of queuedPunches) {
      if (!punch.employee_id || !punch.project_id) {
        remaining.push(punch);
        failed += 1;
        continue;
      }
      try {
        const res = await fetch(`${getApiHost()}/apis/v3/hr/attendance/punch`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({
            employee_id: punch.employee_id,
            project_id: punch.project_id,
            lat: parseFloat(punch.lat),
            lng: parseFloat(punch.lng),
            punch_type: punch.mode.toLowerCase(),
            shift_multiplier: punch.shift_multiplier,
            location_verified: punch.location_verified,
            notes: "Offline queued punch synced",
          }),
        });
        if (res.ok) {
          synced += 1;
        } else {
          await res.json().catch(() => ({}));
          remaining.push({ ...punch, synced: false });
          failed += 1;
        }
      } catch (e) {
        remaining.push({ ...punch, synced: false });
        failed += 1;
      }
    }
    persistQueue(remaining);
    setIsSyncing(false);
    if (synced > 0) {
      fetchEmpsAndLogs();
    }
    if (failed === 0) {
      setSyncMessage(`Synced ${synced} queued punches successfully`);
    } else {
      setSyncMessage(`Synced ${synced} of ${queuedPunches.length}; ${failed} failed and remain queued`);
    }
  };

  // Submit subcontractor attendance
  const submitSubconAttendance = async () => {
    if (!selectedSubcon) return;
    try {
      for (const row of subconRows) {
        if (row.count <= 0) continue;
        const body = {
          project_id: projectId,
          subcontractor_id: selectedSubcon.company_team_id,
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
        await fetch(`${getApiHost()}/apis/v3/subcon/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
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
    <div className="flex-1 flex flex-col overflow-hidden">
      {exportMsg && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border-custom text-foreground text-xs px-4 py-2 rounded-lg shadow-lg">
          {exportMsg}
        </div>
      )}
      {/* ── Attendance sub-navigation (top tabs) ── */}
      <div className="flex items-center gap-1 px-6 py-2 border-b border-border-custom bg-card shrink-0 overflow-x-auto">
        {([
          { key: "today", label: strings.todayTab, icon: "calendar" },
          { key: "payroll", label: strings.payrollTab, icon: "banknote" },
        ] as { key: string; label: string; icon: IconName }[]).map(item => (
          <button key={item.key} onClick={() => setTab(item.key as typeof tab)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${tab === item.key ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground hover:bg-elevated"}`}>
            <Icon name={item.icon} className="w-3.5 h-3.5" />{item.label}
          </button>
        ))}
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border-custom bg-background px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-foreground">{strings.title}</h1>
            <p className="text-[10px] text-muted">{strings.subtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs text-muted bg-elevated border border-border-custom px-3 py-1.5 rounded-lg"><Icon name="location_pin" className="w-4 h-4" />{strings.gpsActive}</span>
            <button
              onClick={() => {
                fetchProjectSettings();
                setIsSettingsModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/20 hover:bg-primary/30 border border-border-custom text-primary font-bold text-xs transition-all cursor-pointer"
            >
              <Icon name="settings" className="w-4 h-4" />Project Settings
            </button>
            <button onClick={() => setShowLanguageDrawer(true)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-input border border-border-custom text-muted hover:text-foreground text-xs font-bold transition-all cursor-pointer">
              <Icon name="globe" className="w-4 h-4" />Language: <strong className="text-primary">{lang}</strong>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {!isOnline && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-md text-xs flex items-center gap-2">
              <Icon name="warning" className="w-4 h-4 shrink-0" /> You are offline. Showing cached data. Some actions may be delayed.
            </div>
          )}
          {tab === "today" && (
            <>
              {/* Sub tabs and date picker */}
              <div className="flex justify-between items-center border-b border-border-custom pb-1">
                <div className="flex">
                  <button onClick={() => setSubTab("staff")} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${subTab === "staff" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>
                    {strings.staffSubTab}
                  </button>
                  <button onClick={() => setSubTab("subcon")} className={`px-4 py-2 text-xs font-bold transition-all border-b-2 ${subTab === "subcon" ? "border-primary text-primary" : "border-transparent text-muted hover:text-foreground"}`}>
                    {strings.contractorSubTab}
                  </button>
                </div>
                <div className="flex items-center gap-2 pr-2">
                  <span className="text-[10px] uppercase font-bold text-muted">Selected Date:</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-input border border-border-custom text-foreground rounded-lg px-2.5 py-1 text-xs font-semibold focus:outline-none focus:border-primary text-right"
                  />
                </div>
              </div>

              {subTab === "staff" && (
                <div className="space-y-5">
                  {/* Punch Control Panel */}
                  <div className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom p-5 space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-end justify-between">
                      <div className="space-y-3 flex-1">
                        <label className="block text-xs font-bold text-muted">Select Staff / Labor Employee</label>
                        <select 
                          value={selectedEmpId} 
                          onChange={(e) => setSelectedEmpId(e.target.value)}
                          className="w-full bg-input border border-border-custom text-foreground rounded-lg p-2 text-xs"
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
                        <label className="block text-xs font-bold text-muted">Shift Multiplier</label>
                        <div className="flex gap-2">
                          {[0.5, 1.0, 2.0].map((val) => (
                            <button
                              key={val}
                              onClick={() => { setPunchMultiplier(val); setCustomMultiplierVal(""); }}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${punchMultiplier === val ? "bg-primary text-white border-primary" : "bg-input border-border-custom text-muted hover:text-foreground"}`}
                            >
                              {val}x
                            </button>
                          ))}
                          <button
                            onClick={() => setPunchMultiplier(0)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${punchMultiplier === 0 ? "bg-primary text-white border-primary" : "bg-input border-border-custom text-muted hover:text-foreground"}`}
                          >
                            Custom
                          </button>
                        </div>
                      </div>

                      {punchMultiplier === 0 && (
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-muted">Custom Multiplier</label>
                          <input
                            type="number"
                            step="0.01"
                            value={customMultiplierVal}
                            onChange={(e) => setCustomMultiplierVal(e.target.value)}
                            placeholder="e.g. 0.36"
                            className="bg-input border border-border-custom text-foreground rounded-lg p-2 text-xs w-28"
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
                        <label htmlFor="gps_verify" className="text-xs text-muted select-none cursor-pointer">
                          Simulate GPS lock (On-Site)
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 border-t border-border-custom pt-4">
                      <button onClick={() => queuePunch("IN")} className="rounded-md bg-primary px-5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90">
                        Clock Punch In
                      </button>
                      <button onClick={() => queuePunch("OUT")} className="rounded-md border border-border-custom bg-elevated px-5 py-2.5 text-xs font-bold text-foreground transition-colors hover:bg-elevated">
                        Clock Punch Out
                      </button>
                      <button onClick={flushQueue} disabled={isSyncing} className="rounded-md border border-secondary/20 bg-secondary/15 px-5 py-2.5 text-xs font-bold text-secondary transition-colors hover:bg-secondary/20 ml-auto disabled:cursor-not-allowed disabled:opacity-50">
                        Sync Offline Queue ({queuedPunches.length})
                      </button>
                    </div>
                    {syncMessage && <div className="text-[10px] text-muted font-sans">{syncMessage}</div>}
                  </div>

                  {/* Log list */}
                  <div className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom overflow-hidden">
                    <div className="px-5 py-3 border-b border-border-custom flex items-center justify-between">
                      <h2 className="text-xs font-bold text-muted uppercase tracking-wider">{strings.workerLog}</h2>
                      <span className="text-[10px] text-emerald-400 font-semibold">● Real-time Logs</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-border-custom text-muted">
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
                              <td colSpan={7} className="px-5 py-6 text-center text-muted">No attendance logs logged yet for today. Use the form above to record punches!</td>
                            </tr>
                          ) : (
                            dbLogs.map((log) => {
                              const empName = employees.find(e => e.id === log.employee_id)?.name || "Unknown";
                              return (
                                <tr key={log.id} className="border-b border-border-custom hover:bg-elevated transition-all">
                                  <td className="px-5 py-3 font-semibold text-foreground">{empName}</td>
                                  <td className="px-5 py-3 text-muted font-sans">{log.punch_in ? new Date(log.punch_in).toLocaleTimeString() : "—"}</td>
                                  <td className="px-5 py-3 text-muted font-sans">{log.punch_out ? new Date(log.punch_out).toLocaleTimeString() : "—"}</td>
                                  <td className="px-5 py-3 text-muted font-bold">{log.shift_multiplier || 1.0}x</td>
                                  <td className="px-5 py-3">
                                    {log.location_verified ? (
                                      <span className="text-emerald-400">✓ Yes</span>
                                    ) : (
                                      <span className="text-red-400 font-bold uppercase text-[9px] tracking-wider bg-red-400/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                                        Location (Not Verified)
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-5 py-3 text-muted font-sans">{log.distance_from_site_m ? `${log.distance_from_site_m}m` : "0m (Inside)"}</td>
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
                    {subcontractors.length === 0 ? (
                      <div className="md:col-span-3 bg-card border border-border-custom rounded-lg p-6 text-center text-muted text-xs">
                        No subcontractors registered for this company yet.
                      </div>
                    ) : (
                      subcontractors.map((sc) => (
                        <div key={sc.company_team_id} className="bg-card border border-border-custom rounded-lg p-5 flex flex-col justify-between hover:border-border-custom transition-all">
                          <div>
                            <h3 className="text-sm font-bold text-foreground">{sc.name}</h3>
                            <p className="text-[10px] text-muted mt-1">{sc.phone ? `Contact: ${sc.phone}` : "Labour Provider Crew"}</p>
                          </div>
                          <button
                            onClick={() => { setSelectedSubcon(sc); setSubconPhoto(""); }}
                            className="mt-6 w-full text-center py-2 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-md hover:bg-primary/20 transition-all"
                          >
                            Log Daily Crew Size →
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Subcontractor Entry Drawer Modal */}
                  {selectedSubcon && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                      <div className="bg-background border border-border-custom rounded-lg w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                        <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between">
                          <div>
                            <h2 className="text-sm font-extrabold text-foreground">Log Subcontractor Crew Attendance</h2>
                            <p className="text-[10px] text-muted mt-0.5">{selectedSubcon.name} · Role Allocation Grid</p>
                          </div>
                          <button onClick={() => setSelectedSubcon(null)} className="text-muted hover:text-foreground">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 flex-1">
                          {/* Role Count Stepper Grid */}
                          <div className="space-y-4">
                            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Crew Size Matrix</h3>
                            <div className="overflow-hidden rounded-md border border-border-custom bg-input">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-elevated border-b border-border-custom text-muted">
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
                                    <tr key={idx} className="border-b border-border-custom hover:bg-elevated">
                                      <td className="px-4 py-2">
                                        <input
                                          type="text"
                                          value={row.role}
                                          onChange={(e) => {
                                            const next = [...subconRows];
                                            next[idx].role = e.target.value;
                                            setSubconRows(next);
                                          }}
                                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-xs text-foreground w-28"
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
                                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-xs text-foreground w-16"
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
                                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-xs text-foreground w-16"
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
                                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-xs text-foreground w-16"
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
                                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-xs text-foreground w-20"
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
                                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-xs text-foreground w-20"
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
                                          className="bg-elevated border border-border-custom rounded px-2 py-1 text-xs text-foreground w-full"
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
                          <div className="space-y-2 border-t border-border-custom pt-4">
                            <h3 className="text-xs font-bold text-muted uppercase tracking-wider">Crew Presence Verification</h3>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => setSubconPhoto("https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500")}
                                className="flex items-center gap-2 px-4 py-2 bg-input hover:bg-elevated border border-border-custom rounded-md text-xs font-bold text-muted transition-all"
                              >
                                <Icon name="camera" className="w-4 h-4" /> Camera / Capture Crew Photo
                              </button>
                              {subconPhoto && (
                                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1 rounded-md text-[10px] font-bold">
                                  <span>✓ Photo Attached</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="px-6 py-4 border-t border-border-custom bg-background flex items-center justify-end gap-3">
                          <button onClick={() => setSelectedSubcon(null)} className="px-4 py-2 text-xs font-bold text-muted hover:text-foreground rounded-md transition-all">Cancel</button>
                          <button onClick={submitSubconAttendance} className="px-5 py-2.5 text-xs font-bold text-white bg-primary rounded-md hover:opacity-90 transition-all">Save Crew Logs</button>
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
              <div className="bg-input border border-primary/20 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="inline-flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider"><Icon name="bar_chart" className="w-4 h-4" />Live Wage Estimator</h2>
                    <p className="text-[10px] text-muted mt-0.5">Real-time payroll estimate: Workers × Rate × Shift + OT + Allowances − Deductions</p>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] text-muted uppercase tracking-wider">Est. Monthly Outflow</div>
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
                <div className="overflow-x-auto rounded-md border border-border-custom">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border-custom text-muted text-[9px] uppercase tracking-wider">
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
                          <tr key={idx} className="border-b border-border-custom">
                            <td className="py-2.5 pl-4 pr-3 text-muted font-semibold">{row.role || `Role ${idx + 1}`}</td>
                            <td className="py-2.5 px-3 text-center font-sans text-foreground font-bold">{row.count}</td>
                            <td className="py-2.5 px-3 text-center font-sans text-muted">₹{row.rate}</td>
                            <td className="py-2.5 px-3 text-center">
                              <select value={row.shift || 1}
                                onChange={(e) => { const next = [...subconRows]; (next[idx] as any).shift = parseFloat(e.target.value); setSubconRows(next); }}
                                className="bg-elevated border border-border-custom rounded px-1.5 py-0.5 text-[10px] text-foreground">
                                {[0.25, 0.5, 0.75, 1.0, 1.5, 2.0].map(v => <option key={v} value={v}>{v}×</option>)}
                              </select>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <input type="number" min={0} value={row.ot || 0}
                                onChange={(e) => { const next = [...subconRows]; (next[idx] as any).ot = parseFloat(e.target.value) || 0; setSubconRows(next); }}
                                className="bg-elevated border border-border-custom rounded px-1.5 py-0.5 text-[10px] text-foreground w-12 text-center" placeholder="0" />
                            </td>
                            <td className="py-2.5 px-3 text-center font-sans text-muted">₹{row.allowance || 0}</td>
                            <td className="py-2.5 pr-4 text-right font-sans font-bold text-emerald-400">₹{daily.toLocaleString("en-IN")}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-border-custom bg-background">
                        <td colSpan={6} className="py-2.5 pl-4 text-xs font-bold text-muted">Subcontractor Daily Total</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-primary font-sans text-sm">
                          ₹{subconRows.reduce((s: any, r: any) => s + r.count * r.rate * (r.shift || 1) + r.count * (r.ot || 0) * (r.rate / 8) + (r.allowance || 0) - (r.deduction || 0), 0).toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Month-end Payroll Compilation */}
              <div className="bg-input border border-border-custom rounded-lg overflow-hidden">
                <div className="px-5 py-3 border-b border-border-custom flex items-center justify-between">
                  <div>
                    <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Monthly Payroll Compilation{formatPayrollMonth(payrollRun.payroll_month)}</h2>
                    <p className="text-[10px] text-muted mt-0.5">Salary + PF + ESI statutory deductions per IS code. Download payslip per employee.</p>
                  </div>
                  <button onClick={handleExportPayslips} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[10px] font-bold rounded-lg hover:bg-primary/90 transition-all"><Icon name="outbox" className="w-3.5 h-3.5" />Export All Payslips</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border-custom text-muted text-[9px] uppercase tracking-wider">
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
                     <tbody className="divide-y divide-border-custom">
                       {payrollLoading ? (
                         <tr>
                           <td colSpan={8} className="py-6 text-center text-muted">Loading payroll compilation...</td>
                         </tr>
                       ) : payslips.length === 0 ? (
                         <tr>
                           <td colSpan={8} className="py-6 text-center text-muted">No payroll run yet for this company.</td>
                         </tr>
                       ) : (
                         payslips.map((emp) => (
                           <tr key={emp.id} className="hover:bg-elevated">
                             <td className="py-3 pl-5 pr-3 font-semibold text-foreground">{emp.employee_name}</td>
                             <td className="py-3 px-3 text-muted">{emp.employee_designation || "—"}</td>
                             <td className="py-3 px-3 text-right font-sans text-foreground">₹{emp.gross_salary.toLocaleString("en-IN")}</td>
                             <td className="py-3 px-3 text-right font-sans text-red-400">₹{emp.pf_employee.toLocaleString("en-IN")}</td>
                             <td className="py-3 px-3 text-right font-sans text-red-400">₹{emp.esi_employee.toLocaleString("en-IN")}</td>
                             <td className="py-3 px-3 text-right font-sans text-red-400">₹{emp.tds.toLocaleString("en-IN")}</td>
                             <td className="py-3 px-3 text-right font-bold font-sans text-emerald-400">₹{emp.net_payable.toLocaleString("en-IN")}</td>
                             <td className="py-3 pr-5 text-center">
                               <button onClick={() => window.print()}
                                 className="inline-flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold bg-primary/10 border border-primary/20 text-primary rounded-lg hover:bg-primary/20 transition-all">
                                 <Icon name="description" className="w-3.5 h-3.5" />Download
                               </button>
                             </td>
                           </tr>
                         ))
                       )}
                     </tbody>
                     <tfoot>
                       <tr className="border-t-2 border-border-custom bg-background">
                         <td colSpan={2} className="py-3 pl-5 font-bold text-foreground">TOTAL PAYROLL</td>
                         <td className="py-3 px-3 text-right font-bold font-sans text-foreground">₹{payslips.reduce((s: number, e: any) => s + (e.gross_salary || 0), 0).toLocaleString("en-IN")}</td>
                         <td className="py-3 px-3 text-right font-bold font-sans text-red-400">₹{payslips.reduce((s: number, e: any) => s + (e.pf_employee || 0), 0).toLocaleString("en-IN")}</td>
                         <td className="py-3 px-3 text-right font-bold font-sans text-red-400">₹{payslips.reduce((s: number, e: any) => s + (e.esi_employee || 0), 0).toLocaleString("en-IN")}</td>
                         <td className="py-3 px-3 text-right font-bold font-sans text-red-400">₹{payslips.reduce((s: number, e: any) => s + (e.tds || 0), 0).toLocaleString("en-IN")}</td>
                         <td className="py-3 px-3 text-right font-black font-sans text-emerald-400 text-sm">₹{payslips.reduce((s: number, e: any) => s + (e.net_payable || 0), 0).toLocaleString("en-IN")}</td>
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-background border border-border-custom rounded-lg w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border-custom pb-2">
              <h3 className="text-sm font-extrabold text-foreground">Select Regional Language</h3>
              <button onClick={() => setShowLanguageDrawer(false)} className="text-muted hover:text-foreground">✕</button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(LOCALIZATION).map((langName) => (
                <button
                  key={langName}
                  onClick={() => { setLang(langName); setShowLanguageDrawer(false); }}
                  className={`inline-flex items-center gap-2 py-3 px-4 border rounded-md text-xs font-bold text-left transition-all ${lang === langName ? "bg-primary/10 border-primary text-primary" : "bg-input border-border-custom text-muted hover:bg-elevated hover:text-foreground"}`}
                >
                  <Icon name="globe" className="w-4 h-4" />{langName}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Project Settings Modal */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border-custom rounded-lg w-full max-w-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border-custom flex items-center justify-between bg-elevated">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">Project Setting</h3>
                <p className="text-[10px] text-muted mt-0.5">Configure project details, members and geofence parameters</p>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-muted hover:text-foreground cursor-pointer">✕</button>
            </div>

            {/* Modal Tabs */}
            <div className="px-6 py-3 border-b border-border-custom flex items-center gap-4 bg-elevated">
              <span
                onClick={() => setSettingsTab("details")}
                className={`text-xs font-bold pb-1 cursor-pointer transition-all ${
                  settingsTab === "details" ? "text-primary border-b-2 border-primary" : "text-muted hover:text-foreground"
                }`}
              >
                Project Details
              </span>
              <span
                onClick={() => setSettingsTab("members")}
                className={`text-xs font-bold pb-1 cursor-pointer transition-all ${
                  settingsTab === "members" ? "text-primary border-b-2 border-primary" : "text-muted hover:text-foreground"
                }`}
              >
                Members
              </span>
              <span
                onClick={() => setSettingsTab("location")}
                className={`text-xs font-bold pb-1 cursor-pointer transition-all ${
                  settingsTab === "location" ? "text-primary border-b-2 border-primary" : "text-muted hover:text-foreground"
                }`}
              >
                Location Structure
              </span>
            </div>

            {/* Grid Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {settingsTab === "details" && (
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Left Column Avatar */}
                  <div className="flex flex-col items-center md:items-start shrink-0">
                    <div className="h-16 w-16 bg-primary rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-md shadow-primary/20">
                      PD
                    </div>
                    <span className="text-[9px] text-muted font-bold uppercase mt-2 block">PROJECT BRAND</span>
                  </div>

                  {/* Form Column */}
                  <div className="flex-1 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Project Code</label>
                        <input
                          type="text"
                          value={projectSettings.code || ""}
                          onChange={(e) => setProjectSettings({ ...projectSettings, code: e.target.value })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Project Name</label>
                        <input
                          type="text"
                          value={projectSettings.name || ""}
                          onChange={(e) => setProjectSettings({ ...projectSettings, name: e.target.value })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Project Stage</label>
                        <select
                          value={projectSettings.stage}
                          onChange={(e) => setProjectSettings({ ...projectSettings, stage: e.target.value })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                        >
                          <option value="Ongoing">Ongoing</option>
                          <option value="Planning">Planning</option>
                          <option value="On Hold">On Hold</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Project Category</label>
                        <select
                          value={projectSettings.category}
                          onChange={(e) => setProjectSettings({ ...projectSettings, category: e.target.value })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                        >
                          <option value="Residential">Residential</option>
                          <option value="Commercial">Commercial</option>
                          <option value="Infrastructure">Infrastructure</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Start Date</label>
                        <input
                          type="date"
                          value={projectSettings.start_date}
                          onChange={(e) => setProjectSettings({ ...projectSettings, start_date: e.target.value })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs font-sans"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">End Date</label>
                        <input
                          type="date"
                          value={projectSettings.end_date}
                          onChange={(e) => setProjectSettings({ ...projectSettings, end_date: e.target.value })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs font-sans"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted uppercase font-bold">Project Address</label>
                      <textarea
                        value={projectSettings.address}
                        onChange={(e) => setProjectSettings({ ...projectSettings, address: e.target.value })}
                        rows={2}
                        className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs resize-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-muted uppercase font-bold">Company Branch</label>
                      <select
                        value={projectSettings.company_branch}
                        onChange={(e) => setProjectSettings({ ...projectSettings, company_branch: e.target.value })}
                        className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                      >
                        <option value="Select Company Address">Select Company Address</option>
                        <option value="Pune Main Office">Pune Main Office (Branch #1)</option>
                        <option value="Mumbai Central">Mumbai Central (Branch #2)</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Attendance Radius (meters)</label>
                        <input
                          type="number"
                          value={projectSettings.attendance_radius_meters}
                          onChange={(e) => setProjectSettings({ ...projectSettings, attendance_radius_meters: Number(e.target.value) })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Project Value (₹)</label>
                        <input
                          type="number"
                          value={projectSettings.value}
                          onChange={(e) => setProjectSettings({ ...projectSettings, value: Number(e.target.value) })}
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs font-sans"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Project Orientation</label>
                        <input
                          type="text"
                          value={projectSettings.orientation}
                          onChange={(e) => setProjectSettings({ ...projectSettings, orientation: e.target.value })}
                          placeholder="e.g. North-Facing"
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] text-muted uppercase font-bold">Project Dimension</label>
                        <input
                          type="text"
                          value={projectSettings.dimension}
                          onChange={(e) => setProjectSettings({ ...projectSettings, dimension: e.target.value })}
                          placeholder="e.g. 50x120"
                          className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-primary text-xs"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "members" && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-muted font-bold uppercase tracking-wider">Authorized Team Members</span>
                    <button
                      type="button"
                      onClick={() => {
                        const name = prompt("Enter new team member name:");
                        if (name && name.trim()) {
                          setTeamMembers(prev => [...prev, { id: `m-${Date.now()}`, name: name.trim(), role_name: "Authorized Supervisor" }]);
                        }
                      }}
                      className="bg-primary hover:bg-primary/95 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      + Add Member
                    </button>
                  </div>
                   <div className="divide-y divide-border-custom/50 bg-elevated/20 border border-border-custom rounded-xl p-3 text-xs">
                     {teamMembers.length === 0 ? (
                       <div className="py-2 text-center text-muted">No team members found for this company.</div>
                     ) : (
                       teamMembers.map((m) => (
                         <div key={m.id} className="py-2 flex justify-between">
                           <span className="font-semibold text-foreground">{m.name}</span>
                           <span className="text-muted">{m.role_name || m.priority_type || "Member"}</span>
                         </div>
                       ))
                     )}
                   </div>
                </div>
              )}

              {settingsTab === "location" && (
                <div className="space-y-4 text-center py-6">
                  <Icon name="location_pin" className="w-8 h-8 mx-auto text-primary" />
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Geofence Boundary Map</h4>
                  <p className="text-[10px] text-muted max-w-xs mx-auto leading-relaxed">
                    Geofencing matches GPS punch coordinates to project boundaries within a {projectSettings.attendance_radius_meters}m radius limit.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border-custom flex items-center justify-end gap-3 bg-elevated">
              <button
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-4 py-2 border border-border-custom rounded-lg text-xs font-semibold text-muted hover:text-foreground cursor-pointer"
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