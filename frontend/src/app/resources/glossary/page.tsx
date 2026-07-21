import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import GlossaryClient from "./GlossaryClient";
import HeroPhoto from "./HeroPhoto";

// Optional hero photo. Drop a real construction image at this public path and
// it will render; until then the page shows a clean in-code placeholder band
// (never a broken image). Pass the prop through from a CMS/config if needed.
const GLOSSARY_HERO_IMAGE = "/resources/glossary/construction-hero.png";

export const metadata: Metadata = {
  title: "Construction & ERP Glossary - SiteFlow Resources",
  description:
    "A searchable A-Z reference of 200 construction and ERP terms, from BOQ and RA bills to retention, geofenced attendance, and Tally integration, with notes on how SiteFlow automates each.",
  alternates: {
    canonical: "https://siteflow.com/resources/glossary",
  },
};

function Breadcrumb() {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-alx-on-surface-variant">
      <Link href="/" className="hover:text-alx-primary transition-all">Home</Link>
      <span>/</span>
      <Link href="/resources" className="hover:text-alx-primary transition-all">Resources</Link>
      <span>/</span>
      <span className="text-alx-on-surface">Glossary</span>
    </div>
  );
}

export default function GlossaryPage() {
  return (
    <MarketingShell>
      {/* Header */}
      <section className="relative px-6 pt-8 pb-10 md:pb-14 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10">
          <Breadcrumb />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_480px] gap-8 items-start">
            {/* Eyebrow + H1 + subhead */}
            <div className="space-y-4">
              <span className="alx-label inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-alx-primary bg-alx-primary-fixed/40">
                <span className="h-1.5 w-1.5 rounded-full bg-alx-primary" />
                200 Terms · A-Z Reference
              </span>
              <h1 className="font-headline text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
                Construction &amp; ERP Glossary
              </h1>
              <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-xl leading-relaxed pt-1">
                Plain-language definitions for the terms builders, contractors, and project teams use every day, from BOQ and retention to geofenced attendance and Tally integration. Search any term or jump straight to a letter.
              </p>
            </div>

            {/* Hero photo slot. A clean in-code placeholder band renders by
                default (no broken image). To show a real photo, drop a file at
                the GLOSSARY_HERO_IMAGE public path and render it from a client
                component with an onError guard; the placeholder stays as the
                fallback layer beneath it. */}
            <div className="lg:pt-2">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden border border-alx-outline-variant/20 bg-gradient-to-br from-alx-primary-fixed/40 via-alx-surface-container to-alx-surface-container-high">
                {/* Fallback placeholder rendered first (underneath) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6">
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-alx-primary)" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <path d="M3 15l5-4 4 3 3-2 6 5" />
                    <circle cx="9" cy="9" r="1.6" />
                  </svg>
                  <p className="font-uilabel text-xs font-bold text-alx-on-surface-variant">Construction photo slot</p>
                  <p className="font-body text-[11px] text-alx-on-surface-variant/80">Add an image at {GLOSSARY_HERO_IMAGE}</p>
                </div>
                {/* Real photo rendered second (on top) */}
                <HeroPhoto src={GLOSSARY_HERO_IMAGE} alt="Construction site with crew and equipment" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-6xl mx-auto px-6 pb-24 alx-scroll-fade">
        <GlossaryClient heroImage={GLOSSARY_HERO_IMAGE} />
      </section>
    </MarketingShell>
  );
}
