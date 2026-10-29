import { and, asc, desc, eq, gte, ilike, inArray, lte, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefs,
  brands,
  categories,
  listingImages,
  listings,
} from "@/db/schema";
import type { CatalogTag, FilterField } from "@/lib/catalog-tags";
import { categoryPath } from "@/lib/taxonomy";

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
  sort?: string;
  page?: string;
  attrs?: Record<string, { min?: string; max?: string }>;
};

const pageSize = 12;

export async function allCategories() {
  return db.select().from(categories).orderBy(asc(categories.sort), asc(categories.name));
}

export async function catalogFilters(): Promise<FilterField[]> {
  const rows = await db
    .select()
    .from(attributeDefs)
    .where(eq(attributeDefs.filterable, true))
    .orderBy(asc(attributeDefs.cardOrder), asc(attributeDefs.name));
  const fields: FilterField[] = [
    { code: "price", name: "Цена", unit: "₽", minParam: "price_min", maxParam: "price_max" },
  ];
  const seen = new Set<string>();
  for (const row of rows) {
    if (seen.has(row.code)) continue;
    seen.add(row.code);
    fields.push({
      code: row.code,
      name: row.name,
      unit: row.unit,
      minParam: `attr_${row.code}_min`,
      maxParam: `attr_${row.code}_max`,
    });
  }
  return fields;
}

export async function catalogTags(): Promise<CatalogTag[]> {
  const categoryRows = await allCategories();
  const brandRows = await db.select().from(brands).orderBy(asc(brands.sort), asc(brands.name));
  const cityRows = await db
    .selectDistinct({ city: listings.city })
    .from(listings)
    .where(and(eq(listings.status, "published"), sql`${listings.city} <> ''`))
    .orderBy(asc(listings.city));
  return [
    ...categoryRows.map((category) => ({
      id: `category:${category.slug}`,
      label: category.name,
      detail: categoryPath(categoryRows, category.id),
      group: "Раздел",
      param: "category" as const,
      value: category.slug,
    })),
    ...brandRows.map((brand) => ({
      id: `brand:${brand.slug}`,
      label: brand.name,
      detail: brand.name,
      group: "Бренд",
      param: "brand" as const,
      value: brand.slug,
    })),
    ...cityRows.map((row) => ({
      id: `city:${row.city}`,
      label: row.city,
      detail: row.city,
      group: "Город",
      param: "city" as const,
      value: row.city,
    })),
    { id: "condition:new", label: "Новый", detail: "Новый", group: "Состояние", param: "condition", value: "new" },
    { id: "condition:used", label: "БУ", detail: "БУ", group: "Состояние", param: "condition", value: "used" },
    { id: "source:company", label: "Компания", detail: "Компания", group: "Продавец", param: "source", value: "company" },
    {
      id: "source:individual",
      label: "Частное лицо",
      detail: "Частное лицо",
      group: "Продавец",
      param: "source",
      value: "individual",
    },
    { id: "registered:yes", label: "Регистрат", detail: "Регистрат", group: "Регистрация", param: "registered", value: "yes" },
    { id: "registered:no", label: "Нерегистрат", detail: "Нерегистрат", group: "Регистрация", param: "registered", value: "no" },
    { id: "availability:stock", label: "В наличии", detail: "В наличии", group: "Наличие", param: "availability", value: "stock" },
    { id: "availability:order", label: "На заказ", detail: "На заказ", group: "Наличие", param: "availability", value: "order" },
  ];
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
    sort: params.get("sort") || "new",
    page: params.get("page") || undefined,
    attrs,
  };
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
  if (query.q?.trim()) {
    conditions.push(
      sql`${listings.searchVector} @@ plainto_tsquery('russian', ${query.q.trim()})`,
    );
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
  const order =
    query.sort === "price_asc"
      ? asc(listings.priceKopeks)
      : query.sort === "price_desc"
        ? desc(listings.priceKopeks)
        : query.sort === "old"
          ? asc(listings.createdAt)
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

export async function suggestBrands(term: string) {
  return db
    .select({ brand: brands.name })
    .from(brands)
    .where(ilike(brands.name, `%${term}%`))
    .limit(8);
}
