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
            <svg
              key={i}
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
              aria-hidden="true"
            >
              <polygon points="12 3 14.9 9.2 21.5 10.1 16.8 14.8 17.9 21.4 12 18.2 6.1 21.4 7.2 14.8 2.5 10.1 9.1 9.2 12 3" />
            </svg>
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
                <svg className="mt-0.5 w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
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
                <svg className="mt-0.5 w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

