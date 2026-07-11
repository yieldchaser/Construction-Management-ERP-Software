"use client";

import React, { useEffect, useState } from "react";
import { getApi, persistAuth, authHeaders } from "@/lib/siteflow";

// Real onboarding for a brand-new user with no company yet. Creates the user's
// OWN company (they become its owner) and re-issues the session JWT scoped to
// it. This is distinct from /profile/onboarding, which fills segment details on
// an existing company. Reachable only with the onboarding-state token minted at
// login for users who belong to no company.
export default function CreateCompanyOnboardingPage() {
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [gstin, setGstin] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // A session is required to create a company. Bounce to login if missing.
    if (typeof window !== "undefined" && !localStorage.getItem("access_token")) {
      window.location.href = "/login";
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(getApi("/auth/onboarding/create-company"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(authHeaders() || {}) },
        body: JSON.stringify({
          name,
          legal_business_name: legalName || null,
          gstin: gstin || null,
          city: city || null,
          billing_address: address || null,
          phone: phone || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.access_token && data.company?.id) {
        // Re-issued JWT is now scoped to the new company.
        persistAuth(data);
        // Continue into the segment questionnaire for the fresh company.
        window.location.href = "/profile/onboarding";
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        setError(data.detail || "Could not create the company. Please try again.");
      }
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  };

  const field =
    "input-field w-full px-4 py-3 text-sm focus:outline-none";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <div className="relative hidden w-1/3 flex-col justify-between overflow-hidden bg-primary p-16 lg:flex border-r border-border-custom">
        <div className="flex items-center gap-3 z-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary font-bold text-white shadow-sm">S</div>
          <span className="text-xl font-bold tracking-tight text-white">SiteFlow</span>
        </div>
        <div className="z-10 max-w-sm">
          <h1 className="text-3xl font-extrabold tracking-tight leading-tight text-white">
            Set up your company workspace.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            You are the owner of this workspace. You can invite your team and
            configure details after this step.
          </p>
        </div>
        <div className="text-xs text-white/40 z-10">
          {new Date().getFullYear()} SiteFlow Inc.
        </div>
      </div>

      <div className="flex w-full flex-col justify-start items-center p-12 lg:w-2/3 bg-background overflow-y-auto">
        <div className="w-full max-w-2xl space-y-8 mt-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Create your company</h2>
            <p className="text-muted text-xs">This becomes your workspace. Only the name is required to start.</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-400">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted uppercase tracking-wider block">Company name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Acme Constructions" required className={field} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block">Legal business name</label>
                <input type="text" value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Registered name" className={field} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block">GSTIN / VAT</label>
                <input type="text" value={gstin} onChange={(e) => setGstin(e.target.value)} placeholder="Tax registration no." className={field} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block">City</label>
                <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" className={field} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted uppercase tracking-wider block">Phone</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Contact number" className={field} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted uppercase tracking-wider block">Billing address</label>
              <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Registered / billing address" rows={2} className={field} />
            </div>

            <div className="pt-2 border-t border-border-custom">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center py-2.5 px-6 rounded-md text-white font-medium bg-primary hover:bg-primary-hover shadow-sm transition-colors motion-reduce:transition-none cursor-pointer disabled:opacity-50"
              >
                {loading ? "Creating workspace..." : "Create company and continue"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
