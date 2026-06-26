import React from "react";
import Link from "next/link";
import { getContentItems } from "@/lib/content";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SiteFlow Resources - Calculators, Case Studies & Comparisons",
  description:
    "Access free construction calculators, case studies, competitor comparisons, glossaries, and tools built specifically for construction contractors.",
};

const RESOURCE_GROUPS: Record<
  string,
  { label: string; slugPrefixes: string[]; icon: string; desc: string }
> = {
  calculators: {
    label: "Construction Calculators",
    slugPrefixes: ["bar-bending", "brick-calculator", "concrete", "steel-calculator", "paint", "house-construction"],
    icon: "🧮",
    desc: "Free calculators for concrete mix, steel, bricks, paint, and BBS.",
  },
  comparisons: {
    label: "Software Comparisons",
    slugPrefixes: ["SiteFlow-vs", "powerplay-vs", "rdash-vs"],
    icon: "⚖️",
    desc: "Side-by-side comparisons of SiteFlow vs competing platforms.",
  },
  casestudies: {
    label: "Client Case Studies",
    slugPrefixes: ["case-study", "abi-builders", "bajrang", "blueline", "cfolios", "gobito", "hydro", "sfc", "shivam", "srinivasa", "tcc", "theeran", "vecttor", "woodofa"],
    icon: "📋",
    desc: "Real-world stories of contractors managing projects with SiteFlow.",
  },
  glossary: {
    label: "Construction Glossary",
    slugPrefixes: ["construction-terms"],
    icon: "📚",
    desc: "Definitions and meanings for key construction industry terms.",
  },
};

export default async function ResourcesIndexPage() {
  const resources = await getContentItems("resources");

  // Group resources by type
  const grouped: Record<string, typeof resources> = {
    calculators: [],
    comparisons: [],
    casestudies: [],
    glossary: [],
    other: [],
  };

  for (const r of resources) {
    let assigned = false;
    for (const [key, meta] of Object.entries(RESOURCE_GROUPS)) {
      if (meta.slugPrefixes.some((prefix) => r.slug.includes(prefix))) {
        grouped[key].push(r);
        assigned = true;
        break;
      }
    }
    if (!assigned) {
      grouped.other.push(r);
    }
  }

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
            Site<span className="text-primary">Flow</span> Resources
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-4 py-1.5 text-xs font-semibold text-secondary border border-secondary/20">
          🛠️ Free Tools & Intelligence
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
          SiteFlow Resource Hub
        </h1>
        <p className="text-zinc-400 text-sm max-w-xl mx-auto">
          Free construction calculators, field case studies, software comparisons,
          and industry glossaries — built by the SiteFlow team.
        </p>
      </section>

      {/* Grouped Sections */}
      <div className="max-w-6xl mx-auto px-6 space-y-16">
        {Object.entries(RESOURCE_GROUPS).map(([key, meta]) => {
          const items = grouped[key] ?? [];
          if (items.length === 0) return null;

          return (
            <section key={key}>
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-white/5">
                <span className="text-2xl">{meta.icon}</span>
                <div>
                  <h2 className="text-lg font-extrabold text-white">{meta.label}</h2>
                  <p className="text-xs text-zinc-500">{meta.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((r, idx) => (
                  <article
                    key={idx}
                    className="rounded-2xl glass-panel p-5 flex flex-col justify-between hover:border-white/10 hover:shadow-lg transition-all group border border-white/5"
                  >
                    <div className="space-y-2">
                      <h3 className="text-sm font-extrabold text-white group-hover:text-secondary transition-all line-clamp-2 leading-snug">
                        <Link href={`/resources/${r.slug}`} className="cursor-pointer">
                          {r.title}
                        </Link>
                      </h3>
                      <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
                        {r.metaDescription}
                      </p>
                    </div>
                    <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-end">
                      <Link
                        href={`/resources/${r.slug}`}
                        className="text-xs font-bold text-secondary hover:text-white transition-all cursor-pointer"
                      >
                        View Resource →
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );
        })}

        {/* Other resources */}
        {grouped.other.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6 pb-3 border-b border-white/5">
              <span className="text-2xl">📂</span>
              <div>
                <h2 className="text-lg font-extrabold text-white">More Resources</h2>
                <p className="text-xs text-zinc-500">Additional tools and content from SiteFlow.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {grouped.other.map((r, idx) => (
                <article
                  key={idx}
                  className="rounded-2xl glass-panel p-5 flex flex-col justify-between hover:border-white/10 hover:shadow-lg transition-all group border border-white/5"
                >
                  <div className="space-y-2">
                    <h3 className="text-sm font-extrabold text-white group-hover:text-primary transition-all line-clamp-2 leading-snug">
                      <Link href={`/resources/${r.slug}`} className="cursor-pointer">
                        {r.title}
                      </Link>
                    </h3>
                    <p className="text-zinc-400 text-xs leading-relaxed line-clamp-2">
                      {r.metaDescription}
                    </p>
                  </div>
                  <div className="pt-3 mt-4 border-t border-white/5 flex items-center justify-end">
                    <Link
                      href={`/resources/${r.slug}`}
                      className="text-xs font-bold text-primary hover:text-white transition-all cursor-pointer"
                    >
                      View →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
