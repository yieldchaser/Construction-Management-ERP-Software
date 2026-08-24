"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders, downloadWithAuth, fmtINR } from "@/lib/siteflow";
import { useCompanySettings } from "@/context/CompanySettingsContext";

// ─── Types ────────────────────────────────────────────────────────────────────
type BOQDocument = {
  id: string;
  project_id: string;
  client_party_id: string | null;
  client_name: string | null;
  title: string;
  milestone_done: number;
  milestone_total: number;
  boq_value: number;
  billed_value: number;
  physical_progress: number; // 0-100
  item_count: number;
};

type BOQItemLine = {
  id: string;
  section_name: string | null;
  item_name: string;
  unit: string;
  quantity: number;
  rate: number;
  supply_rate: number;
  installation_rate: number;
  amount: number;
};

type Party = { id: string; name: string; party_type: string | null };

const UNCAT = "Uncategorized";

export default function BoqTab() {
  const { currencyDecimalPlaces } = useCompanySettings();
  const params = useParams();
  const companyId = params.company_id as string;
  const projectId = params.project_id as string;

  const [docs, setDocs] = useState<BOQDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Add BOQ modal
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientSearch, setClientSearch] = useState("");
  const [milestoneDone, setMilestoneDone] = useState(0);
  const [milestoneTotal, setMilestoneTotal] = useState(0);
  const [terms, setTerms] = useState("");
  const [boqDefaultTerms, setBoqDefaultTerms] = useState("");
  const [savingDoc, setSavingDoc] = useState(false);

  // Inline add party
  const [showParty, setShowParty] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [savingParty, setSavingParty] = useState(false);

  // Clients master
  const [clients, setClients] = useState<Party[]>([]);

  // Expanded doc items
  const [docItems, setDocItems] = useState<BOQItemLine[]>([]);
  const [docItemsLoading, setDocItemsLoading] = useState(false);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docImporting, setDocImporting] = useState(false);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(getApi(`/budgeting/boq-documents?project_id=${projectId}`), {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load BOQ documents");
      setDocs(await res.json());
    } catch (e) {
      setError("Failed to load BOQ documents.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch(getApi(`/library/parties/${companyId}`), { headers: authHeaders() });
      if (res.ok) {
        const all: Party[] = await res.json();
        setClients(all.filter((p) => (p.party_type || "").toLowerCase() === "client"));
      }
    } catch (e) {
      console.error(e);
    }
  }, [companyId]);

  useEffect(() => {
    loadDocs();
    loadClients();
  }, [loadDocs, loadClients]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(getApi(`/settings/company-terms/${companyId}`), { headers: authHeaders() || {} });
        if (r.ok) {
          const d = await r.json();
          setBoqDefaultTerms(d.boq_terms || "");
        }
      } catch {
        /* ignore: terms are optional */
      }
    })();
  }, [companyId]);

  useEffect(() => {
    if (showAdd && !terms) setTerms(boqDefaultTerms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showAdd]);

  const filteredDocs = useMemo(() => {
    if (!search.trim()) return docs;
    const q = search.toLowerCase();
    return docs.filter(
      (d) =>
        (d.client_name || "").toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q)
    );
  }, [docs, search]);

  const amountOf = (i: BOQItemLine) =>
    Number(i.quantity) * (Number(i.rate) + Number(i.supply_rate) + Number(i.installation_rate));

  const loadDocItems = useCallback(
    async (docId: string) => {
      setDocItemsLoading(true);
      try {
        const res = await fetch(
          getApi(`/budgeting/boq?project_id=${projectId}&boq_document_id=${docId}`),
          { headers: authHeaders() }
        );
        if (res.ok) setDocItems(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setDocItemsLoading(false);
      }
    },
    [projectId]
  );

  const toggleExpand = (docId: string) => {
    if (expandedId === docId) {
      setExpandedId(null);
      setDocItems([]);
    } else {
      setExpandedId(docId);
      setDocFile(null);
      loadDocItems(docId);
    }
  };

  const createParty = async () => {
    if (!partyName.trim()) return;
    setSavingParty(true);
    try {
      const res = await fetch(getApi("/library/parties"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          company_id: companyId,
          name: partyName.trim(),
          party_type: "Client",
          project_id: projectId,
        }),
      });
      if (res.ok) {
        const p: Party = await res.json();
        await loadClients();
        setClientId(p.id);
        setPartyName("");
        setShowParty(false);
      }
    } finally {
      setSavingParty(false);
    }
  };

  const createDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSavingDoc(true);
    try {
      const res = await fetch(getApi("/budgeting/boq-documents"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          project_id: projectId,
          title: title.trim(),
          client_party_id: clientId,
          milestone_done: milestoneDone,
          milestone_total: milestoneTotal,
          terms: terms || null,
        }),
      });
      if (res.ok) {
        setTitle("");
        setClientId(null);
        setClientSearch("");
        setMilestoneDone(0);
        setMilestoneTotal(0);
        setTerms("");
        setShowAdd(false);
        await loadDocs();
      }
    } finally {
      setSavingDoc(false);
    }
  };

  const updateMilestone = async (doc: BOQDocument, done: number, total: number) => {
    try {
      const res = await fetch(getApi(`/budgeting/boq-documents/${doc.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({ milestone_done: done, milestone_total: total }),
      });
      if (res.ok) await loadDocs();
    } catch (e) {
      console.error(e);
    }
  };

  const importIntoDoc = async (docId: string) => {
    if (!docFile) return;
    setDocImporting(true);
    const formData = new FormData();
    formData.append("project_id", projectId);
    formData.append("boq_document_id", docId);
    formData.append("file", docFile);
    try {
      await fetch(getApi("/budgeting/boq/import"), { method: "POST", body: formData, headers: authHeaders() });
      setDocFile(null);
      await loadDocItems(docId);
      await loadDocs();
    } finally {
      setDocImporting(false);
    }
  };

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
  }, [clients, clientSearch]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 border-b border-border-custom bg-card px-6 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-sm font-bold text-foreground">BOQ Documents</h1>
          <div className="text-[10px] text-muted">
            {docs.length} BOQ document(s) · Total BOQ Value{" "}
            <span className="text-primary font-semibold">
              {fmtINR(docs.reduce((s, d) => s + d.boq_value, 0), currencyDecimalPlaces)}
            </span>
          </div>
        </div>
        <button
          onClick={() => {
            setShowAdd(true);
            loadClients();
          }}
          className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:opacity-90 transition-all"
        >
          + BOQ
        </button>
      </header>

      {/* Search */}
      <div className="px-5 py-3 border-b border-border-custom shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search client or BOQ title..."
          className="flex-1 bg-input border border-border-custom rounded-lg px-3 py-1.5 text-xs text-foreground placeholder-muted w-full"
        />
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-10 text-center text-muted text-xs">Loading BOQ documents…</div>
        ) : error ? (
          <div className="p-10 text-center text-rose-400 text-xs">{error}</div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-10 text-center text-muted text-xs">
            No BOQ documents yet. Click <span className="text-primary font-bold">+ BOQ</span> to create one per client.
          </div>
        ) : (
          <table className="w-full text-xs text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b border-border-custom text-muted font-bold uppercase tracking-wider text-[9px]">
                <th className="py-3 pl-5 pr-2">S.No</th>
                <th className="py-3 px-2">Client Name</th>
                <th className="py-3 px-2">BOQ Title</th>
                <th className="py-3 px-2 text-center">Milestone</th>
                <th className="py-3 px-2 text-right">Physical Progress</th>
                <th className="py-3 px-2 text-right">BOQ Value</th>
                <th className="py-3 px-2 text-right">Billed Value</th>
                <th className="py-3 pr-5"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((d, idx) => {
                const open = expandedId === d.id;
                const pct = Math.max(0, Math.min(100, d.physical_progress));
                const milestonePct =
                  d.milestone_total > 0 ? (d.milestone_done / d.milestone_total) * 100 : 0;
                return (
                  <React.Fragment key={d.id}>
                    <tr
                      className="border-b border-border-custom hover:bg-elevated transition-colors cursor-pointer"
                      onClick={() => toggleExpand(d.id)}
                    >
                      <td className="py-3 pl-5 pr-2 font-sans text-muted">{idx + 1}</td>
                      <td className="py-3 px-2 text-foreground font-medium">
                        {d.client_name || <span className="text-muted">—</span>}
                      </td>
                      <td className="py-3 px-2 text-muted">{d.title}</td>
                      <td className="py-3 px-2 text-center">
                        <span className="font-sans text-muted">
                          {d.milestone_done}/{d.milestone_total}
                        </span>
                        <div className="mt-1 h-1 w-16 bg-elevated rounded-full overflow-hidden mx-auto">
                          <div
                            className="h-full bg-amber-500 rounded-full"
                            style={{ width: `${milestonePct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right">
                        <span className="font-sans text-muted font-semibold">
                          {pct.toFixed(1)}%
                        </span>
                        <div className="mt-1 h-1 w-20 bg-elevated rounded-full overflow-hidden ml-auto">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100 ? "bg-emerald-500" : pct > 0 ? "bg-blue-500" : "bg-zinc-600"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-sans text-muted">
                        {fmtINR(d.boq_value, currencyDecimalPlaces)}
                      </td>
                      <td className="py-3 px-2 text-right font-sans font-semibold text-emerald-400">
                        {fmtINR(d.billed_value, currencyDecimalPlaces)}
                      </td>
                      <td className="py-3 pr-5 text-center text-muted">
                        {open ? "▾" : "▸"}
                      </td>
                    </tr>

                    {open && (
                      <tr className="border-b border-border-custom bg-elevated">
                        <td colSpan={8} className="px-5 py-4">
                          {/* Milestone editor */}
                          <div className="flex items-center gap-3 mb-4 text-[10px] text-muted">
                            <span>Milestone:</span>
                            <input
                              type="number"
                              min={0}
                              value={d.milestone_done}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateMilestone(d, Math.max(0, Number(e.target.value) || 0), d.milestone_total)
                              }
                              className="w-14 bg-input border border-border-custom rounded px-2 py-1 text-foreground"
                            />
                            <span>/</span>
                            <input
                              type="number"
                              min={0}
                              value={d.milestone_total}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) =>
                                updateMilestone(d, d.milestone_done, Math.max(0, Number(e.target.value) || 0))
                              }
                              className="w-14 bg-input border border-border-custom rounded px-2 py-1 text-foreground"
                            />
                            <span>· {d.item_count} line item(s)</span>
                          </div>

                          {/* Import into this BOQ */}
                          <div
                            className="flex items-center gap-2 mb-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <label className="px-3 py-1.5 bg-elevated border border-border-custom text-muted text-xs rounded-lg cursor-pointer hover:bg-elevated">
                              {docFile ? docFile.name : "Import Excel items into this BOQ"}
                              <input
                                type="file"
                                accept=".xlsx,.xlsm"
                                className="hidden"
                                onChange={(e) => {
                                  if (e.target.files?.[0]) setDocFile(e.target.files[0]);
                                }}
                              />
                            </label>
                            {docFile && (
                              <button
                                onClick={() => importIntoDoc(d.id)}
                                disabled={docImporting}
                                className="px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40"
                              >
                                {docImporting ? "Importing..." : "Import & Add"}
                              </button>
                            )}
                          </div>

                          <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await downloadWithAuth(`/budgeting/boq-documents/${d.id}/pdf`);
                                } catch (e) {
                                  alert(`Download failed (${e instanceof Error ? e.message : "unknown error"}).`);
                                }
                              }}
                              className="inline-block px-3 py-1.5 bg-elevated border border-border-custom text-muted text-xs rounded-lg hover:bg-elevated"
                            >
                              Download PDF
                            </button>
                          </div>

                          {/* Line items */}
                          {docItemsLoading ? (
                            <div className="text-[10px] text-muted">Loading items…</div>
                          ) : docItems.length === 0 ? (
                            <div className="text-[10px] text-muted">
                              No line items yet — import an Excel with item_name, unit, qty, rate.
                            </div>
                          ) : (
                            <table className="w-full text-[11px] text-left border-collapse">
                              <thead>
                                <tr className="text-muted uppercase tracking-wider text-[9px] border-b border-border-custom">
                                  <th className="py-2 pl-1 pr-2">Item</th>
                                  <th className="py-2 px-2 text-center">Unit</th>
                                  <th className="py-2 px-2 text-right">Qty</th>
                                  <th className="py-2 px-2 text-right">Rate</th>
                                  <th className="py-2 px-2 text-right">Supply</th>
                                  <th className="py-2 px-2 text-right">Install</th>
                                  <th className="py-2 px-2 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-white/[0.03]">
                                {docItems.map((i) => (
                                  <tr key={i.id}>
                                    <td className="py-1.5 pl-1 pr-2 text-foreground">
                                      {i.item_name}
                                      {i.section_name && (
                                        <span className="text-muted ml-1">· {i.section_name}</span>
                                      )}
                                    </td>
                                    <td className="py-1.5 px-2 text-center text-muted">{i.unit}</td>
                                    <td className="py-1.5 px-2 text-right font-sans text-muted">
                                      {Number(i.quantity).toLocaleString("en-IN", { maximumFractionDigits: 4 })}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-sans text-muted">
                                      {fmtINR(i.rate, currencyDecimalPlaces)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-sans text-muted">
                                      {fmtINR(i.supply_rate, currencyDecimalPlaces)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-sans text-muted">
                                      {fmtINR(i.installation_rate, currencyDecimalPlaces)}
                                    </td>
                                    <td className="py-1.5 px-2 text-right font-sans font-semibold text-muted">
                                      {fmtINR(amountOf(i), currencyDecimalPlaces)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t border-border-custom">
                                  <td colSpan={6} className="py-2 pl-1 font-bold text-foreground">
                                    Subtotal
                                  </td>
                                  <td className="py-2 px-2 text-right font-bold text-foreground font-sans">
                                    {fmtINR(docItems.reduce((s, i) => s + amountOf(i), 0), currencyDecimalPlaces)}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add BOQ modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-border-custom bg-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">New BOQ Document</h3>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-foreground">
                ✕
              </button>
            </div>
            <form onSubmit={createDoc} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted">BOQ Subject (Title)</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. BOQ for Tower A - Finishes"
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Client Name</label>
                {!showParty ? (
                  <div className="mt-1 space-y-2">
                    <input
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Search clients..."
                      className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                    />
                    <select
                      value={clientId || ""}
                      onChange={(e) => setClientId(e.target.value || null)}
                      className="w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground"
                    >
                      <option value="">— Select client —</option>
                      {filteredClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowParty(true)}
                      className="text-[11px] text-primary hover:underline"
                    >
                      + Add Party
                    </button>
                  </div>
                ) : (
                  <div className="mt-1 flex gap-2">
                    <input
                      value={partyName}
                      onChange={(e) => setPartyName(e.target.value)}
                      placeholder="New client name"
                      className="flex-1 bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                    />
                    <button
                      type="button"
                      onClick={createParty}
                      disabled={savingParty || !partyName.trim()}
                      className="px-3 py-2 bg-primary text-white text-xs font-bold rounded-lg disabled:opacity-40"
                    >
                      {savingParty ? "..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowParty(false)}
                      className="px-3 py-2 bg-elevated text-muted text-xs rounded-lg"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted">Milestone Done</label>
                  <input
                    type="number"
                    min={0}
                    value={milestoneDone}
                    onChange={(e) => setMilestoneDone(Math.max(0, Number(e.target.value) || 0))}
                    className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted">Milestone Total</label>
                  <input
                    type="number"
                    min={0}
                    value={milestoneTotal}
                    onChange={(e) => setMilestoneTotal(Math.max(0, Number(e.target.value) || 0))}
                    className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Terms &amp; Conditions</label>
                <textarea
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  placeholder="Pre-filled from company BOQ Terms; edit as needed"
                  rows={3}
                  className="mt-1 w-full bg-input border border-border-custom rounded-lg px-3 py-2 text-sm text-foreground placeholder-muted"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-4 py-2 bg-elevated text-muted text-sm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDoc || !title.trim()}
                  className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg disabled:opacity-40"
                >
                  {savingDoc ? "Creating..." : "Create BOQ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}