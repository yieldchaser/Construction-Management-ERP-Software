import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getContentItemBySlug } from "@/lib/content";
import { Metadata } from "next";

interface RouteParams {
  params: { slug: string };
}

// Pages that have dedicated routes — skip generic rendering
const SKIP_SLUGS = new Set([
  "blog", "help", "products", "resources", "login",
  "index", "webapp-home", "webapp-login",
]);

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  if (SKIP_SLUGS.has(params.slug)) return { title: "SiteFlow" };
  const page = await getContentItemBySlug("pages", params.slug);
  if (!page) return { title: "Not Found — SiteFlow" };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: { canonical: page.canonical },
  };
}

export default async function GenericPage({ params }: RouteParams) {
  if (SKIP_SLUGS.has(params.slug)) notFound();

  const page = await getContentItemBySlug("pages", params.slug);
  if (!page) notFound();

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
            Site<span className="text-primary">Flow</span>
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link href="/products" className="hidden md:block text-sm text-zinc-400 hover:text-white transition-all">Products</Link>
          <Link href="/blog" className="hidden md:block text-sm text-zinc-400 hover:text-white transition-all">Blog</Link>
          <Link href="/help" className="hidden md:block text-sm text-zinc-400 hover:text-white transition-all">Help</Link>
          <Link
            href="/login"
            className="rounded-xl bg-gradient-to-r from-primary to-[#FF3B6C] px-5 py-2 text-sm font-bold text-white hover:opacity-90 transition-all"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Page Body */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="glass-panel-glow rounded-3xl p-8 md:p-12 border border-white/5">
          <div
            className="prose prose-invert max-w-none
              prose-headings:text-white prose-headings:font-extrabold
              prose-h1:text-4xl prose-h2:text-2xl prose-h3:text-xl
              prose-p:text-zinc-300 prose-p:leading-relaxed
              prose-li:text-zinc-300 prose-strong:text-white
              prose-a:text-secondary hover:prose-a:underline
              prose-table:border-collapse prose-table:w-full
              prose-td:border prose-td:border-white/10 prose-td:p-3
              prose-th:border prose-th:border-white/10 prose-th:p-3 prose-th:bg-white/[0.02]
              prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4
              prose-img:rounded-2xl prose-hr:border-white/10"
            dangerouslySetInnerHTML={{ __html: page.body }}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8 text-zinc-600">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs">
            © 2026 SiteFlow — Abeyaantrix Technology Pvt Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs">
            <Link href="/privacy" className="hover:text-zinc-400 transition-all">Privacy</Link>
            <Link href="/terms" className="hover:text-zinc-400 transition-all">Terms</Link>
            <Link href="/contact" className="hover:text-zinc-400 transition-all">Contact</Link>
            <Link href="/blog" className="hover:text-zinc-400 transition-all">Blog</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
