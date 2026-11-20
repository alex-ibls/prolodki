import { and, asc, desc, eq, gte, ilike, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { ensureSearch } from "@/db/ensure";
import {
  attributeDefs,
  brands,
  categories,
  listingImages,
  listings,
  nomenclatureKitGroups,
} from "@/db/schema";
import { ensureSafeListingSlugs } from "@/lib/stock";
import { ancestorChainIds, withoutDemo } from "@/lib/taxonomy";

export type CatalogQuery = {
  q?: string;
  category?: string;
  brands?: string[];
  condition?: string;
  source?: string;
  city?: string;
  availability?: string;
  priceMin?: string;
  priceMax?: string;
  priceSort?: "asc" | "desc";
  page?: string;
  attrs?: Record<string, { min?: string; max?: string; eq?: string }>;
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
    if (match && value) {
      attrs[match[1]] ??= {};
      attrs[match[1]][match[2] as "min" | "max"] = value;
      continue;
    }
    const exact = key.match(/^attr_(.+)$/);
    if (exact && value && !key.endsWith("_min") && !key.endsWith("_max")) {
      attrs[exact[1]] ??= {};
      attrs[exact[1]].eq = value;
    }
  }
  return {
    q: params.get("q") || undefined,
    category: params.get("category") || undefined,
    brands: params.getAll("brand").map((value) => value.trim()).filter(Boolean),
    condition: params.get("condition") || undefined,
    source: params.get("source") || undefined,
    city: params.get("city") || undefined,
    availability: params.get("availability") || undefined,
    priceMin: params.get("price_min") || undefined,
    priceMax: params.get("price_max") || undefined,
    priceSort: priceSortOf(params),
    page: params.get("page") || undefined,
    attrs,
  };
}

export async function searchCatalog(query: CatalogQuery, options?: { countOnly?: boolean }) {
  await ensureSearch();
  await ensureSafeListingSlugs();
  const categoryRows = withoutDemo(await allCategories());
  const conditions: SQL[] = [eq(listings.status, "published")];

  if (query.category) {
    const ids = subtreeIds(categoryRows, query.category);
    if (ids.length === 0) conditions.push(sql`false`);
    else conditions.push(inArray(listings.categoryId, ids));
  }
  if (query.brands?.length) {
    const picked = await db.select({ id: brands.id }).from(brands).where(inArray(brands.slug, query.brands));
    conditions.push(picked.length ? inArray(listings.brandId, picked.map((item) => item.id)) : sql`false`);
  }
  if (query.condition === "new" || query.condition === "used") {
    conditions.push(eq(listings.condition, query.condition));
  }
  if (query.city) conditions.push(eq(listings.city, query.city));
  if (query.availability === "stock") conditions.push(eq(listings.onOrder, false));
  if (query.availability === "order") conditions.push(eq(listings.onOrder, true));
  const minRub = Number(query.priceMin);
  const maxRub = Number(query.priceMax);
  if ((query.priceMin && Number.isFinite(minRub)) || (query.priceMax && Number.isFinite(maxRub))) {
    conditions.push(sql`${listings.priceKopeks} > 0`);
  }
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
  const chainIds = selected ? ancestorChainIds(categoryRows, selected.id) : [];
  const defCategoryIds = [...new Set([...scopeIds, ...chainIds])];
  const scopedDefs = defCategoryIds.length
    ? await db
        .select()
        .from(attributeDefs)
        .where(inArray(attributeDefs.categoryId, defCategoryIds))
        .orderBy(asc(attributeDefs.cardOrder), asc(attributeDefs.name))
    : [];
  const seen = new Set<string>();
  const defs: typeof scopedDefs = [];
  for (const categoryId of chainIds) {
    for (const def of scopedDefs) {
      if (def.categoryId !== categoryId || !def.filterable || seen.has(def.code)) continue;
      seen.add(def.code);
      defs.push(def);
    }
  }
  for (const def of scopedDefs) {
    if (!def.filterable || seen.has(def.code) || chainIds.includes(def.categoryId)) continue;
    seen.add(def.code);
    defs.push(def);
  }
  const requested = Object.entries(query.attrs ?? {})
    .filter(([, range]) => range?.min || range?.max || range?.eq)
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
    if (range.eq) {
      const numeric = Number(range.eq.replace(",", "."));
      const numberMatch = Number.isFinite(numeric) ? sql`abs(la.value_number - ${numeric}) < 0.0001` : sql`false`;
      conditions.push(sql`exists (
        select 1 from listing_attributes la
        inner join attribute_defs ad on ad.id = la.attribute_def_id
        where la.listing_id = ${listings.id}
          and ad.code = ${def.code}
          and (la.value_text = ${range.eq} or ${numberMatch})
      )`);
    }
  }

  const where = and(...conditions);
  const page = Math.max(1, Number(query.page) || 1);
  const order = [];
  if (query.priceSort === "asc") order.push(asc(listings.priceKopeks));
  else if (query.priceSort === "desc") order.push(desc(listings.priceKopeks));
  order.push(desc(listings.createdAt));
  order.push(desc(listings.id));

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(listings)
    .where(where);
  const total = totalRow?.count ?? 0;
  if (options?.countOnly) {
    return {
      rows: [],
      total,
      page: 1,
      pages: 1,
      pageSize,
      categories: categoryRows,
      defs,
      brands: [],
      cities: [],
    };
  }
  const rows = await db.query.listings.findMany({
    where,
    with: {
      images: { orderBy: asc(listingImages.sort) },
      attributes: { with: { definition: true } },
      category: true,
      brandRef: true,
    },
    orderBy: order,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  const nomenclatureIds = [...new Set(rows.flatMap((row) => (row.nomenclatureId ? [row.nomenclatureId] : [])))];
  const kitRows = nomenclatureIds.length
    ? await db
        .selectDistinct({ nomenclatureId: nomenclatureKitGroups.nomenclatureId })
        .from(nomenclatureKitGroups)
        .where(inArray(nomenclatureKitGroups.nomenclatureId, nomenclatureIds))
    : [];
  const withKit = new Set(kitRows.map((row) => row.nomenclatureId));
  const cards = rows.map((row) => ({
    ...row,
    configurable: row.source === "company" && row.nomenclatureId != null && withKit.has(row.nomenclatureId),
  }));

  const brandRows = await db.select().from(brands).orderBy(asc(brands.sort), asc(brands.name));
  const cities = await db
    .selectDistinct({ city: listings.city })
    .from(listings)
    .where(and(eq(listings.status, "published"), sql`${listings.city} <> ''`))
    .orderBy(asc(listings.city));

  return {
    rows: cards,
    total,
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
      brandRef: true,
      seller: true,
      organization: true,
    },
  });
}

export async function publishedListingByPath(slug: string) {
  await ensureSafeListingSlugs();
  const exact = await getPublishedListing(slug);
  if (exact) return exact;
  const token = slug.match(/-([0-9a-f]{8,32})$/i)?.[1]?.toLowerCase();
  if (!token) return null;
  const rows = await db
    .select({ slug: listings.slug })
    .from(listings)
    .where(
      and(
        eq(listings.status, "published"),
        sql`(
          replace(${listings.id}::text, '-', '') like ${`${token}%`}
          or replace(coalesce(${listings.nomenclatureId}::text, ''), '-', '') like ${`${token}%`}
        )`,
      ),
    )
    .limit(2);
  if (rows.length !== 1) return null;
  return getPublishedListing(rows[0].slug);
}

export async function suggestBrands(term: string) {
  return db
    .select({ brand: brands.name })
    .from(brands)
    .where(ilike(brands.name, `%${term}%`))
    .limit(8);
}
