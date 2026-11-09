"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { brands, categories, listings, nomenclature } from "@/db/schema";
import { removeBrand, removeCategory } from "@/lib/admin-mutations";
import { allCategories } from "@/lib/catalog";
import { DomainError } from "@/lib/errors";
import { parseIntStrict } from "@/lib/format";
import { runAction } from "@/lib/guards";
import { slugify } from "@/lib/slug";
import { wouldCycle } from "@/lib/taxonomy";

function readSort(formData: FormData) {
  return parseSort(String(formData.get("sort") || ""));
}

function parseSort(raw: string) {
  const text = raw.trim();
  if (!text) return 0;
  const sort = parseIntStrict(text);
  if (sort === null) throw new DomainError("Порядок должен быть целым числом");
  return sort;
}

function catalogBack(raw: unknown) {
  const fallback = "/admin/catalog";
  const value = String(raw || "");
  if (value.startsWith("//") || value.includes("\n") || value.includes("\\")) return fallback;
  const [path, query = ""] = value.split("?");
  if (path !== fallback) return fallback;
  const params = new URLSearchParams(query);
  params.delete("saved");
  params.delete("error");
  const next = params.toString();
  return next ? `${path}?${next}` : path;
}

function withSaved(path: string) {
  const [base, query = ""] = path.split("?");
  const params = new URLSearchParams(query);
  params.set("saved", "1");
  return `${base}?${params}`;
}

async function freshSlug(table: "categories" | "brands", name: string) {
  const taken = new Set<string>();
  const rows =
    table === "categories"
      ? await db.select({ slug: categories.slug }).from(categories)
      : await db.select({ slug: brands.slug }).from(brands);
  for (const row of rows) taken.add(row.slug);
  let slug = slugify(name);
  let n = 2;
  while (taken.has(slug)) {
    slug = `${slugify(name)}-${n}`;
    n += 1;
  }
  return slug;
}

export async function saveCategoryAction(formData: FormData) {
  const idRaw = String(formData.get("id") || "");
  await runAction("/admin/catalog", async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог доступен менеджеру");
    const name = String(formData.get("name") || "").trim();
    if (name.length < 2) throw new DomainError("Укажите название категории");
    const sort = readSort(formData);
    const parentRaw = String(formData.get("parentId") || "");
    const parentId = parentRaw ? Number(parentRaw) : null;
    if (parentRaw && !Number.isInteger(parentId)) throw new DomainError("Родитель не найден");
    const all = await allCategories();
    if (parentId && !all.some((item) => item.id === parentId)) throw new DomainError("Родитель не найден");
    if (idRaw) {
      const id = Number(idRaw);
      const current = all.find((item) => item.id === id);
      if (!current) throw new DomainError("Категория не найдена");
      if (wouldCycle(all, id, parentId)) throw new DomainError("Категория не может быть внутри самой себя");
      await db.update(categories).set({ name, sort, parentId }).where(eq(categories.id, id));
      redirect(`/admin/catalog/${id}?saved=1`);
    }
    await db.insert(categories).values({
      name,
      sort,
      parentId,
      slug: await freshSlug("categories", name),
    });
    redirect("/admin/catalog?saved=1");
  });
}

export async function saveCatalogRowsAction(formData: FormData) {
  const back = catalogBack(formData.get("back"));
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог доступен менеджеру");
    const ids = formData.getAll("rowId").map(String);
    const names = formData.getAll("name").map(String);
    const sorts = formData.getAll("sort").map(String);
    if (ids.length === 0 || ids.length !== names.length || ids.length !== sorts.length) {
      throw new DomainError("Не удалось прочитать каталог");
    }
    if (ids.length > 500) throw new DomainError("Слишком много разделов");
    const all = await allCategories();
    const byId = new Map(all.map((item) => [String(item.id), item]));
    for (let index = 0; index < ids.length; index += 1) {
      const current = byId.get(ids[index]);
      if (!current) throw new DomainError("Категория не найдена");
      const name = names[index].trim();
      if (name.length < 2) throw new DomainError(`Укажите название: ${current.name}`);
      const sort = parseSort(sorts[index]);
      if (name === current.name && sort === current.sort) continue;
      await db.update(categories).set({ name, sort }).where(eq(categories.id, current.id));
    }
    redirect(withSaved(back));
  });
}

export async function deleteCategoryAction(formData: FormData) {
  const back = catalogBack(formData.get("back"));
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог доступен менеджеру");
    const id = Number(formData.get("id") || "");
    await removeCategory(id);
    redirect(withSaved(back));
  });
}

export async function saveBrandAction(formData: FormData) {
  const idRaw = String(formData.get("id") || "");
  await runAction("/admin/brands", async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Бренды доступны менеджеру");
    const name = String(formData.get("name") || "").trim();
    if (name.length < 2) throw new DomainError("Укажите название бренда");
    const sort = readSort(formData);
    const duplicate = await db.query.brands.findFirst({
      where: sql`lower(${brands.name}) = lower(${name})`,
    });
    if (idRaw) {
      const id = Number(idRaw);
      const current = await db.query.brands.findFirst({ where: eq(brands.id, id) });
      if (!current) throw new DomainError("Бренд не найден");
      if (duplicate && duplicate.id !== id) throw new DomainError("Такой бренд уже есть");
      await db.update(brands).set({ name, sort }).where(eq(brands.id, id));
      await db.update(listings).set({ brand: name }).where(eq(listings.brandId, id));
      await db.update(nomenclature).set({ brand: name }).where(eq(nomenclature.brandId, id));
      redirect(`/admin/brands/${id}?saved=1`);
    }
    if (duplicate) throw new DomainError("Такой бренд уже есть");
    await db.insert(brands).values({ name, sort, slug: await freshSlug("brands", name) });
    redirect("/admin/brands?saved=1");
  });
}

export async function deleteBrandAction(formData: FormData) {
  await runAction("/admin/brands", async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Бренды доступны менеджеру");
    const id = Number(formData.get("id") || "");
    await removeBrand(id);
    redirect("/admin/brands?saved=1");
  });
}
