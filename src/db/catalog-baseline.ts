import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { attributeDefs, brands, categories, listingAttributes, listings, nomenclature, nomenclatureAttributes } from "./schema";
import { slugify } from "../lib/slug";

const boatDefs = [
  { code: "length_m", name: "Длина", unit: "м", cardOrder: 1 },
  { code: "width_m", name: "Ширина", unit: "м", cardOrder: 2 },
  { code: "seats", name: "Мест", unit: "", cardOrder: 3 },
  { code: "max_hp", name: "Мощность", unit: "л.с.", cardOrder: 4 },
  { code: "weight_kg", name: "Вес", unit: "кг", cardOrder: 5 },
  { code: "side_height_mm", name: "Высота борта", unit: "мм", cardOrder: 6 },
  { code: "material", name: "Материал", unit: "", cardOrder: 7, filterable: false },
  { code: "deadrise_mid", name: "Килеватость на миделе", unit: "°", cardOrder: 8 },
  { code: "deadrise_transom", name: "Килеватость на транце", unit: "°", cardOrder: 9 },
  { code: "transom_height_mm", name: "Высота транца", unit: "мм", cardOrder: 10 },
  { code: "bottom_mm", name: "Толщина днища", unit: "мм", cardOrder: 11 },
  { code: "side_thickness_mm", name: "Толщина борта", unit: "мм", cardOrder: 12 },
  { code: "transom_thickness_mm", name: "Толщина транца", unit: "мм", cardOrder: 13 },
  { code: "capacity_kg", name: "Грузоподъёмность", unit: "кг", cardOrder: 14 },
];

type Node = { slug: string; name: string; sort: number; children?: Node[] };

const tree: Node[] = [
  {
    slug: "motor-boats",
    name: "Лодки под мотор",
    sort: 1,
    children: [
      {
        slug: "alum",
        name: "Алюминиевые лодки",
        sort: 1,
        children: [
          { slug: "alum-console", name: "Консольные лодки", sort: 1 },
          { slug: "alum-tiller", name: "Румпельные лодки", sort: 2 },
        ],
      },
      {
        slug: "fiberglass",
        name: "Стеклопластиковые лодки",
        sort: 2,
        children: [
          { slug: "fiberglass-console", name: "Консольные лодки", sort: 1 },
          { slug: "fiberglass-tiller", name: "Румпельные лодки", sort: 2 },
        ],
      },
      { slug: "combined", name: "Комбинированные лодки", sort: 3 },
      {
        slug: "hdpe-pp",
        name: "ПНД и ПП лодки",
        sort: 4,
        children: [
          { slug: "hdpe", name: "ПНД лодки", sort: 1 },
          { slug: "pp", name: "ПП лодки", sort: 2 },
        ],
      },
      {
        slug: "rib",
        name: "Лодки Риб",
        sort: 5,
        children: [
          { slug: "rib-removable", name: "Лодки риб со съемными баллонами", sort: 1 },
          { slug: "rib-fixed", name: "Лодки риб с стационарными баллонами", sort: 2 },
        ],
      },
      {
        slug: "pvc",
        name: "Лодки ПВХ",
        sort: 6,
        children: [
          { slug: "pvc-ndnd", name: "Дно НДНД", sort: 1 },
          { slug: "pvc-vdnd", name: "Дно ВДНД", sort: 2 },
          { slug: "pvc-hard", name: "Дно жесткое", sort: 3 },
        ],
      },
    ],
  },
  { slug: "rowing", name: "Гребные лодки", sort: 2 },
];

const legacyCategory: Record<string, string> = {
  boats: "alum-tiller",
  cutters: "fiberglass-console",
  yachts: "fiberglass-console",
  jetskis: "fiberglass-console",
};

const starterBrands = [
  { name: "Риверботс", sort: 1 },
  { name: "Страйкер", sort: 2 },
];

export async function ensureCatalogStructure() {
  await upsertTree(tree, null);
  await ensureLeafDefs();
  await moveLegacyProducts();
  await removeLegacyCategories();
  for (const brand of starterBrands) await ensureBrand(brand.name, brand.sort);
  await linkBrandNames();
}

async function upsertTree(nodes: Node[], parentId: number | null) {
  for (const node of nodes) {
    const existing = await db.query.categories.findFirst({ where: eq(categories.slug, node.slug) });
    let id = existing?.id;
    if (!existing) {
      const [created] = await db
        .insert(categories)
        .values({ slug: node.slug, name: node.name, sort: node.sort, parentId })
        .returning();
      id = created.id;
    }
    if (node.children?.length) await upsertTree(node.children, id!);
  }
}

async function ensureLeafDefs() {
  const rows = await db.select().from(categories);
  const parentIds = new Set(rows.map((row) => row.parentId).filter((id): id is number => id !== null));
  for (const row of rows) {
    if (parentIds.has(row.id)) continue;
    const defs = await db.select().from(attributeDefs).where(eq(attributeDefs.categoryId, row.id));
    const codes = new Set(defs.map((def) => def.code));
    const missing = boatDefs.filter((def) => !codes.has(def.code));
    if (missing.length === 0) continue;
    await db.insert(attributeDefs).values(missing.map((def) => ({ categoryId: row.id, filterable: true, ...def })));
  }
}

async function moveLegacyProducts() {
  const rows = await db.select().from(categories);
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  for (const [fromSlug, toSlug] of Object.entries(legacyCategory)) {
    const from = bySlug.get(fromSlug);
    const to = bySlug.get(toSlug);
    if (!from || !to) continue;
    const listingRows = await db.select({ id: listings.id }).from(listings).where(eq(listings.categoryId, from.id));
    for (const listing of listingRows) await retargetListing(listing.id, to.id);
    const goods = await db.select({ id: nomenclature.id }).from(nomenclature).where(eq(nomenclature.categoryId, from.id));
    for (const good of goods) await retargetNomenclature(good.id, to.id);
  }
}

async function retargetListing(listingId: string, categoryId: number) {
  const attrs = await db
    .select({
      attributeDefId: listingAttributes.attributeDefId,
      valueNumber: listingAttributes.valueNumber,
      code: attributeDefs.code,
      name: attributeDefs.name,
      unit: attributeDefs.unit,
      cardOrder: attributeDefs.cardOrder,
    })
    .from(listingAttributes)
    .innerJoin(attributeDefs, eq(attributeDefs.id, listingAttributes.attributeDefId))
    .where(eq(listingAttributes.listingId, listingId));
  const next = new Map(
    (await db.select().from(attributeDefs).where(eq(attributeDefs.categoryId, categoryId))).map((def) => [def.code, def.id]),
  );
  for (const attr of attrs) {
    let defId = next.get(attr.code);
    if (!defId) {
      const [created] = await db
        .insert(attributeDefs)
        .values({
          categoryId,
          code: attr.code,
          name: attr.name,
          unit: attr.unit,
          cardOrder: attr.cardOrder,
          filterable: true,
        })
        .returning();
      defId = created.id;
      next.set(attr.code, defId);
    }
    if (defId === attr.attributeDefId) continue;
    await db
      .update(listingAttributes)
      .set({ attributeDefId: defId })
      .where(sql`${listingAttributes.listingId} = ${listingId} and ${listingAttributes.attributeDefId} = ${attr.attributeDefId}`);
  }
  await db.update(listings).set({ categoryId }).where(eq(listings.id, listingId));
}

async function retargetNomenclature(nomenclatureId: string, categoryId: number) {
  const attrs = await db
    .select({
      attributeDefId: nomenclatureAttributes.attributeDefId,
      valueNumber: nomenclatureAttributes.valueNumber,
      code: attributeDefs.code,
      name: attributeDefs.name,
      unit: attributeDefs.unit,
      cardOrder: attributeDefs.cardOrder,
    })
    .from(nomenclatureAttributes)
    .innerJoin(attributeDefs, eq(attributeDefs.id, nomenclatureAttributes.attributeDefId))
    .where(eq(nomenclatureAttributes.nomenclatureId, nomenclatureId));
  const next = new Map(
    (await db.select().from(attributeDefs).where(eq(attributeDefs.categoryId, categoryId))).map((def) => [def.code, def.id]),
  );
  for (const attr of attrs) {
    let defId = next.get(attr.code);
    if (!defId) {
      const [created] = await db
        .insert(attributeDefs)
        .values({
          categoryId,
          code: attr.code,
          name: attr.name,
          unit: attr.unit,
          cardOrder: attr.cardOrder,
          filterable: true,
        })
        .returning();
      defId = created.id;
      next.set(attr.code, defId);
    }
    if (defId === attr.attributeDefId) continue;
    await db
      .update(nomenclatureAttributes)
      .set({ attributeDefId: defId })
      .where(
        sql`${nomenclatureAttributes.nomenclatureId} = ${nomenclatureId} and ${nomenclatureAttributes.attributeDefId} = ${attr.attributeDefId}`,
      );
  }
  await db.update(nomenclature).set({ categoryId }).where(eq(nomenclature.id, nomenclatureId));
}

async function removeLegacyCategories() {
  for (const slug of ["boats", "cutters", "yachts", "jetskis", "water"]) {
    const row = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
    if (!row) continue;
    const child = await db.query.categories.findFirst({ where: eq(categories.parentId, row.id) });
    const listing = await db.query.listings.findFirst({ where: eq(listings.categoryId, row.id) });
    const good = await db.query.nomenclature.findFirst({ where: eq(nomenclature.categoryId, row.id) });
    if (child || listing || good) continue;
    await db.execute(sql`
      delete from attribute_defs d
      where d.category_id = ${row.id}
        and not exists (select 1 from listing_attributes la where la.attribute_def_id = d.id)
        and not exists (select 1 from nomenclature_attributes na where na.attribute_def_id = d.id)
    `);
    const still = await db.query.attributeDefs.findFirst({ where: eq(attributeDefs.categoryId, row.id) });
    if (still) continue;
    await db.delete(categories).where(eq(categories.id, row.id));
  }
}

async function ensureBrand(name: string, sort: number) {
  const existing = await db.query.brands.findFirst({
    where: sql`lower(${brands.name}) = lower(${name})`,
  });
  if (existing) return existing;
  let slug = slugify(name);
  let n = 2;
  while (await db.query.brands.findFirst({ where: eq(brands.slug, slug) })) {
    slug = `${slugify(name)}-${n}`;
    n += 1;
  }
  const [created] = await db.insert(brands).values({ name, slug, sort }).returning();
  return created;
}

async function linkBrandNames() {
  const names = await db.execute<{ brand: string }>(sql`
    select distinct brand from (
      select brand from listings where brand <> ''
      union
      select brand from nomenclature where brand <> ''
    ) names
  `);
  let sort = 10;
  for (const row of names) {
    await ensureBrand(row.brand, sort);
    sort += 1;
  }
  await db.execute(sql`
    update listings l
    set brand_id = b.id
    from brands b
    where l.brand_id is null
      and l.brand <> ''
      and lower(l.brand) = lower(b.name)
  `);
  await db.execute(sql`
    update nomenclature n
    set brand_id = b.id
    from brands b
    where n.brand_id is null
      and n.brand <> ''
      and lower(n.brand) = lower(b.name)
  `);
}
