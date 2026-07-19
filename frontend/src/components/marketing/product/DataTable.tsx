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
export default function DataTable({ table }: { table: ProductDataTable }) {
  const statusColIdx = table.columns.findIndex((c) => c.trim().toLowerCase() === "status");

  return (
    <div className="space-y-5">
      <div className="space-y-2 max-w-2xl">
        <h2 className="font-headline text-2xl md:text-3xl font-extrabold text-alx-on-surface leading-tight">
          {table.title}
        </h2>
        {table.subtitle && (
          <p className="font-body text-alx-on-surface-variant text-sm md:text-base leading-relaxed">
            {table.subtitle}
          </p>
        )}
      </div>
      <div className="w-full overflow-x-auto rounded-xl border border-alx-outline-variant/40 bg-alx-surface-container-lowest">
        <table className="w-full text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="border-b border-alx-outline-variant/40">
              {table.columns.map((col, idx) => (
                <th
                  key={idx}
                  className="alx-label p-4 text-[11px] text-alx-on-surface-variant font-semibold whitespace-nowrap"
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
                      className={`p-4 tabular-nums whitespace-nowrap ${
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
