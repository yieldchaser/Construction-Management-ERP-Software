-- PROMPT_7 / D5: add cost_code to boq_items
-- Additive migration. Safe to re-run (IF NOT EXISTS guard).
-- NOTE: this migration is intentionally NOT applied to Supabase by the agent;
-- the founder must run it (or include it in the next deploy) so the new
-- boq_items.cost_code column exists in the live database.

ALTER TABLE boq_items ADD COLUMN IF NOT EXISTS cost_code VARCHAR(50);
