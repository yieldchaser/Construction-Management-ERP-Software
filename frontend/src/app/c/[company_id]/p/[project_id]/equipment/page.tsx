"use client";

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

  const [activeTab, setActiveTab] = useState<"fleet" | "deployments" | "fuel" | "maintenance">("fleet");
  
  // Data states
  const [fleet, setFleet] = useState<Equipment[]>([]);
  const [deployments, setDeployments] = useState<EquipmentDeployment[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal open states
  const [isAddEqOpen, setIsAddEqOpen] = useState(false);
  const [isDeployOpen, setIsDeployOpen] = useState(false);
  const [isLogFuelOpen, setIsLogFuelOpen] = useState(false);
  const [isScheduleMaintOpen, setIsScheduleMaintOpen] = useState(false);

  // Form states
  const [eqName, setEqName] = useState("");
  const [eqCode, setEqCode] = useState("");
  const [eqCategory, setEqCategory] = useState("Excavator");
  const [eqOwnership, setEqOwnership] = useState("Owned");
  const [eqRate, setEqRate] = useState("0");

  const [selectedEqId, setSelectedEqId] = useState("");
  const [deployDate, setDeployDate] = useState("");
  const [deployRemarks, setDeployRemarks] = useState("");

  const [fuelDate, setFuelDate] = useState("");
  const [fuelLiters, setFuelLiters] = useState("");
  const [fuelRate, setFuelRate] = useState("");
  const [fuelOdo, setFuelOdo] = useState("");
  const [fuelRemarks, setFuelRemarks] = useState("");

  const [maintType, setMaintType] = useState("");
  const [maintDate, setMaintDate] = useState("");
  const [maintCost, setMaintCost] = useState("0");
  const [maintStatus, setMaintStatus] = useState("scheduled");
  const [maintRemarks, setMaintRemarks] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load everything
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");
      
      // Fleet
      const fleetRes = await fetch(`http://localhost:8000/apis/v3/equipment/${companyId}`);
      if (fleetRes.ok) {
        const fleetData = await fleetRes.json();
        setFleet(fleetData);
      }

      // Deployments
      const depRes = await fetch(`http://localhost:8000/apis/v3/equipment/deployments/${projectId}`);
      if (depRes.ok) {
        setDeployments(await depRes.json());
      }

      // Fuel Logs
      const fuelRes = await fetch(`http://localhost:8000/apis/v3/equipment/fuel-logs/${projectId}`);
      if (fuelRes.ok) {
        setFuelLogs(await fuelRes.json());
      }

    } catch (err) {
      console.error("Error loading equipment data:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadMaintForSelected = async (eqId: string) => {
    if (!eqId) return;
    try {
      const res = await fetch(`http://localhost:8000/apis/v3/equipment/maintenance-schedules/${eqId}`);
      if (res.ok) {
        setMaintenanceLogs(await res.json());
      }
    } catch (err) {
      console.error("Error loading maintenance:", err);
    }
  };

  useEffect(() => {
    if (companyId && projectId) {
      loadData();
    }
  }, [companyId, projectId]);

  // Handle add equipment
  const handleAddEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqName.trim() || !eqCode.trim()) {
      setError("Name and Code are required");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch("http://localhost:8000/apis/v3/equipment", {
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
        const added = await res.json();
        setFleet([added, ...fleet]);
        setIsAddEqOpen(false);
        setEqName("");
        setEqCode("");
        setEqRate("0");
      } else {
        const errText = await res.text();
        setError(`Failed: ${errText}`);
      }
    } catch (err) {
      setError("Backend connection error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle deploy
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId || !deployDate) {
      setError("Please select equipment and date");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`http://localhost:8000/apis/v3/equipment/${selectedEqId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          start_date: deployDate,
          remarks: deployRemarks || null,
        }),
      });
      if (res.ok) {
        const newDep = await res.json();
        setDeployments([newDep, ...deployments]);
        
        // Update local fleet status
        setFleet(fleet.map(eq => eq.id === selectedEqId ? { ...eq, status: "deployed" } : eq));
        
        setIsDeployOpen(false);
        setSelectedEqId("");
        setDeployDate("");
        setDeployRemarks("");
      } else {
        setError("Deployment failed");
      }
    } catch (err) {
      setError("Backend error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle fuel log
  const handleLogFuel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId || !fuelDate || !fuelLiters || !fuelRate) {
      setError("Please fill all required fuel fields");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`http://localhost:8000/apis/v3/equipment/${selectedEqId}/fuel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: projectId,
          logged_date: fuelDate,
          liters: parseFloat(fuelLiters),
          cost_per_liter: parseFloat(fuelRate),
          odometer_hours: fuelOdo ? parseFloat(fuelOdo) : null,
          remarks: fuelRemarks || null,
        }),
      });
      if (res.ok) {
        const log = await res.json();
        setFuelLogs([log, ...fuelLogs]);
        setIsLogFuelOpen(false);
        setSelectedEqId("");
        setFuelDate("");
        setFuelLiters("");
        setFuelRate("");
        setFuelOdo("");
        setFuelRemarks("");
      } else {
        setError("Fuel logging failed");
      }
    } catch (err) {
      setError("Backend error");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle maintenance log
  const handleScheduleMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEqId || !maintType || !maintDate) {
      setError("Please fill all required maintenance fields");
      return;
    }
    try {
      setSubmitting(true);
      setError("");
      const res = await fetch(`http://localhost:8000/apis/v3/equipment/${selectedEqId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_type: maintType,
          scheduled_date: maintDate,
          cost: parseFloat(maintCost) || 0.0,
          status: maintStatus,
          remarks: maintRemarks || null,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setMaintenanceLogs([added, ...maintenanceLogs]);
        
        // Update local fleet status
        const targetStatus = maintStatus === "completed" ? "available" : "maintenance";
        setFleet(fleet.map(eq => eq.id === selectedEqId ? { ...eq, status: targetStatus } : eq));

        setIsScheduleMaintOpen(false);
        setSelectedEqId("");
        setMaintType("");
        setMaintDate("");
        setMaintCost("0");
        setMaintRemarks("");
      } else {
        setError("Maintenance log failed");
      }
    } catch (err) {
      setError("Backend error");
    } finally {
      setSubmitting(false);
    }
  };

  // Get equipment name by id
  const getEquipmentName = (id: string) => {
    const eq = fleet.find(e => e.id === id);
    return eq ? `${eq.name} (${eq.code})` : "Unknown Equipment";
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
            Asset Management
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary border-l-2 border-primary">
            <span>🚜</span> Equipment Tracking
          </div>
        </nav>
      </aside>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/5 bg-[#0D0B14] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-bold text-white">Equipment &amp; Machinery</h1>
            <p className="text-[10px] text-zinc-500">
              Track project deployments, fuel logs, and routine maintenance checkups for the fleet.
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddEqOpen(true)}
              className="rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white transition-all"
            >
              + Add Equipment
            </button>
            <button
              onClick={() => setIsDeployOpen(true)}
              className="rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20"
            >
              🚀 Deploy Machinery
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-white/5 bg-[#0D0B14]/40 px-6 py-1.5 flex gap-4 text-xs font-semibold">
          {[
            { id: "fleet", label: "Fleet Inventory", emoji: "🚜" },
            { id: "deployments", label: "Project Deployments", emoji: "📋" },
            { id: "fuel", label: "Fuel Log", emoji: "⛽" },
            { id: "maintenance", label: "Maintenance", emoji: "🔧" }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setError("");
              }}
              className={`flex items-center gap-1.5 py-2 border-b-2 transition-all ${
                activeTab === t.id
                  ? "border-primary text-white"
                  : "border-transparent text-zinc-400 hover:text-white"
              }`}
            >
              <span>{t.emoji}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Tab Workspaces */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-zinc-500 text-xs text-center py-20">Loading workspace...</div>
          ) : (
            <>
              {/* TAB 1: FLEET INVENTORY */}
              {activeTab === "fleet" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {fleet.map((eq) => (
                    <div key={eq.id} className="glass-panel p-5 rounded-2xl border border-white/5 bg-[#14121F] flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-xs font-bold text-white line-clamp-1">{eq.name}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            eq.status === "available"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : eq.status === "deployed"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {eq.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Code: {eq.code}</div>
                        <div className="flex gap-2 mt-3 text-[10px] font-medium">
                          <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-zinc-300">
                            {eq.category}
                          </span>
                          <span className="bg-white/5 border border-white/10 px-2 py-1 rounded-lg text-zinc-300">
                            {eq.ownership_type}
                          </span>
                        </div>
                      </div>
                      
                      <div className="border-t border-white/5 pt-3.5 flex justify-between items-center text-xs">
                        <div>
                          <div className="text-[9px] uppercase font-bold text-zinc-500">Hourly Cost</div>
                          <div className="text-sm font-extrabold text-white mt-0.5">${Number(eq.hourly_rate).toFixed(2)}/hr</div>
                        </div>
                        {eq.status !== "maintenance" && (
                          <button
                            onClick={() => {
                              setSelectedEqId(eq.id);
                              setIsScheduleMaintOpen(true);
                            }}
                            className="text-[10px] text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            🔧 Service
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 2: DEPLOYMENTS */}
              {activeTab === "deployments" && (
                <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                  <div className="px-5 py-3 border-b border-white/5 bg-[#14121F]">
                    <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Active &amp; Past Deployments</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-white/5 text-zinc-500 font-semibold bg-white/[0.01]">
                          <th className="px-5 py-3">Equipment</th>
                          <th className="px-4 py-3">Deployed Date</th>
                          <th className="px-4 py-3">End Date</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-5 py-3">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {deployments.map((dep) => (
                          <tr key={dep.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                            <td className="px-5 py-3.5 font-semibold text-white">{getEquipmentName(dep.equipment_id)}</td>
                            <td className="px-4 py-3.5 text-zinc-300">{new Date(dep.start_date).toLocaleString()}</td>
                            <td className="px-4 py-3.5 text-zinc-400">
                              {dep.end_date ? new Date(dep.end_date).toLocaleString() : "—"}
                            </td>
                            <td className="px-4 py-3.5">
                              {dep.end_date ? (
                                <span className="text-zinc-500 text-[10px]">Returned</span>
                              ) : (
                                <span className="text-emerald-400 font-semibold text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-zinc-400">{dep.remarks || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: FUEL LOG */}
              {activeTab === "fuel" && (
                <div className="space-y-4">
                  {/* Totals Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-[#14121F]">
                      <div className="text-[9px] uppercase font-bold text-zinc-500">Total Fuel Spent</div>
                      <div className="text-2xl font-extrabold text-white mt-1">
                        ${fuelLogs.reduce((s, l) => s + Number(l.total_cost), 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="glass-panel p-4 rounded-xl border border-white/5 bg-[#14121F]">
                      <div className="text-[9px] uppercase font-bold text-zinc-500">Total Liters Refilled</div>
                      <div className="text-2xl font-extrabold text-primary mt-1">
                        {fuelLogs.reduce((s, l) => s + Number(l.liters), 0).toFixed(1)} L
                      </div>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => setIsLogFuelOpen(true)}
                        className="rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-5 py-3 text-xs font-bold text-white hover:opacity-90 transition-all"
                      >
                        ⛽ Log Fuel Consumption
                      </button>
                    </div>
                  </div>

                  <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="border-b border-white/5 text-zinc-500 font-semibold bg-[#14121F]">
                            <th className="px-5 py-3">Equipment</th>
                            <th className="px-4 py-3">Logged Date</th>
                            <th className="px-4 py-3 text-center">Liters</th>
                            <th className="px-4 py-3 text-center">Cost/Liter</th>
                            <th className="px-4 py-3 text-center">Total Cost</th>
                            <th className="px-4 py-3 text-center">Odometer/Hours</th>
                            <th className="px-5 py-3">Remarks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fuelLogs.map((log) => (
                            <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                              <td className="px-5 py-3.5 font-semibold text-white">{getEquipmentName(log.equipment_id)}</td>
                              <td className="px-4 py-3.5 text-zinc-300">{new Date(log.logged_date).toLocaleString()}</td>
                              <td className="px-4 py-3.5 text-center text-zinc-300 font-medium">{Number(log.liters).toFixed(1)} L</td>
                              <td className="px-4 py-3.5 text-center text-zinc-400">${Number(log.cost_per_liter).toFixed(2)}</td>
                              <td className="px-4 py-3.5 text-center text-primary font-bold">${Number(log.total_cost).toFixed(2)}</td>
                              <td className="px-4 py-3.5 text-center text-zinc-400">{log.odometer_hours ? `${log.odometer_hours} hrs` : "—"}</td>
                              <td className="px-5 py-3.5 text-zinc-400">{log.remarks || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: MAINTENANCE */}
              {activeTab === "maintenance" && (
                <div className="space-y-4">
                  {/* Select Equipment to filter maintenance log */}
                  <div className="flex items-center gap-3 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
                    <label className="text-[10px] uppercase font-bold text-zinc-500">Filter Maintenance by Asset:</label>
                    <select
                      value={selectedEqId}
                      onChange={(e) => {
                        setSelectedEqId(e.target.value);
                        loadMaintForSelected(e.target.value);
                      }}
                      className="bg-[#14121F] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                    >
                      <option value="">-- Choose Equipment --</option>
                      {fleet.map((eq) => (
                        <option key={eq.id} value={eq.id}>{eq.name} ({eq.code})</option>
                      ))}
                    </select>

                    {selectedEqId && (
                      <button
                        onClick={() => setIsScheduleMaintOpen(true)}
                        className="ml-auto rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all"
                      >
                        🔧 Log/Schedule Maintenance
                      </button>
                    )}
                  </div>

                  {selectedEqId ? (
                    <div className="glass-panel border border-white/5 rounded-2xl overflow-hidden bg-white/[0.01]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className="border-b border-white/5 text-zinc-500 font-semibold bg-[#14121F]">
                              <th className="px-5 py-3">Service Type</th>
                              <th className="px-4 py-3">Scheduled Date</th>
                              <th className="px-4 py-3">Completed Date</th>
                              <th className="px-4 py-3 text-center">Cost</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-5 py-3">Remarks</th>
                            </tr>
                          </thead>
                          <tbody>
                            {maintenanceLogs.map((maint) => (
                              <tr key={maint.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                                <td className="px-5 py-3.5 font-semibold text-white">{maint.service_type}</td>
                                <td className="px-4 py-3.5 text-zinc-300">{new Date(maint.scheduled_date).toLocaleString()}</td>
                                <td className="px-4 py-3.5 text-zinc-300">
                                  {maint.completed_date ? new Date(maint.completed_date).toLocaleString() : "—"}
                                </td>
                                <td className="px-4 py-3.5 text-center text-primary font-bold">${Number(maint.cost).toFixed(2)}</td>
                                <td className="px-4 py-3.5">
                                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                                    maint.status === "completed"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  }`}>
                                    {maint.status}
                                  </span>
                                </td>
                                <td className="px-5 py-3.5 text-zinc-400">{maint.remarks || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-12 bg-white/[0.01] rounded-2xl border border-white/5">
                      <span className="text-3xl">⚙️</span>
                      <h3 className="text-xs font-bold text-white mt-3">Select an Asset</h3>
                      <p className="text-zinc-500 text-[10px] mt-1 max-w-xs mx-auto">
                        Please choose a machinery asset from the dropdown above to display its maintenance schedule logs and routines history.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal 1: Add Equipment */}
      {isAddEqOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#12101A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Add Fleet Machinery</h3>
              <button onClick={() => setIsAddEqOpen(false)} className="text-zinc-500 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleAddEquipment} className="p-5 space-y-4">
              {error && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">{error}</div>}

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Asset Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Hitachi EX200 Excavator"
                  value={eqName}
                  onChange={(e) => setEqName(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Equipment Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EQ-EXC-01"
                    value={eqCode}
                    onChange={(e) => setEqCode(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Category</label>
                  <select
                    value={eqCategory}
                    onChange={(e) => setEqCategory(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="Excavator">Excavator</option>
                    <option value="Crane">Crane</option>
                    <option value="Concrete Mixer">Concrete Mixer</option>
                    <option value="Generator">Generator</option>
                    <option value="Loader">Loader</option>
                    <option value="Truck">Truck</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Ownership</label>
                  <select
                    value={eqOwnership}
                    onChange={(e) => setEqOwnership(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="Owned">Owned</option>
                    <option value="Hired">Hired</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Hourly Cost ($)</label>
                  <input
                    type="number"
                    value={eqRate}
                    onChange={(e) => setEqRate(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsAddEqOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] text-xs font-bold text-white hover:opacity-90 transition-all">
                  {submitting ? "Saving..." : "Add Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Deploy Machinery */}
      {isDeployOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#12101A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Deploy Machinery</h3>
              <button onClick={() => setIsDeployOpen(false)} className="text-zinc-500 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleDeploy} className="p-5 space-y-4">
              {error && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">{error}</div>}

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Available Asset</label>
                <select
                  required
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">-- Choose Asset --</option>
                  {fleet.filter(e => e.status === "available").map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Deployment Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={deployDate}
                  onChange={(e) => setDeployDate(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Deployment Remarks</label>
                <input
                  type="text"
                  placeholder="e.g. excavation of Block D foundations"
                  value={deployRemarks}
                  onChange={(e) => setDeployRemarks(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsDeployOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] text-xs font-bold text-white hover:opacity-90 transition-all">
                  {submitting ? "Deploying..." : "🚀 Confirm Deployment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Log Fuel */}
      {isLogFuelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#12101A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Log Fuel Consumption</h3>
              <button onClick={() => setIsLogFuelOpen(false)} className="text-zinc-500 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleLogFuel} className="p-5 space-y-4">
              {error && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">{error}</div>}

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Select Machinery Asset</label>
                <select
                  required
                  value={selectedEqId}
                  onChange={(e) => setSelectedEqId(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-primary transition-all"
                >
                  <option value="">-- Choose Asset --</option>
                  {fleet.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Logged Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Liters Refilled</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 50.0"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Rate per Liter ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 1.80"
                    value={fuelRate}
                    onChange={(e) => setFuelRate(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Odometer / Engine Hours (optional)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 234.5"
                    value={fuelOdo}
                    onChange={(e) => setFuelOdo(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Fuel Remarks</label>
                <input
                  type="text"
                  placeholder="regular refill, diesel tank"
                  value={fuelRemarks}
                  onChange={(e) => setFuelRemarks(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsLogFuelOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] text-xs font-bold text-white hover:opacity-90 transition-all">
                  {submitting ? "Logging..." : "⛽ Log Fuel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Maintenance Service */}
      {isScheduleMaintOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#12101A] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Log or Schedule Maintenance</h3>
              <button onClick={() => setIsScheduleMaintOpen(false)} className="text-zinc-500 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleScheduleMaint} className="p-5 space-y-4">
              {error && <div className="p-3 text-xs bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg">{error}</div>}

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Target Asset</label>
                <input
                  type="text"
                  disabled
                  value={getEquipmentName(selectedEqId)}
                  className="w-full bg-[#181622]/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Service Type</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Routine Oil Change, Brake Overhaul"
                  value={maintType}
                  onChange={(e) => setMaintType(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Scheduled Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={maintDate}
                    onChange={(e) => setMaintDate(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Status</label>
                  <select
                    value={maintStatus}
                    onChange={(e) => setMaintStatus(e.target.value)}
                    className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Estimated/Actual Cost ($)</label>
                <input
                  type="number"
                  value={maintCost}
                  onChange={(e) => setMaintCost(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">Remarks</label>
                <input
                  type="text"
                  placeholder="hydraulic fluid level low, require engine oil 5W-40"
                  value={maintRemarks}
                  onChange={(e) => setMaintRemarks(e.target.value)}
                  className="w-full bg-[#181622] border border-white/5 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setIsScheduleMaintOpen(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:bg-white/5 transition-all">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] text-xs font-bold text-white hover:opacity-90 transition-all">
                  {submitting ? "Saving..." : "🔧 Save Maintenance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
