"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders, resolveCompanyId } from "@/lib/siteflow";

type CostCode = {
  id: string;
  code: string;
  name: string;
  sub_cost_code?: string | null;
  parent_id?: string | null;
};

export default function CostCodesPage() {
  const params = useParams();
  const companyId = params.company_id as string;

  const [codes, setCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApi(`/library/cost-codes/${companyId}`), { headers: authHeaders() });
      if (res.ok) setCodes(await res.json());
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const roots = useMemo(() => codes.filter((c) => !c.parent_id), [codes]);
  const childrenOf = (id: string) => codes.filter((c) => c.parent_id === id);

  const remove = async (id: string) => {
    await fetch(getApi(`/library/cost-codes/${id}`), { method: "DELETE", headers: authHeaders() });
    load();
  };

  const renderNode = (node: CostCode, depth: number) => (
    <div key={node.id}>
      <div
        className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-elevated border border-border-custom"
        style={{ marginLeft: depth * 20 }}
      >
        <div>
          <span className="font-medium text-foreground">{node.code}</span>
          <span className="text-muted ml-2">{node.name}</span>
          {node.sub_cost_code && <span className="text-xs text-muted ml-2">({node.sub_cost_code})</span>}
        </div>
        <button onClick={() => remove(node.id)} className="text-xs text-muted hover:text-rose-500">Delete</button>
      </div>
      {childrenOf(node.id).map((c) => renderNode(c, depth + 1))}
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Cost Codes</h2>
        <button onClick={() => setOpen(true)} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90">
          + New Cost Code
        </button>
      </div>

      <div className="space-y-2">
        {loading && <div className="text-sm text-muted">Loading…</div>}
        {!loading && codes.length === 0 && <div className="text-sm text-muted">No cost codes yet.</div>}
        {!loading && roots.map((r) => renderNode(r, 0))}
      </div>

      {open && (
        <NewCostCodeModal
          companyId={companyId}
          codes={codes}
          onClose={() => setOpen(false)}
          onCreated={() => { setOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function NewCostCodeModal({
  companyId, codes, onClose, onCreated,
}: {
  companyId: string; codes: CostCode[]; onClose: () => void; onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [sub, setSub] = useState("");
  const [isSub, setIsSub] = useState(false);
  const [parentId, setParentId] = useState("");
  const [saving, setSaving] = useState(false);

  const roots = codes.filter((c) => !c.parent_id);

  const submit = async () => {
    setSaving(true);
    try {
      const cid = await resolveCompanyId(companyId);
      const res = await fetch(getApi(`/library/cost-codes`), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: cid,
          code,
          name,
          sub_cost_code: sub || null,
          parent_id: isSub && parentId ? parentId : null,
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
      <div className="w-full max-w-md rounded-lg border border-border-custom bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">New Cost Code</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-xs font-medium text-muted">Code *</div>
            <input value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted">Name *</div>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted">Sub Cost Code</div>
            <input value={sub} onChange={(e) => setSub(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isSub} onChange={(e) => setIsSub(e.target.checked)} />
            Make this a sub-cost code
          </label>
          {isSub && (
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground">
              <option value="">— Parent Cost Code —</option>
              {roots.map((r) => <option key={r.id} value={r.id}>{r.code} — {r.name}</option>)}
            </select>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={submit} disabled={!code || !name || saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
            {saving ? "Saving…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
