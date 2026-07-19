import React from "react";
import Link from "next/link";
import type { ProductCta } from "@/lib/productTypes";

/**
 * Closing CTA band: rounded gradient panel, serif heading + body, two
 * buttons. Routes match the CTA convention used across the rest of the
 * marketing site (Book Live Demo -> /contact, Sign In -> /login).
 */
export default function CtaBand({ cta }: { cta: ProductCta }) {
  return (
    <div className="rounded-[2.5rem] bg-gradient-to-br from-alx-primary-fixed via-alx-surface-container-lowest to-alx-surface-container p-10 md:p-14 text-center relative overflow-hidden border border-alx-outline-variant/20 shadow-2xl shadow-alx-primary/5">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-alx-primary/10 via-transparent to-transparent opacity-50" />
      <h2 className="font-headline text-2xl md:text-4xl font-extrabold text-alx-on-surface leading-tight mb-4 relative z-10">
        {cta.heading}
      </h2>
      <p className="font-body text-alx-on-surface-variant text-sm md:text-base max-w-xl mx-auto mb-8 relative z-10">
        {cta.body}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 relative z-10">
        <Link
          href="/contact"
          className="alx-bg-gradient-primary text-alx-on-primary px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide hover:shadow-xl hover:shadow-alx-primary/30 transition-all active:scale-95 inline-flex items-center justify-center relative overflow-hidden group"
        >
          <span className="relative z-10">Book Live Demo</span>
          <div className="absolute inset-0 alx-shimmer opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </Link>
        <Link
          href="/login"
          className="px-8 py-3.5 rounded-full font-uilabel text-sm font-bold tracking-wide border border-alx-outline-variant text-alx-on-surface hover:border-alx-primary hover:text-alx-primary transition-all inline-flex items-center justify-center"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
