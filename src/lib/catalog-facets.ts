import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { attributeDefs, brands, listingAttributes, listings } from "@/db/schema";
import { subtreeIds } from "@/lib/catalog";
import { conditionLabel, sourceLabel } from "@/lib/labels";
import { ancestorChainIds } from "@/lib/taxonomy";

export type NumberFacet = {
  code: string;
  name: string;
  unit: string;
  kind: "number";
  min: number;
  max: number;
  step: number;
};

export type TextFacet = {
  code: string;
  name: string;
  unit: string;
  kind: "text";
  options: string[];
};

export type CatalogChoice = { value: string; label: string };

export type CatalogFacets = {
  listings: number;
  price: { min: number; max: number; step: number } | null;
  brands: CatalogChoice[];
  conditions: CatalogChoice[];
  sources: CatalogChoice[];
  attributes: (NumberFacet | TextFacet)[];
};

const choiceCodes = new Set(["max_hp", "side_height_mm", "deadrise_mid", "deadrise_transom", "transom_height_mm"]);

type ScopeCategory = { id: number; parentId: number | null; slug: string };

export async function catalogFacets(categorySlug: string | undefined, categories: ScopeCategory[]): Promise<CatalogFacets> {
  const ids = categorySlug ? subtreeIds(categories, categorySlug) : categories.map((item) => item.id);
  const selected = categorySlug ? categories.find((item) => item.slug === categorySlug) : undefined;
  const defCategoryIds = [
    ...new Set([...ids, ...(selected ? ancestorChainIds(categories, selected.id) : [])]),
  ];
  if (ids.length === 0) {
    return { listings: 0, price: null, brands: [], conditions: [], sources: [], attributes: [] };
  }
  const scope = and(eq(listings.status, "published"), inArray(listings.categoryId, ids));
  const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(listings).where(scope);
  const [priceRow] = await db
    .select({
      min: sql<number | null>`min(${listings.priceKopeks})::int`,
      max: sql<number | null>`max(${listings.priceKopeks})::int`,
    })
    .from(listings)
    .where(and(scope, sql`${listings.priceKopeks} > 0`));
  const brandRows = await db
    .selectDistinct({ slug: brands.slug, name: brands.name })
    .from(listings)
    .innerJoin(brands, eq(brands.id, listings.brandId))
    .where(scope)
    .orderBy(asc(brands.name));
  const kindRows = await db
    .selectDistinct({ condition: listings.condition, source: listings.source })
    .from(listings)
    .where(scope);
  const valueRows = await db
    .select({
      code: attributeDefs.code,
      name: attributeDefs.name,
      unit: attributeDefs.unit,
      order: attributeDefs.cardOrder,
      filterable: attributeDefs.filterable,
      dataType: attributeDefs.dataType,
      valueNumber: listingAttributes.valueNumber,
      valueText: listingAttributes.valueText,
    })
    .from(listingAttributes)
    .innerJoin(attributeDefs, eq(attributeDefs.id, listingAttributes.attributeDefId))
    .innerJoin(listings, eq(listings.id, listingAttributes.listingId))
    .where(and(scope, inArray(attributeDefs.categoryId, defCategoryIds)));

  const grouped = new Map<
    string,
    { name: string; unit: string; order: number; filterable: boolean; dataType: string; numbers: number[]; texts: Set<string> }
  >();
  for (const row of valueRows) {
    const current = grouped.get(row.code) ?? {
      name: row.name,
      unit: row.unit,
      order: row.order,
      filterable: false,
      dataType: row.dataType,
      numbers: [],
      texts: new Set<string>(),
    };
    if (row.order < current.order) {
      current.name = row.name;
      current.unit = row.unit;
      current.order = row.order;
      current.dataType = row.dataType;
    }
    current.filterable = current.filterable || row.filterable;
    if (row.valueNumber !== null && Number.isFinite(row.valueNumber)) current.numbers.push(row.valueNumber);
    const text = row.valueText?.trim();
    if (text) current.texts.add(text);
    grouped.set(row.code, current);
  }

  const attributes = [...grouped.entries()]
    .filter(([, item]) => item.filterable)
    .sort((left, right) => left[1].order - right[1].order || left[1].name.localeCompare(right[1].name, "ru"))
    .flatMap(([code, item]): (NumberFacet | TextFacet)[] => {
      if (item.dataType === "text") {
        const options = [...item.texts].sort((left, right) => left.localeCompare(right, "ru"));
        if (options.length >= 2) return [{ code, name: item.name, unit: item.unit, kind: "text", options }];
        return [];
      }
      const numbers = [...new Set(item.numbers)].sort((left, right) => left - right);
      if (choiceCodes.has(code) && numbers.length >= 2) {
        return [{ code, name: item.name, unit: item.unit, kind: "text", options: numbers.map((value) => String(value)) }];
      }
      if (numbers.length >= 2 && numbers[0] < numbers[numbers.length - 1]) {
        return [
          {
            code,
            name: item.name,
            unit: item.unit,
            kind: "number",
            min: numbers[0],
            max: numbers[numbers.length - 1],
            step: numbers.some((value) => Math.abs(value - Math.round(value)) > 1e-6) ? 0.05 : 1,
          },
        ];
      }
      const options = [...item.texts].sort((left, right) => left.localeCompare(right, "ru"));
      if (options.length >= 2) return [{ code, name: item.name, unit: item.unit, kind: "text", options }];
      return [];
    });

  const minRub = priceRow?.min ? Math.round(priceRow.min / 100) : 0;
  const maxRub = priceRow?.max ? Math.round(priceRow.max / 100) : 0;
  const conditions = [...new Set(kindRows.map((row) => row.condition))].map((value) => ({
    value,
    label: conditionLabel[value],
  }));
  const sources = [...new Set(kindRows.map((row) => row.source))].map((value) => ({
    value,
    label: sourceLabel[value],
  }));

  return {
    listings: countRow?.count ?? 0,
    price: minRub < maxRub ? { min: minRub, max: maxRub, step: 1000 } : null,
    brands: brandRows
      .filter((item) => !item.slug.startsWith("demo-"))
      .map((item) => ({ value: item.slug, label: item.name })),
    conditions: conditions.length > 1 ? conditions : [],
    sources: sources.length > 1 ? sources : [],
    attributes,
  };
}
