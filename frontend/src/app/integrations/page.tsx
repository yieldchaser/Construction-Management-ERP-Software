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
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed] pb-20 relative">
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-5 blur-[120px] pointer-events-none" />

      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/products" className="text-sm text-zinc-400 hover:text-white transition-all">
            Products
          </Link>
          <Link href="/login" className="rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all">
            Get Started
          </Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-6 pt-8 flex items-center gap-2 text-xs text-zinc-500">
        <Link href="/" className="hover:text-white transition-all">
          Home
        </Link>
        <span>/</span>
        <span className="text-zinc-300">Integrations</span>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="glass-panel rounded-3xl p-8 md:p-12 border border-white/5">
          {parts.length > 1 ? (
            <>
              <div
                className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-extrabold prose-h1:text-4xl prose-h2:text-2xl prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-white prose-a:text-secondary hover:prose-a:underline prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-white/10 prose-td:p-3 prose-th:border prose-th:border-white/10 prose-th:p-3 prose-img:rounded-2xl prose-hr:border-white/10"
                dangerouslySetInnerHTML={{ __html: parts[0] }}
              />
              <IntegrationsGridClient />
              <div
                className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-extrabold prose-h1:text-4xl prose-h2:text-2xl prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-white prose-a:text-secondary hover:prose-a:underline prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-white/10 prose-td:p-3 prose-th:border prose-th:border-white/10 prose-th:p-3 prose-img:rounded-2xl prose-hr:border-white/10"
                dangerouslySetInnerHTML={{ __html: parts[1] }}
              />
            </>
          ) : (
            <div
              className="prose prose-invert max-w-none prose-headings:text-white prose-headings:font-extrabold prose-h1:text-4xl prose-h2:text-2xl prose-p:text-zinc-300 prose-p:leading-relaxed prose-li:text-zinc-300 prose-strong:text-white prose-a:text-secondary hover:prose-a:underline prose-table:border-collapse prose-table:w-full prose-td:border prose-td:border-white/10 prose-td:p-3 prose-th:border prose-th:border-white/10 prose-th:p-3 prose-img:rounded-2xl prose-hr:border-white/10"
              dangerouslySetInnerHTML={{ __html: page.body }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
