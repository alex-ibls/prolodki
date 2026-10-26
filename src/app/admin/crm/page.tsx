import Link from "next/link";
import { desc, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { buttonClass, inputClass } from "@/components/styles";
import { customerSourceLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";
import { requireManager } from "@/lib/guards";

export const metadata = { title: "Клиенты" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { one } = await readQuery(searchParams);
  const q = one("q").trim();
  const rows = await db
    .select()
    .from(customers)
    .where(
      q
        ? or(
            ilike(customers.name, `%${q}%`),
            ilike(customers.phone, `%${q}%`),
            ilike(customers.email, `%${q}%`),
          )
        : undefined,
    )
    .orderBy(desc(customers.createdAt))
    .limit(100);
  return (
    <main>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl">Клиенты</h1>
        <Link href="/admin/crm/customers/new" className={buttonClass}>
          Новый
        </Link>
      </div>
      <form className="mt-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Имя, телефон или email" className={inputClass} />
        <button className={buttonClass}>Найти</button>
      </form>
      <ul className="mt-4 space-y-2">
        {rows.map((customer) => (
          <li key={customer.id}>
            <Link href={`/admin/crm/customers/${customer.id}`} className="block rounded-2xl border border-line bg-card px-4 py-3">
              <span className="font-semibold">{customer.name}</span>
              <span className="ml-3 text-sm text-muted">
                {customer.phone} · {customer.email || "без email"} · {customerSourceLabel[customer.source]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="mt-4 text-muted">Никого не нашли.</p> : null}
    </main>
  );
}
