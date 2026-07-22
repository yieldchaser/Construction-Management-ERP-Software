import React from "react";
import type { ProductDataTable, MiniUITone } from "@/lib/productTypes";
import { StatusPill } from "./MiniUI";

const STATUS_TONE: Record<string, MiniUITone> = {
  verified: "primary",
  active: "primary",
  optimized: "gold",
  "in review": "gold",
  processing: "gold",
  pending: "gold",
  synchronized: "neutral",
  draft: "neutral",
  rejected: "error",
};

function toneForStatus(status: string): MiniUITone {
  return STATUS_TONE[status.trim().toLowerCase()] ?? "neutral";
}

/**
 * High-density ledger table: title/subtitle, responsive overflow-x-auto
 * container, tabular-nums cells, and a status pill on whichever column is
 * named "Status" (case-insensitive). Variance-style cells that start with
 * "+" or "-" get a positive/negative tint so the sample data reads like a
 * real cost ledger, matching the stitch design's "Unified Control Ledger".
 */
/** A column counts as numeric when every filled cell starts like a number:
 *  "0 days", "+2 days", "-1 day", "₹1,45,000", "98%". Numeric columns are
 *  right-aligned so digits line up and can be compared down the column. */
function isNumericColumn(rows: string[][], colIdx: number): boolean {
  const cells = rows.map((r) => (r[colIdx] ?? "").trim()).filter(Boolean);
  if (cells.length === 0) return false;
  return cells.every((c) => /^[+-]?\s*[₹$€]?\s*[\d.,]/.test(c));
}

export default function DataTable({ table }: { table: ProductDataTable }) {
  const statusColIdx = table.columns.findIndex((c) => c.trim().toLowerCase() === "status");
  const numericCols = table.columns.map((_, idx) =>
    idx === statusColIdx ? false : isNumericColumn(table.rows, idx)
  );
  const alignFor = (idx: number) => (numericCols[idx] ? "text-right" : "text-left");

  const isSmallTable = table.columns.length <= 3;

  return (
    <div className={`space-y-6 ${isSmallTable ? "flex flex-col items-center text-center" : ""}`}>
      <div className={`space-y-2 ${isSmallTable ? "max-w-xl text-center" : "max-w-2xl"}`}>
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
          {table.title}
        </h2>
        {table.subtitle && (
          <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">
            {table.subtitle}
          </p>
        )}
      </div>
      {/* A three column or smaller table is center-aligned and capped at max-w-3xl */}
      <div
        className={`w-full overflow-x-auto rounded-2xl border border-alx-outline-variant/40 bg-alx-surface-container-lowest shadow-xl shadow-alx-on-surface/5 ${
          isSmallTable ? "max-w-3xl mx-auto" : ""
        }`}
      >
        {/* The first column absorbs the slack so the remaining columns hug
            their content instead of floating in a third of the page each. */}
        <table className="w-full border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-alx-outline-variant/40">
              {table.columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`alx-label p-4 text-[11px] text-alx-on-surface-variant font-semibold whitespace-nowrap ${alignFor(
                    idx
                  )} ${idx === 0 ? "w-full" : ""}`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-body text-sm text-alx-on-surface">
            {table.rows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={`border-b border-alx-outline-variant/20 last:border-0 hover:bg-alx-surface-container-low transition-colors ${
                  rowIdx % 2 === 1 ? "bg-alx-surface-container-low/40" : ""
                }`}
              >
                {row.map((cell, cellIdx) => {
                  if (cellIdx === statusColIdx) {
                    return (
                      <td key={cellIdx} className="p-4">
                        <StatusPill label={cell} tone={toneForStatus(cell)} />
                      </td>
                    );
                  }
                  const isVariance = /^[+-]/.test(cell.trim());
                  const isPositive = cell.trim().startsWith("+");
                  return (
                    <td
                      key={cellIdx}
                      className={`p-4 tabular-nums whitespace-nowrap ${alignFor(cellIdx)} ${
                        cellIdx === 0 ? "font-semibold text-alx-primary" : ""
                      } ${isVariance ? (isPositive ? "text-emerald-700" : "text-alx-on-error-container") : ""}`}
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
