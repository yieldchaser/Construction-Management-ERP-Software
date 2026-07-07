"use client";
import { getApiHost } from "@/lib/api";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import PwaControls from "@/components/pwa/PwaControls";

interface CompanySettings {
  id: string;
  name: string;
  legal_business_name?: string | null;
  gstin?: string | null;
  billing_address?: string | null;
  currency_decimal_places: number;
  quantity_decimal_places: number;
  back_dated_limit_days: number;
  negative_stock_lock: boolean;
  bom_restriction: boolean;
  po_restriction: boolean;
  material_request_restriction: boolean;
  negative_balance_warning: boolean;
  custom_pdf_template_enabled: boolean;
  google_sheets_auth_phone?: string | null;
}

interface Branch {
  id: string;
  branch_name: string;
  gstin: string;
  billing_address: string;
  created_at: string;
}

interface ApprovalRule {
  id: string;
  feature_type: string;
  min_amount: number;
  max_amount?: number | null;
  levels: number;
  approvers: string;
}

interface Holiday {
  id: string;
  name: string;
  date: string;
}

export default function CompanySettingsPage() {
  const { company_id } = useParams();
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [draft, setDraft] = useState<Partial<CompanySettings>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "branches" | "workflow" | "approvals" | "holidays">("details");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Form states for new branch
  const [newBranch, setNewBranch] = useState({ name: "", gstin: "", address: "" });
  const [showAddBranch, setShowAddBranch] = useState(false);

  // Form states for new approval rule
  const [newRule, setNewRule] = useState({ feature: "purchase_order", min: 0, max: "", levels: 1, approvers: "" });
  const [showAddRule, setShowAddRule] = useState(false);

  // Form states for new holiday
  const [newHoliday, setNewHoliday] = useState({ name: "", date: "" });
  const [showAddHoliday, setShowAddHoliday] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const apiHost = `${getApiHost()}`;

  useEffect(() => {
    if (!company_id) return;
    setLoading(true);

    // Fetch Settings
    fetch(`${apiHost}/apis/v3/settings/company/${company_id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load settings");
        return res.json();
      })
      .then((data) => setSettings(data))
      .catch((err) => setError(err.message));

    // Fetch Branches
    fetch(`${apiHost}/apis/v3/settings/branches/${company_id}`)
      .then((res) => res.json())
      .then((data) => setBranches(data))
      .catch(() => {});

    // Fetch Approval Rules
    fetch(`${apiHost}/apis/v3/settings/approval-rules/${company_id}`)
      .then((res) => res.json())
      .then((data) => setRules(data))
      .catch(() => {});

    // Fetch Holidays
    fetch(`${apiHost}/apis/v3/settings/holidays/${company_id}`)
      .then((res) => res.json())
      .then((data) => setHolidays(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [company_id]);

  const handleUpdateSettings = async (updates: Partial<CompanySettings>) => {
    if (!settings) return;
    setSaveStatus("saving");
    try {
      const res = await fetch(`${apiHost}/apis/v3/settings/company/${company_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
        setDraft({});
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } else {
        setSaveStatus("error");
      }
    } catch (err) {
      console.error(err);
      setSaveStatus("error");
    }
  };

  const handleDraftChange = useCallback((updates: Partial<CompanySettings>) => {
    setDraft(prev => ({ ...prev, ...updates }));
    setSaveStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleUpdateSettings(updates);
    }, 800);
  }, [settings, company_id, apiHost]);

  const validateGSTIN = (gstin: string): boolean => {
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin.toUpperCase());
  };

  const [gstinError, setGstinError] = useState(false);

  const FEATURE_LABELS: Record<string, string> = {
    purchase_order: "Purchase Orders (PO)",
    material_request: "Material Requests",
    expense: "Expenses & Petty Cash",
    ra_bill: "RA / Subcontractor Bills",
    client_invoice: "Client Invoices",
    debit_note: "Debit Notes",
    credit_note: "Credit Notes",
    timesheet: "Timesheets",
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiHost}/apis/v3/settings/branches/${company_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_name: newBranch.name,
          gstin: newBranch.gstin,
          billing_address: newBranch.address,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setBranches([...branches, added]);
        setNewBranch({ name: "", gstin: "", address: "" });
        setShowAddBranch(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiHost}/apis/v3/settings/approval-rules/${company_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          feature_type: newRule.feature,
          min_amount: Number(newRule.min),
          max_amount: newRule.max ? Number(newRule.max) : null,
          levels: Number(newRule.levels),
          approvers: newRule.approvers,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setRules([...rules, added]);
        setNewRule({ feature: "purchase_order", min: 0, max: "", levels: 1, approvers: "" });
        setShowAddRule(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiHost}/apis/v3/settings/holidays/${company_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newHoliday.name,
          date: newHoliday.date ? `${newHoliday.date}T00:00:00` : null,
        }),
      });
      if (res.ok) {
        const added = await res.json();
        setHolidays([...holidays, added]);
        setNewHoliday({ name: "", date: "" });
        setShowAddHoliday(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-card text-muted">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-border-custom border-t-transparent mx-auto" />
          <div>Loading Settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-card text-zinc-100 font-sans antialiased selection:bg-primary/30 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 border-r border-border-custom bg-background flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center font-bold text-white shadow-lg shadow-primary/10">
              SF
            </div>
            <span className="text-sm font-extrabold tracking-wider text-white">SITEFLOW ERP</span>
          </div>
          <nav className="mt-8 space-y-1.5">
            <Link href={`/c/${company_id}/dashboard`} className="flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-semibold text-muted hover:bg-white/[0.03] hover:text-foreground transition-all duration-150">
              <span>🏠</span> Dashboard
            </Link>
            <Link href={`/c/${company_id}/analytics`} className="flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-semibold text-muted hover:bg-white/[0.03] hover:text-foreground transition-all duration-150">
              <span>📊</span> Analytics
            </Link>
            <span className="flex items-center gap-3 px-4 py-2.5 rounded-md text-xs font-semibold bg-primary/10 text-primary">
              <span>⚙️</span> Setting
            </span>
          </nav>
        </div>
        <div className="p-4 border-t border-border-custom text-[10px] text-muted font-mono">
          © SiteFlow | v8.22.0
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <header className="flex items-center justify-between border-b border-border-custom pb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Company Settings</h1>
            <p className="mt-1 text-xs text-muted">Configure global business profile, branches, workflow bounds, and sequential approvals.</p>
          </div>
          <PwaControls />
        </header>

        {/* Tab Selection */}
        <div className="mt-6 flex border-b border-border-custom gap-1 bg-elevated p-1 rounded-lg w-max">
          {(["details", "branches", "workflow", "approvals", "holidays"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-md text-xs font-bold capitalize transition-all duration-200 ${
                activeTab === tab
                  ? "bg-primary text-white shadow-lg shadow-primary/10"
                  : "text-muted hover:text-foreground hover:bg-elevated"
              }`}
            >
              {tab === "details" ? "Company Profile" : tab}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            {error}
          </div>
        )}
        {saveStatus === "saved" && (
          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
            Settings saved successfully
          </div>
        )}
        {saveStatus === "error" && (
          <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
            Failed to save settings. Please try again.
          </div>
        )}

        <div className="mt-8">
          {/* TAB 1: DETAILS */}
          {activeTab === "details" && settings && (
            <div className="bg-card border border-border-custom rounded-lg max-w-2xl border border-border-custom bg-background p-6 rounded-md space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-muted border-b border-border-custom pb-3">Business Profile Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted font-bold">Company Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    disabled
                    className="w-full bg-white/[0.03] border border-border-custom rounded-md px-4 py-2.5 text-xs text-muted cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted font-bold">Legal Business Name</label>
                  <input
                    type="text"
                    value={draft.legal_business_name ?? settings?.legal_business_name ?? ""}
                    onChange={(e) => handleDraftChange({ legal_business_name: e.target.value })}
                    className="w-full bg-elevated border border-border-custom focus:border-border-custom focus:ring-1 focus:ring-primary rounded-md px-4 py-2.5 text-xs text-white transition-all outline-none"
                    placeholder="Enter Legal Entity Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted font-bold">GSTIN</label>
                  <input
                    type="text"
                    value={draft.gstin ?? settings?.gstin ?? ""}
                    onChange={(e) => {
                      const v = e.target.value.toUpperCase();
                      handleDraftChange({ gstin: v });
                      if (v && !validateGSTIN(v)) {
                        setGstinError(true);
                      } else {
                        setGstinError(false);
                      }
                    }}
                    className={`w-full bg-elevated border rounded-md px-4 py-2.5 text-xs text-white transition-all outline-none ${gstinError ? "border-rose-500 focus:border-rose-500" : "border-border-custom focus:border-border-custom focus:ring-1 focus:ring-primary"}`}
                    placeholder="Enter 15-digit GSTIN"
                  />
                  {gstinError && (
                    <p className="text-[10px] text-rose-400 mt-1">Invalid GSTIN format. Expected: 2 digits + 5 letters + 4 digits + 1 letter + 1 digit/letter + Z + 1 digit/letter</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-muted font-bold">Primary Address</label>
                  <input
                    type="text"
                    value={draft.billing_address ?? settings?.billing_address ?? ""}
                    onChange={(e) => handleDraftChange({ billing_address: e.target.value })}
                    className="w-full bg-elevated border border-border-custom focus:border-border-custom focus:ring-1 focus:ring-primary rounded-md px-4 py-2.5 text-xs text-white transition-all outline-none"
                    placeholder="Enter Business Address"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BRANCHES */}
          {activeTab === "branches" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-muted">Company Branches</h2>
                <button
                  onClick={() => setShowAddBranch(true)}
                  className="bg-primary hover:bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-md transition-all shadow-md shadow-primary/5"
                >
                  + Add Branch
                </button>
              </div>

              {showAddBranch && (
                <form onSubmit={handleAddBranch} className="bg-card border border-border-custom rounded-lg max-w-xl border border-border-custom bg-background p-6 rounded-md space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">New Branch Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Branch Name (e.g. Mumbai Main)"
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                      required
                      className="bg-elevated border border-border-custom focus:border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Branch GSTIN"
                      value={newBranch.gstin}
                      onChange={(e) => setNewBranch({ ...newBranch, gstin: e.target.value })}
                      required
                      className="bg-elevated border border-border-custom focus:border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Billing Address"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                    required
                    className="w-full bg-elevated border border-border-custom focus:border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddBranch(false)} className="text-muted hover:text-foreground text-xs font-bold px-4 py-2">
                      Cancel
                    </button>
                    <button type="submit" className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-md">
                      Save Branch
                    </button>
                  </div>
                </form>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {branches.length === 0 ? (
                  <div className="col-span-full text-center p-8 border border-dashed border-border-custom rounded-md text-muted text-xs">
                    No branches configured.
                  </div>
                ) : (
                  branches.map((b) => (
                    <div key={b.id} className="bg-card border border-border-custom rounded-lg border border-border-custom bg-background p-5 rounded-lg space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-white text-sm">{b.branch_name}</div>
                        <span className="text-[10px] bg-zinc-800 text-muted px-2 py-0.5 rounded-full font-mono">Active</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="text-muted">GSTIN: <span className="font-mono text-zinc-300">{b.gstin}</span></div>
                        <div className="text-muted line-clamp-2">Address: <span className="text-zinc-300">{b.billing_address}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WORKFLOW */}
          {activeTab === "workflow" && settings && (
            <div className="bg-card border border-border-custom rounded-lg max-w-2xl border border-border-custom bg-background p-6 rounded-md space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-muted border-b border-border-custom pb-3">Workflow Restriction Controls</h2>
              
              <div className="space-y-4">
                {/* Currency Precision */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-semibold text-white">Currency Decimal Precision</div>
                    <div className="text-[10px] text-muted">Decimals to display on payouts, rates, and margins.</div>
                  </div>
                  <select
                    value={settings.currency_decimal_places}
                     onChange={(e) => handleDraftChange({ currency_decimal_places: Number(e.target.value) })}
                    className="bg-card border border-border-custom rounded-md px-3 py-1.5 text-xs text-white"
                  >
                    <option value={0}>0 Decimals</option>
                    <option value={1}>1 Decimal</option>
                    <option value={2}>2 Decimals</option>
                    <option value={3}>3 Decimals</option>
                  </select>
                </div>

                {/* Quantity Precision */}
                <div className="flex items-center justify-between py-2 border-t border-border-custom">
                  <div>
                    <div className="text-xs font-semibold text-white">Quantity Decimal Precision</div>
                    <div className="text-[10px] text-muted">Decimals to display on materials, stock, and indents.</div>
                  </div>
                  <select
                    value={settings.quantity_decimal_places}
                     onChange={(e) => handleDraftChange({ quantity_decimal_places: Number(e.target.value) })}
                    className="bg-card border border-border-custom rounded-md px-3 py-1.5 text-xs text-white"
                  >
                    <option value={0}>0 Decimals</option>
                    <option value={1}>1 Decimal</option>
                    <option value={2}>2 Decimals</option>
                    <option value={3}>3 Decimals</option>
                    <option value={4}>4 Decimals</option>
                  </select>
                </div>

                {/* Backdated Locks */}
                <div className="flex items-center justify-between py-2 border-t border-border-custom">
                  <div>
                    <div className="text-xs font-semibold text-white">Backdated Lock Limit</div>
                    <div className="text-[10px] text-muted">Allow logging entries up to X days in the past.</div>
                  </div>
                  <input
                    type="number"
                    value={settings.back_dated_limit_days}
                     onChange={(e) => handleDraftChange({ back_dated_limit_days: Number(e.target.value) })}
                    className="w-20 bg-card border border-border-custom rounded-md px-3 py-1 text-xs text-white text-center"
                    min={0}
                    max={180}
                  />
                </div>

                {/* Negative Stock Lock */}
                <div className="flex items-center justify-between py-2 border-t border-border-custom">
                  <div>
                    <div className="text-xs font-semibold text-white">Negative Stock Lock</div>
                    <div className="text-[10px] text-muted">Prevent material transfers or issues exceeding available stock.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.negative_stock_lock}
                     onChange={(e) => handleDraftChange({ negative_stock_lock: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </div>

                {/* BOM Restrict */}
                <div className="flex items-center justify-between py-2 border-t border-border-custom">
                  <div>
                    <div className="text-xs font-semibold text-white">BOM Budget Restrict</div>
                    <div className="text-[10px] text-muted">Prevent ordering items not listed or exceeding Bill of Materials.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.bom_restriction}
                     onChange={(e) => handleDraftChange({ bom_restriction: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </div>

                {/* PO Lock */}
                <div className="flex items-center justify-between py-2 border-t border-border-custom">
                  <div>
                    <div className="text-xs font-semibold text-white">Strict PO Restriction</div>
                    <div className="text-[10px] text-muted">Block GRNs that do not reference an active Purchase Order.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.po_restriction}
                     onChange={(e) => handleDraftChange({ po_restriction: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPROVALS */}
          {activeTab === "approvals" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-muted">Sequential Multi-Level Approvals</h2>
                <button
                  onClick={() => setShowAddRule(true)}
                  className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-md"
                >
                  + Configure Rule
                </button>
              </div>

              {showAddRule && (
                <form onSubmit={handleAddRule} className="bg-card border border-border-custom rounded-lg max-w-xl border border-border-custom bg-background p-6 rounded-md space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">New Approval Rule</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted">Feature Module</label>
                      <select
                        value={newRule.feature}
                        onChange={(e) => setNewRule({ ...newRule, feature: e.target.value })}
                        className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white"
                      >
                        <option value="purchase_order">Purchase Orders (PO)</option>
                        <option value="material_request">Material Requests</option>
                        <option value="expense">Expenses & Petty Cash</option>
                        <option value="ra_bill">RA / Subcontractor Bills</option>
                        <option value="client_invoice">Client Invoices</option>
                        <option value="debit_note">Debit Notes</option>
                        <option value="credit_note">Credit Notes</option>
                        <option value="timesheet">Timesheets</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted">Min Amount (Rs)</label>
                      <input
                        type="number"
                        value={newRule.min}
                        onChange={(e) => setNewRule({ ...newRule, min: Number(e.target.value) })}
                        required
                        className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted">Max Amount (Optional)</label>
                      <input
                        type="number"
                        placeholder="Leave blank for no upper bound"
                        value={newRule.max}
                        onChange={(e) => setNewRule({ ...newRule, max: e.target.value })}
                        className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-muted">Approval Levels</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={newRule.levels}
                        onChange={(e) => setNewRule({ ...newRule, levels: Number(e.target.value) })}
                        required
                        className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-muted">Approvers (Comma-separated emails/names)</label>
                    <input
                      type="text"
                      placeholder="e.g. pm@siteflow.com, cfo@siteflow.com"
                      value={newRule.approvers}
                      onChange={(e) => setNewRule({ ...newRule, approvers: e.target.value })}
                      required
                      className="w-full bg-card border border-border-custom rounded-md px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddRule(false)} className="text-muted hover:text-foreground text-xs font-bold px-4 py-2">
                      Cancel
                    </button>
                    <button type="submit" className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-md">
                      Save Rule
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {rules.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-border-custom rounded-md text-muted text-xs">
                    No approval rules defined. Items will auto-approve based on role permissions.
                  </div>
                ) : (
                  rules.map((r) => (
                    <div key={r.id} className="bg-card border border-border-custom rounded-lg border border-border-custom bg-background p-5 rounded-lg flex items-center justify-between">
                      <div className="space-y-1.5">
                         <div className="text-xs font-bold text-white capitalize">{FEATURE_LABELS[r.feature_type] || r.feature_type.replace("_", " ")}</div>
                        <div className="text-[11px] text-muted">
                          Threshold: <span className="font-semibold text-zinc-300">Rs {r.min_amount}</span> {r.max_amount ? `to Rs ${r.max_amount}` : "+"}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/10 px-2.5 py-1 rounded-md font-bold">
                          {r.levels}-Step Approval
                        </span>
                        <div className="text-[9px] text-muted mt-1 max-w-[200px] truncate">{r.approvers}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: HOLIDAYS */}
          {activeTab === "holidays" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-muted">Company Calendar Holidays</h2>
                <button
                  onClick={() => setShowAddHoliday(true)}
                  className="bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-md"
                >
                  + Add Holiday
                </button>
              </div>

              {showAddHoliday && (
                <form onSubmit={handleAddHoliday} className="bg-card border border-border-custom rounded-lg max-w-xl border border-border-custom bg-background p-6 rounded-md space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">New Holiday</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Holiday Name (e.g. Independence Day)"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      required
                      className="bg-elevated border border-border-custom focus:border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      required
                      className="bg-elevated border border-border-custom focus:border-border-custom rounded-md px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddHoliday(false)} className="text-muted hover:text-foreground text-xs font-bold px-4 py-2">
                      Cancel
                    </button>
                    <button type="submit" className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-md">
                      Save Holiday
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-hidden rounded-lg border border-border-custom bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-elevated text-[10px] uppercase tracking-[0.25em] text-muted font-bold">
                    <tr>
                      <th className="px-5 py-3 text-left">Holiday Event</th>
                      <th className="px-5 py-3 text-right">Calendar Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center p-8 text-muted text-xs">
                          No holidays logged.
                        </td>
                      </tr>
                    ) : (
                      holidays.map((h) => (
                        <tr key={h.id} className="border-t border-border-custom hover:bg-white/[0.015]">
                          <td className="px-5 py-3 font-semibold text-white">{h.name}</td>
                          <td className="px-5 py-3 text-right text-muted font-mono">
                            {new Date(h.date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
