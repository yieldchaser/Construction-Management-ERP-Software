"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** The final value to display, e.g. "16", "94%", "₹4.2Cr", "IS-Code", "PWA". */
  value: string;
  className?: string;
}

// Leading currency-style prefix (no letters), then a leading integer/decimal
// number, then any trailing suffix (%, "Cr", "+", etc). Values with no
// leading number (e.g. "IS-Code", "PWA") simply fail to match and are
// rendered statically.
const PARSE_RE = /^([^\dA-Za-z]*)(\d+(?:\.\d+)?)([\s\S]*)$/;

/**
 * Animates a stat number counting up from 0 to its target the first time it
 * scrolls into view. The full final value is present in the server rendered
 * HTML (good for SEO, first paint, and no-JS), and the count-up animation
 * only takes over after hydration, once the element enters the viewport.
 * Values without a leading numeric portion render statically. Respects
 * prefers-reduced-motion by skipping straight to the final value.
 */
export default function CountUp({ value, className }: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const [visible, setVisible] = useState(false);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReduced) {
      setDisplay(value);
      setVisible(true);
      return;
    }

    const match = value.match(PARSE_RE);

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || hasAnimatedRef.current) return;
          hasAnimatedRef.current = true;
          obs.unobserve(entry.target);
          setVisible(true);

          if (!match) {
            // No leading number to count, keep the static final value.
            setDisplay(value);
            return;
          }

          const [, prefix, numberStr, suffix] = match;
          const target = parseFloat(numberStr);
          const decimals = numberStr.includes(".") ? numberStr.split(".")[1].length : 0;
          const duration = 1400;
          const start = performance.now();

          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = target * eased;
            setDisplay(`${prefix}${current.toFixed(decimals)}${suffix}`);
            if (progress < 1) {
              requestAnimationFrame(tick);
            } else {
              setDisplay(value);
            }
          };

          requestAnimationFrame(tick);
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.4 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [value]);

  return (
    <span
      ref={ref}
      className={`alx-scroll-fade${visible ? " is-visible" : ""}${className ? ` ${className}` : ""}`}
    >
      {display}
    </span>
  );
}
