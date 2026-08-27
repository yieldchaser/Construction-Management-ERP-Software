DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'material_wastage'
      AND column_name = 'reported_by'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE "material_wastage"
        ALTER COLUMN "reported_by" TYPE UUID
        USING (CASE WHEN "reported_by"::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN "reported_by"::text::uuid ELSE NULL END);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'material_wastage_reported_by_fkey') THEN
    ALTER TABLE "material_wastage"
        ADD CONSTRAINT "material_wastage_reported_by_fkey" FOREIGN KEY ("reported_by")
        REFERENCES "company_team"("id") ON DELETE SET NULL;
  END IF;
END $$;
