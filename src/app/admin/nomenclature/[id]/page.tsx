import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { listings, nomenclature, nomenclatureImages } from "@/db/schema";
import { CrumbTitle } from "@/components/breadcrumbs";
import { NomenclatureForm } from "@/components/nomenclature-form";
import { secondaryClass } from "@/components/styles";
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
      images: { orderBy: asc(nomenclatureImages.sort) },
      movements: { with: { user: true } },
    },
  });
  if (!item) notFound();
  const [listing] = await db
    .select({ slug: listings.slug, status: listings.status })
    .from(listings)
    .where(eq(listings.nomenclatureId, item.id))
    .limit(1);
  const movements = [...item.movements].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 20);
  const saved = one("saved");
  const error = one("error");
  return (
    <main className="grid gap-6">
      <CrumbTitle label={item.sku} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Редактирование</p>
          <h1 className="text-3xl">{item.sku}</h1>
        </div>
        {listing?.status === "published" ? (
          <Link href={`/product/${listing.slug}`} className={secondaryClass}>
            Открыть на витрине
          </Link>
        ) : null}
      </div>
      {item.deletedAt ? (
        <p className="rounded-md bg-foam px-4 py-3 text-sm text-deep">Карточка удалена. В списках её нет.</p>
      ) : item.archivedAt ? (
        <p className="rounded-md bg-foam px-4 py-3 text-sm text-deep">Карточка в архиве. На витрине она не показывается, пока её не вернуть в активный список.</p>
      ) : null}
      {saved ? (
        <p className="save-banner rounded-md bg-foam px-4 py-3 text-sm text-deep" role="status">
          Карточка сохранена.
        </p>
      ) : null}
      {error ? (
        <p className="save-banner rounded-md bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      <NomenclatureForm item={item} />
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
