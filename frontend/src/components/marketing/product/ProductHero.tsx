import React from "react";
import Link from "next/link";
import Image from "next/image";
import type { ProductHeroData } from "@/lib/productTypes";
import ProductIcon from "./icons";
import MockupFrame from "../MockupFrame";

/**
 * Serif H1 hero with subhead, checklist, and two CTAs on the left, a
 * product-screenshot slot on the right. When hero.heroImageSlot is null
 * (the common case until real screenshots exist) the slot renders the
 * in-code MockupFrame dashboard rather than a broken <img>.
 */
export default function ProductHero({ hero }: { hero: ProductHeroData }) {
  const imageSrc = hero.heroImageSlot
    ? hero.heroImageSlot.endsWith(".png")
      ? hero.heroImageSlot.replace(/\.png$/, ".webp")
      : hero.heroImageSlot
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-6">
        {hero.eyebrow && (
          <span className="alx-label alx-badge-gold inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs">
            {hero.eyebrow}
          </span>
        )}
        <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-alx-on-surface leading-tight">
          {hero.headline}
        </h1>
        <p className="font-body text-alx-on-surface-variant text-base md:text-lg leading-relaxed max-w-xl">
          {hero.subhead}
        </p>
        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/contact"
            className="alx-bg-gradient-primary text-alx-on-primary px-7 py-3 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center relative overflow-hidden group"
          >
            <span className="relative z-10">Book Live Demo</span>
            <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </Link>
          <Link
            href="#features"
            className="text-alx-primary font-uilabel text-sm font-bold hover:underline inline-flex items-center gap-1.5"
          >
            Explore Features
            <ProductIcon name="arrowRight" className="h-4 w-4" />
          </Link>
        </div>
        {hero.checklist.length > 0 && (
          <ul className="space-y-2.5 pt-2">
            {hero.checklist.map((item, idx) => (
              <li key={idx} className="flex items-center gap-2.5 text-sm text-alx-on-surface-variant">
                <ProductIcon name="checkCircle" className="h-[18px] w-[18px] shrink-0 text-alx-primary" />
                {item}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="alx-hover-lift">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={hero.headline}
            width={1200}
            height={800}
            sizes="(min-width: 1024px) 600px, 100vw"
            className="w-full h-auto rounded-xl border border-alx-outline-variant/40 shadow-lg object-cover"
            priority
          />
        ) : (
          <MockupFrame variant="hero" />
        )}
      </div>
    </div>
  );
}
