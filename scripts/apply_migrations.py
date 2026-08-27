#!/usr/bin/env python3
"""
R2-731: Manual / CI invocation for supabase/migrations/*.sql.

Usage:
    python scripts/apply_migrations.py
    DATABASE_URL=postgresql://... python scripts/apply_migrations.py --strict
    SUPABASE_MIGRATIONS_DIR=/custom/path python scripts/apply_migrations.py

This script does the same work as backend/app/migration_runner.py's
apply_pending_migrations() but is invocable outside the FastAPI lifespan
(for CI, Render job, or manual one-off). It respects both SQLite and
Postgres engines via DATABASE_URL.

In CI, set MIGRATION_RUNNER_STRICT=1 to fail the job if any migration errors.
"""
from __future__ import annotations

import argparse
import os
import sys

# Ensure backend/ is on sys.path so `import app.*` works when invoked as
# `python scripts/apply_migrations.py` from repo root.
REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(REPO_ROOT, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply supabase/migrations/*.sql")
    parser.add_argument("--strict", action="store_true", help="Fail on any migration error (sets MIGRATION_RUNNER_STRICT=1)")
    parser.add_argument("--dir", dest="migrations_dir", default=None, help="Override supabase/migrations directory")
    args = parser.parse_args()

    if args.strict:
        os.environ["MIGRATION_RUNNER_STRICT"] = "1"

    if args.migrations_dir:
        os.environ["SUPABASE_MIGRATIONS_DIR"] = args.migrations_dir

    # Import here after sys.path and env setup.
    try:
        from app.migration_runner import apply_pending_migrations
    except Exception as e:
        print(f"[apply_migrations] failed to import migration_runner: {e}", file=sys.stderr)
        return 2

    print(f"[apply_migrations] DATABASE_URL={os.getenv('DATABASE_URL','(from settings)')} ")
    try:
        applied = apply_pending_migrations()
    except Exception as e:
        print(f"[apply_migrations] run failed: {e}", file=sys.stderr)
        return 1

    if applied:
        print(f"[apply_migrations] applied {len(applied)} migration(s): {', '.join(applied)}")
    else:
        print("[apply_migrations] no pending migrations (already up to date)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
