"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rules, setRules] = useState<ApprovalRule[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activeTab, setActiveTab] = useState<"details" | "branches" | "workflow" | "approvals" | "holidays">("details");

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

  const apiHost = "http://localhost:8000";

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
    try {
      const res = await fetch(`${apiHost}/apis/v3/settings/company/${company_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSettings(updated);
      }
    } catch (err) {
      console.error(err);
    }
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
          date: new Date(newHoliday.date).toISOString(),
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
      <div className="flex h-screen items-center justify-center bg-[#0B0910] text-zinc-400">
        <div className="text-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#7C5CFF] border-t-transparent mx-auto" />
          <div>Loading Settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#0B0910] text-zinc-100 font-sans antialiased selection:bg-[#7C5CFF]/30 selection:text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 flex-shrink-0 border-r border-white/5 bg-[#0E0C15] flex flex-col justify-between">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-[#7C5CFF] to-[#00E5A3] flex items-center justify-center font-bold text-white shadow-lg shadow-[#7C5CFF]/20">
              SF
            </div>
            <span className="text-sm font-extrabold tracking-wider text-white">SITEFLOW ERP</span>
          </div>
          <nav className="mt-8 space-y-1.5">
            <Link href={`/c/${company_id}/dashboard`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-white/[0.03] hover:text-white transition-all duration-150">
              <span>🏠</span> Dashboard
            </Link>
            <Link href={`/c/${company_id}/analytics`} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:bg-white/[0.03] hover:text-white transition-all duration-150">
              <span>📊</span> Analytics
            </Link>
            <span className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#7C5CFF]/10 text-[#7C5CFF]">
              <span>⚙️</span> Setting
            </span>
          </nav>
        </div>
        <div className="p-4 border-t border-white/5 text-[10px] text-zinc-500 font-mono">
          © Onsite Teams | v8.22.0
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 p-8 overflow-y-auto max-h-screen">
        <header className="flex items-center justify-between border-b border-white/5 pb-6">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Company Settings</h1>
            <p className="mt-1 text-xs text-zinc-500">Configure global business profile, branches, workflow bounds, and sequential approvals.</p>
          </div>
          <PwaControls />
        </header>

        {/* Tab Selection */}
        <div className="mt-6 flex border-b border-white/5 gap-1 bg-white/[0.02] p-1 rounded-2xl w-max">
          {(["details", "branches", "workflow", "approvals", "holidays"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-xl text-xs font-bold capitalize transition-all duration-200 ${
                activeTab === tab
                  ? "bg-[#7C5CFF] text-white shadow-lg shadow-[#7C5CFF]/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/[0.02]"
              }`}
            >
              {tab === "details" ? "Company Profile" : tab}
            </button>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-2xl">
            {error}
          </div>
        )}

        <div className="mt-8">
          {/* TAB 1: DETAILS */}
          {activeTab === "details" && settings && (
            <div className="glass-panel max-w-2xl border border-white/5 bg-[#0E0C15] p-6 rounded-3xl space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400 border-b border-white/5 pb-3">Business Profile Details</h2>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Company Name</label>
                  <input
                    type="text"
                    value={settings.name}
                    disabled
                    className="w-full bg-white/[0.03] border border-white/5 rounded-xl px-4 py-2.5 text-xs text-zinc-400 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Legal Business Name</label>
                  <input
                    type="text"
                    value={settings.legal_business_name || ""}
                    onChange={(e) => handleUpdateSettings({ legal_business_name: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF] rounded-xl px-4 py-2.5 text-xs text-white transition-all outline-none"
                    placeholder="Enter Legal Entity Name"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">GSTIN</label>
                  <input
                    type="text"
                    value={settings.gstin || ""}
                    onChange={(e) => handleUpdateSettings({ gstin: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF] rounded-xl px-4 py-2.5 text-xs text-white transition-all outline-none"
                    placeholder="Enter 15-digit GSTIN"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Primary Address</label>
                  <input
                    type="text"
                    value={settings.billing_address || ""}
                    onChange={(e) => handleUpdateSettings({ billing_address: e.target.value })}
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] focus:ring-1 focus:ring-[#7C5CFF] rounded-xl px-4 py-2.5 text-xs text-white transition-all outline-none"
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
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Company Branches</h2>
                <button
                  onClick={() => setShowAddBranch(true)}
                  className="bg-[#7C5CFF] hover:bg-[#7D5CFF] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-md shadow-[#7C5CFF]/10"
                >
                  + Add Branch
                </button>
              </div>

              {showAddBranch && (
                <form onSubmit={handleAddBranch} className="glass-panel max-w-xl border border-white/5 bg-[#0E0C15] p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">New Branch Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Branch Name (e.g. Mumbai Main)"
                      value={newBranch.name}
                      onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
                      required
                      className="bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="text"
                      placeholder="Branch GSTIN"
                      value={newBranch.gstin}
                      onChange={(e) => setNewBranch({ ...newBranch, gstin: e.target.value })}
                      required
                      className="bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Billing Address"
                    value={newBranch.address}
                    onChange={(e) => setNewBranch({ ...newBranch, address: e.target.value })}
                    required
                    className="w-full bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddBranch(false)} className="text-zinc-500 hover:text-white text-xs font-bold px-4 py-2">
                      Cancel
                    </button>
                    <button type="submit" className="bg-[#7C5CFF] text-white text-xs font-bold px-4 py-2 rounded-xl">
                      Save Branch
                    </button>
                  </div>
                </form>
              )}

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {branches.length === 0 ? (
                  <div className="col-span-full text-center p-8 border border-dashed border-white/5 rounded-3xl text-zinc-500 text-xs">
                    No branches configured.
                  </div>
                ) : (
                  branches.map((b) => (
                    <div key={b.id} className="glass-panel border border-white/5 bg-[#0E0C15] p-5 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="font-bold text-white text-sm">{b.branch_name}</div>
                        <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">Active</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div className="text-zinc-500">GSTIN: <span className="font-mono text-zinc-300">{b.gstin}</span></div>
                        <div className="text-zinc-500 line-clamp-2">Address: <span className="text-zinc-300">{b.billing_address}</span></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: WORKFLOW */}
          {activeTab === "workflow" && settings && (
            <div className="glass-panel max-w-2xl border border-white/5 bg-[#0E0C15] p-6 rounded-3xl space-y-6">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400 border-b border-white/5 pb-3">Workflow Restriction Controls</h2>
              
              <div className="space-y-4">
                {/* Currency Precision */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <div className="text-xs font-semibold text-white">Currency Decimal Precision</div>
                    <div className="text-[10px] text-zinc-500">Decimals to display on payouts, rates, and margins.</div>
                  </div>
                  <select
                    value={settings.currency_decimal_places}
                    onChange={(e) => handleUpdateSettings({ currency_decimal_places: Number(e.target.value) })}
                    className="bg-[#0B0910] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value={0}>0 Decimals</option>
                    <option value={1}>1 Decimal</option>
                    <option value={2}>2 Decimals</option>
                    <option value={3}>3 Decimals</option>
                  </select>
                </div>

                {/* Quantity Precision */}
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <div className="text-xs font-semibold text-white">Quantity Decimal Precision</div>
                    <div className="text-[10px] text-zinc-500">Decimals to display on materials, stock, and indents.</div>
                  </div>
                  <select
                    value={settings.quantity_decimal_places}
                    onChange={(e) => handleUpdateSettings({ quantity_decimal_places: Number(e.target.value) })}
                    className="bg-[#0B0910] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white"
                  >
                    <option value={0}>0 Decimals</option>
                    <option value={1}>1 Decimal</option>
                    <option value={2}>2 Decimals</option>
                    <option value={3}>3 Decimals</option>
                    <option value={4}>4 Decimals</option>
                  </select>
                </div>

                {/* Backdated Locks */}
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <div className="text-xs font-semibold text-white">Backdated Lock Limit</div>
                    <div className="text-[10px] text-zinc-500">Allow logging entries up to X days in the past.</div>
                  </div>
                  <input
                    type="number"
                    value={settings.back_dated_limit_days}
                    onChange={(e) => handleUpdateSettings({ back_dated_limit_days: Number(e.target.value) })}
                    className="w-20 bg-[#0B0910] border border-white/10 rounded-xl px-3 py-1 text-xs text-white text-center"
                    min={0}
                    max={180}
                  />
                </div>

                {/* Negative Stock Lock */}
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <div className="text-xs font-semibold text-white">Negative Stock Lock</div>
                    <div className="text-[10px] text-zinc-500">Prevent material transfers or issues exceeding available stock.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.negative_stock_lock}
                    onChange={(e) => handleUpdateSettings({ negative_stock_lock: e.target.checked })}
                    className="h-4 w-4 accent-[#7C5CFF]"
                  />
                </div>

                {/* BOM Restrict */}
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <div className="text-xs font-semibold text-white">BOM Budget Restrict</div>
                    <div className="text-[10px] text-zinc-500">Prevent ordering items not listed or exceeding Bill of Materials.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.bom_restriction}
                    onChange={(e) => handleUpdateSettings({ bom_restriction: e.target.checked })}
                    className="h-4 w-4 accent-[#7C5CFF]"
                  />
                </div>

                {/* PO Lock */}
                <div className="flex items-center justify-between py-2 border-t border-white/5">
                  <div>
                    <div className="text-xs font-semibold text-white">Strict PO Restriction</div>
                    <div className="text-[10px] text-zinc-500">Block GRNs that do not reference an active Purchase Order.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.po_restriction}
                    onChange={(e) => handleUpdateSettings({ po_restriction: e.target.checked })}
                    className="h-4 w-4 accent-[#7C5CFF]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: APPROVALS */}
          {activeTab === "approvals" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Sequential Multi-Level Approvals</h2>
                <button
                  onClick={() => setShowAddRule(true)}
                  className="bg-[#7C5CFF] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  + Configure Rule
                </button>
              </div>

              {showAddRule && (
                <form onSubmit={handleAddRule} className="glass-panel max-w-xl border border-white/5 bg-[#0E0C15] p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">New Approval Rule</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-zinc-500">Feature Module</label>
                      <select
                        value={newRule.feature}
                        onChange={(e) => setNewRule({ ...newRule, feature: e.target.value })}
                        className="w-full bg-[#0B0910] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      >
                        <option value="purchase_order">Purchase Orders (PO)</option>
                        <option value="material_request">Material Requests</option>
                        <option value="expense">Expenses & Petty Cash</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-zinc-500">Min Amount (Rs)</label>
                      <input
                        type="number"
                        value={newRule.min}
                        onChange={(e) => setNewRule({ ...newRule, min: Number(e.target.value) })}
                        required
                        className="w-full bg-[#0B0910] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-zinc-500">Max Amount (Optional)</label>
                      <input
                        type="number"
                        placeholder="Leave blank for no upper bound"
                        value={newRule.max}
                        onChange={(e) => setNewRule({ ...newRule, max: e.target.value })}
                        className="w-full bg-[#0B0910] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase tracking-wider text-zinc-500">Approval Levels</label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={newRule.levels}
                        onChange={(e) => setNewRule({ ...newRule, levels: Number(e.target.value) })}
                        required
                        className="w-full bg-[#0B0910] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-zinc-500">Approvers (Comma-separated emails/names)</label>
                    <input
                      type="text"
                      placeholder="e.g. pm@siteflow.com, cfo@siteflow.com"
                      value={newRule.approvers}
                      onChange={(e) => setNewRule({ ...newRule, approvers: e.target.value })}
                      required
                      className="w-full bg-[#0B0910] border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddRule(false)} className="text-zinc-500 hover:text-white text-xs font-bold px-4 py-2">
                      Cancel
                    </button>
                    <button type="submit" className="bg-[#7C5CFF] text-white text-xs font-bold px-4 py-2 rounded-xl">
                      Save Rule
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-4">
                {rules.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-white/5 rounded-3xl text-zinc-500 text-xs">
                    No approval rules defined. Items will auto-approve based on role permissions.
                  </div>
                ) : (
                  rules.map((r) => (
                    <div key={r.id} className="glass-panel border border-white/5 bg-[#0E0C15] p-5 rounded-2xl flex items-center justify-between">
                      <div className="space-y-1.5">
                        <div className="text-xs font-bold text-white capitalize">{r.feature_type.replace("_", " ")} Approval</div>
                        <div className="text-[11px] text-zinc-500">
                          Threshold: <span className="font-semibold text-zinc-300">Rs {r.min_amount}</span> {r.max_amount ? `to Rs ${r.max_amount}` : "+"}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <span className="text-[10px] bg-[#7C5CFF]/10 text-[#7C5CFF] border border-[#7C5CFF]/20 px-2.5 py-1 rounded-xl font-bold">
                          {r.levels}-Step Approval
                        </span>
                        <div className="text-[9px] text-zinc-500 mt-1 max-w-[200px] truncate">{r.approvers}</div>
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
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-zinc-400">Company Calendar Holidays</h2>
                <button
                  onClick={() => setShowAddHoliday(true)}
                  className="bg-[#7C5CFF] text-white text-xs font-bold px-4 py-2.5 rounded-xl"
                >
                  + Add Holiday
                </button>
              </div>

              {showAddHoliday && (
                <form onSubmit={handleAddHoliday} className="glass-panel max-w-xl border border-white/5 bg-[#0E0C15] p-6 rounded-3xl space-y-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">New Holiday</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Holiday Name (e.g. Independence Day)"
                      value={newHoliday.name}
                      onChange={(e) => setNewHoliday({ ...newHoliday, name: e.target.value })}
                      required
                      className="bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <input
                      type="date"
                      value={newHoliday.date}
                      onChange={(e) => setNewHoliday({ ...newHoliday, date: e.target.value })}
                      required
                      className="bg-white/[0.02] border border-white/10 focus:border-[#7C5CFF] rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddHoliday(false)} className="text-zinc-500 hover:text-white text-xs font-bold px-4 py-2">
                      Cancel
                    </button>
                    <button type="submit" className="bg-[#7C5CFF] text-white text-xs font-bold px-4 py-2 rounded-xl">
                      Save Holiday
                    </button>
                  </div>
                </form>
              )}

              <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#0E0C15]">
                <table className="w-full text-sm">
                  <thead className="bg-white/[0.02] text-[10px] uppercase tracking-[0.25em] text-zinc-500 font-bold">
                    <tr>
                      <th className="px-5 py-3 text-left">Holiday Event</th>
                      <th className="px-5 py-3 text-right">Calendar Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center p-8 text-zinc-500 text-xs">
                          No holidays logged.
                        </td>
                      </tr>
                    ) : (
                      holidays.map((h) => (
                        <tr key={h.id} className="border-t border-white/5 hover:bg-white/[0.015]">
                          <td className="px-5 py-3 font-semibold text-white">{h.name}</td>
                          <td className="px-5 py-3 text-right text-zinc-400 font-mono">
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
