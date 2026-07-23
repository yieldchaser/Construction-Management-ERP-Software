-- ==============================================================================
-- Supabase Row Level Security (RLS) & Table Hardening Migration
-- Enables RLS on all application tables and enforces authenticated-only policies.
-- Prevents unauthenticated public/anon key access to backend database tables.
-- ==============================================================================

-- Hardening table: approval_actions
ALTER TABLE IF EXISTS "approval_actions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approval_actions_authenticated_all" ON "approval_actions";
CREATE POLICY "approval_actions_authenticated_all" ON "approval_actions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: approval_rules
ALTER TABLE IF EXISTS "approval_rules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "approval_rules_authenticated_all" ON "approval_rules";
CREATE POLICY "approval_rules_authenticated_all" ON "approval_rules"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: asset_depreciation_entries
ALTER TABLE IF EXISTS "asset_depreciation_entries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asset_depreciation_entries_authenticated_all" ON "asset_depreciation_entries";
CREATE POLICY "asset_depreciation_entries_authenticated_all" ON "asset_depreciation_entries"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: asset_depreciation_schedules
ALTER TABLE IF EXISTS "asset_depreciation_schedules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "asset_depreciation_schedules_authenticated_all" ON "asset_depreciation_schedules";
CREATE POLICY "asset_depreciation_schedules_authenticated_all" ON "asset_depreciation_schedules"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: attendance_logs
ALTER TABLE IF EXISTS "attendance_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_logs_authenticated_all" ON "attendance_logs";
CREATE POLICY "attendance_logs_authenticated_all" ON "attendance_logs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: bank_accounts
ALTER TABLE IF EXISTS "bank_accounts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_accounts_authenticated_all" ON "bank_accounts";
CREATE POLICY "bank_accounts_authenticated_all" ON "bank_accounts"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: bi_api_keys
ALTER TABLE IF EXISTS "bi_api_keys" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bi_api_keys_authenticated_all" ON "bi_api_keys";
CREATE POLICY "bi_api_keys_authenticated_all" ON "bi_api_keys"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: bills
ALTER TABLE IF EXISTS "bills" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bills_authenticated_all" ON "bills";
CREATE POLICY "bills_authenticated_all" ON "bills"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: bocw_records
ALTER TABLE IF EXISTS "bocw_records" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bocw_records_authenticated_all" ON "bocw_records";
CREATE POLICY "bocw_records_authenticated_all" ON "bocw_records"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: boq_documents
ALTER TABLE IF EXISTS "boq_documents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boq_documents_authenticated_all" ON "boq_documents";
CREATE POLICY "boq_documents_authenticated_all" ON "boq_documents"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: boq_items
ALTER TABLE IF EXISTS "boq_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boq_items_authenticated_all" ON "boq_items";
CREATE POLICY "boq_items_authenticated_all" ON "boq_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: boq_revisions
ALTER TABLE IF EXISTS "boq_revisions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "boq_revisions_authenticated_all" ON "boq_revisions";
CREATE POLICY "boq_revisions_authenticated_all" ON "boq_revisions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: cash_accounts
ALTER TABLE IF EXISTS "cash_accounts" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cash_accounts_authenticated_all" ON "cash_accounts";
CREATE POLICY "cash_accounts_authenticated_all" ON "cash_accounts"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: chat_group_members
ALTER TABLE IF EXISTS "chat_group_members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_group_members_authenticated_all" ON "chat_group_members";
CREATE POLICY "chat_group_members_authenticated_all" ON "chat_group_members"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: chat_groups
ALTER TABLE IF EXISTS "chat_groups" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_groups_authenticated_all" ON "chat_groups";
CREATE POLICY "chat_groups_authenticated_all" ON "chat_groups"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: chat_messages
ALTER TABLE IF EXISTS "chat_messages" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "chat_messages_authenticated_all" ON "chat_messages";
CREATE POLICY "chat_messages_authenticated_all" ON "chat_messages"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: checklist_items
ALTER TABLE IF EXISTS "checklist_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "checklist_items_authenticated_all" ON "checklist_items";
CREATE POLICY "checklist_items_authenticated_all" ON "checklist_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: client_reports
ALTER TABLE IF EXISTS "client_reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "client_reports_authenticated_all" ON "client_reports";
CREATE POLICY "client_reports_authenticated_all" ON "client_reports"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: companies
ALTER TABLE IF EXISTS "companies" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "companies_authenticated_all" ON "companies";
CREATE POLICY "companies_authenticated_all" ON "companies"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: company_branches
ALTER TABLE IF EXISTS "company_branches" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_branches_authenticated_all" ON "company_branches";
CREATE POLICY "company_branches_authenticated_all" ON "company_branches"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: company_files
ALTER TABLE IF EXISTS "company_files" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_files_authenticated_all" ON "company_files";
CREATE POLICY "company_files_authenticated_all" ON "company_files"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: company_payroll_settings
ALTER TABLE IF EXISTS "company_payroll_settings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_payroll_settings_authenticated_all" ON "company_payroll_settings";
CREATE POLICY "company_payroll_settings_authenticated_all" ON "company_payroll_settings"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: company_roles
ALTER TABLE IF EXISTS "company_roles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_roles_authenticated_all" ON "company_roles";
CREATE POLICY "company_roles_authenticated_all" ON "company_roles"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: company_team
ALTER TABLE IF EXISTS "company_team" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_team_authenticated_all" ON "company_team";
CREATE POLICY "company_team_authenticated_all" ON "company_team"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: company_terms
ALTER TABLE IF EXISTS "company_terms" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "company_terms_authenticated_all" ON "company_terms";
CREATE POLICY "company_terms_authenticated_all" ON "company_terms"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: credit_notes
ALTER TABLE IF EXISTS "credit_notes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "credit_notes_authenticated_all" ON "credit_notes";
CREATE POLICY "credit_notes_authenticated_all" ON "credit_notes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: crm_lead_categories
ALTER TABLE IF EXISTS "crm_lead_categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_lead_categories_authenticated_all" ON "crm_lead_categories";
CREATE POLICY "crm_lead_categories_authenticated_all" ON "crm_lead_categories"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: crm_lead_sources
ALTER TABLE IF EXISTS "crm_lead_sources" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_lead_sources_authenticated_all" ON "crm_lead_sources";
CREATE POLICY "crm_lead_sources_authenticated_all" ON "crm_lead_sources"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: crm_lead_statuses
ALTER TABLE IF EXISTS "crm_lead_statuses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_lead_statuses_authenticated_all" ON "crm_lead_statuses";
CREATE POLICY "crm_lead_statuses_authenticated_all" ON "crm_lead_statuses"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: crm_leads
ALTER TABLE IF EXISTS "crm_leads" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_leads_authenticated_all" ON "crm_leads";
CREATE POLICY "crm_leads_authenticated_all" ON "crm_leads"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: crm_quotation_items
ALTER TABLE IF EXISTS "crm_quotation_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_quotation_items_authenticated_all" ON "crm_quotation_items";
CREATE POLICY "crm_quotation_items_authenticated_all" ON "crm_quotation_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: crm_quotations
ALTER TABLE IF EXISTS "crm_quotations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "crm_quotations_authenticated_all" ON "crm_quotations";
CREATE POLICY "crm_quotations_authenticated_all" ON "crm_quotations"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: custom_field_values
ALTER TABLE IF EXISTS "custom_field_values" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_field_values_authenticated_all" ON "custom_field_values";
CREATE POLICY "custom_field_values_authenticated_all" ON "custom_field_values"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: custom_fields
ALTER TABLE IF EXISTS "custom_fields" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "custom_fields_authenticated_all" ON "custom_fields";
CREATE POLICY "custom_fields_authenticated_all" ON "custom_fields"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: daily_progress_reports
ALTER TABLE IF EXISTS "daily_progress_reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "daily_progress_reports_authenticated_all" ON "daily_progress_reports";
CREATE POLICY "daily_progress_reports_authenticated_all" ON "daily_progress_reports"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: debit_notes
ALTER TABLE IF EXISTS "debit_notes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "debit_notes_authenticated_all" ON "debit_notes";
CREATE POLICY "debit_notes_authenticated_all" ON "debit_notes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: delete_logs
ALTER TABLE IF EXISTS "delete_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "delete_logs_authenticated_all" ON "delete_logs";
CREATE POLICY "delete_logs_authenticated_all" ON "delete_logs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: designations
ALTER TABLE IF EXISTS "designations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "designations_authenticated_all" ON "designations";
CREATE POLICY "designations_authenticated_all" ON "designations"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: drawing_pins
ALTER TABLE IF EXISTS "drawing_pins" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drawing_pins_authenticated_all" ON "drawing_pins";
CREATE POLICY "drawing_pins_authenticated_all" ON "drawing_pins"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: drawing_revisions
ALTER TABLE IF EXISTS "drawing_revisions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drawing_revisions_authenticated_all" ON "drawing_revisions";
CREATE POLICY "drawing_revisions_authenticated_all" ON "drawing_revisions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: drawings
ALTER TABLE IF EXISTS "drawings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "drawings_authenticated_all" ON "drawings";
CREATE POLICY "drawings_authenticated_all" ON "drawings"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: equipment
ALTER TABLE IF EXISTS "equipment" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_authenticated_all" ON "equipment";
CREATE POLICY "equipment_authenticated_all" ON "equipment"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: equipment_deployments
ALTER TABLE IF EXISTS "equipment_deployments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_deployments_authenticated_all" ON "equipment_deployments";
CREATE POLICY "equipment_deployments_authenticated_all" ON "equipment_deployments"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: equipment_fuel_logs
ALTER TABLE IF EXISTS "equipment_fuel_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_fuel_logs_authenticated_all" ON "equipment_fuel_logs";
CREATE POLICY "equipment_fuel_logs_authenticated_all" ON "equipment_fuel_logs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: equipment_maintenance_schedules
ALTER TABLE IF EXISTS "equipment_maintenance_schedules" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equipment_maintenance_schedules_authenticated_all" ON "equipment_maintenance_schedules";
CREATE POLICY "equipment_maintenance_schedules_authenticated_all" ON "equipment_maintenance_schedules"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: face_recognition_logs
ALTER TABLE IF EXISTS "face_recognition_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "face_recognition_logs_authenticated_all" ON "face_recognition_logs";
CREATE POLICY "face_recognition_logs_authenticated_all" ON "face_recognition_logs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: file_folders
ALTER TABLE IF EXISTS "file_folders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "file_folders_authenticated_all" ON "file_folders";
CREATE POLICY "file_folders_authenticated_all" ON "file_folders"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: goods_receipt_notes
ALTER TABLE IF EXISTS "goods_receipt_notes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goods_receipt_notes_authenticated_all" ON "goods_receipt_notes";
CREATE POLICY "goods_receipt_notes_authenticated_all" ON "goods_receipt_notes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: google_drive_connections
ALTER TABLE IF EXISTS "google_drive_connections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "google_drive_connections_authenticated_all" ON "google_drive_connections";
CREATE POLICY "google_drive_connections_authenticated_all" ON "google_drive_connections"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: google_sheets_connections
ALTER TABLE IF EXISTS "google_sheets_connections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "google_sheets_connections_authenticated_all" ON "google_sheets_connections";
CREATE POLICY "google_sheets_connections_authenticated_all" ON "google_sheets_connections"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: grn_items
ALTER TABLE IF EXISTS "grn_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "grn_items_authenticated_all" ON "grn_items";
CREATE POLICY "grn_items_authenticated_all" ON "grn_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: holidays
ALTER TABLE IF EXISTS "holidays" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "holidays_authenticated_all" ON "holidays";
CREATE POLICY "holidays_authenticated_all" ON "holidays"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: inspection_responses
ALTER TABLE IF EXISTS "inspection_responses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "inspection_responses_authenticated_all" ON "inspection_responses";
CREATE POLICY "inspection_responses_authenticated_all" ON "inspection_responses"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: leave_requests
ALTER TABLE IF EXISTS "leave_requests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_requests_authenticated_all" ON "leave_requests";
CREATE POLICY "leave_requests_authenticated_all" ON "leave_requests"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: leave_templates
ALTER TABLE IF EXISTS "leave_templates" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "leave_templates_authenticated_all" ON "leave_templates";
CREATE POLICY "leave_templates_authenticated_all" ON "leave_templates"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_asset_types
ALTER TABLE IF EXISTS "library_asset_types" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_asset_types_authenticated_all" ON "library_asset_types";
CREATE POLICY "library_asset_types_authenticated_all" ON "library_asset_types"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_cost_codes
ALTER TABLE IF EXISTS "library_cost_codes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_cost_codes_authenticated_all" ON "library_cost_codes";
CREATE POLICY "library_cost_codes_authenticated_all" ON "library_cost_codes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_deductions
ALTER TABLE IF EXISTS "library_deductions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_deductions_authenticated_all" ON "library_deductions";
CREATE POLICY "library_deductions_authenticated_all" ON "library_deductions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_materials
ALTER TABLE IF EXISTS "library_materials" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_materials_authenticated_all" ON "library_materials";
CREATE POLICY "library_materials_authenticated_all" ON "library_materials"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_parties
ALTER TABLE IF EXISTS "library_parties" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_parties_authenticated_all" ON "library_parties";
CREATE POLICY "library_parties_authenticated_all" ON "library_parties"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_progresses
ALTER TABLE IF EXISTS "library_progresses" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_progresses_authenticated_all" ON "library_progresses";
CREATE POLICY "library_progresses_authenticated_all" ON "library_progresses"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_rates
ALTER TABLE IF EXISTS "library_rates" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_rates_authenticated_all" ON "library_rates";
CREATE POLICY "library_rates_authenticated_all" ON "library_rates"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_retentions
ALTER TABLE IF EXISTS "library_retentions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_retentions_authenticated_all" ON "library_retentions";
CREATE POLICY "library_retentions_authenticated_all" ON "library_retentions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_todos
ALTER TABLE IF EXISTS "library_todos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_todos_authenticated_all" ON "library_todos";
CREATE POLICY "library_todos_authenticated_all" ON "library_todos"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: library_workforces
ALTER TABLE IF EXISTS "library_workforces" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "library_workforces_authenticated_all" ON "library_workforces";
CREATE POLICY "library_workforces_authenticated_all" ON "library_workforces"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: marketing_leads
ALTER TABLE IF EXISTS "marketing_leads" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "marketing_leads_authenticated_all" ON "marketing_leads";
CREATE POLICY "marketing_leads_authenticated_all" ON "marketing_leads"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: material_categories
ALTER TABLE IF EXISTS "material_categories" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_categories_authenticated_all" ON "material_categories";
CREATE POLICY "material_categories_authenticated_all" ON "material_categories"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: material_indent_items
ALTER TABLE IF EXISTS "material_indent_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_indent_items_authenticated_all" ON "material_indent_items";
CREATE POLICY "material_indent_items_authenticated_all" ON "material_indent_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: material_indents
ALTER TABLE IF EXISTS "material_indents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_indents_authenticated_all" ON "material_indents";
CREATE POLICY "material_indents_authenticated_all" ON "material_indents"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: material_test_results
ALTER TABLE IF EXISTS "material_test_results" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_test_results_authenticated_all" ON "material_test_results";
CREATE POLICY "material_test_results_authenticated_all" ON "material_test_results"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: material_transactions
ALTER TABLE IF EXISTS "material_transactions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_transactions_authenticated_all" ON "material_transactions";
CREATE POLICY "material_transactions_authenticated_all" ON "material_transactions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: material_wastage
ALTER TABLE IF EXISTS "material_wastage" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "material_wastage_authenticated_all" ON "material_wastage";
CREATE POLICY "material_wastage_authenticated_all" ON "material_wastage"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: moms
ALTER TABLE IF EXISTS "moms" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "moms_authenticated_all" ON "moms";
CREATE POLICY "moms_authenticated_all" ON "moms"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: muster_rolls
ALTER TABLE IF EXISTS "muster_rolls" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "muster_rolls_authenticated_all" ON "muster_rolls";
CREATE POLICY "muster_rolls_authenticated_all" ON "muster_rolls"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: ncrs
ALTER TABLE IF EXISTS "ncrs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ncrs_authenticated_all" ON "ncrs";
CREATE POLICY "ncrs_authenticated_all" ON "ncrs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: oauth_handoffs
ALTER TABLE IF EXISTS "oauth_handoffs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oauth_handoffs_authenticated_all" ON "oauth_handoffs";
CREATE POLICY "oauth_handoffs_authenticated_all" ON "oauth_handoffs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: otp_codes
ALTER TABLE IF EXISTS "otp_codes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "otp_codes_authenticated_all" ON "otp_codes";
CREATE POLICY "otp_codes_authenticated_all" ON "otp_codes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: payment_request_payments
ALTER TABLE IF EXISTS "payment_request_payments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_request_payments_authenticated_all" ON "payment_request_payments";
CREATE POLICY "payment_request_payments_authenticated_all" ON "payment_request_payments"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: payment_requests
ALTER TABLE IF EXISTS "payment_requests" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_requests_authenticated_all" ON "payment_requests";
CREATE POLICY "payment_requests_authenticated_all" ON "payment_requests"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: payment_settlements
ALTER TABLE IF EXISTS "payment_settlements" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payment_settlements_authenticated_all" ON "payment_settlements";
CREATE POLICY "payment_settlements_authenticated_all" ON "payment_settlements"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: payments
ALTER TABLE IF EXISTS "payments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payments_authenticated_all" ON "payments";
CREATE POLICY "payments_authenticated_all" ON "payments"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: payroll_line_items
ALTER TABLE IF EXISTS "payroll_line_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_line_items_authenticated_all" ON "payroll_line_items";
CREATE POLICY "payroll_line_items_authenticated_all" ON "payroll_line_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: payroll_profiles
ALTER TABLE IF EXISTS "payroll_profiles" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_profiles_authenticated_all" ON "payroll_profiles";
CREATE POLICY "payroll_profiles_authenticated_all" ON "payroll_profiles"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: payroll_runs
ALTER TABLE IF EXISTS "payroll_runs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_runs_authenticated_all" ON "payroll_runs";
CREATE POLICY "payroll_runs_authenticated_all" ON "payroll_runs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: pdf_templates
ALTER TABLE IF EXISTS "pdf_templates" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pdf_templates_authenticated_all" ON "pdf_templates";
CREATE POLICY "pdf_templates_authenticated_all" ON "pdf_templates"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: ppe_checks
ALTER TABLE IF EXISTS "ppe_checks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ppe_checks_authenticated_all" ON "ppe_checks";
CREATE POLICY "ppe_checks_authenticated_all" ON "ppe_checks"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: production_batch_materials
ALTER TABLE IF EXISTS "production_batch_materials" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_batch_materials_authenticated_all" ON "production_batch_materials";
CREATE POLICY "production_batch_materials_authenticated_all" ON "production_batch_materials"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: production_batches
ALTER TABLE IF EXISTS "production_batches" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_batches_authenticated_all" ON "production_batches";
CREATE POLICY "production_batches_authenticated_all" ON "production_batches"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: production_recipe_materials
ALTER TABLE IF EXISTS "production_recipe_materials" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_recipe_materials_authenticated_all" ON "production_recipe_materials";
CREATE POLICY "production_recipe_materials_authenticated_all" ON "production_recipe_materials"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: production_recipes
ALTER TABLE IF EXISTS "production_recipes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "production_recipes_authenticated_all" ON "production_recipes";
CREATE POLICY "production_recipes_authenticated_all" ON "production_recipes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: project_budgets
ALTER TABLE IF EXISTS "project_budgets" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_budgets_authenticated_all" ON "project_budgets";
CREATE POLICY "project_budgets_authenticated_all" ON "project_budgets"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: project_files
ALTER TABLE IF EXISTS "project_files" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_files_authenticated_all" ON "project_files";
CREATE POLICY "project_files_authenticated_all" ON "project_files"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: project_locations
ALTER TABLE IF EXISTS "project_locations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_locations_authenticated_all" ON "project_locations";
CREATE POLICY "project_locations_authenticated_all" ON "project_locations"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: project_members
ALTER TABLE IF EXISTS "project_members" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_members_authenticated_all" ON "project_members";
CREATE POLICY "project_members_authenticated_all" ON "project_members"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: project_milestones
ALTER TABLE IF EXISTS "project_milestones" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_milestones_authenticated_all" ON "project_milestones";
CREATE POLICY "project_milestones_authenticated_all" ON "project_milestones"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: project_parties
ALTER TABLE IF EXISTS "project_parties" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_parties_authenticated_all" ON "project_parties";
CREATE POLICY "project_parties_authenticated_all" ON "project_parties"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: project_towers
ALTER TABLE IF EXISTS "project_towers" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "project_towers_authenticated_all" ON "project_towers";
CREATE POLICY "project_towers_authenticated_all" ON "project_towers"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: projects
ALTER TABLE IF EXISTS "projects" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "projects_authenticated_all" ON "projects";
CREATE POLICY "projects_authenticated_all" ON "projects"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: purchase_order_items
ALTER TABLE IF EXISTS "purchase_order_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_order_items_authenticated_all" ON "purchase_order_items";
CREATE POLICY "purchase_order_items_authenticated_all" ON "purchase_order_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: purchase_orders
ALTER TABLE IF EXISTS "purchase_orders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "purchase_orders_authenticated_all" ON "purchase_orders";
CREATE POLICY "purchase_orders_authenticated_all" ON "purchase_orders"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: quality_checklists
ALTER TABLE IF EXISTS "quality_checklists" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quality_checklists_authenticated_all" ON "quality_checklists";
CREATE POLICY "quality_checklists_authenticated_all" ON "quality_checklists"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: quotations
ALTER TABLE IF EXISTS "quotations" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quotations_authenticated_all" ON "quotations";
CREATE POLICY "quotations_authenticated_all" ON "quotations"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: rfq_items
ALTER TABLE IF EXISTS "rfq_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rfq_items_authenticated_all" ON "rfq_items";
CREATE POLICY "rfq_items_authenticated_all" ON "rfq_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: rfq_quotes
ALTER TABLE IF EXISTS "rfq_quotes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rfq_quotes_authenticated_all" ON "rfq_quotes";
CREATE POLICY "rfq_quotes_authenticated_all" ON "rfq_quotes"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: rfqs
ALTER TABLE IF EXISTS "rfqs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rfqs_authenticated_all" ON "rfqs";
CREATE POLICY "rfqs_authenticated_all" ON "rfqs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: safety_incidents
ALTER TABLE IF EXISTS "safety_incidents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "safety_incidents_authenticated_all" ON "safety_incidents";
CREATE POLICY "safety_incidents_authenticated_all" ON "safety_incidents"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: salary_templates
ALTER TABLE IF EXISTS "salary_templates" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "salary_templates_authenticated_all" ON "salary_templates";
CREATE POLICY "salary_templates_authenticated_all" ON "salary_templates"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: site_inspections
ALTER TABLE IF EXISTS "site_inspections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "site_inspections_authenticated_all" ON "site_inspections";
CREATE POLICY "site_inspections_authenticated_all" ON "site_inspections"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: staff_employees
ALTER TABLE IF EXISTS "staff_employees" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_employees_authenticated_all" ON "staff_employees";
CREATE POLICY "staff_employees_authenticated_all" ON "staff_employees"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: statutory_reports
ALTER TABLE IF EXISTS "statutory_reports" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "statutory_reports_authenticated_all" ON "statutory_reports";
CREATE POLICY "statutory_reports_authenticated_all" ON "statutory_reports"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: subcontractor_attendance_logs
ALTER TABLE IF EXISTS "subcontractor_attendance_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subcontractor_attendance_logs_authenticated_all" ON "subcontractor_attendance_logs";
CREATE POLICY "subcontractor_attendance_logs_authenticated_all" ON "subcontractor_attendance_logs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: subcontractor_performance
ALTER TABLE IF EXISTS "subcontractor_performance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "subcontractor_performance_authenticated_all" ON "subcontractor_performance";
CREATE POLICY "subcontractor_performance_authenticated_all" ON "subcontractor_performance"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tally_agents
ALTER TABLE IF EXISTS "tally_agents" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_agents_authenticated_all" ON "tally_agents";
CREATE POLICY "tally_agents_authenticated_all" ON "tally_agents"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tally_bank_mappings
ALTER TABLE IF EXISTS "tally_bank_mappings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_bank_mappings_authenticated_all" ON "tally_bank_mappings";
CREATE POLICY "tally_bank_mappings_authenticated_all" ON "tally_bank_mappings"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tally_connections
ALTER TABLE IF EXISTS "tally_connections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_connections_authenticated_all" ON "tally_connections";
CREATE POLICY "tally_connections_authenticated_all" ON "tally_connections"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tally_cost_centre_mappings
ALTER TABLE IF EXISTS "tally_cost_centre_mappings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_cost_centre_mappings_authenticated_all" ON "tally_cost_centre_mappings";
CREATE POLICY "tally_cost_centre_mappings_authenticated_all" ON "tally_cost_centre_mappings"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tally_ledger_mappings
ALTER TABLE IF EXISTS "tally_ledger_mappings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_ledger_mappings_authenticated_all" ON "tally_ledger_mappings";
CREATE POLICY "tally_ledger_mappings_authenticated_all" ON "tally_ledger_mappings"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tally_party_mappings
ALTER TABLE IF EXISTS "tally_party_mappings" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_party_mappings_authenticated_all" ON "tally_party_mappings";
CREATE POLICY "tally_party_mappings_authenticated_all" ON "tally_party_mappings"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tally_sync_logs
ALTER TABLE IF EXISTS "tally_sync_logs" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tally_sync_logs_authenticated_all" ON "tally_sync_logs";
CREATE POLICY "tally_sync_logs_authenticated_all" ON "tally_sync_logs"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: task_comments
ALTER TABLE IF EXISTS "task_comments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_comments_authenticated_all" ON "task_comments";
CREATE POLICY "task_comments_authenticated_all" ON "task_comments"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: task_predecessors
ALTER TABLE IF EXISTS "task_predecessors" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_predecessors_authenticated_all" ON "task_predecessors";
CREATE POLICY "task_predecessors_authenticated_all" ON "task_predecessors"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: task_todos
ALTER TABLE IF EXISTS "task_todos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "task_todos_authenticated_all" ON "task_todos";
CREATE POLICY "task_todos_authenticated_all" ON "task_todos"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: tasks
ALTER TABLE IF EXISTS "tasks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tasks_authenticated_all" ON "tasks";
CREATE POLICY "tasks_authenticated_all" ON "tasks"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: team_schedule_timesheets
ALTER TABLE IF EXISTS "team_schedule_timesheets" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_schedule_timesheets_authenticated_all" ON "team_schedule_timesheets";
CREATE POLICY "team_schedule_timesheets_authenticated_all" ON "team_schedule_timesheets"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: three_way_matches
ALTER TABLE IF EXISTS "three_way_matches" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "three_way_matches_authenticated_all" ON "three_way_matches";
CREATE POLICY "three_way_matches_authenticated_all" ON "three_way_matches"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: timesheet_entries
ALTER TABLE IF EXISTS "timesheet_entries" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timesheet_entries_authenticated_all" ON "timesheet_entries";
CREATE POLICY "timesheet_entries_authenticated_all" ON "timesheet_entries"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: timesheets
ALTER TABLE IF EXISTS "timesheets" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "timesheets_authenticated_all" ON "timesheets";
CREATE POLICY "timesheets_authenticated_all" ON "timesheets"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: todo_assignees
ALTER TABLE IF EXISTS "todo_assignees" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "todo_assignees_authenticated_all" ON "todo_assignees";
CREATE POLICY "todo_assignees_authenticated_all" ON "todo_assignees"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: todos
ALTER TABLE IF EXISTS "todos" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "todos_authenticated_all" ON "todos";
CREATE POLICY "todos_authenticated_all" ON "todos"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: toolbox_talks
ALTER TABLE IF EXISTS "toolbox_talks" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "toolbox_talks_authenticated_all" ON "toolbox_talks";
CREATE POLICY "toolbox_talks_authenticated_all" ON "toolbox_talks"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: transaction_deductions
ALTER TABLE IF EXISTS "transaction_deductions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transaction_deductions_authenticated_all" ON "transaction_deductions";
CREATE POLICY "transaction_deductions_authenticated_all" ON "transaction_deductions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: transaction_retentions
ALTER TABLE IF EXISTS "transaction_retentions" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transaction_retentions_authenticated_all" ON "transaction_retentions";
CREATE POLICY "transaction_retentions_authenticated_all" ON "transaction_retentions"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: users
ALTER TABLE IF EXISTS "users" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_authenticated_all" ON "users";
CREATE POLICY "users_authenticated_all" ON "users"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: vendor_performance
ALTER TABLE IF EXISTS "vendor_performance" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vendor_performance_authenticated_all" ON "vendor_performance";
CREATE POLICY "vendor_performance_authenticated_all" ON "vendor_performance"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: warehouse_inventory
ALTER TABLE IF EXISTS "warehouse_inventory" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "warehouse_inventory_authenticated_all" ON "warehouse_inventory";
CREATE POLICY "warehouse_inventory_authenticated_all" ON "warehouse_inventory"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: work_order_amendments
ALTER TABLE IF EXISTS "work_order_amendments" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_amendments_authenticated_all" ON "work_order_amendments";
CREATE POLICY "work_order_amendments_authenticated_all" ON "work_order_amendments"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: work_order_items
ALTER TABLE IF EXISTS "work_order_items" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_order_items_authenticated_all" ON "work_order_items";
CREATE POLICY "work_order_items_authenticated_all" ON "work_order_items"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: work_orders
ALTER TABLE IF EXISTS "work_orders" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "work_orders_authenticated_all" ON "work_orders";
CREATE POLICY "work_orders_authenticated_all" ON "work_orders"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Hardening table: zoho_books_connections
ALTER TABLE IF EXISTS "zoho_books_connections" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "zoho_books_connections_authenticated_all" ON "zoho_books_connections";
CREATE POLICY "zoho_books_connections_authenticated_all" ON "zoho_books_connections"
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);
