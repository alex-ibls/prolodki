ALTER TABLE "listings" ADD COLUMN "logistics_kopeks" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "lead_time" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "nomenclature" ADD COLUMN "logistics_kopeks" integer;--> statement-breakpoint
ALTER TABLE "nomenclature" ADD COLUMN "lead_time" text DEFAULT '' NOT NULL;