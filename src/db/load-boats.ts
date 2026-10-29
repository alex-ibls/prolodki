import "dotenv/config";
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { eq, inArray, sql } from "drizzle-orm";
import { client, db } from "./index";
import { ensureCatalogStructure } from "./catalog-baseline";
import { attributeDefs, brands, categories, nomenclature, users } from "./schema";
import { readListingDescription } from "../lib/description";
import { replaceNomenclaturePhotos } from "../lib/photos";
import { saveNomenclatureItem } from "../lib/nomenclature";
import { slugify } from "../lib/slug";
import { syncPublishedListing } from "../lib/stock";
import { readXlsxTable } from "../lib/xlsx-table";

const demoSkus = ["SV-390", "LD-470", "NV-760", "VL-110"];
const imageExt = new Set([".jpg", ".jpeg", ".png", ".webp"]);

const columns = {
  бренд: "brand",
  модель: "model",
  длина: "length",
  ширина: "width",
  "высота борта": "side",
  материал: "material",
  "килеватость на мидели": "deadriseMid",
  "килеватость на миделе": "deadriseMid",
  "килеватость на транце": "deadriseTransom",
  "вес лодки": "weight",
  "высота транца": "transom",
  "макс. мощность мотора": "hp",
  "толщина днище": "bottom",
  "толщина борт": "sideThickness",
  "толщина транца": "transomThickness",
  грузоподъемность: "capacity",
} as const;

type BoatRow = Record<(typeof columns)[keyof typeof columns], string>;

function canon(value: string) {
  const raw = value.trim().toLowerCase().replace(/ё/g, "е").replace(/\s+/g, "");
  if (raw.includes("капот")) return "x4k";
  return raw.replace(/х/g, "x").replace(/к/g, "k").replace(/[^a-z0-9]/g, "");
}

function skuFor(model: string) {
  const key = canon(model);
  if (key === "x4k") return "ST-X4K";
  if (key === "x4") return "ST-X4";
  if (key === "gt") return "ST-GT";
  if (key === "x42k") return "ST-X42K";
  return `ST-${key.toUpperCase().slice(0, 12) || "BOAT"}`;
}

function titleFor(brand: string, model: string) {
  if (model.toLowerCase().includes("капот")) {
    const base = model.replace(/капотн[а-яё]*/i, "").replace(/\s+/g, " ").trim();
    return `Лодка ${brand} ${base} капотная`;
  }
  return `Лодка ${brand} ${model.trim()}`;
}

function categorySlug(material: string) {
  const value = material.toLowerCase();
  if (value.includes("полипропилен") || value.trim() === "пп") return "pp";
  if (value.includes("пнд") || value.includes("полиэтилен")) return "hdpe";
  throw new Error(`Нет категории для материала «${material}»`);
}

function num(raw: string) {
  const match = raw.replace(",", ".").match(/[\d.]+/);
  if (!match) throw new Error(`Нет числа в «${raw}»`);
  const value = Number(match[0]);
  if (!Number.isFinite(value)) throw new Error(`Нет числа в «${raw}»`);
  return value;
}

function meters(raw: string) {
  const value = num(raw);
  return value > 30 ? Math.round(value) / 1000 : value;
}

function whole(raw: string) {
  return String(num(raw));
}

function describe(row: BoatRow) {
  const hood = row.model.toLowerCase().includes("капот") ? "Капотная версия. " : "";
  return [
    `${hood}Корпус: ${row.material.trim().toLowerCase()}.`,
    `Длина ${whole(row.length)} мм, ширина ${whole(row.width)} мм, высота борта ${whole(row.side)} мм.`,
    `Килеватость на миделе ${row.deadriseMid.trim()}, на транце ${row.deadriseTransom.trim()}.`,
    `Вес ${row.weight.trim()}, высота транца ${whole(row.transom)} мм, мотор до ${row.hp.trim().replace(/\.$/, "")}.`,
    `Толщина днища ${whole(row.bottom)} мм, борта ${whole(row.sideThickness)} мм, транца ${whole(row.transomThickness)} мм.`,
    `Грузоподъёмность ${row.capacity.trim()}.`,
  ].join(" ");
}

function boatRows(file: string) {
  return readXlsxTable(file).map((record) => {
    const row = {} as BoatRow;
    for (const [header, field] of Object.entries(columns)) {
      const value = record[header] ?? "";
      if (!row[field]) row[field] = value;
    }
    for (const field of ["brand", "model", "length", "width", "material"] as const) {
      if (!row[field]?.trim()) throw new Error("В строке нет бренда, модели или размера");
    }
    return row;
  });
}

async function photoFiles(root: string, model: string) {
  const entries = await readdir(root, { withFileTypes: true });
  const dirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const folder = dirs.find((name) => canon(name) === canon(model));
  if (!folder) throw new Error(`Нет папки фото для «${model}»`);
  const names = (await readdir(path.join(root, folder))).filter((name) => imageExt.has(path.extname(name).toLowerCase()));
  names.sort((a, b) => {
    const left = Number(a.match(/(\d+)(?!.*\d)/)?.[1] ?? 0);
    const right = Number(b.match(/(\d+)(?!.*\d)/)?.[1] ?? 0);
    return left - right || a.localeCompare(b, "ru");
  });
  const files: Buffer[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const body = await readFile(path.join(root, folder, name));
    const hash = createHash("sha256").update(body).digest("hex");
    if (seen.has(hash)) continue;
    seen.add(hash);
    files.push(body);
    if (files.length === 10) break;
  }
  if (files.length === 0) throw new Error(`В папке ${folder} нет фото`);
  return { folder, files };
}

async function ensureBrand(name: string) {
  const existing = await db.query.brands.findFirst({
    where: sql`lower(${brands.name}) = lower(${name})`,
  });
  if (existing) return existing;
  const same = await db.query.brands.findFirst({ where: eq(brands.slug, slugify(name)) });
  const slug = same ? `${slugify(name)}-2` : slugify(name);
  const [created] = await db.insert(brands).values({ name, slug, sort: 3 }).returning();
  return created;
}

async function main() {
  const sheet = process.argv[2] ?? "/Users/bocharovalexander/Downloads/Номенклатуара начало.xlsx";
  const photos = process.argv[3] ?? "/Users/bocharovalexander/Downloads/Фото лодок";
  await ensureCatalogStructure();
  const manager = await db.query.users.findFirst({ where: eq(users.email, "manager@prolodki.test") });
  if (!manager) throw new Error("Нет пользователя manager@prolodki.test");
  const rows = boatRows(sheet);
  for (const row of rows) {
    const category = await db.query.categories.findFirst({ where: eq(categories.slug, categorySlug(row.material)) });
    if (!category) throw new Error("Категория лодок не найдена");
    const brand = await ensureBrand(row.brand.trim());
    const sku = skuFor(row.model);
    const defs = await db.select().from(attributeDefs).where(eq(attributeDefs.categoryId, category.id));
    const byCode = new Map(defs.map((def) => [def.code, def.id]));
    const numeric: [string, number][] = [
      ["length_m", meters(row.length)],
      ["width_m", meters(row.width)],
      ["weight_kg", num(row.weight)],
      ["max_hp", num(row.hp)],
      ["side_height_mm", num(row.side)],
      ["deadrise_mid", num(row.deadriseMid)],
      ["deadrise_transom", num(row.deadriseTransom)],
      ["transom_height_mm", num(row.transom)],
      ["bottom_mm", num(row.bottom)],
      ["side_thickness_mm", num(row.sideThickness)],
      ["transom_thickness_mm", num(row.transomThickness)],
      ["capacity_kg", num(row.capacity)],
    ];
    const attributes: { attributeDefId: number; valueNumber: number | null; valueText: string | null }[] = numeric.map(
      ([code, valueNumber]) => {
        const attributeDefId = byCode.get(code);
        if (!attributeDefId) throw new Error(`Нет характеристики ${code}`);
        return { attributeDefId, valueNumber, valueText: null };
      },
    );
    const materialId = byCode.get("material");
    if (!materialId) throw new Error("Нет характеристики material");
    attributes.push({ attributeDefId: materialId, valueNumber: null, valueText: row.material.trim() });
    const existing = await db.query.nomenclature.findFirst({ where: eq(nomenclature.sku, sku) });
    const id = await saveNomenclatureItem(manager.id, existing?.id ?? null, {
      sku,
      categoryId: category.id,
      title: titleFor(brand.name, row.model),
      brandId: brand.id,
      brand: brand.name,
      model: row.model.trim(),
      year: null,
      description: readListingDescription(describe(row)),
      priceKopeks: existing?.priceKopeks ?? 0,
      compareAtKopeks: existing?.compareAtKopeks ?? null,
      quantityOnHand: existing ? Math.max(existing.quantityOnHand, existing.quantityReserved) : 1,
      registered: true,
      onOrder: existing?.onOrder ?? true,
      publish: true,
      attributes,
    });
    const pack = await photoFiles(photos, row.model);
    await replaceNomenclaturePhotos(id, pack.files);
    console.log(`${sku}: ${pack.files.length} фото из ${pack.folder}`);
  }

  const demos = await db.select({ id: nomenclature.id, sku: nomenclature.sku }).from(nomenclature).where(inArray(nomenclature.sku, demoSkus));
  for (const demo of demos) {
    await db.update(nomenclature).set({ isPublished: false, updatedAt: new Date() }).where(eq(nomenclature.id, demo.id));
    await syncPublishedListing(db, demo.id);
    console.log(`${demo.sku}: снята с витрины`);
  }
  console.log(`каталог: ${rows.length} лодок`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
