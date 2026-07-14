-- Planning backend: project milestones (real feature) + task baseline columns.
-- Additive: creates a new table and adds two nullable columns to `tasks`.
-- Apply in Supabase (Postgres). Local SQLite is handled by Base.metadata.create_all
-- plus ensure_sqlite_task_columns() on boot.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS project_milestones (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    name          VARCHAR(255) NOT NULL,
    milestone_date TIMESTAMP WITH TIME ZONE NOT NULL,
    type          VARCHAR(50) NOT NULL DEFAULT 'start',   -- start | inspection | critical | payment | handover
    status        VARCHAR(50) NOT NULL DEFAULT 'upcoming', -- upcoming | achieved
    description   TEXT,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON project_milestones(project_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_date ON project_milestones(milestone_date);

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS baseline_end   TIMESTAMP WITH TIME ZONE;
