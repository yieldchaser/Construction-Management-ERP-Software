"""Migration audit - does every column and constraint in models.py have a Supabase migration?

Production schema comes ONLY from supabase/migrations/*.sql. `Base.metadata.create_all` creates
missing TABLES on Postgres but never adds a column to a table that already exists, and the
`ensure_sqlite_*` helpers in app/main.py are explicitly dev-only. So a model column with no
migration is a live 500 on Render the first time the ORM selects it; a model UniqueConstraint
with no migration is a fix that silently does nothing in production.

Offline half of the audit. Supabase access confirms the other half (was the migration APPLIED).
"""
import os
import re
import sys
from collections import defaultdict

SCRATCH = r"C:/Users/Dell/AppData/Local/Temp/claude/verif-scratch"
MODELS = os.path.join(SCRATCH, "backend", "app", "models.py")
MIGDIR = os.path.join(SCRATCH, "supabase", "migrations")

IDENT = r'(?:"([A-Za-z_][\w]*)"|([A-Za-z_][\w]*))'


def _name(m, i):
    return m.group(i) or m.group(i + 1)


def migration_schema():
    """-> (columns: table -> set(col), constraints: set(name))"""
    cols = defaultdict(set)
    cons = set()
    for fn in sorted(os.listdir(MIGDIR)):
        if not fn.endswith(".sql"):
            continue
        sql = open(os.path.join(MIGDIR, fn), encoding="utf-8", errors="replace").read()

        # ALTER TABLE [IF EXISTS] [schema.]tbl ... ADD COLUMN [IF NOT EXISTS] col
        for m in re.finditer(
                r'ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:\w+\.|"\w+"\.)?' + IDENT + r'(.*?);',
                sql, re.S | re.I):
            tbl = _name(m, 1)
            body = m.group(3)
            for c in re.finditer(
                    r'ADD\s+COLUMN\s+(?:IF\s+NOT\s+EXISTS\s+)?' + IDENT, body, re.I):
                cols[tbl].add(_name(c, 1))
            for c in re.finditer(r'ADD\s+CONSTRAINT\s+' + IDENT, body, re.I):
                cons.add(_name(c, 1))

        # CREATE TABLE [IF NOT EXISTS] [schema.]tbl ( ... )
        for m in re.finditer(
                r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:\w+\.|"\w+"\.)?' + IDENT
                + r'\s*\((.*?)\n\s*\)\s*;', sql, re.S | re.I):
            tbl = _name(m, 1)
            for line in m.group(3).split("\n"):
                line = line.strip().lstrip(",").strip()
                c = re.match(IDENT + r'\s+[A-Za-z]', line)
                if c and not re.match(
                        r'(CONSTRAINT|PRIMARY|UNIQUE|FOREIGN|CHECK)\b', line, re.I):
                    cols[tbl].add(_name(c, 1))
            for c in re.finditer(r'CONSTRAINT\s+' + IDENT, m.group(3), re.I):
                cons.add(_name(c, 1))

        # CREATE [UNIQUE] INDEX name ON tbl - the other way a uniqueness fix can land
        for m in re.finditer(
                r'CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:CONCURRENTLY\s+)?'
                r'(?:IF\s+NOT\s+EXISTS\s+)?' + IDENT, sql, re.I):
            cons.add(_name(m, 1))
    return cols, cons


def model_schema():
    """-> (columns: table -> set(col), constraints: set(name), line map)"""
    src = open(MODELS, encoding="utf-8", errors="replace").read()
    cols = defaultdict(set)
    cons = {}
    cls = tbl = None
    for i, line in enumerate(src.split("\n"), 1):
        m = re.match(r"class (\w+)\(Base\)", line)
        if m:
            cls, tbl = m.group(1), None
            continue
        m = re.search(r'__tablename__\s*=\s*"([^"]+)"', line)
        if m:
            tbl = m.group(1)
            continue
        if tbl is None:
            continue
        m = re.match(r"\s{4}(\w+)\s*=\s*Column\(", line)
        if m:
            cols[tbl].add(m.group(1))
        m = re.search(r'UniqueConstraint\((.*?)name="([^"]+)"', line)
        if m:
            cons[m.group(2)] = (tbl, i)
        m = re.search(r'Index\(\s*"([^"]+)"', line)
        if m:
            cons[m.group(1)] = (tbl, i)
    return cols, cons


def selftest(mcols, mcons):
    ok = True
    # known-positive columns, each from a different migration shape
    for tbl, col, where in [("bills", "cancelled_at", "20260816_000003 ALTER"),
                            ("bills", "cancelled_by", "20260816_000003 ALTER"),
                            ("material_indents", "approved_by", "20260816_000001 ALTER"),
                            ("revoked_tokens", "jti", "20260821_000002 CREATE TABLE")]:
        if col not in mcols.get(tbl, ()):
            print(f"SELFTEST FAIL: {tbl}.{col} should have been found ({where})")
            ok = False
    # known-negative: a column that exists in no migration anywhere
    if "zzz_not_a_real_column" in mcols.get("bills", ()):
        print("SELFTEST FAIL: known-absent column reported present")
        ok = False
    if not mcols:
        print("SELFTEST FAIL: parsed zero tables")
        ok = False
    print("SELFTEST OK" if ok else "SELFTEST FAILED")
    return ok


def main():
    mcols, mcons = migration_schema()
    if not selftest(mcols, mcons):
        sys.exit(1)
    print(f"migrations: {len(mcols)} tables, "
          f"{sum(len(v) for v in mcols.values())} columns, {len(mcons)} named constraints/indexes")

    ocols, ocons = model_schema()
    print(f"models.py : {len(ocols)} tables, {sum(len(v) for v in ocols.values())} columns, "
          f"{len(ocons)} named constraints")

    missing_tables = sorted(t for t in ocols if t not in mcols)
    missing_cols = []
    for t in sorted(ocols):
        if t in missing_tables:
            continue
        for c in sorted(ocols[t] - mcols[t]):
            missing_cols.append((t, c))
    missing_cons = sorted((n, ocons[n][0], ocons[n][1]) for n in ocons if n not in mcons)

    print()
    print("### TABLES in models.py with no migration (create_all DOES create these):")
    for t in missing_tables:
        print("  ", t)
    print()
    print(f"### COLUMNS in models.py with no migration - each is a live 500 "
          f"({len(missing_cols)}):")
    for t, c in missing_cols:
        print(f"   {t}.{c}")
    print()
    print(f"### NAMED CONSTRAINTS in models.py with no migration - fix is inert in prod "
          f"({len(missing_cons)}):")
    for n, t, ln in missing_cons:
        print(f"   {n}  ({t}, models.py:{ln})")


if __name__ == "__main__":
    main()
