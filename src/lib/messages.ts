import { and, asc, desc, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/db";
import { listingMessages, listingThreads, listings } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { ensureGuestToken, readGuestToken } from "@/lib/guest";
import { getCurrentUser, type CurrentUser } from "@/lib/session";

type ListingOwner = { sellerUserId: string | null; organizationId: string | null };

export function isListingSeller(user: Pick<CurrentUser, "id" | "staffRole"> | null, listing: ListingOwner) {
  if (!user) return false;
  if (listing.sellerUserId && listing.sellerUserId === user.id) return true;
  if (!listing.sellerUserId && user.staffRole === "manager" && listing.organizationId) return true;
  return false;
}

function cleanBody(raw: string) {
  const body = raw.trim();
  if (body.length < 2) throw new DomainError("Напишите сообщение");
  if (body.length > 2000) throw new DomainError("Сообщение длиннее 2000 символов");
  return body;
}

async function ownThread(listingId: string, userId: string | null, guestToken: string | null) {
  if (userId) {
    return db.query.listingThreads.findFirst({
      where: and(eq(listingThreads.listingId, listingId), eq(listingThreads.buyerUserId, userId)),
    });
  }
  if (!guestToken) return null;
  return db.query.listingThreads.findFirst({
    where: and(eq(listingThreads.listingId, listingId), eq(listingThreads.guestToken, guestToken)),
  });
}

export async function buyerThreadForListing(listingId: string) {
  const user = await getCurrentUser();
  const guestToken = user ? null : await readGuestToken();
  return ownThread(listingId, user?.id ?? null, guestToken);
}

export async function sendListingMessage(listingId: string, contactName: string, rawBody: string) {
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.status, "published")),
  });
  if (!listing) throw new DomainError("Объявление недоступно");
  const user = await getCurrentUser();
  if (isListingSeller(user ?? null, listing)) throw new DomainError("Нельзя написать по своему объявлению");
  const body = cleanBody(rawBody);
  const name = (user?.name || contactName).trim();
  if (name.length < 2) throw new DomainError("Укажите имя");

  const guestToken = user ? null : await ensureGuestToken();
  const existing = await ownThread(listing.id, user?.id ?? null, guestToken);
  if (existing) {
    await db.insert(listingMessages).values({
      threadId: existing.id,
      body,
      fromSeller: false,
      authorUserId: user?.id,
    });
    await db
      .update(listingThreads)
      .set({ contactName: name, updatedAt: new Date() })
      .where(eq(listingThreads.id, existing.id));
    return existing.id;
  }

  const [thread] = await db
    .insert(listingThreads)
    .values({
      listingId: listing.id,
      buyerUserId: user?.id,
      guestToken,
      contactName: name,
      updatedAt: new Date(),
    })
    .returning();
  await db.insert(listingMessages).values({
    threadId: thread!.id,
    body,
    fromSeller: false,
    authorUserId: user?.id,
  });
  return thread!.id;
}

const threadWith = {
  listing: true,
  messages: { orderBy: asc(listingMessages.createdAt) },
} as const;

export async function getVisibleThread(threadId: string) {
  const thread = await db.query.listingThreads.findFirst({
    where: eq(listingThreads.id, threadId),
    with: threadWith,
  });
  if (!thread?.listing) return null;
  const user = await getCurrentUser();
  if (user && thread.buyerUserId === user.id) return { thread, role: "buyer" as const };
  if (!user) {
    const token = await readGuestToken();
    if (token && thread.guestToken === token && !thread.buyerUserId) return { thread, role: "buyer" as const };
  }
  if (isListingSeller(user ?? null, thread.listing)) return { thread, role: "seller" as const };
  return null;
}

export async function replyToThread(threadId: string, rawBody: string) {
  const visible = await getVisibleThread(threadId);
  if (!visible) throw new DomainError("Переписка не найдена");
  const body = cleanBody(rawBody);
  const user = await getCurrentUser();
  await db.insert(listingMessages).values({
    threadId,
    body,
    fromSeller: visible.role === "seller",
    authorUserId: user?.id,
  });
  await db.update(listingThreads).set({ updatedAt: new Date() }).where(eq(listingThreads.id, threadId));
  return visible.role;
}

export async function buyerThreads() {
  const user = await getCurrentUser();
  if (user) {
    return db.query.listingThreads.findMany({
      where: eq(listingThreads.buyerUserId, user.id),
      with: threadWith,
      orderBy: desc(listingThreads.updatedAt),
    });
  }
  const token = await readGuestToken();
  if (!token) return [];
  return db.query.listingThreads.findMany({
    where: and(eq(listingThreads.guestToken, token), isNull(listingThreads.buyerUserId)),
    with: threadWith,
    orderBy: desc(listingThreads.updatedAt),
  });
}

export async function sellerThreads(user: Pick<CurrentUser, "id" | "staffRole">) {
  const sellerWhere =
    user.staffRole === "manager"
      ? or(eq(listings.sellerUserId, user.id), and(isNull(listings.sellerUserId), isNotNull(listings.organizationId)))
      : eq(listings.sellerUserId, user.id);
  const owned = await db.select({ id: listings.id }).from(listings).where(sellerWhere);
  if (owned.length === 0) return [];
  return db.query.listingThreads.findMany({
    where: inArray(
      listingThreads.listingId,
      owned.map((row) => row.id),
    ),
    with: threadWith,
    orderBy: desc(listingThreads.updatedAt),
  });
}
