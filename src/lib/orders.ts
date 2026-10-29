import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  cartItems,
  customers,
  dealNotes,
  deals,
  listings,
  nomenclature,
  orderItems,
  orders,
  stockMovements,
} from "@/db/schema";
import { DomainError } from "@/lib/errors";
import { orderCode } from "@/lib/format";
import type { CurrentUser } from "@/lib/session";
import { availableOf } from "@/lib/stock";

export type OrderStatus = "placed" | "confirmed" | "completed" | "cancelled";

export function deriveOrderStatus(lines: { lineStatus: OrderStatus }[]): OrderStatus {
  if (lines.length === 0) return "cancelled";
  if (lines.every((line) => line.lineStatus === "cancelled")) return "cancelled";
  const live = lines.filter((line) => line.lineStatus !== "cancelled");
  if (live.every((line) => line.lineStatus === "completed")) return "completed";
  if (live.every((line) => line.lineStatus === "confirmed" || line.lineStatus === "completed")) {
    return "confirmed";
  }
  return "placed";
}

async function syncDeal(orderId: string, status: OrderStatus, authorId: string | null) {
  const deal = await db.query.deals.findFirst({ where: eq(deals.orderId, orderId) });
  if (!deal) return;
  if (status === "cancelled" && deal.status !== "lost") {
    await db.update(deals).set({ status: "lost", updatedAt: new Date() }).where(eq(deals.id, deal.id));
    await db.insert(dealNotes).values({
      dealId: deal.id,
      authorId,
      body: "Заказ отменён",
    });
  }
  if (status === "completed" && deal.status !== "won") {
    await db.update(deals).set({ status: "won", updatedAt: new Date() }).where(eq(deals.id, deal.id));
    await db.insert(dealNotes).values({
      dealId: deal.id,
      authorId,
      body: "Заказ завершён",
    });
  }
}

export async function placeOrder(
  buyer: { id: string; email: string } | null,
  guestToken: string | null,
  cartId: string,
  input: {
    paymentMethod: "invoice" | "cash" | "agreement";
    fulfillment: "pickup" | "delivery_agreed";
    contactName: string;
    phone: string;
    city: string;
    comment: string;
  },
) {
  if (!buyer && !guestToken) throw new DomainError("Сессия не найдена");
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  if (items.length === 0) throw new DomainError("Корзина пуста");

  const orderId = await db.transaction(async (tx) => {
    const listingIds = items.map((item) => item.listingId);
    const locked = await tx
      .select()
      .from(listings)
      .where(inArray(listings.id, listingIds))
      .for("update");
    const listingById = new Map(locked.map((listing) => [listing.id, listing]));
    const nomIds = locked.flatMap((listing) => (listing.nomenclatureId ? [listing.nomenclatureId] : []));
    const noms = nomIds.length
      ? await tx.select().from(nomenclature).where(inArray(nomenclature.id, nomIds)).for("update")
      : [];
    const nomById = new Map(noms.map((item) => [item.id, item]));

    for (const item of items) {
      const listing = listingById.get(item.listingId);
      if (!listing || listing.status !== "published") {
        throw new DomainError("Одна из позиций больше не продаётся");
      }
      if (buyer && listing.sellerUserId && listing.sellerUserId === buyer.id) {
        throw new DomainError(`Нельзя купить своё объявление «${listing.title}»`);
      }
      const available = listing.nomenclatureId
        ? availableOf(nomById.get(listing.nomenclatureId)!)
        : listing.quantity;
      if (listing.priceKopeks <= 0) throw new DomainError(`«${listing.title}»: цена по запросу`);
      if (item.qty > available) {
        throw new DomainError(`«${listing.title}»: доступно ${Math.max(available, 0)}`);
      }
    }

    const [order] = await tx
      .insert(orders)
      .values({
        buyerId: buyer?.id,
        guestToken: buyer ? null : guestToken,
        paymentMethod: input.paymentMethod,
        fulfillment: input.fulfillment,
        contactName: input.contactName,
        phone: input.phone,
        city: input.city,
        comment: input.comment,
      })
      .returning();

    let amount = 0;
    for (const item of items) {
      const listing = listingById.get(item.listingId)!;
      amount += listing.priceKopeks * item.qty;
      await tx.insert(orderItems).values({
        orderId: order.id,
        listingId: listing.id,
        nomenclatureId: listing.nomenclatureId,
        sellerUserId: listing.sellerUserId,
        organizationId: listing.organizationId,
        title: listing.title,
        priceKopeks: listing.priceKopeks,
        qty: item.qty,
      });

      if (listing.nomenclatureId) {
        const nom = nomById.get(listing.nomenclatureId)!;
        const reserved = nom.quantityReserved + item.qty;
        await tx
          .update(nomenclature)
          .set({ quantityReserved: reserved, updatedAt: new Date() })
          .where(eq(nomenclature.id, nom.id));
        await tx
          .update(listings)
          .set({ quantity: nom.quantityOnHand - reserved, updatedAt: new Date() })
          .where(eq(listings.id, listing.id));
        await tx.insert(stockMovements).values({
          nomenclatureId: nom.id,
          delta: 0,
          reason: "order",
          note: `Резерв +${item.qty}`,
          userId: buyer?.id ?? null,
        });
        nom.quantityReserved = reserved;
      } else {
        await tx
          .update(listings)
          .set({ status: "reserved", quantity: 0, updatedAt: new Date() })
          .where(eq(listings.id, listing.id));
      }
    }

    await tx.delete(cartItems).where(eq(cartItems.cartId, cartId));

    const [customer] = buyer
      ? await tx.select().from(customers).where(eq(customers.userId, buyer.id))
      : await tx
          .select()
          .from(customers)
          .where(and(eq(customers.phone, input.phone), isNull(customers.userId)))
          .limit(1);
    let customerId = customer?.id;
    if (!customerId) {
      const [created] = await tx
        .insert(customers)
        .values({
          userId: buyer?.id,
          name: input.contactName,
          phone: input.phone,
          email: buyer?.email ?? "",
          city: input.city,
          source: "order",
        })
        .returning();
      customerId = created.id;
    }
    await tx.insert(deals).values({
      customerId,
      orderId: order.id,
      title: `Заказ ${orderCode(order.orderNo)}`,
      amountKopeks: amount,
      status: "new",
    });
    return order.id;
  });

  return orderId;
}

async function releaseLine(
  line: {
    id: string;
    qty: number;
    listingId: string | null;
    nomenclatureId: string | null;
    lineStatus: string;
  },
  userId: string | null,
  reason: "cancel" | "complete",
) {
  if (!line.listingId) return;
  const [listing] = await db.select().from(listings).where(eq(listings.id, line.listingId)).for("update");
  if (!listing) return;

  if (reason === "cancel" && line.lineStatus === "placed") {
    if (line.nomenclatureId) {
      const [nom] = await db
        .select()
        .from(nomenclature)
        .where(eq(nomenclature.id, line.nomenclatureId))
        .for("update");
      if (!nom) return;
      const reserved = Math.max(0, nom.quantityReserved - line.qty);
      await db
        .update(nomenclature)
        .set({ quantityReserved: reserved, updatedAt: new Date() })
        .where(eq(nomenclature.id, nom.id));
      await db
        .update(listings)
        .set({ quantity: nom.quantityOnHand - reserved, updatedAt: new Date() })
        .where(eq(listings.id, listing.id));
      await db.insert(stockMovements).values({
        nomenclatureId: nom.id,
        delta: 0,
        reason: "cancel",
        note: `Снят резерв ${line.qty}`,
        userId,
      });
    } else if (listing.status === "reserved") {
      await db
        .update(listings)
        .set({ status: "published", quantity: 1, updatedAt: new Date() })
        .where(eq(listings.id, listing.id));
    }
  }

  if (reason === "complete" && line.nomenclatureId) {
    const [nom] = await db
      .select()
      .from(nomenclature)
      .where(eq(nomenclature.id, line.nomenclatureId))
      .for("update");
    if (!nom) return;
    const onHand = nom.quantityOnHand - line.qty;
    const reserved = Math.max(0, nom.quantityReserved - line.qty);
    await db
      .update(nomenclature)
      .set({ quantityOnHand: onHand, quantityReserved: reserved, updatedAt: new Date() })
      .where(eq(nomenclature.id, nom.id));
    await db
      .update(listings)
      .set({ quantity: onHand - reserved, updatedAt: new Date() })
      .where(eq(listings.id, listing.id));
    await db.insert(stockMovements).values({
      nomenclatureId: nom.id,
      delta: -line.qty,
      reason: "complete",
      note: `Списание ${line.qty}`,
      userId,
    });
  }

  if (reason === "complete" && listing.source === "individual") {
    await db
      .update(listings)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(listings.id, listing.id));
  }
}

export async function cancelOrder(user: CurrentUser, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order || order.buyerId !== user.id) throw new DomainError("Заказ не найден");
  if (deriveOrderStatus(order.items) !== "placed") {
    throw new DomainError("Отменить можно только заказ, который ещё не подтверждён");
  }
  await db.transaction(async (tx) => {
    for (const line of order.items) {
      await tx
        .update(orderItems)
        .set({ lineStatus: "cancelled" })
        .where(eq(orderItems.id, line.id));
    }
  });
  for (const line of order.items) {
    await releaseLine(line, user.id, "cancel");
  }
  await syncDeal(orderId, "cancelled", user.id);
}

export async function cancelGuestOrder(guestToken: string, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order || order.buyerId || order.guestToken !== guestToken) throw new DomainError("Заказ не найден");
  if (deriveOrderStatus(order.items) !== "placed") {
    throw new DomainError("Отменить можно только заказ, который ещё не подтверждён");
  }
  await db.transaction(async (tx) => {
    for (const line of order.items) {
      await tx.update(orderItems).set({ lineStatus: "cancelled" }).where(eq(orderItems.id, line.id));
    }
  });
  for (const line of order.items) {
    await releaseLine(line, null, "cancel");
  }
  await syncDeal(orderId, "cancelled", null);
}

export function canManageLine(
  user: CurrentUser,
  line: { sellerUserId: string | null; organizationId: string | null },
) {
  if (line.sellerUserId && line.sellerUserId === user.id) return true;
  if (user.staffRole === "manager" && line.organizationId && !line.sellerUserId) return true;
  return false;
}

export async function transitionLine(
  user: CurrentUser,
  itemId: string,
  next: "confirmed" | "completed" | "cancelled",
) {
  const line = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, itemId),
    with: { order: { with: { items: true } } },
  });
  if (!line || !canManageLine(user, line)) throw new DomainError("Нет доступа к строке заказа");
  if (next === "confirmed" && line.lineStatus !== "placed") {
    throw new DomainError("Подтвердить можно только новую строку");
  }
  if (next === "completed" && line.lineStatus !== "confirmed") {
    throw new DomainError("Сначала подтвердите строку");
  }
  if (next === "cancelled" && line.lineStatus !== "placed") {
    throw new DomainError("Отменить можно только новую строку");
  }

  await db.update(orderItems).set({ lineStatus: next }).where(eq(orderItems.id, line.id));
  if (next === "cancelled") await releaseLine(line, user.id, "cancel");
  if (next === "completed") await releaseLine(line, user.id, "complete");

  const fresh = await db.select().from(orderItems).where(eq(orderItems.orderId, line.orderId));
  await syncDeal(line.orderId, deriveOrderStatus(fresh), user.id);
}

export async function getOrderBundle(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true, buyer: true },
  });
}
