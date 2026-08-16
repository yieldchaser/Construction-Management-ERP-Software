ALTER TABLE "material_indents"
    ADD COLUMN IF NOT EXISTS "approved_by" UUID
    REFERENCES "company_team"("id");

ALTER TABLE "material_indents"
    ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
