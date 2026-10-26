import { eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, nomenclature, stockMovements } from "@/db/schema";
import { csvRecords } from "@/lib/csv";
import { readListingDescription } from "@/lib/description";
import { DomainError } from "@/lib/errors";
import { parseIntStrict, parsePriceToKopeks } from "@/lib/format";
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
    city: record.city?.trim() || "Химки",
    updatedAt: new Date(),
  };

  if (!existing) {
    const [created] = await db.insert(nomenclature).values(values).returning();
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
  await db.update(nomenclature).set(values).where(eq(nomenclature.id, existing.id));
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
    quantityOnHand: number;
    city: string;
    publish: boolean;
    attributes: { attributeDefId: number; valueNumber: number }[];
  },
) {
  const sku = input.sku.trim().toUpperCase();
  if (!sku) throw new DomainError("Укажите артикул");
  if (input.title.trim().length < 3) throw new DomainError("Укажите название");
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
        quantityOnHand: input.quantityOnHand,
        city: input.city,
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
      quantityOnHand: input.quantityOnHand,
      city: input.city,
      isPublished: input.publish,
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

export { availableOf };
