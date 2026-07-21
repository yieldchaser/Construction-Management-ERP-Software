"use client";

import { useEffect } from "react";

/**
 * Shared scroll-reveal engine for the marketing shell.
 *
 * Any page inside MarketingShell can mark a section with `.alx-scroll-fade`
 * (see globals.css) and it will be faded/translated in on scroll without
 * that page needing to wire up its own IntersectionObserver.
 *
 * `.alx-scroll-fade` starts at opacity 0, so anything this engine fails to
 * observe stays invisible. A single querySelectorAll on mount missed every
 * section rendered later (client components such as the blog index grid),
 * which is why those pages appeared to load only partially until a refresh.
 * This version therefore observes late arrivals too, and keeps a timed
 * backstop so a section can never be left stranded at opacity 0.
 */
export default function PremiumFX() {
  useEffect(() => {
    const reveal = (el: Element) => el.classList.add("is-visible");

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.15 }
    );

    const viewportHeight = () =>
      window.innerHeight || document.documentElement.clientHeight;

    /** Observe a section with IntersectionObserver without layout-thrashing getBoundingClientRect calls. */
    const track = (el: Element) => {
      if (el.classList.contains("is-visible")) return;
      observer.observe(el);
    };

    const trackAll = () =>
      document.querySelectorAll(".alx-scroll-fade").forEach(track);

    trackAll();

    // Sections rendered after mount (client components, streamed content)
    // would otherwise never be observed and would stay invisible.
    const mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;
          if (node.classList.contains("alx-scroll-fade")) track(node);
          node.querySelectorAll?.(".alx-scroll-fade").forEach(track);
        });
      }
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });

    // Backstop: whatever is still hidden shortly after load gets revealed, so
    // a missed observation can never leave content permanently invisible.
    const backstop = window.setTimeout(() => {
      document
        .querySelectorAll(".alx-scroll-fade:not(.is-visible)")
        .forEach(reveal);
    }, 1200);

    return () => {
      observer.disconnect();
      mutationObserver.disconnect();
      window.clearTimeout(backstop);
    };
  }, []);

  return null;
}
