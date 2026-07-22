import React from "react";
import type { MiniUIData, MiniUITone } from "@/lib/productTypes";
import ProductIcon, { ProductIconName } from "./icons";

const TONE_CLASS: Record<MiniUITone, string> = {
  primary: "bg-alx-primary-fixed text-alx-on-primary-fixed",
  gold: "bg-alx-tertiary-fixed text-alx-on-tertiary-fixed",
  neutral: "bg-alx-surface-container-high text-alx-on-surface-variant",
  error: "bg-alx-error-container text-alx-on-error-container",
};

export function StatusPill({ label, tone = "neutral" }: { label: string; tone?: MiniUITone }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {label}
    </span>
  );
}

function MiniUICardShell({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-alx-outline-variant/30 bg-alx-surface-container-lowest p-5 shadow-lg shadow-alx-on-surface/5">
      {title && (
        <div className="flex items-center justify-between border-b border-alx-outline-variant/25 pb-3 mb-4">
          <span className="font-uilabel text-sm font-bold text-alx-on-surface">{title}</span>
          <span className="flex gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-alx-outline-variant" />
            <span className="h-1.5 w-1.5 rounded-full bg-alx-outline-variant" />
            <span className="h-1.5 w-1.5 rounded-full bg-alx-outline-variant" />
          </span>
        </div>
      )}
      {children}
    </div>
  );
}

function StatusListCard({ mock }: { mock: MiniUIData }) {
  const rows = mock.rows ?? [];
  return (
    <MiniUICardShell title={mock.title}>
      <div className="space-y-3">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-4 rounded-lg bg-alx-surface-container-low px-4 py-3"
          >
            <div className="min-w-0">
              <p className="alx-label text-[10px] text-alx-on-surface-variant truncate">{row.label}</p>
              {row.meta && <p className="font-headline text-sm font-bold text-alx-on-surface mt-0.5">{row.meta}</p>}
            </div>
            {typeof row.progress === "number" ? (
              <div className="h-2 w-20 shrink-0 rounded-full bg-alx-surface-container-high overflow-hidden">
                <div
                  className="h-full rounded-full bg-alx-primary"
                  style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }}
                />
              </div>
            ) : (
              row.status && <StatusPill label={row.status} tone={row.tone} />
            )}
          </div>
        ))}
      </div>
    </MiniUICardShell>
  );
}

function LedgerRowCard({ mock }: { mock: MiniUIData }) {
  const rows = mock.rows ?? [];
  return (
    <MiniUICardShell title={mock.title ?? "Ledger Snapshot"}>
      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 rounded-lg border border-alx-outline-variant/25 bg-alx-surface-container-low px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="font-uilabel text-xs font-bold text-alx-primary truncate">{row.label}</p>
              {row.meta && <p className="text-[11px] text-alx-on-surface-variant truncate">{row.meta}</p>}
            </div>
            {row.status && <StatusPill label={row.status} tone={row.tone} />}
          </div>
        ))}
      </div>
    </MiniUICardShell>
  );
}

function ChecklistCard({ mock }: { mock: MiniUIData }) {
  const items = mock.items ?? [];
  return (
    <MiniUICardShell title={mock.title}>
      <ul className="space-y-2.5">
        {items.map((item, idx) => (
          <li key={idx} className="flex items-start gap-2.5 text-sm text-alx-on-surface">
            <ProductIcon name="checkCircle" className="h-4 w-4 mt-0.5 shrink-0 text-alx-primary" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </MiniUICardShell>
  );
}

function ProgressBarsCard({ mock }: { mock: MiniUIData }) {
  const rows = mock.progressRows ?? [];
  return (
    <MiniUICardShell title={mock.title}>
      <div className="space-y-3.5">
        {rows.map((row, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-alx-on-surface">
              <span className="font-medium">{row.label}</span>
              <span className="text-alx-on-surface-variant tabular-nums">{row.progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-alx-surface-container-high overflow-hidden">
              <div
                className="h-full rounded-full bg-alx-primary"
                style={{ width: `${Math.max(0, Math.min(100, row.progress))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </MiniUICardShell>
  );
}

const PLACEHOLDER_META: Record<string, { icon: ProductIconName; label: string; file: string }> = {
  ticket: { icon: "ticket", label: "Approval ticket", file: "mock-ticket.webp" },
  lineChart: { icon: "chart", label: "Trend chart", file: "mock-line-chart.webp" },
  ganttBars: { icon: "gantt", label: "Schedule bars", file: "mock-gantt-bars.webp" },
  dependencyGraph: { icon: "nodes", label: "Dependency map", file: "mock-dependency-graph.webp" },
};

/** Tasteful generic placeholder for mock types not yet given a bespoke widget. */
function PlaceholderCard({ mock }: { mock: MiniUIData }) {
  const meta = PLACEHOLDER_META[mock.type];
  if (!meta) {
    return (
      <MiniUICardShell title={mock.title}>
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg bg-alx-surface-container-low py-10 text-center">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-alx-primary-fixed text-alx-primary">
            <ProductIcon name="resources" className="h-5 w-5" />
          </span>
          <p className="alx-label text-[11px] text-alx-on-surface-variant">{mock.type}</p>
        </div>
      </MiniUICardShell>
    );
  }

  const imageSrc = `/marketing/mocks/${meta.file}`;

  return (
    <MiniUICardShell title={mock.title}>
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden border border-alx-outline-variant/20 bg-alx-surface-container-low/40 shadow-sm flex items-center justify-center p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={meta.label}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
    </MiniUICardShell>
  );
}

/**
 * Renders the mini "product UI" card inside a FeatureBlock. Switches on
 * mock.type; statusList, ledgerRow, checklist, and progressBars have full
 * bespoke implementations, everything else in MiniUIMockType renders a
 * tasteful, on-brand placeholder so the library stays extensible as more
 * product pages are migrated.
 */
export default function MiniUI({ mock }: { mock: MiniUIData }) {
  let normalizedMock: any = (mock as any).data
    ? {
        ...mock,
        ...(mock as any).data,
      }
    : mock;

  let type = normalizedMock.type;

  // Handle key structure translation for progressBars
  if (type === "progressBars") {
    // If it contains status rows instead of numeric progress percentages (common in comparison JSONs)
    const hasStatus = normalizedMock.rows?.some((r: any) => "status" in r);
    if (hasStatus) {
      type = "statusList";
    } else if (normalizedMock.rows && !normalizedMock.progressRows) {
      // Map rows to progressRows, translating percent to progress
      normalizedMock = {
        ...normalizedMock,
        progressRows: normalizedMock.rows.map((r: any) => ({
          label: r.label,
          progress: typeof r.progress === "number" ? r.progress : (typeof r.percent === "number" ? r.percent : 0),
        })),
      };
    }
  }

  // Also fallback percent -> progress in statusList rows if progress is undefined
  if (type === "statusList" && normalizedMock.rows) {
    normalizedMock = {
      ...normalizedMock,
      rows: normalizedMock.rows.map((r: any) => ({
        ...r,
        progress: typeof r.progress === "number" ? r.progress : (typeof r.percent === "number" ? r.percent : undefined),
      })),
    };
  }

  // Handle checklist mapping when it contains rows instead of items (like in progress-tracking)
  if (type === "checklist" && normalizedMock.rows && !normalizedMock.items) {
    type = "statusList";
  }

  switch (type) {
    case "statusList":
      return <StatusListCard mock={normalizedMock} />;
    case "ledgerRow":
      return <LedgerRowCard mock={normalizedMock} />;
    case "checklist":
      return <ChecklistCard mock={normalizedMock} />;
    case "progressBars":
      return <ProgressBarsCard mock={normalizedMock} />;
    case "ticket":
    case "lineChart":
    case "ganttBars":
    case "dependencyGraph":
    default:
      return <PlaceholderCard mock={normalizedMock} />;
  }
}
