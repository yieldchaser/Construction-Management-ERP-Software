"use client";

import React, { useState, useEffect } from "react";
import { getApiHost } from "@/lib/api";
import { authHeaders } from "@/lib/siteflow";

const SEGMENTS = [
  "Building Construction",
  "Developer",
  "Industrial Construction",
  "Infrastructure / Heavy Civil Construction",
  "Interiors and Fit-Out",
  "PWD",
  "Specialized / MEP Trades"
];

const DEVELOPER_CATEGORIES = [
  "Residential Real Estate",
  "Commercial Real Estate",
  "Industrial Real Estate",
  "Mixed-Use Development",
  "Land Development"
];

export default function OnboardingPage() {
  const [companyName, setCompanyName] = useState("");
  const [city, setCity] = useState("Bangalore");
  const [selectedSegments, setSelectedSegments] = useState<string[]>(["Developer"]);
  const [developerCategories, setDeveloperCategories] = useState<string[]>(["Residential Real Estate"]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const companyId = typeof window !== "undefined" ? localStorage.getItem("company_id") || "e0000000-0000-0000-0000-000000000000" : "e0000000-0000-0000-0000-000000000000";
  const accessToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  // Prefill company name if possible
  useEffect(() => {
    const fetchCompany = async () => {
      if (!accessToken || !companyId) return;
      try {
        const apiHost = getApiHost();
        const res = await fetch(`${apiHost}/apis/v3/settings/company/${companyId}`, {
          headers: { ...(authHeaders() || {}) }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.name) {
            setCompanyName(data.name);
          }
        }
      } catch (err) {
        // ignore
      }
    };
    fetchCompany();
  }, [accessToken, companyId]);

  const handleToggleSegment = (seg: string) => {
    if (selectedSegments.includes(seg)) {
      setSelectedSegments(selectedSegments.filter((s) => s !== seg));
    } else {
      setSelectedSegments([...selectedSegments, seg]);
    }
  };

  const handleAddCategory = (cat: string) => {
    if (!developerCategories.includes(cat)) {
      setDeveloperCategories([...developerCategories, cat]);
    }
    setIsCategoryDropdownOpen(false);
  };

  const handleRemoveCategory = (cat: string) => {
    setDeveloperCategories(developerCategories.filter((c) => c !== cat));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError("Company Name is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const apiHost = getApiHost();
      const response = await fetch(`${apiHost}/apis/v3/profile/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeaders() || {})
        },
        body: JSON.stringify({
          company_id: companyId,
          company_name: companyName,
          city: city,
          segment: selectedSegments.join(", "),
          categories: selectedSegments.includes("Developer") ? developerCategories.join(", ") : ""
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        // Redirect to the shared company hub after onboarding
        window.location.href = `/c/${companyId}/reports`;
      } else {
        setError(data.detail || "Onboarding failed. Please try again.");
      }
    } catch (err) {
      setError("Verification failed. Could not connect to API server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {/* Testimonial Brand Left Panel (Desktop only) */}
      <div className="relative hidden w-1/3 flex-col justify-between overflow-hidden bg-primary p-16 lg:flex border-r border-border-custom">
        
        

        {/* Logo */}
        <div className="flex items-center gap-3 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-white shadow-sm">
            S
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            Site<span className="text-white">Flow</span>
          </span>
        </div>

        {/* Dynamic center layout graphic */}
        <div className="flex flex-1 flex-col justify-center items-start gap-6 z-10">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-white max-w-sm">
            #1 Construction Application For <span className="text-white font-semibold">Client invoicing.</span>
          </h1>
          
          <div className="space-y-2 border-l-2 border-primary/50 pl-4 py-1">
            <p className="text-white/80 text-sm italic">
              "Material tracking and department-wise roles assignment have become easy for us. There is no more material wastage and easy PO generation. Love this software."
            </p>
          </div>
        </div>

        <div className="text-xs text-white/40 z-10">
          © {new Date().getFullYear()} SiteFlow Inc. Onboarding Assistant.
        </div>
      </div>

      {/* Onboarding Form Panel */}
      <div className="flex w-full flex-col justify-start items-center p-12 lg:w-2/3 bg-background overflow-y-auto">
        <div className="w-full max-w-2xl space-y-8 mt-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Let's know a little more about you...</h2>
            <p className="text-muted text-xs">Configure your workspace context for personalized construction calculators and templates.</p>
          </div>

          {/* Steps Progress */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-elevated rounded-lg px-4 py-2 border border-border-custom text-xs text-muted">
              <span className="h-5 w-5 bg-success/20 text-success rounded-full flex items-center justify-center font-bold text-[10px]">✓</span>
              <span>User Details</span>
              <span className="bg-success/20 text-success rounded px-1.5 py-0.5 text-[10px] font-semibold">Completed</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 rounded-lg px-4 py-2 border border-primary/20 text-xs text-white font-semibold">
              <span className="h-5 w-5 bg-primary/20 text-primary rounded-full flex items-center justify-center font-bold text-[10px]">2</span>
              <span>Company Details</span>
              <span className="bg-primary/20 text-primary rounded px-1.5 py-0.5 text-[10px] font-semibold">In Progress</span>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Name */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Company Name *</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter Company Name"
                required
                className="input-field w-full px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            {/* Company City */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Company City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Enter City"
                required
                className="input-field w-full px-4 py-3 text-sm focus:outline-none"
              />
            </div>

            {/* Segment Checkboxes */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Company Segment</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SEGMENTS.map((seg) => {
                  const isChecked = selectedSegments.includes(seg);
                  return (
                    <button
                      key={seg}
                      type="button"
                      onClick={() => handleToggleSegment(seg)}
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-md border text-left text-xs transition-all cursor-pointer ${
                        isChecked
                          ? "bg-primary/10 border-primary text-white shadow-lg"
                          : "bg-input border-border-custom text-muted hover:border-border-custom hover:text-foreground"
                      }`}
                    >
                      <span className={`h-4 w-4 rounded flex items-center justify-center text-[10px] border ${
                        isChecked ? "bg-primary border-primary text-white font-bold" : "border-white/20"
                      }`}>
                        {isChecked && "✓"}
                      </span>
                      <span>{seg}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Developer Categories Select Dropdown */}
            {selectedSegments.includes("Developer") && (
              <div className="space-y-2 border-t border-border-custom pt-4">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block mb-1.5">Categories</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className="w-full flex justify-between items-center bg-input border border-border-custom rounded-md px-4 py-3.5 text-xs text-foreground font-semibold hover:border-border-custom transition-all cursor-pointer"
                  >
                    <span>Select category...</span>
                    <span>▼</span>
                  </button>
                  {isCategoryDropdownOpen && (
                    <div className="absolute top-[105%] left-0 w-full bg-card border border-border-custom rounded-md shadow-2xl z-50 py-1 overflow-hidden">
                      {DEVELOPER_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => handleAddCategory(cat)}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-primary/20 hover:text-foreground font-semibold transition-all cursor-pointer text-muted"
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Categories Chips */}
                {developerCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {developerCategories.map((cat) => (
                      <span
                        key={cat}
                        className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-full px-3 py-1 text-[11px] font-semibold text-primary"
                      >
                        <span>{cat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveCategory(cat)}
                          className="hover:text-foreground transition-colors ml-1 font-bold text-xs"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4 border-t border-border-custom">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-6 rounded-md text-white font-medium bg-primary hover:bg-primary-hover shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Completing Onboarding..." : "Continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
