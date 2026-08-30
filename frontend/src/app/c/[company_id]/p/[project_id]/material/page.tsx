"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders } from "@/lib/siteflow";

// ─── Types ────────────────────────────────────────────────────────────────────
type StockRow = {
  inventory_id: string | null;
  category: string;
  material_name: string;
  unit: string | null;
  received: number;
  consumed: number;
  adjusted?: number; // net stock corrections (R2-387)
  current_stock: number; // Received - Consumed + Adjusted ; can be negative
  reserved: number;
};

const CATEGORIES = [
  "Civil",
  "Fuel",
  "Steel",
  "Electrical",
  "Plumbing",
  "Mechanical",
  "Uncategorized",
];

const num = (n: number) =>
  (n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export default function MaterialTab() {
  const params = useParams();
  const companyId = params.company_id as string;
  const projectId = params.project_id as string;

  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // movement modal
  const [modalType, setModalType] = useState<null | "received" | "used">(null);
  const [matName, setMatName] = useState("");
  const [cat, setCat] = useState("Uncategorized");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApi(`/procurement/stock?project_id=${projectId}`), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Stock load failed (${res.status})`);
      setRows(await res.json());
    } catch (e: any) {
      setError(e?.message || "Failed to load stock");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const m = new Map<string, StockRow[]>();
    for (const r of rows) {
      const k = r.category || "Uncategorized";
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(r);
    }
    return Array.from(m.entries());
  }, [rows]);

  const negCount = rows.filter((r) => r.current_stock < 0).length;
  // R2-488: bags, tonnes and cft are never summed. The headline tiles break
  // received and consumed down per unit instead of one dimensionless number.
  const byUnit = useMemo(() => {
    const m = new Map<string, { recv: number; cons: number }>();
    for (const r of rows) {
      const k = r.unit?.trim() || "units";
      const e = m.get(k) ?? { recv: 0, cons: 0 };
      e.recv += r.received;
      e.cons += r.consumed;
      m.set(k, e);
    }
    return Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);
  const unitBreakdown = (pick: (e: { recv: number; cons: number }) => number) =>
    byUnit.length ? byUnit.map(([u, e]) => `${num(pick(e))} ${u}`).join(" · ") : "—";

  const submitMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(qty);
    if (!matName.trim() || !(value > 0)) {
      setError("Enter a material name and a quantity greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(getApi("/procurement/transactions"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          project_id: projectId,
          material_name: matName.trim(),
          qty: value,
          type: modalType,
          category: cat,
          unit: unit.trim() || null,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        throw new Error(t || `Error ${res.status}`);
      }
      setModalType(null);
      setMatName("");
      setQty("");
      setUnit("");
      setCat("Uncategorized");
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to save movement");
    } finally {
      setSaving(false);
    }
  };

  const recategorize = async (row: StockRow, newCat: string) => {
    if (!row.inventory_id || newCat === row.category) return;
    try {
      const res = await fetch(getApi(`/procurement/inventory/${row.inventory_id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ category: newCat }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.map((r) => (r === row ? { ...r, category: newCat } : r)));
    } catch {
      /* ignore category edit failures */
    }
  };

  const closeModal = () => {
    setModalType(null);
    setMatName("");
    setQty("");
    setUnit("");
    setCat("Uncategorized");
    setError(null);
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <header className="h-14 border-b border-border-custom bg-card px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-foreground">Material Stock</h1>
          <div className="text-[10px] text-muted">
            Current Stock = <span className="text-primary font-semibold">Received − Consumed + Adjusted</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalType("used")}
            className="px-3 py-1.5 bg-rose-600/90 text-foreground text-xs font-bold rounded-lg hover:opacity-90 transition-all"
          >
            − Issue
          </button>
          <button
            onClick={() => setModalType("received")}
            className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all"
          >
            + Receive
          </button>
        </div>
      </header>

      <div className="px-5 py-3 border-b border-border-custom shrink-0 flex flex-wrap gap-3">
        <div className="px-3 py-1.5 rounded-lg bg-elevated border border-border-custom text-[11px]">
          <span className="text-muted">Materials</span>{" "}
          <span className="text-foreground font-bold font-sans">{rows.length}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-elevated border border-border-custom text-[11px]">
          <span className="text-muted">Received</span>{" "}
          <span className="text-emerald-400 font-bold font-sans">{unitBreakdown((e) => e.recv)}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-elevated border border-border-custom text-[11px]">
          <span className="text-muted">Consumed</span>{" "}
          <span className="text-amber-400 font-bold font-sans">{unitBreakdown((e) => e.cons)}</span>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-elevated border border-border-custom text-[11px]">
          <span className="text-muted">Over-consumed</span>{" "}
          <span className={negCount > 0 ? "text-rose-400 font-bold font-sans" : "text-muted font-sans"}>
            {negCount}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        {loading && <div className="p-10 text-center text-muted text-xs">Loading material stock…</div>}
        {error && !loading && <div className="p-10 text-center text-rose-400 text-xs">{error}</div>}
        {!loading && !error && rows.length === 0 && (
          <div className="p-10 text-center text-muted text-xs">
            No material movements yet. Use <span className="text-primary font-bold">+ Receive</span> to log
            stock or <span className="text-rose-400 font-bold">− Issue</span> to consume it.
          </div>
        )}

        {!loading &&
          !error &&
          grouped.map(([category, items]) => (
            <div key={category} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/30">
                  {category}
                </span>
                <span className="text-[10px] text-muted">
                  {items.length} material{items.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="rounded-lg border border-border-custom overflow-hidden">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-background">
                    <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
                      <th className="py-2.5 pl-4 pr-2">#</th>
                      <th className="py-2.5 px-2">Material</th>
                      <th className="py-2.5 px-2 text-center">Unit</th>
                      <th className="py-2.5 px-2 text-right">Received</th>
                      <th className="py-2.5 px-2 text-right">Consumed</th>
                      <th className="py-2.5 px-2 text-right">Current Stock</th>
                      <th className="py-2.5 px-4">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {items.map((r, i) => {
                      const neg = r.current_stock < 0;
                      const zero = r.current_stock === 0;
                      return (
                        <tr
                          key={(r.inventory_id || r.material_name) + i}
                          className="hover:bg-elevated transition-colors"
                        >
                          <td className="py-2.5 pl-4 pr-2 font-sans text-muted">{i + 1}</td>
                          <td className="py-2.5 px-2 text-foreground font-medium">{r.material_name}</td>
                          <td className="py-2.5 px-2 text-center text-muted">{r.unit || "—"}</td>
                          <td className="py-2.5 px-2 text-right font-sans text-emerald-400">
                            {num(r.received)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-sans text-amber-400">
                            {num(r.consumed)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-sans font-semibold">
                            <span className={neg ? "text-rose-400" : zero ? "text-muted" : "text-foreground"}>
                              {num(r.current_stock)}
                            </span>
                            {neg && (
                              <span className="ml-2 text-[9px] uppercase text-rose-400 border border-rose-500/40 rounded px-1">
                                over
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-4">
                            <select
                              value={r.category}
                              onChange={(e) => recategorize(r, e.target.value)}
                              className="bg-input border border-border-custom rounded px-1.5 py-1 text-[11px] text-muted"
                            >
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                              {!CATEGORIES.includes(r.category) && (
                                <option value={r.category}>{r.category}</option>
                              )}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
      </div>

      {modalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border-custom bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">
                {modalType === "received" ? "Receive Material" : "Issue Material"}
              </h3>
              <button onClick={closeModal} className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            <form onSubmit={submitMovement} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted">Material Name</label>
                <input
                  autoFocus
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="e.g. Cement OPC 53"
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">Category</label>
                  <select
                    value={cat}
                    onChange={(e) => setCat(e.target.value)}
                    className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Unit</label>
                  <input
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="bags / ltr / kg"
                    className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">
                  Quantity ({modalType === "received" ? "to add" : "to consume"})
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  placeholder="0"
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                />
              </div>
              {error && <div className="text-[11px] text-rose-400">{error}</div>}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-elevated text-muted text-sm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={`px-4 py-2 text-foreground text-sm font-bold rounded-lg disabled:opacity-40 ${
                    modalType === "received" ? "bg-primary" : "bg-rose-600"
                  }`}
                >
                  {saving ? "Saving…" : modalType === "received" ? "Receive" : "Issue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}