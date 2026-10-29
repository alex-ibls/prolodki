import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { formatDate, formatRub, orderCode } from "@/lib/format";
import { readGuestToken } from "@/lib/guest";
import { orderStatusLabel } from "@/lib/labels";
import { deriveOrderStatus } from "@/lib/orders";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Заказы" };

export default async function GuestOrdersPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account/orders");
  const token = await readGuestToken();
  const rows = token
    ? await db.query.orders.findMany({
        where: and(eq(orders.guestToken, token), isNull(orders.buyerId)),
        with: { items: true },
        orderBy: desc(orders.createdAt),
      })
    : [];
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl">Заказы</h1>
      <p className="mt-2 text-sm text-muted">Заказы этого браузера.</p>
      {rows.length === 0 ? <p className="mt-6 text-muted">Заказов пока нет.</p> : null}
      <ul className="mt-4 space-y-3">
        {rows.map((order) => {
          const sum = order.items.reduce((total, item) => total + item.priceKopeks * item.qty, 0);
          return (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="block rounded-3xl border border-line bg-card p-4">
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
