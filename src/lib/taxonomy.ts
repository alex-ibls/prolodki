import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories, listings, nomenclature } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { slugify } from "@/lib/slug";

export type CategoryNode = {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  sort: number;
};

export function withoutDemo<T extends { slug: string }>(rows: T[]) {
  return rows.filter((row) => !row.slug.startsWith("demo-"));
}

export function childrenOf(all: CategoryNode[], parentId: number | null) {
  return all
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ru"));
}

export function isLeaf(all: CategoryNode[], id: number) {
  return !all.some((item) => item.parentId === id);
}

export function ancestorChainIds(all: { id: number; parentId: number | null }[], id: number) {
  const byId = new Map(all.map((item) => [item.id, item]));
  const chain: number[] = [];
  let current = byId.get(id);
  const guard = new Set<number>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    chain.unshift(current.id);
    current = current.parentId == null ? undefined : byId.get(current.parentId);
  }
  return chain;
}

export function categoryChain(all: CategoryNode[], slug: string | undefined) {
  if (!slug) return [];
  const chain: CategoryNode[] = [];
  let current = all.find((item) => item.slug === slug);
  const guard = new Set<number>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    chain.unshift(current);
    current = current.parentId ? all.find((item) => item.id === current?.parentId) : undefined;
  }
  return chain;
}

export function categoryPath(all: CategoryNode[], id: number) {
  const names: string[] = [];
  let current = all.find((item) => item.id === id);
  const guard = new Set<number>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    names.unshift(current.name);
    current = current.parentId ? all.find((item) => item.id === current?.parentId) : undefined;
  }
  return names.join(" / ");
}

export function flattenCategories(all: CategoryNode[]) {
  const rows: { category: CategoryNode; depth: number }[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const category of childrenOf(all, parentId)) {
      rows.push({ category, depth });
      walk(category.id, depth + 1);
    }
  };
  walk(null, 0);
  return rows;
}

export function wouldCycle(all: CategoryNode[], id: number, parentId: number | null) {
  if (parentId === null) return false;
  let current = all.find((item) => item.id === parentId);
  const guard = new Set<number>();
  while (current && !guard.has(current.id)) {
    if (current.id === id) return true;
    guard.add(current.id);
    current = current.parentId ? all.find((item) => item.id === current?.parentId) : undefined;
  }
  return false;
}

export async function assertLeafCategory(categoryId: number) {
  const category = await db.query.categories.findFirst({ where: eq(categories.id, categoryId) });
  if (!category) throw new DomainError("Категория не найдена");
  const child = await db.query.categories.findFirst({ where: eq(categories.parentId, categoryId) });
  if (child) throw new DomainError("Выберите конечную категорию");
  return category;
}

export async function allBrands() {
  return db.select().from(brands).orderBy(asc(brands.sort), asc(brands.name));
}

export async function resolveBrandId(raw: string) {
  if (!raw.trim()) return { brandId: null as number | null, brand: "" };
  const id = Number(raw);
  if (!Number.isInteger(id)) throw new DomainError("Бренд не найден");
  const row = await db.query.brands.findFirst({ where: eq(brands.id, id) });
  if (!row) throw new DomainError("Бренд не найден");
  return { brandId: row.id, brand: row.name };
}

export async function resolveBrandName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { brandId: null as number | null, brand: "" };
  const row = await db.query.brands.findFirst({
    where: sql`lower(${brands.name}) = lower(${trimmed})`,
  });
  if (!row) throw new DomainError(`Бренд «${trimmed}» не найден. Добавьте его в справочнике`);
  return { brandId: row.id, brand: row.name };
}

export async function ensureBrandName(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return { brandId: null as number | null, brand: "" };
  if (trimmed.length < 2) throw new DomainError("Название бренда — не меньше 2 символов");
  if (trimmed.length > 80) throw new DomainError("Название бренда — не больше 80 символов");
  const existing = await findBrand(trimmed);
  if (existing) return { brandId: existing.id, brand: existing.name };
  let slug = slugify(trimmed);
  let n = 2;
  while (await db.query.brands.findFirst({ where: eq(brands.slug, slug) })) {
    slug = `${slugify(trimmed)}-${n}`;
    n += 1;
  }
  try {
    const [created] = await db.insert(brands).values({ name: trimmed, slug, sort: 1000 }).returning();
    return { brandId: created.id, brand: created.name };
  } catch {
    const again = await findBrand(trimmed);
    if (again) return { brandId: again.id, brand: again.name };
    throw new DomainError("Не удалось добавить бренд");
  }
}

async function findBrand(name: string) {
  const key = name.trim().toLocaleLowerCase("ru");
  const rows = await db.select().from(brands);
  return rows.find((row) => row.name.toLocaleLowerCase("ru") === key);
}

export async function brandModelChoices(includeDemo: boolean) {
  const rows = await allBrands();
  const demo = new Set(rows.filter((row) => row.slug.startsWith("demo-")).map((row) => row.name.toLocaleLowerCase("ru")));
  const brandNames = (includeDemo ? rows : withoutDemo(rows)).map((row) => row.name);
  const fromListings = await db
    .selectDistinct({ brand: listings.brand, model: listings.model })
    .from(listings)
    .where(sql`${listings.model} <> ''`);
  const fromNomenclature = await db
    .selectDistinct({ brand: nomenclature.brand, model: nomenclature.model })
    .from(nomenclature)
    .where(sql`${nomenclature.model} <> ''`);
  const models = [...fromListings, ...fromNomenclature].filter((row) => {
    if (!row.model.trim()) return false;
    if (includeDemo) return true;
    return !demo.has(row.brand.trim().toLocaleLowerCase("ru"));
  });
  return { brands: brandNames, models };
}
