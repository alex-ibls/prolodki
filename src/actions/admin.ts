"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customers, listings, nomenclature, users } from "@/db/schema";
import { DomainError, isNextNavigation } from "@/lib/errors";
import type { NomenclatureSaveState } from "@/lib/nomenclature-save";
import { parseIntStrict, parsePriceToKopeks } from "@/lib/format";
import { readOnOrder } from "@/lib/labels";
import { requireManager, runAction } from "@/lib/guards";
import { saveNomenclatureKit } from "@/lib/kit";
import { defsForCategory, readAttributeValues, readLogisticsAndLead } from "@/lib/listings";
import { assertLeafCategory, ensureBrandName } from "@/lib/taxonomy";
import { importNomenclatureSheet, saveNomenclatureItem, type ImportReport } from "@/lib/nomenclature";
import { attachNomenclaturePhotos, reorderNomenclaturePhotos } from "@/lib/photos";

export async function moderateAction(formData: FormData) {
  await runAction("/admin/moderation", async (user) => {
    if (user.staffRole !== "moderator" && user.staffRole !== "manager") {
      throw new DomainError("Недостаточно прав");
    }
    const id = String(formData.get("id") || "");
    const decision = String(formData.get("decision") || "");
    const reason = String(formData.get("reason") || "").trim();
    if (decision === "reject" && reason.length < 3) throw new DomainError("Укажите причину отклонения");
    const status = decision === "approve" ? "published" : "rejected";
    const updated = await db
      .update(listings)
      .set({
        status,
        rejectionReason: decision === "approve" ? "" : reason,
        updatedAt: new Date(),
      })
      .where(and(eq(listings.id, id), eq(listings.status, "pending_review")))
      .returning();
    if (updated.length === 0) throw new DomainError("Товар уже разобран");
    redirect("/admin/moderation");
  });
}

export async function createCustomerAction(formData: FormData) {
  await runAction("/admin/crm/customers/new", async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("CRM доступна менеджеру");
    const name = String(formData.get("name") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    if (name.length < 2 || phone.length < 6) throw new DomainError("Укажите имя и телефон");
    const [customer] = await db
      .insert(customers)
      .values({
        name,
        phone,
        email: String(formData.get("email") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        notes: String(formData.get("notes") || "").trim(),
        source: "manual",
      })
      .returning();
    redirect(`/admin/crm/customers/${customer.id}`);
  });
}

export async function updateCustomerAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  await runAction(`/admin/crm/customers/${id}`, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("CRM доступна менеджеру");
    await db
      .update(customers)
      .set({
        name: String(formData.get("name") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        city: String(formData.get("city") || "").trim(),
        notes: String(formData.get("notes") || "").trim(),
      })
      .where(eq(customers.id, id));
    redirect(`/admin/crm/customers/${id}?saved=1`);
  });
}

function nomenclatureInput(formData: FormData) {
  const price = parsePriceToKopeks(String(formData.get("price") || ""));
  const compareRaw = String(formData.get("compareAt") || "").trim();
  const compareAt = compareRaw ? parsePriceToKopeks(compareRaw) : null;
  const yearRaw = String(formData.get("year") || "").trim();
  const year = yearRaw ? parseIntStrict(yearRaw) : null;
  const quantity = parseIntStrict(String(formData.get("quantity") || ""));
  if (price === null || price <= 0) throw new DomainError("Укажите цену");
  if (compareRaw && compareAt === null) throw new DomainError("Старая цена указана неверно");
  if (yearRaw && year === null) throw new DomainError("Год указан неверно");
  if (quantity === null) throw new DomainError("Укажите остаток");
  return { price, compareAt, year, quantity };
}

async function recoverCreatedId(formData: FormData, message: string) {
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  if (!sku) return null;
  const row = await db.query.nomenclature.findFirst({ where: eq(nomenclature.sku, sku) });
  if (!row || message === "Такой артикул уже есть") return null;
  if (Date.now() - row.createdAt.getTime() < 2 * 60 * 1000) return row.id;
  return null;
}

export async function saveNomenclatureAction(
  _prev: NomenclatureSaveState,
  formData: FormData,
): Promise<NomenclatureSaveState> {
  const user = await requireManager();
  let id = String(formData.get("id") || "") || null;
  try {
    if (user.staffRole !== "manager") throw new DomainError("Номенклатура доступна менеджеру");
    const categoryId = Number(formData.get("categoryId"));
    if (!categoryId) throw new DomainError("Выберите категорию");
    await assertLeafCategory(categoryId);
    const brand = await ensureBrandName(String(formData.get("brand") || ""));
    const parsed = nomenclatureInput(formData);
    const defs = await defsForCategory(categoryId);
    id = await saveNomenclatureItem(user.id, id, {
      sku: String(formData.get("sku") || ""),
      categoryId,
      title: String(formData.get("title") || ""),
      brandId: brand.brandId,
      brand: brand.brand,
      model: String(formData.get("model") || "").trim(),
      year: parsed.year,
      description: String(formData.get("description") || "").trim(),
      priceKopeks: parsed.price,
      compareAtKopeks: parsed.compareAt,
      ...readLogisticsAndLead(formData, parsePriceToKopeks),
      quantityOnHand: parsed.quantity,
      onOrder: (() => {
        const onOrder = readOnOrder(String(formData.get("onOrder") || ""));
        if (onOrder === null) throw new DomainError("Укажите, в наличии или на заказ");
        return onOrder;
      })(),
      publish: formData.get("publish") === "on",
      attributes: readAttributeValues(formData, defs),
    });
    await saveNomenclatureKit(id, formData);
    await attachNomenclaturePhotos(id, formData);
    revalidatePath("/admin/nomenclature");
    revalidatePath(`/admin/nomenclature/${id}`);
    revalidatePath("/");
    const [listing] = await db
      .select({ slug: listings.slug })
      .from(listings)
      .where(eq(listings.nomenclatureId, id))
      .limit(1);
    if (listing && !listing.slug.includes("/")) revalidatePath(`/product/${listing.slug}`);
    return { id, href: "/admin/nomenclature?saved=card", error: null, nonce: crypto.randomUUID() };
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    const message = error instanceof DomainError ? error.message : "Не получилось сохранить карточку";
    const target = id ?? (await recoverCreatedId(formData, message));
    return { id: target, href: null, error: message, nonce: crypto.randomUUID() };
  }
}

export type ImportState = ImportReport | { error: string } | null;

export async function importWorkbookAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireManager();
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new DomainError("Выберите файл Excel");
    if (!file.name.toLowerCase().endsWith(".xlsx")) throw new DomainError("Нужен файл Excel .xlsx");
    const { readXlsxBuffer } = await import("@/lib/xlsx-table");
    const records = readXlsxBuffer(Buffer.from(await file.arrayBuffer()));
    return await importNomenclatureSheet(user.id, records);
  } catch (error) {
    return { error: error instanceof DomainError ? error.message : "Не удалось прочитать файл" };
  }
}

export async function reorderNomenclaturePhotosAction(nomenclatureId: string, ids: string[]) {
  try {
    await requireManager();
    if (!nomenclatureId || ids.length === 0) return { error: null };
    await reorderNomenclaturePhotos(nomenclatureId, ids);
    revalidatePath("/");
    const [listing] = await db
      .select({ slug: listings.slug })
      .from(listings)
      .where(eq(listings.nomenclatureId, nomenclatureId))
      .limit(1);
    if (listing && !listing.slug.includes("/")) revalidatePath(`/product/${listing.slug}`);
    return { error: null };
  } catch (error) {
    if (isNextNavigation(error)) throw error;
    return { error: error instanceof DomainError ? error.message : "Не получилось сохранить порядок" };
  }
}

export async function loadManagers() {
  await requireManager();
  return db.select().from(users).where(eq(users.staffRole, "manager"));
}
