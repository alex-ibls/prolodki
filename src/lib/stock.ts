import { eq } from "drizzle-orm";
import { db, type Tx } from "@/db";
import {
  listings,
  nomenclature,
  nomenclatureAttributes,
  listingAttributes,
  stockMovements,
  organizations,
} from "@/db/schema";
import { slugify } from "@/lib/slug";
import { DomainError } from "@/lib/errors";

type Executor = Tx | typeof db;

export function availableOf(item: { quantityOnHand: number; quantityReserved: number }) {
  return item.quantityOnHand - item.quantityReserved;
}

export async function companyOrg(executor: Executor = db) {
  const org = await executor.query.organizations.findFirst({
    where: eq(organizations.kind, "company"),
  });
  if (!org) throw new DomainError("Организация компании не заведена");
  return org;
}

export async function syncPublishedListing(executor: Executor, nomenclatureId: string) {
  const item = await executor.query.nomenclature.findFirst({
    where: eq(nomenclature.id, nomenclatureId),
    with: { attributes: true },
  });
  if (!item) throw new DomainError("Позиция номенклатуры не найдена");
  const existing = await executor.query.listings.findFirst({
    where: eq(listings.nomenclatureId, item.id),
  });
  if (!item.isPublished) {
    if (existing && existing.status === "published") {
      await executor
        .update(listings)
        .set({ status: "archived", updatedAt: new Date() })
        .where(eq(listings.id, existing.id));
    }
    return existing?.id ?? null;
  }

  const org = await companyOrg(executor);
  const available = availableOf(item);
  const values = {
    source: "company" as const,
    organizationId: org.id,
    nomenclatureId: item.id,
    categoryId: item.categoryId,
    title: item.title,
    description: item.description,
    brandId: item.brandId,
    brand: item.brand,
    model: item.model,
    year: item.year,
    condition: "new" as const,
    priceKopeks: item.priceKopeks,
    compareAtKopeks: item.compareAtKopeks,
    city: "",
    registered: item.registered,
    onOrder: item.onOrder,
    quantity: available,
    status: "published" as const,
    rejectionReason: "",
    updatedAt: new Date(),
  };

  let listingId = existing?.id;
  if (!existing) {
    const [created] = await executor
      .insert(listings)
      .values({ ...values, slug: `${slugify(item.sku)}-${item.sku.toLowerCase()}` })
      .returning();
    listingId = created.id;
  } else {
    await executor.update(listings).set(values).where(eq(listings.id, existing.id));
  }

  await executor.delete(listingAttributes).where(eq(listingAttributes.listingId, listingId!));
  if (item.attributes.length > 0) {
    await executor.insert(listingAttributes).values(
      item.attributes
        .filter((attr) => attr.valueNumber !== null || Boolean(attr.valueText?.trim()))
        .map((attr) => ({
          listingId: listingId!,
          attributeDefId: attr.attributeDefId,
          valueNumber: attr.valueNumber,
          valueText: attr.valueText,
        })),
    );
  }
  return listingId!;
}

export async function writeStockMovement(
  executor: Executor,
  input: {
    nomenclatureId: string;
    delta: number;
    reason: "import" | "adjustment" | "order" | "cancel" | "complete" | "manual";
    note: string;
    userId: string;
  },
) {
  await executor.insert(stockMovements).values(input);
}

export async function replaceNomenclatureAttributes(
  executor: Executor,
  nomenclatureId: string,
  values: { attributeDefId: number; valueNumber: number | null; valueText?: string | null }[],
) {
  await executor
    .delete(nomenclatureAttributes)
    .where(eq(nomenclatureAttributes.nomenclatureId, nomenclatureId));
  if (values.length > 0) {
    await executor.insert(nomenclatureAttributes).values(
      values.map((value) => ({ nomenclatureId, ...value })),
    );
  }
}
