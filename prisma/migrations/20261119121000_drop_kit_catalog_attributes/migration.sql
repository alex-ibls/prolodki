-- DropForeignKey
ALTER TABLE "kit_item_attributes" DROP CONSTRAINT "kit_item_attributes_attribute_def_id_kit_attribute_defs_id_fk";

-- DropForeignKey
ALTER TABLE "kit_item_attributes" DROP CONSTRAINT "kit_item_attributes_item_id_kit_items_id_fk";

-- DropTable
DROP TABLE "kit_attribute_defs";

-- DropTable
DROP TABLE "kit_item_attributes";
