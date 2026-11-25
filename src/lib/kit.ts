import { and, asc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { kitItems, nomenclature, nomenclatureKitGroups, nomenclatureKitLinks } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { deleteStored, savePhoto } from "@/lib/uploads";

export type KitKind = "fit" | "extra";

export type KitChoice = {
  id: string;
  sku: string;
  name: string;
  priceKopeks: number;
  imagePath: string;
};

export type KitGroup = {
  id: string;
  name: string;
  kind: KitKind;
  items: KitChoice[];
};

type DraftItem = { id?: string; name?: string; priceRub?: string; fileKey?: string };
type DraftGroup = { name?: string; kind?: string; items?: DraftItem[] };

export async function listKitLibrary(query = "") {
  const needle = query.trim().replace(/[%_]/g, "");
  const where = needle
    ? or(ilike(kitItems.sku, `%${needle}%`), ilike(kitItems.name, `%${needle}%`))
    : undefined;
  return db.select().from(kitItems).where(where).orderBy(asc(kitItems.kind), asc(kitItems.sku), asc(kitItems.name));
}

function liveKitLinks(itemId?: string) {
  return db
    .select({ itemId: nomenclatureKitLinks.itemId, n: sql<number>`count(*)::int` })
    .from(nomenclatureKitLinks)
    .innerJoin(nomenclatureKitGroups, eq(nomenclatureKitLinks.groupId, nomenclatureKitGroups.id))
    .innerJoin(nomenclature, eq(nomenclatureKitGroups.nomenclatureId, nomenclature.id))
    .where(and(isNull(nomenclature.deletedAt), itemId ? eq(nomenclatureKitLinks.itemId, itemId) : undefined))
    .groupBy(nomenclatureKitLinks.itemId);
}

export async function kitUsageCounts() {
  const rows = await liveKitLinks();
  return new Map(rows.map((row) => [row.itemId, Number(row.n)]));
}

export async function saveKitCatalogItem(formData: FormData) {
  const id = String(formData.get("id") || "").trim();
  const kind = formData.get("kind") === "extra" ? "extra" : formData.get("kind") === "fit" ? "fit" : null;
  if (!kind) throw new DomainError("Укажите тип: исполнение или дополнительное оборудование");
  const sku = String(formData.get("sku") || "").trim().toUpperCase();
  if (!sku) throw new DomainError("Укажите артикул");
  if (sku.length > 40) throw new DomainError("Артикул — не больше 40 символов");
  if (/[./\\?#%\s]/.test(sku)) throw new DomainError("Артикул без пробелов и символов / . ? # %");
  const name = String(formData.get("name") || "").trim();
  if (!name) throw new DomainError("Укажите название");
  if (name.length > 80) throw new DomainError("Название — не больше 80 символов");
  const priceKopeks = readKitPrice(String(formData.get("priceRub") || ""));
  const duplicate = await db.query.kitItems.findFirst({ where: eq(kitItems.sku, sku) });
  if (duplicate && duplicate.id !== id) throw new DomainError("Такой артикул уже есть");
  const current = id ? await db.query.kitItems.findFirst({ where: eq(kitItems.id, id) }) : null;
  if (id && !current) throw new DomainError("Элемент не найден");
  if (current && current.kind !== kind && (await kitLinkCount(current.id)) > 0) {
    throw new DomainError("Тип нельзя сменить: элемент уже выбран в карточках");
  }
  const file = formData.get("image");
  let imagePath = current?.imagePath ?? "";
  if (file instanceof File && file.size > 0) {
    const stored = await savePhoto("kit", file);
    if (stored) imagePath = stored;
  }
  if (!current) {
    const [created] = await db.insert(kitItems).values({ kind, sku, name, priceKopeks, imagePath }).returning();
    if (!created) throw new DomainError("Не получилось сохранить элемент");
    return created;
  }
  const [updated] = await db
    .update(kitItems)
    .set({ kind, sku, name, priceKopeks, imagePath })
    .where(eq(kitItems.id, current.id))
    .returning();
  if (!updated) throw new DomainError("Не получилось сохранить элемент");
  if (imagePath !== current.imagePath && current.imagePath) await deleteStored(current.imagePath);
  return updated;
}

export async function getKitCatalogItem(id: string) {
  return db.query.kitItems.findFirst({ where: eq(kitItems.id, id) });
}

export async function kitItemUsage(id: string) {
  return kitLinkCount(id);
}

export async function deleteKitCatalogItem(id: string) {
  const item = await db.query.kitItems.findFirst({ where: eq(kitItems.id, id) });
  if (!item) throw new DomainError("Элемент не найден");
  const used = await kitLinkCount(id);
  if (used > 0) throw new DomainError(`«${item.name}» выбран в карточках (${used}). Сначала уберите его из групп.`);
  await db.delete(nomenclatureKitLinks).where(eq(nomenclatureKitLinks.itemId, id));
  if (item.imagePath) await deleteStored(item.imagePath);
  await db.delete(kitItems).where(eq(kitItems.id, id));
}

async function kitLinkCount(id: string) {
  const [row] = await liveKitLinks(id);
  return Number(row?.n ?? 0);
}

export async function kitForNomenclature(nomenclatureId: string): Promise<KitGroup[]> {
  const groups = await db
    .select()
    .from(nomenclatureKitGroups)
    .where(eq(nomenclatureKitGroups.nomenclatureId, nomenclatureId))
    .orderBy(asc(nomenclatureKitGroups.sort), asc(nomenclatureKitGroups.name));
  if (groups.length === 0) return [];
  const links = await db
    .select()
    .from(nomenclatureKitLinks)
    .where(inArray(nomenclatureKitLinks.groupId, groups.map((group) => group.id)));
  const itemIds = [...new Set(links.map((link) => link.itemId))];
  const items = itemIds.length ? await db.select().from(kitItems).where(inArray(kitItems.id, itemIds)) : [];
  const byId = new Map(items.map((item) => [item.id, item]));
  return groups.map((group) => ({
    id: group.id,
    name: group.name,
    kind: group.kind === "extra" ? "extra" : "fit",
    items: links
      .filter((link) => link.groupId === group.id)
      .sort((a, b) => a.sort - b.sort)
      .flatMap((link) => {
        const item = byId.get(link.itemId);
        if (!item) return [];
        return [{ id: item.id, sku: item.sku, name: item.name, priceKopeks: item.priceKopeks, imagePath: item.imagePath }];
      }),
  }));
}

export async function saveNomenclatureKit(nomenclatureId: string, formData: FormData) {
  const raw = String(formData.get("kitJson") || "").trim();
  if (!raw) return;
  let payload: DraftGroup[];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("shape");
    payload = parsed;
  } catch {
    throw new DomainError("Конфигуратор заполнен неверно");
  }
  const library = await db.select().from(kitItems);
  const byId = new Map(library.map((item) => [item.id, item]));
  const prepared: { name: string; kind: KitKind; itemIds: string[] }[] = [];
  for (const group of payload) {
    const name = String(group.name || "").trim();
    const kind = group.kind === "extra" ? "extra" : group.kind === "fit" ? "fit" : null;
    const items = Array.isArray(group.items) ? group.items : [];
    if (!name && items.length === 0) continue;
    if (!name) throw new DomainError("Укажите название группы конфигуратора");
    if (name.length > 80) throw new DomainError("Название группы — не больше 80 символов");
    if (!kind) throw new DomainError("Укажите тип группы: исполнение или дополнительное оборудование");
    const itemIds: string[] = [];
    for (const item of items) {
      if (item.id) {
        const found = byId.get(item.id);
        if (!found || found.kind !== kind) throw new DomainError("Элемент комплектации не найден");
        const itemName = String(item.name || "").trim();
        if (!itemName) throw new DomainError("Укажите название элемента");
        if (itemName.length > 80) throw new DomainError("Название элемента — не больше 80 символов");
        const priceKopeks = readKitPrice(String(item.priceRub || ""));
        const fileKey = String(item.fileKey || "");
        const file = fileKey ? formData.get(`kitFile:${fileKey}`) : null;
        let imagePath = found.imagePath;
        if (file instanceof File && file.size > 0) {
          const stored = await savePhoto("kit", file);
          if (stored) imagePath = stored;
        }
        if (found.name !== itemName || found.priceKopeks !== priceKopeks || found.imagePath !== imagePath) {
          await db.update(kitItems).set({ name: itemName, priceKopeks, imagePath }).where(eq(kitItems.id, found.id));
          if (imagePath !== found.imagePath && found.imagePath) await deleteStored(found.imagePath);
          const next = { ...found, name: itemName, priceKopeks, imagePath };
          byId.set(found.id, next);
        }
        if (!itemIds.includes(found.id)) itemIds.push(found.id);
        continue;
      }
      throw new DomainError("Добавьте элемент из каталога комплектаций");
    }
    if (itemIds.length === 0) throw new DomainError(`Добавьте элементы в группу «${name}»`);
    prepared.push({ name, kind, itemIds });
  }
  await db.delete(nomenclatureKitGroups).where(eq(nomenclatureKitGroups.nomenclatureId, nomenclatureId));
  let sort = 0;
  for (const group of prepared) {
    const [created] = await db
      .insert(nomenclatureKitGroups)
      .values({ nomenclatureId, name: group.name, kind: group.kind, sort })
      .returning();
    sort += 1;
    let itemSort = 0;
    for (const itemId of group.itemIds) {
      await db.insert(nomenclatureKitLinks).values({ groupId: created.id, itemId, sort: itemSort });
      itemSort += 1;
    }
  }
}

export async function quoteKit(nomenclatureId: string | null, options: string) {
  const ids = [...new Set(options.split(",").map((item) => item.trim()).filter(Boolean))];
  if (ids.length === 0) {
    return { extraKopeks: 0, names: [] as string[], ids: [] as string[], lines: [] as { name: string; priceKopeks: number }[] };
  }
  if (!nomenclatureId) throw new DomainError("Комплектация для этого товара недоступна");
  const groups = await kitForNomenclature(nomenclatureId);
  const placed = new Map<string, { groupId: string; kind: KitKind; name: string; priceKopeks: number }>();
  for (const group of groups) {
    for (const item of group.items) {
      placed.set(item.id, { groupId: group.id, kind: group.kind, name: item.name, priceKopeks: item.priceKopeks });
    }
  }
  for (const group of groups) {
    const chosen = ids.filter((id) => group.items.some((item) => item.id === id));
    if (group.kind === "fit" && chosen.length > 1) {
      throw new DomainError(`В группе «${group.name}» можно выбрать одно исполнение`);
    }
  }
  const names: string[] = [];
  const lines: { name: string; priceKopeks: number }[] = [];
  let extraKopeks = 0;
  for (const id of ids) {
    const item = placed.get(id);
    if (!item) throw new DomainError("Выбранный элемент комплектации больше недоступен");
    names.push(item.name);
    lines.push({ name: item.name, priceKopeks: item.priceKopeks });
    extraKopeks += item.priceKopeks;
  }
  return { extraKopeks, names, ids, lines };
}

function readKitPrice(raw: string) {
  const cleaned = raw.trim().replace(/\s/g, "");
  if (!/^\d+$/.test(cleaned)) throw new DomainError("Стоимость элемента — целое число рублей, можно 0");
  return Number(cleaned) * 100;
}
