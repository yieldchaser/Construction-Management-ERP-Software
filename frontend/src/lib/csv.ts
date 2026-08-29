/**
 * Shared CSV export safety — one helper, every export.
 *
 * R2-396 wrote `csvSafeCell` correctly and applied it to exactly one of the
 * five frontend CSV builders (`reports/[slug]/page.tsx`). R2-755 found the
 * other four still injectable, including `projects/page.tsx`, which exports the
 * very fields (project name, code, city) that R2-743 proved could carry a live
 * `=HYPERLINK(...)` payload through to a downloaded file.
 *
 * The same pattern as the backend: the protection existed in the repository and
 * simply did not reach every surface, which is why per-finding gates kept
 * passing — each pinned its own file.
 *
 * Mirrors `backend/app/csv_export.py`.
 */

/** A cell starting with any of these executes as a formula when opened. */
const FORMULA_PREFIX = /^[=+@\t\r-]/;

/**
 * Neutralise a formula cell by prefixing a single quote.
 *
 * Only strings are affected and only those starting with a formula prefix —
 * every other value passes through unchanged, so this must not alter data.
 * Quote-doubling protects the delimiter, not the formula: a leading "="
 * survives a correctly-quoted CSV field entirely intact.
 */
export function csvSafeCell(value: unknown): string {
  if (typeof value !== "string") return value === null || value === undefined ? "" : String(value);
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

/** Quote a value for CSV, escaping embedded quotes. Delimiter-safe only. */
export function csvQuote(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/**
 * The full safe pipeline: neutralise the formula, then quote it.
 * Use this in every CSV builder — it is the only combination that is safe
 * against both delimiter injection and formula execution.
 */
export function csvCell(value: unknown): string {
  return csvQuote(csvSafeCell(value));
}

/** Build a complete CSV document from a header row and body rows. */
export function buildCsv(headers: string[], rows: unknown[][]): string {
  return [
    headers.map(csvCell).join(","),
    ...rows.map(row => row.map(csvCell).join(",")),
  ].join("\n");
}
