import React from "react";
import Link from "next/link";
import { getContentItems } from "@/lib/content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SiteFlow Platform - Construction ERP Modules",
  description:
    "Explore all SiteFlow construction ERP modules — from project planning and procurement to GPS attendance, financial management, and subcontractor billing.",
};

export default async function ProductsIndexPage() {
  const products = await getContentItems("products");

  return (
    <div className="min-h-screen bg-[#0E0C15] text-[#ededed] pb-20 relative">
      {/* Background glow */}
      <div className="absolute top-[-10%] right-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#E8184C] opacity-5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] h-[50vw] w-[50vw] rounded-full bg-[#7C5CFF] opacity-5 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#E8184C] to-[#7C5CFF] font-sans font-bold text-white shadow-md">
            S
          </div>
          <span className="text-lg font-bold tracking-tight text-white">
            Site<span className="text-primary">Flow</span> Platform
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/blog"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Blog
          </Link>
          <span className="text-zinc-700">|</span>
          <Link
            href="/help"
            className="text-sm font-semibold text-zinc-400 hover:text-white transition-all"
          >
            Help Center
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 py-16 text-center max-w-4xl mx-auto space-y-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary border border-primary/20">
          🏗️ Full-Suite Platform
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          SiteFlow ERP Modules
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Every module in the SiteFlow platform is designed for real-world
          construction operations — not adapted from a generic enterprise
          template.
        </p>
      </section>

      {/* Product Cards Grid */}
      <section className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, idx) => (
            <article
              key={idx}
              className="rounded-2xl glass-panel p-6 flex flex-col justify-between hover:border-white/10 hover:shadow-lg transition-all group border border-white/5"
            >
              <div className="space-y-3">
                <div className="text-2xl">🏗️</div>
                <h2 className="text-base font-extrabold text-white group-hover:text-primary transition-all line-clamp-2 leading-snug">
                  <Link href={`/products/${product.slug}`} className="cursor-pointer">
                    {product.title}
                  </Link>
                </h2>
                <p className="text-zinc-400 text-xs leading-relaxed line-clamp-3">
                  {product.metaDescription}
                </p>
              </div>
              <div className="pt-4 mt-6 border-t border-white/5 flex items-center justify-end">
                <Link
                  href={`/products/${product.slug}`}
                  className="text-xs font-bold text-primary hover:text-white transition-all cursor-pointer"
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
