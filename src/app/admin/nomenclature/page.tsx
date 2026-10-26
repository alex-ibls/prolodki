import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { nomenclature } from "@/db/schema";
import { buttonClass, secondaryClass } from "@/components/styles";
import { formatRub } from "@/lib/format";
import { requireManager } from "@/lib/guards";
import { availableOf } from "@/lib/stock";

export const metadata = { title: "Номенклатура" };

export default async function NomenclaturePage() {
  await requireManager();
  const rows = await db.query.nomenclature.findMany({
    orderBy: asc(nomenclature.sku),
    with: { category: true },
  });
  return (
    <main>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl">Номенклатура 1P</h1>
        <div className="flex gap-2">
          <Link href="/admin/nomenclature/import" className={secondaryClass}>
            Загрузка CSV
          </Link>
          <Link href="/admin/nomenclature/new" className={buttonClass}>
            Новая позиция
          </Link>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-muted">
            <tr>
              <th className="px-4 py-3">Артикул</th>
              <th className="px-4 py-3">Название</th>
              <th className="px-4 py-3">Цена</th>
              <th className="px-4 py-3">Склад</th>
              <th className="px-4 py-3">Резерв</th>
              <th className="px-4 py-3">Доступно</th>
              <th className="px-4 py-3">Витрина</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-4 py-3">
                  <Link href={`/admin/nomenclature/${row.id}`}>{row.sku}</Link>
                </td>
                <td className="px-4 py-3">{row.title}</td>
                <td className="px-4 py-3">{formatRub(row.priceKopeks)}</td>
                <td className="px-4 py-3">{row.quantityOnHand}</td>
                <td className="px-4 py-3">{row.quantityReserved}</td>
                <td className="px-4 py-3">{availableOf(row)}</td>
                <td className="px-4 py-3">{row.isPublished ? "Да" : "Нет"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
