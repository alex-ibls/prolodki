import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { listingImages, listings, nomenclatureImages } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { preparePlatformPhoto } from "@/lib/prepare-photo";
import { assertPhotoRoom, deleteStored, maxPhotos, photoFiles, removedPhotoIds, savePhoto, savePhotoBytes } from "@/lib/uploads";

export async function attachNomenclaturePhotos(nomenclatureId: string, formData: FormData) {
  const removed = await takeNomenclaturePhotos(nomenclatureId, removedPhotoIds(formData));
  const files = photoFiles(formData);
  if (files.length > 0) {
    const current = await db
      .select({ id: nomenclatureImages.id })
      .from(nomenclatureImages)
      .where(eq(nomenclatureImages.nomenclatureId, nomenclatureId));
    assertPhotoRoom(current.length, files.length);
    const [last] = await db
      .select({ sort: nomenclatureImages.sort })
      .from(nomenclatureImages)
      .where(eq(nomenclatureImages.nomenclatureId, nomenclatureId))
      .orderBy(desc(nomenclatureImages.sort))
      .limit(1);
    let sort = (last?.sort ?? -1) + 1;
    for (const file of files) {
      const stored = await savePhoto(nomenclatureIdFolder(nomenclatureId), file);
      if (!stored) continue;
      await db.insert(nomenclatureImages).values({ nomenclatureId, path: stored, sort });
      sort += 1;
    }
  }
  await mirrorNomenclaturePhotos(nomenclatureId);
  for (const path of removed) await releaseStoredPhoto(path);
}

async function takeNomenclaturePhotos(nomenclatureId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(nomenclatureImages)
    .where(and(eq(nomenclatureImages.nomenclatureId, nomenclatureId), inArray(nomenclatureImages.id, ids)));
  if (rows.length === 0) return [];
  await db
    .delete(nomenclatureImages)
    .where(and(eq(nomenclatureImages.nomenclatureId, nomenclatureId), inArray(nomenclatureImages.id, rows.map((row) => row.id))));
  return rows.map((row) => row.path);
}

export async function releaseStoredPhoto(path: string) {
  const [nomenclature] = await db
    .select({ id: nomenclatureImages.id })
    .from(nomenclatureImages)
    .where(eq(nomenclatureImages.path, path))
    .limit(1);
  if (nomenclature) return;
  const [listing] = await db
    .select({ id: listingImages.id })
    .from(listingImages)
    .where(eq(listingImages.path, path))
    .limit(1);
  if (listing) return;
  try {
    await deleteStored(path);
  } catch {
    // Файла в хранилище уже нет.
  }
}

export async function replaceNomenclaturePhotos(nomenclatureId: string, files: Buffer[]) {
  if (files.length > maxPhotos) throw new DomainError("У товара не больше 10 фото");
  const current = await db
    .select()
    .from(nomenclatureImages)
    .where(eq(nomenclatureImages.nomenclatureId, nomenclatureId));
  await db.delete(nomenclatureImages).where(eq(nomenclatureImages.nomenclatureId, nomenclatureId));
  for (const photo of current) {
    try {
      await deleteStored(photo.path);
    } catch {
      // Старый файл в хранилище не мешает новой карточке.
    }
  }
  let sort = 0;
  for (const file of files) {
    const stored = await savePhotoBytes(nomenclatureIdFolder(nomenclatureId), await preparePlatformPhoto(file));
    await db.insert(nomenclatureImages).values({ nomenclatureId, path: stored, sort });
    sort += 1;
  }
  await mirrorNomenclaturePhotos(nomenclatureId);
}

function nomenclatureIdFolder(nomenclatureId: string) {
  return `nomenclature/${nomenclatureId}`;
}

async function mirrorNomenclaturePhotos(nomenclatureId: string) {
  const listing = await db.query.listings.findFirst({
    where: eq(listings.nomenclatureId, nomenclatureId),
  });
  if (!listing) return;
  const photos = await db
    .select()
    .from(nomenclatureImages)
    .where(eq(nomenclatureImages.nomenclatureId, nomenclatureId))
    .orderBy(asc(nomenclatureImages.sort));
  await db.delete(listingImages).where(eq(listingImages.listingId, listing.id));
  if (photos.length === 0) return;
  await db.insert(listingImages).values(
    photos.map((photo) => ({ listingId: listing.id, path: photo.path, sort: photo.sort })),
  );
}
