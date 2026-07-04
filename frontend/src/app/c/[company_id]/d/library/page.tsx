"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { getApiHost } from "@/lib/api";

type LibraryType =
  | "party"
  | "asset-type"
  | "cost-code"
  | "deduction"
  | "progress"
  | "workforce"
  | "material"
  | "rate";

export default function LibraryHubPage() {
  const params = useParams();
  const companyId = params.company_id as string;
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const [activeTab, setActiveTab] = useState<LibraryType>("party");
  const [libraryData, setLibraryData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  // Drawers
  const [isPartyDrawerOpen, setIsPartyDrawerOpen] = useState(false);
  const [isMaterialDrawerOpen, setIsMaterialDrawerOpen] = useState(false);
  const [isRateDrawerOpen, setIsRateDrawerOpen] = useState(false);
  const [isSimpleDrawerOpen, setIsSimpleDrawerOpen] = useState(false);

  // Form Fields: Party
  const [partyName, setPartyName] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [partyType, setPartyType] = useState("Supplier");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyAadhaar, setPartyAadhaar] = useState("");
  const [partyPan, setPartyPan] = useState("");

  // Form Fields: Material
  const [matName, setMatName] = useState("");
  const [matUnit, setMatUnit] = useState("bag");
  const [matGst, setMatGst] = useState(18.0);
  const [matCategory, setMatCategory] = useState("Cement");
  const [matCost, setMatCost] = useState(420.0);
  const [matLeadTime, setMatLeadTime] = useState(2);
  const [matHsn, setMatHsn] = useState("");
  const [matCode, setMatCode] = useState("");
  const [matSpecs, setMatSpecs] = useState("");

  // Form Fields: Rate
  const [rateName, setRateName] = useState("");
  const [rateCode, setRateCode] = useState("");
  const [rateUnit, setRateUnit] = useState("sqft");
  const [rateGst, setRateGst] = useState(12.0);
  const [rateCategory, setRateCategory] = useState("Civil Works");
  const [rateCost, setRateCost] = useState(180.0);
  const [rateMarkup, setRateMarkup] = useState(15.0);
  const [rateMarkupType, setRateMarkupType] = useState("percent");
  const [rateSalePrice, setRateSalePrice] = useState(207.0);
  const [rateNote, setRateNote] = useState("");
  const [rateCostCode, setRateCostCode] = useState("");
  const [rateHsn, setRateHsn] = useState("");

  // Simple Item (Asset Type, Cost Code, Deduction, Progress, Workforce)
  const [simpleName, setSimpleName] = useState("");
  const [simpleCode, setSimpleCode] = useState(""); // used for Cost Code

  const apiHost = getApiHost();

  // Compute sale price automatically
  useEffect(() => {
    let cost = Number(rateCost) || 0;
    let markup = Number(rateMarkup) || 0;
    if (rateMarkupType === "percent") {
      setRateSalePrice(Number((cost * (1 + markup / 100)).toFixed(2)));
    } else {
      setRateSalePrice(cost + markup);
    }
  }, [rateCost, rateMarkup, rateMarkupType]);

  const getEndpoint = (tab: LibraryType) => {
    switch (tab) {
      case "party": return "parties";
      case "asset-type": return "asset-types";
      case "cost-code": return "cost-codes";
      case "deduction": return "deductions";
      case "progress": return "progresses";
      case "workforce": return "workforces";
      case "material": return "materials";
      case "rate": return "rates";
    }
  };

  const fetchLibraryData = async () => {
    if (!companyId || !accessToken) return;
    try {
      const endpoint = getEndpoint(activeTab);
      const res = await fetch(`${apiHost}/apis/v3/library/${endpoint}/${companyId}`, {
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLibraryData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLibraryData();
  }, [activeTab, companyId, accessToken]);

  const handleDeleteItem = async (itemId: string) => {
    try {
      const endpoint = getEndpoint(activeTab);
      const res = await fetch(`${apiHost}/apis/v3/library/${endpoint}/${itemId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${accessToken}` }
      });
      if (res.ok) {
        setToastMessage("Library item deleted successfully.");
        setTimeout(() => setToastMessage(""), 3000);
        fetchLibraryData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateParty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) return;

    try {
      const res = await fetch(`${apiHost}/apis/v3/library/parties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          company_id: companyId,
          name: partyName,
          phone: partyPhone,
          email: partyEmail,
          party_type: partyType,
          address: partyAddress,
          aadhaar_number: partyAadhaar,
          pan_number: partyPan
        })
      });

      if (res.ok) {
        setIsPartyDrawerOpen(false);
        setPartyName("");
        setPartyPhone("");
        setPartyEmail("");
        setPartyAddress("");
        setPartyAadhaar("");
        setPartyPan("");
        setToastMessage("Party added to library!");
        setTimeout(() => setToastMessage(""), 3000);
        fetchLibraryData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matName.trim()) return;

    try {
      const res = await fetch(`${apiHost}/apis/v3/library/materials`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          company_id: companyId,
          name: matName,
          unit: matUnit,
          gst_rate: Number(matGst),
          category: matCategory,
          unit_cost: Number(matCost),
          lead_time_days: Number(matLeadTime),
          hsn_sac: matHsn,
          item_code: matCode,
          specifications: matSpecs
        })
      });

      if (res.ok) {
        setIsMaterialDrawerOpen(false);
        setMatName("");
        setMatHsn("");
        setMatCode("");
        setMatSpecs("");
        setToastMessage("Material item saved to library!");
        setTimeout(() => setToastMessage(""), 3000);
        fetchLibraryData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateName.trim()) return;

    try {
      const res = await fetch(`${apiHost}/apis/v3/library/rates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          company_id: companyId,
          name: rateName,
          item_code: rateCode,
          unit: rateUnit,
          gst_rate: Number(rateGst),
          category: rateCategory,
          unit_cost: Number(rateCost),
          markup_value: Number(rateMarkup),
          markup_type: rateMarkupType,
          unit_sale_price: Number(rateSalePrice),
          note: rateNote,
          cost_code: rateCostCode,
          hsn_sac: rateHsn
        })
      });

      if (res.ok) {
        setIsRateDrawerOpen(false);
        setRateName("");
        setRateCode("");
        setRateNote("");
        setRateCostCode("");
        setRateHsn("");
        setToastMessage("Rate card item saved to library!");
        setTimeout(() => setToastMessage(""), 3000);
        fetchLibraryData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateSimple = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simpleName.trim()) return;

    try {
      const endpoint = getEndpoint(activeTab);
      const payload: any = {
        company_id: companyId,
        name: simpleName
      };
      if (activeTab === "cost-code") {
        payload.code = simpleCode;
      }

      const res = await fetch(`${apiHost}/apis/v3/library/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsSimpleDrawerOpen(false);
        setSimpleName("");
        setSimpleCode("");
        setToastMessage("Library item created!");
        setTimeout(() => setToastMessage(""), 3000);
        fetchLibraryData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const filteredData = libraryData.filter((item) => {
    const query = searchQuery.toLowerCase();
    const nameMatches = item.name && item.name.toLowerCase().includes(query);
    const codeMatches = item.code && item.code.toLowerCase().includes(query);
    const customPidMatches = item.party_id_custom && item.party_id_custom.toLowerCase().includes(query);
    return nameMatches || codeMatches || customPidMatches;
  });

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sub-navigation Sidebar */}
      <aside className="w-56 border-r border-border-custom bg-sidebar flex flex-col p-4 shrink-0">
        <h2 className="text-xs font-bold text-muted uppercase tracking-widest px-3 mb-4">Libraries Hub</h2>
        <nav className="space-y-1.5">
          {[
            { id: "party", label: "Party Library", icon: "👥" },
            { id: "asset-type", label: "Asset Type Library", icon: "🚜" },
            { id: "cost-code", label: "Cost Code Library", icon: "🏷️" },
            { id: "deduction", label: "Deduction Library", icon: "➖" },
            { id: "progress", label: "Progress Library", icon: "📈" },
            { id: "workforce", label: "Workforce Library", icon: "👷" },
            { id: "material", label: "Material Library", icon: "🪵" },
            { id: "rate", label: "Rate Library", icon: "💸" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as LibraryType);
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-xs font-bold rounded-lg transition-all text-left cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary border-l-2 border-primary font-medium"
                  : "text-muted hover:text-foreground hover:bg-elevated"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Hub Area */}
      <div className="flex-1 flex flex-col overflow-y-auto p-8 relative bg-background">
        {/* Action Header */}
        <div className="flex justify-between items-center mb-6 shrink-0">
          <div>
            <h1 className="text-base font-semibold text-foreground capitalize">{activeTab.replace("-", " ")} Library</h1>
            <p className="text-xs text-muted mt-1">Manage global templates and codes shared across all project locations.</p>
          </div>

          <button
            onClick={() => {
              if (activeTab === "party") setIsPartyDrawerOpen(true);
              else if (activeTab === "material") setIsMaterialDrawerOpen(true);
              else if (activeTab === "rate") setIsRateDrawerOpen(true);
              else setIsSimpleDrawerOpen(true);
            }}
            className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-lg text-xs font-bold shadow-lg transition-all cursor-pointer"
          >
            + Add to Library
          </button>
        </div>

        {/* Search Filter */}
        <div className="mb-6 shrink-0 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab.replace("-", " ")} items...`}
            className="input-field px-4 py-2 text-xs font-semibold focus:outline-none placeholder-muted w-full"
          />
        </div>

        {/* Dynamic Tables Grid */}
        <div className="flex-1 overflow-auto rounded-md border border-border-custom bg-sidebar">
          {/* Party Library Table */}
          {activeTab === "party" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
                  <th className="px-5 py-3">Party ID</th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Phone / Email</th>
                  <th className="px-5 py-3">Party Type</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted font-semibold">No parties registered in library.</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-elevated/20 transition-colors border-b border-border-custom last:border-b-0">
                      <td className="px-6 py-4 text-muted font-bold">{item.party_id_custom}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">{item.name}</td>
                      <td className="px-6 py-4 text-muted">
                        {item.phone || "-"} <span className="block text-[10px] text-muted mt-0.5">{item.email}</span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="bg-white/5 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider text-zinc-300">
                          {item.party_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2.5 py-1 bg-elevated hover:bg-elevated/80 border border-border-custom text-foreground text-xs font-medium rounded transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Simple Tables (Asset Types, Cost Codes, Deductions, Progresses, Workforces) */}
          {(activeTab === "asset-type" || activeTab === "deduction" || activeTab === "progress" || activeTab === "workforce") && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Created Date</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted font-semibold">No items registered in library.</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-elevated/20 transition-colors border-b border-border-custom last:border-b-0">
                      <td className="px-6 py-4 font-semibold text-foreground">{item.name}</td>
                      <td className="px-6 py-4 text-muted">
                        {new Date(item.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2.5 py-1 bg-elevated hover:bg-elevated/80 border border-border-custom text-foreground text-xs font-medium rounded transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {activeTab === "cost-code" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-12 text-center text-muted font-semibold">No cost codes registered in library.</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-elevated/20 transition-colors border-b border-border-custom last:border-b-0">
                      <td className="px-6 py-4 text-primary font-semibold font-mono">{item.code}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">{item.name}</td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2.5 py-1 bg-elevated hover:bg-elevated/80 border border-border-custom text-foreground text-xs font-medium rounded transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Material Library Table */}
          {activeTab === "material" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
                  <th className="px-5 py-3">Material Code</th>
                  <th className="px-5 py-3">Item Name</th>
                  <th className="px-5 py-3">GST% / Category</th>
                  <th className="px-6 py-4 text-right">Standard Cost Price</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted font-semibold">No materials registered.</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-elevated/20 transition-colors border-b border-border-custom last:border-b-0">
                      <td className="px-6 py-4 text-muted font-mono">{item.item_code || "-"}</td>
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {item.name}
                        <span className="block text-[10px] text-muted mt-0.5">UOM: {item.unit}</span>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {item.gst_rate}% <span className="block text-[10px] text-muted mt-0.5">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-success">
                        ₹{floatVal(item.unit_cost).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2.5 py-1 bg-elevated hover:bg-elevated/80 border border-border-custom text-foreground text-xs font-medium rounded transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {/* Rate Library Table */}
          {activeTab === "rate" && (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-custom text-muted font-semibold uppercase tracking-wider bg-background/50">
                  <th className="px-5 py-3">Item Name</th>
                  <th className="px-5 py-3">GST% / Category</th>
                  <th className="px-6 py-4 text-right">Standard Cost Price</th>
                  <th className="px-6 py-4 text-right">Standard Sale Price</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-custom">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted font-semibold">No rate card items registered.</td>
                  </tr>
                ) : (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-elevated/20 transition-colors border-b border-border-custom last:border-b-0">
                      <td className="px-6 py-4 font-semibold text-foreground">
                        {item.name}
                        <span className="block text-[10px] text-muted mt-0.5">UOM: {item.unit} • {item.item_code}</span>
                      </td>
                      <td className="px-6 py-4 text-muted">
                        {item.gst_rate}% <span className="block text-[10px] text-muted mt-0.5">{item.category}</span>
                      </td>
                      <td className="px-6 py-4 text-right text-muted font-semibold">
                        ₹{floatVal(item.unit_cost).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-success">
                        ₹{floatVal(item.unit_sale_price).toLocaleString()}
                        <span className="block text-[9px] text-muted mt-0.5">Markup: {item.markup_value} ({item.markup_type})</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="px-2.5 py-1 bg-elevated hover:bg-elevated/80 border border-border-custom text-foreground text-xs font-medium rounded transition-all cursor-pointer"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reusable Simple Item Add Modal */}
      {isSimpleDrawerOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border-custom flex justify-between items-center">
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Add {activeTab.replace("-", " ")}</h3>
              <button onClick={() => setIsSimpleDrawerOpen(false)} className="text-muted hover:text-foreground font-bold">×</button>
            </div>

            <form onSubmit={handleCreateSimple} className="p-6 space-y-4">
              {activeTab === "cost-code" && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Cost Code *</label>
                  <input
                    type="text"
                    required
                    value={simpleCode}
                    onChange={(e) => setSimpleCode(e.target.value)}
                    placeholder="e.g. CC-101"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none font-mono"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Item Description / Name *</label>
                <input
                  type="text"
                  required
                  value={simpleName}
                  onChange={(e) => setSimpleName(e.target.value)}
                  placeholder="e.g. Earthworks excavation"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-md text-sm shadow-sm transition-all mt-4 cursor-pointer"
              >
                Create Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Party Drawer Modal */}
      {isPartyDrawerOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border-custom flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">Register Library Party</h3>
              <button onClick={() => setIsPartyDrawerOpen(false)} className="text-muted hover:text-foreground font-bold">×</button>
            </div>

            <form onSubmit={handleCreateParty} className="p-6 space-y-3.5 max-h-[500px] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Party Name *</label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Sai Steel Traders"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={partyPhone}
                    onChange={(e) => setPartyPhone(e.target.value)}
                    placeholder="9876543210"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Party Type</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value)}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="Supplier">Supplier</option>
                    <option value="Subcontractor">Subcontractor</option>
                    <option value="Client">Client</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={partyEmail}
                  onChange={(e) => setPartyEmail(e.target.value)}
                  placeholder="vendor@siteflow.co"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Address</label>
                <input
                  type="text"
                  value={partyAddress}
                  onChange={(e) => setPartyAddress(e.target.value)}
                  placeholder="Commercial Market Sector 12"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Aadhaar Number</label>
                  <input
                    type="text"
                    value={partyAadhaar}
                    onChange={(e) => setPartyAadhaar(e.target.value)}
                    placeholder="12-digit number"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">PAN Card Number</label>
                  <input
                    type="text"
                    value={partyPan}
                    onChange={(e) => setPartyPan(e.target.value)}
                    placeholder="PAN card"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border-custom grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert("Mock upload for Aadhaar details ready.")}
                  className="py-1.5 border border-border-custom hover:bg-elevated rounded-md text-foreground font-medium text-xs transition-all cursor-pointer text-center"
                >
                  Upload Aadhaar
                </button>
                <button
                  type="button"
                  onClick={() => alert("Mock upload for PAN details ready.")}
                  className="py-1.5 border border-border-custom hover:bg-elevated rounded-md text-foreground font-medium text-xs transition-all cursor-pointer text-center"
                >
                  Upload PAN
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-md text-sm shadow-sm transition-all mt-2 cursor-pointer"
              >
                Register Party
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Material Drawer Modal */}
      {isMaterialDrawerOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border-custom flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">New Material Item</h3>
              <button onClick={() => setIsMaterialDrawerOpen(false)} className="text-muted hover:text-foreground font-bold">×</button>
            </div>

            <form onSubmit={handleCreateMaterial} className="p-6 space-y-3.5 max-h-[500px] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Material Name *</label>
                <input
                  type="text"
                  required
                  value={matName}
                  onChange={(e) => setMatName(e.target.value)}
                  placeholder="e.g. Portland Cement (53 grade)"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Unit (UOM)</label>
                  <input
                    type="text"
                    required
                    value={matUnit}
                    onChange={(e) => setMatUnit(e.target.value)}
                    placeholder="bag"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={matGst}
                    onChange={(e) => setMatGst(Number(e.target.value))}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Standard Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    value={matCost}
                    onChange={(e) => setMatCost(Number(e.target.value))}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Lead Time (days)</label>
                  <input
                    type="number"
                    value={matLeadTime}
                    onChange={(e) => setMatLeadTime(Number(e.target.value))}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={matHsn}
                    onChange={(e) => setMatHsn(e.target.value)}
                    placeholder="e.g. 2523"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Item Code</label>
                  <input
                    type="text"
                    value={matCode}
                    onChange={(e) => setMatCode(e.target.value)}
                    placeholder="e.g. MAT-CEM"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Category / Group</label>
                <input
                  type="text"
                  value={matCategory}
                  onChange={(e) => setMatCategory(e.target.value)}
                  placeholder="e.g. Concrete Materials"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Specifications</label>
                <textarea
                  value={matSpecs}
                  onChange={(e) => setMatSpecs(e.target.value)}
                  placeholder="Compressive strength > 53 MPa after 28 days."
                  rows={2}
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-md text-sm shadow-sm transition-all mt-2 cursor-pointer"
              >
                Save Material
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Rate Card Drawer Modal */}
      {isRateDrawerOpen && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-card border border-border-custom rounded-lg overflow-hidden shadow-lg animate-in fade-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-border-custom flex justify-between items-center">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">New Rate Card Item</h3>
              <button onClick={() => setIsRateDrawerOpen(false)} className="text-muted hover:text-foreground font-bold">×</button>
            </div>

            <form onSubmit={handleCreateRate} className="p-6 space-y-3.5 max-h-[500px] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Item Name *</label>
                <input
                  type="text"
                  required
                  value={rateName}
                  onChange={(e) => setRateName(e.target.value)}
                  placeholder="e.g. Foundation Excavation Rate"
                  className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Item Code</label>
                  <input
                    type="text"
                    value={rateCode}
                    onChange={(e) => setRateCode(e.target.value)}
                    placeholder="e.g. RAT-EXC"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Unit (UOM)</label>
                  <input
                    type="text"
                    required
                    value={rateUnit}
                    onChange={(e) => setRateUnit(e.target.value)}
                    placeholder="cum"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">GST Rate (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateGst}
                    onChange={(e) => setRateGst(Number(e.target.value))}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Category</label>
                  <input
                    type="text"
                    value={rateCategory}
                    onChange={(e) => setRateCategory(e.target.value)}
                    placeholder="Excavation"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 border-t border-border-custom pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Unit Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateCost}
                    onChange={(e) => setRateCost(Number(e.target.value))}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Markup</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateMarkup}
                    onChange={(e) => setRateMarkup(Number(e.target.value))}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Markup Type</label>
                  <select
                    value={rateMarkupType}
                    onChange={(e) => setRateMarkupType(e.target.value)}
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="percent">%</option>
                    <option value="flat">Flat</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold text-muted uppercase tracking-widest">
                  <span>Computed Sale Price</span>
                  <span className="text-success font-semibold">₹{rateSalePrice}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border-custom pt-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Cost Code Reference</label>
                  <input
                    type="text"
                    value={rateCostCode}
                    onChange={(e) => setRateCostCode(e.target.value)}
                    placeholder="e.g. CC-101"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">HSN/SAC Code</label>
                  <input
                    type="text"
                    value={rateHsn}
                    onChange={(e) => setRateHsn(e.target.value)}
                    placeholder="e.g. 9954"
                    className="input-field w-full px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-primary hover:bg-primary-hover text-white font-medium rounded-md text-sm shadow-sm transition-all mt-2 cursor-pointer"
              >
                Save Rate Card Item
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div className="absolute bottom-6 right-6 bg-card border border-success/30 rounded-md px-4 py-3 text-xs text-success shadow-2xl z-50">
          <span>⚡ </span>
          <span className="font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

// Helper to coerce string columns to floats safely
function floatVal(val: any): number {
  if (val === undefined || val === null) return 0;
  return typeof val === "number" ? val : parseFloat(val) || 0;
}
