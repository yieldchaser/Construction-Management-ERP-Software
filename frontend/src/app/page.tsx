"use client";

import React from "react";
import Link from "next/link";

export default function LandingPage() {
  const modules = [
    {
      section: "Pre-Construction",
      color: "border-primary/30 text-primary",
      items: [
        { name: "Planning & Gantt", desc: "Infinite horizontal scheduler timeline" },
        { name: "Sales (CRM) & Quotation", desc: "Lead tracking & margin logic checks" },
        { name: "Design Management", desc: "CAD/PDF blueprints with Snag-pin dropping" },
        { name: "BOQ & Budgeting", desc: "Live Excel BOQ parsing and limits allocation" },
      ],
    },
    {
      section: "Project Execution",
      color: "border-secondary/30 text-secondary",
      items: [
        { name: "Progress Tracking (DPR)", desc: "Daily field reports with GPS photo validation" },
        { name: "Quality Management", desc: "Checklists gating subsequent task runs" },
        { name: "Procurement & RFQ", desc: "Automated RFQ side-by-side comparison matrix" },
        { name: "Production & Concrete Mix", desc: "Automatic ingredient recipe deduction" },
      ],
    },
    {
      section: "Resource Management",
      color: "border-success/30 text-success",
      items: [
        { name: "Labour & Attendance", desc: "PostGIS geofenced face-scan attendance verification" },
        { name: "Subcon RA Billing", desc: "DPR quantity-based automated claim generation" },
        { name: "Asset & Equipment runtime", desc: "Fuel issues, runtime metrics & maintenance limits" },
        { name: "Material Warehouse", desc: "Store issues, stock levels, and low-inventory warnings" },
      ],
    },
    {
      section: "Finance & Integrations",
      color: "border-info/30 text-info",
      items: [
        { name: "Real-time Project P&L", desc: "Automated cashflow metrics and waterfall charting" },
        { name: "Vendor Billing & Three-Way Match", desc: "Rate discrepancy matching against PO & GRN" },
        { name: "Debit / Credit Notes", desc: "Materials and quality defect chargeback ledgers" },
        { name: "Tally / Zoho Integration", desc: "Sync mappings directly to desktop Tally XML agents" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed] overflow-x-hidden relative">
      {/* Background glow elements */}
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-5 blur-[120px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/blog"
            className="hidden md:block text-sm font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            Blog
          </Link>
          <Link
            href="/help"
            className="hidden md:block text-sm font-semibold text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            Help Center
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 px-5 py-2 text-sm font-semibold hover:bg-white/[0.06] hover:border-white/20 transition-all cursor-pointer"
          >
            Launch Console
          </Link>
          <Link
            href="/login"
            className="flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Start Demo Sandbox
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
        
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
          SiteFlow completely synchronizes estimations, project Gantt timelines, geofenced attendance logs, and desktop accounting ledgers in one secure cloud workspace.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 items-center justify-center pt-4">
          <Link
            href="/login"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Enter Sandbox Environment
          </Link>
          <a
            href="#modules"
            className="w-full sm:w-auto flex items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 px-8 py-4 text-base font-bold hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            Explore 16 Modules
          </a>
        </div>
      </section>

      {/* Grid Highlights Section */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-white">Full-Suite Feature Coverage</h2>
          <p className="text-zinc-500 text-base max-w-md mx-auto">
            Engineered from deep reverse audits of actual enterprise operations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {modules.map((sec, idx) => (
            <div key={idx} className="rounded-2xl glass-panel p-8 space-y-6">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-md border uppercase tracking-wider ${sec.color}`}>
                  {sec.section}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sec.items.map((item, itemIdx) => (
                  <div key={itemIdx} className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-1 hover:bg-white/[0.03] transition-all">
                    <h3 className="font-semibold text-white text-sm">{item.name}</h3>
                    <p className="text-xs text-zinc-500">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sandbox Access Banner */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-3xl bg-radial from-[#1C1832] to-[#121020] border border-white/10 p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-cover opacity-10 pointer-events-none" />
          <h2 className="text-3xl font-bold text-white">Ready to test the SiteFlow Sandbox?</h2>
          <p className="text-zinc-400 text-sm max-w-md mx-auto">
            Experience automatic OTP bypass login, interactive local calculators, and instant ledger matching interfaces with full demo permissions.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-secondary to-[#9C85FF] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-secondary/15 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              Launch Dashboard Sandbox
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-zinc-600">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            SiteFlow is an independent construction operations platform. All product names, logos, and brands are property of their respective owners.
          </p>
          <div className="flex items-center gap-6 text-xs">
            <Link href="/blog" className="hover:text-zinc-400 transition-all">Blog</Link>
            <Link href="/help" className="hover:text-zinc-400 transition-all">Help Center</Link>
            <Link href="/resources/construction-terms-meanings" className="hover:text-zinc-400 transition-all">Glossary</Link>
            <Link href="/resources/construction-calculators" className="hover:text-zinc-400 transition-all">Calculators</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
