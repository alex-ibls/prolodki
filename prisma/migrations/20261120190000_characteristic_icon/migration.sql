ALTER TABLE "attribute_defs" ADD COLUMN IF NOT EXISTS "icon" TEXT NOT NULL DEFAULT '';

UPDATE "attribute_defs" SET "icon" = CASE "code"
  WHEN 'length_m' THEN 'length'
  WHEN 'width_m' THEN 'width'
  WHEN 'seats' THEN 'people'
  WHEN 'passengers' THEN 'people'
  WHEN 'max_hp' THEN 'power'
  WHEN 'weight_kg' THEN 'weight'
  WHEN 'capacity_kg' THEN 'cargo'
  WHEN 'side_height_mm' THEN 'height'
  WHEN 'transom_height_mm' THEN 'height'
  WHEN 'deadrise_mid' THEN 'angle'
  WHEN 'deadrise_transom' THEN 'angle'
  WHEN 'bottom_mm' THEN 'layers'
  WHEN 'side_thickness_mm' THEN 'layers'
  WHEN 'transom_thickness_mm' THEN 'layers'
  WHEN 'material' THEN 'layers'
  WHEN 'bottom_material' THEN 'layers'
  ELSE "icon"
END
WHERE "icon" = '';
