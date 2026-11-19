CREATE TABLE "kit_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL,
  "name" text NOT NULL,
  "price_kopeks" integer NOT NULL,
  "image_path" text DEFAULT '' NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "nomenclature_kit_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "nomenclature_id" uuid NOT NULL,
  "kind" text NOT NULL,
  "name" text NOT NULL,
  "sort" integer DEFAULT 0 NOT NULL
);--> statement-breakpoint
CREATE TABLE "nomenclature_kit_links" (
  "group_id" uuid NOT NULL,
  "item_id" uuid NOT NULL,
  "sort" integer DEFAULT 0 NOT NULL,
  CONSTRAINT "nomenclature_kit_links_group_id_item_id_pk" PRIMARY KEY("group_id","item_id")
);--> statement-breakpoint
ALTER TABLE "nomenclature_kit_groups" ADD CONSTRAINT "nomenclature_kit_groups_nomenclature_id_nomenclature_id_fk" FOREIGN KEY ("nomenclature_id") REFERENCES "public"."nomenclature"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomenclature_kit_links" ADD CONSTRAINT "nomenclature_kit_links_group_id_nomenclature_kit_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."nomenclature_kit_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "nomenclature_kit_links" ADD CONSTRAINT "nomenclature_kit_links_item_id_kit_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."kit_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "options" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "options" text DEFAULT '' NOT NULL;
