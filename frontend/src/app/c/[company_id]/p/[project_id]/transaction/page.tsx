"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { getApi, authHeaders, fmtINR } from "@/lib/siteflow";
import { useCompanySettings } from "@/context/CompanySettingsContext";
import ZatcaInvoicePanel from "@/components/ZatcaInvoicePanel";
import { CustomFieldsSection, useCustomFields } from "@/components/CustomFieldsSection";
import { UNITS } from "@/lib/units";

// ── Transaction taxonomy (exact list from build spec) ────────────────────────
type Endpoint = "bill" | "debit" | "credit" | "request";
type TxnType = {
  key: string;
  label: string;
  endpoint: Endpoint;
  direction: "in" | "out";
  paymentMode?: boolean; // Payment In / Payment Out → Cash/Bank/Cheque conditional fields
};

const INVOICE_TYPES_IN = ["payment_in", "sales_invoice", "material_sales", "i_received", "sale", "material_sale"];

const REVENUE_TYPES = ["sale", "material_sale"];
const EXPENSE_TYPES = ["purchase", "subcon", "expense", "equipment"];
const SETTLEMENT_TYPES = ["payment_in", "payment_out", "i_paid", "i_received"];

const TAXONOMY: TxnType[] = [
  { key: "payment_in", label: "Payment In", endpoint: "bill", direction: "in", paymentMode: true },
  { key: "payment_out", label: "Payment Out", endpoint: "bill", direction: "out", paymentMode: true },
  { key: "debit_note", label: "Debit Note", endpoint: "debit", direction: "out" },
  { key: "credit_note", label: "Credit Note", endpoint: "credit", direction: "in" },
  { key: "party_to_party_payment", label: "Party-to-Party Payment", endpoint: "request", direction: "out" },
  { key: "sales_invoice", label: "Sales Invoice", endpoint: "bill", direction: "in" },
  { key: "material_sales", label: "Material Sales", endpoint: "bill", direction: "in" },
  { key: "material_purchase", label: "Material Purchase", endpoint: "bill", direction: "out" },
  { key: "material_return", label: "Material Return", endpoint: "credit", direction: "in" },
  { key: "material_transfer", label: "Material Transfer", endpoint: "bill", direction: "out" },
  { key: "other_expense", label: "Other Expense", endpoint: "bill", direction: "out" },
  { key: "equipment_expense", label: "Equipment Expense", endpoint: "bill", direction: "out" },
  { key: "i_paid", label: "I Paid", endpoint: "bill", direction: "out" },
  { key: "i_received", label: "I Received", endpoint: "bill", direction: "in" },
  { key: "payment_request", label: "Payment Request", endpoint: "request", direction: "out" },
];

const isInType = (t: string) => INVOICE_TYPES_IN.includes(t);

// ── Backend shapes ───────────────────────────────────────────────────────────
type Bill = {
  id: string;
  invoice_number: string;
  invoice_date: string;
  due_date: string | null;
  invoice_type: string;
  status: string;
  party_company_user_id: string;
  subtotal: number;
  gst_amount: number;
  total_payable: number;
  paid_amount: number;
  approval_flag: string;
  deductions: { deduction_type: string; amount: number }[];
};
type Note = {
  id: string;
  party_company_user_id: string;
  notes: string | null;
  total_amount: number;
  reference_number: string | null;
  created_at: string;
};
type PRequest = {
  id: string;
  party_company_user_id: string;
  amount: number;
  details: string | null;
  status: string;
  due_date: string | null;
  approval_status: string;
  request_type: string;
  created_at: string;
};
type Member = { company_team_id: string; user_id: string | null; name: string; role: string | null };
type CostCode = { id: string; code: string; name: string };

type LedgerRow = {
  id: string;
  date: string;
  type: string;
  party: string;
  amount: number;
  direction: "in" | "out";
  kind: string;
  ref: string;
  status: string;
};

function Card({ label, value, tone }: { label: string; value: string; tone?: "emerald" | "rose" | "violet" }) {
  const color = tone === "emerald" ? "text-emerald-500" : tone === "rose" ? "text-rose-500" : tone === "violet" ? "text-violet-500" : "text-foreground";
  return (
    <div className="rounded-lg border border-border-custom bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-lg border border-border-custom bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-xs font-medium text-muted">{children}</div>;
}

export default function TransactionPage() {
  const { currencyDecimalPlaces } = useCompanySettings();
  const params = useParams();
  const companyId = params.company_id as string;
  const projectId = params.project_id as string;

  const [bills, setBills] = useState<Bill[]>([]);
  const [debits, setDebits] = useState<Note[]>([]);
  const [credits, setCredits] = useState<Note[]>([]);
  const [requests, setRequests] = useState<PRequest[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [costCodes, setCostCodes] = useState<CostCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [zatcaBillId, setZatcaBillId] = useState<string | null>(null);
  const [zatcaEnabled, setZatcaEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cid = companyId;
      const [bRes, dRes, cRes, rRes, mRes, ccRes, sRes] = await Promise.all([
        fetch(getApi(`/billing/bills?project_id=${projectId}`), { headers: authHeaders() }),
        fetch(getApi(`/billing/debit-notes?project_id=${projectId}`), { headers: authHeaders() }),
        fetch(getApi(`/billing/credit-notes?project_id=${projectId}`), { headers: authHeaders() }),
        fetch(getApi(`/finance/payment-requests/${cid}`), { headers: authHeaders() }),
        fetch(getApi(`/projects/${projectId}/members`), { headers: authHeaders() }),
        fetch(getApi(`/library/cost-codes/${cid}`), { headers: authHeaders() }),
        fetch(getApi(`/settings/company/${cid}`), { headers: authHeaders() }),
      ]);
      if (bRes.ok) setBills(await bRes.json());
      if (dRes.ok) setDebits(await dRes.json());
      if (cRes.ok) setCredits(await cRes.json());
      if (rRes.ok) setRequests(await rRes.json());
      if (mRes.ok) setMembers(await mRes.json());
      if (ccRes.ok) setCostCodes(await ccRes.json());
      if (sRes.ok) setZatcaEnabled(Boolean((await sRes.json()).is_zatca_enable));
    } catch (e) {
      setError("Failed to load transactions.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [companyId, projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const memberName = useCallback(
    (id: string | undefined) => members.find((m) => m.company_team_id === id || m.user_id === id)?.name || "—",
    [members]
  );

  // ── Summary cards (wired to real bill data) ────────────────────────────────
  const { totalIn, totalOut, sales, expense, balance, margin } = useMemo(() => {
    let totalIn = 0, totalOut = 0, sales = 0, expense = 0;
    for (const b of bills) {
      const amt = Number(b.total_payable) || 0;
      const sub = Number(b.subtotal) || 0;
      const t = b.invoice_type;

      if (REVENUE_TYPES.includes(t)) {
        sales += sub;
      } else if (EXPENSE_TYPES.includes(t)) {
        expense += sub;
      } else if (SETTLEMENT_TYPES.includes(t)) {
        if (t === "payment_in" || t === "i_received") {
          totalIn += amt;
        } else if (t === "payment_out" || t === "i_paid") {
          totalOut += amt;
        }
      }
    }
    return {
      totalIn,
      totalOut,
      sales,
      expense,
      balance: totalIn - totalOut,
      margin: sales - expense,
    };
  }, [bills]);

  // ── Unified ledger ─────────────────────────────────────────────────────────
  const ledger: LedgerRow[] = useMemo(() => {
    const rows: LedgerRow[] = [];
    for (const b of bills)
      rows.push({
        id: b.id,
        date: b.invoice_date,
        type: b.invoice_type,
        party: memberName(b.party_company_user_id),
        amount: Number(b.total_payable) || 0,
        direction: isInType(b.invoice_type) ? "in" : "out",
        kind: "Bill",
        ref: b.invoice_number,
        status: b.status,
      });
    for (const n of debits)
      rows.push({ id: n.id, date: n.created_at, type: "debit_note", party: memberName(n.party_company_user_id), amount: Number(n.total_amount) || 0, direction: "out", kind: "Debit Note", ref: n.reference_number || "—", status: "—" });
    for (const n of credits)
      rows.push({ id: n.id, date: n.created_at, type: "credit_note", party: memberName(n.party_company_user_id), amount: Number(n.total_amount) || 0, direction: "in", kind: "Credit Note", ref: n.reference_number || "—", status: "—" });
    for (const r of requests)
      rows.push({ id: r.id, date: r.created_at, type: r.request_type || "payment_request", party: memberName(r.party_company_user_id), amount: Number(r.amount) || 0, direction: "out", kind: "Payment Request", ref: "—", status: r.approval_status });
    return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [bills, debits, credits, requests, memberName]);

  const filtered = ledger.filter((r) => {
    if (typeFilter !== "All" && r.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.party.toLowerCase().includes(q) && !r.ref.toLowerCase().includes(q) && !r.type.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Project Transactions</h1>
          <p className="text-sm text-muted">Balance, margin &amp; the full transaction taxonomy for this project.</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="ml-auto rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Add Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card label="Total In" value={fmtINR(totalIn, currencyDecimalPlaces)} tone="emerald" />
        <Card label="Total Out" value={fmtINR(totalOut, currencyDecimalPlaces)} tone="rose" />
        <Card label="Project Balance (In − Out)" value={fmtINR(balance, currencyDecimalPlaces)} tone={balance >= 0 ? "emerald" : "rose"} />
        <Card label="Margin (Sales − Expense)" value={fmtINR(margin, currencyDecimalPlaces)} tone="violet" />
      </div>

      {error && <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-400">{error}</div>}

      {/* Taxonomy filter + search */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTypeFilter("All")}
          className={`rounded-full px-3 py-1 text-xs font-medium border ${typeFilter === "All" ? "bg-primary/15 text-primary border-primary" : "border-border-custom text-muted hover:text-foreground"}`}
        >
          All
        </button>
        {TAXONOMY.map((t) => (
          <button
            key={t.key}
            onClick={() => setTypeFilter(t.key)}
            className={`rounded-full px-3 py-1 text-xs font-medium border ${typeFilter === t.key ? "bg-primary/15 text-primary border-primary" : "border-border-custom text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search party / ref / type"
          className="ml-auto min-w-[200px] flex-1 rounded-md border border-border-custom bg-card px-3 py-2 text-sm text-foreground"
        />
      </div>

      {/* Ledger table */}
      <div className="rounded-lg border border-border-custom overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-elevated text-muted">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Date</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Party</th>
              <th className="text-left px-4 py-3 font-medium">Ref</th>
              <th className="text-right px-4 py-3 font-medium">Amount</th>
              <th className="text-left px-4 py-3 font-medium">Status</th>
              {zatcaEnabled && <th className="text-left px-4 py-3 font-medium">ZATCA</th>}
            </tr>
          </thead>
          <tbody>
            {loading &&               <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted">No transactions for this filter.</td></tr>
            )}
            {!loading && filtered.map((r) => (
              <tr key={`${r.kind}-${r.id}`} className="border-t border-border-custom hover:bg-elevated/50">
                <td className="px-4 py-3 text-muted whitespace-nowrap">{r.date ? r.date.slice(0, 10) : "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">{r.type.replace(/_/g, " ")}</span>
                </td>
                <td className="px-4 py-3 text-foreground">{r.party}</td>
                <td className="px-4 py-3 text-muted">{r.ref}</td>
                <td className={`px-4 py-3 text-right font-medium ${r.direction === "in" ? "text-emerald-500" : "text-rose-500"}`}>
                  {r.direction === "in" ? "+" : "−"}
                  {fmtINR(r.amount, currencyDecimalPlaces)}
                </td>
                <td className="px-4 py-3 text-muted">{r.status}</td>
                <td className="px-4 py-3">
                  {zatcaEnabled && r.kind === "Bill" && r.type === "sale" ? (
                    <button
                      type="button"
                      onClick={() => setZatcaBillId(r.id)}
                      className="rounded-md border border-border-custom px-2 py-1 text-xs text-muted hover:border-primary hover:text-foreground"
                    >
                      ZATCA
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <NewTransactionModal
          companyId={companyId}
          projectId={projectId}
          members={members}
          costCodes={costCodes}
          onClose={() => setAddOpen(false)}
          onCreated={() => { setAddOpen(false); load(); }}
        />
      )}

      {zatcaBillId && (
        <Modal title="ZATCA E-Invoice" onClose={() => setZatcaBillId(null)}>
          <ZatcaInvoicePanel
            billId={zatcaBillId}
            companyId={companyId}
            onClose={() => setZatcaBillId(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ── New Transaction modal (full taxonomy + shared sub-entities) ──────────────
function NewTransactionModal({
  companyId, projectId, members, costCodes, onClose, onCreated,
}: {
  companyId: string;
  projectId: string;
  members: Member[];
  costCodes: CostCode[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { currencyDecimalPlaces } = useCompanySettings();
  const [typeKey, setTypeKey] = useState<string>(TAXONOMY[0].key);
  const cfg = TAXONOMY.find((t) => t.key === typeKey)!;
  const isSalesInvoice = cfg.key === "sales_invoice";

  // Custom Fields (Settings → Custom Fields, entity_type="invoice") — only surfaced
  // for the Sales Invoice transaction type, which is the entity this framework is wired to.
  const customFields = useCustomFields(companyId, "invoice");

  const [partyId, setPartyId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [gstPct, setGstPct] = useState("18");
  const [preTax, setPreTax] = useState(false);
  const [shipTo, setShipTo] = useState("");

  // Add Item rows (subtotal calculator; cost code from library)
  const [items, setItems] = useState<{ desc: string; costCodeId: string; unit: string; qty: string; rate: string }[]>([]);
  // Deduction rows
  const [deductions, setDeductions] = useState<{ type: string; mode: "amount" | "percent"; value: string; notes: string }[]>([]);
  const [retentionPct, setRetentionPct] = useState("");

  // Payment mode (Cash / Bank / Cheque) for Payment In / Out
  const [payMode, setPayMode] = useState<"Cash" | "Bank" | "Cheque">("Cash");
  const [bankName, setBankName] = useState("");
  const [txnRef, setTxnRef] = useState("");
  const [chequeNo, setChequeNo] = useState("");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // BOQ linkage (for Billed Value on the BOQ tab)
  const [boqDocId, setBoqDocId] = useState("");
  const [boqDocs, setBoqDocs] = useState<{ id: string; title: string; client_name: string | null }[]>([]);
  useEffect(() => {
    let alive = true;
    fetch(getApi(`/budgeting/boq-documents?project_id=${projectId}`), { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (alive) setBoqDocs(d); })
      .catch(() => {});
    return () => { alive = false; };
  }, [projectId]);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), 0),
    [items]
  );

  const addItem = () => setItems((s) => [...s, { desc: "", costCodeId: "", unit: "", qty: "", rate: "" }]);
  const addDeduction = () => setDeductions((s) => [...s, { type: "TDS", mode: "percent", value: "", notes: "" }]);

  const selectedMember = members.find((m) => m.company_team_id === partyId || m.user_id === partyId);

  const submit = async () => {
    setErr(null);
    if (!partyId) { setErr("Select a party."); return; }
    if (!invoiceNumber && cfg.endpoint === "bill") { setErr("Invoice / reference number is required."); return; }
    if (subtotal <= 0 && cfg.endpoint === "bill") { setErr("Add at least one line item with qty × rate > 0."); return; }
    if (isSalesInvoice) {
      const cfError = customFields.validate();
      if (cfError) { setErr(cfError); return; }
    }

    setSaving(true);
    try {
      const cid = companyId;
      const member = members.find((m) => m.company_team_id === partyId || m.user_id === partyId);
      if (!member) throw new Error("Party not found");
      const dt = `${date}T00:00:00`;
      const due = dueDate ? `${dueDate}T00:00:00` : null;

      const itemsJson = JSON.stringify(
        items.map((it) => {
          const cc = costCodes.find((c) => c.id === it.costCodeId);
          return {
            desc: it.desc,
            cost_code_id: it.costCodeId || null,
            cost_code_name: cc ? `${cc.code} · ${cc.name}` : null,
            unit: it.unit || null,
            qty: parseFloat(it.qty) || 0,
            rate: parseFloat(it.rate) || 0,
            amount: (parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0),
          };
        })
      );

      const dedPayload = deductions
        .filter((d) => d.value)
        .map((d) => ({
          deduction_type: d.type,
          amount: d.mode === "amount" ? parseFloat(d.value) : 0,
          percentage: d.mode === "percent" ? parseFloat(d.value) : null,
          notes: d.notes || null,
        }));
      if (retentionPct) {
        const rp = parseFloat(retentionPct);
        if (!isNaN(rp) && rp > 0) dedPayload.push({ deduction_type: "Retention", amount: 0, percentage: rp, notes: "Auto retention" });
      }

      let res: Response;
      if (cfg.endpoint === "bill") {
        const canonicalType = {
          sales_invoice: "sale",
          material_sales: "material_sale",
          material_purchase: "purchase",
          other_expense: "expense",
          equipment_expense: "equipment",
          payment_in: "payment_in",
          payment_out: "payment_out",
          i_paid: "i_paid",
          i_received: "i_received",
          material_transfer: "material_transfer",
          material_return: "material_return",
        }[cfg.key] || cfg.key;

        res = await fetch(getApi(`/billing/bills`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({
            company_id: cid,
            project_id: projectId,
            party_company_user_id: member.company_team_id,
            invoice_number: invoiceNumber,
            invoice_date: dt,
            due_date: due,
            invoice_type: canonicalType,
            subtotal: subtotal,
            gst_pct: parseFloat(gstPct) || 0,
            deductions: dedPayload,
            pre_tax_deductions: preTax,
            items_json: itemsJson,
            payment_mode: cfg.paymentMode ? payMode : null,
            payment_bank_name: cfg.paymentMode && payMode !== "Cash" ? bankName || null : null,
            payment_ref: cfg.paymentMode
              ? payMode === "Cheque"
                ? chequeNo || null
                : payMode === "Bank"
                ? txnRef || null
                : null
              : null,
            ship_to: shipTo || null,
            boq_document_id: boqDocId || null,
            custom_fields: isSalesInvoice ? customFields.toPayload() : [],
          }),
        });
      } else if (cfg.endpoint === "debit") {
        res = await fetch(getApi(`/billing/debit-notes`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({
            project_id: projectId,
            company_id: cid,
            party_company_user_id: member.company_team_id,
            notes: shipTo || null,
            total_amount: subtotal,
            reference_number: invoiceNumber || null,
          }),
        });
      } else if (cfg.endpoint === "credit") {
        res = await fetch(getApi(`/billing/credit-notes`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({
            project_id: projectId,
            company_id: cid,
            party_company_user_id: member.company_team_id,
            notes: shipTo || null,
            total_amount: subtotal,
            reference_number: invoiceNumber || null,
          }),
        });
      } else {
        res = await fetch(getApi(`/finance/payment-requests/${cid}`), {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
          body: JSON.stringify({
            project_id: projectId,
            party_company_user_id: member.user_id,
            amount: subtotal,
            details: shipTo || null,
            due_date: due,
            request_type: cfg.key,
            approval_status: "Pending",
          }),
        });
      }

      if (res.ok) onCreated();
      else {
        const body = await res.text();
        setErr(`Save failed (${res.status}): ${body.slice(0, 200)}`);
      }
    } catch (e: any) {
      setErr(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Add ${cfg.label}`} onClose={onClose}>
      {/* Type selector */}
      <Lbl>Transaction Type</Lbl>
      <select
        value={typeKey}
        onChange={(e) => setTypeKey(e.target.value)}
        className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground mb-3"
      >
        {TAXONOMY.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
      </select>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Lbl>Party (Bill To)</Lbl>
          <select value={partyId} onChange={(e) => setPartyId(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground">
            <option value="">— Select party —</option>
            {members.map((m) => (
              <option key={m.company_team_id} value={m.company_team_id}>{m.name}{m.role ? ` (${m.role})` : ""}</option>
            ))}
          </select>
        </div>

        {cfg.endpoint === "bill" && (
          <div className="col-span-2">
            <Lbl>Link to BOQ (Billed Value)</Lbl>
            <select
              value={boqDocId}
              onChange={(e) => setBoqDocId(e.target.value)}
              className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground"
            >
              <option value="">— No BOQ link —</option>
              {boqDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                  {d.client_name ? ` · ${d.client_name}` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <Lbl>{cfg.endpoint === "bill" ? "Invoice / Reference #" : "Reference #"}</Lbl>
          <input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
        </div>
        <div>
          <Lbl>Date</Lbl>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
        </div>

        {cfg.endpoint === "bill" && (
          <>
            <div>
              <Lbl>Due Date</Lbl>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
            </div>
            <div>
              <Lbl>GST %</Lbl>
              <input value={gstPct} onChange={(e) => setGstPct(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
            </div>
          </>
        )}

        {/* Payment mode conditional fields (Payment In / Out) */}
        {cfg.paymentMode && (
          <div className="col-span-2 rounded-md border border-border-custom p-3">
            <Lbl>Payment Mode</Lbl>
            <div className="flex gap-2 mb-2">
              {(["Cash", "Bank", "Cheque"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setPayMode(m)}
                  className={`rounded-md px-3 py-1 text-xs border ${payMode === m ? "bg-primary/15 text-primary border-primary" : "border-border-custom text-muted"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            {payMode !== "Cash" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Lbl>Bank Name</Lbl>
                  <input value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
                </div>
                {payMode === "Cheque" ? (
                  <div>
                    <Lbl>Cheque No.</Lbl>
                    <input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
                  </div>
                ) : (
                  <div>
                    <Lbl>Transaction Ref</Lbl>
                    <input value={txnRef} onChange={(e) => setTxnRef(e.target.value)} className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Add Item sub-entity */}
        {cfg.endpoint === "bill" && (
          <div className="col-span-2 rounded-md border border-border-custom p-3">
            <div className="flex items-center justify-between mb-2">
              <Lbl>Add Item</Lbl>
              <button type="button" onClick={addItem} className="text-xs rounded-md border border-border-custom px-2 py-1 text-muted hover:text-foreground">+ Add line</button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <input placeholder="Description" value={it.desc} onChange={(e) => setItems((s) => s.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} className="col-span-3 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground" />
                <select value={it.costCodeId} onChange={(e) => setItems((s) => s.map((x, j) => j === i ? { ...x, costCodeId: e.target.value } : x))} className="col-span-2 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground">
                  <option value="">Cost Code</option>
                  {costCodes.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                </select>
                <select value={it.unit} onChange={(e) => setItems((s) => s.map((x, j) => j === i ? { ...x, unit: e.target.value } : x))} className="col-span-2 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground">
                  <option value="">Unit</option>
                  {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
                <input type="number" placeholder="Qty" value={it.qty} onChange={(e) => setItems((s) => s.map((x, j) => j === i ? { ...x, qty: e.target.value } : x))} className="col-span-2 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground" />
                <input type="number" placeholder="Rate" value={it.rate} onChange={(e) => setItems((s) => s.map((x, j) => j === i ? { ...x, rate: e.target.value } : x))} className="col-span-2 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground" />
                <div className="col-span-1 flex items-center justify-end text-sm text-muted">
                  {fmtINR((parseFloat(it.qty) || 0) * (parseFloat(it.rate) || 0), currencyDecimalPlaces)}
                </div>
              </div>
            ))}
            <div className="text-right text-sm font-medium text-foreground">Subtotal: {fmtINR(subtotal, currencyDecimalPlaces)}</div>
          </div>
        )}

        {/* Deduction + Retention sub-entities */}
        {cfg.endpoint === "bill" && (
          <div className="col-span-2 rounded-md border border-border-custom p-3">
            <div className="flex items-center justify-between mb-2">
              <Lbl>Deductions</Lbl>
              <button type="button" onClick={addDeduction} className="text-xs rounded-md border border-border-custom px-2 py-1 text-muted hover:text-foreground">+ Add deduction</button>
            </div>
            {deductions.map((d, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2">
                <select value={d.type} onChange={(e) => setDeductions((s) => s.map((x, j) => j === i ? { ...x, type: e.target.value } : x))} className="col-span-4 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground">
                  <option value="TDS">TDS</option>
                  <option value="Retention">Retention</option>
                  <option value="Security Deposit">Security Deposit</option>
                  <option value="Advance Recovery">Advance Recovery</option>
                  <option value="Material Recovery">Material Recovery</option>
                </select>
                <select value={d.mode} onChange={(e) => setDeductions((s) => s.map((x, j) => j === i ? { ...x, mode: e.target.value as any } : x))} className="col-span-2 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground">
                  <option value="amount">₹ Amt</option>
                  <option value="percent">% </option>
                </select>
                <input type="number" placeholder="Value" value={d.value} onChange={(e) => setDeductions((s) => s.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className="col-span-2 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground" />
                <input placeholder="Notes" value={d.notes} onChange={(e) => setDeductions((s) => s.map((x, j) => j === i ? { ...x, notes: e.target.value } : x))} className="col-span-4 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground" />
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <Lbl>Retention %</Lbl>
              <input type="number" value={retentionPct} onChange={(e) => setRetentionPct(e.target.value)} placeholder="e.g. 5" className="w-24 rounded-md border border-border-custom bg-background px-2 py-1.5 text-sm text-foreground" />
              <label className="flex items-center gap-2 text-sm text-muted ml-3">
                <input type="checkbox" checked={preTax} onChange={(e) => setPreTax(e.target.checked)} /> Pre-tax deductions
              </label>
            </div>
          </div>
        )}

        {/* Custom Fields (Settings → Custom Fields, entity_type="invoice") */}
        {isSalesInvoice && (
          <CustomFieldsSection
            fields={customFields.fields}
            values={customFields.values}
            setValue={customFields.setValue}
          />
        )}

        {/* Bill / Ship addressing */}
        <div className="col-span-2">
          <Lbl>Ship To (addressing)</Lbl>
          <input value={shipTo} onChange={(e) => setShipTo(e.target.value)} placeholder="Optional ship-to / notes" className="w-full rounded-md border border-border-custom bg-background px-3 py-2 text-sm text-foreground" />
        </div>
      </div>

      {err && <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-400">{err}</div>}

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="rounded-md border border-border-custom px-4 py-2 text-sm text-foreground hover:border-primary">Cancel</button>
        <button onClick={submit} disabled={saving} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-40">
          {saving ? "Saving…" : "Save Transaction"}
        </button>
      </div>
    </Modal>
  );
}
