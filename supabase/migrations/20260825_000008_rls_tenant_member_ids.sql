-- ==============================================================================
-- Follow-up 1: fix users directory self-only collapse
--
-- Problem: the users policy's second clause in 20260825_000007_rls_correctness.sql
--   reads company_team under RLS, which now restricts to the caller's own row,
--   so the tenant-directory clause collapses to self-only.
--   Subquery `SELECT ct.user_id FROM company_team ct WHERE ct.company_id IN
--   (SELECT public.current_company_ids())` is executed as authenticated, and
--   company_team now has RLS USING (user_id = current_app_user_id()) which
--   restricts company_team to only the caller's own row. Second clause can
--   only see the caller's row, making users directory self-only.
--
-- Fix: SECURITY DEFINER helper tenant_member_user_ids() that bypasses RLS on
--   company_team (same pattern as current_company_ids()), and rewrite users
--   policy to use it.
--
--   Already pushed 000007 is not amended; this 000008 is the safe fix.
--   No non-BYPASSRLS role is created; DATABASE_URL stays BYPASSRLS; RLS
--   remains inert until explicit rollout.
-- ==============================================================================

-- SECURITY DEFINER helper that bypasses RLS on company_team to list all
-- tenant members for the caller's companies.
CREATE OR REPLACE FUNCTION public.tenant_member_user_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ct.user_id FROM company_team ct WHERE ct.company_id IN (SELECT public.current_company_ids())
$$;
REVOKE EXECUTE ON FUNCTION public.tenant_member_user_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tenant_member_user_ids() TO authenticated;

-- Rewrite users policy to use the helper (bypasses RLS on company_team)
DROP POLICY IF EXISTS "users_authenticated_all" ON "users";
CREATE POLICY "users_authenticated_all" ON "users"
  FOR ALL TO authenticated
  USING (id = public.current_app_user_id() OR id IN (SELECT public.tenant_member_user_ids()))
  WITH CHECK (id = public.current_app_user_id() OR id IN (SELECT public.tenant_member_user_ids()));
