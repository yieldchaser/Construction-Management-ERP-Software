"""Shared CSV export safety.

One helper, every export. R2-185 originally named four call sites and asked for
"one helper, four call sites"; it was closed on one site, and the pattern then
repeated twice more -- R2-407 closed with the note "last raw-text exporter",
and R2-743 found bi_export.py still unprotected. Each time the protection
existed in the repository and simply did not reach every surface, which is why
per-finding gates kept passing: each pinned its own file.

The three local `_csv_safe_cell` definitions (dpr.py, hr.py, labour.py) were
byte-identical duplicates. This module is the single copy they now share, and
bi_export.py routes through it too.
"""

# A cell whose text begins with any of these is executed as a formula when the
# export is opened in Excel / LibreOffice / Sheets. Quote-doubling protects the
# delimiter, not the formula -- a leading "=" survives a correctly-quoted CSV
# field entirely intact.
CSV_FORMULA_PREFIXES = ("=", "+", "-", "@", "\t", "\r")


def csv_safe_cell(value):
    """Neutralise a formula cell by prefixing a single quote.

    Everything that is not a string, and every string that does not begin with a
    formula prefix, passes through untouched -- this must not alter data.
    """
    if isinstance(value, str) and value.startswith(CSV_FORMULA_PREFIXES):
        return "'" + value
    return value


def csv_safe_row(row):
    """Apply csv_safe_cell to every value in a mapping or sequence."""
    if isinstance(row, dict):
        return {k: csv_safe_cell(v) for k, v in row.items()}
    return [csv_safe_cell(v) for v in row]
