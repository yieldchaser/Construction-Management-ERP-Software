import type { Metadata } from "next";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import MockupFrame from "@/components/marketing/MockupFrame";
import Icon from "@/components/marketing/Icon";
import TypewriterText from "@/components/marketing/TypewriterText";
import CountUp from "@/components/marketing/CountUp";
import Aurora from "@/components/marketing/Aurora";
import EmberSparks from "@/components/marketing/EmberSparks";

export const metadata: Metadata = {
  title: "SiteFlow - Real-Time Construction Management & ERP Software",
  description:
    "Run projects, site execution, GPS attendance, material procurement, subcontractor billing, and financial ledgers from one unified construction operations platform.",
};

export default function LandingPage() {
  return (
    <MarketingShell>
      {/* 1. Symmetrical Hero */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden alx-scroll-fade is-visible alx-hero-card-wrapper">
        {/* Living Drifting Aurora & Valhalla Ember Sparks (0 Filter Blur Overhead) */}
        <Aurora variant="hero" className="absolute inset-0 z-0" />
        <EmberSparks className="absolute inset-0 z-0 pointer-events-none" />
        <div className="alx-grain absolute inset-0 z-0 pointer-events-none" aria-hidden="true" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="font-headline text-3xl sm:text-5xl md:text-7xl font-extrabold text-alx-on-surface leading-[1.18] tracking-tight mb-6 sm:mb-8">
            Run every project from <br />
            <TypewriterText
              phrases={["one ledger.", "one dashboard.", "one record.", "one workspace."]}
              className="alx-text-gradient-blue"
            />
          </h1>
          <p className="font-body text-base sm:text-xl text-alx-on-surface-variant max-w-2xl mx-auto mb-8 sm:mb-12 leading-relaxed">
            SiteFlow brings planning, daily progress, procurement, and project finance into one
            integrated workspace. See the full picture and align your team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3.5 sm:gap-4 mb-12 sm:mb-20">
            <Link
              href="/login"
              prefetch={true}
              className="alx-bg-gradient-primary text-alx-on-primary px-8 py-4 rounded-full font-uilabel text-base font-bold tracking-wide alx-btn-lift-glow active:scale-95 w-full sm:w-auto relative overflow-hidden flex items-center justify-center group"
            >
              <span className="relative z-10">Start Free Trial</span>
            </Link>
            <Link
              href="/products"
              prefetch={true}
              className="alx-btn-secondary-lift bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 border border-sky-200/50 px-8 py-4 rounded-full font-uilabel text-base font-bold tracking-wide active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2 group"
            >
              <span>Explore 16 Modules</span>
              <Icon name="arrow_forward" className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          
          <div className="relative max-w-6xl mx-auto group gpu-accelerated alx-hero-card-wrapper alx-hover-lift">
            {/* GPU-accelerated radial glow backplate (0 software Gaussian blur overhead on scroll) */}
            <div className="absolute -inset-6 rounded-3xl bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400/30 via-blue-500/15 to-transparent opacity-80 group-hover:opacity-100 group-hover:from-sky-400/50 group-hover:via-blue-500/30 transition-all duration-500 pointer-events-none -z-10" />
            <div className="alx-float rounded-xl shadow-2xl shadow-alx-on-surface/10 [box-shadow:0_25px_60px_-15px_rgba(9,76,178,0.25),0_10px_20px_-8px_rgba(27,28,29,0.12)] gpu-accelerated">
              <MockupFrame variant="hero" src="/marketing/landing/hero-dashboard.webp" alt="SiteFlow project dashboard showing budget, progress, and site status" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Value Metrics Bar - Redesigned Floating Glass Deck */}
      <section className="py-8 sm:py-12 px-4 sm:px-6 alx-scroll-fade">
        <div className="max-w-7xl mx-auto bg-gradient-to-r from-white/80 via-sky-50/50 to-white/80 backdrop-blur-md rounded-3xl border border-sky-100/50 py-8 sm:py-12 px-4 sm:px-8 shadow-xl shadow-sky-900/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 md:gap-12 divide-y sm:divide-y-0 sm:divide-x divide-sky-100/50">
            <div className="text-center px-2 sm:px-4 group">
              <div className="font-headline text-3xl sm:text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="16" />
              </div>
              <div className="font-uilabel text-xs sm:text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Modules
              </div>
            </div>
            <div className="text-center px-2 sm:px-4 group pt-4 sm:pt-0">
              <div className="font-headline text-3xl sm:text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="1" />
              </div>
              <div className="font-uilabel text-xs sm:text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Record
              </div>
            </div>
            <div className="text-center px-2 sm:px-4 group pt-4 sm:pt-0">
              <div className="font-headline text-3xl sm:text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="IS-Code" />
              </div>
              <div className="font-uilabel text-xs sm:text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Grade Math
              </div>
            </div>
            <div className="text-center px-2 sm:px-4 group pt-4 sm:pt-0">
              <div className="font-headline text-3xl sm:text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="PWA" />
              </div>
              <div className="font-uilabel text-xs sm:text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Offline Mode
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Module Deep Dives */}
      <section className="py-16 sm:py-32 space-y-20 sm:space-y-40 bg-alx-surface-container-lowest alx-lazy-section">
        {/* Section A: Planning & Execution Engine */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center alx-scroll-fade">
          <div className="order-2 lg:order-1 relative group alx-hover-lift">
            <div className="absolute inset-0 bg-sky-400/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-sky-400/30 transition-colors duration-500" />
            <MockupFrame variant="planning" src="/marketing/landing/feature-planning.webp" alt="SiteFlow planning and Gantt scheduling screen" />
          </div>
          <div className="order-1 lg:order-2 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-sky-100 rounded-xl mb-2 sm:mb-4 text-sky-700 border border-sky-200 relative">
              <Icon name="edit_calendar" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-sky-600 ring-2 ring-white text-white">
                <Icon name="schedule" className="w-2.5 h-2.5 text-white" />
              </span>
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-alx-on-surface leading-tight">
              Planning &amp; Execution Engine
            </h2>
            <p className="font-body text-base sm:text-lg text-alx-on-surface-variant leading-relaxed">
              Import complex BOQs instantly and transform them into actionable project timelines.
              Our intelligent Gantt system auto-adjusts dependencies, ensuring your field teams
              and office ledgers are always synchronized perfectly.
            </p>
            <ul className="space-y-3 sm:space-y-4 pt-2 sm:pt-4 font-body text-alx-on-surface">
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-xs sm:text-sm text-alx-on-surface">Critical-path float tracking</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-xs sm:text-sm text-alx-on-surface">Structural BOQ variance detection</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-xs sm:text-sm text-alx-on-surface">WBS Level 4 scheduling</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Section B: Procurement & 3-Way Match */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center alx-scroll-fade">
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-emerald-100 rounded-xl mb-2 sm:mb-4 text-emerald-700 border border-emerald-200 relative">
              <Icon name="inventory_2" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 ring-2 ring-white text-white">
                <Icon name="check" className="w-2.5 h-2.5 text-white" />
              </span>
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-alx-on-surface leading-tight">
              Procurement &amp; 3-Way Match
            </h2>
            <p className="font-body text-base sm:text-lg text-alx-on-surface-variant leading-relaxed">
              Eliminate leakage with strict 3-way matching between Purchase Orders, Goods Receipt
              Notes, and Invoices. Track inventory across multiple sites with precise vendor
              scoring and automated reorder alerts.
            </p>
            <ul className="space-y-3 sm:space-y-4 pt-2 sm:pt-4 font-body text-alx-on-surface">
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-xs sm:text-sm text-alx-on-surface">Vendor compliance scoring</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-xs sm:text-sm text-alx-on-surface">PO reconciliation auto-match</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-xs sm:text-sm text-alx-on-surface">Material indent lead-time tracking</span>
              </li>
            </ul>
          </div>
          <div className="relative group alx-hover-lift">
            <div className="absolute inset-0 bg-emerald-400/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-emerald-400/30 transition-colors duration-500" />
            <div className="alx-float">
              <MockupFrame variant="procurement" src="/marketing/landing/feature-procurement.webp" alt="SiteFlow procurement and purchase order matching screen" />
            </div>
          </div>
        </div>

        {/* Section C: Daily Progress Automation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center alx-scroll-fade">
          <div className="order-2 lg:order-1 relative group alx-hover-lift">
            <div className="absolute inset-0 bg-violet-400/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-violet-400/30 transition-colors duration-500" />
            <div className="scale-95 alx-float-delayed">
              <MockupFrame variant="mobile" src="/marketing/landing/feature-dpr-phones.webp" alt="SiteFlow mobile app on three phones showing daily progress report capture" />
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-4 sm:space-y-6">
            <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-violet-100 rounded-xl mb-2 sm:mb-4 text-violet-700 border border-violet-200 relative">
              <Icon name="smartphone" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 ring-2 ring-white text-white">
                <Icon name="check" className="w-2.5 h-2.5 text-white" />
              </span>
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-alx-on-surface leading-tight">
              Daily Progress Automation
            </h2>
            <p className="font-body text-base sm:text-lg text-alx-on-surface-variant leading-relaxed">
              Capture reality from the field. Our offline-first PWA ensures daily progress
              reports, geofenced attendance, and material requisitions are logged seamlessly,
              even without a reliable connection.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-sky-600 font-uilabel font-bold uppercase tracking-wide hover:underline underline-offset-4 pt-2 sm:pt-4 group"
            >
              <span>Explore mobile features</span>
              <Icon
                name="arrow_forward"
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
              />
            </Link>
          </div>
        </div>

        {/* Section D: Finance & Compliance Hub */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center alx-scroll-fade">
          <div className="space-y-4 sm:space-y-6">
            <div className="inline-flex items-center justify-center p-2.5 sm:p-3 bg-amber-100 rounded-xl mb-2 sm:mb-4 text-amber-700 border border-amber-200 relative">
              <Icon name="account_balance" className="w-6 h-6 sm:w-8 sm:h-8" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-600 ring-2 ring-white text-white">
                <Icon name="lock" className="w-2.5 h-2.5 text-white" />
              </span>
            </div>
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-alx-on-surface leading-tight">
              Finance &amp; Compliance Hub
            </h2>
            <p className="font-body text-base sm:text-lg text-alx-on-surface-variant leading-relaxed">
              Simplify complex subcontractor RA billing. Automatically calculate TDS, GST, and
              retention with a single click. Sync flawlessly with standard accounting tools like
              Tally and Zoho Books to keep your central ledger impeccable.
            </p>
            <ul className="space-y-3 sm:space-y-4 pt-2 sm:pt-4 font-body text-alx-on-surface">
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-alx-on-surface">RA-Bill ledger integration</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-alx-on-surface">TDS and GST compliance engine</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-sky-100 ring-1 ring-sky-200">
                  <Icon name="check" className="w-3 h-3 text-sky-600" />
                </span>
                <span className="font-semibold text-alx-on-surface">Project P&amp;L margin analysis</span>
              </li>
            </ul>
          </div>
          <div className="relative group alx-hover-lift">
            <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-amber-400/30 transition-colors duration-500" />
            <div className="alx-float">
              <MockupFrame variant="finance" src="/marketing/landing/feature-finance.webp" alt="SiteFlow finance and compliance dashboard showing cash position and budget utilisation" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Spreadsheet Chaos vs SiteFlow Matrix */}
      <section className="bg-gradient-to-b from-white via-sky-50/25 to-white py-12 sm:py-24 alx-scroll-fade alx-lazy-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-16">
            <h2 className="font-headline text-2xl sm:text-3xl md:text-4xl font-bold text-alx-on-surface">
              The Architecture of Efficiency
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Legacy Card */}
            <div className="bg-white p-6 sm:p-10 rounded-2xl border border-sky-100/50 flex flex-col items-center text-center opacity-80 hover:opacity-100 transition-opacity shadow-sm shadow-sky-900/5">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-sky-50 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                <Icon name="table_chart" className="w-6 h-6 sm:w-8 sm:h-8 text-sky-600" />
              </div>
              <h3 className="font-headline text-xl sm:text-2xl font-bold text-sky-950 mb-3 sm:mb-4">
                Manual Spreadsheet Delays
              </h3>
              <p className="font-body text-sm sm:text-base text-sky-900/80 leading-relaxed">
                Fragmented data across hundreds of files leads to reconciliation nightmares,
                delayed payments, and hidden margin erosion. The old way costs time.
              </p>
            </div>
            {/* SiteFlow Card */}
            <div className="bg-sky-500/10 p-6 sm:p-10 rounded-2xl border border-sky-200/50 flex flex-col items-center text-center relative overflow-hidden group alx-hover-lift shadow-md shadow-sky-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent pointer-events-none" />
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-sky-600 rounded-full flex items-center justify-center mb-4 sm:mb-6 shadow-lg shadow-sky-600/30 z-10 group-hover:scale-110 transition-transform">
                <Icon name="domain_verification" className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <h3 className="font-headline text-xl sm:text-2xl font-bold text-sky-950 mb-3 sm:mb-4 z-10">
                Automated ERP Efficiency
              </h3>
              <p className="font-body text-sm sm:text-base text-sky-900/80 leading-relaxed z-10">
                A singular, unified ledger where every field update instantly reflects in
                financial projections. Precision engineering for your business operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Conversion CTA - Redesigned Editorial Showcase */}
      <section className="py-16 sm:py-32 px-4 sm:px-6 bg-alx-surface-container-lowest alx-scroll-fade alx-lazy-section">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-sky-50 via-white to-sky-100 rounded-3xl sm:rounded-[3rem] p-8 sm:p-16 md:p-24 text-center relative overflow-hidden border border-sky-100 shadow-2xl shadow-sky-900/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-sky-400/10 via-transparent to-transparent opacity-50" />
          <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-extrabold text-sky-950 leading-tight mb-6 sm:mb-8 relative z-10">
            See your entire site <br />
            in one workspace
          </h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 relative z-10">
            <Link
              href="/login"
              prefetch={true}
              className="alx-bg-gradient-primary text-alx-on-primary px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-uilabel text-sm sm:text-base font-bold tracking-wide alx-btn-lift-glow active:scale-95 w-full sm:w-auto relative overflow-hidden flex items-center justify-center group"
            >
              <span className="relative z-10">Start Free Trial</span>
            </Link>
            <Link
              href="/contact"
              prefetch={true}
              className="alx-btn-secondary-lift bg-white text-sky-700 border border-sky-200 px-8 sm:px-10 py-3.5 sm:py-4 rounded-full font-uilabel text-sm sm:text-base font-bold tracking-wide hover:bg-sky-50 active:scale-95 w-full sm:w-auto flex items-center justify-center group"
            >
              <span className="relative z-10">Talk to Sales</span>
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
