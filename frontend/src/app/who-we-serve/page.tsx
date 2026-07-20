"use client";

import { useEffect } from "react";
import Link from "next/link";
import MarketingShell from "@/components/marketing/MarketingShell";
import MockupFrame from "@/components/marketing/MockupFrame";
import CountUp from "@/components/marketing/CountUp";
import Icon from "@/components/marketing/Icon";

const STATS = [
  { value: "16", label: "Operational Modules" },
  { value: "2", label: "Native Integrations (Tally, Zoho)" },
  { value: "IS / CPWD", label: "Compliant Math" },
  { value: "GPS", label: "Geofenced PWA" },
];

type Segment = {
  id: string;
  icon: import("@/components/marketing/Icon").IconName;
  tag: string;
  h3: string;
  desc: string;
  problems: string[];
  features: string[];
  learnMore: string;
  dashboardTitle: string;
  variant: "finance" | "mobile" | "procurement" | "planning";
};

const SEGMENTS: Segment[] = [
  {
    id: "builders",
    icon: "home",
    tag: "Builders & Developers",
    h3: "ERP Software for Builders & Developers",
    desc: "From BOQ to client handover, SiteFlow connects every stage of your building project, budget control, procurement, subcontractor billing, and live P&L in one place.",
    problems: [
      "BOQ made once, never tracked against actual spend",
      "Material over-ordering and wastage across units",
      "Subcontractor billing disputes with no linked progress data",
    ],
    features: [
      "BOQ & Budgeting",
      "Progress Tracking",
      "Procurement",
      "Subcontractor Mgmt",
      "Client Invoicing",
      "Project P&L",
      "Tally Sync",
    ],
    learnMore: "/who-we-serve/erp-software-for-builders-and-developers",
    dashboardTitle: "Project Budget Dashboard",
    variant: "finance",
  },
  {
    id: "civil",
    icon: "construction",
    tag: "Civil Contractors",
    h3: "ERP Software for Civil Contractors",
    desc: "GPS attendance, material tracking, quality checklists, and real-time cost control, everything a civil contractor needs to run multi-site projects from a phone.",
    problems: [
      "Attendance tracked in registers that get lost or faked",
      "Equipment idle time and asset losses across sites",
      "Quality issues discovered late, causing expensive rework",
    ],
    features: [
      "GPS Attendance",
      "Labour Management",
      "Material Tracking",
      "Quality Checklists",
      "Equipment Mgmt",
      "Daily Progress Reports",
      "Budget vs Actual",
    ],
    learnMore: "/who-we-serve/civil-contracting-software-why-contractors-are-choosing-SiteFlow-for-smarter-project-delivery",
    dashboardTitle: "Site Attendance & Materials",
    variant: "mobile",
  },
  {
    id: "interior",
    icon: "house",
    tag: "Interior Companies",
    h3: "ERP Software for Interior & Fit-Out Firms",
    desc: "Manage scope, vendor billing, client approvals, and project P&L across multiple interior projects, with the speed that fast-moving fit-out work demands.",
    problems: [
      "Scope creep eroding margins with no change-order tracking",
      "Vendor bills paid without matching delivery or progress",
      "Client approval cycles scattered across WhatsApp threads",
    ],
    features: [
      "Sales & Quotations",
      "Design Management",
      "Vendor Billing",
      "Material Management",
      "Client Invoicing",
      "Subcontractor Billing",
      "Project P&L",
    ],
    learnMore: "/who-we-serve/interior-design-project-management-software-SiteFlow",
    dashboardTitle: "Project Scope & Billing",
    variant: "procurement",
  },
  {
    id: "infra",
    icon: "factory",
    tag: "Infrastructure Companies",
    h3: "ERP Software for Infrastructure & EPC Firms",
    desc: "Multi-site BOQ execution, subcontractor billing linked to progress, production tracking, and consolidated reporting, one source of truth across the entire contract.",
    problems: [
      "No unified view of progress and cost across multiple sites",
      "Subcontractors billing for more work than executed",
      "Delays caught too late with no early warning system",
    ],
    features: [
      "Activity Planning",
      "Multi-Site Progress",
      "Production Mgmt",
      "Subcontractor Mgmt",
      "Equipment Tracking",
      "Procurement",
      "50+ Reports",
    ],
    learnMore: "/who-we-serve/software-for-infrastructure-projects",
    dashboardTitle: "Multi-Site Progress Tracker",
    variant: "planning",
  },
];

const FAQS = [
  {
    q: "Does SiteFlow work for all types of construction companies?",
    a: "Yes. SiteFlow is built for <strong>builders and developers, civil contractors, interior firms, and infrastructure and EPC companies</strong>. The platform is the same. Features are configured based on how your business type actually operates. A civil contractor uses GPS attendance and quality checklists daily; an interior firm uses quotations and scope management. Both run on SiteFlow.",
  },
  {
    q: "We run a small interior company with 3 projects. Is SiteFlow too complex for us?",
    a: "Not at all. SiteFlow gets your team productive quickly, with no IT team required. Our onboarding manager loads your data and trains your team. Interior companies typically use SiteFlow for quotations, scope tracking, vendor billing, and client invoicing, and you can start with just those modules and expand as you grow.",
  },
  {
    q: "We have multiple sites across states. Can SiteFlow handle that?",
    a: "Yes. SiteFlow is designed for <strong>multi-site, multi-project operations</strong>. You get a consolidated dashboard showing progress, cost, attendance, and billing across all sites simultaneously. This is especially used by infrastructure and EPC companies managing road, pipeline, and metro projects across different locations. Material libraries, rate libraries, and party masters are all shared centrally.",
  },
  {
    q: "How does SiteFlow help builders control subcontractor billing?",
    a: "SiteFlow links every subcontractor bill to <strong>actual measured progress</strong>, not just what the subcontractor claims. Work orders are created with quantities and rates. Bills are raised against completed work only. Multi-level approval workflows ensure no bill moves forward without the right sign-offs. Retention amounts are tracked automatically and released at defined milestones. This eliminates overpayment disputes entirely.",
  },
  {
    q: "My site engineers are not tech-savvy. Will they actually use it?",
    a: "Site engineers who have never used software are entering DPRs in SiteFlow within their first week. The mobile app is optimised for on-site use, minimal taps, works on any Android phone, and has offline capability. We provide <strong>module-wise tutorials in Hindi and English</strong>. Your onboarding manager stays available for the first 30 days. WhatsApp remains the primary alert and notification channel for field teams. No new app habits required.",
  },
  {
    q: "Does SiteFlow work for infrastructure and road construction projects?",
    a: "Yes. Infrastructure clients use SiteFlow for <strong>activity scheduling, BOQ-linked progress tracking, production management</strong> (concrete batching, asphalt mixes), equipment tracking, and subcontractor billing tied to measured quantities. Road, railway, pipeline, and solar projects are all supported.",
  },
  {
    q: "Can we use SiteFlow alongside Tally for accounting?",
    a: "Yes, and this is one of the most common setups. <strong>Finance stays on Tally; site execution runs on SiteFlow.</strong> Purchase orders, vendor invoices, and client receipts sync both ways automatically. GST ledgers, cost centres, and narration formats are configured to match your existing Tally setup. Zoho Books integration is also available. Zero double entry for your accounts team.",
  },
];

function PainIcon() {
  return (
    <svg
      className="w-4 h-4 shrink-0 mt-0.5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="w-5 h-5 shrink-0 text-alx-primary transition-transform duration-300 group-open:rotate-180"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function WhoWeServePage() {
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
      <section className="relative px-6 pt-16 pb-20 text-center overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10 space-y-8">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            Who We Serve
          </span>

          <h1 className="font-headline text-5xl md:text-6xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            Built for Every Type of{" "}
            <span className="alx-text-gradient-blue">Construction Business.</span>
          </h1>

          <p className="font-body text-alx-on-surface-variant text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
            SiteFlow is <strong className="text-alx-on-surface font-semibold">not a generic ERP</strong> with a
            construction module. It is a control system built from real project sites, connecting BOQ, materials,
            labour, billing, and profit in one platform.
          </p>

          <div className="flex justify-center">
            <Link
              href="/contact"
              className="alx-bg-gradient-primary text-alx-on-primary px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">Book a Free Demo <Icon name="arrow_right" className="w-4 h-4" /></span>
              <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="max-w-5xl mx-auto px-6 pb-24 alx-scroll-fade">
        <div className="rounded-3xl bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 border border-alx-outline-variant/15 p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 md:divide-x divide-alx-outline-variant/20 text-center">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center px-2">
                <span className="font-headline text-3xl md:text-4xl font-bold text-alx-primary mb-2">
                  <CountUp value={stat.value} />
                </span>
                <span className="font-uilabel text-xs text-alx-on-surface-variant uppercase tracking-wider font-semibold">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Segment grid */}
      <section className="max-w-6xl mx-auto px-6 pb-28 alx-scroll-fade">
        <div className="text-center mb-16 space-y-4">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            Who We Serve
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface">
            SiteFlow ERP for Every Construction Segment
          </h2>
          <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-2xl mx-auto">
            Same platform, configured for how your specific type of construction business actually operates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {SEGMENTS.map((segment) => (
            <div
              key={segment.id}
              id={segment.id}
              className="rounded-3xl bg-alx-surface-container-lowest border border-alx-outline-variant/15 shadow-xl shadow-alx-on-surface/5 overflow-hidden flex flex-col alx-hover-lift"
            >
              <div className="p-5 pb-0">
                <div className="flex items-center justify-between px-1 pb-3">
                  <span className="font-uilabel text-xs font-semibold text-alx-on-surface-variant">
                    {segment.dashboardTitle}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-alx-primary-fixed px-2.5 py-1 text-[10px] font-bold text-alx-on-primary-fixed">
                    <span className="w-1.5 h-1.5 rounded-full bg-alx-on-primary-fixed animate-pulse" />
                    LIVE
                  </span>
                </div>
                <MockupFrame variant={segment.variant} />
              </div>

              <div className="p-8 flex-grow flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-alx-primary-fixed text-alx-primary flex items-center justify-center text-lg">
                    <Icon name={segment.icon} className="w-5 h-5" />
                  </div>
                  <span className="font-uilabel text-xs font-bold text-alx-primary uppercase tracking-wider">
                    {segment.tag}
                  </span>
                </div>
                <h3 className="font-headline text-2xl font-bold text-alx-on-surface mb-3">{segment.h3}</h3>
                <p className="font-body text-alx-on-surface-variant mb-6">{segment.desc}</p>

                <div className="space-y-3 mb-6">
                  <h4 className="font-uilabel text-xs font-bold text-alx-on-surface uppercase tracking-wider">
                    Problems SiteFlow Solves
                  </h4>
                  {segment.problems.map((problem) => (
                    <div key={problem} className="flex items-start gap-2 text-alx-on-error-container">
                      <PainIcon />
                      <span className="font-body text-sm text-alx-on-surface-variant">{problem}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-3 mb-8">
                  <h4 className="font-uilabel text-xs font-bold text-alx-on-surface uppercase tracking-wider">
                    Key Features
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {segment.features.map((feature) => (
                      <span
                        key={feature}
                        className="font-uilabel text-xs font-semibold text-alx-primary bg-alx-primary-fixed/60 rounded-full px-3 py-1.5"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-auto pt-2">
                  <Link
                    href={segment.learnMore}
                    className="group/link font-uilabel text-sm font-bold text-alx-primary inline-flex items-center gap-1"
                  >
                    Learn More
                    <span className="transition-transform group-hover/link:translate-x-1 inline-flex"><Icon name="arrow_right" className="w-4 h-4" /></span>
                  </Link>
                  <Link
                    href="/contact"
                    className="font-uilabel text-sm font-semibold text-alx-on-surface bg-alx-surface-container hover:bg-alx-surface-container-high px-5 py-2.5 rounded-full transition-colors"
                  >
                    Book Demo
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-6 pb-28 alx-scroll-fade">
        <div className="text-center mb-12 space-y-4">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            FAQ
          </span>
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface">
            Questions About SiteFlow ERP for Your Construction Segment
          </h2>
        </div>

        <div className="divide-y divide-alx-outline-variant/20 border-t border-b border-alx-outline-variant/20">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group py-6 cursor-pointer">
              <summary className="flex items-center justify-between gap-4 font-headline font-semibold text-lg text-alx-on-surface list-none [&::-webkit-details-marker]:hidden">
                {faq.q}
                <ChevronIcon />
              </summary>
              <div
                className="pt-4 font-body text-alx-on-surface-variant leading-relaxed [&>strong]:text-alx-on-surface [&>strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: faq.a }}
              />
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-28 alx-scroll-fade">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-alx-primary/10 via-transparent to-transparent opacity-50" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {SEGMENTS.map((segment) => (
                <span
                  key={segment.id}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-alx-surface-container-lowest text-alx-on-surface text-xs font-semibold border border-alx-outline-variant/20"
                >
                  <Icon name={segment.icon} className="w-3.5 h-3.5" /> {segment.tag}
                </span>
              ))}
            </div>
            <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface leading-tight mb-6">
              Ready to See SiteFlow in Action?
            </h2>
            <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-2xl mx-auto mb-10">
              Book a free demo tailored to your construction segment. Our team will show you exactly how SiteFlow
              solves the problems your business type faces every day.
            </p>
            <Link
              href="/contact"
              className="alx-bg-gradient-primary text-alx-on-primary px-10 py-4 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center gap-2 relative overflow-hidden group"
            >
              <span className="relative z-10 inline-flex items-center gap-2 whitespace-nowrap">Book a Free Demo <Icon name="arrow_right" className="w-4 h-4" /></span>
              <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <p className="font-body text-sm text-alx-on-surface-variant mt-6 font-medium">
              No credit card required &middot; Go live in &lt;1 day &middot; Dedicated onboarding manager included
            </p>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

