import React from "react";
import Link from "next/link";
import type { StructuredCalculator } from "@/lib/calcTypes";
import CalculatorTools from "./CalculatorTools";
import StatStrip from "@/components/marketing/product/StatStrip";
import DataTable from "@/components/marketing/product/DataTable";
import FaqAccordion from "@/components/marketing/product/FaqAccordion";
import CtaBand from "@/components/marketing/product/CtaBand";
import CalcGuide from "./CalcGuide";

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
 * Composes the full component-driven calculator page: breadcrumb -> hero
 * (serif H1/subhead left, live console right, mirroring the stitch
 * "Calculator Console" layout) -> formula/factor strip -> numbered guide ->
 * reference table -> FAQ -> closing CTA. Rendered inside <MarketingShell> by
 * app/resources/[...slug]/page.tsx whenever the loaded calculator resource
 * carries a `calcStructured` block.
 */
export default function CalcArticle({
  structured,
  title,
  subtitle,
  slug,
  trail,
}: {
  structured: StructuredCalculator;
  title: string;
  subtitle?: string;
  slug: string;
  trail: BreadcrumbItem[];
}) {
  return (
    <>
      {/* Breadcrumb + Hero: title/subhead left, calculator console right */}
      <section className="relative px-6 pt-6 pb-16 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 alx-hero-wash pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 space-y-8">
          <Breadcrumb trail={trail} />
          {/* Intro header on top, full-width console below: gives the live
              console room to breathe instead of cramming it into a half column
              where the estimate panel floats tall against short inputs. */}
          <div className="max-w-3xl space-y-5">
            <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40">
              Free construction tool
            </span>
            <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
              {title}
            </h1>
            {(structured.hero?.subhead ?? subtitle) && (
              <p className="font-body text-alx-on-surface-variant text-base md:text-lg leading-relaxed">
                {structured.hero?.subhead ?? subtitle}
              </p>
            )}
            {structured.hero?.points && structured.hero.points.length > 0 && (
              <ul className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2 pt-1">
                {structured.hero.points.map((point, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 font-body text-sm md:text-base text-alx-on-surface-variant"
                  >
                    <svg
                      className="mt-0.5 shrink-0 text-alx-primary"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      aria-hidden="true"
                    >
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="alx-hover-lift">
            <CalculatorTools slug={slug} hideHeader />
          </div>
        </div>
      </section>

      {/* Formula / factor strip */}
      {structured.formulaStrip.length > 0 && (
        <section className="max-w-6xl mx-auto px-6 pb-16 alx-scroll-fade">
          <StatStrip stats={structured.formulaStrip} />
        </section>
      )}

      {/* Guide */}
      {structured.guide.length > 0 && (
        <section className="bg-alx-surface-container-low/60 py-20 px-6 alx-scroll-fade">
          <div className="max-w-6xl mx-auto space-y-16">
            <div className="max-w-2xl mx-auto text-center space-y-3">
              <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
                Guide to using this calculator
              </h2>
              <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">
                Step-by-step instructions for precise material estimation.
              </p>
            </div>
            <CalcGuide steps={structured.guide} />
          </div>
        </section>
      )}

      {/* Reference table */}
      <section className="max-w-6xl mx-auto px-6 py-20 alx-scroll-fade">
        <DataTable table={structured.referenceTable} />
      </section>

      {/* FAQ */}
      {structured.faqs.length > 0 && (
        <section className="max-w-3xl mx-auto px-6 pb-20 alx-scroll-fade">
          <div className="text-center space-y-3 mb-8">
            <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
              FAQs
            </h2>
            <p className="font-body text-alx-on-surface-variant text-sm md:text-base">
              Common questions about this calculator.
            </p>
          </div>
          <FaqAccordion faqs={structured.faqs} />
        </section>
      )}

      {/* Closing CTA */}
      <section className="px-6 pb-28 alx-scroll-fade">
        <div className="max-w-4xl mx-auto">
          <CtaBand cta={structured.cta} />
        </div>
      </section>
    </>
  );
}
