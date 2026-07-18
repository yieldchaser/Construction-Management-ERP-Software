import React from "react";
import Link from "next/link";
import { getContentItemBySlug } from "@/lib/content";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { IntegrationsGridClient } from "./IntegrationsGridClient";
import MarketingShell from "@/components/marketing/MarketingShell";

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
    <MarketingShell>
      <div className="max-w-5xl mx-auto px-6 pt-4 pb-24">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-alx-on-surface-variant pt-4 pb-6">
          <Link href="/" className="hover:text-alx-primary transition-all">
            Home
          </Link>
          <span>/</span>
          <span className="text-alx-on-surface-variant">Integrations</span>
        </div>

        <main className="bg-alx-surface-container-lowest border border-alx-outline-variant rounded-lg shadow-sm p-8 md:p-12">
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
        </main>
      </div>
    </MarketingShell>
  );
}
