ALTER TABLE "safety_incidents"
    ADD COLUMN IF NOT EXISTS "closed_by" UUID
    REFERENCES "users"("id") ON DELETE SET NULL;
