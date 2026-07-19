import React from "react";

/**
 * Small stroke icon set for the structured product template
 * (ProductHero checklist bullets, FeatureBlock icon chips, MiniUI
 * placeholders). Mirrors the style of components/marketing/Icon.tsx
 * (24px viewBox, currentColor stroke) so it drops into the same
 * Tailwind color utilities as the rest of Alexandria.
 */
export type ProductIconName =
  | "architecture"
  | "receiptLong"
  | "resources"
  | "checkCircle"
  | "arrowRight"
  | "ticket"
  | "chart"
  | "gantt"
  | "nodes"
  | "checklist";

const PATHS: Record<ProductIconName, React.ReactNode> = {
  architecture: (
    <>
      <path d="M12 2v4" />
      <path d="m6.5 21 5.5-15 5.5 15" />
      <path d="M9.5 15h5" />
      <path d="M4 21h16" />
    </>
  ),
  receiptLong: (
    <>
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  resources: (
    <>
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M3 8V6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </>
  ),
  checkCircle: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="8.5 12.5 11 15 16 9" />
    </>
  ),
  arrowRight: (
    <>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1.5a1.5 1.5 0 0 0 0 3V15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1.5a1.5 1.5 0 0 0 0-3V9Z" />
      <line x1="13" y1="8" x2="13" y2="16" strokeDasharray="2 2" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <polyline points="7 15 11 9 14 12 20 5" />
    </>
  ),
  gantt: (
    <>
      <rect x="3" y="5" width="10" height="3" rx="1" />
      <rect x="7" y="11" width="12" height="3" rx="1" />
      <rect x="5" y="17" width="8" height="3" rx="1" />
    </>
  ),
  nodes: (
    <>
      <circle cx="5" cy="6" r="2.2" />
      <circle cx="19" cy="6" r="2.2" />
      <circle cx="12" cy="18" r="2.2" />
      <path d="M6.9 7.2 10.3 16M17.1 7.2 13.7 16M7.2 6h9.6" />
    </>
  ),
  checklist: (
    <>
      <path d="M4 6h2M4 12h2M4 18h2" />
      <path d="M9 6h11M9 12h11M9 18h11" />
    </>
  ),
};

export default function ProductIcon({
  name,
  className = "h-5 w-5",
}: {
  // Accepts any string (content JSON may carry an unmapped name); an unknown
  // name falls back to a neutral glyph instead of rendering an empty icon.
  name: string;
  className?: string;
}) {
  const node = PATHS[name as ProductIconName] ?? PATHS.checkCircle;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {node}
    </svg>
  );
}
