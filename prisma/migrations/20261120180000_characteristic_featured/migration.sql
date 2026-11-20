ALTER TABLE "attribute_defs" ADD COLUMN IF NOT EXISTS "featured" BOOLEAN NOT NULL DEFAULT false;

UPDATE "attribute_defs"
SET "featured" = true
WHERE "code" IN ('length_m', 'width_m', 'seats', 'max_hp', 'passengers');
