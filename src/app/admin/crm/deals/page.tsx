import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { deals } from "@/db/schema";
import { inputClass } from "@/components/styles";
import { formatRub } from "@/lib/format";
import { dealStatusLabel } from "@/lib/labels";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Сделки" };

const statuses = ["", "new", "in_progress", "invoiced", "won", "lost"] as const;

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const status = one("status");
  const rows = await db.query.deals.findMany({
    where: status ? eq(deals.status, status as "new") : undefined,
    with: { customer: true },
    orderBy: desc(deals.updatedAt),
  });
  return (
    <main>
      <h1 className="text-3xl">Сделки</h1>
      <form className="mt-4 flex gap-2">
        <select name="status" defaultValue={status} className={inputClass}>
          {statuses.map((item) => (
            <option key={item || "all"} value={item}>
              {item ? dealStatusLabel[item] : "Все статусы"}
            </option>
          ))}
        </select>
        <button className="btn bg-navy px-4 text-sm text-white">Фильтр</button>
      </form>
      <ul className="mt-4 space-y-2">
        {rows.map((deal) => (
          <li key={deal.id}>
            <Link href={`/admin/crm/deals/${deal.id}`} className="block rounded-2xl border border-line bg-card px-4 py-3">
              {deal.title} · {deal.customer?.name} · {dealStatusLabel[deal.status]} · {formatRub(deal.amountKopeks)}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
