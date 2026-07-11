"use client";

import React from "react";
import Link from "next/link";
import BeforeAfterTestimonial from "@/components/marketing/BeforeAfterTestimonial";
import TypewriterText from "@/components/marketing/TypewriterText";
import StatBand from "@/components/marketing/StatBand";

const HEADLINE_PHRASES = [
  "one workspace",
  "one dashboard",
  "one ledger",
  "one record",
];

const PILLARS = [
  {
    icon: "📐",
    title: "Real civil-engineering math, not a calculator toy",
    body: "BOQ parsing, concrete mix (dry-volume factor 1.54), rebar weight (d²/162.2), and brickwork quantities, all built to IS 456, IS 1786, IS 516 and CPWD specs.",
  },
  {
    icon: "🔗",
    title: "One record, from the field to the ledger",
    body: "Daily progress, geofenced attendance, goods receipts and invoices all feed the same project P&L, so the site and the accounts stop disagreeing.",
  },
  {
    icon: "🇮🇳",
    title: "Built for Indian statutory reality",
    body: "Works-contract GST, TDS (194C / 194Q), PF / ESI / BOCW, and one-click sync to Tally Prime and Zoho Books out of the box.",
  },
];

const LEAD_MODULES = [
  {
    name: "Planning & Gantt",
    desc: "Critical-path scheduler with float and circular-dependency protection.",
    mock: "Greenline Residency: 214 tasks, 9 on the critical path.",
  },
  {
    name: "BOQ & Budgeting",
    desc: "Live Excel BOQ parsing with per-cost-head limit allocation.",
    mock: "₹86 Cr budget: 3 cost heads flagged over limit, in real time.",
  },
  {
    name: "Daily Progress (DPR)",
    desc: "GPS-validated field reports with photo and quantity capture.",
    mock: "Daily capture auto-rolls into live weighted progress %.",
  },
  {
    name: "Procurement & 3-Way Match",
    desc: "PO–GRN–Invoice reconciliation with variance detection.",
    mock: "12 POs matched; 2 rate discrepancies caught before payment.",
  },
  {
    name: "Subcon RA Billing",
    desc: "Running-account bills with TDS and retention applied automatically.",
    mock: "RA bill ₹24.6L → net payable ₹21.9L after 194C + retention.",
  },
  {
    name: "Finance & Project P&L",
    desc: "Real-time cashflow, margin and burn from live transaction data.",
    mock: "Project P&L: revenue ₹61L, cost ₹44L, margin 28%.",
  },
];

const MODULES = [
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
    color: "border-primary/30 text-primary",
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

const TRUST_POINTS = [
  { value: "16", label: "operational modules, one workspace" },
  { value: "2", label: "native accounting integrations (Tally, Zoho)" },
  { value: "IS", label: "456 · 1786 · 516 & CPWD compliant math" },
  { value: "PWA", label: "with GPS-geofenced attendance" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Background glow elements */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Site<span className="text-primary">Flow</span>
          </span>
        </div>

        {/* Center nav links */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/products" className="text-sm text-muted hover:text-foreground transition-all">Products</Link>
          <Link href="/about" className="text-sm text-muted hover:text-foreground transition-all">About</Link>
          <Link href="/who-we-serve" className="text-sm text-muted hover:text-foreground transition-all">Who We Serve</Link>
          <Link href="/resources" className="text-sm text-muted hover:text-foreground transition-all">Resources</Link>
          <Link href="/blog" className="text-sm text-muted hover:text-foreground transition-all">Blog</Link>
          <Link href="/SiteFlow-pricing" className="text-sm text-muted hover:text-foreground transition-all">Pricing</Link>
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
            className="flex items-center justify-center rounded-md bg-primary px-5 py-2 text-sm font-semibold text-foreground shadow-lg shadow-primary/10 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            Free Trial
          </Link>
        </div>
      </header>

      {/* Hero Section: copy left, aurora panel right (two living elements only) */}
      <section className="relative px-6 pt-20 pb-24">
        {/* Static dotted grid texture, hero only, fades toward the bottom */}
        <div className="hero-dot-grid absolute inset-0 pointer-events-none" aria-hidden="true" />

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* Copy column */}
          <div className="text-center lg:text-left space-y-7">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
              One workspace for the whole site
            </span>

            <h1 className="text-5xl md:text-6xl xl:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Run every project from
              <br />
              <TypewriterText
                phrases={HEADLINE_PHRASES}
                className="text-gradient-accent"
              />
            </h1>

            <p className="text-muted text-lg md:text-xl max-w-xl mx-auto lg:mx-0 leading-relaxed">
              SiteFlow brings planning, daily progress, procurement and project finance into one
              Indian-construction-grade workspace, so your site records and your ledgers finally agree.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 items-center lg:justify-start justify-center pt-2">
              <Link
                href="/login"
                className="w-full sm:w-auto flex items-center justify-center rounded-md bg-primary px-8 py-4 text-base font-bold text-white shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
              >
                Start Free Trial
              </Link>
              <a
                href="#modules"
                className="w-full sm:w-auto flex items-center justify-center rounded-md bg-white/[0.03] border border-border-custom px-8 py-4 text-base font-bold hover:bg-primary/10 hover:border-primary/30 transition-all"
              >
                Explore 16 Modules
              </a>
            </div>
          </div>

          {/* Aurora panel: night sky with soft light curtains + a static UI echo card */}
          <div className="aurora-panel rounded-2xl border border-border-custom h-64 sm:h-80 lg:h-[26rem] w-full">
            <div className="aurora-ribbon aurora-ribbon-1" aria-hidden="true" />
            <div className="aurora-ribbon aurora-ribbon-2" aria-hidden="true" />
            <div className="aurora-ribbon aurora-ribbon-3" aria-hidden="true" />
            <div className="aurora-ribbon aurora-ribbon-4" aria-hidden="true" />
            <div className="aurora-ribbon aurora-ribbon-5" aria-hidden="true" />
            <div className="aurora-ribbon aurora-ribbon-6" aria-hidden="true" />

            {/* Static mock project card floating on the aurora (honest demo strings) */}
            <div className="absolute inset-0 flex items-center justify-center p-6">
              <div className="w-full max-w-xs rounded-xl border border-border-custom bg-card/80 backdrop-blur-md p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-foreground">Greenline Residency</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 rounded-full px-2 py-0.5">
                    Phase 2
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>Weighted progress</span>
                    <span className="text-foreground font-semibold">62%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
                    <div className="h-full w-[62%] rounded-full bg-primary" />
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <div className="h-2.5 w-3/4 rounded bg-foreground/10" />
                  <div className="h-2.5 w-1/2 rounded bg-foreground/10" />
                </div>

                <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] text-foreground">
                  Project P&amp;L: revenue Rs 61L, cost Rs 44L, margin 28%
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust bar, qualitative proof points only (no invented scale numbers) */}
      <section className="max-w-6xl mx-auto px-6">
        <StatBand stats={TRUST_POINTS} />
      </section>

      {/* Differentiators */}
      <section className="max-w-6xl mx-auto px-6 py-20 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-foreground">Why teams move to SiteFlow</h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            The spreadsheet-and-WhatsApp stack breaks the moment a project scales. SiteFlow is built
            for the way Indian sites actually run.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <div key={i} className="rounded-lg bg-card border border-border-custom p-7 space-y-3">
              <div className="text-2xl">{p.icon}</div>
              <h3 className="font-semibold text-foreground text-base leading-snug">{p.title}</h3>
              <p className="text-sm text-muted leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Lead-module deep dives (priority order), demo scenario threaded throughout */}
      <section className="max-w-6xl mx-auto px-6 py-8 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-foreground">What you get on day one</h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            Six of the modules teams reach for first, shown against a single demo project,
            <span className="text-foreground"> Greenline Residency (Phase 2)</span>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {LEAD_MODULES.map((m, i) => (
            <div key={i} className="rounded-lg bg-card border border-border-custom p-6 space-y-3 flex flex-col">
              <h3 className="font-semibold text-foreground text-base">{m.name}</h3>
              <p className="text-sm text-muted leading-relaxed flex-1">{m.desc}</p>
              <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">Demo scenario · </span>
                {m.mock}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Full module grid */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-foreground">Full-Suite Feature Coverage</h2>
          <p className="text-muted text-base max-w-md mx-auto">
            Sixteen modules across pre-construction, execution, resources and finance.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {MODULES.map((sec, idx) => (
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
                    <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                    <p className="text-xs text-muted">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials, signature ✕/✓ before-after device (clearly-labeled illustrative) */}
      <section className="max-w-5xl mx-auto px-6 py-16 space-y-10">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold text-foreground">What swapping the spreadsheet looks like</h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            The examples below are illustrative. They show the before/after pattern, not real
            customer endorsements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <BeforeAfterTestimonial
            illustrative
            name="Ravi Menon"
            role="Project Manager"
            company="Coastal Infra (illustrative)"
            city="Kochi"
            headlineStat="RA-bill turnaround: 9 days → 2"
            before={[
              "Subcontractor bills typed into Excel, re-checked by hand",
              "TDS and retention math done manually, often wrong",
              "No single view of what was approved vs paid",
            ]}
            after={[
              "RA bills generated from DPR quantities automatically",
              "194C TDS and retention applied with one click",
              "Approval and payment status visible to the whole team",
            ]}
          />
          <BeforeAfterTestimonial
            illustrative
            name="Priya Nair"
            role="Finance Lead"
            company="Sterling Builders (illustrative)"
            city="Bengaluru"
            headlineStat="Monthly close: 6 days → 1"
            before={[
              "Project P&L rebuilt in spreadsheets each month",
              "Tally entries keyed in by hand from site notes",
              "Margin surprises found after the fact",
            ]}
            after={[
              "Live project P&L from the same records the site uses",
              "Tally sync pushes vouchers without re-keying",
              "Margin and burn visible before month-end",
            ]}
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-md bg-radial bg-primary border border-border-custom p-12 text-center space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-cover opacity-10 pointer-events-none" />
          <h2 className="text-3xl font-bold text-white">See your site in one workspace</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto">
            Start a free trial and explore the live console. Planning, progress, procurement and
            project finance, with your own data.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-secondary/15 hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom">
        <div className="max-w-6xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-6">
            {/* Brand + tagline */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">
                  S
                </div>
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Site<span className="text-primary">Flow</span>
                </span>
              </div>
              <p className="text-sm text-muted leading-relaxed max-w-xs">
                Planning, progress, procurement and project finance for Indian construction, in one workspace.
              </p>
            </div>

            {/* Product */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/products" className="text-muted hover:text-foreground transition-all">Products</Link></li>
                <li><Link href="/SiteFlow-pricing" className="text-muted hover:text-foreground transition-all">Pricing</Link></li>
                <li><Link href="/who-we-serve" className="text-muted hover:text-foreground transition-all">Who We Serve</Link></li>
                <li><Link href="/integrations" className="text-muted hover:text-foreground transition-all">Integrations</Link></li>
              </ul>
            </div>

            {/* Resources */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/blog" className="text-muted hover:text-foreground transition-all">Blog</Link></li>
                <li><Link href="/help" className="text-muted hover:text-foreground transition-all">Help Center</Link></li>
                <li><Link href="/resources/construction-terms-meanings" className="text-muted hover:text-foreground transition-all">Glossary</Link></li>
                <li><Link href="/resources/construction-calculators" className="text-muted hover:text-foreground transition-all">Calculators</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-muted hover:text-foreground transition-all">About</Link></li>
                <li><Link href="/contact" className="text-muted hover:text-foreground transition-all">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms" className="text-muted hover:text-foreground transition-all">Terms</Link></li>
                <li><Link href="/privacy" className="text-muted hover:text-foreground transition-all">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-border-custom flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-xs text-muted max-w-2xl leading-relaxed">
              SiteFlow is an independent construction operations platform. All product names, logos, and brands are property of their respective owners.
            </p>
            <p className="text-xs text-muted whitespace-nowrap">
              &copy; {new Date().getFullYear()} SiteFlow
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
