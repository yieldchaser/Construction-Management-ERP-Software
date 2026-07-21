import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getContentItems } from "@/lib/content";
import { Metadata } from "next";
import MarketingShell from "@/components/marketing/MarketingShell";
import Icon from "@/components/marketing/Icon";

export const metadata: Metadata = {
  title: "SiteFlow Resources - Calculators, Comparisons & Glossaries",
  description:
    "Access free construction calculators, competitor comparisons, glossaries, and tools built specifically for construction contractors.",
};

// Inline stroke icon set (consistent 22px, currentColor) so group headers render
// the same on every OS instead of relying on emoji.
const GROUP_ICON_PATHS: Record<string, React.ReactNode> = {
  calculators: (
    <>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
    </>
  ),
  comparisons: (
    <>
      <path d="M12 3v18" />
      <path d="M5 7l-3 6a3 3 0 006 0l-3-6z" />
      <path d="M19 7l-3 6a3 3 0 006 0l-3-6z" />
      <path d="M5 7h14" />
      <path d="M9 21h6" />
    </>
  ),
  glossary: (
    <>
      <path d="M4 4.5A2.5 2.5 0 016.5 2H20v18H6.5A2.5 2.5 0 004 17.5v-13z" />
      <path d="M4 17.5A2.5 2.5 0 016.5 15H20" />
      <path d="M8 7h8M8 10.5h8" />
    </>
  ),
  other: (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
};

function GroupIcon({ name, className }: { name: string; className?: string }) {
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
      {GROUP_ICON_PATHS[name] ?? GROUP_ICON_PATHS.other}
    </svg>
  );
}

const RESOURCE_GROUPS: Record<
  string,
  { label: string; slugPrefixes: string[]; icon: string; desc: string }
> = {
  calculators: {
    label: "Construction Calculators",
    slugPrefixes: ["bar-bending", "brick-calculator", "concrete", "steel-calculator", "paint", "house-construction"],
    icon: "calculators",
    desc: "Free calculators for concrete mix, steel, bricks, paint, and BBS.",
  },
  comparisons: {
    label: "Software Comparisons",
    slugPrefixes: ["SiteFlow-vs", "powerplay-vs", "rdash-vs"],
    icon: "comparisons",
    desc: "Side-by-side comparisons of SiteFlow vs competing platforms.",
  },
  glossary: {
    label: "Construction Glossary",
    slugPrefixes: ["construction-terms"],
    icon: "glossary",
    desc: "Definitions and meanings for key construction industry terms.",
  },
};

export default async function ResourcesIndexPage() {
  const resources = await getContentItems("resources");

  // Group resources by type
  const grouped: Record<string, typeof resources> = {
    calculators: [],
    comparisons: [],
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
    <MarketingShell>
      {/* Hero */}
      <section className="relative px-6 pt-16 pb-16 text-center overflow-hidden alx-scroll-fade">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="absolute inset-0 z-0 opacity-40 pointer-events-none">
          <Image
            src="/marketing/resources/resources-hero.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover object-center"
            priority
          />
        </div>
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            <GroupIcon name="calculators" className="h-3.5 w-3.5" />
            Free Tools &amp; Intelligence
          </span>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            SiteFlow Resource Hub
          </h1>
          <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            Free construction calculators, software comparisons, and industry
            glossaries, built by the SiteFlow team.
          </p>
        </div>
      </section>

      {/* Grouped Sections */}
      <div className="pb-24 space-y-16">
        {Object.entries(RESOURCE_GROUPS).map(([key, meta]) => {
          const items = grouped[key] ?? [];
          if (items.length === 0) return null;

          const sectionBody = (
            <section className="alx-scroll-fade">
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-alx-outline-variant/15">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-alx-primary-fixed text-alx-primary shrink-0">
                  <GroupIcon name={meta.icon} className="h-[22px] w-[22px]" />
                </div>
                <div>
                  <h2 className="font-headline text-lg font-extrabold text-alx-on-surface">{meta.label}</h2>
                  <p className="font-body text-xs text-alx-on-surface-variant">{meta.desc}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {items.map((r, idx) => (
                  <article
                    key={idx}
                    className="rounded-2xl bg-alx-surface-container-lowest p-5 flex flex-col justify-between shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all group"
                  >
                    <div className="space-y-2">
                      <h3 className="font-headline text-sm font-extrabold text-alx-on-surface group-hover:text-alx-primary transition-all line-clamp-2 leading-snug">
                        <Link href={`/resources/${r.slug}`} className="cursor-pointer">
                          {r.title}
                        </Link>
                      </h3>
                      <p className="font-body text-alx-on-surface-variant text-xs leading-relaxed line-clamp-2">
                        {r.metaDescription}
                      </p>
                    </div>
                    <div className="pt-3 mt-4 border-t border-alx-outline-variant/15 flex items-center justify-end">
                      <Link
                        href={`/resources/${r.slug}`}
                        className="font-uilabel inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-bold text-alx-primary hover:text-alx-on-surface transition-all cursor-pointer"
                      >
                        View Resource <Icon name="arrow_right" className="w-4 h-4 shrink-0" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          );

          // Give the Software Comparisons section a full-bleed tonal band so
          // it reads as a distinct beat in the Stitch layout, while every
          // other group stays on the base surface within the shared column.
          if (key === "comparisons") {
            return (
              <div key={key} className="bg-alx-surface-container py-16 border-y border-alx-outline-variant/15">
                <div className="max-w-6xl mx-auto px-6">{sectionBody}</div>
              </div>
            );
          }

          return (
            <div key={key} className="max-w-6xl mx-auto px-6">
              {sectionBody}
            </div>
          );
        })}

        {/* Other resources */}
        {grouped.other.length > 0 && (
          <div className="max-w-6xl mx-auto px-6">
            <section className="alx-scroll-fade">
              <div className="flex items-center gap-3 mb-6 pb-3 border-b border-alx-outline-variant/15">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-alx-primary-fixed text-alx-primary shrink-0">
                  <GroupIcon name="other" className="h-[22px] w-[22px]" />
                </div>
                <div>
                  <h2 className="font-headline text-lg font-extrabold text-alx-on-surface">More Resources</h2>
                  <p className="font-body text-xs text-alx-on-surface-variant">Additional tools and content from SiteFlow.</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {grouped.other.map((r, idx) => (
                  <article
                    key={idx}
                    className="rounded-2xl bg-alx-surface-container-lowest p-5 flex flex-col justify-between shadow-xl shadow-alx-on-surface/5 alx-hover-lift transition-all group"
                  >
                    <div className="space-y-2">
                      <h3 className="font-headline text-sm font-extrabold text-alx-on-surface group-hover:text-alx-primary transition-all line-clamp-2 leading-snug">
                        <Link href={`/resources/${r.slug}`} className="cursor-pointer">
                          {r.title}
                        </Link>
                      </h3>
                      <p className="font-body text-alx-on-surface-variant text-xs leading-relaxed line-clamp-2">
                        {r.metaDescription}
                      </p>
                    </div>
                    <div className="pt-3 mt-4 border-t border-alx-outline-variant/15 flex items-center justify-end">
                      <Link
                        href={`/resources/${r.slug}`}
                        className="font-uilabel text-xs font-bold text-alx-primary hover:text-alx-on-surface transition-all cursor-pointer"
                      >
                        View <Icon name="arrow_right" className="w-4 h-4" />
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Closing CTA band */}
      <section className="py-28 px-6 bg-alx-surface-container-lowest alx-scroll-fade">
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container rounded-[3rem] p-12 md:p-16 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-alx-primary/10 via-transparent to-transparent opacity-50" />
          <h2 className="font-headline text-3xl md:text-4xl font-extrabold text-alx-on-surface leading-tight mb-6 relative z-10">
            Ready to unify your entire construction lifecycle?
          </h2>
          <p className="font-body text-alx-on-surface-variant text-sm max-w-md mx-auto mb-8 relative z-10">
            Take these tools further with one connected workspace for planning, progress, procurement, and project finance.
          </p>
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="alx-bg-gradient-primary text-alx-on-primary px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center relative overflow-hidden group"
            >
              <span className="relative z-10">Get Started Free</span>
              <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
            <Link
              href="/contact"
              className="border border-alx-outline-variant/40 text-alx-on-surface px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:border-alx-primary hover:text-alx-primary transition-all active:scale-95 inline-flex items-center justify-center bg-alx-surface-container-lowest"
            >
              Request a Demo
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}

