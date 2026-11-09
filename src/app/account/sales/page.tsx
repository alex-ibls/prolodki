import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems } from "@/db/schema";
import { formatRub, orderCode } from "@/lib/format";
import { lineStatusLabel } from "@/lib/labels";
import { getCurrentUser } from "@/lib/session";
import { companyOrg } from "@/lib/stock";

export const metadata = { title: "Продажи" };

export default async function SalesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.staffRole !== "manager") {
    return (
      <main>
        <h1 className="text-3xl">Продажи</h1>
        <p className="mt-3 text-muted">
          По частным объявлениям заказ не оформляется. Договорённость идёт в{" "}
          <Link href="/account/messages" className="font-semibold">сообщениях</Link>.
        </p>
      </main>
    );
  }
  const org = await companyOrg();
  const rows = await db.query.orderItems.findMany({
    where: eq(orderItems.organizationId, org.id),
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
