import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, type Tx } from "@/db";
import { cartItems, customers, listings, nomenclature, orderItems, orders, stockMovements } from "@/db/schema";
import { DomainError } from "@/lib/errors";
import type { CurrentUser } from "@/lib/session";
import { quoteKit } from "@/lib/kit";
import { availableOf } from "@/lib/stock";

export const orderStatusValues = [
  "placed",
  "awaiting_manufacturer",
  "sent_to_manufacturer",
  "awaiting_supply",
  "at_warehouse",
  "shipped_to_buyer",
  "awaiting_buyer",
  "delivered",
  "confirmed",
  "cancelled",
  "completed",
] as const;

export type OrderStatus = (typeof orderStatusValues)[number];
export type Fulfillment = "pickup" | "delivery_agreed";
export type StatusDateKind = "supply" | "pickup";

export type ManagerAction = {
  next: OrderStatus;
  label: string;
  date: StatusDateKind | null;
};

const statusRank: Record<OrderStatus, number> = {
  placed: 0,
  awaiting_manufacturer: 1,
  sent_to_manufacturer: 2,
  awaiting_supply: 3,
  at_warehouse: 4,
  awaiting_buyer: 5,
  shipped_to_buyer: 6,
  delivered: 7,
  confirmed: 8,
  completed: 9,
  cancelled: 100,
};

export function deriveOrderStatus(lines: { lineStatus: OrderStatus }[]): OrderStatus {
  if (lines.length === 0) return "cancelled";
  const live = lines.filter((line) => line.lineStatus !== "cancelled");
  if (live.length === 0) return "cancelled";
  return live.reduce((earliest, line) =>
    statusRank[line.lineStatus] < statusRank[earliest.lineStatus] ? line : earliest,
  ).lineStatus;
}

export function supplyPath(fulfillment: Fulfillment): OrderStatus[] {
  const head: OrderStatus[] = [
    "placed",
    "awaiting_manufacturer",
    "sent_to_manufacturer",
    "awaiting_supply",
    "at_warehouse",
  ];
  if (fulfillment === "delivery_agreed") return [...head, "shipped_to_buyer"];
  return [...head, "awaiting_buyer", "delivered"];
}

export function managerActions(
  line: { lineStatus: OrderStatus; supply: boolean; settled: boolean },
  fulfillment: Fulfillment,
): ManagerAction[] {
  const cancel: ManagerAction = { next: "cancelled", label: "Отменить", date: null };
  if (!line.supply) {
    if (line.lineStatus === "placed") {
      return [
        { next: "confirmed", label: "Подтвердить", date: null },
        cancel,
      ];
    }
    if (line.lineStatus === "confirmed" && !line.settled) {
      return [{ next: "completed", label: "Списать остаток", date: null }];
    }
    return [];
  }

  const forward: Partial<Record<OrderStatus, ManagerAction>> = {
    placed: { next: "awaiting_manufacturer", label: "Ожидает заказа у производителя", date: null },
    awaiting_manufacturer: { next: "sent_to_manufacturer", label: "Заказ отправлен производителю", date: null },
    sent_to_manufacturer: { next: "awaiting_supply", label: "Ожидает поставку", date: "supply" },
    awaiting_supply: { next: "at_warehouse", label: "Доставлен на склад", date: null },
    at_warehouse:
      fulfillment === "delivery_agreed"
        ? { next: "shipped_to_buyer", label: "Отправлен покупателю", date: null }
        : { next: "awaiting_buyer", label: "Ожидает покупателя", date: "pickup" },
    awaiting_buyer: { next: "delivered", label: "Доставлен покупателю", date: null },
  };
  const step = forward[line.lineStatus];
  if (!step) return [];
  return [step, cancel];
}

function parseStatusDate(raw: string) {
  const value = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new DomainError("Укажите дату");
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new DomainError("Укажите дату");
  }
  return value;
}

type StockLine = {
  qty: number;
  listingId: string | null;
  nomenclatureId: string | null;
  lineStatus: string;
  supply: boolean;
};

async function releaseReserve(tx: Tx, line: StockLine, userId: string | null) {
  if (line.supply || line.lineStatus !== "placed" || !line.listingId) return;
  const [listing] = await tx.select().from(listings).where(eq(listings.id, line.listingId)).for("update");
  if (!listing) return;

  if (line.nomenclatureId) {
    const [nom] = await tx
      .select()
      .from(nomenclature)
      .where(eq(nomenclature.id, line.nomenclatureId))
      .for("update");
    if (!nom) return;
    const reserved = Math.max(0, nom.quantityReserved - line.qty);
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
      reason: "cancel",
      note: `Снят резерв ${line.qty}`,
      userId,
    });
    return;
  }

  if (listing.status === "reserved") {
    await tx
      .update(listings)
      .set({ status: "published", quantity: 1, updatedAt: new Date() })
      .where(eq(listings.id, listing.id));
  }
}

async function writeOff(tx: Tx, line: StockLine, userId: string | null) {
  if (line.supply || !line.nomenclatureId) return;
  const [nom] = await tx
    .select()
    .from(nomenclature)
    .where(eq(nomenclature.id, line.nomenclatureId))
    .for("update");
  if (!nom) return;
  const onHand = nom.quantityOnHand - line.qty;
  const reserved = Math.max(0, nom.quantityReserved - line.qty);
  await tx
    .update(nomenclature)
    .set({ quantityOnHand: onHand, quantityReserved: reserved, updatedAt: new Date() })
    .where(eq(nomenclature.id, nom.id));
  if (line.listingId) {
    await tx
      .update(listings)
      .set({ quantity: onHand - reserved, updatedAt: new Date() })
      .where(eq(listings.id, line.listingId));
  }
  await tx.insert(stockMovements).values({
    nomenclatureId: nom.id,
    delta: -line.qty,
    reason: "complete",
    note: `Списание ${line.qty}`,
    userId,
  });
}

export async function placeOrder(
  buyer: { id: string; email: string } | null,
  guestToken: string | null,
  cartId: string,
  input: {
    paymentMethod: "invoice" | "cash" | "agreement";
    fulfillment: Fulfillment;
    contactName: string;
    phone: string;
    city: string;
    comment: string;
  },
) {
  if (!buyer && !guestToken) throw new DomainError("Сессия не найдена");
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cartId));
  if (items.length === 0) throw new DomainError("В заказе ничего нет");

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
      if (listing.source === "individual") {
        throw new DomainError(`«${listing.title}» — товар частного продавца. Напишите продавцу.`);
      }
      if (buyer && listing.sellerUserId && listing.sellerUserId === buyer.id) {
        throw new DomainError(`Нельзя купить свой товар «${listing.title}»`);
      }
      if (listing.priceKopeks <= 0) throw new DomainError(`«${listing.title}»: цена по запросу`);
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

    for (const item of items) {
      const listing = listingById.get(item.listingId)!;
      const picked = await quoteKit(listing.nomenclatureId, item.options);
      const unit = listing.priceKopeks + picked.extraKopeks;
      let supply = false;
      if (listing.nomenclatureId) {
        const nom = nomById.get(listing.nomenclatureId)!;
        supply = listing.onOrder || availableOf(nom) <= 0;
      }
      await tx.insert(orderItems).values({
        orderId: order.id,
        listingId: listing.id,
        nomenclatureId: listing.nomenclatureId,
        sellerUserId: listing.sellerUserId,
        organizationId: listing.organizationId,
        title: picked.names.length ? `${listing.title}: ${picked.names.join(", ")}` : listing.title,
        priceKopeks: unit,
        qty: item.qty,
        options: picked.ids.join(","),
        supply,
      });

      if (supply) continue;

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
    if (!customer) {
      await tx.insert(customers).values({
        userId: buyer?.id,
        name: input.contactName,
        phone: input.phone,
        email: buyer?.email ?? "",
        city: input.city,
        source: "order",
      });
    }
    return order.id;
  });

  return orderId;
}

async function cancelLines(
  orderId: string,
  lines: (StockLine & { id: string })[],
  userId: string | null,
) {
  if (lines.some((line) => line.lineStatus !== "placed")) {
    throw new DomainError("Отменить можно только заказ, который ещё не подтверждён");
  }
  await db.transaction(async (tx) => {
    for (const line of lines) {
      const [locked] = await tx.select().from(orderItems).where(eq(orderItems.id, line.id)).for("update");
      if (!locked || locked.orderId !== orderId || locked.lineStatus !== "placed") {
        throw new DomainError("Статус заказа уже изменился");
      }
      await releaseReserve(tx, locked, userId);
      await tx.update(orderItems).set({ lineStatus: "cancelled", statusOn: null }).where(eq(orderItems.id, line.id));
    }
  });
}

export async function cancelOrder(user: CurrentUser, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order || order.buyerId !== user.id) throw new DomainError("Заказ не найден");
  await cancelLines(order.id, order.items, user.id);
}

export async function cancelGuestOrder(guestToken: string, orderId: string) {
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true },
  });
  if (!order || order.buyerId || order.guestToken !== guestToken) throw new DomainError("Заказ не найден");
  await cancelLines(order.id, order.items, null);
}

export function canManageLine(
  user: CurrentUser,
  line: { sellerUserId: string | null; organizationId: string | null },
) {
  if (line.sellerUserId) return false;
  if (user.staffRole === "manager" && line.organizationId) return true;
  return false;
}

export async function transitionLine(
  user: CurrentUser,
  itemId: string,
  next: OrderStatus,
  statusOnRaw: string,
) {
  const line = await db.query.orderItems.findFirst({
    where: eq(orderItems.id, itemId),
    with: { order: true },
  });
  if (!line?.order || !canManageLine(user, line)) throw new DomainError("Нет доступа к строке заказа");
  const action = managerActions(line, line.order.fulfillment).find((item) => item.next === next);
  if (!action) {
    if (line.supply && next === "confirmed") {
      throw new DomainError("У позиции нет остатка: проведите её по статусам поставки");
    }
    throw new DomainError("Этот статус сейчас недоступен");
  }
  const statusOn = action.date ? parseStatusDate(statusOnRaw) : null;

  await db.transaction(async (tx) => {
    const [locked] = await tx.select().from(orderItems).where(eq(orderItems.id, line.id)).for("update");
    if (!locked || locked.lineStatus !== line.lineStatus) {
      throw new DomainError("Статус заказа уже изменился");
    }
    if (next === "confirmed" || next === "completed") await writeOff(tx, locked, user.id);
    if (next === "cancelled") await releaseReserve(tx, locked, user.id);
    await tx
      .update(orderItems)
      .set({
        lineStatus: next,
        statusOn,
        settled: next === "confirmed" || next === "completed" ? true : locked.settled,
      })
      .where(eq(orderItems.id, line.id));
  });
}

export async function getOrderBundle(orderId: string) {
  return db.query.orders.findFirst({
    where: eq(orders.id, orderId),
    with: { items: true, buyer: true },
  });
}
