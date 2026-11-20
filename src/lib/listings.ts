import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  listingAttributes,
  listingImages,
  listings,
} from "@/db/schema";
import { readListingDescription } from "@/lib/description";
import { DomainError } from "@/lib/errors";
import { parseIntStrict, parsePriceToKopeks, parseRublesToKopeks, rubleIssue, parseTenths, textInputLimit } from "@/lib/format";
import { buyerListingsEnabled, ensureIndividualSeller } from "@/lib/seller";
import type { CurrentUser } from "@/lib/session";
import { readCityPlace } from "@/lib/ru-cities";
import { listingSlugFor } from "@/lib/stock";
import { effectiveCharacteristics } from "@/lib/characteristics";
import { assertLeafCategory, ensureBrandName } from "@/lib/taxonomy";
import { releaseStoredPhoto } from "@/lib/photos";
import { assertPhotoRoom, photoFiles, removedPhotoIds, saveListingImage } from "@/lib/uploads";

export async function defsForCategory(categoryId: number) {
  return effectiveCharacteristics(categoryId);
}

export function readAttributeValues(
  formData: FormData,
  defs: { id: number; code: string; name: string; dataType: string }[],
) {
  const values: { attributeDefId: number; valueNumber: number | null; valueText: string | null }[] = [];
  for (const def of defs) {
    const raw = String(formData.get(`attr_${def.code}`) ?? "").trim();
    if (!raw) continue;
    if (def.dataType === "text") {
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

export const leadTimeLimit = 80;

export function readLogisticsAndLead(formData: FormData, price: (raw: string) => number | null) {
  const logisticsRaw = String(formData.get("logistics") || "").trim();
  const parsed = logisticsRaw ? price(logisticsRaw) : null;
  if (logisticsRaw && (parsed === null || parsed <= 0)) {
    throw new DomainError("Цена логистики указана неверно");
  }
  const leadTime = String(formData.get("leadTime") || "").trim();
  if (leadTime.length > leadTimeLimit) throw new DomainError("Срок поставки — не больше 80 символов");
  return { logisticsKopeks: parsed, leadTime };
}

export async function saveSellerListing(user: CurrentUser, listingId: string | null, formData: FormData) {
  if (!buyerListingsEnabled) throw new DomainError("Размещение товаров пока недоступно");
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
  const brand = await ensureBrandName(String(formData.get("brand") || ""));
  const title = String(formData.get("title") || "").trim();
  if (title.length < 3) throw new DomainError("Название слишком короткое");
  if (title.length > textInputLimit) throw new DomainError(`Название — не больше ${textInputLimit} символов`);
  const model = String(formData.get("model") || "").trim();
  if (model.length > textInputLimit) throw new DomainError(`Модель — не больше ${textInputLimit} символов`);
  const priceRaw = String(formData.get("price") || "").trim();
  const price = parseRublesToKopeks(priceRaw);
  if (price === null) throw new DomainError(rubleIssue(priceRaw, true));
  const offer = readLogisticsAndLead(formData, parseRublesToKopeks);
  const compareRaw = String(formData.get("compareAt") || "").trim();
  const compareAt = compareRaw ? parsePriceToKopeks(compareRaw) : null;
  if (compareRaw && compareAt === null) throw new DomainError("Старая цена указана неверно");
  const yearRaw = String(formData.get("year") || "").trim();
  const year = yearRaw ? parseIntStrict(yearRaw) : null;
  if (yearRaw && (year === null || year < 1950 || year > 2100)) {
    throw new DomainError("Год указан неверно");
  }
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
    throw new DomainError("Товар не найден");
  }
  if (existing && (existing.status === "reserved" || existing.status === "archived")) {
    throw new DomainError("Этот товар уже нельзя редактировать");
  }

  const removeIds = new Set(removedPhotoIds(formData));
  const kept = (existing?.images ?? []).filter((image) => !removeIds.has(image.id));
  const files = photoFiles(formData);
  const photoCount = kept.length + files.length;
  assertPhotoRoom(kept.length, files.length);
  const shouldReview = intent === "submit" || existing?.status === "published";
  if (shouldReview && !user.emailVerifiedAt) {
    throw new DomainError("Подтвердите email, чтобы разместить товар");
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
    logisticsKopeks: offer.logisticsKopeks,
    leadTime: offer.leadTime,
    ...readCityPlace(String(formData.get("city") || ""), String(formData.get("lat") || ""), String(formData.get("lng") || ""), shouldReview),
    onOrder: false,
    quantity: 1,
    status,
    rejectionReason: "",
    updatedAt: new Date(),
  };

  let id = existing?.id ?? crypto.randomUUID();
  const slug = await listingSlugFor(db, title, id, existing?.id);
  if (!existing) {
    await db.insert(listings).values({ ...values, id, slug });
  } else {
    await db.update(listings).set({ ...values, slug }).where(eq(listings.id, id));
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
