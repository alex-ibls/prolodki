ALTER TABLE "attribute_defs" ADD COLUMN "data_type" text DEFAULT 'number' NOT NULL;--> statement-breakpoint
UPDATE "attribute_defs" SET "data_type" = 'text' WHERE "code" IN ('material', 'bottom_material');--> statement-breakpoint
CREATE TABLE "kit_attribute_defs" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "code" text NOT NULL,
  "name" text NOT NULL,
  "unit" text DEFAULT '' NOT NULL,
  "data_type" text DEFAULT 'text' NOT NULL,
  "sort" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "kit_attribute_defs_code_unique" UNIQUE("code")
);--> statement-breakpoint
CREATE TABLE "kit_item_attributes" (
  "item_id" uuid NOT NULL,
  "attribute_def_id" integer NOT NULL,
  "value_number" double precision,
  "value_text" text,
  CONSTRAINT "kit_item_attributes_item_id_attribute_def_id_pk" PRIMARY KEY("item_id","attribute_def_id")
);--> statement-breakpoint
ALTER TABLE "kit_item_attributes" ADD CONSTRAINT "kit_item_attributes_item_id_kit_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."kit_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kit_item_attributes" ADD CONSTRAINT "kit_item_attributes_attribute_def_id_kit_attribute_defs_id_fk" FOREIGN KEY ("attribute_def_id") REFERENCES "public"."kit_attribute_defs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "categories" ("slug", "name", "sort", "parent_id")
SELECT v.slug, v.name, v.sort, NULL
FROM (
  VALUES
    ('motors'::text, 'Лодочные моторы'::text, 3),
    ('trailers'::text, 'Прицепы'::text, 4),
    ('accessories'::text, 'Аксессуары'::text, 5),
    ('equipment'::text, 'Доп. оборудование'::text, 6)
) AS v(slug, name, sort)
WHERE NOT EXISTS (SELECT 1 FROM "categories" c WHERE c.slug = v.slug);
