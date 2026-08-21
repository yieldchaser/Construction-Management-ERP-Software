-- R2-334: align boq_items.cost_code with library_cost_codes.code.
-- The two halves of one concept were declared at two widths (50 vs 100),
-- so a code the library accepts could not be stored on a BOQ item and the
-- import died with StringDataRightTruncation (bare 500).
-- Widening only, additive-safe, no data loss.
ALTER TABLE "boq_items" ALTER COLUMN "cost_code" TYPE VARCHAR(100);
