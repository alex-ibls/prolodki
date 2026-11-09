import "dotenv/config";
import { asc, eq, like } from "drizzle-orm";
import { client, db } from "./index";
import { listingImages, listings, nomenclature, nomenclatureAttributes, nomenclatureImages } from "./schema";
import { syncPublishedListing } from "../lib/stock";

const target = 200;
const prices = Array.from({ length: 11 }, (_, step) => (500_000 + step * 10_000) * 100);

async function main() {
  const published = await db.select({ id: listings.id }).from(listings).where(eq(listings.status, "published"));
  const need = target - published.length;
  if (need <= 0) {
    console.log(`каталог уже ${published.length}`);
    return;
  }

  const sources = await db.query.nomenclature.findMany({
    where: eq(nomenclature.isPublished, true),
    with: { attributes: true, images: true },
    orderBy: [asc(nomenclature.sku)],
  });
  const originals = sources.filter((item) => !item.sku.startsWith("COPY-") && item.images.length > 0);
  if (originals.length === 0) throw new Error("Нет опубликованных товаров с фото для копирования");

  const existingCopies = await db.select({ sku: nomenclature.sku }).from(nomenclature).where(like(nomenclature.sku, "COPY-%"));
  let seq = existingCopies.reduce((max, row) => {
    const number = Number(row.sku.slice("COPY-".length));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);

  for (let index = 0; index < need; index += 1) {
    const source = originals[index % originals.length];
    seq += 1;
    const sku = `COPY-${String(seq).padStart(3, "0")}`;
    const priceKopeks = prices[index % prices.length];
    const [created] = await db
      .insert(nomenclature)
      .values({
        sku,
        categoryId: source.categoryId,
        title: source.title,
        brandId: source.brandId,
        brand: source.brand,
        model: source.model,
        year: source.year,
        description: source.description,
        priceKopeks,
        compareAtKopeks: null,
        quantityOnHand: Math.max(1, source.quantityOnHand),
        quantityReserved: 0,
        city: source.city,
        registered: source.registered,
        onOrder: source.onOrder,
        isPublished: true,
      })
      .returning();
    if (source.attributes.length > 0) {
      await db.insert(nomenclatureAttributes).values(
        source.attributes.map((attr) => ({
          nomenclatureId: created.id,
          attributeDefId: attr.attributeDefId,
          valueNumber: attr.valueNumber,
          valueText: attr.valueText,
        })),
      );
    }
    const photos = [...source.images].sort((a, b) => a.sort - b.sort);
    if (photos.length > 0) {
      await db.insert(nomenclatureImages).values(
        photos.map((photo) => ({ nomenclatureId: created.id, path: photo.path, sort: photo.sort })),
      );
    }
    const listingId = await syncPublishedListing(db, created.id);
    if (photos.length > 0 && listingId) {
      await db.insert(listingImages).values(
        photos.map((photo) => ({ listingId, path: photo.path, sort: photo.sort })),
      );
    }
    if ((index + 1) % 25 === 0 || index + 1 === need) console.log(`${index + 1} / ${need}: ${sku} ${priceKopeks / 100}`);
  }

  const after = await db.select({ id: listings.id }).from(listings).where(eq(listings.status, "published"));
  console.log(`каталог: ${after.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end();
  });
