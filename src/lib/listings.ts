import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  attributeDefs,
  listingAttributes,
  listingImages,
  listings,
} from "@/db/schema";
import { readListingDescription } from "@/lib/description";
import { DomainError } from "@/lib/errors";
import { parseIntStrict, parseNumber, parsePriceToKopeks } from "@/lib/format";
import { readOnOrder, readRegistered } from "@/lib/labels";
import { ensureIndividualSeller } from "@/lib/seller";
import type { CurrentUser } from "@/lib/session";
import { slugify } from "@/lib/slug";
import { assertLeafCategory, resolveBrandId } from "@/lib/taxonomy";
import { assertPhotoRoom, photoFiles, saveListingImage } from "@/lib/uploads";

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
      if (raw.length > 80) throw new DomainError("Материал — не больше 80 символов");
      values.push({ attributeDefId: def.id, valueNumber: null, valueText: raw });
      continue;
    }
    const value = parseNumber(raw);
    if (value === null) throw new DomainError(`«${def.name}» должно быть числом`);
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
  const price = parsePriceToKopeks(String(formData.get("price") || ""));
  if (price === null || price <= 0) throw new DomainError("Укажите цену в рублях");
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
  const onOrder = readOnOrder(String(formData.get("onOrder") || ""));
  if (onOrder === null) throw new DomainError("Укажите, в наличии или на заказ");
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

  const files = photoFiles(formData);
  const photoCount = (existing?.images.length ?? 0) + files.length;
  assertPhotoRoom(existing?.images.length ?? 0, files.length);
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
    model: String(formData.get("model") || "").trim(),
    year,
    condition: "used" as const,
    priceKopeks: price,
    compareAtKopeks: compareAt,
    city: String(formData.get("city") || user.city || "").trim(),
    registered,
    onOrder,
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

  let sort = existing?.images.length ?? 0;
  for (const file of files) {
    const stored = await saveListingImage(id!, file);
    if (!stored) continue;
    await db.insert(listingImages).values({ listingId: id!, path: stored, sort });
    sort += 1;
  }
  return id!;
}
