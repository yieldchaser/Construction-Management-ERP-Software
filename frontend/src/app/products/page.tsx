import React from "react";
import Link from "next/link";
import { getContentItems } from "@/lib/content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SiteFlow Platform - Construction ERP Modules",
  description:
    "Explore all SiteFlow construction ERP modules, from project planning and procurement to GPS attendance, financial management, and subcontractor billing.",
};

// Inline stroke icon set (consistent 22px, currentColor) so module cards render
// the same on every OS instead of relying on emoji.
const ICON_PATHS: Record<string, React.ReactNode> = {
  building: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="1.5" />
      <path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 12l9 5 9-5" />
      <path d="M3 16l9 5 9-5" />
    </>
  ),
  box: (
    <>
      <path d="M21 8l-9-5-9 5 9 5 9-5z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  wallet: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16" cy="14" r="1.2" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  penRuler: (
    <>
      <path d="M15 3l6 6-11 11-6 1 1-6L15 3z" />
      <path d="M12 6l6 6" />
    </>
  ),
  wrench: <path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" />,
  users: (
    <>
      <path d="M16 20v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
      <circle cx="9" cy="8" r="3.5" />
      <path d="M22 20v-2a4 4 0 00-3-3.8M16 4.2a4 4 0 010 7.6" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
      <path d="M2 3h3l2.4 12.5a1.5 1.5 0 001.5 1.2h8.4a1.5 1.5 0 001.5-1.2L21 7H6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </>
  ),
  trending: (
    <>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 8h4v4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </>
  ),
  board: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M15 3v18" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  barChart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M8 18v-6M13 18V8M18 18v-9" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4a1 1 0 001 1h4a1 1 0 001-1V3H9v1zM9 11h6M9 15h4" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />,
};

function ProductIcon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {ICON_PATHS[name] ?? ICON_PATHS.building}
    </svg>
  );
}

function pickProductIcon(slug: string): string {
  const s = slug.toLowerCase();
  if (s.includes("whats-new")) return "sparkle";
  if (s.includes("supply-chain") || s.includes("material") || s.includes("warehouse") || s.includes("inventory")) return "box";
  if (s.includes("invoic") || s.includes("vendor-billing") || s.includes("billing")) return "receipt";
  if (s.includes("financial") || s.includes("budget") || s.includes("cost")) return "wallet";
  if (s.includes("design")) return "penRuler";
  if (s.includes("equipment")) return "wrench";
  if (s.includes("labour") || s.includes("labor") || s.includes("attendance")) return "users";
  if (s.includes("procurement") || s.includes("rfq")) return "cart";
  if (s.includes("production")) return "gear";
  if (s.includes("progress") || s.includes("tracking")) return "trending";
  if (s.includes("quality")) return "shield";
  if (s.includes("report") || s.includes("analytics")) return "barChart";
  if (s.includes("crm") || s.includes("sales")) return "target";
  if (s.includes("sub-contractor") || s.includes("subcontractor")) return "clipboard";
  if (s.includes("project-management")) return "board";
  if (s.includes("planning") || s.includes("project")) return "calendar";
  return "building";
}

export default async function ProductsIndexPage() {
  const products = await getContentItems("products");

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
            Site<span className="text-primary">Flow</span> Platform
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-4 whitespace-nowrap">
          <Link
            href="/blog"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Blog
          </Link>
          <span className="text-zinc-700">|</span>
          <Link
            href="/help"
            className="text-sm font-semibold text-muted hover:text-foreground transition-all"
          >
            Help Center
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-16 text-center max-w-4xl mx-auto space-y-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          <ProductIcon name="layers" className="h-3.5 w-3.5" />
          Full-Suite Platform
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          SiteFlow ERP Modules
        </h1>
        <p className="text-muted text-sm max-w-xl mx-auto">
          Every module in the SiteFlow platform is designed for real-world
          construction operations, not adapted from a generic enterprise
          template.
        </p>
      </section>

      {/* Product Cards Grid */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, idx) => (
            <article
              key={idx}
              className="rounded-lg bg-card border border-border-custom rounded-lg p-6 flex flex-col justify-between hover:border-border-custom hover:shadow-lg transition-all group border border-border-custom"
            >
              <div className="space-y-3">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
                  <ProductIcon name={pickProductIcon(product.slug)} className="h-[22px] w-[22px]" />
                </div>
                <h2 className="text-base font-extrabold text-white group-hover:text-primary transition-all line-clamp-2 leading-snug">
                  <Link href={`/products/${product.slug}`} className="cursor-pointer">
                    {product.title}
                  </Link>
                </h2>
                <p className="text-muted text-xs leading-relaxed line-clamp-3">
                  {product.metaDescription}
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-border-custom flex items-center justify-end">
                <Link
                  href={`/products/${product.slug}`}
                  className="text-xs font-bold text-primary hover:text-foreground transition-all cursor-pointer"
                >
                  Explore Module →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
