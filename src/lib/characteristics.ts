import { and, asc, eq, inArray } from "drizzle-orm";
import { readCharacteristicIcon } from "@/components/spec-icon";
import { db } from "@/db";
import { attributeDefs, categories, listingAttributes, nomenclatureAttributes } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { parseIntStrict } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { ancestorChainIds } from "@/lib/taxonomy";

type Characteristic = typeof attributeDefs.$inferSelect;

type Draft = {
  id: number;
  name: string;
  unit: string;
  dataType: "number" | "text";
  sort: number;
  icon: string;
  filterable: boolean;
  featured: boolean;
  remove: boolean;
};

function readType(raw: string): "number" | "text" {
  if (raw === "text" || raw === "number") return raw;
  throw new DomainError("Укажите тип характеристики: число или текст");
}

function readSort(raw: string) {
  const text = raw.trim();
  if (!text) return 0;
  const sort = parseIntStrict(text);
  if (sort === null) throw new DomainError("Порядок характеристики — целое число");
  return sort;
}

function readName(raw: string) {
  const name = raw.trim();
  if (name.length < 2) throw new DomainError("Укажите название характеристики");
  if (name.length > 80) throw new DomainError("Название характеристики — не больше 80 символов");
  return name;
}

function readIcon(raw: string) {
  const icon = readCharacteristicIcon(raw);
  if (icon === null) throw new DomainError("Выберите иконку из списка");
  return icon;
}

function readUnit(raw: string) {
  const unit = raw.trim();
  if (unit.length > 16) throw new DomainError("Единица измерения — не больше 16 символов");
  return unit;
}

function readDrafts(formData: FormData, withFilter: boolean): { rows: Draft[]; created: Omit<Draft, "id" | "remove"> | null } {
  const ids = formData.getAll("defId").map(String);
  const names = formData.getAll("defName").map(String);
  const units = formData.getAll("defUnit").map(String);
  const types = formData.getAll("defType").map(String);
  const sorts = formData.getAll("defSort").map(String);
  const icons = formData.getAll("defIcon").map(String);
  if (ids.length !== names.length || ids.length !== units.length || ids.length !== types.length || ids.length !== sorts.length || ids.length !== icons.length) {
    throw new DomainError("Не удалось прочитать характеристики");
  }
  if (ids.length > 80) throw new DomainError("Слишком много характеристик");
  const filters = new Set(formData.getAll("defFilter").map(String));
  const featured = new Set(formData.getAll("defFeatured").map(String));
  const removed = new Set(formData.getAll("defDelete").map(String));
  const rows = ids.map((id, index) => {
    const numeric = Number(id);
    if (!Number.isInteger(numeric)) throw new DomainError("Характеристика не найдена");
    return {
      id: numeric,
      name: readName(names[index]),
      unit: readUnit(units[index]),
      dataType: readType(types[index]),
      sort: readSort(sorts[index]),
      icon: readIcon(icons[index]),
      filterable: withFilter && filters.has(id),
      featured: featured.has(id),
      remove: removed.has(id),
    };
  });
  const newName = String(formData.get("newName") || "").trim();
  const created = newName
    ? {
        name: readName(newName),
        unit: readUnit(String(formData.get("newUnit") || "")),
        dataType: readType(String(formData.get("newType") || "number")),
        sort: readSort(String(formData.get("newSort") || "")),
        icon: readIcon(String(formData.get("newIcon") || "")),
        filterable: withFilter && formData.get("newFilter") === "1",
        featured: formData.get("newFeatured") === "1",
      }
    : null;
  return { rows, created };
}

function freshCode(name: string, taken: Set<string>) {
  let code = slugify(name);
  let n = 2;
  while (taken.has(code)) {
    code = `${slugify(name)}-${n}`;
    n += 1;
  }
  return code;
}

async function categoryUsage(ids: number[]) {
  if (ids.length === 0) return new Set<number>();
  const listings = await db
    .select({ id: listingAttributes.attributeDefId })
    .from(listingAttributes)
    .where(inArray(listingAttributes.attributeDefId, ids));
  const goods = await db
    .select({ id: nomenclatureAttributes.attributeDefId })
    .from(nomenclatureAttributes)
    .where(inArray(nomenclatureAttributes.attributeDefId, ids));
  return new Set([...listings, ...goods].map((row) => row.id));
}

export async function saveCategoryCharacteristics(categoryId: number, formData: FormData) {
  if (!Number.isInteger(categoryId) || categoryId <= 0) throw new DomainError("Раздел не найден");
  const { rows, created } = readDrafts(formData, true);
  const { inherited } = await categoryCharacteristicLayers(categoryId);
  if (created) {
    const code = slugify(created.name);
    const hit = inherited.find((item) => item.name.toLowerCase() === created.name.toLowerCase() || item.code === code);
    if (hit) throw new DomainError(`«${hit.name}» уже задана в разделе «${hit.source}» и действует здесь`);
  }
  const current = await db.select().from(attributeDefs).where(eq(attributeDefs.categoryId, categoryId));
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const row of rows) {
    if (!byId.has(row.id)) throw new DomainError("Характеристика не найдена");
  }
  const used = await categoryUsage(rows.filter((row) => row.remove || byId.get(row.id)?.dataType !== row.dataType).map((row) => row.id));
  for (const row of rows) {
    const item = byId.get(row.id);
    if (!item) continue;
    if (row.remove && used.has(row.id)) throw new DomainError(`У характеристики «${item.name}» уже есть значения`);
    if (!row.remove && item.dataType !== row.dataType && used.has(row.id)) {
      throw new DomainError(`Нельзя сменить тип «${item.name}»: уже есть значения`);
    }
  }
  const taken = new Set([
    ...inherited.map((item) => item.code),
    ...current.filter((item) => !rows.some((row) => row.id === item.id && row.remove)).map((item) => item.code),
  ]);
  await db.transaction(async (tx) => {
    for (const row of rows) {
      if (!row.remove) continue;
      await tx.delete(attributeDefs).where(and(eq(attributeDefs.id, row.id), eq(attributeDefs.categoryId, categoryId)));
    }
    for (const row of rows) {
      if (row.remove) continue;
      await tx
        .update(attributeDefs)
        .set({ name: row.name, unit: row.unit, dataType: row.dataType, cardOrder: row.sort, icon: row.icon, filterable: row.filterable, featured: row.featured })
        .where(and(eq(attributeDefs.id, row.id), eq(attributeDefs.categoryId, categoryId)));
    }
    if (created) {
      const code = freshCode(created.name, taken);
      await tx.insert(attributeDefs).values({
        categoryId,
        code,
        name: created.name,
        unit: created.unit,
        dataType: created.dataType,
        cardOrder: created.sort,
        icon: created.icon,
        filterable: created.filterable,
        featured: created.featured,
      });
    }
  });
}

function accumulateCharacteristics<T extends { categoryId: number; code: string; cardOrder: number; name: string }>(
  chain: number[],
  defs: T[],
) {
  const byCategory = new Map<number, T[]>();
  for (const def of defs) {
    const list = byCategory.get(def.categoryId) ?? [];
    list.push(def);
    byCategory.set(def.categoryId, list);
  }
  const seen = new Set<string>();
  const result: T[] = [];
  for (const categoryId of chain) {
    const rows = (byCategory.get(categoryId) ?? []).slice().sort((left, right) => {
      return left.cardOrder - right.cardOrder || left.name.localeCompare(right.name, "ru");
    });
    for (const row of rows) {
      if (seen.has(row.code)) continue;
      seen.add(row.code);
      result.push(row);
    }
  }
  return result;
}

async function characteristicCatalog() {
  const rows = await db
    .select({ id: categories.id, parentId: categories.parentId, name: categories.name })
    .from(categories);
  return rows;
}

export async function effectiveCharacteristicsFor(categoryIds: number[]) {
  const unique = [...new Set(categoryIds)];
  const catalog = await characteristicCatalog();
  const chains = new Map(unique.map((id) => [id, ancestorChainIds(catalog, id)]));
  const needed = [...new Set([...chains.values()].flat())];
  const defs = needed.length
    ? await db.select().from(attributeDefs).where(inArray(attributeDefs.categoryId, needed))
    : [];
  const result = new Map<number, Characteristic[]>();
  for (const id of unique) result.set(id, accumulateCharacteristics(chains.get(id) ?? [], defs));
  return result;
}

export async function effectiveCharacteristics(categoryId: number) {
  const map = await effectiveCharacteristicsFor([categoryId]);
  return map.get(categoryId) ?? [];
}

export async function categoryCharacteristics(categoryId: number) {
  return db
    .select()
    .from(attributeDefs)
    .where(eq(attributeDefs.categoryId, categoryId))
    .orderBy(asc(attributeDefs.cardOrder), asc(attributeDefs.name));
}

export async function categoryCharacteristicLayers(categoryId: number) {
  const catalog = await characteristicCatalog();
  const chain = ancestorChainIds(catalog, categoryId);
  const names = new Map(catalog.map((item) => [item.id, item.name]));
  const defs = chain.length
    ? await db.select().from(attributeDefs).where(inArray(attributeDefs.categoryId, chain))
    : [];
  const ownId = chain[chain.length - 1];
  return {
    own: ownId === undefined ? [] : accumulateCharacteristics([ownId], defs),
    inherited: accumulateCharacteristics(chain.slice(0, -1), defs).map((item) => ({
      ...item,
      source: names.get(item.categoryId) ?? "",
    })),
  };
}
