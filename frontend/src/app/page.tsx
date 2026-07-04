"use client";

import React from "react";
import Link from "next/link";

export default function LandingPage() {
  const modules = [
    {
      section: "Pre-Construction",
      color: "border-border-custom text-primary",
      items: [
        { name: "Planning & Gantt", desc: "Infinite horizontal scheduler timeline", path: "planning" },
        { name: "Sales (CRM) & Quotation", desc: "Lead tracking & margin logic checks", path: "crm" },
        { name: "Design Management", desc: "CAD/PDF blueprints with Snag-pin dropping", path: "drawings" },
        { name: "BOQ & Budgeting", desc: "Live Excel BOQ parsing and limits allocation", path: "budgeting" },
      ],
    },
    {
      section: "Project Execution",
      color: "border-secondary/30 text-secondary",
      items: [
        { name: "Progress Tracking (DPR)", desc: "Daily field reports with GPS photo validation", path: "dpr" },
        { name: "Quality Management", desc: "Checklists gating subsequent task runs", path: "quality" },
        { name: "Procurement & RFQ", desc: "Automated RFQ side-by-side comparison matrix", path: "procurement?tab=po" },
        { name: "Production & Concrete Mix", desc: "Automatic ingredient recipe deduction", path: "production" },
      ],
    },
    {
      section: "Resource Management",
      color: "border-success/30 text-success",
      items: [
        { name: "Labour & Attendance", desc: "PostGIS geofenced face-scan attendance verification", path: "attendance" },
        { name: "Subcon RA Billing", desc: "DPR quantity-based automated claim generation", path: "billing?tab=ra-bills" },
        { name: "Asset & Equipment runtime", desc: "Fuel issues, runtime metrics & maintenance limits", path: "equipment" },
        { name: "Material Warehouse", desc: "Store issues, stock levels, and low-inventory warnings", path: "procurement?tab=inventory" },
      ],
    },
    {
      section: "Finance & Integrations",
      color: "border-info/30 text-info",
      items: [
        { name: "Real-time Project P&L", desc: "Automated cashflow metrics and waterfall charting", path: "finance?tab=pl" },
        { name: "Vendor Billing & Three-Way Match", desc: "Rate discrepancy matching against PO & GRN", path: "procurement?tab=ledger" },
        { name: "Debit / Credit Notes", desc: "Materials and quality defect chargeback ledgers", path: "billing?tab=notes" },
        { name: "Tally / Zoho Integration", desc: "Sync mappings directly to desktop Tally XML agents", path: "finance?tab=tally" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Background glow elements */}
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-tr bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        {/* Center nav links */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/products" className="text-sm text-muted hover:text-foreground transition-all">Products</Link>
          <Link href="/resources" className="text-sm text-muted hover:text-foreground transition-all">Resources</Link>
          <Link href="/blog" className="text-sm text-muted hover:text-foreground transition-all">Blog</Link>
          <Link href="/SiteFlow-pricing" className="text-sm text-muted hover:text-foreground transition-all">Pricing</Link>
          <Link href="/about" className="text-sm text-muted hover:text-foreground transition-all">About</Link>
          <Link href="/contact" className="text-sm text-muted hover:text-foreground transition-all">Contact</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/help"
            className="hidden md:flex items-center justify-center rounded-md bg-white/[0.03] border border-border-custom px-4 py-2 text-sm font-semibold hover:bg-primary/10 hover:border-white/20 transition-all cursor-pointer"
          >
            Help
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-md bg-white/[0.03] border border-border-custom px-4 py-2 text-sm font-semibold hover:bg-primary/10 hover:border-white/20 transition-all cursor-pointer"
          >
            Log In
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Free Trial
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-24 text-center max-w-5xl mx-auto space-y-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          ✨ Next-Generation Site Control
        </span>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-tight">
          Modern Operations Platform <br />
          <span className="text-gradient-accent">for Construction Leaders</span>
        </h1>
        
        <p className="text-muted text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          SiteFlow completely synchronizes estimations, project Gantt timelines, geofenced attendance logs, and desktop accounting ledgers in one secure cloud workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Explore Live Console
          </Link>
          <a
            href="#modules"
            className="w-full sm:w-auto flex items-center justify-center rounded-md bg-white/[0.03] border border-border-custom px-8 py-4 text-base font-bold hover:bg-primary/10 hover:border-white/20 transition-all"
          >
            Explore 16 Modules
          </a>
        </div>
      </section>

      {/* Grid Highlights Section */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white">Full-Suite Feature Coverage</h2>
          <p className="text-muted text-base max-w-md mx-auto">
            Engineered from deep reverse audits of actual enterprise operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map((sec, idx) => (
            <div key={idx} className="rounded-lg bg-card border border-border-custom rounded-lg p-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-md border uppercase tracking-wider ${sec.color}`}>
                  {sec.section}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sec.items.map((item, itemIdx) => (
                  <Link
                    key={itemIdx}
                    href={`/c/e0000000-0000-0000-0000-000000000000/p/d0000000-0000-0000-0000-000000000001/${item.path}`}
                    className="p-4 rounded-md bg-white/[0.01] border border-border-custom space-y-1 hover:bg-white/[0.03] hover:border-border-custom active:scale-[0.98] transition-all cursor-pointer block"
                  >
                    <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Console Demo Access Banner */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-md bg-radial bg-primary border border-border-custom p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-cover opacity-10 pointer-events-none" />
          <h2 className="text-3xl font-bold text-white">Ready to Experience SiteFlow?</h2>
          <p className="text-muted text-sm max-w-md mx-auto">
            Access the full suite of interactive calculators, ledger matching dashboards, and staff attendance features instantly with demo permissions.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-secondary/15 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              Launch Console Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom px-6 py-8 text-muted">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            SiteFlow is an independent construction operations platform. All product names, logos, and brands are property of their respective owners.
          </p>
          <div className="flex items-center gap-6 text-xs">
            <Link href="/blog" className="hover:text-muted transition-all">Blog</Link>
            <Link href="/help" className="hover:text-muted transition-all">Help Center</Link>
            <Link href="/resources/construction-terms-meanings" className="hover:text-muted transition-all">Glossary</Link>
            <Link href="/resources/construction-calculators" className="hover:text-muted transition-all">Calculators</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
