import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefs,
  listingAttributes,
  listingImages,
  listings,
} from "@/db/schema";
import { readListingDescription } from "@/lib/description";
import { DomainError } from "@/lib/errors";
import { parseIntStrict, parsePriceToKopeks, parseRublesToKopeks, rubleIssue, parseTenths, textInputLimit } from "@/lib/format";
import { readRegistered } from "@/lib/labels";
import { ensureIndividualSeller } from "@/lib/seller";
import type { CurrentUser } from "@/lib/session";
import { readCityPlace } from "@/lib/ru-cities";
import { slugify } from "@/lib/slug";
import { assertLeafCategory, resolveBrandId } from "@/lib/taxonomy";
import { releaseStoredPhoto } from "@/lib/photos";
import { assertPhotoRoom, photoFiles, removedPhotoIds, saveListingImage } from "@/lib/uploads";

export async function defsForCategory(categoryId: number) {
  return db
    .select()
    .from(attributeDefs)
    .where(eq(attributeDefs.categoryId, categoryId))
    .orderBy(asc(attributeDefs.cardOrder), asc(attributeDefs.name));
}

export function readAttributeValues(
  formData: FormData,
  defs: { id: number; code: string; name: string }[],
) {
  const values: { attributeDefId: number; valueNumber: number | null; valueText: string | null }[] = [];
  for (const def of defs) {
    const raw = String(formData.get(`attr_${def.code}`) ?? "").trim();
    if (!raw) continue;
    if (def.code === "material") {
      if (raw.length > textInputLimit) throw new DomainError(`«${def.name}» — не больше ${textInputLimit} символов`);
      values.push({ attributeDefId: def.id, valueNumber: null, valueText: raw });
      continue;
    }
    const value = parseTenths(raw);
    if (value === null) throw new DomainError(`«${def.name}» — число, можно с десятыми`);
    values.push({ attributeDefId: def.id, valueNumber: value, valueText: null });
  }
  return values;
}

export async function saveSellerListing(user: CurrentUser, listingId: string | null, formData: FormData) {
  if (!user.emailVerifiedAt) {
    throw new DomainError("Подтвердите email в профиле, чтобы продавать");
  }
  user = await ensureIndividualSeller(user);
  const profile = user.sellerProfile;
  if (!profile) throw new DomainError("Подтвердите email в профиле, чтобы продавать");
  const intent = String(formData.get("intent") || "draft");
  const categoryId = Number(formData.get("categoryId"));
  if (!categoryId) throw new DomainError("Выберите категорию");
  await assertLeafCategory(categoryId);
  const brand = await resolveBrandId(String(formData.get("brandId") || ""));
  const title = String(formData.get("title") || "").trim();
  if (title.length < 3) throw new DomainError("Название слишком короткое");
  if (title.length > textInputLimit) throw new DomainError(`Название — не больше ${textInputLimit} символов`);
  const model = String(formData.get("model") || "").trim();
  if (model.length > textInputLimit) throw new DomainError(`Модель — не больше ${textInputLimit} символов`);
  const priceRaw = String(formData.get("price") || "").trim();
  const price = parseRublesToKopeks(priceRaw);
  if (price === null) throw new DomainError(rubleIssue(priceRaw, true));
  const compareRaw = String(formData.get("compareAt") || "").trim();
  const compareAt = compareRaw ? parsePriceToKopeks(compareRaw) : null;
  if (compareRaw && compareAt === null) throw new DomainError("Старая цена указана неверно");
  const yearRaw = String(formData.get("year") || "").trim();
  const year = yearRaw ? parseIntStrict(yearRaw) : null;
  if (yearRaw && (year === null || year < 1950 || year > 2100)) {
    throw new DomainError("Год указан неверно");
  }
  const registered = readRegistered(String(formData.get("registered") || ""));
  if (registered === null) throw new DomainError("Укажите, регистрат или нерегистрат");
  const defs = await defsForCategory(categoryId);
  const attributes = readAttributeValues(formData, defs);
  if (profile.type !== "individual") throw new DomainError("Публиковать может только частный продавец");

  const existing = listingId
    ? await db.query.listings.findFirst({
        where: eq(listings.id, listingId),
        with: { images: true },
      })
    : null;
  if (listingId && (!existing || existing.sellerUserId !== user.id)) {
    throw new DomainError("Объявление не найдено");
  }
  if (existing && (existing.status === "reserved" || existing.status === "archived")) {
    throw new DomainError("Это объявление уже нельзя редактировать");
  }

  const removeIds = new Set(removedPhotoIds(formData));
  const kept = (existing?.images ?? []).filter((image) => !removeIds.has(image.id));
  const files = photoFiles(formData);
  const photoCount = kept.length + files.length;
  assertPhotoRoom(kept.length, files.length);
  const shouldReview = intent === "submit" || existing?.status === "published";
  if (shouldReview && !user.emailVerifiedAt) {
    throw new DomainError("Подтвердите email, чтобы разместить объявление");
  }
  if (shouldReview && photoCount < 1) throw new DomainError("Добавьте хотя бы одно фото");

  const status = (shouldReview ? "pending_review" : "draft") as "pending_review" | "draft";
  const values = {
    source: "individual" as const,
    sellerUserId: user.id,
    categoryId,
    title,
    description: readListingDescription(String(formData.get("description") || "")),
    brandId: brand.brandId,
    brand: brand.brand,
    model,
    year,
    condition: "used" as const,
    priceKopeks: price,
    compareAtKopeks: compareAt,
    ...readCityPlace(String(formData.get("city") || ""), String(formData.get("lat") || ""), String(formData.get("lng") || ""), shouldReview),
    registered,
    onOrder: false,
    quantity: 1,
    status,
    rejectionReason: "",
    updatedAt: new Date(),
  };

  let id = existing?.id;
  if (!existing) {
    const [created] = await db
      .insert(listings)
      .values({
        ...values,
        slug: `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`,
      })
      .returning();
    id = created.id;
  } else {
    await db.update(listings).set(values).where(eq(listings.id, existing.id));
  }

  await db.delete(listingAttributes).where(eq(listingAttributes.listingId, id!));
  if (attributes.length > 0) {
    await db.insert(listingAttributes).values(
      attributes.map((attribute) => ({ listingId: id!, ...attribute })),
    );
  }

  const doomed = (existing?.images ?? []).filter((image) => removeIds.has(image.id));
  if (doomed.length > 0) {
    await db
      .delete(listingImages)
      .where(and(eq(listingImages.listingId, id!), inArray(listingImages.id, doomed.map((image) => image.id))));
    for (const image of doomed) await releaseStoredPhoto(image.path);
  }

  let sort = kept.reduce((max, image) => Math.max(max, image.sort), -1) + 1;
  for (const file of files) {
    const stored = await saveListingImage(id!, file);
    if (!stored) continue;
    await db.insert(listingImages).values({ listingId: id!, path: stored, sort });
    sort += 1;
  }
  return id!;
}
