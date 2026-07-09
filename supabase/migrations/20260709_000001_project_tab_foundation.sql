-- Project Tab Parity — foundation schema (2026-07-09)
-- New tables + columns for Project List, Party, Cost Code, Materials, Todos.

ALTER TABLE IF EXISTS projects
  ADD COLUMN IF NOT EXISTS project_value numeric(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_start_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS planned_end_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS actual_start_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS actual_end_date timestamp with time zone,
  ADD COLUMN IF NOT EXISTS orientation varchar(255),
  ADD COLUMN IF NOT EXISTS dimension varchar(255),
  ADD COLUMN IF NOT EXISTS scope_of_work text,
  ADD COLUMN IF NOT EXISTS project_avatar text,
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

ALTER TABLE IF EXISTS library_cost_codes
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES library_cost_codes(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS library_materials
  ADD COLUMN IF NOT EXISTS alternate_unit varchar(50);

CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  company_team_id uuid NOT NULL REFERENCES company_team(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, company_team_id)
);

CREATE TABLE IF NOT EXISTS project_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES project_locations(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  party_id uuid NOT NULL REFERENCES library_parties(id) ON DELETE CASCADE,
  balance numeric(18,2) NOT NULL DEFAULT 0,
  advance_paid numeric(18,2) NOT NULL DEFAULT 0,
  to_pay numeric(18,2) NOT NULL DEFAULT 0,
  status varchar(50) NOT NULL DEFAULT 'Active',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS library_retentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transaction_retentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  retention_type varchar(100) NOT NULL,
  amount numeric(18,2) NOT NULL,
  percentage numeric(5,2),
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES material_categories(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  created_by uuid REFERENCES company_team(id) ON DELETE SET NULL,
  title varchar(500) NOT NULL,
  due_date timestamp with time zone,
  repeat_type varchar(50) NOT NULL DEFAULT 'none',
  type varchar(100),
  linked_task_id uuid REFERENCES tasks(id) ON DELETE SET NULL,
  url varchar(1024),
  status varchar(50) NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todo_assignees (
  todo_id uuid NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  assignee_id uuid NOT NULL REFERENCES company_team(id) ON DELETE CASCADE,
  PRIMARY KEY (todo_id, assignee_id)
);
