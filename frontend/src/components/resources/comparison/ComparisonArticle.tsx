import React from "react";
import Link from "next/link";
import type { StructuredComparison, ComparisonApproach, ComparisonWhatIs } from "@/lib/comparisonTypes";
import VerdictCards from "./VerdictCards";
import ComparisonMatrix from "./ComparisonMatrix";
import ProductIcon from "@/components/marketing/product/icons";
import MiniUI from "@/components/marketing/product/MiniUI";
import FaqAccordion from "@/components/marketing/product/FaqAccordion";
import CtaBand from "@/components/marketing/product/CtaBand";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function Breadcrumb({ trail }: { trail: BreadcrumbItem[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-alx-on-surface-variant">
      {trail.map((item, idx) => (
        <React.Fragment key={idx}>
          {idx > 0 && <span>/</span>}
          {item.href ? (
            <Link href={item.href} className="hover:text-alx-primary transition-all">
              {item.label}
            </Link>
          ) : (
            <span className="text-alx-on-surface truncate max-w-[240px]">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

/**
 * One side of the "Two Different Approaches" band: label chip, title, body,
 * a plain bullet list, then a bordered "whatIs" callout (real "best suited
 * for" / "important considerations" copy), alternating with an optional
 * MiniUI mock console on the other side. Mirrors FeatureBlock's
 * text-left/mock-right alternation but adds the whatIs callout beneath.
 */
function ApproachRow({
  approach,
  whatIs,
  reverse,
}: {
  approach: ComparisonApproach;
  whatIs?: ComparisonWhatIs;
  reverse: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-start">
      <div className={`space-y-4 ${reverse ? "lg:order-2" : ""}`}>
        <div className="inline-flex items-center gap-2 bg-alx-primary-fixed/50 text-alx-primary px-3 py-1.5 rounded-full w-max">
          <span className="h-1.5 w-1.5 rounded-full bg-alx-primary" aria-hidden="true" />
          <span className="alx-label text-[11px] font-bold">{approach.label}</span>
        </div>
        <h3 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
          {approach.title}
        </h3>
        <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">{approach.body}</p>
        {approach.bullets.length > 0 && (
          <ul className="space-y-2.5 pt-1">
            {approach.bullets.map((bullet, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-sm text-alx-on-surface-variant leading-relaxed">
                <ProductIcon name="checkCircle" className="h-[18px] w-[18px] mt-0.5 shrink-0 text-alx-primary" />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        )}
        {whatIs && whatIs.bullets.length > 0 && (
          <div className="mt-4 rounded-xl border border-alx-outline-variant/30 bg-alx-surface-container-lowest p-5 shadow-sm">
            <p className="alx-label text-[11px] font-bold text-alx-on-surface mb-3">{whatIs.body}</p>
            <ul className="space-y-2.5">
              {whatIs.bullets.map((bullet, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-sm text-alx-on-surface-variant leading-relaxed">
                  <ProductIcon name="arrowRight" className="h-4 w-4 mt-0.5 shrink-0 text-alx-primary" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {approach.mock && (
        <div className={reverse ? "lg:order-1" : ""}>
          <MiniUI mock={approach.mock} />
        </div>
      )}
    </div>
  );
}

/**
 * Composes the full component-driven comparison page: breadcrumb -> hero
 * (headline/subhead/chips left, verdict cards right, no numeric scores) ->
 * "Two Different Approaches" alternating rows (each with a whatIs callout
 * and optional MiniUI mock) -> grouped module comparison matrix -> FAQ ->
 * closing CTA. Rendered inside <MarketingShell> by
 * app/resources/[...slug]/page.tsx whenever the loaded comparison resource
 * carries a `comparisonStructured` block.
 */
export default function ComparisonArticle({
  structured,
  trail,
}: {
  structured: StructuredComparison;
  trail: BreadcrumbItem[];
}) {
  const { hero, verdict, approaches, whatIs, matrix, faqs, cta } = structured;
  const competitorName = verdict[1]?.name ?? "the competitor";

  return (
    <>
      {/* Breadcrumb + Hero + Verdict cards */}
      <section className="relative px-6 pt-6 pb-16 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/25 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 space-y-8">
          <Breadcrumb trail={trail} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-5">
              <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40">
                {hero.eyebrow}
              </span>
              <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
                {hero.headline}
              </h1>
              <p className="font-body text-alx-on-surface-variant text-base md:text-lg leading-relaxed max-w-xl">
                {hero.subhead}
              </p>
              {hero.chips.length > 0 && (
                <div className="flex flex-wrap gap-3 pt-1">
                  {hero.chips.map((chip, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 bg-alx-surface-container-low px-4 py-2 rounded-full border border-alx-outline-variant/30"
                    >
                      <ProductIcon name="checkCircle" className="h-4 w-4 text-alx-primary" />
                      <span className="alx-label text-[11px] text-alx-on-surface">{chip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="alx-hover-lift">
              <VerdictCards verdict={verdict} />
            </div>
          </div>
        </div>
      </section>

      {/* Two different approaches */}
      {approaches.length > 0 && (
        <section className="bg-alx-surface-container-low/60 py-20 px-6 alx-scroll-fade">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="max-w-2xl mx-auto text-center space-y-3">
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
                Two Different Approaches to Construction Software
              </h2>
              <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">
                Both platforms operate on active construction projects, but they are built for fundamentally
                different priorities. Understanding the approach helps you choose the right fit for your team.
              </p>
            </div>
            <div className="space-y-20">
              {approaches.map((approach, idx) => (
                <ApproachRow key={idx} approach={approach} whatIs={whatIs[idx]} reverse={idx % 2 === 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Module-based comparison matrix */}
      <section className="max-w-6xl mx-auto px-6 py-20 alx-scroll-fade space-y-10">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
            Module-Based Comparison
          </h2>
          <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">
            A module-by-module breakdown across feature areas to help you evaluate which platform fits your
            construction workflow.
          </p>
        </div>
        <ComparisonMatrix matrix={matrix} competitorName={competitorName} />
      </section>

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-20 alx-scroll-fade">
          <div className="text-center space-y-3 mb-8">
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
              FAQs
            </h2>
            <p className="font-body text-alx-on-surface-variant text-sm md:text-base">
              Common questions about choosing between SiteFlow and {competitorName}.
            </p>
          </div>
          <FaqAccordion faqs={faqs} />
        </section>
      )}

      {/* Closing CTA */}
      <section className="px-6 pb-28 alx-scroll-fade">
        <div className="max-w-4xl mx-auto">
          <CtaBand cta={cta} />
        </div>
      </section>
    </>
  );
}
