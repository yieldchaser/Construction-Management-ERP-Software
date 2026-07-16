-- PROMPT_12 / Theme B (soft flag): link a Bill to an approved ThreeWayMatch.
-- Nullable so existing bills keep working; no data backfill required.
ALTER TABLE bills ADD COLUMN IF NOT EXISTS match_id UUID REFERENCES three_way_matches(id) ON DELETE SET NULL;
