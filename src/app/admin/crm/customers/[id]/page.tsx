import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { createDealAction, updateCustomerAction } from "@/actions/admin";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { formatRub } from "@/lib/format";
import { dealStatusLabel } from "@/lib/labels";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export default async function CustomerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const customer = await db.query.customers.findFirst({
    where: eq(customers.id, id),
    with: { deals: true },
  });
  if (!customer) notFound();
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl">{customer.name}</h1>
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      {one("saved") ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <form action={updateCustomerAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5">
        <input type="hidden" name="id" value={customer.id} />
        <label className="text-sm">
          Имя
          <input name="name" defaultValue={customer.name} className={inputClass} />
        </label>
        <label className="text-sm">
          Телефон
          <input name="phone" defaultValue={customer.phone} className={inputClass} />
        </label>
        <label className="text-sm">
          Email
          <input name="email" defaultValue={customer.email} className={inputClass} />
        </label>
        <label className="text-sm">
          Город
          <input name="city" defaultValue={customer.city} className={inputClass} />
        </label>
        <label className="text-sm">
          Заметка
          <textarea name="notes" rows={3} defaultValue={customer.notes} className={inputClass} />
        </label>
        <button className={buttonClass}>Сохранить карточку</button>
      </form>
      <section>
        <h2 className="text-xl">Сделки</h2>
        <ul className="mt-3 space-y-2">
          {customer.deals.map((deal) => (
            <li key={deal.id}>
              <Link href={`/admin/crm/deals/${deal.id}`} className={secondaryClass}>
                {deal.title} · {dealStatusLabel[deal.status]} · {formatRub(deal.amountKopeks)}
              </Link>
            </li>
          ))}
        </ul>
        <form action={createDealAction} className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_auto]">
          <input type="hidden" name="customerId" value={customer.id} />
          <input name="title" placeholder="Название сделки" className={inputClass} />
          <input name="amount" placeholder="Сумма, ₽" className={inputClass} />
          <button className={buttonClass}>Создать</button>
        </form>
      </section>
    </main>
  );
}
