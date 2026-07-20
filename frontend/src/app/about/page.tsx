"use client";

import { useEffect } from "react";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import Icon from "@/components/marketing/Icon";
import CountUp from "@/components/marketing/CountUp";

const IS_CHIPS = [
  { label: "IS 456", term: "Concrete" },
  { label: "IS 1786", term: "Rebar" },
  { label: "CPWD", term: "Masonry" },
];

const INTEGRATIONS = [
  { name: "Tally", icon: "account_balance" as const },
  { name: "SiteFlow", icon: "hub" as const },
  { name: "Zoho", icon: "ledger" as const },
];

const PROOF_POINTS = [
  { value: "16", label: "operational modules, one workspace" },
  { value: "2", label: "native accounting integrations (Tally, Zoho)" },
  { value: "IS/CPWD", label: "compliant engineering math" },
  { value: "PWA", label: "with GPS-geofenced attendance" },
];

function IntegrationIcon({ icon }: { icon: "account_balance" | "hub" | "ledger" }) {
  if (icon === "account_balance") {
    return <Icon name="account_balance" className="w-7 h-7" />;
  }
  if (icon === "hub") {
    return (
      <svg
        className="w-7 h-7"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="2.5" />
        <circle cx="4" cy="5" r="1.75" />
        <circle cx="20" cy="5" r="1.75" />
        <circle cx="4" cy="19" r="1.75" />
        <circle cx="20" cy="19" r="1.75" />
        <line x1="5.6" y1="6.4" x2="10.2" y2="10.4" />
        <line x1="18.4" y1="6.4" x2="13.8" y2="10.4" />
        <line x1="5.6" y1="17.6" x2="10.2" y2="13.6" />
        <line x1="18.4" y1="17.6" x2="13.8" y2="13.6" />
      </svg>
    );
  }
  return (
    <svg
      className="w-7 h-7"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v17a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 18.5v-14Z" />
      <path d="M4 18.5A2.5 2.5 0 0 1 6.5 16H20" />
      <line x1="8" y1="7" x2="15" y2="7" />
      <line x1="8" y1="10.5" x2="13" y2="10.5" />
    </svg>
  );
}

export default function AboutPage() {
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
      {/* Hero */}
      <section className="relative px-6 pt-16 pb-24 text-center overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-8">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            The Vision
          </span>

          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            The operations workspace <br />
            <span className="alx-text-gradient-blue">Indian construction was missing</span>
          </h1>

          <p className="font-body text-alx-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            SiteFlow replaces the spreadsheet and WhatsApp stack with one connected record, from the
            first site punch to the final client invoice.
          </p>
        </div>
      </section>

      {/* Product genesis grid: Why SiteFlow Exists / What SiteFlow Is */}
      <section className="max-w-6xl mx-auto px-6 pb-20 alx-scroll-fade">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-alx-surface-container-lowest p-10 md:p-12 space-y-4 shadow-xl shadow-alx-on-surface/5 alx-hover-lift">
            <div className="inline-flex items-center justify-center p-3 bg-alx-primary-fixed rounded-xl text-alx-primary">
              <Icon name="table_chart" className="w-7 h-7" />
            </div>
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface">
              Why SiteFlow Exists
            </h2>
            <p className="font-body text-alx-on-surface-variant text-base leading-relaxed">
              Most Indian sites still run on spreadsheets and WhatsApp groups. That works for one small
              job. It breaks the moment a project scales. Progress lives in one place, payments in
              another, and the ledger somewhere else entirely. Site records and finance ledgers drift
              apart because nothing is connected. By the time anyone notices, the numbers no longer agree.
            </p>
          </div>
          <div className="rounded-2xl bg-alx-surface-container-lowest p-10 md:p-12 space-y-4 shadow-xl shadow-alx-on-surface/5 alx-hover-lift">
            <div className="inline-flex items-center justify-center p-3 bg-alx-primary-fixed rounded-xl text-alx-primary">
              <Icon name="domain_verification" className="w-7 h-7" />
            </div>
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface">
              What SiteFlow Is
            </h2>
            <p className="font-body text-alx-on-surface-variant text-base leading-relaxed">
              SiteFlow is one workspace that connects planning, daily progress, procurement, and project
              finance. It is built for Indian statutory reality, with works-contract GST, TDS, PF and ESI,
              and engineering math to IS and CPWD specifications. This is not a generic project tool with
              a construction skin applied on top. The calculations, the compliance, and the workflows come
              from how Indian sites actually operate.
            </p>
          </div>
        </div>
      </section>

      {/* Pillar 1: Engineering Math, Done Properly */}
      <section className="max-w-5xl mx-auto px-6 pb-20 text-center alx-scroll-fade">
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface mb-4">
          Engineering Math, Done Properly
        </h2>
        <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-10">
          Concrete mix, rebar weight, and brickwork quantities follow IS 456, IS 1786, IS 516 and CPWD.
        </p>
        <div className="relative w-full rounded-3xl p-8 md:p-12 overflow-hidden bg-gradient-to-br from-alx-primary-fixed/40 via-alx-surface-container-low to-alx-primary-fixed/20 border border-alx-outline-variant/15 shadow-lg">
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {IS_CHIPS.map((chip) => (
              <div
                key={chip.label}
                className="bg-alx-surface-container-lowest rounded-xl p-5 shadow-md shadow-alx-on-surface/5"
              >
                <div className="alx-label text-alx-on-surface-variant text-xs mb-1">{chip.label}</div>
                <div className="font-headline text-xl md:text-2xl font-bold text-alx-primary">
                  {chip.term}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pillar 2: One Record, Field to Ledger, with phone mockup */}
      <section className="max-w-5xl mx-auto px-6 pb-20 text-center alx-scroll-fade">
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface mb-4">
          One Record: Field to Ledger
        </h2>
        <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-10">
          A daily progress photo, a geofenced punch, a goods receipt, and a vendor invoice all land in
          the same project.
        </p>
        <div className="mx-auto w-full max-w-xs">
          <div className="relative bg-alx-surface-container-highest rounded-[2.75rem] p-3 shadow-2xl shadow-alx-on-surface/10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-alx-on-surface rounded-b-2xl z-10" />
            <div className="w-full bg-alx-surface-container-lowest rounded-[2.25rem] overflow-hidden border-4 border-alx-surface-container-lowest">
              <div className="alx-bg-gradient-primary px-6 pt-8 pb-6 text-left">
                <div className="alx-label text-alx-on-primary/70 text-[10px] mb-1">Site Alpha</div>
                <div className="font-headline text-xl font-bold text-alx-on-primary">Progress Report</div>
              </div>
              <div className="p-6 space-y-4">
                <div className="h-20 bg-alx-surface-container-low rounded-xl" />
                <div className="h-4 bg-alx-surface-container-low rounded-full w-3/4" />
                <div className="h-4 bg-alx-surface-container-low rounded-full w-full" />
                <div className="h-4 bg-alx-surface-container-low rounded-full w-1/2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillar 3: Built for Indian Compliance, with integration row */}
      <section className="max-w-5xl mx-auto px-6 pb-20 text-center alx-scroll-fade">
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface mb-4">
          Built for Indian Compliance
        </h2>
        <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-10">
          GST, TDS under 194C and 194Q, PF, ESI and BOCW sit inside the workflow.
        </p>
        <div className="w-full rounded-3xl p-8 md:p-12 bg-alx-surface-container-low border border-alx-outline-variant/15">
          <div className="flex items-center justify-center gap-3 sm:gap-6">
            {INTEGRATIONS.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 sm:gap-6">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl bg-alx-surface-container-lowest shadow-md shadow-alx-on-surface/5 border border-alx-outline-variant/15 flex flex-col items-center justify-center gap-2 text-alx-primary">
                  <IntegrationIcon icon={item.icon} />
                  <span className="alx-label text-xs text-alx-on-surface">{item.name}</span>
                </div>
                {i < INTEGRATIONS.length - 1 && (
                  <div className="h-px w-8 sm:w-14 bg-gradient-to-r from-alx-primary/20 via-alx-primary to-alx-primary/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="bg-alx-surface-container py-16 border-y border-alx-outline-variant/15 alx-scroll-fade">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-alx-outline-variant/20">
            {PROOF_POINTS.map((t, i) => (
              <div key={i} className="text-center px-4">
                <div className="font-headline text-3xl font-bold text-alx-primary mb-2">
                  <CountUp value={t.value} />
                </div>
                <div className="font-uilabel text-xs text-alx-on-surface-variant uppercase tracking-widest font-semibold">
                  {t.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-28 px-6 bg-alx-surface-container-lowest alx-scroll-fade">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-alx-primary/10 via-transparent to-transparent opacity-50" />
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface leading-tight mb-6 relative z-10">
            See the workspace for yourself
          </h2>
          <p className="font-body text-alx-on-surface-variant text-sm max-w-md mx-auto mb-8 relative z-10">
            Start a free trial and explore planning, progress, procurement and project finance in one place.
          </p>
          <div className="relative z-10">
            <Link
              href="/login"
              className="alx-bg-gradient-primary text-alx-on-primary px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center relative overflow-hidden group"
            >
              <span className="relative z-10">Start Free Trial</span>
              <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
