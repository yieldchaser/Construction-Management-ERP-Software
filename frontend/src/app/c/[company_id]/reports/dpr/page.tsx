"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import PageHeader from "@/components/PageHeader";

export default function DPRReportPage() {
  const params = useParams();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  const [selectedProject, setSelectedProject] = useState("All");
  const [selectedDateFilter, setSelectedDateFilter] = useState("This Week");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 3000);
  };

  // Mock data matching the columns of Onsite Teams
  const mockTodo = [
    { project: "Metro Terminal (Phase 2)", activity: "Slab reinforcement inspection", status: "Completed", type: "Milestone" },
    { project: "Bypass Highway Flyover", activity: "Pillar 4 casting", status: "Ongoing", type: "Task" },
    { project: "Alpha Premium Residences", activity: "Excavation and foundation work", status: "Pending", type: "Task" }
  ];

  const mockMaterialReq = [
    { project: "Metro Terminal (Phase 2)", material: "Cement 53 Grade", reqQty: "250 Bags", unsettledQty: "50 Bags", status: "Partially Fulfilled" },
    { project: "Bypass Highway Flyover", material: "TMT Rebars 12mm", reqQty: "12 Tons", unsettledQty: "0 Tons", status: "Fulfilled" },
    { project: "Alpha Premium Residences", material: "River Sand", reqQty: "40 Brass", unsettledQty: "40 Brass", status: "Requested" }
  ];

  const mockTaskReport = [
    { project: "Metro Terminal (Phase 2)", mainTask: "Superstructure", groupTask: "Columns & Beams", task: "L1 Column Shuttering", start: "2026-07-01", end: "2026-07-08", unit: "Sqm", est: "450", opening: "120", progress: "180", maxPct: "66%", closing: "300" },
    { project: "Bypass Highway Flyover", mainTask: "Substructure", groupTask: "Foundation", task: "Pile Cap Reinforcement", start: "2026-06-15", end: "2026-07-05", unit: "Tons", est: "18.5", opening: "10.2", progress: "8.3", maxPct: "100%", closing: "18.5" }
  ];

  const mockAttendance = [
    { project: "Metro Terminal (Phase 2)", party: "Sanjay Yadav", workforce: "Carpenters", workers: "8", shift: "8.0" },
    { project: "Metro Terminal (Phase 2)", party: "Ramesh Kumar", workforce: "Bar Benders", workers: "12", shift: "12.0" },
    { project: "Bypass Highway Flyover", party: "Subcon Alpha", workforce: "Masons", workers: "15", shift: "15.0" }
  ];

  const mockMaterial = [
    { project: "Metro Terminal (Phase 2)", material: "Coarse Aggregate 20mm", unit: "Cum", received: "80", used: "45" },
    { project: "Bypass Highway Flyover", material: "Ready Mix Concrete M35", unit: "Cum", received: "120", used: "120" }
  ];

  const mockEquipment = [
    { project: "Metro Terminal (Phase 2)", name: "JCB Excavator 3DX", vehicle: "MH-12-PQ-8891", unit: "Hours (6.5)" },
    { project: "Bypass Highway Flyover", name: "Transit Mixer 6m3", vehicle: "MH-14-GH-2305", unit: "Trips (8)" }
  ];

  const filteredTodo = selectedProject === "All" ? mockTodo : mockTodo.filter(t => t.project.includes(selectedProject));
  const filteredMatReq = selectedProject === "All" ? mockMaterialReq : mockMaterialReq.filter(t => t.project.includes(selectedProject));
  const filteredTaskReport = selectedProject === "All" ? mockTaskReport : mockTaskReport.filter(t => t.project.includes(selectedProject));
  const filteredAttendance = selectedProject === "All" ? mockAttendance : mockAttendance.filter(t => t.project.includes(selectedProject));
  const filteredMaterial = selectedProject === "All" ? mockMaterial : mockMaterial.filter(t => t.project.includes(selectedProject));
  const filteredEquipment = selectedProject === "All" ? mockEquipment : mockEquipment.filter(t => t.project.includes(selectedProject));

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar onShowToast={showToast} />

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <PageHeader title="Daily Progress Report (DPR)" />

        {/* Action Header bar */}
        <div className="bg-sidebar border-b border-border-custom px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            
            {/* Project Select */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Project Name:</span>
              <select
                value={selectedProject}
                onChange={e => setSelectedProject(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="All">All Projects</option>
                <option value="Metro Terminal">Metro Terminal (Phase 2)</option>
                <option value="Bypass Highway">Bypass Highway Flyover</option>
                <option value="Alpha Premium">Alpha Premium Residences</option>
              </select>
            </div>

            {/* Date Select */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Date:</span>
              <select
                value={selectedDateFilter}
                onChange={e => setSelectedDateFilter(e.target.value)}
                className="bg-card border border-border-custom rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-primary"
              >
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="This Week">This Week</option>
                <option value="Custom">Custom Range</option>
              </select>
            </div>

            {/* Date Range Picker */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] text-muted uppercase font-bold">Date Range:</span>
              <input
                type="date"
                defaultValue="2026-07-04"
                className="bg-card border border-border-custom rounded-lg px-3 py-1 text-xs text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => showToast("DPR Refreshed!")} className="p-2 bg-card hover:bg-elevated border border-border-custom rounded-lg text-xs" title="Refresh">
              🔄
            </button>
            <button onClick={() => showToast("DPR Exported successfully!")} className="px-3 py-1.5 bg-primary hover:bg-primary/95 text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
              <span>📤</span> Share / Export
            </button>
          </div>
        </div>

        {/* Content Lists */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-elevated/10">

          {/* Row 1: To Do & Material Request split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* To Do Table */}
            <div className="bg-card border border-border-custom rounded-xl p-4">
              <h3 className="text-xs font-bold text-white mb-3 flex items-center justify-between">
                <span>To Do For DPR</span>
                <span className="text-[10px] text-muted font-normal">{filteredTodo.length} items</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                      <th className="pb-2">Project Name</th>
                      <th className="pb-2">Activity Name</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTodo.map((row, i) => (
                      <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                        <td className="py-2.5 font-medium text-white">{row.project}</td>
                        <td className="py-2.5 text-muted">{row.activity}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            row.status === "Completed" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                            row.status === "Ongoing" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                            "bg-zinc-500/10 text-muted border border-zinc-500/20"
                          }`}>{row.status}</span>
                        </td>
                        <td className="py-2.5 text-muted">{row.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Material Request Table */}
            <div className="bg-card border border-border-custom rounded-xl p-4">
              <h3 className="text-xs font-bold text-white mb-3 flex items-center justify-between">
                <span>Material Request for DPR</span>
                <span className="text-[10px] text-muted font-normal">{filteredMatReq.length} items</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                      <th className="pb-2">Project Name</th>
                      <th className="pb-2">Material Name</th>
                      <th className="pb-2">Request Qty</th>
                      <th className="pb-2">Unsettled Qty</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMatReq.map((row, i) => (
                      <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                        <td className="py-2.5 font-medium text-white">{row.project}</td>
                        <td className="py-2.5 text-muted">{row.material}</td>
                        <td className="py-2.5 text-white">{row.reqQty}</td>
                        <td className="py-2.5 text-muted">{row.unsettledQty}</td>
                        <td className="py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            row.status === "Fulfilled" ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                            row.status === "Partially Fulfilled" ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" :
                            "bg-orange-500/10 text-orange-400 border border-orange-500/20"
                          }`}>{row.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* Row 2: Task Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-white mb-3">Task Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[900px]">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project Name</th>
                    <th className="pb-2">Main Task Name</th>
                    <th className="pb-2">Group Task Name</th>
                    <th className="pb-2">Task Name</th>
                    <th className="pb-2">Start Date</th>
                    <th className="pb-2">End Date</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Estimated Qty</th>
                    <th className="pb-2">Opening Qty</th>
                    <th className="pb-2">Progress Qty</th>
                    <th className="pb-2">Max % Complete</th>
                    <th className="pb-2">Closing Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTaskReport.map((row, i) => (
                    <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                      <td className="py-2.5 font-medium text-white">{row.project}</td>
                      <td className="py-2.5 text-muted">{row.mainTask}</td>
                      <td className="py-2.5 text-muted">{row.groupTask}</td>
                      <td className="py-2.5 text-white">{row.task}</td>
                      <td className="py-2.5 text-muted">{row.start}</td>
                      <td className="py-2.5 text-muted">{row.end}</td>
                      <td className="py-2.5 text-muted">{row.unit}</td>
                      <td className="py-2.5 text-white">{row.est}</td>
                      <td className="py-2.5 text-muted">{row.opening}</td>
                      <td className="py-2.5 text-success font-semibold">+{row.progress}</td>
                      <td className="py-2.5 font-bold text-white">{row.maxPct}</td>
                      <td className="py-2.5 text-white">{row.closing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 3: Attendance Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-white mb-3">Attendance Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project name</th>
                    <th className="pb-2">Party name</th>
                    <th className="pb-2">Workforce name</th>
                    <th className="pb-2">No of Workers</th>
                    <th className="pb-2">Total Shift</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendance.map((row, i) => (
                    <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                      <td className="py-2.5 font-medium text-white">{row.project}</td>
                      <td className="py-2.5 text-muted">{row.party}</td>
                      <td className="py-2.5 text-white">{row.workforce}</td>
                      <td className="py-2.5 font-semibold text-white">{row.workers}</td>
                      <td className="py-2.5 text-white">{row.shift}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 4: Material Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-white mb-3">Material Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project Name</th>
                    <th className="pb-2">Material</th>
                    <th className="pb-2">Unit</th>
                    <th className="pb-2">Received Qty</th>
                    <th className="pb-2">Used Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMaterial.map((row, i) => (
                    <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                      <td className="py-2.5 font-medium text-white">{row.project}</td>
                      <td className="py-2.5 text-white">{row.material}</td>
                      <td className="py-2.5 text-muted">{row.unit}</td>
                      <td className="py-2.5 text-success font-semibold">{row.received}</td>
                      <td className="py-2.5 text-orange-400 font-semibold">{row.used}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Row 5: Equipment Report for DPR */}
          <div className="bg-card border border-border-custom rounded-xl p-4">
            <h3 className="text-xs font-bold text-white mb-3">Equipment Report for DPR</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border-custom text-muted font-semibold text-[10px] uppercase">
                    <th className="pb-2">Project Name</th>
                    <th className="pb-2">Equipment Name</th>
                    <th className="pb-2">Vehicle No</th>
                    <th className="pb-2">Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEquipment.map((row, i) => (
                    <tr key={i} className="border-b border-border-custom/40 last:border-0 hover:bg-elevated/40">
                      <td className="py-2.5 font-medium text-white">{row.project}</td>
                      <td className="py-2.5 text-white">{row.name}</td>
                      <td className="py-2.5 text-muted">{row.vehicle}</td>
                      <td className="py-2.5 font-semibold text-white">{row.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Global Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 bg-card border border-success/30 rounded-lg px-4 py-3 text-xs text-success shadow-lg flex items-center gap-2 z-50 transition-all">
            <span>⚡</span>
            <span className="font-semibold">{toastMessage}</span>
          </div>
        )}
      </main>
    </div>
  );
}
