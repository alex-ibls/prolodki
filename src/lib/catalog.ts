import { and, asc, desc, eq, gte, ilike, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefs,
  brands,
  categories,
  listingImages,
  listings,
} from "@/db/schema";

export type CatalogQuery = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  source?: string;
  city?: string;
  priceMin?: string;
  priceMax?: string;
  sort?: string;
  page?: string;
  attrs?: Record<string, { min?: string; max?: string }>;
};

const pageSize = 12;

export async function allCategories() {
  return db.select().from(categories).orderBy(asc(categories.sort), asc(categories.name));
}

export function subtreeIds(
  all: { id: number; parentId: number | null; slug: string }[],
  slug: string,
) {
  const root = all.find((item) => item.slug === slug);
  if (!root) return [];
  const ids = [root.id];
  const walk = (parentId: number) => {
    for (const item of all) {
      if (item.parentId === parentId) {
        ids.push(item.id);
        walk(item.id);
      }
    }
  };
  walk(root.id);
  return ids;
}

export async function searchCatalog(query: CatalogQuery) {
  const categoryRows = await allCategories();
  const conditions: SQL[] = [eq(listings.status, "published")];

  if (query.category) {
    const ids = subtreeIds(categoryRows, query.category);
    if (ids.length === 0) conditions.push(sql`false`);
    else conditions.push(inArray(listings.categoryId, ids));
  }
  if (query.brand) {
    const brand = await db.query.brands.findFirst({ where: eq(brands.slug, query.brand) });
    conditions.push(brand ? eq(listings.brandId, brand.id) : sql`false`);
  }
  if (query.condition === "new" || query.condition === "used") {
    conditions.push(eq(listings.condition, query.condition));
  }
  if (query.source === "company" || query.source === "individual") {
    conditions.push(eq(listings.source, query.source));
  }
  if (query.city) conditions.push(eq(listings.city, query.city));
  const minRub = Number(query.priceMin);
  const maxRub = Number(query.priceMax);
  if (query.priceMin && Number.isFinite(minRub)) {
    conditions.push(gte(listings.priceKopeks, Math.round(minRub * 100)));
  }
  if (query.priceMax && Number.isFinite(maxRub)) {
    conditions.push(lte(listings.priceKopeks, Math.round(maxRub * 100)));
  }
  if (query.q?.trim()) {
    conditions.push(
      sql`${listings.searchVector} @@ plainto_tsquery('russian', ${query.q.trim()})`,
    );
  }

  const selected = categoryRows.find((item) => item.slug === query.category);
  const defs = selected
    ? await db
        .select()
        .from(attributeDefs)
        .where(eq(attributeDefs.categoryId, selected.id))
        .orderBy(asc(attributeDefs.cardOrder))
    : [];

  for (const def of defs) {
    const range = query.attrs?.[def.code];
    if (!range) continue;
    const min = range.min ? Number(range.min.replace(",", ".")) : null;
    const max = range.max ? Number(range.max.replace(",", ".")) : null;
    if (min !== null && Number.isFinite(min)) {
      conditions.push(sql`exists (
        select 1 from listing_attributes la
        where la.listing_id = ${listings.id}
          and la.attribute_def_id = ${def.id}
          and la.value_number >= ${min}
      )`);
    }
    if (max !== null && Number.isFinite(max)) {
      conditions.push(sql`exists (
        select 1 from listing_attributes la
        where la.listing_id = ${listings.id}
          and la.attribute_def_id = ${def.id}
          and la.value_number <= ${max}
      )`);
    }
  }

  const where = and(...conditions);
  const page = Math.max(1, Number(query.page) || 1);
  const order =
    query.sort === "price_asc"
      ? asc(listings.priceKopeks)
      : query.sort === "price_desc"
        ? desc(listings.priceKopeks)
        : desc(listings.createdAt);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(where);
  const rows = await db.query.listings.findMany({
    where,
    with: {
      images: { orderBy: asc(listingImages.sort) },
      attributes: { with: { definition: true } },
      category: true,
    },
    orderBy: order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const brandRows = await db.select().from(brands).orderBy(asc(brands.sort), asc(brands.name));
  const cities = await db
    .selectDistinct({ city: listings.city })
    .from(listings)
    .where(and(eq(listings.status, "published"), sql`${listings.city} <> ''`))
    .orderBy(asc(listings.city));

  return {
    rows,
    total: totalRow?.count ?? 0,
    page,
    pages: Math.max(1, Math.ceil((totalRow?.count ?? 0) / pageSize)),
    pageSize,
    categories: categoryRows,
    defs,
    brands: brandRows.map((item) => ({ slug: item.slug, name: item.name })),
    cities: cities.map((item) => item.city),
  };
}

export async function getPublishedListing(slug: string) {
  return db.query.listings.findFirst({
    where: and(eq(listings.slug, slug), eq(listings.status, "published")),
    with: {
      images: { orderBy: asc(listingImages.sort) },
      attributes: { with: { definition: true } },
      category: true,
      seller: true,
      organization: true,
    },
  });
}

export async function homeRails() {
  const categoryRows = await allCategories();
  const published = eq(listings.status, "published");
  const withCard = {
    images: { orderBy: asc(listingImages.sort) },
    attributes: { with: { definition: true } },
    category: true,
  } as const;

  const [fresh, privateItems] = await Promise.all([
    db.query.listings.findMany({
      where: published,
      with: withCard,
      orderBy: desc(listings.createdAt),
      limit: 4,
    }),
    db.query.listings.findMany({
      where: and(published, eq(listings.source, "individual")),
      with: withCard,
      orderBy: desc(listings.createdAt),
      limit: 4,
    }),
  ]);

  return { fresh, privateItems, categories: categoryRows };
}

export async function suggestBrands(term: string) {
  return db
    .select({ brand: brands.name })
    .from(brands)
    .where(ilike(brands.name, `%${term}%`))
    .limit(8);
}
