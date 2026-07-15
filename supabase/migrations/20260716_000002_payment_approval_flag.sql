-- Theme C (PROMPT_8) / C5: persist real payment approval state.
-- Mirrors Bill.approval_flag so approve_transaction's payment branch is no
-- longer a no-op. Additive only; safe to re-run.
-- NOTE: This migration is intentionally NOT applied to Supabase by the agent.
-- Apply it via the Supabase CLI / migration runner before deploying the backend
-- change that writes Payment.approval_flag.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS approval_flag VARCHAR(50) NOT NULL DEFAULT 'pending';
