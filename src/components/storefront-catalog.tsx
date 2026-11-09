import { CatalogSections } from "@/components/catalog-sections";
import { listingCard } from "@/components/catalog-ui";
import { InfiniteProducts } from "@/components/infinite-products";
import { QuickFilters } from "@/components/quick-filters";
import { catalogQueryFromSearchParams, searchCatalog } from "@/lib/catalog";
import { categoryPathMap } from "@/lib/sef";

export async function StorefrontCatalog({ params }: { params: URLSearchParams }) {
  const current = new URLSearchParams(params);
  current.delete("page");
  const query = catalogQueryFromSearchParams(current);
  const result = await searchCatalog(query);
  const paths = categoryPathMap(result.categories);
  const selected = result.categories.find((item) => item.slug === query.category);
  const search = current.toString();

  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4 lg:py-6">
      <CatalogSections categories={result.categories} activeSlug={query.category ?? ""} search={search} paths={paths}>
        <h1 className="mb-3 font-display text-xl font-extrabold tracking-tight text-deep lg:text-2xl">{selected?.name ?? "Объявления"}</h1>
        <QuickFilters search={search} paths={paths} />
        <InfiniteProducts key={search} initialItems={result.rows.map(listingCard)} pages={result.pages} search={search} />
      </CatalogSections>
    </main>
  );
}
