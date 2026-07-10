-- ============================================================================
-- 20260710_000003_file_storage_supabase.sql
-- Move company/project file blobs out of the DB bytea column into Supabase
-- Storage. Adds a `storage_path` column to `company_files` and `project_files`,
-- and makes the legacy `data` bytea column nullable so new uploads can store
-- their bytes in object storage (with `data = NULL`) instead of the DB.
--
-- The `data` column is intentionally NOT dropped here. It remains the local-dev
-- fallback and holds any rows not yet migrated. A separate cleanup migration
-- may drop `data` only after backend/scripts/backfill_files_to_storage.py has
-- confirmed prod rows were pushed to Storage and `storage_path` populated.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- company_files: new storage path + nullable legacy blob
ALTER TABLE "company_files" ADD COLUMN IF NOT EXISTS "storage_path" VARCHAR(512);
ALTER TABLE "company_files" ALTER COLUMN "data" DROP NOT NULL;

-- project_files: new storage path + nullable legacy blob
ALTER TABLE "project_files" ADD COLUMN IF NOT EXISTS "storage_path" VARCHAR(512);
ALTER TABLE "project_files" ALTER COLUMN "data" DROP NOT NULL;
