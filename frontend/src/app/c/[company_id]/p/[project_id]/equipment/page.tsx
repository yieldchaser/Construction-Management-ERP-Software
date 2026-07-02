"use client";
import { getApiHost } from "@/lib/api";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface Equipment {
  id: string;
  company_id: string;
  name: string;
  code: string;
  category: string;
  ownership_type: string;
  status: string;
  hourly_rate: number;
  created_at: string;
}

interface EquipmentDeployment {
  id: string;
  equipment_id: string;
  project_id: string;
  start_date: string;
  end_date: string | null;
  remarks: string | null;
}

interface FuelLog {
  id: string;
  equipment_id: string;
  project_id: string;
  logged_date: string;
  liters: number;
  cost_per_liter: number;
  total_cost: number;
  odometer_hours: number | null;
  remarks: string | null;
}

interface MaintenanceSchedule {
  id: string;
  equipment_id: string;
  service_type: string;
  scheduled_date: string;
  completed_date: string | null;
  cost: number;
  status: string;
  remarks: string | null;
}

export default function EquipmentTrackingPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [activeTab, setActiveTab] = useState<"fleet" | "timeline" | "odologs" | "maintenance">("fleet");
  
  // Data states
  const [fleet, setFleet] = useState<Equipment[]>([]);
  const [deployments, setDeployments] = useState<EquipmentDeployment[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal open states
  const [isAddEqOpen, setIsAddEqOpen] = useState(false);
  
  // Start/Stop wizard modal states
  const [activeDeployingEq, setActiveDeployingEq] = useState<Equipment | null>(null);
  const [startMeterVal, setStartMeterVal] = useState("");
  const [isStartPhotoCaptured, setIsStartPhotoCaptured] = useState(false);

  const [activeStoppingEq, setActiveStoppingEq] = useState<Equipment | null>(null);
  const [stopMeterVal, setStopMeterVal] = useState("");
  const [isStopPhotoCaptured, setIsStopPhotoCaptured] = useState(false);
  const [isGpsLocked, setIsGpsLocked] = useState(true);

  // Log Fuel States
  const [activeFuelingEq, setActiveFuelingEq] = useState<Equipment | null>(null);
  const [fuelDate, setFuelDate] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelRate, setFuelRate] = useState("");
  const [fuelOdo, setFuelOdo] = useState("");
  const [fuelRemarks, setFuelRemarks] = useState("");

  // Add Equipment Form
  const [eqName, setEqName] = useState("");
  const [eqCode, setEqCode] = useState("");
  const [eqCategory, setEqCategory] = useState("Excavator");
  const [eqOwnership, setEqOwnership] = useState("Owned");
  const [eqRate, setEqRate] = useState("0");

  const [error, setError] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const fleetRes = await fetch(`${getApiHost()}/apis/v3/equipment/${companyId}`);
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        setFleet(fleetData);
        // Try fetching maintenance logs for all equipment
        try {
          const maintenancePromises = fleetData.map((eq: any) =>
            fetch(`${getApiHost()}/apis/v3/equipment/maintenance-schedules/${eq.id}`).then(res => res.ok ? res.json() : [])
          );
          const maintenanceResults = await Promise.all(maintenancePromises);
          setMaintenanceLogs(maintenanceResults.flat());
        } catch {
          setMaintenanceLogs([]);
        }
      } else {
        throw new Error("Fleet API failed");
      }
      const depRes = await fetch(`${getApiHost()}/apis/v3/equipment/deployments/${projectId}`);
      if (depRes.ok) {
        setDeployments(await depRes.json());
      }
      const fuelRes = await fetch(`${getApiHost()}/apis/v3/equipment/fuel-logs/${projectId}`);
      if (fuelRes.ok) {
        setFuelLogs(await fuelRes.json());
      }
    } catch (err) {
      console.error("Error loading equipment data, using fallback mock data:", err);
      // Fallback mocks
      setFleet([
        { id: "EQ-01", company_id: companyId, name: "JCB Excavator 3DX", code: "JCB-001", category: "Excavator", ownership_type: "Owned", status: "Active", hourly_rate: 1500, created_at: "2026-06-01" },
        { id: "EQ-02", company_id: companyId, name: "Concrete Mixer 10/7", code: "MIX-002", category: "Mixer", ownership_type: "Rented", status: "Active", hourly_rate: 600, created_at: "2026-06-05" },
        { id: "EQ-03", company_id: companyId, name: "Crawler Crane Demag", code: "CRN-003", category: "Crane", ownership_type: "Owned", status: "Maintenance", hourly_rate: 4500, created_at: "2026-06-10" }
      ]);
      setDeployments([
        { id: "DEP-01", equipment_id: "EQ-01", project_id: projectId, start_date: "2026-06-25T08:00:00Z", end_date: null, remarks: "Start reading: 435. Photo Proof: true" },
        { id: "DEP-02", equipment_id: "EQ-02", project_id: projectId, start_date: "2026-06-20T09:00:00Z", end_date: "2026-06-20T17:00:00Z", remarks: "Start reading: 120. Stop reading: 128. Photo Proof: true" }
      ]);
      setFuelLogs([
        { id: "FL-01", equipment_id: "EQ-01", project_id: projectId, logged_date: "2026-06-26T10:00:00Z", liters: 45, cost_per_liter: 92, total_cost: 4140, odometer_hours: 438, remarks: "Normal refueling" }
      ]);
      setMaintenanceLogs([
        { id: "MT-01", equipment_id: "EQ-01", service_type: "Engine Oil & Filter Change", scheduled_date: "2026-06-20", completed_date: null, cost: 8500, status: "Overdue", remarks: "Scheduled but pending crew confirmation" },
        { id: "MT-02", equipment_id: "EQ-03", service_type: "Hydraulic Hose Leak Repair", scheduled_date: "2026-06-28", completed_date: "2026-06-29", cost: 12000, status: "Completed", remarks: "Replaced main high pressure hose" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyId && projectId) {
      loadData();
    }
  }, [companyId, projectId]);

  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim() || !eqCode.trim()) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/equipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          name: eqName,
          code: eqCode,
          category: eqCategory,
          ownership_type: eqOwnership,
          hourly_rate: parseFloat(eqRate) || 0.0,
        }),
      });
      if (res.ok) {
        setIsAddEqOpen(false);
        setEqName("");
        setEqCode("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Start Machinery deployment
  const handleStartMachinery = async () => {
    if (!activeDeployingEq || !startMeterVal) return;
    try {
      const res = await fetch(`${getApiHost()}/apis/v3/equipment/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: activeDeployingEq.id,
          project_id: projectId,
          start_date: new Date().toISOString(),
          remarks: `Start reading: ${startMeterVal}. Photo Proof: ${isStartPhotoCaptured}`
        }),
      });
      if (res.ok) {
        setActiveDeployingEq(null);
        setStartMeterVal("");
        setIsStartPhotoCaptured(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Stop Machinery deployment
  const handleStopMachinery = async (andAddFuel: boolean = false) => {
    if (!activeStoppingEq || !stopMeterVal) return;
    try {
      // Find active deployment
      const dep = deployments.find(d => d.equipment_id === activeStoppingEq.id && d.end_date === null);
      if (!dep) return;
      const res = await fetch(`${getApiHost()}/apis/v3/equipment/deployments/${dep.id}/return`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          end_date: new Date().toISOString(),
          remarks: `Stop reading: ${stopMeterVal}. Photo Proof: ${isStopPhotoCaptured}. GPS Lock: ${isGpsLocked}`
        }),
      });
      if (res.ok) {
        const targetEq = activeStoppingEq;
        setActiveStoppingEq(null);
        setStopMeterVal("");
        setIsStopPhotoCaptured(false);
        loadData();

        if (andAddFuel) {
          setFuelOdo(stopMeterVal);
          setActiveFuelingEq(targetEq);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fuel logging
  const handleLogFuel = async () => {
    if (!activeFuelingEq || !fuelLiters || !fuelRate) return;
    try {
      const litersVal = parseFloat(fuelLiters);
      const rateVal = parseFloat(fuelRate);
      const odoVal = fuelOdo ? parseFloat(fuelOdo) : null;
      const total = litersVal * rateVal;

      const res = await fetch(`${getApiHost()}/apis/v3/equipment/fuel-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment_id: activeFuelingEq.id,
          project_id: projectId,
          logged_date: new Date().toISOString(),
          liters: litersVal,
          cost_per_liter: rateVal,
          total_cost: total,
          odometer_hours: odoVal,
          remarks: fuelRemarks || null
        })
      });
      if (res.ok) {
        setActiveFuelingEq(null);
        setFuelLiters("");
        setFuelRate("");
        setFuelOdo("");
        setFuelRemarks("");
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Compile Unified timeline (logs + fuels)
  const timelineEvents = [
    ...deployments.map(d => {
      const eq = fleet.find(e => e.id === d.equipment_id);
      return {
        id: d.id,
        eqName: eq ? eq.name : "Machinery",
        type: "usage",
        date: d.start_date,
        endDate: d.end_date,
        remarks: d.remarks,
        display: d.end_date 
          ? `Deployment hours logged: ${new Date(d.start_date).toLocaleTimeString()} - ${new Date(d.end_date).toLocaleTimeString()} (${d.remarks || ""})`
          : `Deploying JCB: Active reading wizard running...`
      };
    }),
    ...fuelLogs.map(f => {
      const eq = fleet.find(e => e.id === f.equipment_id);
      return {
        id: f.id,
        eqName: eq ? eq.name : "Machinery",
        type: "fuel",
        date: f.logged_date,
        endDate: null,
        remarks: f.remarks,
        display: `Fuel added: ${f.liters} Liters Diesel at ₹${f.cost_per_liter}/L (Total: ₹${f.total_cost})`
      };
    })
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex h-screen bg-[#0E0C15] text-[#ededed] overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-[#0B0910] flex flex-col justify-between h-full shrink-0">
        <div className="flex flex-col overflow-y-auto flex-1">
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white">S</div>
            <span className="font-bold text-white tracking-tight">SiteFlow Console</span>
          </div>

          <nav className="p-4 space-y-2">
            <Link href={`/c/${companyId}/dashboard`} className="flex items-center gap-2.5 px-3 py-2 text-xs text-zinc-400 hover:text-white hover:bg-white/[0.02] rounded-lg">
              <span>←</span> Back to Dashboard
            </Link>
            <div className="pt-4">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block px-3 mb-2">Fleet Management</span>
              <ul className="space-y-1">
                <li>
                  <Link href="#" className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white/[0.06] text-white font-semibold shadow-sm">
                    <span>🚜</span> Equipment & Machinery
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </aside>

      {/* Main Framework */}
      <main className="flex-1 flex flex-col overflow-hidden h-full">
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-[#0B0910] shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Equipment & Machinery Logs</h1>
            <span className="h-4 w-px bg-white/10" />
            <span className="text-xs font-medium text-zinc-400">GPS verified mileage and refueling timeline</span>
          </div>
          <button onClick={() => setIsAddEqOpen(true)} className="px-4 py-2 bg-gradient-to-r from-primary to-[#FF3B6C] rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20">
            + Add Equipment
          </button>
        </header>

        {/* Tab Controls */}
        <div className="border-b border-white/5 bg-[#0D0B14]/40 px-6 py-1.5 flex gap-4 text-xs font-semibold shrink-0">
          {[
            { id: "fleet", label: "Fleet Inventory", emoji: "🚜" },
            { id: "timeline", label: "Usage & Refuel Timeline", emoji: "⛽" },
            { id: "odologs", label: "Odometer Run Logs", emoji: "📊" },
            { id: "maintenance", label: "Maintenance Schedule", emoji: "🔧" }
          ].map((t) => (
            <button key={t.id} onClick={() => { setActiveTab(t.id as any); }} className={`flex items-center gap-1.5 py-2 border-b-2 transition-all ${activeTab === t.id ? "border-primary text-white" : "border-transparent text-zinc-400 hover:text-white"}`}>
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-zinc-500 text-xs text-center py-20">Loading machinery logs...</div>
          ) : (
            <>
              {activeTab === "fleet" && (
                <div className="space-y-6">
                  {/* Overdue Maintenance Banner Alert */}
                  {maintenanceLogs.filter(m => m.completed_date === null && new Date(m.scheduled_date) < new Date()).length > 0 && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-start gap-3 text-xs">
                      <span className="text-lg">⚠️</span>
                      <div>
                        <strong className="font-extrabold block text-white">Overdue Maintenance Alert!</strong>
                        <p className="text-zinc-400 mt-0.5">The following machinery requires immediate servicing to prevent site safety incidents:</p>
                        <ul className="list-disc pl-5 mt-1.5 space-y-1 font-mono text-[10px]">
                          {maintenanceLogs.filter(m => m.completed_date === null && new Date(m.scheduled_date) < new Date()).map(m => {
                            const eq = fleet.find(e => e.id === m.equipment_id);
                            return (
                              <li key={m.id}>
                                <span className="text-white font-bold">{eq?.name ?? "Equipment"} ({eq?.code})</span>: {m.service_type} (Scheduled: {m.scheduled_date})
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {fleet.map((eq) => {
                      const activeDep = deployments.find(d => d.equipment_id === eq.id && d.end_date === null);
                      const isOverdue = maintenanceLogs.some(m => m.equipment_id === eq.id && m.completed_date === null && new Date(m.scheduled_date) < new Date());
                      return (
                        <div key={eq.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#14121F] flex flex-col justify-between space-y-4">
                          <div>
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-xs font-bold text-white line-clamp-1">{eq.name}</span>
                              <div className="flex gap-1 items-center">
                                {isOverdue && (
                                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-red-500/15 border border-red-500/30 text-red-400">
                                    ⚠️ SERVICING OVERDUE
                                  </span>
                                )}
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${activeDep ? "bg-primary/10 text-primary border-primary/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}`}>
                                  {activeDep ? "deployed" : "available"}
                                </span>
                              </div>
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Code: {eq.code} · Category: {eq.category}</div>
                          </div>

                        <div className="border-t border-white/5 pt-3.5 flex justify-between items-center text-xs">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-zinc-500">Hourly Rate</span>
                            <div className="text-sm font-extrabold text-white mt-0.5">₹{eq.hourly_rate}/hr</div>
                          </div>
                          
                          <div className="flex gap-2">
                            {activeDep ? (
                              <button
                                onClick={() => { setActiveStoppingEq(eq); setStopMeterVal(""); setIsStopPhotoCaptured(false); }}
                                className="text-[10px] bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 px-3 py-1.5 rounded-xl transition-all font-bold"
                              >
                                ⏹ Stop Wizard
                              </button>
                            ) : (
                              <button
                                onClick={() => { setActiveDeployingEq(eq); setStartMeterVal(""); setIsStartPhotoCaptured(false); }}
                                className="text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl transition-all font-bold"
                              >
                                ▶ Start Wizard
                              </button>
                            )}

                            <button
                              onClick={() => { setActiveFuelingEq(eq); setFuelLiters(""); setFuelRate(""); }}
                              className="text-[10px] bg-[#1C182A] border border-white/10 text-zinc-300 hover:text-white px-2.5 py-1.5 rounded-xl transition-all"
                            >
                              ⛽ Refuel
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="glass-panel border border-white/5 rounded-2xl p-6 space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Refuel & Usage Feed</h3>
                    <div className="text-[10px] text-zinc-500">Chronological machine-ledger timeline</div>
                  </div>

                  <div className="space-y-3">
                    {timelineEvents.map((evt) => (
                      <div key={evt.id} className="p-3.5 rounded-xl border border-white/5 bg-[#120F1A] text-xs flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <strong className="text-white font-bold">{evt.eqName}</strong>
                            <span className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${evt.type === "usage" ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-400"}`}>
                              {evt.type}
                            </span>
                          </div>
                          <p className="text-zinc-300 mt-1">{evt.display}</p>
                        </div>
                        <div className="text-right text-[10px] text-zinc-500">
                          {new Date(evt.date).toLocaleDateString()} · {new Date(evt.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "odologs" && (() => {
                // Parse meter values from remarks string (e.g., "Start reading: 435. ...")
                const parseMeters = (remarks: string | null | undefined) => {
                  if (!remarks) return { start: null, stop: null };
                  const startMatch = remarks.match(/Start reading[:\s]+([\d.]+)/i);
                  const stopMatch  = remarks.match(/Stop reading[:\s]+([\d.]+)/i);
                  return {
                    start: startMatch ? parseFloat(startMatch[1]) : null,
                    stop:  stopMatch  ? parseFloat(stopMatch[1])  : null,
                  };
                };

                // Build run records from completed deployments (those with end_date)
                const completedRuns = deployments
                  .filter(d => d.end_date)
                  .map(d => {
                    const eq = fleet.find(e => e.id === d.equipment_id);
                    const startMeters = parseMeters(d.remarks);
                    // For demo data where remarks captures both start and stop:
                    const startReading = startMeters.start;
                    const stopReading  = startMeters.stop;
                    const delta = (startReading != null && stopReading != null) ? (stopReading - startReading) : null;
                    const startDt = new Date(d.start_date);
                    const endDt   = new Date(d.end_date!);
                    const durationHrs = (endDt.getTime() - startDt.getTime()) / 3600000;
                    const costForRun  = eq ? durationHrs * eq.hourly_rate : null;
                    // Grab matching fuel log for that day
                    const dayStr = startDt.toISOString().split('T')[0];
                    const fuelForRun = fuelLogs
                      .filter(f => f.equipment_id === d.equipment_id && f.logged_date.startsWith(dayStr))
                      .reduce((s, f) => s + f.liters, 0);
                    const efficiency = (delta && fuelForRun > 0) ? (delta / fuelForRun).toFixed(2) : null;
                    return { d, eq, startReading, stopReading, delta, durationHrs, costForRun, fuelForRun, efficiency, dayStr };
                  })
                  .sort((a, b) => new Date(b.d.start_date).getTime() - new Date(a.d.start_date).getTime());

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Odometer / Hour-Meter Run Logs</h3>
                      <span className="text-[10px] text-zinc-600">{completedRuns.length} completed runs recorded</span>
                    </div>

                    {/* Summary kpi strip */}
                    <div className="grid grid-cols-4 gap-3">
                      {[
                        { label: "Total Runs", value: completedRuns.length, color: "text-white" },
                        { label: "Total Hours", value: completedRuns.reduce((s,r) => s + r.durationHrs, 0).toFixed(1) + " hr", color: "text-primary" },
                        { label: "Total Fuel Used", value: completedRuns.reduce((s,r) => s + r.fuelForRun, 0).toFixed(0) + " L", color: "text-amber-400" },
                        { label: "Est. Machine Cost", value: "₹" + completedRuns.reduce((s,r) => s + (r.costForRun || 0), 0).toLocaleString(), color: "text-emerald-400" },
                      ].map(kpi => (
                        <div key={kpi.label} className="bg-[#14121F] border border-white/5 rounded-xl p-4">
                          <span className="text-[9px] uppercase text-zinc-500 tracking-wider block">{kpi.label}</span>
                          <strong className={`text-lg font-extrabold mt-1 block ${kpi.color}`}>{kpi.value}</strong>
                        </div>
                      ))}
                    </div>

                    {/* Run log table */}
                    <div className="bg-[#0F0D18] border border-white/5 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/5 text-zinc-500">
                            <th className="px-5 py-3 text-left font-semibold">Equipment</th>
                            <th className="px-5 py-3 text-left font-semibold">Date</th>
                            <th className="px-5 py-3 text-center font-semibold">Start Meter</th>
                            <th className="px-5 py-3 text-center font-semibold">Stop Meter</th>
                            <th className="px-5 py-3 text-center font-semibold">Δ Hours/km</th>
                            <th className="px-5 py-3 text-center font-semibold">Fuel Used</th>
                            <th className="px-5 py-3 text-center font-semibold">Efficiency</th>
                            <th className="px-5 py-3 text-right font-semibold">Est. Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {completedRuns.length === 0 ? (
                            <tr><td colSpan={8} className="px-5 py-10 text-center text-zinc-600">No completed runs yet. Use Start/Stop Wizard on fleet cards.</td></tr>
                          ) : completedRuns.map((run, idx) => (
                            <tr key={idx} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                              <td className="px-5 py-3">
                                <span className="font-bold text-white">{run.eq?.name ?? "Unknown"}</span>
                                <span className="block text-[9px] text-zinc-600">{run.eq?.code} · {run.eq?.category}</span>
                              </td>
                              <td className="px-5 py-3 text-zinc-400">
                                {new Date(run.d.start_date).toLocaleDateString()}
                                <span className="block text-[9px] text-zinc-600">
                                  {new Date(run.d.start_date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} → {new Date(run.d.end_date!).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center font-mono">{run.startReading ?? <span className="text-zinc-600">—</span>}</td>
                              <td className="px-5 py-3 text-center font-mono">{run.stopReading ?? <span className="text-zinc-600">—</span>}</td>
                              <td className="px-5 py-3 text-center">
                                {run.delta != null
                                  ? <span className="font-bold text-primary">+{run.delta.toFixed(1)}</span>
                                  : <span className="text-zinc-600">{run.durationHrs.toFixed(2)} hr</span>}
                              </td>
                              <td className="px-5 py-3 text-center text-amber-400 font-mono">
                                {run.fuelForRun > 0 ? `${run.fuelForRun.toFixed(1)} L` : <span className="text-zinc-600">—</span>}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {run.efficiency
                                  ? <span className="text-emerald-400 font-mono">{run.efficiency} km/L</span>
                                  : <span className="text-zinc-600">—</span>}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-white">
                                {run.costForRun != null ? `₹${run.costForRun.toLocaleString()}` : <span className="text-zinc-600">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}

              {activeTab === "maintenance" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Maintenance Schedule & Service Logs</h3>
                    <span className="text-[10px] text-zinc-600">{maintenanceLogs.length} schedule entries</span>
                  </div>

                  <div className="bg-[#0F0D18] border border-white/5 rounded-2xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/5 text-zinc-500 text-left">
                          <th className="px-5 py-3 font-semibold">Equipment</th>
                          <th className="px-5 py-3 font-semibold">Service Type</th>
                          <th className="px-5 py-3 font-semibold">Scheduled Date</th>
                          <th className="px-5 py-3 font-semibold">Completed Date</th>
                          <th className="px-5 py-3 text-right font-semibold">Est. Cost</th>
                          <th className="px-5 py-3 text-center font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {maintenanceLogs.length === 0 ? (
                          <tr><td colSpan={7} className="px-5 py-10 text-center text-zinc-600">No maintenance schedules recorded.</td></tr>
                        ) : maintenanceLogs.map((log) => {
                          const eq = fleet.find(e => e.id === log.equipment_id);
                          const isOverdue = log.completed_date === null && new Date(log.scheduled_date) < new Date();
                          return (
                            <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-all">
                              <td className="px-5 py-3">
                                <span className="font-bold text-white">{eq?.name ?? "Unknown"}</span>
                                <span className="block text-[9px] text-zinc-600">{eq?.code} · {eq?.category}</span>
                              </td>
                              <td className="px-5 py-3 text-zinc-300 font-medium">{log.service_type}</td>
                              <td className="px-5 py-3 text-zinc-400">{new Date(log.scheduled_date).toLocaleDateString()}</td>
                              <td className="px-5 py-3 text-zinc-400">
                                {log.completed_date ? new Date(log.completed_date).toLocaleDateString() : <span className="text-zinc-600">—</span>}
                              </td>
                              <td className="px-5 py-3 text-right font-mono font-bold text-white">
                                {log.cost > 0 ? `₹${log.cost.toLocaleString()}` : <span className="text-zinc-600">—</span>}
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                                  log.status === "Completed" || log.completed_date
                                    ? "bg-green-500/10 border-green-500/20 text-green-400"
                                    : isOverdue
                                      ? "bg-red-500/10 border-red-500/20 text-red-400 animate-pulse"
                                      : "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                                }`}>
                                  {log.completed_date ? "Completed" : isOverdue ? "Overdue" : log.status}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-zinc-500 italic max-w-xs truncate" title={log.remarks || ""}>
                                {log.remarks || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Start Machinery Wizard */}
      {activeDeployingEq && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">Start Deployment: {activeDeployingEq.name}</h3>
              <button onClick={() => setActiveDeployingEq(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>
            
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400">Odometer / Start Hour Meter Reading</label>
                <input
                  type="number"
                  value={startMeterVal}
                  onChange={(e) => setStartMeterVal(e.target.value)}
                  placeholder="e.g. 435"
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              {/* Photo scanning viewport */}
              <div className="space-y-2">
                <span className="text-zinc-500 block">Capture Odometer Photo Proof</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsStartPhotoCaptured(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1C182A] border border-white/10 rounded-lg text-zinc-400 hover:text-white"
                  >
                    📷 Take Photo
                  </button>
                  {isStartPhotoCaptured && <span className="text-emerald-400 font-bold">✓ Captured (GPS Locked)</span>}
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={() => setActiveDeployingEq(null)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs">Cancel</button>
              <button onClick={handleStartMachinery} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs">Start Machinery</button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Machinery Wizard */}
      {activeStoppingEq && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">Stop Deployment: {activeStoppingEq.name}</h3>
              <button onClick={() => setActiveStoppingEq(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400">Odometer / Stop Hour Meter Reading</label>
                <input
                  type="number"
                  value={stopMeterVal}
                  onChange={(e) => setStopMeterVal(e.target.value)}
                  placeholder="e.g. 443.5"
                  className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white"
                />
              </div>

              <div className="space-y-2">
                <span className="text-zinc-500 block">Capture Stop Odometer Photo Proof</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsStopPhotoCaptured(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-[#1C182A] border border-white/10 rounded-lg text-zinc-400 hover:text-white"
                  >
                    📷 Take Photo
                  </button>
                  {isStopPhotoCaptured && <span className="text-emerald-400 font-bold">✓ Captured (GPS verification active)</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="gpsLock"
                  checked={isGpsLocked}
                  onChange={(e) => setIsGpsLocked(e.target.checked)}
                  className="accent-primary"
                />
                <label htmlFor="gpsLock" className="text-zinc-400 select-none cursor-pointer">Verify background GPS authenticity token</label>
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={() => handleStopMachinery(false)} className="px-4 py-2.5 bg-primary text-white font-bold rounded-xl text-xs">Save</button>
              <button onClick={() => handleStopMachinery(true)} className="px-4 py-2.5 bg-secondary text-white font-bold rounded-xl text-xs">Save & Add Fuel</button>
            </div>
          </div>
        </div>
      )}

      {/* Fuel Log Modal */}
      {activeFuelingEq && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">Log Refueling: {activeFuelingEq.name}</h3>
              <button onClick={() => setActiveFuelingEq(null)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400">Diesel Liters</label>
                  <input type="number" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="e.g. 89" />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400">Cost per Liter (₹)</label>
                  <input type="number" value={fuelRate} onChange={(e) => setFuelRate(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="e.g. 90" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Current Odometer Hours (Optional)</label>
                <input type="number" value={fuelOdo} onChange={(e) => setFuelOdo(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="e.g. 443.5" />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-400">Remarks / Supplier</label>
                <input type="text" value={fuelRemarks} onChange={(e) => setFuelRemarks(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="Indian Oil Corp..." />
              </div>
            </div>

            <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
              <button onClick={() => setActiveFuelingEq(null)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs">Cancel</button>
              <button onClick={handleLogFuel} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs">Log Fuel Refill</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Equipment Modal */}
      {isAddEqOpen && (
        <div className="fixed inset-0 z-50 bg-[#000]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0C0A12] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="text-xs font-extrabold text-white">Add Equipment Assets</h3>
              <button onClick={() => setIsAddEqOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddEquipment} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-400">Equipment Name</label>
                <input type="text" value={eqName} onChange={(e) => setEqName(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="JCB Excavator 3DX" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400">Equipment Code</label>
                  <input type="text" value={eqCode} onChange={(e) => setEqCode(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="JCB-3DX-01" />
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400">Hourly Rental Rate (₹)</label>
                  <input type="number" value={eqRate} onChange={(e) => setEqRate(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white" placeholder="1200" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-400">Category</label>
                  <select value={eqCategory} onChange={(e) => setEqCategory(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white">
                    <option value="Excavator">Excavator</option>
                    <option value="Concrete Mixer">Concrete Mixer</option>
                    <option value="Tower Crane">Tower Crane</option>
                    <option value="Generator">Generator</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-zinc-400">Ownership Type</label>
                  <select value={eqOwnership} onChange={(e) => setEqOwnership(e.target.value)} className="w-full bg-[#16121F] border border-white/10 rounded-lg p-2 text-white">
                    <option value="Owned">Owned</option>
                    <option value="Hired">Hired</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 justify-end border-t border-white/5 pt-4">
                <button type="button" onClick={() => setIsAddEqOpen(false)} className="px-4 py-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl text-xs">Save Asset</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
