-- ==============================================================================
-- RLS tenant isolation (audit finding R2-510), generated migration.
--
-- The base migration (20260723_000001_enable_rls_security.sql) enabled RLS on all
-- 139 tables but gave every policy USING (true) WITH CHECK (true), so the
-- database enforced no tenant isolation at all. This migration replaces those
-- blanket policies with real tenant predicates on every table that carries a
-- direct tenancy link (company_id, or project_id resolved through projects), and
-- sets FORCE ROW LEVEL SECURITY everywhere so table owners can no longer bypass
-- RLS. The FastAPI backend is unaffected either way: it connects with the
-- service-role key, which bypasses RLS by design and must stay server-side only.
--
-- Tenant predicate shape (80 company-scoped tables):
--   company_id IN (SELECT ct.company_id FROM company_team ct
--                  WHERE ct.user_id = auth.uid())
-- Project-resolved shape (28 tables):
--   project_id IN (SELECT p.id FROM projects p
--                  WHERE p.company_id IN (SELECT ct.company_id FROM company_team ct
--                                         WHERE ct.user_id = auth.uid()))
--
-- Report-only follow-up: 33 tables have no direct company_id/project_id column
-- (global/auth tables and child rows joined through their parents). They keep the
-- unconditional authenticated-only policy until per-table join predicates are
-- designed; anon access stays denied to them as before:
--   chat_group_members
--   chat_messages
--   checklist_items
--   companies
--   crm_quotation_items
--   crm_quotations
--   drawing_pins
--   drawing_revisions
--   equipment_maintenance_schedules
--   grn_items
--   inspection_responses
--   marketing_leads
--   material_indent_items
--   otp_codes
--   payment_settlements
--   payroll_line_items
--   production_batch_materials
--   production_recipe_materials
--   purchase_order_items
--   rfq_items
--   rfq_quotes
--   task_comments
--   task_predecessors
--   task_todos
--   timesheet_entries
--   todo_assignees
--   transaction_deductions
--   transaction_retentions
--   users
--   work_order_amendments
--   work_order_items
--   revoked_tokens  (had NO RLS at all before this migration)
--   drawing_revision_approvals  (had NO RLS at all before this migration)
-- ==============================================================================

-- approval_actions: tenant-scoped policy replaces "approval_actions_authenticated_all"
ALTER TABLE IF EXISTS "approval_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "approval_actions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approval_actions_authenticated_all" ON "approval_actions";
CREATE POLICY "approval_actions_tenant_scoped" ON "approval_actions"
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

-- approval_rules: tenant-scoped policy replaces "approval_rules_authenticated_all"
ALTER TABLE IF EXISTS "approval_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "approval_rules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approval_rules_authenticated_all" ON "approval_rules";
CREATE POLICY "approval_rules_tenant_scoped" ON "approval_rules"
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

-- asset_depreciation_entries: tenant-scoped policy replaces "asset_depreciation_entries_authenticated_all"
ALTER TABLE IF EXISTS "asset_depreciation_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "asset_depreciation_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asset_depreciation_entries_authenticated_all" ON "asset_depreciation_entries";
CREATE POLICY "asset_depreciation_entries_tenant_scoped" ON "asset_depreciation_entries"
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

-- asset_depreciation_schedules: tenant-scoped policy replaces "asset_depreciation_schedules_authenticated_all"
ALTER TABLE IF EXISTS "asset_depreciation_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "asset_depreciation_schedules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asset_depreciation_schedules_authenticated_all" ON "asset_depreciation_schedules";
CREATE POLICY "asset_depreciation_schedules_tenant_scoped" ON "asset_depreciation_schedules"
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

-- attendance_logs: tenant-scoped policy replaces "attendance_logs_authenticated_all"
ALTER TABLE IF EXISTS "attendance_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "attendance_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_logs_authenticated_all" ON "attendance_logs";
CREATE POLICY "attendance_logs_tenant_scoped" ON "attendance_logs"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- bank_accounts: tenant-scoped policy replaces "bank_accounts_authenticated_all"
ALTER TABLE IF EXISTS "bank_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bank_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_accounts_authenticated_all" ON "bank_accounts";
CREATE POLICY "bank_accounts_tenant_scoped" ON "bank_accounts"
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

-- bi_api_keys: tenant-scoped policy replaces "bi_api_keys_authenticated_all"
ALTER TABLE IF EXISTS "bi_api_keys" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bi_api_keys" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bi_api_keys_authenticated_all" ON "bi_api_keys";
CREATE POLICY "bi_api_keys_tenant_scoped" ON "bi_api_keys"
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

-- bills: tenant-scoped policy replaces "bills_authenticated_all"
ALTER TABLE IF EXISTS "bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bills" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bills_authenticated_all" ON "bills";
CREATE POLICY "bills_tenant_scoped" ON "bills"
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

-- bocw_records: tenant-scoped policy replaces "bocw_records_authenticated_all"
ALTER TABLE IF EXISTS "bocw_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "bocw_records" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bocw_records_authenticated_all" ON "bocw_records";
CREATE POLICY "bocw_records_tenant_scoped" ON "bocw_records"
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

-- boq_documents: tenant-scoped policy replaces "boq_documents_authenticated_all"
ALTER TABLE IF EXISTS "boq_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "boq_documents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boq_documents_authenticated_all" ON "boq_documents";
CREATE POLICY "boq_documents_tenant_scoped" ON "boq_documents"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- boq_items: tenant-scoped policy replaces "boq_items_authenticated_all"
ALTER TABLE IF EXISTS "boq_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "boq_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boq_items_authenticated_all" ON "boq_items";
CREATE POLICY "boq_items_tenant_scoped" ON "boq_items"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- boq_revisions: tenant-scoped policy replaces "boq_revisions_authenticated_all"
ALTER TABLE IF EXISTS "boq_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "boq_revisions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boq_revisions_authenticated_all" ON "boq_revisions";
CREATE POLICY "boq_revisions_tenant_scoped" ON "boq_revisions"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- cash_accounts: tenant-scoped policy replaces "cash_accounts_authenticated_all"
ALTER TABLE IF EXISTS "cash_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "cash_accounts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cash_accounts_authenticated_all" ON "cash_accounts";
CREATE POLICY "cash_accounts_tenant_scoped" ON "cash_accounts"
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

-- chat_groups: tenant-scoped policy replaces "chat_groups_authenticated_all"
ALTER TABLE IF EXISTS "chat_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "chat_groups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_groups_authenticated_all" ON "chat_groups";
CREATE POLICY "chat_groups_tenant_scoped" ON "chat_groups"
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

-- client_reports: tenant-scoped policy replaces "client_reports_authenticated_all"
ALTER TABLE IF EXISTS "client_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "client_reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_reports_authenticated_all" ON "client_reports";
CREATE POLICY "client_reports_tenant_scoped" ON "client_reports"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- company_branches: tenant-scoped policy replaces "company_branches_authenticated_all"
ALTER TABLE IF EXISTS "company_branches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "company_branches" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_branches_authenticated_all" ON "company_branches";
CREATE POLICY "company_branches_tenant_scoped" ON "company_branches"
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

-- company_files: tenant-scoped policy replaces "company_files_authenticated_all"
ALTER TABLE IF EXISTS "company_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "company_files" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_files_authenticated_all" ON "company_files";
CREATE POLICY "company_files_tenant_scoped" ON "company_files"
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

-- company_payroll_settings: tenant-scoped policy replaces "company_payroll_settings_authenticated_all"
ALTER TABLE IF EXISTS "company_payroll_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "company_payroll_settings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_payroll_settings_authenticated_all" ON "company_payroll_settings";
CREATE POLICY "company_payroll_settings_tenant_scoped" ON "company_payroll_settings"
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

-- company_roles: tenant-scoped policy replaces "company_roles_authenticated_all"
ALTER TABLE IF EXISTS "company_roles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "company_roles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_roles_authenticated_all" ON "company_roles";
CREATE POLICY "company_roles_tenant_scoped" ON "company_roles"
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

-- company_team: tenant-scoped policy replaces "company_team_authenticated_all"
ALTER TABLE IF EXISTS "company_team" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "company_team" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_team_authenticated_all" ON "company_team";
CREATE POLICY "company_team_tenant_scoped" ON "company_team"
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

-- company_terms: tenant-scoped policy replaces "company_terms_authenticated_all"
ALTER TABLE IF EXISTS "company_terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "company_terms" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_terms_authenticated_all" ON "company_terms";
CREATE POLICY "company_terms_tenant_scoped" ON "company_terms"
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

-- credit_notes: tenant-scoped policy replaces "credit_notes_authenticated_all"
ALTER TABLE IF EXISTS "credit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "credit_notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_notes_authenticated_all" ON "credit_notes";
CREATE POLICY "credit_notes_tenant_scoped" ON "credit_notes"
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

-- crm_lead_categories: tenant-scoped policy replaces "crm_lead_categories_authenticated_all"
ALTER TABLE IF EXISTS "crm_lead_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "crm_lead_categories" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_lead_categories_authenticated_all" ON "crm_lead_categories";
CREATE POLICY "crm_lead_categories_tenant_scoped" ON "crm_lead_categories"
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

-- crm_lead_sources: tenant-scoped policy replaces "crm_lead_sources_authenticated_all"
ALTER TABLE IF EXISTS "crm_lead_sources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "crm_lead_sources" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_lead_sources_authenticated_all" ON "crm_lead_sources";
CREATE POLICY "crm_lead_sources_tenant_scoped" ON "crm_lead_sources"
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

-- crm_lead_statuses: tenant-scoped policy replaces "crm_lead_statuses_authenticated_all"
ALTER TABLE IF EXISTS "crm_lead_statuses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "crm_lead_statuses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_lead_statuses_authenticated_all" ON "crm_lead_statuses";
CREATE POLICY "crm_lead_statuses_tenant_scoped" ON "crm_lead_statuses"
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

-- crm_leads: tenant-scoped policy replaces "crm_leads_authenticated_all"
ALTER TABLE IF EXISTS "crm_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "crm_leads" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_leads_authenticated_all" ON "crm_leads";
CREATE POLICY "crm_leads_tenant_scoped" ON "crm_leads"
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

-- custom_field_values: tenant-scoped policy replaces "custom_field_values_authenticated_all"
ALTER TABLE IF EXISTS "custom_field_values" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "custom_field_values" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_field_values_authenticated_all" ON "custom_field_values";
CREATE POLICY "custom_field_values_tenant_scoped" ON "custom_field_values"
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

-- custom_fields: tenant-scoped policy replaces "custom_fields_authenticated_all"
ALTER TABLE IF EXISTS "custom_fields" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "custom_fields" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_fields_authenticated_all" ON "custom_fields";
CREATE POLICY "custom_fields_tenant_scoped" ON "custom_fields"
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

-- daily_progress_reports: tenant-scoped policy replaces "daily_progress_reports_authenticated_all"
ALTER TABLE IF EXISTS "daily_progress_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "daily_progress_reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_progress_reports_authenticated_all" ON "daily_progress_reports";
CREATE POLICY "daily_progress_reports_tenant_scoped" ON "daily_progress_reports"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- debit_notes: tenant-scoped policy replaces "debit_notes_authenticated_all"
ALTER TABLE IF EXISTS "debit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "debit_notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debit_notes_authenticated_all" ON "debit_notes";
CREATE POLICY "debit_notes_tenant_scoped" ON "debit_notes"
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

-- delete_logs: tenant-scoped policy replaces "delete_logs_authenticated_all"
ALTER TABLE IF EXISTS "delete_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "delete_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delete_logs_authenticated_all" ON "delete_logs";
CREATE POLICY "delete_logs_tenant_scoped" ON "delete_logs"
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

-- designations: tenant-scoped policy replaces "designations_authenticated_all"
ALTER TABLE IF EXISTS "designations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "designations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "designations_authenticated_all" ON "designations";
CREATE POLICY "designations_tenant_scoped" ON "designations"
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

-- drawings: tenant-scoped policy replaces "drawings_authenticated_all"
ALTER TABLE IF EXISTS "drawings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "drawings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drawings_authenticated_all" ON "drawings";
CREATE POLICY "drawings_tenant_scoped" ON "drawings"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- equipment: tenant-scoped policy replaces "equipment_authenticated_all"
ALTER TABLE IF EXISTS "equipment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "equipment" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_authenticated_all" ON "equipment";
CREATE POLICY "equipment_tenant_scoped" ON "equipment"
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

-- equipment_deployments: tenant-scoped policy replaces "equipment_deployments_authenticated_all"
ALTER TABLE IF EXISTS "equipment_deployments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "equipment_deployments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_deployments_authenticated_all" ON "equipment_deployments";
CREATE POLICY "equipment_deployments_tenant_scoped" ON "equipment_deployments"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- equipment_fuel_logs: tenant-scoped policy replaces "equipment_fuel_logs_authenticated_all"
ALTER TABLE IF EXISTS "equipment_fuel_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "equipment_fuel_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_fuel_logs_authenticated_all" ON "equipment_fuel_logs";
CREATE POLICY "equipment_fuel_logs_tenant_scoped" ON "equipment_fuel_logs"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- face_recognition_logs: tenant-scoped policy replaces "face_recognition_logs_authenticated_all"
ALTER TABLE IF EXISTS "face_recognition_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "face_recognition_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "face_recognition_logs_authenticated_all" ON "face_recognition_logs";
CREATE POLICY "face_recognition_logs_tenant_scoped" ON "face_recognition_logs"
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

-- file_folders: tenant-scoped policy replaces "file_folders_authenticated_all"
ALTER TABLE IF EXISTS "file_folders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "file_folders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "file_folders_authenticated_all" ON "file_folders";
CREATE POLICY "file_folders_tenant_scoped" ON "file_folders"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- goods_receipt_notes: tenant-scoped policy replaces "goods_receipt_notes_authenticated_all"
ALTER TABLE IF EXISTS "goods_receipt_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "goods_receipt_notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goods_receipt_notes_authenticated_all" ON "goods_receipt_notes";
CREATE POLICY "goods_receipt_notes_tenant_scoped" ON "goods_receipt_notes"
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

-- google_drive_connections: tenant-scoped policy replaces "google_drive_connections_authenticated_all"
ALTER TABLE IF EXISTS "google_drive_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "google_drive_connections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "google_drive_connections_authenticated_all" ON "google_drive_connections";
CREATE POLICY "google_drive_connections_tenant_scoped" ON "google_drive_connections"
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

-- google_sheets_connections: tenant-scoped policy replaces "google_sheets_connections_authenticated_all"
ALTER TABLE IF EXISTS "google_sheets_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "google_sheets_connections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "google_sheets_connections_authenticated_all" ON "google_sheets_connections";
CREATE POLICY "google_sheets_connections_tenant_scoped" ON "google_sheets_connections"
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

-- holidays: tenant-scoped policy replaces "holidays_authenticated_all"
ALTER TABLE IF EXISTS "holidays" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "holidays" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "holidays_authenticated_all" ON "holidays";
CREATE POLICY "holidays_tenant_scoped" ON "holidays"
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

-- leave_requests: tenant-scoped policy replaces "leave_requests_authenticated_all"
ALTER TABLE IF EXISTS "leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "leave_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_requests_authenticated_all" ON "leave_requests";
CREATE POLICY "leave_requests_tenant_scoped" ON "leave_requests"
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

-- leave_templates: tenant-scoped policy replaces "leave_templates_authenticated_all"
ALTER TABLE IF EXISTS "leave_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "leave_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_templates_authenticated_all" ON "leave_templates";
CREATE POLICY "leave_templates_tenant_scoped" ON "leave_templates"
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

-- library_asset_types: tenant-scoped policy replaces "library_asset_types_authenticated_all"
ALTER TABLE IF EXISTS "library_asset_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_asset_types" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_asset_types_authenticated_all" ON "library_asset_types";
CREATE POLICY "library_asset_types_tenant_scoped" ON "library_asset_types"
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

-- library_cost_codes: tenant-scoped policy replaces "library_cost_codes_authenticated_all"
ALTER TABLE IF EXISTS "library_cost_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_cost_codes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_cost_codes_authenticated_all" ON "library_cost_codes";
CREATE POLICY "library_cost_codes_tenant_scoped" ON "library_cost_codes"
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

-- library_deductions: tenant-scoped policy replaces "library_deductions_authenticated_all"
ALTER TABLE IF EXISTS "library_deductions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_deductions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_deductions_authenticated_all" ON "library_deductions";
CREATE POLICY "library_deductions_tenant_scoped" ON "library_deductions"
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

-- library_materials: tenant-scoped policy replaces "library_materials_authenticated_all"
ALTER TABLE IF EXISTS "library_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_materials" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_materials_authenticated_all" ON "library_materials";
CREATE POLICY "library_materials_tenant_scoped" ON "library_materials"
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

-- library_parties: tenant-scoped policy replaces "library_parties_authenticated_all"
ALTER TABLE IF EXISTS "library_parties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_parties" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_parties_authenticated_all" ON "library_parties";
CREATE POLICY "library_parties_tenant_scoped" ON "library_parties"
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

-- library_progresses: tenant-scoped policy replaces "library_progresses_authenticated_all"
ALTER TABLE IF EXISTS "library_progresses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_progresses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_progresses_authenticated_all" ON "library_progresses";
CREATE POLICY "library_progresses_tenant_scoped" ON "library_progresses"
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

-- library_rates: tenant-scoped policy replaces "library_rates_authenticated_all"
ALTER TABLE IF EXISTS "library_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_rates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_rates_authenticated_all" ON "library_rates";
CREATE POLICY "library_rates_tenant_scoped" ON "library_rates"
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

-- library_retentions: tenant-scoped policy replaces "library_retentions_authenticated_all"
ALTER TABLE IF EXISTS "library_retentions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_retentions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_retentions_authenticated_all" ON "library_retentions";
CREATE POLICY "library_retentions_tenant_scoped" ON "library_retentions"
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

-- library_todos: tenant-scoped policy replaces "library_todos_authenticated_all"
ALTER TABLE IF EXISTS "library_todos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_todos" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_todos_authenticated_all" ON "library_todos";
CREATE POLICY "library_todos_tenant_scoped" ON "library_todos"
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

-- library_workforces: tenant-scoped policy replaces "library_workforces_authenticated_all"
ALTER TABLE IF EXISTS "library_workforces" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "library_workforces" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_workforces_authenticated_all" ON "library_workforces";
CREATE POLICY "library_workforces_tenant_scoped" ON "library_workforces"
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

-- material_categories: tenant-scoped policy replaces "material_categories_authenticated_all"
ALTER TABLE IF EXISTS "material_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "material_categories" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_categories_authenticated_all" ON "material_categories";
CREATE POLICY "material_categories_tenant_scoped" ON "material_categories"
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

-- material_indents: tenant-scoped policy replaces "material_indents_authenticated_all"
ALTER TABLE IF EXISTS "material_indents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "material_indents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_indents_authenticated_all" ON "material_indents";
CREATE POLICY "material_indents_tenant_scoped" ON "material_indents"
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

-- material_test_results: tenant-scoped policy replaces "material_test_results_authenticated_all"
ALTER TABLE IF EXISTS "material_test_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "material_test_results" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_test_results_authenticated_all" ON "material_test_results";
CREATE POLICY "material_test_results_tenant_scoped" ON "material_test_results"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- material_transactions: tenant-scoped policy replaces "material_transactions_authenticated_all"
ALTER TABLE IF EXISTS "material_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "material_transactions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_transactions_authenticated_all" ON "material_transactions";
CREATE POLICY "material_transactions_tenant_scoped" ON "material_transactions"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- material_wastage: tenant-scoped policy replaces "material_wastage_authenticated_all"
ALTER TABLE IF EXISTS "material_wastage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "material_wastage" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_wastage_authenticated_all" ON "material_wastage";
CREATE POLICY "material_wastage_tenant_scoped" ON "material_wastage"
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

-- moms: tenant-scoped policy replaces "moms_authenticated_all"
ALTER TABLE IF EXISTS "moms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "moms" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moms_authenticated_all" ON "moms";
CREATE POLICY "moms_tenant_scoped" ON "moms"
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

-- muster_rolls: tenant-scoped policy replaces "muster_rolls_authenticated_all"
ALTER TABLE IF EXISTS "muster_rolls" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "muster_rolls" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muster_rolls_authenticated_all" ON "muster_rolls";
CREATE POLICY "muster_rolls_tenant_scoped" ON "muster_rolls"
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

-- ncrs: tenant-scoped policy replaces "ncrs_authenticated_all"
ALTER TABLE IF EXISTS "ncrs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ncrs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ncrs_authenticated_all" ON "ncrs";
CREATE POLICY "ncrs_tenant_scoped" ON "ncrs"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- oauth_handoffs: tenant-scoped policy replaces "oauth_handoffs_authenticated_all"
ALTER TABLE IF EXISTS "oauth_handoffs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "oauth_handoffs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oauth_handoffs_authenticated_all" ON "oauth_handoffs";
CREATE POLICY "oauth_handoffs_tenant_scoped" ON "oauth_handoffs"
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

-- payment_request_payments: tenant-scoped policy replaces "payment_request_payments_authenticated_all"
ALTER TABLE IF EXISTS "payment_request_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payment_request_payments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_request_payments_authenticated_all" ON "payment_request_payments";
CREATE POLICY "payment_request_payments_tenant_scoped" ON "payment_request_payments"
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

-- payment_requests: tenant-scoped policy replaces "payment_requests_authenticated_all"
ALTER TABLE IF EXISTS "payment_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payment_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_requests_authenticated_all" ON "payment_requests";
CREATE POLICY "payment_requests_tenant_scoped" ON "payment_requests"
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

-- payments: tenant-scoped policy replaces "payments_authenticated_all"
ALTER TABLE IF EXISTS "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_authenticated_all" ON "payments";
CREATE POLICY "payments_tenant_scoped" ON "payments"
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

-- payroll_profiles: tenant-scoped policy replaces "payroll_profiles_authenticated_all"
ALTER TABLE IF EXISTS "payroll_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payroll_profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_profiles_authenticated_all" ON "payroll_profiles";
CREATE POLICY "payroll_profiles_tenant_scoped" ON "payroll_profiles"
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

-- payroll_runs: tenant-scoped policy replaces "payroll_runs_authenticated_all"
ALTER TABLE IF EXISTS "payroll_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payroll_runs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_runs_authenticated_all" ON "payroll_runs";
CREATE POLICY "payroll_runs_tenant_scoped" ON "payroll_runs"
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

-- pdf_templates: tenant-scoped policy replaces "pdf_templates_authenticated_all"
ALTER TABLE IF EXISTS "pdf_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "pdf_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pdf_templates_authenticated_all" ON "pdf_templates";
CREATE POLICY "pdf_templates_tenant_scoped" ON "pdf_templates"
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

-- ppe_checks: tenant-scoped policy replaces "ppe_checks_authenticated_all"
ALTER TABLE IF EXISTS "ppe_checks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "ppe_checks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppe_checks_authenticated_all" ON "ppe_checks";
CREATE POLICY "ppe_checks_tenant_scoped" ON "ppe_checks"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- production_batches: tenant-scoped policy replaces "production_batches_authenticated_all"
ALTER TABLE IF EXISTS "production_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "production_batches" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_batches_authenticated_all" ON "production_batches";
CREATE POLICY "production_batches_tenant_scoped" ON "production_batches"
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

-- production_recipes: tenant-scoped policy replaces "production_recipes_authenticated_all"
ALTER TABLE IF EXISTS "production_recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "production_recipes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_recipes_authenticated_all" ON "production_recipes";
CREATE POLICY "production_recipes_tenant_scoped" ON "production_recipes"
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

-- project_budgets: tenant-scoped policy replaces "project_budgets_authenticated_all"
ALTER TABLE IF EXISTS "project_budgets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "project_budgets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_budgets_authenticated_all" ON "project_budgets";
CREATE POLICY "project_budgets_tenant_scoped" ON "project_budgets"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- project_files: tenant-scoped policy replaces "project_files_authenticated_all"
ALTER TABLE IF EXISTS "project_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "project_files" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_files_authenticated_all" ON "project_files";
CREATE POLICY "project_files_tenant_scoped" ON "project_files"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- project_locations: tenant-scoped policy replaces "project_locations_authenticated_all"
ALTER TABLE IF EXISTS "project_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "project_locations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_locations_authenticated_all" ON "project_locations";
CREATE POLICY "project_locations_tenant_scoped" ON "project_locations"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- project_members: tenant-scoped policy replaces "project_members_authenticated_all"
ALTER TABLE IF EXISTS "project_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "project_members" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_members_authenticated_all" ON "project_members";
CREATE POLICY "project_members_tenant_scoped" ON "project_members"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- project_milestones: tenant-scoped policy replaces "project_milestones_authenticated_all"
ALTER TABLE IF EXISTS "project_milestones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "project_milestones" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_milestones_authenticated_all" ON "project_milestones";
CREATE POLICY "project_milestones_tenant_scoped" ON "project_milestones"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- project_parties: tenant-scoped policy replaces "project_parties_authenticated_all"
ALTER TABLE IF EXISTS "project_parties" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "project_parties" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_parties_authenticated_all" ON "project_parties";
CREATE POLICY "project_parties_tenant_scoped" ON "project_parties"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- project_towers: tenant-scoped policy replaces "project_towers_authenticated_all"
ALTER TABLE IF EXISTS "project_towers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "project_towers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_towers_authenticated_all" ON "project_towers";
CREATE POLICY "project_towers_tenant_scoped" ON "project_towers"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- projects: tenant-scoped policy replaces "projects_authenticated_all"
ALTER TABLE IF EXISTS "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "projects" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_authenticated_all" ON "projects";
CREATE POLICY "projects_tenant_scoped" ON "projects"
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

-- purchase_orders: tenant-scoped policy replaces "purchase_orders_authenticated_all"
ALTER TABLE IF EXISTS "purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "purchase_orders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_orders_authenticated_all" ON "purchase_orders";
CREATE POLICY "purchase_orders_tenant_scoped" ON "purchase_orders"
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

-- quality_checklists: tenant-scoped policy replaces "quality_checklists_authenticated_all"
ALTER TABLE IF EXISTS "quality_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "quality_checklists" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quality_checklists_authenticated_all" ON "quality_checklists";
CREATE POLICY "quality_checklists_tenant_scoped" ON "quality_checklists"
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

-- quotations: tenant-scoped policy replaces "quotations_authenticated_all"
ALTER TABLE IF EXISTS "quotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "quotations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotations_authenticated_all" ON "quotations";
CREATE POLICY "quotations_tenant_scoped" ON "quotations"
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

-- rfqs: tenant-scoped policy replaces "rfqs_authenticated_all"
ALTER TABLE IF EXISTS "rfqs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "rfqs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rfqs_authenticated_all" ON "rfqs";
CREATE POLICY "rfqs_tenant_scoped" ON "rfqs"
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

-- safety_incidents: tenant-scoped policy replaces "safety_incidents_authenticated_all"
ALTER TABLE IF EXISTS "safety_incidents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "safety_incidents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "safety_incidents_authenticated_all" ON "safety_incidents";
CREATE POLICY "safety_incidents_tenant_scoped" ON "safety_incidents"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- salary_templates: tenant-scoped policy replaces "salary_templates_authenticated_all"
ALTER TABLE IF EXISTS "salary_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "salary_templates" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_templates_authenticated_all" ON "salary_templates";
CREATE POLICY "salary_templates_tenant_scoped" ON "salary_templates"
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

-- site_inspections: tenant-scoped policy replaces "site_inspections_authenticated_all"
ALTER TABLE IF EXISTS "site_inspections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "site_inspections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_inspections_authenticated_all" ON "site_inspections";
CREATE POLICY "site_inspections_tenant_scoped" ON "site_inspections"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- staff_employees: tenant-scoped policy replaces "staff_employees_authenticated_all"
ALTER TABLE IF EXISTS "staff_employees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "staff_employees" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_employees_authenticated_all" ON "staff_employees";
CREATE POLICY "staff_employees_tenant_scoped" ON "staff_employees"
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

-- statutory_reports: tenant-scoped policy replaces "statutory_reports_authenticated_all"
ALTER TABLE IF EXISTS "statutory_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "statutory_reports" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "statutory_reports_authenticated_all" ON "statutory_reports";
CREATE POLICY "statutory_reports_tenant_scoped" ON "statutory_reports"
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

-- subcontractor_attendance_logs: tenant-scoped policy replaces "subcontractor_attendance_logs_authenticated_all"
ALTER TABLE IF EXISTS "subcontractor_attendance_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "subcontractor_attendance_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subcontractor_attendance_logs_authenticated_all" ON "subcontractor_attendance_logs";
CREATE POLICY "subcontractor_attendance_logs_tenant_scoped" ON "subcontractor_attendance_logs"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- subcontractor_performance: tenant-scoped policy replaces "subcontractor_performance_authenticated_all"
ALTER TABLE IF EXISTS "subcontractor_performance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "subcontractor_performance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subcontractor_performance_authenticated_all" ON "subcontractor_performance";
CREATE POLICY "subcontractor_performance_tenant_scoped" ON "subcontractor_performance"
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

-- tally_agents: tenant-scoped policy replaces "tally_agents_authenticated_all"
ALTER TABLE IF EXISTS "tally_agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tally_agents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_agents_authenticated_all" ON "tally_agents";
CREATE POLICY "tally_agents_tenant_scoped" ON "tally_agents"
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

-- tally_bank_mappings: tenant-scoped policy replaces "tally_bank_mappings_authenticated_all"
ALTER TABLE IF EXISTS "tally_bank_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tally_bank_mappings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_bank_mappings_authenticated_all" ON "tally_bank_mappings";
CREATE POLICY "tally_bank_mappings_tenant_scoped" ON "tally_bank_mappings"
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

-- tally_connections: tenant-scoped policy replaces "tally_connections_authenticated_all"
ALTER TABLE IF EXISTS "tally_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tally_connections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_connections_authenticated_all" ON "tally_connections";
CREATE POLICY "tally_connections_tenant_scoped" ON "tally_connections"
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

-- tally_cost_centre_mappings: tenant-scoped policy replaces "tally_cost_centre_mappings_authenticated_all"
ALTER TABLE IF EXISTS "tally_cost_centre_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tally_cost_centre_mappings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_cost_centre_mappings_authenticated_all" ON "tally_cost_centre_mappings";
CREATE POLICY "tally_cost_centre_mappings_tenant_scoped" ON "tally_cost_centre_mappings"
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

-- tally_ledger_mappings: tenant-scoped policy replaces "tally_ledger_mappings_authenticated_all"
ALTER TABLE IF EXISTS "tally_ledger_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tally_ledger_mappings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_ledger_mappings_authenticated_all" ON "tally_ledger_mappings";
CREATE POLICY "tally_ledger_mappings_tenant_scoped" ON "tally_ledger_mappings"
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

-- tally_party_mappings: tenant-scoped policy replaces "tally_party_mappings_authenticated_all"
ALTER TABLE IF EXISTS "tally_party_mappings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tally_party_mappings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_party_mappings_authenticated_all" ON "tally_party_mappings";
CREATE POLICY "tally_party_mappings_tenant_scoped" ON "tally_party_mappings"
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

-- tally_sync_logs: tenant-scoped policy replaces "tally_sync_logs_authenticated_all"
ALTER TABLE IF EXISTS "tally_sync_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tally_sync_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_sync_logs_authenticated_all" ON "tally_sync_logs";
CREATE POLICY "tally_sync_logs_tenant_scoped" ON "tally_sync_logs"
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

-- tasks: tenant-scoped policy replaces "tasks_authenticated_all"
ALTER TABLE IF EXISTS "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tasks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_authenticated_all" ON "tasks";
CREATE POLICY "tasks_tenant_scoped" ON "tasks"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- team_schedule_timesheets: tenant-scoped policy replaces "team_schedule_timesheets_authenticated_all"
ALTER TABLE IF EXISTS "team_schedule_timesheets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "team_schedule_timesheets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_schedule_timesheets_authenticated_all" ON "team_schedule_timesheets";
CREATE POLICY "team_schedule_timesheets_tenant_scoped" ON "team_schedule_timesheets"
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

-- three_way_matches: tenant-scoped policy replaces "three_way_matches_authenticated_all"
ALTER TABLE IF EXISTS "three_way_matches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "three_way_matches" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "three_way_matches_authenticated_all" ON "three_way_matches";
CREATE POLICY "three_way_matches_tenant_scoped" ON "three_way_matches"
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

-- timesheets: tenant-scoped policy replaces "timesheets_authenticated_all"
ALTER TABLE IF EXISTS "timesheets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "timesheets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timesheets_authenticated_all" ON "timesheets";
CREATE POLICY "timesheets_tenant_scoped" ON "timesheets"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- todos: tenant-scoped policy replaces "todos_authenticated_all"
ALTER TABLE IF EXISTS "todos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "todos" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "todos_authenticated_all" ON "todos";
CREATE POLICY "todos_tenant_scoped" ON "todos"
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

-- toolbox_talks: tenant-scoped policy replaces "toolbox_talks_authenticated_all"
ALTER TABLE IF EXISTS "toolbox_talks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "toolbox_talks" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "toolbox_talks_authenticated_all" ON "toolbox_talks";
CREATE POLICY "toolbox_talks_tenant_scoped" ON "toolbox_talks"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- vendor_performance: tenant-scoped policy replaces "vendor_performance_authenticated_all"
ALTER TABLE IF EXISTS "vendor_performance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "vendor_performance" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendor_performance_authenticated_all" ON "vendor_performance";
CREATE POLICY "vendor_performance_tenant_scoped" ON "vendor_performance"
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

-- warehouse_inventory: tenant-scoped policy replaces "warehouse_inventory_authenticated_all"
ALTER TABLE IF EXISTS "warehouse_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "warehouse_inventory" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warehouse_inventory_authenticated_all" ON "warehouse_inventory";
CREATE POLICY "warehouse_inventory_tenant_scoped" ON "warehouse_inventory"
  FOR ALL TO authenticated
  USING (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  )
  WITH CHECK (
      project_id IN (
        SELECT p.id FROM projects p
        WHERE p.company_id IN (
          SELECT ct.company_id FROM company_team ct
          WHERE ct.user_id = auth.uid()
        )
      )
  );

-- work_orders: tenant-scoped policy replaces "work_orders_authenticated_all"
ALTER TABLE IF EXISTS "work_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "work_orders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_orders_authenticated_all" ON "work_orders";
CREATE POLICY "work_orders_tenant_scoped" ON "work_orders"
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

-- zoho_books_connections: tenant-scoped policy replaces "zoho_books_connections_authenticated_all"
ALTER TABLE IF EXISTS "zoho_books_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "zoho_books_connections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "zoho_books_connections_authenticated_all" ON "zoho_books_connections";
CREATE POLICY "zoho_books_connections_tenant_scoped" ON "zoho_books_connections"
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

-- chat_group_members: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "chat_group_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "chat_group_members" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_group_members_authenticated_all" ON "chat_group_members";
CREATE POLICY "chat_group_members_authenticated_all" ON "chat_group_members"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- chat_messages: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "chat_messages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_authenticated_all" ON "chat_messages";
CREATE POLICY "chat_messages_authenticated_all" ON "chat_messages"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- checklist_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "checklist_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "checklist_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_items_authenticated_all" ON "checklist_items";
CREATE POLICY "checklist_items_authenticated_all" ON "checklist_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- companies: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "companies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_authenticated_all" ON "companies";
CREATE POLICY "companies_authenticated_all" ON "companies"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- crm_quotation_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "crm_quotation_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "crm_quotation_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_quotation_items_authenticated_all" ON "crm_quotation_items";
CREATE POLICY "crm_quotation_items_authenticated_all" ON "crm_quotation_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- crm_quotations: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "crm_quotations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "crm_quotations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_quotations_authenticated_all" ON "crm_quotations";
CREATE POLICY "crm_quotations_authenticated_all" ON "crm_quotations"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- drawing_pins: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "drawing_pins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "drawing_pins" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drawing_pins_authenticated_all" ON "drawing_pins";
CREATE POLICY "drawing_pins_authenticated_all" ON "drawing_pins"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- drawing_revisions: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "drawing_revisions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "drawing_revisions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drawing_revisions_authenticated_all" ON "drawing_revisions";
CREATE POLICY "drawing_revisions_authenticated_all" ON "drawing_revisions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- equipment_maintenance_schedules: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "equipment_maintenance_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "equipment_maintenance_schedules" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_maintenance_schedules_authenticated_all" ON "equipment_maintenance_schedules";
CREATE POLICY "equipment_maintenance_schedules_authenticated_all" ON "equipment_maintenance_schedules"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- grn_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "grn_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "grn_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grn_items_authenticated_all" ON "grn_items";
CREATE POLICY "grn_items_authenticated_all" ON "grn_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- inspection_responses: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "inspection_responses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "inspection_responses" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inspection_responses_authenticated_all" ON "inspection_responses";
CREATE POLICY "inspection_responses_authenticated_all" ON "inspection_responses"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- marketing_leads: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "marketing_leads" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "marketing_leads" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "marketing_leads_authenticated_all" ON "marketing_leads";
CREATE POLICY "marketing_leads_authenticated_all" ON "marketing_leads"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- material_indent_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "material_indent_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "material_indent_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_indent_items_authenticated_all" ON "material_indent_items";
CREATE POLICY "material_indent_items_authenticated_all" ON "material_indent_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- otp_codes: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "otp_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "otp_codes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "otp_codes_authenticated_all" ON "otp_codes";
CREATE POLICY "otp_codes_authenticated_all" ON "otp_codes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- payment_settlements: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "payment_settlements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payment_settlements" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_settlements_authenticated_all" ON "payment_settlements";
CREATE POLICY "payment_settlements_authenticated_all" ON "payment_settlements"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- payroll_line_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "payroll_line_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "payroll_line_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_line_items_authenticated_all" ON "payroll_line_items";
CREATE POLICY "payroll_line_items_authenticated_all" ON "payroll_line_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- production_batch_materials: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "production_batch_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "production_batch_materials" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_batch_materials_authenticated_all" ON "production_batch_materials";
CREATE POLICY "production_batch_materials_authenticated_all" ON "production_batch_materials"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- production_recipe_materials: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "production_recipe_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "production_recipe_materials" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_recipe_materials_authenticated_all" ON "production_recipe_materials";
CREATE POLICY "production_recipe_materials_authenticated_all" ON "production_recipe_materials"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- purchase_order_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "purchase_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "purchase_order_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_order_items_authenticated_all" ON "purchase_order_items";
CREATE POLICY "purchase_order_items_authenticated_all" ON "purchase_order_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- rfq_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "rfq_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "rfq_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rfq_items_authenticated_all" ON "rfq_items";
CREATE POLICY "rfq_items_authenticated_all" ON "rfq_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- rfq_quotes: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "rfq_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "rfq_quotes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rfq_quotes_authenticated_all" ON "rfq_quotes";
CREATE POLICY "rfq_quotes_authenticated_all" ON "rfq_quotes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- task_comments: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "task_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "task_comments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_comments_authenticated_all" ON "task_comments";
CREATE POLICY "task_comments_authenticated_all" ON "task_comments"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- task_predecessors: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "task_predecessors" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "task_predecessors" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_predecessors_authenticated_all" ON "task_predecessors";
CREATE POLICY "task_predecessors_authenticated_all" ON "task_predecessors"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- task_todos: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "task_todos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "task_todos" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_todos_authenticated_all" ON "task_todos";
CREATE POLICY "task_todos_authenticated_all" ON "task_todos"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- timesheet_entries: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "timesheet_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "timesheet_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timesheet_entries_authenticated_all" ON "timesheet_entries";
CREATE POLICY "timesheet_entries_authenticated_all" ON "timesheet_entries"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- todo_assignees: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "todo_assignees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "todo_assignees" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "todo_assignees_authenticated_all" ON "todo_assignees";
CREATE POLICY "todo_assignees_authenticated_all" ON "todo_assignees"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- transaction_deductions: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "transaction_deductions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "transaction_deductions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transaction_deductions_authenticated_all" ON "transaction_deductions";
CREATE POLICY "transaction_deductions_authenticated_all" ON "transaction_deductions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- transaction_retentions: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "transaction_retentions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "transaction_retentions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transaction_retentions_authenticated_all" ON "transaction_retentions";
CREATE POLICY "transaction_retentions_authenticated_all" ON "transaction_retentions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- users: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "users" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_authenticated_all" ON "users";
CREATE POLICY "users_authenticated_all" ON "users"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- work_order_amendments: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "work_order_amendments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "work_order_amendments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_amendments_authenticated_all" ON "work_order_amendments";
CREATE POLICY "work_order_amendments_authenticated_all" ON "work_order_amendments"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- work_order_items: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "work_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "work_order_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_items_authenticated_all" ON "work_order_items";
CREATE POLICY "work_order_items_authenticated_all" ON "work_order_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- revoked_tokens: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "revoked_tokens" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "revoked_tokens" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "revoked_tokens_authenticated_all" ON "revoked_tokens";
CREATE POLICY "revoked_tokens_authenticated_all" ON "revoked_tokens"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- drawing_revision_approvals: no direct tenancy column; documented allowlist (see header)
ALTER TABLE IF EXISTS "drawing_revision_approvals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "drawing_revision_approvals" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drawing_revision_approvals_authenticated_all" ON "drawing_revision_approvals";
CREATE POLICY "drawing_revision_approvals_authenticated_all" ON "drawing_revision_approvals"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

