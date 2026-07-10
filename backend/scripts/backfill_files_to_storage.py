"""One-time backfill: push existing DB file BLOBs to Supabase Storage.

Run manually (NOT on app startup) after deploying the storage migration and
setting SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the environment:

    cd backend
    python scripts/backfill_files_to_storage.py

For each CompanyFile / ProjectFile row that still has bytes in the `data`
column but no `storage_path`, this uploads the bytes to the matching private
bucket and records the object key in `storage_path`. Rows that already have a
`storage_path` are skipped. The `data` column is left in place (it becomes the
local-dev fallback / safety net); clear it separately once you have verified
the migration in prod.
"""

import os
import sys

# Allow running as `python scripts/backfill_files_to_storage.py` from backend/.
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.database import SessionLocal  # noqa: E402
from app.models import CompanyFile, ProjectFile  # noqa: E402
from app import supabase_storage  # noqa: E402


def backfill_company_files(db):
    rows = (
        db.query(CompanyFile)
        .filter(CompanyFile.data.isnot(None), CompanyFile.storage_path.is_(None))
        .all()
    )
    count = 0
    for cf in rows:
        path = f"{cf.company_id}/{cf.asset_type}"
        supabase_storage.upload_bytes(
            supabase_storage.BUCKET_COMPANY_FILES,
            path,
            bytes(cf.data),
            cf.content_type,
        )
        cf.storage_path = path
        cf.data = None
        count += 1
    db.commit()
    return count


def backfill_project_files(db):
    rows = (
        db.query(ProjectFile)
        .filter(ProjectFile.data.isnot(None), ProjectFile.storage_path.is_(None))
        .all()
    )
    count = 0
    for pf in rows:
        path = f"{pf.project_id}/{pf.id}"
        supabase_storage.upload_bytes(
            supabase_storage.BUCKET_PROJECT_FILES,
            path,
            bytes(pf.data),
            pf.content_type,
        )
        pf.storage_path = path
        pf.data = None
        count += 1
    db.commit()
    return count


def main():
    if not supabase_storage.is_storage_configured():
        print(
            "Supabase Storage is not configured (SUPABASE_URL / "
            "SUPABASE_SERVICE_ROLE_KEY missing). Nothing to backfill."
        )
        return

    supabase_storage.ensure_buckets()

    db = SessionLocal()
    try:
        company_n = backfill_company_files(db)
        project_n = backfill_project_files(db)
    finally:
        db.close()

    print(f"Backfilled {company_n} company file(s) and {project_n} project file(s).")


if __name__ == "__main__":
    main()
