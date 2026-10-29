import { listingCard } from "@/components/catalog-ui";
import { InfiniteProducts } from "@/components/infinite-products";
import { QuickFilters } from "@/components/quick-filters";
import { catalogQueryFromSearchParams, searchCatalog } from "@/lib/catalog";
import { readQuery } from "@/lib/query";
import { site } from "@/lib/site";

type Category = { id: number; parentId: number | null; slug: string; name: string; sort: number };

function vesselTypes(categories: Category[]) {
  const roots = categories.filter((item) => item.parentId === null).sort((a, b) => a.sort - b.sort);
  const types: Category[] = [];
  for (const root of roots) {
    const children = categories.filter((item) => item.parentId === root.id).sort((a, b) => a.sort - b.sort);
    types.push(...(children.length ? children : [root]));
  }
  return types;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { raw } = await readQuery(searchParams);
  const current = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "page") continue;
    const text = Array.isArray(value) ? value[0] : value;
    if (text) current.set(key, text);
  }
  const query = catalogQueryFromSearchParams(current);
  const result = await searchCatalog(query);
  const categories = result.categories;
  const selected = categories.find((item) => item.slug === query.category);

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
      <h1 className="sr-only">{site.name}</h1>
      <QuickFilters
        search={current.toString()}
        vessels={vesselTypes(categories).map((item) => ({ slug: item.slug, name: item.name }))}
        categoryName={selected?.name ?? ""}
      />
      <InfiniteProducts
        key={current.toString()}
        initialItems={result.rows.map(listingCard)}
        pages={result.pages}
        search={current.toString()}
      />
    </main>
  );
}
