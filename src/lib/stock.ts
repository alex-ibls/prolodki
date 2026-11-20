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

export function listingSlug(sku: string, nomenclatureId: string) {
  const base = slugify(sku).slice(0, 48).replace(/-+$/g, "") || "item";
  return `${base}-${nomenclatureId.replace(/-/g, "").slice(0, 8)}`;
}

export function listingSlugBroken(slug: string) {
  return !slug || slug.length > 120 || /[./\\?#%\s]/.test(slug);
}

type Executor = Tx | typeof db;

function isUniqueViolation(error: unknown) {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && (current as { code?: string }).code === "23505") return true;
    current = "cause" in current ? (current as { cause?: unknown }).cause : null;
  }
  return false;
}

async function freeListingSlug(executor: Executor, preferred: string, keepId?: string) {
  let slug = preferred;
  for (let n = 2; n < 30; n += 1) {
    const taken = await executor.query.listings.findFirst({ where: eq(listings.slug, slug) });
    if (!taken || taken.id === keepId) return slug;
    slug = `${preferred}-${n}`;
  }
  return `${preferred}-${crypto.randomUUID().slice(0, 8)}`;
}

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
    logisticsKopeks: item.logisticsKopeks,
    leadTime: item.leadTime,
    city: "",
    onOrder: item.onOrder,
    quantity: available,
    status: "published" as const,
    rejectionReason: "",
    updatedAt: new Date(),
  };

  const slug =
    existing && !listingSlugBroken(existing.slug)
      ? existing.slug
      : await freeListingSlug(executor, listingSlug(item.sku, item.id), existing?.id);
  let listingId = existing?.id;
  if (!existing) {
    const [created] = await executor.insert(listings).values({ ...values, slug }).returning();
    listingId = created.id;
  } else {
    await executor
      .update(listings)
      .set(listingSlugBroken(existing.slug) ? { ...values, slug } : values)
      .where(eq(listings.id, existing.id));
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

let slugRepair: Promise<void> | null = null;

export function ensureSafeListingSlugs() {
  slugRepair ??= repairUnsafeListingSlugs().catch(() => {
    slugRepair = null;
  });
  return slugRepair;
}

async function repairUnsafeListingSlugs() {
  const rows = await db
    .select({
      id: listings.id,
      slug: listings.slug,
      sku: nomenclature.sku,
      nomenclatureId: nomenclature.id,
    })
    .from(listings)
    .innerJoin(nomenclature, eq(listings.nomenclatureId, nomenclature.id));
  for (const row of rows) {
    if (!listingSlugBroken(row.slug)) continue;
    const slug = await freeListingSlug(db, listingSlug(row.sku, row.nomenclatureId), row.id);
    try {
      await db.update(listings).set({ slug, updatedAt: new Date() }).where(eq(listings.id, row.id));
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      await db
        .update(listings)
        .set({ slug: `${slug}-${row.id.replace(/-/g, "").slice(8, 12)}`, updatedAt: new Date() })
        .where(eq(listings.id, row.id));
    }
  }
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
