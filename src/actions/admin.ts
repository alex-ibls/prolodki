"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customers, dealNotes, deals, listings, users } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { parseIntStrict, parsePriceToKopeks } from "@/lib/format";
import { requireManager, runAction } from "@/lib/guards";
import { defsForCategory, readAttributeValues } from "@/lib/listings";
import { assertLeafCategory, resolveBrandId } from "@/lib/taxonomy";
import { importNomenclatureCsv, saveNomenclatureItem, type ImportReport } from "@/lib/nomenclature";

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
    if (updated.length === 0) throw new DomainError("Объявление уже разобрано");
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

export async function createDealAction(formData: FormData) {
  const customerId = String(formData.get("customerId") || "");
  await runAction(`/admin/crm/customers/${customerId}`, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("CRM доступна менеджеру");
    const title = String(formData.get("title") || "").trim();
    const amount = parsePriceToKopeks(String(formData.get("amount") || "0"));
    if (title.length < 2 || amount === null) throw new DomainError("Укажите название и сумму сделки");
    const [deal] = await db
      .insert(deals)
      .values({
        customerId,
        title,
        amountKopeks: amount,
        assigneeId: user.id,
        status: "new",
      })
      .returning();
    redirect(`/admin/crm/deals/${deal.id}`);
  });
}

export async function updateDealAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  await runAction(`/admin/crm/deals/${id}`, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("CRM доступна менеджеру");
    const status = String(formData.get("status") || "");
    const allowed = ["new", "in_progress", "invoiced", "won", "lost"];
    if (!allowed.includes(status)) throw new DomainError("Неизвестный статус");
    const assigneeRaw = String(formData.get("assigneeId") || "");
    await db
      .update(deals)
      .set({
        status: status as "new" | "in_progress" | "invoiced" | "won" | "lost",
        assigneeId: assigneeRaw || null,
        comment: String(formData.get("comment") || "").trim(),
        title: String(formData.get("title") || "").trim(),
        updatedAt: new Date(),
      })
      .where(eq(deals.id, id));
    redirect(`/admin/crm/deals/${id}?saved=1`);
  });
}

export async function addDealNoteAction(formData: FormData) {
  const id = String(formData.get("id") || "");
  await runAction(`/admin/crm/deals/${id}`, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("CRM доступна менеджеру");
    const body = String(formData.get("body") || "").trim();
    if (body.length < 2) throw new DomainError("Заметка пустая");
    await db.insert(dealNotes).values({ dealId: id, authorId: user.id, body });
    redirect(`/admin/crm/deals/${id}`);
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

export async function saveNomenclatureAction(formData: FormData) {
  const id = String(formData.get("id") || "") || null;
  const back = id ? `/admin/nomenclature/${id}` : "/admin/nomenclature/new";
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Номенклатура доступна менеджеру");
    const categoryId = Number(formData.get("categoryId"));
    if (!categoryId) throw new DomainError("Выберите категорию");
    await assertLeafCategory(categoryId);
    const brand = await resolveBrandId(String(formData.get("brandId") || ""));
    const parsed = nomenclatureInput(formData);
    const defs = await defsForCategory(categoryId);
    const saved = await saveNomenclatureItem(user.id, id, {
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
      quantityOnHand: parsed.quantity,
      city: String(formData.get("city") || "").trim() || "Химки",
      publish: formData.get("publish") === "on",
      attributes: readAttributeValues(formData, defs),
    });
    redirect(`/admin/nomenclature/${saved}?saved=1`);
  });
}

export type ImportState = ImportReport | { error: string } | null;

export async function importCsvAction(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireManager();
  try {
    const file = formData.get("file");
    let text = String(formData.get("csv") || "");
    if (file instanceof File && file.size > 0) text = await file.text();
    const mode = formData.get("mode") === "correction" ? "correction" : "full";
    return await importNomenclatureCsv(user.id, text, mode);
  } catch (error) {
    return { error: error instanceof DomainError ? error.message : "Не удалось прочитать файл" };
  }
}

export async function loadManagers() {
  await requireManager();
  return db.select().from(users).where(eq(users.staffRole, "manager"));
}
