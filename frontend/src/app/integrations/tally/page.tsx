import React from "react";
import Link from "next/link";
import { getContentItemBySlug } from "@/lib/content";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentItemBySlug("pages", "tally");
  return {
    title: page?.metaTitle || "Tally Integration - SiteFlow",
    description: page?.metaDescription,
  };
}

export default async function TallyIntegrationPage() {
  const page = await getContentItemBySlug("pages", "tally");
  if (!page) notFound();

  return (
    <MarketingShell>
      {/* Hero */}
      <section className="relative px-6 pt-6 pb-12 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/30 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs text-alx-on-surface-variant mb-8">
            <Link href="/" className="hover:text-alx-primary transition-all">
              Home
            </Link>
            <span>/</span>
            <Link href="/integrations" className="hover:text-alx-primary transition-all">
              Integrations
            </Link>
            <span>/</span>
            <span className="text-alx-on-surface-variant">Tally ERP</span>
          </div>

          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            {page.title}
          </h1>
        </div>
      </section>

      <main className="max-w-5xl mx-auto px-6 pb-24 alx-scroll-fade">
        <div className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12">
          <div
            className="help-article"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        </div>
      </main>
    </MarketingShell>
  );
}
