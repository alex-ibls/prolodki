import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts, listingImages, listings } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { ensureGuestToken, readGuestToken } from "@/lib/guest";
import { quoteKit } from "@/lib/kit";
import { getCurrentUser } from "@/lib/session";

async function createCart(input: { userId?: string; guestToken?: string }) {
  const [cart] = await db
    .insert(carts)
    .values({
      userId: input.userId,
      guestToken: input.guestToken,
      updatedAt: new Date(),
    })
    .returning();
  return cart;
}

export async function readCart() {
  const user = await getCurrentUser();
  if (user) return db.query.carts.findFirst({ where: eq(carts.userId, user.id) });
  const token = await readGuestToken();
  if (!token) return null;
  return db.query.carts.findFirst({ where: eq(carts.guestToken, token) });
}

export async function getOrCreateCart() {
  const user = await getCurrentUser();
  if (user) {
    const existing = await db.query.carts.findFirst({ where: eq(carts.userId, user.id) });
    return existing ?? createCart({ userId: user.id });
  }
  const token = await ensureGuestToken();
  const guestCart = await db.query.carts.findFirst({ where: eq(carts.guestToken, token) });
  return guestCart ?? createCart({ guestToken: token });
}

export async function cartCount() {
  const cart = await readCart();
  if (!cart) return 0;
  const [row] = await db
    .select({ count: sql<number>`coalesce(sum(${cartItems.qty}), 0)::int` })
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id));
  return row?.count ?? 0;
}

export async function getCartView() {
  const cart = await readCart();
  if (!cart) return { cart: null, items: [] };
  const items = await db.query.cartItems.findMany({
    where: eq(cartItems.cartId, cart.id),
    with: {
      listing: {
        with: { images: { limit: 1, orderBy: asc(listingImages.sort) } },
      },
    },
  });
  return { cart, items };
}

export async function mergeGuestCart(userId: string, guestToken: string | undefined) {
  if (!guestToken) return;
  const guest = await db.query.carts.findFirst({ where: eq(carts.guestToken, guestToken) });
  if (!guest) return;
  let userCart = await db.query.carts.findFirst({ where: eq(carts.userId, userId) });
  if (!userCart) userCart = await createCart({ userId });
  const guestItems = await db.select().from(cartItems).where(eq(cartItems.cartId, guest.id));
  for (const item of guestItems) {
    const listing = await db.query.listings.findFirst({ where: eq(listings.id, item.listingId) });
    if (!listing || listing.status !== "published" || listing.source === "individual") continue;
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, userCart.id), eq(cartItems.listingId, item.listingId)));
    const nextQty = (existing?.qty ?? 0) + item.qty;
    if (existing) {
      await db
        .update(cartItems)
        .set({ qty: nextQty })
        .where(and(eq(cartItems.cartId, userCart.id), eq(cartItems.listingId, item.listingId)));
    } else {
      await db.insert(cartItems).values({
        cartId: userCart.id,
        listingId: item.listingId,
        qty: nextQty,
        options: item.options,
      });
    }
  }
  await db.delete(cartItems).where(eq(cartItems.cartId, guest.id));
  await db.delete(carts).where(eq(carts.id, guest.id));
}

export async function cartOptionsForListing(listingId: string) {
  const cart = await readCart();
  if (!cart) return [] as string[];
  const [item] = await db
    .select({ options: cartItems.options })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.listingId, listingId)));
  return (item?.options ?? "").split(",").map((id) => id.trim()).filter(Boolean);
}

export async function upsertCartItem(listingId: string, optionIds: string[], qty?: number) {
  const listing = await assertCartQty(listingId, qty ?? 1);
  const user = await getCurrentUser();
  if (user && listing.sellerUserId === user.id) throw new DomainError("Нельзя купить свой товар");
  const picked = await quoteKit(listing.nomenclatureId, optionIds.join(","));
  const cart = await getOrCreateCart();
  const options = picked.ids.join(",");
  const [existing] = await db
    .select({ qty: cartItems.qty })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.listingId, listingId)));
  if (existing) {
    await db
      .update(cartItems)
      .set(qty == null ? { options } : { options, qty })
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.listingId, listingId)));
  } else {
    await db.insert(cartItems).values({ cartId: cart.id, listingId, qty: qty ?? 1, options });
  }
  return { cart, listing, created: !existing };
}

export async function assertCartQty(listingId: string, qty: number) {
  if (!Number.isInteger(qty) || qty < 1) throw new DomainError("Укажите количество");
  const listing = await db.query.listings.findFirst({ where: eq(listings.id, listingId) });
  if (!listing || listing.status !== "published") throw new DomainError("Товар недоступен");
  if (listing.source === "individual") {
    throw new DomainError("Товар частного продавца не оформляется заказом. Напишите продавцу.");
  }
  if (listing.priceKopeks <= 0) throw new DomainError("Цена по запросу, заказ не оформляется");
  return listing;
}

export async function listingIdsInCart(cartId: string) {
  const rows = await db
    .select({ id: cartItems.listingId })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return rows.map((row) => row.id);
}

export async function deleteCartItems(cartId: string, listingIds: string[]) {
  if (listingIds.length === 0) return;
  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cartId), inArray(cartItems.listingId, listingIds)));
}
