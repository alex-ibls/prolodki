import { eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { attributeDefs, brands, categories, listings, nomenclature, orderItems } from "@/db/schema";
import { DomainError } from "@/lib/errors";

export async function removeCategory(id: number, alsoDeleting = new Set<number>()) {
  const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
  if (!category) throw new DomainError("Категория не найдена");
  const children = await db.select({ id: categories.id }).from(categories).where(eq(categories.parentId, id));
  if (children.some((child) => !alsoDeleting.has(child.id))) {
    throw new DomainError(`Сначала уберите вложенные категории: ${category.name}`);
  }
  const listing = await db.query.listings.findFirst({ where: eq(listings.categoryId, id) });
  if (listing) throw new DomainError(`В категории «${category.name}» есть товары`);
  const good = await db.query.nomenclature.findFirst({ where: eq(nomenclature.categoryId, id) });
  if (good) throw new DomainError(`В категории «${category.name}» есть номенклатура`);
  await db.execute(sql`
    delete from attribute_defs d
    where d.category_id = ${id}
      and not exists (select 1 from listing_attributes la where la.attribute_def_id = d.id)
      and not exists (select 1 from nomenclature_attributes na where na.attribute_def_id = d.id)
  `);
  const still = await db.query.attributeDefs.findFirst({ where: eq(attributeDefs.categoryId, id) });
  if (still) throw new DomainError(`У категории «${category.name}» остались характеристики`);
  await db.delete(categories).where(eq(categories.id, id));
}

export async function brandUsage(id: number) {
  const listing = await db.query.listings.findFirst({ where: eq(listings.brandId, id) });
  const good = await db.query.nomenclature.findFirst({ where: eq(nomenclature.brandId, id) });
  const [orders] = await db
    .select({ n: sql<number>`count(distinct ${orderItems.orderId})::int` })
    .from(orderItems)
    .leftJoin(nomenclature, eq(orderItems.nomenclatureId, nomenclature.id))
    .leftJoin(listings, eq(orderItems.listingId, listings.id))
    .where(or(eq(nomenclature.brandId, id), eq(listings.brandId, id)));
  return { cards: Boolean(listing || good), orders: Number(orders?.n ?? 0) };
}

export async function removeBrand(id: number) {
  const brand = await db.query.brands.findFirst({ where: eq(brands.id, id) });
  if (!brand) throw new DomainError("Бренд не найден");
  const usage = await brandUsage(id);
  if (usage.cards) {
    throw new DomainError(`Бренд «${brand.name}» указан в карточках. Удаление доступно, когда нет карточек и заказов.`);
  }
  if (usage.orders) {
    throw new DomainError(`Бренд «${brand.name}» есть в заказах. Удаление доступно, когда нет карточек и заказов.`);
  }
  await db.delete(brands).where(eq(brands.id, id));
}
