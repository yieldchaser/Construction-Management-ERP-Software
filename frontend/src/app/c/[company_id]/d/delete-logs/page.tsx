"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

type DeleteLog = {
  id: string;
  company_id: string | null;
  entity_type: string;
  entity_id: string;
  entity_summary: string;
  party_name: string | null;
  deleted_by: string | null;
  deleted_at: string | null;
};

const ENTITY_TYPES = [
  "project",
  "task",
  "lead",
  "workorder",
  "material",
  "payment",
  "timesheet",
  "party",
];

export default function DeleteLogsPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";
  const apiHost = getApiHost();

  const [logs, setLogs] = useState<DeleteLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState("");
  const [party, setParty] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [toast, setToast] = useState("");

  const authHeaders = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (entityType) qs.set("entity_type", entityType);
      if (party) qs.set("party", party);
      if (fromDate) qs.set("from_date", fromDate);
      if (toDate) qs.set("to_date", toDate);
      const query = qs.toString();
      const res = await fetch(
        `${apiHost}/apis/v3/${companyId}${query ? `?${query}` : ""}`,
        { headers: authHeaders }
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data) ? data : []);
      } else {
        setLogs([]);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [apiHost, companyId, entityType, party, fromDate, toDate, authHeaders]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handlePurge = async (log: DeleteLog) => {
    if (!confirm(`Permanently purge this delete log for "${log.entity_summary}"?`)) return;
    try {
      const res = await fetch(`${apiHost}/apis/v3/${companyId}/${log.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (res.ok) {
        setToast("Delete log purged successfully.");
        setLogs((prev) => prev.filter((l) => l.id !== log.id));
      } else {
        setToast("Failed to purge delete log.");
      }
    } catch {
      setToast("Failed to purge delete log.");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Delete Logs</h1>
          <p className="text-sm text-muted mt-1">
            Company-level audit trail of deleted records.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-5 bg-card border border-border-custom rounded-lg p-4">
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="border border-border-custom rounded-md px-3 py-2 text-sm bg-background text-foreground"
          >
            <option value="">All</option>
            {ENTITY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1">Party</label>
          <input
            type="text"
            value={party}
            onChange={(e) => setParty(e.target.value)}
            placeholder="Search party..."
            className="border border-border-custom rounded-md px-3 py-2 text-sm bg-background text-foreground"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1">From Date</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="border border-border-custom rounded-md px-3 py-2 text-sm bg-background text-foreground"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1">To Date</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="border border-border-custom rounded-md px-3 py-2 text-sm bg-background text-foreground"
          />
        </div>
        <button
          onClick={fetchLogs}
          className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium hover:opacity-90"
        >
          Apply Filters
        </button>
      </div>

      {/* Table */}
      <div className="border border-border-custom rounded-lg overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Entity Type</th>
              <th className="text-left px-4 py-3 font-medium">Summary</th>
              <th className="text-left px-4 py-3 font-medium">Party</th>
              <th className="text-left px-4 py-3 font-medium">Deleted By</th>
              <th className="text-right px-4 py-3 font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Loading...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  No delete logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="border-t border-border-custom hover:bg-elevated">
                  <td className="px-4 py-3 text-muted">
                    {log.deleted_at ? new Date(log.deleted_at).toLocaleString() : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium capitalize">
                      {log.entity_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-foreground">{log.entity_summary}</td>
                  <td className="px-4 py-3 text-muted">{log.party_name || "-"}</td>
                  <td className="px-4 py-3 text-muted">{log.deleted_by || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handlePurge(log)}
                      className="px-3 py-1.5 rounded-md border border-red-500/30 text-red-500 text-xs font-medium hover:bg-red-500/10"
                    >
                      Purge
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-foreground text-background px-4 py-2 rounded-md text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
