import Link from "next/link";
import { formatRub } from "@/lib/format";
import { conditionLabel, sourceLabel } from "@/lib/labels";

type SpecSource = {
  valueNumber: number | null;
  definition: { name: string; unit: string; cardOrder: number };
};

export type CardData = {
  slug: string;
  title: string;
  priceKopeks: number;
  compareAtKopeks: number | null;
  city: string;
  quantity: number;
  condition: "new" | "used";
  source: "company" | "individual";
  images: { path: string }[];
  attributes: SpecSource[];
  category?: { name: string } | null;
};

export function specsOf(item: { attributes: SpecSource[] }) {
  return item.attributes
    .filter((attr) => attr.definition.cardOrder > 0 && attr.valueNumber !== null)
    .sort((a, b) => a.definition.cardOrder - b.definition.cardOrder)
    .slice(0, 5);
}

const sourceTone = {
  company: "bg-navy text-white",
  individual: "bg-[#e7f3ff] text-navy",
};

export function ProductCard({ item }: { item: CardData }) {
  const photo = item.images[0]?.path;
  const available = item.quantity > 0;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-card">
      <Link href={`/product/${item.slug}`} className="block bg-[#e8f4fc]">
        {photo ? (
          // Local uploads are served by the app route and are not part of the image optimizer.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${photo}`} alt="" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-end bg-navy p-4 text-white">{item.category?.name}</div>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <span className={`rounded-full px-2 py-1 ${sourceTone[item.source]}`}>{sourceLabel[item.source]}</span>
          <span className="rounded-full bg-paper px-2 py-1">{conditionLabel[item.condition]}</span>
          <span className="rounded-full bg-paper px-2 py-1">{available ? "В наличии" : "Нет в наличии"}</span>
        </div>
        <Link href={`/product/${item.slug}`} className="font-display text-lg leading-snug">
          {item.title}
        </Link>
        <ul className="space-y-1 text-sm text-muted">
          {specsOf(item).map((spec) => (
            <li key={spec.definition.name}>
              {spec.definition.name}: {spec.valueNumber}
              {spec.definition.unit ? ` ${spec.definition.unit}` : ""}
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          {item.compareAtKopeks && item.compareAtKopeks > item.priceKopeks ? (
            <p className="text-sm text-muted line-through">{formatRub(item.compareAtKopeks)}</p>
          ) : null}
          <p className="text-xl font-semibold">{formatRub(item.priceKopeks)}</p>
          <p className="text-sm text-muted">{item.city}</p>
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({ items }: { items: CardData[] }) {
  if (items.length === 0) {
    return <p className="text-muted">В этой подборке пока нет объявлений.</p>;
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <ProductCard key={item.slug} item={item} />
      ))}
    </div>
  );
}

export function ErrorNote({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-800">{message}</p>;
}

export function SavedNote({ saved }: { saved?: string }) {
  if (!saved) return null;
  return <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-moss">Сохранено.</p>;
}
