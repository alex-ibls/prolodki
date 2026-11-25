import { listingCard } from "@/components/catalog-ui";
import { savedListingIds } from "@/lib/activity";
import { catalogQueryFromSearchParams, searchCatalog } from "@/lib/catalog";
import { categoryPathMap } from "@/lib/sef";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const result = await searchCatalog(catalogQueryFromSearchParams(params));
  const paths = categoryPathMap(result.categories);
  const cards = result.rows.map((item) => listingCard(item, paths));
  const saved = await savedListingIds(cards.flatMap((item) => (item.id ? [item.id] : [])));
  return Response.json({
    rows: cards.map((item) => ({ ...item, saved: item.id ? saved.has(item.id) : false })),
    page: result.page,
    pages: result.pages,
  });
}
