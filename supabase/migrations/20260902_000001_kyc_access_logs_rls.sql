-- Migration: enable row level security on kyc_access_logs
-- Idempotent.
--
-- Supabase raised rls_disabled_in_public for this table on 2026-08-31. It was
-- the only one of 140 model tables with RLS on no migration, because no
-- migration ever created it: Base.metadata.create_all() ran against production
-- on boot and made the table without a policy. That gap is closed separately
-- in backend/app/main.py.
--
-- The table is the audit trail for identity-document access (party name,
-- document_type including "aadhaar_number_reveal", who looked, and when), so it
-- gets the same tenant predicate as library_parties, the table it references.
--
-- Note company_id is nullable here. A NULL makes the predicate NULL, which is
-- not TRUE, so such rows are visible to no authenticated caller rather than to
-- all of them. That is the safe direction. Backfilling or tightening the column
-- is deliberately not part of this migration.

ALTER TABLE IF EXISTS "kyc_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "kyc_access_logs" FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kyc_access_logs_tenant_scoped" ON "kyc_access_logs";
CREATE POLICY "kyc_access_logs_tenant_scoped" ON "kyc_access_logs"
  FOR ALL TO authenticated
  USING (
      company_id IN (
        SELECT ct.company_id FROM company_team ct
        WHERE ct.user_id = auth.uid()
      )
  )
  WITH CHECK (
      company_id IN (
        SELECT ct.company_id FROM company_team ct
        WHERE ct.user_id = auth.uid()
      )
  );
