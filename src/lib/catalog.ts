import { and, asc, desc, eq, gte, ilike, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureSearch } from "@/db/ensure";
import {
  attributeDefs,
  brands,
  categories,
  listingImages,
  listings,
} from "@/db/schema";
import { withoutDemo } from "@/lib/taxonomy";

export type CatalogQuery = {
  q?: string;
  category?: string;
  brand?: string;
  condition?: string;
  source?: string;
  city?: string;
  registered?: string;
  availability?: string;
  priceMin?: string;
  priceMax?: string;
  priceSort?: "asc" | "desc";
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

function priceSortOf(params: URLSearchParams): "asc" | "desc" | undefined {
  const price = params.get("price");
  if (price === "asc" || price === "desc") return price;
  if (params.get("sort") === "price_asc") return "asc";
  if (params.get("sort") === "price_desc") return "desc";
  return undefined;
}

export function catalogQueryFromSearchParams(params: URLSearchParams): CatalogQuery {
  const attrs: NonNullable<CatalogQuery["attrs"]> = {};
  for (const [key, value] of params.entries()) {
    const match = key.match(/^attr_(.+)_(min|max)$/);
    if (!match || !value) continue;
    attrs[match[1]] ??= {};
    attrs[match[1]][match[2] as "min" | "max"] = value;
  }
  return {
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
    brand: params.get("brand") || undefined,
    condition: params.get("condition") || undefined,
    source: params.get("source") || undefined,
    city: params.get("city") || undefined,
    registered: params.get("registered") || undefined,
    availability: params.get("availability") || undefined,
    priceMin: params.get("price_min") || undefined,
    priceMax: params.get("price_max") || undefined,
    priceSort: priceSortOf(params),
    page: params.get("page") || undefined,
    attrs,
  };
}

export async function searchCatalog(query: CatalogQuery) {
  await ensureSearch();
  const categoryRows = withoutDemo(await allCategories());
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
  if (query.registered === "yes") conditions.push(eq(listings.registered, true));
  if (query.registered === "no") conditions.push(eq(listings.registered, false));
  if (query.availability === "stock") conditions.push(eq(listings.onOrder, false));
  if (query.availability === "order") conditions.push(eq(listings.onOrder, true));
  const minRub = Number(query.priceMin);
  const maxRub = Number(query.priceMax);
  if (query.priceMin && Number.isFinite(minRub)) {
    conditions.push(gte(listings.priceKopeks, Math.round(minRub * 100)));
  }
  if (query.priceMax && Number.isFinite(maxRub)) {
    conditions.push(lte(listings.priceKopeks, Math.round(maxRub * 100)));
  }
  const term = query.q?.trim();
  if (term) {
    conditions.push(sql`${listings.searchVector} @@ listings_search_query(${term})`);
  }

  const selected = categoryRows.find((item) => item.slug === query.category);
  const scopeIds = selected ? subtreeIds(categoryRows, selected.slug) : [];
  const scopedDefs = scopeIds.length
    ? await db
        .select()
        .from(attributeDefs)
        .where(inArray(attributeDefs.categoryId, scopeIds))
        .orderBy(asc(attributeDefs.cardOrder), asc(attributeDefs.name))
    : [];
  const ownDefs = selected ? scopedDefs.filter((def) => def.categoryId === selected.id && def.filterable) : [];
  const defs = ownDefs.length
    ? ownDefs
    : scopedDefs.filter((def, index, list) => def.filterable && list.findIndex((item) => item.code === def.code) === index);
  const requested = Object.entries(query.attrs ?? {})
    .filter(([, range]) => range?.min || range?.max)
    .map(([code]) => code)
    .filter((code) => !defs.some((def) => def.code === code));
  if (requested.length) {
    const extra = await db
      .select()
      .from(attributeDefs)
      .where(and(eq(attributeDefs.filterable, true), inArray(attributeDefs.code, requested)))
      .orderBy(asc(attributeDefs.cardOrder), asc(attributeDefs.name));
    for (const def of extra) {
      if (!defs.some((item) => item.code === def.code)) defs.push(def);
    }
  }

  for (const def of defs) {
    const range = query.attrs?.[def.code];
    if (!range) continue;
    const min = range.min ? Number(range.min.replace(",", ".")) : null;
    const max = range.max ? Number(range.max.replace(",", ".")) : null;
    if (min !== null && Number.isFinite(min)) {
      conditions.push(sql`exists (
        select 1 from listing_attributes la
        inner join attribute_defs ad on ad.id = la.attribute_def_id
        where la.listing_id = ${listings.id}
          and ad.code = ${def.code}
          and la.value_number >= ${min}
      )`);
    }
    if (max !== null && Number.isFinite(max)) {
      conditions.push(sql`exists (
        select 1 from listing_attributes la
        inner join attribute_defs ad on ad.id = la.attribute_def_id
        where la.listing_id = ${listings.id}
          and ad.code = ${def.code}
          and la.value_number <= ${max}
      )`);
    }
  }

  const where = and(...conditions);
  const page = Math.max(1, Number(query.page) || 1);
  const order = [];
  if (query.priceSort === "asc") order.push(asc(listings.priceKopeks));
  if (query.priceSort === "desc") order.push(desc(listings.priceKopeks));
  if (term && !query.priceSort) {
    order.push(desc(sql`ts_rank_cd(${listings.searchVector}, listings_search_query(${term}))`));
  }
  order.push(desc(listings.createdAt));
  order.push(asc(listings.id));

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

export async function suggestBrands(term: string) {
  return db
    .select({ brand: brands.name })
    .from(brands)
    .where(ilike(brands.name, `%${term}%`))
    .limit(8);
}
