import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { nomenclature } from "@/db/schema";
import { NomenclatureForm } from "@/components/nomenclature-form";
import { formatDate } from "@/lib/format";
import { stockReasonLabel } from "@/lib/labels";
import { requireManager } from "@/lib/guards";
import { readQuery } from "@/lib/query";

export default async function NomenclatureItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireManager();
  const { id } = await params;
  const { one } = await readQuery(searchParams);
  const item = await db.query.nomenclature.findFirst({
    where: eq(nomenclature.id, id),
    with: {
      attributes: { with: { definition: true } },
      movements: { with: { user: true } },
    },
  });
  if (!item) notFound();
  const movements = [...item.movements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);
  return (
    <main className="grid gap-6">
      <h1 className="text-3xl">{item.sku}</h1>
      {one("saved") ? <p className="text-sm text-moss">Сохранено.</p> : null}
      <NomenclatureForm item={item} error={one("error")} />
      <section>
        <h2 className="text-xl">Журнал остатков</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {movements.map((movement) => (
            <li key={movement.id} className="rounded-2xl bg-white px-4 py-3">
              {stockReasonLabel[movement.reason]} · {movement.delta > 0 ? `+${movement.delta}` : movement.delta} · {movement.note} · {movement.user?.name} · {formatDate(movement.createdAt)}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
