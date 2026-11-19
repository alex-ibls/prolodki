-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "customer_source" AS ENUM ('registration', 'order', 'manual');

-- CreateEnum
CREATE TYPE "deal_status" AS ENUM ('new', 'in_progress', 'invoiced', 'won', 'lost');

-- CreateEnum
CREATE TYPE "fulfillment" AS ENUM ('pickup', 'delivery_agreed');

-- CreateEnum
CREATE TYPE "item_condition" AS ENUM ('new', 'used');

-- CreateEnum
CREATE TYPE "line_status" AS ENUM ('placed', 'confirmed', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "listing_event_kind" AS ENUM ('view', 'favorite_add', 'favorite_remove', 'cart_add', 'phone_reveal');

-- CreateEnum
CREATE TYPE "listing_source" AS ENUM ('company', 'individual');

-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('draft', 'pending_review', 'published', 'rejected', 'reserved', 'archived');

-- CreateEnum
CREATE TYPE "org_kind" AS ENUM ('company');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('invoice', 'cash', 'agreement');

-- CreateEnum
CREATE TYPE "seller_type" AS ENUM ('individual');

-- CreateEnum
CREATE TYPE "staff_role" AS ENUM ('moderator', 'manager');

-- CreateEnum
CREATE TYPE "stock_reason" AS ENUM ('import', 'adjustment', 'order', 'cancel', 'complete', 'manual');

-- CreateTable
CREATE TABLE "attribute_defs" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "filterable" BOOLEAN NOT NULL DEFAULT true,
    "card_order" INTEGER NOT NULL DEFAULT 0,
    "data_type" TEXT NOT NULL DEFAULT 'number',

    CONSTRAINT "attribute_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brands" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "cart_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "qty" INTEGER NOT NULL,
    "options" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "cart_items_cart_id_listing_id_pk" PRIMARY KEY ("cart_id","listing_id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "guest_token" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "source" "customer_source" NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_notes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "deal_id" UUID NOT NULL,
    "author_id" UUID,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deal_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "order_id" UUID,
    "assignee_id" UUID,
    "title" TEXT NOT NULL,
    "amount_kopeks" INTEGER NOT NULL DEFAULT 0,
    "status" "deal_status" NOT NULL DEFAULT 'new',
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "deals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_token" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_attribute_defs" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "data_type" TEXT NOT NULL DEFAULT 'text',
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "kit_attribute_defs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kit_item_attributes" (
    "item_id" UUID NOT NULL,
    "attribute_def_id" INTEGER NOT NULL,
    "value_number" DOUBLE PRECISION,
    "value_text" TEXT,

    CONSTRAINT "kit_item_attributes_item_id_attribute_def_id_pk" PRIMARY KEY ("item_id","attribute_def_id")
);

-- CreateTable
CREATE TABLE "kit_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_kopeks" INTEGER NOT NULL,
    "image_path" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kit_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_attributes" (
    "listing_id" UUID NOT NULL,
    "attribute_def_id" INTEGER NOT NULL,
    "value_number" DOUBLE PRECISION,
    "value_text" TEXT,

    CONSTRAINT "listing_attributes_listing_id_attribute_def_id_pk" PRIMARY KEY ("listing_id","attribute_def_id")
);

-- CreateTable
CREATE TABLE "listing_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "kind" "listing_event_kind" NOT NULL,
    "user_id" UUID,
    "guest_token" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listing_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "listing_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" "listing_source" NOT NULL,
    "seller_user_id" UUID,
    "organization_id" UUID,
    "nomenclature_id" UUID,
    "category_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "brand" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "condition" "item_condition" NOT NULL,
    "price_kopeks" INTEGER NOT NULL,
    "compare_at_kopeks" INTEGER,
    "city" TEXT NOT NULL DEFAULT '',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "listing_status" NOT NULL DEFAULT 'draft',
    "rejection_reason" TEXT NOT NULL DEFAULT '',
    "search_vector" tsvector,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brand_id" INTEGER,
    "registered" BOOLEAN,
    "on_order" BOOLEAN NOT NULL DEFAULT false,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "logistics_kopeks" INTEGER,
    "lead_time" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomenclature" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sku" TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT NOT NULL DEFAULT '',
    "model" TEXT NOT NULL DEFAULT '',
    "year" INTEGER,
    "description" TEXT NOT NULL DEFAULT '',
    "price_kopeks" INTEGER NOT NULL,
    "compare_at_kopeks" INTEGER,
    "quantity_on_hand" INTEGER NOT NULL DEFAULT 0,
    "quantity_reserved" INTEGER NOT NULL DEFAULT 0,
    "city" TEXT NOT NULL DEFAULT '',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "brand_id" INTEGER,
    "registered" BOOLEAN,
    "on_order" BOOLEAN NOT NULL DEFAULT false,
    "logistics_kopeks" INTEGER,
    "lead_time" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "nomenclature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomenclature_attributes" (
    "nomenclature_id" UUID NOT NULL,
    "attribute_def_id" INTEGER NOT NULL,
    "value_number" DOUBLE PRECISION,
    "value_text" TEXT,

    CONSTRAINT "nomenclature_attributes_nomenclature_id_attribute_def_id_pk" PRIMARY KEY ("nomenclature_id","attribute_def_id")
);

-- CreateTable
CREATE TABLE "nomenclature_images" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nomenclature_id" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nomenclature_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomenclature_kit_groups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nomenclature_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nomenclature_kit_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nomenclature_kit_links" (
    "group_id" UUID NOT NULL,
    "item_id" UUID NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "nomenclature_kit_links_group_id_item_id_pk" PRIMARY KEY ("group_id","item_id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "listing_id" UUID,
    "nomenclature_id" UUID,
    "seller_user_id" UUID,
    "organization_id" UUID,
    "title" TEXT NOT NULL,
    "price_kopeks" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "line_status" "line_status" NOT NULL DEFAULT 'placed',
    "options" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_no" SERIAL NOT NULL,
    "buyer_id" UUID,
    "payment_method" "payment_method" NOT NULL,
    "fulfillment" "fulfillment" NOT NULL,
    "contact_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "comment" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "guest_token" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "org_kind" NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbound_emails" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "to_address" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body_text" TEXT NOT NULL,
    "body_html" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "send_error" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "outbound_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_profiles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" "seller_type" NOT NULL,
    "organization_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nomenclature_id" UUID NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" "stock_reason" NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "staff_role" "staff_role",
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email_verified_at" TIMESTAMPTZ(6),
    "email_verify_token" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "view_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "listing_id" UUID NOT NULL,
    "user_id" UUID,
    "guest_token" TEXT,
    "viewed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "view_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "brands_slug_unique" ON "brands"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "brands_name_unique" ON "brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "carts_user_id_unique" ON "carts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "carts_guest_token_unique" ON "carts"("guest_token");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_unique" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_unique" ON "customers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "deals_order_id_unique" ON "deals"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_guest_listing" ON "favorites"("listing_id", "guest_token");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_listing" ON "favorites"("listing_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "kit_attribute_defs_code_unique" ON "kit_attribute_defs"("code");

-- CreateIndex
CREATE INDEX "listing_events_listing_kind_idx" ON "listing_events"("listing_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "listings_nomenclature_id_unique" ON "listings"("nomenclature_id");

-- CreateIndex
CREATE UNIQUE INDEX "listings_slug_unique" ON "listings"("slug");

-- CreateIndex
CREATE INDEX "listings_search_idx" ON "listings" USING GIN ("search_vector");

-- CreateIndex
CREATE UNIQUE INDEX "nomenclature_sku_unique" ON "nomenclature"("sku");

-- CreateIndex
CREATE INDEX "nomenclature_images_nomenclature_id_idx" ON "nomenclature_images"("nomenclature_id");

-- CreateIndex
CREATE INDEX "orders_guest_token_idx" ON "orders"("guest_token");

-- CreateIndex
CREATE UNIQUE INDEX "seller_profiles_user_id_unique" ON "seller_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_unique" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_verify_token_unique" ON "users"("email_verify_token");

-- CreateIndex
CREATE UNIQUE INDEX "view_history_guest_listing" ON "view_history"("listing_id", "guest_token");

-- CreateIndex
CREATE UNIQUE INDEX "view_history_user_listing" ON "view_history"("listing_id", "user_id");

-- AddForeignKey
ALTER TABLE "attribute_defs" ADD CONSTRAINT "attribute_defs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deal_notes" ADD CONSTRAINT "deal_notes_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "deals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "deals" ADD CONSTRAINT "deals_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kit_item_attributes" ADD CONSTRAINT "kit_item_attributes_attribute_def_id_kit_attribute_defs_id_fk" FOREIGN KEY ("attribute_def_id") REFERENCES "kit_attribute_defs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kit_item_attributes" ADD CONSTRAINT "kit_item_attributes_item_id_kit_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "kit_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_attributes" ADD CONSTRAINT "listing_attributes_attribute_def_id_attribute_defs_id_fk" FOREIGN KEY ("attribute_def_id") REFERENCES "attribute_defs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_attributes" ADD CONSTRAINT "listing_attributes_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_events" ADD CONSTRAINT "listing_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_nomenclature_id_nomenclature_id_fk" FOREIGN KEY ("nomenclature_id") REFERENCES "nomenclature"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature" ADD CONSTRAINT "nomenclature_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature" ADD CONSTRAINT "nomenclature_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature_attributes" ADD CONSTRAINT "nomenclature_attributes_attribute_def_id_attribute_defs_id_fk" FOREIGN KEY ("attribute_def_id") REFERENCES "attribute_defs"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature_attributes" ADD CONSTRAINT "nomenclature_attributes_nomenclature_id_nomenclature_id_fk" FOREIGN KEY ("nomenclature_id") REFERENCES "nomenclature"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature_images" ADD CONSTRAINT "nomenclature_images_nomenclature_id_nomenclature_id_fk" FOREIGN KEY ("nomenclature_id") REFERENCES "nomenclature"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature_kit_groups" ADD CONSTRAINT "nomenclature_kit_groups_nomenclature_id_nomenclature_id_fk" FOREIGN KEY ("nomenclature_id") REFERENCES "nomenclature"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature_kit_links" ADD CONSTRAINT "nomenclature_kit_links_group_id_nomenclature_kit_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "nomenclature_kit_groups"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "nomenclature_kit_links" ADD CONSTRAINT "nomenclature_kit_links_item_id_kit_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "kit_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_nomenclature_id_nomenclature_id_fk" FOREIGN KEY ("nomenclature_id") REFERENCES "nomenclature"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_seller_user_id_users_id_fk" FOREIGN KEY ("seller_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "outbound_emails" ADD CONSTRAINT "outbound_emails_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "seller_profiles" ADD CONSTRAINT "seller_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_nomenclature_id_nomenclature_id_fk" FOREIGN KEY ("nomenclature_id") REFERENCES "nomenclature"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "view_history" ADD CONSTRAINT "view_history_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "view_history" ADD CONSTRAINT "view_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
