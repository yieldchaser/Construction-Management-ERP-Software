"use client";

import { useEffect, useState } from "react";

/**
 * Thin fixed progress bar showing how far the reader has scrolled through
 * the current article. Sits above the sticky site header so it stays
 * visible at every scroll position. Starts at 0% width on the server (no
 * layout shift, safe with no JS) and only tracks scroll after hydration.
 * Under prefers-reduced-motion the bar is not rendered at all, since it is
 * inherently a scroll-linked motion affordance.
 */
export default function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(prefersReduced);
    if (prefersReduced) return;

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollTop = window.scrollY || doc.scrollTop;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const pct = scrollable > 0 ? (scrollTop / scrollable) * 100 : 0;
      setProgress(Math.min(100, Math.max(0, pct)));
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  if (reducedMotion) return null;

  return (
    <div
      className="fixed top-0 left-0 w-full h-[3px] z-[60] bg-transparent pointer-events-none"
      aria-hidden="true"
    >
      <div className="h-full alx-bg-gradient-primary" style={{ width: `${progress}%` }} />
    </div>
  );
}
