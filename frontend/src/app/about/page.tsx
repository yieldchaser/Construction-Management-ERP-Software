"use client";

import { useEffect } from "react";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import Icon from "@/components/marketing/Icon";

const PILLARS = [
  {
    icon: "architecture" as const,
    title: "Engineering math, done properly",
    body: "Concrete mix, rebar weight, and brickwork quantities follow IS 456, IS 1786, IS 516 and CPWD. The outputs are real civil-engineering numbers, not a calculator toy that rounds the wrong way.",
  },
  {
    icon: "domain_verification" as const,
    title: "One record, from field to ledger",
    body: "A daily progress photo, a geofenced punch, a goods receipt, and a vendor invoice all land in the same project. The site and the accounts read from one source, so they stop disagreeing.",
  },
  {
    icon: "account_balance" as const,
    title: "Built for Indian compliance",
    body: "GST, TDS under 194C and 194Q, PF, ESI and BOCW sit inside the workflow. Tally Prime and Zoho Books sync out of the box, because that is where Indian finance teams already work.",
  },
];

const PROOF_POINTS = [
  { value: "16", label: "operational modules, one workspace" },
  { value: "2", label: "native accounting integrations (Tally, Zoho)" },
  { value: "IS", label: "456 · 1786 · 516 & CPWD compliant math" },
  { value: "PWA", label: "with GPS-geofenced attendance" },
];

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
      <section className="relative px-6 pt-16 pb-28 text-center overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/30 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-8">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            About SiteFlow
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

      {/* Why SiteFlow exists */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-4 alx-scroll-fade">
        <h2 className="font-headline text-3xl font-extrabold text-alx-on-surface">Why SiteFlow exists</h2>
        <p className="font-body text-alx-on-surface-variant text-base leading-relaxed">
          Most Indian sites still run on spreadsheets and WhatsApp groups. That works for one small
          job. It breaks the moment a project scales. Progress lives in one place, payments in
          another, and the ledger somewhere else entirely. Site records and finance ledgers drift
          apart because nothing is connected. By the time anyone notices, the numbers no longer agree.
        </p>
      </section>

      {/* What SiteFlow is */}
      <section className="max-w-3xl mx-auto px-6 py-10 space-y-4 alx-scroll-fade">
        <h2 className="font-headline text-3xl font-extrabold text-alx-on-surface">What SiteFlow is</h2>
        <p className="font-body text-alx-on-surface-variant text-base leading-relaxed">
          SiteFlow is one workspace that connects planning, daily progress, procurement, and project
          finance. It is built for Indian statutory reality, with works-contract GST, TDS, PF and ESI,
          and engineering math to IS and CPWD specifications. This is not a generic project tool with a
          construction skin applied on top. The calculations, the compliance, and the workflows come
          from how Indian sites actually operate.
        </p>
      </section>

      {/* Product philosophy header */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-4 alx-scroll-fade">
        <div className="text-center space-y-3">
          <h2 className="font-headline text-3xl font-extrabold text-alx-on-surface">How we build it</h2>
          <p className="font-body text-alx-on-surface-variant text-base max-w-xl mx-auto">
            Three principles shape every module, from planning to final invoice.
          </p>
        </div>
      </section>

      {/* Product pillars */}
      <section className="max-w-6xl mx-auto px-6 pb-20 alx-scroll-fade">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((p, i) => (
            <div
              key={i}
              className="rounded-2xl bg-alx-surface-container-low p-7 space-y-4 shadow-xl shadow-alx-on-surface/5 alx-hover-lift"
            >
              <div className="inline-flex items-center justify-center p-3 bg-alx-primary-fixed rounded-xl text-alx-primary">
                <Icon name={p.icon} className="w-7 h-7" />
              </div>
              <h3 className="font-headline font-bold text-alx-on-surface text-lg leading-snug">{p.title}</h3>
              <p className="font-body text-sm text-alx-on-surface-variant leading-relaxed">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Proof strip, same claim set as homepage and pricing (no invented numbers) */}
      <section className="bg-alx-surface-container py-16 border-y border-alx-outline-variant/15 alx-scroll-fade">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 divide-x divide-alx-outline-variant/20">
            {PROOF_POINTS.map((t, i) => (
              <div key={i} className="text-center px-4">
                <div className="font-headline text-3xl font-bold text-alx-primary mb-2">{t.value}</div>
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
