-- R2-377: retention withheld from subcontractor bills must be enumerable as a
-- liability with a release path. Additive lifecycle columns on the deduction
-- rows themselves (the dead transaction_retentions table stays deleted).
ALTER TABLE "transaction_deductions"
    ADD COLUMN IF NOT EXISTS "release_due_date" TIMESTAMPTZ;

ALTER TABLE "transaction_deductions"
    ADD COLUMN IF NOT EXISTS "released_at" TIMESTAMPTZ;

ALTER TABLE "transaction_deductions"
    ADD COLUMN IF NOT EXISTS "released_amount" NUMERIC(18, 2);
