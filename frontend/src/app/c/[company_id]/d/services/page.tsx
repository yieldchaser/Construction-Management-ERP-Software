"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";

interface ServiceItem {
  icon: string;
  title: string;
  price?: string;
  sub?: string;
  desc?: string;
}

const SALES_EMAIL = "sales@siteflow.in";

export default function ServicesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params?.company_id as string || "e0000000-0000-0000-0000-000000000000";

  const services: ServiceItem[] = [
    {
      icon: "🔧",
      title: "Customisation Request",
      desc: "Use this form to request onsite customizations. Our team will review your needs and schedule the service accordingly.",
    },
    {
      icon: "🎧",
      title: "Offline Support (3 days)",
      price: "Rs 25000 + Travel + Accommodation + Taxes",
    },
    {
      icon: "📄",
      title: "Tally Integration",
      price: "Rs 20000 One Time + Taxes",
      sub: "Rs 5000 Annual Maintenance + Taxes",
    },
    {
      icon: "📘",
      title: "Zoho Books Integration",
      price: "Rs 30000 One Time + Taxes",
      sub: "Rs 5000 Annual Maintenance + Taxes",
    },
    {
      icon: "👥",
      title: "Zoho CRM Integration",
      price: "Rs 30000 One Time + Taxes",
      sub: "Rs 5000 Annual Maintenance + Taxes",
    },
    {
      icon: "📣",
      title: "Facebook Lead Integration",
      price: "Rs 20000 One Time + Taxes",
      sub: "Rs 5000 Annual Maintenance + Taxes",
    },
    {
      icon: "👤",
      title: "User Add On",
      price: "As per subscription plan",
    },
    {
      icon: "📍",
      title: "GPS Attendance Addon (50 users)",
      price: "Rs 20000 Yearly + Taxes",
    },
    {
      icon: "🖥️",
      title: "Website Development (15 pages)",
      price: "Rs 20000 + Taxes",
    },
    {
      icon: "📸",
      title: "Social Media Package [15 post + 4 Reels]",
      price: "Rs 10000 + Taxes",
    },
    {
      icon: "💬",
      title: "Whatsapp Alerts (10000 msgs per year)",
      price: "Rs 5000 + Taxes",
    },
  ];

  const contactHref = (title: string) =>
    `mailto:${SALES_EMAIL}?subject=${encodeURIComponent(`Service request: ${title}`)}`;
  const referHref = `mailto:${SALES_EMAIL}?subject=${encodeURIComponent("SiteFlow Referral Program")}`;

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-elevated/10">
      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center h-9 w-9 rounded-lg border border-border-custom bg-card text-muted hover:text-foreground hover:border-border-custom/80 transition-all cursor-pointer"
            aria-label="Go back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground">Services</h1>
        </div>

        {/* Our services */}
        <div>
          <h2 className="text-lg font-bold text-foreground">Our services</h2>
          <p className="text-xs text-muted mt-1">
            Enhance your SiteFlow experience with our add-on services and integrations.
          </p>
        </div>

        {/* Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((s, idx) => (
            <div
              key={idx}
              className="flex flex-col bg-card border border-border-custom rounded-xl p-5 hover:border-primary/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-xl shrink-0">
                  <span>{s.icon}</span>
                </div>
                <h3 className="text-sm font-bold text-foreground leading-snug">{s.title}</h3>
              </div>

              <div className="mt-4 flex-1 space-y-1">
                {s.desc ? (
                  <p className="text-xs text-muted leading-relaxed">{s.desc}</p>
                ) : (
                  <>
                    {s.price && (
                      <p className="text-sm font-semibold text-foreground">{s.price}</p>
                    )}
                    {s.sub && (
                      <p className="text-xs text-muted">{s.sub}</p>
                    )}
                  </>
                )}
              </div>

              <a
                href={contactHref(s.title)}
                className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                Contact Us
                <span aria-hidden>&gt;</span>
              </a>
            </div>
          ))}
        </div>

        {/* Referral Banner */}
        <div className="relative rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border border-border-custom p-8 overflow-hidden">
          <div className="max-w-2xl relative z-10 space-y-3">
            <h3 className="text-lg font-extrabold tracking-tight text-foreground">SiteFlow Referral Program</h3>
            <p className="text-xs text-muted">
              Refer and earn cashback with each successful referral.
            </p>
            <a
              href={referHref}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all"
            >
              Refer Now
              <span aria-hidden>&gt;</span>
            </a>
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-primary/10 to-transparent blur-3xl pointer-events-none"></div>
        </div>
      </div>
    </div>
  );
}
