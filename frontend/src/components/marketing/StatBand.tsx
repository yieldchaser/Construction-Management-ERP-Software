"use client";

import React from "react";

export interface StatItem {
  value: string;
  label: string;
}

interface StatBandProps {
  stats: StatItem[];
}

/**
 * Four clean stat tiles. Numeric values count up once when the band scrolls
 * into view (IntersectionObserver, runs a single time). Non-numeric values
 * (IS, PWA) render as-is. Count-up is skipped under prefers-reduced-motion.
 */
export default function StatBand({ stats }: StatBandProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setStarted(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 md:grid-cols-4 gap-8 rounded-lg border border-border-custom bg-card px-6 py-8"
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="text-center space-y-1.5 md:border-r md:border-border-custom md:last:border-r-0"
        >
          <div className="text-4xl font-extrabold tracking-tight text-foreground tabular-nums">
            <CountUp value={s.value} run={started} />
          </div>
          <div className="text-xs text-muted leading-snug px-2">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function CountUp({ value, run }: { value: string; run: boolean }) {
  const numeric = /^\d+$/.test(value);
  const target = numeric ? parseInt(value, 10) : 0;
  const [display, setDisplay] = React.useState(numeric ? 0 : value);

  React.useEffect(() => {
    if (!numeric || !run) return;

    const duration = 900;
    const start = performance.now();
    let frame: number;

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      // Ease-out for a natural settle.
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [numeric, run, target]);

  if (!numeric) return <>{value}</>;
  return <>{display}</>;
}
