import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { db } from "@/db";
import { orderItems } from "@/db/schema";
import { formatRub, orderCode } from "@/lib/format";
import { lineStatusLabel } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Продажи" };

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (!user.sellerProfile && user.staffRole !== "manager") {
    return <main><h1 className="text-3xl">Продажи</h1><p className="mt-3 text-muted">Появятся после публикации объявлений.</p></main>;
  }
  const orgId = user.sellerProfile?.organizationId;
  const rows = await db.query.orderItems.findMany({
    where: orgId
      ? or(eq(orderItems.sellerUserId, user.id), eq(orderItems.organizationId, orgId))
      : eq(orderItems.sellerUserId, user.id),
    with: { order: true },
    orderBy: desc(orderItems.id),
  });
  const seen = new Set<string>();
  return (
    <main>
      <h1 className="text-3xl">Продажи</h1>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          if (!row.order || seen.has(row.order.id)) return null;
          seen.add(row.order.id);
          const mine = rows.filter((item) => item.orderId === row.orderId);
          return (
            <li key={row.order.id}>
              <Link href={`/account/orders/${row.order.id}`} className="block rounded-3xl border border-line bg-card p-4">
                <span className="font-display">{orderCode(row.order.orderNo)}</span>
                <ul className="mt-2 text-sm text-muted">
                  {mine.map((item) => (
                    <li key={item.id}>
                      {item.title} · {lineStatusLabel[item.lineStatus]} · {formatRub(item.priceKopeks * item.qty)}
                    </li>
                  ))}
                </ul>
              </Link>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-muted">Входящих заказов нет.</p> : null}
    </main>
  );
}
