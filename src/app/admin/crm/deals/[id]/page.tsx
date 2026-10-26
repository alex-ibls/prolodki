import Link from "next/link";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { addDealNoteAction, updateDealAction } from "@/actions/admin";
import { buttonClass, inputClass } from "@/components/styles";
import { db } from "@/db";
import { deals, users } from "@/db/schema";
import { formatDate, orderCode } from "@/lib/format";
import { dealStatusLabel } from "@/lib/labels";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export default async function DealPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const deal = await db.query.deals.findFirst({
    where: eq(deals.id, id),
    with: { customer: true, notes: { with: { author: true } }, order: true },
  });
  if (!deal) notFound();
  const managers = await db.select().from(users).where(eq(users.staffRole, "manager"));
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl">{deal.title}</h1>
      <p className="text-sm text-muted">
        Клиент: <Link href={`/admin/crm/customers/${deal.customerId}`}>{deal.customer?.name}</Link>
        {deal.order ? ` · заказ ${orderCode(deal.order.orderNo)}` : ""}
      </p>
      {one("error") ? <p className="text-sm text-red-700">{one("error")}</p> : null}
      <form action={updateDealAction} className="grid gap-3 rounded-3xl border border-line bg-card p-5">
        <input type="hidden" name="id" value={deal.id} />
        <label className="text-sm">
          Название
          <input name="title" defaultValue={deal.title} className={inputClass} />
        </label>
        <label className="text-sm">
          Статус
          <select name="status" defaultValue={deal.status} className={inputClass}>
            {Object.entries(dealStatusLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Менеджер
          <select name="assigneeId" defaultValue={deal.assigneeId ?? ""} className={inputClass}>
            <option value="">Не назначен</option>
            {managers.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Комментарий
          <textarea name="comment" rows={3} defaultValue={deal.comment} className={inputClass} />
        </label>
        <button className={buttonClass}>Сохранить сделку</button>
      </form>
      <section>
        <h2 className="text-xl">Заметки</h2>
        <ul className="mt-3 space-y-2">
          {deal.notes.map((note) => (
            <li key={note.id} className="rounded-2xl bg-white px-4 py-3 text-sm">
              <p>{note.body}</p>
              <p className="mt-1 text-muted">
                {note.author?.name} · {formatDate(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
        <form action={addDealNoteAction} className="mt-3 grid gap-2">
          <input type="hidden" name="id" value={deal.id} />
          <textarea name="body" rows={3} className={inputClass} placeholder="Новая заметка" />
          <button className={buttonClass}>Добавить</button>
        </form>
      </section>
    </main>
  );
}
