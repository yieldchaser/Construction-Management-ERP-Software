"use client";

import { useEffect } from "react";

/**
 * Shared scroll-reveal engine for the marketing shell.
 *
 * Any page inside MarketingShell can mark a section with `.alx-scroll-fade`
 * (see globals.css) and it will be faded/translated in on scroll without
 * that page needing to wire up its own IntersectionObserver. This mirrors
 * the observer previously hard-coded into the landing page, but runs on
 * every marketing route.
 */
export default function PremiumFX() {
  useEffect(() => {
    const sections = Array.from(document.querySelectorAll(".alx-scroll-fade"));

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.15 }
    );

    sections.forEach((section) => observer.observe(section));

    // Safety net: anything already in (or above) the viewport on mount
    // should reveal immediately, so it never sits stuck invisible for
    // pages that render sections above the fold.
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top < viewportHeight) {
        section.classList.add("is-visible");
        observer.unobserve(section);
      }
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
