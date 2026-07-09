"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders, resolveCompanyId, fmtINR } from "@/lib/siteflow";

type Material = {
  id: string;
  name: string;
  unit: string;
  alternate_unit?: string | null;
  gst_rate: number;
  category?: string | null;
  unit_cost: number;
  lead_time_days: number;
  hsn_sac?: string | null;
  item_code?: string | null;
  specifications?: string | null;
};

type Category = { id: string; name: string };

export default function MaterialsPage() {
  const params = useParams();
  const companyId = params.company_id as string;

  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, cRes] = await Promise.all([
        fetch(getApi(`/library/materials/${companyId}`), { headers: authHeaders() }),
        fetch(getApi(`/library/material-categories/${companyId}`), { headers: authHeaders() }),
      ]);
      if (mRes.ok) setMaterials(await mRes.json());
      if (cRes.ok) setCategories(await cRes.json());
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const grouped = categories.length
    ? categories.map((c) => ({ ...c, items: materials.filter((m) => m.category === c.name) }))
    : [{ id: "__all", name: "All Materials", items: materials }];

  const removeCat = async (id: string) => {
    await fetch(getApi(`/library/material-categories/${id}`), { method: "DELETE", headers: authHeaders() });
    load();
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Materials Master</h2>
        <div className="flex gap-2">
          <button onClick={() => setCatOpen(true)} className="rounded-md border border-border-custom bg-card px-4 py-2 text-sm text-foreground hover:border-primary">
            + Category
          </button>
          <button onClick={() => setOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            + New Material
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-elevated px-3 py-1 text-xs text-muted">
              {c.name}
              <button onClick={() => removeCat(c.id)} className="text-muted hover:text-rose-500">✕</button>
            </span>
          ))}
        </div>
      )}

      <div className="space-y-6">
        {loading && <div className="text-sm text-muted">Loading…</div>}
        {!loading && grouped.map((g) => (
          <div key={g.id}>
            <h3 className="text-sm font-semibold text-foreground mb-2">{g.name} ({g.items.length})</h3>
            <div className="rounded-lg border border-border-custom overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead className="bg-elevated text-muted">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Material</th>
                    <th className="text-left px-4 py-2 font-medium">UOM</th>
                    <th className="text-left px-4 py-2 font-medium">GST %</th>
                    <th className="text-right px-4 py-2 font-medium">Unit Cost</th>
                    <th className="text-left px-4 py-2 font-medium">HSN / Item</th>
                  </tr>
                </thead>
                <tbody>
                  {g.items.map((m) => (
                    <tr key={m.id} className="border-t border-border-custom">
                      <td className="px-4 py-2 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-2 text-muted">{m.unit}{m.alternate_unit ? ` / ${m.alternate_unit}` : ""}</td>
                      <td className="px-4 py-2 text-muted">{m.gst_rate}</td>
                      <td className="px-4 py-2 text-right text-foreground">{fmtINR(m.unit_cost)}</td>
                      <td className="px-4 py-2 text-muted">{m.hsn_sac || "—"}{m.item_code ? ` · ${m.item_code}` : ""}</td>
                    </tr>
                  ))}
                  {g.items.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-4 text-center text-muted">No materials in this category.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <NewMaterialModal
          companyId={companyId}
          categories={categories}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); load(); }}
        />
      )}
      {catOpen && (
        <NewCategoryModal
          companyId={companyId}
          onClose={() => setCatOpen(false)}
          onCreated={() => { setCatOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function NewMaterialModal({
  companyId, categories, onClose, onCreated,
}: {
  companyId: string; categories: Category[]; onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "", unit: "", alternate_unit: "", gst_rate: "18", category: "",
    unit_cost: "", lead_time_days: "0", hsn_sac: "", item_code: "", specifications: "",
  });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const cid = await resolveCompanyId(companyId);
      const res = await fetch(getApi(`/library/materials`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: cid,
          name: form.name,
          unit: form.unit,
          alternate_unit: form.alternate_unit || null,
          gst_rate: parseFloat(form.gst_rate) || 0,
          category: form.category || null,
          unit_cost: parseFloat(form.unit_cost) || 0,
          lead_time_days: parseInt(form.lead_time_days) || 0,
          hsn_sac: form.hsn_sac || null,
          item_code: form.item_code || null,
          specifications: form.specifications || null,
        }),
      });
      if (res.ok) onCreated();
      else onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border-custom bg-card p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">New Material</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Material Name *"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="Unit (UOM) *"><input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="Alternate UOM"><input value={form.alternate_unit} onChange={(e) => setForm({ ...form, alternate_unit: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="GST %"><input value={form.gst_rate} onChange={(e) => setForm({ ...form, gst_rate: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="Category">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground">
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Unit Cost"><input value={form.unit_cost} onChange={(e) => setForm({ ...form, unit_cost: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="Lead Time (days)"><input value={form.lead_time_days} onChange={(e) => setForm({ ...form, lead_time_days: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="HSN / SAC"><input value={form.hsn_sac} onChange={(e) => setForm({ ...form, hsn_sac: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="Item Code"><input value={form.item_code} onChange={(e) => setForm({ ...form, item_code: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
          <Field label="Specifications"><input value={form.specifications} onChange={(e) => setForm({ ...form, specifications: e.target.value })} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" /></Field>
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={submit} disabled={!form.name || !form.unit || saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {saving ? "Saving…" : "Create Material"}
          </button>
        </div>
      </div>
    </div>
  );
}

function NewCategoryModal({
  companyId, onClose, onCreated,
}: {
  companyId: string; onClose: () => void; onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      const cid = await resolveCompanyId(companyId);
      const res = await fetch(getApi(`/library/material-categories`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ company_id: cid, name }),
      });
      if (res.ok) onCreated();
      else onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border-custom bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">New Category</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Category name" className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
        <div className="flex justify-end mt-4">
          <button onClick={submit} disabled={!name || saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40">Create</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium text-muted">{label}</div>
      {children}
    </div>
  );
}
