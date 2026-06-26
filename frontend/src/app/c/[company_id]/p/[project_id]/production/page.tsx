"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type RecipeMaterial = {
  id: string;
  material_name: string;
  planned_qty: number;
  unit: string;
  is_optional: boolean;
};

type Recipe = {
  id: string;
  recipe_code: string;
  product_name: string;
  mix_type: string;
  unit: string;
  target_output_qty: number;
  wastage_pct: number;
  status: string;
  notes?: string | null;
  materials: RecipeMaterial[];
};

type BatchMaterial = {
  id: string;
  material_name: string;
  planned_qty: number;
  actual_qty: number;
  unit: string;
  variance_qty: number;
};

type Batch = {
  id: string;
  batch_number: string;
  recipe_code: string;
  product_name: string;
  mix_type: string;
  planned_output_qty: number;
  actual_output_qty: number;
  planned_material_qty: number;
  actual_material_qty: number;
  consumption_variance_qty: number;
  status: string;
  started_at?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  materials: BatchMaterial[];
};

type InventoryAlert = {
  id: string;
  material_name: string;
  on_hand_qty: number;
  reserved_qty: number;
  available_qty: number;
  unit: string;
  needs_reorder: boolean;
};

type ProductionSummary = {
  project_id: string;
  project_name: string;
  recipe_count: number;
  batch_count: number;
  planned_output_qty: number;
  actual_output_qty: number;
  output_variance_qty: number;
  planned_material_qty: number;
  actual_material_qty: number;
  material_variance_qty: number;
  recipes: Recipe[];
  batches: Batch[];
  inventory_alerts: InventoryAlert[];
};

function formatQty(value: number, digits = 2) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: digits,
  }).format(value);
}

function MetricCard({
  label,
  value,
  accent,
  note,
}: {
  label: string;
  value: string;
  accent: string;
  note: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.01)]">
      <div className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">{label}</div>
      <div className={`mt-2 text-3xl font-black ${accent}`}>{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{note}</div>
    </div>
  );
}

export default function ProductionPage() {
  const params = useParams();
  const companyId = params?.company_id as string;
  const projectId = params?.project_id as string;
  const [tab, setTab] = useState<"overview" | "batches" | "recipes" | "inventory">("overview");
  const [data, setData] = useState<ProductionSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    const fetchSummary = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/apis/v3/production/summary?project_id=${projectId}`);
        if (!response.ok) {
          throw new Error(`Production summary request failed: ${response.status}`);
        }
        const payload = (await response.json()) as ProductionSummary;
        setData(payload);
      } catch (error) {
        console.error("Failed to load production summary", error);
      } finally {
        setLoading(false);
      }
    };

    void fetchSummary();
  }, [projectId]);

  const totals = useMemo(() => {
    return {
      outputProgress: data && data.planned_output_qty > 0 ? Math.min((data.actual_output_qty / data.planned_output_qty) * 100, 120) : 0,
      materialVariancePct: data && data.planned_material_qty > 0 ? (data.material_variance_qty / data.planned_material_qty) * 100 : 0,
      lowStockCount: data?.inventory_alerts.filter((item) => item.needs_reorder).length ?? 0,
    };
  }, [data]);

  return (
    <div className="flex min-h-screen bg-[#0E0C15] text-[#ededed]">
      <aside className="w-72 shrink-0 border-r border-white/5 bg-[#0B0910]">
        <div className="flex items-center gap-3 border-b border-white/5 p-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-bold text-white">
            S
          </div>
          <div>
            <div className="text-sm font-bold text-white">SiteFlow</div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Production Management</div>
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
            Production + Consumption Control
          </div>
        </nav>

        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Project Scope</div>
            <div className="mt-1 text-sm font-semibold text-white">{data?.project_name ?? "Loading project..."}</div>
            <div className="mt-2 text-xs text-zinc-500">
              {data ? `${data.recipe_count} recipes and ${data.batch_count} batches tracked` : "Waiting for batch summary"}
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Status Watch</div>
            <div className="mt-2 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Low stock alerts</span>
                <span className="font-semibold text-amber-400">{totals.lowStockCount}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-500">Output progress</span>
                <span className="font-semibold text-emerald-400">{formatQty(totals.outputProgress, 1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="border-b border-white/5 bg-[#0B0910] px-6 py-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.28em] text-zinc-500">Phase 16</div>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-white">Production Management</h1>
              <p className="mt-2 text-sm text-zinc-400">
                Recipe standards, batch execution, consumption variance, and inventory pull-through in one view.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/[0.06]">
                + New Recipe
              </button>
              <button className="rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-4 py-2 text-xs font-bold text-white transition-opacity hover:opacity-90">
                + Log Batch
              </button>
            </div>
          </div>
        </header>

        <div className="px-6 py-6">
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Planned Output"
              value={loading ? "…" : formatQty(data?.planned_output_qty ?? 0)}
              accent="text-white"
              note="Standard output across all logged batches"
            />
            <MetricCard
              label="Actual Output"
              value={loading ? "…" : formatQty(data?.actual_output_qty ?? 0)}
              accent="text-emerald-400"
              note="Completed production volume after execution"
            />
            <MetricCard
              label="Material Variance"
              value={loading ? "…" : formatQty(data?.material_variance_qty ?? 0)}
              accent={totals.materialVariancePct > 0 ? "text-amber-400" : "text-primary"}
              note="Actual consumption minus planned consumption"
            />
            <MetricCard
              label="Low Stock Alerts"
              value={loading ? "…" : String(totals.lowStockCount)}
              accent="text-red-400"
              note="Inventory rows that need reorder attention"
            />
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {[
              { key: "overview", label: "Overview" },
              { key: "batches", label: "Batch Runs" },
              { key: "recipes", label: "Recipes" },
              { key: "inventory", label: "Inventory Watch" },
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setTab(item.key as typeof tab)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                  tab === item.key
                    ? "bg-primary/15 text-primary ring-1 ring-primary/20"
                    : "bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
              <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Execution Health</div>
                    <h2 className="mt-1 text-lg font-bold text-white">Batch versus output and material drift</h2>
                  </div>
                  <div className="rounded-full border border-white/5 bg-black/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
                    {data?.batch_count ?? 0} batches
                  </div>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Output progress</span>
                      <span className="font-semibold text-emerald-400">{formatQty(totals.outputProgress, 1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div className="h-2 rounded-full bg-gradient-to-r from-primary to-emerald-400" style={{ width: `${Math.min(totals.outputProgress, 100)}%` }} />
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="text-zinc-400">Material variance</span>
                      <span className={totals.materialVariancePct > 0 ? "font-semibold text-amber-400" : "font-semibold text-primary"}>
                        {formatQty(totals.materialVariancePct, 1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/5">
                      <div
                        className={`h-2 rounded-full ${totals.materialVariancePct > 0 ? "bg-amber-400" : "bg-gradient-to-r from-primary to-[#7C5CFF]"}`}
                        style={{ width: `${Math.min(Math.abs(totals.materialVariancePct), 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  {(data?.batches ?? []).slice(0, 4).map((batch) => (
                    <div key={batch.id} className="rounded-2xl border border-white/5 bg-[#0B0910] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-white">{batch.batch_number}</div>
                          <div className="mt-1 text-xs text-zinc-500">{batch.product_name}</div>
                        </div>
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                          {batch.status}
                        </span>
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-xl bg-white/[0.03] p-2">
                          <div className="text-zinc-500">Plan</div>
                          <div className="mt-1 font-bold text-white">{formatQty(batch.planned_output_qty)}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-2">
                          <div className="text-zinc-500">Actual</div>
                          <div className="mt-1 font-bold text-emerald-400">{formatQty(batch.actual_output_qty)}</div>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-2">
                          <div className="text-zinc-500">Var.</div>
                          <div className={`mt-1 font-bold ${batch.consumption_variance_qty >= 0 ? "text-amber-400" : "text-primary"}`}>
                            {formatQty(batch.consumption_variance_qty)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="space-y-4">
                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Recipe Library</div>
                  <div className="mt-2 text-lg font-bold text-white">{data?.recipe_count ?? 0} standards</div>
                  <div className="mt-4 space-y-3">
                    {(data?.recipes ?? []).slice(0, 3).map((recipe) => (
                      <div key={recipe.id} className="rounded-2xl border border-white/5 bg-[#0B0910] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{recipe.product_name}</div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {recipe.recipe_code} · {recipe.mix_type}
                            </div>
                          </div>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{recipe.unit}</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {recipe.materials.slice(0, 4).map((material) => (
                            <span key={material.id} className="rounded-full bg-white/[0.03] px-2.5 py-1 text-[10px] text-zinc-300">
                              {material.material_name} {formatQty(material.planned_qty, 3)} {material.unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Inventory Pull-Through</div>
                  <div className="mt-2 text-lg font-bold text-white">{data?.inventory_alerts.length ?? 0} tracked rows</div>
                  <div className="mt-4 space-y-2">
                    {(data?.inventory_alerts ?? []).slice(0, 4).map((item) => (
                      <div key={item.id} className="flex items-center justify-between rounded-2xl border border-white/5 bg-[#0B0910] px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-white">{item.material_name}</div>
                          <div className="text-xs text-zinc-500">
                            {formatQty(item.available_qty)} available · {formatQty(item.reserved_qty)} reserved
                          </div>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${item.needs_reorder ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                          {item.needs_reorder ? "Reorder" : "Healthy"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {tab === "batches" && (
            <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Batch Runs</div>
                  <h2 className="mt-1 text-lg font-bold text-white">Material consumption and output trace</h2>
                </div>
                <div className="text-xs text-zinc-500">{data?.batches.length ?? 0} records</div>
              </div>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/5 text-zinc-500">
                      <th className="px-4 py-3 font-semibold">Batch</th>
                      <th className="px-4 py-3 font-semibold">Recipe</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Plan</th>
                      <th className="px-4 py-3 font-semibold">Actual</th>
                      <th className="px-4 py-3 font-semibold">Variance</th>
                      <th className="px-4 py-3 font-semibold">Materials</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.batches ?? []).map((batch) => (
                      <tr key={batch.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white">
                          <div className="font-semibold">{batch.batch_number}</div>
                          <div className="mt-1 text-[10px] text-zinc-500">{batch.started_at ? new Date(batch.started_at).toLocaleString() : "No start time"}</div>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">
                          <div className="font-semibold text-white">{batch.product_name}</div>
                          <div className="mt-1 text-[10px] text-zinc-500">{batch.recipe_code} · {batch.mix_type}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                            {batch.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-zinc-300">{formatQty(batch.planned_output_qty)}</td>
                        <td className="px-4 py-3 text-emerald-400">{formatQty(batch.actual_output_qty)}</td>
                        <td className={`px-4 py-3 font-semibold ${batch.consumption_variance_qty >= 0 ? "text-amber-400" : "text-primary"}`}>
                          {formatQty(batch.consumption_variance_qty)}
                        </td>
                        <td className="px-4 py-3 text-zinc-400">{batch.materials.length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {tab === "recipes" && (
            <div className="grid gap-4 lg:grid-cols-2">
              {(data?.recipes ?? []).map((recipe) => (
                <section key={recipe.id} className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">{recipe.recipe_code}</div>
                      <h2 className="mt-1 text-xl font-bold text-white">{recipe.product_name}</h2>
                      <p className="mt-2 text-sm text-zinc-400">{recipe.mix_type} · Output target {formatQty(recipe.target_output_qty)} {recipe.unit}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                      {recipe.wastage_pct}% wastage
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {recipe.materials.map((material) => (
                      <div key={material.id} className="rounded-2xl border border-white/5 bg-[#0B0910] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-white">{material.material_name}</div>
                            <div className="mt-1 text-xs text-zinc-500">
                              {formatQty(material.planned_qty, 3)} {material.unit}
                            </div>
                          </div>
                          <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.18em] ${material.is_optional ? "bg-white/5 text-zinc-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                            {material.is_optional ? "Optional" : "Required"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {recipe.notes ? <p className="mt-4 text-xs text-zinc-500">{recipe.notes}</p> : null}
                </section>
              ))}
            </div>
          )}

          {tab === "inventory" && (
            <section className="rounded-3xl border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Inventory Watch</div>
                  <h2 className="mt-1 text-lg font-bold text-white">Materials pulled by production batches</h2>
                </div>
                <div className="text-xs text-zinc-500">{data?.inventory_alerts.length ?? 0} tracked items</div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {(data?.inventory_alerts ?? []).map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/5 bg-[#0B0910] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-semibold text-white">{item.material_name}</div>
                        <div className="mt-1 text-xs text-zinc-500">
                          {formatQty(item.on_hand_qty)} on hand · {formatQty(item.reserved_qty)} reserved
                        </div>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${item.needs_reorder ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                        {item.needs_reorder ? "Reorder" : "Healthy"}
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/5">
                      <div
                        className={`h-2 rounded-full ${item.needs_reorder ? "bg-red-400" : "bg-gradient-to-r from-primary to-emerald-400"}`}
                        style={{ width: `${Math.max(Math.min((item.available_qty / Math.max(item.on_hand_qty || 1, 1)) * 100, 100), 4)}%` }}
                      />
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      Available {formatQty(item.available_qty)} {item.unit}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
