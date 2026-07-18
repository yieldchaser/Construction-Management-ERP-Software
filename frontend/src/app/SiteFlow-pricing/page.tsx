"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import CountUp from "@/components/marketing/CountUp";
import Aurora from "@/components/marketing/Aurora";

const PLANS = [
  {
    name: "Starter",
    tagline: "For small contractors & MSME builders",
    price: "₹4,999",
    period: "/ year",
    billing: "Billed annually",
    highlight: false,
    color: "border-alx-outline-variant/30",
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
    color: "border-alx-primary/20",
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
    color: "border-alx-outline-variant/30",
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

const TRUST_BADGES = ["14-day free trial", "No credit card needed", "Cancel anytime"];

const PROOF_POINTS = [
  { value: "16", label: "Operational Modules" },
  { value: "2", label: "Accounting Integrations" },
  { value: "IS", label: "CPWD Compliant" },
  { value: "PWA", label: "Geofenced Attendance" },
];

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
      />
    </svg>
  );
}

function ChevronIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
      <section className="relative px-6 pt-16 pb-16 text-center overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/30 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <Aurora variant="hero" className="absolute inset-0" />
        <div className="max-w-3xl mx-auto relative z-10 space-y-6">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            Transparent Pricing
          </span>

          <h1 className="font-headline text-4xl md:text-6xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            Simple, honest pricing.
            <br />
            <span className="alx-text-gradient-blue">No surprises.</span>
          </h1>

          <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Every plan includes onboarding, training, WhatsApp support, and the full platform. No hidden charges,
            no locked modules.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 pt-2 text-alx-on-surface-variant font-uilabel text-sm font-medium">
            {TRUST_BADGES.map((badge, i) => (
              <span key={i} className="flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-alx-primary" />
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Value Metrics Bar */}
      <section className="max-w-6xl mx-auto px-6 pb-16 alx-scroll-fade">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {PROOF_POINTS.map((t, i) => (
            <div
              key={i}
              className="bg-alx-surface-container-low rounded-full py-6 px-6 text-center flex flex-col justify-center items-center shadow-sm shadow-alx-on-surface/5"
            >
              <div className="font-headline text-3xl font-bold text-alx-primary mb-1">
                <CountUp value={t.value} />
              </div>
              <div className="font-uilabel text-[10px] font-bold uppercase tracking-widest text-alx-on-surface-variant">
                {t.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-6xl mx-auto px-6 pb-20 alx-scroll-fade">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
          {PLANS.map((plan, i) => (
            <div
              key={i}
              className={`relative rounded-2xl flex flex-col h-full ${
                plan.highlight
                  ? "bg-alx-surface-container-lowest p-8 md:p-10 py-14 md:py-16 shadow-2xl shadow-alx-primary/15 border border-alx-primary/10 lg:-translate-y-4 z-10"
                  : `bg-alx-surface-container-lowest p-8 md:p-10 border ${plan.color} shadow-md shadow-alx-on-surface/5`
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 alx-bg-gradient-primary text-alx-on-primary px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] shadow-lg shadow-alx-primary/25">
                  {plan.badge}
                </div>
              )}

              <div className="flex-grow space-y-6">
                <div>
                  <h2 className={`font-headline font-bold text-alx-on-surface ${plan.highlight ? "text-3xl" : "text-2xl"}`}>
                    {plan.name}
                  </h2>
                  <p className="font-body text-alx-on-surface-variant text-sm mt-2">{plan.tagline}</p>
                </div>

                <div>
                  <div
                    className={`font-headline font-bold text-alx-on-surface tracking-tight ${
                      plan.highlight ? "text-5xl md:text-6xl" : "text-4xl md:text-5xl"
                    }`}
                  >
                    {plan.price}
                    {plan.period && (
                      <span className="text-[0.4em] text-alx-on-surface-variant/70 font-body align-baseline ml-1">
                        {plan.period}
                      </span>
                    )}
                  </div>
                  <div className="font-uilabel text-[10px] uppercase tracking-[0.2em] text-alx-primary font-bold mt-2">
                    {plan.billing}
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-3 font-body text-sm text-alx-on-surface-variant">
                      <CheckIcon className="w-5 h-5 text-alx-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={plan.ctaLink}
                className={`w-full text-center block mt-10 rounded-xl font-uilabel font-bold transition-all active:scale-[0.98] ${
                  plan.highlight
                    ? "alx-bg-gradient-primary text-alx-on-primary py-4 text-base shadow-lg shadow-alx-primary/20 hover:shadow-xl hover:shadow-alx-primary/30"
                    : "border-2 border-alx-primary text-alx-primary py-3.5 text-sm hover:bg-alx-primary-fixed/40"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20 alx-scroll-fade">
        <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface text-center mb-10">
          Pricing FAQs
        </h2>
        <div className="space-y-3">
          {FAQ.map((item, i) => (
            <div
              key={i}
              className="bg-alx-surface-container-low rounded-xl overflow-hidden shadow-sm shadow-alx-on-surface/5"
            >
              <button
                className="w-full flex items-center justify-between gap-4 p-6 text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                aria-expanded={openFaq === i}
              >
                <span className="font-headline text-base md:text-lg font-bold text-alx-on-surface">{item.q}</span>
                <ChevronIcon
                  className={`w-5 h-5 text-alx-primary flex-shrink-0 transition-transform duration-300 ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-6 font-body text-sm text-alx-on-surface-variant leading-relaxed">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-8 px-6 pb-28 alx-scroll-fade">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-alx-primary/10 via-transparent to-transparent opacity-50" />
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface leading-tight mb-6 relative z-10">
            Start your 14-day free trial today
          </h2>
          <p className="font-body text-alx-on-surface-variant text-sm max-w-md mx-auto mb-8 relative z-10">
            Your dedicated onboarding manager loads your data and gets your team started.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
            <Link
              href="/login"
              className="alx-bg-gradient-primary text-alx-on-primary px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center relative overflow-hidden group"
            >
              <span className="relative z-10">Start Free Trial</span>
              <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="/contact"
              className="border border-alx-outline-variant text-alx-on-surface px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:bg-alx-surface-container transition-all active:scale-95 inline-flex items-center justify-center"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
