"use client";
import { getApiHost } from "@/lib/api";
import React, { useState, useEffect } from "react";
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

export default function FaceRecognitionPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;

  const [logs, setLogs] = useState<FaceLog[]>([]);

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

  useEffect(() => {
    const id = setTimeout(() => fetchLogs(), 0);
    return () => clearTimeout(id);
  }, [companyId, projectId]);

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Face Recognition Attendance</h1>
            <p className="text-zinc-400 mt-1">Face verification audit trail for attendance punches</p>
          </div>
          <button onClick={fetchLogs} className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold transition-all">
            Refresh
          </button>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-zinc-400">
              <tr>
                <th className="px-6 py-4 font-medium">Time</th>
                <th className="px-6 py-4 font-medium">Employee</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Verified</th>
                <th className="px-6 py-4 font-medium">Confidence</th>
                <th className="px-6 py-4 font-medium">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {logs.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No face recognition logs found</td></tr>
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
      </div>
    </div>
  );
}
