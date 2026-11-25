import Link from "next/link";
import { CrumbTitle } from "@/components/breadcrumbs";
import { specValue } from "@/components/catalog-ui";
import { CompareRemove, CompareResume, CompareSync } from "@/components/compare-ui";
import { PhotoFrame } from "@/components/photo-frame";
import { actionClass, pageFrame } from "@/components/styles";
import { compareIdsFromPath } from "@/lib/compare-list";
import { loadCompareListings } from "@/lib/compare";
import { formatOffer } from "@/lib/format";

export default async function ComparePage({ params }: { params: Promise<{ ids?: string[] }> }) {
  const { ids: raw } = await params;
  const pathIds = compareIdsFromPath(raw);
  const items = await loadCompareListings(pathIds);
  const title = compareTitle(items.map((item) => item.title));
  const ids = items.map((item) => item.id);
  const rows = characteristicRows(items);
  return (
    <main className={`${pageFrame} max-w-6xl`}>
      <CrumbTitle label="Сравнение" />
      <h1 className="font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">{title}</h1>
      {pathIds.length > 0 ? <CompareSync pathIds={pathIds} ids={ids} /> : null}
      {items.length === 0 ? <CompareResume /> : null}
      {items.length > 0 ? (
        <div className="mt-6 overflow-x-auto rounded-[6px] border border-line bg-white">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-white px-3 py-3 text-left font-semibold text-deep">
                  Характеристика
                </th>
                {items.map((item) => {
                  return (
                    <th key={item.id} scope="col" className="min-w-40 border-l border-line px-3 py-3 align-top font-normal">
                      <Link href={`/product/${item.slug}`} className="block">
                        <PhotoFrame path={item.images[0]?.path} className="mx-auto h-[90px] w-[120px] rounded-[6px] object-contain" />
                      </Link>
                      <Link href={`/product/${item.slug}`} className="mt-2 block font-semibold text-deep hover:text-navy">
                        {item.title}
                      </Link>
                      {item.brand ? <span className="mt-1 block text-muted">{item.brand}</span> : null}
                      <span className="mt-1 block font-semibold text-ink">{formatOffer(item.priceKopeks)}</span>
                      <span className="mt-2 block">
                        <CompareRemove id={item.id} ids={ids} />
                      </span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key} className="border-t border-line">
                  <th scope="row" className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-3 text-left font-medium text-deep">
                    {row.label}
                  </th>
                  {row.values.map((value, index) => (
                    <td
                      key={`${row.key}-${ids[index]}`}
                      className={`border-l border-line px-3 py-3 text-center ${row.differs ? "bg-foam" : ""}`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <th scope="row" className="sticky left-0 z-10 bg-white px-3 py-3 text-left font-medium text-deep">
                  Заказ
                </th>
                {items.map((item) => (
                  <td key={item.id} className="border-l border-line px-3 py-3">
                    <Link href={`/product/${item.slug}`} className={`${actionClass} w-full`}>
                      Заказать
                    </Link>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      ) : null}
    </main>
  );
}

function compareTitle(titles: string[]) {
  if (titles.length === 2) return `Сравнение ${titles[0]} и ${titles[1]}`;
  if (titles.length === 1) return `Сравнение ${titles[0]}`;
  return "Сравнение товаров";
}

function characteristicRows(
  items: Awaited<ReturnType<typeof loadCompareListings>>,
) {
  const fixed = [
    { key: "brand", label: "Бренд", values: items.map((item) => item.brand || "—") },
    { key: "model", label: "Модель", values: items.map((item) => item.model || "—") },
    { key: "year", label: "Год", values: items.map((item) => (item.year ? String(item.year) : "—")) },
  ];
  const specs = new Map<string, { label: string; order: number; values: string[] }>();
  items.forEach((item, index) => {
    for (const attr of item.attributes) {
      const definition = attr.definition;
      if (!definition) continue;
      const current = specs.get(definition.code) ?? {
        label: definition.name,
        order: definition.cardOrder,
        values: items.map(() => "—"),
      };
      const filled = attr.valueNumber !== null || Boolean(attr.valueText?.trim());
      current.values[index] = filled ? specValue(attr) : "—";
      specs.set(definition.code, current);
    }
  });
  const rows = [
    ...fixed,
    ...[...specs.entries()]
      .sort((a, b) => a[1].order - b[1].order || a[1].label.localeCompare(b[1].label, "ru"))
      .map(([key, row]) => ({ key, label: row.label, values: row.values })),
  ];
  return rows
    .filter((row) => row.values.some((value) => value !== "—"))
    .map((row) => ({ ...row, differs: differs(row.values) }));
}

function differs(values: string[]) {
  return new Set(values.filter((value) => value !== "—")).size > 1;
}
