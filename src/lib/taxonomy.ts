import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { brands, categories } from "@/db/schema";
import { DomainError } from "@/lib/errors";

export type CategoryNode = {
  id: number;
  parentId: number | null;
  slug: string;
  name: string;
  sort: number;
};

export function childrenOf(all: CategoryNode[], parentId: number | null) {
  return all
    .filter((item) => item.parentId === parentId)
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, "ru"));
}

export function isLeaf(all: CategoryNode[], id: number) {
  return !all.some((item) => item.parentId === id);
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
