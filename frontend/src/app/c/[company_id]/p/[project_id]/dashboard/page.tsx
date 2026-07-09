"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders, fmtINR } from "@/lib/siteflow";

// ─── Types ────────────────────────────────────────────────────────────────────
type ProjectDash = {
  id: string;
  company_id: string;
  name: string;
  code?: string | null;
  status: string;
  stage?: string | null;
  category?: string | null;
  project_value: number;
  progress: number;
  cash_in: number;
  cash_out: number;
  todo_pending: number;
  planned_start_date?: string | null;
  planned_end_date?: string | null;
  actual_start_date?: string | null;
  actual_end_date?: string | null;
};

type BOQDoc = {
  id: string;
  title: string;
  boq_value: number;
  physical_progress: number; // 0-100
};

type Bill = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  invoice_type: string;
  status: string;
  total_payable: number;
  paid_amount: number;
  items_json?: string | null;
};

type CostCode = {
  id: string;
  code: string;
  name: string;
  sub_cost_code?: string | null;
  budget_amount: number;
};

type DrillCol = { key: string; label: string };
type DrillData = {
  title: string;
  subtitle?: string;
  cols: DrillCol[];
  rows: Record<string, unknown>[];
  footer?: string;
  action?: { label: string; onClick: () => void };
};

// ─── Small components ───────────────────────────────────────────────────────────
function Card({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" | "violet" }) {
  const color =
    tone === "emerald" ? "text-emerald-500" : tone === "rose" ? "text-rose-500" : tone === "violet" ? "text-violet-500" : "text-foreground";
  return (
    <div className="rounded-lg border border-border-custom bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-2 text-3xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "emerald" | "rose" | "violet";
  onClick: () => void;
}) {
  const color =
    tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : tone === "violet" ? "text-violet-400" : "text-foreground";
  return (
    <button
      onClick={onClick}
      className="group text-left rounded-lg border border-border-custom bg-card p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
        <span className="text-[10px] text-muted group-hover:text-primary">details ›</span>
      </div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted">{sub}</div>}
    </button>
  );
}

function DrillModal({
  data,
  onClose,
  action,
}: {
  data: DrillData;
  onClose: () => void;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[82vh] overflow-auto rounded-lg border border-border-custom bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-semibold text-white">{data.title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground text-lg">
            ✕
          </button>
        </div>
        {data.subtitle && <div className="text-[11px] text-muted mb-4">{data.subtitle}</div>}
        {data.rows.length === 0 ? (
          <div className="py-10 text-center text-muted text-xs">No records.</div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-border-custom text-muted uppercase tracking-wider text-[9px]">
                {data.cols.map((c) => (
                  <th key={c.key} className="py-2 px-2">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {data.rows.map((r, i) => (
                <tr key={i} className="hover:bg-white/[0.015]">
                  {data.cols.map((c) => (
                    <td key={c.key} className="py-2 px-2 text-zinc-200">
                      {String(r[c.key] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {data.footer && <div className="mt-3 text-[11px] text-muted">{data.footer}</div>}
        {action && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={action.onClick}
              className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg hover:opacity-90"
            >
              {action.label}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ProjectDashboardPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const projectId = params.project_id as string;

  const [project, setProject] = useState<ProjectDash | null>(null);
  const [docs, setDocs] = useState<BOQDoc[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drill, setDrill] = useState<DrillData | null>(null);

  // Add Cost Code modal state
  const [showAddCC, setShowAddCC] = useState(false);
  const [ccCode, setCcCode] = useState("");
  const [ccName, setCcName] = useState("");
  const [ccBudget, setCcBudget] = useState("");
  const [savingCC, setSavingCC] = useState(false);

  const loadCostCodes = useCallback(async (compId: string) => {
    try {
      const res = await fetch(getApi(`/library/cost-codes/${compId}`), { headers: authHeaders() });
      if (res.ok) setCostCodes(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, docRes, billsRes] = await Promise.all([
        fetch(getApi(`/projects/${projectId}`), { headers: authHeaders() }),
        fetch(getApi(`/budgeting/boq-documents?project_id=${projectId}`), { headers: authHeaders() }),
        fetch(getApi(`/billing/bills?project_id=${projectId}`), { headers: authHeaders() }),
      ]);
      const pData = pRes.ok ? await pRes.json() : null;
      if (pData) setProject(pData);
      if (docRes.ok) setDocs(await docRes.json());
      if (billsRes.ok) setBills(await billsRes.json());
      // cost codes are company-scoped → use the resolved company UUID, not the route slug
      await loadCostCodes(pData?.company_id || companyId);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId, companyId, loadCostCodes]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <div className="p-6 text-muted">Loading project dashboard…</div>;
  if (!project) return <div className="p-6 text-muted">Project not found.</div>;

  const margin0 = (project.cash_in || 0) - (project.cash_out || 0);

  // ── Real financial computations (per spec) ───────────────────────────────────
  const boqValue = docs.reduce((s, d) => s + (d.boq_value || 0), 0);
  const workDone = docs.reduce((s, d) => s + (d.boq_value || 0) * ((d.physical_progress || 0) / 100), 0);
  const estimatedBudget = costCodes.reduce((s, c) => s + (c.budget_amount || 0), 0);

  const sale = bills.filter((b) => b.invoice_type === "sale");
  const purchase = bills.filter((b) => b.invoice_type === "purchase");
  const subcon = bills.filter((b) => b.invoice_type === "subcon");

  const saleTotal = sale.reduce((s, b) => s + (b.total_payable || 0), 0);
  const expense = purchase
    .concat(subcon)
    .reduce((s, b) => s + (b.total_payable || 0), 0); // Total Expense (Till Date)

  const cashIn = sale.reduce((s, b) => s + (b.paid_amount || 0), 0);
  const cashOut = purchase.concat(subcon).reduce((s, b) => s + (b.paid_amount || 0), 0);
  const receivables = sale
    .filter((b) => b.status !== "Cancelled")
    .reduce((s, b) => s + ((b.total_payable || 0) - (b.paid_amount || 0)), 0);
  const payables = purchase
    .concat(subcon)
    .filter((b) => b.status !== "Cancelled")
    .reduce((s, b) => s + ((b.total_payable || 0) - (b.paid_amount || 0)), 0);
  const projectBalance = cashIn - cashOut;
  const netCash = projectBalance + receivables - payables;

  const estimatedMargin = boqValue - estimatedBudget;
  const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—");

  // Actual expense per cost code (from bill line items tagged with a cost code)
  const expByCC: Record<string, number> = {};
  for (const b of bills) {
    if (!b.items_json) continue;
    try {
      const items = JSON.parse(b.items_json);
      for (const it of items) {
        if (it && it.cost_code_name) {
          expByCC[it.cost_code_name] = (expByCC[it.cost_code_name] || 0) + (Number(it.amount) || 0);
        }
      }
    } catch {
      /* ignore malformed */
    }
  }

  // ── Add Cost Code ────────────────────────────────────────────────────────────
  const saveCostCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const budget = parseFloat(ccBudget) || 0;
    if (!ccName.trim() || !ccCode.trim()) {
      setError("Code and Name are required");
      return;
    }
    setSavingCC(true);
    setError(null);
    try {
      const res = await fetch(getApi("/library/cost-codes"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          code: ccCode.trim(),
          name: ccName.trim(),
          budget_amount: budget,
        }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setShowAddCC(false);
      setCcCode("");
      setCcName("");
      setCcBudget("");
      await loadCostCodes();
    } catch (e: any) {
      setError(e?.message || "Failed to add cost code");
    } finally {
      setSavingCC(false);
    }
  };

  const billRows = (list: Bill[]) =>
    list.map((b) => ({
      "Invoice #": b.invoice_number,
      Date: b.invoice_date ? new Date(b.invoice_date).toLocaleDateString() : "—",
      Type: b.invoice_type,
      Status: b.status,
      Total: fmtINR(b.total_payable),
      Paid: fmtINR(b.paid_amount),
      Balance: fmtINR((b.total_payable || 0) - (b.paid_amount || 0)),
    }));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
        <p className="text-sm text-muted">
          {[project.code, project.category, project.stage].filter(Boolean).join(" · ") || "—"}
        </p>
      </div>

      {/* Basic snapshot (existing) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Progress" value={`${project.progress ?? 0}%`} tone="violet" />
        <Card label="Cash In" value={fmtINR(project.cash_in)} tone="emerald" />
        <Card label="Cash Out" value={fmtINR(project.cash_out)} tone="rose" />
        <Card label="Net Margin" value={fmtINR(margin0)} tone={margin0 >= 0 ? "emerald" : "rose"} />
      </div>

      {/* Financial View — 6 spec cards */}
      <div>
        <div className="text-xs uppercase tracking-wider text-muted mb-3">Financial View</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Estimated Budget */}
          <KpiCard
            label="Estimated Budget"
            value={fmtINR(estimatedBudget)}
            sub={`across ${costCodes.length} cost code${costCodes.length === 1 ? "" : "s"}`}
            tone="violet"
            onClick={() =>
              setDrill({
                title: "Estimate Cost Code Budget",
                subtitle: `Total estimated budget ${fmtINR(estimatedBudget)} across ${costCodes.length} cost codes`,
                cols: [
                  { key: "name", label: "Cost Code Name" },
                  { key: "budget", label: "Budget Amount" },
                  { key: "actual", label: "Actual Expense" },
                ],
                rows: costCodes.map((c) => ({
                  name: c.name,
                  budget: fmtINR(c.budget_amount),
                  actual: fmtINR(expByCC[c.name] || 0),
                })),
                footer: "Actual Expense is summed from bill line items tagged to each cost code.",
                action: { label: "+ Add Cost Code", onClick: () => setShowAddCC(true) },
              })
            }
          />

          {/* 2. Total BOQ Value */}
          <KpiCard
            label="Total BOQ Value"
            value={fmtINR(boqValue)}
            sub={`Estimated Margin: ${fmtINR(estimatedMargin)}`}
            tone="emerald"
            onClick={() =>
              setDrill({
                title: "Total BOQ Value",
                subtitle: `BOQ Value ${fmtINR(boqValue)} − Estimated Budget ${fmtINR(estimatedBudget)} = Estimated Margin ${fmtINR(estimatedMargin)}`,
                cols: [
                  { key: "title", label: "BOQ Document" },
                  { key: "value", label: "BOQ Value" },
                  { key: "progress", label: "Physical %" },
                ],
                rows: docs.map((d) => ({
                  title: d.title,
                  value: fmtINR(d.boq_value),
                  progress: `${(d.physical_progress || 0).toFixed(1)}%`,
                })),
              })
            }
          />

          {/* 3. Total Sales Invoice */}
          <KpiCard
            label="Total Sales Invoice"
            value={fmtINR(saleTotal)}
            sub={`${pct(saleTotal, boqValue)} of BOQ value`}
            tone="emerald"
            onClick={() =>
              setDrill({
                title: "Total Sales Invoice",
                subtitle: `${fmtINR(saleTotal)} · ${pct(saleTotal, boqValue)} of Total BOQ Value (${fmtINR(boqValue)})`,
                cols: [
                  { key: "Invoice #", label: "Invoice #" },
                  { key: "Date", label: "Date" },
                  { key: "Status", label: "Status" },
                  { key: "Total", label: "Total" },
                  { key: "Paid", label: "Paid" },
                ],
                rows: billRows(sale),
              })
            }
          />

          {/* 4. Total Expense (Till Date) */}
          <KpiCard
            label="Total Expense (Till Date)"
            value={fmtINR(expense)}
            sub={`${pct(expense, estimatedBudget)} of Budget used`}
            tone="rose"
            onClick={() =>
              setDrill({
                title: "Total Expense (Till Date)",
                subtitle: `${fmtINR(expense)} · ${pct(expense, estimatedBudget)} of Estimated Budget (${fmtINR(estimatedBudget)})`,
                cols: [
                  { key: "Invoice #", label: "Invoice #" },
                  { key: "Date", label: "Date" },
                  { key: "Type", label: "Type" },
                  { key: "Status", label: "Status" },
                  { key: "Total", label: "Total" },
                ],
                rows: billRows(purchase.concat(subcon)),
              })
            }
          />

          {/* 5. Work done value */}
          <KpiCard
            label="Work Done Value"
            value={fmtINR(workDone)}
            sub={`${pct(workDone, boqValue)} of BOQ value`}
            tone="violet"
            onClick={() =>
              setDrill({
                title: "Work Done Value",
                subtitle: `Physical-progress-weighted BOQ value · ${pct(workDone, boqValue)} of Total BOQ Value (${fmtINR(boqValue)})`,
                cols: [
                  { key: "title", label: "BOQ Document" },
                  { key: "value", label: "BOQ Value" },
                  { key: "progress", label: "Physical %" },
                  { key: "done", label: "Work Done" },
                ],
                rows: docs.map((d) => ({
                  title: d.title,
                  value: fmtINR(d.boq_value),
                  progress: `${(d.physical_progress || 0).toFixed(1)}%`,
                  done: fmtINR((d.boq_value || 0) * ((d.physical_progress || 0) / 100)),
                })),
              })
            }
          />

          {/* 6. Net Cash Position */}
          <KpiCard
            label="Net Cash Position"
            value={fmtINR(netCash)}
            sub="Project Balance + Receivables − Payables"
            tone={netCash >= 0 ? "emerald" : "rose"}
            onClick={() =>
              setDrill({
                title: "Net Cash Position",
                subtitle: `${fmtINR(projectBalance)} (Balance) + ${fmtINR(receivables)} (Receivables) − ${fmtINR(payables)} (Payables) = ${fmtINR(netCash)}`,
                cols: [
                  { key: "k", label: "Component" },
                  { key: "v", label: "Amount" },
                ],
                rows: [
                  { k: "Project Balance (cash in − cash out)", v: fmtINR(projectBalance) },
                  { k: "Receivables (to be collected)", v: fmtINR(receivables) },
                  { k: "Payables (due to vendors)", v: fmtINR(payables) },
                  { k: "Net Cash Position", v: fmtINR(netCash) },
                ],
              })
            }
          />
        </div>
      </div>

      {/* Info + Schedule (existing) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Pending To-Dos" value={`${project.todo_pending ?? 0}`} />
        <Card label="Project Value" value={fmtINR(project.project_value)} />
        <Card label="Status" value={project.status} />
      </div>

      <div className="rounded-lg border border-border-custom bg-card p-4 text-sm">
        <div className="text-xs uppercase tracking-wider text-muted mb-3">Schedule</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-muted">Planned Start</div>
            <div className="text-foreground">
              {project.planned_start_date ? new Date(project.planned_start_date).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted">Planned End</div>
            <div className="text-foreground">
              {project.planned_end_date ? new Date(project.planned_end_date).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted">Actual Start</div>
            <div className="text-foreground">
              {project.actual_start_date ? new Date(project.actual_start_date).toLocaleDateString() : "—"}
            </div>
          </div>
          <div>
            <div className="text-muted">Actual End</div>
            <div className="text-foreground">
              {project.actual_end_date ? new Date(project.actual_end_date).toLocaleDateString() : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {drill && <DrillModal data={drill} onClose={() => setDrill(null)} action={drill.action} />}

      {/* Add Cost Code (inside Estimated Budget context) */}
      {showAddCC && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border-custom bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Add Cost Code</h3>
              <button onClick={() => setShowAddCC(false)} className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            <form onSubmit={saveCostCode} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted">Code</label>
                <input
                  value={ccCode}
                  onChange={(e) => setCcCode(e.target.value)}
                  placeholder="e.g. CC-CIV-01"
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Name</label>
                <input
                  value={ccName}
                  onChange={(e) => setCcName(e.target.value)}
                  placeholder="e.g. Civil Works"
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Budget Amount</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={ccBudget}
                  onChange={(e) => setCcBudget(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600"
                />
              </div>
              {error && <div className="text-[11px] text-rose-400">{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCC(false)}
                  className="px-4 py-2 bg-white/5 text-zinc-300 text-sm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingCC}
                  className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg disabled:opacity-40"
                >
                  {savingCC ? "Saving…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
