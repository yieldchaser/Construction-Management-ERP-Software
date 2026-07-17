import React from "react";

export interface BeforeAfterTestimonialProps {
  name: string;
  role: string;
  company: string;
  city: string;
  headlineStat?: string;
  before: string[];
  after: string[];
  illustrative?: boolean;
  stars?: number;
}

export default function BeforeAfterTestimonial({
  name,
  role,
  company,
  city,
  headlineStat,
  before,
  after,
  illustrative = false,
  stars = 5,
}: BeforeAfterTestimonialProps) {
  return (
    <div className="rounded-lg bg-card border border-border-custom p-6 sm:p-8 space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div
          className="flex items-center gap-0.5 text-primary text-sm"
          role="img"
          aria-label={`${stars} out of 5 stars`}
        >
          {Array.from({ length: stars }).map((_, i) => (
            <span key={i}>★</span>
          ))}
        </div>
        {illustrative && (
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted border border-border-custom rounded-full px-3 py-1">
            Illustrative example
          </span>
        )}
      </div>

      {headlineStat && (
        <div className="text-2xl font-extrabold text-foreground leading-tight">{headlineStat}</div>
      )}

      <div className="space-y-0.5">
        <div className="font-semibold text-foreground">{name}</div>
        <div className="text-xs text-muted">
          {role} &middot; {company} &middot; {city}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-md bg-elevated p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-muted">Before</div>
          <ul className="space-y-1.5">
            {before.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted">
                <span className="mt-0.5 text-danger font-bold flex-shrink-0">✕</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md bg-primary/5 p-4 space-y-2">
          <div className="text-xs font-bold uppercase tracking-wider text-primary">After</div>
          <ul className="space-y-1.5">
            {after.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className="mt-0.5 text-success font-bold flex-shrink-0">✓</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
