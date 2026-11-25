ALTER TABLE "kit_items" ADD COLUMN IF NOT EXISTS "sku" TEXT;
UPDATE "kit_items"
SET "sku" = 'KIT-' || upper(substr(replace("id"::text, '-', ''), 1, 12))
WHERE "sku" IS NULL OR btrim("sku") = '';
ALTER TABLE "kit_items" ALTER COLUMN "sku" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "kit_items_sku_key" ON "kit_items"("sku");
