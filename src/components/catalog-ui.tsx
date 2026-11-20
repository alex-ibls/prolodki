import Link from "next/link";
import { actionClass } from "@/components/styles";
import { SpecIcon } from "@/components/spec-icon";
import { formatOffer, formatPhone, formatRub } from "@/lib/format";
import { catalogHref } from "@/lib/sef";
import { site } from "@/lib/site";

type SpecSource = {
  valueNumber: number | null;
  valueText?: string | null;
  definition: { code: string; name: string; unit: string; cardOrder: number; featured?: boolean; icon?: string };
};

export type CardData = {
  slug: string;
  title: string;
  priceKopeks: number;
  compareAtKopeks: number | null;
  city: string;
  quantity: number;
  condition: "new" | "used";
  onOrder: boolean;
  source: "company" | "individual";
  images: { path: string }[];
  attributes: SpecSource[];
  category?: { name: string; slug?: string; href?: string } | null;
  brand?: string;
  brandHref?: string;
  createdAt?: Date | string | null;
  phone?: string | null;
  configurable?: boolean;
};

export function specsOf(item: { attributes: SpecSource[] }) {
  return item.attributes
    .filter((attr) => attr.definition.cardOrder > 0 && (attr.valueNumber !== null || Boolean(attr.valueText?.trim())))
    .sort((a, b) => a.definition.cardOrder - b.definition.cardOrder);
}

export function specValue(spec: SpecSource) {
  const text = spec.valueText?.trim();
  const raw = text || (spec.valueNumber === null ? "" : String(spec.valueNumber));
  const unit = spec.definition.unit.trim();
  if (!unit || raw.endsWith(unit)) return raw;
  return unit === "°" ? `${raw}${unit}` : `${raw} ${unit}`;
}

export function highlightSpecs(item: { attributes: SpecSource[] }) {
  return item.attributes
    .filter((attr) => attr.definition.featured && (attr.valueNumber !== null || Boolean(attr.valueText?.trim())))
    .sort((a, b) => a.definition.cardOrder - b.definition.cardOrder || a.definition.name.localeCompare(b.definition.name, "ru"));
}

export function HighlightSpecs({ items }: { items: SpecSource[] }) {
  if (items.length === 0) return null;
  const columns =
    items.length >= 5
      ? "grid-cols-5"
      : items.length === 4
        ? "grid-cols-4"
        : items.length === 3
          ? "grid-cols-3"
          : items.length === 2
            ? "grid-cols-2"
            : "grid-cols-1";
  return (
    <ul className={`-mx-3 grid ${columns} divide-x divide-white/15 bg-deep text-white sm:mx-0 sm:rounded-t-2xl`}>
      {items.map((spec) => {
        const text = spec.valueText?.trim() ?? "";
        const raw = text || (spec.valueNumber === null ? "" : String(spec.valueNumber));
        const unit = spec.definition.unit.trim();
        const value = unit && raw.endsWith(unit) ? raw.slice(0, -unit.length).trim() : raw;
        return (
          <li key={spec.definition.code} className="flex min-w-0 flex-col items-center gap-1 px-1 py-3 text-center sm:px-2">
            <SpecIcon icon={spec.definition.icon || ""} className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="font-display text-lg font-extrabold leading-none sm:text-xl">
              {value}
              {unit ? <span className="ml-1 text-sm font-semibold sm:text-base">{unit}</span> : null}
            </span>
            <span className="text-[11px] leading-4 sm:text-xs">{spec.definition.name}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function SpecGrid({ items }: { items: { key: string; code: string; icon?: string; label: string; value: string; href?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper text-deep">
            <SpecIcon icon={item.icon} code={item.code} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs leading-4 text-muted">{item.label}</span>
            {item.href ? (
              <Link href={item.href} className="block truncate text-sm font-semibold text-deep hover:text-navy">
                {item.value}
              </Link>
            ) : (
              <span className="block text-sm font-semibold text-ink">{item.value}</span>
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProductCard({ item }: { item: CardData }) {
  const photo = item.images[0]?.path;
  const specs = highlightSpecs(item);
  return (
    <article className="flex h-full min-w-0 flex-col bg-white">
      <Link href={`/product/${item.slug}`} className="block">
        <span className="relative block overflow-hidden bg-foam">
          {photo ? (
            // Local uploads are served by the app route and are not part of the image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/${photo}`} alt="" className="aspect-[4/3] w-full object-cover" />
          ) : (
            <span className="flex aspect-[4/3] items-end bg-deep p-3 text-sm font-semibold text-white">{item.category?.name}</span>
          )}
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-10 text-white">
            <span className="block text-xl font-bold leading-none">{formatOffer(item.priceKopeks)}</span>
            {item.compareAtKopeks && item.compareAtKopeks > item.priceKopeks ? (
              <span className="mt-1 block text-xs leading-none line-through opacity-80">{formatRub(item.compareAtKopeks)}</span>
            ) : null}
          </span>
          {item.condition === "used" ? (
            <span className="absolute left-2 top-2 bg-black/70 px-1.5 py-0.5 text-[11px] font-medium text-white">БУ</span>
          ) : null}
        </span>
      </Link>
      <span className="block flex-1 px-3 pt-3">
        <Link href={`/product/${item.slug}`} className="line-clamp-2 text-base font-semibold leading-5 text-deep">
          {item.title}
        </Link>
        {item.brand ? (
          item.brandHref ? (
            <Link href={item.brandHref} className="mt-1 block truncate text-sm text-muted hover:text-navy">
              {item.brand}
            </Link>
          ) : (
            <span className="mt-1 block truncate text-sm text-muted">{item.brand}</span>
          )
        ) : null}
      </span>
      {specs.length ? (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-3 py-2 text-xs text-muted">
          {specs.map((spec) => (
            <span key={spec.definition.code} className="inline-flex items-center gap-1 whitespace-nowrap">
              <SpecIcon icon={spec.definition.icon || ""} className="h-4 w-4 shrink-0 text-deep" />
              {specValue(spec)}
            </span>
          ))}
        </span>
      ) : (
        <span className="block border-t border-line" />
      )}
      {item.source === "company" && item.priceKopeks > 0 ? (
        <Link href={`/product/${item.slug}`} className={`${actionClass} w-full`} style={{ borderRadius: 0 }}>
          {item.quantity > 0 ? "Купить" : "Заказать"}
        </Link>
      ) : null}
      {item.category?.name && item.category.href ? (
        <Link href={item.category.href} className="block bg-foam px-3 py-2 text-sm text-ink hover:bg-paper hover:text-navy">
          {item.category.name}
        </Link>
      ) : null}
    </article>
  );
}

function categoryLink(category: CardData["category"], paths: Record<string, string>) {
  if (!category?.name) return null;
  const href = category.href || (category.slug ? catalogHref(new URLSearchParams({ category: category.slug }), paths) : "");
  if (!href) return null;
  return { name: category.name, href };
}

export function listingCard(
  item: CardData & { brandRef?: { slug: string } | null },
  paths: Record<string, string> = {},
): CardData {
  return {
    slug: item.slug,
    title: item.title,
    priceKopeks: item.priceKopeks,
    compareAtKopeks: item.compareAtKopeks,
    city: item.city,
    quantity: item.quantity,
    condition: item.condition,
    onOrder: item.onOrder,
    source: item.source,
    images: item.images.map((image) => ({ path: image.path })),
    attributes: item.attributes.map((attr) => ({
      valueNumber: attr.valueNumber,
      valueText: attr.valueText,
      definition: {
        code: attr.definition.code,
        name: attr.definition.name,
        unit: attr.definition.unit,
        cardOrder: attr.definition.cardOrder,
        featured: attr.definition.featured,
        icon: attr.definition.icon,
      },
    })),
    category: categoryLink(item.category, paths),
    brand: item.brand,
    brandHref: item.brandHref || (item.brandRef?.slug ? catalogHref(new URLSearchParams([["brand", item.brandRef.slug]]), paths) : ""),
    createdAt: item.createdAt,
    configurable: item.configurable === true,
  };
}

export function companyPhone(item: { source: string; phone?: string | null }) {
  if (item.source !== "company") return "";
  return formatPhone(item.phone?.trim() || site.phone);
}

export function telHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `tel:+7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return `tel:+${digits}`;
  return `tel:${digits || phone}`;
}

export function ProductGrid({ items }: { items: CardData[] }) {
  if (items.length === 0) {
    return <p className="text-muted">В этой подборке пока нет товаров.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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
  return <p className="rounded-md bg-foam px-4 py-3 text-sm text-deep">Сохранено.</p>;
}
