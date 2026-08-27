ALTER TABLE "purchase_orders"
    ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ;

ALTER TABLE "purchase_orders"
    ADD COLUMN IF NOT EXISTS "cancelled_by" UUID
    REFERENCES "users"("id") ON DELETE SET NULL;
