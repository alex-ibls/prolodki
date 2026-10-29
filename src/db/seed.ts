import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { ensureCatalogStructure } from "./catalog-baseline";
import { db } from "./index";
import {
  attributeDefs,
  categories,
  customers,
  listingAttributes,
  listingImages,
  listings,
  organizations,
  sellerProfiles,
  users,
} from "./schema";
import { demoPassword, site } from "../lib/site";
import { saveNomenclatureItem } from "../lib/nomenclature";
import { writeUpload } from "../lib/uploads";

function cover(title: string, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
    <rect width="960" height="640" fill="${color}"/>
    <circle cx="820" cy="90" r="120" fill="rgba(255,255,255,0.08)"/>
    <text x="48" y="330" fill="white" font-size="42" font-family="sans-serif">${title}</text>
  </svg>`;
}

export async function seed() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, "manager@prolodki.test"),
  });
  if (existing) {
    console.log("seed: данные уже есть");
    return;
  }

  const passwordHash = await hash(demoPassword, 10);
  const people = [
    ["manager@prolodki.test", "Марина Волгина", "79001110001", "manager"],
    ["moderator@prolodki.test", "Илья Седов", "79001110002", "moderator"],
    ["buyer@prolodki.test", "Олег Крылов", "79001110003", null],
    ["private@prolodki.test", "Анна Лебедева", "79001110004", null],
  ] as const;

  const userIds: Record<string, string> = {};
  for (const [email, name, phone, role] of people) {
    const [user] = await db
      .insert(users)
      .values({
        email,
        name,
        phone,
        city: site.city,
        passwordHash,
        staffRole: role,
        emailVerifiedAt: new Date(),
      })
      .returning();
    userIds[email] = user.id;
    if (!role) {
      await db.insert(customers).values({
        userId: user.id,
        name,
        phone,
        email,
        city: site.city,
        source: "registration",
      });
    }
  }

  await db.insert(organizations).values({
    kind: "company",
    name: site.name,
    city: site.city,
    phone: site.phone,
  });
  await db.insert(sellerProfiles).values({
    userId: userIds["private@prolodki.test"],
    type: "individual",
  });

  await ensureCatalogStructure();
  const alumTiller = await categoryBySlug("alum-tiller");
  const fiberglassConsole = await categoryBySlug("fiberglass-console");

  const managerId = userIds["manager@prolodki.test"];
  const goods = [
    {
      sku: "SV-390",
      categoryId: alumTiller.id,
      title: "Лодка «Север 390»",
      brand: "Север",
      model: "390",
      year: 2026,
      description: "Алюминиевая лодка для рыбалки и коротких выходов. Новая, со склада компании.",
      priceKopeks: 18600000,
      compareAtKopeks: null,
      quantityOnHand: 4,
      registered: true,
      onOrder: false,
      color: "#1c4666",
      attrs: { length_m: 3.9, width_m: 1.48, seats: 3, max_hp: 15, weight_kg: 138 },
    },
    {
      sku: "LD-470",
      categoryId: fiberglassConsole.id,
      title: "Катер «Ладога 470»",
      brand: "Ладога",
      model: "470",
      year: 2026,
      description: "Открытый катер для прогулок по водохранилищу. Предпродажная подготовка на базе компании.",
      priceKopeks: 89000000,
      compareAtKopeks: 94000000,
      quantityOnHand: 2,
      registered: true,
      onOrder: false,
      color: "#143047",
      attrs: { length_m: 4.7, width_m: 1.95, seats: 5, max_hp: 60, weight_kg: 320 },
    },
    {
      sku: "NV-760",
      categoryId: fiberglassConsole.id,
      title: "Яхта «Нева 760»",
      brand: "Нева",
      model: "760",
      year: 2025,
      description: "Прогулочная яхта с каютой. Показ по записи в Химках.",
      priceKopeks: 420000000,
      compareAtKopeks: null,
      quantityOnHand: 1,
      registered: true,
      onOrder: true,
      color: "#0f2740",
      attrs: { length_m: 7.6, width_m: 2.55, seats: 6, max_hp: 150, weight_kg: 1450 },
    },
    {
      sku: "VL-110",
      categoryId: fiberglassConsole.id,
      title: "Гидроцикл «Волна 110»",
      brand: "Волна",
      model: "110",
      year: 2026,
      description: "Трёхместный гидроцикл для спокойной воды.",
      priceKopeks: 76000000,
      compareAtKopeks: null,
      quantityOnHand: 3,
      registered: true,
      onOrder: false,
      color: "#1d5c78",
      attrs: { seats: 3, max_hp: 110, weight_kg: 280 },
    },
  ];

  for (const good of goods) {
    const id = await saveNomenclatureItem(managerId, null, {
      ...good,
      brandId: null,
      publish: true,
      attributes: await attrs(good.categoryId, good.attrs),
    });
    const listing = await db.query.listings.findFirst({ where: eq(listings.nomenclatureId, id) });
    if (listing) await attachCover(listing.id, good.title, good.color);
  }

  const usedId = crypto.randomUUID();
  await db.insert(listings).values({
    id: usedId,
    source: "individual",
    sellerUserId: userIds["private@prolodki.test"],
    categoryId: alumTiller.id,
    title: "БУ лодка «Рыбак 340»",
    slug: "bu-lodka-rybak-340",
    description: "Алюминиевая лодка 2018 года, один владелец. Осмотр в Клину.",
    brand: "Рыбак",
    model: "340",
    year: 2018,
    condition: "used",
    priceKopeks: 7500000,
    city: "Клин",
    registered: false,
    onOrder: false,
    quantity: 1,
    status: "published",
  });
  await insertAttrs(usedId, alumTiller.id, {
    length_m: 3.4,
    width_m: 1.35,
    seats: 3,
    max_hp: 9.9,
    weight_kg: 96,
  });
  await attachCover(usedId, "Рыбак 340", "#8a5a32");

  await ensureCatalogStructure();
  console.log("seed: готово");
}

async function categoryBySlug(slug: string) {
  const row = await db.query.categories.findFirst({ where: eq(categories.slug, slug) });
  if (!row) throw new Error(`Нет категории ${slug}`);
  return row;
}

async function attrs(categoryId: number, values: Record<string, number | undefined>) {
  const defs = await db.select().from(attributeDefs).where(eq(attributeDefs.categoryId, categoryId));
  return defs.flatMap((def) => {
    const value = values[def.code];
    return value === undefined ? [] : [{ attributeDefId: def.id, valueNumber: value }];
  });
}

async function insertAttrs(listingId: string, categoryId: number, values: Record<string, number>) {
  const rows = await attrs(categoryId, values);
  if (rows.length === 0) return;
  await db.insert(listingAttributes).values(rows.map((row) => ({ listingId, ...row })));
}

async function attachCover(listingId: string, title: string, color: string) {
  const relative = await writeUpload(`listings/${listingId}/cover.svg`, cover(title, color));
  await db.insert(listingImages).values({ listingId, path: relative, sort: 0 });
}
