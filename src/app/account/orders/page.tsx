import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatDate, formatRub, orderCode } from "@/lib/format";
import { orderStatusLabel } from "@/lib/labels";
import { deriveOrderStatus } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Мои заказы" };

export default async function BuyerOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const rows = await db.query.orders.findMany({
    where: eq(orders.buyerId, user.id),
    with: { items: true },
    orderBy: desc(orders.createdAt),
  });
  return (
    <main>
      <h1 className="text-3xl">Мои заказы</h1>
      {rows.length === 0 ? <p className="mt-4 text-muted">Заказов пока нет.</p> : null}
      <ul className="mt-4 space-y-3">
        {rows.map((order) => {
          const sum = order.items.reduce((total, item) => total + item.priceKopeks * item.qty, 0);
          return (
            <li key={order.id}>
              <Link href={`/account/orders/${order.id}`} className="block rounded-3xl border border-line bg-card p-4">
                <span className="font-display">{orderCode(order.orderNo)}</span>
                <span className="ml-3 text-sm text-muted">
                  {orderStatusLabel[deriveOrderStatus(order.items)]} · {formatRub(sum)} · {formatDate(order.createdAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
