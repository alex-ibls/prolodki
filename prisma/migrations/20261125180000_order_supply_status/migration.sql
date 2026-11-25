ALTER TYPE "line_status" ADD VALUE IF NOT EXISTS 'awaiting_manufacturer';
ALTER TYPE "line_status" ADD VALUE IF NOT EXISTS 'sent_to_manufacturer';
ALTER TYPE "line_status" ADD VALUE IF NOT EXISTS 'awaiting_supply';
ALTER TYPE "line_status" ADD VALUE IF NOT EXISTS 'at_warehouse';
ALTER TYPE "line_status" ADD VALUE IF NOT EXISTS 'shipped_to_buyer';
ALTER TYPE "line_status" ADD VALUE IF NOT EXISTS 'awaiting_buyer';
ALTER TYPE "line_status" ADD VALUE IF NOT EXISTS 'delivered';

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "supply" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "settled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "status_on" DATE;
