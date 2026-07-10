import React from "react";
import Link from "next/link";
import { getContentItemBySlug } from "@/lib/content";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { IntegrationsGridClient } from "./IntegrationsGridClient";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentItemBySlug("pages", "integrations");
  return {
    title: page?.metaTitle || "SiteFlow Integrations: Tally, WhatsApp, Zoho and More",
    description:
      page?.metaDescription ||
      "Connect SiteFlow with Tally, WhatsApp, Zoho Books, and your other tools. Automate data flow between site, accounts, and finance — no manual re-entry, no developer needed.",
  };
}

export default async function IntegrationsIndexPage() {
  const page = await getContentItemBySlug("pages", "integrations");
  if (!page) notFound();

  // Split compiled HTML around the grid placeholder to inject our client search/filter grid
  const placeholder =
    '<div class="osint-g-grid" id="osint-grid">\n<div class="osint-g-loading" id="osint-loading">Loading integrations…</div>';
  
  // Normalize line endings to cover differences
  const normalizedBody = page.body.replace(/\r\n/g, "\n");
  const normalizedPlaceholder = placeholder.replace(/\r\n/g, "\n");

  const parts = normalizedBody.split(normalizedPlaceholder);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            Site<span className="text-primary">Flow</span>
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/products" className="text-sm text-muted hover:text-foreground transition-all">
            Products
          </Link>
          <Link href="/login" className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all">
            Get Started
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-6 pt-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-foreground transition-all">
          Home
        </Link>
        <span>/</span>
        <span className="text-muted">Integrations</span>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-card border border-border-custom rounded-lg rounded-md p-8 md:p-12 border border-border-custom">
          {parts.length > 1 ? (
            <>
              <div
                className="help-article"
                dangerouslySetInnerHTML={{ __html: parts[0] }}
              />
              <IntegrationsGridClient />
              <div
                className="help-article"
                dangerouslySetInnerHTML={{ __html: parts[1] }}
              />
            </>
          ) : (
            <div
              className="help-article"
              dangerouslySetInnerHTML={{ __html: page.body }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
