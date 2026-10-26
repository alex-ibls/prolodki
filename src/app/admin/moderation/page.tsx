import { eq } from "drizzle-orm";
import { moderateAction } from "@/actions/admin";
import { buttonClass, inputClass, secondaryClass } from "@/components/styles";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { formatRub } from "@/lib/format";
import { sourceLabel } from "@/lib/labels";
import { readQuery } from "@/lib/query";

export const metadata = { title: "Модерация" };

export default async function ModerationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { one } = await readQuery(searchParams);
  const rows = await db.query.listings.findMany({
    where: eq(listings.status, "pending_review"),
    with: { images: true, category: true },
  });
  return (
    <main>
      <h1 className="text-3xl">Очередь модерации</h1>
      {one("error") ? <p className="mt-3 text-sm text-red-700">{one("error")}</p> : null}
      {rows.length === 0 ? <p className="mt-4 text-muted">Очередь пуста.</p> : null}
      <ul className="mt-4 space-y-4">
        {rows.map((row) => (
          <li key={row.id} className="rounded-3xl border border-line bg-card p-4">
            <p className="font-display text-lg">{row.title}</p>
            <p className="text-sm text-muted">
              {sourceLabel[row.source]} · {row.category?.name} · {formatRub(row.priceKopeks)} · {row.city}
            </p>
            <p className="mt-2 text-sm">{row.description}</p>
            {row.images[0] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/media/${row.images[0].path}`} alt="" className="mt-3 h-32 w-48 rounded-xl object-cover" />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={moderateAction}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="approve" />
                <button className={buttonClass}>Одобрить</button>
              </form>
              <form action={moderateAction} className="flex gap-2">
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="decision" value="reject" />
                <input name="reason" placeholder="Причина" className={inputClass} />
                <button className={secondaryClass}>Отклонить</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
