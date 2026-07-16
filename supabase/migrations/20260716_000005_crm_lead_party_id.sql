-- PROMPT_11 / F-ONLY-1: add optional party_id FK to crm_leads linking a won lead
-- to the canonical LibraryParty (vendor/client master). Nullable so existing
-- free-text leads keep working; no data backfill required.
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS party_id UUID REFERENCES library_parties(id) ON DELETE SET NULL;
