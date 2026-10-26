import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems } from "@/db/schema";
import { formatRub, orderCode } from "@/lib/format";
import { lineStatusLabel } from "@/lib/labels";
import { requireManager } from "@/lib/guards";
import { companyOrg } from "@/lib/stock";

export const metadata = { title: "Заказы компании" };

export default async function CompanyOrdersPage() {
  await requireManager();
  const org = await companyOrg();
  const rows = await db.query.orderItems.findMany({
    where: eq(orderItems.organizationId, org.id),
    with: { order: true },
    orderBy: desc(orderItems.id),
  });
  const seen = new Set<string>();
  return (
    <main>
      <h1 className="text-3xl">Заказы компании</h1>
      <ul className="mt-4 space-y-3">
        {rows.map((row) => {
          if (!row.order || seen.has(row.order.id)) return null;
          seen.add(row.order.id);
          return (
            <li key={row.order.id}>
              <Link href={`/account/orders/${row.order.id}`} className="block rounded-3xl border border-line bg-card p-4">
                {orderCode(row.order.orderNo)} · {row.title} · {lineStatusLabel[row.lineStatus]} · {formatRub(row.priceKopeks * row.qty)}
              </Link>
            </li>
          );
        })}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-muted">Заказов на товары компании пока нет.</p> : null}
    </main>
  );
}
