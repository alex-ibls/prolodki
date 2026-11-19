import Link from "next/link";
import { catalogHref } from "@/lib/sef";

const scroll =
  "-mx-3 gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] sm:-mx-4 sm:px-4 lg:mx-0 lg:px-0 [&::-webkit-scrollbar]:hidden";

export function priceSortChoices(search: string, paths: Record<string, string>) {
  const params = new URLSearchParams(search);
  const price = params.get("price") || legacyPrice(params.get("sort"));
  return [
    { id: "asc", label: "Дешевле", on: price === "asc", href: href(search, { price: price === "asc" ? null : "asc" }, paths) },
    { id: "desc", label: "Дороже", on: price === "desc", href: href(search, { price: price === "desc" ? null : "desc" }, paths) },
  ];
}

export function QuickFilters({ search, paths }: { search: string; paths: Record<string, string> }) {
  const tags = priceSortChoices(search, paths);

  return (
    <div className={`${scroll} mb-3 hidden lg:flex`} role="toolbar" aria-label="Сортировка">
      {tags.map((tag) =>
        tag.on ? (
          <span
            key={tag.id}
            aria-pressed="true"
            className="tag inline-flex shrink-0 items-center whitespace-nowrap border border-navy bg-navy text-sm font-semibold text-white"
          >
            <span className="py-1.5 pl-3">{tag.label}</span>
            <Link href={tag.href} aria-label={`Снять ${tag.label}`} className="px-2 py-1.5 text-base leading-none">
              ×
            </Link>
          </span>
        ) : (
          <Link
            key={tag.id}
            href={tag.href}
            aria-pressed="false"
            className="tag shrink-0 whitespace-nowrap border border-line bg-white px-3 py-1.5 text-sm text-ink"
          >
            {tag.label}
          </Link>
        ),
      )}
    </div>
  );
}

function href(search: string, changes: Record<string, string | null | undefined>, paths: Record<string, string>) {
  const next = new URLSearchParams(search);
  next.delete("page");
  next.delete("date");
  next.delete("registered");
  const legacy = next.get("sort");
  if (legacy && !next.get("price")) {
    const price = legacyPrice(legacy);
    if (price) next.set("price", price);
  }
  next.delete("sort");
  for (const [key, value] of Object.entries(changes)) {
    if (!value) next.delete(key);
    else next.set(key, value);
  }
  return catalogHref(next, paths);
}

function legacyPrice(sort: string | null) {
  if (sort === "price_asc") return "asc";
  if (sort === "price_desc") return "desc";
  return "";
}
