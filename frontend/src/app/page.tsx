"use client";

import { useEffect } from "react";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import MockupFrame from "@/components/marketing/MockupFrame";
import Icon from "@/components/marketing/Icon";
import TypewriterText from "@/components/marketing/TypewriterText";
import CountUp from "@/components/marketing/CountUp";

export default function LandingPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.15 }
    );

    document.querySelectorAll(".alx-scroll-fade").forEach((section) => {
      observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <MarketingShell>
      {/* 1. Symmetrical Hero */}
      <section className="relative pt-20 pb-32 px-6 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 alx-hero-wash" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-alx-tertiary-fixed/15 via-transparent to-transparent" />
        </div>
        <div className="alx-grain absolute inset-0 z-0" aria-hidden="true" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="font-headline text-5xl md:text-7xl font-extrabold text-alx-on-surface leading-[1.18] tracking-tight mb-8">
            Run every project from <br />
            <TypewriterText
              phrases={["one ledger.", "one dashboard.", "one record.", "one workspace."]}
              className="alx-text-gradient-blue"
            />
          </h1>
          <p className="font-body text-xl text-alx-on-surface-variant max-w-2xl mx-auto mb-12 leading-relaxed">
            SiteFlow brings planning, daily progress, procurement, and project finance into one
            integrated workspace. See the full picture and align your team.
          </p>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-20">
            <Link
              href="/login"
              className="relative w-full sm:w-auto group"
            >
              <span className="absolute -inset-3 rounded-full bg-alx-primary/30 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-300 -z-10" />
              <span className="alx-bg-gradient-primary text-alx-on-primary px-8 py-4 rounded-full font-uilabel text-base font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 w-full sm:w-auto relative overflow-hidden flex items-center justify-center">
                <span className="relative z-10">Start Free Trial</span>
                <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </span>
            </Link>
            <Link
              href="/products"
              className="bg-alx-surface-container-high text-alx-primary px-8 py-4 rounded-full font-uilabel text-base font-bold tracking-wide hover:bg-alx-surface-dim transition-all active:scale-95 w-full sm:w-auto flex items-center justify-center gap-2"
            >
              Explore 16 Modules
              <Icon name="arrow_forward" className="w-4 h-4" />
            </Link>
          </div>
          <div className="relative max-w-6xl mx-auto transform hover:-translate-y-2 transition-transform duration-700 ease-out alx-hover-lift">
            <div className="absolute inset-0 bg-alx-primary/5 blur-3xl rounded-[3rem] -z-10 transform scale-95 translate-y-8" />
            <div className="alx-float rounded-xl shadow-2xl shadow-alx-on-surface/10 [box-shadow:0_25px_60px_-15px_rgba(9,76,178,0.25),0_10px_20px_-8px_rgba(27,28,29,0.12)]">
              <MockupFrame variant="hero" />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Value Metrics Bar */}
      <section className="bg-alx-surface-container py-16 border-y border-alx-outline-variant/15 alx-scroll-fade">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-alx-outline-variant/20">
            <div className="text-center px-4 group">
              <div className="font-headline text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="16" />
              </div>
              <div className="font-uilabel text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Modules
              </div>
            </div>
            <div className="text-center px-4 group">
              <div className="font-headline text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="1" />
              </div>
              <div className="font-uilabel text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Record
              </div>
            </div>
            <div className="text-center px-4 group">
              <div className="font-headline text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="IS-Code" />
              </div>
              <div className="font-uilabel text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Grade Math
              </div>
            </div>
            <div className="text-center px-4 group">
              <div className="font-headline text-4xl font-bold text-alx-primary mb-2 group-hover:scale-110 transition-transform">
                <CountUp value="PWA" />
              </div>
              <div className="font-uilabel text-sm text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                Offline Mode
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Module Deep Dives */}
      <section className="py-32 space-y-40 bg-alx-surface-container-lowest">
        {/* Section A: Planning & Execution Engine */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center alx-scroll-fade">
          <div className="order-2 lg:order-1 relative group alx-hover-lift">
            <div className="absolute inset-0 bg-alx-primary-fixed/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-alx-primary-fixed/30 transition-colors duration-500" />
            <MockupFrame variant="planning" />
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-alx-primary-fixed rounded-xl mb-4 text-alx-primary">
              <Icon name="edit_calendar" className="w-8 h-8" />
            </div>
            <h2 className="font-headline text-4xl font-bold text-alx-on-surface leading-tight">
              Planning &amp; Execution Engine
            </h2>
            <p className="font-body text-lg text-alx-on-surface-variant leading-relaxed">
              Import complex BOQs instantly and transform them into actionable project timelines.
              Our intelligent Gantt system auto-adjusts dependencies, ensuring your field teams
              and office ledgers are always synchronized perfectly.
            </p>
            <ul className="space-y-4 pt-4 font-body text-alx-on-surface">
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">Critical-path float tracking</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">Structural BOQ variance detection</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">WBS Level 4 scheduling</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Section B: Procurement & 3-Way Match */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center alx-scroll-fade">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-alx-secondary-container rounded-xl mb-4 text-alx-on-secondary-container">
              <Icon name="inventory_2" className="w-8 h-8" />
            </div>
            <h2 className="font-headline text-4xl font-bold text-alx-on-surface leading-tight">
              Procurement &amp; 3-Way Match
            </h2>
            <p className="font-body text-lg text-alx-on-surface-variant leading-relaxed">
              Eliminate leakage with strict 3-way matching between Purchase Orders, Goods Receipt
              Notes, and Invoices. Track inventory across multiple sites with precise vendor
              scoring and automated reorder alerts.
            </p>
            <ul className="space-y-4 pt-4 font-body text-alx-on-surface">
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">Vendor compliance scoring</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">PO reconciliation auto-match</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">Material indent lead-time tracking</span>
              </li>
            </ul>
          </div>
          <div className="relative group alx-hover-lift">
            <div className="absolute inset-0 bg-alx-primary-fixed/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-alx-primary-fixed/30 transition-colors duration-500" />
            <div className="alx-float">
              <MockupFrame variant="procurement" />
            </div>
          </div>
        </div>

        {/* Section C: Daily Progress Automation */}
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center alx-scroll-fade">
          <div className="order-2 lg:order-1 relative group alx-hover-lift">
            <div className="absolute inset-0 bg-alx-primary-fixed/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-alx-primary-fixed/30 transition-colors duration-500" />
            <div className="scale-95 alx-float-delayed">
              <MockupFrame variant="mobile" />
            </div>
          </div>
          <div className="order-1 lg:order-2 space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-alx-tertiary-fixed rounded-xl mb-4 text-alx-on-tertiary-fixed">
              <Icon name="mobile_friendly" className="w-8 h-8" />
            </div>
            <h2 className="font-headline text-4xl font-bold text-alx-on-surface leading-tight">
              Daily Progress Automation
            </h2>
            <p className="font-body text-lg text-alx-on-surface-variant leading-relaxed">
              Capture reality from the field. Our offline-first PWA ensures daily progress
              reports, geofenced attendance, and material requisitions are logged seamlessly,
              even without a reliable connection.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 text-alx-primary font-uilabel font-bold uppercase tracking-wide hover:underline underline-offset-4 pt-4 group"
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
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center alx-scroll-fade">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center p-3 bg-alx-error-container rounded-xl mb-4 text-alx-on-error-container">
              <Icon name="account_balance" className="w-8 h-8" />
            </div>
            <h2 className="font-headline text-4xl font-bold text-alx-on-surface leading-tight">
              Finance &amp; Compliance Hub
            </h2>
            <p className="font-body text-lg text-alx-on-surface-variant leading-relaxed">
              Simplify complex subcontractor RA billing. Automatically calculate TDS, GST, and
              retention with a single click. Sync flawlessly with standard accounting tools like
              Tally and Zoho Books to keep your central ledger impeccable.
            </p>
            <ul className="space-y-4 pt-4 font-body text-alx-on-surface">
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">RA-Bill ledger integration</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">TDS and GST compliance engine</span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="check_circle" className="w-6 h-6 text-alx-primary mt-1" />
                <span className="font-semibold text-alx-on-surface">Project P&amp;L margin analysis</span>
              </li>
            </ul>
          </div>
          <div className="relative group alx-hover-lift">
            <div className="absolute inset-0 bg-alx-primary-fixed/20 blur-3xl rounded-[3rem] -z-10 group-hover:bg-alx-primary-fixed/30 transition-colors duration-500" />
            <div className="alx-float">
              <MockupFrame variant="finance" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. Spreadsheet Chaos vs SiteFlow Matrix */}
      <section className="bg-alx-surface-container py-24 alx-scroll-fade">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-headline text-4xl font-bold text-alx-on-surface">
              The Architecture of Efficiency
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Legacy Card */}
            <div className="bg-alx-surface-container-lowest p-10 rounded-2xl border border-alx-outline-variant/30 flex flex-col items-center text-center opacity-80 hover:opacity-100 transition-opacity">
              <div className="w-16 h-16 bg-alx-surface-dim rounded-full flex items-center justify-center mb-6">
                <Icon name="table_chart" className="w-8 h-8 text-alx-on-surface-variant" />
              </div>
              <h3 className="font-headline text-2xl font-bold text-alx-on-surface mb-4">
                Manual Spreadsheet Delays
              </h3>
              <p className="font-body text-alx-on-surface-variant leading-relaxed">
                Fragmented data across hundreds of files leads to reconciliation nightmares,
                delayed payments, and hidden margin erosion. The old way costs time.
              </p>
            </div>
            {/* SiteFlow Card */}
            <div className="bg-alx-primary-fixed/10 p-10 rounded-2xl border border-alx-primary/20 flex flex-col items-center text-center relative overflow-hidden group alx-hover-lift">
              <div className="absolute inset-0 bg-gradient-to-br from-alx-primary/5 to-transparent pointer-events-none" />
              <div className="w-16 h-16 bg-alx-primary rounded-full flex items-center justify-center mb-6 shadow-lg shadow-alx-primary/30 z-10 group-hover:scale-110 transition-transform">
                <Icon name="domain_verification" className="w-8 h-8 text-alx-on-primary" />
              </div>
              <h3 className="font-headline text-2xl font-bold text-alx-primary mb-4 z-10">
                Automated ERP Efficiency
              </h3>
              <p className="font-body text-alx-on-surface-variant leading-relaxed z-10">
                A singular, unified ledger where every field update instantly reflects in
                financial projections. Precision engineering for your business operations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Conversion CTA */}
      <section className="py-32 px-6 bg-alx-surface-container-lowest alx-scroll-fade">
        <div className="max-w-5xl mx-auto bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container rounded-[3rem] p-16 md:p-24 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-alx-primary/10 via-transparent to-transparent opacity-50" />
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-alx-on-surface leading-tight mb-8 relative z-10">
            See your entire site <br />
            in one workspace
          </h2>
          <div className="flex flex-col sm:flex-row justify-center items-center gap-6 relative z-10">
            <Link
              href="/login"
              className="alx-bg-gradient-primary text-alx-on-primary px-10 py-4 rounded-full font-uilabel text-base font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/40 transition-all active:scale-95 w-full sm:w-auto relative overflow-hidden group"
            >
              <span className="relative z-10">Start Free Trial</span>
              <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="/contact"
              className="bg-alx-surface-container-lowest text-alx-primary border border-alx-outline-variant/30 px-10 py-4 rounded-full font-uilabel text-base font-bold tracking-wide hover:bg-alx-surface-dim transition-all active:scale-95 w-full sm:w-auto"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
