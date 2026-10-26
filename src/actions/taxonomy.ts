"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { attributeDefs, brands, categories, listings, nomenclature } from "@/db/schema";
import { allCategories } from "@/lib/catalog";
import { DomainError } from "@/lib/errors";
import { parseIntStrict } from "@/lib/format";
import { runAction } from "@/lib/guards";
import { slugify } from "@/lib/slug";
import { wouldCycle } from "@/lib/taxonomy";

function readSort(formData: FormData) {
  const raw = String(formData.get("sort") || "").trim();
  if (!raw) return 0;
  const sort = parseIntStrict(raw);
  if (sort === null) throw new DomainError("Порядок должен быть целым числом");
  return sort;
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
    } else {
      await db.insert(categories).values({
        name,
        sort,
        parentId,
        slug: await freshSlug("categories", name),
      });
    }
    redirect("/admin/catalog?saved=1");
  });
}

export async function deleteCategoryAction(formData: FormData) {
  await runAction("/admin/catalog", async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог доступен менеджеру");
    const id = Number(formData.get("id") || "");
    const category = await db.query.categories.findFirst({ where: eq(categories.id, id) });
    if (!category) throw new DomainError("Категория не найдена");
    const child = await db.query.categories.findFirst({ where: eq(categories.parentId, id) });
    if (child) throw new DomainError("Сначала уберите вложенные категории");
    const listing = await db.query.listings.findFirst({ where: eq(listings.categoryId, id) });
    if (listing) throw new DomainError("В категории есть объявления");
    const good = await db.query.nomenclature.findFirst({ where: eq(nomenclature.categoryId, id) });
    if (good) throw new DomainError("В категории есть номенклатура");
    await db.execute(sql`
      delete from attribute_defs d
      where d.category_id = ${id}
        and not exists (select 1 from listing_attributes la where la.attribute_def_id = d.id)
        and not exists (select 1 from nomenclature_attributes na where na.attribute_def_id = d.id)
    `);
    const still = await db.query.attributeDefs.findFirst({ where: eq(attributeDefs.categoryId, id) });
    if (still) throw new DomainError("У категории остались характеристики");
    await db.delete(categories).where(eq(categories.id, id));
    redirect("/admin/catalog?saved=1");
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
    } else {
      if (duplicate) throw new DomainError("Такой бренд уже есть");
      await db.insert(brands).values({ name, sort, slug: await freshSlug("brands", name) });
    }
    redirect("/admin/brands?saved=1");
  });
}

export async function deleteBrandAction(formData: FormData) {
  await runAction("/admin/brands", async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Бренды доступны менеджеру");
    const id = Number(formData.get("id") || "");
    const brand = await db.query.brands.findFirst({ where: eq(brands.id, id) });
    if (!brand) throw new DomainError("Бренд не найден");
    const listing = await db.query.listings.findFirst({ where: eq(listings.brandId, id) });
    if (listing) throw new DomainError("Бренд указан в объявлениях");
    const good = await db.query.nomenclature.findFirst({ where: eq(nomenclature.brandId, id) });
    if (good) throw new DomainError("Бренд указан в номенклатуре");
    await db.delete(brands).where(eq(brands.id, id));
    redirect("/admin/brands?saved=1");
  });
}
