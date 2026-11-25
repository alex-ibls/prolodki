import { CatalogFilters } from "@/components/catalog-filters";
import { CatalogSections } from "@/components/catalog-sections";
import { listingCard } from "@/components/catalog-ui";
import { InfiniteProducts } from "@/components/infinite-products";
import { QuickFilters } from "@/components/quick-filters";
import { pageFrame, pageTop } from "@/components/styles";
import { savedListingIds } from "@/lib/activity";
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
  const cards = result.rows.map((item) => listingCard(item, paths));
  const saved = await savedListingIds(cards.flatMap((item) => (item.id ? [item.id] : [])));

  return (
    <main className={`${pageFrame} max-w-6xl ${query.category ? "" : pageTop}`}>
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
          <h1 className="mb-3 font-display text-xl font-extrabold tracking-tight text-deep md:text-2xl">{selected.name}</h1>
        ) : null}
        <QuickFilters search={search} paths={paths} />
        <InfiniteProducts
          key={search}
          initialItems={cards.map((item) => ({ ...item, saved: item.id ? saved.has(item.id) : false }))}
          pages={result.pages}
          search={search}
        />
      </CatalogSections>
    </main>
  );
}

function categoryChoices(categories: { id: number; parentId: number | null; slug: string; name: string; sort: number }[]) {
  return childrenOf(categories, null).map((item) => ({ value: item.slug, label: item.name }));
}
