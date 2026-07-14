-- PROMPT_B2: BOQ revisions history
-- Additive migration. Safe to re-run (IF NOT EXISTS guards).

-- Ensure pgcrypto is available for gen_random_uuid() on older Postgres.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS boq_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boq_document_id UUID NOT NULL REFERENCES boq_documents (id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    revision_no INTEGER NOT NULL,
    revised_amount NUMERIC(18, 2) NOT NULL,
    previous_amount NUMERIC(18, 2),
    reason TEXT,
    revised_by_user_id UUID REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_boq_revisions_boq_document_id ON boq_revisions (boq_document_id);
CREATE INDEX IF NOT EXISTS ix_boq_revisions_project_id ON boq_revisions (project_id);
