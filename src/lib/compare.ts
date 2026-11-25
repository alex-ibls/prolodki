import { cache } from "react";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { listingImages, listings } from "@/db/schema";

export { compareHref, compareIdsFromPath, compareLimit } from "@/lib/compare-list";

export const loadCompareListings = cache(async (ids: string[]) => {
  if (ids.length === 0) return [];
  const rows = await db.query.listings.findMany({
    where: and(inArray(listings.id, ids), eq(listings.status, "published")),
    with: {
      images: { orderBy: asc(listingImages.sort) },
      attributes: { with: { definition: true } },
      brandRef: true,
    },
  });
  const order = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
});
