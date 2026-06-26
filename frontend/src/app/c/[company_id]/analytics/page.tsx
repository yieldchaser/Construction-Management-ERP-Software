"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import PwaControls from "@/components/pwa/PwaControls";

interface AnalyticsPoint {
  label: string;
  planned_pct: number;
  actual_pct: number;
}

interface BurnPoint {
  label: string;
  burn_pct: number;
  spend: number;
}

interface ProjectSummary {
  project_id: string;
  project_name: string;
  code?: string | null;
  budget: number;
  spend: number;
  variance: number;
  completion_pct: number;
  task_count: number;
  completed_tasks: number;
}

interface SubcontractorScore {
  subcontractor_id: string;
  subcontractor_name: string;
  project_names: string[];
  bill_count: number;
  on_time_rate: number;
  ncr_count: number;
  late_bills: number;
}

interface AnalyticsPayload {
  company_id: string;
  company_name: string;
  project_count: number;
  total_tasks: number;
  completed_tasks: number;
  task_completion_pct: number;
  total_budget: number;
  total_spend: number;
  budget_variance: number;
  burn_rate_pct: number;
  s_curve: AnalyticsPoint[];
  budget_burn_series: BurnPoint[];
  labour_productivity: {
    total_hours: number;
    labour_days: number;
    completed_area_m2: number;
    productivity_m2_per_labour_day: number;
  };
  material_wastage: {
    ordered_qty: number;
    consumed_qty: number;
    wastage_qty: number;
    wastage_pct: number;
  };
  projects: ProjectSummary[];
  subcontractor_scorecard: SubcontractorScore[];
}

const chartColors = {
  planned: "#7C5CFF",
  actual: "#E8184C",
  burn: "#00E5A3",
  grid: "rgba(255,255,255,0.06)",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function buildPoints(values: number[], width = 640, height = 220, padding = 24) {
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const maxValue = Math.max(...values, 1);

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : padding + (index / (values.length - 1)) * usableWidth;
      const y = height - padding - (value / maxValue) * usableHeight;
      return `${x},${y}`;
    })
    .join(" ");
}

function ChartCard({
  title,
  subtitle,
  labels,
  plannedValues,
  actualValues,
  plannedLabel,
  actualLabel,
}: {
  title: string;
  subtitle: string;
  labels: string[];
  plannedValues: number[];
  actualValues: number[];
  plannedLabel: string;
  actualLabel: string;
}) {
  const width = 760;
  const height = 260;
  const padding = 28;
  const plannedPoints = buildPoints(plannedValues, width, height, padding);
  const actualPoints = buildPoints(actualValues, width, height, padding);

  return (
    <div className="glass-panel rounded-3xl border border-white/5 p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{title}</div>
          <div className="mt-1 text-sm text-zinc-400">{subtitle}</div>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em]">
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors.planned }} />
            {plannedLabel}
          </span>
          <span className="flex items-center gap-1 text-zinc-400">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors.actual }} />
            {actualLabel}
          </span>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0B0910]">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full">
          {[0, 25, 50, 75, 100].map((tick) => {
            const y = height - padding - (tick / 100) * (height - padding * 2);
            return (
              <g key={tick}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke={chartColors.grid} strokeDasharray="4 6" />
                <text x="8" y={y + 4} fill="#6b7280" fontSize="10">
                  {tick}%
                </text>
              </g>
            );
          })}

          {labels.map((label, index) => {
            const x = labels.length === 1 ? width / 2 : padding + (index / Math.max(labels.length - 1, 1)) * (width - padding * 2);
            return (
              <text key={label} x={x} y={height - 6} fill="#6b7280" fontSize="10" textAnchor="middle">
                {label}
              </text>
            );
          })}

          <polyline
            fill="none"
            stroke={chartColors.planned}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={plannedPoints}
          />
          <polyline
            fill="none"
            stroke={chartColors.actual}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={actualPoints}
          />
        </svg>
      </div>
    </div>
  );
}

export default function CompanyAnalyticsPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!companyId) {
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/apis/v3/analytics/company/${companyId}`);
        if (!response.ok) {
          throw new Error(`Analytics request failed: ${response.status}`);
        }
        const payload = (await response.json()) as AnalyticsPayload;
        setData(payload);
      } catch (error) {
        console.error("Failed to load analytics", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchAnalytics();
  }, [companyId]);

  const planned = data?.s_curve.map((point) => point.planned_pct) ?? [];
  const actual = data?.s_curve.map((point) => point.actual_pct) ?? [];
  const burn = data?.budget_burn_series.map((point) => point.burn_pct) ?? [];
  const labels = data?.s_curve.map((point) => point.label) ?? [];
  const burnLabels = data?.budget_burn_series.map((point) => point.label) ?? [];

  return (
    <div className="flex min-h-screen bg-[#0E0C15] text-[#ededed]">
      <aside className="w-64 shrink-0 border-r border-white/5 bg-[#0B0910]">
        <div className="flex items-center gap-3 border-b border-white/5 p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white">
            S
          </div>
          <div>
            <div className="text-sm font-bold text-white">SiteFlow</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Executive Analytics</div>
          </div>
        </div>

        <nav className="space-y-1 p-4">
          <Link
            href={`/c/${companyId}/dashboard`}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:bg-white/[0.03] hover:text-white"
          >
            &larr; Dashboard
          </Link>
          <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
            Executive Analytics
          </div>
        </nav>

        <div className="px-4 pb-4">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Company Scope</div>
            <div className="mt-1 text-sm font-semibold text-white">{data?.company_name ?? "Loading company..."}</div>
            <div className="mt-2 text-xs text-zinc-500">
              {data ? `${data.project_count} projects aggregated into one command view` : "Waiting for KPI aggregation"}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="flex flex-col gap-4 border-b border-white/5 bg-[#0B0910] px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Phase 14</div>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white">Advanced Analytics Dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm text-zinc-400">
              Cross-project KPI view for burn rate, progress cadence, labour productivity, procurement leakage, and subcontractor performance.
            </p>
          </div>
          <div className="w-full max-w-md">
            <PwaControls />
          </div>
        </header>

        <div className="space-y-6 p-6">
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: "Budget Variance",
                value: data ? `Rs ${formatCurrency(data.budget_variance)}` : "—",
                hint: data ? `Spend ${formatCurrency(data.total_spend)} vs budget ${formatCurrency(data.total_budget)}` : "Loading",
                tone: "text-white",
              },
              {
                label: "Burn Rate",
                value: data ? `${data.burn_rate_pct}%` : "—",
                hint: "Company-wide budget consumption",
                tone: "text-emerald-400",
              },
              {
                label: "Labour Productivity",
                value: data ? `${data.labour_productivity.productivity_m2_per_labour_day}` : "—",
                hint: "m2 per labour-day",
                tone: "text-primary",
              },
              {
                label: "Material Wastage",
                value: data ? `${data.material_wastage.wastage_pct}%` : "—",
                hint: "Ordered vs consumed from procurement",
                tone: "text-amber-400",
              },
            ].map((card) => (
              <div key={card.label} className="glass-panel rounded-3xl border border-white/5 p-5">
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{card.label}</div>
                <div className={`mt-3 text-3xl font-black tracking-tight ${card.tone}`}>{card.value}</div>
                <div className="mt-2 text-xs text-zinc-500">{card.hint}</div>
              </div>
            ))}
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <ChartCard
              title="S-Curve"
              subtitle="Planned vs actual physical progress from scheduled task completion"
              labels={labels}
              plannedValues={planned}
              actualValues={actual}
              plannedLabel="Planned"
              actualLabel="Actual"
            />

            <div className="glass-panel rounded-3xl border border-white/5 p-5">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Budget Burn</div>
                  <div className="mt-1 text-sm text-zinc-400">Cumulative spend as a share of total project budget</div>
                </div>
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
                  {data ? `${data.total_spend.toLocaleString()} spent` : "Loading"}
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0B0910]">
                <svg viewBox="0 0 760 260" className="h-[260px] w-full">
                  {[0, 25, 50, 75, 100].map((tick) => {
                    const y = 260 - 28 - (tick / 100) * (260 - 56);
                    return (
                      <g key={tick}>
                        <line x1="28" y1={y} x2="732" y2={y} stroke={chartColors.grid} strokeDasharray="4 6" />
                        <text x="8" y={y + 4} fill="#6b7280" fontSize="10">
                          {tick}%
                        </text>
                      </g>
                    );
                  })}

                  {burnLabels.map((label, index) => {
                    const x = burnLabels.length === 1 ? 380 : 28 + (index / Math.max(burnLabels.length - 1, 1)) * 704;
                    return (
                      <text key={label} x={x} y="254" fill="#6b7280" fontSize="10" textAnchor="middle">
                        {label}
                      </text>
                    );
                  })}

                  <polyline
                    fill="none"
                    stroke={chartColors.burn}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={buildPoints(burn, 760, 260, 28)}
                  />
                </svg>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Projects</div>
                  <div className="mt-2 text-lg font-bold text-white">{data?.project_count ?? "—"}</div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Tasks Completed</div>
                  <div className="mt-2 text-lg font-bold text-white">{data?.completed_tasks ?? "—"}</div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Area Delivered</div>
                  <div className="mt-2 text-lg font-bold text-white">{data?.labour_productivity.completed_area_m2 ?? "—"} m2</div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="glass-panel rounded-3xl border border-white/5 p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Project Scoreboard</div>
                  <div className="mt-1 text-sm text-zinc-400">Budget vs spend and completion by project</div>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Project</th>
                      <th className="px-4 py-3 text-right">Budget</th>
                      <th className="px-4 py-3 text-right">Spend</th>
                      <th className="px-4 py-3 text-right">Variance</th>
                      <th className="px-4 py-3 text-right">Completion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.projects ?? []).map((project) => (
                      <tr key={project.project_id} className="border-t border-white/5 hover:bg-white/[0.015]">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">{project.project_name}</div>
                          <div className="text-[11px] text-zinc-500">{project.code ?? "No code"}</div>
                        </td>
                        <td className="px-4 py-3 text-right text-zinc-300">Rs {formatCurrency(project.budget)}</td>
                        <td className="px-4 py-3 text-right text-zinc-300">Rs {formatCurrency(project.spend)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${project.variance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          Rs {formatCurrency(project.variance)}
                        </td>
                        <td className="px-4 py-3 text-right text-white">{project.completion_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-6">
              <div className="glass-panel rounded-3xl border border-white/5 p-5">
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Labour Intelligence</div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Hours Logged</div>
                    <div className="mt-2 text-2xl font-black text-white">{data?.labour_productivity.total_hours ?? "—"}</div>
                  </div>
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Labour Days</div>
                    <div className="mt-2 text-2xl font-black text-white">{data?.labour_productivity.labour_days ?? "—"}</div>
                  </div>
                </div>
              </div>

              <div className="glass-panel rounded-3xl border border-white/5 p-5">
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Material Leakage</div>
                <div className="mt-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Ordered</span>
                      <span>{data?.material_wastage.ordered_qty ?? "—"}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/[0.04]">
                      <div className="h-2 rounded-full bg-secondary" style={{ width: "100%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-zinc-500">
                      <span>Consumed</span>
                      <span>{data?.material_wastage.consumed_qty ?? "—"}</span>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-white/[0.04]">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{
                          width: data ? `${Math.min((data.material_wastage.consumed_qty / Math.max(data.material_wastage.ordered_qty, 1)) * 100, 100)}%` : "0%",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Wastage: <span className="font-semibold text-amber-400">{data?.material_wastage.wastage_pct ?? "—"}%</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-panel rounded-3xl border border-white/5 p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Subcontractor Scorecard</div>
                <div className="mt-1 text-sm text-zinc-400">On-time bill rate and NCR burden by subcontractor</div>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-white/5">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.02] text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Subcontractor</th>
                    <th className="px-4 py-3 text-left">Projects</th>
                    <th className="px-4 py-3 text-right">Bills</th>
                    <th className="px-4 py-3 text-right">On-time</th>
                    <th className="px-4 py-3 text-right">NCRs</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.subcontractor_scorecard ?? []).map((row) => (
                    <tr key={row.subcontractor_id} className="border-t border-white/5 hover:bg-white/[0.015]">
                      <td className="px-4 py-3 font-semibold text-white">{row.subcontractor_name}</td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {row.project_names.length > 0 ? row.project_names.join(", ") : "No linked projects"}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-300">{row.bill_count}</td>
                      <td className="px-4 py-3 text-right font-semibold text-emerald-400">{row.on_time_rate}%</td>
                      <td className="px-4 py-3 text-right text-rose-400">{row.ncr_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {loading && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3 text-sm text-zinc-400">
              Loading analytics...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
