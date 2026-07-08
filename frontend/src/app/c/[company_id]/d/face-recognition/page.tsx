"use client";
import { getApiHost } from "@/lib/api";
import React, { useState, useEffect } from "react";
import { useProject } from "@/context/ProjectContext";
import { useParams } from "next/navigation";

interface FaceLog {
  id: string;
  employee_id: string;
  punch_type: string;
  face_verified: boolean;
  confidence_score?: number;
  image_url?: string;
  lat?: number;
  lng?: number;
  is_within_geofence: boolean;
  created_at: string;
}

interface DailySummary {
  attendance_date: string;
  employee_id: string;
  employee_name: string;
  punch_in?: string;
  punch_out?: string;
  confidence_in?: number;
  confidence_out?: number;
  is_within_geofence_in: boolean;
  is_within_geofence_out: boolean;
}

export default function FaceRecognitionPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const { activeProjectId } = useProject();
  const projectId = activeProjectId;

  const [logs, setLogs] = useState<FaceLog[]>([]);
  const [summary, setSummary] = useState<DailySummary[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [view, setView] = useState<"logs" | "summary">("logs");

  const fetchLogs = async () => {
    try {
      const url = projectId
        ? `${getApiHost()}/apis/v3/face/logs/${companyId}?project_id=${projectId}`
        : `${getApiHost()}/apis/v3/face/logs/${companyId}`;
      const res = await fetch(url);
      if (res.ok) setLogs(await res.json());
    } catch (e) {
      console.error("Failed to load face logs", e);
    }
  };

  const fetchSummary = async () => {
    try {
      const url = `${getApiHost()}/apis/v3/face/summary/${companyId}?date=${selectedDate}${projectId ? `&project_id=${projectId}` : ""}`;
      const res = await fetch(url);
      if (res.ok) setSummary(await res.json());
    } catch (e) {
      console.error("Failed to load summary", e);
    }
  };

  useEffect(() => {
    const id = setTimeout(() => {
      fetchLogs();
    }, 0);
    return () => clearTimeout(id);
  }, [companyId, projectId]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (view === "summary") fetchSummary();
    }, 0);
    return () => clearTimeout(id);
  }, [view, selectedDate]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Face Recognition Attendance</h1>
            <p className="text-muted mt-1">Face verification audit trail for attendance punches</p>
          </div>
          <div className="flex gap-3">
            <div className="flex bg-white/5 rounded-md p-1">
              <button onClick={() => setView("logs")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "logs" ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}>Audit Logs</button>
              <button onClick={() => setView("summary")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${view === "summary" ? "bg-primary text-white" : "text-muted hover:text-foreground"}`}>Daily Summary</button>
            </div>
            <button onClick={fetchLogs} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-md text-sm font-semibold transition-all">
              Refresh
            </button>
          </div>
        </div>

        {view === "logs" && (
          <div className="bg-white/5 border border-border-custom rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-muted">
                <tr>
                  <th className="px-6 py-4 font-medium">Time</th>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Verified</th>
                  <th className="px-6 py-4 font-medium">Confidence</th>
                  <th className="px-6 py-4 font-medium">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {logs.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted">No face recognition logs found</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-6 py-4">{log.employee_id.slice(0, 8)}...</td>
                      <td className="px-6 py-4 capitalize">{log.punch_type}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${log.face_verified ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
                          {log.face_verified ? "Verified" : "Failed"}
                        </span>
                      </td>
                      <td className="px-6 py-4">{log.confidence_score ? `${Number(log.confidence_score).toFixed(1)}%` : "-"}</td>
                      <td className="px-6 py-4">
                        {log.is_within_geofence ? (
                          <span className="text-emerald-400">Within Geofence</span>
                        ) : (
                          <span className="text-red-400">Off-site</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === "summary" && (
          <div className="bg-white/5 border border-border-custom rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border-custom flex items-center gap-3">
              <label className="text-xs font-medium text-muted">Date</label>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="bg-white/5 border border-border-custom rounded-md px-4 py-2 text-white text-sm" />
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 text-muted">
                <tr>
                  <th className="px-6 py-4 font-medium">Employee</th>
                  <th className="px-6 py-4 font-medium">Punch In</th>
                  <th className="px-6 py-4 font-medium">Punch Out</th>
                  <th className="px-6 py-4 font-medium">Confidence In</th>
                  <th className="px-6 py-4 font-medium">Confidence Out</th>
                  <th className="px-6 py-4 font-medium">Geofence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {summary.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-muted">No attendance records for this date</td></tr>
                ) : (
                  summary.map((s) => (
                    <tr key={s.employee_id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 font-medium">{s.employee_name}</td>
                      <td className="px-6 py-4">{s.punch_in || "-"}</td>
                      <td className="px-6 py-4">{s.punch_out || "-"}</td>
                      <td className="px-6 py-4">{s.confidence_in ? `${s.confidence_in.toFixed(1)}%` : "-"}</td>
                      <td className="px-6 py-4">{s.confidence_out ? `${s.confidence_out.toFixed(1)}%` : "-"}</td>
                      <td className="px-6 py-4">
                        {s.punch_in && !s.punch_out ? (
                          <span className="text-amber-400">In Progress</span>
                        ) : s.punch_out ? (
                          <span className="text-emerald-400">Complete</span>
                        ) : (
                          <span className="text-red-400">Missing</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
