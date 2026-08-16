ALTER TABLE "material_wastage"
    ALTER COLUMN "reported_by" TYPE UUID
    USING (CASE WHEN "reported_by" ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "reported_by"::uuid ELSE NULL END);

ALTER TABLE "material_wastage"
    ADD CONSTRAINT "material_wastage_reported_by_fkey" FOREIGN KEY ("reported_by")
    REFERENCES "company_team"("id") ON DELETE SET NULL;
