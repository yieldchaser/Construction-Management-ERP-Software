import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug } from "@/lib/content";
import MarketingArticle from "@/components/marketing/MarketingArticle";
import { Metadata } from "next";

// Pages authored as bespoke, full-bleed landing pages with their own scoped
// CSS systems (styled in globals.css). They render full width, without the
// boxed .help-article prose wrapper, and use interactive FAQ accordions.
const BESPOKE_SLUGS = new Set(["who-we-serve", "tally"]);

interface RouteParams {
  params: Promise<{ slug: string }>;
}

// Pages that have dedicated routes — skip generic rendering
const SKIP_SLUGS = new Set([
  "blog", "help", "products", "resources", "login",
  "terms", "privacy", "career",
  "index", "webapp-home", "webapp-login",
]);

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { slug } = await params;
  if (SKIP_SLUGS.has(slug)) return { title: "SiteFlow" };
  const page = await getContentItemBySlug("pages", slug);
  if (!page) return { title: "Not Found — SiteFlow" };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: { canonical: page.canonical },
  };
}

export default async function GenericPage({ params }: RouteParams) {
  const { slug } = await params;
  if (SKIP_SLUGS.has(slug)) notFound();

  const page = await getContentItemBySlug("pages", slug);
  if (!page) notFound();

  const isCustomLayout = slug === "about";
  const isBespoke = BESPOKE_SLUGS.has(slug);

  if (isBespoke) {
    return (
      <div className="min-h-screen bg-background text-foreground relative overflow-x-hidden">
        {/* Header */}
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
            <Link href="/products" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Products</Link>
            <Link href="/who-we-serve" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Who We Serve</Link>
            <Link href="/resources" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Resources</Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all"
            >
              Get Started
            </Link>
          </div>
        </header>

        <main className="w-full">
          <MarketingArticle html={page.body} />
        </main>

        {/* Footer */}
        <footer className="border-t border-border-custom px-6 py-8 text-muted">
          <div className="max-w-[52rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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

  if (isCustomLayout) {
    return (
      <div className="min-h-screen bg-background text-foreground relative">
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
            <Link href="/products" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Products</Link>
            <Link href="/blog" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Blog</Link>
            <Link href="/help" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Help</Link>
            <Link
              href="/login"
              className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all"
            >
              Get Started
            </Link>
          </div>
        </header>

        <main className="w-full">
          <div dangerouslySetInnerHTML={{ __html: page.body }} />
        </main>

        <footer className="border-t border-border-custom px-6 py-8 text-muted">
          <div className="max-w-[52rem] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
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

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 relative">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-primary opacity-5 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border border-border-custom rounded-lg border-b border-border-custom px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-tr bg-primary font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span>
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/products" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Products</Link>
          <Link href="/blog" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Blog</Link>
          <Link href="/help" className="hidden md:block text-sm text-muted hover:text-foreground transition-all">Help</Link>
          <Link
            href="/login"
            className="rounded-md bg-primary px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Page Body */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="bg-card border border-border-custom rounded-lg shadow-sm rounded-md p-8 md:p-12 border border-border-custom">
          <div
            className="help-article"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-custom px-6 py-8 text-muted">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            © 2026 SiteFlow. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/privacy" className="hover:text-muted transition-all">Privacy</Link>
            <Link href="/terms" className="hover:text-muted transition-all">Terms</Link>
            <Link href="/contact" className="hover:text-muted transition-all">Contact</Link>
            <Link href="/blog" className="hover:text-muted transition-all">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
