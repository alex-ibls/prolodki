import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { favorites, listingEvents, listingMessages, listingThreads, listings, orders, users } from "@/db/schema";
import { isListingSeller } from "@/lib/messages";
import { mergeGuestCart } from "@/lib/cart";
import { ensureGuestToken, readGuestToken } from "@/lib/guest";
import { getCurrentUser } from "@/lib/session";

const VIEW_WINDOW_MS = 24 * 60 * 60 * 1000;

export type ListingStat = {
  view: number;
  favorite: number;
  cart_add: number;
  phone_reveal: number;
};

async function actor() {
  const user = await getCurrentUser();
  if (user) return { userId: user.id, guestToken: null as string | null };
  const guestToken = await ensureGuestToken();
  return { userId: null as string | null, guestToken };
}

export async function recordListingEvent(input: {
  listingId: string;
  kind: "view" | "favorite_add" | "favorite_remove" | "cart_add" | "phone_reveal";
  userId?: string | null;
  guestToken?: string | null;
}) {
  const userId = input.userId ?? null;
  const guestToken = input.guestToken ?? null;
  if (input.kind === "view") {
    const since = new Date(Date.now() - VIEW_WINDOW_MS);
    const [recent] = await db
      .select({ id: listingEvents.id })
      .from(listingEvents)
      .where(
        and(
          eq(listingEvents.listingId, input.listingId),
          eq(listingEvents.kind, "view"),
          gte(listingEvents.createdAt, since),
          userId ? eq(listingEvents.userId, userId) : eq(listingEvents.guestToken, guestToken ?? ""),
        ),
      )
      .limit(1);
    if (recent) return false;
  }
  await db.insert(listingEvents).values({
    listingId: input.listingId,
    kind: input.kind,
    userId,
    guestToken,
  });
  return true;
}

export async function recordView(listingId: string) {
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.status, "published")),
    columns: { id: true },
  });
  if (!listing) return;
  const who = await actor();
  await recordListingEvent({ listingId, kind: "view", ...who });
}

export async function listingStats(ids: string[]) {
  const map = new Map<string, ListingStat>();
  for (const id of ids) map.set(id, { view: 0, favorite: 0, cart_add: 0, phone_reveal: 0 });
  if (ids.length === 0) return map;

  const events = await db
    .select({
      listingId: listingEvents.listingId,
      kind: listingEvents.kind,
      count: sql<number>`count(*)::int`,
    })
    .from(listingEvents)
    .where(inArray(listingEvents.listingId, ids))
    .groupBy(listingEvents.listingId, listingEvents.kind);
  for (const row of events) {
    const stat = map.get(row.listingId);
    if (!stat || row.kind === "favorite_add" || row.kind === "favorite_remove") continue;
    stat[row.kind] = row.count;
  }

  const saved = await db
    .select({
      listingId: favorites.listingId,
      count: sql<number>`count(*)::int`,
    })
    .from(favorites)
    .where(inArray(favorites.listingId, ids))
    .groupBy(favorites.listingId);
  for (const row of saved) {
    const stat = map.get(row.listingId);
    if (stat) stat.favorite = row.count;
  }
  return map;
}

export async function isFavorite(listingId: string) {
  const user = await getCurrentUser();
  if (user) {
    const row = await db.query.favorites.findFirst({
      where: and(eq(favorites.listingId, listingId), eq(favorites.userId, user.id)),
    });
    return Boolean(row);
  }
  const token = await readGuestToken();
  if (!token) return false;
  const row = await db.query.favorites.findFirst({
    where: and(eq(favorites.listingId, listingId), eq(favorites.guestToken, token)),
  });
  return Boolean(row);
}

export async function toggleFavorite(listingId: string) {
  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    columns: { id: true, status: true },
  });
  if (!listing || listing.status !== "published") return;
  const who = await actor();
  const existing = await db.query.favorites.findFirst({
    where: and(
      eq(favorites.listingId, listingId),
      who.userId ? eq(favorites.userId, who.userId) : eq(favorites.guestToken, who.guestToken ?? ""),
    ),
  });
  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    await recordListingEvent({ listingId, kind: "favorite_remove", ...who });
    return;
  }
  await db.insert(favorites).values({
    listingId,
    userId: who.userId,
    guestToken: who.guestToken,
  });
  await recordListingEvent({ listingId, kind: "favorite_add", ...who });
}

export async function favoriteListings() {
  const user = await getCurrentUser();
  const token = user ? null : await readGuestToken();
  if (!user && !token) return [];
  const rows = await db.query.favorites.findMany({
    where: user ? eq(favorites.userId, user.id) : eq(favorites.guestToken, token!),
    orderBy: desc(favorites.createdAt),
  });
  if (rows.length === 0) return [];
  const items = await db.query.listings.findMany({
    where: inArray(
      listings.id,
      rows.map((row) => row.listingId),
    ),
    with: { images: { limit: 1 } },
  });
  const byId = new Map(items.map((item) => [item.id, item]));
  return rows.flatMap((row) => {
    const listing = byId.get(row.listingId);
    return listing ? [listing] : [];
  });
}

export async function revealListingPhone(listingId: string) {
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.status, "published")),
    with: { seller: true, organization: true },
  });
  const phone = listing?.seller?.phone?.trim() || listing?.organization?.phone?.trim() || "";
  if (!listing || !phone) return "";
  const who = await actor();
  await recordListingEvent({ listingId, kind: "phone_reveal", ...who });
  return phone;
}

export async function claimGuestSession(userId: string, guestToken: string | null) {
  if (!guestToken) return;
  await mergeGuestCart(userId, guestToken);
  const saved = await db.select().from(favorites).where(eq(favorites.guestToken, guestToken));
  for (const row of saved) {
    const [own] = await db
      .select({ id: favorites.id })
      .from(favorites)
      .where(and(eq(favorites.listingId, row.listingId), eq(favorites.userId, userId)))
      .limit(1);
    if (own) {
      await db.delete(favorites).where(eq(favorites.id, row.id));
    } else {
      await db
        .update(favorites)
        .set({ userId, guestToken: null })
        .where(eq(favorites.id, row.id));
    }
  }
  await db
    .update(orders)
    .set({ buyerId: userId, guestToken: null })
    .where(and(eq(orders.guestToken, guestToken), isNull(orders.buyerId)));
  await db
    .update(listingEvents)
    .set({ userId })
    .where(and(eq(listingEvents.guestToken, guestToken), isNull(listingEvents.userId)));
  const account = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, staffRole: true },
  });
  const threads = await db.select().from(listingThreads).where(eq(listingThreads.guestToken, guestToken));
  for (const thread of threads) {
    const listing = await db.query.listings.findFirst({
      where: eq(listings.id, thread.listingId),
      columns: { sellerUserId: true, organizationId: true },
    });
    if (!listing || (account && isListingSeller(account, listing))) continue;
    const [own] = await db
      .select({ id: listingThreads.id })
      .from(listingThreads)
      .where(and(eq(listingThreads.listingId, thread.listingId), eq(listingThreads.buyerUserId, userId)))
      .limit(1);
    if (own) {
      await db
        .update(listingMessages)
        .set({ threadId: own.id })
        .where(eq(listingMessages.threadId, thread.id));
      await db.delete(listingThreads).where(eq(listingThreads.id, thread.id));
    } else {
      await db
        .update(listingThreads)
        .set({ buyerUserId: userId, guestToken: null })
        .where(eq(listingThreads.id, thread.id));
    }
  }
}
