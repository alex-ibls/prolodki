import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogSections } from "@/components/catalog-sections";
import { listingCard } from "@/components/catalog-ui";
import { InfiniteProducts } from "@/components/infinite-products";
import { QuickFilters } from "@/components/quick-filters";
import { catalogFacets } from "@/lib/catalog-facets";
import { catalogQueryFromSearchParams, searchCatalog } from "@/lib/catalog";
import { categoryPathMap } from "@/lib/sef";
import { categoryChain, childrenOf } from "@/lib/taxonomy";

export async function StorefrontCatalog({ params }: { params: URLSearchParams }) {
  const current = new URLSearchParams(params);
  current.delete("page");
  const query = catalogQueryFromSearchParams(current);
  const result = await searchCatalog(query);
  const paths = categoryPathMap(result.categories);
  const selected = result.categories.find((item) => item.slug === query.category);
  const search = current.toString();
  const facets = await catalogFacets(query.category, result.categories);
  const categories = categoryChoices(result.categories);

  return (
    <main className="mx-auto max-w-6xl px-3 py-3 sm:px-4 lg:py-6">
      <CatalogSections
        categories={result.categories}
        activeSlug={query.category ?? ""}
        search={search}
        paths={paths}
        filters={
          <CatalogFilters
            key={search}
            search={search}
            paths={paths}
            categories={categories}
            typeSlug={categoryChain(result.categories, query.category)[0]?.slug ?? ""}
            facets={facets}
            total={result.total}
          />
        }
      >
        {selected ? (
          <h1 className="mb-3 font-display text-xl font-extrabold tracking-tight text-deep lg:text-2xl">{selected.name}</h1>
        ) : null}
        <QuickFilters search={search} paths={paths} />
        <InfiniteProducts key={search} initialItems={result.rows.map((item) => listingCard(item, paths))} pages={result.pages} search={search} />
      </CatalogSections>
    </main>
  );
}

function categoryChoices(categories: { id: number; parentId: number | null; slug: string; name: string; sort: number }[]) {
  return childrenOf(categories, null).map((item) => ({ value: item.slug, label: item.name }));
}
