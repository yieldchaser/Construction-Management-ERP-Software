"use client";

import React, { useState } from "react";
import Link from "next/link";

const PLANS = [
  {
    name: "Starter",
    tagline: "For small contractors & MSME builders",
    price: "₹4,999",
    period: "/ year",
    billing: "Billed annually",
    highlight: false,
    color: "border-border-custom",
    badge: null,
    features: [
      "Up to 3 active projects",
      "BOQ & Budget tracking",
      "Material & Warehouse management",
      "GPS Attendance (up to 50 workers)",
      "Daily Progress Reports (DPR)",
      "WhatsApp alerts & notifications",
      "Basic Reports & Exports",
      "Mobile App (iOS + Android)",
      "1 Onboarding Manager",
    ],
    cta: "Start Free Trial",
    ctaLink: "/login",
  },
  {
    name: "Professional",
    tagline: "For growing contractors & mid-size firms",
    price: "₹9,999",
    period: "/ year",
    billing: "Billed annually",
    highlight: true,
    color: "border-primary/40",
    badge: "Most Popular",
    features: [
      "Up to 15 active projects",
      "Everything in Starter",
      "CRM & Lead Management",
      "Subcontractor RA Billing",
      "Procurement & RFQ matrix",
      "Tally ERP / Zoho Books sync",
      "Equipment & Asset tracking",
      "Multi-level Approval workflows",
      "Advanced Reports & P&L",
      "Unlimited team members",
      "Priority WhatsApp support",
    ],
    cta: "Get Demo",
    ctaLink: "/contact",
  },
  {
    name: "Enterprise",
    tagline: "For EPC firms & multi-site operations",
    price: "Custom",
    period: "",
    billing: "Contact sales for pricing",
    highlight: false,
    color: "border-border-custom",
    badge: null,
    features: [
      "Unlimited projects & sites",
      "Everything in Professional",
      "Custom integrations & API access",
      "Multi-company / holding structure",
      "Dedicated Account Manager",
      "On-site training & onboarding",
      "SLA-backed uptime guarantee",
      "Custom reporting dashboards",
      "White-label mobile app option",
    ],
    cta: "Talk to Sales",
    ctaLink: "/contact",
  },
];

const FAQ = [
  {
    q: "Is there a free trial?",
    a: "Yes. We offer a 14-day full-access trial. No credit card required. Your onboarding manager sets up your data before you start.",
  },
  {
    q: "Are there any hidden fees?",
    a: "None. No setup fees, no per-module charges, no implementation costs. Onboarding, training, and WhatsApp support are included in every plan.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes, you can upgrade or downgrade at any time. Billing adjusts pro-rata from the date of change.",
  },
  {
    q: "What's included in onboarding?",
    a: "A dedicated manager loads your material library, BOQ files, party master, and rate library. Your onboarding manager gets your team started on the platform.",
  },
  {
    q: "Do you offer monthly billing?",
    a: "Annual plans offer the best value. Monthly billing is available at a 20% premium. Ask your sales rep.",
  },
];

const PROOF_POINTS = [
  { value: "16", label: "operational modules, one workspace" },
  { value: "2", label: "native accounting integrations (Tally, Zoho)" },
  { value: "IS", label: "456 · 1786 · 516 & CPWD compliant math" },
  { value: "PWA", label: "with GPS-geofenced attendance" },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-tr bg-primary font-sans font-bold text-white shadow-md">S</div>
          <span className="text-lg font-bold tracking-tight text-white">Site<span className="text-primary">Flow</span></span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/products" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Products</Link>
          <Link href="/about" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">About</Link>
          <Link href="/who-we-serve" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Who We Serve</Link>
          <Link href="/contact" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Contact</Link>
          <Link href="/login" className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all">
            Start Free Trial
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-16 text-center max-w-3xl mx-auto space-y-5">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          💰 Transparent Pricing
        </span>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
          Simple, honest pricing.<br />
          <span className="text-gradient-accent">No surprises.</span>
        </h1>
        <p className="text-muted text-base max-w-xl mx-auto">
          Every plan includes onboarding, training, WhatsApp support, and the full platform. No hidden charges, no locked modules.
        </p>
        <div className="flex items-center justify-center gap-4 text-xs text-muted pt-2">
          <span className="flex items-center gap-1.5">✓ 14-day free trial</span>
          <span className="flex items-center gap-1.5">✓ No credit card needed</span>
          <span className="flex items-center gap-1.5">✓ Cancel anytime</span>
        </div>
      </section>

      {/* Proof strip, qualitative claim set only (no invented scale numbers) */}
      <section className="max-w-6xl mx-auto px-6 pb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px rounded-lg border border-border-custom bg-border-custom overflow-hidden">
          {PROOF_POINTS.map((t, i) => (
            <div key={i} className="bg-card px-4 py-6 text-center space-y-1">
              <div className="text-2xl font-extrabold text-white">{t.value}</div>
              <div className="text-xs text-muted">{t.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan, i) => (
          <div
            key={i}
            className={`relative rounded-md border p-8 flex flex-col justify-between space-y-6 transition-all ${
              plan.highlight
                ? "bg-gradient-to-b from-primary/10 to-transparent border-primary/40 shadow-xl shadow-primary/10"
                : "bg-card border border-border-custom rounded-lg border-border-custom"
            }`}
          >
            {plan.badge && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {plan.badge}
                </span>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-white">{plan.name}</h2>
                <p className="text-xs text-muted mt-1">{plan.tagline}</p>
              </div>

              <div className="flex items-end gap-1 pt-2">
                <span className="text-4xl font-extrabold text-white">{plan.price}</span>
                <span className="text-sm text-muted mb-1">{plan.period}</span>
              </div>
              <p className="text-[10px] text-muted uppercase tracking-wider">{plan.billing}</p>

              <div className="border-t border-border-custom pt-4 space-y-2.5">
                {plan.features.map((f, j) => (
                  <div key={j} className="flex items-start gap-2.5 text-xs text-zinc-300">
                    <span className="mt-0.5 text-primary font-bold flex-shrink-0">✓</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={plan.ctaLink}
              className={`w-full text-center block rounded-md py-3 text-sm font-bold transition-all ${
                plan.highlight
                  ? "bg-primary text-white hover:opacity-90 shadow-lg shadow-primary/20"
                  : "bg-white/[0.05] border border-border-custom text-white hover:bg-white/10"
              }`}
            >
              {plan.cta}
            </Link>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-10 space-y-4 pt-16">
        <h2 className="text-2xl font-extrabold text-white text-center mb-6">Pricing FAQs</h2>
        {FAQ.map((item, i) => (
          <div
            key={i}
            className="bg-card border border-border-custom rounded-lg rounded-lg border border-border-custom overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between p-5 text-left"
              onClick={() => setOpenFaq(openFaq === i ? null : i)}
            >
              <span className="text-sm font-semibold text-white">{item.q}</span>
              <span className={`text-primary transition-transform text-lg ${openFaq === i ? "rotate-45" : ""}`}>+</span>
            </button>
            {openFaq === i && (
              <div className="px-5 pb-5 text-sm text-muted leading-relaxed border-t border-border-custom pt-4">
                {item.a}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* CTA Banner */}
      <section className="max-w-4xl mx-auto px-6">
        <div className="rounded-md bg-gradient-to-r from-primary/20 to-secondary/20 border border-border-custom p-12 text-center space-y-5">
          <h2 className="text-3xl font-extrabold text-white">Start your 14-day free trial today</h2>
          <p className="text-white/70 text-sm max-w-md mx-auto">
            Your dedicated onboarding manager loads your data and gets your team started.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <Link href="/login" className="rounded-md bg-primary px-8 py-3 text-sm font-bold text-white hover:opacity-90 transition-all shadow-lg shadow-primary/20">
              Start Free Trial →
            </Link>
            <Link href="/contact" className="rounded-md border border-white/20 px-8 py-3 text-sm font-bold text-white hover:bg-white/5 transition-all">
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-custom py-8 text-muted">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            SiteFlow is a site operations platform. All product logos are property of their respective owners.
          </p>
          <div className="flex items-center flex-wrap gap-x-6 gap-y-2 text-xs">
            <Link href="/blog" className="hover:text-muted transition-all whitespace-nowrap">Blog</Link>
            <Link href="/help" className="hover:text-muted transition-all whitespace-nowrap">Help Center</Link>
            <Link href="/resources/construction-terms-meanings" className="hover:text-muted transition-all whitespace-nowrap">Glossary</Link>
            <Link href="/resources/construction-calculators" className="hover:text-muted transition-all whitespace-nowrap">Calculators</Link>
            <Link href="/who-we-serve" className="hover:text-muted transition-all whitespace-nowrap">Who We Serve</Link>
            <Link href="/terms" className="hover:text-muted transition-all whitespace-nowrap">Terms</Link>
            <Link href="/privacy" className="hover:text-muted transition-all whitespace-nowrap">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
