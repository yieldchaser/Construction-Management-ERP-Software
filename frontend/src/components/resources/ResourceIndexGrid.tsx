import React from "react";
import Link from "next/link";
import ProductIcon from "@/components/marketing/product/icons";
import CtaBand from "@/components/marketing/product/CtaBand";
import type { ProductCta } from "@/lib/productTypes";

export interface IndexCard {
  title: string;
  desc: string;
  href: string;
}

interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Structured card-grid index for a resources section (calculators, comparisons).
 * Replaces the legacy body-blob prose with a stitch-style grid: serif hero,
 * a responsive grid of linked cards each with a monochrome stroke-icon chip,
 * and a closing CTA band. No fabricated metrics, blue Alexandria, stroke icons
 * only. Derive `cards` from the real content items so links never drift.
 */
export default function ResourceIndexGrid({
  trail,
  eyebrow,
  title,
  subtitle,
  cards,
  icon = "chart",
  cta,
}: {
  trail: BreadcrumbItem[];
  eyebrow: string;
  title: string;
  subtitle: string;
  cards: IndexCard[];
  icon?: string;
  cta: ProductCta;
}) {
  return (
    <>
      <section className="relative px-6 pt-6 pb-12 overflow-hidden alx-scroll-fade is-visible">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-alx-primary-fixed/25 via-alx-surface-container-lowest to-alx-surface-container-lowest pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 space-y-4">
          <div className="flex flex-wrap items-center gap-2 text-xs text-alx-on-surface-variant">
            {trail.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <span>/</span>}
                {item.href ? (
                  <Link href={item.href} className="hover:text-alx-primary transition-all">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-alx-on-surface">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <span className="alx-label inline-block text-xs font-bold text-alx-primary px-2.5 py-1 rounded-md bg-alx-primary-fixed/40">
            {eyebrow}
          </span>
          <h1 className="font-headline text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
            {title}
          </h1>
          <p className="font-body text-alx-on-surface-variant text-base md:text-lg max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-16 alx-scroll-fade">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((c, idx) => (
            <Link
              key={idx}
              href={c.href}
              className="group flex flex-col rounded-2xl border border-alx-outline-variant/25 bg-alx-surface-container-lowest p-6 shadow-sm shadow-alx-on-surface/5 transition-all hover:-translate-y-1 hover:border-alx-primary/40 hover:shadow-lg"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-alx-primary-fixed/40 text-alx-primary mb-4">
                <ProductIcon name={icon} className="h-5 w-5" />
              </span>
              <h3 className="font-headline text-lg font-bold text-alx-on-surface leading-snug">
                {c.title}
              </h3>
              <p className="font-body mt-2 text-sm text-alx-on-surface-variant leading-relaxed line-clamp-3 flex-1">
                {c.desc}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-alx-primary">
                Open
                <ProductIcon
                  name="arrowRight"
                  className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="px-6 pb-28 alx-scroll-fade">
        <div className="max-w-4xl mx-auto">
          <CtaBand cta={cta} />
        </div>
      </section>
    </>
  );
}
