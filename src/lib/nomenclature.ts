import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, nomenclature, stockMovements } from "@/db/schema";
import { csvRecords } from "@/lib/csv";
import { readListingDescription } from "@/lib/description";
import { DomainError } from "@/lib/errors";
import { parseIntStrict, parsePriceToKopeks, textInputLimit } from "@/lib/format";
import { readOnOrder } from "@/lib/labels";
import { availableOf, replaceNomenclatureAttributes, syncPublishedListing, writeStockMovement } from "@/lib/stock";
import { assertLeafCategory, resolveBrandName } from "@/lib/taxonomy";

export type ImportReport = {
  applied: number;
  errors: { line: string; message: string }[];
};

async function categoryBySlug(slug: string) {
  return db.query.categories.findFirst({ where: eq(categories.slug, slug) });
}

export async function importNomenclatureCsv(userId: string, text: string, mode: "full" | "correction") {
  const { headers, records } = csvRecords(text);
  if (records.length === 0) throw new DomainError("В файле нет строк");
  const report: ImportReport = { applied: 0, errors: [] };

  for (const record of records) {
    try {
      if (mode === "correction") {
        await applyCorrection(userId, record);
      } else {
        if (!headers.includes("title")) {
          throw new DomainError("Для загрузки нужна колонка title");
        }
        await applyFull(userId, record);
      }
      report.applied += 1;
    } catch (error) {
      report.errors.push({
        line: record.__line,
        message: error instanceof DomainError ? error.message : "Не удалось обработать строку",
      });
    }
  }
  return report;
}

const sheetFields: Record<string, string> = {
  артикул: "sku",
  sku: "sku",
  название: "title",
  title: "title",
  категория: "category",
  category: "category",
  category_slug: "category_slug",
  цена: "price",
  price: "price",
  склад: "quantity",
  quantity: "quantity",
  витрина: "published",
  бренд: "brand",
  brand: "brand",
  модель: "model",
  model: "model",
  год: "year",
  year: "year",
  описание: "description",
  description: "description",
  "старая цена": "compare_at_price",
  compare_at_price: "compare_at_price",
};

export async function importNomenclatureSheet(userId: string, records: Record<string, string>[]) {
  if (records.length === 0) throw new DomainError("В файле нет строк");
  const report: ImportReport = { applied: 0, errors: [] };
  for (const [index, raw] of records.entries()) {
    try {
      await applySheetRow(userId, normalizeSheetRecord(raw));
      report.applied += 1;
    } catch (error) {
      report.errors.push({
        line: String(index + 2),
        message: error instanceof DomainError ? error.message : "Не удалось обработать строку",
      });
    }
  }
  return report;
}

function normalizeSheetRecord(record: Record<string, string>) {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    const field = sheetFields[sheetKey(key)];
    if (!field) continue;
    const text = value.trim() === "—" ? "" : value.trim();
    next[field] = text;
  }
  return next;
}

function sheetKey(value: string) {
  return value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ");
}

function parseSheetPrice(raw: string) {
  const phrase = raw.trim().toLowerCase().replace(/ё/g, "е");
  if (phrase === "цена по запросу") return 0;
  const cleaned = raw.replace(/[^\d,.]/g, "");
  if (!cleaned) return null;
  return parsePriceToKopeks(cleaned);
}

function parseYesNo(raw: string) {
  const value = raw.trim().toLowerCase().replace(/ё/g, "е");
  if (!value) return null;
  if (value === "да" || value === "yes") return true;
  if (value === "нет" || value === "no") return false;
  throw new DomainError("Витрина указана неверно: Да или Нет");
}

async function categoryByLabel(record: Record<string, string>) {
  const slug = record.category_slug?.trim();
  if (slug) {
    const category = await categoryBySlug(slug);
    if (!category) throw new DomainError("Категория не найдена");
    await assertLeafCategory(category.id);
    return category;
  }
  const name = record.category?.trim();
  if (!name) return null;
  const rows = await db.select().from(categories).where(sql`lower(${categories.name}) = lower(${name})`);
  if (rows.length === 0) throw new DomainError(`Категория «${name}» не найдена`);
  if (rows.length > 1) throw new DomainError(`Несколько категорий с названием «${name}»`);
  await assertLeafCategory(rows[0].id);
  return rows[0];
}

async function applySheetRow(userId: string, record: Record<string, string>) {
  const sku = record.sku?.trim().toUpperCase();
  if (!sku) throw new DomainError("Нет артикула");
  const existing = await db.query.nomenclature.findFirst({ where: eq(nomenclature.sku, sku) });
  const priceText = record.price ?? "";
  const price = priceText ? parseSheetPrice(priceText) : null;
  if (priceText && price === null) throw new DomainError("Цена указана неверно");
  const quantityText = record.quantity ?? "";
  const quantity = quantityText ? parseIntStrict(quantityText.replace(/\s/g, "")) : null;
  if (quantityText && quantity === null) throw new DomainError("Остаток указан неверно");
  const published = record.published ? parseYesNo(record.published) : null;
  const category = await categoryByLabel(record);
  const title = record.title?.trim() ?? "";
  const brand = record.brand ? await resolveBrandName(record.brand) : null;

  if (!existing) {
    if (!title) throw new DomainError("Нет названия");
    if (!category) throw new DomainError("Категория не найдена");
    if (price === null || price <= 0) throw new DomainError("Цена указана неверно");
    if (quantity === null) throw new DomainError("Остаток указан неверно");
    const [created] = await db
      .insert(nomenclature)
      .values({
        sku,
        categoryId: category.id,
        title,
        brandId: brand?.brandId ?? null,
        brand: brand?.brand ?? "",
        model: record.model?.trim() ?? "",
        description: readListingDescription(record.description ?? ""),
        priceKopeks: price,
        quantityOnHand: quantity,
        isPublished: published ?? false,
        city: "",
        updatedAt: new Date(),
      })
      .returning();
    await db.insert(stockMovements).values({
      nomenclatureId: created.id,
      delta: quantity,
      reason: "import",
      note: "Загрузка Excel",
      userId,
    });
    if (created.isPublished) await syncPublishedListing(db, created.id);
    return;
  }

  if (quantity !== null && quantity < existing.quantityReserved) {
    throw new DomainError("Остаток не покрывает резерв");
  }
  const patch: {
    updatedAt?: Date;
    title?: string;
    categoryId?: number;
    priceKopeks?: number;
    quantityOnHand?: number;
    isPublished?: boolean;
    brandId?: number | null;
    brand?: string;
    model?: string;
    year?: number | null;
    description?: string;
    compareAtKopeks?: number | null;
  } = {};
  if (title) patch.title = title;
  if (category) patch.categoryId = category.id;
  if (price !== null) patch.priceKopeks = price;
  if (quantity !== null) patch.quantityOnHand = quantity;
  if (published !== null) patch.isPublished = published;
  if (brand) {
    patch.brandId = brand.brandId;
    patch.brand = brand.brand;
  }
  if (record.model) patch.model = record.model.trim();
  if (record.year) {
    const year = parseIntStrict(record.year);
    if (year === null) throw new DomainError("Год указан неверно");
    patch.year = year;
  }
  if (record.description) patch.description = readListingDescription(record.description);
  if (record.compare_at_price) {
    const compareAt = parseSheetPrice(record.compare_at_price);
    if (compareAt === null) throw new DomainError("Старая цена указана неверно");
    patch.compareAtKopeks = compareAt;
  }
  const delta = quantity === null ? 0 : quantity - existing.quantityOnHand;
  if (Object.keys(patch).length === 0 && delta === 0) return;
  patch.updatedAt = new Date();
  await db.update(nomenclature).set(patch).where(eq(nomenclature.id, existing.id));
  if (delta !== 0) {
    await writeStockMovement(db, {
      nomenclatureId: existing.id,
      delta,
      reason: "import",
      note: "Загрузка Excel",
      userId,
    });
  }
  if ((published ?? existing.isPublished) || existing.isPublished) await syncPublishedListing(db, existing.id);
}

async function applyCorrection(userId: string, record: Record<string, string>) {
  const sku = record.sku?.trim().toUpperCase();
  if (!sku) throw new DomainError("Нет артикула");
  const price = parsePriceToKopeks(record.price ?? "");
  const quantity = parseIntStrict(record.quantity ?? "");
  if (price === null || price <= 0) throw new DomainError("Цена указана неверно");
  if (quantity === null) throw new DomainError("Остаток указан неверно");
  const item = await db.query.nomenclature.findFirst({ where: eq(nomenclature.sku, sku) });
  if (!item) throw new DomainError(`Артикул ${sku} не найден`);
  if (quantity < item.quantityReserved) {
    throw new DomainError("Остаток не покрывает резерв");
  }
  const delta = quantity - item.quantityOnHand;
  await db
    .update(nomenclature)
    .set({ priceKopeks: price, quantityOnHand: quantity, updatedAt: new Date() })
    .where(eq(nomenclature.id, item.id));
  if (delta !== 0) {
    await writeStockMovement(db, {
      nomenclatureId: item.id,
      delta,
      reason: "adjustment",
      note: "Корректировка CSV",
      userId,
    });
  }
  if (item.isPublished) await syncPublishedListing(db, item.id);
}

async function applyFull(userId: string, record: Record<string, string>) {
  const sku = record.sku?.trim().toUpperCase();
  if (!sku) throw new DomainError("Нет артикула");
  const title = record.title?.trim();
  if (!title) throw new DomainError("Нет названия");
  const category = await categoryBySlug(record.category_slug ?? "");
  if (!category) throw new DomainError("Категория не найдена");
  await assertLeafCategory(category.id);
  const brand = await resolveBrandName(record.brand ?? "");
  const price = parsePriceToKopeks(record.price ?? "");
  if (price === null || price <= 0) throw new DomainError("Цена указана неверно");
  const quantity = parseIntStrict(record.quantity ?? "");
  if (quantity === null) throw new DomainError("Остаток указан неверно");
  const compareRaw = record.compare_at_price?.trim() ?? "";
  const compareAt = compareRaw ? parsePriceToKopeks(compareRaw) : null;
  if (compareRaw && compareAt === null) throw new DomainError("Старая цена указана неверно");
  const yearRaw = record.year?.trim() ?? "";
  const year = yearRaw ? parseIntStrict(yearRaw) : null;
  if (yearRaw && year === null) throw new DomainError("Год указан неверно");

  const existing = await db.query.nomenclature.findFirst({ where: eq(nomenclature.sku, sku) });
  if (existing && quantity < existing.quantityReserved) {
    throw new DomainError("Остаток не покрывает резерв");
  }
  const values = {
    sku,
    categoryId: category.id,
    title,
    brandId: brand.brandId,
    brand: brand.brand,
    model: record.model?.trim() ?? "",
    year,
    description: readListingDescription(record.description ?? ""),
    priceKopeks: price,
    compareAtKopeks: compareAt,
    quantityOnHand: quantity,
    city: "",
    updatedAt: new Date(),
  };
  const onOrderRaw = record.on_order?.trim() || record.availability?.trim() || "";
  const onOrder = onOrderRaw ? readOnOrder(onOrderRaw) : null;
  if (onOrderRaw && onOrder === null) throw new DomainError("Наличие указано неверно: в наличии или на заказ");

  if (!existing) {
    const [created] = await db.insert(nomenclature).values({ ...values, onOrder: onOrder ?? false }).returning();
    await db.insert(stockMovements).values({
      nomenclatureId: created.id,
      delta: quantity,
      reason: "import",
      note: "Загрузка CSV",
      userId,
    });
    return;
  }

  const delta = quantity - existing.quantityOnHand;
  await db
    .update(nomenclature)
    .set({
      ...values,
      ...(onOrder === null ? {} : { onOrder }),
    })
    .where(eq(nomenclature.id, existing.id));
  if (delta !== 0) {
    await writeStockMovement(db, {
      nomenclatureId: existing.id,
      delta,
      reason: "import",
      note: "Загрузка CSV",
      userId,
    });
  }
  if (existing.isPublished) await syncPublishedListing(db, existing.id);
}

export async function saveNomenclatureItem(
  userId: string,
  id: string | null,
  input: {
    sku: string;
    categoryId: number;
    title: string;
    brandId: number | null;
    brand: string;
    model: string;
    year: number | null;
    description: string;
    priceKopeks: number;
    compareAtKopeks: number | null;
    logisticsKopeks?: number | null;
    leadTime?: string;
    quantityOnHand: number;
    onOrder: boolean;
    publish: boolean;
    attributes: { attributeDefId: number; valueNumber: number | null; valueText?: string | null }[];
  },
) {
  const sku = input.sku.trim().toUpperCase();
  if (!sku) throw new DomainError("Укажите артикул");
  if (input.title.trim().length < 3) throw new DomainError("Укажите название");
  if (input.model.length > textInputLimit) throw new DomainError(`Модель — не больше ${textInputLimit} символов`);
  const description = readListingDescription(input.description);
  if (input.quantityOnHand < 0) throw new DomainError("Остаток не может быть отрицательным");

  const duplicate = await db.query.nomenclature.findFirst({ where: eq(nomenclature.sku, sku) });
  if (duplicate && duplicate.id !== id) throw new DomainError("Такой артикул уже есть");

  if (!id) {
    const [created] = await db
      .insert(nomenclature)
      .values({
        sku,
        categoryId: input.categoryId,
        title: input.title.trim(),
        brandId: input.brandId,
        brand: input.brand,
        model: input.model,
        year: input.year,
        description,
        priceKopeks: input.priceKopeks,
        compareAtKopeks: input.compareAtKopeks,
        logisticsKopeks: input.logisticsKopeks ?? null,
        leadTime: input.leadTime ?? "",
        quantityOnHand: input.quantityOnHand,
        city: "",
        onOrder: input.onOrder,
        isPublished: input.publish,
      })
      .returning();
    await replaceNomenclatureAttributes(db, created.id, input.attributes);
    await writeStockMovement(db, {
      nomenclatureId: created.id,
      delta: input.quantityOnHand,
      reason: "manual",
      note: "Создание карточки",
      userId,
    });
    if (input.publish) await syncPublishedListing(db, created.id);
    return created.id;
  }

  const current = await db.query.nomenclature.findFirst({ where: eq(nomenclature.id, id) });
  if (!current) throw new DomainError("Позиция не найдена");
  if (input.quantityOnHand < current.quantityReserved) {
    throw new DomainError("Остаток не покрывает резерв");
  }
  const delta = input.quantityOnHand - current.quantityOnHand;
  await db
    .update(nomenclature)
    .set({
      sku,
      categoryId: input.categoryId,
      title: input.title.trim(),
      brandId: input.brandId,
      brand: input.brand,
      model: input.model,
      year: input.year,
      description,
      priceKopeks: input.priceKopeks,
      compareAtKopeks: input.compareAtKopeks,
      logisticsKopeks: input.logisticsKopeks ?? null,
      leadTime: input.leadTime ?? "",
      quantityOnHand: input.quantityOnHand,
      city: "",
      onOrder: input.onOrder,
      isPublished: input.publish,
      archivedAt: input.publish ? null : current.archivedAt,
      updatedAt: new Date(),
    })
    .where(eq(nomenclature.id, id));
  await replaceNomenclatureAttributes(db, id, input.attributes);
  if (delta !== 0) {
    await writeStockMovement(db, {
      nomenclatureId: id,
      delta,
      reason: "manual",
      note: "Правка карточки",
      userId,
    });
  }
  await syncPublishedListing(db, id);
  return id;
}

async function syncCards(ids: string[]) {
  for (const id of ids) await syncPublishedListing(db, id);
}

export async function archiveNomenclature(ids: string[]) {
  const rows = await db
    .update(nomenclature)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(inArray(nomenclature.id, ids), isNull(nomenclature.archivedAt), isNull(nomenclature.deletedAt)))
    .returning({ id: nomenclature.id });
  await syncCards(rows.map((row) => row.id));
}

export async function restoreNomenclature(ids: string[]) {
  const rows = await db
    .update(nomenclature)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(inArray(nomenclature.id, ids), isNotNull(nomenclature.archivedAt), isNull(nomenclature.deletedAt)))
    .returning({ id: nomenclature.id });
  await syncCards(rows.map((row) => row.id));
}

async function rowsForDelete(ids: string[]) {
  const rows = await db
    .select({
      id: nomenclature.id,
      sku: nomenclature.sku,
      archivedAt: nomenclature.archivedAt,
      deletedAt: nomenclature.deletedAt,
      quantityReserved: nomenclature.quantityReserved,
    })
    .from(nomenclature)
    .where(inArray(nomenclature.id, ids));
  if (rows.length === 0) throw new DomainError("Карточки не найдены");
  const reserved = rows.filter((row) => row.quantityReserved > 0).map((row) => row.sku);
  if (reserved.length > 0) throw new DomainError(`В резерве: ${reserved.join(", ")}`);
  return rows;
}

export async function deleteNomenclature(ids: string[]) {
  const rows = await rowsForDelete(ids);
  if (rows.some((row) => row.deletedAt)) throw new DomainError("Карточка уже удалена");
  const hidden = await db
    .update(nomenclature)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(inArray(nomenclature.id, ids), isNull(nomenclature.deletedAt)))
    .returning({ id: nomenclature.id });
  await syncCards(hidden.map((row) => row.id));
}

export async function purgeNomenclature(ids: string[]) {
  const rows = await rowsForDelete(ids);
  if (rows.some((row) => !row.archivedAt || row.deletedAt)) throw new DomainError("Удалить можно только из архива");

  const hidden = await db
    .update(nomenclature)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(inArray(nomenclature.id, ids), isNotNull(nomenclature.archivedAt), isNull(nomenclature.deletedAt)))
    .returning({ id: nomenclature.id });
  await syncCards(hidden.map((row) => row.id));
}

export { availableOf };
