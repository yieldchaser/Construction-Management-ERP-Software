import React from "react";
import type { ProductFaq } from "@/lib/productTypes";

/**
 * Accessible native <details>/<summary> accordion. No client-side JS
 * required; the browser owns open/close state and the group-open Tailwind
 * variant rotates the chevron.
 */
export default function FaqAccordion({ faqs }: { faqs: ProductFaq[] }) {
  return (
    <div className="space-y-3">
      {faqs.map((faq, idx) => (
        <details
          key={idx}
          className="group rounded-xl border border-alx-outline-variant/35 bg-alx-surface-container-lowest overflow-hidden"
        >
          <summary className="flex items-center justify-between gap-3 sm:gap-4 p-4 sm:p-5 cursor-pointer list-none hover:bg-alx-surface-container-low transition-colors">
            <span className="font-headline text-sm sm:text-base md:text-lg font-bold text-alx-on-surface text-center flex-1">{faq.q}</span>
            <svg
              className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-alx-on-surface-variant transition-transform duration-300 group-open:rotate-180"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </summary>
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0 border-t border-alx-outline-variant/20">
            <div
              className="font-body text-sm md:text-base text-alx-on-surface-variant leading-relaxed pt-3 sm:pt-4 [&>strong]:text-alx-on-surface [&>strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: faq.a }}
            />
          </div>
        </details>
      ))}
    </div>
  );
}
