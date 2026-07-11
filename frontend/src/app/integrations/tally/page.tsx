import React from "react";
import Link from "next/link";
import { getContentItemBySlug } from "@/lib/content";
import { notFound } from "next/navigation";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContentItemBySlug("pages", "tally");
  return {
    title: page?.metaTitle || "Tally Integration — SiteFlow",
    description: page?.metaDescription,
  };
}

export default async function TallyIntegrationPage() {
  const page = await getContentItemBySlug("pages", "tally");
  if (!page) notFound();

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary font-sans font-bold text-white shadow-md">S</div>
          <span className="text-lg font-bold tracking-tight text-foreground">Site<span className="text-primary">Flow</span></span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/integrations" className="text-sm text-muted hover:text-foreground transition-all">All Integrations</Link>
          <Link href="/login" className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all">Get Started</Link>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="max-w-5xl mx-auto px-6 pt-8 flex items-center gap-2 text-xs text-muted">
        <Link href="/" className="hover:text-foreground transition-all">Home</Link>
        <span>/</span>
        <Link href="/integrations" className="hover:text-foreground transition-all">Integrations</Link>
        <span>/</span>
          <span className="text-muted">Tally ERP</span>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 md:p-12 border border-border-custom">
          <div
            className="help-article"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        </div>
      </main>
    </div>
  );
}
