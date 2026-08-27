-- ==============================================================================
-- RLS correctness (R2-738, R2-739, R2-740) -- make tenant policies correct
-- without making RLS load-bearing yet. NOT edits to 20260824_000001 (already
-- recorded in supabase_migrations). Next sequence after 20260825_000006_verify.
--
-- Context: 108 _tenant_scoped policies from 20260824_000001 are INERT and verified
-- against production for two independent reasons:
--   - Render connects as postgres / SUPABASE_SERVICE_ROLE_KEY, both have
--     rolbypassrls. FORCE RLS does NOT override BYPASSRLS (only forces on table owner).
--   - Every policy keys on auth.uid, but auth.users has 0 rows, public.users has 8,
--     company_team.user_id FK to public.users, app uses own OTP/password auth with own
--     SECRET_KEY, never Supabase Auth. auth.uid is NULL always, so WHERE ct.user_id = auth.uid never matches.
-- RLS protects nothing today; tenant isolation is via FastAPI company_id filters.
-- These three fixes make RLS CORRECT so it CAN become load-bearing later,
-- without making it load-bearing now.
--
-- R2-738 -- fix infinite recursion:
--   Postgres error 42P17 on SELECT from company_team as authenticated:
--     company_team_tenant_scoped ON company_team FOR ALL TO authenticated
--     USING (company_id IN (SELECT ct.company_id FROM company_team ct WHERE ct.user_id = auth.uid))
--   The policy on company_team queries company_team, requiring eval of itself -> cycle.
--   And every tenant-scoped table subquerys company_team, so all 108 error for authenticated.
--   Fix: SECURITY DEFINER helper current_company_ids() reads membership outside RLS,
--   and company_team policy becomes USING (user_id = current_app_user_id()) with no self-subquery.
--
-- R2-739 -- pluggable identity:
--   - current_app_user_id() reads COALESCE(NULLIF(current_setting('app.current_user_id', true), '')::uuid, auth.uid)
--     so backend can SET LOCAL app.current_user_id per request (transaction-scoped, pooler-safe),
--     falling back to auth.uid for any direct Supabase Auth usage.
--   - current_company_ids() calls current_app_user_id(), SECURITY DEFINER, revokes PUBLIC.
--   - Backend wiring is BEHIND flag RLS_SESSION_CONTEXT (default OFF, see backend/app/config.py).
--     When enabled, get_current_user() / get_current_active_company_user() set
--     set_config('app.current_user_id', '<user.id>', true) on the request DB session.
--     No DATABASE_URL change, no non-BYPASSRLS role created here (explicit non-goal).
--
-- R2-740 -- companies and users USING (true):
--   Of 33 legacy *_authenticated_all policies left, two matter most:
--     companies_authenticated_all ON companies TO authenticated USING (true)
--     users_authenticated_all     ON users     TO authenticated USING (true)
--   They left the company registry and user registry unrestricted. In a working
--   RLS deployment any authenticated principal could read every company/user row.
--   Fixed here to membership-scoped predicates.
--   The other 31 legacy policies remain USING (true) intentionally -- see notes below.
--   They are child rows joined through parents, global/auth tables, or deliberately
--   shared via application checks. Documented allowlist (header of 20260824_000001):

-- Other 31 legacy *_authenticated_all policies intentionally remain USING (true):
-- Deliberately shared / application-scoped or child-table predicates (no direct company_id/project_id):
--   chat_group_members, chat_messages -- chat groups already scoped, members/messages joined through parent
--   checklist_items -- joined through checklists/projects
--   crm_quotation_items, crm_quotations -- joined through crm_leads/opportunities (company-scoped parent)
--   drawing_pins, drawing_revisions, drawing_revision_approvals -- joined through drawings/projects
--   equipment_maintenance_schedules -- joined through equipment/company
--   grn_items -- joined through goods_receipt_notes
--   inspection_responses -- joined through inspections/projects
--   marketing_leads -- global public lead intake, intentionally open to authenticated
--   material_indent_items -- joined through material_indents
--   otp_codes -- auth ephemeral, keyed by identifier not company; app-level rate limiting governs
--   payment_settlements -- joined through payments/bills
--   payroll_line_items -- joined through payroll_runs
--   production_batch_materials, production_recipe_materials -- joined through batches/recipes
--   purchase_order_items -- joined through purchase_orders
--   rfq_items, rfq_quotes -- joined through rfqs
--   task_comments, task_predecessors, task_todos -- joined through tasks/projects
--   timesheet_entries -- joined through timesheets
--   todo_assignees -- joined through todos
--   transaction_deductions, transaction_retentions -- joined through bills
--   work_order_amendments, work_order_items -- joined through work_orders
--   revoked_tokens -- auth revocation list, intentionally global (jti lookup)
-- These remain USING (true) with FORCE RLS until per-table join predicates are designed.
-- companies and users are FIXED below (not in this allowlist).
--
-- Gate: backend/tests/coverage/test_r2_510_rls_tenant_isolation.py extended with
-- Postgres-only assertions (skipped on SQLite) that:
--   - SELECT from company_team as authenticated does NOT raise 42P17
--   - with app.current_user_id set to user in company A, projects/bills/companies
--     return ONLY company A rows and zero company B rows
-- SQLite cannot see RLS (same as R2-728), so those tests skip on SQLite via dialect check.
--
-- No non-BYPASSRLS role is created; DATABASE_URL stays as postgres/service_role (BYPASSRLS).
-- RLS remains inert until explicit rollout (flag ON + role change).
-- ==============================================================================

-- -- R2-739: pluggable identity -- current_app_user_id() first (dependency) ------
CREATE OR REPLACE FUNCTION public.current_app_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $fn$
  SELECT COALESCE(
    NULLIF(current_setting('app.current_user_id', true), '')::uuid,
    auth.uid()
  )
$fn$;

-- -- R2-738a: SECURITY DEFINER helper that bypasses RLS on company_team ----------
CREATE OR REPLACE FUNCTION public.current_company_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $fn$
  SELECT ct.company_id FROM company_team ct WHERE ct.user_id = public.current_app_user_id()
$fn$;
REVOKE EXECUTE ON FUNCTION public.current_company_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_company_ids() TO authenticated;
-- current_app_user_id is intentionally callable by any authenticated session
-- (no SECURITY DEFINER needed; it only reads GUC + auth.uid).
REVOKE EXECUTE ON FUNCTION public.current_app_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_app_user_id() TO authenticated;

-- -- R2-738b: company_team -- fix self-referential recursion ------------------
-- Old predicate queried company_team from its own policy -> 42P17 infinite recursion.
-- New predicate keys directly on user_id with no subquery over itself.
DROP POLICY IF EXISTS "company_team_tenant_scoped" ON "company_team";
CREATE POLICY "company_team_tenant_scoped" ON "company_team"
  FOR ALL TO authenticated
  USING (user_id = public.current_app_user_id())
  WITH CHECK (user_id = public.current_app_user_id());

-- approval_actions: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "approval_actions_tenant_scoped" ON "approval_actions";
CREATE POLICY "approval_actions_tenant_scoped" ON "approval_actions"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- approval_rules: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "approval_rules_tenant_scoped" ON "approval_rules";
CREATE POLICY "approval_rules_tenant_scoped" ON "approval_rules"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- asset_depreciation_entries: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "asset_depreciation_entries_tenant_scoped" ON "asset_depreciation_entries";
CREATE POLICY "asset_depreciation_entries_tenant_scoped" ON "asset_depreciation_entries"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- asset_depreciation_schedules: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "asset_depreciation_schedules_tenant_scoped" ON "asset_depreciation_schedules";
CREATE POLICY "asset_depreciation_schedules_tenant_scoped" ON "asset_depreciation_schedules"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- bank_accounts: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "bank_accounts_tenant_scoped" ON "bank_accounts";
CREATE POLICY "bank_accounts_tenant_scoped" ON "bank_accounts"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- bi_api_keys: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "bi_api_keys_tenant_scoped" ON "bi_api_keys";
CREATE POLICY "bi_api_keys_tenant_scoped" ON "bi_api_keys"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- bills: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "bills_tenant_scoped" ON "bills";
CREATE POLICY "bills_tenant_scoped" ON "bills"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- bocw_records: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "bocw_records_tenant_scoped" ON "bocw_records";
CREATE POLICY "bocw_records_tenant_scoped" ON "bocw_records"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- cash_accounts: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "cash_accounts_tenant_scoped" ON "cash_accounts";
CREATE POLICY "cash_accounts_tenant_scoped" ON "cash_accounts"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- chat_groups: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "chat_groups_tenant_scoped" ON "chat_groups";
CREATE POLICY "chat_groups_tenant_scoped" ON "chat_groups"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- company_branches: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "company_branches_tenant_scoped" ON "company_branches";
CREATE POLICY "company_branches_tenant_scoped" ON "company_branches"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- company_files: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "company_files_tenant_scoped" ON "company_files";
CREATE POLICY "company_files_tenant_scoped" ON "company_files"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- company_payroll_settings: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "company_payroll_settings_tenant_scoped" ON "company_payroll_settings";
CREATE POLICY "company_payroll_settings_tenant_scoped" ON "company_payroll_settings"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- company_roles: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "company_roles_tenant_scoped" ON "company_roles";
CREATE POLICY "company_roles_tenant_scoped" ON "company_roles"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- company_terms: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "company_terms_tenant_scoped" ON "company_terms";
CREATE POLICY "company_terms_tenant_scoped" ON "company_terms"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- credit_notes: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "credit_notes_tenant_scoped" ON "credit_notes";
CREATE POLICY "credit_notes_tenant_scoped" ON "credit_notes"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- crm_lead_categories: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "crm_lead_categories_tenant_scoped" ON "crm_lead_categories";
CREATE POLICY "crm_lead_categories_tenant_scoped" ON "crm_lead_categories"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- crm_lead_sources: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "crm_lead_sources_tenant_scoped" ON "crm_lead_sources";
CREATE POLICY "crm_lead_sources_tenant_scoped" ON "crm_lead_sources"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- crm_lead_statuses: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "crm_lead_statuses_tenant_scoped" ON "crm_lead_statuses";
CREATE POLICY "crm_lead_statuses_tenant_scoped" ON "crm_lead_statuses"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- crm_leads: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "crm_leads_tenant_scoped" ON "crm_leads";
CREATE POLICY "crm_leads_tenant_scoped" ON "crm_leads"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- custom_field_values: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "custom_field_values_tenant_scoped" ON "custom_field_values";
CREATE POLICY "custom_field_values_tenant_scoped" ON "custom_field_values"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- custom_fields: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "custom_fields_tenant_scoped" ON "custom_fields";
CREATE POLICY "custom_fields_tenant_scoped" ON "custom_fields"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- debit_notes: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "debit_notes_tenant_scoped" ON "debit_notes";
CREATE POLICY "debit_notes_tenant_scoped" ON "debit_notes"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- delete_logs: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "delete_logs_tenant_scoped" ON "delete_logs";
CREATE POLICY "delete_logs_tenant_scoped" ON "delete_logs"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- designations: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "designations_tenant_scoped" ON "designations";
CREATE POLICY "designations_tenant_scoped" ON "designations"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- equipment: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "equipment_tenant_scoped" ON "equipment";
CREATE POLICY "equipment_tenant_scoped" ON "equipment"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- face_recognition_logs: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "face_recognition_logs_tenant_scoped" ON "face_recognition_logs";
CREATE POLICY "face_recognition_logs_tenant_scoped" ON "face_recognition_logs"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- goods_receipt_notes: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "goods_receipt_notes_tenant_scoped" ON "goods_receipt_notes";
CREATE POLICY "goods_receipt_notes_tenant_scoped" ON "goods_receipt_notes"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- google_drive_connections: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "google_drive_connections_tenant_scoped" ON "google_drive_connections";
CREATE POLICY "google_drive_connections_tenant_scoped" ON "google_drive_connections"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- google_sheets_connections: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "google_sheets_connections_tenant_scoped" ON "google_sheets_connections";
CREATE POLICY "google_sheets_connections_tenant_scoped" ON "google_sheets_connections"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- holidays: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "holidays_tenant_scoped" ON "holidays";
CREATE POLICY "holidays_tenant_scoped" ON "holidays"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- leave_requests: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "leave_requests_tenant_scoped" ON "leave_requests";
CREATE POLICY "leave_requests_tenant_scoped" ON "leave_requests"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- leave_templates: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "leave_templates_tenant_scoped" ON "leave_templates";
CREATE POLICY "leave_templates_tenant_scoped" ON "leave_templates"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_asset_types: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_asset_types_tenant_scoped" ON "library_asset_types";
CREATE POLICY "library_asset_types_tenant_scoped" ON "library_asset_types"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_cost_codes: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_cost_codes_tenant_scoped" ON "library_cost_codes";
CREATE POLICY "library_cost_codes_tenant_scoped" ON "library_cost_codes"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_deductions: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_deductions_tenant_scoped" ON "library_deductions";
CREATE POLICY "library_deductions_tenant_scoped" ON "library_deductions"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_materials: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_materials_tenant_scoped" ON "library_materials";
CREATE POLICY "library_materials_tenant_scoped" ON "library_materials"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_parties: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_parties_tenant_scoped" ON "library_parties";
CREATE POLICY "library_parties_tenant_scoped" ON "library_parties"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_progresses: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_progresses_tenant_scoped" ON "library_progresses";
CREATE POLICY "library_progresses_tenant_scoped" ON "library_progresses"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_rates: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_rates_tenant_scoped" ON "library_rates";
CREATE POLICY "library_rates_tenant_scoped" ON "library_rates"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_retentions: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_retentions_tenant_scoped" ON "library_retentions";
CREATE POLICY "library_retentions_tenant_scoped" ON "library_retentions"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_todos: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_todos_tenant_scoped" ON "library_todos";
CREATE POLICY "library_todos_tenant_scoped" ON "library_todos"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- library_workforces: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "library_workforces_tenant_scoped" ON "library_workforces";
CREATE POLICY "library_workforces_tenant_scoped" ON "library_workforces"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- material_categories: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "material_categories_tenant_scoped" ON "material_categories";
CREATE POLICY "material_categories_tenant_scoped" ON "material_categories"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- material_indents: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "material_indents_tenant_scoped" ON "material_indents";
CREATE POLICY "material_indents_tenant_scoped" ON "material_indents"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- material_wastage: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "material_wastage_tenant_scoped" ON "material_wastage";
CREATE POLICY "material_wastage_tenant_scoped" ON "material_wastage"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- moms: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "moms_tenant_scoped" ON "moms";
CREATE POLICY "moms_tenant_scoped" ON "moms"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- muster_rolls: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "muster_rolls_tenant_scoped" ON "muster_rolls";
CREATE POLICY "muster_rolls_tenant_scoped" ON "muster_rolls"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- oauth_handoffs: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "oauth_handoffs_tenant_scoped" ON "oauth_handoffs";
CREATE POLICY "oauth_handoffs_tenant_scoped" ON "oauth_handoffs"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- payment_request_payments: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "payment_request_payments_tenant_scoped" ON "payment_request_payments";
CREATE POLICY "payment_request_payments_tenant_scoped" ON "payment_request_payments"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- payment_requests: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "payment_requests_tenant_scoped" ON "payment_requests";
CREATE POLICY "payment_requests_tenant_scoped" ON "payment_requests"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- payments: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "payments_tenant_scoped" ON "payments";
CREATE POLICY "payments_tenant_scoped" ON "payments"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- payroll_profiles: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "payroll_profiles_tenant_scoped" ON "payroll_profiles";
CREATE POLICY "payroll_profiles_tenant_scoped" ON "payroll_profiles"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- payroll_runs: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "payroll_runs_tenant_scoped" ON "payroll_runs";
CREATE POLICY "payroll_runs_tenant_scoped" ON "payroll_runs"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- pdf_templates: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "pdf_templates_tenant_scoped" ON "pdf_templates";
CREATE POLICY "pdf_templates_tenant_scoped" ON "pdf_templates"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- production_batches: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "production_batches_tenant_scoped" ON "production_batches";
CREATE POLICY "production_batches_tenant_scoped" ON "production_batches"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- production_recipes: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "production_recipes_tenant_scoped" ON "production_recipes";
CREATE POLICY "production_recipes_tenant_scoped" ON "production_recipes"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- projects: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "projects_tenant_scoped" ON "projects";
CREATE POLICY "projects_tenant_scoped" ON "projects"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- purchase_orders: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "purchase_orders_tenant_scoped" ON "purchase_orders";
CREATE POLICY "purchase_orders_tenant_scoped" ON "purchase_orders"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- quality_checklists: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "quality_checklists_tenant_scoped" ON "quality_checklists";
CREATE POLICY "quality_checklists_tenant_scoped" ON "quality_checklists"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- quotations: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "quotations_tenant_scoped" ON "quotations";
CREATE POLICY "quotations_tenant_scoped" ON "quotations"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- rfqs: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "rfqs_tenant_scoped" ON "rfqs";
CREATE POLICY "rfqs_tenant_scoped" ON "rfqs"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- salary_templates: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "salary_templates_tenant_scoped" ON "salary_templates";
CREATE POLICY "salary_templates_tenant_scoped" ON "salary_templates"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- staff_employees: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "staff_employees_tenant_scoped" ON "staff_employees";
CREATE POLICY "staff_employees_tenant_scoped" ON "staff_employees"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- statutory_reports: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "statutory_reports_tenant_scoped" ON "statutory_reports";
CREATE POLICY "statutory_reports_tenant_scoped" ON "statutory_reports"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- subcontractor_performance: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "subcontractor_performance_tenant_scoped" ON "subcontractor_performance";
CREATE POLICY "subcontractor_performance_tenant_scoped" ON "subcontractor_performance"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- tally_agents: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "tally_agents_tenant_scoped" ON "tally_agents";
CREATE POLICY "tally_agents_tenant_scoped" ON "tally_agents"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- tally_bank_mappings: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "tally_bank_mappings_tenant_scoped" ON "tally_bank_mappings";
CREATE POLICY "tally_bank_mappings_tenant_scoped" ON "tally_bank_mappings"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- tally_connections: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "tally_connections_tenant_scoped" ON "tally_connections";
CREATE POLICY "tally_connections_tenant_scoped" ON "tally_connections"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- tally_cost_centre_mappings: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "tally_cost_centre_mappings_tenant_scoped" ON "tally_cost_centre_mappings";
CREATE POLICY "tally_cost_centre_mappings_tenant_scoped" ON "tally_cost_centre_mappings"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- tally_ledger_mappings: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "tally_ledger_mappings_tenant_scoped" ON "tally_ledger_mappings";
CREATE POLICY "tally_ledger_mappings_tenant_scoped" ON "tally_ledger_mappings"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- tally_party_mappings: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "tally_party_mappings_tenant_scoped" ON "tally_party_mappings";
CREATE POLICY "tally_party_mappings_tenant_scoped" ON "tally_party_mappings"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- tally_sync_logs: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "tally_sync_logs_tenant_scoped" ON "tally_sync_logs";
CREATE POLICY "tally_sync_logs_tenant_scoped" ON "tally_sync_logs"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- team_schedule_timesheets: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "team_schedule_timesheets_tenant_scoped" ON "team_schedule_timesheets";
CREATE POLICY "team_schedule_timesheets_tenant_scoped" ON "team_schedule_timesheets"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- three_way_matches: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "three_way_matches_tenant_scoped" ON "three_way_matches";
CREATE POLICY "three_way_matches_tenant_scoped" ON "three_way_matches"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- todos: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "todos_tenant_scoped" ON "todos";
CREATE POLICY "todos_tenant_scoped" ON "todos"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- vendor_performance: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "vendor_performance_tenant_scoped" ON "vendor_performance";
CREATE POLICY "vendor_performance_tenant_scoped" ON "vendor_performance"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- work_orders: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "work_orders_tenant_scoped" ON "work_orders";
CREATE POLICY "work_orders_tenant_scoped" ON "work_orders"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- zoho_books_connections: tenant-scoped via current_company_ids()
DROP POLICY IF EXISTS "zoho_books_connections_tenant_scoped" ON "zoho_books_connections";
CREATE POLICY "zoho_books_connections_tenant_scoped" ON "zoho_books_connections"
  FOR ALL TO authenticated
  USING (company_id IN (SELECT public.current_company_ids()))
  WITH CHECK (company_id IN (SELECT public.current_company_ids()));

-- attendance_logs: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "attendance_logs_tenant_scoped" ON "attendance_logs";
CREATE POLICY "attendance_logs_tenant_scoped" ON "attendance_logs"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- boq_documents: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "boq_documents_tenant_scoped" ON "boq_documents";
CREATE POLICY "boq_documents_tenant_scoped" ON "boq_documents"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- boq_items: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "boq_items_tenant_scoped" ON "boq_items";
CREATE POLICY "boq_items_tenant_scoped" ON "boq_items"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- boq_revisions: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "boq_revisions_tenant_scoped" ON "boq_revisions";
CREATE POLICY "boq_revisions_tenant_scoped" ON "boq_revisions"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- client_reports: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "client_reports_tenant_scoped" ON "client_reports";
CREATE POLICY "client_reports_tenant_scoped" ON "client_reports"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- daily_progress_reports: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "daily_progress_reports_tenant_scoped" ON "daily_progress_reports";
CREATE POLICY "daily_progress_reports_tenant_scoped" ON "daily_progress_reports"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- drawings: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "drawings_tenant_scoped" ON "drawings";
CREATE POLICY "drawings_tenant_scoped" ON "drawings"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- equipment_deployments: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "equipment_deployments_tenant_scoped" ON "equipment_deployments";
CREATE POLICY "equipment_deployments_tenant_scoped" ON "equipment_deployments"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- equipment_fuel_logs: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "equipment_fuel_logs_tenant_scoped" ON "equipment_fuel_logs";
CREATE POLICY "equipment_fuel_logs_tenant_scoped" ON "equipment_fuel_logs"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- file_folders: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "file_folders_tenant_scoped" ON "file_folders";
CREATE POLICY "file_folders_tenant_scoped" ON "file_folders"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- material_test_results: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "material_test_results_tenant_scoped" ON "material_test_results";
CREATE POLICY "material_test_results_tenant_scoped" ON "material_test_results"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- material_transactions: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "material_transactions_tenant_scoped" ON "material_transactions";
CREATE POLICY "material_transactions_tenant_scoped" ON "material_transactions"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- ncrs: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "ncrs_tenant_scoped" ON "ncrs";
CREATE POLICY "ncrs_tenant_scoped" ON "ncrs"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- ppe_checks: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "ppe_checks_tenant_scoped" ON "ppe_checks";
CREATE POLICY "ppe_checks_tenant_scoped" ON "ppe_checks"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- project_budgets: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "project_budgets_tenant_scoped" ON "project_budgets";
CREATE POLICY "project_budgets_tenant_scoped" ON "project_budgets"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- project_files: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "project_files_tenant_scoped" ON "project_files";
CREATE POLICY "project_files_tenant_scoped" ON "project_files"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- project_locations: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "project_locations_tenant_scoped" ON "project_locations";
CREATE POLICY "project_locations_tenant_scoped" ON "project_locations"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- project_members: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "project_members_tenant_scoped" ON "project_members";
CREATE POLICY "project_members_tenant_scoped" ON "project_members"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- project_milestones: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "project_milestones_tenant_scoped" ON "project_milestones";
CREATE POLICY "project_milestones_tenant_scoped" ON "project_milestones"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- project_parties: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "project_parties_tenant_scoped" ON "project_parties";
CREATE POLICY "project_parties_tenant_scoped" ON "project_parties"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- project_towers: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "project_towers_tenant_scoped" ON "project_towers";
CREATE POLICY "project_towers_tenant_scoped" ON "project_towers"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- safety_incidents: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "safety_incidents_tenant_scoped" ON "safety_incidents";
CREATE POLICY "safety_incidents_tenant_scoped" ON "safety_incidents"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- site_inspections: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "site_inspections_tenant_scoped" ON "site_inspections";
CREATE POLICY "site_inspections_tenant_scoped" ON "site_inspections"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- subcontractor_attendance_logs: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "subcontractor_attendance_logs_tenant_scoped" ON "subcontractor_attendance_logs";
CREATE POLICY "subcontractor_attendance_logs_tenant_scoped" ON "subcontractor_attendance_logs"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- tasks: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "tasks_tenant_scoped" ON "tasks";
CREATE POLICY "tasks_tenant_scoped" ON "tasks"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- timesheets: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "timesheets_tenant_scoped" ON "timesheets";
CREATE POLICY "timesheets_tenant_scoped" ON "timesheets"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- toolbox_talks: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "toolbox_talks_tenant_scoped" ON "toolbox_talks";
CREATE POLICY "toolbox_talks_tenant_scoped" ON "toolbox_talks"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- warehouse_inventory: project-resolved via current_company_ids()
DROP POLICY IF EXISTS "warehouse_inventory_tenant_scoped" ON "warehouse_inventory";
CREATE POLICY "warehouse_inventory_tenant_scoped" ON "warehouse_inventory"
  FOR ALL TO authenticated
  USING (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())))
  WITH CHECK (project_id IN (SELECT p.id FROM projects p WHERE p.company_id IN (SELECT public.current_company_ids())));

-- -- R2-740: scope companies and users (previously USING (true)) -------------
-- companies: only companies the caller is a member of
DROP POLICY IF EXISTS "companies_authenticated_all" ON "companies";
CREATE POLICY "companies_authenticated_all" ON "companies"
  FOR ALL TO authenticated
  USING (id IN (SELECT public.current_company_ids()))
  WITH CHECK (id IN (SELECT public.current_company_ids()));

-- users: own row OR any user in same companies (directory within tenant)
DROP POLICY IF EXISTS "users_authenticated_all" ON "users";
CREATE POLICY "users_authenticated_all" ON "users"
  FOR ALL TO authenticated
  USING (
    id = public.current_app_user_id()
    OR id IN (
      SELECT ct.user_id FROM company_team ct
      WHERE ct.company_id IN (SELECT public.current_company_ids())
    )
  )
  WITH CHECK (
    id = public.current_app_user_id()
    OR id IN (
      SELECT ct.user_id FROM company_team ct
      WHERE ct.company_id IN (SELECT public.current_company_ids())
    )
  );

