"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { customers, deals, listings, nomenclature, orderItems } from "@/db/schema";
import { removeBrand, removeCategory } from "@/lib/admin-mutations";
import { allCategories } from "@/lib/catalog";
import { DomainError } from "@/lib/errors";
import { runAction } from "@/lib/guards";
import { transitionLine } from "@/lib/orders";
import { companyOrg, syncPublishedListing } from "@/lib/stock";
import { categoryChain } from "@/lib/taxonomy";

const dealStatuses = ["new", "in_progress", "invoiced", "won", "lost"] as const;
const lineStatuses = ["confirmed", "completed", "cancelled"] as const;

function readIds(formData: FormData) {
  const ids = [...new Set(formData.getAll("id").map(String).map((item) => item.trim()).filter(Boolean))];
  if (ids.length === 0) throw new DomainError("Выберите строки");
  if (ids.length > 200) throw new DomainError("За один раз можно обработать не больше 200 строк");
  return ids;
}

function numericIds(ids: string[]) {
  const values = ids.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (values.length === 0) throw new DomainError("Выберите строки");
  return values;
}

function cleanBack(raw: unknown, fallback: string) {
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

export async function bulkCustomersAction(formData: FormData) {
  const back = cleanBack(formData.get("back"), "/admin/crm");
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("CRM доступна менеджеру");
    if (formData.get("op") !== "delete") throw new DomainError("Неизвестное действие");
    const ids = readIds(formData);
    const linked = await db.select({ customerId: deals.customerId }).from(deals).where(inArray(deals.customerId, ids));
    if (linked.length > 0) throw new DomainError("Сначала уберите сделки выбранных клиентов");
    await db.delete(customers).where(inArray(customers.id, ids));
    redirect(withSaved(back));
  });
}

export async function bulkDealsAction(formData: FormData) {
  const back = cleanBack(formData.get("back"), "/admin/crm/deals");
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("CRM доступна менеджеру");
    const status = String(formData.get("op") || "");
    if (!(dealStatuses as readonly string[]).includes(status)) throw new DomainError("Неизвестный статус");
    const ids = readIds(formData);
    await db
      .update(deals)
      .set({ status: status as (typeof dealStatuses)[number], updatedAt: new Date() })
      .where(inArray(deals.id, ids));
    redirect(withSaved(back));
  });
}

export async function bulkCatalogAction(formData: FormData) {
  const back = cleanBack(formData.get("back"), "/admin/catalog");
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Каталог доступен менеджеру");
    if (formData.get("op") !== "delete") throw new DomainError("Неизвестное действие");
    const ids = numericIds(readIds(formData));
    const all = await allCategories();
    const selected = new Set(ids);
    const ranked = [...ids].sort((a, b) => categoryChain(all, all.find((item) => item.id === b)?.slug).length - categoryChain(all, all.find((item) => item.id === a)?.slug).length);
    for (const id of ranked) await removeCategory(id, selected);
    redirect(withSaved(back));
  });
}

export async function bulkBrandsAction(formData: FormData) {
  const back = cleanBack(formData.get("back"), "/admin/brands");
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Бренды доступны менеджеру");
    if (formData.get("op") !== "delete") throw new DomainError("Неизвестное действие");
    const ids = numericIds(readIds(formData));
    for (const id of ids) await removeBrand(id);
    redirect(withSaved(back));
  });
}

export async function bulkNomenclatureAction(formData: FormData) {
  const back = cleanBack(formData.get("back"), "/admin/nomenclature");
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Номенклатура доступна менеджеру");
    const op = String(formData.get("op") || "");
    if (op !== "publish" && op !== "unpublish") throw new DomainError("Неизвестное действие");
    const ids = readIds(formData);
    await db
      .update(nomenclature)
      .set({ isPublished: op === "publish", updatedAt: new Date() })
      .where(inArray(nomenclature.id, ids));
    for (const id of ids) await syncPublishedListing(db, id);
    redirect(withSaved(back));
  });
}

export async function bulkOrdersAction(formData: FormData) {
  const back = cleanBack(formData.get("back"), "/admin/orders");
  await runAction(back, async (user) => {
    if (user.staffRole !== "manager") throw new DomainError("Заказы доступны менеджеру");
    const op = String(formData.get("op") || "");
    if (!(lineStatuses as readonly string[]).includes(op)) throw new DomainError("Неизвестное действие");
    const next = op as (typeof lineStatuses)[number];
    const ids = readIds(formData);
    const org = await companyOrg();
    const lines = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(inArray(orderItems.orderId, ids), eq(orderItems.organizationId, org.id)));
    let changed = 0;
    let reason = "Нет строк в подходящем статусе";
    for (const line of lines) {
      try {
        await transitionLine(user, line.id, next);
        changed += 1;
      } catch (error) {
        if (error instanceof DomainError) reason = error.message;
        else throw error;
      }
    }
    if (changed === 0) throw new DomainError(reason);
    redirect(withSaved(back));
  });
}

export async function bulkModerationAction(formData: FormData) {
  const back = cleanBack(formData.get("back"), "/admin/moderation");
  await runAction(back, async (user) => {
    if (user.staffRole !== "moderator" && user.staffRole !== "manager") throw new DomainError("Недостаточно прав");
    const op = String(formData.get("op") || "");
    const ids = readIds(formData);
    const reason = String(formData.get("reason") || "").trim();
    if (op === "reject" && reason.length < 3) throw new DomainError("Укажите причину отклонения");
    if (op !== "approve" && op !== "reject") throw new DomainError("Неизвестное действие");
    const updated = await db
      .update(listings)
      .set({
        status: op === "approve" ? "published" : "rejected",
        rejectionReason: op === "approve" ? "" : reason,
        updatedAt: new Date(),
      })
      .where(and(inArray(listings.id, ids), eq(listings.status, "pending_review")))
      .returning({ id: listings.id });
    if (updated.length === 0) throw new DomainError("Объявления уже разобраны");
    redirect(withSaved(back));
  });
}
