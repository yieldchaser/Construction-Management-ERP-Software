-- ==============================================================================
-- SUPABASE SECURITY REMEDIATION SCRIPT FOR SITEFLOW ERP
-- Resolves: "Table publicly accessible" & "Sensitive data publicly accessible"
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) across all public tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END $$;

-- 2. Revoke direct PostgREST HTTP API access from public/anonymous roles
-- (SiteFlow uses FastAPI backend with direct DB pooling, so PostgREST anon access is not needed)
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- 3. Prevent future tables from defaulting to public access for anon role
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
