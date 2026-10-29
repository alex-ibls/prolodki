import Link from "next/link";
import { formatOffer, formatRub } from "@/lib/format";

type SpecSource = {
  valueNumber: number | null;
  valueText?: string | null;
  definition: { code: string; name: string; unit: string; cardOrder: number };
};

export type CardData = {
  slug: string;
  title: string;
  priceKopeks: number;
  compareAtKopeks: number | null;
  city: string;
  registered: boolean | null;
  quantity: number;
  condition: "new" | "used";
  onOrder: boolean;
  source: "company" | "individual";
  images: { path: string }[];
  attributes: SpecSource[];
  category?: { name: string } | null;
};

export function specsOf(item: { attributes: SpecSource[] }) {
  return item.attributes
    .filter((attr) => attr.definition.cardOrder > 0 && (attr.valueNumber !== null || Boolean(attr.valueText?.trim())))
    .sort((a, b) => a.definition.cardOrder - b.definition.cardOrder);
}

export function registeredSpec(registered: boolean | null) {
  if (registered == null) return null;
  return {
    key: "registered",
    code: registered ? "registered" : "unregistered",
    label: "Регистрация",
    value: registered ? "Регистрат" : "Нерегистрат",
  };
}

export function specValue(spec: SpecSource) {
  if (spec.valueText?.trim()) return spec.valueText.trim();
  const unit = !spec.definition.unit ? "" : spec.definition.unit === "°" ? spec.definition.unit : ` ${spec.definition.unit}`;
  return `${spec.valueNumber}${unit}`;
}

function SpecIcon({ code }: { code: string }) {
  const common = { viewBox: "0 0 24 24", className: "h-4 w-4", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (code === "length_m") {
    return (
      <svg {...common}>
        <path d="M4 12h16M7 9l-3 3 3 3M17 9l3 3-3 3" />
      </svg>
    );
  }
  if (code === "width_m") {
    return (
      <svg {...common}>
        <path d="M12 4v16M9 7l3-3 3 3M9 17l3 3 3-3" />
      </svg>
    );
  }
  if (code === "seats") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 19c1.2-3 3.4-4.5 7-4.5S17.8 16 19 19" />
      </svg>
    );
  }
  if (code === "max_hp") {
    return (
      <svg {...common}>
        <path d="M13 3 6 13h6l-1 8 7-10h-6l1-8z" />
      </svg>
    );
  }
  if (code === "weight_kg") {
    return (
      <svg {...common}>
        <path d="M8 7h8l1 13H7L8 7z" />
        <path d="M9 7a3 3 0 0 1 6 0" />
      </svg>
    );
  }
  if (code === "brand") {
    return (
      <svg {...common}>
        <path d="M4 12V6h6l8 8-6 6-8-8z" />
        <circle cx="8.5" cy="8.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (code === "model") {
    return (
      <svg {...common}>
        <path d="M4 16 12 4l8 12H4z" />
      </svg>
    );
  }
  if (code === "year") {
    return (
      <svg {...common}>
        <rect x="4" y="5" width="16" height="15" rx="2" />
        <path d="M8 3v4M16 3v4M4 10h16" />
      </svg>
    );
  }
  if (code === "registered" || code === "unregistered") {
    return (
      <svg {...common}>
        <rect x="5" y="3" width="14" height="18" rx="2" />
        <path d="M8 8h8M8 12h8" />
        {code === "registered" ? <path d="M8 16h4" /> : <path d="M8 16l8-8" />}
      </svg>
    );
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="7" />
    </svg>
  );
}

export function SpecGrid({ items }: { items: { key: string; code: string; label: string; value: string }[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-3">
      {items.map((item) => (
        <li key={item.key} className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-navy">
            <SpecIcon code={item.code} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs leading-4 text-muted">{item.label}</span>
            <span className="block text-sm font-semibold text-ink">{item.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

const conditionTag = {
  new: { label: "Новое", className: "bg-white text-navy" },
  used: { label: "БУ", className: "bg-navy text-white" },
};

const availabilityTag = {
  stock: { label: "В наличии", className: "bg-white text-moss" },
  order: { label: "На заказ", className: "bg-navy text-white" },
};

export function ProductCard({ item }: { item: CardData }) {
  const photo = item.images[0]?.path;
  const tag = conditionTag[item.condition];
  const availability = availabilityTag[item.onOrder ? "order" : "stock"];
  const href = `/product/${item.slug}`;
  return (
    <article className="h-full">
      <Link href={href} className="flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-card">
        <span className="relative block bg-[#e8f4fc]">
          {photo ? (
            // Local uploads are served by the app route and are not part of the image optimizer.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/media/${photo}`} alt="" className="aspect-[3/4] w-full object-cover" />
          ) : (
            <span className="flex aspect-[3/4] items-end bg-navy p-4 text-sm text-white">{item.category?.name}</span>
          )}
          <span className="absolute left-2 top-2 flex flex-col items-start gap-1">
            <span className={`tag px-2 py-1 text-xs font-semibold ${tag.className}`}>{tag.label}</span>
            <span className={`tag px-2 py-1 text-xs font-semibold ${availability.className}`}>{availability.label}</span>
          </span>
        </span>
        <span className="flex flex-1 flex-col gap-2 p-3">
          <span className="line-clamp-2 text-sm leading-5">{item.title}</span>
          <span className="mt-auto flex flex-wrap items-baseline gap-x-2">
            <span className="text-base font-semibold">{formatOffer(item.priceKopeks)}</span>
            {item.compareAtKopeks && item.compareAtKopeks > item.priceKopeks ? (
              <span className="text-xs text-muted line-through">{formatRub(item.compareAtKopeks)}</span>
            ) : null}
          </span>
        </span>
      </Link>
    </article>
  );
}

export function listingCard(item: CardData): CardData {
  return {
    slug: item.slug,
    title: item.title,
    priceKopeks: item.priceKopeks,
    compareAtKopeks: item.compareAtKopeks,
    city: item.city,
    registered: item.registered,
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
      },
    })),
    category: item.category ? { name: item.category.name } : null,
  };
}

export function ProductGrid({ items }: { items: CardData[] }) {
  if (items.length === 0) {
    return <p className="text-muted">В этой подборке пока нет объявлений.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
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
